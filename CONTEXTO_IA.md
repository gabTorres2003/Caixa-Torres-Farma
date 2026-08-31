# CONTEXTO DO SISTEMA — CAIXA TORRES FARMA

> **Documento de contexto para IAs/agentes de desenvolvimento.**
>
> Este arquivo existe para reduzir a necessidade de redescobrir a arquitetura e as regras do projeto a cada solicitação. Antes de implementar qualquer mudança, leia este documento e, em seguida, investigue somente os arquivos diretamente relacionados ao problema.

## 1. Identidade e objetivo do sistema

**Projeto:** Caixa Torres Farma  
**Repositório:** `gabTorres2003/Caixa-Torres-Farma`  
**Branch principal:** `main`

O sistema é uma aplicação web interna da **Drogaria Torres Farma**, voltada principalmente para a **gestão de caixa, conferência de dinheiro, depósitos, entregas, divergências, fechamento/preenchimento de caixa e gestão de motoboys**.

O sistema possui suporte a múltiplas lojas (`stores`) e vincula usuários e operações a uma loja por `store_id`.

O foco funcional inclui:

- autenticação de usuários;
- controle de acesso por perfil;
- troca de turno;
- gestão/conferência de notas e moedas;
- controle de estoque físico de cédulas/moedas do cofre;
- movimentações de dinheiro;
- depósitos;
- trocas;
- pré-fechamento de caixa;
- divergências;
- relatórios;
- cadastro/gestão de usuários;
- gestão de motoboys;
- controle de ponto dos motoboys;
- criação e acompanhamento de rotas de entrega;
- associação de pedidos/entregas às rotas.

---

## 2. Stack tecnológica atual

### Frontend

- **React 19**
- **Vite 8**
- JavaScript/JSX
- `react-router-dom` 7
- `zustand` 5
- `react-hook-form` 7
- `axios` 1
- `lucide-react`
- `@react-pdf/renderer`
- `react-to-print`
- `@supabase/supabase-js` 2

As dependências e scripts atuais estão definidos no `package.json`. O projeto usa:

- `npm run dev` para desenvolvimento;
- `npm run build` para build de produção;
- `npm run preview` para pré-visualização do build.

### Backend / infraestrutura de dados

Não há backend Java/Spring neste projeto. A aplicação frontend acessa o **Supabase diretamente**, utilizando o SDK `@supabase/supabase-js`.

O cliente Supabase é criado em:

`src/infrastructure/supabase/supabaseClient.js`

As credenciais são obtidas por variáveis de ambiente Vite:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Nunca inserir URL, chave, senha ou segredo diretamente no código-fonte.**

### Banco de dados

- **PostgreSQL hospedado no Supabase**.
- O frontend conversa com o banco por meio da API do Supabase.
- As operações de persistência estão organizadas em repositories dentro de:

`src/infrastructure/supabase/repositories/`

### Hospedagem

O frontend é hospedado na **Netlify**.

O arquivo `netlify.toml` configura:

- build: `npm run build`;
- publicação: `dist`;
- redirect `/* -> /index.html` com status `200`, necessário para o funcionamento das rotas do SPA com React Router.

---

## 3. Arquitetura do frontend

A estrutura atual segue uma separação aproximada entre aplicação, domínio, infraestrutura, funcionalidades, núcleo e componentes compartilhados:

```text
src/
├── app/
│   ├── providers/
│   │   └── AuthProvider.jsx
│   └── routes/
│       └── AppRoutes.jsx
│
├── core/
│   ├── constants/
│   ├── hooks/
│   └── utils/
│
├── domain/
│   ├── entities/
│   └── services/
│
├── features/
│   ├── auth/
│   ├── conference/
│   ├── dashboard/
│   ├── deposits/
│   ├── divergences/
│   ├── motoboys/
│   ├── pre-closing/
│   ├── reports/
│   └── shift-handover/
│
├── infrastructure/
│   └── supabase/
│       ├── repositories/
│       └── supabaseClient.js
│
├── shared/
└── main.jsx
```

