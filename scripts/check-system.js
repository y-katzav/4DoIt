#!/usr/bin/env node

/**
 * System Check Script
 * בודק שכל הקונפיגורציה מוכנה להרצה לוקלית
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 בודק מערכת 4DoIt...\n');

// בדיקת Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
console.log(`📦 Node.js: ${nodeVersion} ${majorVersion >= 18 ? '✅' : '❌ נדרש 18+'}`);

// בדיקת .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envExists = fs.existsSync(envPath);
console.log(`🔧 .env.local: ${envExists ? '✅' : '❌ חסר - העתק מ-.env.example'}`);

if (envExists) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // בדיקת משתני Firebase
  const firebaseVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PRIVATE_KEY'
  ];
  
  console.log('\n🔥 Firebase Configuration:');
  firebaseVars.forEach(varName => {
    const hasVar = envContent.includes(varName) && !envContent.includes(`${varName}=your_`);
    console.log(`   ${varName}: ${hasVar ? '✅' : '❌'}`);
  });
  
  // בדיקת משתני PayPal
  const paypalVars = [
    'PAYPAL_CLIENT_ID',
    'NEXT_PUBLIC_PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET'
  ];
  
  console.log('\n💳 PayPal Configuration:');
  paypalVars.forEach(varName => {
    const hasVar = envContent.includes(varName) && !envContent.includes(`${varName}=your_`);
    console.log(`   ${varName}: ${hasVar ? '✅' : '❌'}`);
  });
  
  // בדיקת PayPal Plans
  const planVars = [
    'PAYPAL_PRO_MONTHLY_PLAN_ID',
    'PAYPAL_BUSINESS_MONTHLY_PLAN_ID',
    'PAYPAL_ENTERPRISE_MONTHLY_PLAN_ID'
  ];
  
  console.log('\n📋 PayPal Plans:');
  planVars.forEach(varName => {
    const hasVar = envContent.includes(varName) && envContent.includes('P-') && !envContent.includes('P-xxxxxxxxx');
    console.log(`   ${varName}: ${hasVar ? '✅' : '❌'}`);
  });
}

// בדיקת package.json dependencies
const packagePath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const hasPayPal = packageJson.dependencies['@paypal/react-paypal-js'];
  const hasFirebase = packageJson.dependencies['firebase'];
  
  console.log('\n📦 Dependencies:');
  console.log(`   PayPal SDK: ${hasPayPal ? '✅' : '❌'}`);
  console.log(`   Firebase: ${hasFirebase ? '✅' : '❌'}`);
}

// בדיקת node_modules
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
const nodeModulesExists = fs.existsSync(nodeModulesPath);
console.log(`\n📁 node_modules: ${nodeModulesExists ? '✅' : '❌ הרץ npm install'}`);

console.log('\n' + '='.repeat(50));

if (envExists) {
  console.log('🎯 צעדים הבאים:');
  console.log('   1. npm run create-paypal-plans (אם Plans חסרים)');
  console.log('   2. npm run dev');
  console.log('   3. פתח http://localhost:3000');
} else {
  console.log('❌ עדיין חסר קונפיגורציה:');
  console.log('   1. cp .env.example .env.local');
  console.log('   2. ערוך את .env.local');
  console.log('   3. הרץ npm run check-system שוב');
}

console.log('\n📚 עזרה: LOCAL_SETUP.md');
