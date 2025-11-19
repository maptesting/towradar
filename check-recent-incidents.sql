-- Check recent incidents
SELECT 
  id,
  type,
  description,
  road,
  city,
  occurred_at,
  created_at,
  source
FROM incidents 
ORDER BY created_at DESC 
LIMIT 10;

-- Count by day
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count,
  source
FROM incidents 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), source
ORDER BY date DESC;
