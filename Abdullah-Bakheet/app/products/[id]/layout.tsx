import type { Metadata } from 'next';
import { fetchProductBySlug } from '@/lib/api';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://abdullahbakheet.com';

  try {
    const product = await fetchProductBySlug(id, 'SAR', 'en');
    if (product) {
      const title = `${product.title} ${product.size ? `(${product.size})` : ''} | Abdullah Bakheet`;
      const description =
        product.description ||
        `Buy ${product.title} at wholesale prices in Saudi Arabia. Premium ${product.category} supplied by Abdullah Bakheet Trading Co.`;
      const imageUrl = product.img?.startsWith('http') ? product.img : `${siteUrl}${product.img || '/images/logo.png'}`;

      return {
        title,
        description,
        alternates: {
          canonical: `/products/${product.slug || id}`,
        },
        openGraph: {
          title,
          description,
          url: `/products/${product.slug || id}`,
          images: [
            {
              url: imageUrl,
              alt: product.title,
            },
          ],
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: [imageUrl],
        },
      };
    }
  } catch (err) {
    console.error('Error generating product metadata:', err);
  }

  const fallbackTitle = id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${fallbackTitle} | Abdullah Bakheet`,
    description: `Order ${fallbackTitle} online with fast delivery across Saudi Arabia from Abdullah Bakheet Trading Co.`,
    alternates: {
      canonical: `/products/${id}`,
    },
  };
}

export default async function ProductDetailLayout({ params, children }: Props) {
  const resolvedParams = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://abdullahbakheet.com';

  let productJsonLd: any = null;
  try {
    const product = await fetchProductBySlug(resolvedParams.id, 'SAR', 'en');
    if (product) {
      productJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        image: product.img ? [product.img.startsWith('http') ? product.img : `${siteUrl}${product.img}`] : [],
        description: product.description || `Premium ${product.title} supplied by Abdullah Bakheet Trading Co.`,
        sku: product.id,
        brand: {
          '@type': 'Brand',
          name: product.category === 'GREEN PARK' ? 'Green Park' : 'Abdullah Bakheet',
        },
        offers: {
          '@type': 'Offer',
          url: `${siteUrl}/products/${product.slug || resolvedParams.id}`,
          priceCurrency: 'SAR',
          price: product.price || 0,
          availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: 'Abdullah Bakheet Trading Co.',
          },
        },
      };
    }
  } catch {
    // Graceful fallback
  }

  return (
    <>
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      {children}
    </>
  );
}
