import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Your Order | Abdullah Bakheet Logistics',
  description: 'Track the real-time shipping and delivery status of your food supply order across Saudi Arabia.',
  alternates: {
    canonical: '/track-order',
  },
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
