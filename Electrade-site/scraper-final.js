/**
 * Network Diagnostic & Fixed Scraper
 */

const https = require('https');
const http = require('http');
const dns = require('dns');

// Configuration
const CONFIG = {
  SUPABASE_URL: 'https://bwpnashjtvkrsvysmuwo.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3cG5hc2hqdHZrcnN2eXNtdXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA4MjIxMjAsImV4cCI6MjA0NjM5ODEyMH0.kUNihnqisFDi26Dkh5KG5IH6X99q_t1VTpcuqJ5vFyo',
  DELAY_MS: 1500,
  BATCH_SIZE: 10,
  BASE_URL: 'https://hadielectronics.com.pk',
  // Add DNS servers as fallback
  DNS_SERVERS: ['8.8.8.8', '1.1.1.1']
};

// Set DNS servers
dns.setServers(CONFIG.DNS_SERVERS);

const stats = { total: 0, scraped: 0, withSpecs: 0, errors: 0, startTime: Date.now() };

function makeRequest(urlString, options = {}, retries = 3) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const client = url.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, data: data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      if (retries > 0 && (err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT')) {
        console.log(`  Retrying... (${retries} attempts left)`);
        setTimeout(() => {
          makeRequest(urlString, options, retries - 1).then(resolve).catch(reject);
        }, 2000);
      } else {
        reject(err);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) req.write(options.body);
    req.end();
  });
}

async function supabaseFetch(endpoint, options = {}) {
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/${endpoint}`;
  const requestOptions = {
    method: options.method || 'GET',
    headers: {
      'apikey': CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
      ...options.headers
    }
  };
  if (options.body) requestOptions.body = JSON.stringify(options.body);

  const response = await makeRequest(url, requestOptions);
  return response.data ? JSON.parse(response.data) : null;
}

async function fetchPage(url) {
  const response = await makeRequest(url);
  return response.data;
}

class SimpleHTMLParser {
  constructor(html) { this.html = html; }

  getText(html) {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  extractListItems(html) {
    const items = [];
    const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let match;
    while ((match = liPattern.exec(html)) !== null) {
      const text = this.getText(match[1]);
      if (text && text.length > 0 && text.length < 500) items.push(text);
    }
    return items;
  }

  extractHeadingsWithContent(html) {
    const sections = [];
    const regex = /<(h[1-6]|strong|b)[^>]*>([\s\S]*?)<\/\1>/gi;
    let matches = [];
    let match;

    while ((match = regex.exec(html)) !== null) {
      const text = this.getText(match[2]);
      if (text.length > 0 && text.length < 100) {
        matches.push({ text: text, index: match.index, fullMatch: match[0] });
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const contentStart = current.index + current.fullMatch.length;
      const contentEnd = next ? next.index : html.length;
      const content = html.substring(contentStart, contentEnd);
      const items = this.extractListItems(content);

      if (items.length > 0) {
        sections.push({ heading: current.text, items: items });
      }
    }
    return sections;
  }
}

function extractSpecifications(html, productName) {
  try {
    const parser = new SimpleHTMLParser(html);
    let descSection = null;

    // Try multiple patterns to find specs
    const patterns = [
      /woocommerce-Tabs-panel[^>]*>([\s\S]{0,10000}?)<\/div>\s*<\/div>/i,
      /id="tab-description"[^>]*>([\s\S]{0,10000}?)<\/div>\s*<\/div>/i,
      /Specifications[^\n]*\n([\s\S]{0,5000})/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        descSection = match[1] || match[0];
        break;
      }
    }

    if (!descSection) return { specifications: [], rawText: '', hasSpecs: false };

    const sections = parser.extractHeadingsWithContent(descSection);
    const directItems = parser.extractListItems(descSection);
    const specifications = [];

    sections.forEach(s => specifications.push({ category: s.heading, details: s.items }));
    if (directItems.length > 0 && sections.length === 0) {
      specifications.push({ category: 'Specifications', details: directItems });
    }

    const rawText = parser.getText(descSection).substring(0, 1000);
    return { specifications, rawText, hasSpecs: specifications.length > 0 };
  } catch (error) {
    return { specifications: [], rawText: '', hasSpecs: false };
  }
}

async function scrapeProduct(product) {
  try {
    const productUrl = `${CONFIG.BASE_URL}/product/${product.slug}`;
    console.log(`[${new Date().toLocaleTimeString()}] ${product.name}`);

    const html = await fetchPage(productUrl);
    const result = extractSpecifications(html, product.name);

    stats.scraped++;
    if (result.hasSpecs) {
      stats.withSpecs++;
      console.log(`  ✅ ${result.specifications.length} sections`);
    } else {
      console.log(`  ⚠️  No specs`);
    }

    return {
      id: product.id,
      specifications: result.specifications,
      specification_text: result.rawText,
      scraped_at: new Date().toISOString()
    };
  } catch (error) {
    stats.errors++;
    console.error(`  ❌ ${error.message}`);
    return { id: product.id, specifications: [], specification_text: '', scraped_at: new Date().toISOString() };
  }
}

async function saveBatch(batch) {
  console.log(`💾 Saving ${batch.length} products...`);
  for (const item of batch) {
    try {
      await supabaseFetch(`products?id=eq.${item.id}`, {
        method: 'PATCH',
        body: {
          specifications: JSON.stringify(item.specifications),
          specification_text: item.specification_text,
          scraped_at: item.scraped_at
        }
      });
    } catch (err) {
      console.error(`  ❌ Failed to update ${item.id}`);
    }
  }
  console.log(`✅ Saved\n`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startScraping() {
  console.log('🚀 Product Specifications Scraper\n');

  try {
    console.log('🔍 Testing network connectivity...');

    // Test DNS resolution
    await new Promise((resolve, reject) => {
      dns.resolve4('bwpnashjtvkrsvysmuwo.supabase.co', (err, addresses) => {
        if (err) reject(new Error('DNS resolution failed. Check your internet connection or VPN.'));
        else {
          console.log(`✅ DNS OK (${addresses[0]})`);
          resolve();
        }
      });
    });

    console.log('📡 Fetching products from Supabase...');
    const products = await supabaseFetch('products?select=id,name,slug&order=id');

    if (!products || products.length === 0) {
      console.log('❌ No products found');
      return;
    }

    stats.total = products.length;
    console.log(`✅ Found ${stats.total} products\n`);
    console.log('='.repeat(50));

    let batch = [];

    for (let i = 0; i < products.length; i++) {
      const result = await scrapeProduct(products[i]);
      batch.push(result);

      if (batch.length >= CONFIG.BATCH_SIZE) {
        await saveBatch(batch);
        batch = [];
      }

      const progress = ((i + 1) / stats.total * 100).toFixed(1);
      console.log(`${i + 1}/${stats.total} (${progress}%) | ✅${stats.withSpecs} ⚠️${stats.scraped - stats.withSpecs} ❌${stats.errors}\n`);

      if (i < products.length - 1) await delay(CONFIG.DELAY_MS);
    }

    if (batch.length > 0) await saveBatch(batch);

    const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
    console.log('='.repeat(50));
    console.log('🎉 Complete!');
    console.log(`Total: ${stats.total} | With specs: ${stats.withSpecs} | Duration: ${duration}m`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nPossible fixes:');
    console.error('1. Check your internet connection');
    console.error('2. Make sure you\'re not behind a proxy/firewall');
    console.error('3. Try connecting to a VPN');
    console.error('4. Check if bwpnashjtvkrsvysmuwo.supabase.co is accessible in your browser');
    process.exit(1);
  }
}

startScraping();
