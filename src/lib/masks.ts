/**
 * Máscaras de digitação: recebem o texto do campo e devolvem já formatado.
 * A formatação só aparece quando há dígitos suficientes, então apagar
 * funciona normalmente.
 */

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

/** Valor em reais para o campo: 6400 → "R$ 6.400,00". */
export function toCurrencyInput(value: number) {
  return brl.format(value);
}

/** Digitação em centavos, como em maquininha: "725050" → "R$ 7.250,50". */
export function maskCurrency(input: string) {
  const digits = input.replace(/\D/g, "").replace(/^0+/, "").slice(0, 13);
  if (!digits) return "";
  return brl.format(Number(digits) / 100);
}

/** "21998887766" → "(21) 99888-7766"; fixo com 10 dígitos → "(21) 3888-7766". */
export function maskPhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = digits.length === 11 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** Sempre com @, sem espaços e em minúsculas: "Helena.Castro" → "@helena.castro". */
export function maskInstagram(input: string) {
  const handle = input
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 30);
  return handle ? `@${handle}` : "";
}

/** E-mail sem espaços e em minúsculas. */
export function maskEmail(input: string) {
  return input.replace(/\s/g, "").toLowerCase();
}
