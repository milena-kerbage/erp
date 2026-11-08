// Pedidos: tipos, situação e linha do tempo do rastreio. Sem imports locais: roda no navegador,
// no servidor e no `node --test`. PROVISÓRIO: no real o pedido e o histórico vêm da API de
// pedidos (status do ERP + eventos da transportadora).
// "em_separacao" é a etapa de produção no ateliê (costura, bordado do nome e embalagem); o nome do
// status segue o do ERP.

export type Status =
  | "aguardando_pagamento"
  | "pagamento_aprovado"
  | "nota_emitida"
  | "em_separacao"
  | "em_transporte"
  | "saiu_para_entrega"
  | "entregue"
  | "pronto_para_retirada"
  | "retirado"
  | "cancelado";

export type ItemPedido = {
  slug: string;
  nome: string;
  marca: string;
  unidade: string;
  variacao?: string;
  quantidade: number;
  preco: string;
};

export type EntregaPedido =
  | {
      tipo: "endereco";
      modalidade: "Normal" | "Expressa";
      destino: string; // "Rio de Janeiro/RJ"
      endereco?: string; // "Rua Equador, 43 · Santo Cristo" (exemplos; o simulado não guarda endereço)
      prazo: string;
      previsao: string; // AAAA-MM-DD
      transportadora?: string;
      rastreio?: string;
      agendamento?: { data: string; periodo: "manhã" | "tarde" };
    }
  | { tipo: "retirada"; local: string; prazo: string; previsao: string; retiraAte?: string };

export type Evento = { status: Status; em: string; detalhe?: string }; // em: ISO com fuso

export type Pedido = {
  numero: string;
  criadoEm: string;
  itens: ItemPedido[];
  valores: { produtos: number; desconto: number; frete: number; total: number }; // centavos
  pagamento: { forma: "pix" | "cartao"; parcelas?: number; final?: string; expiraEm?: string };
  entrega: EntregaPedido;
  status: Status;
  historico: Evento[];
  simulado?: boolean; // criado pelo checkout de simulação (guardado no navegador)
};

export type Tom = "atencao" | "andamento" | "sucesso" | "neutro";

const ROTULOS: Record<Status, { rotulo: string; tom: Tom }> = {
  aguardando_pagamento: { rotulo: "Aguardando pagamento", tom: "atencao" },
  pagamento_aprovado: { rotulo: "Pagamento aprovado", tom: "andamento" },
  nota_emitida: { rotulo: "Nota fiscal emitida", tom: "andamento" },
  em_separacao: { rotulo: "Em produção no ateliê", tom: "andamento" },
  em_transporte: { rotulo: "Em transporte", tom: "andamento" },
  saiu_para_entrega: { rotulo: "Saiu para entrega", tom: "andamento" },
  entregue: { rotulo: "Entregue", tom: "sucesso" },
  pronto_para_retirada: { rotulo: "Pronto para retirada", tom: "atencao" },
  retirado: { rotulo: "Retirado", tom: "sucesso" },
  cancelado: { rotulo: "Cancelado", tom: "neutro" },
};

export const situacao = (status: Status) => ROTULOS[status];

// Etapas mostradas no rastreio. "Saiu para entrega" é um passo dentro de "Em transporte".
const ETAPAS_ENTREGA: { status: Status; rotulo: string }[] = [
  { status: "aguardando_pagamento", rotulo: "Pedido recebido" },
  { status: "pagamento_aprovado", rotulo: "Pagamento aprovado" },
  { status: "em_separacao", rotulo: "Em produção no ateliê" },
  { status: "nota_emitida", rotulo: "Nota fiscal emitida" },
  { status: "em_transporte", rotulo: "Em transporte" },
  { status: "entregue", rotulo: "Entregue" },
];

const ETAPAS_RETIRADA: { status: Status; rotulo: string }[] = [
  { status: "aguardando_pagamento", rotulo: "Pedido recebido" },
  { status: "pagamento_aprovado", rotulo: "Pagamento aprovado" },
  { status: "em_separacao", rotulo: "Em produção no ateliê" },
  { status: "pronto_para_retirada", rotulo: "Pronto para retirada" },
  { status: "retirado", rotulo: "Retirado" },
];

const ORDEM: Status[] = [
  "aguardando_pagamento",
  "pagamento_aprovado",
  "em_separacao", // produção vem antes da nota: a nota sai quando o pacote fica pronto
  "nota_emitida",
  "em_transporte",
  "saiu_para_entrega",
  "pronto_para_retirada",
  "entregue",
  "retirado",
];

export type PassoRastreio = { rotulo: string; estado: "feito" | "atual" | "proximo"; em?: string };

