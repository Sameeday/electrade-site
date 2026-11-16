/**
 * categories.js
 * ==================================================================
 * SINGLE SOURCE OF TRUTH for the whole Electrade catalog hierarchy.
 *
 * Everything that shows a category anywhere on the site reads from
 * this one file:
 *
 *   - the header mega-menu           (site-nav.js)
 *   - the mobile accordion drawer    (site-nav.js)
 *   - the homepage category cards    (site-nav.js)
 *   - the left category sidebar      (category-page.js)
 *   - breadcrumbs                    (site-nav.js)
 *   - category + subcategory pages   (category.html / category-page.js)
 *   - site search                    (site-nav.js)
 *
 * ------------------------------------------------------------------
 * HOW TO ADD A NEW CATEGORY OR SUBCATEGORY
 * ------------------------------------------------------------------
 * To add a SUBCATEGORY: add one line to that category's
 * `subcategories` array, e.g.
 *
 *     { slug: "front-load-washing-machines",
 *       name: "Front Load Washing Machines",
 *       group: "Laundry & Garment Care" }
 *
 * To add a MAIN CATEGORY: copy one of the blocks in CATEGORIES below
 * and fill it in.
 *
 * That is the ONLY edit needed. The mega-menu, mobile menu, sidebar,
 * breadcrumbs, homepage cards, search and the category page all pick
 * it up automatically — no other file has to be touched, and no new
 * HTML file has to be created (it will be served by category.html).
 *
 * Optionally, run `node generate-category-pages.js` to also give the
 * new main category a pretty top-level URL (e.g. /washing-machines.html).
 *
 * ------------------------------------------------------------------
 * ABOUT BRANDS (the brand filter)
 * ------------------------------------------------------------------
 * A category can carry a `brands` list (see LED, Air Conditioners,
 * Refrigerators and Washing Machines). Those brands appear as the
 * "Brand" filter on every subcategory page of that category, in
 * exactly the order written here. Categories with `brands: []` show
 * no brand filter.
 *
 * To make a product show up under a brand, give the product a
 * `brand` field in products.js that matches a name in the list,
 * e.g.  brand: "TCL".  (Capitals, spaces and hyphens don't matter.)
 *
 * To add or remove a brand: edit that category's `brands` array. That
 * is the only edit needed.
 *
 * ------------------------------------------------------------------
 * ABOUT ALIASES (how overlapping categories are handled)
 * ------------------------------------------------------------------
 * The client's list has the same product type sitting under more than
 * one heading — e.g. "Deep Freezers" is listed under BOTH Refrigerators
 * and Cooling Appliances, and "Room Air Coolers" under BOTH Coolers and
 * Cooling Appliances.
 *
 * Rather than build two competing pages for the same products (which
 * splits the catalog and confuses shoppers), every product type has
 * exactly ONE canonical page, and the other heading links to it via
 * `aliasOf`. So the client keeps every required heading in the
 * navigation, but there is only ever one page and one set of products
 * per product type.
 * ==================================================================
 */

/* ------------------------------------------------------------------
 * 1. THE HIERARCHY
 *
 *   Electronics (store root)
 *     └── Main category      e.g. Refrigerators
 *           └── Subcategory  e.g. Double Door Refrigerators
 *                 └── Products
 * ------------------------------------------------------------------ */

const STORE_ROOT = {
  slug: "electronics",
  name: "Electronics",
  tagline: "The full Electrade catalog",
  description:
    "Every category we stock — LED TVs, air conditioners, refrigerators, washing machines, home and kitchen appliances, audio, power backup and commercial equipment."
};

