# Ateliê Milena Kerbage — Sistema interno

ERP em Next.js (App Router) + TypeScript + Emotion.

## Scripts

```bash
npm run dev        # ambiente de desenvolvimento
npm run build      # build de produção
npm run start      # servidor de produção
npm run typecheck  # checagem de tipos
```

**Pelo celular (mesma Wi-Fi):** com `npm run dev` rodando, abra
`http://<IP do computador>:3000` (o terminal mostra em "Network"). O
`allowedDevOrigins` do `next.config.ts` libera os IPs de rede local
(192.168.x.x e 10.x.x.x) para o modo de desenvolvimento.

## Estrutura

```
src/
├── app/
│   └── (app)/               # telas internas (usam o AppShell)
├── components/
│   ├── layout/              # AppShell, Header, Sidebar
│   └── ui/                  # componentes base reutilizáveis
├── config/navigation.ts     # menu: módulos, seções, conta e ajuda
├── features/                # regras e componentes de cada módulo (ex.: leads/)
├── lib/                     # helpers (navegação, ícones, avatar, Emotion)
├── providers/               # providers globais (Emotion, Theme, ícones)
└── styles/
    ├── reset.css            # reset CSS
    ├── theme.ts             # tokens de design (cores, fontes, espaçamento...)
    ├── global.tsx           # estilos globais baseados no theme
    ├── fonts/               # Inter (Google) e Scarlett (local)
    └── emotion.d.ts         # tipagem do theme no Emotion
```

## Componentes

Cada componente tem sua pasta com `index.tsx` (lógica, `"use client"`) e
`styles.ts` (Emotion). Props usadas só para estilo têm prefixo `$` e não chegam
ao DOM (`transientOptions` em `src/lib/emotion/transient.ts`).

**Padrão visual dos controles:** botões, abas e itens de menu usam os mesmos
mixins de `src/styles/mixins.ts` (`controlBase`, `controlVariant`,
`controlSelected`): cantos de 8px, fundo branco com borda sutil, **sem
sombra**, hover discreto e estado ativo como um "cartão" branco. Ajuste lá
para mudar todos.

**Separadores:** na interface, nunca travessão (—) ou ponto (·) entre
informações; use barra (`Celular / iOS`) ou badge (`2/5`).

