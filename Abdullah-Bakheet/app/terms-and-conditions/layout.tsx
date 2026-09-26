import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Abdullah Bakheet',
  description:
    'Terms and conditions governing orders, commercial deliveries, wholesale contracts, and account usage with Abdullah Bakheet Trading Co. in Saudi Arabia.',
  alternates: {
    canonical: '/terms-and-conditions',
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
