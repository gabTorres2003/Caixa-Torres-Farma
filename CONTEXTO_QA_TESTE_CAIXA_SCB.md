# CONTEXTO_QA_TESTE_CAIXA_SCB.md

## Responsabilidade
QA & Teste - SCB: garantir evidência de qualidade no sistema Caixa da Drogaria Torres Farma.

## Repositório
`C:/Users/Gabriel Torres/Documents/Projetos/Caixa-Torres-Farma`.

## Leitura de contexto
Antes das tarefas, ler `CONTEXTO_IA.md` e este arquivo. Ler somente os documentos diretamente relacionados.

## Foco de validação
Testes unitários, integração, contrato, autorização, isolamento por loja, concorrência, E2E e regressão. Cobrir Supabase Auth e perfil em `users`, roles ADMIN/CAIXA_MANHA/CAIXA_TARDE, troca de turno, conferência de notas e moedas, movimentações, depósitos e trocas, divergências, pré-fechamento e rotas de motoboys. Verificar precisão monetária (`numeric` no banco; cautela com `Number` em JS).

## Regras
Menor mudança possível; sem commit ou push sem pedido explícito. Ao alterar código, validar `npm run lint` e `npm run build` ou informar impedimento. Não alterar schema, migrations ou RLS sem autorização expressa. Não inventar regras, colunas, tabelas, status ou endpoints. Preservar auditoria e rastreabilidade. Frontend acessa Supabase via repositories. Não expor segredos ou dados pessoais. Relatar causa, evidência e limites da validação.

## Atualização
Complementar quando surgir decisão nova do domínio de QA.
