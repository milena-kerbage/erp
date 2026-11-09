import { fotosDoCatalogo, MolduraConta } from "@/loja/componentes/conta/MolduraConta";
import { VisaoGeralConta } from "@/loja/componentes/conta/VisaoGeralConta";
import { catalogoDaSacola } from "@/lib/loja/catalogo";
import { metadataPagina } from "@/loja/lib/seo/institucional";

export const metadata = metadataPagina({
  titulo: "Minha conta",
  descricao: "Sua conta na loja do Ateliê Milena Kerbage: pedidos, cupom de primeira compra, favoritos e dados.",
  caminho: "/conta",
  indexar: false,
});

export default async function MinhaConta() {
  return (
    <MolduraConta>
      <VisaoGeralConta catalogo={await catalogoDaSacola()} fotos={await fotosDoCatalogo()} />
    </MolduraConta>
  );
}
