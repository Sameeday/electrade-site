/**
 * site-nav.js
 * ==================================================================
 * The reusable navigation system for the whole Electrade site.
 *
 * Every page loads categories.js, products.js, cart.js and then this
 * file, and calls:
 *
 *     ElectradeNav.init({ cat: "refrigerators", sub: "deep-freezers" });
 *
 * ...which renders the header (with the category bar + mega-menu),
 * the mobile drawer, the search, and the footer — all built from the
 * data in categories.js. Nothing is hardcoded per page, so adding a
 * category in categories.js makes it appear everywhere at once.
 *
 * It also exposes the pieces category pages need:
 *   ElectradeNav.breadcrumb(el, catSlug, subSlug)
 *   ElectradeNav.renderSidebar(el, catSlug, subSlug)
 *   ElectradeNav.renderHomeCards(el)
 *   ElectradeNav.renderBrandMarquee(el)
 *   ElectradeNav.productCard(product)
 * ================================================================== */

var ElectradeNav = (function () {
  "use strict";

  /* ---------------------------------------------------------------
   * Inline icons — kept here so injected markup paints immediately
   * and never waits on an icon library.
   * --------------------------------------------------------------- */
  var ICONS = {
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    filter: '<path d="M3 6h18M7 12h10M10 18h4"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>'
  };

  function icon(name, cls) {
    return (
      '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || "") +
      "</svg>"
    );
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function money(n) {
    return "Rs. " + Number(n).toLocaleString("en-PK");
  }

  /* Current page state, set by init(). */
  var state = { cat: null, sub: null };

  /* ===============================================================
   * COUNTS
   * A subcategory count only renders when there's something in it —
   * a wall of "0" next to every heading is noise, not information.
   * =============================================================== */
  function countLabel(catSlug, subSlug) {
    var n = countProductsIn(catSlug, subSlug);
    return n > 0 ? '<span class="el-count">' + n + "</span>" : "";
  }

  /* ===============================================================
   * SUBCATEGORY LIST → grouped columns
   * Used by both the mega-menu and the category landing page.
   * =============================================================== */
  function groupedSubs(cat) {
    var order = cat.groupOrder || [];
    var buckets = {};
    var loose = [];

    cat.subcategories.forEach(function (sub) {
      if (sub.group) {
        if (!buckets[sub.group]) buckets[sub.group] = [];
        buckets[sub.group].push(sub);
      } else {
        loose.push(sub);
      }
    });

    var out = [];
    order.forEach(function (name) {
      if (buckets[name]) {
        out.push({ name: name, subs: buckets[name] });
        delete buckets[name];
      }
    });
    Object.keys(buckets).forEach(function (name) {
      out.push({ name: name, subs: buckets[name] });
    });
    if (loose.length) out.unshift({ name: null, subs: loose });
    return out;
  }

  /**
   * Is this subcategory the one currently being viewed?
   *
   * Only the entry inside the category you are actually browsing counts.
   * Without the first check, an alias (e.g. "Deep Freezers" listed under
   * Cooling Appliances) would also light up while you are in
   * Refrigerators > Deep Freezers, highlighting two places at once.
   */
  function isCurrentSub(catSlug, sub) {
    if (state.cat !== catSlug) return false;
    var target = resolveSub(catSlug, sub);
    return state.sub === target.sub;
  }

  function megaSubLinks(cat) {
    if (!cat.subcategories.length) {
      return '<div class="el-mega-empty">Subcategories are being added. ' +
        '<a href="' + categoryUrl(cat.slug) + '">View all ' + esc(cat.name) + "</a></div>";
    }
    return groupedSubs(cat)
      .map(function (group) {
        var links = group.subs
          .map(function (sub) {
            var target = resolveSub(cat.slug, sub);
            var aliasNote = sub.aliasOf
              ? ' <span class="el-alias">· in ' + esc(getCategory(sub.aliasOf.cat).name) + "</span>"
              : "";
            return (
              '<a class="el-mega-link' + (isCurrentSub(cat.slug, sub) ? " is-active" : "") + '" ' +
              'href="' + subcategoryUrl(cat.slug, sub) + '">' +
              esc(sub.name) + aliasNote + " " + countLabel(target.cat, target.sub) +
              "</a>"
            );
          })
          .join("");

        return (
          '<div class="el-mega-group">' +
          (group.name ? '<div class="el-mega-group-title">' + esc(group.name) + "</div>" : "") +
          links +
          "</div>"
        );
      })
      .join("");
  }

  /* ===============================================================
   * HEADER
   * =============================================================== */

  function allCategoriesMenuHtml() {
    var cats = getCategories();

    var rail = cats
      .map(function (cat, i) {
        return (
          '<a class="el-mega-rail-item' + (i === 0 ? " is-active" : "") + '" ' +
          'href="' + categoryUrl(cat.slug) + '" data-pane="' + cat.slug + '">' +
            "<span>" + esc(cat.name) + "</span>" +
            icon("chevronRight", "el-rail-arrow") +
          "</a>"
        );
      })
      .join("");

    var panes = cats
      .map(function (cat, i) {
        return (
          '<div class="el-mega-pane' + (i === 0 ? " is-active" : "") + '" data-pane="' + cat.slug + '">' +
            '<div class="el-mega-head">' +
              '<div class="el-mega-title">' + esc(cat.name) + "</div>" +
              '<a class="el-mega-viewall" href="' + categoryUrl(cat.slug) + '">View all →</a>' +
            "</div>" +
            '<div class="el-mega-cols">' + megaSubLinks(cat) + "</div>" +
          "</div>"
        );
      })
      .join("");

    return (
      '<div class="el-catbar-item el-navlink-item" data-menu="__all__">' +
        '<a class="el-catbar-link el-navlink" href="' + rootUrl() + '">' +
          "<span>Shop by Categories</span>" +
          icon("chevronDown", "el-caret") +
        "</a>" +
        '<div class="el-mega el-mega-all" role="menu">' +
          '<div class="el-mega-rail">' + rail + "</div>" +
          '<div class="el-mega-panel">' + panes + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function headerHtml() {
    return (
      '<div class="el-header-top">' +
        '<div class="el-container el-header-inner">' +
          '<button class="el-menu-btn" id="el-menu-btn" aria-label="Open menu" aria-expanded="false">' +
            icon("menu") +
          "</button>" +

          '<a class="el-logo" href="index.html">Electrade</a>' +

          '<nav class="el-nav" aria-label="Primary">' +
            '<a class="el-nav-link' + (!state.cat ? " is-active" : "") + '" href="index.html">Home</a>' +
            allCategoriesMenuHtml() +
            '<a class="el-nav-link" href="sale-items.html">Sale Items</a>' +
            '<a class="el-nav-link" href="index.html#brands">Brands</a>' +
            '<a class="el-nav-link" href="customer-care.html">Customer Care</a>' +
          "</nav>" +

          '<div class="el-searchbox" data-search-scope="desktop">' +
            '<div class="el-searchbox-inner">' +
              icon("search") +
              '<label class="el-sr-only" for="el-search-desktop">Search products and categories</label>' +
              '<input id="el-search-desktop" type="search" autocomplete="off" ' +
              'placeholder="Search LED TVs, split AC, refrigerators...">' +
            "</div>" +
            '<div class="el-search-drop hidden" data-search-drop></div>' +
          "</div>" +

          '<div class="el-header-actions">' +
            '<button class="el-icon-btn is-mobile-only" id="el-msearch-btn" aria-label="Search">' +
              icon("search") +
            "</button>" +
            '<a class="el-icon-btn" href="cart.html" aria-label="Cart">' +
              icon("bag") +
              '<span class="el-cart-badge" id="cart-badge">0</span>' +
            "</a>" +
          "</div>" +
        "</div>" +

        '<div class="el-msearch hidden" id="el-msearch">' +
          '<div class="el-container">' +
            '<div class="el-searchbox" data-search-scope="mobile">' +
              '<div class="el-searchbox-inner">' +
                icon("search") +
                '<label class="el-sr-only" for="el-search-mobile">Search products and categories</label>' +
                '<input id="el-search-mobile" type="search" autocomplete="off" placeholder="Search the catalog...">' +
              "</div>" +
              '<div class="el-search-drop hidden" data-search-drop></div>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  /* ===============================================================
   * MOBILE DRAWER — tap to expand, no hover anywhere
   * =============================================================== */

  function drawerHtml() {
    var accordion = getCategories()
      .map(function (cat) {
        var isActive = state.cat === cat.slug;

        var subsHtml = groupedSubs(cat)
          .map(function (group) {
            var links = group.subs
              .map(function (sub) {
                var target = resolveSub(cat.slug, sub);
                return (
                  '<a class="el-acc-sub' + (isCurrentSub(cat.slug, sub) ? " is-active" : "") + '" ' +
                  'href="' + subcategoryUrl(cat.slug, sub) + '">' +
                    "<span>" + esc(sub.name) + "</span>" +
                    countLabel(target.cat, target.sub) +
                  "</a>"
                );
              })
              .join("");
            return (
              (group.name ? '<div class="el-acc-group-title">' + esc(group.name) + "</div>" : "") + links
            );
          })
          .join("");

        return (
          '<div class="el-acc-row' + (isActive ? " is-open" : "") + '">' +
            '<a class="el-acc-label' + (isActive ? " is-active" : "") + '" href="' + categoryUrl(cat.slug) + '">' +
              esc(cat.name) +
            "</a>" +
            '<button class="el-acc-toggle" aria-label="Show ' + esc(cat.name) + ' subcategories" ' +
              'aria-expanded="' + (isActive ? "true" : "false") + '">' +
              icon("chevronDown") +
            "</button>" +
          "</div>" +
          '<div class="el-acc-panel">' +
            subsHtml +
            '<a class="el-acc-sub" href="' + categoryUrl(cat.slug) + '"><span><strong>View all ' +
              esc(cat.name) + "</strong></span></a>" +
          "</div>"
        );
      })
      .join("");

    return (
      '<div class="el-drawer-backdrop" data-drawer-close></div>' +
      '<div class="el-drawer-panel" role="dialog" aria-label="Site menu">' +
        '<div class="el-drawer-head">' +
          "<span>Electrade</span>" +
          '<button class="el-menu-btn" style="display:inline-flex" data-drawer-close aria-label="Close menu">' +
            icon("x") +
          "</button>" +
        "</div>" +

        '<div class="el-drawer-body">' +
          '<a class="el-drawer-link" href="index.html">Home</a>' +
          '<a class="el-drawer-link" href="' + rootUrl() + '">All Categories</a>' +
          '<a class="el-drawer-link" href="sale-items.html">Sale Items</a>' +

          '<div class="el-drawer-section-title">Shop by category</div>' +
          '<div class="el-drawer-acc">' + accordion + "</div>" +

          '<div class="el-drawer-section-title">More</div>' +
          '<a class="el-drawer-link" href="index.html#brands">Brands</a>' +
          '<a class="el-drawer-link" href="customer-care.html">Customer Care</a>' +
          '<a class="el-drawer-link" href="cart.html">Your Cart</a>' +
        "</div>" +

        '<div class="el-drawer-foot">' +
          "<div>Lahore &amp; Islamabad</div>" +
          "<div>Helpline +92-323-9883836</div>" +
          "<div>Cash on delivery available</div>" +
        "</div>" +
      "</div>"
    );
  }

  /* ===============================================================
   * FOOTER — shared, with live category links
   * =============================================================== */

  function footerHtml() {
    var catLinks = getCategories()
      .map(function (cat) {
        return '<li><a href="' + categoryUrl(cat.slug) + '">' + esc(cat.name) + "</a></li>";
      })
      .join("");

    return (
      '<div class="el-container">' +
        '<div class="el-foot-grid">' +
          "<div class=\"el-foot-brand\">" +
            '<a href="index.html" class="el-foot-logo">Electrade</a>' +
            "<p>Electrade is Pakistan's premier online destination for premium, next-generation " +
            "electronics — engineered for seamless shopping, verified quality, and fast nationwide " +
            "doorstep delivery.</p>" +
            '<div class="el-foot-contact">' +
              "<p>📍 Lahore | Islamabad, Pakistan</p>" +
              "<p>📞 Helpline: +92-323-9883836</p>" +
              "<p>✉️ Support: sameedabbas777@gmail.com</p>" +
            "</div>" +
          "</div>" +

          "<div>" +
            "<h4>Shop by Category</h4>" +
            "<ul>" + catLinks + "</ul>" +
          "</div>" +

          "<div>" +
            "<h4>Explore Electrade</h4>" +
            "<ul>" +
              '<li><a href="index.html">Home Page</a></li>' +
              '<li><a href="' + rootUrl() + '">All Categories</a></li>' +
              '<li><a href="index.html#brands">Brands</a></li>' +
              '<li><a href="cart.html">Your Cart</a></li>' +
            "</ul>" +
          "</div>" +

          "<div>" +
            "<h4>Customer Care</h4>" +
            "<ul>" +
              '<li><a href="customer-care.html#shipping-policy">Shipping &amp; Delivery</a></li>' +
              '<li><a href="customer-care.html#returns-policy">Returns &amp; Exchange</a></li>' +
              '<li><a href="customer-care.html#payment-security">Payment &amp; COD Security</a></li>' +
              '<li><a href="customer-care.html#warranty-info">Official Warranty Info</a></li>' +
              '<li><a href="customer-care.html#faqs">FAQs &amp; Support</a></li>' +
            "</ul>" +
          "</div>" +
        "</div>" +

        '<div class="el-foot-bottom">' +
          "<p>© 2026 <strong>Electrade</strong> Pakistan. All rights reserved.</p>" +
          '<div class="el-foot-pay">' +
            "<span>💵 COD</span><span>🏦 Bank Transfer</span>" +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  /* ===============================================================
   * MEGA-MENU INTERACTION
   * Opens on hover with a short delay, closes on a longer one, so a
   * mouse travelling from the label down into the panel never loses
   * the menu. Click and keyboard both work for touch/tab users.
   * =============================================================== */

  function wireMegaMenu(root) {
    var items = root.querySelectorAll(".el-catbar-item[data-menu]");
    var openTimer = null;
    var closeTimer = null;
    var current = null;

    function closeAll() {
      items.forEach(function (i) { i.classList.remove("is-open"); });
      current = null;
    }

    function open(item) {
      if (current === item) return;
      closeAll();
      item.classList.add("is-open");
      current = item;
      keepInViewport(item);
    }

    /* If a panel would run off the right edge, flip it to the right. */
    function keepInViewport(item) {
      var panel = item.querySelector(".el-mega");
      if (!panel) return;
      panel.classList.remove("align-right");
      var rect = panel.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) panel.classList.add("align-right");
    }

    items.forEach(function (item) {
      item.addEventListener("mouseenter", function () {
        clearTimeout(closeTimer);
        clearTimeout(openTimer);
        openTimer = setTimeout(function () { open(item); }, 70);
      });

      item.addEventListener("mouseleave", function () {
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
        closeTimer = setTimeout(closeAll, 240);
      });

      /* Caret click toggles instead of navigating — lets a tablet user
         open the menu without being sent to the category page. */
      var link = item.querySelector(".el-catbar-link");
      var caret = link ? link.querySelector(".el-caret") : null;
      if (caret) {
        caret.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (item.classList.contains("is-open")) closeAll();
          else open(item);
        });
      }

      item.addEventListener("focusin", function () {
        clearTimeout(closeTimer);
        open(item);
      });

      /* Rail hover inside the "All Categories" panel swaps the right side. */
      item.querySelectorAll(".el-mega-rail-item").forEach(function (rail) {
        function activate() {
          item.querySelectorAll(".el-mega-rail-item").forEach(function (r) {
            r.classList.remove("is-active");
          });
          item.querySelectorAll(".el-mega-pane").forEach(function (p) {
            p.classList.toggle("is-active", p.getAttribute("data-pane") === rail.getAttribute("data-pane"));
          });
          rail.classList.add("is-active");
        }
        rail.addEventListener("mouseenter", activate);
        rail.addEventListener("focus", activate);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll();
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest(".el-catbar-item")) closeAll();
    });

    /* If the "All Categories" panel opens on a page inside a category,
       start it on that category rather than always on the first one. */
    if (state.cat) {
      var allItem = root.querySelector('.el-catbar-item[data-menu="__all__"]');
      if (allItem) {
        var rail = allItem.querySelector('.el-mega-rail-item[data-pane="' + state.cat + '"]');
        var pane = allItem.querySelector('.el-mega-pane[data-pane="' + state.cat + '"]');
        if (rail && pane) {
          allItem.querySelectorAll(".el-mega-rail-item").forEach(function (r) { r.classList.remove("is-active"); });
          allItem.querySelectorAll(".el-mega-pane").forEach(function (p) { p.classList.remove("is-active"); });
          rail.classList.add("is-active");
          pane.classList.add("is-active");
        }
      }
    }
  }

  /* ===============================================================
   * DRAWER INTERACTION
   * =============================================================== */

  function wireDrawer(drawer) {
    var btn = document.getElementById("el-menu-btn");

    function openDrawer() {
      drawer.classList.remove("hidden");
      document.body.style.overflow = "hidden";
      if (btn) btn.setAttribute("aria-expanded", "true");
    }
    function closeDrawer() {
      drawer.classList.add("hidden");
      document.body.style.overflow = "";
      if (btn) btn.setAttribute("aria-expanded", "false");
    }

    if (btn) btn.addEventListener("click", openDrawer);

    drawer.querySelectorAll("[data-drawer-close]").forEach(function (el) {
      el.addEventListener("click", closeDrawer);
    });

    drawer.querySelectorAll(".el-acc-toggle").forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        var row = toggle.closest(".el-acc-row");
        var isOpen = row.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDrawer();
    });
  }

  /* ===============================================================
   * SEARCH — searches categories, subcategories AND products, and
   * always shows the category path a product belongs to.
   * =============================================================== */

  function searchResultsHtml(query) {
    var q = query.trim().toLowerCase();
    if (q.length < 2) return "";

    var catIndex = buildCategorySearchIndex();
    var catHits = catIndex
      .filter(function (entry) { return entry.haystack.indexOf(q) !== -1; })
      .slice(0, 5);

    var productHits = (typeof PRODUCTS !== "undefined" ? PRODUCTS : [])
      .filter(function (p) {
        var path = getProductCategoryPath(p);
        var hay = (
          p.name + " " + (p.category || "") + " " + (p.shortDesc || "") + " " +
          (path ? path.category.name + " " + (path.subcategory ? path.subcategory.name : "") : "")
        ).toLowerCase();
        return hay.indexOf(q) !== -1;
      })
      .slice(0, 6);

    if (!catHits.length && !productHits.length) {
      return '<div class="el-search-empty">Nothing matched “' + esc(query) +
        "”. Try a category name like “LED”, “split AC” or “refrigerators”.</div>";
    }

    var html = "";

    if (catHits.length) {
      html += '<div class="el-search-group-title">Categories</div>';
      html += catHits
        .map(function (entry) {
          return (
            '<a class="el-search-item" href="' + entry.url + '">' +
              '<span style="flex:0 0 auto;color:var(--brand-muted)">' + icon("layers", "") + "</span>" +
              "<span>" +
                '<span class="el-search-item-name">' + esc(entry.label) + "</span>" +
                '<span class="el-search-item-path">' + esc(entry.context) + "</span>" +
              "</span>" +
            "</a>"
          );
        })
        .join("");
    }

    if (productHits.length) {
      html += '<div class="el-search-group-title">Products</div>';
      html += productHits
        .map(function (p) {
          var path = getProductCategoryPath(p);
          /* Requirement: a product result states the category it lives in. */
          var trail = path
            ? esc(path.category.name) + (path.subcategory ? " › " + esc(path.subcategory.name) : "")
            : esc(p.category || "");
          return (
            '<a class="el-search-item" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
              '<img src="' + esc(p.image) + '" alt="">' +
              "<span>" +
                '<span class="el-search-item-name">' + esc(p.name) + "</span>" +
                '<span class="el-search-item-path">' + trail + "</span>" +
              "</span>" +
            "</a>"
          );
        })
        .join("");
    }

    return html;
  }

  function wireSearch(root) {
    root.querySelectorAll("[data-search-scope]").forEach(function (scope) {
      var input = scope.querySelector("input");
      var drop = scope.querySelector("[data-search-drop]");
      if (!input || !drop) return;

      function update() {
        var html = searchResultsHtml(input.value);
        if (!html) {
          drop.classList.add("hidden");
          drop.innerHTML = "";
          return;
        }
        drop.innerHTML = '<div class="el-search-results">' + html + "</div>";
        drop.classList.remove("hidden");
      }

      input.addEventListener("input", update);
      input.addEventListener("focus", update);

      input.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { drop.classList.add("hidden"); input.blur(); }
        if (e.key === "Enter") {
          var first = drop.querySelector(".el-search-item");
          if (first) window.location.href = first.getAttribute("href");
        }
      });

      document.addEventListener("click", function (e) {
        if (!scope.contains(e.target)) drop.classList.add("hidden");
      });
    });

    var mBtn = document.getElementById("el-msearch-btn");
    var mPanel = document.getElementById("el-msearch");
    if (mBtn && mPanel) {
      mBtn.addEventListener("click", function () {
        mPanel.classList.toggle("hidden");
        if (!mPanel.classList.contains("hidden")) {
          var i = mPanel.querySelector("input");
          if (i) i.focus();
        }
      });
    }
  }

  /* ===============================================================
   * BREADCRUMBS
   * =============================================================== */

  function breadcrumbHtml(catSlug, subSlug, extra) {
    var items = buildBreadcrumb(catSlug, subSlug);
    if (extra) {
      items[items.length - 1].url = items[items.length - 1].url ||
        (subSlug ? subcategoryUrl(catSlug, subSlug) : categoryUrl(catSlug));
      items.push({ label: extra, url: null });
    }

    return items
      .map(function (item, i) {
        var sep = i > 0 ? '<span class="el-crumb-sep">/</span>' : "";
        var body = item.url
          ? '<a href="' + item.url + '">' + esc(item.label) + "</a>"
          : '<span class="el-crumb-current" aria-current="page">' + esc(item.label) + "</span>";
        return sep + body;
      })
      .join("");
  }

  function breadcrumb(el, catSlug, subSlug, extra) {
    if (!el) return;
    el.className = "el-crumb";
    el.setAttribute("aria-label", "Breadcrumb");
    el.innerHTML = breadcrumbHtml(catSlug, subSlug, extra);
  }

  /* ===============================================================
   * LEFT CATEGORY SIDEBAR
   * The same component on every category and subcategory page. The
   * category you're in is expanded automatically; the rest collapse
   * but stay one click away, so you can always jump sideways.
   * =============================================================== */

  /* Builds the "Brands" panel that appears beneath the categories list
     when the current category has a non-empty `brands` array.
     This is now a placeholder that will be filled by category-page.js
     with interactive checkboxes and product counts. */
  function sidebarBrandsHtml(catSlug) {
    var cat = getCategory(catSlug);
    if (!cat || !cat.brands || !cat.brands.length) return "";

    /* Return a container that category-page.js will populate */
    return (
      '<div class="el-sidebar-brands" id="el-sidebar-brand-filter">' +
        '<div class="el-sidebar-head">Brand</div>' +
        '<div class="el-side-brandlist" id="el-sidebar-brands-content">' +
          '<!-- Brand checkboxes will be inserted here by category-page.js -->' +
        "</div>" +
      "</div>"
    );
  }

  function sidebarHtml(catSlug, subSlug) {
    var cats = getCategories()
      .map(function (cat) {
        var isCurrent = cat.slug === catSlug;

        var subs = groupedSubs(cat)
          .map(function (group) {
            var links = group.subs
              .map(function (sub) {
                var target = resolveSub(cat.slug, sub);
                /* Only highlight inside the category being browsed, so an
                   alias listed elsewhere doesn't light up at the same time. */
                var active = cat.slug === catSlug && subSlug === target.sub;
                return (
                  '<a class="el-side-sub' + (active ? " is-current" : "") + '" ' +
                  'href="' + subcategoryUrl(cat.slug, sub) + '"' + (active ? ' aria-current="page"' : "") + ">" +
                    "<span>" + esc(subLabel(sub)) + "</span>" +
                    countLabel(target.cat, target.sub) +
                  "</a>"
                );
              })
              .join("");
            return (
              (group.name ? '<div class="el-side-group">' + esc(group.name) + "</div>" : "") + links
            );
          })
          .join("");

        return (
          '<div class="el-side-cat' + (isCurrent ? " is-current is-open" : "") + '" data-cat="' + cat.slug + '">' +
            '<div class="el-side-row">' +
              '<a class="el-side-link" href="' + categoryUrl(cat.slug) + '">' +
                "<span>" + esc(cat.name) + "</span>" +
              "</a>" +
              '<button class="el-side-toggle" aria-label="Toggle ' + esc(cat.name) + '" ' +
                'aria-expanded="' + (isCurrent ? "true" : "false") + '">' + icon("chevronDown") + "</button>" +
            "</div>" +
            '<div class="el-side-subs">' + subs + "</div>" +
          "</div>"
        );
      })
      .join("");

    return (
      '<button class="el-sidebar-mobile-toggle" data-sidebar-toggle aria-expanded="false">' +
        "<span>Browse categories</span>" + icon("chevronDown") +
      "</button>" +
      '<div class="el-sidebar-shell">' +
        '<nav class="el-sidebar" aria-label="Category navigation">' +
          '<div class="el-sidebar-head">Categories</div>' +
          '<a class="el-sidebar-all" href="' + rootUrl() + '">' + icon("grid") + "<span>All Electronics</span></a>" +
          cats +
        "</nav>" +
        sidebarBrandsHtml(catSlug) +
      "</div>"
    );
  }

  function renderSidebar(el, catSlug, subSlug) {
    if (!el) return;
    el.innerHTML = sidebarHtml(catSlug, subSlug);

    el.querySelectorAll(".el-side-toggle").forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        var block = toggle.closest(".el-side-cat");
        var open = block.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });

    var mobileToggle = el.querySelector("[data-sidebar-toggle]");
    var shell = el.querySelector(".el-sidebar-shell");
    if (mobileToggle && shell) {
      mobileToggle.addEventListener("click", function () {
        var open = shell.classList.toggle("is-open");
        mobileToggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
  }

  /* ===============================================================
   * HOMEPAGE CATEGORY CARDS
   * =============================================================== */

  /* Every brand from every category's `brands` list, once each, in the order
     the categories (and their brands) are written in categories.js. */
  function allBrands() {
    var seen = {};
    var out = [];
    getCategories().forEach(function (cat) {
      (cat.brands || []).forEach(function (name) {
        var key = brandKey(name);
        if (!key || seen[key]) return;
        seen[key] = true;
        out.push(name);
      });
    });
    return out;
  }

  /* Fills the "Brands We Deal With" sliding strip on the homepage. */
  function renderBrandMarquee(el) {
    if (!el) return;
    var brands = allBrands();
    if (!brands.length) {
      var wrap = el.closest ? el.closest("section") : null;
      if (wrap) wrap.style.display = "none";
      return;
    }
    function tiles(hidden) {
      return brands
        .map(function (b) {
          return '<div class="brand-tile"' + (hidden ? ' aria-hidden="true"' : "") + ">" + esc(b) + "</div>";
        })
        .join("");
    }
    el.innerHTML = tiles(false) + tiles(true);
    /* Keep the slide at a steady, readable speed however many brands there are
       (about 3.6 seconds per brand). */
    el.style.animationDuration = Math.max(30, Math.round(brands.length * 3.6)) + "s";
  }

  function renderHomeCards(el) {
    if (!el) return;

    el.className = "el-cat-cards";
    el.innerHTML = getCategories()
      .map(function (cat) {
        /* "Popular subcategories" under each card = the featured list
           from categories.js, falling back to the first few. */
        var featured = (cat.featured || [])
          .map(function (slug) {
            var found = null;
            cat.subcategories.forEach(function (sub) {
              var target = resolveSub(cat.slug, sub);
              if (target.sub === slug && !found) found = sub;
            });
            return found;
          })
          .filter(Boolean);

        if (!featured.length) featured = cat.subcategories.slice(0, 4);

        var chips = featured
          .map(function (sub) {
            return (
              '<a class="el-catcard-sub" href="' + subcategoryUrl(cat.slug, sub) + '">' +
                esc(subLabel(sub)) +
              "</a>"
            );
          })
          .join("");

        return (
          '<div class="el-catcard">' +
            '<a class="el-catcard-img" href="' + categoryUrl(cat.slug) + '" aria-label="' + esc(cat.name) + '">' +
              (cat.image
                ? '<img src="' + esc(cat.image) + '" alt="' + esc(cat.name) + '" loading="lazy">'
                : '<span class="el-catcard-ph" aria-hidden="true">' + icon("box") + "</span>") +
              '<span class="el-catcard-shade"></span>' +
              '<span class="el-catcard-titlewrap">' +
                '<span class="el-catcard-title">' + esc(cat.name) + "</span>" +
              "</span>" +
            "</a>" +
            '<div class="el-catcard-body">' +
              '<div class="el-catcard-subs">' +
                (chips || '<span class="el-catcard-soon">Subcategories coming soon</span>') +
              "</div>" +
              '<a class="el-catcard-all" href="' + categoryUrl(cat.slug) + '">' +
                "View all " + esc(cat.name) + icon("arrowRight") +
              "</a>" +
            "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  /* ===============================================================
   * PRODUCT CARD — one markup definition, used by the category page
   * and anywhere else that lists products.
   * =============================================================== */

  function productCard(p) {
    var discount =
      p.oldPrice && p.oldPrice > p.price
        ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)
        : 0;
    var path = getProductCategoryPath(p);
    var label = path
      ? (path.subcategory ? path.subcategory.name : path.category.name)
      : p.category || "";

    return (
      '<a class="el-card" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
        '<div class="el-card-img">' +
          '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' +
          (discount ? '<span class="el-card-badge">-' + discount + "%</span>" : "") +
        "</div>" +
        '<div class="el-card-body">' +
          '<div class="el-card-meta">' +
            "<span>" + esc(label) + "</span>" +
            '<span class="el-rating">★ ' + esc(p.rating) + "</span>" +
          "</div>" +
          (p.brand ? '<div class="el-card-brand">' + esc(p.brand) + "</div>" : "") +
          '<div class="el-card-name">' + esc(p.name) + "</div>" +
          '<div class="el-card-foot">' +
            "<span>" +
              '<span class="el-card-price">' + money(p.price) + "</span><br>" +
              (p.oldPrice ? '<span class="el-card-old">' + money(p.oldPrice) + "</span>" : "") +
            "</span>" +
            '<button type="button" class="el-card-add" aria-label="Add to cart" ' +
              "onclick=\"event.preventDefault();event.stopPropagation();addToCart('" +
              esc(p.id) + "',1);flashAdded(this);\">" +
              icon("bag") +
            "</button>" +
          "</div>" +
        "</div>" +
      "</a>"
    );
  }

  /* ===============================================================
   * INIT
   * =============================================================== */

  function init(options) {
    options = options || {};
    state.cat = options.cat || null;
    state.sub = options.sub || null;

    var headerHost = document.getElementById("site-header");
    if (headerHost) {
      headerHost.className = "el-header";
      headerHost.innerHTML = headerHtml();
      wireMegaMenu(headerHost);
      wireSearch(headerHost);

      if (!headerHost.dataset.scrollBound) {
        headerHost.dataset.scrollBound = "1";
        window.addEventListener("scroll", function () {
          headerHost.classList.toggle("is-stuck", window.scrollY > 20);
        });
      }
    }

    /* Safe to call twice (the product page re-inits once it knows
       which category the product belongs to) — the old drawer is
       replaced rather than stacked. */
    var existingDrawer = document.getElementById("el-drawer");
    if (existingDrawer) existingDrawer.remove();

    var drawer = document.createElement("div");
    drawer.className = "el-drawer hidden";
    drawer.id = "el-drawer";
    drawer.innerHTML = drawerHtml();
    document.body.appendChild(drawer);
    wireDrawer(drawer);

    var footerHost = document.getElementById("site-footer");
    if (footerHost) {
      footerHost.className = "el-footer";
      footerHost.innerHTML = footerHtml();
    }

    /* The header renders after cart.js has already run its badge
       update, so refresh it now that the badge element exists. */
    if (typeof updateCartBadge === "function") updateCartBadge();
  }

  return {
    init: init,
    breadcrumb: breadcrumb,
    breadcrumbHtml: breadcrumbHtml,
    renderSidebar: renderSidebar,
    renderHomeCards: renderHomeCards,
    renderBrandMarquee: renderBrandMarquee,
    productCard: productCard,
    groupedSubs: groupedSubs,
    icon: icon,
    esc: esc,
    money: money,
    countLabel: countLabel
  };
})();
