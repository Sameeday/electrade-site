/**
 * products.js - DYNAMIC VERSION
 * ------------------------------------------------------------------
 * This file loads products from Supabase database in real-time
 * Any changes in admin panel appear instantly on the website
 *
 * Last updated: 2026-10-30T06:24:33.978Z
 * ------------------------------------------------------------------
 */

// Global products array - populated from Supabase
var PRODUCTS = [];
var productsLoaded = false;
var productsLoading = false;

/**
 * Load all products from Supabase database with pagination
 */
async function loadAllProducts() {
  // Prevent multiple simultaneous loads
  if (productsLoaded) return PRODUCTS;
  if (productsLoading) {
    // Wait for ongoing load to complete
    return new Promise(resolve => {
      const checkLoaded = setInterval(() => {
        if (productsLoaded) {
          clearInterval(checkLoaded);
          resolve(PRODUCTS);
        }
      }, 50);
    });
  }

  productsLoading = true;

  try {
    // Wait for Supabase to be ready
    if (typeof waitForSupabase === 'function') {
      await waitForSupabase();
    }

    // Check if Supabase is available
    if (typeof sb === 'undefined' || !sb) {
      console.error('❌ Supabase client not initialized');
      productsLoading = false;
      return PRODUCTS;
    }

    // Fetch products in batches of 1000 to overcome Supabase limit
    let allProducts = [];
    let page = 0;
    let batchSize = 1000;
    let hasMore = true;

    console.log('🔄 Loading products from Supabase...');

    while (hasMore) {
      const { data, error, count } = await sb
        .from('products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * batchSize, (page + 1) * batchSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allProducts = allProducts.concat(data);
        console.log(`📦 Loaded batch ${page + 1}: ${data.length} products (Total: ${allProducts.length})`);
        page++;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    // Transform database format to match old static format
    PRODUCTS = allProducts.map(function(p) {
      // Parse specifications if it's a string
      let specifications = [];
      if (p.specifications) {
        try {
          specifications = typeof p.specifications === 'string'
            ? JSON.parse(p.specifications)
            : p.specifications;
        } catch (e) {
          console.warn('Failed to parse specifications for product:', p.id);
          specifications = [];
        }
      }

      return {
        id: p.id,
        name: p.name,
        category: (p.category_slug || '').toUpperCase().replace(/-/g, ' '),
        catSlug: p.category_slug,
        subSlug: p.subcategory_slug || '',
        brand: p.brand || '',
        price: p.price,
        oldPrice: p.old_price || null,
        image: p.image_url,
        rating: p.rating || 0,
        shortDesc: p.short_desc || '',
        specs: p.specs || [],
        specifications: specifications, // Add the scraped specifications
        featured: p.is_featured || false,
        sale: p.is_sale || false,
        inStock: p.in_stock !== false
      };
    });

    productsLoaded = true;
    productsLoading = false;
    console.log('✅ Loaded ALL ' + PRODUCTS.length + ' products from Supabase');

    // Trigger custom event for other scripts that need to know products are loaded
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('productsLoaded', { detail: PRODUCTS }));
    }

    return PRODUCTS;
  } catch (error) {
    console.error('❌ Error loading products:', error);
    productsLoaded = false;
    productsLoading = false;
    return PRODUCTS;
  }
}

/**
 * Get a single product by ID
 */
function getProduct(id) {
  return PRODUCTS.find(function(p) { return p.id === id; });
}

/**
 * Alias for getProduct - used by product.html
 */
function getProductById(id) {
  return getProduct(id);
}

/**
 * Get products in a category (optionally filtered by subcategory)
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
 * Get all featured products
 */
function getFeaturedProducts() {
  return PRODUCTS.filter(function(p) { return p.featured; });
}

/**
 * Get all sale products
 */
function getSaleProducts() {
  return PRODUCTS.filter(function(p) { return p.sale; });
}

// Auto-load products when this script loads
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      loadAllProducts();
    });
  } else {
    loadAllProducts();
  }
})();

console.log('✅ Dynamic products.js loaded - Will fetch from Supabase');
