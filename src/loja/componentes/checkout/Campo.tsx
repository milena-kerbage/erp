"use client";

import {
  type ChangeEvent,
  Children,
  type InputHTMLAttributes,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { css, cx } from "styled-system/css";
import { CaretDown, Check, MagnifyingGlass } from "@/loja/componentes/icones";
import { alca, folha, linha, superficie, useFlutuante, veu } from "@/loja/componentes/layout/Dropdown";

// Campos do pedido: rótulo sempre visível em cima (nada de placeholder no lugar do rótulo),
// erro em vermelho ligado ao campo por aria-describedby, e o mesmo visual do resto da loja.
type Comum = { id: string; rotulo: string; erro?: string; dica?: ReactNode; className?: string };

export function Campo({ id, rotulo, erro, dica, className, ...input }: Comum & InputHTMLAttributes<HTMLInputElement>) {
  const descricao = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  return (
    <div className={cx(css({ display: "grid", gap: "1.5", alignContent: "start" }), className)}>
      <label htmlFor={id} className={rotuloEstilo}>
        {rotulo}
        {!input.required && <span className={css({ fontWeight: "normal", color: "textoSuave" })}> (opcional)</span>}
      </label>
      <input id={id} aria-invalid={erro ? true : undefined} aria-describedby={descricao} className={campo} {...input} />
      <Mensagem id={id} erro={erro} dica={dica} />
    </div>
  );
}

// Seleção no padrão dos dropdowns da loja (layout/Dropdown.tsx, que segue o Select do ERP): o campo
// abre uma lista junto a ele (folha da base no celular), com o escolhido marcado, setas/Home/End,
// Enter escolhe, Esc fecha e devolve o foco, e busca quando há mais de 7 opções. A API é a do
// <select>: filhos <option> e `onChange(evento)` com `evento.target.value`, então as telas que já
// usavam o nativo não mudam. Vai para o <body> por portal: não usar dentro de <dialog> modal (o
// diálogo fica na camada superior e cobriria a lista).
export function Selecao({
  id,
  rotulo,
  erro,
  dica,
  className,
  children,
  value,
  onChange,
  disabled,
  name,
  required,
}: Comum & SelectHTMLAttributes<HTMLSelectElement>) {
  const descricao = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  const opcoes = useMemo(() => opcoesDe(children), [children]);
  const valor = value == null ? "" : String(value);
  const escolhida = opcoes.find((opcao) => opcao.valor === valor);
  const vazia = !escolhida || (escolhida.valor === "" && /^[—–-]?$/.test(escolhida.rotulo.trim()));

  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState(0);
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const campoBusca = useRef<HTMLInputElement>(null);
  const listaItens = useRef<HTMLUListElement>(null);
  const { posicao, celular } = useFlutuante(aberta, botao, lista, "gatilho");
  const comBusca = opcoes.length > 7;

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    return termo ? opcoes.filter((opcao) => normalizar(opcao.rotulo).includes(termo)) : opcoes;
  }, [opcoes, busca]);

  const fechar = useCallback((devolverFoco = false) => {
    setAberta(false);
    if (devolverFoco) botao.current?.focus();
  }, []);

  // Ao abrir: limpa a busca, destaca o escolhido e foca a busca ou a lista.
  const pronta = aberta && posicao !== null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: só no momento em que abre
  useEffect(() => {
    if (!pronta) return;
    setBusca("");
    setAtivo(Math.max(0, opcoes.findIndex((opcao) => opcao.valor === valor)));
    (comBusca ? campoBusca.current : listaItens.current)?.focus({ preventScroll: true });
  }, [pronta]);

  // O destacado fica sempre à vista ao navegar pelo teclado.
  useEffect(() => {
    if (pronta) document.getElementById(`${id}-opcao-${ativo}`)?.scrollIntoView({ block: "nearest" });
  }, [ativo, pronta, id]);

  useEffect(() => {
    if (!aberta) return;
    const fora = (evento: PointerEvent) => {
      const alvo = evento.target as Node;
      if (!lista.current?.contains(alvo) && !botao.current?.contains(alvo)) fechar();
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberta, fechar]);

  function escolher(opcao: OpcaoSelecao | undefined) {
    if (!opcao || opcao.desabilitada) return;
    // Mesmo formato do evento do <select>: quem usa lê `evento.target.value`.
    if (opcao.valor !== valor) onChange?.({ target: { value: opcao.valor, name }, currentTarget: { value: opcao.valor, name } } as unknown as ChangeEvent<HTMLSelectElement>);
    fechar(true);
  }

  function mover(passo: 1 | -1 | "inicio" | "fim") {
    const habilitados = visiveis.map((opcao, indice) => (opcao.desabilitada ? -1 : indice)).filter((indice) => indice >= 0);
    if (habilitados.length === 0) return;
    if (passo === "inicio") return setAtivo(habilitados[0] ?? 0);
    if (passo === "fim") return setAtivo(habilitados[habilitados.length - 1] ?? 0);
    const atual = habilitados.indexOf(ativo);
    setAtivo(atual === -1 ? (habilitados[0] ?? 0) : (habilitados[(atual + passo + habilitados.length) % habilitados.length] ?? 0));
  }

  function teclaNaLista(evento: KeyboardEvent<HTMLElement>) {
    const naBusca = evento.currentTarget === campoBusca.current;
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      mover(evento.key === "ArrowDown" ? 1 : -1);
    } else if ((evento.key === "Home" || evento.key === "End") && !naBusca) {
      evento.preventDefault();
      mover(evento.key === "Home" ? "inicio" : "fim");
    } else if (evento.key === "Enter" || (evento.key === " " && !naBusca)) {
      evento.preventDefault();
      escolher(visiveis[ativo]);
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      fechar(true);
    } else if (evento.key === "Tab") fechar();
  }

  function teclaNoCampo(evento: KeyboardEvent<HTMLButtonElement>) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(evento.key)) {
      evento.preventDefault();
      setAberta(true);
    }
  }

  const idAtivo = visiveis[ativo] ? `${id}-opcao-${ativo}` : undefined;

  return (
    <div className={cx(css({ display: "grid", gap: "1.5", alignContent: "start" }), className)}>
      <label
        id={`${id}-rotulo`}
        htmlFor={id}
        className={rotuloEstilo}
        onClick={(evento) => {
          evento.preventDefault();
          botao.current?.focus();
        }}
      >
        {rotulo}
      </label>
      <button
        ref={botao}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberta}
        aria-controls={aberta ? `${id}-lista` : undefined}
        aria-labelledby={`${id}-rotulo ${id}`}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => setAberta(!aberta)}
        onKeyDown={teclaNoCampo}
        className={cx(campo, gatilhoSelecao)}
      >
        <span className={cx(css({ flex: "1", minW: "0", truncate: true }), vazia && css({ color: "textoSuave" }))}>
          {vazia ? "Selecionar" : escolhida?.rotulo}
        </span>
        <CaretDown size={16} aria-hidden className={setaSelecao} />
      </button>
      {name && <input type="hidden" name={name} value={valor} />}
      <Mensagem id={id} erro={erro} dica={dica} />
      {aberta &&
        createPortal(
          <>
            {celular && <div aria-hidden className={veu} onPointerDown={() => fechar()} />}
            <div
              ref={lista}
              data-lado={posicao?.lado}
              className={cx(superficie, celular && folha)}
              style={
                celular
                  ? undefined
                  : { top: posicao?.top ?? 0, left: posicao?.left ?? 0, width: posicao?.largura, visibility: posicao ? "visible" : "hidden", transformOrigin: posicao?.lado === "cima" ? "bottom left" : "top left" }
              }
            >
              {celular && <span aria-hidden className={alca} />}
              {celular && <p className={tituloLista}>{rotulo}</p>}
              {comBusca && (
                <div className={linhaBusca}>
                  <MagnifyingGlass size={16} aria-hidden />
                  <input
                    ref={campoBusca}
                    type="search"
                    value={busca}
                    placeholder="Buscar..."
                    aria-label={`Buscar em ${rotulo}`}
                    aria-controls={`${id}-lista`}
                    aria-activedescendant={idAtivo}
                    autoComplete="off"
                    onChange={(evento) => {
                      setBusca(evento.target.value);
                      setAtivo(0);
                    }}
                    onKeyDown={teclaNaLista}
                    className={entradaBusca}
                  />
                </div>
              )}
              <ul
                ref={listaItens}
                id={`${id}-lista`}
                role="listbox"
                aria-labelledby={`${id}-rotulo`}
                aria-activedescendant={comBusca ? undefined : idAtivo}
                tabIndex={-1}
                onKeyDown={teclaNaLista}
                className={css({ display: "grid", outline: "none" })}
              >
                {visiveis.length === 0 && <li className={vazioLista}>Nada encontrado</li>}
                {visiveis.map((opcao, indice) => {
                  const selecionada = opcao.valor === valor;
                  return (
                    <li
                      key={`${opcao.valor}-${indice}`}
                      id={`${id}-opcao-${indice}`}
                      role="option"
                      aria-selected={selecionada}
                      aria-disabled={opcao.desabilitada || undefined}
                      data-ativo={indice === ativo || undefined}
                      onPointerMove={() => indice !== ativo && setAtivo(indice)}
                      onPointerDown={(evento) => evento.preventDefault()}
                      onClick={() => escolher(opcao)}
                      className={cx(linha, opcaoLista)}
                    >
                      <span className={css({ flex: "1", minW: "0", truncate: true })}>{opcao.rotulo}</span>
                      {selecionada && <Check size={16} weight="bold" aria-hidden className={css({ flexShrink: "0", color: "marca" })} />}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

type OpcaoSelecao = { valor: string; rotulo: string; desabilitada?: boolean };

// Lê os <option> dos filhos (também dentro de arrays e fragmentos), como o <select> faria.
function opcoesDe(filhos: ReactNode): OpcaoSelecao[] {
  const opcoes: OpcaoSelecao[] = [];
  const visitar = (no: ReactNode) => {
    Children.forEach(no, (filho) => {
      if (!isValidElement<{ value?: unknown; children?: ReactNode; disabled?: boolean }>(filho)) return;
      if (filho.type === "option") {
        const rotulo = textoDe(filho.props.children);
        opcoes.push({ valor: filho.props.value == null ? rotulo : String(filho.props.value), rotulo, desabilitada: filho.props.disabled });
      } else visitar(filho.props.children);
    });
  };
  visitar(filhos);
  return opcoes;
}

function textoDe(no: ReactNode): string {
  if (no == null || typeof no === "boolean") return "";
  if (typeof no === "string" || typeof no === "number") return String(no);
  if (Array.isArray(no)) return no.map(textoDe).join("");
  if (isValidElement<{ children?: ReactNode }>(no)) return textoDe(no.props.children);
  return "";
}

const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const gatilhoSelecao = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  textAlign: "left",
  cursor: "pointer",
  "&[aria-expanded=true]": { borderColor: "escuro" },
  "&[aria-expanded=true] > svg": { transform: "rotate(180deg)" },
  _disabled: { cursor: "default" },
});

const setaSelecao = css({ flexShrink: "0", color: "textoSuave", transitionProperty: "transform", transitionDuration: "rapida" });

const tituloLista = css({ px: "2.5", pb: "2", fontSize: "md", fontWeight: "medium", color: "escuro" });

const linhaBusca = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  flexShrink: "0",
  h: "10",
  px: "2.5",
  mx: "-1.5",
  mt: "-1.5",
  mb: "1.5",
  borderBottomWidth: "1px",
  borderColor: "borda",
  color: "textoSuave",
});

const entradaBusca = css({ flex: "1", minW: "0", h: "full", bg: "transparent", fontSize: "sm", color: "escuro", outline: "none", _placeholder: { color: "textoSuave" }, "&::-webkit-search-cancel-button": { display: "none" } });

const opcaoLista = css({ "&[data-ativo=true]": { bg: "fundoSutil" }, "&[aria-selected=true]": { fontWeight: "medium" } });

const vazioLista = css({ px: "2.5", py: "3", fontSize: "sm", color: "textoSuave" });

export function Marcacao({ id, children, ...input }: { id: string; children: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      htmlFor={id}
      className={css({ display: "flex", alignItems: "flex-start", gap: "2.5", fontSize: "sm", color: "texto", cursor: "pointer" })}
    >
      <input id={id} type="checkbox" className={caixa} {...input} />
      <span>{children}</span>
    </label>
  );
}

function Mensagem({ id, erro, dica }: { id: string; erro?: string; dica?: ReactNode }) {
  if (erro)
    return (
      <p id={`${id}-erro`} className={css({ fontSize: "sm", color: "erro" })}>
        {erro}
      </p>
    );
  if (dica)
    return (
      <p id={`${id}-dica`} className={css({ fontSize: "sm", color: "textoSuave" })}>
        {dica}
      </p>
    );
  return null;
}

const rotuloEstilo = css({ fontSize: "sm", fontWeight: "semibold", color: "escuro" });

const campo = css({
  w: "full",
  h: "12",
  px: "4",
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "campo",
  bg: "fundo",
  fontSize: "md",
  color: "escuro",
  _placeholder: { color: "textoSuave" },
  _focusVisible: { borderColor: "escuro", outline: "none", boxShadow: "[0 0 0 1px token(colors.escuro)]" },
  _disabled: { bg: "fundoSutil", color: "textoSuave" },
  "&[aria-invalid=true]": { borderColor: "erro" },
});

const caixa = css({ flexShrink: "0", w: "5", h: "5", mt: "[1px]", accentColor: "[token(colors.escuro)]", cursor: "pointer" });

export function AreaTexto({ id, rotulo, erro, dica, className, ...area }: Comum & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const descricao = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  return (
    <div className={cx(css({ display: "grid", gap: "1.5", alignContent: "start" }), className)}>
      <label htmlFor={id} className={rotuloEstilo}>
        {rotulo}
        {!area.required && <span className={css({ fontWeight: "normal", color: "textoSuave" })}> (opcional)</span>}
      </label>
      <textarea
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao}
        className={cx(campo, css({ h: "auto", minH: "24", py: "3", resize: "vertical" }))}
        {...area}
      />
      <Mensagem id={id} erro={erro} dica={dica} />
    </div>
  );
}