const CATEGORIES = [
  /* ================================================================
   * 1. LED
   * Has a BRAND filter — edit the `brands` list to change it.
   * ================================================================ */
  {
    slug: "led",
    name: "LED",
    image: "images/led-tv.jpg",   // Updated with new product image
    tagline: "FHD, 4K, QLED, OLED & gaming monitors",
    description:
      "LED, QLED, Mini QLED and OLED televisions in every resolution - from FHD and smart HD sets to 4K UHD screens and gaming monitors - from the brands you already trust.",
    featured: ["oled-tv", "qled-tv", "4k-led-tv", "fhd-led-tv"],
    brands: [
      "TCL",
      "Samsung",
      "Sony",
      "Hisense",
      "Mi",
      "Xiaomi",
      "Orient",
      "Skyworth",
      "Dawlance",
      "Ecostar",
      "Infinix"
    ],
    subcategories: [
      { slug: "8k-tv", name: "8K TV" },
      { slug: "oled-tv", name: "OLED TV" },
      { slug: "qled-tv", name: "QLED TV" },
      { slug: "4k-led-tv", name: "4K LED TV" },
      { slug: "fhd-led-tv", name: "FHD LED TV" },
      { slug: "smart-tv", name: "Smart TV" }
    ]
  },

  /* ================================================================
   * 2. AIR CONDITIONERS
   * Has a BRAND filter — edit the `brands` list to change it.
   * ================================================================ */
  {
    slug: "air-conditioners",
    name: "Air Conditioners",
    image: "images/air-conditioner.jpg",   // Updated with new product image
    tagline: "Split, cabinet, cassette, duct & portable",
    description:
      "Air conditioning for every space — split ACs for bedrooms and lounges, floor-standing cabinet units for halls, cassette and duct systems for offices, plus portable and HVAC solutions.",
    featured: ["split-ac", "floor-standing-cabinet-ac", "cassette-ac", "portable-ac"],
    brands: [
      "Gree",
      "Ecostar",
      "Homage",
      "Haier",
      "Dawlance",
      "Orient",
      "TCL",
      "AUX by Orient",
      "Kenwood",
      "PEL",
      "Panasonic",
      "Midea",
      "Hisense",
      "Green Air",
      "AirX by Hitachi",
      "LG"
    ],
    subcategories: [
      { slug: "split-ac", name: "Split AC" },
      { slug: "floor-standing-cabinet-ac", name: "Floor Standing Cabinet AC", shortName: "Cabinet AC" },
      { slug: "cassette-ac", name: "Cassette AC" },
      { slug: "ceiling-cassette-ac", name: "Ceiling Cassette" },
      { slug: "duct-type-ac", name: "Duct Type AC" },
      { slug: "rcm", name: "RCM" },
      { slug: "portable-ac", name: "Portable AC" },
      { slug: "hvac", name: "HVAC" }
    ]
  },

  /* ================================================================
   * 3. REFRIGERATORS
   * Has a BRAND filter — edit the `brands` list to change it.
   * ================================================================ */
  {
    slug: "refrigerators",
    name: "Refrigerators",
    image: "images/refrigerator.jpg",   // Updated with new product image
    tagline: "Refrigerators, no-frost & deep freezers",
    description:
      "Home refrigeration and freezing — standard and no-frost refrigerators, plus deep freezers and upright or vertical freezers for bulk storage.",
    featured: ["refrigerators", "no-frost-refrigerators", "deep-freezers", "upright-vertical-deep-freezers"],
    brands: [
      "Dawlance",
      "PEL",
      "Kenwood",
      "Orient",
      "Haier",
      "Samsung",
      "LG"
    ],
    subcategories: [
      { slug: "deep-freezers", name: "Deep Freezers" },
      { slug: "upright-vertical-deep-freezers", name: "Upright / Vertical Deep Freezers", shortName: "Upright / Vertical" },
      { slug: "refrigerators", name: "Refrigerators" },
      { slug: "no-frost-refrigerators", name: "No Frost Refrigerators" }
    ]
  },

  /* ================================================================
   * 4. WASHING MACHINES
   * Has a BRAND filter — edit the `brands` list to change it.
   * ================================================================ */
  {
    slug: "washing-machines",
    name: "Washing Machines",
    image: "images/washing-machine.jpg",   // Updated with new product image
    tagline: "Semi-auto, front load, top load & spinners",
    description:
      "Washing machines for every household — semi-automatic and fully automatic front and top loaders, spinner dryers and compact portable mini machines.",
    featured: ["semi-automatic-washing-machines", "fully-auto-front-load", "fully-auto-top-load", "spinner-dryers"],
    brands: [
      "Super Asia",
      "Dawlance",
      "Haier",
      "Royal",
      "Nasgas",
      "NG",
      "Samsung",
      "LG",
      "Midea",
      "TCL",
      "Kenwood"
    ],
    subcategories: [
      { slug: "semi-automatic-washing-machines", name: "Semi Automatic Washing Machines", shortName: "Semi Automatic" },
      { slug: "fully-auto-front-load", name: "Fully Auto Front Load" },
      { slug: "fully-auto-top-load", name: "Fully Auto Top Load" },
      { slug: "spinner-dryers", name: "Spinner Dryers" },
      { slug: "portable-mini-washing-machines", name: "Portable Mini Washing Machines", shortName: "Portable Mini" }
    ]
  },

  /* ================================================================
   * 5. COOLING & HEATING
   * No brand filter for this category (per client request).
   * ================================================================ */
  {
    slug: "cooling-heating",
    name: "Cooling & Heating",
    image: "images/cooling-heating.jpg",   // Updated with new product image
    tagline: "Geysers, heaters, fans & air purifiers",
    description:
      "Comfort for every season — water heaters and geysers, fan heaters, humidifiers and dehumidifiers, fans and air purifiers.",
    featured: ["water-heaters-geysers", "fan-heaters", "fans", "air-purifiers"],
    brands: [],
    subcategories: [
      { slug: "water-heaters-geysers", name: "Water Heaters & Geysers", shortName: "Geysers" },
      { slug: "fan-heaters", name: "Fan Heaters" },
      { slug: "humidifiers", name: "Humidifiers" },
      { slug: "dehumidifiers", name: "Dehumidifiers" },
      { slug: "fans", name: "Fans" },
      { slug: "air-purifiers", name: "Air Purifiers" }
    ]
  },

  /* ================================================================
   * 6. KITCHEN APPLIANCES
   * No brand filter for this category (per client request).
   * ================================================================ */
  {
    slug: "kitchen-appliances",
    name: "Kitchen Appliances",
    image: "images/kitchen-appliances.jpg",   // Updated with new product image
    tagline: "Dispensers, kettles, fryers, juicers & more",
    description:
      "Everyday kitchen appliances — water dispensers, juicers, kettles, toasters, fryers, bread, pasta and ice-cream makers and more.",
    featured: ["water-dispensers", "electric-kettles", "juicers-fruit-extractors", "deep-fryers"],
    brands: [],
    subcategories: [
      { slug: "water-dispensers", name: "Water Dispensers" },
      { slug: "juicers-fruit-extractors", name: "Juicers & Fruit Extractors", shortName: "Juicers" },
      { slug: "electric-kettles", name: "Electric Kettles" },
      { slug: "pasta-noodle-makers", name: "Pasta & Noodle Makers" },
      { slug: "bread-makers", name: "Bread Makers" },
      { slug: "thermo-pots", name: "Thermo Pots" },
      { slug: "sandwich-makers", name: "Sandwich Makers" },
      { slug: "electric-knives", name: "Electric Knives" },
      { slug: "toasters", name: "Toasters" },
      { slug: "turbo-broilers", name: "Turbo Broilers" },
      { slug: "electric-woks", name: "Electric Woks" },
      { slug: "pancake-makers", name: "Pancake Makers" },
      { slug: "deep-fryers", name: "Deep Fryers" },
      { slug: "steamers", name: "Steamers" },
      { slug: "ice-cream-makers", name: "Ice-Cream Makers" },
      { slug: "waffle-makers", name: "Waffle Makers" }
    ]
  },

  /* ================================================================
   * 7. IRON & GARMENT CARE
   * No brand filter for this category (per client request).
   * ================================================================ */
  {
    slug: "iron-garment-care",
    name: "Iron & Garment Care",
    image: "images/iron-garment.jpg",   // Updated with new product image
    tagline: "Irons, garment steamers & sewing machines",
    description:
      "Keep clothes crisp and repaired — irons, garment steamers and sewing machines for home and workshop.",
    featured: ["irons", "garment-steamers", "sewing-machines"],
    brands: [],
    subcategories: [
      { slug: "irons", name: "Irons" },
      { slug: "garment-steamers", name: "Garment Steamers" },
      { slug: "sewing-machines", name: "Sewing Machines" }
    ]
  },

  /* ================================================================
   * 8. VACUUM & FLOOR CARE
   * No brand filter for this category (per client request).
   * ================================================================ */
  {
    slug: "vacuum-floor-care",
    name: "Vacuum & Floor Care",
    image: "images/vacuum-floor-care.jpg",   // Updated with new product image
    tagline: "Vacuums, mops, polishers & stabilizers",
    description:
      "Cleaning and floor care — vacuum cleaners, steam mops, electric brooms, window cleaners, floor polishers, pressure washers and voltage stabilizers.",
    featured: ["vacuum-cleaners", "steam-mops", "voltage-stabilizers", "pressure-washers"],
    brands: [],
    subcategories: [
      { slug: "vacuum-cleaners", name: "Vacuum Cleaners" },
      { slug: "steam-mops", name: "Steam Mops" },
      { slug: "voltage-stabilizers", name: "Voltage Stabilizers" },
      { slug: "electric-brooms", name: "Electric Brooms" },
      { slug: "window-cleaners", name: "Window Cleaners" },
      { slug: "floor-polishers", name: "Floor Polishers" },
      { slug: "pressure-washers", name: "Pressure Washers" },
      { slug: "brooms-mops-sweepers", name: "Brooms, Mops & Sweepers" },
      { slug: "vacuum-cleaner-bags", name: "Vacuum Cleaner Bags" }
    ]
  },

  /* ================================================================
   * 9. HOME AUDIO & SOUND THEATRE
   * No brand filter for this category (per client request).
   * ================================================================ */
  {
    slug: "home-audio",
    name: "Home Audio & Sound Theatre",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",   // empty = a neutral placeholder tile is shown until you add a photo
    tagline: "Sound bars, speakers, home theatres & headphones",
    description:
      "Sound for every room — sound bars, home theatre systems, speakers and portable speakers, air buds, headphones and audio sticks.",
    featured: ["sound-bars", "portable-speakers", "home-theatres", "headphones"],
    brands: [],
    subcategories: [
      { slug: "sound-bars", name: "Sound Bars" },
      { slug: "audio-sticks", name: "Audio Sticks" },
      { slug: "portable-speakers", name: "Portable Speakers" },
      { slug: "speakers", name: "Speakers" },
      { slug: "home-theatres", name: "Home Theatres" },
      { slug: "air-buds", name: "Air Buds" },
      { slug: "headphones", name: "Headphones" }
    ]
  },

  /* ================================================================
   * 10. PROJECTORS, TV ACCESSORIES & OTHER DEVICES
   * No brand filter for this category (per client request).
   * ================================================================ */
  {
    slug: "projectors-tv-accessories",
    name: "Projectors, TV Accessories & Other Devices",
    image: "images/projectors.jpg",   // Updated with new product image
    tagline: "Projectors, Android & gaming devices",
    description:
      "Add more to your screen — portable mini projectors, Blu-ray players, Android devices and gaming devices including PlayStation, Xbox and gaming gadgets.",
    featured: ["portable-mini-projectors", "android-devices", "gaming-devices", "playstation"],
    brands: [],
    subcategories: [
      { slug: "android-devices", name: "Android Devices" },
      { slug: "gaming-devices", name: "Gaming Devices" },
      { slug: "playstation", name: "PlayStation" },
      { slug: "xbox", name: "Xbox" },
      { slug: "gaming-gadgets", name: "Gaming Gadgets" },
      { slug: "portable-mini-projectors", name: "Portable Mini Projectors" },
      { slug: "blu-ray-players", name: "Blu-ray Players" }
    ]
  },

  /* ================================================================
   * 11. POWER TOOLS
   * No brand filter for this category (per client request).
   * ================================================================ */
  {
    slug: "power-tools",
    name: "Power Tools",
    image: "images/power-tools.jpg",   // Updated with new product image
    tagline: "Inverter UPS, batteries & generators",
    description:
      "Power when you need it — inverter UPS systems, batteries, generators and portable generators.",
    featured: ["inverter-ups", "batteries", "generators", "portable-generators"],
    brands: [],
    subcategories: [
      { slug: "inverter-ups", name: "Inverter UPS" },
      { slug: "batteries", name: "Batteries" },
      { slug: "generators", name: "Generators" },
      { slug: "portable-generators", name: "Portable Generators" }
    ]
  },

  /* ================================================================
   * 12. COMMERCIAL PRODUCTS
   * No brand filter for this category (per client request).
   * ================================================================ */
  {
    slug: "commercial-products",
    name: "Commercial Products",
    image: "images/vizzy-coolers.jpg",   // Updated path
    tagline: "Equipment for cafes, hotels & restaurants",
    description:
      "Heavy-duty commercial equipment for cafes, restaurants, bakeries, hotels and catering kitchens. Subcategories are being added — call the helpline for a direct quote in the meantime.",
    featured: [],
    brands: [],
    /* Subcategories to be added by the client. Add them here exactly like the other
     * categories, e.g.  { slug: "fryers", name: "Fryers" },
     * The 31 subcategories that used to be here are kept below for reference. */
    subcategories: [
      // { slug: "commercial-coffee-machines", name: "Commercial Coffee Machines", group: "Beverage & Coffee" },
      // { slug: "coffee-maker-machines", name: "Coffee Maker Machines", group: "Beverage & Coffee" },
      // { slug: "commercial-coffee-grinders", name: "Commercial Coffee Grinders", group: "Beverage & Coffee" },
      // { slug: "milk-frothers", name: "Milk Frothers", group: "Beverage & Coffee" },
      // { slug: "auto-tea-vending-machines", name: "Auto Tea Vending Machines", group: "Beverage & Coffee" },
      // { slug: "water-boilers", name: "Water Boilers", group: "Beverage & Coffee" },
      // { slug: "juice-dispensers", name: "Juice Dispensers", group: "Beverage & Coffee" },
      // { slug: "commercial-juice-extractors", name: "Commercial Juice Extractors", group: "Beverage & Coffee" },
      // { slug: "slush-machines", name: "Slush Machines", group: "Beverage & Coffee" },
      // { slug: "commercial-ovens", name: "Commercial Ovens", group: "Cooking & Heating" },
      // { slug: "fryers", name: "Fryers", group: "Cooking & Heating" },
      // { slug: "gas-grillers", name: "Gas Grillers", group: "Cooking & Heating" },
      // { slug: "shawarma-machines", name: "Shawarma Machines", group: "Cooking & Heating" },
      // { slug: "waffle-makers", name: "Waffle Makers", group: "Cooking & Heating" },
      // { slug: "bain-maries", name: "Bain Maries", group: "Cooking & Heating" },
      // { slug: "warmers", name: "Warmers", group: "Cooking & Heating" },
      // { slug: "gas-heaters", name: "Gas Heaters", group: "Cooking & Heating" },
      // { slug: "commercial-blenders", name: "Commercial Blenders", group: "Food Preparation" },
      // { slug: "dough-mixers", name: "Dough Mixers", group: "Food Preparation" },
      // { slug: "spiral-mixers", name: "Spiral Mixers", group: "Food Preparation" },
      // { slug: "can-sealers", name: "Can Sealers", group: "Food Preparation" },
      // { slug: "small-appliances", name: "Small Appliances", group: "Food Preparation" },
      // { slug: "commercial-chillers", name: "Commercial Chillers", group: "Refrigeration & Ice" },
      // { slug: "commercial-cake-display-chillers", name: "Commercial Cake Display Chillers", group: "Refrigeration & Ice" },
      // { slug: "commercial-freezers", name: "Commercial Freezers", group: "Refrigeration & Ice" },
      // { slug: "ice-makers", name: "Ice Makers", group: "Refrigeration & Ice" },
      // { slug: "ice-crushers", name: "Ice Crushers", group: "Refrigeration & Ice" },
      // { slug: "ice-cream-maker-machines", name: "Ice Cream Maker Machines", group: "Refrigeration & Ice" },
      // { slug: "popcorn-machines", name: "Popcorn Machines", group: "Snacks & Novelty" },
      // { slug: "cotton-candy-machines", name: "Cotton Candy Machines", group: "Snacks & Novelty" },
      // { slug: "commercial-vacuum-cleaners", name: "Commercial Vacuum Cleaners", group: "Cleaning" }
    ]
  }
];

