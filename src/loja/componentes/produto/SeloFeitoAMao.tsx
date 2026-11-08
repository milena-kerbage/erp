import { css } from "styled-system/css";
import { Needle } from "@/loja/componentes/icones";

// Selo discreto "Feito à mão" no canto superior esquerdo da foto dos cards (listagem e carrosséis),
// só nas peças sob encomenda, que o ateliê costura depois do pedido. Não aparece quando a cor escolhida
// no card é de pronta entrega (o selo de baixo já diz isso). Pílula linho translúcida, texto escuro.
export function temSeloFeitoAMao(feitoAMao: boolean | undefined, selo: string | undefined): boolean {
  return Boolean(feitoAMao) && !/pronta/i.test(selo ?? "");
}

export function SeloFeitoAMao() {
  return (
    <span className={selo}>
      <Needle size={12} aria-hidden />
      Feito à mão
    </span>
  );
}

const selo = css({
  position: "absolute",
  top: "3",
  left: "3",
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
  px: "2",
  py: "0.5",
  borderRadius: "pilula",
  bg: "controleClaro",
  fontSize: "xs",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "marcaContraste",
  pointerEvents: "none",
});
