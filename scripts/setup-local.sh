#!/bin/bash

# 4DoIt Local Setup Script
# התקנה מהירה על המחשב המקומי

echo "🚀 התקנת 4DoIt לוקלית..."
echo ""

# בדיקת Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js לא מותקן. אנא התקן Node.js 18+ מ-https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ נדרש Node.js 18+. גרסה נוכחית: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) מותקן"

# בדיקת Git
if ! command -v git &> /dev/null; then
    echo "❌ Git לא מותקן"
    exit 1
fi

echo "✅ Git מותקן"

# התקנת dependencies
echo ""
echo "📦 מתקין dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ התקנת dependencies נכשלה"
    exit 1
fi

echo "✅ Dependencies הותקנו בהצלחה"

# יצירת .env.local אם לא קיים
if [ ! -f .env.local ]; then
    echo ""
    echo "🔧 יוצר .env.local..."
    cp .env.example .env.local
    echo "✅ .env.local נוצר מ-.env.example"
    echo ""
    echo "⚠️  חשוב: ערוך את .env.local עם הנתונים שלך:"
    echo "   - Firebase credentials"
    echo "   - PayPal credentials"
    echo ""
else
    echo "✅ .env.local כבר קיים"
fi

# הרצת בדיקת מערכת
echo ""
echo "🔍 בודק קונפיגורציה..."
npm run check-system

echo ""
echo "🎉 ההתקנה הושלמה!"
echo ""
echo "צעדים הבאים:"
echo "1. ערוך את .env.local עם הנתונים שלך"
echo "2. הרץ: npm run create-paypal-plans (אם נדרש)"
echo "3. הרץ: npm run dev"
echo "4. פתח: http://localhost:3000"
echo ""
echo "📚 עזרה נוספת: LOCAL_SETUP.md"