/* ------------------------------------------------------------------
 * 2. WHICH MAIN CATEGORIES HAVE THEIR OWN TOP-LEVEL HTML FILE
 *
 * A category listed here gets the pretty URL (refrigerators.html).
 * Any category NOT listed here still works perfectly — it is just
 * served by category.html?cat=<slug> instead. That's what makes a
 * newly added category work immediately without creating any file.
 * ------------------------------------------------------------------ */
const CATEGORY_PAGE_FILES = [
  "led",
  "air-conditioners",
  "refrigerators",
  "washing-machines",
  "cooling-heating",
  "kitchen-appliances",
  "iron-garment-care",
  "vacuum-floor-care",
  "home-audio",
  "projectors-tv-accessories",
  "power-tools",
  "commercial-products"
];

/* ==================================================================
 * 3. HELPERS — used by every navigation component on the site
 * ================================================================== */

/** All main categories, in menu order. */
function getCategories() {
  return CATEGORIES;
}

/** Look up a main category by slug. Returns undefined if not found. */
function getCategory(slug) {
  return CATEGORIES.find(function (c) { return c.slug === slug; });
}

/**
 * Subcategories of a category.
 * Aliases are included (so the client's headings all still show) but
 * each one carries the `aliasOf` pointer to the page that owns it.
 */
