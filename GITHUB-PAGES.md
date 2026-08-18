# راه‌اندازی GitHub Pages برای Nobel Kids

صفحه فعلی مخزن، README را نمایش می‌دهد چون GitHub Pages روی «Deploy from a branch» تنظیم شده و پروژه Next.js هنوز Build نشده است.

## مراحل اصلاح

1. تمام فایل‌های این نسخه را در مخزن `parsaahady/nobel-kids` جایگزین و Push کنید.
2. مطمئن شوید فایل `.github/workflows/deploy-pages.yml` در GitHub دیده می‌شود.
3. در GitHub وارد `Settings → Pages` شوید.
4. در بخش `Build and deployment` مقدار `Source` را روی **GitHub Actions** بگذارید.
5. وارد تب `Actions` شوید و Workflow به نام **Deploy Nobel Kids to GitHub Pages** را اجرا یا نتیجه اجرای خودکار آن را بررسی کنید.
6. پس از سبزشدن Build و Deploy، آدرس زیر را با Hard Refresh باز کنید:

```text
https://parsaahady.github.io/nobel-kids/
```

## Push از VS Code

```bash
git add .
git commit -m "Fix GitHub Pages deployment"
git push origin main
```

Workflow به‌صورت خودکار خروجی استاتیک Next.js را می‌سازد، پوشه `out` را منتشر می‌کند و مسیر تصاویر و لینک‌ها را با `/nobel-kids` هماهنگ می‌کند.
