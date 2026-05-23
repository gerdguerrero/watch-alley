-- Watch Alley inventory media cleanup (2026-05-24).
--
-- Removes development/test upload references from public listings, restores
-- clean watch imagery, and hides rows that do not yet have credible listing
-- photos. Rows are unpublished rather than deleted so the operator can edit
-- and republish them from the CMS once real photos are available.

-- Use the Grand Seiko as the single featured hero while the clean catalog is
-- being rebuilt.
update watch_alley.watches
set featured = false
where featured = true;

update watch_alley.watches
set
  images = array[primary_image],
  inquiry_subject = coalesce(nullif(inquiry_subject, ''), 'Inquiry: TUDOR Black Bay 58 Gilt'),
  inquiry_body = coalesce(nullif(inquiry_body, ''), 'Hi Watch Alley, I''m interested in the Tudor Black Bay 58 Gilt (PHP 145,000). Could you confirm current availability, condition photos, and set inclusions?')
where id = 'tudor-bb58-01';

update watch_alley.watches
set
  model = 'SBGX261 Heritage Quartz',
  images = array[primary_image],
  featured = true,
  inquiry_subject = coalesce(nullif(inquiry_subject, ''), 'Inquiry: GRAND SEIKO SBGX261 HAQ Black Dial'),
  inquiry_body = coalesce(nullif(inquiry_body, ''), 'Hi Watch Alley, I''m interested in the Grand Seiko SBGX261 HAQ Black Dial (PHP 68,500). Could you confirm current availability, condition photos, and full set details?')
where id = 'gs-sbgx261-01';

update watch_alley.watches
set
  images = array[primary_image],
  inquiry_subject = coalesce(nullif(inquiry_subject, ''), 'Inquiry: SEIKO PROSPEX SPB143 62MAS Reissue'),
  inquiry_body = coalesce(nullif(inquiry_body, ''), 'Hi Watch Alley, I''m interested in the Seiko Prospex SPB143 62MAS Reissue (PHP 42,000). Could you confirm current availability, condition photos, and set inclusions?')
where id = 'seiko-spb143-01';

update watch_alley.watches
set
  model = 'Alpinist "Whiskered Pitta" SPB491J1',
  reference = 'SPB491J1',
  primary_image = '/watch-assets/alpinist.png',
  images = array['/watch-assets/alpinist.png', '/watch-assets/alpinist-alt.png'],
  sold_at = null,
  sold_price = null,
  featured = false,
  published = true
where id = 'twa-004';

update watch_alley.watches
set
  images = array[primary_image],
  inquiry_subject = coalesce(nullif(inquiry_subject, ''), 'Inquiry: SEIKO 5 Sports SRPD55K1 5KX'),
  inquiry_body = coalesce(nullif(inquiry_body, ''), 'Hi Watch Alley, I''m interested in the Seiko 5 Sports SRPD55K1 5KX (PHP 9,500). Could you confirm current availability, condition photos, and inclusions?')
where id = 'seiko-srpd55-01';

update watch_alley.watches
set images = array[primary_image]
where id = 'rolex-dj1601-01';

-- Hide rows with empty, test-uploaded, or mismatched imagery until proper
-- listing photos are available.
update watch_alley.watches
set published = false
where id in (
  'twa-005',
  'twa-006',
  'twa-007',
  'twa-008',
  'twa-009',
  'twa-010',
  'orient-star-01',
  'citizen-nb1050-01',
  'gshock-gw5000u-01',
  'tudor-bbgmt-01',
  'seiko-skx007-01',
  'twa-102',
  'twa-103'
);
