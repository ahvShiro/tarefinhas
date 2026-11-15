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

## Homepage (entrar e criar conta)

- Primeira tela do app (`views/HomeView.tsx`). Abas "Entrar" e "Criar conta" no mesmo painel. A aba ativa fica na URL: `?mode=sign-up`.
- Só interface: dados válidos entram no app sem conferir conta. A sessão fica na memória, então recarregar a página volta para a homepage. A autenticação real entra no `AuthProvider`, entre a validação e `setSignedIn`, quando o backend especificar login.
- Entrar: e-mail e senha. Criar conta: nome, e-mail, senha (mínimo 8 caracteres) e confirmar senha. Regras em `models/auth.ts`.
- "Esqueci a senha" e "Continuar com Google" mostram um aviso de que ainda não estão disponíveis.
- Layout sem divisão de colunas: fundo 3D na tela toda, formulário por cima, à esquerda (no celular, abaixo das bolhas).
- Fundo 3D (`components/HomeBackdrop.tsx`, Three.js via `@react-three/fiber` e `@react-three/drei`): bolhas de vidro líquido denso, como a cera de uma lâmpada de lava (não bolha de sabão). Um shader próprio (`GLASS_FRAGMENT`, `glassShaders`, `GlassShape`) calcula 3 coisas na mesma forma: o filtro (o vidro tinge o que aparece através dele), o corpo (material denso que esconde parte do que está atrás, com 3 tons que fluem, brilho interno no lado oposto à luz e tom profundo perto da borda) e os reflexos (borda brilhante, brilho largo, ponto de brilho, luz colorida na borda). Na tela: (o que está atrás × filtro × parte não escondida) + corpo + reflexos. O blending não faz isso em 1 desenho, então cada bolha desenha 2 vezes com o mesmo shader (`uPass`): primeiro multiplica (`ZeroFactor` × `SrcColorFactor`), depois soma (`OneFactor` + `OneFactor`). Com opacidade 0 o resultado é o vidro só-filtro da versão anterior. Só formas largas nos reflexos. Formato redondo que "respira" com ondas lentas; a normal é recalculada na superfície ondulada. Texto das bolhas em branco.
- Tema das bolhas (`models/bubbleTheme.ts`): visual do vidro (`glass`), movimento (`motion`, multiplicadores do movimento padrão), bolhas ao fundo (`distant`: opacidade e 3 cores) e a lista de bolhas (1 a 8; cada uma com 3 tons, tarefa de exemplo, tamanho dos passos que solta `stepSize`, e lugar/tamanho no layout largo e no alto). `distant.sizes` dá o tamanho de cada uma das 3 bolhas desfocadas. `text` guarda as opções de texto: tamanho, peso, sombra, cor, segundos por passo e a frase de destaque da página (vazia esconde a frase). A cena aplica peso, cor e sombra por variáveis CSS (`--bubble-text-weight`, `--bubble-text-color`, `--bubble-text-shadow`) na camada de texto, e o tamanho no cálculo de cada texto (`dataset.fit`). O padrão fica em `src/config/bubble-theme.json` (`models/defaultBubbleTheme.ts`); não editar à mão, usar o admin. `validateBubbleTheme` põe os números nos limites e completa o que faltar com `FALLBACK_BUBBLE_THEME`. A cena lê o tema a cada quadro, então uma mudança aparece na hora.
- Admin das bolhas (`views/AdminView.tsx`, só em desenvolvimento): `http://localhost:5173/admin`. À esquerda, a homepage real num iframe de tamanho fixo (Desktop 1440×900 ou Celular 390×844), que recebe o rascunho por `postMessage` (`controllers/bubbleThemePreview.ts`); à direita, os controles (`components/BubbleThemePanel.tsx`). O botão Desktop/Celular também escolhe qual layout os controles de lugar e tamanho alteram. Cada bolha tem no cartão: tamanho da bolha (do layout escolhido), tamanho dos passos soltos, cores, textos da tarefa e lugar. Seção "Texto": frase de destaque, cor, tamanho, peso, sombra e tempo de cada passo. Seção "Bolhas ao fundo": cor e tamanho de cada uma. "Salvar como padrão" envia o tema para o plugin do Vite `dev-server/bubbleThemeAdmin.ts` (`POST /__admin/bubble-theme`), que valida e grava `src/config/bubble-theme.json`. O padrão só vale no site publicado depois do commit desse arquivo. O plugin só aceita pedidos deste computador (Host e Origin locais, endereço de loopback, sem cabeçalhos de proxy), porque o servidor de desenvolvimento pode estar exposto por túnel (ngrok). O build de produção não tem a página nem o endpoint.
- Como o vidro deixa ver um pouco do que está atrás, uma bolha na frente mostra a de trás tingida. Por isso nenhuma bolha distante fica atrás das bolhas grandes. Camadas transparentes desenhadas de trás para a frente (`glassRenderOrder`), os 2 desenhos de cada bolha em seguida. As linhas dos passos não escrevem profundidade (`depthWrite={false}`), então ficam atrás das bolhas.
- Profundidade: bolhas distantes e desfocadas atrás das bolhas (`WIDE_DISTANT`, `TALL_DISTANT`). São discos planos com imagem desfocada, sem vidro, então custam pouco. Movem menos com o mouse que as de vidro.
- Cada bolha grande é uma tarefa de exemplo (nome e 3 passos, no tema). A bolha mostra os passos que ainda estão nela, um por vez; sem passos, mostra o nome da tarefa. As bolhas trocam de passo em rodízio: a cada 4 s só uma bolha muda, para a tela não ter vários textos mudando juntos. Qual passo aparece é calculado por um relógio único (`shownStepIndex`), usado também ao separar. O texto fica numa camada HTML comum sobre o canvas (`BubbleTextLayer`). A cada quadro, a cena só atualiza a posição dessa camada. A troca de passo é uma transição CSS (`.bubble-phrase[data-visible]` em `index.css`). Não usar o `Html` do drei: ele cria uma árvore React própria dentro do canvas, que entra em conflito com a árvore principal e faz a cena remontar sem parar.
- Separar passos: puxar uma bolha grande (ou tocar/clicar nela) solta uma bolha menor da mesma cor, com o passo que estava aparecendo na bolha, ligada à original por uma linha (`SplitStep`, `SplitStepBubble`). No máximo 2 por bolha (`MAX_SPLITS_PER_BUBBLE`); o último passo fica na bolha. Os passos soltos têm tamanho pequeno e parecido (`splitRadius`). Os passos separados ficam só na memória: recarregar a página volta ao início. O passo só se solta se houver lugar totalmente livre: dentro da tela, longe das áreas `data-bubble-avoid` (formulário e a palavra "tarefinhas", que tem `w-fit` para a área não ocupar o topo inteiro) e sem encostar em nenhuma bolha. Sem lugar, ou no limite de 2, a bolha só ondula (`REFUSED_WOBBLE_MS`). Depois de solto, o passo se afasta continuamente das bolhas que chegam perto (comparando no plano da tela, por causa da perspectiva) e nunca sai da tela. Cursor `grab`/`grabbing` via `html[data-bubble-pointer]`.
- O arranjo das bolhas segue o layout da página. Abaixo de 1024 px de largura (Tailwind `lg`, formulário embaixo das bolhas) ou em tela alta, usa o lugar `tall` de cada bolha: bolhas na faixa de cima, tamanho limitado pela altura (`tallUnit`), e só decoração, sem separar passos, sem cursor de pegar e sem dica. A partir de 1024 px, de toque ou não, separa normalmente. Se mudar o breakpoint do formulário em `HomeView`, mudar `STACKED_MAX_WIDTH` junto.
- O ponteiro é lido na janela inteira (o formulário fica por cima do canvas) e convertido para coordenadas do canvas, então funciona com a página rolada. Cliques em campos, botões, links e no formulário não pegam bolhas.
- Desempenho: esfera com 64 segmentos (a deformação roda por vértice, a cada quadro), sem luzes e sem transmissão de vidro (o shader não usa nenhum dos 2), densidade de pixels máxima 1,5 e `PerformanceMonitor`, que baixa a resolução em aparelhos lentos.
- O mouse empurra as bolhas próximas, e a bolha sob o mouse cresce um pouco e ondula mais. Carrega em arquivo separado (`lazy`), depois do formulário. `prefers-reduced-motion` deixa a cena parada. Sem WebGL, a cena não aparece e o formulário funciona.
- Composição no desktop: frase de marca grande no canto de cima à direita ("Tarefas grandes viram tarefinhas.", em `HomeView`, só a partir de `lg`, com `data-bubble-avoid`), 4 bolhas grandes (a maior e a de baixo cortadas pela borda da tela) e 3 bolhas distantes bem desfocadas. Um grão fino cobre a cena (`.home-texture` em `index.css`). No desktop nenhuma bolha distante fica perto do formulário.
- Parede de fundo (`Wall`): quadro de tela cheia atrás de tudo, fosco, com gradiente suave e 1 facho de luz diagonal que se move bem devagar. O lado do formulário fica sem efeitos de luz (esquerda na tela larga, parte de baixo na tela alta). No tema, `backdrop`: cor e força do facho, fosco ↔ metálico (metal escovado), reflexo das bolhas e fios. Cada bolha joga uma mancha da própria cor na parede (disco desfocado atrás dela) e o brilho largo do vidro pega parte da cor do facho (`uBeam`).
- Fios (`BubbleLinks`): linha fina de cada bolha grande para a seguinte, de borda a borda. `backdrop.links` é a opacidade; 0 remove.
- Botão de recolher (`HomeView`): quadrado de 44 px só com o ícone de voltar (`Undo2`), com `aria-label` e `title` "Recolher os balõezinhos", no canto de baixo à direita. Aparece quando a pessoa tem passos soltos e manda todos de volta (`HomeBackdropHandle.returnSteps`).
- Demonstração: enquanto a pessoa não aperta nenhuma bolha, a cada 9 s (`DEMO_EVERY_MS`) uma bolha, em rodízio, solta um passo sozinha e o recolhe depois de 4,5 s (`SplitStep.demo`, `leavingAt`). Só acontece sem nenhum passo solto, em tela larga e com movimento permitido. Para de vez no primeiro aperto numa bolha.
- Sem frase de dica no topo. Uma dica única (`.bubble-hint`) aparece ao lado do cursor na primeira vez que ele passa numa bolha e some de vez depois de 3,5 s ou do primeiro puxão. Em tela larga de toque (ex.: tablet deitado), aparece centralizada sob as bolhas, de 2,5 s a 8 s após abrir. Na tela alta não aparece.
- Posições, tamanhos, cores e textos das bolhas: no tema, pelo admin. Lugares das bolhas distantes: `WIDE_DISTANT` e `TALL_DISTANT` no código. Cores da página e tipografia da homepage ainda serão definidas.
- Tokens da homepage em `index.css`: `canvas` (também é a cor de fundo da cena 3D), `ink`, `brand`. Fonte de títulos: Bricolage Grotesque (`font-display`); texto: Geist.

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
| Entrar | `signIn` | Entrar |
| Criar conta | `signUp` | Criar conta |
| Homepage | `HomeView` | (tela de entrada) |

