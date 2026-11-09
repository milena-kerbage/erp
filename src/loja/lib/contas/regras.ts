// Contas de cliente da loja: regras puras (limites, validação do cadastro rápido e do perfil, senha,
// cupom de primeira compra). Sem imports de Next nem de banco: roda no navegador (formulários), no
// servidor (src/lib/loja/contas.ts, que valida TUDO de novo) e no `node --test` (tests/contas.test.mjs).
// As contas de cliente são separadas das contas da equipe do ERP (outra tabela, outro cookie).

import { type Cupom, CUPONS, cupomVigente } from "../carrinho/totais.ts";
import { cpfValido, digitos, telefoneValido } from "../checkout/validacao.ts";

/** Versão dos Termos de uso e da Política de privacidade aceita no cadastro (gravada com a data). */
export const VERSAO_TERMOS = "2026-11-08";

export const LIMITES_CONTA = {
  nome: 80,
  email: 254,
  senhaMin: 8,
  senhaMax: 128,
  endereco: 160,
  cidade: 60,
  bebeNome: 60,
  preferencias: 500,
  observacoes: 500,
  local: 80,
} as const;

export const COMO_CONHECEU = {
  instagram: "Instagram",
  indicacao: "Indicação de amiga ou família",
  google: "Busca no Google",
  loja: "Conheço o ateliê em Fortaleza",
  evento: "Feira ou evento",
  outro: "Outro",
} as const;
export type ComoConheceu = keyof typeof COMO_CONHECEU;

export const TIPO_DATA_BEBE = { prevista: "Data prevista do parto", nascimento: "Data de nascimento" } as const;
export type TipoDataBebe = keyof typeof TIPO_DATA_BEBE;

export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;

export type Erros = Record<string, string>;

const CONTROLE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

/** Texto de uma linha: sem caracteres de controle, espaços colapsados. */
export function limparLinha(valor: unknown): string {
  return typeof valor === "string" ? valor.replace(CONTROLE, "").replace(/\s+/g, " ").trim() : "";
}

export const normalizarEmail = (email: unknown) => (typeof email === "string" ? email.trim().toLowerCase() : "");
export const emailValido = (email: string) => email.length <= LIMITES_CONTA.email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

// Senhas comuns demais para valer, mesmo com letras e números.
const SENHAS_COMUNS = new Set([
  "12345678", "123456789", "1234567890", "password", "password1", "senha123", "senha1234", "qwerty123", "abc12345", "abcd1234",
  "11111111", "00000000", "a1b2c3d4", "iloveyou1", "bebe1234", "milena123", "atelie123", "mudar123", "teste123", "brasil123",
]);

/**
 * Força básica para a conta da cliente: 8 a 128 caracteres, pelo menos uma letra e um número, fora
 * das senhas mais comuns e diferente do e-mail. (A equipe do ERP tem regra mais forte, em auth/core.)
 */
export function erroSenha(senha: unknown, contexto: { email?: string; nome?: string } = {}): string | null {
  if (typeof senha !== "string" || senha.length < LIMITES_CONTA.senhaMin) return `Use pelo menos ${LIMITES_CONTA.senhaMin} caracteres.`;
  if (senha.length > LIMITES_CONTA.senhaMax) return `Use no máximo ${LIMITES_CONTA.senhaMax} caracteres.`;
  if (!/\p{L}/u.test(senha) || !/\p{N}/u.test(senha)) return "Misture letras e números.";
  const baixa = senha.toLowerCase();
  if (SENHAS_COMUNS.has(baixa) || /^(.)\1+$/.test(senha)) return "Essa senha é muito comum. Escolha outra.";
  const usuario = (contexto.email ?? "").split("@")[0]?.toLowerCase();
  if (usuario && usuario.length >= 4 && baixa.includes(usuario)) return "Não use o seu e-mail na senha.";
  return null;
}

export type DadosCadastro = { nome: string; whatsapp: string; email: string; senha: string; termos: true };

