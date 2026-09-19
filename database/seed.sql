-- ═══════════════════════════════════════════════════════════════════════════
-- Nobel Kids — seed data (database/seed.sql)
--
-- Generated from prisma/seed.ts so the catalogue is IDENTICAL to the old app:
--   • 4 categories
--   • 17 products with images, colours, sizes, variants and price tiers
--   • shipping settings, number counters
--
-- Import AFTER database/schema.sql:
--   phpMyAdmin → select your database → Import → choose this file → Go
--   CLI:  mysql -u USER -p DATABASE < database/seed.sql
--
-- Re-runnable: every statement is an INSERT ... ON DUPLICATE KEY UPDATE or is
-- preceded by a targeted DELETE, so importing twice does not duplicate rows.
-- ═══════════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION';
SET SESSION time_zone = '+03:30';

-- ───────────────────────────── Categories ──────────────────────────────────
INSERT INTO categories (name, slug, description, is_active, sort_order, created_at, updated_at) VALUES
  ('دخترانه', 'girls', 'مدل‌های عمده دخترانه نوبل کیدز', 1, 1, NOW(), NOW()),
  ('پسرانه', 'boys', 'مدل‌های عمده پسرانه و یونیسکس نوبل کیدز', 1, 2, NOW(), NOW()),
  ('نوزادی', 'baby', 'پوشاک عمده نوزادی', 1, 3, NOW(), NOW()),
  ('اکسسوری', 'accessories', 'اکسسوری و مکمل‌های فروشگاهی', 1, 4, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name), description = VALUES(description), sort_order = VALUES(sort_order),
  is_active = 1, updated_at = NOW();

-- ────────────────────────────── Products ───────────────────────────────────
-- Prices are Toman. pack_size = 5 (فروش عمده در بسته‌های ۵ عددی).
INSERT INTO products
  (slug, name, short_name, description, short_description, sku, category_id, price, compare_price,
   stock, pack_size, min_packs, status, featured, is_new, is_best_seller, gender, material,
   collection, seo_title, seo_description, tags, created_at, updated_at)
