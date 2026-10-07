# النوتة الروحية
نسخة مستقلة عن Base44 مبنية بـ React/Vite + Express + SQLite.

## Local
1. انسخ .env.example إلى .env
2. غيّر ADMIN_CODE إلى كود جديد (لا تستخدم كود Base44 القديم)
3. npm install
4. npm run dev

## Production
npm run build
npm start

> ملاحظة: SQLite تحتاج persistent disk في الاستضافة لحفظ البيانات بشكل دائم.