/**
 * ============================================================
 * WEBSITE LOADER - Connects Website to Supabase Database
 * ============================================================
 * This file loads products and categories from Supabase
 * and displays them on your website pages
 *
 * REQUIRED: Must load AFTER supabase-client.js
 * ============================================================
 */

// ============================================================
// HOMEPAGE - FEATURED PRODUCTS
// ============================================================

/**
 * Load and display featured products on homepage
 */
async function loadFeaturedProducts() {
  const container = document.getElementById('featured-products-grid');
  if (!container) return;

  try {
    // Show loading state
    container.innerHTML = '<div class="col-span-full text-center py-12"><div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div>';

    // Fetch featured products from database
    const products = await getFeaturedProducts();

    if (products.length === 0) {
      container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">No featured products yet.</div>';
      return;
    }

    // Render products
    container.innerHTML = products.map(product => createProductCard(product)).join('');

    // Reinitialize icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  } catch (error) {
    console.error('Error loading featured products:', error);
    container.innerHTML = '<div class="col-span-full text-center py-12 text-red-500">Failed to load products.</div>';
  }
}

/**
 * Load products for a specific category page
 */
async function loadCategoryProducts(categorySlug) {
  const container = document.getElementById('products-grid');
  if (!container) return;

  try {
    // Show loading state
    container.innerHTML = '<div class="col-span-full text-center py-12"><div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div>';

    // Fetch products for this category
    const products = await getProductsByCategory(categorySlug);

    if (products.length === 0) {
      container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">No products in this category yet.</div>';
      return;
    }

    // Render products
    container.innerHTML = products.map(product => createProductCard(product)).join('');

    // Update product count
    const countElement = document.getElementById('products-count');
    if (countElement) {
      countElement.textContent = `${products.length} Products`;
    }

    // Reinitialize icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  } catch (error) {
    console.error('Error loading category products:', error);
    container.innerHTML = '<div class="col-span-full text-center py-12 text-red-500">Failed to load products.</div>';
  }
}

/**
 * Load all categories for homepage
 * DISABLED - Keep original category display from site-nav.js
 */
async function loadHomeCategories() {
  // DO NOT REPLACE the original category cards
  // They are rendered by ElectradeNav.renderHomeCards() in site-nav.js
  // This function is intentionally left empty
  return;
}

/**
 * Create a product card HTML
 */