/** Cadastro rápido: só o básico (nome, WhatsApp, e-mail, senha e o aceite dos termos). */
export function validarCadastro(campos: Record<string, unknown>): { ok: true; dados: DadosCadastro } | { ok: false; erros: Erros } {
  const erros: Erros = {};
  const nome = limparLinha(campos.nome);
  const email = normalizarEmail(campos.email);
  const whatsapp = digitos(typeof campos.whatsapp === "string" ? campos.whatsapp : "");
  const senha = typeof campos.senha === "string" ? campos.senha : "";
  if (nome.split(" ").filter(Boolean).length < 2 || nome.length < 3) erros.nome = "Informe nome e sobrenome.";
  else if (nome.length > LIMITES_CONTA.nome) erros.nome = `Use até ${LIMITES_CONTA.nome} caracteres.`;
  if (!telefoneValido(whatsapp)) erros.whatsapp = "Informe o WhatsApp com DDD.";
  if (!emailValido(email)) erros.email = "Informe um e-mail válido.";
  const senhaFraca = erroSenha(senha, { email, nome });
  if (senhaFraca) erros.senha = senhaFraca;
  if (campos.termos !== true && campos.termos !== "true") erros.termos = "Para criar a conta, aceite os Termos de uso e a Política de privacidade.";
  if (Object.keys(erros).length) return { ok: false, erros };
  return { ok: true, dados: { nome, whatsapp, email, senha, termos: true } };
}

/** Dados que a cliente completa depois, em Minha conta. Todos opcionais; vazio apaga. */
export type PerfilOpcional = {
  cpf: string;
  cep: string;
  endereco: string;
  cidade: string;
  uf: string;
  bebeNome: string;
  bebeData: string; // AAAA-MM-DD
  bebeDataTipo: TipoDataBebe | "";
  comoConheceu: ComoConheceu | "";
  preferencias: string;
};
export type Perfil = PerfilOpcional & { nome: string; whatsapp: string };

export const CAMPOS_PERFIL = ["nome", "whatsapp", "cpf", "cep", "endereco", "cidade", "uf", "bebeNome", "bebeData", "bebeDataTipo", "comoConheceu", "preferencias"] as const;
export const PERFIL_VAZIO: PerfilOpcional = { cpf: "", cep: "", endereco: "", cidade: "", uf: "", bebeNome: "", bebeData: "", bebeDataTipo: "", comoConheceu: "", preferencias: "" };

function dataValida(valor: string, hoje: Date): boolean {
  if (!/^\d{4}-\d\d-\d\d$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) return false;
  // Até 6 anos para trás (nascimento) e 1 ano para a frente (data prevista).
  const ano = hoje.getUTCFullYear();
  return data.getUTCFullYear() >= ano - 6 && data.getUTCFullYear() <= ano + 1;
}

/**
 * Atualização parcial do perfil (só as chaves enviadas). Nome e WhatsApp continuam obrigatórios; os
 * demais aceitam vazio (apaga o dado). Campos desconhecidos são erro.
 */
export function validarPerfil(campos: Record<string, unknown>, hoje = new Date()): { ok: true; dados: Partial<Perfil> } | { ok: false; erros: Erros } {
  const erros: Erros = {};
  const dados: Partial<Perfil> = {};
  for (const chave of Object.keys(campos)) if (!(CAMPOS_PERFIL as readonly string[]).includes(chave)) erros[chave] = "Campo não permitido.";
  const texto = (chave: string, maximo: number) => {
    const valor = campos[chave];
    if (valor !== undefined && typeof valor !== "string") { erros[chave] = "Valor inválido."; return undefined; }
    const limpo = limparLinha(valor);
    if (limpo.length > maximo) { erros[chave] = `Use até ${maximo} caracteres.`; return undefined; }
    return limpo;
  };
  if (campos.nome !== undefined) {
    const nome = texto("nome", LIMITES_CONTA.nome);
    if (nome !== undefined) { if (nome.split(" ").filter(Boolean).length < 2) erros.nome = "Informe nome e sobrenome."; else dados.nome = nome; }
  }
  if (campos.whatsapp !== undefined) {
    const whatsapp = digitos(texto("whatsapp", 30) ?? "");
    if (!telefoneValido(whatsapp)) erros.whatsapp = "Informe o WhatsApp com DDD."; else dados.whatsapp = whatsapp;
  }
  if (campos.cpf !== undefined) {
    const cpf = digitos(texto("cpf", 20) ?? "");
    if (cpf && !cpfValido(cpf)) erros.cpf = "CPF inválido."; else dados.cpf = cpf;
  }
  if (campos.cep !== undefined) {
    const cep = digitos(texto("cep", 12) ?? "");
    if (cep && cep.length !== 8) erros.cep = "CEP com 8 números."; else dados.cep = cep;
  }
  for (const [chave, maximo] of [["endereco", LIMITES_CONTA.endereco], ["cidade", LIMITES_CONTA.cidade], ["bebeNome", LIMITES_CONTA.bebeNome]] as const) {
    if (campos[chave] !== undefined) { const valor = texto(chave, maximo); if (valor !== undefined) dados[chave] = valor; }
  }
  if (campos.uf !== undefined) {
    const uf = (texto("uf", 2) ?? "").toUpperCase();
    if (uf && !(UFS as readonly string[]).includes(uf)) erros.uf = "UF inválida."; else dados.uf = uf;
  }
  if (campos.bebeData !== undefined) {
    const data = texto("bebeData", 10) ?? "";
    if (data && !dataValida(data, hoje)) erros.bebeData = "Data inválida."; else dados.bebeData = data;
  }
  if (campos.bebeDataTipo !== undefined) {
    const tipo = texto("bebeDataTipo", 20) ?? "";
    if (tipo && !(tipo in TIPO_DATA_BEBE)) erros.bebeDataTipo = "Escolha uma opção."; else dados.bebeDataTipo = tipo as TipoDataBebe | "";
  }
  if (campos.comoConheceu !== undefined) {
    const como = texto("comoConheceu", 20) ?? "";
    if (como && !(como in COMO_CONHECEU)) erros.comoConheceu = "Escolha uma opção."; else dados.comoConheceu = como as ComoConheceu | "";
  }
  if (campos.preferencias !== undefined) {
    const valor = campos.preferencias;
    if (typeof valor !== "string") erros.preferencias = "Valor inválido.";
    else {
      const limpo = valor.replace(CONTROLE, "").trim();
      if (limpo.length > LIMITES_CONTA.preferencias) erros.preferencias = `Use até ${LIMITES_CONTA.preferencias} caracteres.`;
      else dados.preferencias = limpo;
    }
  }
  if (Object.keys(erros).length) return { ok: false, erros };
  return { ok: true, dados };
}