| Componente       | Uso                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------ |
| `Button`         | Botão ou link com texto. Variantes `primary`, `secondary`, `ghost`, `danger`; ícone antes/depois; `loading` |
| `IconButton`     | Botão ou link só com ícone. Variantes `secondary`, `ghost`, `primary`; `active`. `label` é obrigatório (nome acessível + tooltip) |
| `SearchField`    | Campo de busca simples (listas estreitas, como a caixa de entrada de Conversas)      |
| `FilterBar`      | Busca larga da página (atalho `/`) + botão de filtros: menu com busca, grupos `multi` (vários), `single` (um, com "qualquer") e `toggles` (liga/desliga), contagem por opção e check no escolhido; filtros ativos viram chips removíveis; `shortPlaceholder` é o texto curto do celular (ex.: "Buscar clientes"). `FilterBarButton` para botões ao lado (ex.: funil) |
| `Tooltip`        | Rótulo visual em portal — abre no hover e no foco por teclado, fecha com Esc         |
| `Menu`           | Dropdown de **ações/navegação** (`MenuItem` com `icon`/`leading`/`meta`/`trailing`/`muted`, `MenuLabel`, `MenuHeader`, `MenuNote`, `MenuCount`, `MenuSeparator`, `MenuAddHint`) |
| `Select`         | Dropdown de **escolha de valores**: única ou múltipla (bolinha de marcação), busca (automática com +7 opções), `header`, `heading`, opções com `leading`/`meta`/`trailing`. Sem `trigger`, vira campo de formulário com rótulo e chips |
| `IconTile`       | Ícone num quadrado suave na cor do tom (funis, categorias)                           |
| `Tabs`           | Abas dentro de uma tela (setas trocam de aba), sublinhado na ativa                  |
| `DataList`       | `DataGroup` + `DataItem`: rótulo (com `icon`) → valor empilhados, com botão de copiar |
| `Editable`       | `EditableText`: o valor vira campo no clique, no mesmo lugar e sem mudar o visual (sem borda/anel), com `mask`; `FieldTrigger`: gatilho de dropdown `plain`, `pill` (avatar) ou `badge` (tom + ícone) |
| `DatePicker`     | Calendário em dropdown: mês e ano clicáveis, setas, hoje contornado, escolhido em destaque, teclado (setas, PageUp/Down, Home/End) |
| `FileItem`       | Arquivo com ícone pelo tipo, tamanho, baixar/remover (`row` ou `compact`)      |
| `CopyButton`     | Botão de ícone que copia um texto e confirma com check (tooltip "Copiado!")        |
| `Chat`           | `ChatBubble` (recebida/enviada/nota, rabinho na primeira da sequência, imagens e arquivos colados na borda com legenda embaixo, hora dentro, status), `ChatFile` (arquivo embutido: tipo / tamanho), `DateDivider` (fixa no topo), `MediaGrid` (imagens em caixa fixa 16×12rem), `AudioPlayer`, `EmojiPicker`, `QuickReplies` (colunas + "Usar resposta") e `ChatComposer` (pílula flutuante só de WhatsApp, sem nota interna: anexos por botão/arrastar/colar, até 4 linhas, áudio, Enter envia) |
| `Badge`          | Selo curto de status/destaque. Tons `neutral`, `brand`, `success`, `warning`, `danger` |
| `NavTabs`        | Abas de navegação para uso dentro do conteúdo de uma tela (ex.: detalhes de um pedido) |
| `Breadcrumbs`    | Trilha de navegação; itens com `sections` viram seletor                              |
| `EmptyState`     | Estado vazio (lista sem itens, busca sem resultado, tela em construção)              |
| `Indicator`      | Ponto de notificação                                                                 |
| `Avatar`         | Foto da pessoa; sem foto, avatar ilustrado DiceBear "Gaze" (CC0, gerado localmente, `seed` estável) |
| `Dot`            | Bolinha de cor de um tom (etapas, funis, categorias)                                 |
| `Tag`            | Etiqueta pastel; `toneFor(texto)` dá sempre a mesma cor para o mesmo texto           |
| `KanbanBoard` / `KanbanColumn` | Quadro kanban: colunas em tom pastel, contador, ações, "Adicionar" e arrastar e soltar |
| `Logo`           | `horizontal` (símbolo + assinatura), `symbol` ou `wordmark`; tons `green`, `black`, `white` |
| `DisplayText`    | Texto na fonte da marca (Scarlett) com acentos corretos                              |
| `VisuallyHidden` | Texto só para leitores de tela                                                       |

**Barra de rolagem:** uma só para o sistema todo (`src/styles/global.tsx`):
4px, quase invisível, arredondada e sem setas. Não defina `scrollbar-width`/`scrollbar-color`
nos componentes (no Chrome isso desliga o estilo global); para afastá-la de
uma borda, use margem no contêiner e `::-webkit-scrollbar-track { margin-block }`.

**Dropdowns:** `Menu` e `Select` usam a mesma base (`src/components/ui/Popover`):
posição junto ao gatilho (ou a um `anchorRef`, como a pílula do chat) com
inversão automática, clique fora, fechar ao navegar, animação de entrada e o
mesmo visual: superfície branca, linhas de 40px com recuo, divisores de ponta
a ponta, título que descreve a escolha ("Quem responde"), ícone colorido ou
avatar à esquerda e check no escolhido (sem fundo). Todo dropdown novo deve
usar um dos dois.

**Ícones em props:** em Client Components passe o componente
(`icon={PlusIcon}`); em Server Components (páginas) passe o elemento
(`icon={<PlusIcon />}`), porque componentes não podem ir do servidor para o
cliente.

### Layout

