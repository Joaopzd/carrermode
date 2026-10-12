ALTER TABLE public.stints ADD COLUMN IF NOT EXISTS escudo_url text;
UPDATE public.stints st SET escudo_url=s.escudo_url FROM public.saves s WHERE s.id=st.save_id AND st.status='ativa' AND st.escudo_url IS NULL;
COMMENT ON COLUMN public.saves.league_id IS 'DEPRECATED: current league is derived from the active stint';
COMMENT ON COLUMN public.saves.club_id IS 'DEPRECATED: current club is derived from the active stint';
COMMENT ON COLUMN public.saves.escudo_url IS 'DEPRECATED: custom crest is stored on each stint';
CREATE OR REPLACE FUNCTION public.owns_league(_league_id uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.stints st JOIN public.saves s ON s.id=st.save_id WHERE st.league_id=_league_id AND s.user_id=auth.uid()); $$;
CREATE OR REPLACE FUNCTION public.record_initial_player_overall() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE active_season_id uuid; BEGIN IF NEW.overall IS NULL THEN RETURN NEW; END IF; SELECT id INTO active_season_id FROM public.seasons WHERE stint_id=NEW.stint_id AND status='ativa' ORDER BY criado_em DESC LIMIT 1; IF active_season_id IS NOT NULL THEN INSERT INTO public.player_overall_history(player_id,season_id,overall,valor_mercado,motivo) VALUES(NEW.id,active_season_id,NEW.overall,NEW.valor_mercado,'cadastro_inicial'); END IF; RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION public.iniciar_passagem(_save_id uuid, _league_id uuid, _club_id uuid, _temporada text, _manager jsonb, _staff jsonb, _players jsonb, _motivo public.stint_exit_reason DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE career_id uuid; active_id uuid; new_id uuid; row_data jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.clubs WHERE id=_club_id AND league_id=_league_id) THEN RAISE EXCEPTION 'Clube e liga incompatíveis'; END IF;
 IF jsonb_array_length(_players)=0 THEN RAISE EXCEPTION 'Cadastre ao menos um jogador'; END IF;
 IF _save_id IS NULL THEN
 INSERT INTO public.saves(user_id,temporada) VALUES(auth.uid(),_temporada) RETURNING id INTO career_id;
 INSERT INTO public.managers(save_id,nome,sobrenome,nome_usado,nacionalidade,estilo_tatico) VALUES(career_id,_manager->>'nome',_manager->>'sobrenome',_manager->>'nome_usado',_manager->>'nacionalidade',_manager->>'estilo_tatico');
 ELSE
 SELECT id INTO career_id FROM public.saves WHERE id=_save_id AND user_id=auth.uid() FOR UPDATE;
 IF career_id IS NULL THEN RAISE EXCEPTION 'Carreira não encontrada'; END IF;
 SELECT id INTO active_id FROM public.stints WHERE save_id=career_id AND status='ativa' FOR UPDATE;
 IF active_id IS NOT NULL THEN
 IF _motivo IS NULL THEN RAISE EXCEPTION 'Informe o motivo de saída'; END IF;
 UPDATE public.seasons SET status='encerrada',data_fim=CURRENT_DATE WHERE stint_id=active_id AND status='ativa';
 UPDATE public.stints SET status='encerrada',data_fim=CURRENT_DATE,motivo_saida=_motivo WHERE id=active_id;
 END IF;
 UPDATE public.saves SET temporada=_temporada WHERE id=career_id;
 END IF;
 INSERT INTO public.stints(save_id,league_id,club_id,status,data_inicio) VALUES(career_id,_league_id,_club_id,'ativa',CURRENT_DATE) RETURNING id INTO new_id;
 INSERT INTO public.seasons(save_id,stint_id,nome,status,data_inicio) VALUES(career_id,new_id,'Temporada '||_temporada,'ativa',CURRENT_DATE);
 FOR row_data IN SELECT value FROM jsonb_array_elements(_staff) LOOP
 INSERT INTO public.staff(save_id,stint_id,cargo,nome) VALUES(career_id,new_id,row_data->>'cargo',row_data->>'nome');
 END LOOP;
 FOR row_data IN SELECT value FROM jsonb_array_elements(_players) LOOP
 INSERT INTO public.players(save_id,stint_id,nome,nacionalidade,posicao_principal,posicoes_secundarias,overall,valor_mercado,salario,idade,altura,playstyle,status,criado_via,categoria,ativo)
 VALUES(career_id,new_id,row_data->>'nome',NULLIF(row_data->>'nacionalidade',''),row_data->>'posicao_principal',COALESCE(row_data->'posicoes_secundarias','[]'::jsonb),(row_data->>'overall')::integer,(row_data->>'valor_mercado')::numeric,(row_data->>'salario')::numeric,(row_data->>'idade')::integer,(row_data->>'altura')::integer,NULLIF(row_data->>'playstyle',''),row_data->>'status','onboarding','principal',true);
 END LOOP;
 RETURN new_id;
END; $$;
REVOKE ALL ON FUNCTION public.iniciar_passagem(uuid,uuid,uuid,text,jsonb,jsonb,jsonb,public.stint_exit_reason) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_passagem(uuid,uuid,uuid,text,jsonb,jsonb,jsonb,public.stint_exit_reason) TO authenticated;
CREATE OR REPLACE FUNCTION public.corrigir_clube_passagem(_stint_id uuid,_league_id uuid,_club_id uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 PERFORM id FROM public.stints WHERE id=_stint_id AND status='ativa' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Passagem ativa não encontrada'; END IF;
 IF EXISTS(SELECT 1 FROM public.players WHERE stint_id=_stint_id) OR EXISTS(SELECT 1 FROM public.matches WHERE stint_id=_stint_id) THEN RAISE EXCEPTION 'Use Encerrar Passagem e Mudar de Clube para preservar o histórico'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.clubs WHERE id=_club_id AND league_id=_league_id) THEN RAISE EXCEPTION 'Clube e liga incompatíveis'; END IF;
 UPDATE public.stints SET league_id=_league_id,club_id=_club_id,escudo_url=NULL WHERE id=_stint_id;
END; $$;
REVOKE ALL ON FUNCTION public.corrigir_clube_passagem(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.corrigir_clube_passagem(uuid,uuid,uuid) TO authenticated;