/** Quantos dados opcionais faltam (convite "Complete o seu perfil" em Minha conta). */
export function camposFaltando(perfil: PerfilOpcional): (keyof PerfilOpcional)[] {
  const chaves: (keyof PerfilOpcional)[] = ["cpf", "cep", "endereco", "cidade", "bebeData", "bebeNome", "comoConheceu"];
  return chaves.filter((chave) => !perfil[chave]);
}

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? "";
export const inicialDoNome = (nome: string) => (primeiroNome(nome)[0] ?? "").toLocaleUpperCase("pt-BR");

export function mascararWhatsapp(numeros: string): string {
  const n = digitos(numeros);
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return n;
}

// ---------------------------------------------------------------- Cupom de primeira compra

export const PERCENTUAL_BOAS_VINDAS = 5;
export const PREFIXO_CUPOM = "BEMVINDA-";
/** Cupom genérico antigo de primeira compra: com conta, vale como o cupom de boas-vindas dela. */
export const CUPOM_GENERICO_PRIMEIRA = "BEMVINDO5";
const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem 0/O e 1/I

export function gerarCodigoCupom(aleatorio: () => number): string {
  return PREFIXO_CUPOM + Array.from({ length: 4 }, () => ALFABETO[Math.floor(aleatorio() * ALFABETO.length) % ALFABETO.length]).join("");
}
export const ehCodigoBoasVindas = (codigo: string) => new RegExp(`^${PREFIXO_CUPOM}[${ALFABETO}]{4}$`).test(codigo);

export function cupomDeBoasVindas(codigo: string): Cupom {
  return { codigo, percentual: PERCENTUAL_BOAS_VINDAS, minimoCentavos: 0, descricao: `${PERCENTUAL_BOAS_VINDAS}% OFF na primeira compra (exclusivo da sua conta)` };
}

/** Cupom de boas-vindas da conta, como a loja mostra: disponível (com o código) ou já usado. */
export type CupomConta = { codigo: string; percentual: number; usado: boolean; usadoEm: string | null; pedido: string | null };

export type EscolhaCupom =
  | { tipo: "ok"; cupom: Cupom; boasVindas: boolean; aviso?: string }
  | { tipo: "invalido"; mensagem: string }
  | { tipo: "minimo"; cupom: Cupom; mensagem: string };

/**
 * Qual cupom vale para o código digitado (um cupom por pedido: nunca acumulam). Regras:
 * - o BEMVINDA-XXXX só vale para a conta dona dele e uma vez;
 * - BEMVINDO5 (genérico de primeira compra), com conta, vira o cupom de boas-vindas dela (e some depois de usado);
 * - ENXOVAL10 e outros genéricos valem pelas regras de sempre e ENTRAM NO LUGAR do de primeira compra
 *   (que continua guardado para outro pedido).
 * Mesma função no navegador (prévia) e no servidor (que confere o uso no banco).
 */
