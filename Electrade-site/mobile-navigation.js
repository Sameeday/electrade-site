/**
 * MOBILE NAVIGATION
 * Mobile-specific UI enhancements
 * Only active on screens <1024px
 */

(function() {
  'use strict';

  // Only run on mobile
  if (window.innerWidth >= 1024) {
    console.log('Desktop detected - mobile nav skipped');
    return;
  }

  // ============================================
  // UTILITY: Get cart count
  // ============================================
  function getCartCount() {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    } catch (e) {
      return 0;
    }
  }

  // ============================================
  // BOTTOM TAB BAR
  // ============================================
  function renderBottomTabs() {
    const cartCount = getCartCount();
    const currentPath = window.location.pathname;

    const tabs = [
      {
        id: 'home',
        label: 'Home',
        href: 'index.html',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
      },
      {
        id: 'categories',
        label: 'Categories',
        href: 'electronics.html',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
      },
      {
        id: 'search',
        label: 'Search',
        href: '#',
        onclick: 'openMobileSearch(); return false;',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>'
      },
      {
        id: 'cart',
        label: 'Cart',
        href: 'cart.html',
        badge: cartCount,
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>'
      },
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        href: 'https://wa.me/923219883836',
        target: '_blank',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'
      }
    ];

    const html = tabs.map(tab => `
      <a href="${tab.href}"
         ${tab.target ? `target="${tab.target}"` : ''}
         class="el-mobile-tab ${isActivePage(tab, currentPath) ? 'is-active' : ''}"
         ${tab.onclick ? `onclick="${tab.onclick}"` : ''}>
        <span class="el-mobile-tab__icon">${tab.icon}</span>
        ${tab.badge ? `<span class="el-mobile-tab__badge">${tab.badge}</span>` : ''}
        <span>${tab.label}</span>
      </a>
    `).join('');

    return `<nav class="el-mobile-tabs">${html}</nav>`;
  }

  function isActivePage(tab, currentPath) {
    if (tab.id === 'home' && (currentPath.includes('index.html') || currentPath === '/' || currentPath.endsWith('/'))) return true;
    if (tab.id === 'categories' && currentPath.includes('electronics.html')) return true;
    if (tab.id === 'cart' && currentPath.includes('cart.html')) return true;
    return false;
  }

  // ============================================
  // MOBILE HEADER
  // ============================================
  function renderMobileHeader() {
    const cartCount = getCartCount();

    return `
      <div class="el-mobile-header">
        <a href="index.html" class="el-mobile-header__logo">ELECTRADE</a>
        <button class="el-mobile-header__search-btn" onclick="openMobileSearch()">
          Search products...
        </button>
        <a href="cart.html" class="el-mobile-header__cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          ${cartCount > 0 ? `<span class="el-mobile-header__cart-badge">${cartCount}</span>` : ''}
        </a>
        <button class="el-mobile-header__menu" onclick="ElectradeNav.toggleDrawer()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  }

  // ============================================
  // SEARCH OVERLAY
  // ============================================
  function renderSearchOverlay() {
    return `
      <div class="el-search-overlay" id="mobile-search">
        <div class="el-search-overlay__header">
          <button class="el-search-overlay__back" onclick="closeMobileSearch()">←</button>
          <input
            type="search"
            class="el-search-overlay__input"
            id="mobile-search-input"
            placeholder="Search products..."
            autocomplete="off"
          >
        </div>
        <div class="el-search-overlay__content">
          <div id="mobile-search-results"></div>
          <div id="recent-searches" style="margin-top: 1rem;"></div>
        </div>
      </div>
    `;
  }

  // ============================================
  // FILTER SHEET
  // ============================================
  function renderFilterSheet() {
    return `
      <div class="el-filter-backdrop" id="filter-backdrop" onclick="closeFilterSheet()"></div>
      <div class="el-filter-sheet" id="filter-sheet">
        <div class="el-filter-sheet__header">
          <h3 class="el-filter-sheet__title">Filters & Sort</h3>
          <button class="el-filter-sheet__close" onclick="closeFilterSheet()">Done</button>
        </div>
        <div class="el-filter-sheet__content" id="filter-sheet-content">
          <!-- Content will be populated by category-page.js -->
        </div>
      </div>
    `;
  }

  // ============================================
  // FILTER SHEET FUNCTIONS
  // ============================================
  window.openFilterSheet = function() {
    const backdrop = document.getElementById('filter-backdrop');
    const sheet = document.getElementById('filter-sheet');

    if (backdrop && sheet) {
      backdrop.classList.add('is-open');
      sheet.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeFilterSheet = function() {
    const backdrop = document.getElementById('filter-backdrop');
    const sheet = document.getElementById('filter-sheet');

    if (backdrop && sheet) {
      backdrop.classList.remove('is-open');
      sheet.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  };

  // ============================================
  // MOBILE SEARCH FUNCTIONS
  // ============================================
  window.openMobileSearch = function() {
    const overlay = document.getElementById('mobile-search');
    if (overlay) {
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';

      setTimeout(() => {
        const input = document.getElementById('mobile-search-input');
        if (input) input.focus();
      }, 100);

      loadRecentSearches();
    }
  };

  window.closeMobileSearch = function() {
    const overlay = document.getElementById('mobile-search');
    if (overlay) {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  };

  function loadRecentSearches() {
    try {
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      const container = document.getElementById('recent-searches');

      if (!container) return;

      if (recent.length === 0) {
        container.innerHTML = '<p style="color: var(--brand-muted); text-align: center; padding: 2rem;">No recent searches</p>';
        return;
      }

      const html = '<h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Recent Searches</h4>' +
        recent.slice(0, 5).map(term => `
          <button class="el-recent-search" onclick="searchFor('${escapeHtml(term)}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
            ${escapeHtml(term)}
          </button>
        `).join('');

      container.innerHTML = html;
    } catch (e) {
      console.error('Error loading recent searches:', e);
    }
  }

  function saveRecentSearch(term) {
    try {
      let recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      recent = recent.filter(t => t !== term);
      recent.unshift(term);
      recent = recent.slice(0, 10);
      localStorage.setItem('recentSearches', JSON.stringify(recent));
    } catch (e) {
      console.error('Error saving recent search:', e);
    }
  }

  window.searchFor = function(term) {
    saveRecentSearch(term);
    window.location.href = `category.html?search=${encodeURIComponent(term)}`;
  };

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // SEARCH INPUT HANDLER
  // ============================================
  let searchTimeout;
  function handleMobileSearchInput(value) {
    clearTimeout(searchTimeout);

    const resultsContainer = document.getElementById('mobile-search-results');
    if (!resultsContainer) return;

    if (value.length < 2) {
      resultsContainer.innerHTML = '';
      return;
    }

    resultsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--brand-muted);">Searching...</div>';

    searchTimeout = setTimeout(async () => {
      try {
        if (typeof searchProducts === 'function') {
          await searchProducts(value, results => {
            renderSearchResults(results);
          }, 8);
        } else {
          resultsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--brand-muted);">Search not available</div>';
        }
      } catch (e) {
        console.error('Search error:', e);
        resultsContainer.innerHTML = '<p style="color: var(--brand-muted); text-align: center; padding: 2rem;">Search failed. Please try again.</p>';
      }
    }, 300);
  }

  function renderSearchResults(products) {
    const container = document.getElementById('mobile-search-results');
    if (!container) return;

    if (products.length === 0) {
      container.innerHTML = '<p style="color: var(--brand-muted); text-align: center; padding: 2rem;">No products found</p>';
      return;
    }

    const html = products.map(p => `
      <a href="product.html?id=${p.id}" class="el-search-result">
        <img src="${p.image || '/images/product-placeholder.jpg'}" alt="${escapeHtml(p.name)}" width="60" height="60" loading="lazy">
        <div class="el-search-result__info">
          <div class="el-search-result__name">${escapeHtml(p.name)}</div>
          <div class="el-search-result__price">Rs. ${p.price ? p.price.toLocaleString() : 'N/A'}</div>
        </div>
      </a>
    `).join('');

    container.innerHTML = html;
  }

  // ============================================
  // HIDE HEADER ON SCROLL DOWN
  // ============================================
  let lastScroll = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll();
        ticking = false;
      });
      ticking = true;
    }
  });

  function handleScroll() {
    if (window.innerWidth >= 1024) return;

    const currentScroll = window.pageYOffset;
    const header = document.querySelector('.el-mobile-header');

    if (!header) return;

    if (currentScroll > lastScroll && currentScroll > 100) {
      header.style.transform = 'translateY(-100%)';
    } else {
      header.style.transform = 'translateY(0)';
    }

    lastScroll = currentScroll;
  }

  // ============================================
  // ANDROID BACK BUTTON / POPSTATE
  // ============================================
  window.addEventListener('popstate', () => {
    const searchOverlay = document.getElementById('mobile-search');
    const filterSheet = document.getElementById('filter-sheet');

    if (searchOverlay && searchOverlay.classList.contains('is-open')) {
      closeMobileSearch();
    }
    if (filterSheet && filterSheet.classList.contains('is-open')) {
      closeFilterSheet();
    }
  });

  // ============================================
  // ESC KEY HANDLING
  // ============================================
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const searchOverlay = document.getElementById('mobile-search');
      const filterSheet = document.getElementById('filter-sheet');

      if (searchOverlay && searchOverlay.classList.contains('is-open')) {
        closeMobileSearch();
      }
      if (filterSheet && filterSheet.classList.contains('is-open')) {
        closeFilterSheet();
      }
    }
  });

  // ============================================
  // CART UPDATE LISTENER
  // ============================================
  window.addEventListener('storage', (e) => {
    if (e.key === 'cart') {
      updateCartBadges();
    }
  });

  // Custom event for cart updates within same page
  window.addEventListener('cartUpdated', () => {
    updateCartBadges();
  });

  function updateCartBadges() {
    const count = getCartCount();

    // Update mobile header badge
    const headerBadge = document.querySelector('.el-mobile-header__cart-badge');
    const headerCart = document.querySelector('.el-mobile-header__cart');
    if (headerCart) {
      if (count > 0) {
        if (headerBadge) {
          headerBadge.textContent = count;
        } else {
          headerCart.insertAdjacentHTML('beforeend', `<span class="el-mobile-header__cart-badge">${count}</span>`);
        }
      } else if (headerBadge) {
        headerBadge.remove();
      }
    }

    // Update tab bar badge
    const tabBadge = document.querySelector('.el-mobile-tab__badge');
    const cartTab = document.querySelector('.el-mobile-tab[href="cart.html"]');
    if (cartTab) {
      if (count > 0) {
        if (tabBadge) {
          tabBadge.textContent = count;
        } else {
          const icon = cartTab.querySelector('.el-mobile-tab__icon');
          if (icon) {
            icon.insertAdjacentHTML('afterend', `<span class="el-mobile-tab__badge">${count}</span>`);
          }
        }
      } else if (tabBadge) {
        tabBadge.remove();
      }
    }
  }

  // ============================================
  // INITIALIZE
  // ============================================
  function init() {
    // Inject mobile header at start of body
    const existingHeader = document.querySelector('.el-mobile-header');
    if (!existingHeader) {
      document.body.insertAdjacentHTML('afterbegin', renderMobileHeader());
    }

    // Inject bottom tabs at end of body
    const existingTabs = document.querySelector('.el-mobile-tabs');
    if (!existingTabs) {
      document.body.insertAdjacentHTML('beforeend', renderBottomTabs());
    }

    // Inject search overlay
    const existingSearch = document.getElementById('mobile-search');
    if (!existingSearch) {
      document.body.insertAdjacentHTML('beforeend', renderSearchOverlay());
    }

    // Inject filter sheet
    const existingFilter = document.getElementById('filter-sheet');
    if (!existingFilter) {
      document.body.insertAdjacentHTML('beforeend', renderFilterSheet());
    }

    // Set up search input listener
    const searchInput = document.getElementById('mobile-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        handleMobileSearchInput(e.target.value);
      });

      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const value = e.target.value.trim();
          if (value) {
            saveRecentSearch(value);
            window.location.href = `category.html?search=${encodeURIComponent(value)}`;
          }
        }
      });
    }

    console.log('✅ Mobile navigation initialized');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
