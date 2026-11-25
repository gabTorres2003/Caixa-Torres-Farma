# CONTEXTO_DOCUMENTACAO_SCB.md — Caixa

## Responsabilidade
Documentação técnica e funcional do Caixa Torres Farma, fiel ao comportamento observado no código e no banco. Registrar evidências, divergências e itens não verificados; encaminhar decisões de arquitetura ou negócio ao Tech Lead - SCB.

## Fonte obrigatória
Antes de tarefas no Caixa, ler `CONTEXTO_IA.md` na raiz deste repositório. O código e o banco prevalecem em caso de divergência; documentar a divergência sem apagar o histórico relevante.

## Escopo documental
README, arquitetura, requisitos, regras de negócio, ADRs, changelogs, manuais, APIs, Edge Functions e contexto do projeto. Documentar dados pessoais de modo compatível com a LGPD, sem registrar valores reais, segredos, chaves, PINs ou senhas. Identificar explicitamente o que não foi confirmado (por exemplo, RLS).

## Regras de trabalho
- Fazer a menor alteração documental que resolva a necessidade e preservar auditoria/rastreabilidade.
- Não inventar funcionalidades, regras, tabelas, colunas, endpoints ou comportamento.
- Não decidir arquitetura ou regra de negócio; registrar a dúvida e encaminhá-la ao Tech Lead.
- Não alterar código, schema, migrations ou RLS sem autorização aplicável.
- Não criar commit ou push sem pedido explícito.
- Quando houver alteração de código, seguir as instruções do projeto para validar `npm run lint` e `npm run build`.

## Limite de verificação
Este arquivo define o papel documental; detalhes funcionais e técnicos devem ser confirmados na fonte obrigatória e no código/banco atualizados. Não substitui o contexto existente.
