/**
 * PRODUCTS LOADER - MOBILE OPTIMIZED
 * Server-side pagination, filtering, and lazy loading
 * Only fetches what's needed, caches intelligently
 */

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY_PREFIX = 'electrade_products_';

// Minimal product fields for card display
const CARD_FIELDS = 'id,name,brand,category_slug,subcategory_slug,price,old_price,image_url,in_stock,is_featured,is_sale';
const DETAIL_FIELDS = '*';

// Global state
var PRODUCTS = []; // For backward compatibility with existing code
var productsLoaded = false;

/**
 * Get from sessionStorage cache
 */
function getFromCache(key) {
  try {
    const item = sessionStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!item) return null;

    const { data, timestamp } = JSON.parse(item);
    if (Date.now() - timestamp > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY_PREFIX + key);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Save to sessionStorage cache
 */
function saveToCache(key, data) {
  try {
    sessionStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({
      data: data,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Quota exceeded - clear old cache
    try {
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith(CACHE_KEY_PREFIX)) {
          sessionStorage.removeItem(k);
        }
      });
      sessionStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({
        data: data,
        timestamp: Date.now()
      }));
    } catch (e2) {
      console.warn('Cache full, continuing without cache');
    }
  }
}

/**
 * Transform database row to app format
 */
function transformProduct(p, fullData = false) {
  const base = {
    id: p.id,
    name: p.name,
    category: (p.category_slug || '').toUpperCase().replace(/-/g, ' '),
    catSlug: p.category_slug,
    subSlug: p.subcategory_slug || '',
    brand: p.brand || '',
    price: p.price,
    oldPrice: p.old_price || null,
    image: p.image_url,
    inStock: p.in_stock !== false,
    featured: p.is_featured || false,
    sale: p.is_sale || false
  };

  if (fullData) {
    base.rating = p.rating || 0;
    base.shortDesc = p.short_desc || '';
    base.specs = p.specifications || [];
    base.additionalImages = p.additional_images || [];
    base.sourceUrl = p.source_url || '';
  }

  return base;
}

/**
 * Fetch products with server-side filtering and pagination
 */
