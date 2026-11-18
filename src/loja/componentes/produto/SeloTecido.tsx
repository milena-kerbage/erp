import { css } from "styled-system/css";
import type { Produto } from "@/loja/lib/catalogo/exemplos";

// Selo discreto no canto superior esquerdo da foto dos cards (listagem e carrosséis) com o tecido da
// peça: "Percal 230 fios" ou "400 fios egípcios", que é o que a cliente pergunta primeiro. Sai do
// atributo `tecido` do produto (o primeiro valor com "fios"); sem fio informado, não aparece.
export function tecidoDoCard(produto: Pick<Produto, "atributos">): string | undefined {
  return produto.atributos.tecido?.find((valor) => /fios/i.test(valor));
}

export function SeloTecido({ tecido }: { tecido: string }) {
  return <span className={selo}>{tecido}</span>;
}

const selo = css({
  position: "absolute",
  top: "3",
  left: "3",
  display: "inline-flex",
  alignItems: "center",
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
