import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Abdullah Bakheet',
  description:
    'Privacy Policy outlining how Abdullah Bakheet Trading Co. protects customer and business data in compliance with Saudi Personal Data Protection Law (PDPL).',
  alternates: {
    canonical: '/privacy-policy',
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
