-- Add category column to watches table
ALTER TABLE watch_alley.watches
ADD COLUMN IF NOT EXISTS category text;

-- Set default categories based on existing condition_label
UPDATE watch_alley.watches
SET category = CASE
  WHEN condition_label ILIKE 'brand new%' THEN 'brand-new'
  WHEN condition_label ILIKE 'mint%' OR condition_label ILIKE 'like new%' THEN 'brand-new'
  ELSE 'pre-owned'
END
WHERE category IS NULL;

-- Update the public.watches view to include category
DROP VIEW IF EXISTS public.watches;
CREATE VIEW public.watches AS
SELECT
  id, slug, brand, model, reference, name, price, currency, status,
  condition_label, badge, movement, case_size, inclusion_set, material, edition,
  description, disclosure, provenance, primary_image, images,
  inquiry_subject, inquiry_body, sold_at, sold_price, has_box, has_papers,
  service_history, featured, low_stock, display_order, published,
  created_at, updated_at, category
FROM watch_alley.watches
WHERE published = true;;
