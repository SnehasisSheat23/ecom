-- Add ON DELETE CASCADE to product_categories for category_id
-- This allows deleting a category even if products are assigned to it

ALTER TABLE product_categories 
DROP CONSTRAINT IF EXISTS product_categories_category_id_categories_id_fk;

-- Postgres default naming is often table_column_fkey
ALTER TABLE product_categories 
DROP CONSTRAINT IF EXISTS product_categories_category_id_fkey;

ALTER TABLE product_categories
ADD CONSTRAINT product_categories_category_id_categories_id_fk 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