function getSubcategories(catSlug) {
  const cat = getCategory(catSlug);
  return cat ? cat.subcategories : [];
}

/** Only the subcategories this category actually owns (no aliases). */
function getOwnedSubcategories(catSlug) {
  return getSubcategories(catSlug).filter(function (s) { return !s.aliasOf; });
}

/** Look up a single subcategory inside a category. */
function getSubcategory(catSlug, subSlug) {
  return getSubcategories(catSlug).find(function (s) { return s.slug === subSlug; });
}

/**
 * Resolve a subcategory reference to the category + subcategory that
 * actually owns the page. Alias entries point elsewhere; everything
 * else resolves to itself.
 */
function resolveSub(catSlug, subEntry) {
  if (subEntry && subEntry.aliasOf) {
    return { cat: subEntry.aliasOf.cat, sub: subEntry.aliasOf.sub };
  }
  return { cat: catSlug, sub: subEntry ? subEntry.slug : null };
}

/** Short label for tight spaces (cards, chips), falls back to name. */
function subLabel(sub) {
  return sub.shortName || sub.name;
}

/* ---- Brands (the brand filter) ----------------------------------- */

/**
 * Normalised comparison key for a brand name, so "Super Asia",
 * "SuperAsia" and "super-asia" are all the same brand.
 */
