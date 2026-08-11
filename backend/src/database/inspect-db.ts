import { getPool } from '../lib/db.js'

async function inspect() {
  const pool = getPool()
  try {
    const { rows: products } = await pool.query('SELECT id, title, slug, tenant_id, partner_id, catalog_type, status, approval_status FROM products')
    console.log('--- PRODUCTS IN DB ---')
    console.dir(products, { depth: null })

    const { rows: images } = await pool.query('SELECT id, product_id, media_id FROM product_images')
    console.log('--- PRODUCT IMAGES IN DB ---')
    console.dir(images, { depth: null })

    const { rows: media } = await pool.query('SELECT id, url, filename, tenant_id FROM media_assets')
    console.log('--- MEDIA ASSETS IN DB ---')
    console.dir(media, { depth: null })

    const { rows: tenants } = await pool.query('SELECT id, name, slug, custom_domain FROM tenants')
    console.log('--- TENANTS IN DB ---')
    console.dir(tenants, { depth: null })
  } catch (error) {
    console.error('Inspection failed:', error)
  } finally {
    await pool.end()
  }
}

inspect()
