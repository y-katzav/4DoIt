# 4DoIt - Task Management & Collaboration Platform

An AI-powered task management application with team collaboration features and subscription-based pricing tiers.

## 🚀 Features

### Core Features (All Plans)
- ✅ Task management with due dates and priorities
- 📁 Organized categories and boards
- 👥 Basic team collaboration
- 📱 Responsive design
- 🌙 Dark/Light mode
- 🌍 Multi-language support (English/Hebrew)

### AI-Powered Features (Pro+)
- 🤖 AI task generation from natural language
- 📝 Smart task categorization
- 💡 Intelligent task suggestions

### Advanced Features (Business+)
- 📊 Analytics and reporting
- 👑 Advanced permissions
- 🎯 Priority support
- 📈 Usage insights

### Enterprise Features
- 🔐 Single Sign-On (SSO)
- 🔗 Custom integrations
- 👨‍💼 Dedicated support
- 🏢 Enterprise-grade security

## 💰 Pricing Tiers

### Free Plan
- ✅ Up to 10 tasks
- ✅ 1 board
- ✅ Personal use
- ✅ Basic export (CSV)

### Pro Plan - $8/month
- ✅ Unlimited tasks
- ✅ Up to 5 boards
- ✅ Up to 5 collaborators per board
- ✅ AI task creation
- ✅ Advanced export (Excel)
- ✅ Custom categories

### Business Plan - $20/month
- ✅ Unlimited tasks & boards
- ✅ Up to 20 collaborators per board
- ✅ Analytics & reporting
- ✅ Advanced permissions
- ✅ Priority support

### Enterprise Plan - $50/month
- ✅ Everything in Business
- ✅ Unlimited collaborators
- ✅ SSO integration
- ✅ Custom integrations
- ✅ Dedicated support

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Component library
- **Lucide React** - Icons

### Backend & Database
- **Firebase** - Authentication & Firestore
- **PayPal Subscriptions API** - Payment processing (replaces Stripe)
- **Vercel** - Hosting & deployment

### AI Integration
- **Google Genkit** - AI framework
- **Custom AI flows** - Task generation

### Development
- **Local Development** - Recommended for full control and PayPal testing
- **GitHub Codespaces** - Cloud development (with iframe limitations for PayPal)

## 📦 Installation

### 🚀 Quick Local Setup
```bash
# Clone and run locally (recommended for full control)
git clone https://github.com/y-katzav/4DoIt.git
cd 4DoIt
git checkout google-signin
./scripts/setup-local.sh
```

**📋 For detailed local setup:** See [LOCAL_SETUP.md](./LOCAL_SETUP.md)  
**⚡ For quick start:** See [QUICK_START.md](./QUICK_START.md)

### 🌐 Alternative: Codespaces
If you prefer cloud development:

1. Clone the repository:
```bash
git clone https://github.com/y-katzav/4DoIt.git
cd 4DoIt
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key

# PayPal Configuration (Sandbox)
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_WEBHOOK_ID=your_webhook_id

# PayPal Plan IDs (Create using: npm run create-paypal-plans)
PAYPAL_PRO_MONTHLY_PLAN_ID=P-XXXXXXXXXXXXXXX
PAYPAL_BUSINESS_MONTHLY_PLAN_ID=P-YYYYYYYYYYYYYYY
PAYPAL_ENTERPRISE_MONTHLY_PLAN_ID=P-ZZZZZZZZZZZZZZZ

# AI Configuration (Optional)
GOOGLE_GENAI_API_KEY=your_genai_api_key
```

5. Start the development server:
```bash
npm run dev
```

## 🔧 Configuration

### PayPal Setup (Replaces Stripe)
1. Create PayPal Developer account
2. Set up Sandbox App in "My Apps & Credentials"
3. Get Client ID and Client Secret
4. Create subscription plans using: `npm run create-paypal-plans`
5. Configure webhook endpoint: `/api/webhooks/paypal`

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication with Google provider
3. Set up Firestore database
4. Configure storage bucket
5. Download service account key

### AI Setup (Optional)
1. Get Google AI API key
2. Configure Genkit flows
3. Set up AI task generation

## 📱 Usage

### Getting Started
1. Sign up with Google account
2. Create your first board
3. Add tasks and categories
4. Invite team members (Pro+)
5. Use AI to generate tasks (Pro+)

### Subscription Management
- View current plan in Profile page
- Upgrade/downgrade in Billing page
- Manage payment methods
- Cancel subscription anytime

### Feature Gating
- Free users see upgrade prompts for premium features
- Limits are enforced automatically
- Smooth upgrade flow with Stripe

## 🔄 API Endpoints

### Authentication
- Handled by Firebase Auth
- Google OAuth integration

### Subscription Management
- `POST /api/create-checkout-session` - Create Stripe checkout
- `POST /api/webhooks/stripe` - Handle Stripe webhooks
- `POST /api/cancel-subscription` - Cancel subscription
- `POST /api/update-subscription` - Update subscription

### AI Features
- `POST /api/ai/create-tasks` - Generate tasks with AI
- `POST /api/ai/suggest-category` - Suggest task category

## 🧪 Testing

### System Check
```bash
# Check configuration and dependencies
npm run check-system
```

### PayPal Testing
```bash
# Check PayPal configuration
npm run check-paypal

# Create PayPal subscription plans
npm run create-paypal-plans

# Test PayPal locally (no iframe restrictions)
# Visit: http://localhost:3000/paypal-test
```

### Development
```bash
# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm start
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- 📧 Email: support@4doit.com
- 💬 Discord: [Join our community](https://discord.gg/4doit)
- 📚 Documentation: [docs.4doit.com](https://docs.4doit.com)

## 🗺️ Roadmap

### Q1 2025
- [ ] Mobile app (React Native)
- [ ] Slack integration
- [ ] Calendar sync

### Q2 2025
- [ ] Time tracking
- [ ] Project templates
- [ ] Advanced analytics

### Q3 2025
- [ ] API for third-party integrations
- [ ] White-label solutions
- [ ] Advanced AI features

---

Made with ❤️ by the 4DoIt team
