-- Add badges JSONB column and constrain category to condition only
ALTER TABLE watch_alley.watches ADD COLUMN IF NOT EXISTS badges jsonb DEFAULT '[]'::jsonb;

-- Remove limited-edition from category — category is now purely condition
-- (brand-new / pre-owned). limited-edition moves to the badges array.
UPDATE watch_alley.watches
SET badges = badges || '["limited-edition"]'::jsonb
WHERE category = 'limited-edition';

UPDATE watch_alley.watches
SET category = 'pre-owned'
WHERE category = 'limited-edition';

-- Rebuild the public view to include badges
DROP VIEW IF EXISTS public.watches;
CREATE VIEW public.watches AS
SELECT
  id, slug, brand, model, reference, name, price, currency, status,
  condition_label, badge, movement, case_size, inclusion_set, material, edition,
  description, disclosure, provenance, primary_image, images,
  inquiry_subject, inquiry_body, sold_at, sold_price, has_box, has_papers,
  service_history, featured, low_stock, display_order, published,
  created_at, updated_at, category, badges
FROM watch_alley.watches
WHERE published = true;

-- Update admin_upsert_watch to handle badges
CREATE OR REPLACE FUNCTION public.admin_upsert_watch(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result_row watch_alley.watches;
  watch_id text;
  cat text;
  badges_arr jsonb;
BEGIN
  IF NOT watch_alley.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  watch_id := payload->>'id';

  -- Validate category
  cat := payload->>'category';
  IF cat NOT IN ('brand-new', 'pre-owned') THEN
    RAISE EXCEPTION 'Invalid category: % (must be brand-new or pre-owned)', cat USING ERRCODE = '22023';
  END IF;

  -- Normalize badges to a clean JSON array
  badges_arr := coalesce(payload->'badges', '[]'::jsonb);
  IF jsonb_typeof(badges_arr) <> 'array' THEN
    badges_arr := '[]'::jsonb;
  END IF;

  IF watch_id IS NOT NULL AND length(trim(watch_id)) > 0 THEN
    UPDATE watch_alley.watches SET
      slug = payload->>'slug',
      brand = payload->>'brand',
      model = payload->>'model',
      reference = payload->>'reference',
      name = payload->>'name',
      price = (payload->>'price')::int,
      currency = coalesce(payload->>'currency', 'PHP'),
      status = payload->>'status',
      category = cat,
      condition_label = payload->>'conditionLabel',
      badge = payload->>'badge',
      badges = badges_arr,
      movement = payload->>'movement',
      case_size = payload->>'caseSize',
      inclusion_set = payload->>'set',
      material = payload->>'material',
      edition = payload->>'edition',
      description = payload->>'description',
      disclosure = payload->>'disclosure',
      provenance = nullif(payload->>'provenance', ''),
      primary_image = payload->>'primaryImage',
      images = CASE WHEN jsonb_typeof(payload->'images') = 'array'
        THEN (SELECT array_agg(v::text) FROM jsonb_array_elements_text(payload->'images') v)
        ELSE NULL END,
      inquiry_subject = payload->>'inquirySubject',
      inquiry_body = payload->>'inquiryBody',
      sold_at = payload->>'soldAt',
      sold_price = CASE WHEN payload->>'soldPrice' IS NOT NULL
        THEN (payload->>'soldPrice')::int ELSE NULL END,
      has_box = (payload->>'hasBox')::boolean,
      has_papers = (payload->>'hasPapers')::boolean,
      service_history = nullif(payload->>'serviceHistory', ''),
      featured = (payload->>'featured')::boolean,
      low_stock = (payload->>'lowStock')::boolean,
      display_order = coalesce((payload->>'displayOrder')::int, 0),
      published = (payload->>'published')::boolean
    WHERE id = watch_id
    RETURNING * INTO result_row;
  ELSE
    INSERT INTO watch_alley.watches (
      slug, brand, model, reference, name, price, currency, status, category,
      condition_label, badge, badges, movement, case_size, inclusion_set, material,
      edition, description, disclosure, provenance, primary_image, images,
      inquiry_subject, inquiry_body, sold_at, sold_price, has_box, has_papers,
      service_history, featured, low_stock, display_order, published
    ) VALUES (
      payload->>'slug', payload->>'brand', payload->>'model',
      payload->>'reference', payload->>'name', (payload->>'price')::int,
      coalesce(payload->>'currency', 'PHP'), payload->>'status', cat,
      payload->>'conditionLabel', payload->>'badge', badges_arr,
      payload->>'movement', payload->>'caseSize', payload->>'set',
      payload->>'material', payload->>'edition', payload->>'description',
      payload->>'disclosure', nullif(payload->>'provenance', ''),
      payload->>'primaryImage',
      CASE WHEN jsonb_typeof(payload->'images') = 'array'
        THEN (SELECT array_agg(v::text) FROM jsonb_array_elements_text(payload->'images') v)
        ELSE NULL END,
      payload->>'inquirySubject', payload->>'inquiryBody',
      payload->>'soldAt', CASE WHEN payload->>'soldPrice' IS NOT NULL
        THEN (payload->>'soldPrice')::int ELSE NULL END,
      (payload->>'hasBox')::boolean, (payload->>'hasPapers')::boolean,
      nullif(payload->>'serviceHistory', ''), (payload->>'featured')::boolean,
      (payload->>'lowStock')::boolean, coalesce((payload->>'displayOrder')::int, 0),
      (payload->>'published')::boolean
    )
    RETURNING * INTO result_row;
  END IF;

  RETURN to_jsonb(result_row);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_watch(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_watch(jsonb) TO authenticated;;
