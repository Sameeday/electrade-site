// QUICK FIX VERIFICATION SCRIPT
// Run this in browser console on your website to check what's happening

console.log('=== ELECTRADE DEBUGGING ===');

// 1. Check if products are loading
console.log('Products loaded:', typeof PRODUCTS !== 'undefined' ? PRODUCTS.length : 'NOT LOADED');

// 2. Check LED products specifically
if (typeof PRODUCTS !== 'undefined' && PRODUCTS.length > 0) {
  const ledProducts = PRODUCTS.filter(p => p.catSlug === 'led');
  console.log('LED products in memory:', ledProducts.length);
  console.log('First 3 LED products:', ledProducts.slice(0, 3));
}

// 3. Check if getProductsIn works
if (typeof getProductsIn === 'function') {
  console.log('getProductsIn("led"):', getProductsIn('led').length);
  console.log('getProductsIn("air-conditioners"):', getProductsIn('air-conditioners').length);
}

// 4. Check Supabase connection
if (typeof sb !== 'undefined') {
  console.log('Supabase connected: YES');
  // Direct query
  sb.from('products').select('category_slug', { count: 'exact' }).eq('category_slug', 'led').then(result => {
    console.log('LED products in database:', result.count);
  });
} else {
  console.log('Supabase connected: NO');
}

console.log('=== END DEBUG ===');
