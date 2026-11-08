import { css, cx } from "styled-system/css";
import { Check } from "@/loja/componentes/icones";
import { ETAPAS_ENTREGA, etapasConcluidas, STATUS_PEDIDO, type StatusPedido } from "@/loja/lib/contas/regras";

// Etapas de entrega do pedido (Minha conta › Pedido): confirmação do pagamento → despachado para a
// transportadora → entregue. Concluídas com o check sálvia; a próxima em destaque; cancelado: só o selo.
export function LinhaDoTempo({ status }: { status: StatusPedido }) {
  const feitas = etapasConcluidas(status);
  if (feitas === null) return <p className={seloCancelado}>{STATUS_PEDIDO.cancelado}</p>;
  return (
    <ol aria-label="Etapas do pedido" className={lista}>
      {ETAPAS_ENTREGA.map((etapa, indice) => {
        const situacao = indice < feitas ? "feita" : indice === feitas ? "atual" : "proxima";
        return (
          <li key={etapa.status} data-situacao={situacao} className={item}>
            <span aria-hidden className={marco}>
              {situacao === "feita" ? <Check size={14} weight="bold" /> : indice + 1}
            </span>
            <span className={css({ minW: "0" })}>
              <span className={cx(rotulo)}>{etapa.rotulo}</span>
              <span className={css({ srOnly: true })}>{situacao === "feita" ? " (concluída)" : situacao === "atual" ? " (próxima etapa)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const lista = css({ display: "grid", gridTemplateColumns: { base: "minmax(0, 1fr)", md: "repeat(3, minmax(0, 1fr))" }, gap: { base: "3", md: "2" }, mt: "6", maxW: "[760px]" });

const item = css({
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "3",
  fontSize: "sm",
  color: "textoSuave",
  // Traço entre as etapas (horizontal a partir de 768), sálvia quando a etapa já foi feita.
  md: { flexDirection: "column", alignItems: "flex-start", gap: "2", pr: "4" },
  _after: { md: { content: '""', position: "absolute", top: "[13px]", left: "9", right: "2", h: "[2px]", bg: "borda" } },
  "&:last-child::after": { display: "none" },
  "&[data-situacao=feita]::after": { bg: "marca" },
  "&[data-situacao=feita], &[data-situacao=atual]": { color: "escuro" },
});

const marco = css({
  display: "inline-flex",
  flexShrink: "0",
  alignItems: "center",
  justifyContent: "center",
  w: "7",
  h: "7",
  borderRadius: "pilula",
  borderWidth: "2px",
  borderColor: "borda",
  bg: "superficie",
  fontSize: "xs",
  fontWeight: "semibold",
  "[data-situacao=feita] > &": { bg: "marca", borderColor: "marca", color: "sobreDestaque" },
  "[data-situacao=atual] > &": { borderColor: "marca", color: "marca", boxShadow: "[0 0 0 4px token(colors.marcaSuave)]" },
});

const rotulo = css({ "[data-situacao=atual] &": { fontWeight: "medium" } });

const seloCancelado = css({ display: "inline-flex", mt: "6", px: "3", py: "1", borderRadius: "pilula", bg: "alertaSuave", fontSize: "sm", fontWeight: "medium", color: "erro" });
