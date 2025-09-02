# הגדרה לוקלית של 4DoIt על המחשב שלך

## ⚠️ חשוב לקרוא לפני התחלה!

**המדריך הזה מיועד להרצה על המחשב המקומי שלך, לא ב-GitHub Codespaces!**

🏠 **איפה להריץ:** במסוף/טרמינל של המחשב שלך (Windows/Mac/Linux)  
🚫 **לא להריץ:** ב-Codespaces browser terminal  

## למה להריץ לוקלית?
- 🚫 ללא מגבלות iframe/cookies של Codespaces
- ⚡ ביצועים מהירים יותר
- 🔒 שליטה מלאה על הסביבה
- 🧪 בדיקת PayPal ללא בעיות CORS

## דרישות מערכת
- Node.js 18+ 
- npm או yarn
- Git
- דפדפן מודרני (Chrome, Firefox, Safari, Edge)

## שלבי ההתקנה

### 1. שכפול הפרויקט
**🏠 בטרמינל של המחשב שלך (לא ב-Codespaces!):**

#### Windows (PowerShell/CMD):
```cmd
# נווט לתיקייה שבה אתה רוצה לשמור את הפרויקט
cd C:\Users\YourName\Projects  # או כל תיקייה אחרת

# שכפל את הפרויקט
git clone https://github.com/y-katzav/4DoIt.git
cd 4DoIt

# עבור לענף הנוכחי (google-signin)
git checkout google-signin

# הרץ התקנה אוטומטית לWindows (אחרי שהקבצים הורדו!)
scripts\setup-local.bat
```

**אם הסקריפט לא נמצא:** הרץ ידנית:
```cmd
npm install
copy .env.example .env.local
npm run check-system
```

#### Windows (Git Bash):
```bash
# נווט לתיקייה שבה אתה רוצה לשמור את הפרויקט
cd /c/Users/YourName/Projects  # או כל תיקייה אחרת

# שכפל את הפרויקט
git clone https://github.com/y-katzav/4DoIt.git
cd 4DoIt

# עבור לענף הנוכחי (google-signin)
git checkout google-signin

# הרץ התקנה אוטומטית
./scripts/setup-local.sh
```

#### Mac/Linux:
```bash
# פתח Terminal
# נווט לתיקייה שבה אתה רוצה לשמור את הפרויקט
cd ~/Projects  # או כל תיקייה אחרת

# שכפל את הפרויקט
git clone https://github.com/y-katzav/4DoIt.git
cd 4DoIt

# עבור לענף הנוכחי (google-signin)
git checkout google-signin
```

### 2. התקנת תלויות
**🏠 עדיין בטרמינל של המחשב שלך:**

```bash
# וודא שאתה בתיקיית הפרויקט
pwd  # צריך להראות משהו כמו: /path/to/4DoIt

# התקן את כל התלויות
npm install
```

