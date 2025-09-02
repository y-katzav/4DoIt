# 🪟 Windows Setup - 4DoIt

## התקנה פשוטה על Windows

### ✅ דרישות:
- Node.js 18+ ([הורד כאן](https://nodejs.org))
- Git ([הורד כאן](https://git-scm.com))

### 🚀 התקנה ב-5 שלבים:

#### 1. פתח PowerShell או CMD
```cmd
Windows + R → cmd → Enter
```

#### 2. נווט לתיקייה
```cmd
cd C:\Users\YourName\Desktop
```

#### 3. שכפל את הפרויקט
```cmd
git clone https://github.com/y-katzav/4DoIt.git
cd 4DoIt
git checkout google-signin
```

#### 4. התקן
```cmd
npm install
copy .env.example .env.local
```

#### 5. הרץ
```cmd
npm run dev
```

### 🎯 פתח בדפדפן:
```
http://localhost:3000
```

---

## ⚠️ בעיות נפוצות:

### "cp is not recognized"
```cmd
# השתמש ב:
copy .env.example .env.local
```

### "The system cannot find the file"
```cmd
# וודא שאתה בתיקיית הפרויקט:
cd 4DoIt
dir
```

### Node.js לא מותקן
- הורד מ-[nodejs.org](https://nodejs.org)
- בחר LTS version
- התקן ו-restart המחשב

---

## 📚 מסמכים נוספים:
- [LOCAL_SETUP.md](./LOCAL_SETUP.md) - מדריך מפורט
- [QUICK_START.md](./QUICK_START.md) - התקנה מהירה
