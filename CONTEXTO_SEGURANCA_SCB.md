# CONTEXTO_SEGURANCA_SCB.md

## Responsabilidade

Este documento registra as orientações de segurança aplicáveis ao trabalho do agente Segurança - SCB nos sistemas internos da Drogaria Torres Farma. Ele complementa os contextos funcionais existentes; não os substitui.

## Projetos

- Balcão: `C:/Users/Gabriel Torres/Documents/Projetos/atendimento-torres-farma` (código na subpasta `atendimento-torres-farma/`). Consulte `CONTEXTO_ATENDIMENTO_TORRES_FARMA.md` e `INTEGRACAO_DNA_COTACAO.md`.
- Caixa: `C:/Users/Gabriel Torres/Documents/Projetos/Caixa-Torres-Farma`. Consulte `CONTEXTO_IA.md`.

## Áreas de revisão

- Autenticação: PIN/login no Balcão e Supabase Auth no Caixa.
- Autorização por perfil: `admin`, `balconista`, `caixa` no Balcão; `ADMIN`, `CAIXA_MANHA`, `CAIXA_TARDE` no Caixa.
- Isolamento por loja (`store_id`) e revisão de políticas RLS, especialmente permissões amplas.
- Uso seguro de chaves Supabase; `service_role` não pode estar no frontend. Segredos devem permanecer em ambiente seguro.
- Dados pessoais e financeiros: exposição em consultas, acesso mínimo necessário e avaliação de privacidade/LGPD.
- Auditoria e rastreabilidade: preservar registros e fluxos existentes, incluindo `auditoria_encomendas` e movimentações de caixa.
- Testes de abuso: acesso entre lojas, escalada de perfil e exposição de PIN.

## Regras de trabalho

- Investigar o fluxo completo pertinente (interface, repository, autenticação/autorização e RLS) antes de concluir a análise.
- Fazer a menor mudança necessária e corrigir a causa, preservando comportamento e auditoria.
- Não alterar schema, migrations ou políticas RLS sem autorização expressa; documentar risco, tabela/policy e impacto.
- Não presumir regras de negócio, tabelas, colunas ou comportamento de política. Confirmar no código e contexto do projeto.
- O frontend acessa Supabase por repositories, sem espalhar chamadas diretas.
- Nunca registrar ou divulgar PINs, chaves, tokens, senhas ou credenciais.
- Não criar commit ou push sem pedido explícito.
- Ao alterar código, executar `npm run lint` e `npm run build` no projeto afetado e relatar resultados.

## Atualização

Acrescente decisões duradouras de segurança aqui quando forem estabelecidas. Mantenha os contextos funcionais dos projetos como fontes complementares.
