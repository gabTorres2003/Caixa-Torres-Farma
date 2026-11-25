# Contexto DevOps — Balcão e Caixa SCB

## Responsabilidade e escopo

DevOps - SCB cuida dos ambientes de desenvolvimento, homologação e produção, deploy, CI/CD, backups, monitoramento, logs, alertas, recuperação e análise de disponibilidade, RPO, RTO e escalabilidade dos sistemas internos da Drogaria Torres Farma: Balcão (atendimento) e Caixa.

## Repositórios e contexto relacionado

- Balcão: `C:/Users/Gabriel Torres/Documents/Projetos/atendimento-torres-farma`; aplicação dentro de `atendimento-torres-farma/`.
- Caixa: `C:/Users/Gabriel Torres/Documents/Projetos/Caixa-Torres-Farma`.
- Antes de atuar no Balcão, leia `CONTEXTO_ATENDIMENTO_TORRES_FARMA.md` e `INTEGRACAO_DNA_COTACAO.md` na raiz do repositório.
- Antes de atuar no Caixa, leia `CONTEXTO_IA.md` na raiz do repositório.

## Operação e implantação

- Frontends publicados na Netlify. Conferir `netlify.toml`: build `npm run build`, diretório publicado `dist` e redirect SPA `/* -> /index.html` com status 200.
- Variáveis Vite por ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Valores reais ficam no ambiente operacional, nunca em código ou documentação.
- Edge Functions do Supabase podem depender de secrets, por exemplo a função `consulta-dna` e variáveis `COTACAO_*`. Não ler, alterar ou revelar secrets sem autorização explícita.
- O Balcão consulta produtos DNA pelo repository de integração, pela Edge Function `consulta-dna` e pelo backend Cotaçāo; indisponibilidade ou versão publicada pode afetar a busca textual. A integração é somente leitura conforme o contexto existente.
- O Caixa usa frontend React/Vite, Supabase para autenticação e persistência, repositories em `src/infrastructure/supabase/repositories/` e hospedagem Netlify, conforme `CONTEXTO_IA.md`.
- Não afirmar que deploy, backup, monitoramento ou recuperação estão ativos sem evidência operacional atual. Registrar evidência, horário e ambiente ao fazer análises.

## Regras de trabalho

- Fazer a menor mudança necessária; sem refatoração ou alteração especulativa.
- Não criar commit nem push sem pedido explícito.
- Se alterar código, validar `npm run lint` e `npm run build`.
- Não alterar schema, migrations ou RLS sem autorização expressa; não inventar regras, tabelas, colunas ou enums.
- Preservar auditoria e rastreabilidade. A aplicação deve manter o acesso Supabase nas camadas/repositories existentes.
- Nunca incluir segredos, chaves ou dados pessoais em arquivos, logs compartilhados ou respostas.
- Deploy, mudanças em infraestrutura produtiva e acesso a secrets exigem autorização explícita.

## Atualização

Complemente este documento quando surgir uma decisão nova do domínio DevOps. Preserve o conteúdo existente ao integrar futuras atualizações.