```
┌───────────────────────────────────────────────────────────────────────┐
│ ☰ Logo │ Painel › Módulo ▾      Nome da página     [Buscar ⌃K] [🔔] │ [ações] │  Header (56px)
├────────┬──────────────────────────────────────────────────────────────┤
│        │ ╭──────────────────────────────────────────────────────────╮ │
│  ▣     │ │                                                          │ │
│  ○     │ │  conteúdo da página (única área com fundo)               │ │
│  ○     │ │                                                          │ │
│        │ │                                                          │ │
│ ─────  │ │                                                          │ │
│  ⚙     │ │                                                          │ │
│  (MK)  │ ╰──────────────────────────────────────────────────────────╯ │
└────────┴──────────────────────────────────────────────────────────────┘
```

- **Header** (100% da largura, sem fundo, 56px): à esquerda, botão do menu,
  logo e trilha; no meio do espaço livre entre os dois lados (mesma
  distância até a trilha e até as ferramentas), o nome da página (é o `h1`;
  nunca encolhe — quem cede espaço é a busca); à direita,
  busca geral (Ctrl+K), notificações e as ações da página. Título e trilha
  saem do menu, pela URL.
- **Busca geral** (`src/features/search`): Ctrl+K / ⌘K (ou `/` onde a página
  não tem busca própria) abre uma paleta que acha leads e clientes (nome,
  telefone, e-mail, etiqueta, cidade, etapa), trechos das conversas, funis e
  etapas, pessoas da equipe e páginas, além de ações rápidas (modo escuro,
  convidar pessoa, funis). Filtro por tipo, destaque do termo, setas + Enter,
  buscas recentes guardadas neste navegador.
- **Trilha e seções ficam sempre no header, nunca dentro do painel.** Módulos
  com `tabs` mostram "Módulo ▾" na trilha: um menu para trocar de seção.
- **Título vindo de dados:** páginas de detalhe usam `<PageTitle>` (ex.: nome
  do lead); ele vai para o centro do header e para o fim da trilha.
- **Ações da página:** cada página coloca seus botões no header com
  `<HeaderActions>`; eles aparecem depois de um divisor e somem ao sair da página.

  ```tsx
  <HeaderActions>
    <Button variant="secondary" href="/pedidos/exportar">Exportar</Button>
    <Button icon={<PlusIcon />} href="/pedidos/novo">Novo pedido</Button>
  </HeaderActions>
  ```

- **Sidebar** (sem fundo): módulos (centralizados na altura), configurações e
  o perfil do usuário — que abre o menu da conta (`navigation.account` e
  `navigation.support`) logo acima dele. Recolhida, vira um trilho de
  círculos (brancos nos módulos, contorno no rodapé, ativo em verde);
  expandida, uma lista discreta com o ativo como "cartão" branco.
  O estado expandido/recolhido fica em `SidebarContext` (compartilhado com o
  botão do header) e é lembrado via cookie (`mk_sidebar`), lido no servidor
  para a tela não "piscar" ao carregar.
- **Fundo**: degradê suave `theme.colors.background.gradient` (linho → sálvia).
- **Painel**: única superfície com fundo (branco com um sopro de verde) e único
  lugar com scroll — header e sidebar ficam sempre visíveis. O `<main>` é uma
  coluna flex: telas "cheias", como o kanban, usam `flex: 1` para ocupar a
  altura toda. Telas de ponta a ponta marcam o elemento raiz com `data-flush`
  e o painel fica sem padding (ex.: a oportunidade).

### Navegação, animações e carregamento

- **Menu lateral** recolhe sozinho ao abrir outra página (`SidebarContext`).
- **Transição de página:** `template.tsx` em `(app)`, `leads` e `configuracoes`
  (remonta a cada navegação) com `PageTransition`; listas, cards, colunas e
  seções entram em cascata com `staggerChildren` (`src/styles/animations.ts`).
  "Reduzir animações" desliga tudo.
- **Carregamento:** barra fina no topo durante a navegação
  (`NavigationProgress`; para `router.push` use `startNavigationProgress()`),
  esqueleto em `(app)/loading.tsx` (só aparece se demorar), brilho nas imagens do
  chat e botões com `loading` nas ações que vão depender da API (`usePending`).
- **Visualizações:** `ViewSwitch` + `useViewMode` (lembrado por tela): Leads em
  kanban ou tabela; Clientes, Usuários e Integrações em tabela ou cards.