**אם אין לך Node.js:**
- Windows: הורד מ-[nodejs.org](https://nodejs.org)
- Mac: `brew install node` או מ-[nodejs.org](https://nodejs.org)
- Linux: `sudo apt install nodejs npm` או מ-[nodejs.org](https://nodejs.org)

### 3. הגדרת משתני סביבה
**🏠 עדיין בטרמינל של המחשב שלך:**

#### Windows (CMD/PowerShell):
```cmd
# העתק את קובץ הדוגמה
copy .env.example .env.local
```

#### Windows (Git Bash):
```bash
# אם אתה משתמש ב-Git Bash
cp .env.example .env.local
```

#### Mac/Linux:
```bash
cp .env.example .env.local
```

**לחלופין - ידנית:**
1. העתק את הקובץ `.env.example`
2. שנה את השם ל-`.env.local`
3. פתח את `.env.local` בעורך טקסט

ערוך את `.env.local` עם הנתונים שלך:

```env
# Firebase Configuration (חובה)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin (לצד השרת)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"

# PayPal Configuration (במקום Stripe)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_WEBHOOK_ID=your_webhook_id

# PayPal Plan IDs (ליצור דרך PayPal API)
PAYPAL_PRO_PLAN_ID=P-XXXXXXXXXXXXXXX
PAYPAL_BUSINESS_PLAN_ID=P-YYYYYYYYYYYYYYY
PAYPAL_ENTERPRISE_PLAN_ID=P-ZZZZZZZZZZZZZZZ

# AI Configuration (אופציונלי)
GOOGLE_GENAI_API_KEY=your_genai_api_key
```

### 4. הגדרת Firebase

#### צור פרויקט Firebase חדש:
1. עבור ל-[Firebase Console](https://console.firebase.google.com)
2. צור פרויקט חדש או השתמש בקיים
3. הפעל Authentication עם Google provider
4. הגדר Firestore Database
5. הגדר Storage (אופציונלי)

#### קבל את פרטי הקונפיגורציה:
1. Settings → Project settings → General
2. עבור לחלק "Your apps" ולחץ על Web app
3. העתק את הקונפיגורציה ל-`.env.local`

#### הגדר Service Account (לצד השרת):
1. Settings → Project settings → Service accounts
2. לחץ "Generate new private key"
3. העתק את הנתונים ל-`.env.local`

### 5. הגדרת PayPal Sandbox

#### צור חשבון PayPal Developer:
1. עבור ל-[PayPal Developer](https://developer.paypal.com)
2. התחבר או צור חשבון
3. עבור ל-"My Apps & Credentials"

#### צור Sandbox App:
1. לחץ "Create App"
2. בחר "Sandbox" environment
3. בחר "Default Application" או צור חדש
4. העתק Client ID ו-Client Secret

#### צור Test Plans (תוכניות מנוי):
הרץ את הסקריפט:
```bash
npm run create-paypal-plans
```

או צור באופן ידני דרך PayPal API.

### 6. הרצת השרת
**🏠 בטרמינל של המחשב שלך:**

```bash
# וודא שאתה בתיקיית הפרויקט
cd 4DoIt  # אם אתה לא שם כבר

# הרץ את השרת
npm run dev
```

האפליקציה תהיה זמינה ב: `http://localhost:3000`

**🔴 חשוב:** פתח בדפדפן **על המחשב שלך**, לא ב-Codespaces!

## בדיקת הפונקציונליות

### 1. בדיקת Authentication
- עבור ל-`http://localhost:3000`
- לחץ "התחבר עם Google"
- בדוק שההתחברות עובדת

### 2. בדיקת PayPal
- עבור ל-`http://localhost:3000/paypal-test`
- בדוק שכפתורי PayPal מופיעים
- נסה תהליך מנוי (עם חשבון sandbox)

### 3. בדיקת AI (אופציונלי)
- צור משימה חדשה
- השתמש ב-"יצירת משימות עם AI"
- בדוק שהיצירה עובדת

## פתרון בעיות נפוצות

### שגיאת Windows: "The system cannot find the file specified"
**הסיבה:** הקובץ לא קיים עדיין במחשב שלך.

**פתרון:**
```cmd
# וודא שאתה בתיקיית הפרויקט
cd 4DoIt
dir  # צריך להראות את התיקיות src, scripts וכו'

# אם אין תיקיית scripts - הרץ ידנית:
npm install
copy .env.example .env.local
```

### שגיאת 'cp' ב-Windows
**הסיבה:** `cp` זו פקודת Linux/Mac.

**פתרון Windows:**
```cmd
copy .env.example .env.local
```

### שגיאת Firebase
```
Firebase configuration error
```
**פתרון:** בדוק ש-`.env.local` מכיל את כל משתני Firebase הנדרשים.

### שגיאת PayPal
```
PayPal client configuration error
```
**פתרון:** בדוק ש-PAYPAL_CLIENT_ID ו-PAYPAL_CLIENT_SECRET נכונים.

### שגיאת Plans
```
Plan ID not found
```
**פתרון:** הרץ `npm run create-paypal-plans` או צור plans ידנית.

## יתרונות הרצה לוקלית

### ✅ PayPal
- ללא בעיות iframe/cookies
- debugging קל יותר
- ביצועים מהירים

### ✅ Firebase
- חיבור ישיר ללא proxy
- מהירות גישה לנתונים
- ללא מגבלות Codespaces

### ✅ פיתוח
- Hot reload מהיר
- דיבוג קל עם dev tools
- שליטה מלאה על הסביבה

## פקודות שימושיות

```bash
# הרצת שרת פיתוח
npm run dev

# בניית האפליקציה לפרודקציה
npm run build

# הרצת שרת פרודקציה
npm start

# בדיקת types
npm run type-check

# יצירת PayPal plans
npm run create-paypal-plans

# בדיקת PayPal status
curl http://localhost:3000/api/paypal-status
```

## הגדרת Webhooks (לפרודקציה)

כשתרצה לעלות לפרודקציה:

1. הגדר webhook ב-PayPal Developer Console
2. הצביע על: `https://your-domain.com/api/webhooks/paypal`
3. בחר את האירועים הרלוונטיים
4. העתק את Webhook ID ל-`.env.local`

---

**זה הכל!** עכשיו תוכל להריץ את האפליקציה לוקלית ללא מגבלות והגבלות של Codespaces.
