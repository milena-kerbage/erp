"use client";

import { type FormEvent, type ReactNode, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { CaretDown, CheckCircle, Tag } from "@/loja/componentes/icones";
import { useTopoFixo } from "@/loja/componentes/produto/LateralFixa";
import type { ContaDoCupom } from "@/loja/componentes/conta/cupomSacola";
import { CUPONS, type Cupom, decimal } from "@/loja/lib/carrinho/totais";
import { CUPOM_GENERICO_PRIMEIRA, cupomDeBoasVindas, escolherCupom } from "@/loja/lib/contas/regras";
import { formatarPreco } from "@/loja/lib/formatacao/moeda";

export const reais = (valorCentavos: number) => formatarPreco(decimal(valorCentavos));

// Resumo em cartão cinza fixo ao rolar (Adidas): gruda em `topo` px; se for mais alto que a tela,
// pela base (useTopoFixo, o mesmo da página de produto). Seleção de projetos.
export function ResumoFixo({ topo, className, children }: { topo: number; className?: string; children: ReactNode }) {
  const elemento = useRef<HTMLElement>(null);
  const top = useTopoFixo(elemento, topo);
  return (
    <aside ref={elemento} id="resumo" aria-labelledby="titulo-resumo" className={cx(resumo, className)} style={{ top }}>
      {children}
    </aside>
  );
}

export function Valor({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={css({ display: "flex", justifyContent: "space-between", gap: "3" })}>
      <dt className={css({ color: "texto" })}>{rotulo}</dt>
      <dd className={css({ color: destaque ? "sucesso" : "escuro", whiteSpace: "nowrap" })}>{valor}</dd>
    </div>
  );
}

// Cupom embutido no resumo: fechado, é uma linha; aberto, lista os cupons da loja para escolher
// com um toque (os que ainda não valem mostram quanto falta) e aceita outro código.
// Com conta, o cupom de primeira compra da cliente (BEMVINDA-XXXX) aparece em primeiro; um cupom por
// pedido (escolherCupom, a mesma regra do servidor): os cupons não se somam.
// [CONFIRMAR] com o comercial quais cupons podem aparecer na lista (só os públicos).
export function SeletorCupom({
  cupom,
  subtotal,
  desconto,
  aoMudar,
  conta = { pronta: false, logada: false, cupom: null },
  abertoInicial = false,
}: {
  cupom?: Cupom;
  subtotal: number;
  desconto: number;
  aoMudar: (codigo?: string, aviso?: string) => void;
  conta?: ContaDoCupom;
  abertoInicial?: boolean; // já abre com a lista (diálogo de cupom da sacola)
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");

  function aplicar(valor: string) {
    const resultado = escolherCupom(valor, subtotal, conta);
    if (resultado.tipo === "invalido") return setErro(resultado.mensagem);
    if (resultado.tipo === "minimo")
      return setErro(`Faltam ${reais(resultado.cupom.minimoCentavos - subtotal)} em produtos para usar ${resultado.cupom.codigo}.`);
    setErro("");
    setCodigo("");
    setAberto(false);
    aoMudar(resultado.cupom.codigo, resultado.aviso);
  }
  const opcoes = [
    ...(conta.logada && conta.cupom && !conta.cupom.usado ? [cupomDeBoasVindas(conta.cupom.codigo)] : []),
    ...CUPONS.filter((item) => !(conta.logada && item.codigo === CUPOM_GENERICO_PRIMEIRA)),
  ];

  if (cupom) {
    const valendo = desconto > 0;
    return (
      <div className={caixa}>
        <div className={css({ display: "flex", alignItems: "center", gap: "3", px: "4", py: "3" })}>
          <Tag size={20} aria-hidden className={css({ flexShrink: "0", color: valendo ? "sucesso" : "textoSuave" })} />
          <p className={css({ flex: "1", minW: "0", fontSize: "sm" })}>
            <strong className={css({ color: "escuro" })}>{cupom.codigo}</strong>
            <span className={css({ display: "block", color: "textoSuave" })}>{cupom.descricao}</span>
          </p>
          <button type="button" onClick={() => aoMudar(undefined)} className={linkSublinhado}>
            Remover
          </button>
        </div>
        {!valendo && (
          <p role="status" className={css({ px: "4", pb: "3", fontSize: "sm", color: "erro" })}>
            Faltam {reais(cupom.minimoCentavos - subtotal)} em produtos para o cupom valer.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={caixa}>
      <button type="button" aria-expanded={aberto} aria-controls="painel-cupom" onClick={() => setAberto(!aberto)} className={gatilho}>
        <Tag size={20} aria-hidden />
        <span className={css({ flex: "1", textAlign: "left" })}>Cupom de desconto</span>
        <CaretDown
          size={16}
          aria-hidden
          className={css({ transition: "transform", _expanded: { transform: "rotate(180deg)" } })}
          data-expanded={aberto || undefined}
        />
      </button>
      {aberto && (
        <div id="painel-cupom" className={css({ display: "grid", gap: "3", px: "4", pb: "4" })}>
          <ul className={css({ display: "grid", gap: "2" })}>
            {opcoes.map((item) => {
              const falta = item.minimoCentavos - subtotal;
              return (
                <li key={item.codigo}>
                  <button type="button" disabled={falta > 0} onClick={() => aplicar(item.codigo)} className={opcaoCupom}>
                    <span className={css({ minW: "0", textAlign: "left" })}>
                      <strong className={css({ display: "block", color: "escuro", letterSpacing: "wide" })}>{item.codigo}</strong>
                      <span className={css({ display: "block", fontSize: "xs", color: "textoSuave" })}>{item.descricao}</span>
                    </span>
                    <span
                      className={css({
                        flexShrink: "0",
                        fontSize: "sm",
                        fontWeight: "semibold",
                        color: falta > 0 ? "textoSuave" : "escuro",
                      })}
                    >
                      {falta > 0 ? `Faltam ${reais(falta)}` : "Aplicar"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <form
            onSubmit={(evento: FormEvent<HTMLFormElement>) => {
              evento.preventDefault();
              aplicar(codigo);
            }}
            className={css({ display: "flex", gap: "2" })}
          >
            <label htmlFor="cupom" className={css({ srOnly: true })}>
              Outro código de cupom
            </label>
            <input
              id="cupom"
              value={codigo}
              onChange={(evento) => setCodigo(evento.target.value.toUpperCase())}
              placeholder="Outro código"
              autoComplete="off"
              className={campo}
            />
            <button type="submit" disabled={!codigo.trim()} className={botao({ variante: "escuro", tamanho: "p" })}>
              Aplicar
            </button>
          </form>
          {erro && (
            <p role="alert" className={css({ fontSize: "sm", color: "erro" })}>
              {erro}
            </p>
          )}
          <p className={css({ display: "flex", alignItems: "center", gap: "1.5", fontSize: "xs", color: "textoSuave" })}>
            <CheckCircle size={14} aria-hidden /> Um cupom por pedido: os cupons não se somam.
          </p>
        </div>
      )}
    </div>
  );
}

const resumo = css({ position: { lg: "sticky" }, p: { base: "6", lg: "7" }, borderRadius: "bloco", bg: "superficieSuave" });

const caixa = css({ mt: "5", borderRadius: "md", bg: "fundo" });

const gatilho = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  w: "full",
  h: "12",
  px: "4",
  fontSize: "md",
  fontWeight: "medium",
  color: "escuro",
  cursor: "pointer",
});

const opcaoCupom = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  w: "full",
  px: "3",
  py: "2.5",
  borderRadius: "sm",
  borderWidth: "1px",
  borderStyle: "dashed",
  borderColor: "borda",
  cursor: "pointer",
  _hover: { borderColor: "escuro" },
  _disabled: { cursor: "not-allowed", opacity: "0.7", _hover: { borderColor: "borda" } },
});

const campo = css({
  flex: "1",
  minW: "0",
  h: "9",
  px: "3",
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "campo",
  fontSize: "sm",
  letterSpacing: "wide",
  color: "escuro",
  _placeholder: { color: "textoSuave", letterSpacing: "normal" },
  _focusVisible: { borderColor: "escuro", outline: "none" },
});

const linkSublinhado = css({
  fontSize: "sm",
  fontWeight: "medium",
  color: "escuro",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  cursor: "pointer",
});
