import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | Wholesale Inquiry & Support',
  description:
    'Get in touch with Abdullah Bakheet Trading Co. in Riyadh, Saudi Arabia for bulk FMCG inquiries, quotation requests, supplier partnerships, and customer support.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Abdullah Bakheet Trading Co. | Riyadh, Saudi Arabia',
    description: 'Get in touch for wholesale food distribution, RFQ quotes, and HORECA supply partnership.',
    url: '/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