- **Notificações:** sino do header (`features/notifications`): caixa de entrada,
  geral e arquivadas, marcar todas como lidas, assumir/ignorar lead novo.

### Celular (até 768px)

- **Sem sidebar e sem painel central:** tudo no fundo padrão; só os cartões
  de dentro têm fundo.
- **Nenhuma tela tem header no celular:** cada página começa no próprio topo
  (abaixo da área do relógio). Os botões que as páginas põem no header
  (`HeaderActions`) vão para o `MobileHeaderSlot` da página, como
  quadradinhos só com o ícone: ao lado do "Olá, Milena!" no Painel, do título
  nas Configurações e no fim da barra em Clientes. Página sem slot não mostra
  esses botões no celular (ex.: o funil de Leads, que já está na barra).
- **Saídas suaves** (`usePresence` em `src/lib/presence.ts`): dropdowns,
  janelas, busca geral e menu ficam na tela o tempo da saída (`data-closing`):
  no celular a folha desce e o fundo escurecido some junto; no desktop somem
  com um fade curto. A janela guarda o último conteúdo enquanto sai.
- **Dock solto por cima de tudo:** o conteúdo não reserva faixa para ele.
  Telas que rolam ganham só uma folga no fim; telas que ocupam a altura toda
  (`data-fill`, como o kanban, ou `data-flush`) vão até a borda de baixo, e só
  as listas que rolam dentro delas têm a folga do dock no final.
- **Dock flutuante** (`components/layout/MobileNav`), sempre visível: Buscar
  (busca geral) e o menu. Com algo aberto, o botão daquilo vira ✕.
- **Tudo abre de baixo:** dropdowns (`Popover`), janelas (`Dialog`), a busca
  geral e o menu viram folhas que sobem de baixo, com alça e fundo escurecido
  (`src/styles/sheet.ts`). O que está aberto fica registrado em
  `src/lib/sheets.ts` (`useSheet`), e é assim que o dock sabe o que fechar.
  A lista de cada folha vai até embaixo e só o fim dela passa por baixo do dock
  (nunca uma faixa reservada); em dropdowns, a lista marcada com
  `data-sheet-scroll` é a que ganha essa folga.
- **Arrastar para fechar** (`src/lib/sheetDrag.ts`, padrão do web-specular):
  puxar a folha para baixo (na alça, em qualquer parte que não rola ou numa
  lista já no topo) fecha passando de 1/3 da altura (máx. 120px) ou com um
  peteleco; senão volta. Com o dedo na folha a página de trás nunca se mexe, e
  a folha nunca corre para o lado (listas com `overflow-x: hidden`, `touch-action: pan-y`).
  Dropdowns ganham um fundo escurecido de verdade (`SheetBackdrop` no dock):
  tocar nele só fecha, sem arrastar nem clicar a página de trás. Campos das
  folhas não abrem o teclado sozinhos no toque (só a busca geral).
- **Dock com largura dinâmica:** mede o conteúdo e anima a largura
  ([Buscar | ☰] → [✕ | ☰]), com divisor entre todas as opções (o paginador
  ‹ 2/5 › conta como uma só). Nas trocas, o conteúdo
  fica centrado (corta igual dos dois lados), os botões que continuam deslizam
  até o novo lugar (FLIP pelo `data-dock-key`) e os novos entram crescendo e
  saindo do desfoque (`DOCK_EASE` em `src/lib/dock.ts`). Telas com páginas
  registram um paginador (`useDockPagerRegistration`) e o dock vira
  [🔍 | ‹ 2/5 › | ☰].
- **Sem zoom nos campos:** o viewport tem `maximum-scale=1` (o iOS não aproxima
  ao tocar num campo; o pinça continua funcionando no iOS).
- **Kanban de Leads no celular** (padrão do projeto web-specular): uma etapa
  por vez, com a coluna parando no centro (`scroll-snap`) e as vizinhas
  espiando pelas bordas; o paginador do dock acompanha a etapa à vista e leva
  à anterior ou à próxima. Arrastar fica só no computador; no celular o lead
  muda de etapa pelo "Mover para" do card (que abre de baixo). O cabeçalho da
  coluna mostra o total dos orçamentos, a etapa vazia mostra "Nada nesta
  etapa" e o telefone do card liga direto. `useIsMobile`
  (`src/lib/useMediaQuery.ts`) só decide comportamento; o visual fica no CSS.
