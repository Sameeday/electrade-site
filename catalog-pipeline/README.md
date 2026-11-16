# Electrade Catalog Import Pipeline

This folder contains the scripts to import ~2,000 products from the source WooCommerce store into your Supabase database.

**⚠️ IMPORTANT: This folder is separate from your website files and should NEVER be deployed.**

## What's in this folder

- `catalog_pipeline.py` - The main import script (2 stages: scrape + load)
- `.env` - Your Supabase credentials (YOU create this - see below)
- `.gitignore` - Prevents sensitive files from being committed to git
- `staging.csv` - Raw scraped data (created by the scrape stage)
- `category_map.csv` - Maps source categories to your categories (you'll review this)
- `ready.csv` - Final cleaned data ready for import (you create from staging.csv)

## Setup Instructions

### 1. Install Python Dependencies

Open a terminal in this folder and run:

```bash
pip install requests pillow supabase python-slugify
```

If you don't have Python installed, download it from python.org (version 3.8 or newer).

### 2. Create .env file with Supabase credentials

Create a file named `.env` in THIS folder with these two lines:

```
SUPABASE_URL=https://hmpjbalvvvzaytpvjbzm.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

**Where to find your service_role key:**
1. Go to your Supabase project dashboard
2. Click Settings (gear icon) → API
3. Copy the `service_role` key (NOT the anon key!)
4. Paste it into the .env file

**⚠️ NEVER put the service_role key in your website files or commit it to git!**

### 3. Test the scraper (20 products)

```bash
python catalog_pipeline.py scrape --base https://hadielectronics.com.pk --limit 20
```

This creates `staging.csv` with 20 products. Open it and check if names, prices, brands and specs look correct.

### 4. Run the full scrape

Once the test looks good:

```bash
python catalog_pipeline.py scrape --base https://hadielectronics.com.pk
```

This will take ~30 minutes for 2,000 products (being polite to their server with 1.5s delays).

### 5. Map categories

The script will analyze `staging.csv` and create `category_map.csv` showing which of THEIR categories map to YOUR categories.

You'll need to review this file and fix any marked as "REVIEW".

### 6. Create ready.csv

After reviewing the category mapping, the script will apply it and create `ready.csv`.

You should:
- Spot-check ~50 random rows
- Make sure category_slug and subcategory_slug are filled in correctly
- Optionally rewrite the short_desc column (the originals are from Hadi Electronics)

### 7. Run SQL migrations

Before loading, you need to add the `source_url` column to your products table (see the SQL file that will be generated).

### 8. Dry-run test

```bash
python catalog_pipeline.py load ready.csv --dry-run
```

This shows what WOULD be uploaded without actually doing it.

### 9. Real load (ONLY after you say "go")

```bash
python catalog_pipeline.py load ready.csv
```

This uploads images to Supabase Storage and inserts products into the database.

## Important Notes

- The script uses `upsert` with `source_url` as the unique key, so you can run it multiple times safely
- Images are downloaded, resized to 1000x1000 max, converted to WebP format, and uploaded to your `product-images` bucket
- Original descriptions and images belong to Hadi Electronics - you should rewrite descriptions and source your own images
- The script is polite to their server (1.5 second delays between requests)

## Troubleshooting

If you get errors about missing modules, install them:
```bash
pip install <module-name>
```

If you get Supabase errors, check:
1. Your SUPABASE_URL is correct
2. Your SUPABASE_SERVICE_KEY is the service_role key (not anon key)
3. The `product-images` bucket exists and is public
4. RLS policies allow your service_role key to insert products
