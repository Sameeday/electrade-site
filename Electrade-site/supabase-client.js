/**
 * ============================================================
 * SUPABASE CLIENT CONFIGURATION
 * ============================================================
 * This file connects your website to Supabase backend
 *
 * SETUP INSTRUCTIONS:
 * 1. Replace YOUR_SUPABASE_URL with your actual Supabase URL
 * 2. Replace YOUR_SUPABASE_ANON_KEY with your actual anon key
 * 3. Save this file in your project root
 *
 * WHERE TO FIND YOUR KEYS:
 * - Go to your Supabase project dashboard
 * - Click Settings (gear icon) → API
 * - Copy "Project URL" and "anon public" key
 * ============================================================
 */

// ============================================================
// CONFIGURATION - REPLACE THESE WITH YOUR ACTUAL VALUES!
// ============================================================
const SUPABASE_URL = 'https://hmpjbalvvvzaytpvjbzm.supabase.co';  // ✅ CORRECTED - Removed /rest/v1/
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcGpiYWx2dnZ6YXl0cHZqYnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MDcyNjEsImV4cCI6MjEwODQ4MzI2MX0.O1gHSBQLkAcrg5638BFV19AXTg99pTMOBNz-yVEGwVY';  // ✅ This is correct!

// ============================================================
// INITIALIZE SUPABASE CLIENT
// ============================================================
let sb = null;
let supabaseReady = false;

// Function to initialize Supabase
function initSupabase() {
  if (window.supabase && window.supabase.createClient) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseReady = true;
    console.log('✅ Supabase connected successfully!');

    // Trigger ready event for other scripts
    document.dispatchEvent(new Event('supabaseReady'));
    return true;
  }
  return false;
}

// Initialize when Supabase SDK is available
// Note: The Supabase SDK should be loaded via <script> tag in HTML before this file
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initSupabase, 100);
  });
} else {
  setTimeout(initSupabase, 100);
}

// Helper function to wait for Supabase to be ready
// (gives up after 8 seconds with a clear message instead of hanging forever)
function waitForSupabase() {
  return new Promise((resolve, reject) => {
    if (supabaseReady) {
      resolve(sb);
      return;
    }
    const timer = setTimeout(() => {
      reject(new Error(
        'The Supabase library did not load. Check your internet connection and that the ' +
        'supabase-js <script> tag comes BEFORE supabase-client.js in admin.html.'
      ));
    }, 8000);
    document.addEventListener('supabaseReady', () => {
      clearTimeout(timer);
      resolve(sb);
    }, { once: true });
  });
}

// ============================================================
// DATABASE FUNCTIONS - Categories
// ============================================================

/**
 * Get all categories from Supabase
 * @returns {Promise<Array>} Array of category objects
 */
