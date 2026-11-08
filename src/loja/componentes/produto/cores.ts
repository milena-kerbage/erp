import { css } from "styled-system/css";

// Preenchimento das bolinhas de cor (tokens tecido.*), usado na página de produto e no card da listagem.
const CORES: Record<string, string> = {
  Rosê: css({ bg: "tecido.rose" }),
  "Azul bebê": css({ bg: "tecido.azulBebe" }),
  "Verde-sálvia": css({ bg: "tecido.salvia" }),
  Cru: css({ bg: "tecido.cru" }),
  Cinza: css({ bg: "tecido.cinza" }),
  Branco: css({ bg: "tecido.branco" }),
};

const PADRAO = css({ bg: "placeholderForte" });

export function classeDaCor(rotulo: string): string {
  return CORES[rotulo] ?? PADRAO;
}
