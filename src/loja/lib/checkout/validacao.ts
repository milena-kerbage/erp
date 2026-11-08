// Validação e máscaras do pedido pelo WhatsApp (e de outros formulários da loja). Sem imports locais:
// roda no navegador e no `node --test`. Não há pagamento no site: cartão e endereço de entrega saíram.
// Só ajuda quem digita; o backend valida de novo tudo o que recebe (seguranca.md).

export const digitos = (valor: string) => valor.replace(/\D/g, "");

const repetido = (numeros: string) => /^(\d)\1+$/.test(numeros);

// Dígito verificador por módulo 11 (CPF e CNPJ).
function verificador(numeros: string, pesos: number[]): number {
  const soma = pesos.reduce((total, peso, indice) => total + Number(numeros[indice]) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(valor: string): boolean {
  const n = digitos(valor);
  if (n.length !== 11 || repetido(n)) return false;
  const d1 = verificador(n, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = verificador(n, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(n[9]) && d2 === Number(n[10]);
}

export function cnpjValido(valor: string): boolean {
  const n = digitos(valor);
  if (n.length !== 14 || repetido(n)) return false;
  const d1 = verificador(n, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = verificador(n, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(n[12]) && d2 === Number(n[13]);
}

// Aplica um molde ("000.000.000-00") aos dígitos digitados até agora.
function moldar(valor: string, molde: string): string {
  const n = digitos(valor);
  let saida = "";
  let indice = 0;
  for (const caractere of molde) {
    if (indice >= n.length) break;
    if (caractere === "0") saida += n[indice++];
    else saida += caractere;
  }
  return saida;
}

export const mascararCpf = (valor: string) => moldar(valor, "000.000.000-00");
export const mascararCnpj = (valor: string) => moldar(valor, "00.000.000/0000-00");
export const mascararTelefone = (valor: string) =>
  digitos(valor).length > 10 ? moldar(valor, "(00) 00000-0000") : moldar(valor, "(00) 0000-0000");

// Celular com DDD (11 dígitos, começa com 9) ou fixo (10 dígitos).
export function telefoneValido(valor: string): boolean {
  const n = digitos(valor);
  return (n.length === 11 && n[2] === "9") || n.length === 10;
}

export function emailValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim());
}

export type Erros = Record<string, string>;
