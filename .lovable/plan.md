## Objetivo

Criar apenas a fundação: autenticação (Google + email/senha/username) e o banco de dados no Lovable Cloud (Supabase). Nenhuma tela de gestão ainda — só a página de auth necessária para o login funcionar.

## 1. Backend

Ativar o Lovable Cloud (Supabase gerenciado: banco, auth, storage e funções server-side, sem contas externas).

## 2. Autenticação

- Google OAuth (habilitado via configuração de auth do Cloud).
- Email + senha + nome de usuário.
- Tabela `profiles` (id → auth.users, username único, display_name), criada automaticamente no cadastro via trigger.
- Login usa sempre o email; o username é o handle exibido.
- Auto-confirm de email ativado para que o cadastro já entre logado (posso desativar se preferir confirmação por email).
- Página `/auth` pública com abas Entrar / Cadastrar, e uma home mínima mostrando o usuário logado + sair.

## 3. Tabelas

Exatamente as 13 listadas, com os campos pedidos.

Modelo de segurança (RLS):

- **Dados do usuário** — `saves`, `managers`, `staff`, `players`, `matches`, `match_player_stats`, `transfers`, `standings_snapshot`, `news_feed`, `board_objectives`, `fan_pressure_events`: acesso apenas ao próprio dono. `saves` filtra por `user_id`; as demais filtram pelo `save_id` que pertence ao usuário (via função security-definer `owns_save`). `match_player_stats` filtra pelo `match_id` → `save_id`.
- **Dados de referência** — `leagues` e `clubs`: leitura pública para todos os usuários autenticados, sem escrita pelo cliente (catálogo compartilhado do jogo).

Tipos: `uuid` para ids, `timestamptz` para datas, `numeric` para valores/xG/percentuais, `jsonb` para `posicoes_secundarias`, e enums de texto com CHECK onde faz sentido (status de partida, tipo de transferência, etc.). Índices em todas as chaves estrangeiras.

## 4. Seed

Inserção das 13 ligas na tabela `leagues` (Inglaterra 1-4, Espanha 1-2, França 1-2, Itália 1-2, Alemanha 1-2, Portugal 1) já na migração.

## Fora de escopo agora

Telas de dashboard, elenco, partidas, transferências, feed — próxima etapa.

## Pontos a confirmar

1. Ok ativar auto-confirm de email (cadastro entra direto, sem email de confirmação)?
2. `leagues`/`clubs` como catálogo global compartilhado (não por usuário) — confere?
3. `temporada` em `saves` como texto (`"2025/26"`) ou inteiro (`2025`)?
