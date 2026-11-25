# Contexto de Back-End - SCB (Caixa)

Responsabilidade: camada de domínio e serviços JavaScript, hooks e repositories Supabase do sistema de caixa.

## Leitura do projeto
Antes de uma tarefa, leia `CONTEXTO_IA.md`, que permanece intacto e contém o contexto funcional, estrutura e informações conhecidas de schema/RLS.

## Organização e fluxo
Preserve o fluxo tela → hook/service → repository → Supabase. Centralize acesso Supabase nos repositories existentes; investigue o repository e os usos da feature antes de alterar contrato ou persistência.

## Cuidados do domínio
Considere `store_id`, RLS e isolamento por loja conforme o contexto atual. Preserve auditoria e rastreabilidade, inclusive em operações financeiras, reversões, conferência, fechamento e entregas. Trate valores monetários sem introduzir cálculos frágeis. Não presuma nomes/formatos de colunas ou JSONB; confirme no código e no banco conforme autorizado.

## Regras
Faça a menor mudança que corrija a causa. Não invente regras, tabelas ou colunas. Não altere schema, migrations ou RLS sem autorização expressa. Nunca exponha `service_role` ou credenciais no frontend. Não faça commit/push sem pedido. Ao alterar código, valide com `npm run lint` e `npm run build` quando disponíveis.

Atualize este contexto quando surgir decisão duradoura de contrato, domínio ou tratamento de erro.
