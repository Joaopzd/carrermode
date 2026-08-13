# Career Mode Companion

Quero construir um app de gestão de "modo carreira" de futebol (companion app para um jogo de futebol), com Supabase como backend.

Crie a estrutura inicial:

1. Autenticação: login com Google (OAuth) e login/cadastro com email + senha + nome de usuário.

2. Crie as seguintes tabelas no banco (com RLS habilitado, cada usuário só acessa seus próprios dados via user_id):

- saves (id, user_id, league_id, club_id, temporada, criado_em)

- managers (id, save_id, nome, sobrenome, nome_usado, nacionalidade, estilo_tatico)

- staff (id, save_id, cargo, nome, nacionalidade)

- leagues (id, nome, pais, nivel, temporada_ref)

- clubs (id, league_id, nome, escudo_url, temporada_ref)

- players (id, save_id, nome, nacionalidade, posicao_principal, posicoes_secundarias jsonb, overall, valor_mercado, salario, idade, altura, playstyle, status, categoria, criado_via)

- matches (id, save_id, data_hora, competicao, adversario, status, placar_time, placar_adversario, posse, tempo_recuperacao, chutes, xg, passes, passes_pct, desarmes, cartoes_amarelos, cartoes_vermelhos)

- match_player_stats (id, match_id, player_id, clean_sheet, defesas, gols, xg, chutes, assistencias, xa, passes, passes_pct, desarmes, cartao_amarelo, cartao_vermelho, nota)

- transfers (id, save_id, tipo, modalidade, player_id, clube_contraparte, valor, duracao_emprestimo, jogador_troca_id, data)

- standings_snapshot (id, save_id, rodada, time, pontos, jogos, vitorias, empates, derrotas, gols_pro, gols_contra, saldo, posicao)

- news_feed (id, save_id, tipo, titulo, corpo, gerado_em, relacionado_match_id, relacionado_player_id, relacionado_transfer_id)

- board_objectives (id, save_id, temporada, tipo, meta, status)

- fan_pressure_events (id, save_id, tipo, player_id, intensidade, criado_em, resolvido)

3. Popule a tabela "leagues" com estas 13 ligas:

Premier League (Inglaterra, nível 1), EFL Championship (Inglaterra, nível 2), EFL League One (Inglaterra, nível 3), EFL League Two (Inglaterra, nível 4), LaLiga (Espanha, nível 1), LaLiga 2 (Espanha, nível 2), Ligue 1 (França, nível 1), Ligue 2 (França, nível 2), Serie A (Itália, nível 1), Serie B (Itália, nível 2), Bundesliga (Alemanha, nível 1), 2. Bundesliga (Alemanha, nível 2), Liga Portugal (Portugal, nível 1).

Não crie ainda as telas visuais — só a fundação de auth e banco. Confirme comigo antes de prosseguir.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://carrermode.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a7cfad01-7002-4d49-9ca1-d4433b95b97e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
