// Totais do carrinho em centavos inteiros (nunca float com dinheiro). Sem imports locais: roda no
// navegador e no `node --test`. É a prévia "a partir de" da sacola: o valor final (preço, cupom,
// frete) é confirmado pelo ateliê na conversa do pedido pelo WhatsApp.

export type Linha = { preco: string; quantidade: number };

export type Cupom = { codigo: string; percentual: number; minimoCentavos: number; descricao: string };

// [CONFIRMAR] cupons e regras com o ateliê (exemplos para o wireframe).
export const CUPONS: Cupom[] = [
  { codigo: "BEMVINDO5", percentual: 5, minimoCentavos: 0, descricao: "5% na primeira compra" },
  { codigo: "ENXOVAL10", percentual: 10, minimoCentavos: 100000, descricao: "10% em compras acima de R$ 1.000" },
];

export const DESCONTO_PIX_PERCENTUAL = 5;
export const PARCELA_MINIMA_CENTAVOS = 2000;
export const MAX_PARCELAS = 10;

const DECIMAL = /^\d+(\.\d{1,2})?$/;

export function centavos(valor: string): number {
  if (!DECIMAL.test(valor)) throw new Error(`valor monetário inválido: ${valor}`);
  const [inteiro, fracao = ""] = valor.split(".");
  return Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
}

export function decimal(valorCentavos: number): string {
  return `${Math.floor(valorCentavos / 100)}.${String(valorCentavos % 100).padStart(2, "0")}`;
}

export type ResultadoCupom = { tipo: "ok"; cupom: Cupom } | { tipo: "invalido" } | { tipo: "minimo"; cupom: Cupom };

export function validarCupom(codigo: string, subtotalCentavos: number): ResultadoCupom {
  const cupom = CUPONS.find((item) => item.codigo === codigo.trim().toUpperCase());
  if (!cupom) return { tipo: "invalido" };
  if (subtotalCentavos < cupom.minimoCentavos) return { tipo: "minimo", cupom };
  return { tipo: "ok", cupom };
}

// Frete: a loja é um catálogo com preço e o pedido segue pelo WhatsApp (src/loja/lib/checkout/pedido.ts).
// O frete e o prazo de entrega são combinados com o ateliê na conversa; aqui não há cálculo de frete.

// Prazo de produção do pedido: pronta entrega sai do ateliê em até 2 dias úteis; peça sob
// encomenda (costura e bordado) leva de 15 a 25 dias úteis; projeto de quarto (pronto ou montado no
// "Monte o seu") leva de 20 a 35. O pedido sai inteiro, então vale o da peça mais demorada.
// [CONFIRMAR] prazos com o ateliê.
export type Prazo = { min: number; max: number };
export const PRODUCAO_PRONTA: Prazo = { min: 1, max: 2 };
export const PRODUCAO_ENCOMENDA: Prazo = { min: 15, max: 25 };
export const PRODUCAO_PROJETO: Prazo = { min: 20, max: 35 };

export function prazoDeProducao(itens: { prontaEntrega: boolean; producao?: Prazo }[]): Prazo {
  return itens
    .map((item) => item.producao ?? (item.prontaEntrega ? PRODUCAO_PRONTA : PRODUCAO_ENCOMENDA))
    .reduce((maior, prazo) => (prazo.max > maior.max || (prazo.max === maior.max && prazo.min > maior.min) ? prazo : maior), PRODUCAO_PRONTA);
}

export function textoPrazo({ min, max }: Prazo): string {
  if (min === max) return `${max} ${max === 1 ? "dia útil" : "dias úteis"}`;
  return `${min} a ${max} dias úteis`;
}

export type Totais = {
  itens: number; // soma das quantidades
  subtotal: number; // centavos, preço de tabela (cartão)
  descontoCupom: number;
  frete: number; // sempre 0 na prévia: o frete é combinado pelo WhatsApp
  totalCartao: number;
  descontoPix: number;
  totalPix: number;
  parcelas: number;
  valorParcela: number;
};

// Ordem: subtotal → cupom → desconto do Pix sobre os produtos → + frete (o Pix não desconta frete).
export function calcularTotais(linhas: Linha[], cupom?: Cupom, frete = 0): Totais {
  const subtotal = linhas.reduce((soma, linha) => soma + centavos(linha.preco) * linha.quantidade, 0);
  const itens = linhas.reduce((soma, linha) => soma + linha.quantidade, 0);
  const descontoCupom = cupom && subtotal >= cupom.minimoCentavos ? Math.round((subtotal * cupom.percentual) / 100) : 0;
  const produtos = subtotal - descontoCupom;
  const descontoPix = Math.round((produtos * DESCONTO_PIX_PERCENTUAL) / 100);
  const totalCartao = produtos + frete;
  const parcelas = Math.max(1, Math.min(MAX_PARCELAS, Math.floor(totalCartao / PARCELA_MINIMA_CENTAVOS)));
  return {
    itens,
    subtotal,
    descontoCupom,
    frete,
    totalCartao,
    descontoPix,
    totalPix: totalCartao - descontoPix,
    parcelas,
    valorParcela: Math.ceil(totalCartao / parcelas),
  };
}