VALUES
  ('brown-girls-relaxed-set', 'ست راحتی دخترانه قهوه‌ای نواردار', 'ست راحتی قهوه‌ای', 'ست دو تکه آزاد با دورس یقه‌گرد، شلوار بگ و نوار کرم روی آستین و کناره شلوار.', 'ست دو تکه آزاد با دورس یقه‌گرد، شلوار بگ و نوار کرم روی آستین و کناره شلوار.',
   'NBL-brown-girls-relaxed-set', (SELECT id FROM categories WHERE slug = 'girls'), 1198000, 1320000,
   18, 5, 1, 'ACTIVE', 1, 0, 1, 'دخترانه', 'دورس پنبه‌ای',
   'ست راحتی', 'ست راحتی دخترانه قهوه‌ای نواردار', 'ست دو تکه آزاد با دورس یقه‌گرد، شلوار بگ و نوار کرم روی آستین و کناره شلوار.', '["ست","راحتی","شلوار بگ"]', NOW(), NOW()),
  ('pink-fairy-oversized-sweatshirt', 'دورس دخترانه صورتی طرح پری', 'دورس صورتی طرح پری', 'دورس آزاد صورتی چرک با گلدوزی ظریف پری و نوشته I AM SO CUTE؛ مناسب استایل روزمره.', 'دورس آزاد صورتی چرک با گلدوزی ظریف پری و نوشته I AM SO CUTE؛ مناسب استایل روزمره.',
   'NBL-pink-fairy-oversized-sweatshirt', (SELECT id FROM categories WHERE slug = 'girls'), 648000, NULL,
   24, 5, 1, 'ACTIVE', 1, 1, 1, 'دخترانه', 'دورس پنبه لاکرا',
   'دورس و بلوز', 'دورس دخترانه صورتی طرح پری', 'دورس آزاد صورتی چرک با گلدوزی ظریف پری و نوشته I AM SO CUTE؛ مناسب استایل روزمره.', '["دورس","گلدوزی","آزاد"]', NOW(), NOW()),
  ('cream-fairy-sweatshirt', 'دورس دخترانه کرم طرح پری', 'دورس کرم طرح پری', 'بلوز دورس کرم با برش آزاد، دوخت نمایان و گلدوزی پری؛ سبک و راحت برای استفاده روزانه.', 'بلوز دورس کرم با برش آزاد، دوخت نمایان و گلدوزی پری؛ سبک و راحت برای استفاده روزانه.',
   'NBL-cream-fairy-sweatshirt', (SELECT id FROM categories WHERE slug = 'girls'), 648000, NULL,
   12, 5, 1, 'ACTIVE', 0, 1, 0, 'دخترانه', 'دورس پنبه لاکرا',
   'دورس و بلوز', 'دورس دخترانه کرم طرح پری', 'بلوز دورس کرم با برش آزاد، دوخت نمایان و گلدوزی پری؛ سبک و راحت برای استفاده روزانه.', '["کرم","گلدوزی","دورس"]', NOW(), NOW()),
  ('olive-fairy-sweatshirt', 'دورس دخترانه زیتونی گلدوزی پری', 'دورس زیتونی پری', 'دورس زیتونی با فرم اورسایز، سرآستین کشی و گلدوزی روشن روی سینه و پایین لباس.', 'دورس زیتونی با فرم اورسایز، سرآستین کشی و گلدوزی روشن روی سینه و پایین لباس.',
   'NBL-olive-fairy-sweatshirt', (SELECT id FROM categories WHERE slug = 'girls'), 668000, NULL,
   9, 5, 1, 'ACTIVE', 0, 0, 0, 'دخترانه', 'دورس سه نخ',
   'دورس و بلوز', 'دورس دخترانه زیتونی گلدوزی پری', 'دورس زیتونی با فرم اورسایز، سرآستین کشی و گلدوزی روشن روی سینه و پایین لباس.', '["زیتونی","گلدوزی","اورسایز"]', NOW(), NOW()),
  ('pistachio-girls-relaxed-set', 'ست راحتی دخترانه سبز پسته‌ای', 'ست سبز پسته‌ای', 'ست دورس و شلوار بگ سبز پسته‌ای با نوار سفید؛ برش آزاد و مناسب تحرک روزانه.', 'ست دورس و شلوار بگ سبز پسته‌ای با نوار سفید؛ برش آزاد و مناسب تحرک روزانه.',
   'NBL-pistachio-girls-relaxed-set', (SELECT id FROM categories WHERE slug = 'girls'), 1198000, NULL,
   14, 5, 1, 'ACTIVE', 1, 1, 0, 'دخترانه', 'دورس پنبه‌ای',
   'ست راحتی', 'ست راحتی دخترانه سبز پسته‌ای', 'ست دورس و شلوار بگ سبز پسته‌ای با نوار سفید؛ برش آزاد و مناسب تحرک روزانه.', '["ست","پسته‌ای","شلوار بگ"]', NOW(), NOW()),
  ('brown-striped-long-sleeve', 'تیشرت آستین‌بلند راه‌راه قهوه‌ای', 'بلوز راه‌راه قهوه‌ای', 'بلوز آستین‌بلند آزاد با راه‌های سفید و قهوه‌ای؛ ترکیب ساده و کاربردی با شلوار جین.', 'بلوز آستین‌بلند آزاد با راه‌های سفید و قهوه‌ای؛ ترکیب ساده و کاربردی با شلوار جین.',
   'NBL-brown-striped-long-sleeve', (SELECT id FROM categories WHERE slug = 'boys'), 528000, NULL,
   20, 5, 1, 'ACTIVE', 0, 0, 1, 'یونیسکس', 'پنبه دورو',
   'راه‌راه', 'تیشرت آستین‌بلند راه‌راه قهوه‌ای', 'بلوز آستین‌بلند آزاد با راه‌های سفید و قهوه‌ای؛ ترکیب ساده و کاربردی با شلوار جین.', '["راه‌راه","آستین بلند","یونیسکس"]', NOW(), NOW()),
  ('la-black-panel-sweatshirt', 'دورس یونیسکس مشکی پنل کرم', 'دورس پنل مشکی', 'دورس مشکی با پنل کرم و گلدوزی LOS ANGELES 2026؛ فرم آزاد مناسب دخترها و پسرها.', 'دورس مشکی با پنل کرم و گلدوزی LOS ANGELES 2026؛ فرم آزاد مناسب دخترها و پسرها.',
   'NBL-la-black-panel-sweatshirt', (SELECT id FROM categories WHERE slug = 'boys'), 898000, 970000,
   15, 5, 1, 'ACTIVE', 1, 1, 1, 'یونیسکس', 'دورس سه نخ خارخورده',
   'کالج', 'دورس یونیسکس مشکی پنل کرم', 'دورس مشکی با پنل کرم و گلدوزی LOS ANGELES 2026؛ فرم آزاد مناسب دخترها و پسرها.', '["لس‌آنجلس","یونیسکس","پنل"]', NOW(), NOW()),
  ('black-nbl-halfzip', 'دورس نیم‌زیپ مشکی NBL', 'نیم‌زیپ مشکی NBL', 'دورس نیم‌زیپ مشکی با یقه کرم، گلدوزی NBL و فرم راحت برای استایل کژوال.', 'دورس نیم‌زیپ مشکی با یقه کرم، گلدوزی NBL و فرم راحت برای استایل کژوال.',
   'NBL-black-nbl-halfzip', (SELECT id FROM categories WHERE slug = 'boys'), 928000, NULL,
   7, 5, 1, 'ACTIVE', 0, 1, 0, 'یونیسکس', 'دورس پنبه سه نخ',
   'نیم‌زیپ', 'دورس نیم‌زیپ مشکی NBL', 'دورس نیم‌زیپ مشکی با یقه کرم، گلدوزی NBL و فرم راحت برای استایل کژوال.', '["نیم‌زیپ","مشکی","NBL"]', NOW(), NOW()),
  ('brown-nbl-halfzip', 'دورس نیم‌زیپ قهوه‌ای NBL', 'نیم‌زیپ قهوه‌ای', 'دورس نیم‌زیپ قهوه‌ای با یقه کرم و گلدوزی NBL؛ پارچه لطیف و سرآستین کشی.', 'دورس نیم‌زیپ قهوه‌ای با یقه کرم و گلدوزی NBL؛ پارچه لطیف و سرآستین کشی.',
   'NBL-brown-nbl-halfzip', (SELECT id FROM categories WHERE slug = 'boys'), 928000, NULL,
   11, 5, 1, 'ACTIVE', 0, 0, 0, 'یونیسکس', 'دورس پنبه سه نخ',
   'نیم‌زیپ', 'دورس نیم‌زیپ قهوه‌ای NBL', 'دورس نیم‌زیپ قهوه‌ای با یقه کرم و گلدوزی NBL؛ پارچه لطیف و سرآستین کشی.', '["نیم‌زیپ","قهوه‌ای","NBL"]', NOW(), NOW()),
  ('la-cream-panel-sweatshirt', 'دورس یونیسکس کرم پنل قهوه‌ای', 'دورس پنل کرم', 'دورس کرم با پنل قهوه‌ای، جزئیات گلدوزی NBL و نوشته LOS ANGELES 2026.', 'دورس کرم با پنل قهوه‌ای، جزئیات گلدوزی NBL و نوشته LOS ANGELES 2026.',
   'NBL-la-cream-panel-sweatshirt', (SELECT id FROM categories WHERE slug = 'boys'), 898000, NULL,
   16, 5, 1, 'ACTIVE', 0, 1, 0, 'یونیسکس', 'دورس سه نخ خارخورده',
   'کالج', 'دورس یونیسکس کرم پنل قهوه‌ای', 'دورس کرم با پنل قهوه‌ای، جزئیات گلدوزی NBL و نوشته LOS ANGELES 2026.', '["لس‌آنجلس","کرم","پنل"]', NOW(), NOW()),
  ('navy-striped-long-sleeve', 'تیشرت آستین‌بلند راه‌راه سرمه‌ای', 'بلوز راه‌راه سرمه‌ای', 'بلوز آستین‌بلند سرمه‌ای با راه‌های سفید، یقه گرد و دوخت ضربدری روی یقه.', 'بلوز آستین‌بلند سرمه‌ای با راه‌های سفید، یقه گرد و دوخت ضربدری روی یقه.',
   'NBL-navy-striped-long-sleeve', (SELECT id FROM categories WHERE slug = 'boys'), 528000, NULL,
   8, 5, 1, 'ACTIVE', 0, 0, 0, 'یونیسکس', 'پنبه دورو',
   'راه‌راه', 'تیشرت آستین‌بلند راه‌راه سرمه‌ای', 'بلوز آستین‌بلند سرمه‌ای با راه‌های سفید، یقه گرد و دوخت ضربدری روی یقه.', '["راه‌راه","سرمه‌ای","آستین بلند"]', NOW(), NOW()),
  ('pink-striped-long-sleeve', 'تیشرت آستین‌بلند راه‌راه صورتی', 'بلوز راه‌راه صورتی', 'بلوز صورتی چرک راه‌راه با تن‌خور آزاد و سرآستین کشی؛ مناسب استایل دخترانه با جین بگ.', 'بلوز صورتی چرک راه‌راه با تن‌خور آزاد و سرآستین کشی؛ مناسب استایل دخترانه با جین بگ.',
   'NBL-pink-striped-long-sleeve', (SELECT id FROM categories WHERE slug = 'girls'), 528000, NULL,
   13, 5, 1, 'ACTIVE', 0, 1, 0, 'دخترانه', 'پنبه دورو',
   'راه‌راه', 'تیشرت آستین‌بلند راه‌راه صورتی', 'بلوز صورتی چرک راه‌راه با تن‌خور آزاد و سرآستین کشی؛ مناسب استایل دخترانه با جین بگ.', '["راه‌راه","صورتی","دخترانه"]', NOW(), NOW()),
  ('sage-hello-embroidered-sweatshirt', 'دورس دخترانه سبز هلو گلدوزی', 'دورس سبز Hello', 'دورس سبز روشن با گلدوزی‌های کوچک قلب و HELLO، برش باکسی و آستین‌های حجیم.', 'دورس سبز روشن با گلدوزی‌های کوچک قلب و HELLO، برش باکسی و آستین‌های حجیم.',
   'NBL-sage-hello-embroidered-sweatshirt', (SELECT id FROM categories WHERE slug = 'girls'), 688000, NULL,
   22, 5, 1, 'ACTIVE', 0, 0, 1, 'دخترانه', 'دورس لطیف پنبه',
   'Hello', 'دورس دخترانه سبز هلو گلدوزی', 'دورس سبز روشن با گلدوزی‌های کوچک قلب و HELLO، برش باکسی و آستین‌های حجیم.', '["هلو","قلب","گلدوزی"]', NOW(), NOW()),
  ('ivory-hello-embroidered-sweatshirt', 'دورس دخترانه شیری طرح Hello', 'دورس شیری Hello', 'دورس شیری با تکرار گلدوزی قلب و HELLO، فرم آزاد و سرآستین نرم و کشی.', 'دورس شیری با تکرار گلدوزی قلب و HELLO، فرم آزاد و سرآستین نرم و کشی.',
   'NBL-ivory-hello-embroidered-sweatshirt', (SELECT id FROM categories WHERE slug = 'girls'), 688000, NULL,
   19, 5, 1, 'ACTIVE', 0, 1, 0, 'دخترانه', 'دورس لطیف پنبه',
   'Hello', 'دورس دخترانه شیری طرح Hello', 'دورس شیری با تکرار گلدوزی قلب و HELLO، فرم آزاد و سرآستین نرم و کشی.', '["شیری","قلب","Hello"]', NOW(), NOW()),
  ('camel-hello-embroidered-sweatshirt', 'دورس دخترانه کاراملی طرح Hello', 'دورس کاراملی Hello', 'دورس کاراملی با گلدوزی مشکی قلب و HELLO؛ مدل باکسی برای ترکیب با شلوار جین آزاد.', 'دورس کاراملی با گلدوزی مشکی قلب و HELLO؛ مدل باکسی برای ترکیب با شلوار جین آزاد.',
   'NBL-camel-hello-embroidered-sweatshirt', (SELECT id FROM categories WHERE slug = 'girls'), 688000, NULL,
   17, 5, 1, 'ACTIVE', 1, 1, 0, 'دخترانه', 'دورس لطیف پنبه',
   'Hello', 'دورس دخترانه کاراملی طرح Hello', 'دورس کاراملی با گلدوزی مشکی قلب و HELLO؛ مدل باکسی برای ترکیب با شلوار جین آزاد.', '["کاراملی","قلب","Hello"]', NOW(), NOW()),
  ('mint-heart-embroidered-sweatshirt', 'دورس دخترانه نعنایی گلدوزی قلب', 'دورس نعنایی قلب', 'دورس نعنایی با گلدوزی همرنگ قلب و نوشته HELLO؛ دوخت نمایان و تن‌خور اورسایز.', 'دورس نعنایی با گلدوزی همرنگ قلب و نوشته HELLO؛ دوخت نمایان و تن‌خور اورسایز.',
   'NBL-mint-heart-embroidered-sweatshirt', (SELECT id FROM categories WHERE slug = 'girls'), 708000, NULL,
   6, 5, 1, 'ACTIVE', 0, 0, 0, 'دخترانه', 'دورس پنبه لاکرا',
   'Hello', 'دورس دخترانه نعنایی گلدوزی قلب', 'دورس نعنایی با گلدوزی همرنگ قلب و نوشته HELLO؛ دوخت نمایان و تن‌خور اورسایز.', '["نعنایی","گلدوزی","قلب"]', NOW(), NOW()),
  ('brown-hello-oversized-sweatshirt', 'دورس دخترانه قهوه‌ای طرح Hello', 'دورس قهوه‌ای Hello', 'دورس قهوه‌ای شکلاتی با گلدوزی‌های ریز قلب، آستین افتاده و فرم آزاد و راحت.', 'دورس قهوه‌ای شکلاتی با گلدوزی‌های ریز قلب، آستین افتاده و فرم آزاد و راحت.',
   'NBL-brown-hello-oversized-sweatshirt', (SELECT id FROM categories WHERE slug = 'girls'), 688000, NULL,
   10, 5, 1, 'ACTIVE', 0, 0, 0, 'دخترانه', 'دورس لطیف پنبه',
   'Hello', 'دورس دخترانه قهوه‌ای طرح Hello', 'دورس قهوه‌ای شکلاتی با گلدوزی‌های ریز قلب، آستین افتاده و فرم آزاد و راحت.', '["قهوه‌ای","قلب","Hello"]', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name), short_name = VALUES(short_name), description = VALUES(description),
  short_description = VALUES(short_description), price = VALUES(price), compare_price = VALUES(compare_price),
  stock = VALUES(stock), status = 'ACTIVE', featured = VALUES(featured), is_new = VALUES(is_new),
  is_best_seller = VALUES(is_best_seller), gender = VALUES(gender), material = VALUES(material),
  collection = VALUES(collection), seo_title = VALUES(seo_title), seo_description = VALUES(seo_description),
  tags = VALUES(tags), category_id = VALUES(category_id), deleted_at = NULL, updated_at = NOW();