- **Leads com a barra do topo** (padrão da tela de tarefas do web-specular),
  nas duas visões: busca, filtros (origem, responsável, não lidas, sem
  contato há 7 dias), seletor Kanban/Tabela e "Novo lead" (só o "+" no
  celular). O funil fica no header. Busca sem resultado troca o quadro por
  "Nenhum lead encontrado" com "Limpar busca e filtros". O total da etapa fica
  no cabeçalho da coluna, à direita do título (sem ordenação por etapa: mais
  recentes primeiro). No celular o funil vira um botão compacto (ícone do funil + seta) logo depois dos filtros.
- **Conversas no padrão WhatsApp:** no celular, sem conversa aberta aparece só a lista (barra no topo);
  tocar abre a conversa em tela cheia, que chega da direita com fade (voltar
  traz a lista suave), com voltar, contato, status e o menu ⋮ (abrir a
  oportunidade). O campo de mensagem fica logo acima do dock.
- **Notificações no celular:** folha com as abas numa linha só ("Entrada",
  Geral, Arquivadas), textos que não quebram (hora e arquivo com reticências) e
  a lista indo até embaixo, por baixo do dock.
- **Fundo branco no celular:** a página (e a cor da barra do navegador, que
  segue a aparência escolhida no app) é branca, igual ao chat; os cartões se
  destacam pela borda. O degradê esverdeado fica só no desktop.
- **Ações da tela no dock** (padrão do web-specular, `useDockActionsRegistration`
  em `src/lib/dock.ts`): a tela aberta coloca os botões dela no dock, com a
  principal em escuro, mais o ✕ da tela e o ☰. Quem registrou por último fica
  por cima; o "fechar" de uma folha aberta continua tendo prioridade.
  - **Chat:** no celular o compositor vira só a caixa de texto (16px, uma
    linha que cresce até 4, a 8px do dock) e as opções vão para o dock: anexar,
    respostas rápidas e áudio, que vira enviar quando há texto. Gravando, o
    dock mostra descartar e enviar o áudio.
  - **Oportunidade:** no celular mostra um painel por vez, com o seletor
    "Informações | Conversa" no topo, do tamanho do texto (o fundo branco desliza entre as opções e o painel entra suave). Informações: cartão
    do cliente (com as ações) emendado ao funil/etapa e as abas ficam parados;
    só o conteúdo da aba rola, com cada bloco em cartão; o dock traz "Avançar"
    para a próxima etapa. Conversa: a conversa sobe como folha branca
    abaixo do seletor, com balões mais largos; o dock traz as opções do chat.
    O sistema não faz ligações: nenhum telefone vira link de ligar.
- **Sem tabela no celular:** `useViewMode(chave, inicial, permitidas, visãoDoCelular)`
  devolve sempre a visão do celular (Leads = kanban, Clientes/Usuários/Integrações
  = cartões) e o `ViewSwitch` some no celular, sem mexer na escolha do desktop.
- **Rolagem lateral:** as pílulas da busca geral e os filtros ativos das
  páginas ficam numa linha que rola para o lado, sem barra.
- **Menu:** começa direto na busca (sem a marca no topo) e fica um pouco mais
  baixo que a tela (folga no topo); busca no menu (Enter ou "Buscar em todo o sistema" abre a
  busca geral), módulos com os bloqueados apagados, Configurações com as
  seções num subpainel, perfil com o sino, conta, Tema claro/escuro e sair.

### Módulos em produção (bloqueados)

As telas são liberadas aos poucos (venda por mês). Um módulo com `soon` em
`src/config/navigation.ts` aparece no menu com o selo **Produção** (com a
sidebar recolhida, um cadeado no círculo), sempre **apagado** (`data-locked`,
regra global que também vale no menu da conta e na busca geral), e todas as
rotas dele, inclusive as
seções e o endereço direto, mostram a tela de bloqueio (`LockedModule`),
com o que o módulo vai trazer e o atalho para a primeira tela liberada.

