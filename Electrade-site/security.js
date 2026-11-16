/**
 * ============================================================
 * SECURITY UTILITIES
 * ============================================================
 * Input validation, sanitization, and security helpers
 * for Electrade e-commerce platform
 * ============================================================
 */

const SecurityUtils = {
  /**
   * Sanitize HTML to prevent XSS attacks
   * @param {string} str - Input string
   * @returns {string} Sanitized string
   */
  sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  /**
   * Validate Pakistani phone number
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid
   */
  isValidPhone(phone) {
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s-]/g, '');
    // Match Pakistan mobile format: 03XX-XXXXXXX or +923XXXXXXXXX
    const regex = /^(\+92|0)?3[0-9]{9}$/;
    return regex.test(cleaned);
  },

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate image file
   * @param {File} file - Image file to validate
   * @throws {Error} If validation fails
   * @returns {boolean} True if valid
   */
  validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!file) {
      throw new Error('No file selected');
    }

    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.');
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 5MB.');
    }

    if (file.size < 1024) {
      throw new Error('File too small. Minimum size is 1KB.');
    }

    return true;
  },

  /**
   * Validate price
   * @param {number|string} price - Price to validate
   * @throws {Error} If validation fails
   * @returns {number} Validated price
   */
  validatePrice(price) {
    const num = parseFloat(price);

    if (isNaN(num)) {
      throw new Error('Invalid price. Must be a number.');
    }

    if (num < 0) {
      throw new Error('Price cannot be negative.');
    }

    if (num > 10000000) {
      throw new Error('Price too high. Maximum is Rs. 10,000,000.');
    }

    return num;
  },

  /**
   * Validate rating
   * @param {number|string} rating - Rating to validate (0-5)
   * @throws {Error} If validation fails
   * @returns {number} Validated rating
   */
  validateRating(rating) {
    const num = parseFloat(rating);

    if (isNaN(num)) {
      throw new Error('Invalid rating. Must be a number.');
    }

    if (num < 0 || num > 5) {
      throw new Error('Rating must be between 0 and 5.');
    }

    return num;
  },

  /**
   * Validate and sanitize product data
   * @param {Object} productData - Product data object
   * @returns {Object} Validated and sanitized product data
   */
  validateProductData(productData) {
    const validated = {};

    // Required fields
    if (!productData.name || !productData.name.trim()) {
      throw new Error('Product name is required');
    }
    validated.name = this.sanitizeHTML(productData.name.trim());

    if (!productData.category_slug || !productData.category_slug.trim()) {
      throw new Error('Category is required');
    }
    validated.category_slug = productData.category_slug.trim();

    if (!productData.price) {
      throw new Error('Price is required');
    }
    validated.price = this.validatePrice(productData.price);

    // Optional fields
    validated.subcategory_slug = productData.subcategory_slug ? productData.subcategory_slug.trim() : null;

    validated.old_price = productData.old_price ? this.validatePrice(productData.old_price) : null;

    validated.brand = productData.brand ? this.sanitizeHTML(productData.brand.trim()) : null;

    validated.rating = productData.rating ? this.validateRating(productData.rating) : 0;

    validated.short_desc = productData.short_desc ? this.sanitizeHTML(productData.short_desc.trim()) : null;

    // Validate specs array
    if (productData.specs && Array.isArray(productData.specs)) {
      validated.specs = productData.specs
        .map(spec => this.sanitizeHTML(spec.trim()))
        .filter(spec => spec.length > 0);
    } else {
      validated.specs = [];
    }

    // Boolean flags
    validated.is_featured = Boolean(productData.is_featured);
    validated.is_sale = Boolean(productData.is_sale);
    validated.in_stock = Boolean(productData.in_stock);

    // Image URL (if provided)
    if (productData.image_url) {
      if (!this.isValidURL(productData.image_url)) {
        throw new Error('Invalid image URL');
      }
      validated.image_url = productData.image_url;
    }

    return validated;
  },

  /**
   * Validate and sanitize category data
   * @param {Object} categoryData - Category data object
   * @returns {Object} Validated and sanitized category data
   */
  validateCategoryData(categoryData) {
    const validated = {};

    // Required fields
    if (!categoryData.name || !categoryData.name.trim()) {
      throw new Error('Category name is required');
    }
    validated.name = this.sanitizeHTML(categoryData.name.trim());

    if (!categoryData.slug || !categoryData.slug.trim()) {
      throw new Error('Category slug is required');
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slug = categoryData.slug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
    }
    validated.slug = slug;

    // Optional fields
    validated.tagline = categoryData.tagline ? this.sanitizeHTML(categoryData.tagline.trim()) : null;
    validated.description = categoryData.description ? this.sanitizeHTML(categoryData.description.trim()) : null;

    // Image URL (if provided)
    if (categoryData.image_url) {
      if (!this.isValidURL(categoryData.image_url)) {
        throw new Error('Invalid image URL');
      }
      validated.image_url = categoryData.image_url;
    }

    return validated;
  },

  /**
   * Validate order data
   * @param {Object} orderData - Order data object
   * @returns {Object} Validated order data
   */
  validateOrderData(orderData) {
    const validated = {};

    // Customer information
    if (!orderData.customer_name || !orderData.customer_name.trim()) {
      throw new Error('Full name is required');
    }
    validated.customer_name = this.sanitizeHTML(orderData.customer_name.trim());

    if (!orderData.customer_email || !orderData.customer_email.trim()) {
      throw new Error('Email is required');
    }
    if (!this.isValidEmail(orderData.customer_email)) {
      throw new Error('Invalid email address');
    }
    validated.customer_email = orderData.customer_email.trim().toLowerCase();

    if (!orderData.customer_phone || !orderData.customer_phone.trim()) {
      throw new Error('Phone number is required');
    }
    if (!this.isValidPhone(orderData.customer_phone)) {
      throw new Error('Invalid phone number. Please use format: 03XX-XXXXXXX');
    }
    validated.customer_phone = orderData.customer_phone.trim();

    // Shipping address
    if (!orderData.shipping_address || !orderData.shipping_address.trim()) {
      throw new Error('Shipping address is required');
    }
    validated.shipping_address = this.sanitizeHTML(orderData.shipping_address.trim());

    if (!orderData.city || !orderData.city.trim()) {
      throw new Error('City is required');
    }
    validated.city = this.sanitizeHTML(orderData.city.trim());

    validated.country = 'Pakistan'; // Fixed to Pakistan

    // Order items (must be valid JSON array)
    if (!orderData.order_items || !Array.isArray(orderData.order_items) || orderData.order_items.length === 0) {
      throw new Error('Order must contain at least one item');
    }
    validated.order_items = orderData.order_items;

    // Pricing
    validated.subtotal = this.validatePrice(orderData.subtotal);
    validated.shipping_charge = this.validatePrice(orderData.shipping_charge);
    validated.cod_charge = orderData.cod_charge ? this.validatePrice(orderData.cod_charge) : 0;
    validated.total_amount = this.validatePrice(orderData.total_amount);

    // Payment method
    if (!['cod', 'bank'].includes(orderData.payment_method)) {
      throw new Error('Invalid payment method');
    }
    validated.payment_method = orderData.payment_method;

    return validated;
  }
};

