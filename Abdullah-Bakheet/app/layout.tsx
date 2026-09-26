// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Outfit } from 'next/font/google';
import './globals.css';

import { ShopProvider } from '@/context/ShopContext';
import { cn } from '@/lib/utils';
import LayoutWrapper from '@/components/LayoutWrapper';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const fiorello = localFont({
  src: '../public/fonts/fiorello-cg-condensed-regular-opentype_ufonts.com.otf',
  variable: '--font-heading',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://abdullahbakheet.com';

export const viewport: Viewport = {
  themeColor: '#1a2b25',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Abdullah Bakheet Trading Co. | Premium Food Importer & Distributor Saudi Arabia',
    template: '%s | Abdullah Bakheet Trading Co.',
  },
  description:
    'Abdullah Bakheet Trading Co. (مؤسسة عبدالله بخيت التجارية) is the premier FMCG and food distributor in Saudi Arabia, providing top-tier food products to HORECA, restaurants, hotels, wholesalers, and supermarkets across Riyadh, Jeddah, Dammam, and KSA.',
  keywords: [
    'Abdullah Bakheet',
    'Food distributor Saudi Arabia',
    'مؤسسة عبدالله بخيت التجارية',
    'FMCG distributor Riyadh',
    'HORECA supplier KSA',
    'Food importer Saudi Arabia',
    'Green Park food products',
    'Wholesale food supply Saudi Arabia',
    'B2B food distribution Riyadh',
    'Saudi food supplier',
  ],
  authors: [{ name: 'Abdullah Bakheet Trading Establishment' }],
  creator: 'Abdullah Bakheet Trading Co.',
  publisher: 'Abdullah Bakheet Trading Co.',
  formatDetection: {
    email: true,
    address: true,
    telephone: true,
  },
  alternates: {
    canonical: '/',
    languages: {
      'en-SA': '/en',
      'ar-SA': '/ar',
    },
  },
  openGraph: {
    title: 'Abdullah Bakheet Trading Co. | Premium Food Importer & Distributor Saudi Arabia',
    description:
      'Premier FMCG and food distributor in Saudi Arabia. Supplying premium food brands, Green Park essentials, and culinary ingredients to HORECA and retail nationwide.',
    url: siteUrl,
    siteName: 'Abdullah Bakheet Trading Co.',
    locale: 'en_SA',
    alternateLocale: ['ar_SA'],
    type: 'website',
    images: [
      {
        url: '/images/Riyadh Skyline Sunset.png',
        width: 1200,
        height: 630,
        alt: 'Abdullah Bakheet Trading Co. - Riyadh, Saudi Arabia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Abdullah Bakheet Trading Co. | Premium Food Importer & Distributor',
    description:
      'Leading food and FMCG distributor across Saudi Arabia. Dedicated supplier to HORECA, supermarkets, and wholesale businesses.',
    images: ['/images/Riyadh Skyline Sunset.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
  category: 'Food & Beverage / Wholesale',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WholesaleStore',
    name: 'Abdullah Bakheet Trading Co.',
    alternateName: 'مؤسسة عبدالله بخيت التجارية',
    url: siteUrl,
    logo: `${siteUrl}/images/logo.png`,
    image: `${siteUrl}/images/Riyadh Skyline Sunset.png`,
    description:
      'Premier FMCG and food distributor in Saudi Arabia, providing premium food products to HORECA, restaurants, hotels, wholesalers, and supermarkets across KSA.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'King Fahd Road, Al Olaya',
      addressLocality: 'Riyadh',
      postalCode: '12211',
      addressCountry: 'SA',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 24.7136,
      longitude: 46.6753,
    },
    telephone: '+966-50-123-4567',
    priceRange: '$$',
    currenciesAccepted: 'SAR',
    paymentAccepted: 'Cash, Credit Card, Mada, Bank Transfer',
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        opens: '08:00',
        closes: '18:00',
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="preload" as="image" href="/images/hero_poster.jpg" fetchPriority="high" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={cn(outfit.variable, fiorello.variable, 'font-sans bg-brand-gray min-h-screen flex flex-col')}>
        <ShopProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </ShopProvider>
      </body>
    </html>
  );
}