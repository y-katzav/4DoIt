import type {Metadata} from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import './rtl.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/components/auth-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { I18nProvider } from '@/components/i18n-provider';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

export const metadata: Metadata = {
  title: 'TaskFlow',
  description: 'A web application for task management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Suppress PayPal RUM errors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress PayPal RUM 404 errors
              const originalConsoleError = console.error;
              console.error = function(...args) {
                const message = args.join(' ');
                if (message.includes('paypalobjects.com') || 
                    message.includes('cdn-cgi/rum') ||
                    message.includes('404 (Not Found)') && message.includes('paypal')) {
                  return; // Suppress PayPal RUM errors
                }
                originalConsoleError.apply(console, args);
              };
              
              // Also suppress network errors for PayPal RUM
              window.addEventListener('error', function(e) {
                if (e.message && e.message.includes('paypalobjects.com')) {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }
              });
            `,
          }}
        />
      </head>
      <body className={cn("font-body antialiased", ptSans.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <I18nProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </I18nProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