/**
 * ============================================================
 * RATE LIMITER
 * ============================================================
 * Simple client-side rate limiting to prevent abuse
 * (This is for UX only - server-side rate limiting is required)
 */
const RateLimiter = {
  attempts: {},

  /**
   * Check if action is rate limited
   * @param {string} action - Action identifier
   * @param {number} maxAttempts - Maximum attempts allowed
   * @param {number} windowMs - Time window in milliseconds
   * @throws {Error} If rate limit exceeded
   * @returns {boolean} True if allowed
   */
  check(action, maxAttempts = 5, windowMs = 60000) {
    const now = Date.now();
    const key = action;

    if (!this.attempts[key]) {
      this.attempts[key] = [];
    }

    // Clean old attempts outside the time window
    this.attempts[key] = this.attempts[key].filter(timestamp => now - timestamp < windowMs);

    if (this.attempts[key].length >= maxAttempts) {
      const oldestAttempt = Math.min(...this.attempts[key]);
      const waitTime = Math.ceil((windowMs - (now - oldestAttempt)) / 1000);
      throw new Error(`Too many attempts. Please wait ${waitTime} seconds before trying again.`);
    }

    this.attempts[key].push(now);
    return true;
  },

  /**
   * Reset attempts for an action
   * @param {string} action - Action identifier
   */
  reset(action) {
    delete this.attempts[action];
  }
};

/**
 * ============================================================
 * NOTIFICATION SYSTEM
 * ============================================================
 * Better UX than alert() for showing messages to users
 */
const Notifier = {
  /**
   * Show a notification
   * @param {string} message - Message to display
   * @param {string} type - Type: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duration in ms (default 5000)
   */
  show(message, type = 'info', duration = 5000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-[9999] max-w-md bg-white border-2 rounded-lg shadow-lg p-4 flex items-start gap-3 transform translate-x-full transition-transform duration-300`;

    // Border color based on type
    const colors = {
      success: 'border-green-500',
      error: 'border-red-500',
      warning: 'border-yellow-500',
      info: 'border-blue-500'
    };

    notification.classList.add(colors[type] || colors.info);

    // Icon based on type
    const icons = {
      success: 'check-circle',
      error: 'alert-circle',
      warning: 'alert-triangle',
      info: 'info'
    };

    notification.innerHTML = `
      <i data-lucide="${icons[type] || icons.info}" class="w-5 h-5 flex-shrink-0 ${
        type === 'success' ? 'text-green-600' :
        type === 'error' ? 'text-red-600' :
        type === 'warning' ? 'text-yellow-600' :
        'text-blue-600'
      }"></i>
      <p class="text-sm text-gray-800 flex-1">${message}</p>
      <button class="text-gray-400 hover:text-gray-600" onclick="this.parentElement.remove()">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    `;

    document.body.appendChild(notification);

    // Initialize icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Slide in
    setTimeout(() => notification.classList.remove('translate-x-full'), 10);

    // Auto remove after duration
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => notification.remove(), 300);
    }, duration);
  },

  success(message, duration) {
    this.show(message, 'success', duration);
  },

  error(message, duration) {
    this.show(message, 'error', duration);
  },

  warning(message, duration) {
    this.show(message, 'warning', duration);
  },

  info(message, duration) {
    this.show(message, 'info', duration);
  }
};

console.log('🔒 Security utilities loaded successfully!');
