#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Nobel Kids — حذف بقایای استک قدیمی (Next.js + Prisma + PostgreSQL)
#
# اگر زیپ پروژهٔ جدید را روی پوشهٔ پروژهٔ قدیمی اکسترکت کرده باشید، فایل‌های
# جدید اضافه شده‌اند ولی فایل‌های قدیمی حذف نشده‌اند. نتیجه: داکر ممکن است
# هنوز docker-entrypoint.sh قدیمی را اجرا کند و سراغ Prisma برود.
#
# این اسکریپت فقط فایل‌های استک قدیمی را حذف می‌کند.
#
#   اجرای آزمایشی (چیزی حذف نمی‌شود، فقط گزارش):
#       bash cleanup-old-stack.sh
#
#   اجرای واقعی:
#       bash cleanup-old-stack.sh --apply
#
# قبل از اجرا یک پشتیبان می‌گیرد.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

cd "$(dirname "$0")"

# ── بررسی اینکه در پوشهٔ درست هستیم ────────────────────────────────────────
if [ ! -f package.json ]; then
    echo "خطا: package.json پیدا نشد."
    echo "این اسکریپت را در ریشهٔ پروژه بگذارید و از همان‌جا اجرا کنید."
    exit 1
fi

if [ ! -d api ] || [ ! -f database/schema.sql ]; then
    echo "خطا: پوشهٔ api/ یا database/schema.sql پیدا نشد."
    echo "یعنی فایل‌های پروژهٔ جدید هنوز اینجا نیستند."
    echo "اول محتویات nobel-kids-v2.zip را اینجا اکسترکت کنید، بعد این را اجرا کنید."
    exit 1
fi

echo "════════════════════════════════════════════════════════════════"
if [ "$APPLY" = "1" ]; then
    echo "  حالت: اجرای واقعی — فایل‌ها حذف می‌شوند"
else
    echo "  حالت: آزمایشی — هیچ فایلی حذف نمی‌شود"
    echo "  برای حذف واقعی:  bash cleanup-old-stack.sh --apply"
fi
echo "════════════════════════════════════════════════════════════════"
echo

# ── لیست مسیرهای استک قدیمی ────────────────────────────────────────────────
OLD_DIRS="
prisma
server
app/api
app/uploads
tests
.claude
"

OLD_FILES="
docker-entrypoint.sh
.env.example
.env.docker.example
.env.docker
.env.docker.ci
.env
.env.local
.env.production
prisma.config.ts
CHANGES.md
DELETED-FILES.txt
PROJECT-REPORT.md
app/sitemap.ts
app/robots.ts
lib/prisma.ts
lib/db.ts
middleware.ts
"

# مهم: lib/api-client.ts عمداً در این لیست نیست. آن فایل بازنویسی شده
# (نه حذف) و کامپوننت‌های AccountClient / AuthPanel / CheckoutClient /
# ContactClient / Header به آن import می‌زنند. حذفش build را می‌شکند.

# فایل‌هایی که هرگز نباید حذف شوند، حتی اگر به لیست بالا اضافه شوند.
PROTECTED="
lib/api-client.ts
lib/api-routes.ts
lib/static-data.ts
package.json
package-lock.json
next.config.mjs
"

FOUND=0
TO_REMOVE=""

for d in $OLD_DIRS; do
    [ -z "$d" ] && continue
    if [ -e "$d" ]; then
        n=$(find "$d" -type f 2>/dev/null | wc -l)
        printf "  حذف پوشه:  %-24s (%s فایل)\n" "$d" "$n"
        TO_REMOVE="$TO_REMOVE $d"
        FOUND=$((FOUND + 1))
    fi
done

for f in $OLD_FILES; do
    [ -z "$f" ] && continue
    # محافظ: اگر فایلی در لیست محافظت‌شده باشد، رد شو
    skip=0
    for p in $PROTECTED; do
        [ "$f" = "$p" ] && skip=1
    done
    if [ "$skip" = "1" ]; then
        echo "  رد شد (محافظت‌شده): $f"
        continue
    fi
    if [ -e "$f" ]; then
        printf "  حذف فایل:  %s\n" "$f"
        TO_REMOVE="$TO_REMOVE $f"
        FOUND=$((FOUND + 1))
    fi
done

echo
if [ "$FOUND" = "0" ]; then
    echo "  ✓ هیچ فایل قدیمی پیدا نشد — پروژه تمیز است."
    exit 0
fi

echo "  مجموع: $FOUND مورد"
echo

# ── بررسی وابستگی‌های قدیمی در package.json ────────────────────────────────
if grep -qE '"(@prisma/client|prisma|pg|bcrypt|bcryptjs|next-auth|iron-session|jsonwebtoken)"' package.json 2>/dev/null; then
    echo "  ⚠ هشدار: package.json هنوز وابستگی‌های استک قدیمی را دارد:"
    grep -oE '"(@prisma/client|prisma|pg|bcrypt|bcryptjs|next-auth|iron-session|jsonwebtoken)"' package.json | sort -u | sed 's/^/      /'
    echo
    echo "    یعنی package.json نسخهٔ قدیمی است و بازنویسی نشده."
    echo "    فایل package.json و package-lock.json را از زیپ جدید کپی کنید،"
    echo "    بعد node_modules را پاک و دوباره نصب کنید."
    echo
fi

if grep -q '"prisma"' package.json 2>/dev/null; then
    echo "  ⚠ کلید prisma هنوز در package.json هست (منبع همان warning داکر)."
    echo
fi

if [ "$APPLY" != "1" ]; then
    echo "  چیزی حذف نشد. برای حذف واقعی:"
    echo "      bash cleanup-old-stack.sh --apply"
    exit 0
fi

# ── پشتیبان ────────────────────────────────────────────────────────────────
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="../nobel-kids-old-files-$STAMP.tar.gz"
echo "  در حال گرفتن پشتیبان از فایل‌های قدیمی…"
tar czf "$BACKUP" $TO_REMOVE 2>/dev/null || true
echo "  پشتیبان: $BACKUP"
echo

# ── حذف ────────────────────────────────────────────────────────────────────
for p in $TO_REMOVE; do
    rm -rf "$p"
    echo "  حذف شد: $p"
done

echo
echo "════════════════════════════════════════════════════════════════"
echo "  پاک‌سازی تمام شد."
echo "════════════════════════════════════════════════════════════════"
echo
echo "  گام بعدی:"
echo
echo "    docker compose down -v"
echo "    docker compose build --no-cache"
echo "    docker compose up -d"
echo "    docker compose logs -f app"
echo
echo "  در لاگ باید [nobel] ببینید، نه [entrypoint]."
echo "  اگر باز هم [entrypoint] یا prisma دیدید یعنی هنوز فایل قدیمی مانده."
