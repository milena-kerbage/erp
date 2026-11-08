// Clube Milena: programa de benefícios do ateliê. Cada compra rende PONTOS (nível e benefícios) e
// MOEDAS, que viram cashback em compras futuras. A pasta mantém o nome antigo para não quebrar imports.
// Regra única aqui: o painel do produto, o carrinho e o checkout mostram o mesmo número. Contas em centavos inteiros (nunca float com dinheiro).
// [CONFIRMAR] com o comercial: taxa de pontos, % de cashback e valor da moeda. Quando o backend
// tiver o programa, ele passa a ser a fonte (e este arquivo só formata).

export const NOME_PROGRAMA = "Clube Milena"; // nome visível em todas as telas

export const PONTOS_POR_REAL = 1; // 1 ponto a cada R$ 1,00 (centavos não pontuam)
export const CASHBACK_PERCENTUAL = 2; // 2% do valor volta em moedas
export const CENTAVOS_POR_MOEDA = 1; // 1 moeda = R$ 0,01

const DECIMAL = /^\d+(\.\d{1,2})?$/;

export function paraCentavos(valor: string): number {
  if (!DECIMAL.test(valor)) throw new Error(`valor monetário inválido: ${valor}`);
  const [inteiro, fracao = ""] = valor.split(".");
  return Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
}

export function deCentavos(centavos: number): string {
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, "0")}`;
}

export type Recompensas = { pontos: number; moedas: number; cashback: string };

export function calcularRecompensas(precoUnitario: string, quantidade = 1): Recompensas {
  if (!Number.isInteger(quantidade) || quantidade < 1) throw new Error("quantidade precisa ser inteira e positiva");
  const total = paraCentavos(precoUnitario) * quantidade;
  const pontos = Math.floor(total / 100) * PONTOS_POR_REAL;
  const moedas = Math.floor((total * CASHBACK_PERCENTUAL) / 100 / CENTAVOS_POR_MOEDA);
  return { pontos, moedas, cashback: deCentavos(moedas * CENTAVOS_POR_MOEDA) };
}
