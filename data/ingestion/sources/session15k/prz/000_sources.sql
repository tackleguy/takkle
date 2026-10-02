INSERT INTO takkle.data_sources (id, name, source_type, base_url, permission_status, is_active)
VALUES ('f4e61a92-8e87-52fe-baff-82a8dec55bb0'::uuid, 'Prep Redzone Class of 2027 Rankings', 'media_public', 'https://prepredzone.com/', 'public_ok', true)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, is_active=true;
INSERT INTO takkle.data_sources (id, name, source_type, base_url, permission_status, is_active)
VALUES ('022f1e32-1c18-585d-ae71-150f10bc6729'::uuid, 'Prep Redzone Class of 2028 Rankings', 'media_public', 'https://prepredzone.com/', 'public_ok', true)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, is_active=true;
INSERT INTO takkle.data_sources (id, name, source_type, base_url, permission_status, is_active)
VALUES ('dab42160-8946-56e4-b714-ce74f578ac49'::uuid, 'Prep Redzone Class of 2029 Rankings', 'media_public', 'https://prepredzone.com/', 'public_ok', true)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, is_active=true;
INSERT INTO takkle.data_sources (id, name, source_type, base_url, permission_status, is_active)
VALUES ('87c3d69c-d87d-5f80-a092-abcabca60004'::uuid, 'Prep Redzone Class of 2030 Rankings', 'media_public', 'https://prepredzone.com/', 'public_ok', true)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, is_active=true;
INSERT INTO takkle.data_sources (id, name, source_type, base_url, permission_status, is_active)
VALUES ('183b876a-e9d5-5660-8123-ec9da9548778'::uuid, 'Prep Redzone Class of 2031 Rankings', 'media_public', 'https://prepredzone.com/', 'public_ok', true)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, is_active=true;
