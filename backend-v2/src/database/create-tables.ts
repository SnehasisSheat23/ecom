import { getPool } from '../lib/db.js'

async function createTables() {
  const pool = getPool()

  console.log('🚀 Setting up V2 4-Module database tables in PostgreSQL...')

  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- 1. CATEGORIES TABLE (Category -> Subcategory -> Sub-subcategory)
    CREATE TABLE IF NOT EXISTS v2_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      parent_id UUID REFERENCES v2_categories(id) ON DELETE CASCADE,
      translations JSONB NOT NULL,
      image VARCHAR(1000),
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      display_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Ensure category_id and status columns exist if tables already created
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='v2_categories' AND column_name='status'
      ) THEN
        ALTER TABLE v2_categories ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
      END IF;
      UPDATE v2_categories SET status = 'active' WHERE status IS NULL OR status = '';
    END $$;

    -- 2. PRODUCTS TABLE
    CREATE TABLE IF NOT EXISTS v2_products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sku VARCHAR(100) NOT NULL UNIQUE,
      category_id UUID REFERENCES v2_categories(id) ON DELETE SET NULL,
      translations JSONB NOT NULL,
      pricing JSONB NOT NULL,
      moq INT NOT NULL DEFAULT 1,
      moq_step INT NOT NULL DEFAULT 1,
      seo JSONB,
      attributes JSONB DEFAULT '{}'::jsonb,
      stock_quantity INT NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      specifications JSONB DEFAULT '{}'::jsonb,
      images JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='v2_products' AND column_name='specifications'
      ) THEN
        ALTER TABLE v2_products ADD COLUMN specifications JSONB DEFAULT '{}'::jsonb;
      END IF;
    END $$;

    -- Add category_id if table v2_products already exists without it
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='v2_products' AND column_name='category_id'
      ) THEN
        ALTER TABLE v2_products ADD COLUMN category_id UUID REFERENCES v2_categories(id) ON DELETE SET NULL;
      END IF;
    END $$;

    -- 3. CUSTOMERS & ADDRESSES TABLES
    CREATE TABLE IF NOT EXISTS v2_customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(50),
      company_name VARCHAR(150),
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='v2_customers' AND column_name='password_hash'
      ) THEN
        ALTER TABLE v2_customers ADD COLUMN password_hash VARCHAR(255);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='v2_customers' AND column_name='status'
      ) THEN
        ALTER TABLE v2_customers ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS v2_customer_addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES v2_customers(id) ON DELETE CASCADE,
      label VARCHAR(50) DEFAULT 'Home',
      recipient_name VARCHAR(100),
      phone VARCHAR(50),
      address_line1 VARCHAR(255) NOT NULL,
      address_line2 VARCHAR(255),
      city VARCHAR(100) NOT NULL,
      country VARCHAR(100) NOT NULL DEFAULT 'United Arab Emirates',
      postal_code VARCHAR(50),
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 4. ADMIN USERS & AUTH SESSIONS TABLES
    CREATE TABLE IF NOT EXISTS v2_admin_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) DEFAULT 'Admin',
      last_name VARCHAR(100) DEFAULT 'User',
      role VARCHAR(50) NOT NULL DEFAULT 'admin',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS v2_auth_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      user_type VARCHAR(20) NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 5. ORDERS & ORDER ITEMS TABLES
    CREATE TABLE IF NOT EXISTS v2_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_number VARCHAR(100) NOT NULL UNIQUE,
      customer_id UUID REFERENCES v2_customers(id),
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      currency VARCHAR(10) NOT NULL DEFAULT 'AED',
      subtotal NUMERIC(12, 2) NOT NULL,
      shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      total_amount NUMERIC(12, 2) NOT NULL,
      shipping_address_snapshot JSONB,
      billing_address_snapshot JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS v2_order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES v2_orders(id) ON DELETE CASCADE,
      product_id UUID REFERENCES v2_products(id),
      sku VARCHAR(100),
      product_name_snapshot JSONB,
      unit_price NUMERIC(12, 2) NOT NULL,
      quantity INT NOT NULL,
      total_price NUMERIC(12, 2) NOT NULL
    );

    -- 6. CARTS & CART ITEMS TABLES
    CREATE TABLE IF NOT EXISTS v2_carts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES v2_customers(id) ON DELETE CASCADE UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS v2_cart_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cart_id UUID NOT NULL REFERENCES v2_carts(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES v2_products(id) ON DELETE CASCADE,
      sku VARCHAR(100),
      quantity INT NOT NULL DEFAULT 1,
      unit_price NUMERIC(12, 2),
      item_metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 7. WISHLIST ITEMS TABLE
    CREATE TABLE IF NOT EXISTS v2_wishlist_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES v2_customers(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES v2_products(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(customer_id, product_id)
    );

    -- 8. SHIPPING METHODS TABLE
    CREATE TABLE IF NOT EXISTS v2_shipping_methods (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      arabic_name VARCHAR(255),
      description TEXT,
      arabic_description TEXT,
      estimated_days VARCHAR(100) NOT NULL DEFAULT '2 - 4 business days',
      arabic_estimated_days VARCHAR(100),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      rates JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  // Safely seed default standard shipping method in DB if not exists
  await pool.query(
    `INSERT INTO v2_shipping_methods (id, name, arabic_name, description, arabic_description, estimated_days, arabic_estimated_days, is_active, is_default, rates)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO NOTHING;`,
    [
      'standard',
      'Standard Regional Delivery',
      'الشحن الإقليمي القياسي',
      'Direct door-to-door delivery with secure refrigerated transit where required.',
      'توصيل مباشر إلى الباب مع نقل آمن ومبرد عند الحاجة.',
      '2 - 4 business days',
      '٢ - ٤ أيام عمل',
      true,
      true,
      JSON.stringify({
        AED: 110,
        SAR: 112,
        USD: 30,
        EUR: 28,
        INR: 2500,
      }),
    ]
  )

  // Safely seed default admin user if not exists (Zero impact on existing product/category data)
  const defaultAdminPassword = 'password123'
  const { hashPassword } = await import('../lib/auth-crypto.js')
  const adminPasswordHash = await hashPassword(defaultAdminPassword)

  await pool.query(
    `INSERT INTO v2_admin_users (email, password_hash, first_name, last_name, role, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO NOTHING;`,
    ['admin@example.com', adminPasswordHash, 'Admin', 'User', 'admin', 'active']
  )

  console.log('✅ All backend-v2 database tables, shipping methods & default admin user configured successfully!')
  process.exit(0)
}

createTables().catch((err) => {
  console.error('❌ Failed to create database tables:', err)
  process.exit(1)
})
