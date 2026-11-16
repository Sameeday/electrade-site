/**
 * ============================================================
 * CHECKOUT JAVASCRIPT - WITH ORDER SAVING
 * ============================================================
 * Add this script to checkout.html AFTER the existing scripts
 * This replaces the dummy form submit handler with real order saving
 *
 * INSTRUCTIONS:
 * 1. Make sure supabase-02-orders-system.sql is run in Supabase
 * 2. Add security.js to checkout.html: <script src="security.js"></script>
 * 3. Add supabase-orders-functions.js: <script src="supabase-orders-functions.js"></script>
 * 4. Replace the checkout form handler (line 483-494) with this code
 * ============================================================
 */

// ---- IMPROVED FORM SUBMIT WITH ORDER SAVING ----
document.getElementById('checkout-form')?.addEventListener('submit', async function (e) {
  e.preventDefault();

  const submitBtn = this.querySelector('button[type="submit"]');
  const originalBtnContent = submitBtn.innerHTML;

  try {
    // Disable submit button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Processing order...</span>';

    // Get form data
    const formData = {
      customer_name: document.getElementById('full-name').value.trim(),
      customer_email: document.getElementById('email').value.trim(),
      customer_phone: document.getElementById('phone').value.trim(),
      shipping_address: document.getElementById('address').value.trim(),
      city: document.getElementById('city').value.trim(),
      country: document.getElementById('country').value || 'Pakistan'
    };

    // Validate form data
    try {
      const validated = SecurityUtils.validateOrderData({
        ...formData,
        order_items: orderItems, // from existing checkout.js
        subtotal: orderSubtotal,
        shipping_charge: SHIPPING_CHARGE,
        cod_charge: document.getElementById('payment-cod').checked ? COD_CHARGE : 0,
        total_amount: parseFloat(document.getElementById('summary-total').textContent.replace(/[^\d]/g, '')),
        payment_method: document.getElementById('payment-cod').checked ? 'cod' : 'bank'
      });

      // Replace formData with validated data
      Object.assign(formData, validated);
    } catch (error) {
      throw new Error('Validation error: ' + error.message);
    }

    // Prepare order items for database
    const dbOrderItems = orderItems.map(item => ({
      id: item.id,
      name: item.name,
      qty: item.qty,
      price: item.price,
      image: item.image
    }));

    // Calculate totals
    const isCod = document.getElementById('payment-cod').checked;
    const shippingCharge = SHIPPING_CHARGE;
    const codCharge = isCod ? COD_CHARGE : 0;
    const totalAmount = orderSubtotal + shippingCharge + codCharge;

    // Prepare order data for database
    const orderData = {
      customer_name: formData.customer_name,
      customer_email: formData.customer_email,
      customer_phone: formData.customer_phone,
      shipping_address: formData.shipping_address,
      city: formData.city,
      country: formData.country,
      order_items: dbOrderItems,
      subtotal: orderSubtotal,
      shipping_charge: shippingCharge,
      cod_charge: codCharge,
      total_amount: totalAmount,
      payment_method: isCod ? 'cod' : 'bank',
      payment_status: 'pending',
      order_status: 'pending'
    };

    // Save order to database
    let savedOrder;
    try {
      savedOrder = await createOrder(orderData);
    } catch (error) {
      console.error('Database error:', error);

      if (error.message.includes('relation "orders" does not exist')) {
        throw new Error('Orders system not set up. Run supabase-02-orders-system.sql in Supabase.');
      } else if (error.message.includes('violates row-level security')) {
        throw new Error('Order creation blocked by security policy. Check Supabase RLS policies.');
      } else {
        throw new Error('Failed to save order: ' + error.message);
      }
    }

    // Success! Show order confirmation
    submitBtn.innerHTML = `
      <span class="flex items-center gap-2">
        <i data-lucide="check-circle" class="w-5 h-5"></i>
        <span>Order Placed Successfully!</span>
      </span>
    `;

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Show order details
    const orderNumber = savedOrder.order_number;
    const confirmationMessage = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
        <div class="bg-white rounded-xl max-w-lg w-full p-8 text-center">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i data-lucide="check" class="w-10 h-10 text-green-600"></i>
          </div>

          <h2 class="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h2>
          <p class="text-gray-600 mb-6">Thank you for your order. We'll contact you shortly to confirm.</p>

          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <p class="text-sm text-gray-600 mb-1">Your Order Number</p>
            <p class="text-2xl font-bold text-gray-900">${orderNumber}</p>
          </div>

          <div class="text-left bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm">
            <p class="font-semibold text-blue-900 mb-2">📱 Next Steps:</p>
            <ol class="list-decimal list-inside text-blue-800 space-y-1">
              <li>Save your order number: <strong>${orderNumber}</strong></li>
              ${isCod ?
                '<li>We\'ll call you within 24 hours to confirm</li>' :
                '<li>Transfer the amount and send screenshot on WhatsApp</li>'
              }
              <li>Your order will be dispatched after confirmation</li>
              <li>Track your order status via WhatsApp</li>
            </ol>
          </div>

          <div class="flex gap-3">
            <a href="https://wa.me/923239883836?text=My%20order%20number%3A%20${orderNumber}"
               target="_blank"
               class="flex-1 px-6 py-3 bg-[#25D366] text-white font-semibold rounded-lg hover:bg-[#20bd5a] transition-all flex items-center justify-center gap-2">
              <i data-lucide="message-circle" class="w-4 h-4"></i>
              <span>WhatsApp Us</span>
            </a>

            <a href="index.html"
               class="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-all">
              Continue Shopping
            </a>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', confirmationMessage);

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Clear cart after successful order
    if (!isBuyNow) {
      clearCart();
    } else {
      clearBuyNowItem();
    }

    // Send order confirmation to admin (optional - requires email service)
    // sendOrderNotificationEmail(savedOrder);

  } catch (error) {
    console.error('Order submission error:', error);

    // Show error message
    const errorMessage = error.message || 'Failed to place order. Please try again.';

    const errorDialog = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
        <div class="bg-white rounded-xl max-w-md w-full p-8 text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i data-lucide="alert-circle" class="w-10 h-10 text-red-600"></i>
          </div>

          <h2 class="text-2xl font-bold text-gray-900 mb-2">Order Failed</h2>
          <p class="text-gray-600 mb-6">${errorMessage}</p>

          <div class="flex gap-3">
            <button onclick="this.closest('.fixed').remove()"
                    class="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-all">
              Try Again
            </button>

            <a href="https://wa.me/923239883836?text=I%20need%20help%20placing%20an%20order"
               target="_blank"
               class="flex-1 px-6 py-3 bg-[#25D366] text-white font-semibold rounded-lg hover:bg-[#20bd5a] transition-all flex items-center justify-center gap-2">
              <i data-lucide="message-circle" class="w-4 h-4"></i>
              <span>Get Help</span>
            </a>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', errorDialog);

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Reset submit button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnContent;

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
});

console.log('✅ Checkout with order saving loaded!');
