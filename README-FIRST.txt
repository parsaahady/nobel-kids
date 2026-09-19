خطای Prisma / DATABASE_URL — علت و راه‌حل
Prisma / DATABASE_URL error — cause and fix


■ خلاصه
────────
خطایی که دیدید از پروژهٔ جدید نیست. از فایل‌های پروژهٔ قدیمی می‌آید که
هنوز در پوشه مانده‌اند.

شما زیپ جدید را داخل پوشهٔ پروژهٔ قدیمی اکسترکت کردید. اکسترکت فقط
فایل‌ها را «اضافه/بازنویسی» می‌کند و فایل‌های قدیمی را حذف نمی‌کند.
نتیجه: ۸۳ فایل استک قدیمی هنوز آنجا هستند — از جمله
docker-entrypoint.sh قدیمی که سراغ Prisma می‌رود.


■ مدرک
───────
در لاگ شما نوشته:

    [entrypoint] running prisma migrate deploy…

ولی entrypoint پروژهٔ جدید این‌طور لاگ می‌زند:

    [nobel] waiting for MySQL at db:3306 ...

پیشوند فرق دارد. یعنی داکر دارد فایل قدیمی را اجرا می‌کند.

ضمناً پروژهٔ جدید:
  • پوشهٔ prisma/ ندارد
  • هیچ ارجاعی به DATABASE_URL ندارد
  • در entrypoint جدید صفر بار کلمهٔ prisma هست
  • package.json فقط ۶ وابستگی دارد و هیچ‌کدام Prisma نیست


■ راه‌حل
─────────
فایل cleanup-old-stack.sh را در ریشهٔ پروژه بگذارید (کنار package.json)
و اجرا کنید.

گام ۱ — اول ببینید چه چیزی حذف می‌شود (چیزی حذف نمی‌شود):

    bash cleanup-old-stack.sh

گام ۲ — اگر لیست منطقی بود، حذف واقعی:

    bash cleanup-old-stack.sh --apply

اسکریپت قبل از حذف، یک پشتیبان tar.gz در پوشهٔ والد می‌سازد.

گام ۳ — بازسازی کامل:

    docker compose down -v
    docker compose build --no-cache
    docker compose up -d
    docker compose logs -f app

در لاگ باید [nobel] ببینید، نه [entrypoint].


■ اسکریپت چه چیزی حذف می‌کند
──────────────────────────────
پوشه‌ها:  prisma/  server/  app/api/  app/uploads/  tests/  .claude/
فایل‌ها:  docker-entrypoint.sh  .env.example  .env.docker.example
          .env  .env.local  .env.production  prisma.config.ts
          app/sitemap.ts  app/robots.ts  lib/prisma.ts  lib/db.ts
          middleware.ts  CHANGES.md  DELETED-FILES.txt  PROJECT-REPORT.md

اسکریپت یک لیست «محافظت‌شده» هم دارد که هرگز حذف نمی‌شوند:
lib/api-client.ts، lib/api-routes.ts، lib/static-data.ts،
package.json، package-lock.json، next.config.mjs

(نکتهٔ مهم: lib/api-client.ts در پروژهٔ جدید بازنویسی شده، نه حذف.
 پنج کامپوننت به آن import می‌زنند، پس حذفش build را می‌شکند.)


■ اگر package.json هنوز قدیمی بود
───────────────────────────────────
اسکریپت خودش هشدار می‌دهد. در آن صورت این دو فایل را از زیپ کامل
پروژه (nobel-kids-v2.zip) کپی کنید:

    package.json
    package-lock.json

بعد:

    rm -rf node_modules
    npm install


■ راه جایگزین و تمیزتر (توصیه‌شده)
────────────────────────────────────
به‌جای پاک‌سازی، از صفر شروع کنید:

    1. پوشهٔ پروژهٔ قدیمی را کاملاً جای دیگری ببرید یا حذف کنید
    2. یک پوشهٔ خالی جدید بسازید
    3. فقط محتویات nobel-kids-v2.zip را داخلش اکسترکت کنید
    4. docker compose up -d --build

این روش تضمینی است چون هیچ فایل قدیمی‌ای در کار نیست.


■ تست شده
──────────
دقیقاً همین سناریو شبیه‌سازی شد: یک پروژهٔ قدیمی با Prisma ساخته شد،
زیپ جدید رویش اکسترکت شد (خطا بازتولید شد)، اسکریپت اجرا شد، و بعد
پروژه با دیتابیس تازه بالا آمد:

    /                 200
    /products/        200
    /cart/            200
    /admin/login/     200
    /api/health.php   200   {"db":"up","schema":"ok","uploads":"writable"}
    محصولات: 17
