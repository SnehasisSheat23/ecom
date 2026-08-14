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
      email VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(50),
      company_name VARCHAR(150),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

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

    -- 4. ORDERS & ORDER ITEMS TABLES
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
  `)

  console.log('✅ All backend-v2 database tables created successfully!')
  process.exit(0)
}

createTables().catch((err) => {
  console.error('❌ Failed to create database tables:', err)
  process.exit(1)
})