### Regra arquitetural importante

Sempre que possível, preserve o fluxo existente:

```text
Tela/Feature
    ↓
Hook / Service / regra de domínio
    ↓
Repository Supabase
    ↓
Supabase / PostgreSQL
```

Não espalhe chamadas Supabase aleatórias por componentes se já existir um repository/hook responsável pela funcionalidade.

Antes de criar uma nova abstração, procure se já existe uma implementação equivalente.

---

## 4. Autenticação e usuários

A autenticação utiliza o Supabase Auth.

O `AuthProvider`:

1. verifica a sessão existente ao abrir a aplicação;
2. obtém o usuário autenticado;
3. busca o perfil correspondente na tabela `users`;
4. combina os dados do Auth com o perfil da aplicação;
5. disponibiliza `user`, `session`, `isLoading`, `login` e `logout` pelo contexto.

Arquivo principal:

`src/app/providers/AuthProvider.jsx`

O serviço de autenticação fica em:

`src/domain/services/AuthService.js`

A aplicação utiliza o perfil da tabela `users` para obter informações como `nome`, `role` e `store_id`.

### Perfis

O código atualmente utiliza principalmente o perfil:

- `ADMIN`

Usuários que não são ADMIN são tratados como operadores/usuários comuns em várias áreas.

**Não assumir que todo usuário pode acessar dados de todas as lojas.** O `store_id` é parte central do modelo de autorização.

---

## 5. Rotas e permissões no frontend

As rotas estão em:

`src/app/routes/AppRoutes.jsx`

### Rotas comuns após login

- `/troca-turno`
- `/depositos`
- `/moedas`
- `/trocas`
- `/pre-fechamento`

### Rotas protegidas para ADMIN

- `/dashboard`
- `/divergencias`
- `/relatorios`
- `/gerenciar-usuarios`
- `/motoboys`
- `/conferencia/notas-moedas`
- `/conferencia/caixas-fechados`

A raiz `/` direciona:

- ADMIN → `/dashboard`
- demais usuários → `/troca-turno`

Existe também proteção para impedir usuário autenticado de voltar para `/login`.

**Importante:** proteção de rota no frontend não substitui RLS/autorização no banco. Alterações envolvendo dados sensíveis devem considerar as políticas do Supabase.

---

# 6. Módulos funcionais

## Autenticação

Localização:

`src/features/auth/`

Principais telas:

- `Login.jsx`
- `UserManagement.jsx`

Responsabilidades:

- login/logout;
- carregamento do perfil;
- administração de usuários.

## Dashboard

Localização:

`src/features/dashboard/`

Área administrativa para visão consolidada das operações.

## Troca de turno

Localização:

`src/features/shift-handover/`

Responsável pelas operações relacionadas à troca/fechamento de turno.

Existe também:

`src/core/hooks/useShiftHandover.js`

E repository:

`src/infrastructure/supabase/repositories/ShiftHandoverRepository.js`

## Depósitos e trocas

Localização:

`src/features/deposits/`

Inclui:

- `Deposits.jsx`
- `Exchanges.jsx`
- `Coins.jsx`

Repositories relacionados:

- `SupabaseDepositRepository.js`

Hooks relacionados:

- `useDeposits.js`
- `useExchanges.js`

## Pré-fechamento

Localização:

`src/features/pre-closing/`

Repository:

`SupabasePreClosingRepository.js`

Hook:

`usePreClosing.js`

## Divergências

Localização:

`src/features/divergences/`

Relaciona divergências a operações de entrega quando aplicável.

## Relatórios

Localização:

`src/features/reports/`

## Conferência de notas e moedas

Localização:

`src/features/conference/`

Arquivo principal identificado:

`NotesCoinsManagement.jsx`

O gerenciamento de dinheiro utiliza especialmente:

`src/core/hooks/useCashManagement.js`

