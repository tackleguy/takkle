-- Research rankings for recruiting classes 2027–2031
-- Position-first methodology using association honor-roll proxies (no invented film).
-- Applied remotely as research_rankings_v1; kept here for reproducibility.

INSERT INTO takkle.seasons (year, label) VALUES
  (2030, '2030'), (2031, '2031')
ON CONFLICT (year) DO NOTHING;
