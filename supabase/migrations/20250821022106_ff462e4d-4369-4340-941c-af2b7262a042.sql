-- Update category values in prompts_modified table
UPDATE prompts_modified 
SET category = CASE 
  WHEN category = 'trust-authority' THEN 'attract'
  WHEN category = 'heartfelt-relatable' THEN 'connect'
  WHEN category = 'educational-helpful' THEN 'transact'
  ELSE category
END
WHERE category IN ('trust-authority', 'heartfelt-relatable', 'educational-helpful');

-- Update category values in post_history table if they exist
UPDATE post_history 
SET prompt_category = CASE 
  WHEN prompt_category = 'trust-authority' THEN 'attract'
  WHEN prompt_category = 'heartfelt-relatable' THEN 'connect'
  WHEN prompt_category = 'educational-helpful' THEN 'transact'
  ELSE prompt_category
END
WHERE prompt_category IN ('trust-authority', 'heartfelt-relatable', 'educational-helpful');

-- Update category values in saved_posts table if they exist
UPDATE saved_posts 
SET prompt_category = CASE 
  WHEN prompt_category = 'trust-authority' THEN 'attract'
  WHEN prompt_category = 'heartfelt-relatable' THEN 'connect'
  WHEN prompt_category = 'educational-helpful' THEN 'transact'
  ELSE prompt_category
END
WHERE prompt_category IN ('trust-authority', 'heartfelt-relatable', 'educational-helpful');