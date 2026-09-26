import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login & Account Access | Abdullah Bakheet',
  description: 'Sign in to your Abdullah Bakheet B2B wholesale account to manage orders, invoices, and RFQ quotations.',
  alternates: {
    canonical: '/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
