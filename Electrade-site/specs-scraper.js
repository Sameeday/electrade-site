/**
 * ============================================================
 * PRODUCT SPECIFICATIONS SCRAPER (Node.js)
 * ============================================================
 * This scraper fetches product pages from hadielectronics.com.pk
 * and extracts structured specifications from the DESCRIPTION tab.
 *
 * WHAT IT EXTRACTS:
 * - Dimensions & Weight
 * - Additional accessories
 * - General Details
 * - All other specification sections
 *
 * USAGE:
 * 1. npm install (if dependencies not installed)
 * 2. node specs-scraper.js
 * ============================================================
 */

const https = require('https');
const http = require('http');

// Polyfill for fetch (for Node.js < 18)
if (!globalThis.fetch) {
  globalThis.fetch = require('node-fetch');
}

const { createClient } = require('@supabase/supabase-js');

// Configuration
const CONFIG = {
  SUPABASE_URL: 'https://bwpnashjtvkrsvysmuwo.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3cG5hc2hqdHZrcnN2eXNtdXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA4MjIxMjAsImV4cCI6MjA0NjM5ODEyMH0.kUNihnqisFDi26Dkh5KG5IH6X99q_t1VTpcuqJ5vFyo',
  DELAY_MS: 2000, // 2 seconds between requests
  BATCH_SIZE: 10, // Save to database every 10 products
  BASE_URL: 'https://hadielectronics.com.pk'
};

// Initialize Supabase client
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// Statistics
const stats = {
  total: 0,
  scraped: 0,
  withSpecs: 0,
  errors: 0,
  startTime: Date.now()
};

/**
 * Fetch HTML content from a URL
 */
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    client.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Simple HTML parser to extract text between tags
 */
class SimpleHTMLParser {
  constructor(html) {
    this.html = html;
  }

  /**
   * Extract text content from HTML string
   */
  getText(html) {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Find content within a specific section
   */
  findSection(startPattern, endPattern) {
    const startIndex = this.html.indexOf(startPattern);
    if (startIndex === -1) return null;

    const searchFrom = startIndex + startPattern.length;
    const endIndex = this.html.indexOf(endPattern, searchFrom);

    if (endIndex === -1) {
      return this.html.substring(startIndex);
    }

    return this.html.substring(startIndex, endIndex);
  }

  /**
   * Extract list items from HTML
   */
  extractListItems(html) {
    const items = [];
    const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let match;

    while ((match = liPattern.exec(html)) !== null) {
      const text = this.getText(match[1]);
      if (text && text.length > 0) {
        items.push(text);
      }
    }

    return items;
  }

  /**
   * Extract heading and its content
   */
  extractHeadingsWithContent(html) {
    const sections = [];
    const headingPattern = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
    let lastIndex = 0;
    let match;
    let matches = [];

    // Find all headings first
    while ((match = headingPattern.exec(html)) !== null) {
      matches.push({
        level: match[1],
        text: this.getText(match[2]),
        index: match.index,
        fullMatch: match[0]
      });
    }

    // Extract content between headings
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];

      const contentStart = current.index + current.fullMatch.length;
      const contentEnd = next ? next.index : html.length;
      const content = html.substring(contentStart, contentEnd);

      // Extract list items from this section
      const items = this.extractListItems(content);

      if (items.length > 0) {
        sections.push({
          heading: current.text,
          items: items
        });
      }
    }

    return sections;
  }
}

/**
 * Extract specifications from product page HTML
 */
function extractSpecifications(html, productName) {
  try {
    const parser = new SimpleHTMLParser(html);

    // Find the DESCRIPTION tab content
    // Look for common patterns in the description section
    let descriptionSection = parser.findSection('<div class="woocommerce-Tabs-panel woocommerce-Tabs-panel--description', '</div>');

    if (!descriptionSection) {
      // Try alternative pattern
      descriptionSection = parser.findSection('role="tabpanel"', '</div>');
    }

    if (!descriptionSection) {
      // Try to find by "Specifications" heading
      const specsIndex = html.toLowerCase().indexOf('specifications');
      if (specsIndex !== -1) {
        descriptionSection = html.substring(specsIndex, specsIndex + 5000);
      }
    }

    if (!descriptionSection) {
      return { specifications: [], rawText: '' };
    }

    // Extract all sections with headings
    const sections = parser.extractHeadingsWithContent(descriptionSection);

    // Also try to extract any bullet points or list items directly
    const directItems = parser.extractListItems(descriptionSection);

    // Combine everything into a structured format
    const specifications = [];

    // Add sections with headings
    sections.forEach(section => {
      specifications.push({
        category: section.heading,
        details: section.items
      });
    });

    // If we have direct items but no sections, add them as general specs
    if (directItems.length > 0 && sections.length === 0) {
      specifications.push({
        category: 'Specifications',
        details: directItems
      });
    }

    // Also extract raw text for fallback searching
    const rawText = parser.getText(descriptionSection);

    return {
      specifications: specifications,
      rawText: rawText,
      hasSpecs: specifications.length > 0 || directItems.length > 0
    };

  } catch (error) {
    console.error(`Error extracting specs for ${productName}:`, error.message);
    return { specifications: [], rawText: '', hasSpecs: false };
  }
}

