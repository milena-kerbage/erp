import { fotosDoCatalogo, MolduraConta } from "@/loja/componentes/conta/MolduraConta";
import { VisaoGeralConta } from "@/loja/componentes/conta/VisaoGeralConta";
import { catalogoParaCarrinho } from "@/loja/lib/carrinho/catalogo";
import { metadataPagina } from "@/loja/lib/seo/institucional";

export const metadata = metadataPagina({
  titulo: "Minha conta",
  descricao: "Sua conta na loja do Ateliê Milena Kerbage: pedidos, cupom de primeira compra, favoritos e dados.",
  caminho: "/conta",
  indexar: false,
});

export default function MinhaConta() {
  return (
    <MolduraConta>
      <VisaoGeralConta catalogo={catalogoParaCarrinho()} fotos={fotosDoCatalogo()} />
    </MolduraConta>
  );
}
