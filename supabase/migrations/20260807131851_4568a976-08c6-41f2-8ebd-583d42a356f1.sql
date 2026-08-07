CREATE TYPE public.transfer_window AS ENUM ('verao', 'inverno');

ALTER TABLE public.transfers ADD COLUMN janela public.transfer_window;

UPDATE public.transfers
SET janela = CASE WHEN EXTRACT(MONTH FROM data) IN (6,7,8) THEN 'verao'::public.transfer_window
                  ELSE 'inverno'::public.transfer_window END;

ALTER TABLE public.transfers ALTER COLUMN janela SET DEFAULT 'verao'::public.transfer_window;

CREATE TYPE public.match_venue AS ENUM ('casa', 'fora');

ALTER TABLE public.matches ADD COLUMN mando public.match_venue NOT NULL DEFAULT 'casa';