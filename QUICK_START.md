# 🚀 התקנה מהירה - 4DoIt Local

## ⚠️ חשוב: זה להרצה על המחשב שלך!

**🏠 הפקודות למטה צריכות לרוץ בטרמינל של המחשב המקומי שלך, לא ב-Codespaces!**

## התקנה ב-3 שלבים:

### 1️⃣ שכפול והתקנה
**פתח טרמינל על המחשב שלך:**

#### Windows (PowerShell/CMD):
```cmd
cd C:\Users\YourName\Projects  # בחר תיקייה
git clone https://github.com/y-katzav/4DoIt.git
cd 4DoIt
git checkout google-signin
scripts\setup-local.bat
```

#### Windows (Git Bash):
```bash
cd /c/Users/YourName/Projects  # בחר תיקייה
git clone https://github.com/y-katzav/4DoIt.git
cd 4DoIt
git checkout google-signin
./scripts/setup-local.sh
```

#### Mac/Linux:
```bash
cd ~/Projects  # בחר תיקייה
git clone https://github.com/y-katzav/4DoIt.git
cd 4DoIt
git checkout google-signin
npm install
```

### 2️⃣ הגדרת קונפיגורציה
**🏠 עדיין בטרמינל של המחשב שלך:**

#### Windows (CMD/PowerShell):
```cmd
copy .env.example .env.local
```

#### Windows (Git Bash) / Mac / Linux:
```bash
cp .env.example .env.local
```

**🔧 ערוך את .env.local עם הנתונים שלך** (פתח בכל עורך טקסט)

### 3️⃣ הרצה
**עדיין בטרמינל של המחשב שלך:**
```bash
npm run dev
```

🎉 פתח בדפדפן: `http://localhost:3000` **על המחשב שלך!**

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
