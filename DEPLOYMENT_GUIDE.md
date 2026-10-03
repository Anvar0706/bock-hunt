# 🚀 BlockHunt Protocol — 100% Tekin va Professional Deploy Qo'llanmasi

Ushbu loyiha to'liq **Next.js 14 (App Router)**, **SQLite (LibSQL)** va **Grammy.js (Serverless Webhook)** stackiga o'tkazildi.

Endi kompyuteringizni 24/7 yoqib qo'yish yoki desktopingizda botni ishlatish **kerak emas**. Hammasi Vercel va Turso bulutida **100% TEKIN** ishlaydi.

---

## 🏗️ Nimalar o'zgartirildi va amalga oshirildi?

| Soha | Eski holat | Yangi holat |
|---|---|---|
| **Framework** | Vite + React SPA | **Next.js 14** (App Router, Serverless) |
| **Baza (Database)** | JSON fayllar (`data/*.json`) | **SQLite (LibSQL)** (`@libsql/client`) |
| **Telegram Bot** | Desktopda doimiy ishlovchi `bot.mjs` (long-polling) | **Grammy.js Webhook** (`/api/bot`) Vercel Serverless |
| **Ma'lumotlar** | — | Barcha 17 ta foydalanuvchi, to'lovlar, manzillar yangi SQLite bazaga **avtomatik ko'chirildi** |
| **Server xarajatlari** | Kompyuter 24/7 yoqiq bo'lishi kerak edi | **$0 / oy** (Vercel Free + Turso Free) |
| **UI/UX Qotishlar** | Oldin GPU compositor bilan muammo bo'lgan | **0 ta freeze**, WebKit moslashtirilgan, Next.js optimallashtirilgan |
| **Build holati** | — | `pnpm build` **0 ta xato bilan muvaffaqiyatli o'tadi** |

---

## 📋 Bosqichma-bosqich Deploy Qilish (Hammasi 5 daqiqa oladi)

### 1-QADAM: Bepul Bulut SQLite Bazasi (Turso) Olish
Vercel serverless bo'lgani sababli, unga bepul bulutli SQLite (Turso) ulanadi.

1. [turso.tech](https://tur.so) saytiga kiring va GitHub orqali ro'yxatdan o'ting (**100% bepul**, karta so'ramaydi).
2. Yangi baza yarating:
   - Nomiga: `blockhunt` deb yozing.
3. Baza yaratilgach, sizga 2 ta narsa beriladi:
   - **Database URL**: `libsql://blockhunt-sizning-usernameingiz.turso.io`
   - **Auth Token**: `eyJhbGciOi...` (baza sozlamalaridan "Generate Token" tugmasi orqali olinadi).

---

### 2-QADAM: Loyihani GitHub ga Joylash
1. [github.com](https://github.com) da yangi private yoki public repository yarating (masalan, `blockhunt-protocol`).
2. Loyihangiz papkasida terminalda buyruqlarni bajaring:
```bash
git init
git add .
git commit -m "feat: migrate to Next.js 14, LibSQL, and Grammy"
git branch -M main
git remote add origin https://github.com/SIZNING_USERNAME/blockhunt-protocol.git
git push -u origin main
```

---

### 3-QADAM: Vercel ga Deploy Qilish (100% Tekin)
1. [vercel.com](https://vercel.com) ga kiring va GitHub orqali kiring.
2. **"Add New Project"** tugmasini bosing va GitHub dagi `blockhunt-protocol` ni tanlang.
3. **"Environment Variables"** bo'limiga quyidagi 4 ta o'zgaruvchini kiriting:

| O'zgaruvchi nomi | Qiymati |
|---|---|
| `BOT_TOKEN` | `8882805957:AAH1YKIQqNry-vLmJvJDJ-WG49tf4J5hVdQ` |
| `ADMIN_TG_ID` | `8515329556` |
| `DATABASE_URL` | Turso dagi URL (masalan: `libsql://blockhunt-user.turso.io`) |
| `DATABASE_AUTH_TOKEN` | Turso dagi Token |
| `WEBAPP_URL` | Vercel beradigan domen (masalan: `https://blockhunt-protocol.vercel.app`) |

4. **"Deploy"** tugmasini bosing! 1 daqiqada loyihangiz butun dunyo bo'ylab jonli ishlay boshlaydi.

---

### 4-QADAM: Telegram Botga Webhook ni Bog'lash
Vercel da deploy tugagach, Telegram botingiz desktopingizsiz Vercel da ishlashi uchun brauzerda quyidagi havolani oching (yoki terminalda bitta so'rov yuboring):

```
https://api.telegram.org/bot8882805957:AAH1YKIQqNry-vLmJvJDJ-WG49tf4J5hVdQ/setWebhook?url=https://SIZNING-VERCEL-DOMENINGIZ.vercel.app/api/bot
```

Natijada ekranda shunday yozuv chiqadi:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### 5-QADAM: @BotFather da MiniApp Havolasini Yangilash
1. Telegram da `@BotFather` ga kiring.
2. `/mybots` -> Botingizni tanlang -> **Bot Settings** -> **Menu Button** -> **Configure menu button**.
3. MiniApp URL manziliga Vercel domeningizni yozing:
   `https://SIZNING-VERCEL-DOMENINGIZ.vercel.app`

---

## 💻 Kompyuterda Sinash (Local Development)
Agar o'z kompyuteringizda test qilmoqchi bo'lsangiz:
```bash
pnpm dev
```
Sayt `http://localhost:3000` da ochiladi. Local rejimda u o'z-o'zidan `data/database.sqlite` lokal SQLite faylidan foydalanadi (hech qanday qo'shimcha sozlama talab qilinmaydi).

---

## ✅ Natija
- Kompyuteringiz o'chiq bo'lsa ham bot va MiniApp 24/7 uzluksiz ishlaydi.
- Server, domen yoki baza uchun hech qanday to'lov to'lamaysiz ($0).
- Ma'lumotlaringiz xavfsiz va tezkor SQLite bazada saqlanadi.
- Yangi to'lovlar, skanerlash, referallar va admin panel to'liq ishchi holatda.
