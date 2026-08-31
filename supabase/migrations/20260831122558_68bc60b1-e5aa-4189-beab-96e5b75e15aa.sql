ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS editado_apos_arquivamento boolean NOT NULL DEFAULT false;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS editado_apos_arquivamento boolean NOT NULL DEFAULT false;
ALTER TABLE public.trophy_gallery ADD COLUMN IF NOT EXISTS editado_apos_arquivamento boolean NOT NULL DEFAULT false;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS gols_adversario_detalhe text;