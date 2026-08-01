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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      board_objectives: {
        Row: {
          criado_em: string
          id: string
          meta: string | null
          save_id: string
          status: string
          temporada: string | null
          tipo: string
        }
        Insert: {
          criado_em?: string
          id?: string
          meta?: string | null
          save_id: string
          status?: string
          temporada?: string | null
          tipo: string
        }
        Update: {
          criado_em?: string
          id?: string
          meta?: string | null
          save_id?: string
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
        ]
      }
      clubs: {
        Row: {
          criado_em: string
          escudo_url: string | null
          id: string
          league_id: string | null
          nome: string
          temporada_ref: string | null
        }
        Insert: {
          criado_em?: string
          escudo_url?: string | null
          id?: string
          league_id?: string | null
          nome: string
          temporada_ref?: string | null
        }
        Update: {
          criado_em?: string
          escudo_url?: string | null
          id?: string
          league_id?: string | null
          nome?: string
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
          id: string
          passes: number | null
          passes_pct: number | null
          placar_adversario: number | null
          placar_time: number | null
          posse: number | null
          save_id: string
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
          id?: string
          passes?: number | null
          passes_pct?: number | null
          placar_adversario?: number | null
          placar_time?: number | null
          posse?: number | null
          save_id: string
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
          id?: string
          passes?: number | null
          passes_pct?: number | null
          placar_adversario?: number | null
          placar_time?: number | null
          posse?: number | null
          save_id?: string
          status?: string
          tempo_recuperacao?: number | null
          xg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "saves"
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
        ]
      }
      players: {
        Row: {
          altura: number | null
          categoria: string | null
          criado_em: string
          criado_via: string | null
          id: string
          idade: number | null
          nacionalidade: string | null
          nome: string
          overall: number | null
          playstyle: string | null
          posicao_principal: string | null
          posicoes_secundarias: Json
          salario: number | null
          save_id: string
          status: string | null
          valor_mercado: number | null
        }
        Insert: {
          altura?: number | null
          categoria?: string | null
          criado_em?: string
          criado_via?: string | null
          id?: string
          idade?: number | null
          nacionalidade?: string | null
          nome: string
          overall?: number | null
          playstyle?: string | null
          posicao_principal?: string | null
          posicoes_secundarias?: Json
          salario?: number | null
          save_id: string
          status?: string | null
          valor_mercado?: number | null
        }
        Update: {
          altura?: number | null
          categoria?: string | null
          criado_em?: string
          criado_via?: string | null
          id?: string
          idade?: number | null
          nacionalidade?: string | null
          nome?: string
          overall?: number | null
          playstyle?: string | null
          posicao_principal?: string | null
          posicoes_secundarias?: Json
          salario?: number | null
          save_id?: string
          status?: string | null
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
          id: string
          league_id: string | null
          temporada: string
          user_id: string
        }
        Insert: {
          club_id?: string | null
          criado_em?: string
          id?: string
          league_id?: string | null
          temporada: string
          user_id: string
        }
        Update: {
          club_id?: string | null
          criado_em?: string
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
        ]
      }
      transfers: {
        Row: {
          clube_contraparte: string | null
          data: string
          duracao_emprestimo: string | null
          id: string
          jogador_troca_id: string | null
          modalidade: string | null
          player_id: string | null
          save_id: string
          tipo: string
          valor: number | null
        }
        Insert: {
          clube_contraparte?: string | null
          data?: string
          duracao_emprestimo?: string | null
          id?: string
          jogador_troca_id?: string | null
          modalidade?: string | null
          player_id?: string | null
          save_id: string
          tipo: string
          valor?: number | null
        }
        Update: {
          clube_contraparte?: string | null
          data?: string
          duracao_emprestimo?: string | null
          id?: string
          jogador_troca_id?: string | null
          modalidade?: string | null
          player_id?: string | null
          save_id?: string
          tipo?: string
          valor?: number | null
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_match: { Args: { _match_id: string }; Returns: boolean }
      owns_save: { Args: { _save_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
