import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, sql } from 'drizzle-orm'
import { tenants, tenantConfig } from '../layers/tenancy/tenancy.schema.js'
import { users, userRoles } from '../modules/users/users.schema.js'
import { customers } from '../modules/customers/customers.schema.js'
import { categories } from '../modules/categories/categories.schema.js'
import { partners } from '../modules/partner/partner.schema.js'
import { products, variants, productCategories } from '../modules/catalog/catalog.schema.js'
import { inventory } from '../modules/inventory/inventory.schema.js'
import { getPool } from '../lib/db.js'
import { hashPassword } from '../lib/crypto.js'

async function bootstrap() {
  const pool = getPool()
  const db = drizzle({ client: pool })

  const TENANT_NAME = 'Abdullah Bakheet'
  const TENANT_SLUG = 'abdullah-bakheet'
  const ADMIN_EMAIL = 'admin@abdullahbakheet.com'
  const PASSWORD = 'Password123!'

  console.log(`🚀 Seeding Abdullah Bakheet Normal E-Commerce Environment...`)

  try {
    const hashedPassword = await hashPassword(PASSWORD)

    // 1. Upsert Tenant
    let [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, TENANT_SLUG))

    if (!tenant) {
      ;[tenant] = await db
        .insert(tenants)
        .values({
          name: TENANT_NAME,
          slug: TENANT_SLUG,
          mode: 'SINGLE_VENDOR',
          status: 'active',
          businessType: 'ECOMMERCE',
          currency: 'SAR',
          timezone: 'Asia/Riyadh',
          features: {
            wishlist: true,
            loyalty: true,
            reviews: true,
            cart_abandonment: true,
          },
          branding: {
            primary_color: '#0f172a',
            secondary_color: '#38bdf8',
            logo_url: null,
            favicon_url: null,
            font: 'Inter',
          },
          notificationConfig: {
            from_name: 'Abdullah Bakheet',
            from_email: 'noreply@abdullahbakheet.com',
          },
        })
        .returning()
      console.log(`✅ Created Tenant: ${tenant.name} (${tenant.id})`)
    } else {
      console.log(`ℹ️ Tenant already exists: ${tenant.name} (${tenant.id})`)
    }

    // 2. Tenant Config (Shipping & Rules)
    const [existingConfig] = await db
      .select()
      .from(tenantConfig)
      .where(eq(tenantConfig.tenantId, tenant.id))

    if (!existingConfig) {
      await db.insert(tenantConfig).values({
        tenantId: tenant.id,
        shippingFlatRate: 1500, // 15.00 SAR
        freeShippingThreshold: 20000, // Free shipping over 200.00 SAR
        shippingStrategy: 'flat_rate',
        returnWindowDays: 7,
      })
      console.log(`✅ Configured default tenant shipping & policies`)
    }

    // 3. Admin User (Users table for Admin Panel)
    const [existingUser] = await db
      .select()
      .from(users)
      .where(sql`${users.tenantId} = ${tenant.id} AND ${users.email} = ${ADMIN_EMAIL}`)

    let userId: string
    if (existingUser) {
      userId = existingUser.id
      await db
        .update(users)
        .set({ passwordHash: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, userId))
      console.log(`✅ Updated existing Admin user password (${ADMIN_EMAIL})`)
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          name: 'Abdullah Bakheet Admin',
          email: ADMIN_EMAIL,
          passwordHash: hashedPassword,
          firstName: 'Abdullah',
          lastName: 'Bakheet',
          emailVerified: true,
        })
        .returning()
      userId = newUser.id
      console.log(`✅ Created Admin user (${ADMIN_EMAIL})`)
    }

    // 4. Assign Admin Roles
    const [existingRole] = await db
      .select()
      .from(userRoles)
      .where(sql`${userRoles.tenantId} = ${tenant.id} AND ${userRoles.userId} = ${userId}`)

    if (!existingRole) {
      await db.insert(userRoles).values({
        tenantId: tenant.id,
        userId,
        role: 'TENANT_ADMIN',
      })
      console.log(`✅ Assigned TENANT_ADMIN role to user`)
    }

    // 5. Clean up admin from customers table (admins belong in users, not customers)
    await db
      .delete(customers)
      .where(sql`${customers.tenantId} = ${tenant.id} AND ${customers.email} = ${ADMIN_EMAIL}`)
    console.log(`✅ Ensured admin account is excluded from store customers directory`)

    // 6. Seed Categories
    const categoryList = [
      { name: 'Ketchup', slug: 'ketchup' },
      { name: 'Vinegar', slug: 'vinegar' },
      { name: 'Pickles', slug: 'pickles' },
      { name: 'Sauces & Dressing', slug: 'sauces-dressing' },
      { name: 'Canned Fruits & Vegetables', slug: 'canned-fruits-vegetables' },
      { name: 'Oils', slug: 'oils' },
      { name: 'Olives', slug: 'olives' },
      { name: 'French Fries', slug: 'french-fries' },
      { name: 'Dry Condiments', slug: 'dry-condiments' },
      { name: 'Seasonings', slug: 'seasonings' },
      { name: 'Powdered Spices', slug: 'powdered-spices' },
      { name: 'Coarse Spices', slug: 'coarse-spices' },
      { name: 'Pasta & Noodles', slug: 'pasta-noodles' },
      { name: 'Dairy Items', slug: 'dairy-items' },
      { name: 'Syrups', slug: 'syrups' },
      { name: 'Baked Products', slug: 'baked-products' },
      { name: 'Twinnings', slug: 'twinnings' },
    ]

    for (let i = 0; i < categoryList.length; i++) {
      const cat = categoryList[i]
      await db
        .insert(categories)
        .values({
          tenantId: tenant.id,
          name: cat.name,
          slug: cat.slug,
          sortOrder: i,
          status: 'ACTIVE',
          isActive: true,
        })
        .onConflictDoNothing({ target: [categories.tenantId, categories.slug] })
    }
    console.log(`✅ Seeded ${categoryList.length} Categories for Abdullah Bakheet`)

    // 7. Seed Partner
    let [partner] = await db
      .select()
      .from(partners)
      .where(sql`${partners.tenantId} = ${tenant.id} AND ${partners.slug} = 'abdullah-bakheet-store'`)

    if (!partner) {
      ;[partner] = await db
        .insert(partners)
        .values({
          tenantId: tenant.id,
          name: 'Abdullah Bakheet Store',
          slug: 'abdullah-bakheet-store',
          type: 'SELLER',
          status: 'active',
          email: ADMIN_EMAIL,
        })
        .returning()
      console.log(`✅ Created Store Partner`)
    }

    // 8. Seed Products from Storefront
    const productList = [
      { id: '1', title: 'TOMATO KETCHUP PORTION', arabic: 'كاتشب طماطم مظاريف', categorySlug: 'ketchup', size: '( 1000 x 8 g )', price: 180, onSale: true, img: 'https://www.dropbox.com/scl/fi/tmhvpb1857h9n4v5myxw3/1ed8a4787fc118d97bbd66fcda1f1ccdfb113b82-1.png?rlkey=pk43p6i80m5rb06dc1yi3jk0t&st=qvvnx4z3&raw=1' },
      { id: '2', title: 'TOMATO KETCHUP SQUEEZE', arabic: 'كاتشب طماطم عصر', categorySlug: 'ketchup', size: '( 12 x 340 g )', price: 120, onSale: false, img: '' },
      { id: '3', title: 'TOMATO KETCHUP GALLON', arabic: 'جالون كاتشب طماطم', categorySlug: 'ketchup', size: '( 4 x 5 Kg )', price: 500, onSale: true, img: 'https://www.dropbox.com/scl/fi/vveb76ej83cno5x2pg57h/1c35a3fc83b5d3bd6338a52ac7609f4819064413.jpg?rlkey=fbvucajcoeymqkyjnlgv7u7id&st=wzt3d0i4&raw=1' },
      { id: '4', title: 'WHITE VINEGAR BOTTLE', arabic: 'خل أبيض نقي', categorySlug: 'vinegar', size: '( 12 x 473 ml )', price: 95, onSale: false, img: '/images/white-vinegar-bottle.png' },
      { id: '5', title: 'WHITE VINEGAR GALLON', arabic: 'جالون خل أبيض', categorySlug: 'vinegar', size: '( 4 x 3.78 L )', price: 210, onSale: true, img: '/images/white-vinegar-gallon.png' },
      { id: '6', title: 'PICKLED CUCUMBER SLICED', arabic: 'خيار مخلل شرائح', categorySlug: 'pickles', size: '( 6 x 3 Kg )', price: 340, onSale: false, img: '/images/pickled-cucumber-sliced.png' },
      { id: '7', title: 'MIXED VEGETABLE PICKLES', arabic: 'مخلل خضار مشكل', categorySlug: 'pickles', size: '( 4 x 5 Kg )', price: 420, onSale: true, img: '/images/mixed-vegetable-pickles.png' },
      { id: '8', title: 'MAYONNAISE CLASSIC GALLON', arabic: 'مايونيز كلاسيك جالون', categorySlug: 'sauces-dressing', size: '( 4 x 3.78 L )', price: 650, onSale: false, img: '/images/mayonnaise-classic-gallon.png' },
      { id: '9', title: 'BARBECUE SAUCE BOTTLE', arabic: 'صلصة باربيكيو', categorySlug: 'sauces-dressing', size: '( 12 x 510 g )', price: 280, onSale: true, img: '/images/barbecue-sauce-bottle.png' },
      { id: '10', title: 'SWEET CORN CANNED', arabic: 'ذرة حلوة معلبة', categorySlug: 'canned-fruits-vegetables', size: '( 24 x 400 g )', price: 160, onSale: false, img: '/images/sweet-corn-canned.png' },
      { id: '11', title: 'EXTRA VIRGIN OLIVE OIL', arabic: 'زيت زيتون بكر ممتاز', categorySlug: 'oils', size: '( 4 x 5 L )', price: 850, onSale: true, img: '/images/extra-virgin-olive-oil.png' },
      { id: '12', title: 'BLACK OLIVES SLICED', arabic: 'زيتون أسود شرائح', categorySlug: 'olives', size: '( 6 x 3 Kg )', price: 310, onSale: false, img: '/images/black-olives-sliced.png' },
      { id: '13', title: 'FRENCH FRIES STRAIGHT CUT', arabic: 'بطاطس مقلية أصابع', categorySlug: 'french-fries', size: '( 4 x 2.5 Kg )', price: 290, onSale: true, img: '/images/french-fries-straight-cut.png' },
      { id: '14', title: 'BLACK PEPPER POWDER', arabic: 'فلفل أسود مطحون', categorySlug: 'powdered-spices', size: '( 12 x 500 g )', price: 450, onSale: false, img: '/images/black-pepper-powder.png' },
      { id: '15', title: 'CHEDDAR CHEESE SAUCE', arabic: 'صلصة جبنة شيدر', categorySlug: 'dairy-items', size: '( 6 x 3 Kg )', price: 780, onSale: true, img: '/images/cheddar-cheese-sauce.png' },
    ]

    for (const p of productList) {
      const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      
      let [prod] = await db
        .select()
        .from(products)
        .where(sql`${products.tenantId} = ${tenant.id} AND ${products.slug} = ${slug}`)

      if (!prod) {
        ;[prod] = await db
          .insert(products)
          .values({
            tenantId: tenant.id,
            partnerId: partner.id,
            title: p.title,
            slug,
            description: `${p.title} - ${p.arabic}`,
            shortDescription: p.size,
            status: 'active',
            approvalStatus: 'APPROVED',
            productType: 'physical',
            catalogType: 'REGULAR',
            specifications: { arabicName: p.arabic, packSize: p.size, img: p.img, price: p.price.toString() },
          })
          .returning()

        // Create Default Variant
        const [createdVariant] = await db
          .insert(variants)
          .values({
            tenantId: tenant.id,
            productId: prod.id,
            sku: `SKU-${p.id}`,
            title: 'Default Variant',
            isDefault: true,
            position: 0,
          })
          .returning()

        // Create Inventory Record
        await db.insert(inventory).values({
          tenantId: tenant.id,
          partnerId: partner.id,
          variantId: createdVariant.id,
          quantityAvailable: 100,
          quantityReserved: 0,
          quantitySold: 0,
          allowBackorder: true,
        }).onConflictDoNothing()

        // Find Category ID
        const [cat] = await db
          .select()
          .from(categories)
          .where(sql`${categories.tenantId} = ${tenant.id} AND ${categories.slug} = ${p.categorySlug}`)

        if (cat) {
          await db.insert(productCategories).values({
            tenantId: tenant.id,
            productId: prod.id,
            categoryId: cat.id,
          }).onConflictDoNothing()
        }
      }
    }
    console.log(`✅ Seeded ${productList.length} Products for Abdullah Bakheet`)

    console.log(`\n🎉 Seed Completed Successfully!`)
    console.log(`--------------------------------------------------`)
    console.log(`Tenant Name: ${tenant.name}`)
    console.log(`Tenant Slug: ${tenant.slug}`)
    console.log(`Tenant ID:   ${tenant.id}`)
    console.log(`Admin Email: ${ADMIN_EMAIL}`)
    console.log(`Admin Pass:  ${PASSWORD}`)
    console.log(`--------------------------------------------------\n`)
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

bootstrap()
