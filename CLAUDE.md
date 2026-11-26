# Tarefinhas

Aplicação de gerenciamento de tarefas pessoais.

## Especificação atual

Fase atual: **base mínima da V2**. Spec completa em `docs/spec-v2-base.md` — ler antes de implementar qualquer coisa.

- Construir só o que a spec descreve, com os ajustes de "Interface" abaixo. A seção "Fora desta base" da spec lista o que NÃO implementar; serve apenas para o modelo de dados não bloquear etapas futuras.
- A base está pronta quando os 12 critérios de aceite da spec passam.
- Editar `MainTask` e `MiniTask` não está especificado: perguntar antes de implementar. Apagar miniTask foi pedido pelo usuário (menu do botão direito, abaixo); apagar `MainTask` inteira só acontece junto com o último passo dela.

## Interface (ajustes sobre a spec)

- Tela única: "Em foco" numa barra estreita à esquerda (1/4 da largura, mínimo 18rem), banco de tarefas à direita. No celular, empilhados, "Em foco" primeiro. "Em foco" é a agenda da spec (faixa sem hora + faixas de 1h), mas mostra só hoje por padrão. O campo "Dias" mostra de 1 a 7 dias a partir de hoje (`models/focus.ts`). A escolha não fica salva. A largura do "Em foco" se ajusta arrastando a borda direita dele (`components/ResizeHandle.tsx`, só a partir de 1024 px; também pelas setas esquerda e direita com a barra em foco): mínimo 18rem, e o banco mantém pelo menos 360 px. O botão "Em foco" no topo, ao lado do título, fecha e abre o painel (o banco ocupa a tela toda enquanto fechado); fechar e abrir mantém o número de dias, mas não a largura nem a rolagem. Nada disso fica salvo ao recarregar.
- Nó da tarefa principal no banco: cada `MainTask` com miniTasks no banco aparece como um card maior, com o nome, e todas as miniTasks dela ligam nele (estrela). Substitui a ligação em sequência da spec (critério "ligados em sequência, pela ordem dos passos"). Sem miniTasks no banco, o nó some. Ele pode ser arrastado dentro do banco (puxa o grupo), mas não é agendado nem abre detalhe. Id do nó: `main:<id>` (`models/bankGraph.ts`).
- Banco de tarefas como o grafo do Obsidian: as miniTasks ligadas se atraem, as outras se afastam, e uma gravidade fraca puxa tudo para o centro. O grafo se mexe ao abrir, ao arrastar e quando uma miniTask entra ou sai; depois para. As posições não ficam salvas: a física recalcula ao abrir. Com `prefers-reduced-motion`, o grafo aparece já arranjado.
- Um gesto só para mover e agendar: arrastar um card dentro do banco puxa o card (os ligados vêm atrás). Se o ponteiro sai do banco, o card fica apagado no lugar e uma cópia segue o ponteiro até o "Em foco". Soltar no banco deixa o card ali; uma miniTask que volta do "Em foco" aparece onde foi solta.
- Fundo de pontos do banco fixo: o pan e o zoom movem só os cards e as linhas.
- MiniTasks arrastam entre banco e foco, e dentro do foco.
- Botão "Nova tarefa" abre o formulário de cadastro num modal.
- Hora exata (ex.: 13:23): o passo continua na faixa da hora dele (13:00) e o cartão mostra a hora exata (`hasExactMinutes`, `hourSlotOf`, `setMiniTaskTime` em `models/miniTask.ts`; dentro da faixa, ordenados pela hora). Define-se por "Definir hora…" no menu do botão direito (só passos já agendados) ou pelo botão "Definir hora" no modal de detalhe, os dois abrem `components/SetTimeDialog.tsx` (campo de hora; "Tirar a hora" volta o passo para "Sem hora" do dia). Arrastar para outra faixa põe a hora cheia dela (13:23 solto em 14:00 vira 14:00); soltar na mesma faixa mantém a hora exata.
- Menu do botão direito (ou toque longo) em qualquer cartão de miniTask, no banco e no "Em foco" (`components/MiniTaskContextMenu.tsx`, Radix `ContextMenu`; as ações vêm do `MiniTaskMenuContext`, fornecido por `OverviewView`): **Copiar para** abre um submenu com "Banco de tarefas" e só os dias que o "Em foco" está mostrando (o campo "Dias"; `upcomingDays` em `models/focus.ts`, só o nome do dia da semana, sem data, com "(hoje)" no primeiro; `OverviewView` guarda o número de dias que `FocusArea` informa em `onDayCountChange`) e cria outra miniTask igual (mesma `MainTask` e texto, no fim dos passos, não feita) no destino escolhido; num dia, mantém a hora do original. Serve para fazer o mesmo passo em dias diferentes; **Novo passo** abre um modal e cria um passo no banco, na `MainTask` do cartão; **Deletar** pede confirmação e apaga a miniTask, e se for o único passo da `MainTask`, apaga a `MainTask` também (ela precisa de pelo menos 1 passo).
- Cor da `MainTask` sorteada entre as cores livres da paleta (`models/colors.ts`). Repete só quando a paleta esgota.
- Clique numa miniTask abre modal de detalhe: nome e descrição da `MainTask`, a miniTask clicada e as outras miniTasks não feitas da mesma `MainTask`.