Esse hook controla, entre outros:

- estoque de denominações;
- última conferência;
- movimentações;
- filtro de data da auditoria;
- ajustes de saldo;
- atualização de métricas;
- registro de sobra de caixa;
- entradas manuais;
- preparação de bolsas de abertura;
- reversão/estorno de movimentações.

Repository principal:

`src/infrastructure/supabase/repositories/SupabaseCashRepository.js`

### Observação importante sobre o fluxo de dinheiro

O saldo físico não deve ser tratado simplesmente como um valor calculado no frontend. Existem registros de movimentação/auditoria e operações específicas para entrada, saída, ajuste e reversão.

Ao alterar qualquer lógica de caixa:

1. entenda primeiro como o repository grava a movimentação;
2. entenda como o saldo/denominações são atualizados;
3. verifique se existe auditoria;
4. verifique o impacto em pré-fechamento, conferência e relatórios;
5. preserve a possibilidade de rastrear operações.

Evite alterações que apenas mudem o valor exibido sem preservar a origem da movimentação.

## Motoboys

Localização:

`src/features/motoboys/`

Funcionalidades relacionadas a:

- cadastro de motoboys;
- status ativo/inativo;
- horário de trabalho;
- ponto/registro de horários;
- rotas;
- entregas dentro de rotas.

Hook:

`src/core/hooks/useMotoboys.js`

Repository:

`src/infrastructure/supabase/repositories/SupabaseMotoboyRepository.js`

---

# 7. Modelo de dados — PostgreSQL / Supabase

> O esquema abaixo representa o estado informado/observado para o sistema. Em caso de divergência com o banco real, **verifique o Supabase antes de assumir que este documento é mais atual**.

## `stores`

Representa as lojas/unidades.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `nome` | text | — |
| `endereco` | text | Nullable |
| `telefone` | text | Nullable |
| `ativo` | bool | Nullable |
| `created_at` | timestamptz | — |

## `users`

Perfil de usuário da aplicação associado ao Supabase Auth.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `nome` | text | — |
| `email` | text | Unique |
| `role` | text | — |
| `store_id` | uuid | — |
| `created_at` | timestamptz | — |

Relacionamento conceitual:

```text
stores 1 ─── N users
```

O `users.id` corresponde ao usuário autenticado do Supabase Auth.

## `pending_deliveries`

Registra entregas/comandas pendentes e seus dados de conferência/conciliação.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `store_id` | uuid | — |
| `created_by` | uuid | — |
| `created_at` | timestamptz | — |
| `received_at` | timestamptz | Nullable |
| `notes` | text | Nullable |
| `motorcycle_courier_id` | uuid | Nullable |
| `comanda` | text | Nullable |
| `valor` | numeric | Nullable |
| `tipo_saida` | varchar | Nullable |
| `forma_pagamento_real` | varchar | Nullable |
| `conferido` | bool | — |
| `observacoes` | text | Nullable |
| `conciliado` | bool | — |

Relacionamentos conceituais:

```text
stores 1 ─── N pending_deliveries
users  1 ─── N pending_deliveries (created_by)
motoboys 1 ─── N pending_deliveries (motorcycle_courier_id)
```

## `deposits`

Registra depósitos e operações financeiras relacionadas.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `store_id` | uuid | — |
| `value` | numeric | — |
| `origin` | text | — |
| `created_by` | uuid | — |
| `created_at` | timestamptz | — |
| `cancelled` | bool | Nullable |
| `origem` | varchar | Nullable |
| `data_caixa` | date | Nullable |
| `valor` | numeric | Nullable |
| `categoria` | varchar | Nullable |
| `responsavel_nome` | varchar | Nullable |
| `destino` | text | Nullable |
| `status_troca` | varchar | Nullable |
| `recebido_por` | varchar | Nullable |
| `recebido_em` | timestamptz | Nullable |
| `detalhes_troca` | jsonb | Nullable |
| `valor_recebido` | numeric | Nullable |