Campos de `MainTask`: `id`, `name`, `description`, `deadlineDays`, `color`, `createdAt`.

Campos de `MiniTask`: `id`, `mainTaskId`, `text`, `position` (spec: `ordem`), `done`, `inProgress`, `scheduledDate` (spec: `agendadoPara`, `YYYY-MM-DD` local), `scheduledTime` (spec: `horaAgendada`, `HH:00`), `createdAt`.

`position` substitui `order` porque `ORDER` é palavra reservada em SQL e o backend vai ter banco relacional.

## Arquitetura: MVC

Frontend e backend seguem MVC. Cada camada só conhece a camada abaixo dela: View chama Controller, Controller chama Model. View nunca acessa persistência direto.

### Frontend (React)

| Camada | Responsabilidade | Onde fica |
|---|---|---|
| Model | Tipos, regras de domínio puras (validação, cor, agendar) e repositórios | `src/models/` |
| Controller | `TasksProvider` (context): carrega dados, guarda estado, expõe ações. Acesso via `useTasks()`. `AuthProvider`: valida entrar/criar conta e guarda se a pessoa entrou. Acesso via `useAuth()` | `src/controllers/` |
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
- Admin das bolhas da homepage: com `npm run dev` rodando, abrir `http://localhost:5173/admin`

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
- 2026-11-12 — Homepage com entrar e criar conta, só interface. Motivo: autenticação ainda não especificada no backend. Uma página com abas, sem biblioteca de rotas. Visual com bolhas nas cores da paleta do app, para mostrar o produto já na entrada.
- 2026-11-12 — Homepage sem colunas, com bolhas 3D animadas (Three.js + React Three Fiber) que reagem ao mouse. Motivo: referência visual de esferas desfocadas em tela cheia. Cores e tipografia ficam para depois.
- 2026-11-12 — No celular as bolhas não separam passos. Motivo: não há lugar livre acima do formulário sem sobrepor textos; a alternativa (formulário mais abaixo) foi descartada.
- 2026-11-12 — Vidro das bolhas mais denso (lâmpada de lava) e admin local das bolhas em `/admin`, que grava o padrão em `src/config/bubble-theme.json`. Motivo: ajustar o visual pelo painel, sem pedir cada mudança no código. Só em desenvolvimento, para não precisar de login nem de backend.
- 2026-11-12 — Homepage menos vazia: frase de marca, demonstração automática de separar passo, quarta bolha e bolhas cortadas pela borda, textura leve. Motivo: a página tinha formulário de um lado e enfeite do outro, sem dizer o que o produto faz.
- 2026-11-12 — Fundo com facho de luz, reflexo das bolhas na parede, fios entre as bolhas e botão de recolher passos; tudo ajustável no admin. Motivo: referência de cena com luz e profundidade. Metal de verdade (espelhado) foi descartado por poluir e pesar; o controle fosco ↔ metálico deixa testar.
- 2026-11-15 — Botão de recolher passos vira um quadrado só com ícone. Admin ganha tamanho individual (bolha grande, passos soltos, bolhas de fundo) e opções de texto (tamanho, peso, sombra, cor, tempo por passo, frase de destaque). Motivo: pedido do usuário, para ajustar tudo pelo painel.

## Pendências a definir

- Banco de dados do backend
- Autenticação (login e sincronização, uma pessoa por conta)
- Estratégia de testes
- Convenções de código e commits
- Comportamento de editar e apagar tarefas e miniTasks
- MiniTasks agendadas em dias que já saíram da janela de 7 dias ficam invisíveis (spec "Tarefa não feita" trata isso numa etapa futura)
- Ícones PNG do PWA (hoje só `favicon.svg`)