async function fetchProducts(options = {}) {
  const {
    category = null,
    subcategory = null,
    brand = null,
    featured = null,
    sale = null,
    search = null,
    sort = 'created_at',
    order = 'desc',
    page = 1,
    pageSize = 20,
    fields = CARD_FIELDS,
    count = false
  } = options;

  // Build cache key
  const cacheKey = JSON.stringify({ category, subcategory, brand, featured, sale, search, sort, order, page, pageSize });

  // Check cache first
  if (!search) { // Don't cache search results
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log('📦 Loaded from cache:', cached.products ? cached.products.length : cached.length, 'products');
      return cached;
    }
  }

  await waitForSupabase();

  let query = sb.from('products').select(fields, { count: count ? 'exact' : null });

  // Apply filters
  if (category) query = query.eq('category_slug', category);
  if (subcategory) query = query.eq('subcategory_slug', subcategory);
  if (brand) query = query.ilike('brand', brand);
  if (featured !== null) query = query.eq('is_featured', featured);
  if (sale !== null) query = query.eq('is_sale', sale);
  if (search) {
    query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);
  }

  // Apply sorting
  const ascending = order === 'asc';
  if (sort === 'price') {
    query = query.order('price', { ascending, nullsLast: true });
  } else if (sort === 'name') {
    query = query.order('name', { ascending });
  } else if (sort === 'rating') {
    query = query.order('rating', { ascending: false, nullsLast: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  // Apply pagination
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  query = query.range(start, end);

  const { data, error, count: totalCount } = await query;

  if (error) {
    console.error('❌ Fetch error:', error);
    throw error;
  }

  const products = (data || []).map(p => transformProduct(p));

  const result = count ? { products, totalCount } : products;

  // Cache non-search results
  if (!search) {
    saveToCache(cacheKey, result);
  }

  console.log('✅ Fetched', products.length, 'products', count ? `of ${totalCount} total` : '');
  return result;
}

/**
 * Fetch single product by ID with full details
 */
async function fetchProductById(id) {
  const cacheKey = `product_${id}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('📦 Product loaded from cache');
    return cached;
  }

  await waitForSupabase();

  const { data, error } = await sb
    .from('products')
    .select(DETAIL_FIELDS)
    .eq('id', id)
    .single();

  if (error) {
    console.error('❌ Fetch product error:', error);
    return null;
  }

  const product = transformProduct(data, true);
  saveToCache(cacheKey, product);
  return product;
}

/**
 * Get product count for a category/subcategory (fast HEAD request)
 */
async function getProductCount(category, subcategory = null) {
  const cacheKey = `count_${category}_${subcategory || 'all'}`;
  const cached = getFromCache(cacheKey);
  if (cached !== null) return cached;

  await waitForSupabase();

  let query = sb.from('products').select('id', { count: 'exact', head: true });
  query = query.eq('category_slug', category);
  if (subcategory) query = query.eq('subcategory_slug', subcategory);

  const { count, error } = await query;

  if (error) {
    console.error('❌ Count error:', error);
    return 0;
  }

  saveToCache(cacheKey, count || 0);
  return count || 0;
}

/**
 * Search products with debouncing (call this from input handler)
 */
let searchTimeout;
async function searchProducts(query, callback, limit = 8) {
  clearTimeout(searchTimeout);

  if (!query || query.length < 2) {
    callback([]);
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const products = await fetchProducts({
        search: query,
        pageSize: limit,
        page: 1
      });
      callback(products);
    } catch (e) {
      console.error('Search error:', e);
      callback([]);
    }
  }, 300);
}

/**
 * BACKWARD COMPATIBILITY: Legacy functions that old code may call
 * These now work with the new lazy-loading architecture
 */

async function loadAllProducts() {
  // Wait for products to be loaded if not already
  if (productsLoaded && PRODUCTS.length > 0) {
    console.log('✅ Products already loaded:', PRODUCTS.length);
    return PRODUCTS;
  }

  // Wait for initialization to complete
  console.log('⏳ Waiting for products initialization...');

  // Wait for productsLoaded event if not ready yet
  if (!productsLoaded || PRODUCTS.length === 0) {
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (productsLoaded && PRODUCTS.length > 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });
  }

  console.log('✅ Products ready:', PRODUCTS.length);
  return PRODUCTS;
}

async function loadProductsFromDatabase() {
  console.warn('⚠️ loadProductsFromDatabase() called - using lazy loading instead. Products are fetched on-demand.');
  productsLoaded = true;
  return PRODUCTS;
}

function getProductById(id) {
  // Try memory first
  const cached = PRODUCTS.find(p => p.id === id);
  if (cached) return cached;

  // Note: This is sync but fetch is async, so won't work for first access
  // Use fetchProductById() for reliable async access
  return null;
}

function getProduct(id) {
  return getProductById(id);
}

function getProductsIn(catSlug, subSlug) {
  // Return cached if available
  return PRODUCTS.filter(p => {
    if (p.catSlug !== catSlug) return false;
    if (subSlug && p.subSlug !== subSlug) return false;
    return true;
  });
}

function countProductsIn(catSlug, subSlug) {
  return getProductsIn(catSlug, subSlug).length;
}

function getFeaturedProducts() {
  return PRODUCTS.filter(p => p.featured);
}

function getSaleProducts() {
  return PRODUCTS.filter(p => p.sale);
}

/**
 * CRITICAL: Actually load ALL products from Supabase on page load
 * This is needed for category pages to work!
 */
async function initializeProducts() {
  try {
    console.log('🔄 Loading all products from Supabase...');

    // Wait for Supabase to be ready
    if (typeof waitForSupabase === 'function') {
      await waitForSupabase();
    }

    // Fetch ALL products in batches (Supabase max is 1000 per request)
    let allProducts = [];
    let page = 0;
    let batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const start = page * batchSize;
      const end = start + batchSize - 1;

      console.log(`📦 Fetching products ${start} to ${end}...`);

      const { data, error } = await sb
        .from('products')
        .select(CARD_FIELDS)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;

      if (data && data.length > 0) {
        // Transform and add to our array
        allProducts = allProducts.concat(data.map(p => transformProduct(p, false)));
        console.log(`✅ Loaded batch: ${data.length} products (total: ${allProducts.length})`);

        // If we got less than batchSize, we're done
        if (data.length < batchSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    // Populate the global PRODUCTS array
    PRODUCTS = allProducts;
    productsLoaded = true;

    console.log(`✅ Loaded ALL ${PRODUCTS.length} products from Supabase!`);

    // Trigger event for other scripts waiting for products
    document.dispatchEvent(new Event('productsLoaded'));

  } catch (error) {
    console.error('❌ Error loading products:', error);
    productsLoaded = true; // Mark as loaded even on error so page doesn't hang
  }
}

// Auto-initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeProducts);
} else {
  initializeProducts();
}

console.log('✅ Products loader initialized - fetching from Supabase...');
