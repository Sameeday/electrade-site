/**
 * ============================================================
 * PRODUCTS.JS - DYNAMIC VERSION (Loads from Supabase)
 * ============================================================
 * This replaces the static products.js file
 * Now loads products from Supabase database in real-time
 *
 * IMPORTANT: Must load AFTER supabase-client.js
 * ============================================================
 */

// Global products array (will be populated from database)
var PRODUCTS = [];

// Flag to track if products are loaded
var productsLoaded = false;

/**
 * Load all products from Supabase
 */
async function loadProductsFromDatabase() {
  if (productsLoaded) return PRODUCTS;

  try {
    await waitForSupabase();

    // Fetch ALL products by removing the default 1000 limit
    const { data, error, count } = await sb
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10000);  // Explicitly set high limit

    if (error) throw error;

    // Transform database products to match the old format
    PRODUCTS = data.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category_slug.toUpperCase().replace(/-/g, ' '),
      catSlug: p.category_slug,
      subSlug: p.subcategory_slug || '',
      brand: p.brand || '',
      price: p.price,
      oldPrice: p.old_price || null,
      image: p.image_url,
      rating: p.rating || 0,
      shortDesc: p.short_desc || '',
      specs: p.specs || [],
      featured: p.is_featured || false,
      sale: p.is_sale || false,
      inStock: p.in_stock !== false
    }));

    productsLoaded = true;
    console.log('✅ Loaded', PRODUCTS.length, 'products from Supabase');
    console.log('📊 Total in database:', count);
    return PRODUCTS;
  } catch (error) {
    console.error('❌ Error loading products from database:', error);
    PRODUCTS = []; // Empty array on error
    return PRODUCTS;
  }
}

/**
 * Get a product by ID
 */
function getProduct(id) {
  return PRODUCTS.find(function(p) { return p.id === id; });
}

/**
 * Get all products in a category (optionally filtered by subcategory)
 */
function getProductsIn(catSlug, subSlug) {
  var list = PRODUCTS.filter(function(p) { return p.catSlug === catSlug; });
  if (subSlug) {
    list = list.filter(function(p) { return p.subSlug === subSlug; });
  }
  return list;
}

/**
 * Count products in a category/subcategory
 */
function countProductsIn(catSlug, subSlug) {
  return getProductsIn(catSlug, subSlug).length;
}

/**
 * Get featured products
 */
function getFeaturedProducts() {
  return PRODUCTS.filter(function(p) { return p.featured; });
}

/**
 * Get sale products
 */
function getSaleProducts() {
  return PRODUCTS.filter(function(p) { return p.sale; });
}

/**
 * Load all products - called by category-page.js
 * Returns a promise that resolves when products are loaded
 */
async function loadAllProducts() {
  return await loadProductsFromDatabase();
}

/**
 * Get product by ID (compatibility function)
 */
function getProductById(id) {
  return PRODUCTS.find(function(p) { return p.id === id; });
}

/**
 * Initialize - Load products when page loads
 */
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      loadProductsFromDatabase();
    });
  } else {
    loadProductsFromDatabase();
  }
})();

console.log('✅ Dynamic Products.js loaded - Products will load from Supabase');
