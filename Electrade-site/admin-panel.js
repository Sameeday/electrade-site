/**
 * ============================================================
 * ADMIN PANEL JAVASCRIPT - FIXED VERSION
 * ============================================================
 * This is the FIXED version with:
 * - Proper error handling with specific messages
 * - Input validation and sanitization
 * - Rate limiting
 * - Better UX with notifications instead of alerts
 *
 * TO USE THIS:
 * 1. Add <script src="security.js"></script> before admin-panel.js in admin.html
 * 2. Replace admin-panel.js with this file OR copy the fixes over
 * ============================================================
 */

// Global state
let currentUser = null;
let allProducts = [];
let allCategories = [];

// ============================================================
// AUTHENTICATION
// ============================================================

/**
 * Check if user is authenticated on page load
 */
async function checkAuth() {
  try {
    // Wait for Supabase to initialize
    await waitForSupabase();

    // Get current session
    const { data: { session }, error } = await sb.auth.getSession();

    if (error) {
      console.error('Auth check error:', error);
      showLoginScreen();
      return;
    }

    // If there's a session, verify admin status
    if (session && session.user) {
      try {
        await assertIsAdmin();
        currentUser = session.user;
        showDashboard();
      } catch (adminError) {
        console.error('Not an admin:', adminError);
        await sb.auth.signOut();
        showLoginScreen();
      }
    } else {
      showLoginScreen();
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    showLoginScreen();
  }
}

/**
 * Show login screen
 */
function showLoginScreen() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('adminDashboard').classList.add('hidden');
}

/**
 * Show admin dashboard
 */
function showDashboard() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminDashboard').classList.remove('hidden');

  // Set admin email
  document.getElementById('adminEmail').textContent = currentUser.email;

  // Load initial data
  loadProducts();
  loadCategories();
  loadStatistics();
}

/**
 * Handle login form submission
 */
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');

  try {
    // Rate limiting: max 5 login attempts per minute
    RateLimiter.check('admin-login', 5, 60000);

    errorEl.classList.add('hidden');
    const user = await signInAdmin(email, password);
    currentUser = user;
    RateLimiter.reset('admin-login'); // Reset on success
    showDashboard();
  } catch (error) {
    console.error('Login failed:', error);

    let errorMessage;

    if (error.message.includes('Too many attempts')) {
      errorMessage = error.message;
    } else if (error && error.code === 'NOT_ADMIN') {
      errorMessage = "You're signed in, but this account isn't an admin. Add it to the admin_users table.";
    } else if (error.message && /invalid login credentials/i.test(error.message)) {
      errorMessage = 'Invalid email or password. Please try again.';
    } else if (error.message && /email not confirmed/i.test(error.message)) {
      errorMessage = 'This email is not confirmed yet. In Supabase: Authentication → Users → confirm the email.';
    } else {
      errorMessage = 'Could not sign in: ' + (error.message || 'unknown error') + '. Check the browser console for details.';
    }

    errorEl.textContent = errorMessage;
    errorEl.classList.remove('hidden');
  }
});

/**
 * Handle sign out
 */
async function handleSignOut() {
  if (confirm('Are you sure you want to sign out?')) {
    await signOutAdmin();
    currentUser = null;
    showLoginScreen();
  }
}

// ============================================================
// TAB NAVIGATION
// ============================================================

/**
 * Show specific tab
 */
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden');
  });

  // Remove active state from all nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('border-blue-600', 'text-blue-600');
    tab.classList.add('border-transparent', 'text-gray-600');
  });

  // Show selected tab
  const tabElement = document.getElementById(tabName + 'Tab');
  if (tabElement) {
    tabElement.classList.remove('hidden');
  }

  // Activate nav tab
  event.target.classList.remove('border-transparent', 'text-gray-600');
  event.target.classList.add('border-blue-600', 'text-blue-600');

  // Refresh icons
  lucide.createIcons();
}

// ============================================================
// PRODUCTS MANAGEMENT
// ============================================================

/**
 * Load all products
 */
