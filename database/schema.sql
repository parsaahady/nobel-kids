-- ============================================================================
--  Nobel Kids — MySQL / MariaDB schema  (فروشگاه عمده پوشاک کودک نوبل کیدز)
-- ----------------------------------------------------------------------------
--  Engine   : InnoDB
--  Charset  : utf8mb4 / utf8mb4_unicode_ci  (Persian text + emoji safe)
--  Import   : phpMyAdmin →  Import → choose this file → Go
--
--  This schema replaces the previous PostgreSQL/Prisma model 1:1.
--  Every table mirrors behaviour that actually exists in the application
--  (see ARCHITECTURE-MIGRATION.md for the old→new mapping table).
--
--  Money is stored as INT (Toman, no decimals) — exactly like the old code.
--  IDs are BIGINT AUTO_INCREMENT and are always serialised as STRINGS in the
--  JSON API so the existing TypeScript DTO types keep working unchanged.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION';

-- ───────────────────────────── Users & auth ─────────────────────────────────

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `mobile`        VARCHAR(20)  NOT NULL,
  `name`          VARCHAR(100) DEFAULT NULL,
  `business_name` VARCHAR(150) DEFAULT NULL,
  `email`         VARCHAR(200) DEFAULT NULL,
  `role`          ENUM('CUSTOMER','ADMIN','SUPER_ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  `status`        ENUM('ACTIVE','SUSPENDED','DELETED')   NOT NULL DEFAULT 'ACTIVE',
  -- Admin panel password (bcrypt via password_hash). Always NULL for OTP-only customers.
  `password_hash` VARCHAR(255) DEFAULT NULL,
  -- Forces a password change on next admin login (used by seed + rescue panel).
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_mobile` (`mobile`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_role_status` (`role`, `status`),
  KEY `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT UNSIGNED NOT NULL,
  -- Only the SHA-256 hash of the cookie token is stored: a DB leak leaks no usable session.
  `token_hash`   CHAR(64) NOT NULL,
  -- CUSTOMER sessions are minted by OTP login, ADMIN sessions only by the
  -- password login. An OTP session can never open the admin panel.
  `purpose`      ENUM('CUSTOMER','ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  `user_agent`   VARCHAR(255) DEFAULT NULL,
  `ip`           VARCHAR(45)  DEFAULT NULL,
  `expires_at`   DATETIME NOT NULL,
  `last_used_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at`   DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sessions_token` (`token_hash`),
  KEY `idx_sessions_user` (`user_id`),
  KEY `idx_sessions_expires` (`expires_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `otp_codes`;
CREATE TABLE `otp_codes` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `mobile`      VARCHAR(20) NOT NULL,
  -- HMAC-SHA256(code, APP_SECRET + mobile + purpose) — never the plaintext code.
  `code_hash`   CHAR(64) NOT NULL,
  `purpose`     ENUM('LOGIN') NOT NULL DEFAULT 'LOGIN',
  `expires_at`  DATETIME NOT NULL,
  `attempts`    INT NOT NULL DEFAULT 0,
  `consumed_at` DATETIME DEFAULT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip`          VARCHAR(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_otp_lookup` (`mobile`, `purpose`, `created_at`),
  KEY `idx_otp_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shared-hosting rate limiter (replaces the old in-process Node limiter, which
-- reset on every restart). Fixed-window counters keyed by bucket.
DROP TABLE IF EXISTS `rate_limits`;
CREATE TABLE `rate_limits` (
  `bucket_key`   VARCHAR(190) NOT NULL,
  `hits`         INT NOT NULL DEFAULT 0,
  `window_start` DATETIME NOT NULL,
  PRIMARY KEY (`bucket_key`),
  KEY `idx_rate_window` (`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `addresses`;
CREATE TABLE `addresses` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`        BIGINT UNSIGNED NOT NULL,
  `title`          VARCHAR(60)  DEFAULT NULL,
  `recipient_name` VARCHAR(100) NOT NULL,
  `mobile`         VARCHAR(20)  NOT NULL,
  `province`       VARCHAR(60)  NOT NULL,
  `city`           VARCHAR(60)  NOT NULL,
  `address`        VARCHAR(500) NOT NULL,
  `postal_code`    VARCHAR(10)  DEFAULT NULL,
  `unit`           VARCHAR(20)  DEFAULT NULL,
  `plate`          VARCHAR(20)  DEFAULT NULL,
  `is_default`     TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_addresses_user` (`user_id`, `is_default`),
  CONSTRAINT `fk_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────── Catalog ──────────────────────────────────────

DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100) NOT NULL,
  `slug`        VARCHAR(120) NOT NULL,
  `description` VARCHAR(500) DEFAULT NULL,
  `image`       VARCHAR(500) DEFAULT NULL,
  `is_active`   TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order`  INT NOT NULL DEFAULT 0,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_name` (`name`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  KEY `idx_categories_active_sort` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`              VARCHAR(200) NOT NULL,
  `slug`              VARCHAR(220) NOT NULL,
  `short_name`        VARCHAR(150) DEFAULT NULL,
  `description`       TEXT DEFAULT NULL,
  `short_description` VARCHAR(500) DEFAULT NULL,
  `sku`               VARCHAR(80) NOT NULL,
  `category_id`       BIGINT UNSIGNED NOT NULL,
  `price`             INT UNSIGNED NOT NULL,              -- per piece, Toman
  `compare_price`     INT UNSIGNED DEFAULT NULL,          -- crossed-out price
  `stock`             INT NOT NULL DEFAULT 0,             -- available PACKS
  `pack_size`         INT NOT NULL DEFAULT 5,             -- pieces per pack
  `min_packs`         INT NOT NULL DEFAULT 1,             -- minimum order (packs)
  `status`            ENUM('DRAFT','ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `featured`          TINYINT(1) NOT NULL DEFAULT 0,
  `is_new`            TINYINT(1) NOT NULL DEFAULT 0,
  `is_best_seller`    TINYINT(1) NOT NULL DEFAULT 0,
  `gender`            VARCHAR(40)  DEFAULT NULL,
  `material`          VARCHAR(120) DEFAULT NULL,
  `collection`        VARCHAR(120) DEFAULT NULL,
  `seo_title`         VARCHAR(220) DEFAULT NULL,
  `seo_description`   VARCHAR(500) DEFAULT NULL,
  `tags`              JSON DEFAULT NULL,
  `created_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`        DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_slug` (`slug`),
  UNIQUE KEY `uq_products_sku` (`sku`),
  KEY `idx_products_public` (`status`, `deleted_at`, `created_at`),
  KEY `idx_products_category` (`category_id`, `status`, `deleted_at`),
  KEY `idx_products_price` (`price`),
  KEY `idx_products_featured` (`featured`),
  KEY `idx_products_bestseller` (`is_best_seller`),
  KEY `idx_products_collection` (`collection`),
  KEY `idx_products_stock` (`stock`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `product_images`;
CREATE TABLE `product_images` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `url`        VARCHAR(500) NOT NULL,
  `alt`        VARCHAR(200) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_images_product` (`product_id`, `sort_order`),
  CONSTRAINT `fk_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `product_colors`;
CREATE TABLE `product_colors` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `name`       VARCHAR(60) NOT NULL,
  `hex`        VARCHAR(9) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_color_per_product` (`product_id`, `name`),
  CONSTRAINT `fk_colors_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `product_sizes`;
CREATE TABLE `product_sizes` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `label`      VARCHAR(40) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_size_per_product` (`product_id`, `label`),
  CONSTRAINT `fk_sizes_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every color × size combination, with an optional per-variant stock override.
DROP TABLE IF EXISTS `product_variants`;
CREATE TABLE `product_variants` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `color_name` VARCHAR(60) NOT NULL,
  `size_label` VARCHAR(40) NOT NULL,
  `sku`        VARCHAR(220) NOT NULL,
  `stock`      INT DEFAULT NULL,      -- NULL → inherit product-level pack stock
  `is_active`  TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_variant` (`product_id`, `color_name`, `size_label`),
  KEY `idx_variant_sku` (`sku`),
  CONSTRAINT `fk_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tiered wholesale pricing. discount_bps = basis points (400 = 4%).
DROP TABLE IF EXISTS `price_tiers`;
CREATE TABLE `price_tiers` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id`   BIGINT UNSIGNED NOT NULL,
  `min_packs`    INT NOT NULL,
  `discount_bps` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tier` (`product_id`, `min_packs`),
  CONSTRAINT `fk_tiers_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────── Cart / wishlist ──────────────────────────────────

DROP TABLE IF EXISTS `carts`;
CREATE TABLE `carts` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED DEFAULT NULL,
  `guest_token` VARCHAR(64) DEFAULT NULL,
  `status`      ENUM('ACTIVE','CONVERTED','ABANDONED') NOT NULL DEFAULT 'ACTIVE',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cart_user` (`user_id`),
  UNIQUE KEY `uq_cart_guest` (`guest_token`),
  KEY `idx_cart_status` (`status`),
  CONSTRAINT `fk_carts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cart_items`;
CREATE TABLE `cart_items` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cart_id`    BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `variant_id` BIGINT UNSIGNED DEFAULT NULL,
  `pack_mode`  ENUM('assorted','single') NOT NULL DEFAULT 'assorted',
  `color_name` VARCHAR(60) NOT NULL,
  `color_hex`  VARCHAR(9) DEFAULT NULL,
  `size_label` VARCHAR(40) NOT NULL,
  `pack_count` INT NOT NULL DEFAULT 1,
  -- Server-computed snapshot; ALWAYS recomputed from the DB at quote/checkout.
  `unit_price` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cart_line` (`cart_id`, `product_id`, `color_name`, `size_label`),
  KEY `idx_cart_items_cart` (`cart_id`),
  KEY `idx_cart_items_product` (`product_id`),
  CONSTRAINT `fk_cart_items_cart`    FOREIGN KEY (`cart_id`)    REFERENCES `carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `wishlist_items`;
CREATE TABLE `wishlist_items` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wishlist` (`user_id`, `product_id`),
  KEY `idx_wishlist_product` (`product_id`),
  CONSTRAINT `fk_wishlist_user`    FOREIGN KEY (`user_id`)    REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wishlist_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────────── Coupons ──────────────────────────────────────

DROP TABLE IF EXISTS `coupons`;
CREATE TABLE `coupons` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`            VARCHAR(40) NOT NULL,
  `type`            ENUM('PERCENT','FIXED') NOT NULL,
  `value`           INT NOT NULL,
  `min_order_total` INT DEFAULT NULL,
  `max_discount`    INT DEFAULT NULL,
  `usage_limit`     INT DEFAULT NULL,
  `used_count`      INT NOT NULL DEFAULT 0,
  `per_user_limit`  INT DEFAULT NULL,
  `starts_at`       DATETIME DEFAULT NULL,
  `expires_at`      DATETIME DEFAULT NULL,
  `is_active`       TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_coupon_code` (`code`),
  KEY `idx_coupon_active` (`is_active`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────── Orders / quotations (proforma) ──────────────────────
--  IMPORTANT (see ARCHITECTURE-MIGRATION.md §"Quotation vs Order"):
--  In Nobel Kids a "quotation / پیش‌فاکتور" IS a manual-payment order. Rather
--  than duplicating the whole order machinery, one `orders` table carries a
--  `kind` discriminator, and read-only VIEWs named `quotations` /
--  `quotation_items` expose the quotation side under the expected names.

DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_number`     VARCHAR(30) NOT NULL,             -- NBL-2026-000001
  `quotation_number` VARCHAR(30) DEFAULT NULL,         -- NBLQ-2026-000001 (kind=QUOTATION)
  `kind`             ENUM('QUOTATION','ORDER') NOT NULL DEFAULT 'QUOTATION',
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `idempotency_key`  VARCHAR(80) DEFAULT NULL,
  `status`           ENUM('PENDING','REVIEWING','APPROVED','REJECTED','COMPLETED',
                          'AWAITING_PAYMENT','PAID','PROCESSING','PACKED',
                          'SHIPPED','DELIVERED','CANCELLED','REFUNDED')
                     NOT NULL DEFAULT 'PENDING',
  `payment_status`   ENUM('PENDING','SUCCESS','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `shipping_status`  ENUM('PENDING','PROCESSING','SHIPPED','DELIVERED') NOT NULL DEFAULT 'PENDING',
  `payment_method`   ENUM('MANUAL','GATEWAY') NOT NULL DEFAULT 'MANUAL',
  `subtotal`         INT NOT NULL,                     -- after product+tier discount
  `base_total`       INT NOT NULL,                     -- at base prices (reporting)
  `discount`         INT NOT NULL DEFAULT 0,           -- tier + coupon
  `coupon_id`        BIGINT UNSIGNED DEFAULT NULL,
  `shipping_cost`    INT NOT NULL DEFAULT 0,
  `shipping_method`  VARCHAR(30) NOT NULL,             -- freight | pickup
  `total`            INT NOT NULL,
  `currency`         VARCHAR(8) NOT NULL DEFAULT 'IRT',
  `customer_name`    VARCHAR(100) NOT NULL,
  `customer_mobile`  VARCHAR(20)  NOT NULL,
  `business_name`    VARCHAR(150) DEFAULT NULL,
  `address_id`       BIGINT UNSIGNED DEFAULT NULL,
  `address_snapshot` JSON NOT NULL,
  `notes`            VARCHAR(500) DEFAULT NULL,
  `internal_note`    VARCHAR(1000) DEFAULT NULL,
  `tracking_code`    VARCHAR(100) DEFAULT NULL,
  `status_history`   JSON DEFAULT NULL,
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_order_number` (`order_number`),
  UNIQUE KEY `uq_quotation_number` (`quotation_number`),
  UNIQUE KEY `uq_idempotency` (`idempotency_key`),
  KEY `idx_orders_user` (`user_id`, `created_at`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_payment_status` (`payment_status`),
  KEY `idx_orders_created` (`created_at`),
  KEY `idx_orders_kind` (`kind`, `status`),
  KEY `idx_orders_mobile` (`customer_mobile`),
  CONSTRAINT `fk_orders_user`    FOREIGN KEY (`user_id`)   REFERENCES `users` (`id`),
  CONSTRAINT `fk_orders_address` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_orders_coupon`  FOREIGN KEY (`coupon_id`)  REFERENCES `coupons` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`     BIGINT UNSIGNED NOT NULL,
  `product_id`   BIGINT UNSIGNED DEFAULT NULL,   -- SET NULL: orders survive product deletion
  `product_name` VARCHAR(200) NOT NULL,          -- snapshot
  `sku`          VARCHAR(80)  NOT NULL,
  `variant_name` VARCHAR(140) DEFAULT NULL,      -- e.g. «قهوه‌ای · جور سایز»
  `pack_mode`    VARCHAR(20)  NOT NULL,
  `quantity`     INT NOT NULL,                   -- packs
  `pack_count`   INT NOT NULL,                   -- packs (alias kept from old schema)
  `pack_size`    INT NOT NULL,                   -- 5
  `unit_price`   INT NOT NULL,                   -- per piece, after tier discount
  `base_price`   INT NOT NULL,                   -- per piece, before tier discount
  `discount`     INT NOT NULL DEFAULT 0,
  `total`        INT NOT NULL,                   -- quantity × pack_size × unit_price
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `idx_order_items_product` (`product_id`),
  CONSTRAINT `fk_order_items_order`   FOREIGN KEY (`order_id`)   REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `coupon_redemptions`;
CREATE TABLE `coupon_redemptions` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `coupon_id`  BIGINT UNSIGNED NOT NULL,
  `order_id`   BIGINT UNSIGNED NOT NULL,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `amount`     INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_redemption_order` (`order_id`),
  KEY `idx_redemption_coupon` (`coupon_id`),
  KEY `idx_redemption_user` (`user_id`),
  CONSTRAINT `fk_redemption_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`),
  CONSTRAINT `fk_redemption_order`  FOREIGN KEY (`order_id`)  REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_redemption_user`   FOREIGN KEY (`user_id`)   REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `payment_transactions`;
CREATE TABLE `payment_transactions` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`         BIGINT UNSIGNED NOT NULL,
  `provider`         ENUM('MANUAL','ZARINPAL','IDPAY') NOT NULL DEFAULT 'MANUAL',
  `authority`        VARCHAR(190) DEFAULT NULL,       -- gateway token
  `reference_id`     VARCHAR(100) DEFAULT NULL,
  `amount`           INT NOT NULL,
  `status`           ENUM('INITIATED','PENDING','SUCCESS','FAILED','REFUNDED') NOT NULL DEFAULT 'INITIATED',
  `gateway_response` JSON DEFAULT NULL,
  `card_pan`         VARCHAR(30) DEFAULT NULL,
  `marked_by_id`     BIGINT UNSIGNED DEFAULT NULL,    -- admin who confirmed a manual payment
  `paid_at`          DATETIME DEFAULT NULL,
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_authority` (`authority`),
  KEY `idx_payment_order` (`order_id`),
  KEY `idx_payment_status` (`status`),
  CONSTRAINT `fk_payment_order`  FOREIGN KEY (`order_id`)     REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payment_admin`  FOREIGN KEY (`marked_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────── Inventory / audit / misc ─────────────────────────

DROP TABLE IF EXISTS `inventory_logs`;
CREATE TABLE `inventory_logs` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `type`       ENUM('SALE','RESTOCK','ADJUSTMENT','RETURN') NOT NULL,
  `quantity`   INT NOT NULL,                  -- signed: negative = stock out
  `reason`     VARCHAR(200) DEFAULT NULL,
  `order_id`   BIGINT UNSIGNED DEFAULT NULL,
  `admin_id`   BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inventory_product` (`product_id`, `created_at`),
  KEY `idx_inventory_order` (`order_id`, `type`),
  CONSTRAINT `fk_inventory_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inventory_order`   FOREIGN KEY (`order_id`)   REFERENCES `orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inventory_admin`   FOREIGN KEY (`admin_id`)   REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id`   BIGINT UNSIGNED DEFAULT NULL,
  `action`     VARCHAR(80) NOT NULL,
  `entity`     VARCHAR(40) NOT NULL,
  `entity_id`  VARCHAR(40) DEFAULT NULL,
  `metadata`   JSON DEFAULT NULL,
  `ip`         VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_entity` (`entity`, `entity_id`),
  KEY `idx_audit_admin` (`admin_id`, `created_at`),
  KEY `idx_audit_created` (`created_at`),
  CONSTRAINT `fk_audit_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `contact_messages`;
CREATE TABLE `contact_messages` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(100) NOT NULL,
  `mobile`     VARCHAR(20)  NOT NULL,
  `email`      VARCHAR(200) DEFAULT NULL,
  `subject`    VARCHAR(150) DEFAULT NULL,
  `message`    TEXT NOT NULL,
  `status`     ENUM('NEW','READ','ARCHIVED') NOT NULL DEFAULT 'NEW',
  `is_read`    TINYINT(1) NOT NULL DEFAULT 0,
  `ip`         VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_contact_status` (`status`, `created_at`),
  KEY `idx_contact_mobile` (`mobile`),
  KEY `idx_contact_email` (`email`),
  KEY `idx_contact_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `key`        VARCHAR(80) NOT NULL,
  `value`      JSON NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Collision-safe human readable numbering (NBL-2026-000001) — one row per
-- (scope, year); incremented inside the order transaction with a row lock.
DROP TABLE IF EXISTS `number_counters`;
CREATE TABLE `number_counters` (
  `scope` VARCHAR(20) NOT NULL,
  `year`  SMALLINT UNSIGNED NOT NULL,
  `value` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`scope`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────────────────────── Compatibility views ──────────────────────────────
-- Read-only helpers so the quotation / customer / admin concepts are directly
-- visible in phpMyAdmin without duplicating any data.

DROP VIEW IF EXISTS `quotations`;
CREATE VIEW `quotations` AS
  SELECT o.`id`, o.`quotation_number`, o.`order_number`, o.`user_id`, o.`status`,
         o.`subtotal`, o.`base_total`, o.`discount`, o.`shipping_cost`, o.`total`,
         o.`customer_name`, o.`customer_mobile`, o.`business_name`,
         o.`shipping_method`, o.`notes`, o.`internal_note`,
         o.`created_at`, o.`updated_at`
  FROM `orders` o
  WHERE o.`kind` = 'QUOTATION';

DROP VIEW IF EXISTS `quotation_items`;
CREATE VIEW `quotation_items` AS
  SELECT i.*
  FROM `order_items` i
  JOIN `orders` o ON o.`id` = i.`order_id`
  WHERE o.`kind` = 'QUOTATION';

DROP VIEW IF EXISTS `customers`;
CREATE VIEW `customers` AS
  SELECT `id`, `mobile`, `name`, `business_name`, `email`, `status`,
         `created_at`, `last_login_at`
  FROM `users` WHERE `role` = 'CUSTOMER';

DROP VIEW IF EXISTS `admins`;
CREATE VIEW `admins` AS
  SELECT `id`, `mobile`, `name`, `email`, `role`, `status`,
         `must_change_password`, `created_at`, `last_login_at`
  FROM `users` WHERE `role` IN ('ADMIN','SUPER_ADMIN');

-- Live inventory snapshot (product-level pack stock + reserved/sold counters).
DROP VIEW IF EXISTS `inventory`;
CREATE VIEW `inventory` AS
  SELECT p.`id` AS `product_id`, p.`sku`, p.`name`, p.`slug`,
         p.`stock` AS `packs_in_stock`, p.`pack_size`,
         (p.`stock` * p.`pack_size`) AS `pieces_in_stock`,
         p.`status`, p.`updated_at`
  FROM `products` p
  WHERE p.`deleted_at` IS NULL;

SET FOREIGN_KEY_CHECKS = 1;
