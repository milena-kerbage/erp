import type { Metadata } from "next";
import { ListaPedidos } from "@/loja/componentes/conta/ListaPedidos";
import { pedidosDeExemplo } from "@/loja/lib/pedidos/exemplos";

export const metadata: Metadata = { title: "Meus pedidos" };

// Meus pedidos (referencia.md §16). Wireframe: pedidos de exemplo do servidor + os simulados no
// checkout (navegador). [A FAZER] com login: lista da API, dinâmica e sem cache.
export default function Pedidos() {
  return <ListaPedidos exemplos={pedidosDeExemplo()} />;
}
