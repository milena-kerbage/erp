"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import styled from "@emotion/styled";
import {
  ArrowClockwiseIcon, ArrowSquareOutIcon, BabyIcon, BedIcon, ButterflyIcon, ChatsCircleIcon, CloudIcon, DotsThreeIcon, FeatherIcon, FlowerIcon, FlowerTulipIcon, GiftIcon, HandbagIcon, HeartIcon,
  LeafIcon, ListIcon, MedalIcon, MoonIcon, NeedleIcon, PackageIcon, PencilSimpleIcon, PlusIcon, RulerIcon, SparkleIcon, StarIcon, TrashIcon, TruckIcon, YarnIcon, type Icon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { TextField } from "@/components/ui/TextField";
import { Card, FieldGrid, Notice, Page, PageHeader, Pill, Stack } from "@/features/operations/components/ui";
import { ToggleRow } from "@/features/settings/components/ui";
import { transientOptions } from "@/lib/emotion/transient";
import type { EntradaItemMenu, ItemMenuGestao, RespostaMenu, SecaoMenu } from "@/features/ecommerce/types";
import { conflito, erpRequest, loja, requestError, tamanho } from "./api";
import { AcoesCabecalho, Alca, AvisoSomenteLeitura, CampoImagemLoja, Caminho, Confirmar, Sub, useArrastar, usePodeEditar, useRecurso } from "./comum";

/* ---------- Vocabulário do menu ---------- */

const SECOES: Record<SecaoMenu, { rotulo: string; plural: string; descricao: string }> = {
  item: { rotulo: "Item do menu", plural: "Itens", descricao: "1º nível do cabeçalho." },
  destaque: { rotulo: "Destaque", plural: "Destaques", descricao: "Links grandes no topo do painel (ex.: Ver tudo, Pronta entrega)." },
  secundario: { rotulo: "Link secundário", plural: "Links secundários", descricao: "Links menores abaixo dos destaques." },
  coluna: { rotulo: "Coluna", plural: "Colunas", descricao: "Título com uma lista de links." },
  link: { rotulo: "Link", plural: "Links", descricao: "Link dentro da coluna." },
  card: { rotulo: "Card", plural: "Cards", descricao: "Cartão 5:6 com imagem ou composição de cor e ícone." },
  promo: { rotulo: "Bloco editorial", plural: "Bloco editorial", descricao: "Um por item: mídia 16:9 com título e texto." },
};

/** Cores aproximadas dos tons da loja (src/loja/componentes/inicio/Midia.tsx), só para a prévia. */
const TONS: Record<string, { fundo: string; escuro: boolean; rotulo: string }> = {
  salvia: { fundo: "linear-gradient(160deg, #616D54, #4D5743 55%, #3C4435)", escuro: true, rotulo: "Sálvia" },
  musgo: { fundo: "linear-gradient(200deg, #788569, #616D54 50%, #4D5743)", escuro: true, rotulo: "Musgo" },
  noite: { fundo: "linear-gradient(180deg, #3C4435, #1d1f1b)", escuro: true, rotulo: "Noite" },
  salviaClara: { fundo: "linear-gradient(160deg, #e6eadf, #cfd6c4)", escuro: false, rotulo: "Sálvia clara" },
  linho: { fundo: "linear-gradient(160deg, #f6f3ec, #F3EFE6 45%, #e6eadf)", escuro: false, rotulo: "Linho" },
  areia: { fundo: "linear-gradient(160deg, #f1ede4, #e7e1d4 50%, #d9d1c1)", escuro: false, rotulo: "Areia" },
  rose: { fundo: "linear-gradient(160deg, #f6f3ec, #E9C9C3)", escuro: false, rotulo: "Rosê" },
  azul: { fundo: "linear-gradient(160deg, #f6f3ec, #C6D7E3)", escuro: false, rotulo: "Azul bebê" },
  verde: { fundo: "linear-gradient(160deg, #F3EFE6, #b0bb9f)", escuro: false, rotulo: "Verde" },
  cru: { fundo: "linear-gradient(160deg, #f6f3ec, #EDE6D6)", escuro: false, rotulo: "Cru" },
  cinza: { fundo: "linear-gradient(160deg, #f1ede4, #d6d8d2)", escuro: false, rotulo: "Cinza" },
  branco: { fundo: "linear-gradient(160deg, #ffffff, #f1ede4)", escuro: false, rotulo: "Branco" },
  aconchego: { fundo: "radial-gradient(circle at 30% 30%, #CDAE88, #6b4a35 60%, #3b2a20)", escuro: true, rotulo: "Aconchego" },
};
const ICONES: Record<string, { icone: Icon; rotulo: string }> = {
  bebe: { icone: BabyIcon, rotulo: "Bebê" }, berco: { icone: BedIcon, rotulo: "Berço" }, borboleta: { icone: ButterflyIcon, rotulo: "Borboleta" }, conversa: { icone: ChatsCircleIcon, rotulo: "Conversa" },
  nuvem: { icone: CloudIcon, rotulo: "Nuvem" }, pena: { icone: FeatherIcon, rotulo: "Pena" }, flor: { icone: FlowerIcon, rotulo: "Flor" }, tulipa: { icone: FlowerTulipIcon, rotulo: "Tulipa" },
  presente: { icone: GiftIcon, rotulo: "Presente" }, bolsa: { icone: HandbagIcon, rotulo: "Bolsa" }, coracao: { icone: HeartIcon, rotulo: "Coração" }, folha: { icone: LeafIcon, rotulo: "Folha" },
  medalha: { icone: MedalIcon, rotulo: "Medalha" }, lua: { icone: MoonIcon, rotulo: "Lua" }, agulha: { icone: NeedleIcon, rotulo: "Agulha" }, pacote: { icone: PackageIcon, rotulo: "Pacote" },
  regua: { icone: RulerIcon, rotulo: "Régua" }, brilho: { icone: SparkleIcon, rotulo: "Brilho" }, caminhao: { icone: TruckIcon, rotulo: "Caminhão" }, estrela: { icone: StarIcon, rotulo: "Estrela" },
  novelo: { icone: YarnIcon, rotulo: "Novelo" },
};
const midia = (secao: SecaoMenu) => secao === "card" || secao === "promo";
type Edicao = { item: ItemMenuGestao | null; secao: SecaoMenu; paiId: string | null; pai?: ItemMenuGestao } | null;

/**
 * Editor do menu do cabeçalho da loja (mega menu): itens de 1º nível e, em cada um, o painel com
 * destaques, links secundários, colunas de links, cards (imagem ou composição de cor/ícone) e o bloco
 * editorial. Reordenar (arrastar ou setas), ativar/desativar, criar, editar e excluir, com prévia.
 */
export function MenuSite({ origemLoja }: { origemLoja: string }) {
  const podeEditar = usePodeEditar();
  const { dados, carregando, erro: erroCarga, recarregar } = useRecurso<RespostaMenu>(loja("menu"));
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<Edicao>(null);
  const [excluir, setExcluir] = useState<ItemMenuGestao | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const menu = useMemo(() => dados?.menu ?? [], [dados]);
  const atual = menu.find((item) => item.id === selecionado) ?? menu[0] ?? null;

  async function tarefa(rotulo: string, executar: () => Promise<string>) {
    setOcupado(true); setErro(""); setAviso("");
    try { setAviso(await executar()); }
    catch (caught) { setErro(`${rotulo}: ${conflito(caught) ? "outra pessoa mexeu no menu; a tela foi atualizada, tente de novo." : requestError(caught)}`); }
    finally { setOcupado(false); await recarregar(); }
  }
  const contexto: ContextoMenu = {
    podeEditar, ocupado,
    ordenar: (paiId, ids) => tarefa("Ordem", async () => { await erpRequest(loja("menu/ordem"), { method: "PUT", body: { paiId, ids } }); return "Ordem salva. O cabeçalho da loja já mostra a nova ordem."; }),
    alternar: (item) => tarefa(item.rotulo, async () => { await erpRequest(loja(`menu/${item.id}`), { method: "PATCH", body: { revisao: item.revisao, ativo: !item.ativo } }); return item.ativo ? `“${item.rotulo}” saiu do menu da loja.` : `“${item.rotulo}” voltou ao menu da loja.`; }),
    editar: (item, pai) => setEdicao({ item, secao: item.secao, paiId: item.paiId, pai }),
    novo: (secao, pai) => setEdicao({ item: null, secao, paiId: pai?.id ?? null, pai }),
    excluir: setExcluir,
  };

  return <Page>
    <PageHeader title="Menu do site" description="O menu do cabeçalho da loja: itens, painéis do mega menu, colunas de links, cards e o bloco editorial. As mudanças aparecem na loja na hora."
      actions={<AcoesCabecalho>
        <Button variant="secondary" icon={ArrowClockwiseIcon} loading={carregando && Boolean(dados)} onClick={() => void recarregar()}>Atualizar</Button>
        <Button variant="secondary" icon={ArrowSquareOutIcon} href={origemLoja} target="_blank" rel="noopener noreferrer">Ver a loja</Button>
        {podeEditar && <Button icon={PlusIcon} onClick={() => contexto.novo("item")}>Novo item</Button>}
      </AcoesCabecalho>} />
    {!podeEditar && <AvisoSomenteLeitura oque="o menu do site" />}
    {(erro || erroCarga) && <Notice role="alert">{erro || erroCarga} <Button variant="ghost" size="sm" onClick={() => void recarregar()}>Tentar novamente</Button></Notice>}
    {aviso && <Notice role="status">{aviso}</Notice>}
    {carregando && !dados ? <Card role="status" aria-label="Carregando o menu"><Skeleton $height="2.5rem" /><Skeleton $height="12rem" $radius="lg" /></Card>
      : !menu.length ? <Card><EmptyState icon={<ListIcon size={24} />} title={erroCarga ? "O menu não pôde ser carregado." : "Menu vazio no banco"} description="Sem itens cadastrados, a loja usa o menu padrão do código. Crie o primeiro item para passar a editar o menu por aqui.">
        {podeEditar && !erroCarga && <Button size="sm" icon={PlusIcon} onClick={() => contexto.novo("item")}>Novo item</Button>}
      </EmptyState></Card>
      : <>
        <Card>
          <Titulo>Prévia do cabeçalho <Sub>Só os itens ativos, como a loja mostra. Clique num item para editar o painel dele.</Sub></Titulo>
          <Previa menu={menu} atual={atual} onEscolher={setSelecionado} />
        </Card>
        <Grade>
          <Card as="section" aria-labelledby="itens-menu">
            <Titulo id="itens-menu">Itens do 1º nível <Sub>{podeEditar ? "Arraste pela alça para mudar a ordem." : `${menu.length} itens.`}</Sub></Titulo>
            <Lista itens={menu} paiId={null} contexto={contexto} selecionado={atual?.id ?? null} onEscolher={setSelecionado} />
          </Card>
          {atual && <PainelItem key={atual.id} item={atual} contexto={contexto} origemLoja={origemLoja} />}
        </Grade>
      </>}

    {edicao && <EditorItem key={edicao.item?.id ?? `novo-${edicao.secao}-${edicao.paiId}`} edicao={edicao} tons={dados?.tons ?? Object.keys(TONS)} icones={dados?.icones ?? Object.keys(ICONES)} onFechar={() => setEdicao(null)}
      onSalvo={async (mensagem, criado) => { setEdicao(null); setErro(""); setAviso(mensagem); await recarregar(); if (criado?.secao === "item") setSelecionado(criado.id); }} />}
    <Confirmar aberto={excluir !== null} titulo={`Excluir “${excluir?.rotulo ?? ""}”?`} acao="Excluir" ocupado={ocupado} onFechar={() => setExcluir(null)}
      onConfirmar={() => { const alvo = excluir; if (alvo) void tarefa(alvo.rotulo, async () => { await erpRequest(loja(`menu/${alvo.id}?revisao=${alvo.revisao}`), { method: "DELETE" }); setExcluir(null); return `“${alvo.rotulo}” saiu do menu.`; }); }}
      descricao={excluir?.filhos.length ? `Tudo o que está dentro (${excluir.filhos.length} ${excluir.filhos.length === 1 ? "parte" : "partes"} do painel) também é apagado. Não dá para desfazer; para tirar do ar por um tempo, desative.` : "Não dá para desfazer; para tirar do ar por um tempo, desative."} />
  </Page>;
}

type ContextoMenu = {
  podeEditar: boolean; ocupado: boolean;
  ordenar: (paiId: string | null, ids: string[]) => Promise<void>; alternar: (item: ItemMenuGestao) => Promise<void>;
  editar: (item: ItemMenuGestao, pai?: ItemMenuGestao) => void; novo: (secao: SecaoMenu, pai?: ItemMenuGestao) => void; excluir: (item: ItemMenuGestao) => void;
};

/** Lista reordenável de itens irmãos (1º nível, uma seção do painel ou os links de uma coluna). */
function Lista({ itens, paiId, contexto, pai, selecionado, onEscolher, renderizarFilhos }: {
  itens: ItemMenuGestao[]; paiId: string | null; contexto: ContextoMenu; pai?: ItemMenuGestao; selecionado?: string | null; onEscolher?: (id: string) => void; renderizarFilhos?: (item: ItemMenuGestao) => ReactNode;
}) {
  const [ordem, setOrdem] = useState(itens);
  useEffect(() => setOrdem(itens), [itens]);
  const original = itens.map((item) => item.id).join();
  const gravar = (nova: ItemMenuGestao[]) => { if (nova.map((item) => item.id).join() !== original) void contexto.ordenar(paiId, nova.map((item) => item.id)); };
  const { linha, alca } = useArrastar(ordem, setOrdem, gravar, contexto.podeEditar && !contexto.ocupado);
  return <Itens>{ordem.map((item, posicao) => <li key={item.id} {...linha(item, posicao)}>
    <LinhaItem $selecionado={selecionado === item.id} $inativo={!item.ativo}>
      {contexto.podeEditar && <Alca rotulo={`${item.rotulo}, posição ${posicao + 1} de ${ordem.length}`} {...alca(item, posicao)} disabled={contexto.ocupado} />}
      {midia(item.secao) && <Amostra $tom={item.tom} aria-hidden>{item.imagem ? <img src={item.imagem} alt="" /> : renderIcone(item.icone, 14)}</Amostra>}
      {onEscolher
        ? <RotuloBotao type="button" onClick={() => onEscolher(item.id)} aria-current={selecionado === item.id || undefined}><strong>{item.rotulo}</strong><Caminho>{item.href}{item.externo ? " ↗" : ""}</Caminho></RotuloBotao>
        : <Rotulo><strong>{item.rotulo}</strong><Caminho>{item.href}{item.externo ? " ↗" : ""}</Caminho></Rotulo>}
      <Selos>
        {item.destaque && <Pill $tone="lavender">Brilho</Pill>}
        {item.soBotao && <Pill $tone="neutral" $outline title="O rótulo só abre o painel">Só botão</Pill>}
        {!item.ativo && <Pill $tone="yellow">Inativo</Pill>}
      </Selos>
      <Switch checked={item.ativo} label={item.ativo ? `Desativar ${item.rotulo}` : `Ativar ${item.rotulo}`} disabled={!contexto.podeEditar || contexto.ocupado} onChange={() => void contexto.alternar(item)} />
      <Menu label={`Ações de ${item.rotulo}`} align="end" width="14rem" trigger={(props) => <IconButton {...props} icon={DotsThreeIcon} label="Ações" variant="ghost" size="sm" tooltip={false} />}>
        <MenuItem icon={PencilSimpleIcon} onSelect={() => contexto.editar(item, pai)}>{contexto.podeEditar ? "Editar" : "Ver detalhes"}</MenuItem>
        {item.secao === "coluna" && contexto.podeEditar && <MenuItem icon={PlusIcon} onSelect={() => contexto.novo("link", item)}>Novo link na coluna</MenuItem>}
        {contexto.podeEditar && <><MenuSeparator /><MenuItem icon={TrashIcon} muted onSelect={() => contexto.excluir(item)}>Excluir{item.filhos.length ? " (com o conteúdo)" : ""}</MenuItem></>}
      </Menu>
    </LinhaItem>
    {renderizarFilhos?.(item)}
  </li>)}</Itens>;
}

/** O painel do item escolhido: as seções que ele aceita, cada uma com a sua lista. */
function PainelItem({ item, contexto, origemLoja }: { item: ItemMenuGestao; contexto: ContextoMenu; origemLoja: string }) {
  const secoes: SecaoMenu[] = item.painel === "cards" ? ["card"] : ["destaque", "secundario", "coluna", "card", "promo"];
  const de = (secao: SecaoMenu) => item.filhos.filter((filho) => filho.secao === secao);
  return <Card as="section" aria-labelledby="painel-item">
    <Cabeca>
      <div>
        <Titulo id="painel-item">Painel de “{item.rotulo}”</Titulo>
        <Sub>{item.painel === "cards" ? "Painel só de cards (no celular, uma grade 2 × N)." : "Painel de colunas: destaques, colunas de links e, no espaço que sobra, o bloco editorial ou os cards."}</Sub>
      </div>
      <Acoes>
        <Button size="sm" variant="ghost" icon={ArrowSquareOutIcon} href={item.href.startsWith("http") ? item.href : `${origemLoja}${item.href}`} target="_blank" rel="noopener noreferrer">Abrir link</Button>
        <Button size="sm" variant="secondary" icon={PencilSimpleIcon} onClick={() => contexto.editar(item)}>{contexto.podeEditar ? "Editar item" : "Detalhes"}</Button>
      </Acoes>
    </Cabeca>
    {item.painel === "cards" && item.filhos.some((filho) => filho.secao !== "card") && <Notice>Este painel é de cards: os outros blocos ficam guardados, mas não aparecem.</Notice>}
    {secoes.map((secao) => {
      const itens = de(secao);
      const cheio = secao === "promo" && itens.length >= 1;
      return <Bloco key={secao} aria-label={SECOES[secao].plural}>
        <Cabeca>
          <div><h4>{SECOES[secao].plural} <small>({itens.length})</small></h4><Sub>{SECOES[secao].descricao}</Sub></div>
          {contexto.podeEditar && !cheio && <Button size="sm" variant="ghost" icon={PlusIcon} onClick={() => contexto.novo(secao, item)}>Adicionar</Button>}
        </Cabeca>
        {itens.length ? <Lista itens={itens} paiId={item.id} pai={item} contexto={contexto} renderizarFilhos={secao === "coluna" ? (coluna) => <Links>
          {coluna.filhos.length ? <Lista itens={coluna.filhos} paiId={coluna.id} pai={coluna} contexto={contexto} /> : <Sub>Coluna sem links.</Sub>}
          {contexto.podeEditar && <Button size="sm" variant="ghost" icon={PlusIcon} onClick={() => contexto.novo("link", coluna)}>Link em “{coluna.rotulo}”</Button>}
        </Links> : undefined} /> : <Sub>Nenhum.</Sub>}
      </Bloco>;
    })}
  </Card>;
}

/* ---------- Prévia ---------- */

function renderIcone(nome: string, tamanhoIcone: number) {
  const Componente = ICONES[nome]?.icone ?? BabyIcon;
  return <Componente size={tamanhoIcone} weight="thin" />;
}

function Previa({ menu, atual, onEscolher }: { menu: ItemMenuGestao[]; atual: ItemMenuGestao | null; onEscolher: (id: string) => void }) {
  const ativos = menu.filter((item) => item.ativo);
  const filhos = (secao: SecaoMenu) => (atual?.filhos ?? []).filter((filho) => filho.secao === secao && filho.ativo);
  const promo = filhos("promo")[0];
  const cards = filhos("card");
  return <PreviaCaixa>
    <Barra role="list" aria-label="Itens do cabeçalho">
      {ativos.map((item) => <button key={item.id} type="button" role="listitem" data-atual={atual?.id === item.id || undefined} data-brilho={item.destaque || undefined} onClick={() => onEscolher(item.id)}>{item.rotulo}</button>)}
      {!ativos.length && <Sub>Nenhum item ativo: a loja usa o menu padrão.</Sub>}
    </Barra>
    {atual && (!atual.ativo ? <Sub>“{atual.rotulo}” está inativo e não aparece no cabeçalho.</Sub> : <Painel>
      {atual.painel === "cards" ? <CardsPrevia>{cards.map((card) => <CardPrevia key={card.id} card={card} />)}{!cards.length && <Sub>Sem cards ativos.</Sub>}</CardsPrevia> : <>
        <Colunas>
          {(filhos("destaque").length > 0 || filhos("secundario").length > 0) && <div>
            {filhos("destaque").map((link) => <strong key={link.id}>{link.rotulo}</strong>)}
            {filhos("secundario").map((link) => <span key={link.id}>{link.rotulo}</span>)}
          </div>}
          {filhos("coluna").map((coluna) => <div key={coluna.id}><b>{coluna.rotulo}</b>{coluna.filhos.filter((link) => link.ativo).map((link) => <span key={link.id}>{link.rotulo}</span>)}</div>)}
          {!filhos("destaque").length && !filhos("coluna").length && <Sub>Sem destaques nem colunas ativas.</Sub>}
        </Colunas>
        {promo ? <PromoPrevia $tom={promo.tom}>{promo.imagem ? <img src={promo.imagem} alt="" /> : renderIcone(promo.icone, 28)}<div><strong>{promo.rotulo}</strong>{promo.descricao && <span>{promo.descricao}</span>}</div></PromoPrevia>
          : cards.length > 0 && <CardsPrevia $compacto>{cards.slice(0, 3).map((card) => <CardPrevia key={card.id} card={card} />)}</CardsPrevia>}
      </>}
    </Painel>)}
  </PreviaCaixa>;
}

function CardPrevia({ card }: { card: ItemMenuGestao }) {
  return <figure><Amostra $tom={card.tom} $grande>{card.imagem ? <img src={card.imagem} alt="" /> : renderIcone(card.icone, 26)}</Amostra><figcaption>{card.rotulo}</figcaption></figure>;
}

/* ---------- Edição ---------- */

function EditorItem({ edicao, tons, icones, onFechar, onSalvo }: { edicao: NonNullable<Edicao>; tons: string[]; icones: string[]; onFechar: () => void; onSalvo: (mensagem: string, criado?: ItemMenuGestao) => Promise<void> }) {
  const podeEditar = usePodeEditar();
  const { item: atual, secao, paiId, pai } = edicao;
  const [rotulo, setRotulo] = useState(atual?.rotulo ?? "");
  const [href, setHref] = useState(atual?.href ?? (pai && pai.secao !== "item" ? pai.href : pai?.href ?? "/"));
  const [descricao, setDescricao] = useState(atual?.descricao ?? "");
  const [imagem, setImagem] = useState(atual?.imagem ?? "");
  const [tom, setTom] = useState(atual?.tom || "linho");
  const [icone, setIcone] = useState(atual?.icone || "bebe");
  const [painel, setPainel] = useState<"colunas" | "cards">((atual?.painel || "colunas") as "colunas" | "cards");
  const [externo, setExterno] = useState(atual?.externo ?? false);
  const [destaque, setDestaque] = useState(atual?.destaque ?? false);
  const [soBotao, setSoBotao] = useState(atual?.soBotao ?? false);
  const [ativo, setAtivo] = useState(atual?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [tentou, setTentou] = useState(false);
  const linkValido = (href.startsWith("/") && !href.startsWith("//")) || /^https:\/\/[^\s/]+/.test(href);
  const erros = { rotulo: !rotulo.trim() ? "Informe o texto." : tamanho(rotulo.trim()) > 80 ? "Até 80 caracteres." : undefined, href: !linkValido ? "Use um caminho da loja (/kit-berco) ou um endereço https://." : undefined };
  const imagemValida = !imagem || (/^\/[A-Za-z0-9/_.-]+\.(webp|jpg|jpeg|png|avif)$/.test(imagem) && !imagem.includes(".."));
  const nomeSecao = SECOES[secao].rotulo;

  async function salvar() {
    setTentou(true);
    if (erros.rotulo || erros.href || !imagemValida || tamanho(descricao) > 300) return;
    setSalvando(true); setErro("");
    const corpo: EntradaItemMenu = {
      rotulo: rotulo.trim(), href: href.trim(), ativo,
      ...(secao === "item" ? { painel, destaque, soBotao } : {}),
      ...(["destaque", "secundario", "link"].includes(secao) ? { externo } : {}),
      ...(midia(secao) ? { tom, icone, imagem } : {}),
      ...(secao === "promo" ? { descricao: descricao.trim() } : {}),
    };
    try {
      if (atual) { await erpRequest(loja(`menu/${atual.id}`), { method: "PATCH", body: { revisao: atual.revisao, ...corpo } }); await onSalvo(`“${corpo.rotulo}” foi salvo.`); }
      else { const { item } = await erpRequest<{ item: ItemMenuGestao }>(loja("menu"), { method: "POST", body: { ...corpo, secao, paiId } }); await onSalvo(`${nomeSecao} “${corpo.rotulo}” criado.`, item); }
    } catch (caught) { setErro(conflito(caught) ? "Outra pessoa alterou este item. Feche, atualize e tente de novo." : requestError(caught)); }
    finally { setSalvando(false); }
  }

  return <Dialog open onClose={() => { if (!salvando) onFechar(); }} title={atual ? (podeEditar ? `Editar ${nomeSecao.toLowerCase()}` : atual.rotulo) : `Novo ${nomeSecao.toLowerCase()}${pai ? ` em “${pai.rotulo}”` : ""}`} width="38rem" height={midia(secao) ? "44rem" : undefined}
    description={SECOES[secao].descricao}
    footer={<><Button variant="ghost" disabled={salvando} onClick={onFechar}>{podeEditar ? "Cancelar" : "Fechar"}</Button>{podeEditar && <Button loading={salvando} onClick={() => void salvar()}>{atual ? "Salvar" : "Criar"}</Button>}</>}>
    <fieldset disabled={!podeEditar} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <Stack>
        {erro && <Notice role="alert">{erro}</Notice>}
        <FieldGrid>
          <TextField label={secao === "promo" || secao === "coluna" ? "Título" : "Texto"} value={rotulo} maxLength={80} error={tentou ? erros.rotulo : undefined} onChange={(event) => setRotulo(event.target.value)} />
          <TextField label="Link" value={href} maxLength={500} error={tentou ? erros.href : undefined} onChange={(event) => setHref(event.target.value.trim())} placeholder="/kit-berco" hint="Caminho da loja (/kit-berco/kits) ou https://…" />
        </FieldGrid>
        {secao === "promo" && <TextField label="Texto do bloco" multiline rows={2} value={descricao} maxLength={300} onChange={(event) => setDescricao(event.target.value)} />}
        {secao === "item" && <>
          <Select label="Tipo de painel" value={painel} onChange={setPainel} options={[
            { value: "colunas", label: "Colunas", description: "Destaques, colunas de links e o bloco editorial ou cards." },
            { value: "cards", label: "Cards", description: "Só uma grade de cards (não aceita colunas nem links)." },
          ]} hint={atual && painel === "cards" && atual.painel !== "cards" && atual.filhos.some((filho) => filho.secao !== "card") ? "Tire as colunas, links e o bloco editorial antes de trocar para cards." : undefined} />
          <ToggleRow title="Texto com brilho" description="Destaca o rótulo no cabeçalho (ex.: Presentes)." checked={destaque} onChange={setDestaque} disabled={!podeEditar} />
          <ToggleRow title="Só botão" description="O rótulo só abre o painel, sem levar a uma página." checked={soBotao} onChange={setSoBotao} disabled={!podeEditar} />
        </>}
        {["destaque", "secundario", "link"].includes(secao) && <ToggleRow title="Abre em outra aba" description="Para links de fora da loja (ex.: Instagram)." checked={externo} onChange={setExterno} disabled={!podeEditar} />}
        {midia(secao) && <>
          <FieldGrid>
            <Select label="Tom" value={tom} onChange={setTom} options={tons.map((valor) => ({ value: valor, label: TONS[valor]?.rotulo ?? valor, leading: <Amostra $tom={valor} aria-hidden /> }))} hint="Fundo da composição quando não há imagem." />
            <Select label="Ícone" searchable value={icone} onChange={setIcone} options={icones.map((valor) => ({ value: valor, label: ICONES[valor]?.rotulo ?? valor, leading: renderIcone(valor, 18) }))} />
          </FieldGrid>
          <CampoImagemLoja rotulo="Imagem (opcional)" valor={imagem} onChange={setImagem} disabled={!podeEditar} dica={secao === "card" ? "Foto 5:6 da pasta public/vitrine. Sem foto, vale a composição de tom e ícone." : "Foto 16:9 da pasta public/vitrine. Sem foto, vale a composição de tom e ícone."} />
          <Exemplo>{secao === "card" ? <CardPrevia card={{ ...(atual ?? ({} as ItemMenuGestao)), rotulo: rotulo || "Card", tom, icone, imagem: imagemValida ? imagem : "" }} />
            : <PromoPrevia $tom={tom}>{imagem && imagemValida ? <img src={imagem} alt="" /> : renderIcone(icone, 28)}<div><strong>{rotulo || "Título"}</strong>{descricao && <span>{descricao}</span>}</div></PromoPrevia>}</Exemplo>
        </>}
        <ToggleRow title="Ativo" description="Inativo, some da loja (fica guardado aqui)." checked={ativo} onChange={setAtivo} disabled={!podeEditar} />
      </Stack>
    </fieldset>
  </Dialog>;
}

/* ---------- Estilos ---------- */

const Acoes = styled.div`display: flex; flex-wrap: wrap; gap: ${({ theme }) => theme.spacing(2)};`;
const Titulo = styled.h3`display: flex; flex-direction: column; gap: 2px; font-size: ${({ theme }) => theme.fontSizes.sm}; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary};`;
const Grade = styled.div`
  display: grid;
  grid-template-columns: minmax(18rem, 26rem) minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing(4)};
  align-items: start;
  min-width: 0;

  ${({ theme }) => theme.media.xl} { grid-template-columns: minmax(0, 1fr); }
`;
const Cabeca = styled.div`display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: ${({ theme }) => theme.spacing(2)}; > div:first-of-type { display: flex; flex-direction: column; gap: 2px; min-width: 0; }`;
const Bloco = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  padding-top: ${({ theme }) => theme.spacing(3)};
  border-top: 1px dashed ${({ theme }) => theme.colors.border.subtle};

  h4 { font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; small { font-weight: 400; color: ${({ theme }) => theme.colors.text.muted}; } }
`;
const Links = styled.div`display: flex; flex-direction: column; align-items: flex-start; gap: ${({ theme }) => theme.spacing(1)}; margin: ${({ theme }) => theme.spacing(0, 0, 2, 6)}; padding-left: ${({ theme }) => theme.spacing(2)}; border-left: 1px dashed ${({ theme }) => theme.colors.border.subtle}; > ol { align-self: stretch; }`;

const Itens = styled.ol`
  display: flex;
  flex-direction: column;
  list-style: none;
  > li[data-arrastando] > div { opacity: 0.45; }
`;
const LinhaItem = styled("div", transientOptions)<{ $selecionado?: boolean; $inativo: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  min-height: 2.75rem;
  padding: ${({ theme }) => theme.spacing(1, 1.5)};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $selecionado }) => ($selecionado ? theme.colors.primary.subtle : "transparent")};

  &:hover { background-color: ${({ theme, $selecionado }) => ($selecionado ? theme.colors.primary.subtle : theme.colors.interactive.hover)}; }
  strong { font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme, $inativo }) => ($inativo ? theme.colors.text.muted : theme.colors.text.primary)}; }
`;
const Rotulo = styled.span`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 7rem;
  font-size: 0.8125rem;
  text-align: left;
  color: inherit;
`;
const RotuloBotao = Rotulo.withComponent("button");
const Selos = styled.span`display: flex; flex-wrap: wrap; justify-content: flex-end; gap: ${({ theme }) => theme.spacing(1)}; ${({ theme }) => theme.media.sm} { display: none; }`;

const Amostra = styled("span", transientOptions)<{ $tom: string; $grande?: boolean }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: ${({ $grande }) => ($grande ? "100%" : "1.75rem")};
  height: ${({ $grande }) => ($grande ? "auto" : "1.75rem")};
  aspect-ratio: ${({ $grande }) => ($grande ? "5 / 6" : "auto")};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.faint};
  border-radius: ${({ theme, $grande }) => ($grande ? theme.radii.md : theme.radii.sm)};
  background: ${({ $tom }) => TONS[$tom]?.fundo ?? TONS.linho.fundo};
  color: ${({ $tom }) => (TONS[$tom]?.escuro ? "rgba(255,255,255,0.85)" : "rgba(29,31,27,0.55)")};

  img { width: 100%; height: 100%; object-fit: cover; }
`;

const PreviaCaixa = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(3)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.colors.background.surface};
  min-width: 0;
`;
const Barra = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(1)};
  overflow-x: auto;
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  scrollbar-width: none;

  button {
    flex-shrink: 0;
    padding: ${({ theme }) => theme.spacing(1, 3)};
    border-radius: ${({ theme }) => theme.radii.full};
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.secondary};
    &[data-atual] { background-color: ${({ theme }) => theme.colors.primary.subtle}; color: ${({ theme }) => theme.colors.text.primary}; font-weight: ${({ theme }) => theme.fontWeights.medium}; }
    &[data-brilho] { color: ${({ theme }) => theme.colors.text.brand}; }
  }
