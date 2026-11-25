# CONTEXTO_BANCO_DADOS_SCB — Caixa

Responsável: Banco de Dados - SCB. Projeto: Caixa Torres Farma.

Este documento aponta para os registros de análise do PostgreSQL/Supabase mantidos junto ao projeto em `docs/database-analysis/`. Leia primeiro `CONTEXTO_IA.md`; em caso de divergência de schema/policies, confirme no banco Supabase.

Arquivos de análise: `rls.md` (RLS, policies e achados), `schema.sql`, `indices.txt`, `indices_usados.txt`, `constraints.txt`, `funcoes.txt`, `grants.txt`, `tamanhos.txt` e `notas.md`. Os resultados refletem consultas realizadas em 2026-11-24 e podem ficar desatualizados.

Não alterar schema, migrations ou RLS sem autorização expressa e análise de impacto. Não incluir segredos nem dados pessoais nos registros.
