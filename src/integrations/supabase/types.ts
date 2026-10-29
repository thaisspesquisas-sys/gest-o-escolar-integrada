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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          acao: string
          antes: Json | null
          created_at: string
          depois: Json | null
          id: number
          registro_id: string | null
          tabela: string
          usuario_email: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          antes?: Json | null
          created_at?: string
          depois?: Json | null
          id?: number
          registro_id?: string | null
          tabela: string
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          antes?: Json | null
          created_at?: string
          depois?: Json | null
          id?: number
          registro_id?: string | null
          tabela?: string
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      cargos: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          brasao_url: string | null
          id: number
          logo_url: string | null
          municipio: string
          secretaria: string
          updated_at: string
        }
        Insert: {
          brasao_url?: string | null
          id?: number
          logo_url?: string | null
          municipio?: string
          secretaria?: string
          updated_at?: string
        }
        Update: {
          brasao_url?: string | null
          id?: number
          logo_url?: string | null
          municipio?: string
          secretaria?: string
          updated_at?: string
        }
        Relationships: []
      }
      funcoes: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      importacoes: {
        Row: {
          aba: string | null
          arquivo_nome: string
          atualizados: number
          created_at: string
          dados_originais: Json | null
          id: string
          ignorados: number
          mapeamento: Json | null
          novos: number
          para_correcao: number
          pendencias: Json | null
          usuario_email: string | null
          usuario_id: string | null
        }
        Insert: {
          aba?: string | null
          arquivo_nome: string
          atualizados?: number
          created_at?: string
          dados_originais?: Json | null
          id?: string
          ignorados?: number
          mapeamento?: Json | null
          novos?: number
          para_correcao?: number
          pendencias?: Json | null
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Update: {
          aba?: string | null
          arquivo_nome?: string
          atualizados?: number
          created_at?: string
          dados_originais?: Json | null
          id?: string
          ignorados?: number
          mapeamento?: Json | null
          novos?: number
          para_correcao?: number
          pendencias?: Json | null
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id: string
          nome?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permissao: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          permissao: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          permissao?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      servidores: {
        Row: {
          ativo: boolean
          ato_data: string | null
          ato_numero: string | null
          carga_horaria: string | null
          cargo_id: string | null
          created_at: string
          created_by: string | null
          data_admissao: string | null
          data_desligamento: string | null
          email: string | null
          funcao_id: string | null
          id: string
          matricula: string
          municipio_exercicio: string | null
          nome: string
          observacoes: string | null
          secretaria_origem: string | null
          situacao_id: string | null
          telefone: string | null
          turno: string | null
          unidade_id: string | null
          updated_at: string
          updated_by: string | null
          vinculo_id: string | null
        }
        Insert: {
          ativo?: boolean
          ato_data?: string | null
          ato_numero?: string | null
          carga_horaria?: string | null
          cargo_id?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          data_desligamento?: string | null
          email?: string | null
          funcao_id?: string | null
          id?: string
          matricula: string
          municipio_exercicio?: string | null
          nome: string
          observacoes?: string | null
          secretaria_origem?: string | null
          situacao_id?: string | null
          telefone?: string | null
          turno?: string | null
          unidade_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vinculo_id?: string | null
        }
        Update: {
          ativo?: boolean
          ato_data?: string | null
          ato_numero?: string | null
          carga_horaria?: string | null
          cargo_id?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          data_desligamento?: string | null
          email?: string | null
          funcao_id?: string | null
          id?: string
          matricula?: string
          municipio_exercicio?: string | null
          nome?: string
          observacoes?: string | null
          secretaria_origem?: string | null
          situacao_id?: string | null
          telefone?: string | null
          turno?: string | null
          unidade_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servidores_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servidores_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servidores_situacao_id_fkey"
            columns: ["situacao_id"]
            isOneToOne: false
            referencedRelation: "situacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servidores_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servidores_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "vinculos"
            referencedColumns: ["id"]
          },
        ]
      }
      servidores_sensiveis: {
        Row: {
          cpf: string
          servidor_id: string
        }
        Insert: {
          cpf: string
          servidor_id: string
        }
        Update: {
          cpf?: string
          servidor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servidores_sensiveis_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: true
            referencedRelation: "servidores"
            referencedColumns: ["id"]
          },
        ]
      }
      situacoes: {
        Row: {
          categoria: string
          created_at: string
          em_exercicio: boolean
          id: string
          nome: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          em_exercicio?: boolean
          id?: string
          nome: string
        }
        Update: {
          categoria?: string
          created_at?: string
          em_exercicio?: boolean
          id?: string
          nome?: string
        }
        Relationships: []
      }
      turmas: {
        Row: {
          ano_letivo: number
          created_at: string
          etapa: string
          id: string
          nome: string
          turno: string | null
          unidade_id: string
        }
        Insert: {
          ano_letivo?: number
          created_at?: string
          etapa: string
          id?: string
          nome: string
          turno?: string | null
          unidade_id: string
        }
        Update: {
          ano_letivo?: number
          created_at?: string
          etapa?: string
          id?: string
          nome?: string
          turno?: string | null
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          codigo: string | null
          created_at: string
          endereco: string | null
          id: string
          localidade: string | null
          nome: string
          observacoes: string | null
          situacao: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          localidade?: string | null
          nome: string
          observacoes?: string | null
          situacao?: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          localidade?: string | null
          nome?: string
          observacoes?: string | null
          situacao?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vagas: {
        Row: {
          ano_referencia: number
          autorizadas: number | null
          cargo_id: string
          created_at: string
          funcao_id: string | null
          id: string
          justificativa: string | null
          previstas_concurso: number | null
          previstas_lei: number | null
          previstas_pss: number | null
          previstas_temporaria: number | null
          reservadas: number
          status_validacao: string
          unidade_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ano_referencia?: number
          autorizadas?: number | null
          cargo_id: string
          created_at?: string
          funcao_id?: string | null
          id?: string
          justificativa?: string | null
          previstas_concurso?: number | null
          previstas_lei?: number | null
          previstas_pss?: number | null
          previstas_temporaria?: number | null
          reservadas?: number
          status_validacao?: string
          unidade_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ano_referencia?: number
          autorizadas?: number | null
          cargo_id?: string
          created_at?: string
          funcao_id?: string | null
          id?: string
          justificativa?: string | null
          previstas_concurso?: number | null
          previstas_lei?: number | null
          previstas_pss?: number | null
          previstas_temporaria?: number | null
          reservadas?: number
          status_validacao?: string
          unidade_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vagas_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      vinculos: {
        Row: {
          categoria: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      contar_servidores_unicos: { Args: { _ids: string[] }; Returns: number }
      existe_admin: { Args: never; Returns: boolean }
      has_perm: { Args: { _perm: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: { Args: never; Returns: boolean }
      my_permissions: { Args: never; Returns: string[] }
    }
    Enums: {
      app_role:
        | "admin"
        | "secretario"
        | "subsecretario"
        | "rh"
        | "administrativo"
        | "consulta"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "admin",
        "secretario",
        "subsecretario",
        "rh",
        "administrativo",
        "consulta",
      ],
    },
  },
} as const
