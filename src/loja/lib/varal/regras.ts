// Varal de roupinhas (minigame de cupom da loja): as regras puras, sem banco nem Next. Rodam no servidor (sorteio,
// código do cupom, conferência do cadastro do ERP), no navegador (textos e o cupom guardado) e nos testes.
//
// O jogo é só a embalagem: o prêmio é sempre sorteado no servidor, e a peça escolhida não muda as chances.

export const PECAS = ["body", "macacao", "touca", "babador", "meinha"] as const;
export type Peca = (typeof PECAS)[number];
export const NOME_DA_PECA: Record<Peca, string> = { body: "body", macacao: "macacão", touca: "touca", babador: "babador", meinha: "meinha" };

/** Um prêmio do sorteio: desconto em percentual ou em valor fixo (centavos), a chance (peso) e o prefixo do código. */
export type PremioVaral = { tipo: "percentual" | "valor"; valor: number; chance: number; prefixo: string };

export type ConfigVaral = {
  /** Jogo no ar: fechado, a loja não mostra as chamadas nem aceita jogadas (quem já ganhou continua vendo o cupom). */
  ativo: boolean;
  premios: PremioVaral[];
  /** Por quantos dias o cupom vale, a partir da jogada. */
  validadeDias: number;
  /** Valor mínimo em produtos para usar o cupom (centavos). */
  minimoCentavos: number;
};

/**
 * Ponto de partida (para o comercial validar no ERP, em Marketing): 5%, 10% e 15%. O "frete grátis" do conceito
 * ficou de fora: a loja não calcula frete (ele é combinado no WhatsApp) e o cupom só desconta percentual ou valor.
 */
export const CONFIG_PADRAO: ConfigVaral = {
  ativo: true,
  premios: [
    { tipo: "percentual", valor: 5, chance: 50, prefixo: "BEBE5" },
    { tipo: "percentual", valor: 10, chance: 30, prefixo: "BEBE10" },
    { tipo: "percentual", valor: 15, chance: 20, prefixo: "BEBE15" },
  ],
  validadeDias: 7,
  minimoCentavos: 19900,
};

/** Sem as letras e os números que se confundem (O e 0, I e 1). */
export const ALFABETO_VARAL = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const PREFIXO_VALIDO = /^[A-Z][A-Z0-9]{2,11}$/;

/** Sorteio pelo peso de cada prêmio. `aleatorio` devolve um número em [0, 1). */
export function sortearPremio(premios: readonly PremioVaral[], aleatorio: () => number): PremioVaral {
  const total = premios.reduce((soma, premio) => soma + premio.chance, 0);
  if (!premios.length || total <= 0) throw new Error("O varal está sem prêmios.");
  let alvo = aleatorio() * total;
  for (const premio of premios) { alvo -= premio.chance; if (alvo < 0) return premio; }
  return premios[premios.length - 1];
}

/** "BEBE10-M7QA": o prefixo do prêmio e quatro caracteres sorteados. */
export function gerarCodigoVaral(prefixo: string, aleatorio: () => number): string {
  return `${prefixo}-${Array.from({ length: 4 }, () => ALFABETO_VARAL[Math.floor(aleatorio() * ALFABETO_VARAL.length) % ALFABETO_VARAL.length]).join("")}`;
}

const reais = (centavos: number) => (centavos % 100 === 0 ? `R$ ${(centavos / 100).toLocaleString("pt-BR")}` : `R$ ${(centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);

/** "10% de desconto" ou "R$ 30 de desconto": o texto da etiqueta, da janela e do cupom. */
export const textoDoPremio = (premio: Pick<PremioVaral, "tipo" | "valor">) => (premio.tipo === "percentual" ? `${premio.valor}% de desconto` : `${reais(premio.valor)} de desconto`);

/** "Válido por 7 dias em compras a partir de R$ 199." */
export function textoDasCondicoes(validadeDias: number, minimoCentavos: number): string {
  const prazo = `Válido por ${validadeDias} ${validadeDias === 1 ? "dia" : "dias"}`;
  return minimoCentavos > 0 ? `${prazo} em compras a partir de ${reais(minimoCentavos)}.` : `${prazo}.`;
}

/** E-mail em minúsculas e sem espaços, ou null se não parece um e-mail. */
export function normalizarEmailVaral(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const email = valor.trim().toLowerCase();
  return email.length >= 6 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

/** "ma•••@gmail.com": o e-mail como aparece nas listas do ERP quando não precisa ser lido inteiro. */
export function mascararEmail(email: string): string {
  const [usuario, dominio = ""] = email.split("@");
  return `${usuario.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(4, usuario.length - 2)))}@${dominio}`;
}

/** Confere o cadastro que vem do ERP. Devolve a configuração limpa ou lança um Error com a mensagem para a tela. */
export function validarConfigVaral(entrada: unknown): ConfigVaral {
  const dados = entrada as Partial<ConfigVaral> | null;
  if (!dados || typeof dados !== "object") throw new Error("Configuração inválida.");
  const inteiro = (valor: unknown, rotulo: string, minimo: number, maximo: number) => {
    if (typeof valor !== "number" || !Number.isInteger(valor) || valor < minimo || valor > maximo) throw new Error(`${rotulo}: informe um número inteiro entre ${minimo} e ${maximo}.`);
    return valor;
  };
  if (!Array.isArray(dados.premios) || dados.premios.length < 1 || dados.premios.length > 8) throw new Error("Cadastre de 1 a 8 prêmios.");
  const prefixos = new Set<string>();
  const premios = dados.premios.map((bruto, indice): PremioVaral => {
    const premio = bruto as Partial<PremioVaral>, rotulo = `Prêmio ${indice + 1}`;
    if (premio.tipo !== "percentual" && premio.tipo !== "valor") throw new Error(`${rotulo}: escolha percentual ou valor.`);
    const valor = premio.tipo === "percentual" ? inteiro(premio.valor, `${rotulo}, desconto`, 1, 90) : inteiro(premio.valor, `${rotulo}, desconto em centavos`, 100, 100_000_00);
    const chance = inteiro(premio.chance, `${rotulo}, chance`, 1, 100);
    const prefixo = typeof premio.prefixo === "string" ? premio.prefixo.trim().toUpperCase() : "";
    if (!PREFIXO_VALIDO.test(prefixo)) throw new Error(`${rotulo}: o prefixo do código tem de 3 a 12 letras ou números e começa com letra.`);
    if (prefixos.has(prefixo)) throw new Error(`${rotulo}: cada prêmio precisa de um prefixo diferente.`);
    prefixos.add(prefixo);
    return { tipo: premio.tipo, valor, chance, prefixo };
  });
  if (premios.reduce((soma, premio) => soma + premio.chance, 0) !== 100) throw new Error("As chances dos prêmios precisam somar 100%.");
  return {
    ativo: dados.ativo === true,
    premios,
    validadeDias: inteiro(dados.validadeDias, "Validade em dias", 1, 90),
    minimoCentavos: inteiro(dados.minimoCentavos, "Valor mínimo do pedido", 0, 100_000_00),
  };
}

/** O que a loja recebe depois da jogada (e guarda no aparelho): nunca as chances nem os outros prêmios. */
export type ResultadoVaral = {
  premio: string;
  tipo: "percentual" | "valor";
  valor: number;
  codigo: string;
  /** Até quando o cupom vale (ISO). */
  validoAte: string;
  minimoCentavos: number;
  condicoes: string;
  peca: Peca;
  /** A cliente já tinha jogado: este é o mesmo cupom de antes. */
  jaJogou: boolean;
};
