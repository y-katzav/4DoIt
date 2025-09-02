# 🚀 התקנה מהירה - 4DoIt Local

## התקנה ב-3 שלבים:

### 1️⃣ שכפול והתקנה
```bash
git clone https://github.com/y-katzav/4DoIt.git
cd 4DoIt
git checkout google-signin
npm install
```

### 2️⃣ הגדרת קונפיגורציה
```bash
cp .env.example .env.local
# ערוך את .env.local עם הנתונים שלך
```

### 3️⃣ הרצה
```bash
npm run dev
```

🎉 האפליקציה תהיה זמינה ב: `http://localhost:3000`

---

## 📋 רשימת בדיקות

- [ ] **Firebase**: התחברות עם Google עובדת
- [ ] **PayPal**: כפתורי תשלום מופיעים
- [ ] **AI**: יצירת משימות עם AI (אופציונלי)
- [ ] **Local**: אין בעיות iframe/cookies

---

## 🔧 פקודות שימושיות

```bash
# יצירת PayPal plans
npm run create-paypal-plans

# בדיקת PayPal status
npm run check-paypal

# בדיקת types
npm run typecheck
```

---

## 📚 מסמכים מלאים
- [LOCAL_SETUP.md](./LOCAL_SETUP.md) - הוראות מפורטות
- [README.md](./README.md) - תיעוד מלא

---

## 🆘 בעיות נפוצות

### Firebase Error
```bash
# בדוק ש-.env.local מכיל את כל משתני Firebase
```

### PayPal Error
```bash
# בדוק PayPal credentials ו-plan IDs
npm run check-paypal
```

### Missing Plans
```bash
# צור PayPal plans
npm run create-paypal-plans
```

---

**יש בעיה?** פתח Issue או בדוק את [LOCAL_SETUP.md](./LOCAL_SETUP.md)
