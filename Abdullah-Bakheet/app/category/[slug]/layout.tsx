import type { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug || 'category';
  const categoryTitle = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${categoryTitle} Food Products | Abdullah Bakheet`,
    description: `Discover wholesale ${categoryTitle} products in Saudi Arabia. Top-grade food items and bulk supplies from Abdullah Bakheet Trading Co.`,
    alternates: {
      canonical: `/category/${slug}`,
    },
    openGraph: {
      title: `${categoryTitle} | Abdullah Bakheet Trading Co.`,
      description: `Wholesale and B2B ${categoryTitle} food supply in Saudi Arabia.`,
      url: `/category/${slug}`,
    },
  };
}

export default function CategoryLayout({ children }: Props) {
  return <>{children}</>;
}
