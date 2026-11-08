import "server-only";
import { type Local, normalizarCep } from "./cep";

// Consultas externas de CEP, sempre pelo servidor: o IP e a posição do visitante não vão para terceiros.
// PROVISÓRIO: quando o frete existir na API do backend (com cache em Redis, redis.md), estas consultas vão para lá.
// - ViaCEP: gratuito, sem chave, usado por boa parte do varejo brasileiro.
// - Nominatim (OpenStreetMap): a política de uso proíbe volume alto. [CONFIRMAR] antes do lançamento,
//   trocar por um geocodificador contratado (ex.: Google Geocoding) e limitar a rota no Cloudflare.

const TIMEOUT_MS = 4000;
const IDENTIFICACAO = "LojaMilenaKerbage/1.0 (+https://www.ateliemilenakerbage.com.br)";

export class ErroServicoLocalizacao extends Error {}

async function buscarJson(url: string): Promise<unknown> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": IDENTIFICACAO },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Cache de dados do Next (sem Cache Components): CEP e coordenadas mudam raramente.
      next: { revalidate: 60 * 60 * 24 },
    });
  } catch (erro) {
    throw new ErroServicoLocalizacao(`falha de rede: ${url}`, { cause: erro });
  }
  if (!resposta.ok) throw new ErroServicoLocalizacao(`HTTP ${resposta.status}: ${url}`);
  return resposta.json();
}

// Endereço do CEP: rua e bairro vêm vazios em CEP geral de cidade pequena (o cliente digita).
export type EnderecoCep = Local & { logradouro: string; bairro: string };

// CEP inexistente devolve null e fica em cache; falha do serviço lança erro (e não é cacheada).
export async function buscarCep(cep: string): Promise<EnderecoCep | null> {
  const dados = (await buscarJson(`https://viacep.com.br/ws/${cep}/json/`)) as {
    erro?: boolean | string;
    localidade?: string;
    uf?: string;
    logradouro?: string;
    bairro?: string;
  };
  if (dados.erro || !dados.localidade || !dados.uf) return null;
  return { cep, cidade: dados.localidade, uf: dados.uf, logradouro: dados.logradouro ?? "", bairro: dados.bairro ?? "" };
}

// Recebe coordenadas já arredondadas (~110 m): o cache agrupa vizinhos e reduz chamadas.
export async function buscarCepPorCoordenadas(lat: number, lng: number): Promise<EnderecoCep | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`;
  const dados = (await buscarJson(url)) as {
    address?: { postcode?: string; country_code?: string };
  };
  if (dados.address?.country_code !== "br") return null;
  // O OpenStreetMap às vezes só tem o prefixo do CEP (5 dígitos): aí pedimos para digitar.
  const cep = normalizarCep(dados.address.postcode);
  if (!cep) return null;
  // Cidade e UF pelo ViaCEP: mesmo formato do CEP digitado.
  return buscarCep(cep);
}
