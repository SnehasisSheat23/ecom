-- Migration 0058: Add translations JSONB column to categories and products, and migrate legacy arabicName specs

ALTER TABLE categories ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Data Migration: Migrate legacy products with specifications.arabicName to translations.ar
UPDATE products
SET translations = jsonb_set(
  COALESCE(translations, '{}'::jsonb),
  '{ar}',
  jsonb_build_object(
    'name', specifications->>'arabicName',
    'description', COALESCE(specifications->>'descriptionArabic', '')
  )
)
WHERE specifications->>'arabicName' IS NOT NULL AND specifications->>'arabicName' != '';

-- Data Cleanup: Remove arabicName and descriptionArabic keys from specifications
UPDATE products
SET specifications = specifications - 'arabicName' - 'descriptionArabic'
WHERE specifications ? 'arabicName' OR specifications ? 'descriptionArabic';
