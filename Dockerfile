# ═══════════════════════════════════════════════════════════════════════════
# Nobel Kids — production image
#
#   Stage 1 (builder): Node builds the static frontend  → out/
#   Stage 2 (runtime): PHP 8.3 + Apache serves out/ AND the PHP API
#
# The final image contains NO Node.js, no npm, no source TypeScript — only the
# compiled static site and the PHP backend. Same code, same .htaccess rules as
# the shared-hosting deployment, so what you test here is what runs there.
#
#   docker compose up -d --build
#   open http://localhost:8080
# ═══════════════════════════════════════════════════════════════════════════


# ─────────────────────────────── Stage 1: build ─────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /build

# Install dependencies first so this layer is cached while source changes.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Now the source.
COPY . .

# The static export normally fetches live data from the PHP API at build time.
# Inside `docker build` there is no API and no database yet, so the fetch step
# is skipped: scripts/fetch-static-data.mjs writes empty fallbacks and the
# pages hydrate from the live API in the browser instead.
#
# To bake real product data into the HTML (better SEO, faster first paint),
# build against a running instance:
#   docker build --build-arg NEXT_PUBLIC_API_BASE=https://your-domain.com .
ARG NEXT_PUBLIC_API_BASE=""
ARG NEXT_PUBLIC_SITE_URL="http://localhost:8080"
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1

# Three-tier data strategy, because `output: 'export'` REFUSES to build when
# generateStaticParams() for /products/[slug] returns an empty array:
#
#     Error: Page "/products/[slug]" returned an empty array from
#     "generateStaticParams()". With "output: export", at least one route
#     must be generated.
#
#   1. A pre-built out/ that was copied in wins outright (kept verbatim).
#   2. Otherwise try the live API — freshest prices/stock, best SEO.
#   3. If that fails (the normal case offline: no API exists yet during
#      `docker build`), rebuild the same bundle straight from
#      database/seed.sql so the export still has all 17 products.
RUN set -eux; \
    if [ -f out/index.html ]; then \
        echo "▸ using the pre-built out/ that was copied into the build context"; \
    else \
        node scripts/fetch-static-data.mjs || true; \
        if [ ! -s .static-data/products.json ] || [ "$(cat .static-data/products.json)" = "{}" ]; then \
            echo "▸ no API reachable during build — falling back to database/seed.sql"; \
            node scripts/static-data-from-seed.mjs; \
        fi; \
        node scripts/generate-sitemap.mjs; \
        npx next build; \
    fi

# Sanity check: fail the build loudly rather than shipping an empty site.
RUN test -f out/index.html || (echo "ERROR: static export produced no out/index.html" && exit 1)


# ────────────────────────────── Stage 2: runtime ────────────────────────────
# Pinned to the Debian suite on purpose. The bare `php:8.3-apache` tag silently
# moved bookworm → trixie, which renamed several -dev packages and broke builds
# that had worked for months. Pinning makes the base reproducible; the package
# names chosen below are valid on bookworm and trixie alike, so moving this pin
# forward (or back) does not break the build.
FROM php:8.3-apache-trixie AS runtime

# ── PHP extensions ──
#   pdo_mysql : database
#   gd        : image validation on upload (getimagesize + dimension checks)
#   mysqli    : used by the entrypoint's readiness probe
# mbstring, json, fileinfo, openssl, curl are already built into this image.
# Package names are the DISTRO-PORTABLE ones: libfreetype-dev / libjpeg-dev
# resolve correctly on both Debian bookworm and trixie. (The older
# libfreetype6-dev / libjpeg62-turbo-dev names were REMOVED in trixie, and the
# php:8.3-apache tag moved to trixie — using them breaks the build with
# "E: Unable to locate package".)
#
# The build libraries are removed afterwards, but the *runtime* shared objects
# that gd.so links against must survive. A naive
#   apt-get purge --auto-remove lib*-dev
# also drops libfreetype6/libjpeg62-turbo/libpng16/libwebp7, because apt has no
# idea a PHP extension links to them — gd then fails to load at runtime. The
# apt-mark dance below is the official docker-library pattern: snapshot the
# manually-installed set, mark everything auto, restore the snapshot, then walk
# ldd over the built extensions and re-mark whatever they actually need.
RUN set -eux; \
    apt-get update; \
    # kept in the final image: the entrypoint imports schema.sql/seed.sql with it
    apt-get install -y --no-install-recommends default-mysql-client; \
    savedAptMark="$(apt-mark showmanual)"; \
    apt-get install -y --no-install-recommends \
        libfreetype-dev libjpeg-dev libpng-dev libwebp-dev; \
    docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp; \
    docker-php-ext-install -j"$(nproc)" pdo_mysql mysqli gd; \
    apt-mark auto '.*' > /dev/null; \
    [ -z "$savedAptMark" ] || apt-mark manual $savedAptMark > /dev/null; \
    # NOTE: match on a */glob, not the absolute path ldd prints. On usr-merged
    # Debian, ldd reports /lib/... while dpkg records /usr/lib/..., so an
    # exact-path lookup silently finds nothing and protects nothing.
    ldd "$(php -r 'echo ini_get("extension_dir");')"/*.so \
        | awk '/=>/ { so = $(NF-1); if (index(so, "/usr/local/") == 1) next; gsub("^/(usr/)?", "", so); printf "*/%s\n", so }' \
        | sort -u \
        | xargs -r dpkg-query --search 2>/dev/null \
        | cut -d: -f1 \
        | sort -u \
        | xargs -r apt-mark manual > /dev/null; \
    apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false; \
    rm -rf /var/lib/apt/lists/*