Hoje em produção: Agenda, Orçamentos, Pedidos, Catálogo, Produção,
Estoque, Financeiro, Relatórios, Novidades e Central de ajuda. **Para
liberar:** crie a tela (ex.: `app/(app)/agenda/page.tsx`) e apague o `soon`
do módulo. A logo leva para a primeira tela liberada (`firstAvailableHref`).

### Painel (`/`)

Resumo do ateliê **no mês** numa grade de cartões brancos
(`src/features/dashboard/`). Os números saem do estado atual (leads, fichas e
conversas) e são calculados no navegador (`metrics.ts`), porque dependem do
fuso de quem vê; até lá aparece o esqueleto da mesma grade. As duas colunas
fecham na mesma altura (a última peça de cada uma estica).

- **Topo:** saudação e, quando há, um aviso de clientes esperando resposta.
  No header: Exportar (CSV do mês) e Novo lead.
- **Cartão principal:** valor que entrou no funil no mês (comparado com o
  mesmo trecho do mês anterior) e a faixa ritmo por dia, em negociação,
  projeção do mês e dias do mês.
- **Indicadores** (4×2, cada um com "?" explicando): leads novos, ticket
  médio (e os dois canais de ticket mais alto), conversão, tempo de resposta,
  conversas em aberto, orçamentos enviados, fechados no mês e leads sem
  contato há 7 dias, com barra em blocos na cor do indicador.
- **Funil de vendas:** uma barra com a divisão do valor entre as etapas e a
  lista enxuta (leads, valor e parte de cada etapa), com troca de funil.
- **Vendas por origem:** meio-círculo em tracinhos (Recharts) com o total no
  meio e uma coluna por canal (parte, valor, leads e ticket). Três canais com
  cor própria e o resto em "Outras"; cores fixas por canal em `palette.ts`,
  validadas para daltonismo.
- **Coluna lateral:** Atenção hoje (quem espera resposta e quem esfriou) e
  últimas atualizações (Hoje / Ontem / 7 dias), que ocupa o resto da altura e
  rola por dentro.

### Leads (`/leads`)

Leads organizados em **funis** (ex.: Noivas, Festas e madrinhas, Debutantes),
cada um com as próprias etapas, em `src/features/leads/`:

- `funnels.ts` — funis (ícone, cor e etapas; **exemplos** até existir o
  cadastro de funis). Importe direto nos Client Components: o ícone é um
  componente e não pode ir do servidor ao cliente como prop.
- `components/FunnelSelect` — seletor no header; o funil fica na URL
  (`/leads?funil=noivas`), então o link é compartilhável.
- `components/LeadCard` — foto/avatar, nome, telefone, orçamento e etiquetas.
- `components/LeadsBoard` — estado, total por etapa no cabeçalho, mover lead
  arrastando **ou** pelo ⇕ do card (acessível por teclado; o leitor de tela
  anuncia a mudança). Colunas com largura fixa (296px); o quadro rola na
  horizontal quando não cabe.
- `components/StageStep` — no "Mover para", as etapas aparecem como linha
  do tempo: passadas preenchidas, atual com anel e selo "Atual", próximas
  vazadas.
- `store.tsx` — estado compartilhado entre o quadro, a oportunidade e as
  conversas (fica em `app/(app)/layout.tsx`, então sobrevive à navegação):
  leads, ficha, mensagens, não lidas, status da conversa e atividade
  (entrada, responsável, status, etapa e arquivos entram em `history`).
- `components/LeadDetail` — oportunidade (`/leads/[id]`), de ponta a ponta no
  painel: à esquerda a ficha (voltar, responsável, ações e cliente numa faixa
  fixa no topo, com as abas grudando logo abaixo; e-mail e cópias ficam no
  menu do chevron duplo, que confirma com check; bloco de funil e etapa;
  abas Detalhes, Campanha com UTMs e Arquivos, com **todos os campos
  editáveis no clique** e máscaras de R$, telefone e @); à direita o chat,
  separado por uma linha suave, que no futuro conversa com o WhatsApp.
- `components/StagePipeline` — funil e etapa atual (dropdowns) sobre a barra
  de etapas clicável (cada trecho leva para a etapa, com prévia no hover).
