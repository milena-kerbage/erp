import { fotosDoCatalogo, MolduraConta } from "@/loja/componentes/conta/MolduraConta";
import { PedidosEnviados } from "@/loja/componentes/conta/PedidosEnviados";
import { metadataPagina } from "@/loja/lib/seo/institucional";

export const metadata = metadataPagina({
  titulo: "Pedidos",
  descricao: "Os pedidos da sua conta, com a situação no ateliê, os detalhes e o botão para reenviar no WhatsApp.",
  caminho: "/conta/pedidos",
  indexar: false,
});

// Logada: os pedidos da conta (servidor). Deslogada: os enviados deste aparelho (localStorage).
export default function Pedidos() {
  return (
    <MolduraConta trilha={[{ rotulo: "Pedidos", href: "/conta/pedidos" }]}>
      <PedidosEnviados fotos={fotosDoCatalogo()} />
    </MolduraConta>
  );
}
