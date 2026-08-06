CREATE OR REPLACE FUNCTION public.record_initial_player_overall()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  active_season_id uuid;
BEGIN
  IF NEW.overall IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT s.id
  INTO active_season_id
  FROM public.seasons s
  WHERE s.save_id = NEW.save_id
    AND s.status = 'ativa'
  ORDER BY s.criado_em DESC
  LIMIT 1;

  IF active_season_id IS NOT NULL THEN
    INSERT INTO public.player_overall_history (
      player_id,
      season_id,
      overall,
      valor_mercado,
      motivo
    ) VALUES (
      NEW.id,
      active_season_id,
      NEW.overall,
      NEW.valor_mercado,
      'cadastro_inicial'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER record_initial_player_overall_after_insert
AFTER INSERT ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.record_initial_player_overall();