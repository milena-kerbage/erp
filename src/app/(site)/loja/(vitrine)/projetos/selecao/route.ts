// A antiga "seleção de projetos" (/projetos/selecao) virou a sacola: projetos e produtos ficam juntos
// e o pedido segue pelo WhatsApp. 308 para /carrinho com Location RELATIVO: o navegador resolve no
// host da loja (o request.url aqui é a URL interna reescrita pelo proxy, /loja/..., e pode não ter o
// host público). Os projetos guardados na seleção antiga (mk_projetos) entram na sacola na primeira
// visita (carrinho/estado.ts, migrarSelecaoAntiga).
export function GET() {
  return new Response(null, { status: 308, headers: { Location: "/carrinho" } });
}
