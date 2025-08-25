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
};

export default nextConfig;