function createProductCard(product) {
  const discountPercent = product.old_price
    ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
    : 0;

  return `
    <div class="product-card bg-white rounded-xl border border-brandBorder hover:shadow-lg transition-all group">
      <a href="product.html?id=${product.id}" class="block">
        <!-- Product Image -->
        <div class="relative overflow-hidden rounded-t-xl bg-gray-50">
          <img
            src="${product.image_url || 'https://via.placeholder.com/400x300?text=No+Image'}"
            alt="${product.name}"
            class="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
          >

          ${discountPercent > 0 ? `
            <span class="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              -${discountPercent}%
            </span>
          ` : ''}

          ${!product.in_stock ? `
            <span class="absolute top-3 right-3 bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full">
              Out of Stock
            </span>
          ` : ''}
        </div>

        <!-- Product Info -->
        <div class="p-4">
          ${product.brand ? `
            <p class="text-xs text-brandMuted uppercase tracking-wide mb-1">${product.brand}</p>
          ` : ''}

          <h3 class="font-semibold text-brandText group-hover:text-amber-600 transition-colors mb-2 line-clamp-2">
            ${product.name}
          </h3>

          ${product.rating > 0 ? `
            <div class="flex items-center gap-1 mb-2">
              ${Array.from({length: 5}, (_, i) => `
                <i data-lucide="star" class="w-3 h-3 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}"></i>
              `).join('')}
              <span class="text-xs text-brandMuted ml-1">(${product.rating})</span>
            </div>
          ` : ''}

          <!-- Price -->
          <div class="flex items-baseline gap-2 mb-3">
            <span class="text-xl font-bold text-brandText">
              Rs. ${product.price.toLocaleString()}
            </span>
            ${product.old_price ? `
              <span class="text-sm text-brandMuted line-through">
                Rs. ${product.old_price.toLocaleString()}
              </span>
            ` : ''}
          </div>

          ${product.short_desc ? `
            <p class="text-sm text-brandMuted line-clamp-2 mb-3">
              ${product.short_desc}
            </p>
          ` : ''}
        </div>
      </a>

      <!-- Add to Cart Button -->
      <div class="px-4 pb-4">
        <button
          onclick="addToCart('${product.id}'); event.stopPropagation();"
          class="w-full bg-brandDarkBtn text-white py-2.5 rounded-lg hover:bg-opacity-90 transition-all font-semibold text-sm ${!product.in_stock ? 'opacity-50 cursor-not-allowed' : ''}"
          ${!product.in_stock ? 'disabled' : ''}
        >
          <span class="flex items-center justify-center gap-2">
            <i data-lucide="shopping-cart" class="w-4 h-4"></i>
            ${product.in_stock ? 'Add to Cart' : 'Out of Stock'}
          </span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Load single product details
 */
async function loadProductDetails() {
  // Get product ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    console.error('No product ID in URL');
    return;
  }

  try {
    // Fetch product from database
    const { data: product, error } = await sb
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) throw error;
    if (!product) {
      document.getElementById('product-details').innerHTML = '<div class="text-center py-12 text-red-500">Product not found.</div>';
      return;
    }

    // Populate product details
    populateProductDetails(product);

    // Load related products
    loadRelatedProducts(product.category_slug, productId);

  } catch (error) {
    console.error('Error loading product:', error);
    document.getElementById('product-details').innerHTML = '<div class="text-center py-12 text-red-500">Failed to load product.</div>';
  }
}

/**
 * Populate product detail page
 */
function populateProductDetails(product) {
  // Update page title
  document.title = `${product.name} | Electrade`;

  // Product image
  const imageContainer = document.getElementById('product-image');
  if (imageContainer) {
    imageContainer.innerHTML = `
      <img src="${product.image_url}" alt="${product.name}" class="w-full h-auto rounded-xl">
    `;
  }

  // Product info
  const infoContainer = document.getElementById('product-info');
  if (infoContainer) {
    const discountPercent = product.old_price
      ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
      : 0;

    infoContainer.innerHTML = `
      ${product.brand ? `<p class="text-sm text-brandMuted uppercase tracking-wide mb-2">${product.brand}</p>` : ''}

      <h1 class="text-3xl lg:text-4xl font-bold text-brandText mb-4">${product.name}</h1>

      ${product.rating > 0 ? `
        <div class="flex items-center gap-2 mb-4">
          ${Array.from({length: 5}, (_, i) => `
            <i data-lucide="star" class="w-5 h-5 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}"></i>
          `).join('')}
          <span class="text-sm text-brandMuted">(${product.rating} rating)</span>
        </div>
      ` : ''}

      <div class="flex items-baseline gap-3 mb-6">
        <span class="text-4xl font-bold text-brandText">Rs. ${product.price.toLocaleString()}</span>
        ${product.old_price ? `
          <span class="text-xl text-brandMuted line-through">Rs. ${product.old_price.toLocaleString()}</span>
          <span class="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">-${discountPercent}%</span>
        ` : ''}
      </div>

      ${product.short_desc ? `
        <p class="text-brandMuted mb-6">${product.short_desc}</p>
      ` : ''}

      <div class="mb-6">
        <span class="inline-block px-4 py-2 rounded-lg text-sm font-semibold ${product.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          ${product.in_stock ? '✓ In Stock' : '✗ Out of Stock'}
        </span>
      </div>

      <button
        onclick="addToCart('${product.id}')"
        class="w-full md:w-auto bg-brandDarkBtn text-white px-8 py-4 rounded-lg hover:bg-opacity-90 transition-all font-bold text-lg ${!product.in_stock ? 'opacity-50 cursor-not-allowed' : ''}"
        ${!product.in_stock ? 'disabled' : ''}
      >
        <span class="flex items-center justify-center gap-3">
          <i data-lucide="shopping-cart" class="w-5 h-5"></i>
          ${product.in_stock ? 'Add to Cart' : 'Out of Stock'}
        </span>
      </button>
    `;
  }

  // Specifications
  if (product.specs && product.specs.length > 0) {
    const specsContainer = document.getElementById('product-specs');
    if (specsContainer) {
      specsContainer.innerHTML = `
        <h3 class="text-2xl font-bold text-brandText mb-4">Specifications</h3>
        <ul class="space-y-2">
          ${product.specs.map(spec => `
            <li class="flex items-start gap-2">
              <i data-lucide="check-circle" class="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"></i>
              <span class="text-brandText">${spec}</span>
            </li>
          `).join('')}
        </ul>
      `;
    }
  }

  // Reinitialize icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

/**
 * Load related products
 */
async function loadRelatedProducts(categorySlug, currentProductId) {
  const container = document.getElementById('related-products');
  if (!container) return;

  try {
    const products = await getProductsByCategory(categorySlug);
    const relatedProducts = products
      .filter(p => p.id !== currentProductId)
      .slice(0, 4);

    if (relatedProducts.length > 0) {
      container.innerHTML = `
        <h3 class="text-2xl font-bold text-brandText mb-6">Related Products</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${relatedProducts.map(product => createProductCard(product)).join('')}
        </div>
      `;

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
  } catch (error) {
    console.error('Error loading related products:', error);
  }
}

// ============================================================
// AUTO-LOAD FUNCTIONS BASED ON PAGE
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Wait for Supabase to be ready
  try {
    await waitForSupabase();

    // Detect which page we're on and load appropriate data
    const path = window.location.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1);

    // Homepage
    if (filename === 'index.html' || filename === '') {
      loadFeaturedProducts();
      // DON'T call loadHomeCategories() - it's handled by site-nav.js
    }

    // Category pages
    else if (filename === 'led.html') {
      loadCategoryProducts('led');
    }
    else if (filename === 'refrigerators.html') {
      loadCategoryProducts('refrigerators');
    }
    else if (filename === 'washing-machines.html') {
      loadCategoryProducts('washing-machines');
    }
    else if (filename === 'air-conditioners.html') {
      loadCategoryProducts('air-conditioners');
    }
    else if (filename === 'kitchen-appliances.html') {
      loadCategoryProducts('kitchen-appliances');
    }
    else if (filename === 'home-audio.html') {
      loadCategoryProducts('home-audio');
    }
    else if (filename === 'electronics.html') {
      loadCategoryProducts('electronics');
    }
    else if (filename === 'cooling-heating.html') {
      loadCategoryProducts('cooling-heating');
    }
    else if (filename === 'iron-garment-care.html') {
      loadCategoryProducts('iron-garment-care');
    }
    else if (filename === 'vacuum-floor-care.html') {
      loadCategoryProducts('vacuum-floor-care');
    }
    else if (filename === 'power-tools.html') {
      loadCategoryProducts('power-tools');
    }
    else if (filename === 'commercial-products.html') {
      loadCategoryProducts('commercial-products');
    }
    else if (filename === 'projectors-tv-accessories.html') {
      loadCategoryProducts('projectors-tv-accessories');
    }

    // Product detail page
    else if (filename === 'product.html') {
      loadProductDetails();
    }

    // Sale items page
    else if (filename === 'sale-items.html') {
      loadSaleProducts();
    }

  } catch (error) {
    console.error('Error initializing website:', error);
  }
});

/**
 * Load sale products
 */
async function loadSaleProducts() {
  const container = document.getElementById('products-grid');
  if (!container) return;

  try {
    container.innerHTML = '<div class="col-span-full text-center py-12"><div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div>';

    const products = await getSaleProducts();

    if (products.length === 0) {
      container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">No sale products yet.</div>';
      return;
    }

    container.innerHTML = products.map(product => createProductCard(product)).join('');

    const countElement = document.getElementById('products-count');
    if (countElement) {
      countElement.textContent = `${products.length} Products`;
    }

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  } catch (error) {
    console.error('Error loading sale products:', error);
    container.innerHTML = '<div class="col-span-full text-center py-12 text-red-500">Failed to load products.</div>';
  }
}

console.log('✅ Website Loader initialized - Products will load from Supabase!');