# Fail the BUILD if an extension is missing or gd lost a codec to the purge —
# far better than discovering it when a customer uploads a photo.
RUN set -eux; \
    php -m | grep -qx 'pdo_mysql'; \
    php -m | grep -qx 'mysqli'; \
    php -m | grep -qx 'gd'; \
    php -r '$g = gd_info(); foreach (["JPEG Support","PNG Support","WebP Support","FreeType Support"] as $f) { if (empty($g[$f])) { fwrite(STDERR, "gd is missing $f\n"); exit(1); } } echo "gd ok: jpeg png webp freetype\n";'; \
    command -v mysql > /dev/null || { echo "mysql client missing"; exit 1; }; \
    echo "runtime extension check passed"

# ── Apache ──
# mod_rewrite  : clean URLs + the uploads lockdown rules
# mod_headers  : security headers
# mod_expires  : cache policy for hashed assets
# mod_deflate  : gzip
RUN a2enmod rewrite headers expires deflate

# AllowOverride All so every .htaccess in the project is honoured — this is what
# makes the container behave like the real DirectAdmin host, including the
# critical uploads/.htaccess that disables PHP execution.
RUN printf '%s\n' \
    '<Directory /var/www/html>' \
    '    Options -Indexes +FollowSymLinks' \
    '    AllowOverride All' \
    '    Require all granted' \
    '</Directory>' \
    'ServerTokens Prod' \
    'ServerSignature Off' \
    > /etc/apache2/conf-available/nobel.conf \
 && a2enconf nobel

# Production PHP settings, plus upload limits matching uploads.max_bytes (5 MB)
# with headroom for multipart overhead and up to 8 files per request.
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
 && printf '%s\n' \
    'expose_php = Off' \
    'display_errors = Off' \
    'log_errors = On' \
    'upload_max_filesize = 8M' \
    'post_max_size = 48M' \
    'max_file_uploads = 12' \
    'memory_limit = 256M' \
    'max_execution_time = 60' \
    'date.timezone = Asia/Tehran' \
    > "$PHP_INI_DIR/conf.d/nobel.ini"

WORKDIR /var/www/html

# ── Application files ──
# The static export's CONTENTS become the web root, mirroring public_html/.
COPY --from=builder /build/out/            ./
# PHP backend and everything it needs.
COPY api/       ./api/
COPY rescue/    ./rescue/
COPY database/  ./database/
COPY config/config.example.php config/config.docker.php ./config/
COPY config/.htaccess     ./config/.htaccess
COPY .htaccess            ./.htaccess
COPY uploads/.htaccess    ./uploads/.htaccess
COPY storage/.htaccess    ./storage/.htaccess

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Writable runtime directories. These are declared as volumes in compose so
# uploaded images and logs survive `docker compose down`.
RUN mkdir -p uploads storage/logs \
 && chown -R www-data:www-data uploads storage config \
 && chmod -R 755 uploads storage

EXPOSE 80

# Uses the app's own health endpoint: it checks the database connection, the
# schema and that uploads/ is writable — not merely that Apache is listening.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
    CMD php -r 'exit(@file_get_contents("http://127.0.0.1/api/health.php") && str_contains(@file_get_contents("http://127.0.0.1/api/health.php"), "\"status\":\"ok\"") ? 0 : 1);'

ENTRYPOINT ["entrypoint.sh"]
CMD ["apache2-foreground"]
