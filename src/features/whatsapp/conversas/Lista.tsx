"use client";

// A lista de conversas no desenho do ERP da Le Ange (conversation-list.tsx): busca com o botão de filtros, os recortes em
// chips (todas, não lidas, aguardando e, no chip da seta, minhas, favoritas, fixadas e resolvidas) e, no topo, o grupo de
// quem espera a equipe, do mais antigo para o mais novo. Recolhida, vira um trilho só com as fotos.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  CameraIcon, CaretDownIcon, CheckCircleIcon, CheckIcon, CheckSquareIcon, ChecksIcon, ChatsCircleIcon, ClockIcon, FileTextIcon, HandIcon, LockSimpleIcon, MagnifyingGlassIcon, MicrophoneIcon,
  NotePencilIcon, PushPinIcon, PushPinSlashIcon, SidebarSimpleIcon, SlidersHorizontalIcon, SpeakerHighIcon, SpeakerSlashIcon, StarIcon, UserMinusIcon, VideoCameraIcon, WarningCircleIcon, XIcon,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/Menu";
import { Tooltip } from "@/components/ui/Tooltip";
import type { Member } from "@/features/settings/types";
import type { WhatsAppConversation, WhatsAppSituacao } from "../types";
import { todosRascunhos } from "./cache";
import { ColunaLista } from "./estilos";
import { horaDaLista, nomeDaConversa, rotuloDoTipo, textoSimples } from "./formato";
import { MenuContexto, type Opcao } from "./MenuContexto";
import { ligarSons, sonsLigados } from "./sons";
import { filtrosAtivos, SEM_FILTROS, type Aba, type Filtros, type useConversas } from "./useConversas";

type Estado = ReturnType<typeof useConversas>;
/** Os recortes em chip, sempre à vista. */
const ABAS_PRINCIPAIS: Array<{ id: Aba; rotulo: string }> = [{ id: "todas", rotulo: "Todas" }, { id: "nao_lidas", rotulo: "Não lidas" }, { id: "aguardando", rotulo: "Aguardando" }];
/** Os recortes do chip da seta: menos usados, ficam um clique adiante. */
const ABAS_MAIS: Array<{ id: Aba; rotulo: string }> = [{ id: "minhas", rotulo: "Minhas" }, { id: "favoritas", rotulo: "Favoritas" }, { id: "fixadas", rotulo: "Fixadas" }, { id: "resolvidas", rotulo: "Resolvidas" }];
export const ROTULO_SITUACAO: Record<WhatsAppSituacao, string> = { aberta: "Aberta", aguardando: "Aguardando", resolvida: "Resolvida" };
const PERIODOS: Array<[Filtros["periodo"], string]> = [["", "Qualquer data"], ["hoje", "Hoje"], ["7d", "Últimos 7 dias"], ["30d", "Últimos 30 dias"]];
const RESPOSTAS: Array<[Filtros["resposta"], string]> = [["", "Todas"], ["sem-resposta", "Sem resposta"], ["respondida", "Respondidas"]];
const JANELAS: Array<[Filtros["janela"], string]> = [["", "Todas"], ["aberta", "Aberta"], ["fechada", "Fechada"]];
const ICONE_TIPO: Partial<Record<string, typeof CameraIcon>> = { image: CameraIcon, sticker: CameraIcon, video: VideoCameraIcon, audio: MicrophoneIcon, document: FileTextIcon };
/** Liga ou desliga um valor numa lista de marcados. */
const alternar = <T,>(lista: T[], valor: T) => (lista.includes(valor) ? lista.filter((item) => item !== valor) : [...lista, valor]);
/** A posição na cascata de entrada: cada linha entra um pouco depois da anterior (o CSS limita a espera). */
const passo = (indice: number) => ({ "--i": indice }) as CSSProperties;

function Destaque({ texto, termo }: { texto: string; termo: string }) {
  const normal = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const i = normal(texto).indexOf(normal(termo));
  if (!termo || i < 0) return <>{texto}</>;
  const inicio = Math.max(0, i - 24);
  return <>{inicio > 0 ? "…" : ""}{texto.slice(inicio, i)}<mark>{texto.slice(i, i + termo.length)}</mark>{texto.slice(i + termo.length)}</>;
}

