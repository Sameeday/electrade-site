/**
 * category-page.js
 * ==================================================================
 * Renders BOTH kinds of catalog page from the data in categories.js:
 *
 *   1. Category landing page   → category.html?cat=refrigerators
 *      (also served by the pretty URL refrigerators.html)
 *      Breadcrumbs, title, description, a clickable grid of every
 *      subcategory, and any products already sitting in the category.
 *
 *   2. Subcategory listing     → category.html?cat=refrigerators&sub=deep-freezers
 *      Breadcrumbs, title, product count, sorting, the BRAND filter
 *      (when the category has a `brands` list) and the product grid.
 *
 * Both share the same left category sidebar and the same sibling
 * navigation, so a shopper can always move sideways without going
 * back to the homepage.
 *
 * A page opts in by setting either of these before loading this file:
 *
 *     <script>window.PAGE_CAT = "refrigerators";</script>   // fixed page
 *
 * ...or by leaving it unset, in which case the ?cat= / ?sub= query
 * string decides. That's what lets a brand-new category work with no
 * new HTML file.
 * ================================================================== */

(function () {
  "use strict";

  var E = ElectradeNav;

  /* ---------------------------------------------------------------
   * Work out which category/subcategory this page is showing.
   * --------------------------------------------------------------- */
  function readRoute() {
    var params = new URLSearchParams(window.location.search);
    var catSlug = window.PAGE_CAT || params.get("cat");
    var subSlug = window.PAGE_SUB || params.get("sub");
    var redirected = false;

    /* A subcategory that lives in another category (an alias link that
       was hand-edited, or an old bookmark) resolves to its real owner
       so the page never renders half-empty. */
    if (catSlug && subSlug && !getSubcategory(catSlug, subSlug)) {
      var owner = null;
      getCategories().forEach(function (cat) {
        cat.subcategories.forEach(function (sub) {
          if (!sub.aliasOf && sub.slug === subSlug && !owner) owner = cat.slug;
        });
      });
      if (owner) {
        catSlug = owner;
        redirected = true;
      }
    }

    return { cat: catSlug, sub: subSlug, redirected: redirected };
  }

  /* ---------------------------------------------------------------
   * Sorting + BRAND filter (subcategory and category listing pages)
   *
   * Brand is the only filter on the site. A category lists its brands
   * in categories.js (`brands: [...]`, shown in that order); a product
   * opts in with a `brand` field in products.js. Ticking several
   * brands shows products from ANY of them (TCL or Samsung), the same
   * way Daraz and Hadi Electronics behave. The choice is kept in the
   * address bar (?brand=tcl,samsung) so a filtered page can be shared
   * and the Back button works.
   * --------------------------------------------------------------- */

  var selectedBrands = [];   // brandKey() values, e.g. "tcl", "superasia"
  var selectedSubcategories = [];   // subcategory slugs for filtering on category pages
  var sortMode = "featured";

  // Pagination settings
  var currentPage = 1;
  var productsPerPage = 20;

  function readBrandParam() {
    var raw = new URLSearchParams(window.location.search).get("brand");
    if (!raw) return [];
    return raw.split(",").map(brandKey).filter(Boolean);
  }

  function writeBrandParam(opts) {
    if (!window.history || !window.history.replaceState) return;
    var url = new URL(window.location.href);
    var slugs = opts
      .filter(function (o) { return selectedBrands.indexOf(o.key) !== -1; })
      .map(function (o) { return brandSlug(o.name); });
    if (slugs.length) url.searchParams.set("brand", slugs.join(","));
    else url.searchParams.delete("brand");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  /* The brand options for a page: the category's own list (in the order
     the client gave it) plus any brand a product carries that isn't in
     the list yet — so no product can ever be un-filterable. Each option
     is counted against the products on THIS page. */
  function brandOptions(cat, products) {
    if (!cat.brands || !cat.brands.length) return [];
    var seen = {};
    var opts = [];
    function add(name) {
      var key = brandKey(name);
      if (!key || seen[key]) return;
      seen[key] = { name: name, key: key, count: 0 };
      opts.push(seen[key]);
    }
    cat.brands.forEach(add);
    products.forEach(function (p) { add(p.brand); });
    products.forEach(function (p) {
      var o = seen[brandKey(p.brand)];
      if (o) o.count++;
    });
    return opts;
  }

  function applyFilters(list) {
    console.log("applyFilters called with", list.length, "products, selectedBrands:", selectedBrands, "selectedSubcategories:", selectedSubcategories);
    var filtered = list;

    // Apply subcategory filter
    if (selectedSubcategories.length > 0) {
      filtered = filtered.filter(function (p) {
        return selectedSubcategories.indexOf(p.subSlug) !== -1;
      });
    }

    // Apply brand filter
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(function (p) {
        var pBrandKey = brandKey(p.brand);
        return selectedBrands.indexOf(pBrandKey) !== -1;
      });
    }

    console.log("Filtered to", filtered.length, "products");
    return filtered;
  }

  function applySort(list) {
    var out = list.slice();
    if (sortMode === "price-asc") out.sort(function (a, b) { return a.price - b.price; });
    else if (sortMode === "price-desc") out.sort(function (a, b) { return b.price - a.price; });
    else if (sortMode === "rating") out.sort(function (a, b) { return b.rating - a.rating; });
    else if (sortMode === "name") out.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return out;
  }

  /* Pagination helper - get products for current page */
  function paginateProducts(list) {
    var start = (currentPage - 1) * productsPerPage;
    var end = start + productsPerPage;
    return list.slice(start, end);
  }

  /* Generate pagination HTML */
  function paginationHtml(totalProducts) {
    var totalPages = Math.ceil(totalProducts / productsPerPage);
    if (totalPages <= 1) return "";

    var html = '<div class="el-pagination">';

    // Previous button
    if (currentPage > 1) {
      html += '<button type="button" class="el-page-btn" data-page="' + (currentPage - 1) + '">← Previous</button>';
    } else {
      html += '<button type="button" class="el-page-btn" disabled>← Previous</button>';
    }

    // Page numbers
    html += '<div class="el-page-numbers">';

    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      html += '<button type="button" class="el-page-btn" data-page="1">1</button>';
      if (startPage > 2) {
        html += '<span class="el-page-dots">...</span>';
      }
    }

    for (var i = startPage; i <= endPage; i++) {
      if (i === currentPage) {
        html += '<button type="button" class="el-page-btn el-page-active">' + i + '</button>';
      } else {
        html += '<button type="button" class="el-page-btn" data-page="' + i + '">' + i + '</button>';
      }
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        html += '<span class="el-page-dots">...</span>';
      }
      html += '<button type="button" class="el-page-btn" data-page="' + totalPages + '">' + totalPages + '</button>';
    }

    html += '</div>';

    // Next button
    if (currentPage < totalPages) {
      html += '<button type="button" class="el-page-btn" data-page="' + (currentPage + 1) + '">Next →</button>';
    } else {
      html += '<button type="button" class="el-page-btn" disabled>Next →</button>';
    }

    html += '</div>';

    return html;
  }

  function filtersHtml(opts) {
    if (!opts.length) return "";

    var items = opts
      .map(function (o) {
        return (
          '<label class="el-check el-brand' + (o.count ? "" : " is-zero") + '">' +
            '<input type="checkbox" data-brand="' + E.esc(o.key) + '"' +
              (selectedBrands.indexOf(o.key) !== -1 ? " checked" : "") + ">" +
            "<span>" + E.esc(o.name) + "</span>" +
            '<span class="el-brand-count">' + o.count + "</span>" +
          "</label>"
        );
      })
      .join("");

    return items; // Return just the checkbox items, not wrapped in a div
  }

  /* Inject brand filter into left sidebar */
  function injectSidebarBrandFilter(opts, callback) {
    if (!opts.length) {
      console.log("No brand options to inject");
      if (callback) callback();
      return;
    }

    // Wait a bit for sidebar to be fully rendered
    setTimeout(function() {
      var sidebarContainer = document.getElementById("el-sidebar-brands-content");

      if (!sidebarContainer) {
        console.warn("Sidebar brand container not found! Looking for #el-sidebar-brands-content");
        // Try to find the sidebar-brands div and log what's there
        var sidebar = document.getElementById("el-sidebar-brand-filter");
        if (sidebar) {
          console.log("Found el-sidebar-brand-filter:", sidebar);
        } else {
          console.error("Could not find el-sidebar-brand-filter either!");
        }
        if (callback) callback();
        return;
      }

      console.log("Injecting", opts.length, "brands into sidebar");

      var items = opts
        .map(function (o) {
          return (
            '<label class="el-check el-brand' + (o.count ? "" : " is-zero") + '">' +
              '<input type="checkbox" data-brand="' + E.esc(o.key) + '"' +
                (selectedBrands.indexOf(o.key) !== -1 ? " checked" : "") + ">" +
              "<span>" + E.esc(o.name) + "</span>" +
              '<span class="el-brand-count">' + o.count + "</span>" +
            "</label>"
          );
        })
        .join("");

      sidebarContainer.innerHTML =
        '<div class="el-brandlist">' + items + "</div>" +
        '<div class="el-filter-clear" style="margin-top: 1rem;">' +
          '<button type="button" class="el-link-btn" id="el-sidebar-clear-filters">Clear filter</button>' +
        "</div>";

      console.log("Brand filter injected successfully!");

      // Call callback after injection is complete
      if (callback) callback();
    }, 100);
  }

  /* Inject subcategory filter into left sidebar (for category landing pages) */
  function injectSidebarSubcategoryFilter(cat, allProducts, callback) {
    var subcats = getSubcategories(cat.slug).filter(function(s) { return !s.aliasOf; });
    if (!subcats.length) {
      if (callback) callback();
      return;
    }

    setTimeout(function() {
      var sidebarContainer = document.getElementById("el-sidebar-subcategories-content");
      if (!sidebarContainer) {
        console.warn("Sidebar subcategory container not found!");
        if (callback) callback();
        return;
      }

      console.log("Injecting", subcats.length, "subcategories into sidebar");

      var items = subcats
        .map(function (sub) {
          var count = allProducts.filter(function(p) { return p.subSlug === sub.slug; }).length;
          return (
            '<label class="el-check el-brand' + (count ? "" : " is-zero") + '">' +
              '<input type="checkbox" data-subcategory="' + E.esc(sub.slug) + '"' +
                (selectedSubcategories.indexOf(sub.slug) !== -1 ? " checked" : "") + ">" +
              "<span>" + E.esc(sub.name) + "</span>" +
              '<span class="el-brand-count">' + count + "</span>" +
            "</label>"
          );
        })
        .join("");

      sidebarContainer.innerHTML = '<div class="el-brandlist">' + items + "</div>";

      console.log("Subcategory filter injected successfully!");

      if (callback) callback();
    }, 100);
  }

  /* Toolbar above a product list: count, Brand button (mobile), sort. */
  function toolbarHtml(hasBrandFilter) {
    return (
      '<div class="el-toolbar">' +
        '<div class="el-count-label" id="el-count"></div>' +
        '<div class="el-toolbar-right">' +
          (hasBrandFilter
            ? '<button type="button" class="el-filter-btn" id="el-filter-toggle">' +
                E.icon("filter") + '<span id="el-filter-label">Brand</span>' +
              "</button>"
            : "") +
          '<label class="el-sr-only" for="el-sort">Sort products</label>' +
          '<select class="el-select" id="el-sort">' +
            '<option value="featured">Sort: Featured</option>' +
            '<option value="price-asc">Price: Low to High</option>' +
            '<option value="price-desc">Price: High to Low</option>' +
            '<option value="rating">Customer Rating</option>' +
            '<option value="name">Name: A to Z</option>' +
          "</select>" +
        "</div>" +
      "</div>"
    );
  }

  /* ---------------------------------------------------------------
   * Empty state — an empty shelf should still point somewhere useful.
   * --------------------------------------------------------------- */
  function emptyStateHtml(cat, sub, hadFiltersApplied) {
    if (hadFiltersApplied) {
      return (
        '<div class="el-empty">' +
          E.icon("filter") +
          "<h3>No products for the selected brands</h3>" +
          "<p>We don't have anything here from the brands you ticked yet. Clear the brand filter to see everything in this section.</p>" +
          '<div class="el-chiprow">' +
            '<button type="button" class="el-chip" id="el-empty-clear">Clear brand filter</button>' +
          "</div>" +
        "</div>"
      );
    }

    /* Point at sibling subcategories that DO have stock. */
    var siblings = getSubcategories(cat.slug)
      .map(function (s) {
        var target = resolveSub(cat.slug, s);
        return { sub: s, target: target, count: countProductsIn(target.cat, target.sub) };
      })
      .filter(function (item) {
        return item.count > 0 && !(sub && item.target.sub === sub.slug);
      })
      .slice(0, 6);

    var chips = siblings
      .map(function (item) {
        return (
          '<a class="el-chip" href="' + subcategoryUrl(cat.slug, item.sub) + '">' +
            E.esc(subLabel(item.sub)) + '<span class="el-count">' + item.count + "</span>" +
          "</a>"
        );
      })
      .join("");

    return (
      '<div class="el-empty">' +
        E.icon("box") +
        "<h3>Stock is on the way</h3>" +
        "<p>We haven't listed " + E.esc(sub ? sub.name.toLowerCase() : cat.name.toLowerCase()) +
        " online yet. Call the helpline on +92-323-9883836 and the team will quote you directly, or " +
        "browse what's in stock nearby.</p>" +
        '<div class="el-chiprow">' +
          (chips || '<a class="el-chip" href="' + categoryUrl(cat.slug) + '">All ' + E.esc(cat.name) + "</a>") +
        "</div>" +
      "</div>"
    );
  }

  /* ---------------------------------------------------------------
   * Subcategory grid shown on a category landing page
   * --------------------------------------------------------------- */
  function subGridHtml(cat) {
    return E.groupedSubs(cat)
      .map(function (group) {
        var cards = group.subs
          .map(function (sub) {
            var target = resolveSub(cat.slug, sub);
            var count = countProductsIn(target.cat, target.sub);
            var meta = sub.aliasOf
              ? "in " + E.esc(getCategory(sub.aliasOf.cat).name)
              : count > 0
                ? count + (count === 1 ? " product" : " products")
                : "Browse";

            return (
              '<a class="el-subcard" href="' + subcategoryUrl(cat.slug, sub) + '">' +
                '<span class="el-subcard-name">' + E.esc(sub.name) + "</span>" +
                '<span class="el-subcard-meta">' + E.icon("arrowRight") + "<span>" + meta + "</span></span>" +
              "</a>"
            );
          })
          .join("");

        return (
          (group.name
            ? '<div class="el-group-heading"><h3>' + E.esc(group.name) + '</h3><span class="el-rule"></span></div>'
            : "") +
          '<div class="el-subgrid">' + cards + "</div>"
        );
      })
      .join("");
  }

  /* ---------------------------------------------------------------
   * Sibling categories strip — the "never feel trapped" rule
   * --------------------------------------------------------------- */
  function siblingsHtml(currentSlug) {
    var chips = getCategories()
      .filter(function (c) { return c.slug !== currentSlug; })
      .map(function (c) {
        return '<a class="el-chip" href="' + categoryUrl(c.slug) + '">' + E.esc(c.name) + "</a>";
      })
      .join("");

    return (
      '<div class="el-siblings">' +
        "<h3>Keep browsing</h3>" +
        '<div class="el-chiprow" style="justify-content:flex-start">' + chips + "</div>" +
      "</div>"
    );
  }

  /* ---------------------------------------------------------------
   * MAIN RENDER
   * --------------------------------------------------------------- */
  async function render() {
    // Wait for products to load from Supabase
    console.log('Waiting for products to load...');
    await loadAllProducts();
    console.log('Products loaded, rendering page...');

    var route = readRoute();
    var cat = getCategory(route.cat);

    /* Unknown category → send the shopper to the catalog root rather
       than a dead end. */
    if (!cat) {
      window.location.replace(rootUrl());
      return;
    }

    var sub = route.sub ? getSubcategory(cat.slug, route.sub) : null;
    if (sub && sub.aliasOf) {
      window.location.replace(subcategoryUrl(cat.slug, sub));
      return;
    }

    var isListing = !!sub;
    var title = isListing ? sub.name : cat.name;

    /* The URL asked for a subcategory under a category that only lists it
       as an alias. The right page is already rendering, so just correct the
       address bar — one canonical URL per page, and no extra page load. */
    if (route.redirected && !window.PAGE_CAT && window.history.replaceState) {
      window.history.replaceState(
        null,
        "",
        isListing ? subcategoryUrl(cat.slug, sub) : categoryUrl(cat.slug)
      );
    }

    document.title = title + " | Electrade Pakistan";
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        isListing
          ? "Shop " + sub.name + " in " + cat.name + " at Electrade Pakistan."
          : cat.description
      );
    }

    /* Header + drawer + footer, with this page's active state. */
    E.init({ cat: cat.slug, sub: sub ? sub.slug : null });

    /* Sidebar */
    E.renderSidebar(document.getElementById("category-sidebar"), cat.slug, sub ? sub.slug : null);

    /* Breadcrumbs */
    E.breadcrumb(document.getElementById("breadcrumb"), cat.slug, sub ? sub.slug : null);

    var main = document.getElementById("category-main");

    /* ---- Page head ---- */
    var head =
      '<div class="el-page-head">' +
        '<h1 class="el-page-title">' + E.esc(title) + "</h1>" +
        '<p class="el-page-desc">' +
          E.esc(
            isListing
              ? sub.name + " available at Electrade — part of our " + cat.name +
                " range, delivered nationwide with cash on delivery."
              : cat.description
          ) +
        "</p>" +
      "</div>";

    if (isListing) {
      /* ============ SUBCATEGORY LISTING PAGE ============ */
      var products = getProductsIn(cat.slug, sub.slug);
      selectedBrands = readBrandParam();
      var brandOpts = brandOptions(cat, products);

      /* Quick sideways links to the other subcategories in this
         category, so Double Door → Single Door is one click. */
      var peers = getSubcategories(cat.slug)
        .filter(function (s) { return !s.aliasOf && s.slug !== sub.slug; })
        .map(function (s) {
          return (
            '<a class="el-chip" href="' + subcategoryUrl(cat.slug, s) + '">' +
              E.esc(subLabel(s)) + E.countLabel(cat.slug, s.slug) +
            "</a>"
          );
        })
        .join("");

      main.innerHTML =
        head +
        '<div class="el-siblings" style="margin-top:0;padding-top:0;border-top:none;margin-bottom:1.5rem">' +
          "<h3>More in " + E.esc(cat.name) + "</h3>" +
          '<div class="el-chiprow" style="justify-content:flex-start">' +
            '<a class="el-chip" href="' + categoryUrl(cat.slug) + '">All ' + E.esc(cat.name) + "</a>" +
            peers +
          "</div>" +
        "</div>" +

        toolbarHtml(false) + // No mobile filter button needed, it's in sidebar
        '<div id="el-results"></div>' +
        siblingsHtml(cat.slug);

      // Inject brand filter into left sidebar, then wire up the listing
      injectSidebarBrandFilter(brandOpts, function() {
        wireListing(cat, sub, products, brandOpts);
      });
    } else {
      /* ============ CATEGORY LANDING PAGE - SHOWS PRODUCTS FIRST, THEN SUBCATEGORIES ============ */
      var catProducts = getProductsIn(cat.slug);
      selectedBrands = readBrandParam();
      var landBrandOpts = catProducts.length ? brandOptions(cat, catProducts) : [];

      // Build products section (shown FIRST, at the top)
      var productBlock = catProducts.length
        ? '<div class="el-group-heading"><h3>In stock now · ' + catProducts.length +
          '</h3><span class="el-rule"></span></div>' +
          toolbarHtml(false) + '<div id="el-results"></div>'
        : "";

      // Build subcategories section (shown SECOND, below products)
      var subcategoriesBlock = cat.subcategories.length
        ? '<div style="margin-top:2.25rem">' +
          '<div class="el-group-heading"><h3>Shop by subcategory</h3>' +
            '<span class="el-rule"></span></div>' +
          subGridHtml(cat) +
          '</div>'
        : '<div class="el-empty" style="margin-top:2.25rem">' + E.icon("box") +
          "<h3>Subcategories coming soon</h3>" +
          "<p>We're still adding the " + E.esc(cat.name.toLowerCase()) +
          " range online. Call the helpline on +92-323-9883836 and the team will quote you directly.</p></div>";

      // Render: HEAD → PRODUCTS FIRST → SUBCATEGORIES → SIBLINGS
      main.innerHTML =
        head +
        (productBlock ? productBlock : "") +
        subcategoriesBlock +
        siblingsHtml(cat.slug);

      // Inject filters into sidebar for category landing page
      if (catProducts.length) {
        injectSidebarSubcategoryFilter(cat, catProducts, function() {
          injectSidebarBrandFilter(landBrandOpts, function() {
            wireListing(cat, null, catProducts, landBrandOpts);
          });
        });
      }
    }
  }

  /* Update brand counts in sidebar to reflect current visible products */
  function updateBrandCounts(opts, visibleProducts, allProducts) {
    opts.forEach(function(opt) {
      var count = visibleProducts.filter(function(p) {
        return brandKey(p.brand) === opt.key;
      }).length;

      var checkboxes = document.querySelectorAll('input[data-brand="' + opt.key + '"]');
      checkboxes.forEach(function(cb) {
        var label = cb.closest('.el-check');
        if (label) {
          var countSpan = label.querySelector('.el-brand-count');
          if (countSpan) {
            countSpan.textContent = count;
          }
          // Mark as zero if no products with this brand
          if (count === 0 && !cb.checked) {
            label.classList.add('is-zero');
          } else {
            label.classList.remove('is-zero');
          }
        }
      });
    });
  }

  /* ---------------------------------------------------------------
   * Listing page interactions
   * --------------------------------------------------------------- */
  function wireListing(cat, sub, allProducts, opts) {
    var resultsEl = document.getElementById("el-results");
    var countEl = document.getElementById("el-count");
    var scopeName = sub ? sub.name : cat.name;

    function paint() {
      var filtered = applyFilters(allProducts);
      var sorted = applySort(filtered);
      var totalProducts = sorted.length;
      var visible = paginateProducts(sorted);
      var filtersActive = selectedBrands.length > 0 || selectedSubcategories.length > 0;

      // Update count label
      var start = (currentPage - 1) * productsPerPage + 1;
      var end = Math.min(currentPage * productsPerPage, totalProducts);

      countEl.innerHTML =
        totalProducts > 0
          ? "Showing <strong>" + start + "-" + end + "</strong> of <strong>" + totalProducts + "</strong> " +
            (totalProducts === 1 ? "product" : "products") +
            (filtersActive ? " (filtered from " + allProducts.length + ")" : "") +
            " in " + E.esc(scopeName)
          : "<strong>0</strong> products in " + E.esc(scopeName);

      var label = document.getElementById("el-filter-label");
      if (label) {
        var filterCount = selectedBrands.length + selectedSubcategories.length;
        label.textContent = filtersActive ? "Filters (" + filterCount + ")" : "Filters";
      }

      resultsEl.innerHTML = totalProducts > 0
        ? '<div class="el-products">' + visible.map(E.productCard).join("") + "</div>" +
          paginationHtml(totalProducts)
        : emptyStateHtml(cat, sub, filtersActive && allProducts.length > 0);

      var emptyClear = document.getElementById("el-empty-clear");
      if (emptyClear) emptyClear.addEventListener("click", clearFilters);

      // Wire up pagination buttons
      var pageButtons = document.querySelectorAll(".el-page-btn[data-page]");
      pageButtons.forEach(function(btn) {
        btn.addEventListener("click", function() {
          currentPage = parseInt(btn.getAttribute("data-page"), 10);
          paint();
          // Scroll to top of results
          var toolbar = document.querySelector(".el-toolbar");
          if (toolbar) {
            toolbar.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      });

      // Update brand counts in the sidebar to reflect current filter state
      updateBrandCounts(opts, sorted, allProducts);
    }

    function clearFilters() {
      selectedBrands = [];
      selectedSubcategories = [];
      currentPage = 1; // Reset to first page when clearing filters
      // Clear brand checkboxes in sidebar
      document.querySelectorAll("#el-sidebar-brands-content input[type=checkbox]").forEach(function (cb) {
        cb.checked = false;
      });
      // Clear subcategory checkboxes in sidebar
      document.querySelectorAll("#el-sidebar-subcategories-content input[type=checkbox]").forEach(function (cb) {
        cb.checked = false;
      });
      // Also clear any mobile filter checkboxes if they exist
      document.querySelectorAll("#el-filters input[type=checkbox]").forEach(function (cb) {
        cb.checked = false;
      });
      writeBrandParam(opts);
      paint();
    }

    // Wire up sidebar subcategory filter checkboxes
    var subcategoryCheckboxes = document.querySelectorAll("#el-sidebar-subcategories-content input[data-subcategory]");
    console.log("Found " + subcategoryCheckboxes.length + " subcategory checkboxes in sidebar");

    subcategoryCheckboxes.forEach(function (cb) {
      cb.addEventListener("change", function () {
        var slug = cb.getAttribute("data-subcategory");
        console.log("Subcategory checkbox changed:", slug, "checked:", cb.checked);

        if (cb.checked) {
          if (selectedSubcategories.indexOf(slug) === -1) selectedSubcategories.push(slug);
        } else {
          selectedSubcategories = selectedSubcategories.filter(function (s) { return s !== slug; });
        }

        console.log("Selected subcategories after change:", selectedSubcategories);
        currentPage = 1; // Reset to first page when filter changes
        paint();
      });
    });

    // Wire up sidebar brand filter checkboxes
    var sidebarCheckboxes = document.querySelectorAll("#el-sidebar-brands-content input[data-brand]");
    console.log("Found " + sidebarCheckboxes.length + " brand checkboxes in sidebar");

    sidebarCheckboxes.forEach(function (cb) {
      cb.addEventListener("change", function () {
        var key = cb.getAttribute("data-brand");
        console.log("Brand checkbox changed:", key, "checked:", cb.checked);

        if (cb.checked) {
          if (selectedBrands.indexOf(key) === -1) selectedBrands.push(key);
        } else {
          selectedBrands = selectedBrands.filter(function (k) { return k !== key; });
        }

        console.log("Selected brands after change:", selectedBrands);
        currentPage = 1; // Reset to first page when filter changes
        writeBrandParam(opts);
        paint();
      });
    });

    // Also wire up mobile filter checkboxes if they exist
    document.querySelectorAll("#el-filters input[data-brand]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var key = cb.getAttribute("data-brand");
        if (cb.checked) {
          if (selectedBrands.indexOf(key) === -1) selectedBrands.push(key);
        } else {
          selectedBrands = selectedBrands.filter(function (k) { return k !== key; });
        }
        currentPage = 1; // Reset to first page when filter changes
        writeBrandParam(opts);
        paint();
      });
    });

    // Clear button in sidebar
    var sidebarClearBtn = document.getElementById("el-sidebar-clear-filters");
    if (sidebarClearBtn) sidebarClearBtn.addEventListener("click", clearFilters);

    // Clear button in mobile filter (if exists)
    var clearBtn = document.getElementById("el-clear-filters");
    if (clearBtn) clearBtn.addEventListener("click", clearFilters);

    var sortEl = document.getElementById("el-sort");
    if (sortEl) {
      sortEl.addEventListener("change", function () {
        sortMode = sortEl.value;
        currentPage = 1; // Reset to first page when sort changes
        paint();
      });
    }

    /* The brand list is a panel on mobile, always open on desktop. */
    var filterToggle = document.getElementById("el-filter-toggle");
    var filterPanel = document.getElementById("el-filters");
    if (filterToggle && filterPanel) {
      filterToggle.addEventListener("click", function () {
        filterPanel.classList.toggle("is-open");
      });
      /* If the page was opened with filters already chosen, show them. */
      if (selectedBrands.length || selectedSubcategories.length) filterPanel.classList.add("is-open");
    }

    paint();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
