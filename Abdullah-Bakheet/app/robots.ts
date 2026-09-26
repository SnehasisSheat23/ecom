import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://abdullahbakheet.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account',
          '/account/*',
          '/cart',
          '/checkout',
          '/track-order/*',
          '/quotations/*',
          '/orders/*',
          '/api/*',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/account',
          '/account/*',
          '/cart',
          '/checkout',
          '/track-order/*',
          '/quotations/*',
          '/orders/*',
          '/api/*',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
