import type { ReactNode } from "react";
import { css, cx } from "styled-system/css";
import { Gift } from "@/loja/componentes/icones";
import { PERCENTUAL_BOAS_VINDAS } from "@/loja/lib/contas/regras";

// Convite do cupom de boas-vindas ("Crie sua conta e ganhe 5% OFF na primeira compra"), na pele da
// loja: fundo linho, rubrica sálvia e o presente. `cartao` (Minha conta e pedido) ou `faixa` (sacola).
export function ConviteCupom({
  variante = "cartao",
  titulo = `Crie sua conta e ganhe ${PERCENTUAL_BOAS_VINDAS}% OFF na primeira compra`,
  children,
  acao,
  className,
}: {
  variante?: "cartao" | "faixa";
  titulo?: string;
  children?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <aside aria-label="Cupom de boas-vindas" className={cx(variante === "faixa" ? faixa : cartao, className)}>
      <span aria-hidden className={icone}>
        <Gift size={variante === "faixa" ? 20 : 24} />
      </span>
      <div className={css({ minW: "0", flex: "1" })}>
        {variante === "cartao" && <p className={rubrica}>Presente do ateliê</p>}
        <p className={css({ fontSize: variante === "faixa" ? "sm" : "md", fontWeight: "medium", lineHeight: "texto", color: "escuro" })}>{titulo}</p>
        {children && <div className={css({ mt: "1", fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>{children}</div>}
      </div>
      {acao && <div className={css({ flexShrink: "0", alignSelf: { base: "stretch", md: "center" } })}>{acao}</div>}
    </aside>
  );
}

const base = {
  display: "flex",
  gap: "3",
  alignItems: "flex-start",
  bg: "linho",
  borderRadius: "cartao",
  borderWidth: "1px",
  borderColor: "marcaSuave",
} as const;

const cartao = css({ ...base, flexDirection: { base: "column", md: "row" }, p: { base: "4", md: "5" }, gap: "4" });
const faixa = css({ ...base, flexWrap: "wrap", px: "4", py: "3", alignItems: "center" });

const icone = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  w: "10",
  h: "10",
  borderRadius: "pilula",
  bg: "superficie",
  color: "marca",
});

const rubrica = css({ mb: "1", fontSize: "xs", fontWeight: "medium", letterSpacing: "rubrica", textTransform: "uppercase", color: "marca" });