async function loadProducts() {
  const loadingEl = document.getElementById('productsLoading');
  const listEl = document.getElementById('productsList');
  const tableBody = document.getElementById('productsTableBody');

  loadingEl.classList.remove('hidden');
  listEl.classList.add('hidden');

  try {
    allProducts = await getAllProducts();

    if (allProducts.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-12 text-center text-gray-500">
            No products yet. Click "Add Product" to create your first product.
          </td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = allProducts.map(product => `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              <img src="${product.image_url}" alt="${product.name}" class="w-16 h-16 object-cover rounded-lg">
              <div>
                <p class="font-semibold text-gray-900">${product.name}</p>
                <p class="text-sm text-gray-500">${product.brand || 'No brand'}</p>
              </div>
            </div>
          </td>
          <td class="px-6 py-4">
            <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              ${product.category_slug}
            </span>
          </td>
          <td class="px-6 py-4">
            <p class="font-semibold text-gray-900">Rs. ${product.price.toLocaleString()}</p>
            ${product.old_price ? `<p class="text-sm text-gray-500 line-through">Rs. ${product.old_price.toLocaleString()}</p>` : ''}
          </td>
          <td class="px-6 py-4">
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${product.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
              ${product.in_stock ? 'In Stock' : 'Out of Stock'}
            </span>
          </td>
          <td class="px-6 py-4 text-right">
            <div class="flex justify-end gap-2">
              <button onclick="editProduct('${product.id}')" class="btn-success">
                Edit
              </button>
              <button onclick="deleteProductById('${product.id}')" class="btn-danger">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    loadingEl.classList.add('hidden');
    listEl.classList.remove('hidden');
    lucide.createIcons();
  } catch (error) {
    console.error('Error loading products:', error);
    Notifier.error('Failed to load products. Please refresh the page.');
  }
}

/**
 * Show add product form
 */
async function showAddProductForm() {
  document.getElementById('productModalTitle').textContent = 'Add Product';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('productImagePreview').classList.add('hidden');

  // Load categories into dropdown
  await loadCategoriesDropdown();

  document.getElementById('productModal').classList.remove('hidden');
}

/**
 * All brands organized by category
 */
const brandsByCategory = {
  'led': [
    'TCL', 'Samsung', 'Sony', 'Hisense', 'Mi', 'Xiaomi',
    'Orient', 'Skyworth', 'Dawlance', 'Ecostar', 'Infinix'
  ],
  'air-conditioners': [
    'Gree', 'Ecostar', 'Homage', 'Haier', 'Dawlance', 'Orient',
    'TCL', 'AUX by Orient', 'Kenwood', 'PEL', 'Panasonic',
    'Midea', 'Hisense', 'Green Air', 'AirX by Hitachi', 'LG'
  ],
  'refrigerators': [
    'Dawlance', 'PEL', 'Kenwood', 'Orient', 'Haier', 'Samsung', 'LG'
  ],
  'washing-machines': [
    'Super Asia', 'Dawlance', 'Haier', 'Royal', 'Nasgas', 'NG',
    'Samsung', 'LG', 'Midea', 'TCL', 'Kenwood'
  ],
  'cooling-heating': [],
  'kitchen-appliances': [],
  'iron-garment-care': [],
  'vacuum-floor-care': [],
  'home-audio': [],
  'projectors-tv-accessories': [],
  'power-tools': [],
  'commercial-products': []
};

/**
 * All subcategories organized by category
 */
const subcategoriesByCategory = {
  'led': [
    { name: 'FHD LED TV', slug: 'fhd-led-tv' },
    { name: '4K LED TV', slug: '4k-led-tv' },
    { name: 'QLED TV', slug: 'qled-tv' },
    { name: 'OLED TV', slug: 'oled-tv' },
    { name: 'Smart TV', slug: 'smart-tv' },
    { name: '8K TV', slug: '8k-tv' }
  ],
  'refrigerators': [
    { name: 'Single Door', slug: 'single-door' },
    { name: 'Double Door', slug: 'double-door' },
    { name: 'Side by Side', slug: 'side-by-side' },
    { name: 'French Door', slug: 'french-door' },
    { name: 'Mini Fridge', slug: 'mini-fridge' },
    { name: 'Inverter Refrigerator', slug: 'inverter-refrigerator' }
  ],
  'washing-machines': [
    { name: 'Front Load', slug: 'front-load' },
    { name: 'Top Load', slug: 'top-load' },
    { name: 'Semi Automatic', slug: 'semi-automatic' },
    { name: 'Fully Automatic', slug: 'fully-automatic' },
    { name: 'Washer Dryer Combo', slug: 'washer-dryer' },
    { name: 'Portable Washing Machine', slug: 'portable' }
  ],
  'air-conditioners': [
    { name: 'Split AC', slug: 'split-ac' },
    { name: 'Window AC', slug: 'window-ac' },
    { name: 'Inverter AC', slug: 'inverter-ac' },
    { name: 'Portable AC', slug: 'portable-ac' },
    { name: 'Cassette AC', slug: 'cassette-ac' },
    { name: 'Floor Standing AC', slug: 'floor-standing-ac' }
  ],
  'kitchen-appliances': [
    { name: 'Microwave Oven', slug: 'microwave-oven' },
    { name: 'Electric Oven', slug: 'electric-oven' },
    { name: 'Blender', slug: 'blender' },
    { name: 'Juicer', slug: 'juicer' },
    { name: 'Food Processor', slug: 'food-processor' },
    { name: 'Electric Kettle', slug: 'electric-kettle' },
    { name: 'Toaster', slug: 'toaster' },
    { name: 'Coffee Maker', slug: 'coffee-maker' },
    { name: 'Air Fryer', slug: 'air-fryer' },
    { name: 'Rice Cooker', slug: 'rice-cooker' }
  ],
  'home-audio': [
    { name: 'Soundbar', slug: 'soundbar' },
    { name: 'Home Theater', slug: 'home-theater' },
    { name: 'Bluetooth Speaker', slug: 'bluetooth-speaker' },
    { name: 'Woofer', slug: 'woofer' },
    { name: 'Portable Speaker', slug: 'portable-speaker' },
    { name: 'Tower Speaker', slug: 'tower-speaker' }
  ],
  'electronics': [
    { name: 'Digital Camera', slug: 'digital-camera' },
    { name: 'Tablet', slug: 'tablet' },
    { name: 'E-Reader', slug: 'e-reader' },
    { name: 'Gaming Console', slug: 'gaming-console' },
    { name: 'Smart Watch', slug: 'smart-watch' },
    { name: 'Power Bank', slug: 'power-bank' }
  ],
  'cooling-heating': [
    { name: 'Ceiling Fan', slug: 'ceiling-fan' },
    { name: 'Pedestal Fan', slug: 'pedestal-fan' },
    { name: 'Wall Fan', slug: 'wall-fan' },
    { name: 'Table Fan', slug: 'table-fan' },
    { name: 'Exhaust Fan', slug: 'exhaust-fan' },
    { name: 'Room Heater', slug: 'room-heater' },
    { name: 'Gas Heater', slug: 'gas-heater' },
    { name: 'Humidifier', slug: 'humidifier' }
  ],
  'iron-garment-care': [
    { name: 'Steam Iron', slug: 'steam-iron' },
    { name: 'Dry Iron', slug: 'dry-iron' },
    { name: 'Garment Steamer', slug: 'garment-steamer' },
    { name: 'Travel Iron', slug: 'travel-iron' },
    { name: 'Iron Press', slug: 'iron-press' }
  ],
  'vacuum-floor-care': [
    { name: 'Upright Vacuum', slug: 'upright-vacuum' },
    { name: 'Canister Vacuum', slug: 'canister-vacuum' },
    { name: 'Handheld Vacuum', slug: 'handheld-vacuum' },
    { name: 'Robot Vacuum', slug: 'robot-vacuum' },
    { name: 'Wet & Dry Vacuum', slug: 'wet-dry-vacuum' },
    { name: 'Floor Polisher', slug: 'floor-polisher' }
  ],
  'power-tools': [
    { name: 'Drill Machine', slug: 'drill-machine' },
    { name: 'Angle Grinder', slug: 'angle-grinder' },
    { name: 'Circular Saw', slug: 'circular-saw' },
    { name: 'Impact Driver', slug: 'impact-driver' },
    { name: 'Jigsaw', slug: 'jigsaw' },
    { name: 'Tool Kit', slug: 'tool-kit' }
  ],
  'commercial-products': [
    { name: 'Commercial Refrigerator', slug: 'commercial-refrigerator' },
    { name: 'Commercial Freezer', slug: 'commercial-freezer' },
    { name: 'Commercial AC', slug: 'commercial-ac' },
    { name: 'Water Dispenser', slug: 'water-dispenser' },
    { name: 'Deep Fryer', slug: 'deep-fryer' },
    { name: 'Commercial Blender', slug: 'commercial-blender' }
  ],
  'projectors-tv-accessories': [
    { name: 'Projector', slug: 'projector' },
    { name: 'Projector Screen', slug: 'projector-screen' },
    { name: 'TV Wall Mount', slug: 'tv-wall-mount' },
    { name: 'TV Stand', slug: 'tv-stand' },
    { name: 'HDMI Cable', slug: 'hdmi-cable' },
    { name: 'TV Remote', slug: 'tv-remote' },
    { name: 'Antenna', slug: 'antenna' }
  ]
};

/**
 * Load categories into product form dropdown
 * Shows all main categories
 */
async function loadCategoriesDropdown() {
  const categorySelect = document.getElementById('productCategory');

  if (allCategories.length === 0) {
    allCategories = await getAllCategories();
  }

  categorySelect.innerHTML = '<option value="">Select category...</option>' +
    allCategories.map(cat => `<option value="${cat.slug}">${cat.name}</option>`).join('');

  // Setup subcategory dropdown update on category change
  setupSubcategoryDropdown();
}

/**
 * Setup subcategory and brand dropdowns to change based on selected category
 */
function setupSubcategoryDropdown() {
  const categorySelect = document.getElementById('productCategory');
  const subcategorySelect = document.getElementById('productSubcategory');
  const brandSelect = document.getElementById('productBrand');

  // Remove existing event listener if any
  categorySelect.removeEventListener('change', updateSubcategoryAndBrandDropdowns);

  // Add event listener
  categorySelect.addEventListener('change', updateSubcategoryAndBrandDropdowns);
}

/**
 * Update subcategory and brand dropdowns based on selected category
 */
function updateSubcategoryAndBrandDropdowns() {
  const categorySelect = document.getElementById('productCategory');
  const subcategorySelect = document.getElementById('productSubcategory');
  const brandSelect = document.getElementById('productBrand');
  const selectedCategory = categorySelect.value;

  if (!selectedCategory) {
    subcategorySelect.innerHTML = '<option value="">Select category first...</option>';
    subcategorySelect.disabled = true;
    brandSelect.innerHTML = '<option value="">Select category first...</option>';
    brandSelect.disabled = true;
    return;
  }

  // Update subcategories
  const subcategories = subcategoriesByCategory[selectedCategory] || [];

  if (subcategories.length === 0) {
    subcategorySelect.innerHTML = '<option value="">No subcategories available</option>';
    subcategorySelect.disabled = true;
  } else {
    subcategorySelect.disabled = false;
    subcategorySelect.innerHTML = '<option value="">Select subcategory (optional)...</option>' +
      subcategories.map(sub => `<option value="${sub.slug}">${sub.name}</option>`).join('');
  }

  // Update brands
  const brands = brandsByCategory[selectedCategory] || [];

  if (brands.length === 0) {
    brandSelect.innerHTML = '<option value="">No brands for this category</option>';
    brandSelect.disabled = true;
  } else {
    brandSelect.disabled = false;
    brandSelect.innerHTML = '<option value="">Select brand (optional)...</option>' +
      brands.map(brand => `<option value="${brand}">${brand}</option>`).join('');
  }
}

/**
 * Legacy function name for backward compatibility
 */
function updateSubcategoryDropdown() {
  updateSubcategoryAndBrandDropdowns();
}

/**
 * Edit product
 */
async function editProduct(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('productId').value = product.id;
  document.getElementById('productName').value = product.name;
  document.getElementById('productCategory').value = product.category_slug;

  // Trigger the dropdown update to populate subcategories and brands
  updateSubcategoryAndBrandDropdowns();

  // Then set the values
  document.getElementById('productSubcategory').value = product.subcategory_slug || '';
  document.getElementById('productPrice').value = product.price;
  document.getElementById('productOldPrice').value = product.old_price || '';
  document.getElementById('productBrand').value = product.brand || '';
  document.getElementById('productRating').value = product.rating || 0;
  document.getElementById('productShortDesc').value = product.short_desc || '';

  // Specs (from JSON array to text)
  if (product.specs && Array.isArray(product.specs)) {
    document.getElementById('productSpecs').value = product.specs.join('\n');
  }

  // Flags
  document.getElementById('productFeatured').checked = product.is_featured || false;
  document.getElementById('productSale').checked = product.is_sale || false;
  document.getElementById('productInStock').checked = product.in_stock !== false;

  // Show current image
  if (product.image_url) {
    const preview = document.getElementById('productImagePreview');
    preview.src = product.image_url;
    preview.classList.remove('hidden');
  }

  await loadCategoriesDropdown();
  document.getElementById('productModal').classList.remove('hidden');
}

/**
 * Delete product
 */
async function deleteProductById(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
    return;
  }

  try {
    await deleteProduct(productId);
    Notifier.success('Product deleted successfully!');
    loadProducts();
    loadStatistics();
  } catch (error) {
    console.error('Error deleting product:', error);
    Notifier.error('Failed to delete product: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Close product modal
 */
function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
}

/**
 * Handle product form submission - FIXED VERSION
 */
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const productId = document.getElementById('productId').value;
  const imageFile = document.getElementById('productImage').files[0];
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;

  try {
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Saving...</span>';

    // Validate image file if provided
    if (imageFile) {
      try {
        SecurityUtils.validateImageFile(imageFile);
      } catch (error) {
        throw new Error('Image validation failed: ' + error.message);
      }
    }

    // Upload image if provided
    let imageUrl = null;
    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile, 'products');
      } catch (error) {
        if (error.message.includes('not found')) {
          throw new Error('Storage bucket "product-images" not found. Create it in Supabase Storage.');
        } else if (error.message.includes('policies')) {
          throw new Error('Storage upload failed: Check your storage policies in Supabase.');
        } else {
          throw new Error('Image upload failed: ' + error.message);
        }
      }
    }

    // Prepare specs array
    const specsText = document.getElementById('productSpecs').value.trim();
    const specs = specsText ? specsText.split('\n').filter(s => s.trim()) : [];

    // Prepare product data (with validation)
    const productData = {
      name: document.getElementById('productName').value,
      category_slug: document.getElementById('productCategory').value,
      subcategory_slug: document.getElementById('productSubcategory').value || null,
      price: parseFloat(document.getElementById('productPrice').value),
      old_price: document.getElementById('productOldPrice').value ? parseFloat(document.getElementById('productOldPrice').value) : null,
      brand: document.getElementById('productBrand').value || null,
      rating: parseFloat(document.getElementById('productRating').value) || 0,
      short_desc: document.getElementById('productShortDesc').value || null,
      specs: specs,
      is_featured: document.getElementById('productFeatured').checked,
      is_sale: document.getElementById('productSale').checked,
      in_stock: document.getElementById('productInStock').checked
    };

    // Validate and sanitize product data
    let validatedData;
    try {
      validatedData = SecurityUtils.validateProductData(productData);
    } catch (error) {
      throw new Error('Validation failed: ' + error.message);
    }

    // Add image URL if uploaded
    if (imageUrl) {
      validatedData.image_url = imageUrl;
    } else if (!productId) {
      // New product must have an image
      throw new Error('Product image is required for new products');
    }

    // Add or update product
    if (productId) {
      try {
        await updateProduct(productId, validatedData);
        Notifier.success('Product updated successfully!');
      } catch (error) {
        if (error.message.includes('violates row-level security policy')) {
          throw new Error('Permission denied: Your account cannot update products. Check RLS policies.');
        }
        throw error;
      }
    } else {
      try {
        await addProduct(validatedData);
        Notifier.success('Product added successfully!');
      } catch (error) {
        if (error.message.includes('violates row-level security policy')) {
          throw new Error('Permission denied: Your account cannot add products. Check RLS policies.');
        } else if (error.message.includes('duplicate key')) {
          throw new Error('A product with this name already exists.');
        }
        throw error;
      }
    }

    closeProductModal();
    loadProducts();
    loadStatistics();

  } catch (error) {
    console.error('Error saving product:', error);

    // Show specific error message
    Notifier.error(error.message || 'Failed to save product. Check console for details.');
  } finally {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
});

// ============================================================
// CATEGORIES MANAGEMENT (rest remains the same)
// ============================================================
// ... (Copy the rest from original admin-panel.js)

/**
 * Load all categories
 */
async function loadCategories() {
  const gridEl = document.getElementById('categoriesGrid');

  try {
    allCategories = await getAllCategories();

    if (allCategories.length === 0) {
      gridEl.innerHTML = `
        <div class="col-span-3 text-center py-12 text-gray-500">
          No categories yet. Click "Add Category" to create your first category.
        </div>
      `;
    } else {
      gridEl.innerHTML = allCategories.map(category => `
        <div class="card hover:shadow-md transition-shadow">
          ${category.image_url ? `
            <img src="${category.image_url}" alt="${category.name}" class="w-full h-48 object-cover rounded-lg mb-4">
          ` : `
            <div class="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
              <i data-lucide="image" class="w-12 h-12 text-gray-400"></i>
            </div>
          `}
          <h3 class="text-lg font-bold text-gray-900 mb-2">${category.name}</h3>
          <p class="text-sm text-gray-600 mb-4">${category.tagline || 'No tagline'}</p>
          <div class="flex gap-2">
            <button onclick="editCategory('${category.id}')" class="flex-1 btn-success">
              Edit
            </button>
            <button onclick="deleteCategoryById('${category.id}')" class="flex-1 btn-danger">
              Delete
            </button>
          </div>
        </div>
      `).join('');
    }

    lucide.createIcons();
  } catch (error) {
    console.error('Error loading categories:', error);
    Notifier.error('Failed to load categories. Please refresh the page.');
  }
}

/**
 * Show add category form
 */
function showAddCategoryForm() {
  document.getElementById('categoryModalTitle').textContent = 'Add Category';
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryId').value = '';
  document.getElementById('categoryImagePreview').classList.add('hidden');
  document.getElementById('categoryModal').classList.remove('hidden');
}

/**
 * Edit category
 */
async function editCategory(categoryId) {
  const category = allCategories.find(c => c.id === categoryId);
  if (!category) return;

  document.getElementById('categoryModalTitle').textContent = 'Edit Category';
  document.getElementById('categoryId').value = category.id;
  document.getElementById('categoryName').value = category.name;
  document.getElementById('categorySlug').value = category.slug;
  document.getElementById('categoryTagline').value = category.tagline || '';
  document.getElementById('categoryDescription').value = category.description || '';

  // Show current image
  if (category.image_url) {
    const preview = document.getElementById('categoryImagePreview');
    preview.src = category.image_url;
    preview.classList.remove('hidden');
  }

  document.getElementById('categoryModal').classList.remove('hidden');
}

/**
 * Delete category
 */
async function deleteCategoryById(categoryId) {
  const category = allCategories.find(c => c.id === categoryId);
  if (!category) return;

  if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
    return;
  }

  try {
    await deleteCategory(categoryId);
    Notifier.success('Category deleted successfully!');
    loadCategories();
    loadStatistics();
  } catch (error) {
    console.error('Error deleting category:', error);
    Notifier.error('Failed to delete category: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Close category modal
 */
function closeCategoryModal() {
  document.getElementById('categoryModal').classList.add('hidden');
}

/**
 * Handle category form submission - FIXED VERSION
 */
document.getElementById('categoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const categoryId = document.getElementById('categoryId').value;
  const imageFile = document.getElementById('categoryImage').files[0];
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Saving...</span>';

    // Validate image if provided
    if (imageFile) {
      SecurityUtils.validateImageFile(imageFile);
    }

    // Upload image if provided
    let imageUrl = null;
    if (imageFile) {
      imageUrl = await uploadImage(imageFile, 'categories');
    }

    // Prepare category data
    const categoryData = {
      name: document.getElementById('categoryName').value,
      slug: document.getElementById('categorySlug').value,
      tagline: document.getElementById('categoryTagline').value || null,
      description: document.getElementById('categoryDescription').value || null
    };

    // Validate and sanitize
    const validatedData = SecurityUtils.validateCategoryData(categoryData);

    // Add image URL if uploaded
    if (imageUrl) {
      validatedData.image_url = imageUrl;
    }

    // Add or update category
    if (categoryId) {
      await updateCategory(categoryId, validatedData);
      Notifier.success('Category updated successfully!');
    } else {
      await addCategory(validatedData);
      Notifier.success('Category added successfully!');
    }

    closeCategoryModal();
    loadCategories();
    loadStatistics();
  } catch (error) {
    console.error('Error saving category:', error);
    Notifier.error(error.message || 'Failed to save category. Check console for details.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
});

// ============================================================
// STATISTICS
// ============================================================

/**
 * Load statistics
 */
async function loadStatistics() {
  try {
    const products = await getAllProducts();
    const categories = await getAllCategories();
    const featuredProducts = products.filter(p => p.is_featured);

    document.getElementById('statTotalProducts').textContent = products.length;
    document.getElementById('statTotalCategories').textContent = categories.length;
    document.getElementById('statFeaturedProducts').textContent = featuredProducts.length;
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

// ============================================================
// IMAGE PREVIEW
// ============================================================

// Product image preview
document.getElementById('productImage').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('productImagePreview');
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
});

// Category image preview
document.getElementById('categoryImage').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('categoryImagePreview');
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
});

// ============================================================
// AUTO-GENERATE SLUG
// ============================================================

// Auto-generate slug from category name
document.getElementById('categoryName').addEventListener('input', function(e) {
  if (!document.getElementById('categoryId').value) { // Only for new categories
    const slug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    document.getElementById('categorySlug').value = slug;
  }
});

// ============================================================
// ORDERS MANAGEMENT
// ============================================================

let allOrders = [];

/**
 * Load all orders and render the table
 */
async function loadOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<p class="text-center py-12 text-gray-500">Loading orders...</p>';

  try {
    allOrders = await getAllOrders();
    renderOrdersTable(allOrders);
  } catch (error) {
    console.error('Error loading orders:', error);
    tbody.innerHTML = '<p class="text-center py-12 text-red-500">Failed to load orders. Check console for details.</p>';
  }
}

/**
 * Filter orders based on status and payment method dropdowns
 */
function filterOrders() {
  const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
  const paymentFilter = document.getElementById('paymentMethodFilter')?.value || '';

  let filtered = allOrders;
  if (statusFilter) filtered = filtered.filter(o => o.order_status === statusFilter);
  if (paymentFilter) filtered = filtered.filter(o => o.payment_method === paymentFilter);

  renderOrdersTable(filtered);
}

/**
 * Render orders into the table
 * @param {Array} orders - Array of order objects to render
 */
function renderOrdersTable(orders) {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = '<p class="text-center py-12 text-gray-500">No orders found.</p>';
    return;
  }

  tbody.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead>
          <tr class="bg-gray-50">
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Order #</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Shipping Address</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Total</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Payment</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${orders.map(order => `
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-semibold text-sm text-gray-900">${order.order_number || order.id.slice(0, 8)}</td>
              <td class="px-4 py-3">
                <p class="font-semibold text-sm text-gray-900">${order.customer_name}</p>
                <p class="text-xs text-gray-500">${order.customer_email}</p>
                <p class="text-xs text-gray-500">${order.customer_phone}</p>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600 max-w-xs">
                <p class="font-medium">${order.shipping_address || 'N/A'}</p>
                <p class="text-xs text-gray-500">${order.city || 'N/A'}, ${order.country || 'Pakistan'}</p>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">${new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
              <td class="px-4 py-3 font-semibold text-sm text-gray-900">Rs. ${order.total_amount.toLocaleString()}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${order.payment_method === 'cod' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}">
                  ${order.payment_method === 'cod' ? 'COD' : 'Bank Transfer'}
                </span>
              </td>
              <td class="px-4 py-3">
                <select onchange="changeOrderStatus('${order.id}', this.value)" class="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500">
                  <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>Pending</option>
                  <option value="confirmed" ${order.order_status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                  <option value="shipped" ${order.order_status === 'shipped' ? 'selected' : ''}>Shipped</option>
                  <option value="delivered" ${order.order_status === 'delivered' ? 'selected' : ''}>Delivered</option>
                  <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
              </td>
              <td class="px-4 py-3">
                <button onclick="viewOrderDetails('${order.id}')" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View Details
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * View detailed order information in a modal
 * @param {string} orderId - UUID of the order
 */
function viewOrderDetails(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const items = order.order_items || [];
  const itemsHtml = items.map(item => `
    <div class="flex items-center gap-3 py-3 border-b border-gray-200">
      <img src="${item.image || ''}" alt="${item.name}" class="w-16 h-16 object-cover rounded">
      <div class="flex-1">
        <p class="font-semibold text-gray-900">${item.name}</p>
        <p class="text-sm text-gray-500">Qty: ${item.qty}</p>
      </div>
      <p class="font-semibold text-gray-900">Rs. ${(item.price * item.qty).toLocaleString()}</p>
    </div>
  `).join('');

  const modalHtml = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" id="orderDetailsModal">
      <div class="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 class="text-2xl font-bold text-gray-900">Order Details</h2>
          <button onclick="document.getElementById('orderDetailsModal').remove()" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="p-6">
          <!-- Order Info -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p class="text-sm text-gray-500">Order Number</p>
              <p class="font-semibold text-gray-900">${order.order_number || order.id.slice(0, 8)}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Order Date</p>
              <p class="font-semibold text-gray-900">${new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Payment Method</p>
              <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${order.payment_method === 'cod' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}">
                ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}
              </span>
            </div>
            <div>
              <p class="text-sm text-gray-500">Order Status</p>
              <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                order.order_status === 'delivered' ? 'bg-green-100 text-green-800' :
                order.order_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                order.order_status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }">
                ${order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
              </span>
            </div>
          </div>

          <!-- Customer Info -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Customer Information</h3>
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-sm text-gray-500">Name</p>
                  <p class="font-semibold text-gray-900">${order.customer_name}</p>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Phone</p>
                  <p class="font-semibold text-gray-900">${order.customer_phone}</p>
                </div>
                <div class="col-span-2">
                  <p class="text-sm text-gray-500">Email</p>
                  <p class="font-semibold text-gray-900">${order.customer_email}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Shipping Address -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Shipping Address</h3>
            <div class="bg-gray-50 rounded-lg p-4">
              <p class="text-gray-900">${order.shipping_address || 'N/A'}</p>
              <p class="text-gray-600 mt-1">${order.city || 'N/A'}, ${order.country || 'Pakistan'}</p>
            </div>
          </div>

          <!-- Order Items -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Order Items</h3>
            <div class="bg-gray-50 rounded-lg p-4">
              ${itemsHtml}
            </div>
          </div>

          <!-- Order Summary -->
          <div class="bg-blue-50 rounded-lg p-4">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Order Summary</h3>
            <div class="space-y-2">
              <div class="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>Rs. ${order.subtotal.toLocaleString()}</span>
              </div>
              <div class="flex justify-between text-gray-700">
                <span>Shipping Charge</span>
                <span>Rs. ${order.shipping_charge.toLocaleString()}</span>
              </div>
              ${order.cod_charge ? `
                <div class="flex justify-between text-gray-700">
                  <span>COD Charge</span>
                  <span>Rs. ${order.cod_charge.toLocaleString()}</span>
                </div>
              ` : ''}
              <div class="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-blue-200">
                <span>Total Amount</span>
                <span>Rs. ${order.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex gap-3">
            <a href="https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(order.customer_name)},%20regarding%20your%20order%20${order.order_number || order.id.slice(0, 8)}"
               target="_blank"
               class="flex-1 px-4 py-2 bg-[#25D366] text-white font-semibold rounded-lg hover:bg-[#20bd5a] transition-all text-center">
              Contact via WhatsApp
            </a>
            <button onclick="document.getElementById('orderDetailsModal').remove()"
                    class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-all">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Update an order's status
 * @param {string} orderId - UUID of the order
 * @param {string} newStatus - New status string
 */
async function changeOrderStatus(orderId, newStatus) {
  try {
    await updateOrderStatus(orderId, newStatus);
    Notifier.success(`Order status updated to "${newStatus}"`);
    // Update local cache
    const order = allOrders.find(o => o.id === orderId);
    if (order) order.order_status = newStatus;
  } catch (error) {
    console.error('Error updating order status:', error);
    Notifier.error('Failed to update order status: ' + (error.message || 'Unknown error'));
    // Reload to restore correct state
    loadOrdersTable();
  }
}

// ============================================================
// PATCH showTab TO AUTO-LOAD ORDERS
// ============================================================
// When the Orders tab is activated, automatically fetch latest orders.
// We do this by wrapping the existing showTab function.
(function () {
  const _orig = showTab;
  showTab = function(tabName) {
    _orig.call(this, tabName);
    if (tabName === 'orders') {
      loadOrdersTable();
    }
  };
})();

// ============================================================
// PRODUCT SEARCH FUNCTIONALITY
// ============================================================

/**
 * Search products by name, brand, or category
 */
function searchProducts() {
  const searchInput = document.getElementById('productSearchInput');
  const searchQuery = searchInput.value.toLowerCase().trim();
  const clearBtn = document.getElementById('clearSearchBtn');
  const resultsCount = document.getElementById('searchResultsCount');

  // Show/hide clear button
  if (searchQuery.length > 0) {
    clearBtn.classList.remove('hidden');
  } else {
    clearBtn.classList.add('hidden');
    resultsCount.classList.add('hidden');
  }

  // If empty search, show all products
  if (searchQuery.length === 0) {
    renderProducts(allProducts);
    return;
  }

  // Filter products
  const filteredProducts = allProducts.filter(product => {
    const name = (product.name || '').toLowerCase();
    const brand = (product.brand || '').toLowerCase();
    const category = (product.category_slug || '').toLowerCase();

    return name.includes(searchQuery) ||
           brand.includes(searchQuery) ||
           category.includes(searchQuery);
  });

  // Update results count
  if (filteredProducts.length === 0) {
    resultsCount.textContent = `No products found for "${searchQuery}"`;
    resultsCount.classList.remove('hidden');
  } else if (filteredProducts.length === allProducts.length) {
    resultsCount.classList.add('hidden');
  } else {
    resultsCount.textContent = `Found ${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'} matching "${searchQuery}"`;
    resultsCount.classList.remove('hidden');
  }

  // Render filtered products
  renderProducts(filteredProducts);
}

/**
 * Clear search and show all products
 */
function clearSearch() {
  const searchInput = document.getElementById('productSearchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  const resultsCount = document.getElementById('searchResultsCount');

  searchInput.value = '';
  clearBtn.classList.add('hidden');
  resultsCount.classList.add('hidden');

  renderProducts(allProducts);
  searchInput.focus();
}

/**
 * Render products into the table
 * @param {Array} products - Array of products to render
 */
function renderProducts(products) {
  const tableBody = document.getElementById('productsTableBody');

  if (products.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-12 text-center text-gray-500">
          No products found. Try a different search term.
        </td>
      </tr>
    `;
  } else {
    tableBody.innerHTML = products.map(product => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <img src="${product.image_url}" alt="${product.name}" class="w-16 h-16 object-cover rounded-lg">
            <div>
              <p class="font-semibold text-gray-900">${product.name}</p>
              <p class="text-sm text-gray-500">${product.brand || 'No brand'}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            ${product.category_slug}
          </span>
        </td>
        <td class="px-6 py-4">
          <p class="font-semibold text-gray-900">Rs. ${product.price.toLocaleString()}</p>
          ${product.old_price ? `<p class="text-sm text-gray-500 line-through">Rs. ${product.old_price.toLocaleString()}</p>` : ''}
        </td>
        <td class="px-6 py-4">
          <span class="px-2 py-1 text-xs font-semibold rounded-full ${product.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
            ${product.in_stock ? 'In Stock' : 'Out of Stock'}
          </span>
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex justify-end gap-2">
            <button onclick="editProduct('${product.id}')" class="btn-success">
              Edit
            </button>
            <button onclick="deleteProductById('${product.id}')" class="btn-danger">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  lucide.createIcons();
}

console.log('✅ Admin panel (FIXED version) loaded successfully!');