/** O que a prévia diz da última mensagem: os ticks, o tipo e o texto. */
function Previa({ c }: { c: WhatsAppConversation }) {
  if (!c.lastMessage && !c.lastType) return <span>Sem mensagens</span>;
  const nota = c.lastType === "note", saida = c.lastDirection === "outbound";
  const Icone = ICONE_TIPO[c.lastType ?? ""];
  const texto = textoSimples((c.lastMessage ?? "").replace(/^\[Template: [^\]]+\]\s*/, "")).replace(/^\[[a-z_]+\]$/, "") || rotuloDoTipo(c.lastType ?? "") || "Mensagem";
  const ticks = !saida || nota ? null
    : c.lastStatus === "failed" ? <WarningCircleIcon weight="fill" data-failed="" aria-label="Não enviada" />
    : c.lastStatus === "read" ? <ChecksIcon data-read="" aria-label="Lida" />
    : c.lastStatus === "delivered" ? <ChecksIcon aria-label="Entregue" />
    : c.lastStatus === "sent" || c.lastStatus === "accepted" ? <CheckIcon aria-label="Enviada" /> : <ClockIcon aria-label="Enviando" />;
  return (
    <>
      {ticks}
      {nota ? <LockSimpleIcon weight="fill" data-note="" aria-label="Nota interna" /> : Icone ? <Icone aria-hidden /> : null}
      <span>{saida && !nota && c.lastType !== "template" ? "Você: " : ""}{texto}</span>
    </>
  );
}