### Atenção

A tabela contém nomes potencialmente redundantes/legados, como `value`/`valor` e `origin`/`origem`. **Não renomear, remover ou consolidar campos sem investigar todo o uso no código e no banco.**

## `pre_closings`

Registra o pré-fechamento por loja.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `store_id` | uuid | — |
| `cash_value` | numeric | Nullable |
| `card_value` | numeric | Nullable |
| `pix_value` | numeric | Nullable |
| `check_value` | numeric | Nullable |
| `pending_card` | numeric | Nullable |
| `pending_pix` | numeric | Nullable |
| `total` | numeric | — |
| `created_by` | uuid | — |
| `created_at` | timestamptz | — |
| `vale_compras_value` | numeric | Nullable |
| `pending_cash` | numeric | Nullable |
| `obs_dinheiro` | text | Nullable |
| `obs_cartao` | text | Nullable |
| `obs_pix` | text | Nullable |
| `obs_cheque` | text | Nullable |
| `obs_vale` | text | Nullable |
| `obs_geral` | text | Nullable |

## `divergences`

Registra divergências encontradas na operação.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `store_id` | uuid | — |
| `delivery_id` | uuid | Nullable |
| `type` | text | — |
| `description` | text | Nullable |
| `created_at` | timestamptz | — |

Relacionamento conceitual:

```text
pending_deliveries 1 ─── N divergences (delivery_id)
```

## `cash_denominations`

Controla quantidades físicas de cada denominação disponível.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `store_id` | uuid | — |
| `tipo` | text | — |
| `valor` | numeric | — |
| `quantidade_atual` | int4 | Nullable |
| `quantidade_ideal` | int4 | Nullable |
| `quantidade_minima` | int4 | Nullable |
| `updated_at` | timestamptz | Nullable |

Relacionamento conceitual:

```text
stores 1 ─── N cash_denominations
```

## `cash_movements`

Livro de movimentações financeiras/quantidades do caixa/cofre.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `store_id` | uuid | — |
| `created_by` | uuid | — |
| `tipo_movimento` | text | — |
| `valor_total` | numeric | — |
| `origem` | text | Nullable |
| `destino` | text | Nullable |
| `detalhamento` | jsonb | — |
| `created_at` | timestamptz | Nullable |

O campo `detalhamento` é estruturado como `jsonb` e pode carregar o detalhamento das denominações envolvidas. **Não presumir sua estrutura sem consultar o repository que grava/lê esses registros.**

## `shift_closures`

Registra fechamento de turno.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `store_id` | uuid | — |
| `shift_date` | date | — |
| `shift_type` | text | — |
| `closed_by` | uuid | — |
| `closed_at` | timestamptz | — |

## `motoboys`

Cadastro de entregadores/motoboys.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `store_id` | uuid | — |
| `nome` | text | — |
| `telefone` | text | Nullable |
| `ativo` | bool | Nullable |
| `created_at` | timestamptz | — |
| `horario_trabalho` | text | Nullable |

## `motoboy_time_tracking`

Registra eventos de ponto dos motoboys.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `store_id` | uuid | — |
| `motoboy_id` | uuid | — |
| `tipo_registro` | text | — |
| `registro_time` | timestamptz | — |
| `registered_by` | uuid | — |
| `created_at` | timestamptz | — |

## `motoboy_routes`

Representa uma rota realizada/planejada por um motoboy.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `store_id` | uuid | — |
| `motoboy_id` | uuid | — |
| `status` | text | — |
| `departure_time` | timestamptz | Nullable |
| `return_time` | timestamptz | Nullable |
| `total_distance_km` | numeric | Nullable |
| `estimated_time_minutes` | int4 | Nullable |
| `created_by` | uuid | — |
| `created_at` | timestamptz | — |

## `motoboy_route_deliveries`

Itens de entrega pertencentes a uma rota.

