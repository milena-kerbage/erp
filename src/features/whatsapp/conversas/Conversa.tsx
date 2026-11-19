"use client";

// A conversa, no desenho do ERP da Le Ange (inbox-screen.tsx): o cabeçalho com o nome, a janela de 24 horas, quem responde,
// a situação, a estrela e as ações; a etapa da oportunidade presa logo abaixo; as mensagens por dia sobre o fundo
// pontilhado; e o campo preso no pé, por cima delas.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowBendUpLeftIcon, ArrowDownIcon, ArrowLeftIcon, ArrowSquareOutIcon, CaretDownIcon, ChatsCircleIcon, CheckCircleIcon, CopyIcon, DotsThreeIcon, DownloadSimpleIcon, ExportIcon, FolderSimplePlusIcon,
  HandIcon, LockSimpleIcon, LockSimpleOpenIcon, PushPinIcon, PushPinSlashIcon, SidebarSimpleIcon, StarIcon, TrashIcon, UserIcon, XIcon,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog } from "@/components/ui/Dialog";
import { Lightbox } from "@/components/ui/Lightbox";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/Menu";
import { Tooltip } from "@/components/ui/Tooltip";
import { StagePipeline } from "@/features/leads/components/StagePipeline";
import type { Lead } from "@/features/leads/types";
import type { Funnel } from "@/features/leads/funnels";
import type { Member } from "@/features/settings/types";
import type { WhatsAppConversation, WhatsAppMessage, WhatsAppSituacao } from "../types";
import { Bolha, interna, REACOES_RAPIDAS, urlDaMidia } from "./Bolha";
import { Compositor } from "./Compositor";
import { AcoesMensagem, ColunaConversa } from "./estilos";
import { janelaAberta, mesmoDia, nomeDaConversa, rotuloDoDia, telefoneFormatado, textoDaMensagem } from "./formato";
import { ROTULO_SITUACAO } from "./Lista";
import { ModeloDialog } from "./ModeloDialog";
import type { Fio, useConversas } from "./useConversas";

type Estado = ReturnType<typeof useConversas>;
const BLOCO_MS = 5 * 60_000, ALBUM_MS = 2 * 60_000;
const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;
/** Hora de fim da janela; "amanhã 09:30" quando passa da meia-noite. */
function horaJanela(iso: string) {
  const fim = new Date(iso), hora = fim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return fim.toDateString() === new Date().toDateString() ? hora : `amanhã às ${hora}`;
}
type Item = { m: WhatsAppMessage; novoDia: boolean; primeira: boolean; album?: WhatsAppMessage[]; parada?: boolean };

