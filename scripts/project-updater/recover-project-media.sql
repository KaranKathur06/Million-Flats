-- 1) Inspect invalid media records
SELECT id, project_id, media_url, s3_key
FROM project_media
WHERE media_url IS NULL
   OR trim(media_url) = ''
   OR media_url !~* '^https?://';

-- 2) Delete invalid media records (run only after review)
DELETE FROM project_media
WHERE media_url IS NULL
   OR trim(media_url) = ''
   OR media_url !~* '^https?://';

-- 3) Normalize category from media_type when missing
UPDATE project_media
SET category = CASE lower(media_type)
  WHEN 'interior' THEN 'interior'::"ProjectImageCategory"
  WHEN 'interiors' THEN 'interior'::"ProjectImageCategory"
  WHEN 'exterior' THEN 'exterior'::"ProjectImageCategory"
  WHEN 'amenities' THEN 'amenities'::"ProjectImageCategory"
  WHEN 'lifestyle' THEN 'lifestyle'::"ProjectImageCategory"
  ELSE category
END
WHERE category IS NULL;

