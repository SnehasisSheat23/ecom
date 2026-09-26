import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Registration & B2B Account | Abdullah Bakheet',
  description:
    'Register for a corporate or retail wholesale account with Abdullah Bakheet Trading Co. to access special B2B pricing, credit terms, and catalog ordering in Saudi Arabia.',
  alternates: {
    canonical: '/register',
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