/**
 * Scrape a single product
 */
async function scrapeProduct(product) {
  try {
    // Construct full product URL
    const productUrl = `${CONFIG.BASE_URL}/product/${product.slug}`;

    console.log(`[${new Date().toLocaleTimeString()}] Scraping: ${product.name}`);

    // Fetch the page
    const html = await fetchPage(productUrl);

    // Extract specifications
    const result = extractSpecifications(html, product.name);

    // Update statistics
    stats.scraped++;
    if (result.hasSpecs) {
      stats.withSpecs++;
      console.log(`  ✅ Found ${result.specifications.length} spec sections`);
    } else {
      console.log(`  ⚠️  No specifications found`);
    }

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      specifications: result.specifications,
      specification_text: result.rawText,
      scraped_at: new Date().toISOString()
    };

  } catch (error) {
    stats.errors++;
    console.error(`  ❌ Error: ${error.message}`);

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      specifications: [],
      specification_text: '',
      error: error.message,
      scraped_at: new Date().toISOString()
    };
  }
}

/**
 * Save batch to Supabase
 */
async function saveBatch(batch) {
  try {
    // Update each product with specifications
    const updates = batch.map(item => ({
      id: item.id,
      specifications: JSON.stringify(item.specifications),
      specification_text: item.specification_text,
      scraped_at: item.scraped_at
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('products')
        .update({
          specifications: update.specifications,
          specification_text: update.specification_text,
          scraped_at: update.scraped_at
        })
        .eq('id', update.id);

      if (error) {
        console.error(`Error updating product ${update.id}:`, error.message);
      }
    }

    console.log(`💾 Saved batch of ${batch.length} products to Supabase\n`);
  } catch (error) {
    console.error('Error saving batch:', error.message);
  }
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main scraper function
 */
async function startScraping() {
  console.log('🚀 Starting Product Specifications Scraper\n');
  console.log(`Configuration:`);
  console.log(`  - Delay: ${CONFIG.DELAY_MS}ms between requests`);
  console.log(`  - Batch size: ${CONFIG.BATCH_SIZE} products`);
  console.log(`  - Target: ${CONFIG.BASE_URL}\n`);

  try {
    // Fetch all products from Supabase
    console.log('📡 Fetching products from Supabase...');
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, slug')
      .order('id');

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    if (!products || products.length === 0) {
      console.log('❌ No products found in database');
      return;
    }

    stats.total = products.length;
    console.log(`✅ Found ${stats.total} products to scrape\n`);
    console.log('=' .repeat(60));

    let batch = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Scrape the product
      const result = await scrapeProduct(product);
      batch.push(result);

      // Save batch when it reaches the batch size
      if (batch.length >= CONFIG.BATCH_SIZE) {
        await saveBatch(batch);
        batch = [];
      }

      // Show progress
      const progress = ((i + 1) / stats.total * 100).toFixed(1);
      console.log(`Progress: ${i + 1}/${stats.total} (${progress}%)`);
      console.log(`Stats: ✅ ${stats.withSpecs} with specs | ⚠️ ${stats.scraped - stats.withSpecs} without specs | ❌ ${stats.errors} errors\n`);

      // Delay before next request (except for last one)
      if (i < products.length - 1) {
        await delay(CONFIG.DELAY_MS);
      }
    }

    // Save remaining batch
    if (batch.length > 0) {
      await saveBatch(batch);
    }

    // Final statistics
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);
    console.log('=' .repeat(60));
    console.log('🎉 Scraping Complete!\n');
    console.log('Final Statistics:');
    console.log(`  Total products: ${stats.total}`);
    console.log(`  Successfully scraped: ${stats.scraped}`);
    console.log(`  With specifications: ${stats.withSpecs} (${(stats.withSpecs / stats.total * 100).toFixed(1)}%)`);
    console.log(`  Without specifications: ${stats.scraped - stats.withSpecs}`);
    console.log(`  Errors: ${stats.errors}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`  Average: ${(duration / stats.total).toFixed(2)}s per product`);

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Start the scraper
startScraping();
