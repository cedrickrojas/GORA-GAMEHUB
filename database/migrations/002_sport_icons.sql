UPDATE sports SET icon = CASE slug
  WHEN 'volleyball' THEN 'volleyball'
  WHEN 'baseball' THEN 'baseball'
  WHEN 'futsal' THEN 'football'
  WHEN 'formula-1' THEN 'flag'
  ELSE icon END
WHERE slug IN ('volleyball','baseball','futsal','formula-1');
