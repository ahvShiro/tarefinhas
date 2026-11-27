# Tarefinhas

Aplicação de gerenciamento de tarefas pessoais.

## Especificação atual

Fase atual: **base mínima da V2**. Spec completa em `docs/spec-v2-base.md` — ler antes de implementar qualquer coisa.

- Construir só o que a spec descreve, com os ajustes de "Interface" abaixo. A seção "Fora desta base" da spec lista o que NÃO implementar; serve apenas para o modelo de dados não bloquear etapas futuras.
- A base está pronta quando os 12 critérios de aceite da spec passam.
- Editar `MainTask` e o texto dos passos: pelo "Editar tarefa" do menu ⋯ (por enquanto só na tela; ver "Pendências"). Apagar miniTask foi pedido pelo usuário (menu do botão direito, abaixo); apagar a `MainTask` inteira acontece pelo botão "⋯" do card dela no banco ou junto com o último passo dela.

## Interface (ajustes sobre a spec)

- Tela única: "Em foco" numa barra estreita à esquerda (1/4 da largura, mínimo 18rem), banco de tarefas à direita. No celular, empilhados, "Em foco" primeiro. "Em foco" é a agenda da spec (faixa sem hora + faixas de 1h), mas mostra só hoje por padrão. O campo "Dias" mostra de 1 a 7 dias a partir de hoje (`models/focus.ts`). A escolha não fica salva. A largura do "Em foco" se ajusta arrastando a borda direita dele (`components/ResizeHandle.tsx`, só a partir de 1024 px; também pelas setas esquerda e direita com a barra em foco): mínimo 18rem, e o banco mantém pelo menos 360 px. O botão "Em foco" no topo, ao lado do título, fecha e abre o painel (o banco ocupa a tela toda enquanto fechado); fechar e abrir mantém o número de dias, mas não a largura nem a rolagem. Nada disso fica salvo ao recarregar.
- Topo do "Em foco" (`components/FocusArea.tsx`; regras em `models/focus.ts`): botão de encher a tela (`Maximize2`/`Minimize2`): o "Em foco" ocupa a largura toda e o banco some (`focusExpanded` em `OverviewView`, não fica salvo; fechar o "Em foco" pelo botão do topo também volta ao normal).
- Horas do "Em foco": o dia começa às 06:00. 00:00 a 05:00 ficam recolhidas numa linha "Madrugada", logo abaixo de "Sem hora", que abre e fecha ao clicar (no rótulo ou em qualquer dia dela); recolhida, mostra em cada dia quantos passos há nesse horário ("2 passos") e não recebe cartões soltos. Aberta, as 6 faixas aparecem com fundo um pouco mais escuro. Abre sozinha se o painel for aberto entre 00:00 e 05:59. Não fica salvo ao recarregar.
- Linha do "agora": linha vermelha na faixa da hora atual do dia de hoje, na altura dos minutos (`nowLinePosition`); a hora atual fica em vermelho na coluna das horas (o nome do dia não muda de cor). Atualiza a cada 30 s e os dias andam à meia-noite. O painel abre rolado na manhã (08:00) ou na hora antes da atual, se o dia já passou disso (de madrugada, na hora antes da atual).
- Cartões do "Em foco": aviso de prazo da tarefa grande ("Vence hoje", "Vence amanhã", "Vence em 2 dias" em amarelo; "Prazo vencido" em vermelho; nada com 3 dias ou mais; some quando o passo está feito; `deadlineHintOf`, contando dias do calendário) e ícone de foto com a quantidade, quando o passo tem foto (`MiniTaskCard` props `deadline` e `photoCount`).
- Nó da tarefa principal no banco: cada `MainTask` com miniTasks no banco aparece como um card maior, com o nome, e todas as miniTasks dela ligam nele (estrela). Substitui a ligação em sequência da spec (critério "ligados em sequência, pela ordem dos passos"). Sem miniTasks no banco, o nó some. Ele pode ser arrastado dentro do banco (puxa o grupo), mas não é agendado nem abre detalhe. Id do nó: `main:<id>` (`models/bankGraph.ts`).
- Topo do banco (`components/TaskBank.tsx`): busca (`models/bankSearch.ts`: passo pelo texto ou pelo nome da tarefa, tarefa pelo nome; sem diferença de acento; o que não bate fica apagado, inclusive as linhas; um passo achado mantém o card da tarefa aceso; Enter leva a câmera até o que foi achado), "Esconder feitos" (tira os passos feitos do grafo; a tarefa some se só tiver feitos) e "Exportar" (`models/exportTasks.ts`: baixa um arquivo de bloco de notas `tarefinhas-banco-<data>.txt` com as tarefas que têm passos no banco e não feitos, com descrição, esforço, prazo e passos em ordem; passos agendados ou feitos ficam de fora; UTF-8 com BOM e quebras de linha do Windows, `lib/download.ts`, para os acentos abrirem certo no Bloco de Notas). Nada disso fica salvo ao recarregar.
- Canto de baixo à direita do banco: aproximar, afastar e "Centralizar" (enquadra todas as tarefas), com o `Panel` do React Flow.
- Desfazer exclusão (`components/useUndoableDelete.ts`, `components/UndoToast.tsx`): depois de confirmar a exclusão de um passo ou de uma tarefa inteira, o item some da tela e um aviso "… excluído(a). Desfazer" fica 6 s embaixo, com uma barra que esvazia (Ctrl+Z também desfaz). Só depois a exclusão vai para a API. Outra exclusão ou sair da tela manda a que estava esperando na hora; fechar a aba durante a espera mantém o item (nada foi enviado).
- Banco de tarefas como o grafo do Obsidian: as miniTasks ligadas se atraem, as outras se afastam, e uma gravidade fraca puxa tudo para o centro. O grafo se mexe ao abrir, ao arrastar e quando uma miniTask entra ou sai; depois para. As posições não ficam salvas: a física recalcula ao abrir. Com `prefers-reduced-motion`, o grafo aparece já arranjado.
- Um gesto só para mover e agendar: arrastar um card dentro do banco puxa o card (os ligados vêm atrás). Se o ponteiro sai do banco, o card fica apagado no lugar e uma cópia segue o ponteiro até o "Em foco". Soltar no banco deixa o card ali; uma miniTask que volta do "Em foco" aparece onde foi solta.
- Fundo de pontos do banco fixo: o pan e o zoom movem só os cards e as linhas.
- MiniTasks arrastam entre banco e foco, e dentro do foco.
- Botão "Nova tarefa" abre o formulário de cadastro num modal (`components/MainTaskFormDialog.tsx`). Passos (`components/StepListEditor.tsx`): Enter cria um passo logo abaixo e vai para ele; Backspace num passo vazio tira o passo e volta para o de cima; a alça ⋮⋮ arrasta para mudar a ordem (eventos de ponteiro, sem dnd-kit: o modal é centralizado com `transform` e rola, o que quebra a cópia flutuante do dnd-kit; o próprio passo muda de lugar enquanto o ponteiro sobe e desce, e o movimento é lido na janela, porque o React move o elemento da alça ao reordenar e o navegador soltaria a captura); Alt + ↑/↓ no campo faz o mesmo pelo teclado. O formulário não mostra texto explicando Enter nem o arraste, a pedido do usuário.
- Modelos de tarefa (`models/taskTemplate.ts`, `models/repositories/templateStore.ts`, `controllers/useTaskTemplates.ts`): "Usar modelo (N) ▾" no topo do formulário preenche nome, descrição, passos, esforço e prazo (a lixeira apaga, com segundo clique); "Salvar como modelo" no rodapé guarda o que está no formulário (precisa de nome e 1 passo). No menu ⋯ da tarefa no banco, "Salvar como modelo" guarda a tarefa com todos os passos, e um aviso rápido confirma (`components/NoticeToast.tsx`). Ficam no navegador, separados por conta (`accountId` do `AuthProvider`), no máximo 50 (o mais antigo sai), até a API ter modelos.
- Hora exata (ex.: 13:23): o passo continua na faixa da hora dele (13:00) e o cartão mostra a hora exata (`hasExactMinutes`, `hourSlotOf`, `setMiniTaskTime` em `models/miniTask.ts`; dentro da faixa, ordenados pela hora). Define-se por "Definir hora…" no menu do botão direito (só passos já agendados) ou pelo botão "Definir hora" no modal de detalhe, os dois abrem `components/SetTimeDialog.tsx` (campo de hora; "Tirar a hora" volta o passo para "Sem hora" do dia). Arrastar para outra faixa põe a hora cheia dela (13:23 solto em 14:00 vira 14:00); soltar na mesma faixa mantém a hora exata.
- Menu do botão direito (ou toque longo) em qualquer cartão de miniTask, no banco e no "Em foco" (`components/MiniTaskContextMenu.tsx`, Radix `ContextMenu`; as ações vêm do `MiniTaskMenuContext`, fornecido por `OverviewView`): **Copiar para** abre um submenu com "Banco de tarefas" e só os dias que o "Em foco" está mostrando (o campo "Dias"; `upcomingDays` em `models/focus.ts`, só o nome do dia da semana, sem data, com "(hoje)" no primeiro; `OverviewView` guarda o número de dias que `FocusArea` informa em `onDayCountChange`) e cria outra miniTask igual (mesma `MainTask` e texto, no fim dos passos, não feita) no destino escolhido; num dia, mantém a hora do original. Serve para fazer o mesmo passo em dias diferentes; **Novo passo** abre um modal e cria um passo no banco, na `MainTask` do cartão; **Deletar** pede confirmação e apaga a miniTask, e se for o único passo da `MainTask`, apaga a `MainTask` também (ela precisa de pelo menos 1 passo).
- Botão "⋯" no card da tarefa principal no banco (`components/MainTaskMenu.tsx`, Radix `DropdownMenu`; as ações vêm do `MainTaskMenuContext`, fornecido por `OverviewView`). Apertar o botão não começa um arraste. **Salvar como modelo** (ver "Modelos de tarefa"); **Editar tarefa** abre `components/EditMainTaskDialog.tsx` (nome, descrição, texto de cada passo, esforço e prazo; mesmas regras do cadastro, `validateMainTaskEdit`; passo vazio não vale: tirar passo é pelo "Deletar" dele). A API ainda não salva edições (`editMainTask` do repositório lança `EditNotSupportedError`): a mudança aparece na tela e some ao recarregar, e o modal avisa isso. Quando o backend tiver a rota, só `models/repositories/tasksApi.ts` muda; **Novo passo** abre o mesmo modal do menu do botão direito; **Duplicar tarefa** cria outra `MainTask` com nome "(cópia)", cor sorteada pelo backend e todos os passos no banco, não feitos (o prazo volta a contar de agora); **Mandar passos para hoje** põe no plano de hoje, sem hora, os passos dela que estão no banco e não feitos (apagado quando não há nenhum); **Excluir tarefa** pede confirmação (diz quantos passos e quantos estão no "Em foco") e apaga a tarefa com todos os passos (soft delete, como apagar um passo). 
- Cor da `MainTask` sorteada pelo backend na paleta (`ColorPalette`, igual a `models/colors.ts`). Por enquanto pode repetir.
- Clique numa miniTask abre modal de detalhe: nome e descrição da `MainTask`, a miniTask clicada, as fotos do passo (clicar numa miniatura abre a foto grande, `components/PhotoLightbox.tsx`, com setas entre as fotos do passo e "Baixar foto"), a nota do passo e as outras miniTasks não feitas da mesma `MainTask`.
- Nota do passo (`components/StepNoteEditor.tsx`, `models/stepNote.ts`, `controllers/useStepNotes.ts`): "Como você fez, o que aprendeu…", até 1000 caracteres, "Salvar nota" (texto vazio apaga). Aparece no visualizador da galeria. Fica no navegador, por conta, até a API ter notas.
- Sugestão de foto (`components/PhotoPromptDialog.tsx`, `controllers/usePhotoPrompt.ts`): ao marcar como feito um passo sem foto (visão geral e painel "Escolhidas"), um modal pergunta se quer enviar uma foto. "Agora não" fecha; "Não perguntar de novo" desliga para a conta (preferência no navegador, `models/repositories/preferenceStore.ts`). Nunca obriga.
- O que o navegador guarda por conta (modelos, notas, preferências) usa `models/repositories/accountStore.ts` (chave `tarefinhas.<coisa>.<id da conta>`, com subscribe/snapshot para `useSyncExternalStore`).