- Esforço (`Effort`: fácil, médio, difícil) é campo da `MainTask`, escolhido no formulário (padrão médio). Define a prioridade na sugestão de tarefas. `MiniTask.doneAt` guarda quando foi marcada como feita.
- Tarefa não feita (`models/overdue.ts`): miniTask planejada para um dia antes de hoje e não feita. Sem prazo na `MainTask`: passa sozinha para hoje (ao abrir o app, mantém a hora). Com prazo: `OverdueDialog` obriga a escolher, uma por vez, entre "Postergar para hoje" (continua na agenda, não muda o prazo) e "Esquecer" (volta ao banco e fica guardada).
- Escolher tarefas do dia (`views/PickView.tsx`, rota `/escolher`, segunda opção ao lado da visão geral): como um baralho. Mostra uma miniTask do banco por vez, sorteada por prioridade com um pouco de acaso (`models/suggestion.ts`: peso fácil 1, médio 2, difícil 3). Deslizar à direita (ou seta direita, botão "Vou fazer") roda a tarefa: vai para hoje e fica em andamento (`startMiniTask`). Deslizar à esquerda deixa no banco e a tarefa não volta nessa rodada; "Ver de novo" refaz o sorteio. `components/SwipeCard.tsx` faz o gesto. Dos lados do cartão aparecem, apagadas (`GhostCard`, só a partir de 768 px), a última tarefa decidida (esquerda) e a próxima (direita). Botão "Nova tarefa" na própria tela: a tarefa criada entra no fim da fila, sem refazer o sorteio. No canto de cima à esquerda, o botão "Escolhidas (N)" abre um painel à esquerda (`TodayPanel`, um `Dialog` encostado na esquerda) com tudo que está no plano de hoje, escolhido ali ou antes: dá para marcar como feita ou tirar de hoje (volta ao banco). O contador "Hoje: N escolhidas" conta essa mesma lista. Com o painel ou um formulário aberto, as setas do teclado não passam cartões. Visual simples de propósito: primeiro o sistema.

## Perfil

- Tela própria (`views/ProfileView.tsx`, rota `/perfil`), não um painel: foto, nome, e-mail, "Trocar foto", "Usar o gatinho", "Sair" e atalhos para "Visão geral" e "Escolher tarefas do dia". Também tem "Nome" (editar o nome, vai para `PUT /users/me`). Só abre para quem entrou. Não há troca de senha: a API ainda não tem rota para isso. Mais funções entram nessa tela depois.
- Botão redondo com a foto da pessoa no canto de cima à direita da visão geral e da tela de escolher (`components/ProfileButton.tsx`, um link para `/perfil`).
- O nome "Tarefinhas" no canto de cima à esquerda (`components/AppBrand.tsx`) é um link para a visão geral (`/tarefas`) e aparece na visão geral, na tela de escolher e no perfil. A homepage e o admin não têm.
- Quem entrou aparece como `Profile` (`models/profile.ts`: nome, e-mail, foto; sem senha). Nome e e-mail vêm da API (`GET /users/me`). A foto a API ainda não guarda: fica no navegador, separada por id da conta (`models/repositories/sessionStorage.ts`), então "Sair" e entrar de novo mantêm a foto naquele navegador.
- Foto: padrão é um gatinho (`public/default-cat.svg`). "Trocar foto" lê uma imagem do computador (até 8 MB), corta o maior quadrado centralizado, reduz a 256 px e guarda como JPEG no navegador (`components/profilePhoto.ts`); "Usar o gatinho" volta ao padrão. A foto fica só naquele navegador (a API não tem campo de foto).

