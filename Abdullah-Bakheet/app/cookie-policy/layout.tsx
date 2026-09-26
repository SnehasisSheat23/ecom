import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy | Abdullah Bakheet',
  description:
    'Information regarding cookie usage and tracking technologies on the Abdullah Bakheet Trading Co. platform.',
  alternates: {
    canonical: '/cookie-policy',
  },
};

export default function CookieLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
