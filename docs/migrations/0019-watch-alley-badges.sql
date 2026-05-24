-- Watch Alley badges system (2026-05-24)
-- Splits category (condition) from badges (descriptive tags).

ALTER TABLE watch_alley.watches ADD COLUMN IF NOT EXISTS badges jsonb DEFAULT '[]'::jsonb;

UPDATE watch_alley.watches SET badges = badges || '["limited-edition"]'::jsonb
WHERE category = 'limited-edition';

UPDATE watch_alley.watches SET category = 'pre-owned'
WHERE category = 'limited-edition';

DROP VIEW IF EXISTS public.watches;
CREATE VIEW public.watches AS
SELECT id, slug, brand, model, reference, name, price, currency, status,
  condition_label, badge, movement, case_size, inclusion_set, material, edition,
  description, disclosure, provenance, primary_image, images,
  inquiry_subject, inquiry_body, sold_at, sold_price, has_box, has_papers,
  service_history, featured, low_stock, display_order, published,
  created_at, updated_at, category, badges
FROM watch_alley.watches WHERE published = true;