- Esforço (`Effort`: fácil, médio, difícil) é campo da `MainTask`, escolhido no formulário (padrão médio). Define a prioridade na sugestão de tarefas. `MiniTask.doneAt` guarda quando foi marcada como feita.
- Tarefa não feita (`models/overdue.ts`): miniTask planejada para um dia antes de hoje e não feita. Sem prazo na `MainTask`: passa sozinha para hoje (ao abrir o app, mantém a hora). Com prazo: `OverdueDialog` obriga a escolher, uma por vez, entre "Postergar para hoje" (continua na agenda, não muda o prazo) e "Esquecer" (volta ao banco e fica guardada).
- Escolher tarefas do dia (`views/PickView.tsx`, rota `/escolher`, segunda opção ao lado da visão geral): como um baralho. Mostra uma miniTask do banco por vez, sorteada por prioridade com um pouco de acaso (`models/suggestion.ts`: peso fácil 1, médio 2, difícil 3). Deslizar à direita (ou seta direita, botão "Vou fazer") roda a tarefa: vai para hoje e fica em andamento (`startMiniTask`). Deslizar à esquerda deixa no banco e a tarefa não volta nessa rodada; "Ver de novo" refaz o sorteio. `components/SwipeCard.tsx` faz o gesto. Dos lados do cartão aparecem, apagadas (`GhostCard`, só a partir de 768 px), a última tarefa decidida (esquerda) e a próxima (direita). Botão "Nova tarefa" na própria tela: a tarefa criada entra no fim da fila, sem refazer o sorteio. No canto de cima à esquerda, o botão "Escolhidas (N)" abre um painel à esquerda (`TodayPanel`, um `Dialog` encostado na esquerda) com tudo que está no plano de hoje, escolhido ali ou antes: dá para marcar como feita, enviar fotos de como fez (vão para a galeria quando a tarefa estiver feita) ou tirar de hoje (volta ao banco). O contador "Hoje: N escolhidas" conta essa mesma lista. Com o painel ou um formulário aberto, as setas do teclado não passam cartões. Quando o baralho acaba, aparece o resumo da rodada (`RoundSummaryView`; `roundSummary` e `effortSentence` em `models/suggestion.ts`): quantas foram escolhidas e por esforço ("2 difíceis e 1 fácil"), a lista delas, quantas ficaram para depois e o total de hoje. Visual simples de propósito: primeiro o sistema.