`;
const Painel = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(4)};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  min-width: 0;

  &:has(> :only-child) { grid-template-columns: minmax(0, 1fr); }
  ${({ theme }) => theme.media.sm} { grid-template-columns: minmax(0, 1fr); }
`;
const Colunas = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: ${({ theme }) => theme.spacing(4)};
  font-size: 0.75rem;

  > div { display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(1)}; min-width: 0; color: ${({ theme }) => theme.colors.text.secondary}; }
  strong { font-size: 0.875rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; }
  b { font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; }
`;
const CardsPrevia = styled("div", transientOptions)<{ $compacto?: boolean }>`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${({ $compacto }) => ($compacto ? "4.5rem" : "6.5rem")}, 1fr));
  gap: ${({ theme }) => theme.spacing(2)};
  align-content: start;

  figure { display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(1)}; margin: 0; }
  figcaption { font-size: 0.6875rem; color: ${({ theme }) => theme.colors.text.secondary}; overflow-wrap: anywhere; }
`;
const PromoPrevia = styled("div", transientOptions)<{ $tom: string }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $tom }) => TONS[$tom]?.fundo ?? TONS.linho.fundo};
  color: ${({ $tom }) => (TONS[$tom]?.escuro ? "rgba(255,255,255,0.85)" : "rgba(29,31,27,0.55)")};

  img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  > div {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: ${({ theme }) => theme.spacing(2)};
    background: linear-gradient(to top, rgba(0,0,0,0.45), transparent);
    color: #fff;
    font-size: 0.6875rem;
    strong { font-size: 0.8125rem; }
  }
`;
const Exemplo = styled.div`max-width: 14rem; > figure { margin: 0; display: flex; flex-direction: column; gap: 4px; font-size: 0.75rem; }`;
