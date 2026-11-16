/**
 * cart.js
 * ------------------------------------------------------------------
 * Shared cart logic for the whole Electrade site. No backend/database —
 * the cart lives entirely in the browser's localStorage as a simple
 * array of { id, qty } entries, keyed against PRODUCTS in
 * products.js for name/price/image whenever it needs to be displayed.
 *
 * Load order on every page: products.js, THEN cart.js, then any
 * page-specific script.
 * ------------------------------------------------------------------
 */

const CART_STORAGE_KEY = "futi_cart";
const BUYNOW_STORAGE_KEY = "futi_buynow_item";

// ---- Core cart read/write ----

function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(id, qty) {
  qty = qty || 1;
  const cart = getCart();
  const existing = cart.find(function (item) { return item.id === id; });
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: id, qty: qty });
  }
  saveCart(cart);
}

function setCartQty(id, qty) {
  let cart = getCart();
  if (qty <= 0) {
    cart = cart.filter(function (item) { return item.id !== id; });
  } else {
    const existing = cart.find(function (item) { return item.id === id; });
    if (existing) existing.qty = qty;
  }
  saveCart(cart);
}

function removeFromCart(id) {
  const cart = getCart().filter(function (item) { return item.id !== id; });
  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}

function cartCount() {
  return getCart().reduce(function (sum, item) { return sum + item.qty; }, 0);
}

// Returns [{ ...product, qty, lineTotal }] for every cart entry whose
// product still exists in products.js (guards against a stale id).
function getCartDetailed() {
  return getCart()
    .map(function (item) {
      const product = getProductById(item.id);
      if (!product) return null;
      return Object.assign({}, product, {
        qty: item.qty,
        lineTotal: product.price * item.qty
      });
    })
    .filter(Boolean);
}

function cartSubtotal() {
  return getCartDetailed().reduce(function (sum, item) { return sum + item.lineTotal; }, 0);
}

// ---- "Buy Now" — skips the cart, goes straight to checkout.html ----

function buyNow(id, qty) {
  qty = qty || 1;

  // Get the full product data instead of just storing the ID
  // This ensures checkout.html has all the info it needs without additional fetches
  const product = getProductById(id);

  if (!product) {
    console.error('Product not found:', id);
    alert('Sorry, this product is not available.');
    return;
  }

  // Store complete product data with quantity
  const buyNowData = {
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
    brand: product.brand || '',
    qty: qty,
    lineTotal: product.price * qty
  };

  localStorage.setItem(BUYNOW_STORAGE_KEY, JSON.stringify(buyNowData));
  window.location.href = "checkout.html?buynow=1";
}

function getBuyNowItem() {
  try {
    const raw = localStorage.getItem(BUYNOW_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearBuyNowItem() {
  localStorage.removeItem(BUYNOW_STORAGE_KEY);
}

// ---- Header badge ----
// Every page's header cart icon has: <span id="cart-badge">0</span>
// Call this on page load and after every cart mutation.
function updateCartBadge() {
  const badges = document.querySelectorAll("#cart-badge");
  const count = cartCount();
  badges.forEach(function (badge) {
    badge.textContent = count;
    badge.classList.toggle("hidden", count === 0);
  });
}

// Small reusable "Added!" flash on a button, since there's no
// backend round-trip to wait on — just instant local feedback.
function flashAdded(button) {
  if (!button) return;
  const original = button.dataset.originalLabel || button.innerHTML;
  button.dataset.originalLabel = original;
  button.textContent = "Added ✓";
  button.disabled = true;
  setTimeout(function () {
    button.innerHTML = original;
    button.disabled = false;
  }, 1100);
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
