import { gerarMidia, respostaMidia } from "@/loja/lib/seo/midia/gerar";

export const alt = "Ateliê Milena Kerbage: enxoval e quarto de bebê feitos à mão";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

export default async function Image() {
  const jpeg = await gerarMidia(
    {
      tipo: "padrao",
      etiqueta: "Ateliê em Fortaleza",
      titulo: "Enxoval e quarto de bebê feitos à mão",
      subtitulo: "Kit berço, paninhos e maternidade em algodão e linho, com bordado e entrega para todo o Brasil.",
    },
    "og",
  );
  return respostaMidia(jpeg);
}
