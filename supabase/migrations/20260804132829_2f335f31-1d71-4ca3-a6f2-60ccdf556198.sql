ALTER TABLE public.players ADD COLUMN IF NOT EXISTS capitao boolean NOT NULL DEFAULT false;
ALTER TABLE public.saves ADD COLUMN IF NOT EXISTS escudo_url text;