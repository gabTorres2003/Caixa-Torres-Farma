# Caixa — RLS, indices e constraints

Registrado em 2026-11-24, a partir do painel do Supabase e dos catalogos. Policies,
funcoes, grants e tamanhos foram consultados diretamente no SQL Editor do Caixa.

## RLS por tabela

| Tabela | RLS | Policies | Acesso efetivo |
|---|---|---|---|
| `cash_denominations` | **DESABILITADO** | 0 | qualquer um via Data API |
| `cash_movements` | **DESABILITADO** | 0 | qualquer um via Data API |
| `shift_closures` | **DESABILITADO** | 0 | qualquer um via Data API |
| `stores` | ativo | **0** | **ninguem** via anon/authenticated (so service_role) |
| `divergences` | ativo | **0** | **ninguem** via anon/authenticated (so service_role) |
| `users` | ativo | 4 | a confirmar texto |
| `pending_deliveries` | ativo | 9 | a confirmar texto |
| `deposits` | ativo | 4 | a confirmar texto |
| `motoboys` | ativo | 4 | a confirmar texto |
| `pre_closings` | ativo | 1 | a confirmar texto |
| `motoboy_routes` | ativo | 1 | a confirmar texto |
| `motoboy_time_tracking` | ativo | 1 | a confirmar texto |
| `motoboy_route_deliveries` | ativo | 1 | a confirmar texto |

## Riscos / achados

1. **Tres tabelas financeiras sem RLS**: `cash_denominations` (estoque de cedulas),
   `cash_movements` (livro de movimentos) e `shift_closures` (fechamento de turno)
   podem ser lidas, inseridas, alteradas e apagadas por qualquer portador da anon key.
   Sem autenticacao e sem isolamento por `store_id`.
2. **`divergences` e `stores` com RLS ativo e zero policies**: com a anon key,
   nenhuma linha e visivel e nenhuma escrita passa. Se o frontend consulta essas
   tabelas com o cliente padrao, a tela falha ou mostra vazio — a menos que use
   `service_role` (o que seria exposicao de chave). Verificar no codigo
   (`SupabaseDeliveryRepository`, `useCashManagement`).
3. **`deposits` tem acesso sem filtro**: DELETE/SELECT/UPDATE com `USING true` e INSERT
   com `WITH CHECK true`, incluindo policies de escrita para `public`.
4. **`motoboys` tem leitura geral sem filtro** (`anon, authenticated`, `USING true`) e
   escrita ampla para autenticados. A policy de ativos (`ativo = true`) nao restringe
   leitura devido a combinacao permissiva por OR.
5. **`pending_deliveries`** combina policy ALL para `public` com condicao apenas
   `auth.role() = 'authenticated'` e politicas mais especificas de usuario/loja. Como
   as policies sao permissivas, a policy ampla permite acesso a todas as linhas por
   qualquer autenticado; as especificas nao isolam a tabela.
5. `motoboy_route_deliveries` nao tem `store_id`: o isolamento so existe via
   `route_id` -> `motoboy_routes.store_id`. Policy por loja precisa de subconsulta.

## Indices existentes

Todos os indices sao PK, exceto:

| Tabela | Indice | Colunas |
|---|---|---|
| `cash_denominations` | `cash_denominations_store_id_valor_key` UNIQUE | `store_id, valor` |
| `shift_closures` | `shift_closures_unique` UNIQUE | `store_id, shift_date, shift_type` |
| `users` | `users_email_key` UNIQUE | `email` |

## Indices ausentes (todos os filtros por loja fazem varredura completa)

| Tabela | Indice sugerido | Uso |
|---|---|---|
| `pending_deliveries` | `(store_id, created_at DESC)` | listagem por loja e data |
| `pending_deliveries` | `(store_id, conferido)`, `(store_id, conciliado)` | filtros de conferencia |
| `pending_deliveries` | `(motorcycle_courier_id)` | entregas por motoboy |
| `deposits` | `(store_id, created_at DESC)` | relatorios e extrato |
| `pre_closings` | `(store_id, created_at DESC)` | ultimo pre-fechamento |
| `divergences` | `(store_id, created_at DESC)`, `(delivery_id)` | lista e juncao |
| `cash_movements` | `(store_id, created_at DESC)` | auditoria de movimentos |
| `cash_denominations` | ja coberto pelo UNIQUE `(store_id, valor)` | — |
| `motoboys` | `(store_id, ativo)` | lista ativa por loja |
| `motoboy_time_tracking` | `(store_id, motoboy_id, registro_time DESC)` | ponto por motoboy |
| `motoboy_routes` | `(store_id, status)`, `(motoboy_id, created_at DESC)` | rotas |
| `motoboy_route_deliveries` | `(route_id)` | itens da rota (FK sem indice) |
| `shift_closures` | coberto pelo UNIQUE | — |

Nenhum indice parcial/filtrado, nenhum GIN. `pending_deliveries` e a maior candidata
a gargalo por concentrar 9 policies e nenhum indice de loja.

## Constraints

- `users.id` FK -> `auth.users(id)` **ON DELETE CASCADE**; `store_id` FK -> `stores(id)`
  sem cascade. `role` CHECK nos tres valores; `email` UNIQUE.
- `cash_denominations` UNIQUE (`store_id`, `valor`) — impede duas linhas da mesma
  cedula na mesma loja. Bom.
- `shift_closures` UNIQUE (`store_id`, `shift_date`, `shift_type`) — um fechamento por
  turno/dia/loja.