## Homepage (entrar e criar conta)

- Primeira tela do app (`views/HomeView.tsx`). Abas "Entrar" e "Criar conta" no mesmo painel. A aba ativa fica na URL: `?mode=sign-up`.
- Login pela API do backend (`/auth/sign-in`, `/auth/sign-up`, `GET`/`PUT /users/me`; ver "Backend"): `AuthProvider` valida o formulário (`models/auth.ts`, mesmas regras e mensagens do backend: a senha do cadastro precisa de 8+ caracteres, maiúscula, minúscula, número e símbolo) e chama `models/repositories/authApi.ts`. O token JWT que a API devolve fica em `localStorage` (`tarefinhas.token`) e vai no cabeçalho `Authorization: Bearer`. Ao abrir o app com token salvo, o `AuthProvider` confere com `GET /users/me` (`restoring`) antes de decidir; token recusado (401) é apagado. Erros da API vêm como `{ errors: { campo: mensagem } }`; a chave `form` (login errado) aparece sob a senha. Endereço da API: `VITE_API_URL` (padrão `http://localhost:8080`; ver `frontend/.env.example`). A API só aceita a origem `http://localhost:5173` por padrão (`CORS_ALLOWED_ORIGINS` no `.env` da raiz).
- Sem entrar não se abre nenhuma tela do app: `components/RequireAuth.tsx` leva `/tarefas`, `/escolher` e `/perfil` para a homepage, lembra a tela pedida e, depois de entrar, abre essa tela. Quem saiu de propósito (`justSignedOut`) entra de novo na visão geral. O admin (`/admin`, só em desenvolvimento) não exige entrar.
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

Campos de `MainTask`: `id`, `name`, `description`, `deadlineDays`, `effort`, `color`, `createdAt`.

Campos de `MiniTask`: `id`, `mainTaskId`, `text`, `position` (spec: `ordem`), `done`, `doneAt`, `inProgress`, `scheduledDate` (spec: `agendadoPara`, `YYYY-MM-DD` local), `scheduledTime` (spec: `horaAgendada`, `HH:mm`: `HH:00` na faixa da hora, ou uma hora exata como `13:23`), `createdAt`.

`position` substitui `order` porque `ORDER` é palavra reservada em SQL e o backend vai ter banco relacional.

## Arquitetura: MVC

Frontend e backend seguem MVC. Cada camada só conhece a camada abaixo dela: View chama Controller, Controller chama Model. View nunca acessa persistência direto.

### Frontend (React)

