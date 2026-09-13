-- NCES CCD school identity + synthetic flag for Takkle schools.
-- Source data: https://nces.ed.gov/ccd/files.asp (U.S. government / public domain)

ALTER TABLE takkle.schools
  ADD COLUMN IF NOT EXISTS nces_id text,
  ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;

-- Partial unique: multiple NULL nces_id rows (synthetic / manual) are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS schools_nces_id_uidx
  ON takkle.schools (nces_id)
  WHERE nces_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS schools_is_synthetic_idx
  ON takkle.schools (is_synthetic);

INSERT INTO takkle.data_sources (name, source_type, base_url, robots_allowed, license_notes)
SELECT
  'NCES Common Core of Data (CCD)',
  'nces_ccd',
  'https://nces.ed.gov/ccd/files.asp',
  true,
  'U.S. government work produced by NCES; generally public domain. Cite NCES CCD.'
WHERE NOT EXISTS (
  SELECT 1 FROM takkle.data_sources WHERE name = 'NCES Common Core of Data (CCD)'
);
