import type { Metadata } from "next";
import { DetalhePedidoEnviado } from "@/loja/componentes/conta/DetalhePedidoEnviado";
import { fotosDoCatalogo, MolduraConta } from "@/loja/componentes/conta/MolduraConta";
import { metadataPagina } from "@/loja/lib/seo/institucional";

// Detalhe de um pedido enviado deste aparelho. O número só existe no navegador da cliente: o
// servidor entrega a moldura e o componente lê o pedido do localStorage.
export async function generateMetadata({ params }: PageProps<"/loja/conta/pedidos/[numero]">): Promise<Metadata> {
  const numero = numeroDe((await params).numero);
  return metadataPagina({
    titulo: `Pedido ${numero}`,
    descricao: "Detalhes do pedido enviado pelo WhatsApp a partir deste aparelho.",
    caminho: `/conta/pedidos/${numero}`,
    indexar: false,
  });
}

function numeroDe(bruto: string): string {
  let numero = bruto;
  try {
    numero = decodeURIComponent(bruto);
  } catch {
    // número malformado: segue como veio e o componente mostra "não encontrado"
  }
  return numero.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
}

export default async function Pedido({ params }: PageProps<"/loja/conta/pedidos/[numero]">) {
  const numero = numeroDe((await params).numero);
  return (
    <MolduraConta
      trilha={[
        { rotulo: "Pedidos", href: "/conta/pedidos" },
        { rotulo: numero, href: `/conta/pedidos/${numero}` },
      ]}
    >
      <DetalhePedidoEnviado numero={numero} fotos={await fotosDoCatalogo()} />
    </MolduraConta>
  );
}
