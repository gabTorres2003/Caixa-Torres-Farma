# Banco do Caixa — notas

## Registo do dump

| Item | Valor |
|---|---|
| Fonte | dump enviado pelo usuario (schema apenas) |
| Recebido em | 2026-11-24 |
| Tabelas | 13 |
| Inclui RLS/policies | Nao |
| Inclui indices | Nao (apenas os implicitos de PK/UNIQUE) |
| Inclui migrations | Nao |

## Tabelas no dump

`stores`, `users`, `pending_deliveries`, `deposits`, `pre_closings`, `divergences`,
`cash_denominations`, `cash_movements`, `shift_closures`, `motoboys`,
`motoboy_time_tracking`, `motoboy_routes`, `motoboy_route_deliveries`.

## Confirmacoes face aos documentos

- `users.role` com CHECK em `ADMIN`, `CAIXA_MANHA`, `CAIXA_TARDE`. Confirmado.
- `users.id` FK para `auth.users(id)`; `store_id` NOT NULL FK para `stores`. Confirmado.
- `deposits` mantem os pares legados `value`/`valor` e `origin`/`origem`. Confirmado.
- `pending_deliveries.motorcycle_courier_id` sem FK declarada. Confirmado.
- `cash_movements.detalhamento` jsonb NOT NULL. Confirmado.
- Todas as tabelas operacionais tem `store_id` NOT NULL com FK para `stores`.
  Excecao: `motoboy_route_deliveries` nao tem `store_id` (liga pela rota).

## Lacunas / a confirmar no banco

- ~~Indices~~ Registrados em `indices.txt`; analise em `rls.md` (14 lacunas, nenhum
  indice por `store_id`).
- ~~Constraints~~ Registradas em `constraints.txt`.
- **Texto das 14 policies RLS** (bloco 2 do `db/introspect.sql`) — pendente.
- Funcoes registradas em `funcoes.txt`; grants em `grants.txt`; tamanhos em `tamanhos.txt`.
  Achado critico: `admin_update_user` (SECURITY DEFINER) troca e-mail/senha de qualquer
  usuario sem checar quem chama — ver `rls.md`.
- `divergences` e `stores` com RLS ativo e 0 policies: confirmar como o frontend le
  essas tabelas.
- `cash_denominations`, `cash_movements` e `shift_closures` sem RLS — risco critico.
- Funcoes de RLS (`is_admin`, `user_store_id`), grants e tamanhos — pendente.
- `users.id` sem default (depende do Supabase Auth) — coerente com o documento,
  mas diverge da tabela descrita com `default gen_random_uuid()`.
- Versao do dump e data de referencia do banco nao informadas.
