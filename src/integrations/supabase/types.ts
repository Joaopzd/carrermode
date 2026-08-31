export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      board_objectives: {
        Row: {
          criado_em: string
          id: string
          meta: string | null
          save_id: string
          season_id: string | null
          status: string
          temporada: string | null
          tipo: string
        }
        Insert: {
          criado_em?: string
          id?: string
          meta?: string | null
          save_id: string
          season_id?: string | null
          status?: string
          temporada?: string | null
          tipo: string
        }
        Update: {
          criado_em?: string
          id?: string
          meta?: string | null
          save_id?: string
          season_id?: string | null
          status?: string
          temporada?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_objectives_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_objectives_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          criado_em: string
          escudo_url: string | null
          id: string
          league_id: string | null
          nome: string
          pais: string | null
          temporada_ref: string | null
        }
        Insert: {
          criado_em?: string
          escudo_url?: string | null
          id?: string
          league_id?: string | null
          nome: string
          pais?: string | null
          temporada_ref?: string | null
        }
        Update: {
          criado_em?: string
          escudo_url?: string | null
          id?: string
          league_id?: string | null
          nome?: string
          pais?: string | null
          temporada_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          condicao_elegibilidade: Json | null
          criado_em: string
          escopo: Database["public"]["Enums"]["competition_scope"]
          id: string
          nivel_liga: number | null
          nome: string
          pais: string | null
          registra_vice: boolean
          restrito_a_niveis: Json | null
        }
        Insert: {
          condicao_elegibilidade?: Json | null
          criado_em?: string
          escopo: Database["public"]["Enums"]["competition_scope"]
          id?: string
          nivel_liga?: number | null
          nome: string
          pais?: string | null
          registra_vice?: boolean
          restrito_a_niveis?: Json | null
        }
        Update: {
          condicao_elegibilidade?: Json | null
          criado_em?: string
          escopo?: Database["public"]["Enums"]["competition_scope"]
          id?: string
          nivel_liga?: number | null
          nome?: string
          pais?: string | null
          registra_vice?: boolean
          restrito_a_niveis?: Json | null
        }
        Relationships: []
      }
      fan_pressure_events: {
        Row: {
          criado_em: string
          id: string
          intensidade: number | null
          player_id: string | null
          resolvido: boolean
          save_id: string
          tipo: string
        }
        Insert: {
          criado_em?: string
          id?: string
          intensidade?: number | null
          player_id?: string | null
          resolvido?: boolean
          save_id: string
          tipo: string
        }
        Update: {
          criado_em?: string
          id?: string
          intensidade?: number | null
          player_id?: string | null
          resolvido?: boolean
          save_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_pressure_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fan_pressure_events_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
            referencedColumns: ["id"]
          },
        ]
      }
      league_leaders: {
        Row: {
          atualizado_em: string
          categoria: Database["public"]["Enums"]["league_leader_kind"]
          clube: string | null
          criado_em: string
          id: string
          jogador: string
          posicao: number
          save_id: string
          season_id: string | null
          valor: number | null
        }
        Insert: {
          atualizado_em?: string
          categoria: Database["public"]["Enums"]["league_leader_kind"]
          clube?: string | null
          criado_em?: string
          id?: string
          jogador: string
          posicao: number
          save_id: string
          season_id?: string | null
          valor?: number | null
        }
        Update: {
          atualizado_em?: string
          categoria?: Database["public"]["Enums"]["league_leader_kind"]
          clube?: string | null
          criado_em?: string
          id?: string
          jogador?: string
          posicao?: number
          save_id?: string
          season_id?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "league_leaders_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_leaders_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      league_rules: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          league_id: string
          temporada_ref: string | null
          vagas_acesso_direto: number | null
          vagas_champions: number
          vagas_conference_league: number
          vagas_europa_league: number
          zona_playoff_acesso: number | null
          zona_playoff_rebaixamento: number | null
          zona_rebaixamento_direto: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          league_id: string
          temporada_ref?: string | null
          vagas_acesso_direto?: number | null
          vagas_champions?: number
          vagas_conference_league?: number
          vagas_europa_league?: number
          zona_playoff_acesso?: number | null
          zona_playoff_rebaixamento?: number | null
          zona_rebaixamento_direto?: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          league_id?: string
          temporada_ref?: string | null
          vagas_acesso_direto?: number | null
          vagas_champions?: number
          vagas_conference_league?: number
          vagas_europa_league?: number
          zona_playoff_acesso?: number | null
          zona_playoff_rebaixamento?: number | null
          zona_rebaixamento_direto?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_rules_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          criado_em: string
          id: string
          nivel: number
          nome: string
          pais: string
          temporada_ref: string | null
        }
        Insert: {
          criado_em?: string
          id?: string
          nivel: number
          nome: string
          pais: string
          temporada_ref?: string | null
        }
        Update: {
          criado_em?: string
          id?: string
          nivel?: number
          nome?: string
          pais?: string
          temporada_ref?: string | null
        }
        Relationships: []
      }
      managers: {
        Row: {
          criado_em: string
          estilo_tatico: string | null
          id: string
          nacionalidade: string | null
          nome: string
          nome_usado: string | null
          save_id: string
          sobrenome: string | null
        }
        Insert: {
          criado_em?: string
          estilo_tatico?: string | null
          id?: string
          nacionalidade?: string | null
          nome: string
          nome_usado?: string | null
          save_id: string
          sobrenome?: string | null
        }
        Update: {
          criado_em?: string
          estilo_tatico?: string | null
          id?: string
          nacionalidade?: string | null
          nome?: string
          nome_usado?: string | null
          save_id?: string
          sobrenome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "managers_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
            referencedColumns: ["id"]
          },
        ]
      }
      match_player_stats: {
        Row: {
          assistencias: number | null
          cartao_amarelo: boolean
          cartao_vermelho: boolean
          chutes: number | null
          clean_sheet: boolean
          defesas: number | null
          desarmes: number | null
          gols: number | null
          id: string
          match_id: string
          nota: number | null
          passes: number | null
          passes_pct: number | null
          player_id: string | null
          titular: boolean
          xa: number | null
          xg: number | null
        }
        Insert: {
          assistencias?: number | null
          cartao_amarelo?: boolean
          cartao_vermelho?: boolean
          chutes?: number | null
          clean_sheet?: boolean
          defesas?: number | null
          desarmes?: number | null
          gols?: number | null
          id?: string
          match_id: string
          nota?: number | null
          passes?: number | null
          passes_pct?: number | null
          player_id?: string | null
          titular?: boolean
          xa?: number | null
          xg?: number | null
        }
        Update: {
          assistencias?: number | null
          cartao_amarelo?: boolean
          cartao_vermelho?: boolean
          chutes?: number | null
          clean_sheet?: boolean
          defesas?: number | null
          desarmes?: number | null
          gols?: number | null
          id?: string
          match_id?: string
          nota?: number | null
          passes?: number | null
          passes_pct?: number | null
          player_id?: string | null
          titular?: boolean
          xa?: number | null
          xg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_player_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          adversario: string | null
          cartoes_amarelos: number | null
          cartoes_vermelhos: number | null
          chutes: number | null
          competicao: string | null
          criado_em: string
          data_hora: string | null
          desarmes: number | null
          editado_apos_arquivamento: boolean
          fase: string | null
          gols_adversario_detalhe: string | null
          id: string
          mando: Database["public"]["Enums"]["match_venue"]
          mvp_player_id: string | null
          passes: number | null
          passes_pct: number | null
          placar_adversario: number | null
          placar_time: number | null
          posse: number | null
          save_id: string
          season_id: string | null
          status: string
          tempo_recuperacao: number | null
          xg: number | null
        }
        Insert: {
          adversario?: string | null
          cartoes_amarelos?: number | null
          cartoes_vermelhos?: number | null
          chutes?: number | null
          competicao?: string | null
          criado_em?: string
          data_hora?: string | null
          desarmes?: number | null
          editado_apos_arquivamento?: boolean
          fase?: string | null
          gols_adversario_detalhe?: string | null
          id?: string
          mando?: Database["public"]["Enums"]["match_venue"]
          mvp_player_id?: string | null
          passes?: number | null
          passes_pct?: number | null
          placar_adversario?: number | null
          placar_time?: number | null
          posse?: number | null
          save_id: string
          season_id?: string | null
          status?: string
          tempo_recuperacao?: number | null
          xg?: number | null
        }
        Update: {
          adversario?: string | null
          cartoes_amarelos?: number | null
          cartoes_vermelhos?: number | null
          chutes?: number | null
          competicao?: string | null
          criado_em?: string
          data_hora?: string | null
          desarmes?: number | null
          editado_apos_arquivamento?: boolean
          fase?: string | null
          gols_adversario_detalhe?: string | null
          id?: string
          mando?: Database["public"]["Enums"]["match_venue"]
          mvp_player_id?: string | null
          passes?: number | null
          passes_pct?: number | null
          placar_adversario?: number | null
          placar_time?: number | null
          posse?: number | null
          save_id?: string
          season_id?: string | null
          status?: string
          tempo_recuperacao?: number | null
          xg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_mvp_player_id_fkey"
            columns: ["mvp_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      news_feed: {
        Row: {
          corpo: string | null
          gerado_em: string
          id: string
          relacionado_match_id: string | null
          relacionado_player_id: string | null
          relacionado_transfer_id: string | null
          save_id: string
          season_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          corpo?: string | null
          gerado_em?: string
          id?: string
          relacionado_match_id?: string | null
          relacionado_player_id?: string | null
          relacionado_transfer_id?: string | null
          save_id: string
          season_id?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          corpo?: string | null
          gerado_em?: string
          id?: string
          relacionado_match_id?: string | null
          relacionado_player_id?: string | null
          relacionado_transfer_id?: string | null
          save_id?: string
          season_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_feed_relacionado_match_id_fkey"
            columns: ["relacionado_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_feed_relacionado_player_id_fkey"
            columns: ["relacionado_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_feed_relacionado_transfer_id_fkey"
            columns: ["relacionado_transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_feed_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_feed_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      player_overall_history: {
        Row: {
          id: string
          motivo: Database["public"]["Enums"]["player_overall_history_reason"]
          overall: number
          player_id: string
          registrado_em: string
          season_id: string
          valor_mercado: number | null
        }
        Insert: {
          id?: string
          motivo: Database["public"]["Enums"]["player_overall_history_reason"]
          overall: number
          player_id: string
          registrado_em?: string
          season_id: string
          valor_mercado?: number | null
        }
        Update: {
          id?: string
          motivo?: Database["public"]["Enums"]["player_overall_history_reason"]
          overall?: number
          player_id?: string
          registrado_em?: string
          season_id?: string
          valor_mercado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_overall_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_overall_history_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          altura: number | null
          ativo: boolean
          capitao: boolean
          categoria: string | null
          clube_destino: string | null
          criado_em: string
          criado_via: string | null
          data_saida: string | null
          favorito_torcida: boolean
          id: string
          idade: number | null
          motivo_saida: Database["public"]["Enums"]["motivo_saida"] | null
          nacionalidade: string | null
          nome: string
          overall: number | null
          playstyle: string | null
          posicao_principal: string | null
          posicoes_secundarias: Json
          potencial: number | null
          salario: number | null
          save_id: string
          status: string | null
          transfer_saida_id: string | null
          valor_mercado: number | null
        }
        Insert: {
          altura?: number | null
          ativo?: boolean
          capitao?: boolean
          categoria?: string | null
          clube_destino?: string | null
          criado_em?: string
          criado_via?: string | null
          data_saida?: string | null
          favorito_torcida?: boolean
          id?: string
          idade?: number | null
          motivo_saida?: Database["public"]["Enums"]["motivo_saida"] | null
          nacionalidade?: string | null
          nome: string
          overall?: number | null
          playstyle?: string | null
          posicao_principal?: string | null
          posicoes_secundarias?: Json
          potencial?: number | null
          salario?: number | null
          save_id: string
          status?: string | null
          transfer_saida_id?: string | null
          valor_mercado?: number | null
        }
        Update: {
          altura?: number | null
          ativo?: boolean
          capitao?: boolean
          categoria?: string | null
          clube_destino?: string | null
          criado_em?: string
          criado_via?: string | null
          data_saida?: string | null
          favorito_torcida?: boolean
          id?: string
          idade?: number | null
          motivo_saida?: Database["public"]["Enums"]["motivo_saida"] | null
          nacionalidade?: string | null
          nome?: string
          overall?: number | null
          playstyle?: string | null
          posicao_principal?: string | null
          posicoes_secundarias?: Json
          potencial?: number | null
          salario?: number | null
          save_id?: string
          status?: string | null
          transfer_saida_id?: string | null
          valor_mercado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_transfer_saida_id_fkey"
            columns: ["transfer_saida_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          criado_em: string
          display_name: string | null
          id: string
          username: string
        }
        Insert: {
          criado_em?: string
          display_name?: string | null
          id: string
          username: string
        }
        Update: {
          criado_em?: string
          display_name?: string | null
          id?: string
          username?: string
        }
        Relationships: []
      }
      saves: {
        Row: {
          club_id: string | null
          criado_em: string
          escudo_url: string | null
          id: string
          league_id: string | null
          temporada: string
          user_id: string
        }
        Insert: {
          club_id?: string | null
          criado_em?: string
          escudo_url?: string | null
          id?: string
          league_id?: string | null
          temporada: string
          user_id: string
        }
        Update: {
          club_id?: string | null
          criado_em?: string
          escudo_url?: string | null
          id?: string
          league_id?: string | null
          temporada?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          criado_em: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          nome: string
          resumo: Json | null
          save_id: string
          status: string
        }
        Insert: {
          criado_em?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome: string
          resumo?: Json | null
          save_id: string
          status?: string
        }
        Update: {
          criado_em?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome?: string
          resumo?: Json | null
          save_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          cargo: string
          criado_em: string
          id: string
          nacionalidade: string | null
          nome: string
          save_id: string
        }
        Insert: {
          cargo: string
          criado_em?: string
          id?: string
          nacionalidade?: string | null
          nome: string
          save_id: string
        }
        Update: {
          cargo?: string
          criado_em?: string
          id?: string
          nacionalidade?: string | null
          nome?: string
          save_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
            referencedColumns: ["id"]
          },
        ]
      }
      standings_snapshot: {
        Row: {
          criado_em: string
          derrotas: number
          empates: number
          gols_contra: number
          gols_pro: number
          id: string
          jogos: number
          pontos: number
          posicao: number | null
          rodada: number | null
          saldo: number
          save_id: string
          season_id: string | null
          time: string
          vitorias: number
        }
        Insert: {
          criado_em?: string
          derrotas?: number
          empates?: number
          gols_contra?: number
          gols_pro?: number
          id?: string
          jogos?: number
          pontos?: number
          posicao?: number | null
          rodada?: number | null
          saldo?: number
          save_id: string
          season_id?: string | null
          time: string
          vitorias?: number
        }
        Update: {
          criado_em?: string
          derrotas?: number
          empates?: number
          gols_contra?: number
          gols_pro?: number
          id?: string
          jogos?: number
          pontos?: number
          posicao?: number | null
          rodada?: number | null
          saldo?: number
          save_id?: string
          season_id?: string | null
          time?: string
          vitorias?: number
        }
        Relationships: [
          {
            foreignKeyName: "standings_snapshot_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_snapshot_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          clube_contraparte: string | null
          data: string
          duracao_emprestimo: string | null
          editado_apos_arquivamento: boolean
          id: string
          janela: Database["public"]["Enums"]["transfer_window"] | null
          jogador_troca_id: string | null
          modalidade: string | null
          obrigacao_compra: boolean
          player_id: string | null
          save_id: string
          season_id: string | null
          status_opcao: Database["public"]["Enums"]["transfer_option_status"]
          tem_opcao_compra: boolean
          tipo: string
          transfer_origem_emprestimo_id: string | null
          valor: number | null
          valor_opcao_compra: number | null
        }
        Insert: {
          clube_contraparte?: string | null
          data?: string
          duracao_emprestimo?: string | null
          editado_apos_arquivamento?: boolean
          id?: string
          janela?: Database["public"]["Enums"]["transfer_window"] | null
          jogador_troca_id?: string | null
          modalidade?: string | null
          obrigacao_compra?: boolean
          player_id?: string | null
          save_id: string
          season_id?: string | null
          status_opcao?: Database["public"]["Enums"]["transfer_option_status"]
          tem_opcao_compra?: boolean
          tipo: string
          transfer_origem_emprestimo_id?: string | null
          valor?: number | null
          valor_opcao_compra?: number | null
        }
        Update: {
          clube_contraparte?: string | null
          data?: string
          duracao_emprestimo?: string | null
          editado_apos_arquivamento?: boolean
          id?: string
          janela?: Database["public"]["Enums"]["transfer_window"] | null
          jogador_troca_id?: string | null
          modalidade?: string | null
          obrigacao_compra?: boolean
          player_id?: string | null
          save_id?: string
          season_id?: string | null
          status_opcao?: Database["public"]["Enums"]["transfer_option_status"]
          tem_opcao_compra?: boolean
          tipo?: string
          transfer_origem_emprestimo_id?: string | null
          valor?: number | null
          valor_opcao_compra?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transfers_jogador_troca_id_fkey"
            columns: ["jogador_troca_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_transfer_origem_emprestimo_id_fkey"
            columns: ["transfer_origem_emprestimo_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      trophy_gallery: {
        Row: {
          campeao_clube: string
          competition_id: string
          data_registro: string
          e_meu_clube_campeao: boolean
          e_meu_clube_vice: boolean
          editado_apos_arquivamento: boolean
          id: string
          save_id: string
          season_id: string | null
          vice_clube: string | null
        }
        Insert: {
          campeao_clube: string
          competition_id: string
          data_registro?: string
          e_meu_clube_campeao?: boolean
          e_meu_clube_vice?: boolean
          editado_apos_arquivamento?: boolean
          id?: string
          save_id: string
          season_id?: string | null
          vice_clube?: string | null
        }
        Update: {
          campeao_clube?: string
          competition_id?: string
          data_registro?: string
          e_meu_clube_campeao?: boolean
          e_meu_clube_vice?: boolean
          editado_apos_arquivamento?: boolean
          id?: string
          save_id?: string
          season_id?: string | null
          vice_clube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trophy_gallery_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trophy_gallery_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trophy_gallery_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_league: { Args: { _league_id: string }; Returns: boolean }
      owns_match: { Args: { _match_id: string }; Returns: boolean }
      owns_save: { Args: { _save_id: string }; Returns: boolean }
    }
    Enums: {
      competition_scope: "continental" | "liga" | "copa_nacional" | "supercopa"
      league_leader_kind: "artilheiro" | "assistente" | "clean_sheet"
      match_venue: "casa" | "fora"
      motivo_saida:
        | "transferencia_definitiva"
        | "emprestimo"
        | "liberado"
        | "fim_de_contrato"
        | "aposentadoria"
        | "rescisao_contrato"
      player_overall_history_reason:
        | "cadastro_inicial"
        | "atualizacao_manual"
        | "fim_temporada"
      transfer_option_status:
        | "nao_aplicavel"
        | "pendente"
        | "exercida"
        | "nao_exercida"
      transfer_window: "verao" | "inverno"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      competition_scope: ["continental", "liga", "copa_nacional", "supercopa"],
      league_leader_kind: ["artilheiro", "assistente", "clean_sheet"],
      match_venue: ["casa", "fora"],
      motivo_saida: [
        "transferencia_definitiva",
        "emprestimo",
        "liberado",
        "fim_de_contrato",
        "aposentadoria",
        "rescisao_contrato",
      ],
      player_overall_history_reason: [
        "cadastro_inicial",
        "atualizacao_manual",
        "fim_temporada",
      ],
      transfer_option_status: [
        "nao_aplicavel",
        "pendente",
        "exercida",
        "nao_exercida",
      ],
      transfer_window: ["verao", "inverno"],
    },
  },
} as const