export function Conversa({ estado, phone, conversa, fio, equipe, eu, lead, funil, aoMoverEtapa, painel, aoAlternarPainel, listaFechada, aoAlternarLista }: {
  estado: Estado; phone: string; conversa: WhatsAppConversation | null; fio?: Fio; equipe: readonly Member[]; eu: Member;
  /** A oportunidade do CRM com este telefone, quando existe: a etapa dela fica presa abaixo do cabeçalho. */
  lead?: Lead; funil?: Funnel; aoMoverEtapa: (etapa: string) => void;
  painel: boolean; aoAlternarPainel: () => void; listaFechada: boolean; aoAlternarLista: () => void;
}) {
  const { setSelecionado, organizar, enviarTexto, enviarNota, enviarArquivo, descartarFalha, reenviarFalha, reagir, carregarAntigas, recarregarFio, salvarNaFicha, setErro } = estado;
  const mensagens = useMemo(() => fio?.messages ?? [], [fio?.messages]);
  const [respondendo, setRespondendo] = useState<WhatsAppMessage | null>(null);
  const [acoes, setAcoes] = useState<WhatsAppMessage | null>(null);
  const [aviso, setAviso] = useState("");
  const [foto, setFoto] = useState<number | null>(null);
  const [modelo, setModelo] = useState(false);
  const [altura, setAltura] = useState(128);
  const [noFim, setNoFim] = useState(true);
  const [novas, setNovas] = useState(0);
  const area = useRef<HTMLDivElement>(null);
  const ancora = useRef<{ altura: number; topo: number } | null>(null);
  const ultimaId = useRef<string | undefined>(undefined);
  const nome = conversa ? nomeDaConversa(conversa) : telefoneFormatado(phone);
  const aberta = janelaAberta(conversa);
  const situacao: WhatsAppSituacao = conversa?.status ?? "aberta";
  const dono = conversa?.assignee ? equipe.find((membro) => membro.id === conversa.assignee) : undefined;
  const nomeDe = useCallback((id?: string) => (id ? equipe.find((membro) => membro.id === id)?.name : undefined), [equipe]);

  // Troca de conversa: abre no fim e limpa a resposta.
  useEffect(() => { setRespondendo(null); setNovas(0); setNoFim(true); ultimaId.current = undefined; }, [phone]);
  useLayoutEffect(() => {
    const el = area.current;
    if (!el || !mensagens.length) return;
    // Mensagens antigas entraram no topo: mantém o que estava na tela no mesmo lugar.
    if (ancora.current) { el.scrollTop = el.scrollHeight - ancora.current.altura + ancora.current.topo; ancora.current = null; return; }
    const ultima = mensagens[mensagens.length - 1];
    if (ultimaId.current === undefined) { el.scrollTop = el.scrollHeight; ultimaId.current = ultima.id; return; }
    if (ultima.id !== ultimaId.current) {
      ultimaId.current = ultima.id;
      if (noFim || ultima.direction === "outbound") el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      else if (ultima.direction === "inbound") setNovas((n) => n + 1);
    }
  }, [mensagens, noFim]);
  // O campo cresceu (resposta citada, anexos, gravação): quem estava no fim continua no fim.
  useLayoutEffect(() => { if (noFim && area.current) area.current.scrollTop = area.current.scrollHeight; }, [altura]); // eslint-disable-line react-hooks/exhaustive-deps

  const aoRolar = useCallback(() => {
    const el = area.current;
    if (!el) return;
    const fim = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setNoFim(fim);
    if (fim) setNovas(0);
    if (el.scrollTop < 160 && fio?.nextBefore && !fio.carregandoAntigas) {
      ancora.current = { altura: el.scrollHeight, topo: el.scrollTop };
      void carregarAntigas(phone).then((ok) => { if (!ok) ancora.current = null; });
    }
  }, [fio?.nextBefore, fio?.carregandoAntigas, carregarAntigas, phone]);

  const irParaFim = () => { area.current?.scrollTo({ top: area.current.scrollHeight, behavior: "smooth" }); setNovas(0); };
  const irPara = useCallback((id: string) => {
    const alvo = document.getElementById(`m-${id}`);
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    alvo.animate([{ background: "rgba(59,130,196,.18)" }, { background: "transparent" }], { duration: 1400, easing: "ease-out" });
  }, []);

  // Esc fecha a conversa (sem janela, menu, painel do campo ou resposta abertos).
  // O que estava aberto é visto na descida do evento: na subida o menu que tratou o Esc já se fechou.
  useEffect(() => {
    let sobreposto = false;
    const antes = (e: KeyboardEvent) => { if (e.key === "Escape") sobreposto = Boolean(document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]')); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented && !sobreposto && !acoes && foto === null && !modelo && !respondendo) setSelecionado(undefined); };
    window.addEventListener("keydown", antes, true);
    window.addEventListener("keydown", tecla);
    return () => { window.removeEventListener("keydown", antes, true); window.removeEventListener("keydown", tecla); };
  }, [acoes, foto, modelo, respondendo, setSelecionado]);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(""), 2600); return () => window.clearTimeout(t); }, [aviso]);

  const fotos = useMemo(() => mensagens.filter((m) => m.type === "image" && (m.hasMedia || m.local?.previewUrl)), [mensagens]);
  const abrirFoto = useCallback((m: WhatsAppMessage) => { const i = fotos.findIndex((f) => f.id === m.id); if (i >= 0) setFoto(i); }, [fotos]);

  // Dia + blocos (mesmo lado e autor, até 5 min entre uma e outra): só a primeira do bloco tem rabinho e nome. As fotos
  // seguidas do mesmo lado viram um álbum; a enviada pelo ERP que ficou sem entrega depois de o cliente escrever é avisada.
  const dias = useMemo(() => {
    const ultimaRecebida = mensagens.reduce((maior, m) => (m.direction === "inbound" ? Math.max(maior, Date.parse(m.createdAt)) : maior), 0);
    const itens: Item[] = [];
    mensagens.forEach((m, i) => {
      const anterior = mensagens[i - 1];
      const novoDia = !anterior || !mesmoDia(anterior.createdAt, m.createdAt);
      const primeira = novoDia || anterior.type === "system" || anterior.direction !== m.direction || (anterior.type === "note") !== (m.type === "note") || anterior.author !== m.author || Date.parse(m.createdAt) - Date.parse(anterior.createdAt) > BLOCO_MS;
      const parada = m.direction === "outbound" && !interna(m) && m.status === "sent" && Boolean(m.author) && ultimaRecebida - Date.parse(m.createdAt) > 60_000;
      const soFoto = (x: WhatsAppMessage) => x.type === "image" && Boolean(x.hasMedia || x.local?.previewUrl) && !x.replyTo && !x.reactions?.length && x.status !== "failed";
      const ultimo = itens[itens.length - 1];
      // Entra no álbum da anterior quando as duas são só foto (a anterior sem legenda), do mesmo lado, em até 2 minutos.
      if (ultimo && !novoDia && soFoto(m) && soFoto(ultimo.m) && ultimo.m.direction === m.direction && /^\[image\]$|^$/.test(ultimo.m.text.trim()) && Date.parse(m.createdAt) - Date.parse(ultimo.m.createdAt) < ALBUM_MS) {
        itens[itens.length - 1] = { ...ultimo, m, album: [...(ultimo.album ?? [ultimo.m]), m] };
        return;
      }
      itens.push({ m, novoDia, primeira, parada });
    });
    const grupos: Array<{ chave: string; itens: Item[] }> = [];
    for (const item of itens) {
      if (item.novoDia || !grupos.length) grupos.push({ chave: `${item.m.createdAt.slice(0, 10)}-${(item.album?.[0] ?? item.m).id}`, itens: [] });
      grupos[grupos.length - 1].itens.push(item);
    }
    return grupos;
  }, [mensagens]);

  const responder = useCallback((m: WhatsAppMessage) => setRespondendo(m), []);
  const reagirA = useCallback((m: WhatsAppMessage, emoji: string) => void reagir(phone, m, emoji), [reagir, phone]);
  const descartar = useCallback((m: WhatsAppMessage) => void descartarFalha(phone, m.id), [descartarFalha, phone]);
  const reenviar = useCallback((m: WhatsAppMessage) => { setNoFim(true); void reenviarFalha(phone, m); }, [reenviarFalha, phone]);
  const salvar = useCallback(async (m: WhatsAppMessage) => {
    if (!lead) return;
    setAviso("Salvando na ficha…");
    setAviso((await salvarNaFicha(m.id, lead.id)) ? "Salvo nos arquivos da oportunidade" : "");
  }, [lead, salvarNaFicha]);
  const copiar = async (m: WhatsAppMessage) => { try { await navigator.clipboard.writeText(textoDaMensagem(m)); setAviso("Texto copiado"); } catch { setErro("Não foi possível copiar a mensagem."); } };
  const mudarSituacao = (nova: WhatsAppSituacao) => { void organizar(phone, { situacao: nova }); if (nova === "resolvida") setSelecionado(undefined); };
  const dicaJanela = conversa?.optedOut ? "Pediu para não receber mensagens" : aberta && conversa?.serviceWindowExpiresAt ? `Janela de 24h aberta até ${horaJanela(conversa.serviceWindowExpiresAt)}` : "Janela de 24h fechada: só modelos aprovados";
  const acoesMidia = acoes && acoes.hasMedia && !acoes.id.startsWith("temp-");

  return (
    <ColunaConversa data-pane="conversa" aria-label={`Conversa com ${nome}`} style={{ "--composer-h": `${altura}px` } as CSSProperties}>
      <header className="threadHead">
        <Tooltip label={listaFechada ? "Mostrar a lista de conversas" : "Recolher a lista de conversas"} side="bottom">
          <button type="button" className="iconGhost listToggle" aria-label={listaFechada ? "Mostrar a lista de conversas" : "Recolher a lista de conversas"} aria-pressed={listaFechada} onClick={aoAlternarLista}><SidebarSimpleIcon mirrored /></button>
        </Tooltip>
        <span className="back"><button type="button" className="iconGhost" data-soft="" aria-label="Voltar para a lista" onClick={() => setSelecionado(undefined)}><ArrowLeftIcon /></button></span>
        <Avatar name={nome} seed={phone} size="sm" shape="circle" />
        <button type="button" className="threadName" onClick={aoAlternarPainel} aria-label={`${painel ? "Esconder" : "Mostrar"} a ficha de ${nome}`}>
          <span className="threadTitle">
            <strong>{nome}</strong>
            <Tooltip label={dicaJanela} side="bottom"><span className="windowBadge" data-open={(aberta && !conversa?.optedOut) || undefined} role="img" aria-label={dicaJanela}>{aberta && !conversa?.optedOut ? <LockSimpleOpenIcon weight="bold" /> : <LockSimpleIcon weight="bold" />}</span></Tooltip>
          </span>
          <span className="threadMeta">{nome !== telefoneFormatado(phone) ? telefoneFormatado(phone) : dicaJanela}</span>
        </button>
        {conversa && (
          <div className="threadActions">
            <Menu label="Responsável pela conversa" align="end" width="15rem" trigger={(props) => (
              <button {...props} type="button" className="chipButton hideNarrow" title={dono ? `Responsável: ${dono.name}` : "Sem responsável"} aria-label={dono ? `Responsável: ${dono.name}. Trocar` : "Sem responsável. Escolher"}>
                {dono ? <Avatar name={dono.name} seed={dono.seed} src={dono.avatarUrl} size="xs" shape="circle" /> : <span className="noAssignee"><UserIcon /></span>}
                <span className="chipLabel">{dono ? primeiroNome(dono.name) : "Responsável"}</span>
                <CaretDownIcon aria-hidden />
              </button>
            )}>
              <MenuLabel>Quem responde</MenuLabel>
              {conversa.assignee !== eu.id && <MenuItem icon={HandIcon} onSelect={() => void organizar(phone, { responsavel: eu.id, responsavelNome: eu.name })}>Assumir a conversa</MenuItem>}
              {equipe.map((membro) => <MenuItem key={membro.id} selected={conversa.assignee === membro.id} leading={<Avatar name={membro.name} seed={membro.seed} src={membro.avatarUrl} size="xs" shape="circle" />} meta={membro.role || undefined} onSelect={() => void organizar(phone, { responsavel: membro.id, responsavelNome: membro.name })}>{membro.name}</MenuItem>)}
              <MenuSeparator />
              <MenuItem muted selected={!conversa.assignee} onSelect={() => void organizar(phone, { responsavel: null })}>Sem responsável</MenuItem>
            </Menu>
            <Menu label="Situação" align="end" width="13rem" trigger={(props) => (
              <button {...props} type="button" className="statusChip" data-status={situacao} aria-label={`Situação: ${ROTULO_SITUACAO[situacao]}. Mudar`}><span className="chipLabel">{ROTULO_SITUACAO[situacao]}</span><CaretDownIcon aria-hidden /></button>
            )}>
              {(["aberta", "aguardando", "resolvida"] as const).map((valor) => <MenuItem key={valor} selected={situacao === valor} meta={valor === "aguardando" ? "o cliente" : undefined} onSelect={() => mudarSituacao(valor)}>{ROTULO_SITUACAO[valor]}</MenuItem>)}
            </Menu>
            <Tooltip label={conversa.starred ? "Tirar das favoritas" : "Favoritar a conversa"} side="bottom">
              <button type="button" className="iconGhost starToggle hideNarrow" aria-label={conversa.starred ? "Tirar das favoritas" : "Favoritar a conversa"} aria-pressed={Boolean(conversa.starred)} onClick={() => void organizar(phone, { favoritar: !conversa.starred })}><StarIcon weight={conversa.starred ? "fill" : "regular"} /></button>
            </Tooltip>
            <Menu label="Mais ações" align="end" width="16rem" trigger={(props) => <button {...props} type="button" className="iconGhost" aria-label="Mais ações da conversa"><DotsThreeIcon weight="bold" /></button>}>
              <MenuItem icon={conversa.pinned ? PushPinSlashIcon : PushPinIcon} onSelect={() => void organizar(phone, { fixar: !conversa.pinned })}>{conversa.pinned ? "Desafixar" : "Fixar no topo"}</MenuItem>
              <MenuItem icon={StarIcon} onSelect={() => void organizar(phone, { favoritar: !conversa.starred })}>{conversa.starred ? "Tirar das favoritas" : "Favoritar"}</MenuItem>
              <MenuItem icon={ChatsCircleIcon} onSelect={() => void organizar(phone, { naoLida: true })}>Marcar como não lida</MenuItem>
              {situacao === "resolvida"
                ? <MenuItem icon={ChatsCircleIcon} onSelect={() => mudarSituacao("aberta")}>Reabrir conversa</MenuItem>
                : <MenuItem icon={CheckCircleIcon} onSelect={() => mudarSituacao("resolvida")}>Resolver conversa</MenuItem>}
              <MenuSeparator />
              {conversa.assignee !== eu.id && <MenuItem icon={HandIcon} onSelect={() => void organizar(phone, { responsavel: eu.id, responsavelNome: eu.name })}>Assumir a conversa</MenuItem>}
              {lead && <MenuItem icon={ArrowSquareOutIcon} href={`/leads/${lead.id}`}>Abrir oportunidade</MenuItem>}
              <MenuItem icon={ExportIcon} onSelect={() => window.location.assign(`/api/whatsapp/exportar?phone=${encodeURIComponent(phone)}`)}>Exportar conversa</MenuItem>
              <MenuItem icon={CopyIcon} onSelect={() => void navigator.clipboard?.writeText(telefoneFormatado(phone)).then(() => setAviso("Telefone copiado"))}>Copiar telefone</MenuItem>
            </Menu>
            <Tooltip label={painel ? "Esconder a ficha" : "Mostrar a ficha"} side="bottom">
              <button type="button" className="iconGhost" aria-label={painel ? "Esconder a ficha" : "Mostrar a ficha"} aria-pressed={painel} onClick={aoAlternarPainel}><SidebarSimpleIcon /></button>
            </Tooltip>
            <Tooltip label="Fechar a conversa (Esc)" side="bottom">
              <button type="button" className="iconGhost closeThread" aria-label="Fechar a conversa (Esc)" onClick={() => setSelecionado(undefined)}><XIcon /></button>
            </Tooltip>
          </div>
        )}
      </header>

      {/* A etapa da oportunidade, presa abaixo do cabeçalho: muda de etapa sem sair da conversa. */}
      {lead && funil && (
        <div className="pinnedPipeline">
          <span>{funil.name}</span>
          <div className="grow" style={{ minWidth: 0 }}><StagePipeline stages={funil.stages} current={lead.stage} onMove={aoMoverEtapa} /></div>
          <a href={`/leads/${lead.id}`} className="wideOnly">Abrir oportunidade</a>
        </div>
      )}

      <div className="messages" ref={area} onScroll={aoRolar} role="log" aria-live="polite"
        onLoadCapture={(e) => { /* foto ou vídeo terminou de carregar: quem estava no fim continua no fim */ if (noFim && (e.target instanceof HTMLImageElement || e.target instanceof HTMLVideoElement)) area.current?.scrollTo({ top: area.current.scrollHeight }); }}
        onPlayCapture={(e) => { /* um áudio ou vídeo por vez, como na Le Ange */ area.current?.querySelectorAll<HTMLMediaElement>("audio, video").forEach((midia) => { if (midia !== e.target && !midia.paused) midia.pause(); }); }}>
        {fio?.carregandoAntigas && <div className="older" role="status">Carregando mensagens anteriores…</div>}
        {!fio?.nextBefore && fio?.carregado && mensagens.length > 0 && <div className="older">Início da conversa</div>}
        {!mensagens.length && (fio?.carregado
          ? <div className="loading">{aberta ? "Nenhuma mensagem ainda. Escreva abaixo para começar." : "Nenhuma mensagem ainda. Para começar a conversa, envie um modelo aprovado."}</div>
          : <div className="threadSkeleton" aria-hidden>{[0, 1, 0, 0, 1].map((lado, i) => <span key={i} className="skeletonBubble" data-out={lado ? "" : undefined} />)}</div>)}
        {dias.map((dia) => (
          // Cada dia num grupo: o selo fica preso no topo só enquanto o dia dele está na tela (o seguinte o empurra).
          <section key={dia.chave} className="dayGroup" aria-label={rotuloDoDia(dia.itens[0].m.createdAt)}>
            <div className="day"><span>{rotuloDoDia(dia.itens[0].m.createdAt)}</span></div>
            {dia.itens.map(({ m, primeira, album, parada }) => (
              <Bolha key={(album?.[0] ?? m).id} mensagem={m} album={album} primeira={primeira} nomeContato={primeiroNome(nome)} autor={nomeDe(m.author)} parada={parada} podeSalvar={Boolean(lead)}
                aoResponder={responder} aoReagir={reagirA} aoAcoes={setAcoes} aoAbrirFoto={abrirFoto} aoIrPara={irPara} aoDescartar={descartar} aoReenviar={reenviar} aoSalvar={salvar} />
            ))}
          </section>
        ))}
      </div>

      {!noFim && <button type="button" className="toBottom" aria-label={novas > 0 ? `Ir para o fim, ${novas} novas` : "Ir para a última mensagem"} onClick={irParaFim}><ArrowDownIcon />{novas > 0 && <b>{novas}</b>}</button>}
      {aviso && <div role="status" style={{ position: "absolute", left: "50%", bottom: `calc(${altura}px + 0.75rem)`, zIndex: 4, transform: "translateX(-50%)", padding: "0.375rem 0.75rem", fontSize: "0.8125rem", color: "var(--color-bg)", background: "var(--color-ink)", borderRadius: "0.5rem", boxShadow: "var(--shadow-md)", whiteSpace: "nowrap" }}>{aviso}</div>}

      <Compositor phone={phone} nomeContato={nome} janelaAberta={aberta} bloqueado={Boolean(conversa?.optedOut)} respondendo={respondendo} aoCancelarResposta={() => setRespondendo(null)}
        aoEnviarTexto={(texto, resposta) => { setNoFim(true); void enviarTexto(phone, texto, resposta); }}
        aoEnviarNota={(texto) => { setNoFim(true); void enviarNota(phone, texto); }}
        aoEnviarArquivo={(arquivo, extra) => { setNoFim(true); void enviarArquivo(phone, arquivo, extra); }}
        aoAbrirModelo={() => setModelo(true)} aoMedir={setAltura} />

      {/* As opções da mensagem (os três pontos, o botão direito ou o toque longo), como a janela "Mensagem" da Le Ange. */}
      <Dialog open={Boolean(acoes)} onClose={() => setAcoes(null)} title={acoes?.type === "note" ? "Nota interna" : "Mensagem"} width="22rem">
        {acoes && (
          <AcoesMensagem>
            {!interna(acoes) && (
              <div className="quickReactions" aria-label="Reagir à mensagem">
                {REACOES_RAPIDAS.map((emoji) => <button key={emoji} type="button" aria-label={`Reagir com ${emoji}`} data-on={acoes.reactions?.some((r) => r.from === "me" && r.emoji === emoji) || undefined} onClick={() => { void reagir(phone, acoes, emoji); setAcoes(null); }}>{emoji}</button>)}
              </div>
            )}
            {!interna(acoes) && <button type="button" className="acao" onClick={() => { setRespondendo(acoes); setAcoes(null); }}><ArrowBendUpLeftIcon size={18} /> Responder</button>}
            {textoDaMensagem(acoes) && <button type="button" className="acao" onClick={() => { void copiar(acoes); setAcoes(null); }}><CopyIcon size={18} /> Copiar texto</button>}
            {acoesMidia && lead && <button type="button" className="acao" onClick={() => { void salvar(acoes); setAcoes(null); }}><FolderSimplePlusIcon size={18} /> Salvar na ficha</button>}
            {acoesMidia && <a className="acao" href={urlDaMidia(acoes, true)} onClick={() => setAcoes(null)}><DownloadSimpleIcon size={18} /> Baixar arquivo</a>}
            {acoes.type === "note" && <button type="button" className="acao" data-perigo="" onClick={() => { void descartarFalha(phone, acoes.id); setAcoes(null); }}><TrashIcon size={18} /> Apagar nota</button>}
          </AcoesMensagem>
        )}
      </Dialog>
      <Lightbox images={fotos.map((m) => ({ url: m.local?.previewUrl ?? urlDaMidia(m), name: textoDaMensagem(m) || "Foto" }))} index={foto} onClose={() => setFoto(null)} />
      <ModeloDialog phone={phone} aberto={modelo} aoFechar={() => setModelo(false)} aoEnviado={() => void recarregarFio(phone, true)} />
    </ColunaConversa>
  );
}