| Coluna | Tipo | Restrições |
|---|---|---|
| `id` | uuid | Primary Key |
| `route_id` | uuid | — |
| `dna_order_id` | text | Nullable |
| `customer_name` | text | — |
| `address` | text | — |
| `delivery_status` | text | Nullable |
| `time_limit_minutes` | int4 | Nullable |
| `created_at` | timestamptz | — |

Relacionamento conceitual:

```text
motoboy_routes 1 ─── N motoboy_route_deliveries
motoboys       1 ─── N motoboy_routes
```

---

# 8. RLS — Row Level Security atual

O banco possui RLS configurado. Porém, existem políticas bastante amplas em algumas tabelas. **Não assumir que a simples existência de RLS significa que todos os dados estão isolados por loja.**

## `users`

Políticas informadas:

- `Permissao de Edicao` — UPDATE — authenticated — `auth.uid() = id OR is_admin()`
- `Permissao de Insercao` — INSERT — authenticated — `auth.uid() = id OR is_admin()`
- `Permissao de Leitura` — SELECT — authenticated — `auth.uid() = id OR is_admin()`
- `Permitir leitura de usuarios cruzados` — SELECT — authenticated — `true`

A última política permite leitura cruzada de usuários autenticados e, portanto, deve ser considerada antes de alterar qualquer comportamento de segurança.

## `pre_closings`

- `Permitir acesso total a usuarios autenticados no pre fechamento` — ALL — public — `auth.role() = 'authenticated'`

## `pending_deliveries`

Existem políticas específicas por loja/criador, mas também existe uma política ampla:

- `Permitir acesso total a usuarios autenticados nas entregas` — ALL — public — `auth.role() = 'authenticated'`

Outras políticas incluem:

- atualização de entregas da própria loja;
- atualização de comandas próprias;
- exclusão de comandas próprias;
- inserção na própria loja;
- leitura da própria loja;
- regras usando `user_store_id()`.

**A política ALL deve ser considerada na análise de segurança, pois políticas permissivas podem ampliar o acesso efetivo.**

## `deposits`

Políticas informadas:

- DELETE — `true`
- INSERT para autenticados — `true`
- SELECT para autenticados — `true`
- UPDATE — `true`

Ou seja, atualmente o isolamento por loja não está sendo imposto por essas políticas.

## `motoboy_time_tracking`

- ALL — authenticated — `USING true` / `WITH CHECK true`

## `motoboy_routes`

- ALL — authenticated — `USING true` / `WITH CHECK true`

## `motoboys`

- ALL — authenticated — `USING true` / `WITH CHECK true`

## `motoboy_route_deliveries`

- ALL — authenticated — `USING true` / `WITH CHECK true`

### Regra de segurança para futuras implementações

Se uma solicitação envolver:

- permissões;
- dados de outra loja;
- isolamento entre lojas;
- dados financeiros;
- alteração/exclusão de registros;
- informações de usuários;

investigue **frontend + repository + RLS** antes de alterar somente a interface.

Não enfraquecer RLS para resolver um erro funcional.

---

# 9. Convenções e cuidados com dinheiro

O banco utiliza `numeric` para valores monetários.

No JavaScript, é necessário cuidado com operações de ponto flutuante. Não introduzir cálculos financeiros frágeis com `Number` sem entender o fluxo existente.

Quando a precisão monetária for relevante:

- preserve os valores enviados ao Supabase;
- evite arredondamentos intermediários desnecessários;
- mantenha consistência entre valor exibido, valor persistido e valor usado em relatórios;
- procure primeiro as funções/repositories existentes que já implementam o cálculo.

---

# 10. Regras obrigatórias para IAs que implementarem alterações

## 10.1 Antes de modificar

1. Leia este `CONTEXTO_IA.md`.
2. Identifique a feature afetada.
3. Localize o componente/tela responsável.
4. Localize o hook/service usado pela tela.
5. Localize o repository Supabase correspondente.
6. Pesquise todos os usos da função/campo que será alterado.
7. Verifique dependências no banco/RLS quando a alteração envolver persistência ou autorização.
8. Só então proponha a alteração.