export function Lista({ estado, equipe, eu, aoNovaConversa, trilho = false, aoExpandir }: { estado: Estado; equipe: readonly Member[]; eu: string; aoNovaConversa: () => void; trilho?: boolean; aoExpandir?: () => void }) {
  const { lista, selecionado, setSelecionado, aba, setAba, busca, setBusca, buscaAtiva, filtros, setFiltros, contagens, etiquetas, carregandoLista, temMais, maisLista, carregarMaisLista, organizar, resolverEmMassa, preCarregar, cancelarPreCarga } = estado;
  const [menu, setMenu] = useState<{ c: WhatsAppConversation; x: number; y: number } | null>(null);
  const [sons, setSons] = useState(true);
  const [rascunhos, setRascunhos] = useState<Record<string, string>>({});
  // Seleção para fechar em massa (padrão da Le Ange): marca as linhas e resolve de uma vez.
  const [marcando, setMarcando] = useState(false);
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set());
  const [confirmar, setConfirmar] = useState<{ phones: string[]; rotulo: string } | null>(null);
  const corpo = useRef<HTMLDivElement>(null), fim = useRef<HTMLDivElement>(null), chips = useRef<HTMLDivElement>(null);
  const toque = useRef(0);
  const ativos = filtrosAtivos(filtros);
  const mudar = (parte: Partial<Filtros>) => setFiltros({ ...filtros, ...parte });

  useEffect(() => { setSons(sonsLigados()); }, []);
  // O recorte em vigor fica sempre à vista (a linha dos chips rola de lado quando o nome não cabe).
  useEffect(() => { chips.current?.querySelector('[aria-pressed="true"], [data-pressed]')?.scrollIntoView({ block: "nearest", inline: "nearest" }); }, [aba]);
  useEffect(() => { setRascunhos(todosRascunhos()); }, [lista, selecionado]);
  // O fim da lista: ao aparecer (a 480 px), pede a próxima página.
  useEffect(() => {
    const alvo = fim.current;
    if (!alvo || !temMais) return;
    const observador = new IntersectionObserver((entradas) => { if (entradas.some((e) => e.isIntersecting)) void carregarMaisLista(); }, { root: corpo.current, rootMargin: "480px 0px" });
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [temMais, carregarMaisLista, lista.length]);

  // O grupo do topo é o de quem espera a equipe e ainda não tem responsável; depois as fixadas e as recentes.
  const { aguardando, fixadas, recentes } = useMemo(() => {
    const espera = (c: WhatsAppConversation) => Boolean(c.waitingSince) && !c.assignee;
    return {
      aguardando: lista.filter(espera).sort((a, b) => (a.waitingSince ?? "").localeCompare(b.waitingSince ?? "")),
      fixadas: lista.filter((c) => c.pinned && !espera(c)),
      recentes: lista.filter((c) => !c.pinned && !espera(c)),
    };
  }, [lista]);
  const abertas = (conversas: WhatsAppConversation[]) => conversas.filter((c) => c.status !== "resolvida").map((c) => c.phone);
  const filtrando = ativos > 0 || aba !== "todas" || buscaAtiva.length >= 2;
  const doFiltro = abertas(lista);
  const pararDeMarcar = () => { setMarcando(false); setMarcadas(new Set()); };
  const marcar = (phone: string) => setMarcadas((atual) => { const proximo = new Set(atual); if (proximo.has(phone)) proximo.delete(phone); else proximo.add(phone); return proximo; });
  const maisAtiva = ABAS_MAIS.find((item) => item.id === aba);

  const opcoesDe = (c: WhatsAppConversation): Opcao[] => [
    { rotulo: c.pinned ? "Desafixar" : "Fixar no topo", icone: c.pinned ? <PushPinSlashIcon size={16} /> : <PushPinIcon size={16} />, aoEscolher: () => void organizar(c.phone, { fixar: !c.pinned }) },
    { rotulo: c.starred ? "Tirar das favoritas" : "Favoritar", icone: <StarIcon size={16} weight={c.starred ? "fill" : "regular"} />, aoEscolher: () => void organizar(c.phone, { favoritar: !c.starred }) },
    { rotulo: c.unreadCount > 0 ? "Marcar como lida" : "Marcar como não lida", icone: <ChatsCircleIcon size={16} />, aoEscolher: () => void organizar(c.phone, { naoLida: !(c.unreadCount > 0) }) },
    "separador",
    c.assignee === eu
      ? { rotulo: "Deixar sem responsável", icone: <UserMinusIcon size={16} />, aoEscolher: () => void organizar(c.phone, { responsavel: null }) }
      : { rotulo: "Assumir a conversa", icone: <HandIcon size={16} />, aoEscolher: () => void organizar(c.phone, { responsavel: eu }) },
    c.status === "resolvida"
      ? { rotulo: "Reabrir conversa", icone: <ChatsCircleIcon size={16} />, aoEscolher: () => void organizar(c.phone, { situacao: "aberta" }) }
      : { rotulo: "Resolver conversa", icone: <CheckCircleIcon size={16} />, aoEscolher: () => { void organizar(c.phone, { situacao: "resolvida" }); if (c.phone === selecionado) setSelecionado(undefined); } },
  ];

  const linha = (c: WhatsAppConversation, indice: number) => {
    const nome = nomeDaConversa(c), naoLida = c.unreadCount > 0, esperando = Boolean(c.waitingSince) && !c.assignee;
    const dono = c.assignee ? equipe.find((membro) => membro.id === c.assignee) : undefined;
    const rascunho = c.phone !== selecionado ? rascunhos[c.phone] : undefined;
    // Vista e sem resposta: o cliente escreveu ao vivo por último, a equipe já leu e não respondeu; fora do "Novo" (que já
    // diz que ninguém respondeu). O histórico importado do celular não ganha o selo: lá não há quem esteja esperando.
    const semResposta = Boolean(c.waitingSince) && !naoLida && !c.isNew;
    const dica = [dono ? `Responsável: ${dono.name}` : "Sem responsável", esperando ? "Aguardando a equipe" : ""].filter(Boolean).join(". ");
    return (
      <li key={c.phone} className={`itemEnter${marcando ? " pickRow" : ""}`} style={passo(indice)}>
        {marcando && <Checkbox checked={marcadas.has(c.phone)} onChange={() => marcar(c.phone)} label={`Selecionar ${nome}`} />}
        <button type="button" className="item" data-selected={c.phone === selecionado || undefined} data-unread={naoLida || undefined}
          title={trilho ? nome : undefined} aria-label={trilho ? `${nome}${naoLida ? `, ${c.unreadCount} não lidas` : ""}` : undefined} aria-current={c.phone === selecionado || undefined}
          onClick={() => (marcando ? marcar(c.phone) : setSelecionado(c.phone))}
          onContextMenu={(e) => { e.preventDefault(); setMenu({ c, x: e.clientX, y: e.clientY }); }}
          onTouchStart={(e) => { const t = e.touches[0]; window.clearTimeout(toque.current); toque.current = window.setTimeout(() => setMenu({ c, x: t.clientX, y: t.clientY }), 550); }}
          onTouchEnd={() => window.clearTimeout(toque.current)} onTouchMove={() => window.clearTimeout(toque.current)}
          onPointerEnter={() => preCarregar(c.phone)} onPointerLeave={cancelarPreCarga} onFocus={() => preCarregar(c.phone)}>
          <span className="itemAvatar" data-waiting={esperando || undefined} title={dica}>
            <Avatar name={nome} seed={c.phone} size="sm" shape="circle" />
            {trilho && naoLida && <b className="railUnread">{c.unreadCount > 99 ? "99+" : c.unreadCount}</b>}
            {/* Quem responde pela conversa: a foto pequena no canto, como o selo da Le Ange. */}
            {dono && !trilho && <span className="ownerSeal" aria-hidden><Avatar name={dono.name} seed={dono.seed} src={dono.avatarUrl} size="xs" shape="circle" /></span>}
          </span>
          <span className="itemText">
            <span className="itemRow">
              <strong className="itemName">
                {c.isNew && <span className="newBadge">Novo</span>}
                {c.status === "resolvida" && <span className="newBadge">Resolvida</span>}
                {c.status === "aguardando" && <span className="newBadge" data-tone="warning">Aguardando</span>}
                <span>{nome}</span>
              </strong>
              <time dateTime={c.lastMessageAt ?? undefined}>{horaDaLista(c.lastMessageAt)}</time>
            </span>
            <span className="itemRow">
              <span className="preview">
                {rascunho ? <span><em className="draftLabel">Rascunho:</em> {rascunho}</span>
                  : c.match && buscaAtiva ? <><MagnifyingGlassIcon aria-hidden /><span><Destaque texto={textoSimples(c.match)} termo={buscaAtiva} /></span></>
                  : <Previa c={c} />}
              </span>
              <span className="itemFlags">
                {semResposta && <span className="replyBadge">Sem resposta</span>}
                {c.labels?.[0] && !semResposta && <span className="newBadge" data-tone="info" title={c.labels.join(", ")}>{c.labels[0]}{c.labels.length > 1 ? ` +${c.labels.length - 1}` : ""}</span>}
                {c.starred && <StarIcon weight="fill" aria-label="Favorita" data-star="" />}
                {c.pinned && <PushPinIcon weight="fill" aria-label="Fixada" />}
                {naoLida && <b>{c.unreadCount > 99 ? "99+" : c.unreadCount}</b>}
              </span>
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <ColunaLista data-pane="lista" aria-label="Conversas" data-rail={trilho || undefined}>
      {trilho && (
        <div className="railHead">
          <button type="button" className="squareButton" data-size="sm" aria-label="Mostrar a lista de conversas" onClick={aoExpandir}><SidebarSimpleIcon mirrored /></button>
        </div>
      )}
      <div className="listHead">
        <div className="listTitleRow">
          <h1 className="listTitle">Conversas</h1>
          <span className="listTitleActions">
            <Tooltip label={sons ? "Silenciar os sons" : "Ligar os sons"} side="bottom">
              <button type="button" className="squareButton" data-size="sm" aria-label={sons ? "Silenciar os sons" : "Ligar os sons"} aria-pressed={!sons} onClick={() => { ligarSons(!sons); setSons(!sons); }}>{sons ? <SpeakerHighIcon /> : <SpeakerSlashIcon />}</button>
            </Tooltip>
            <Tooltip label="Nova conversa" side="bottom">
              <button type="button" className="squareButton" data-size="sm" aria-label="Nova conversa pelo número" onClick={aoNovaConversa}><NotePencilIcon /></button>
            </Tooltip>
          </span>
        </div>
        <div className="searchRow">
          <label className="search">
            <MagnifyingGlassIcon aria-hidden />
            <input type="search" value={busca} placeholder="Nome, telefone ou mensagem" aria-label="Buscar nome, telefone ou palavra nas mensagens" onChange={(e) => setBusca(e.target.value)} />
            {busca && <button type="button" aria-label="Limpar a busca" onClick={() => setBusca("")}><XIcon size={14} /></button>}
          </label>
          <Menu label="Filtros" align="end" width="16.5rem" trigger={(props) => (
            <button {...props} type="button" className="squareButton" aria-label={ativos > 0 ? `Filtros, ${ativos} em vigor` : "Filtrar conversas"}>
              <SlidersHorizontalIcon />
              {ativos > 0 && <span className="filterCount" aria-hidden>{ativos}</span>}
            </button>
          )}>
            {filtrando && doFiltro.length > 0 && <MenuItem icon={CheckSquareIcon} onSelect={() => setConfirmar({ phones: doFiltro, rotulo: `as ${doFiltro.length} conversas deste filtro${temMais ? " (as carregadas)" : ""}` })}>Fechar as {doFiltro.length} deste filtro</MenuItem>}
            {ativos > 0 && <MenuItem icon={XIcon} onSelect={() => setFiltros(SEM_FILTROS)}>Limpar filtros</MenuItem>}
            {(ativos > 0 || (filtrando && doFiltro.length > 0)) && <MenuSeparator />}
            <MenuLabel>Última mensagem</MenuLabel>
            {PERIODOS.map(([valor, rotulo]) => <MenuItem key={`p${valor}`} keepOpen selected={filtros.periodo === valor} onSelect={() => mudar({ periodo: valor })}>{rotulo}</MenuItem>)}
            <MenuSeparator /><MenuLabel>Resposta</MenuLabel>
            {RESPOSTAS.map(([valor, rotulo]) => <MenuItem key={`r${valor}`} keepOpen selected={filtros.resposta === valor} onSelect={() => mudar({ resposta: valor })}>{rotulo}</MenuItem>)}
            <MenuSeparator /><MenuLabel>Conversa</MenuLabel>
            {(Object.keys(ROTULO_SITUACAO) as WhatsAppSituacao[]).map((situacao) => <MenuItem key={situacao} keepOpen selected={filtros.situacoes.includes(situacao)} onSelect={() => mudar({ situacoes: alternar(filtros.situacoes, situacao) })}>{ROTULO_SITUACAO[situacao]}</MenuItem>)}
            <MenuItem keepOpen icon={PushPinIcon} selected={filtros.soFixadas} onSelect={() => mudar({ soFixadas: !filtros.soFixadas })}>Só fixadas</MenuItem>
            <MenuSeparator /><MenuLabel>Janela de 24h</MenuLabel>
            {JANELAS.map(([valor, rotulo]) => <MenuItem key={`j${valor}`} keepOpen selected={filtros.janela === valor} onSelect={() => mudar({ janela: valor })}>{rotulo}</MenuItem>)}
            <MenuSeparator /><MenuLabel>Responsável</MenuLabel>
            {[...equipe.map((membro) => ({ id: membro.id, nome: membro.name })), { id: "", nome: "Sem responsável" }].map((membro) => <MenuItem key={`m${membro.id}`} keepOpen selected={filtros.responsaveis.includes(membro.id)} onSelect={() => mudar({ responsaveis: alternar(filtros.responsaveis, membro.id) })}>{membro.nome}</MenuItem>)}
            {etiquetas.length > 0 && <><MenuSeparator /><MenuLabel>Etiquetas</MenuLabel>{etiquetas.map((etiqueta) => <MenuItem key={`e${etiqueta}`} keepOpen selected={filtros.etiquetas.includes(etiqueta)} onSelect={() => mudar({ etiquetas: alternar(filtros.etiquetas, etiqueta) })}>{etiqueta}</MenuItem>)}</>}
          </Menu>
          <Tooltip label={marcando ? "Sair da seleção" : "Selecionar para fechar em massa"} side="bottom">
            <button type="button" className="squareButton" aria-label={marcando ? "Sair da seleção" : "Selecionar conversas"} aria-pressed={marcando} onClick={() => (marcando ? pararDeMarcar() : setMarcando(true))}><CheckSquareIcon /></button>
          </Tooltip>
        </div>
        {marcando && (
          <div className="bulkBar" role="toolbar" aria-label="Conversas selecionadas">
            <span>{marcadas.size > 0 ? `${marcadas.size} selecionada${marcadas.size > 1 ? "s" : ""}` : "Marque as conversas"}</span>
            <Button variant="ghost" size="sm" onClick={() => setMarcadas(marcadas.size === lista.length ? new Set() : new Set(lista.map((c) => c.phone)))}>{marcadas.size === lista.length && lista.length > 0 ? "Limpar" : "Todas"}</Button>
            <Button size="sm" disabled={abertas(lista.filter((c) => marcadas.has(c.phone))).length === 0} onClick={() => setConfirmar({ phones: abertas(lista.filter((c) => marcadas.has(c.phone))), rotulo: "as conversas selecionadas" })}>Fechar</Button>
          </div>
        )}
        {busca.trim().length === 1 && <p className="searchStatus">Digite pelo menos 2 caracteres para buscar no histórico.</p>}
        <div className="chips" ref={chips} role="group" aria-label="Recortes">
          {ABAS_PRINCIPAIS.map((item) => {
            const numero = item.id === "nao_lidas" ? contagens.nao_lidas : item.id === "aguardando" ? contagens.aguardando : 0;
            return <button key={item.id} type="button" className="chip" aria-pressed={aba === item.id} onClick={() => setAba(item.id)}>{item.rotulo}{numero > 0 && <span className="chipCount">{numero}</span>}</button>;
          })}
          <Menu label="Mais recortes" align="start" width="13rem" trigger={(props) => (
            <button {...props} type="button" className="chip" data-pressed={maisAtiva ? "" : undefined} aria-label={maisAtiva ? `Recorte: ${maisAtiva.rotulo}` : "Mais recortes"}>{maisAtiva?.rotulo}<CaretDownIcon aria-hidden /></button>
          )}>
            {ABAS_MAIS.map((item) => <MenuItem key={item.id} selected={aba === item.id} meta={item.id === "minhas" && contagens.minhas ? String(contagens.minhas) : undefined} onSelect={() => setAba(aba === item.id ? "todas" : item.id)}>{item.rotulo}</MenuItem>)}
          </Menu>
        </div>
      </div>

      <div ref={corpo} className="listBody">
        {carregandoLista && !lista.length && <ul className="listSkeleton" aria-hidden>{Array.from({ length: 8 }, (_, i) => <li key={i}><span className="bone" style={{ width: "2.25rem", height: "2.25rem", borderRadius: "50%" }} /><span><span className="bone" style={{ width: `${55 + (i % 3) * 12}%` }} /><span className="bone" style={{ width: `${80 - (i % 4) * 9}%`, height: "0.625rem" }} /></span></li>)}</ul>}
        {!carregandoLista && !lista.length && <p className="listEmpty">{ativos > 0 || buscaAtiva ? "Nenhuma conversa com esses filtros." : aba === "todas" ? "As conversas do WhatsApp aparecem aqui assim que alguém escrever." : "Nenhuma conversa neste recorte."}</p>}
        {aguardando.length > 0 && <section><h2 className="groupTitle">Aguardando a equipe<span className="groupCount">{aguardando.length}</span></h2><ul>{aguardando.map((c, i) => linha(c, i))}</ul></section>}
        {fixadas.length > 0 && <section><h2 className="groupTitle" style={passo(aguardando.length)}>Fixadas</h2><ul>{fixadas.map((c, i) => linha(c, aguardando.length + i))}</ul></section>}
        {recentes.length > 0 && <section><h2 className="groupTitle" style={passo(aguardando.length + fixadas.length)}>{aba === "resolvidas" ? "Resolvidas" : "Recentes"}</h2><ul>{recentes.map((c, i) => linha(c, aguardando.length + fixadas.length + i))}</ul></section>}
        <div ref={fim} className="listEnd" aria-hidden={!maisLista}>{maisLista && <span>Carregando mais conversas</span>}</div>
      </div>

      {menu && <MenuContexto x={menu.x} y={menu.y} opcoes={opcoesDe(menu.c)} aoFechar={() => setMenu(null)} />}
      {/* A tela confirma antes de fechar várias de uma vez. */}
      <Dialog open={Boolean(confirmar)} onClose={() => setConfirmar(null)} title={`Fechar ${confirmar?.phones.length ?? 0} ${confirmar?.phones.length === 1 ? "conversa" : "conversas"}?`} width="26rem"
        description={`Vai marcar como resolvidas ${confirmar?.rotulo ?? ""}. Elas saem da lista e voltam sozinhas quando o cliente escrever de novo.`}
        footer={<><Button variant="ghost" onClick={() => setConfirmar(null)}>Cancelar</Button><Button onClick={() => { const alvo = confirmar?.phones ?? []; setConfirmar(null); pararDeMarcar(); void resolverEmMassa(alvo); }}>Fechar conversas</Button></>} />
    </ColunaLista>
  );
}