-- ───────────── Rebuild dependent rows (deterministic re-seeding) ───────────
-- Matches the delete-then-recreate logic in prisma/seed.ts.
SET @seeded := (SELECT GROUP_CONCAT(id) FROM products WHERE slug IN ('brown-girls-relaxed-set', 'pink-fairy-oversized-sweatshirt', 'cream-fairy-sweatshirt', 'olive-fairy-sweatshirt', 'pistachio-girls-relaxed-set', 'brown-striped-long-sleeve', 'la-black-panel-sweatshirt', 'black-nbl-halfzip', 'brown-nbl-halfzip', 'la-cream-panel-sweatshirt', 'navy-striped-long-sleeve', 'pink-striped-long-sleeve', 'sage-hello-embroidered-sweatshirt', 'ivory-hello-embroidered-sweatshirt', 'camel-hello-embroidered-sweatshirt', 'mint-heart-embroidered-sweatshirt', 'brown-hello-oversized-sweatshirt'));

DELETE FROM product_images WHERE FIND_IN_SET(product_id, @seeded);
DELETE FROM product_colors WHERE FIND_IN_SET(product_id, @seeded);
DELETE FROM product_sizes WHERE FIND_IN_SET(product_id, @seeded);
DELETE FROM product_variants WHERE FIND_IN_SET(product_id, @seeded);
DELETE FROM price_tiers WHERE FIND_IN_SET(product_id, @seeded);

