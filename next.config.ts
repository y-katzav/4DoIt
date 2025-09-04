import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Fix for Server Actions in development with forwarded headers
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3001', 'scaling-carnival-jrq67rqp4vjf56j9-3000.app.github.dev', 'scaling-carnival-jrq67rqp4vjf56j9-3001.app.github.dev'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "img-src 'self' data: blob: https:",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.paypal.com https://www.sandbox.paypal.com https://js.paypal.com https://www.facebook.com https://connect.facebook.net",
              "connect-src 'self' https://www.paypal.com https://api.paypal.com https://www.sandbox.paypal.com https://api.sandbox.paypal.com https://www.facebook.com https://graph.facebook.com",
              "frame-src 'self' https://www.paypal.com https://www.sandbox.paypal.com https://js.paypal.com https://www.facebook.com"
            ].join('; ')
          }
        ],
      },
    ]
  },
};

export default nextConfig;
