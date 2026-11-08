import "server-only";
import { listarProdutos } from "@/loja/lib/catalogo/exemplos";
import type { Evento, ItemPedido, Pedido, Status } from "./status";

// Pedidos de EXEMPLO para o wireframe de "Meus pedidos" (fictícios: números, datas, rastreio e
// valores). Saem quando a área do cliente existir na API. Um de cada situação importante.

const porSlug = new Map(listarProdutos().map((produto) => [produto.slug, produto]));

function item(slug: string, quantidade: number, variacao?: string): ItemPedido {
  const produto = porSlug.get(slug);
  if (!produto) throw new Error(`produto de exemplo inexistente: ${slug}`);
  return { slug, nome: produto.nome, marca: produto.marca, unidade: produto.unidade, variacao, quantidade, preco: produto.preco };
}

const centavos = (preco: string) => Math.round(Number(preco) * 100);

function valores(itens: ItemPedido[], frete: number, pix: boolean) {
  const produtos = itens.reduce((soma, atual) => soma + centavos(atual.preco) * atual.quantidade, 0);
  const desconto = pix ? Math.round(produtos * 0.05) : 0;
  return { produtos, desconto, frete, total: produtos - desconto + frete };
}

const historico = (...eventos: [Status, string, string?][]): Evento[] => eventos.map(([status, em, detalhe]) => ({ status, em, detalhe }));

export function pedidosDeExemplo(): Pedido[] {
  const transporte = [
    item("kit-berco-jardim-rose", 1, "Berço americano · 70 × 130 cm"),
    item("fraldas-de-boca-bordadas-kit-com-3", 2),
    item("manta-de-trico-trancada", 1),
  ];
  const pendente = [item("bolsa-maternidade-classica-de-linho", 1), item("enfeite-de-porta-bordado", 1)];
  const retirada = [item("saida-de-maternidade-trico-cru", 1, "RN · até 3,5 kg"), item("cueiro-de-malha-estampado", 2)];
  const entregue = [item("jogo-de-lencol-percal-200-fios", 2, "Berço padrão · 60 × 130 cm"), item("almofada-nuvem", 1)];
  const cancelado = [item("tapete-redondo-de-croche", 1, "1,00 m")];

  return [
    {
      numero: "MK-493001",
      criadoEm: "2026-11-02T09:12:00-03:00",
      itens: pendente,
      valores: valores(pendente, 2990, true),
      pagamento: { forma: "pix" },
      entrega: {
        tipo: "endereco",
        modalidade: "Normal",
        destino: "Recife/PE",
        endereco: "Rua Exemplo, 120 · Boa Viagem",
        prazo: "4 a 6 dias úteis",
        previsao: "2026-11-10",
      },
      status: "aguardando_pagamento",
      historico: historico(["aguardando_pagamento", "2026-11-02T09:12:00-03:00", "Pedido recebido. Aguardando o Pix."]),
    },
    {
      numero: "MK-490377",
      criadoEm: "2026-11-01T16:40:00-03:00",
      itens: retirada,
      valores: valores(retirada, 0, true),
      pagamento: { forma: "pix" },
      entrega: {
        tipo: "retirada",
        local: "Ateliê Milena Kerbage · Fortaleza",
        prazo: "pronto em 2 dias úteis",
        previsao: "2026-11-04",
        retiraAte: "2026-11-30",
      },
      status: "pronto_para_retirada",
      historico: historico(
        ["aguardando_pagamento", "2026-11-01T16:40:00-03:00"],
        ["pagamento_aprovado", "2026-11-01T16:41:00-03:00", "Pix aprovado."],
        ["em_separacao", "2026-11-02T08:30:00-03:00", "O ateliê está conferindo e embalando as peças."],
        ["pronto_para_retirada", "2026-11-03T11:05:00-03:00", "Pronto. Leve documento com foto e o código de retirada."],
      ),
    },
    {
      numero: "MK-482913",
      criadoEm: "2026-10-08T10:00:00-03:00",
      itens: transporte,
      valores: valores(transporte, 4390, false),
      pagamento: { forma: "cartao", parcelas: 6, final: "4242" },
      entrega: {
        tipo: "endereco",
        modalidade: "Normal",
        destino: "São Paulo/SP",
        endereco: "Rua Exemplo, 43 · Pinheiros",
        prazo: "6 a 9 dias úteis",
        previsao: "2026-11-10",
        transportadora: "Transportadora parceira (exemplo)",
        rastreio: "EX123456789BR",
      },
      status: "em_transporte",
      historico: historico(
        ["aguardando_pagamento", "2026-10-08T10:00:00-03:00"],
        ["pagamento_aprovado", "2026-10-08T10:03:00-03:00", "Cartão aprovado em 6x."],
        ["em_separacao", "2026-10-09T08:10:00-03:00", "Kit berço em produção no ateliê, com o nome confirmado pelo WhatsApp."],
        ["nota_emitida", "2026-10-30T15:20:00-03:00", "Nota fiscal emitida e enviada por e-mail."],
        ["em_transporte", "2026-10-31T07:45:00-03:00", "Pacote coletado pela transportadora em Fortaleza."],
      ),
    },
    {
      numero: "MK-471205",
      criadoEm: "2026-10-16T14:22:00-03:00",
      itens: entregue,
      valores: valores(entregue, 2990, false),
      pagamento: { forma: "cartao", parcelas: 3, final: "4242" },
      entrega: {
        tipo: "endereco",
        modalidade: "Expressa",
        destino: "Natal/RN",
        endereco: "Rua Exemplo, 43 · Ponta Negra",
        prazo: "2 a 3 dias úteis",
        previsao: "2026-10-21",
        transportadora: "Transportadora parceira (exemplo)",
        rastreio: "EX987654321BR",
      },
      status: "entregue",
      historico: historico(
        ["aguardando_pagamento", "2026-10-16T14:22:00-03:00"],
        ["pagamento_aprovado", "2026-10-16T14:24:00-03:00"],
        ["em_separacao", "2026-10-16T17:00:00-03:00", "Peças de pronta entrega conferidas e embaladas."],
        ["nota_emitida", "2026-10-17T08:00:00-03:00"],
        ["em_transporte", "2026-10-17T13:30:00-03:00"],
        ["saiu_para_entrega", "2026-10-20T07:50:00-03:00"],
        ["entregue", "2026-10-20T11:15:00-03:00", "Recebido na portaria."],
      ),
    },
    {
      numero: "MK-455820",
      criadoEm: "2026-09-28T19:05:00-03:00",
      itens: cancelado,
      valores: valores(cancelado, 3990, true),
      pagamento: { forma: "pix" },
      entrega: { tipo: "endereco", modalidade: "Normal", destino: "Salvador/BA", prazo: "4 a 6 dias úteis", previsao: "2026-10-30" },
      status: "cancelado",
      historico: historico(
        ["aguardando_pagamento", "2026-09-28T19:05:00-03:00"],
        ["cancelado", "2026-09-28T19:35:00-03:00", "O Pix não foi pago em 30 minutos. Nada foi cobrado."],
      ),
    },
  ];
}

export function buscarPedidoDeExemplo(numero: string): Pedido | undefined {
  return pedidosDeExemplo().find((pedido) => pedido.numero === numero.toUpperCase());
}
