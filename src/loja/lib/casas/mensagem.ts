// Pedido de orçamento de projeto pelo WhatsApp do ateliê: validação do formulário e texto da
// mensagem. Sem backend por enquanto: o formulário monta a mensagem e abre o wa.me com ela; nada
// sai do navegador sem a cliente confirmar o envio no WhatsApp. Funções puras, sem imports locais
// (rodam no `node --test`).

export type ItemPedido = { nome: string; pacote: string; preco?: string };

export type DadosPedido = {
  nome: string;
  whatsapp: string;
  nascimento: string; // AAAA-MM-DD (input date): previsão do nascimento
  tema: string; // "menina" | "menino" | "neutro" | "indefinido"
  medidas: string; // medidas do berço/colchão e do quarto/janela (livre)
  observacoes: string;
};

export const TEMAS_FORMULARIO = [
  { valor: "menina", rotulo: "Menina" },
  { valor: "menino", rotulo: "Menino" },
  { valor: "neutro", rotulo: "Neutro" },
  { valor: "indefinido", rotulo: "Ainda não sei" },
] as const;

export const PEDIDO_VAZIO: DadosPedido = { nome: "", whatsapp: "", nascimento: "", tema: "", medidas: "", observacoes: "" };

const LIMITE_TEXTO = 600;

function digitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

// Erros por campo (vazio = válido). "hoje" em AAAA-MM-DD, vindo de quem chama (testável).
export function validarPedido(dados: DadosPedido, hoje: string): Partial<Record<keyof DadosPedido, string>> {
  const erros: Partial<Record<keyof DadosPedido, string>> = {};
  if (dados.nome.trim().length < 2) erros.nome = "Informe o seu nome.";
  const telefone = digitos(dados.whatsapp);
  if (telefone.length < 10 || telefone.length > 13) erros.whatsapp = "Informe um WhatsApp com DDD, ex.: (85) 99999-9999.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.nascimento)) erros.nascimento = "Informe a previsão do nascimento (pode ser aproximada).";
  else if (dados.nascimento < hoje) {
    // Bebê que já nasceu também pode ganhar o quartinho: só barra datas muito antigas (erro de digitação).
    const limite = `${Number(hoje.slice(0, 4)) - 2}${hoje.slice(4)}`;
    if (dados.nascimento < limite) erros.nascimento = "Confira a data: ela parece muito antiga.";
  }
  if (!TEMAS_FORMULARIO.some((tema) => tema.valor === dados.tema)) erros.tema = "Escolha o tema.";
  if (dados.medidas.length > LIMITE_TEXTO) erros.medidas = `Use até ${LIMITE_TEXTO} caracteres.`;
  if (dados.observacoes.length > LIMITE_TEXTO) erros.observacoes = `Use até ${LIMITE_TEXTO} caracteres.`;
  return erros;
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function montarMensagem(dados: DadosPedido, itens: ItemPedido[]): string {
  const tema = TEMAS_FORMULARIO.find((opcao) => opcao.valor === dados.tema)?.rotulo ?? dados.tema;
  const linhas = [
    itens.length > 0
      ? "Olá! Escolhi estes projetos de quarto de bebê no site do ateliê e gostaria de um orçamento:"
      : "Olá! Gostaria de um orçamento de projeto de quarto de bebê.",
    ...itens.map((item) => `• ${item.nome}, pacote ${item.pacote}${item.preco ? ` (a partir de ${item.preco})` : ""}`),
    "",
    `Nome: ${dados.nome.trim()}`,
    `WhatsApp: ${dados.whatsapp.trim()}`,
    `Previsão do nascimento: ${formatarData(dados.nascimento)}`,
    `Tema: ${tema}`,
  ];
  if (dados.medidas.trim()) linhas.push(`Medidas do berço/quarto: ${dados.medidas.trim()}`);
  if (dados.observacoes.trim()) linhas.push(`Observações: ${dados.observacoes.trim()}`);
  return linhas.join("\n");
}

export function linkWhatsapp(numero: string, texto: string): string {
  return `https://wa.me/${digitos(numero)}?text=${encodeURIComponent(texto)}`;
}