export function escolherCupom(
  codigoBruto: string,
  subtotalCentavos: number,
  conta: { logada: boolean; cupom: CupomConta | null },
  campanhas: Cupom[] = CUPONS,
  agora = Date.now(),
): EscolhaCupom {
  const codigo = codigoBruto.trim().toUpperCase();
  if (!codigo || codigo.length > 30) return { tipo: "invalido", mensagem: "Cupom não encontrado. Confira o código." };
  const disponivel = conta.cupom && !conta.cupom.usado ? conta.cupom : null;
  if (ehCodigoBoasVindas(codigo) || codigo === CUPOM_GENERICO_PRIMEIRA) {
    if (codigo !== CUPOM_GENERICO_PRIMEIRA && conta.cupom?.codigo !== codigo) {
      return { tipo: "invalido", mensagem: conta.logada ? "Este cupom é de outra conta." : "Entre na sua conta para usar o seu cupom de primeira compra." };
    }
    if (conta.logada) {
      if (!disponivel) return { tipo: "invalido", mensagem: "Você já usou o cupom de primeira compra." };
      return {
        tipo: "ok",
        cupom: cupomDeBoasVindas(disponivel.codigo),
        boasVindas: true,
        ...(codigo === CUPOM_GENERICO_PRIMEIRA ? { aviso: `Com conta, o ${PERCENTUAL_BOAS_VINDAS}% da primeira compra é o seu cupom ${disponivel.codigo}: já aplicamos.` } : {}),
      };
    }
  }
  const generico = campanhas.find((item) => item.codigo === codigo && item.codigo !== CUPOM_GENERICO_PRIMEIRA) ?? (codigo === CUPOM_GENERICO_PRIMEIRA ? CUPONS[0] : undefined);
  if (!generico || !cupomVigente(generico, agora)) return { tipo: "invalido", mensagem: "Cupom não encontrado. Confira o código." };
  // Cupom de primeira compra de campanha: com conta, só enquanto o de boas-vindas não foi usado (o servidor
  // confere os pedidos de verdade).
  if (generico.primeiraCompra && conta.logada && conta.cupom?.usado) return { tipo: "invalido", mensagem: `O ${generico.codigo} vale só na primeira compra.` };
  if (subtotalCentavos < generico.minimoCentavos) return { tipo: "minimo", cupom: generico, mensagem: `O ${generico.codigo} vale a partir de um valor mínimo em produtos.` };
  return {
    tipo: "ok",
    cupom: generico,
    boasVindas: false,
    ...(disponivel ? { aviso: `Um cupom por pedido: o ${generico.codigo} entrou no lugar do seu cupom de primeira compra, que continua guardado para outra compra.` } : {}),
  };
}

/**
 * Cupom que a sacola mostra: o escolhido pela cliente ou, se ela está logada, tem o de boas-vindas
 * disponível e não o removeu, o de boas-vindas aplicado automaticamente.
 */
export function cupomEfetivo(escolhido: string | undefined, semAutomatico: boolean, conta: { logada: boolean; cupom: CupomConta | null }): string | undefined {
  if (escolhido) return escolhido;
  if (conta.logada && conta.cupom && !conta.cupom.usado && !semAutomatico) return conta.cupom.codigo;
  return undefined;
}

// ---------------------------------------------------------------- Pedidos feitos com conta

/**
 * Situação do pedido no ateliê, na ordem: começa "Enviado pelo WhatsApp" (antes do pagamento) e a equipe
 * avança pelo ERP nas etapas de entrega: pagamento confirmado → despachado para a transportadora → entregue.
 * "Cancelado" vale a qualquer momento.
 */
export const STATUS_PEDIDO = {
  enviado_whatsapp: "Enviado pelo WhatsApp",
  pagamento_confirmado: "Pagamento confirmado",
  despachado: "Despachado para a transportadora",
  entregue: "Entregue",
  cancelado: "Cancelado",
} as const;
export type StatusPedido = keyof typeof STATUS_PEDIDO;

/** As 3 etapas de entrega mostradas como linha do tempo em Minha conta. */
export const ETAPAS_ENTREGA = [
  { status: "pagamento_confirmado", rotulo: "Confirmação do pagamento" },
  { status: "despachado", rotulo: "Despachado para a transportadora" },
  { status: "entregue", rotulo: "Entregue" },
] as const satisfies readonly { status: StatusPedido; rotulo: string }[];

/** Quantas etapas de entrega já foram concluídas (0 a 3); cancelado: null. */
export function etapasConcluidas(status: StatusPedido): number | null {
  if (status === "cancelado") return null;
  const indice = ETAPAS_ENTREGA.findIndex((etapa) => etapa.status === status);
  return indice + 1;
}