## Fotos dos passos e galeria

- Cada passo (`MiniTask`) pode ter várias fotos (`TaskPhoto`, `models/taskPhoto.ts`), a prova de como foi feito. A foto é opcional: dá para marcar o passo como feito sem ela.
- Enviar e tirar fotos: botão "Enviar foto" no topo do modal de detalhe, ao lado do X, e a seção "Fotos do passo" no corpo (`components/StepPhotos.tsx`, estado em `components/useStepPhotos.ts`). Aceita JPEG, PNG, GIF e WebP até 20 MB, várias de uma vez. Tirar uma foto pede um segundo clique.
- Onde ficam, por enquanto: no computador, salvas pelo servidor de desenvolvimento (`dev-server/taskPhotos.ts`, rotas `/__local/photos`). Pasta `frontend/local-photos/<id da conta>/`, fora do Git, com `index.json` ligando cada foto ao passo. A conta vem do cookie de login, conferido com `GET /users/me` na API, então cada pessoa vê só as suas. Só aceita pedidos deste computador (`dev-server/localRequest.ts`, a mesma checagem do admin das bolhas). O arquivo é conferido pelos primeiros bytes, não pelo tipo que o navegador diz. O build de produção não tem fotos nem galeria (`PHOTOS_AVAILABLE`); quando o backend tiver rotas de foto, só `models/repositories/photoStore.ts` muda.
- Também na tela de escolher: no painel "Escolhidas" (`TodayItem` em `views/PickView.tsx`), cada tarefa de hoje tem um botão só com ícone para enviar foto e uma fileira com as primeiras miniaturas (`StepPhotoStrip`).
- Controller: `PhotosProvider` (`usePhotos()`), dentro das rotas `/tarefas`, `/escolher` e `/galeria`.
- Galeria (`views/GalleryView.tsx`, rota `/galeria`, link "Galeria" no topo da visão geral, da tela de escolher e do perfil): fotos dos passos **feitos**, mais recentes primeiro, soltas como no Pinterest (`components/galleryLayout.ts`): cada card tem um formato próprio tirado do id da foto (a foto é cortada para caber; inteira no visualizador), cada coluna começa numa altura diferente e o card vai para a coluna mais curta. De 2 colunas (celular) a 5 (tela larga). Em cima de cada foto, o passo e o dia em que foi feito, com a cor da tarefa grande. Foto de passo não feito fica fora até ele ser feito.
- Barra da galeria (`components/GalleryToolbar.tsx`; regras puras em `models/taskPhoto.ts`: `filterGallery`, `sortGallery`, `stepsMissingPhotos`): busca por palavras no passo, no nome e na descrição da tarefa (sem diferença de acento ou maiúscula; todas as palavras precisam aparecer); período pela data em que o passo foi feito (qualquer data, últimos 7 dias, este mês ou "Escolher datas…" com de/até, as duas pontas incluídas); ordem (mais recentes, mais antigas, por tarefa). "Limpar filtros" e a contagem "N fotos de M" aparecem com algum filtro ativo. Nada disso fica salvo ao recarregar.
- "Faltam fotos (N)" abre a lista de passos feitos sem foto, cada um com "Enviar foto" (`MissingPhotosDialog` em `components/GalleryDialogs.tsx`).
- "Selecionar": tocar nas fotos marca e desmarca; a barra de baixo mostra quantas, "Selecionar todas", "Baixar (.zip)" e "Apagar" (pede confirmação, `DeletePhotosDialog`). Conta só as selecionadas que os filtros ainda mostram. Apagar a foto não desmarca o passo.
- .zip feito no navegador, sem biblioteca (`lib/zip.ts`: sem compressão, porque as fotos já são comprimidas; nomes em UTF-8; nome repetido ganha "-2"). Baixar várias fotos: `downloadPhotos` no `PhotosProvider`; nome `tarefinhas-<o quê>-<data>.zip`.
- Clique numa foto abre `components/GalleryViewer.tsx`: no alto, uma faixa na cor da tarefa com o nome da tarefa grande em destaque e "Passo N de M: <passo> · feito em <data>"; sobre a foto, uma etiqueta com a tarefa e o número do passo. Depois: a foto grande, "Baixar foto" (nome `tarefinhas-<passo>-<data>`), "Baixar as N da tarefa (.zip)" (com 2 ou mais fotos no carrossel), "Apagar foto" (confirma; o visualizador passa para a próxima foto da tarefa ou fecha), a tarefa grande (nome, descrição), o passo da foto com as datas, todos os passos da tarefa (feitos e não feitos) e um carrossel com as fotos da galeria da mesma tarefa grande, em ordem de passo (setas na tela, miniaturas ou setas do teclado).