// Linha do tempo: cada etapa feita leva a data do primeiro evento dela (ou de um posterior).
// Cancelado: só as etapas que chegaram a acontecer, todas feitas.
export function linhaDoTempo(pedido: Pick<Pedido, "entrega" | "status" | "historico">): PassoRastreio[] {
  const etapas = pedido.entrega.tipo === "retirada" ? ETAPAS_RETIRADA : ETAPAS_ENTREGA;
  const ultimo = pedido.status === "cancelado" ? ultimoAntesDoCancelamento(pedido.historico) : pedido.status;
  const posicaoAtual = ORDEM.indexOf(ultimo === "saiu_para_entrega" ? "em_transporte" : ultimo);
  const passos = etapas.map(({ status, rotulo }): PassoRastreio => {
    const posicao = ORDEM.indexOf(status);
    const evento = pedido.historico.find((item) => item.status === status);
    if (posicao < posicaoAtual) return { rotulo, estado: "feito", em: evento?.em };
    if (posicao === posicaoAtual) {
      const concluido = pedido.status === "cancelado" || status === "entregue" || status === "retirado";
      const rotuloAtual = ultimo === "saiu_para_entrega" ? "Saiu para entrega" : rotulo;
      const emAtual = pedido.historico.find((item) => item.status === ultimo)?.em ?? evento?.em;
      return { rotulo: rotuloAtual, estado: concluido ? "feito" : "atual", em: emAtual };
    }
    return { rotulo, estado: "proximo" };
  });
  return pedido.status === "cancelado" ? passos.filter((passo) => passo.estado !== "proximo") : passos;
}

function ultimoAntesDoCancelamento(historico: Evento[]): Status {
  const anteriores = historico.filter((item) => item.status !== "cancelado").map((item) => item.status);
  return anteriores.reduce<Status>((maior, atual) => (ORDEM.indexOf(atual) > ORDEM.indexOf(maior) ? atual : maior), "aguardando_pagamento");
}

// Progresso de 0 a 1 para a barrinha do card na lista.
export function progresso(pedido: Pick<Pedido, "entrega" | "status" | "historico">): number {
  if (pedido.status === "cancelado") return 0;
  const passos = linhaDoTempo(pedido);
  const feitos = passos.filter((passo) => passo.estado === "feito").length;
  const atual = passos.some((passo) => passo.estado === "atual") ? 0.5 : 0;
  return Math.min(1, (feitos + atual) / passos.length);
}

// O que o cliente pode fazer em cada situação.
export function acoes(pedido: Pick<Pedido, "status" | "entrega">) {
  const { status, entrega } = pedido;
  const antesDoTransporte = ["aguardando_pagamento", "pagamento_aprovado", "em_separacao", "nota_emitida"].includes(status);
  return {
    pagar: status === "aguardando_pagamento",
    cancelar: antesDoTransporte,
    // Dá para combinar dia e período em que alguém esteja em casa, até a véspera da saída para entrega.
    reagendar: entrega.tipo === "endereco" && (antesDoTransporte || status === "em_transporte"),
    rastrear:
      entrega.tipo === "endereco" && Boolean(entrega.rastreio) && ["em_transporte", "saiu_para_entrega", "entregue"].includes(status),
    notaFiscal: !["aguardando_pagamento", "pagamento_aprovado", "em_separacao", "cancelado"].includes(status),
    trocar: status === "entregue" || status === "retirado",
    comprarDeNovo: true,
  };
}

export type Filtro = "todos" | "andamento" | "concluidos" | "cancelados";

export function noFiltro(status: Status, filtro: Filtro): boolean {
  if (filtro === "todos") return true;
  if (filtro === "cancelados") return status === "cancelado";
  if (filtro === "concluidos") return status === "entregue" || status === "retirado";
  return !["cancelado", "entregue", "retirado"].includes(status);
}

// Datas sempre no horário de Brasília, independente do fuso do aparelho.
const FUSO = "America/Sao_Paulo";

export function dataCurta(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: FUSO })
    .format(new Date(iso))
    .replace(/\./g, "");
}

export function dataComHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: FUSO })
    .format(new Date(iso))
    .replace(/\./g, "");
}

// "AAAA-MM-DD" → "quinta, 5 de nov." (meio-dia evita virar o dia por causa do fuso)
export function diaPorExtenso(dia: string): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "short", timeZone: FUSO })
    .format(new Date(`${dia}T12:00:00-03:00`))
    .replace("-feira", "");
}

// Próximos dias úteis (seg. a sáb.) para reagendar a entrega, a partir de amanhã.
export function diasParaAgendar(hoje: Date, quantidade = 6): string[] {
  const dias: string[] = [];
  const dia = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12));
  while (dias.length < quantidade) {
    dia.setUTCDate(dia.getUTCDate() + 1);
    if (dia.getUTCDay() !== 0) dias.push(dia.toISOString().slice(0, 10));
  }
  return dias;
}

// "3 a 5 dias úteis" a partir de hoje → data do último dia útil do prazo (seg. a sex.).
export function previsaoPorPrazo(prazo: string, hoje: Date): string {
  const dias = Math.max(1, ...(prazo.match(/\d+/g) ?? ["1"]).map(Number));
  const dia = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12));
  let contados = 0;
  while (contados < dias) {
    dia.setUTCDate(dia.getUTCDate() + 1);
    if (dia.getUTCDay() !== 0 && dia.getUTCDay() !== 6) contados++;
  }
  return dia.toISOString().slice(0, 10);
}