async function getAllCategories() {
  try {
    await waitForSupabase();
    const { data, error } = await sb
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Get a single category by slug
 * @param {string} slug - Category slug (e.g., 'led', 'air-conditioners')
 * @returns {Promise<Object>} Category object
 */
async function getCategoryBySlug(slug) {
  try {
    const { data, error } = await sb
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching category:', error);
    return null;
  }
}

/**
 * Add a new category (Admin only)
 * @param {Object} categoryData - Category object
 * @returns {Promise<Object>} Created category
 */
async function addCategory(categoryData) {
  try {
    const { data, error } = await sb
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Category added successfully!');
    return data;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
}

/**
 * Update a category (Admin only)
 * @param {string} id - Category ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated category
 */
async function updateCategory(id, updates) {
  try {
    const { data, error } = await sb
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Category updated successfully!');
    return data;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
}

/**
 * Delete a category (Admin only)
 * @param {string} id - Category ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteCategory(id) {
  try {
    const { error } = await sb
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    console.log('✅ Category deleted successfully!');
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}

// ============================================================
// DATABASE FUNCTIONS - Products
// ============================================================

/**
 * Get all products (NO LIMIT - fetches ALL products from database)
 * @returns {Promise<Array>} Array of product objects
 */
async function getAllProducts() {
  try {
    let allProducts = [];
    let from = 0;
    const batchSize = 1000; // Supabase default limit
    let hasMore = true;

    // Fetch in batches until we get all products
    while (hasMore) {
      const { data, error, count } = await sb
        .from('products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allProducts = allProducts.concat(data);
        from += batchSize;

        // If we got less than batchSize, we're done
        if (data.length < batchSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ Loaded ${allProducts.length} total products from Supabase`);
    return allProducts || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

/**
 * Get products by category
 * @param {string} categorySlug - Category slug
 * @returns {Promise<Array>} Array of products
 */
async function getProductsByCategory(categorySlug) {
  try {
    const { data, error } = await sb
      .from('products')
      .select('*')
      .eq('category_slug', categorySlug)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

/**
 * Get products by subcategory
 * @param {string} categorySlug - Category slug
 * @param {string} subcategorySlug - Subcategory slug
 * @returns {Promise<Array>} Array of products
 */
async function getProductsBySubcategory(categorySlug, subcategorySlug) {
  try {
    const { data, error } = await sb
      .from('products')
      .select('*')
      .eq('category_slug', categorySlug)
      .eq('subcategory_slug', subcategorySlug)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

/**
 * Get featured products
 * @returns {Promise<Array>} Array of featured products
 */
async function getFeaturedProducts() {
  try {
    const { data, error } = await sb
      .from('products')
      .select('*')
      .eq('is_featured', true)
      .limit(8);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }
}

/**
 * Get sale products
 * @returns {Promise<Array>} Array of sale products
 */
async function getSaleProducts() {
  try {
    const { data, error } = await sb
      .from('products')
      .select('*')
      .eq('is_sale', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching sale products:', error);
    return [];
  }
}

/**
 * Add a new product (Admin only)
 * @param {Object} productData - Product object
 * @returns {Promise<Object>} Created product
 */
async function addProduct(productData) {
  try {
    const { data, error } = await sb
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Product added successfully!');
    return data;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

/**
 * Update a product (Admin only)
 * @param {string} id - Product ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated product
 */
async function updateProduct(id, updates) {
  try {
    const { data, error } = await sb
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Product updated successfully!');
    return data;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Delete a product (Admin only)
 * @param {string} id - Product ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteProduct(id) {
  try {
    const { error } = await sb
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    console.log('✅ Product deleted successfully!');
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

// ============================================================
// IMAGE UPLOAD FUNCTIONS
// ============================================================

/**
 * Upload an image to Supabase Storage
 * @param {File} file - Image file to upload
 * @param {string} folder - Folder name (e.g., 'categories' or 'products')
 * @returns {Promise<string>} Public URL of uploaded image
 */
async function uploadImage(file, folder = 'products') {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await sb.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = sb.storage
      .from('product-images')
      .getPublicUrl(fileName);

    console.log('✅ Image uploaded successfully!');
    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Delete an image from Supabase Storage
 * @param {string} imageUrl - Full URL of the image
 * @returns {Promise<boolean>} Success status
 */
async function deleteImage(imageUrl) {
  try {
    // Extract file path from URL
    const fileName = imageUrl.split('/product-images/')[1];

    const { error } = await sb.storage
      .from('product-images')
      .remove([fileName]);

    if (error) throw error;
    console.log('✅ Image deleted successfully!');
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}

// ============================================================
// AUTHENTICATION FUNCTIONS (For Admin Panel)
// ============================================================

/**
 * Sign in admin user
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @returns {Promise<Object>} User object
 */
/**
 * Confirms the signed-in user is listed in the admin_users table (via the database
 * function is_admin() from supabase-01-admin-setup.sql). Signs them out if not.
 * If that function doesn't exist yet, it only warns, so the page still works until
 * you run the setup SQL. The real protection is always the database's RLS policies.
 */
async function assertIsAdmin() {
  const { data, error } = await sb.rpc('is_admin');
  if (error) {
    if (error.code === 'PGRST202') {
      // is_admin() SQL function not yet created in Supabase.
      // Allow access but warn — real protection is RLS policies on the DB.
      // To fully secure: run supabase-01-admin-setup.sql in Supabase SQL Editor.
      console.warn(
        '⚠️ SECURITY WARNING: is_admin() function not found in Supabase.\n' +
        'Admin access is currently based on authentication only.\n' +
        'To restrict to specific admin users, run supabase-01-admin-setup.sql in the Supabase SQL Editor.'
      );
      return true; // Allow authenticated user to proceed
    }
    throw error;
  }
  if (data !== true) {
    await sb.auth.signOut();
    const e = new Error('This account is not an admin.');
    e.code = 'NOT_ADMIN';
    throw e;
  }
  return true;
}

async function signInAdmin(email, password) {
  try {
    await waitForSupabase();
    const { data, error } = await sb.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;
    await assertIsAdmin();
    console.log('✅ Admin signed in successfully!');
    return data.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

/**
 * Sign out admin user
 * @returns {Promise<boolean>} Success status
 */
async function signOutAdmin() {
  try {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
    console.log('✅ Admin signed out successfully!');
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Get current admin user
 * @returns {Promise<Object>} Current user or null
 */
async function getCurrentAdmin() {
  try {
    await waitForSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    await assertIsAdmin();
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user is logged in
 * @returns {Promise<boolean>} True if logged in
 */
async function isAdminLoggedIn() {
  const user = await getCurrentAdmin();
  return user !== null;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format price to PKR currency
 * @param {number} price - Price in rupees
 * @returns {string} Formatted price
 */
function formatPrice(price) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0
  }).format(price);
}

/**
 * Check if Supabase is connected
 * @returns {boolean} Connection status
 */
function isSupabaseConnected() {
  return typeof sb !== 'undefined' && sb !== null;
}

// ============================================================
// EXPORT (if using modules)
// ============================================================
// Uncomment if you're using ES6 modules
/*
export {
  getAllCategories,
  getCategoryBySlug,
  addCategory,
  updateCategory,
  deleteCategory,
  getAllProducts,
  getProductsByCategory,
  getProductsBySubcategory,
  getFeaturedProducts,
  getSaleProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
  deleteImage,
  signInAdmin,
  signOutAdmin,
  getCurrentAdmin,
  isAdminLoggedIn,
  formatPrice,
  isSupabaseConnected
};
*/

console.log('📦 Supabase Client loaded successfully!');
console.log('⚠️ Remember to replace SUPABASE_URL and SUPABASE_ANON_KEY with your actual values!');