-- Product images (paths point at public/products/*.webp shipped in the export)
INSERT INTO product_images (product_id, url, alt, sort_order, is_primary) VALUES
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), '/products/photo_20.webp', 'ست راحتی دخترانه قهوه‌ای نواردار', 0, 1),
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), '/products/photo_7.webp', 'ست راحتی دخترانه قهوه‌ای نواردار', 1, 0),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), '/products/photo_13.webp', 'دورس دخترانه صورتی طرح پری', 0, 1),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), '/products/photo_16.webp', 'دورس دخترانه صورتی طرح پری', 1, 0),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), '/products/photo_9.webp', 'دورس دخترانه صورتی طرح پری', 2, 0),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), '/products/photo_16.webp', 'دورس دخترانه کرم طرح پری', 0, 1),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), '/products/photo_13.webp', 'دورس دخترانه کرم طرح پری', 1, 0),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), '/products/photo_9.webp', 'دورس دخترانه کرم طرح پری', 2, 0),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), '/products/photo_9.webp', 'دورس دخترانه زیتونی گلدوزی پری', 0, 1),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), '/products/photo_13.webp', 'دورس دخترانه زیتونی گلدوزی پری', 1, 0),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), '/products/photo_7.webp', 'ست راحتی دخترانه سبز پسته‌ای', 0, 1),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), '/products/photo_20.webp', 'ست راحتی دخترانه سبز پسته‌ای', 1, 0),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), '/products/photo_4.webp', 'تیشرت آستین‌بلند راه‌راه قهوه‌ای', 0, 1),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), '/products/photo_23.webp', 'تیشرت آستین‌بلند راه‌راه قهوه‌ای', 1, 0),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), '/products/photo_22.webp', 'تیشرت آستین‌بلند راه‌راه قهوه‌ای', 2, 0),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), '/products/photo_3.webp', 'دورس یونیسکس مشکی پنل کرم', 0, 1),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), '/products/photo_24.webp', 'دورس یونیسکس مشکی پنل کرم', 1, 0),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), '/products/photo_2.webp', 'دورس نیم‌زیپ مشکی NBL', 0, 1),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), '/products/photo_1.webp', 'دورس نیم‌زیپ مشکی NBL', 1, 0),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), '/products/photo_1.webp', 'دورس نیم‌زیپ قهوه‌ای NBL', 0, 1),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), '/products/photo_2.webp', 'دورس نیم‌زیپ قهوه‌ای NBL', 1, 0),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), '/products/photo_24.webp', 'دورس یونیسکس کرم پنل قهوه‌ای', 0, 1),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), '/products/photo_3.webp', 'دورس یونیسکس کرم پنل قهوه‌ای', 1, 0),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), '/products/photo_23.webp', 'تیشرت آستین‌بلند راه‌راه سرمه‌ای', 0, 1),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), '/products/photo_4.webp', 'تیشرت آستین‌بلند راه‌راه سرمه‌ای', 1, 0),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), '/products/photo_22.webp', 'تیشرت آستین‌بلند راه‌راه صورتی', 0, 1),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), '/products/photo_23.webp', 'تیشرت آستین‌بلند راه‌راه صورتی', 1, 0),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), '/products/photo_21.webp', 'دورس دخترانه سبز هلو گلدوزی', 0, 1),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), '/products/photo_11.webp', 'دورس دخترانه سبز هلو گلدوزی', 1, 0),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), '/products/photo_19.webp', 'دورس دخترانه سبز هلو گلدوزی', 2, 0),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), '/products/photo_19.webp', 'دورس دخترانه شیری طرح Hello', 0, 1),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), '/products/photo_17.webp', 'دورس دخترانه شیری طرح Hello', 1, 0),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), '/products/photo_10.webp', 'دورس دخترانه شیری طرح Hello', 2, 0),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), '/products/photo_17.webp', 'دورس دخترانه کاراملی طرح Hello', 0, 1),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), '/products/photo_19.webp', 'دورس دخترانه کاراملی طرح Hello', 1, 0),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), '/products/photo_11.webp', 'دورس دخترانه نعنایی گلدوزی قلب', 0, 1),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), '/products/photo_21.webp', 'دورس دخترانه نعنایی گلدوزی قلب', 1, 0),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), '/products/photo_10.webp', 'دورس دخترانه قهوه‌ای طرح Hello', 0, 1),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), '/products/photo_19.webp', 'دورس دخترانه قهوه‌ای طرح Hello', 1, 0);

-- Product colours
INSERT INTO product_colors (product_id, name, hex, sort_order) VALUES
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), 'قهوه‌ای', '#6b4538', 0),
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), 'سبز پسته‌ای', '#a9b887', 1),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'صورتی چرک', '#d7a9a3', 0),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'کرم', '#e7d1a7', 1),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'زیتونی', '#7f8966', 2),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), 'کرم', '#ead8b7', 0),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), 'صورتی چرک', '#d7a9a3', 1),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), 'زیتونی', '#7a8767', 0),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), 'کرم', '#ead8b7', 1),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), 'سبز پسته‌ای', '#a8b889', 0),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), 'قهوه‌ای', '#6b4538', 1),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'قهوه‌ای', '#60443b', 0),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'سرمه‌ای', '#273556', 1),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'صورتی', '#ca9398', 2),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), 'مشکی', '#191919', 0),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), 'کرم', '#eee9df', 1),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'مشکی', '#161616', 0),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'قهوه‌ای', '#593e35', 1),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'کرم', '#e9e2d6', 2),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), 'قهوه‌ای', '#593e35', 0),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), 'کرم', '#e9e2d6', 1),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), 'کرم و قهوه‌ای', '#ece7de', 0),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), 'مشکی و کرم', '#202020', 1),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), 'سرمه‌ای', '#273556', 0),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), 'قهوه‌ای', '#60443b', 1),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), 'صورتی چرک', '#c98f97', 0),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), 'سبز', '#678a59', 1),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'سبز روشن', '#aebe91', 0),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'شیری', '#eee8db', 1),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'قهوه‌ای', '#6c4437', 2),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'شیری', '#f0e8d8', 0),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'کاراملی', '#b58a59', 1),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'قهوه‌ای', '#6c4437', 2),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), 'کاراملی', '#b48857', 0),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), 'شیری', '#f0e8d8', 1),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), 'نعنایی', '#afbf98', 0),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), 'شیری', '#f0e8d8', 1),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), 'قهوه‌ای شکلاتی', '#704638', 0),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), 'شیری', '#f0e8d8', 1);

-- Product sizes (Persian age ranges — exactly as displayed in the UI)
INSERT INTO product_sizes (product_id, label, sort_order) VALUES
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), '۴–۵ سال', 0),
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), '۶–۷ سال', 1),
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), '۸–۹ سال', 2),
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), '۱۰–۱۱ سال', 3),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), '۳–۴ سال', 0),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), '۵–۶ سال', 1),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), '۷–۸ سال', 2),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), '۹–۱۰ سال', 3),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), '۳–۴ سال', 0),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), '۵–۶ سال', 1),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), '۷–۸ سال', 2),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), '۹–۱۰ سال', 3),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), '۴–۵ سال', 0),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), '۶–۷ سال', 1),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), '۸–۹ سال', 2),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), '۱۰–۱۱ سال', 3),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), '۴–۵ سال', 0),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), '۶–۷ سال', 1),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), '۸–۹ سال', 2),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), '۱۰–۱۱ سال', 3),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), '۸–۹ سال', 0),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), '۱۰–۱۱ سال', 1),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), '۱۲–۱۳ سال', 2),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), '۱۴–۱۵ سال', 3),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), '۹–۱۰ سال', 0),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), '۱۱–۱۲ سال', 1),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), '۱۳–۱۴ سال', 2),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), '۱۵–۱۶ سال', 3),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), '۹–۱۰ سال', 0),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), '۱۱–۱۲ سال', 1),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), '۱۳–۱۴ سال', 2),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), '۱۵–۱۶ سال', 3),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), '۹–۱۰ سال', 0),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), '۱۱–۱۲ سال', 1),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), '۱۳–۱۴ سال', 2),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), '۱۵–۱۶ سال', 3),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), '۹–۱۰ سال', 0),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), '۱۱–۱۲ سال', 1),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), '۱۳–۱۴ سال', 2),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), '۱۵–۱۶ سال', 3),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), '۸–۹ سال', 0),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), '۱۰–۱۱ سال', 1),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), '۱۲–۱۳ سال', 2),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), '۱۴–۱۵ سال', 3),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), '۸–۹ سال', 0),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), '۱۰–۱۱ سال', 1),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), '۱۲–۱۳ سال', 2),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), '۱۴–۱۵ سال', 3),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), '۴–۵ سال', 0),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), '۶–۷ سال', 1),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), '۸–۹ سال', 2),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), '۱۰–۱۱ سال', 3),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), '۴–۵ سال', 0),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), '۶–۷ سال', 1),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), '۸–۹ سال', 2),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), '۱۰–۱۱ سال', 3),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), '۴–۵ سال', 0),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), '۶–۷ سال', 1),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), '۸–۹ سال', 2),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), '۱۰–۱۱ سال', 3),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), '۴–۵ سال', 0),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), '۶–۷ سال', 1),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), '۸–۹ سال', 2),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), '۱۰–۱۱ سال', 3),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), '۴–۵ سال', 0),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), '۶–۷ سال', 1),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), '۸–۹ سال', 2),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), '۱۰–۱۱ سال', 3);

-- Colour × size variant matrix
INSERT INTO product_variants (product_id, color_name, size_label, sku) VALUES
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), 'قهوه‌ای', '۴–۵ سال', 'brown-girls-relaxed-set::قهوه‌ای::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), 'قهوه‌ای', '۶–۷ سال', 'brown-girls-relaxed-set::قهوه‌ای::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), 'قهوه‌ای', '۸–۹ سال', 'brown-girls-relaxed-set::قهوه‌ای::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), 'قهوه‌ای', '۱۰–۱۱ سال', 'brown-girls-relaxed-set::قهوه‌ای::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), 'سبز پسته‌ای', '۴–۵ سال', 'brown-girls-relaxed-set::سبز پسته‌ای::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), 'سبز پسته‌ای', '۶–۷ سال', 'brown-girls-relaxed-set::سبز پسته‌ای::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), 'سبز پسته‌ای', '۸–۹ سال', 'brown-girls-relaxed-set::سبز پسته‌ای::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), 'سبز پسته‌ای', '۱۰–۱۱ سال', 'brown-girls-relaxed-set::سبز پسته‌ای::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'صورتی چرک', '۳–۴ سال', 'pink-fairy-oversized-sweatshirt::صورتی چرک::۳–۴ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'صورتی چرک', '۵–۶ سال', 'pink-fairy-oversized-sweatshirt::صورتی چرک::۵–۶ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'صورتی چرک', '۷–۸ سال', 'pink-fairy-oversized-sweatshirt::صورتی چرک::۷–۸ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'صورتی چرک', '۹–۱۰ سال', 'pink-fairy-oversized-sweatshirt::صورتی چرک::۹–۱۰ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'کرم', '۳–۴ سال', 'pink-fairy-oversized-sweatshirt::کرم::۳–۴ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'کرم', '۵–۶ سال', 'pink-fairy-oversized-sweatshirt::کرم::۵–۶ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'کرم', '۷–۸ سال', 'pink-fairy-oversized-sweatshirt::کرم::۷–۸ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'کرم', '۹–۱۰ سال', 'pink-fairy-oversized-sweatshirt::کرم::۹–۱۰ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'زیتونی', '۳–۴ سال', 'pink-fairy-oversized-sweatshirt::زیتونی::۳–۴ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'زیتونی', '۵–۶ سال', 'pink-fairy-oversized-sweatshirt::زیتونی::۵–۶ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'زیتونی', '۷–۸ سال', 'pink-fairy-oversized-sweatshirt::زیتونی::۷–۸ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 'زیتونی', '۹–۱۰ سال', 'pink-fairy-oversized-sweatshirt::زیتونی::۹–۱۰ سال'),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), 'کرم', '۳–۴ سال', 'cream-fairy-sweatshirt::کرم::۳–۴ سال'),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), 'کرم', '۵–۶ سال', 'cream-fairy-sweatshirt::کرم::۵–۶ سال'),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), 'کرم', '۷–۸ سال', 'cream-fairy-sweatshirt::کرم::۷–۸ سال'),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), 'کرم', '۹–۱۰ سال', 'cream-fairy-sweatshirt::کرم::۹–۱۰ سال'),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), 'صورتی چرک', '۳–۴ سال', 'cream-fairy-sweatshirt::صورتی چرک::۳–۴ سال'),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), 'صورتی چرک', '۵–۶ سال', 'cream-fairy-sweatshirt::صورتی چرک::۵–۶ سال'),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), 'صورتی چرک', '۷–۸ سال', 'cream-fairy-sweatshirt::صورتی چرک::۷–۸ سال'),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), 'صورتی چرک', '۹–۱۰ سال', 'cream-fairy-sweatshirt::صورتی چرک::۹–۱۰ سال'),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), 'زیتونی', '۴–۵ سال', 'olive-fairy-sweatshirt::زیتونی::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), 'زیتونی', '۶–۷ سال', 'olive-fairy-sweatshirt::زیتونی::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), 'زیتونی', '۸–۹ سال', 'olive-fairy-sweatshirt::زیتونی::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), 'زیتونی', '۱۰–۱۱ سال', 'olive-fairy-sweatshirt::زیتونی::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), 'کرم', '۴–۵ سال', 'olive-fairy-sweatshirt::کرم::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), 'کرم', '۶–۷ سال', 'olive-fairy-sweatshirt::کرم::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), 'کرم', '۸–۹ سال', 'olive-fairy-sweatshirt::کرم::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), 'کرم', '۱۰–۱۱ سال', 'olive-fairy-sweatshirt::کرم::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), 'سبز پسته‌ای', '۴–۵ سال', 'pistachio-girls-relaxed-set::سبز پسته‌ای::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), 'سبز پسته‌ای', '۶–۷ سال', 'pistachio-girls-relaxed-set::سبز پسته‌ای::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), 'سبز پسته‌ای', '۸–۹ سال', 'pistachio-girls-relaxed-set::سبز پسته‌ای::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), 'سبز پسته‌ای', '۱۰–۱۱ سال', 'pistachio-girls-relaxed-set::سبز پسته‌ای::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), 'قهوه‌ای', '۴–۵ سال', 'pistachio-girls-relaxed-set::قهوه‌ای::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), 'قهوه‌ای', '۶–۷ سال', 'pistachio-girls-relaxed-set::قهوه‌ای::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), 'قهوه‌ای', '۸–۹ سال', 'pistachio-girls-relaxed-set::قهوه‌ای::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), 'قهوه‌ای', '۱۰–۱۱ سال', 'pistachio-girls-relaxed-set::قهوه‌ای::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'قهوه‌ای', '۸–۹ سال', 'brown-striped-long-sleeve::قهوه‌ای::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'قهوه‌ای', '۱۰–۱۱ سال', 'brown-striped-long-sleeve::قهوه‌ای::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'قهوه‌ای', '۱۲–۱۳ سال', 'brown-striped-long-sleeve::قهوه‌ای::۱۲–۱۳ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'قهوه‌ای', '۱۴–۱۵ سال', 'brown-striped-long-sleeve::قهوه‌ای::۱۴–۱۵ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'سرمه‌ای', '۸–۹ سال', 'brown-striped-long-sleeve::سرمه‌ای::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'سرمه‌ای', '۱۰–۱۱ سال', 'brown-striped-long-sleeve::سرمه‌ای::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'سرمه‌ای', '۱۲–۱۳ سال', 'brown-striped-long-sleeve::سرمه‌ای::۱۲–۱۳ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'سرمه‌ای', '۱۴–۱۵ سال', 'brown-striped-long-sleeve::سرمه‌ای::۱۴–۱۵ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'صورتی', '۸–۹ سال', 'brown-striped-long-sleeve::صورتی::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'صورتی', '۱۰–۱۱ سال', 'brown-striped-long-sleeve::صورتی::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'صورتی', '۱۲–۱۳ سال', 'brown-striped-long-sleeve::صورتی::۱۲–۱۳ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 'صورتی', '۱۴–۱۵ سال', 'brown-striped-long-sleeve::صورتی::۱۴–۱۵ سال'),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), 'مشکی', '۹–۱۰ سال', 'la-black-panel-sweatshirt::مشکی::۹–۱۰ سال'),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), 'مشکی', '۱۱–۱۲ سال', 'la-black-panel-sweatshirt::مشکی::۱۱–۱۲ سال'),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), 'مشکی', '۱۳–۱۴ سال', 'la-black-panel-sweatshirt::مشکی::۱۳–۱۴ سال'),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), 'مشکی', '۱۵–۱۶ سال', 'la-black-panel-sweatshirt::مشکی::۱۵–۱۶ سال'),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), 'کرم', '۹–۱۰ سال', 'la-black-panel-sweatshirt::کرم::۹–۱۰ سال'),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), 'کرم', '۱۱–۱۲ سال', 'la-black-panel-sweatshirt::کرم::۱۱–۱۲ سال'),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), 'کرم', '۱۳–۱۴ سال', 'la-black-panel-sweatshirt::کرم::۱۳–۱۴ سال'),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), 'کرم', '۱۵–۱۶ سال', 'la-black-panel-sweatshirt::کرم::۱۵–۱۶ سال'),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'مشکی', '۹–۱۰ سال', 'black-nbl-halfzip::مشکی::۹–۱۰ سال'),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'مشکی', '۱۱–۱۲ سال', 'black-nbl-halfzip::مشکی::۱۱–۱۲ سال'),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'مشکی', '۱۳–۱۴ سال', 'black-nbl-halfzip::مشکی::۱۳–۱۴ سال'),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'مشکی', '۱۵–۱۶ سال', 'black-nbl-halfzip::مشکی::۱۵–۱۶ سال'),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'قهوه‌ای', '۹–۱۰ سال', 'black-nbl-halfzip::قهوه‌ای::۹–۱۰ سال'),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'قهوه‌ای', '۱۱–۱۲ سال', 'black-nbl-halfzip::قهوه‌ای::۱۱–۱۲ سال'),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'قهوه‌ای', '۱۳–۱۴ سال', 'black-nbl-halfzip::قهوه‌ای::۱۳–۱۴ سال'),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'قهوه‌ای', '۱۵–۱۶ سال', 'black-nbl-halfzip::قهوه‌ای::۱۵–۱۶ سال'),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'کرم', '۹–۱۰ سال', 'black-nbl-halfzip::کرم::۹–۱۰ سال'),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'کرم', '۱۱–۱۲ سال', 'black-nbl-halfzip::کرم::۱۱–۱۲ سال'),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'کرم', '۱۳–۱۴ سال', 'black-nbl-halfzip::کرم::۱۳–۱۴ سال'),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 'کرم', '۱۵–۱۶ سال', 'black-nbl-halfzip::کرم::۱۵–۱۶ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), 'قهوه‌ای', '۹–۱۰ سال', 'brown-nbl-halfzip::قهوه‌ای::۹–۱۰ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), 'قهوه‌ای', '۱۱–۱۲ سال', 'brown-nbl-halfzip::قهوه‌ای::۱۱–۱۲ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), 'قهوه‌ای', '۱۳–۱۴ سال', 'brown-nbl-halfzip::قهوه‌ای::۱۳–۱۴ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), 'قهوه‌ای', '۱۵–۱۶ سال', 'brown-nbl-halfzip::قهوه‌ای::۱۵–۱۶ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), 'کرم', '۹–۱۰ سال', 'brown-nbl-halfzip::کرم::۹–۱۰ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), 'کرم', '۱۱–۱۲ سال', 'brown-nbl-halfzip::کرم::۱۱–۱۲ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), 'کرم', '۱۳–۱۴ سال', 'brown-nbl-halfzip::کرم::۱۳–۱۴ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), 'کرم', '۱۵–۱۶ سال', 'brown-nbl-halfzip::کرم::۱۵–۱۶ سال'),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), 'کرم و قهوه‌ای', '۹–۱۰ سال', 'la-cream-panel-sweatshirt::کرم و قهوه‌ای::۹–۱۰ سال'),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), 'کرم و قهوه‌ای', '۱۱–۱۲ سال', 'la-cream-panel-sweatshirt::کرم و قهوه‌ای::۱۱–۱۲ سال'),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), 'کرم و قهوه‌ای', '۱۳–۱۴ سال', 'la-cream-panel-sweatshirt::کرم و قهوه‌ای::۱۳–۱۴ سال'),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), 'کرم و قهوه‌ای', '۱۵–۱۶ سال', 'la-cream-panel-sweatshirt::کرم و قهوه‌ای::۱۵–۱۶ سال'),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), 'مشکی و کرم', '۹–۱۰ سال', 'la-cream-panel-sweatshirt::مشکی و کرم::۹–۱۰ سال'),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), 'مشکی و کرم', '۱۱–۱۲ سال', 'la-cream-panel-sweatshirt::مشکی و کرم::۱۱–۱۲ سال'),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), 'مشکی و کرم', '۱۳–۱۴ سال', 'la-cream-panel-sweatshirt::مشکی و کرم::۱۳–۱۴ سال'),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), 'مشکی و کرم', '۱۵–۱۶ سال', 'la-cream-panel-sweatshirt::مشکی و کرم::۱۵–۱۶ سال'),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), 'سرمه‌ای', '۸–۹ سال', 'navy-striped-long-sleeve::سرمه‌ای::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), 'سرمه‌ای', '۱۰–۱۱ سال', 'navy-striped-long-sleeve::سرمه‌ای::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), 'سرمه‌ای', '۱۲–۱۳ سال', 'navy-striped-long-sleeve::سرمه‌ای::۱۲–۱۳ سال'),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), 'سرمه‌ای', '۱۴–۱۵ سال', 'navy-striped-long-sleeve::سرمه‌ای::۱۴–۱۵ سال'),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), 'قهوه‌ای', '۸–۹ سال', 'navy-striped-long-sleeve::قهوه‌ای::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), 'قهوه‌ای', '۱۰–۱۱ سال', 'navy-striped-long-sleeve::قهوه‌ای::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), 'قهوه‌ای', '۱۲–۱۳ سال', 'navy-striped-long-sleeve::قهوه‌ای::۱۲–۱۳ سال'),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), 'قهوه‌ای', '۱۴–۱۵ سال', 'navy-striped-long-sleeve::قهوه‌ای::۱۴–۱۵ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), 'صورتی چرک', '۸–۹ سال', 'pink-striped-long-sleeve::صورتی چرک::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), 'صورتی چرک', '۱۰–۱۱ سال', 'pink-striped-long-sleeve::صورتی چرک::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), 'صورتی چرک', '۱۲–۱۳ سال', 'pink-striped-long-sleeve::صورتی چرک::۱۲–۱۳ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), 'صورتی چرک', '۱۴–۱۵ سال', 'pink-striped-long-sleeve::صورتی چرک::۱۴–۱۵ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), 'سبز', '۸–۹ سال', 'pink-striped-long-sleeve::سبز::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), 'سبز', '۱۰–۱۱ سال', 'pink-striped-long-sleeve::سبز::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), 'سبز', '۱۲–۱۳ سال', 'pink-striped-long-sleeve::سبز::۱۲–۱۳ سال'),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), 'سبز', '۱۴–۱۵ سال', 'pink-striped-long-sleeve::سبز::۱۴–۱۵ سال'),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'سبز روشن', '۴–۵ سال', 'sage-hello-embroidered-sweatshirt::سبز روشن::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'سبز روشن', '۶–۷ سال', 'sage-hello-embroidered-sweatshirt::سبز روشن::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'سبز روشن', '۸–۹ سال', 'sage-hello-embroidered-sweatshirt::سبز روشن::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'سبز روشن', '۱۰–۱۱ سال', 'sage-hello-embroidered-sweatshirt::سبز روشن::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'شیری', '۴–۵ سال', 'sage-hello-embroidered-sweatshirt::شیری::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'شیری', '۶–۷ سال', 'sage-hello-embroidered-sweatshirt::شیری::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'شیری', '۸–۹ سال', 'sage-hello-embroidered-sweatshirt::شیری::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'شیری', '۱۰–۱۱ سال', 'sage-hello-embroidered-sweatshirt::شیری::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'قهوه‌ای', '۴–۵ سال', 'sage-hello-embroidered-sweatshirt::قهوه‌ای::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'قهوه‌ای', '۶–۷ سال', 'sage-hello-embroidered-sweatshirt::قهوه‌ای::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'قهوه‌ای', '۸–۹ سال', 'sage-hello-embroidered-sweatshirt::قهوه‌ای::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 'قهوه‌ای', '۱۰–۱۱ سال', 'sage-hello-embroidered-sweatshirt::قهوه‌ای::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'شیری', '۴–۵ سال', 'ivory-hello-embroidered-sweatshirt::شیری::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'شیری', '۶–۷ سال', 'ivory-hello-embroidered-sweatshirt::شیری::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'شیری', '۸–۹ سال', 'ivory-hello-embroidered-sweatshirt::شیری::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'شیری', '۱۰–۱۱ سال', 'ivory-hello-embroidered-sweatshirt::شیری::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'کاراملی', '۴–۵ سال', 'ivory-hello-embroidered-sweatshirt::کاراملی::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'کاراملی', '۶–۷ سال', 'ivory-hello-embroidered-sweatshirt::کاراملی::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'کاراملی', '۸–۹ سال', 'ivory-hello-embroidered-sweatshirt::کاراملی::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'کاراملی', '۱۰–۱۱ سال', 'ivory-hello-embroidered-sweatshirt::کاراملی::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'قهوه‌ای', '۴–۵ سال', 'ivory-hello-embroidered-sweatshirt::قهوه‌ای::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'قهوه‌ای', '۶–۷ سال', 'ivory-hello-embroidered-sweatshirt::قهوه‌ای::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'قهوه‌ای', '۸–۹ سال', 'ivory-hello-embroidered-sweatshirt::قهوه‌ای::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 'قهوه‌ای', '۱۰–۱۱ سال', 'ivory-hello-embroidered-sweatshirt::قهوه‌ای::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), 'کاراملی', '۴–۵ سال', 'camel-hello-embroidered-sweatshirt::کاراملی::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), 'کاراملی', '۶–۷ سال', 'camel-hello-embroidered-sweatshirt::کاراملی::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), 'کاراملی', '۸–۹ سال', 'camel-hello-embroidered-sweatshirt::کاراملی::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), 'کاراملی', '۱۰–۱۱ سال', 'camel-hello-embroidered-sweatshirt::کاراملی::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), 'شیری', '۴–۵ سال', 'camel-hello-embroidered-sweatshirt::شیری::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), 'شیری', '۶–۷ سال', 'camel-hello-embroidered-sweatshirt::شیری::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), 'شیری', '۸–۹ سال', 'camel-hello-embroidered-sweatshirt::شیری::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), 'شیری', '۱۰–۱۱ سال', 'camel-hello-embroidered-sweatshirt::شیری::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), 'نعنایی', '۴–۵ سال', 'mint-heart-embroidered-sweatshirt::نعنایی::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), 'نعنایی', '۶–۷ سال', 'mint-heart-embroidered-sweatshirt::نعنایی::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), 'نعنایی', '۸–۹ سال', 'mint-heart-embroidered-sweatshirt::نعنایی::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), 'نعنایی', '۱۰–۱۱ سال', 'mint-heart-embroidered-sweatshirt::نعنایی::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), 'شیری', '۴–۵ سال', 'mint-heart-embroidered-sweatshirt::شیری::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), 'شیری', '۶–۷ سال', 'mint-heart-embroidered-sweatshirt::شیری::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), 'شیری', '۸–۹ سال', 'mint-heart-embroidered-sweatshirt::شیری::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), 'شیری', '۱۰–۱۱ سال', 'mint-heart-embroidered-sweatshirt::شیری::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), 'قهوه‌ای شکلاتی', '۴–۵ سال', 'brown-hello-oversized-sweatshirt::قهوه‌ای شکلاتی::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), 'قهوه‌ای شکلاتی', '۶–۷ سال', 'brown-hello-oversized-sweatshirt::قهوه‌ای شکلاتی::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), 'قهوه‌ای شکلاتی', '۸–۹ سال', 'brown-hello-oversized-sweatshirt::قهوه‌ای شکلاتی::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), 'قهوه‌ای شکلاتی', '۱۰–۱۱ سال', 'brown-hello-oversized-sweatshirt::قهوه‌ای شکلاتی::۱۰–۱۱ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), 'شیری', '۴–۵ سال', 'brown-hello-oversized-sweatshirt::شیری::۴–۵ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), 'شیری', '۶–۷ سال', 'brown-hello-oversized-sweatshirt::شیری::۶–۷ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), 'شیری', '۸–۹ سال', 'brown-hello-oversized-sweatshirt::شیری::۸–۹ سال'),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), 'شیری', '۱۰–۱۱ سال', 'brown-hello-oversized-sweatshirt::شیری::۱۰–۱۱ سال');

-- Volume discount tiers: 3+ packs → 4٪، 6+ packs → 8٪
INSERT INTO price_tiers (product_id, min_packs, discount_bps) VALUES
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'brown-girls-relaxed-set'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'pink-fairy-oversized-sweatshirt'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'cream-fairy-sweatshirt'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'olive-fairy-sweatshirt'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'pistachio-girls-relaxed-set'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'brown-striped-long-sleeve'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'la-black-panel-sweatshirt'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'black-nbl-halfzip'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'brown-nbl-halfzip'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'la-cream-panel-sweatshirt'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'navy-striped-long-sleeve'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'pink-striped-long-sleeve'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'sage-hello-embroidered-sweatshirt'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'ivory-hello-embroidered-sweatshirt'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'camel-hello-embroidered-sweatshirt'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'mint-heart-embroidered-sweatshirt'), 6, 800),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), 3, 400),
  ((SELECT id FROM products WHERE slug = 'brown-hello-oversized-sweatshirt'), 6, 800);

-- ───────────────────────────── Settings ────────────────────────────────────
-- Shipping methods shown on the checkout page.
INSERT INTO settings (`key`, `value`, updated_at) VALUES
  ('shipping', '{"methods":[{"id":"freight","label":"باربری یا تیپاکس","description":"مناسب سفارش‌های عمده شهرستان","cost":0,"note":"پس‌کرایه"},{"id":"pickup","label":"تحویل حضوری","description":"بازار بزرگ تهران","cost":0,"note":"رایگان"}]}', NOW())
ON DUPLICATE KEY UPDATE updated_at = updated_at;  -- never overwrite live settings

-- ──────────────────────── Document number counters ─────────────────────────
-- Order numbers NBL-<year>-000001 and quotation numbers NBLQ-<year>-000001.
INSERT INTO number_counters (scope, `year`, `value`) VALUES
  ('ORDER',     YEAR(CURDATE()), 0),
  ('QUOTATION', YEAR(CURDATE()), 0)
ON DUPLICATE KEY UPDATE `value` = `value`;

-- ═══════════════════════════════════════════════════════════════════════════
-- ADMIN ACCOUNT
-- ═══════════════════════════════════════════════════════════════════════════
--
-- No password is stored here on purpose: a password hash committed to a repo
-- is a password everyone knows. This creates the account with LOGIN DISABLED
-- (password_hash IS NULL), and you set the real password once, in private,
-- through the rescue panel:
--
--   1. Change the mobile number below to YOUR number, then import this file.
--   2. In config/config.php set a long random value for
--        'security' => ['rescue_token' => '...']
--      Generate one with:  php -r "echo bin2hex(random_bytes(32));"
--   3. Open  https://your-domain.com/rescue/  and enter that token.
--   4. Use "تعیین رمز عبور مدیر" with the mobile number below; pick a strong
--      password (10+ characters).
--   5. Log in at  https://your-domain.com/admin/login/ .
--   6. Empty rescue_token again AND delete the rescue/ folder from the host.
--
-- Until step 3 the account cannot log in at all: login.php rejects every
-- account whose password_hash is NULL.
--
INSERT INTO users (mobile, name, role, status, password_hash, must_change_password, created_at, updated_at)
VALUES ('09120000000', 'مدیر نوبل', 'SUPER_ADMIN', 'ACTIVE', NULL, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE role = 'SUPER_ADMIN', status = 'ACTIVE', updated_at = NOW();

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed complete.
-- ═══════════════════════════════════════════════════════════════════════════