- `options.ts` — opções dos campos (tipo de evento, origem com ícone e tom,
  etiquetas sugeridas) e leitura de telefone/valor. **Exemplos.**
- `quick-replies.ts` — respostas rápidas com categoria, ícone e tom (`{nome}`
  vira o primeiro nome).
- `mock.ts` / `mock-details.ts` — **dados fictícios** (e-mails em example.com)
  até a API existir.

Tons pastel ficam em `theme.tones` (`bg` coluna, `soft` destaque, `fg` texto),
todos com contraste AA.

### Clientes (`/clientes`)

Todos os leads do sistema em tabela (`src/features/clients/`), de ponta a
ponta no painel e com o mesmo estado de Leads e Conversas:

- Linhas finas (40px) com divisórias quase invisíveis (horizontais e entre as
  colunas); cabeçalho fixo e
  ordenável (clique alterna crescente/decrescente, `aria-sort`); "Cliente
  (N)" com a contagem.
- Colunas: cliente, telefone, evento (tipo e data), funil e etapa, orçamento,
  responsável, origem, etiquetas, último contato e criado ("há 3 dias").
  Seleção e cliente ficam fixos ao rolar para o lado.
- `FilterBar`: busca (nome, telefone, e-mail, etiqueta; `/` foca) e filtros
  de funil, etapa (com um funil em foco), origem, responsável, data do
  evento, criação, mensagens não lidas e sem contato há 7 dias; seleção por
  linha ou de todos (`Checkbox`, com estado parcial).
- "Exportar" no header gera um CSV no próprio navegador (selecionados ou o
  que está na tela).
- Clicar na linha/card abre a **ficha em janela** (`LeadModal`): resumo com
  etapa e responsável editáveis, abas Detalhes/Campanha/Arquivos/Conversa
  (resumo e abas ficam fixos, só o conteúdo rola) e ações flutuando no
  centro (copiar telefone, ver conversa, abrir oportunidade). Na tabela de
  Leads a linha continua abrindo a oportunidade.

### Configurações (`/configuracoes`)

Em `src/features/settings/`, com as seções à esquerda (Ateliê, Minha conta,
Conexões) e o conteúdo em largura total. O estado fica em `store.tsx`
(`WorkspaceProvider`, no layout do app), então as mudanças valem na hora no
resto do sistema:

- **Usuários** — números da equipe, tabela com permissão editável (Admin,
  Gestão, Equipe), função editável no clique, convite e remoção com
  confirmação. Os responsáveis dos leads vêm daqui (`useTeam()`).
- **Funis e etapas** — funis padrão Vendas, Clientes e Remarketing; nome,
  cor e ícone (28 ícones em grupos), ordem, etapas arrastáveis (reordenam ao
  vivo; setas no puxador pelo teclado), cor e nome de cada etapa. Não deixa
  excluir etapa ou funil com leads. Todo o app lê `useFunnels()`.