- `motoboy_route_deliveries.route_id` FK **ON DELETE CASCADE** (apagar rota apaga itens).
- `divergences.delivery_id` FK sem `ON DELETE` (padrao RESTRICT/NO ACTION).
- Todas as FKs para `users` sem cascade: apagar usuario com historico falha.
  `users.id` cascade do Auth, porem, apaga o perfil e deixa FKs pendentes — risco.
- `pending_deliveries.motorcycle_courier_id` continua **sem FK** para `motoboys`.

## Funcoes (public)

| Funcao | SECURITY | Observacao |
|---|---|---|
| `is_admin()` | DEFINER, `search_path=public` | `EXISTS (select 1 from users where id=auth.uid() and role='ADMIN')`. Volatile: reavaliada por linha nas policies. |
| `user_store_id()` | DEFINER, `search_path=public` | `select store_id from users where id=auth.uid()`. Volatile. |
| `admin_update_user(uuid, text, text)` | DEFINER | **Sem checagem interna de permissao.** Escreve direto em `auth.users` (email e `encrypted_password` via `extensions.crypt`) e em `public.users.email`. |

### Achado critico — `admin_update_user`

- A funcao altera e-mail e senha de **qualquer** usuario, inclusive ADMIN, sem validar
  quem chama. A unica barreira e o `GRANT EXECUTE`.
- Por padrao o Postgres concede `EXECUTE` a `PUBLIC` em funcoes novas. Se esse grant
  nao foi revogado, `anon` pode chamar via RPC e trocar a senha de um administrador.
- Escreve em `auth.users` por SQL direto: nao atualiza `email_confirmed_at`, nao mexe em
  `auth.identities` e ignora as regras do Supabase Auth (hash, politicas de senha).
- Um `UPDATE` de e-mail duplicado em `auth.users` falha por unique; a transacao inteira
  aborta e nenhuma das duas tabelas muda (bom), mas o erro nao e tratado.

**Acao necessaria:** consultar `pg_proc.proacl` de `admin_update_user` e
`information_schema.routine_privileges` para `anon`/`authenticated`; se houver EXECUTE
para `anon`, e falha de seguranca aberta.

## Grants

Consulta agregada confirmou que `anon` e `authenticated` tem **todos** os privilegios
(DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE) em **todas** as 13
tabelas publicas. O resultado de `service_role`/`PUBLIC` nao ficou visivel no limite do
editor, portanto nao os confirmo aqui. Isso significa:

- Nas 3 tabelas sem RLS (`cash_denominations`, `cash_movements`, `shift_closures`),
  `anon` le, insere, altera, apaga e ainda faz `TRUNCATE`.
- Nas tabelas com 0 policies (`stores`, `divergences`), o grant existe mas nada passa.
- `TRUNCATE` para `anon` e desnecessario em qualquer cenario: nao passa por RLS nem
  dispara trigger de linha.

## Tamanhos (2026-11-24)

| Tabela | Linhas aprox. | Total |
|---|---|---|
| `cash_movements` | 969 | 440 kB |
| `pending_deliveries` | 996 | 224 kB |
| `deposits` | 775 | 288 kB |
| `motoboy_time_tracking` | 686 | 168 kB |
| `pre_closings` | 242 | 88 kB |
| `shift_closures` | 101 | 80 kB |
| `cash_denominations` | 12 | 80 kB |
| `users` | 7 | 48 kB |
| `motoboys` | 6 | 32 kB |
| `stores` | 1 | 32 kB |
| `motoboy_routes` | 0 | 16 kB |
| `motoboy_route_deliveries` | 0 | 16 kB |
| `divergences` | 0 | 16 kB |

Base pequena: a falta de indices por loja ainda nao doi, mas vira gargalo ao crescer.
Uso de indice confirma o padrao: `users_pkey` com 71.807 leituras e `stores_pkey` com
4.205 para uma tabela de 1 linha — sao as funcoes de RLS reavaliadas por linha.
`shift_closures_unique` com 1.679 usos; `pending_deliveries_pkey` 2.483.

## Consultas diretas (2026-11-24)

- Foram encontradas 25 policies em `public`; a contagem inicial estava desatualizada.
  O resultado da interface cortou a listagem completa. Os detalhes legiveis confirmam
  os acessos amplos descritos acima; a transcricao integral das 25 definicoes ainda
  precisa ser exportada para registro.
- Grants agregados: `anon` e `authenticated` tem 13 concessoes por privilegio em cada
  tipo: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE e UPDATE.
- `admin_update_user`: EXECUTE para `anon` e `authenticated`; ACL inclui `PUBLIC`,
  `anon`, `authenticated`, `service_role` e `postgres`. Funcao `SECURITY DEFINER` altera
  `auth.users.email`, `auth.users.encrypted_password` e `public.users.email` sem validar
  o chamador. Risco critico confirmado.
- `is_admin()` e `user_store_id()` tambem tem EXECUTE para `anon` e `authenticated`;
  ambas sao `SECURITY DEFINER` com `search_path=public`.
- Tamanhos filtrados a `public`: `cash_movements` 440 kB/969 linhas; `deposits` 288
  kB/776; `pending_deliveries` 224 kB/998; `motoboy_time_tracking` 168 kB/686;
  `pre_closings` 88 kB/242; `shift_closures` 80 kB/101; `cash_denominations` 80
  kB/12; `users` 48 kB/7; `stores` 32 kB/1; `motoboys` 32 kB/6; `divergences` 16
  kB/0; `motoboy_routes` 16 kB/0; `motoboy_route_deliveries` 16 kB/0. Linhas sao
  estimativas e podem variar entre leituras.

