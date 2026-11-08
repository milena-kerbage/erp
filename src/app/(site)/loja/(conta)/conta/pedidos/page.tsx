import { fotosDoCatalogo, MolduraConta } from "@/loja/componentes/conta/MolduraConta";
import { PedidosEnviados } from "@/loja/componentes/conta/PedidosEnviados";
import { metadataPagina } from "@/loja/lib/seo/institucional";

export const metadata = metadataPagina({
  titulo: "Pedidos enviados",
  descricao: "Os pedidos que você enviou pelo WhatsApp a partir deste aparelho, com os detalhes e o botão para reenviar.",
  caminho: "/conta/pedidos",
  indexar: false,
});

// Lista do navegador (localStorage, gravada pelo checkout ao enviar o pedido): não há pedido no servidor.
export default function Pedidos() {
  return (
    <MolduraConta trilha={[{ rotulo: "Pedidos enviados", href: "/conta/pedidos" }]}>
      <PedidosEnviados fotos={fotosDoCatalogo()} />
    </MolduraConta>
  );
}
