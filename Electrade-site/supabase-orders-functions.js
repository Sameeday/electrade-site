/**
 * ============================================================
 * SUPABASE CLIENT - ORDERS FUNCTIONS
 * ============================================================
 * Add these functions to your supabase-client.js file
 * These enable order saving and management
 * ============================================================
 */

// ============================================================
// DATABASE FUNCTIONS - Orders
// ============================================================

/**
 * Create a new order
 * @param {Object} orderData - Order object
 * @returns {Promise<Object>} Created order with order_number
 */
async function createOrder(orderData) {
  try {
    await waitForSupabase();

    const { data, error } = await sb
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Order created successfully!');
    return data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Get all orders (Admin only)
 * @returns {Promise<Array>} Array of orders
 */
async function getAllOrders() {
  try {
    await waitForSupabase();

    const { data, error } = await sb
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

/**
 * Get orders by status (Admin only)
 * @param {string} status - Order status
 * @returns {Promise<Array>} Array of orders
 */
async function getOrdersByStatus(status) {
  try {
    await waitForSupabase();

    const { data, error } = await sb
      .from('orders')
      .select('*')
      .eq('order_status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

/**
 * Get order by ID
 * @param {string} orderId - Order UUID
 * @returns {Promise<Object>} Order object
 */
async function getOrderById(orderId) {
  try {
    await waitForSupabase();

    const { data, error } = await sb
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}

/**
 * Get order by order number
 * @param {string} orderNumber - Order number (e.g., "ORD-20261027-001")
 * @returns {Promise<Object>} Order object
 */
async function getOrderByNumber(orderNumber) {
  try {
    await waitForSupabase();

    const { data, error } = await sb
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}

/**
 * Update order status (Admin only)
 * @param {string} orderId - Order UUID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated order
 */
async function updateOrderStatus(orderId, status) {
  try {
    await waitForSupabase();

    const updateData = { order_status: status };

    // Set timestamp based on status
    if (status === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString();
    } else if (status === 'shipped') {
      updateData.shipped_at = new Date().toISOString();
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data, error } = await sb
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Order status updated!');
    return data;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

/**
 * Update order (Admin only)
 * @param {string} orderId - Order UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated order
 */
async function updateOrder(orderId, updates) {
  try {
    await waitForSupabase();

    const { data, error } = await sb
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Order updated!');
    return data;
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
}

/**
 * Delete order (Admin only)
 * @param {string} orderId - Order UUID
 * @returns {Promise<boolean>} Success status
 */
async function deleteOrder(orderId) {
  try {
    await waitForSupabase();

    const { error } = await sb
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;
    console.log('✅ Order deleted!');
    return true;
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
}

/**
 * Get order statistics (Admin only)
 * @returns {Promise<Object>} Order statistics
 */
async function getOrderStatistics() {
  try {
    await waitForSupabase();

    const { data, error } = await sb
      .from('order_statistics')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    return {
      total_orders: 0,
      pending_orders: 0,
      confirmed_orders: 0,
      shipped_orders: 0,
      delivered_orders: 0,
      cod_orders: 0,
      bank_orders: 0,
      total_revenue: 0,
      average_order_value: 0
    };
  }
}

console.log('📦 Orders functions added to Supabase client!');
