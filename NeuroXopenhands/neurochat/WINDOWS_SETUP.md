# دليل تشغيل منصة NeuroChat على نظام Windows

## المتطلبات الأساسية

### 1. تثبيت Node.js
- قم بتحميل Node.js من الموقع الرسمي: https://nodejs.org/
- اختر النسخة LTS (الموصى بها)
- قم بتشغيل ملف التثبيت واتبع التعليمات
- تأكد من تثبيت Node.js بنجاح:
  ```cmd
  node --version
  npm --version
  ```

### 2. تثبيت Git
- قم بتحميل Git من: https://git-scm.com/download/win
- قم بتثبيت Git مع الإعدادات الافتراضية
- تأكد من التثبيت:
  ```cmd
  git --version
  ```

## خطوات التثبيت والتشغيل

### 1. استنساخ المشروع
افتح Command Prompt أو PowerShell وقم بتنفيذ:
```cmd
git clone https://github.com/kdvdkshs-source/8.git neurochat
cd neurochat\new-main
```

### 2. تثبيت وتشغيل Backend

#### أ. فتح نافذة Command Prompt جديدة للـ Backend:
```cmd
cd neurochat\new-main\neurochat\backend\enhanced-ai-pipeline
```

#### ب. تثبيت التبعيات:
```cmd
npm install
```

#### ج. تشغيل الخادم:
```cmd
npm start
```

سيعمل Backend على المنفذ **12000**

### 3. تثبيت وتشغيل Frontend

#### أ. فتح نافذة Command Prompt ثانية للـ Frontend:
```cmd
cd neurochat\new-main\neurochat\frontend
```

#### ب. تحديث إعدادات API (اختياري - للبيئة المحلية):
- افتح ملف `index.html` في محرر نصوص
- ابحث عن السطر:
  ```html
  <meta name="neurochat-api-base" content="https://12000-ix43o1szubw1o10kbzdbt-6532622b.e2b.dev">
  ```
- غيّره إلى:
  ```html
  <meta name="neurochat-api-base" content="http://localhost:12000">
  ```
- احفظ الملف

#### ج. تشغيل خادم Frontend:
```cmd
node server.js
```

سيعمل Frontend على المنفذ **8080**

### 4. فتح المنصة
- افتح متصفح الويب
- اذهب إلى: **http://localhost:8080**

## استخدام PM2 (اختياري - موصى به)

PM2 هو مدير عمليات يساعد في تشغيل التطبيق بشكل مستمر.

### تثبيت PM2:
```cmd
npm install -g pm2
```

### تشغيل Backend باستخدام PM2:
```cmd
cd neurochat\new-main\neurochat\backend\enhanced-ai-pipeline
pm2 start ecosystem.config.js
```

### تشغيل Frontend باستخدام PM2:
```cmd
cd neurochat\new-main\neurochat\frontend
pm2 start server.js --name "neurochat-frontend"
```

### أوامر PM2 المفيدة:
```cmd
# عرض جميع العمليات
pm2 status

# عرض السجلات
pm2 logs

# إيقاف خدمة
pm2 stop [name/id]

# إعادة تشغيل خدمة
pm2 restart [name/id]

# حذف خدمة من القائمة
pm2 delete [name/id]

# حفظ العمليات الحالية
pm2 save

# تشغيل PM2 عند بدء Windows
pm2 startup
```

## حل المشاكل الشائعة

### 1. خطأ في الاتصال بـ Backend:
- تأكد من أن Backend يعمل على المنفذ 12000
- تحقق من إعدادات API في `index.html`
- تأكد من عدم وجود جدار حماية يحجب المنفذ

### 2. خطأ في تثبيت التبعيات:
- قم بحذف مجلد `node_modules` وملف `package-lock.json`
- أعد تشغيل الأمر `npm install`

### 3. المنفذ مستخدم بالفعل:
- Backend: قم بتغيير المنفذ في `config/config.js`
- Frontend: قم بتغيير المنفذ في `server.js`

### 4. مشاكل الصلاحيات:
- قم بتشغيل Command Prompt كمسؤول (Run as Administrator)

## ملاحظات إضافية

### البيئة المطلوبة:
- Windows 10/11
- Node.js 16.x أو أحدث
- RAM: 4GB كحد أدنى (8GB موصى به)
- مساحة قرص: 2GB

### الأمان:
- لا تشارك مفاتيح API الخاصة بك
- استخدم HTTPS في بيئة الإنتاج
- قم بتكوين جدار الحماية بشكل صحيح

### النسخ الاحتياطي:
- احتفظ بنسخة احتياطية من إعدادات API
- احفظ قاعدة البيانات بانتظام (إذا كنت تستخدم MongoDB)

## الدعم والمساعدة

إذا واجهت أي مشاكل:
1. تحقق من سجلات الأخطاء في وحدة التحكم
2. تأكد من تثبيت جميع التبعيات بشكل صحيح
3. أعد تشغيل الخدمات

## التحديثات

للحصول على آخر التحديثات:
```cmd
cd neurochat
git pull origin main
cd new-main\neurochat\backend\enhanced-ai-pipeline
npm install
cd ..\..\frontend
# أعد تشغيل الخدمات
```

---
تم إعداد هذا الدليل بواسطة يوسف - ديسمبر 2024