function brandKey(name) {
  return String(name == null ? "" : name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** URL-friendly brand token, e.g. "AUX by Orient" -> "aux-by-orient". */
function brandSlug(name) {
  return String(name == null ? "" : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The brand list a category was given in categories.js (may be empty). */
function getBrands(catSlug) {
  const cat = getCategory(catSlug);
  return cat && cat.brands ? cat.brands : [];
}

/* ---- URL builders ------------------------------------------------ */

/** URL of the "all categories" landing page. */
function rootUrl() {
  return "electronics.html";
}

/** URL of a main category page. */
function categoryUrl(catSlug) {
  return CATEGORY_PAGE_FILES.indexOf(catSlug) !== -1
    ? catSlug + ".html"
    : "category.html?cat=" + encodeURIComponent(catSlug);
}

/**
 * URL of a subcategory listing page. Alias entries resolve to the
 * canonical owner's URL so there is only ever one page per product type.
 */
function subcategoryUrl(catSlug, subEntry) {
  const target =
    typeof subEntry === "string"
      ? { cat: catSlug, sub: subEntry }
      : resolveSub(catSlug, subEntry);
  return (
    "category.html?cat=" +
    encodeURIComponent(target.cat) +
    "&sub=" +
    encodeURIComponent(target.sub)
  );
}

/* ---- Breadcrumbs ------------------------------------------------- */

/**
 * Build the breadcrumb trail for any point in the catalog:
 *   Home > Electronics > Refrigerators > Double Door Refrigerators
 * Returns [{ label, url }] — the last item has url === null (current page).
 */
function buildBreadcrumb(catSlug, subSlug) {
  const trail = [
    { label: "Home", url: "index.html" },
    { label: STORE_ROOT.name, url: rootUrl() }
  ];

  const cat = getCategory(catSlug);
  if (!cat) return trail;

  trail.push({ label: cat.name, url: categoryUrl(cat.slug) });

  if (subSlug) {
    const sub = getSubcategory(catSlug, subSlug);
    if (sub) trail.push({ label: sub.name, url: null });
  }

  // Mark the deepest item as current.
  trail[trail.length - 1].url = null;
  return trail;
}

/* ---- Product lookups --------------------------------------------- */

/**
 * Products in a category (and optionally one subcategory).
 * Reads the `catSlug` / `subSlug` fields added to each product in
 * products.js. Safe to call before products.js loads.
 */
function getProductsIn(catSlug, subSlug) {
  if (typeof PRODUCTS === "undefined") return [];
  return PRODUCTS.filter(function (p) {
    if (p.catSlug !== catSlug) return false;
    if (subSlug && p.subSlug !== subSlug) return false;
    return true;
  });
}

/** How many products sit under a category (or subcategory). */
function countProductsIn(catSlug, subSlug) {
  return getProductsIn(catSlug, subSlug).length;
}

/** The category + subcategory a product belongs to, for breadcrumbs. */
function getProductCategoryPath(product) {
  if (!product || !product.catSlug) return null;
  const cat = getCategory(product.catSlug);
  if (!cat) return null;
  const sub = product.subSlug ? getSubcategory(product.catSlug, product.subSlug) : null;
  return { category: cat, subcategory: sub };
}

/* ---- Search ------------------------------------------------------ */

/**
 * Flat, searchable index of every category and subcategory.
 * Used by the header search so that typing "double door" finds the
 * Double Door Refrigerators page, not just products.
 */
function buildCategorySearchIndex() {
  const index = [];

  CATEGORIES.forEach(function (cat) {
    index.push({
      type: "category",
      label: cat.name,
      context: STORE_ROOT.name,
      url: categoryUrl(cat.slug),
      haystack: (cat.name + " " + (cat.tagline || "")).toLowerCase()
    });

    cat.subcategories.forEach(function (sub) {
      // Skip aliases so the same page isn't listed twice in results.
      if (sub.aliasOf) return;
      index.push({
        type: "subcategory",
        label: sub.name,
        context: cat.name,
        url: subcategoryUrl(cat.slug, sub),
        haystack: (sub.name + " " + cat.name).toLowerCase()
      });
    });
  });

  return index;
}
