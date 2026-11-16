/**
 * generate-category-pages.js
 * ==================================================================
 * Writes the top-level HTML file for each main category, e.g.
 * refrigerators.html, fans.html, air-conditioners.html.
 *
 * Run it with:   node generate-category-pages.js
 *
 * WHEN DO I NEED THIS?
 * ------------------------------------------------------------------
 * Only when you want a *pretty URL* for a new main category.
 * A category added to categories.js already works everywhere
 * immediately (menus, sidebar, search, breadcrumbs) and is served by
 * category.html?cat=your-slug — running this script just also gives it
 * your-slug.html.
 *
 * Every generated file is a thin shell: it names its category and
 * loads the same shared scripts, so all the real logic stays in
 * category-page.js and none of it is duplicated per page.
 * ==================================================================
 */

const fs = require("fs");
const path = require("path");

/* Pull the category data straight out of categories.js so this script
   can never drift from the site's actual hierarchy. */
const src = fs.readFileSync(path.join(__dirname, "categories.js"), "utf8");
const sandbox = { window: {} };
new Function(src + "\nthis.CATEGORIES = CATEGORIES; this.CATEGORY_PAGE_FILES = CATEGORY_PAGE_FILES;").call(sandbox);

const { CATEGORIES, CATEGORY_PAGE_FILES } = sandbox;

/** Shared <head> + shell used by every catalog page. */
function shell({ title, description, bodyScript, canonicalNote }) {
  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
    rel="stylesheet">

  <!-- Shared navigation styles (header, mega-menu, sidebar, grid) -->
  <link rel="stylesheet" href="site.css">
</head>

<body>
${canonicalNote}
  <!-- Header, category bar, mega-menu and mobile drawer are all
       rendered by site-nav.js from the data in categories.js. -->
  <header id="site-header"></header>

  <main class="el-main">
    <div class="el-container">
      <nav id="breadcrumb" class="el-crumb el-crumb-row" aria-label="Breadcrumb"></nav>

      <div class="el-layout">
        <!-- LEFT: category sidebar (auto-expands the category you're in) -->
        <aside id="category-sidebar"></aside>

        <!-- RIGHT: title, subcategories / product listing, filters, sorting -->
        <div id="category-main"></div>
      </div>
    </div>
  </main>

  <footer id="site-footer"></footer>

  <script src="categories.js"></script>
  <script src="products.js"></script>
  <script src="cart.js"></script>
  <script src="site-nav.js"></script>
${bodyScript}
  <script src="category-page.js"></script>
</body>

</html>
`;
}

let written = [];

/* ---- One file per main category ---- */
CATEGORIES.forEach((cat) => {
  if (CATEGORY_PAGE_FILES.indexOf(cat.slug) === -1) return;

  const file = `${cat.slug}.html`;
  const html = shell({
    title: `${cat.name} | Electrade Pakistan`,
    description: cat.description.replace(/"/g, "&quot;"),
    canonicalNote: "",
    bodyScript: `  <script>
    /* This page always shows one category. category-page.js reads it
       and renders the landing page; subcategories are served by
       category.html?cat=${cat.slug}&sub=... */
    window.PAGE_CAT = ${JSON.stringify(cat.slug)};
  </script>
`
  });

  fs.writeFileSync(path.join(__dirname, file), html);
  written.push(file);
});

/* ---- The universal page: any category, any subcategory ---- */
fs.writeFileSync(
  path.join(__dirname, "category.html"),
  shell({
    title: "Shop by Category | Electrade Pakistan",
    description:
      "Browse the full Electrade catalog by category and subcategory — LED TVs, air conditioners, refrigerators, washing machines, home appliances, audio and commercial equipment.",
    canonicalNote: "",
    bodyScript: `  <script>
    /* No fixed category — this page renders whatever ?cat= and ?sub=
       point at. It is what makes a newly added category work without
       creating any new file. */
  </script>
`
  })
);
written.push("category.html");

console.log("Generated:\n  " + written.join("\n  "));
