# Tarefinhas V2: base mínima

11 Nov 2026

## Escopo

Esta base constrói 4 partes do Tarefinhas V2: o formulário de cadastro, os balões, as cores e ligações entre balões, e as 2 áreas da visão geral. Não construa nada que este documento não descreve.

Termos usados neste documento:

- **Tarefa principal:** a tarefa que o usuário cadastra no formulário. Ela não aparece como balão.
- **Balão:** um passo da tarefa principal. Cada passo vira um balão.
- **Banco de tarefas:** a área que guarda os balões que não estão na agenda.
- **Agenda:** a área com uma linha do tempo, onde o usuário planeja o que vai fazer em cada dia.

Stack desta base:

- React, como aplicação web instalável (PWA).
- Dados salvos no navegador, com IndexedDB. Login e sincronização entre aparelhos ficam para depois.
- Bibliotecas à escolha. Opções conhecidas: React Flow para balões e ligações, dnd-kit para arrastar.

A persistência local e as bibliotecas são sugestões técnicas. A plataforma final da V2 ainda não foi decidida.

## Modelo de dados

A base tem 2 entidades: tarefa principal e balão. Cada balão pertence a exatamente 1 tarefa principal.

### TarefaPrincipal

| Campo | Tipo | Regra |
|---|---|---|
| id | texto | Gerado pelo sistema |
| nome | texto | Obrigatório |
| descricao | texto | Obrigatório |
| prazoDias | inteiro | Opcional. De 1 a 7. Define o limite da tarefa |
| cor | cor em hex | Atribuída pelo sistema na criação |
| criadaEm | data e hora | Gerado pelo sistema |

O limite da tarefa é `criadaEm` mais `prazoDias` dias. O limite é diferente da data em que o balão está na agenda.

### Balao

| Campo | Tipo | Regra |
|---|---|---|
| id | texto | Gerado pelo sistema |
| tarefaPrincipalId | texto | Obrigatório. Aponta para a tarefa principal |
| texto | texto | Obrigatório. Texto do passo |
| ordem | inteiro | Posição do passo no formulário, a partir de 1 |
| feito | booleano | Começa falso |
| emAndamento | booleano | Começa falso. Não aparece na interface. Nada nesta base altera este campo |
| agendadoPara | data | Vazio quando o balão está no banco |
| horaAgendada | hora | Opcional. Só existe quando agendadoPara está preenchido |
| criadoEm | data e hora | Gerado pelo sistema |

## Formulário de cadastro

O formulário cria 1 tarefa principal e 1 balão para cada passo.

| Campo | Obrigatório | Regra |
|---|---|---|
| Nome | Sim | Texto |
| Descrição | Sim | Texto |
| Passos | Sim | Lista de textos. O usuário adiciona e remove passos antes de salvar. Mínimo de 1 passo |
| Prazo | Não | Vazio ou um número de 1 a 7 dias |

Ao salvar, o sistema faz estes passos, nesta ordem:

1. Remove os passos com texto vazio.
2. Rejeita o envio se o nome ou a descrição estiverem vazios, ou se não restar nenhum passo. Mostra qual campo falta.
3. Cria a tarefa principal e atribui uma cor a ela.
4. Cria 1 balão para cada passo, com ordem igual à posição do passo na lista.
5. Coloca os balões no banco de tarefas, com agendadoPara vazio.
6. Limpa o formulário.

## Balões, cores e ligações

Cores e ligações mostram a que tarefa principal cada balão pertence. A tarefa principal não tem balão.

O balão mostra:

- O texto do passo.
- Um checkbox que muda o campo `feito`.
- A cor da sua tarefa principal.

Regras de cor:

- Todos os balões de uma tarefa principal usam a mesma cor.
- Tarefas principais diferentes usam cores diferentes enquanto a paleta tiver cores livres.

Regras de ligação, no estilo do grafo do Obsidian:

- Uma linha liga balões da mesma tarefa principal.
- Balões de tarefas principais diferentes nunca são ligados.

Padrões desta base, que o usuário não definiu:

