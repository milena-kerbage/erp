import { css } from "styled-system/css";
import { FavoritosAparelho } from "@/loja/componentes/conta/FavoritosAparelho";
import { MolduraConta } from "@/loja/componentes/conta/MolduraConta";
import { catalogoDaSacola } from "@/lib/loja/catalogo";
import { metadataPagina } from "@/loja/lib/seo/institucional";

export const metadata = metadataPagina({
  titulo: "Favoritos",
  descricao: "As peças que você salvou nos favoritos neste aparelho, para mover para a sacola quando quiser.",
  caminho: "/conta/favoritos",
  indexar: false,
});

export default async function Favoritos() {
  return (
    <MolduraConta trilha={[{ rotulo: "Favoritos", href: "/conta/favoritos" }]}>
      <div className={css({ mt: { base: "8", desktop: "12" } })}>
        <FavoritosAparelho catalogo={await catalogoDaSacola()} />
      </div>
    </MolduraConta>
  );
}
