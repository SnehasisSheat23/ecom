import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products & Food Catalog | B2B & Wholesale Supply',
  description:
    'Browse our comprehensive catalog of 300+ food products, including Green Park olives, ketchup, condiments, frozen foods, spices, and HORECA essentials in Saudi Arabia.',
  alternates: {
    canonical: '/products',
  },
  openGraph: {
    title: 'Product Catalog | Abdullah Bakheet Trading Co.',
    description:
      'Explore 300+ premium FMCG and wholesale food products available with fast delivery across Riyadh and Saudi Arabia.',
    url: '/products',
  },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