| Camada | Responsabilidade | Onde fica |
|---|---|---|
| Model | Tipos, regras de domínio puras (validação, cor, agendar) e repositórios | `src/models/` |
| Controller | `TasksProvider` (context): carrega dados, guarda estado, expõe ações. Acesso via `useTasks()`. `AuthProvider`: entrar e criar conta pela API, guarda o token e quem entrou, troca nome (API) e foto (navegador). Acesso via `useAuth()` | `src/controllers/` |
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
- `@xyflow/react` (React Flow): desenha o grafo do banco. `d3-force`: física do banco. `@dnd-kit/core`: arrastar. `date-fns`: datas
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
- Física do banco: `components/useBankSimulation.ts` (`d3-force`) calcula as posições; o React Flow só desenha (`nodeOrigin` no centro, alças no centro do card, linhas retas). As ligações vêm de `models/bankGraph.ts`. Durante o arraste, `TaskBank` usa `useDndMonitor` para prender o card no ponteiro (`fx`/`fy`); `OverviewView` esconde o `DragOverlay` enquanto um card do banco está sobre o banco. A câmera faz `fitView` só na primeira vez que o grafo assenta.
- Fundo de pontos do banco em CSS no contêiner, não o `<Background />` do React Flow (que acompanha o pan).
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
- 2026-11-15 — "Em foco" vira barra estreita à esquerda e o banco vai para a direita. "Em foco" mostra só hoje por padrão, com campo de 1 a 7 dias. Motivo: o foco do dia fica à vista e o banco ganha espaço.
- 2026-11-15 — Banco de tarefas como o grafo do Obsidian, com física (`d3-force`) e fundo fixo. Um gesto só para mover no banco e agendar no "Em foco". Posições não salvas; o grafo assenta e para. Motivo: o banco deve mostrar as tarefas ligadas e vivas, não uma grade.
- 2026-11-15 — Tarefa principal vira nó maior no centro do grupo, com as miniTasks ligadas nela em vez de em sequência. Motivo: o nome da tarefa fica visível no banco e o grupo se lê como um projeto.
- 2026-11-15 — Botão de recolher passos vira um quadrado só com ícone. Admin ganha tamanho individual (bolha grande, passos soltos, bolhas de fundo) e opções de texto (tamanho, peso, sombra, cor, tempo por passo, frase de destaque). Motivo: pedido do usuário, para ajustar tudo pelo painel.
- 2026-11-23 — Passa a valer o documento "TAREFINHAS V2" (log do sistema). Primeiro o sistema funcionando, sem mexer no visual elaborado. Esforço fácil/médio/difícil; tarefa não feita sem prazo passa sozinha ao dia seguinte, com prazo pergunta; esquecida fica no banco.
- 2026-11-23 — Tela "Escolher tarefas do dia", estilo Tinder, como segunda opção de planejar. Motivo: pedido do usuário; é a "visão reduzida" do documento.
- 2026-11-23 — Menu do botão direito nos cartões (copiar, novo passo, deletar). Motivo: pedido do usuário, para fazer a mesma tarefa em dias diferentes. Copiar vira "Copiar para" (banco ou os dias que o "Em foco" mostra, sem datas), a pedido do usuário; apagar o último passo apaga a tarefa.
- 2026-11-23 — "Em foco" com largura ajustável por arraste e botão para abrir e fechar. Motivo: pedido do usuário; com 3 ou 4 dias o painel estreito ficava apertado.
- 2026-11-23 — Hora exata nos passos (compromissos pontuais como 13:23), sem mudar as faixas de 1 hora. Motivo: pedido do usuário; as faixas de hora cheia não cabiam um compromisso com minutos. Arrastar para outra faixa vira a hora cheia dela.
- 2026-11-23 — Perfil da pessoa (foto, nome, e-mail, atalhos e sair) numa tela própria (`/perfil`), e o nome "Tarefinhas" no canto de cima à esquerda de todas as telas do app, levando à visão geral. Motivo: pedido do usuário (o perfil primeiro foi um painel, e ele quis uma tela separada). O perfil fica salvo no navegador porque ainda não há servidor nem login de verdade; foto padrão de gatinho.
- 2026-11-23 — Telas do app só abrem com login (`RequireAuth`). Motivo: pedido do usuário.
- 2026-11-23 — A autenticação feita no navegador (contas e senha com hash no `localStorage`, conta fictícia, trocar senha) foi removida: o frontend usa o login do backend do Shiro (`/auth/sign-in`, `/auth/sign-up`, `/users/me`). Motivo: o backend com banco (Neon) e JWT já existe. A troca de senha saiu porque a API não tem rota para ela; a foto continua no navegador porque a API não tem foto. Testes sempre contra o backend real (`docker compose up --build`), nunca com um servidor de mentira.

## Pendências a definir

- Banco de dados do backend
- Autenticação (login e sincronização, uma pessoa por conta)
- Estratégia de testes
- Convenções de código e commits
- Comportamento de editar e apagar tarefas e miniTasks
- MiniTasks agendadas em dias que já saíram da janela de 7 dias ficam invisíveis (spec "Tarefa não feita" trata isso numa etapa futura)
- Ícones PNG do PWA (hoje só `favicon.svg`)