- **Preferências** — contato do ateliê, fuso e horário, conversas ("Enter
  envia" já vale no chat), leads parados e notificações; salvar explícito.
- **Perfil** — foto, dados (refletem no menu lateral), senha, verificação em
  duas etapas e sessões.
- **Acessibilidade** — aparência (claro, **escuro** ou como no sistema),
  tamanho do texto, espaçamento de leitura, alto contraste, sublinhar links,
  animações e foco sempre visível; atalhos do teclado. Guardado num cookie
  deste navegador (`mk_a11y`; `mk_scheme` guarda o tema do sistema), lido no
  servidor para a primeira tela já sair no tema certo. Temas em
  `buildTheme({ dark, highContrast })`; cores sempre por token.
- **Integrações** e **API e webhooks** — conexões por canal, chaves de API
  (a chave completa aparece uma vez) e webhooks por evento. **Simulados** até
  existir o back-end.

Componentes novos: `TextField` (com máscara), `Switch`, `Checkbox`, `Dialog`
(modal com foco preso; `height` fixa, `scroll="content"` para só uma parte
rolar e `floatingFooter` para as ações flutuarem no centro com degradê) e
`DatePicker`. Opções de `Select` aceitam
`description` (explicação em segunda linha, sem cortar o texto).

### Conversas (`/conversas`)

Caixa de entrada de todas as conversas dos leads (futuro WhatsApp), em
`src/features/conversations/`, de ponta a ponta no painel:

- **Lista** (esquerda): a barra do padrão das páginas (`FilterBar`): busca
  por nome, telefone ou mensagem, o botão de filtros (Andamento com contagem,
  Situação "Só as minhas" / "Só não lidas" e Ordem) e o botão do funil (Todos
  ou um funil, com contagem). Filtros ativos viram chips. Cada item mostra avatar,
  nome, hora como no WhatsApp (hoje, "Ontem", dia da semana, data), prévia
  da última mensagem (✓✓, foto, áudio, arquivo, nota), não lidas e status.
- **Conversa** (direita): o mesmo chat da oportunidade (`LeadChat`), com
  responsável, status e "Abrir oportunidade" no cabeçalho e a **Atividade**
  do lead no topo (últimos eventos, "Ver tudo").
- `status.tsx` — Aberta, Em andamento e Resolvida (ícone, tom e descrição).
- A conversa aberta fica na URL (`/conversas?c=lead-003`); abrir marca como
  lida, e o menu lateral mostra um ponto em Conversas quando há não lidas.

### Menu

Tudo sai de `src/config/navigation.ts`: a sidebar lista os módulos, a trilha
do header oferece as `tabs` do módulo atual e o perfil lista as rotas da
conta. Para criar uma
tela, adicione o item no config e crie a rota em `src/app/(app)/`. Enquanto a
tela não existe, `src/app/(app)/[...slug]` mostra um placeholder (rotas fora do
menu dão 404).

## Estilização com Emotion

Componentes do Emotion dependem de contexto React, então só rodam em Client
Components. Os componentes em `src/components` já são client; uma página
(Server Component) só precisa importá-los.

Layout **desktop-first**: o estilo base é o de desktop e `theme.media` aplica
ajustes para telas menores (`${theme.media.md}` vale até 768px).

```ts
import styled from "@emotion/styled";

export const Card = styled.div`
  padding: ${({ theme }) => theme.spacing(4)};
  border-radius: ${({ theme }) => theme.radii.xl};
  background: ${({ theme }) => theme.colors.background.elevated};

  ${({ theme }) => theme.media.md} {
    padding: ${({ theme }) => theme.spacing(3)};
  }
`;
```

## Ícones (Phosphor)

Pacote `@phosphor-icons/react`. Use sempre os nomes com sufixo `Icon`.

```tsx
// Client Component — herda os padrões do IconContext (src/providers)
import { UserIcon } from "@phosphor-icons/react";

// Server Component ou arquivos compartilhados (ex.: config) — use o /ssr
import { UserIcon } from "@phosphor-icons/react/ssr";

<UserIcon size={20} weight="bold" />
```

## Tipografia

| Token                 | Fonte    | Uso                                                        |
| --------------------- | -------- | ---------------------------------------------------------- |
| `theme.fonts.body`    | Inter    | Base de todo o sistema (textos, interface, títulos comuns) |
| `theme.fonts.display` | Scarlett | Títulos de destaque (ex.: nome da página no header)        |

Fontes carregadas em `src/styles/fonts` via `next/font` (servidas do próprio
domínio, sem requisição ao Google).

> **Atenção:** a Scarlett **não tem acentos nem cedilha**. Texto com a fonte
> da marca deve passar por `<DisplayText>`: as letras continuam na Scarlett e
> os acentos (´ ` ^ ~ ¨ ¸) são desenhados por cima como vetor, a partir da
> linha de base. Os desenhos dos acentos vêm da fonte Sacramento (SIL OFL 1.1,
> licença em `src/components/ui/DisplayText/OFL-Sacramento.txt`).
>
> ```tsx
> <Title>
>   <DisplayText>Produção</DisplayText>
> </Title>
> ```
>
> Limitações: acentos em maiúsculas ficam acima da linha e podem ser cortados
> em contêineres com `overflow: hidden`; o "í" mantém o pingo do "i".
