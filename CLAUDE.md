# Tarefinhas

Aplicação de gerenciamento de tarefas pessoais.

## Especificação atual

Fase atual: **base mínima da V2**. Spec completa em `docs/spec-v2-base.md` — ler antes de implementar qualquer coisa.

- Construir só o que a spec descreve, com os ajustes de "Interface" abaixo. A seção "Fora desta base" da spec lista o que NÃO implementar; serve apenas para o modelo de dados não bloquear etapas futuras.
- A base está pronta quando os 12 critérios de aceite da spec passam.
- Editar e apagar `MainTask` e `MiniTask` não estão especificados. Perguntar antes de implementar.

## Interface (ajustes sobre a spec)

- Tela única: banco de tarefas à esquerda, área "Em foco" à direita. "Em foco" é a agenda da spec (7 dias a partir de hoje, faixa sem hora + faixas de 1h).
- MiniTasks arrastam entre banco e foco, e dentro do foco.
- Botão "Nova tarefa" abre o formulário de cadastro num modal.
- Cor da `MainTask` sorteada entre as cores livres da paleta (`models/colors.ts`). Repete só quando a paleta esgota.
- Clique numa miniTask abre modal de detalhe: nome e descrição da `MainTask`, a miniTask clicada e as outras miniTasks não feitas da mesma `MainTask`.

## Convenções de nomes

Todo nome no código fica em inglês: entidades, campos, variáveis, funções, componentes, arquivos, pastas, rotas, tabelas. Texto visível ao usuário fica em português.

Nomear pela função, não pela forma visual. Ex.: `MiniTask` (passo de uma tarefa), não `Balloon` (formato do cartão).

Glossário da spec (português) para o código (inglês). Usar sempre estes nomes:

| Spec | Código | Interface |
|---|---|---|
| Tarefa principal | `MainTask` | Tarefa |
| Balão | `MiniTask` | (cartão da miniTask) |
| Banco de tarefas | `TaskBank` | Banco de tarefas |
| Agenda | `Focus` (componente `FocusArea`) | Em foco |
| Passo (no formulário) | `step` | Passo |

Campos de `MainTask`: `id`, `name`, `description`, `deadlineDays`, `color`, `createdAt`.

Campos de `MiniTask`: `id`, `mainTaskId`, `text`, `position` (spec: `ordem`), `done`, `inProgress`, `scheduledDate` (spec: `agendadoPara`, `YYYY-MM-DD` local), `scheduledTime` (spec: `horaAgendada`, `HH:00`), `createdAt`.

`position` substitui `order` porque `ORDER` é palavra reservada em SQL e o backend vai ter banco relacional.

## Arquitetura: MVC

Frontend e backend seguem MVC. Cada camada só conhece a camada abaixo dela: View chama Controller, Controller chama Model. View nunca acessa persistência direto.

### Frontend (React)

| Camada | Responsabilidade | Onde fica |
|---|---|---|
| Model | Tipos, regras de domínio puras (validação, cor, agendar) e repositórios | `src/models/` |
| Controller | `TasksProvider` (context): carrega dados, guarda estado, expõe ações. Acesso via `useTasks()` | `src/controllers/` |
| View | Telas e componentes React/shadcn. Só renderizam e repassam eventos ao Controller | `src/views/` (telas), `src/components/` (componentes), `src/components/ui/` (gerados pelo shadcn, não editar à mão) |

- Repositórios ficam atrás das interfaces de `src/models/repositories/types.ts`. A implementação (IndexedDB hoje, API Java depois) é escolhida num único ponto: topo de `src/controllers/TasksProvider.tsx`.
- Ações do Controller gravam no repositório antes de atualizar o estado.
- Mudança de schema do IndexedDB: subir `DB_VERSION` em `src/models/repositories/indexedDb.ts` e migrar no `upgrade`.

### Backend (Spring Boot)

Spring MVC padrão: `controller` (REST), `service` (regras de negócio), `repository` (persistência), `model` (entidades), `dto` (contratos da API). Controller não acessa repository direto.

## Stack

### Frontend
- Vite + React 19 + TypeScript, PWA via `vite-plugin-pwa`
- Tailwind v4 + [shadcn/ui](https://ui.shadcn.com) (preset Nova, base Radix). Adicionar componente: `npx shadcn@latest add <nome>`
- IndexedDB via `idb`
- `@xyflow/react` (React Flow): grafo do banco. `@dnd-kit/core`: arrastar. `date-fns`: datas
- Gerenciador de pacotes: npm

### Backend (API)
- Java + Spring Boot
- Fora da base mínima da V2: a base salva tudo no navegador. A API entra quando login e sincronização forem especificados.

## Estrutura do repositório

Monorepo:

- `frontend/`: app React
- `backend/`: API Spring Boot 4.1, Java 21, Maven (`./mvnw`), pacote `br.com.shiroshima.backend`. Só o esqueleto do Spring Initializr por enquanto
- `docs/`: especificações

## Comandos (em `frontend/`)

- `npm run dev`: servidor de desenvolvimento
- `npm run build`: checagem de tipos (`tsc -b`) + build de produção
- `npm run lint`: ESLint

## Notas de implementação

- Banco de tarefas: React Flow com `nodesDraggable={false}`. O arraste é do dnd-kit; o cartão arrastável usa a classe `nodrag nopan` para o React Flow não panear.
- IDs dos alvos de soltura em `src/views/dropTargets.ts`: `bank`, `day:YYYY-MM-DD`, `slot:YYYY-MM-DD:HH`.
- Clique vs. arraste: `PointerSensor` com `distance: 5`. Clique logo depois de um drop é ignorado para não abrir o modal de detalhe.

## Decisões de projeto

Registrar aqui decisões tomadas ao longo do desenvolvimento (data + decisão + motivo).

- 2026-11-11 — Stack definida: React/TypeScript + shadcn/ui no frontend, Java/Spring Boot na API.
- 2026-11-11 — Spec da base mínima V2 adicionada (`docs/spec-v2-base.md`). Base roda só no navegador (PWA + IndexedDB); API Java fica para a etapa de login e sincronização.
- 2026-11-11 — Nomes no código em inglês; texto da interface em português. Glossário em "Convenções de nomes".
- 2026-11-11 — Arquitetura MVC no frontend e no backend.
- 2026-11-11 — Balão vira `MiniTask`: nomes pela função, não pela forma. Agenda vira área "Em foco" (`Focus`), mesmo comportamento.
- 2026-11-11 — Monorepo `frontend/` + `backend/`; npm; sem testes automatizados nesta fase (critérios validados à mão).
- 2026-11-11 — Formulário em modal; cores sorteadas sem repetir; modal de detalhe ao clicar na miniTask.

## Pendências a definir

- Banco de dados do backend
- Autenticação (login e sincronização, uma pessoa por conta)
- Estratégia de testes
- Convenções de código e commits
- Comportamento de editar e apagar tarefas e miniTasks
- MiniTasks agendadas em dias que já saíram da janela de 7 dias ficam invisíveis (spec "Tarefa não feita" trata isso numa etapa futura)
- Ícones PNG do PWA (hoje só `favicon.svg`)