## 10.2 Não ler o projeto inteiro sem necessidade

Faça investigação econômica e direcionada.

Não percorra arquivos não relacionados apenas para criar contexto.

Use busca por:

- nome da função;
- nome do componente;
- nome da tabela;
- nome da coluna;
- rota;
- mensagem de erro;
- hook;
- repository.

## 10.3 Corrigir causa, não sintoma

Não faça alterações superficiais apenas para eliminar um erro visual.

Exemplo:

- se uma lista está vazia, investigar query, filtros, RLS e transformação dos dados antes de inserir fallback artificial;
- se um valor financeiro está errado, investigar origem e cálculo antes de alterar apenas a máscara;
- se uma ação falha por permissão, investigar RLS antes de remover uma validação.

## 10.4 Não alterar arquitetura sem necessidade

Não:

- migrar React para outro framework;
- trocar Supabase por outro banco;
- introduzir backend desnecessariamente;
- trocar Vite;
- trocar biblioteca de estado;
- reescrever módulos inteiros;
- criar uma nova arquitetura;

quando a solicitação puder ser resolvida dentro da estrutura atual.

## 10.5 Não refatorar código não relacionado

Uma correção deve alterar o menor conjunto de arquivos possível.

Não aproveitar uma solicitação para fazer "limpeza geral" ou refatoração de arquivos não relacionados.

## 10.6 Não modificar banco sem necessidade

Antes de criar, remover ou renomear uma coluna:

1. pesquise todos os usos;
2. verifique o schema informado;
3. verifique o repository;
4. verifique as políticas RLS relacionadas;
5. considere dados já existentes;
6. avalie compatibilidade retroativa.

## 10.7 Preservar funcionalidades existentes

Uma alteração deve manter as funcionalidades que já funcionam.

Especialmente:

- autenticação;
- isolamento/identificação por loja;
- permissões ADMIN;
- troca de turno;
- registros financeiros;
- auditoria;
- reversão de movimentações;
- conferência;
- relatórios;
- rotas de motoboys.

## 10.8 Não inventar estruturas

Não presumir:

- nomes de colunas;
- nomes de tabelas;
- formatos de JSONB;
- valores possíveis de `status`/`type`;
- nomes de funções SQL;
- comportamento de RLS;
- endpoints inexistentes.

Pesquise no código/banco antes.

## 10.9 Não expor segredos

Nunca adicionar ao Git:

- `.env` real;
- `VITE_SUPABASE_ANON_KEY` real em documentação se for uma credencial operacional;
- service role key;
- tokens;
- senhas;
- credenciais de usuários.

As variáveis devem permanecer no ambiente da Netlify/desenvolvimento.

## 10.10 Build obrigatório após mudanças

Sempre que possível, após uma implementação execute pelo menos:

```bash
npm run build
```

Se o ambiente da IA permitir testes adicionais, execute os testes relevantes ao módulo alterado.

Se não for possível executar o build/testes, informe explicitamente.

## 10.11 Não fazer commit por conta própria

**Regra padrão:** a IA deve implementar e validar a alteração, mas **não deve criar commit/push automaticamente**, salvo se o usuário solicitar explicitamente.

## 10.12 Se houver ambiguidade, parar

Se existirem duas interpretações razoáveis que possam alterar comportamento, dados ou regras financeiras, não escolher arbitrariamente.

Explique a ambiguidade e peça confirmação.

---

# 11. Estratégia recomendada para futuras solicitações

Ao receber uma solicitação, siga esta sequência:

```text
1. Entender o comportamento desejado
        ↓
2. Identificar a feature afetada
        ↓
3. Encontrar a tela/componente
        ↓
4. Encontrar hook/service
        ↓
5. Encontrar repository
        ↓
6. Verificar tabela/colunas/RLS se houver banco
        ↓
7. Identificar a causa atual
        ↓
8. Planejar a menor alteração possível
        ↓
9. Implementar
        ↓
10. Revisar impactos colaterais
        ↓
11. Executar build/testes
        ↓
12. Relatar arquivos alterados, causa, solução e validação
```

