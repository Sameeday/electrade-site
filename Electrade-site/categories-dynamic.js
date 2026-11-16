/**
 * ============================================================
 * CATEGORIES.JS - DYNAMIC VERSION (Loads from Supabase)
 * ============================================================
 * This replaces the static categories.js file
 * Now loads categories from Supabase database in real-time
 *
 * IMPORTANT: Must load AFTER supabase-client.js
 * ============================================================
 */

// Global categories array (will be populated from database)
var CATEGORIES = [];

// Flag to track if categories are loaded
var categoriesLoaded = false;

/**
 * Load all categories from Supabase
 */
async function loadCategoriesFromDatabase() {
  if (categoriesLoaded) return CATEGORIES;

  try {
    await waitForSupabase();

    const { data, error } = await sb
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;

    // Transform database categories to match the old format
    CATEGORIES = data.map(c => ({
      name: c.name,
      slug: c.slug,
      tagline: c.tagline || '',
      description: c.description || '',
      image: c.image_url || '',
      icon: 'grid', // Default icon
      brands: c.brands || [],
      groupOrder: c.group_order || [],
      subcategories: c.subcategories || []
    }));

    categoriesLoaded = true;
    console.log('✅ Loaded', CATEGORIES.length, 'categories from Supabase');
    return CATEGORIES;
  } catch (error) {
    console.error('❌ Error loading categories from database:', error);
    // Fallback to minimal category structure
    CATEGORIES = [];
    return CATEGORIES;
  }
}

/**
 * Get all categories
 */
function getCategories() {
  return CATEGORIES;
}

/**
 * Get a category by slug
 */
function getCategory(slug) {
  return CATEGORIES.find(function(c) { return c.slug === slug; });
}

/**
 * Get all subcategories for a category
 */
function getSubcategories(catSlug) {
  var cat = getCategory(catSlug);
  return cat ? cat.subcategories : [];
}

/**
 * Get a specific subcategory
 */
function getSubcategory(catSlug, subSlug) {
  var subs = getSubcategories(catSlug);
  return subs.find(function(s) { return s.slug === subSlug; });
}

/**
 * Resolve a subcategory (handles aliases)
 */
function resolveSub(catSlug, sub) {
  if (sub.aliasOf) return sub.aliasOf;
  return { cat: catSlug, sub: sub.slug };
}

/**
 * Get subcategory label
 */
function subLabel(sub) {
  return sub.name;
}

/**
 * Get category URL
 */
function categoryUrl(slug) {
  return 'category.html?cat=' + slug;
}

/**
 * Get subcategory URL
 */
function subcategoryUrl(catSlug, sub) {
  return 'category.html?cat=' + catSlug + '&sub=' + sub.slug;
}

/**
 * Get root URL
 */
function rootUrl() {
  return 'index.html';
}

/**
 * Brand key (normalized for comparison)
 */
function brandKey(name) {
  return String(name == null ? "" : name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Brand slug (URL-friendly)
 */
function brandSlug(name) {
  return String(name == null ? "" : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Initialize - Load categories when page loads
 */
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      loadCategoriesFromDatabase();
    });
  } else {
    loadCategoriesFromDatabase();
  }
})();

console.log('✅ Dynamic Categories.js loaded - Categories will load from Supabase');
