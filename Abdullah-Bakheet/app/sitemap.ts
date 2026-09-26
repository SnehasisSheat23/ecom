import { MetadataRoute } from 'next';
import { fetchProductsApi, fetchCategories } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://abdullahbakheet.com';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/terms-and-conditions`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/cookie-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteUrl}/track-order`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const productsData = await fetchProductsApi({ limit: 500 });
    if (productsData?.items && Array.isArray(productsData.items)) {
      productRoutes = productsData.items.map((prod) => ({
        url: `${siteUrl}/products/${prod.slug || prod.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
    }
  } catch (err) {
    console.error('Error fetching products for sitemap:', err);
  }

  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const categoriesData = await fetchCategories();
    if (categoriesData && Array.isArray(categoriesData)) {
      categoryRoutes = categoriesData.map((cat) => ({
        url: `${siteUrl}/category/${cat.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
    }
  } catch (err) {
    console.error('Error fetching categories for sitemap:', err);
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