## Perfil

- Tela própria (`views/ProfileView.tsx`, rota `/perfil`), não um painel: foto, nome, e-mail, "Trocar foto", "Usar o gatinho", "Sair" e atalhos para "Visão geral" e "Escolher tarefas do dia". Também tem "Nome" (editar o nome, vai para `PUT /users/me`), "Senha" (atual, nova e confirmação, com as regras do cadastro, `validatePasswordChange`) e "Excluir conta" (modal que pede o e-mail para confirmar) em `components/AccountSettings.tsx`. Senha e excluir conta ainda não funcionam: a API não tem as rotas, e a tela responde "Ainda não disponível: o servidor não tem essa função." (`changePasswordRequest` e `deleteAccountRequest` em `models/repositories/authApi.ts`, os únicos pontos a mudar). Só abre para quem entrou. Mais funções entram nessa tela depois.
- Botão redondo com a foto da pessoa no canto de cima à direita da visão geral e da tela de escolher (`components/ProfileButton.tsx`, um link para `/perfil`).
- O nome "Tarefinhas" no canto de cima à esquerda (`components/AppBrand.tsx`) é um link para a visão geral (`/tarefas`) e aparece na visão geral, na tela de escolher e no perfil. A homepage e o admin não têm.
- Quem entrou aparece como `Profile` (`models/profile.ts`: nome, e-mail, foto; sem senha). Nome e e-mail vêm da API (`GET /users/me`). A foto a API ainda não guarda: fica no navegador, separada por id da conta (`models/repositories/sessionStorage.ts`), então "Sair" e entrar de novo mantêm a foto naquele navegador.
- Foto: padrão é um gatinho (`public/default-cat.svg`). "Trocar foto" lê uma imagem do computador (até 8 MB), corta o maior quadrado centralizado, reduz a 256 px e guarda como JPEG no navegador (`components/profilePhoto.ts`); "Usar o gatinho" volta ao padrão. A foto fica só naquele navegador (a API não tem campo de foto).

## Homepage (entrar e criar conta)

