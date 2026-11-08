// Valores chegam da API como string decimal ("102.95"): nunca fazer conta de dinheiro com float no front.
// Aqui só se FORMATA para exibir; preço, parcela e total são calculados no backend.

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DECIMAL = /^-?\d+(\.\d{1,2})?$/;

export function formatarPreco(valor: string): string {
  if (!DECIMAL.test(valor)) throw new Error(`valor monetário inválido: ${valor}`);
  return BRL.format(Number(valor)); // seguro: 2 casas decimais cabem exatas para exibição
}

export function formatarParcelamento(parcelas: number, valorParcela: string): string {
  if (!Number.isInteger(parcelas) || parcelas < 2) throw new Error("parcelamento precisa de 2 ou mais parcelas");
  return `ou ${parcelas}x de ${formatarPreco(valorParcela)}`;
}

// Preço por peça de um kit ou por metro de tecido/cortina ("R$ 49,67/peça").
export function formatarPrecoPorUnidade(valor: string, unidade: "peça" | "par" | "m" | "un"): string {
  return `${formatarPreco(valor)}/${unidade}`;
}