- A linha liga cada balão ao balão seguinte, pela ordem.
- As linhas aparecem só no banco de tarefas. Na agenda, o balão mostra só a cor.
- O balão com `feito` verdadeiro fica com aparência apagada.

## Áreas: banco de tarefas e agenda

A visão geral tem 2 áreas: o banco de tarefas, onde os balões ficam guardados, e a agenda, onde o usuário planeja o que vai fazer em cada dia.

### Banco de tarefas

- Mostra todos os balões com `agendadoPara` vazio.
- Mostra os balões como nós de um grafo, com as cores e ligações da seção anterior.

### Agenda

- Mostra uma linha do tempo no estilo de calendário.
- O usuário arrasta um balão do banco e solta na agenda.
- Soltar o balão em um dia preenche `agendadoPara`.
- Soltar o balão em uma faixa de hora preenche `agendadoPara` e `horaAgendada`.
- A data na agenda é o plano do dia. Ela não muda o limite da tarefa principal.

Padrões desta base, que o usuário não definiu:

- As 2 áreas aparecem na mesma tela.
- A agenda mostra 7 dias a partir de hoje. Cada dia tem uma faixa sem hora e faixas de 1 hora.
- Arrastar um balão dentro da agenda muda o dia ou a hora.
- Arrastar um balão da agenda para o banco limpa `agendadoPara` e `horaAgendada`.

## Critérios de aceite

A base está pronta quando os 12 testes abaixo passam. Marque cada um depois de testar.

- [ ] Cadastrar uma tarefa principal com 3 passos cria 3 balões no banco, todos com a mesma cor.
- [ ] A tarefa principal não aparece como balão.
- [ ] Enviar o formulário sem nome, sem descrição ou sem passo mostra o campo que falta e não cria nada.
- [ ] O campo prazo aceita só vazio ou um número de 1 a 7.
- [ ] 2 tarefas principais cadastradas em seguida recebem cores diferentes.
- [ ] No banco, os balões da mesma tarefa principal aparecem ligados em sequência, pela ordem dos passos.
- [ ] Balões de tarefas principais diferentes não aparecem ligados.
- [ ] Arrastar um balão para um dia da agenda tira o balão do banco e mostra o balão nesse dia.
- [ ] Soltar um balão em uma faixa de hora grava a data e a hora.
- [ ] Arrastar um balão da agenda de volta ao banco limpa a data e a hora.
- [ ] Marcar o checkbox muda o balão para feito e deixa o balão com aparência apagada.
- [ ] Recarregar a página mantém tarefas principais, balões, datas, horas e o estado feito.

## Fora desta base

Não implemente os itens abaixo. Eles estão aqui para que o modelo de dados não bloqueie as próximas etapas.

| Funcionalidade | Regra já decidida |
|---|---|
| Visão reduzida | O sistema sugere tarefas por prioridade, com aleatoriedade. O usuário escolhe se faz ou não. Deslizar para a esquerda devolve a tarefa ao banco. Deslizar para a direita roda a tarefa |
| Estado em andamento | Rodar a tarefa muda `emAndamento` para verdadeiro. O estado não aparece na interface |
| Grau de esforço | Define a prioridade das tarefas na visão reduzida |
| Tarefa não feita | Sem prazo: passa sozinha para o dia seguinte. Com prazo: o usuário escolhe se ela é esquecida ou postergada. Postergar é diferente de devolver ao banco |
| Filtros | Mostram o que estava no banco em um dia do calendário, como ontem ou o dia 10. Retiram tarefas fora do prazo. Exigem guardar o histórico do banco por dia |
| Exportação | Copia as tarefas do banco para colar em uma IA. Respeita os filtros |
| Porcentagem de progresso | Mede as tarefas feitas no prazo. Muda conforme o conteúdo do banco |
| Galeria de tarefas cumpridas | Referência visual: Pinterest |
| Sugestão de aumento de esforço | Sugere aumento de esforço quantitativo na entrega da tarefa |
| Subtítulo no balão | Cores e ligações são o indicador principal. O subtítulo não está decidido |
| Login e sincronização | Uma pessoa por conta. Plataforma ainda não definida |

Editar e apagar tarefas principais e balões ainda não foram especificados.
