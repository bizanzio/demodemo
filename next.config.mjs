import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Comentem typedRoutes per compatibilitat amb Turbopack
  // experimental: {
  //   typedRoutes: true,
  // },
  // Configuració per a producció (comentat per desenvolupament)
  // output: "standalone",
  // Optimitzacions d'imatges
  images: {
    formats: ["image/webp", "image/avif"],
  },
  // Headers de seguretat
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // HSTS - Forçar HTTPS durant 1 any, incloent subdominis
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // CSP - Política de seguretat de contingut
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self' https://www.google.com",
              "frame-src https://www.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          // Evitar clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Evitar MIME-type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Controlar informació enviada en Referer
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Restringir funcionalitats del navegador
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Protecció XSS legacy (navegadors antics)
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Evitar caching de dades sensibles
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