- Primeira tela do app (`views/HomeView.tsx`), em `/`. Abas "Entrar" e "Criar conta" no mesmo painel. A aba ativa fica na URL: `?mode=sign-up` (`useSearchParams`).
- Login pela API do backend (`/auth/sign-in`, `/auth/sign-up`, `/auth/sign-out`, `GET`/`PUT /users/me`; ver "Backend"): `AuthProvider` valida o formulário (`models/auth.ts`, mesmas regras e mensagens do backend: a senha do cadastro precisa de 8+ caracteres, maiúscula, minúscula, número e símbolo) e chama `models/repositories/authApi.ts`. O token JWT fica num cookie HttpOnly que o backend grava (`tarefinhas_token`, ver "Autenticação"): o JavaScript da página não lê o token, e as chamadas vão com `credentials: 'include'` (`models/repositories/apiClient.ts`). Ao abrir o app, o `AuthProvider` pergunta à API quem entrou (`GET /users/me`, `restoring`) antes de decidir. Um 401 em qualquer rota com login (cookie vencido) tira a pessoa da tela (`setUnauthorizedHandler`). "Sair" chama `POST /auth/sign-out`, porque só o backend apaga o cookie. Ao abrir, `clearLegacyStorage` apaga o token antigo do `localStorage` e o IndexedDB das versões anteriores. Erros da API vêm como `{ errors: { campo: mensagem } }`; a chave `form` (login errado) aparece sob a senha. Endereço da API: `VITE_API_URL` (padrão `http://localhost:8080`; ver `frontend/.env.example`). A API só aceita a origem `http://localhost:5173` por padrão (`CORS_ALLOWED_ORIGINS` no `.env` da raiz).
- Sem entrar não se abre nenhuma tela do app: `components/RequireAuth.tsx` leva `/tarefas`, `/escolher` e `/perfil` para a homepage, lembra a tela pedida e, depois de entrar, abre essa tela. Quem saiu de propósito (`justSignedOut`) entra de novo na visão geral. O admin (`/admin`, só em desenvolvimento) não exige entrar.
- Entrar: e-mail e senha. Criar conta: nome, e-mail, senha (regra forte, igual ao backend) e confirmar senha. Regras em `models/auth.ts`.
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
- O mouse empurra as bolhas próximas, e a bolha sob o mouse cresce um pouco e ondula mais. Carrega em arquivo separado (`lazy`), depois do formulário. `prefers-reduced-motion` deixa a cena parada. Sem WebGL, a cena não aparece e o formulário funciona (`BackdropBoundary` segura o erro da cena).
- Composição no desktop: frase de marca grande no canto de cima à direita ("Tarefas grandes viram tarefinhas.", em `HomeView`, só a partir de `lg`, com `data-bubble-avoid`), 4 bolhas grandes (a maior e a de baixo cortadas pela borda da tela) e 3 bolhas distantes bem desfocadas. Um grão fino cobre a cena (`.home-texture` em `index.css`). No desktop nenhuma bolha distante fica perto do formulário.
- Parede de fundo (`Wall`): quadro de tela cheia atrás de tudo, fosco, com gradiente suave e 1 facho de luz diagonal que se move bem devagar. O lado do formulário fica sem efeitos de luz (esquerda na tela larga, parte de baixo na tela alta). No tema, `backdrop`: cor e força do facho, fosco ↔ metálico (metal escovado), reflexo das bolhas e fios. Cada bolha joga uma mancha da própria cor na parede (disco desfocado atrás dela) e o brilho largo do vidro pega parte da cor do facho (`uBeam`).
- Fios (`BubbleLinks`): linha fina de cada bolha grande para a seguinte, de borda a borda. `backdrop.links` é a opacidade; 0 remove.
- Botão de recolher (`HomeView`): quadrado de 44 px só com o ícone de voltar (`Undo2`), com `aria-label` e `title` "Recolher os balõezinhos", no canto de baixo à direita. Aparece quando a pessoa tem passos soltos e manda todos de volta (`HomeBackdropHandle.returnSteps`).
- Demonstração: enquanto a pessoa não aperta nenhuma bolha, a cada 9 s (`DEMO_EVERY_MS`) uma bolha, em rodízio, solta um passo sozinha e o recolhe depois de 4,5 s (`SplitStep.demo`, `leavingAt`). Só acontece sem nenhum passo solto, em tela larga e com movimento permitido. Para de vez no primeiro aperto numa bolha.
- Sem frase de dica no topo. Uma dica única (`.bubble-hint`) aparece ao lado do cursor na primeira vez que ele passa numa bolha e some de vez depois de 3,5 s ou do primeiro puxão. Em tela larga de toque (ex.: tablet deitado), aparece centralizada sob as bolhas, de 2,5 s a 8 s após abrir. Na tela alta não aparece.
- Posições, tamanhos, cores e textos das bolhas: no tema, pelo admin. Lugares das bolhas distantes: `WIDE_DISTANT` e `TALL_DISTANT` no código. Cores da página e tipografia da homepage ainda serão definidas.
- Tokens da homepage em `index.css`: `canvas` (também é a cor de fundo da cena 3D), `ink`, `brand`. Fonte de títulos: Bricolage Grotesque (`font-display`); texto: Geist.

## Convenções de nomes

Todo nome no código fica em inglês: entidades, campos, variáveis, funções, componentes, arquivos, pastas, tabelas. Texto visível ao usuário fica em português. Exceção: os endereços das páginas (`/tarefas`) ficam em português, porque aparecem na barra de endereço.

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

