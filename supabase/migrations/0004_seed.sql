-- Seed global config: levels, currencies, and an initial rate snapshot.

insert into levels (level, xp_required, title) values
  (1, 0, 'Pemula'),
  (2, 1000000, 'Penabung'),
  (3, 3000000, 'Pengumpul'),
  (4, 7000000, 'Pejuang Finansial'),
  (5, 15000000, 'Ahli Cuan'),
  (6, 30000000, 'Sultan Muda'),
  (7, 60000000, 'Hartawan'),
  (8, 120000000, 'Konglomerat'),
  (9, 250000000, 'Taipan'),
  (10, 500000000, 'Legenda')
on conflict (level) do nothing;

insert into currencies (code, name, symbol, is_active) values
  ('IDR','Indonesian Rupiah','Rp', true),
  ('USD','US Dollar','$', true),
  ('EUR','Euro','€', true),
  ('SGD','Singapore Dollar','S$', true),
  ('MYR','Malaysian Ringgit','RM', true),
  ('JPY','Japanese Yen','¥', true),
  ('AUD','Australian Dollar','A$', true),
  ('GBP','British Pound','£', true)
on conflict (code) do nothing;

-- Initial EUR->X snapshot so convert_amount() never hits NULL before the first
-- cron run. Approximate; refreshed daily by /api/cron/rates.
insert into exchange_rates (base_code, quote_code, rate) values
  ('EUR','EUR', 1),
  ('EUR','IDR', 17500),
  ('EUR','USD', 1.08),
  ('EUR','SGD', 1.45),
  ('EUR','MYR', 5.1),
  ('EUR','JPY', 168),
  ('EUR','AUD', 1.63),
  ('EUR','GBP', 0.85)
on conflict (base_code, quote_code) do update set rate = excluded.rate;
