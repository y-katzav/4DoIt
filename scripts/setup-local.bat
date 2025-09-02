@echo off
REM 4DoIt Local Setup Script for Windows
REM התקנה מהירה על Windows

echo 🚀 התקנת 4DoIt לוקלית על Windows...
echo.

REM בדיקת Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js לא מותקן. אנא התקן Node.js 18+ מ-https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js מותקן: 
node --version

REM בדיקת Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git לא מותקן. אנא התקן Git מ-https://git-scm.com
    pause
    exit /b 1
)

echo ✅ Git מותקן

REM התקנת dependencies
echo.
echo 📦 מתקין dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ התקנת dependencies נכשלה
    pause
    exit /b 1
)

echo ✅ Dependencies הותקנו בהצלחה

REM יצירת .env.local אם לא קיים
if not exist .env.local (
    echo.
    echo 🔧 יוצר .env.local...
    copy .env.example .env.local >nul
    echo ✅ .env.local נוצר מ-.env.example
    echo.
    echo ⚠️  חשוב: ערוך את .env.local עם הנתונים שלך:
    echo    - Firebase credentials
    echo    - PayPal credentials
    echo.
) else (
    echo ✅ .env.local כבר קיים
)

REM הרצת בדיקת מערכת
echo.
echo 🔍 בודק קונפיגורציה...
npm run check-system

echo.
echo 🎉 ההתקנה הושלמה!
echo.
echo צעדים הבאים:
echo 1. ערוך את .env.local עם הנתונים שלך
echo 2. הרץ: npm run create-paypal-plans (אם נדרש)
echo 3. הרץ: npm run dev
echo 4. פתח: http://localhost:3000
echo.
echo 📚 עזרה נוספת: LOCAL_SETUP.md
echo.
pause