- Repositórios ficam atrás das interfaces de `src/models/repositories/types.ts`. A implementação (API do backend, `models/repositories/tasksApi.ts`) é escolhida num único ponto: topo de `src/controllers/TasksProvider.tsx`. Todo `fetch` passa por `models/repositories/apiClient.ts`. Ids, datas, cor e `position` do que se cria vêm da API.
- Ações do Controller gravam no repositório antes de atualizar o estado.

### Backend (Spring Boot)

Spring MVC padrão, pacotes no plural em `br.com.shiroshima.backend`: `controllers` (REST), `services` (regras de negócio), `repositories` (persistência), `models` (entidades), `dtos` (contratos da API), `configs` (segurança), `exceptions` (erros da API). Controller não acessa repository direto.

- Construir uma camada por vez e combinar o formato da API (rotas, corpo, resposta) antes de escrever o código.
- Entidades JPA com id `UUID` gerado pelo Hibernate (`GenerationType.UUID`) e `createdAt` (`Instant`) preenchido no service.
- DTOs são `record`s e levam só os campos que a tela usa; campos novos entram quando forem precisos.
- Validação com Bean Validation nos DTOs de entrada, com as mesmas regras e mensagens (em português) do frontend.
- Formato de erro: `{ "errors": { "<campo>": "<mensagem>" } }`, igual aos `...Errors` do frontend. Erro sem campo (login errado, sessão expirada) usa a chave `form` (`ApiErrors.FORM`). Regra de negócio quebrada: `BusinessException(campo, mensagem)` → 400; conflito com dado salvo: `ConflictException` → 409; item que não existe, foi apagado ou é de outro usuário: `NotFoundException` → 404 na chave `form`. Tratados em `exceptions/ApiExceptionHandler`.
- Cor da `MainTask` sorteada no backend (`models/ColorPalette`, cópia da paleta de `frontend/src/models/colors.ts`; manter as 2 iguais). Por enquanto sorteio simples, pode repetir cor.
- Apagar é soft delete: `deletedAt` em `MainTask` e `MiniTask`, e `@SQLRestriction("deleted_at is null")` nas entidades esconde as apagadas de toda consulta. A rota continua respondendo 204.
- `Effort` (`models/Effort`) vai no JSON como no frontend: `"easy"`, `"medium"`, `"hard"`. A coluna tem padrão `MEDIUM` para as linhas antigas.

#### Endpoints

| Método e rota | Acesso | O que faz |
|---|---|---|
| `POST /auth/sign-up` | aberto | Cria conta (`name`, `email`, `password`, `passwordConfirmation`) → 201 `{ id, name, email }` + cookie do token. A pessoa já entra logada |
| `POST /auth/sign-in` | aberto | `email`, `password` → 200 `{ id, name, email }` + cookie do token. Errado → 401 `form: "E-mail ou senha incorretos."` |
| `POST /auth/sign-out` | aberto | Apaga o cookie do token → 204 |
| `GET /users/me` | token | Dados do usuário logado (`id`, `name`, `email`) |
| `PUT /users/me` | token | Edita o usuário logado. Só o `name` |
| `GET /mini-tasks` | token | MiniTasks do usuário, agrupadas por `MainTask`: `[{ mainTask: { id, name, description, deadlineDays, effort, color, createdAt }, miniTasks: [{ id, text, position, done, doneAt, inProgress, scheduledDate, scheduledTime, createdAt }] }]`. Uma consulta só (`join fetch`). Tarefa mais antiga primeiro, passos em ordem |
| `POST /main-tasks` | token | Cria `MainTask` com os passos: `{ name, description, deadlineDays?, effort?, miniTasks: [{ text }] }` → 201 com o grupo criado (mesmo formato de um item do `GET /mini-tasks`). `position` vem da ordem da lista; `effort` padrão `medium` |
| `POST /main-tasks/{id}/mini-tasks` | token | Novo passo no fim (`Novo passo`, `Copiar para`): `{ text, scheduledDate?, scheduledTime? }` → 201 com o passo |
| `PATCH /mini-tasks/{id}` | token | `{ done?, inProgress?, scheduledDate, scheduledTime }` → 200 com o passo. `done`/`inProgress` ausentes ficam como estão; `scheduledDate` e `scheduledTime` valem sempre (nulo = banco / sem hora), então vão em toda chamada. O backend preenche `doneAt` |
| `DELETE /mini-tasks/{id}` | token | Soft delete → 204. Se for o último passo, apaga a `MainTask` junto |

Os passos do formulário (`step` no frontend) são as `MiniTask`s; na API chamam `miniTasks`.

#### Autenticação

Reaproveitada do projeto budgie (`~/IFPR/6-PW/budgie/budgie-backend`): Spring Security sem sessão, JWT (`com.auth0:java-jwt`, HMAC256, assunto = e-mail, 24 h), senha com BCrypt, `SecurityFilter` lê o token do cookie HttpOnly `tarefinhas_token` (`configs/AuthCookies`: `SameSite=Strict`, `Path=/`, `Secure` por `COOKIE_SECURE`, validade igual à do JWT), `ApiAuthEntryPoint` (401) e `ApiAccessDeniedHandler` (403), CORS por propriedade. Diferenças do budgie: sem papéis (`AuthRole` removido), id `UUID`, e-mail guardado sem espaços e em minúsculas, token em cookie HttpOnly, não no cabeçalho `Authorization` (o JavaScript não lê o token, então um script injetado não rouba a sessão), CORS com `allowCredentials`, senha errada responde "E-mail ou senha incorretos." (não "sessão expirada"). Regra de senha do budgie: 8+ caracteres, com maiúscula, minúscula, número e caractere especial. Cada `MainTask` pertence a um `User` (`user_id`); as rotas de tarefas só veem as do usuário logado.

