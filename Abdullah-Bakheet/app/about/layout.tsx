import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | Our Story & Heritage',
  description:
    'Learn about Abdullah Bakheet Trading Co. (مؤسسة عبدالله بخيت التجارية), a trusted food and FMCG distributor in Saudi Arabia with over 20 years of supply chain excellence.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Abdullah Bakheet Trading Co. | Food Distribution in Saudi Arabia',
    description:
      'With over two decades of industry expertise, Abdullah Bakheet Trading Co. connects top global food manufacturers and Green Park essentials with the Saudi market.',
    url: '/about',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