---

# 12. Formato esperado de resposta da IA após uma implementação

Após concluir uma alteração, informe de forma objetiva:

### Diagnóstico

- qual era o problema;
- qual era a causa real.

### Alteração realizada

- arquivos alterados;
- o que foi modificado em cada arquivo;
- por que a alteração resolve a causa.

### Banco/RLS

Se aplicável:

- tabelas afetadas;
- colunas afetadas;
- políticas afetadas;
- se foi necessário alterar schema/política.

### Validação

- build executado ou não;
- testes executados ou não;
- resultado;
- eventuais limitações.

### Riscos/observações

Informe qualquer comportamento que não pôde ser validado ou qualquer ponto que precise de confirmação do usuário.

---

# 13. Mapa rápido de arquivos importantes

| Responsabilidade | Arquivo/local |
|---|---|
| Inicialização React | `src/main.jsx` |
| Rotas | `src/app/routes/AppRoutes.jsx` |
| Sessão/autenticação | `src/app/providers/AuthProvider.jsx` |
| Serviço de autenticação | `src/domain/services/AuthService.js` |
| Hook de auth | `src/core/hooks/useAuth.js` |
| Gestão de caixa | `src/core/hooks/useCashManagement.js` |
| Gestão de depósitos | `src/core/hooks/useDeposits.js` |
| Gestão de trocas | `src/core/hooks/useExchanges.js` |
| Pré-fechamento | `src/core/hooks/usePreClosing.js` |
| Motoboys | `src/core/hooks/useMotoboys.js` |
| Troca de turno | `src/core/hooks/useShiftHandover.js` |
| Cliente Supabase | `src/infrastructure/supabase/supabaseClient.js` |
| Repository de caixa | `src/infrastructure/supabase/repositories/SupabaseCashRepository.js` |
| Repository de entregas | `src/infrastructure/supabase/repositories/SupabaseDeliveryRepository.js` |
| Repository de depósitos | `src/infrastructure/supabase/repositories/SupabaseDepositRepository.js` |
| Repository de motoboys | `src/infrastructure/supabase/repositories/SupabaseMotoboyRepository.js` |
| Repository de pré-fechamento | `src/infrastructure/supabase/repositories/SupabasePreClosingRepository.js` |
| Repository de troca de turno | `src/infrastructure/supabase/repositories/ShiftHandoverRepository.js` |
| Funcionalidades | `src/features/` |
| Componentes compartilhados | `src/shared/` |
| Configuração Netlify | `netlify.toml` |
| Dependências | `package.json` |

---

# 14. Estado atual conhecido do projeto

A estrutura do repositório apresenta uma organização por features e camadas, com acesso ao Supabase concentrado em repositories. O código observado utiliza React/Vite no frontend e Supabase como infraestrutura de autenticação e persistência.

Alguns arquivos utilitários/constantes aparecem atualmente vazios no repositório. **Não presumir que um arquivo vazio indica funcionalidade inexistente:** procure os imports e usos antes de concluir que determinada responsabilidade não existe.

Também existem campos com nomenclatura mista em português/inglês no banco. Isso faz parte do estado atual e não deve ser padronizado automaticamente.

---

# 15. Princípio central

> **Este é um sistema operacional/financeiro da drogaria. Priorize correção, rastreabilidade, segurança, preservação dos dados e compatibilidade com o comportamento existente acima de refatorações ou soluções elegantes porém desnecessárias.**

Quando uma solicitação parecer simples, ainda assim verifique se ela interfere em dinheiro, auditoria, loja, usuário, RLS, fechamento ou entrega.

Quando a solução exigir alteração estrutural, explique o impacto antes de executá-la.