#### Configuração (`.env`, lido pelo `docker-compose.yml`)

- `DATASOURCE_URL` (formato `jdbc:postgresql://...`), `DATASOURCE_USERNAME`, `DATASOURCE_PASSWORD`. Hoje aponta para o Postgres do Neon. Com o Postgres local do compose (perfil `local-db`), o host é `postgres`, não `localhost`.
- `TOKEN_SECRET`: segredo do JWT. Obrigatório.
- `COOKIE_SECURE`: marca `Secure` no cookie do token. Padrão `true`; Chrome e Firefox aceitam em `http://localhost`.
- `CORS_ALLOWED_ORIGINS`: origens liberadas, separadas por vírgula. Padrão `http://localhost:5173`.
- Tabelas criadas e atualizadas pelo Hibernate (`spring.jpa.hibernate.ddl-auto=update`), sem Flyway.
- Rodar: `docker compose up --build` na raiz (perfil `prod`).

## Stack

### Frontend
- Vite + React 19 + TypeScript, PWA via `vite-plugin-pwa`
- Tailwind v4 + [shadcn/ui](https://ui.shadcn.com) (preset Nova, base Radix). Adicionar componente: `npx shadcn@latest add <nome>`
- React Router (`react-router`): rotas em `src/views/routes.ts` (`/`, `/tarefas`, `/escolher`, `/perfil`, `/admin` só em desenvolvimento; endereço desconhecido volta para `/`). Montadas em `App.tsx`
- `@xyflow/react` (React Flow): desenha o grafo do banco. `d3-force`: física do banco. `@dnd-kit/core`: arrastar. `date-fns`: datas
- Gerenciador de pacotes: npm

### Backend (API)
- Java 21 + Spring Boot 4.1 (Web MVC, Data JPA, Validation, Security), Lombok, `com.auth0:java-jwt`
- PostgreSQL (Neon hospedado; Postgres local opcional no compose)
- Docker: `backend/Dockerfile` + `docker-compose.yml` na raiz

## Estrutura do repositório

Monorepo:

- `frontend/`: app React
- `backend/`: API Spring Boot 4.1, Java 21, Maven (`./mvnw`), pacote `br.com.shiroshima.backend`. Detalhes em "Arquitetura: MVC > Backend"
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
- 2026-11-15 — React Router com `/` (homepage) e `/tarefas`. Sem login: os botões da homepage levam direto para as tarefas, sem validar. Endereços em português. Motivo: separar as telas por endereço e testar o app sem login.
- 2026-11-23 — Backend começa: entidades `MainTask` e `MiniTask` iguais às do frontend, em JPA com Postgres (Neon). Pacotes no plural (`models`, `repositories`, `services`, `controllers`, `dtos`). Motivo: pedido do usuário.
- 2026-11-23 — `GET /mini-tasks` devolve a lista agrupada por `MainTask`, com todas as miniTasks (feitas ou não) e só os campos que a tela usa, numa consulta só. Motivo: uma chamada monta o banco, o "Em foco" e o modal de detalhe; campos extras entram quando forem precisos.
- 2026-11-23 — `POST /main-tasks` cria a tarefa com os passos como `miniTasks: [{ text }]`. O backend gera id, data e cor; validação com Bean Validation; resposta 201 com o grupo criado; erros no formato `{ errors: { campo: mensagem } }` do frontend. Motivo: a API não confia no cliente, e o formulário mostra os erros sem adaptar.
- 2026-11-23 — Tabelas pelo Hibernate (`ddl-auto=update`), sem Flyway. Motivo: escolha do usuário nesta fase.
- 2026-11-23 — Autenticação reaproveitada do projeto budgie (JWT sem sessão, BCrypt, mesma regra de senha forte). Só entrar, criar conta e editar o nome do usuário; recuperar senha fica para depois (precisa de e-mail). Sem papéis (`AuthRole` removido). Cada `MainTask` tem dono. Criar conta já devolve o token. Motivo: reaproveitar uma implementação conhecida; o app não tem administrador.
- 2026-11-23 — Passa a valer o documento "TAREFINHAS V2" (log do sistema). Primeiro o sistema funcionando, sem mexer no visual elaborado. Esforço fácil/médio/difícil; tarefa não feita sem prazo passa sozinha ao dia seguinte, com prazo pergunta; esquecida fica no banco.
- 2026-11-23 — Tela "Escolher tarefas do dia", estilo Tinder, como segunda opção de planejar. Motivo: pedido do usuário; é a "visão reduzida" do documento.
- 2026-11-23 — Menu do botão direito nos cartões (copiar, novo passo, deletar). Motivo: pedido do usuário, para fazer a mesma tarefa em dias diferentes. Copiar vira "Copiar para" (banco ou os dias que o "Em foco" mostra, sem datas), a pedido do usuário; apagar o último passo apaga a tarefa.
- 2026-11-23 — "Em foco" com largura ajustável por arraste e botão para abrir e fechar. Motivo: pedido do usuário; com 3 ou 4 dias o painel estreito ficava apertado.
- 2026-11-23 — Hora exata nos passos (compromissos pontuais como 13:23), sem mudar as faixas de 1 hora. Motivo: pedido do usuário; as faixas de hora cheia não cabiam um compromisso com minutos. Arrastar para outra faixa vira a hora cheia dela.
- 2026-11-23 — Perfil da pessoa (foto, nome, e-mail, atalhos e sair) numa tela própria (`/perfil`), e o nome "Tarefinhas" no canto de cima à esquerda de todas as telas do app, levando à visão geral. Motivo: pedido do usuário (o perfil primeiro foi um painel, e ele quis uma tela separada). O perfil fica salvo no navegador porque ainda não há servidor nem login de verdade; foto padrão de gatinho.
- 2026-11-23 — Telas do app só abrem com login (`RequireAuth`). Motivo: pedido do usuário.
- 2026-11-23 — A autenticação feita no navegador (contas e senha com hash no `localStorage`, conta fictícia, trocar senha) foi removida: o frontend usa o login do backend do Shiro (`/auth/sign-in`, `/auth/sign-up`, `/users/me`). Motivo: o backend com banco (Neon) e JWT já existe. A troca de senha saiu porque a API não tem rota para ela; a foto continua no navegador porque a API não tem foto. Testes sempre contra o backend real (`docker compose up --build`), nunca com um servidor de mentira.
- 2026-11-26 — Token JWT em cookie HttpOnly (`SameSite=Strict`) em vez de `localStorage` e `Authorization: Bearer`. Motivo: pedido do usuário, para um script injetado (XSS) não conseguir roubar o token. Nova rota `POST /auth/sign-out`, porque só o backend apaga o cookie.
- 2026-11-26 — As tarefas saem do IndexedDB e vão para a API (`tasksApi.ts`). Novas rotas: `POST /main-tasks/{id}/mini-tasks`, `PATCH /mini-tasks/{id}` e `DELETE /mini-tasks/{id}`; a regra "apagar o último passo apaga a tarefa" fica no backend. Motivo: pedido do usuário; cada conta vê só as próprias tarefas. As tarefas de teste do IndexedDB são descartadas, sem importar.
- 2026-11-26 — Apagar é soft delete (`deletedAt`), ainda respondendo 204. Motivo: precaução, pedido do usuário.
- 2026-11-26 — Botão "⋯" no card da tarefa principal no banco: novo passo, duplicar, mandar passos para hoje e excluir a tarefa inteira. Motivo: pedido do usuário, para excluir e duplicar tarefas inteiras sem apagar passo por passo.
- 2026-11-26 — Fotos dos passos (opcionais, várias por passo) e aba Galeria estilo Pinterest com carrossel por tarefa grande. Fotos salvas no computador pelo servidor do Vite, por enquanto, porque o backend ainda não tem rota de arquivos. Motivo: pedido do usuário, primeira parte da "galeria de desenvolvimento" da V2.
- 2026-11-26 — Galeria com busca, período, ordem, "Faltam fotos", seleção para baixar (.zip) ou apagar várias. Filtro por tarefa grande foi feito e retirado a pedido do usuário: a busca por palavra já acha pelo nome da tarefa, e uma lista de tarefas cresceria demais com o uso.
- 2026-11-26 — "Em foco" com linha do "agora", aviso de prazo e ícone de foto nos cartões, e botão para encher a tela. Motivo: pedido do usuário (itens F1, F4, F5 e F6 da análise das telas). O progresso do dia (F2) foi feito e retirado a pedido do usuário.
- 2026-11-26 — Madrugada (00:00 a 05:00) recolhida no "Em foco", com a contagem de passos de cada dia. Motivo: o usuário achou ruim a grade começar em 00:00; escolher a hora de início no Perfil ficou como ideia para depois.
- 2026-11-26 — Banco com busca, "Esconder feitos", "Copiar para IA", zoom e centralizar, e desfazer exclusão por 6 s. Motivo: pedido do usuário (B1, B3, B4, B6, B7). Depois: "Copiar para IA" virou "Exportar" (arquivo .txt) e "Editar tarefa" entrou no menu ⋯ só na tela, sem salvar no servidor por enquanto, a pedido do usuário.
- 2026-11-26 — Formulário "Nova tarefa" com Enter para o próximo passo, reordenar arrastando e modelos de tarefa (no navegador, por conta). Motivo: pedido do usuário (N1, N2, N3).
- 2026-11-26 — Detalhe do passo com foto grande, sugestão de foto ao marcar como feito e nota do passo; resumo da rodada no fim do baralho; senha e excluir conta no Perfil (tela pronta, sem rota no backend). Motivo: pedido do usuário (D1, D2, D3, E5, P3).

## Pendências a definir

- Cor sem repetir no backend (hoje o sorteio pode repetir; o frontend antigo evitava)
- Recuperar senha e trocar senha
- Migrações de schema (hoje `ddl-auto=update`)
- Estratégia de testes
- Convenções de código e commits
- Salvar edições no backend (B5): a tela existe, mas a API não tem rota (falta `PATCH /main-tasks/{id}` com nome, descrição, prazo e esforço, e `text` no `PATCH /mini-tasks/{id}`, que hoje sempre aplica o agendamento)
- Rotas de conta no backend: troca de senha (ex.: `PUT /users/me/password` com a senha atual e a nova) e excluir conta (ex.: `DELETE /users/me`). A tela do Perfil já existe
- Notas dos passos, modelos de tarefa e preferências ficam só no navegador até a API guardar
- B8 (filtros por dia do passado) vai para a aba Perfil, a pedido do usuário; depende de guardar o histórico do banco no backend
- MiniTasks agendadas em dias que já saíram da janela de 7 dias ficam invisíveis (spec "Tarefa não feita" trata isso numa etapa futura)
- Ícones PNG do PWA (hoje só `favicon.svg`)
