INSERT INTO takkle.data_sources (id, name, source_type, base_url, permission_status, is_active)
VALUES ('b07d89b1-e0f0-56aa-97e5-591719c0b3c0'::uuid, 'HomeTeamsONLINE Football Rosters', 'school_website', 'https://www.hometeamsonline.com/', 'public_ok', true)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, is_active=true;
