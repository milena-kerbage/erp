// CEP do visitante: define frete e prazo de entrega a partir do ateliê, em Fortaleza (referencia.md §4). Pedido de forma
// NÃO bloqueante: chip no cabeçalho + lembrete discreto na primeira visita; obrigatório só no frete.
// Funções puras: rodam no navegador, no servidor e no `node --test`.

export const COOKIE_LOCAL = "mk_local";
export const VALIDADE_LOCAL_S = 60 * 60 * 24 * 180; // 180 dias

export type Local = { cep: string; cidade: string; uf: string };

// Aceita "20220-410", "20220410", " 20.220-410 ". Devolve só os 8 dígitos, ou null.
export function normalizarCep(valor: string | null | undefined): string | null {
  const digitos = (valor ?? "").replace(/\D/g, "");
  return /^\d{8}$/.test(digitos) && digitos !== "00000000" ? digitos : null;
}

export function formatarCep(cep: string): string {
  return `${cep.slice(0, 5)}-${cep.slice(5, 8)}`;
}

// Máscara enquanto digita: "202204" → "20220-4".
export function mascararCep(digitando: string): string {
  const digitos = digitando.replace(/\D/g, "").slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

// Cookie: "cep|cidade|uf" com cada parte codificada (cidade tem acento e espaço).
export function serializarLocal(local: Local): string {
  return [local.cep, local.cidade, local.uf].map(encodeURIComponent).join("|");
}

// Valor de cookie vem do navegador: validar tudo antes de usar.
export function desserializarLocal(valor: string | null | undefined): Local | null {
  if (!valor || valor.length > 300) return null;
  const partes = valor.split("|");
  if (partes.length !== 3) return null;
  try {
    const [cepBruto, cidadeBruta, ufBruta] = partes.map(decodeURIComponent);
    const cep = normalizarCep(cepBruto);
    const cidade = cidadeBruta.trim();
    const uf = ufBruta.trim().toUpperCase();
    if (!cep || !/^[A-Z]{2}$/.test(uf) || cidade.length < 2 || cidade.length > 80) return null;
    return { cep, cidade, uf };
  } catch {
    return null;
  }
}

// Coordenadas dentro da caixa do Brasil (com folga); fora disso nem consulta o geocodificador.
export function dentroDoBrasil(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -34 && lat <= 6 && lng >= -74.5 && lng <= -28;
}

// ~110 m de precisão: suficiente para achar o CEP, não guarda a posição exata da pessoa (LGPD).
export function arredondarCoordenada(valor: number): number {
  return Math.round(valor * 1000) / 1000;
}
