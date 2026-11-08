import { fotosDoCatalogo, MolduraConta } from "@/loja/componentes/conta/MolduraConta";
import { VisaoGeralConta } from "@/loja/componentes/conta/VisaoGeralConta";
import { catalogoParaCarrinho } from "@/loja/lib/carrinho/catalogo";
import { metadataPagina } from "@/loja/lib/seo/institucional";

export const metadata = metadataPagina({
  titulo: "Minha conta",
  descricao: "Seus favoritos e os pedidos que você enviou pelo WhatsApp a partir deste aparelho, sem cadastro nem login.",
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
