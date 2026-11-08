// Central de ajuda da loja: os temas (/ajuda/<slug>) e as perguntas frequentes, com a busca simples
// da página /ajuda. Texto puro (sem JSX) para a busca e o JSON-LD (FAQPage) usarem o mesmo conteúdo.
// Puro: roda no `node --test` (tests/loja/ajuda.test.mjs).
//
// Fatos do negócio usados aqui (fonte no código): catálogo com preço e pedido pelo WhatsApp com uma
// vendedora (lib/checkout/pedido.ts); frete e prazo de entrega combinados na conversa; retirada no
// ateliê em Fortaleza; prazos de produção de lib/carrinho/totais.ts e lib/casas/catalogo.ts; Pix com
// desconto e cartão parcelado (totais.ts); cuidados por tecido (lib/catalogo/fichas.ts).
// [CONFIRMAR] com o ateliê os prazos de produção e as regras de bordado e troca antes de publicar.

import { DESCONTO_PIX_PERCENTUAL, MAX_PARCELAS, PRODUCAO_ENCOMENDA, PRODUCAO_PRONTA, textoPrazo } from "../carrinho/totais.ts";
import { PRAZO_PRODUCAO as PRAZO_PROJETOS } from "../casas/catalogo.ts";

export type TemaAjuda = {
  slug: string;
  titulo: string;
  resumo: string; // uma frase: card da central e meta description
  descricao: string; // meta description da página do tema
};

export const ROTA_AJUDA = "/ajuda";

export const TEMAS_AJUDA: TemaAjuda[] = [
  {
    slug: "como-fazer-pedido",
    titulo: "Como fazer seu pedido",
    resumo: "Monte a sacola e envie o pedido pelo WhatsApp: uma vendedora confirma tudo com você.",
    descricao:
      "Passo a passo para pedir no Ateliê Milena Kerbage: monte a sacola no site e envie o pedido pelo WhatsApp, onde uma vendedora confirma valores, bordado, frete, prazo e pagamento.",
  },
  {
    slug: "entregas",
    titulo: "Entregas e retirada",
    resumo: "Enviamos para todo o Brasil, com frete e prazo combinados pelo WhatsApp, ou retirada no ateliê em Fortaleza.",
    descricao:
      "Entregas do Ateliê Milena Kerbage para todo o Brasil, frete e prazo combinados pelo WhatsApp, retirada no ateliê em Fortaleza e prazos de produção de peças a pronta entrega e sob encomenda.",
  },
  {
    slug: "trocas-e-devolucoes",
    titulo: "Trocas e devoluções",
    resumo: "Até 7 dias para desistir da compra feita à distância e o passo a passo pelo WhatsApp.",
    descricao:
      "Como trocar ou devolver uma peça do Ateliê Milena Kerbage: direito de arrependimento de 7 dias (art. 49 do CDC), peças com defeito, peças bordadas e o passo a passo pelo WhatsApp.",
  },
  {
    slug: "bordado-personalizado",
    titulo: "Bordado personalizado",
    resumo: "Como escolher o bordado com o nome do bebê e como ele é confirmado com a vendedora.",
    descricao:
      "Como funciona o bordado personalizado do Ateliê Milena Kerbage: escolha com ou sem bordado na peça, nome confirmado pelo WhatsApp, prazos e cuidados com a peça bordada.",
  },
  {
    slug: "tecidos-e-cuidados",
    titulo: "Cuidados com as peças",
    resumo: "Como lavar, secar e passar cada tecido para as peças durarem mais.",
    descricao:
      "Cuidados de lavagem, secagem e passadoria por tecido das peças do Ateliê Milena Kerbage: algodão, linho, tricô, crochê, voal e peças bordadas, mais dicas de sono seguro.",
  },
  {
    slug: "perguntas-frequentes",
    titulo: "Perguntas frequentes",
    resumo: "Respostas rápidas sobre pedido, pagamento, entrega, bordado, trocas e Minha conta.",
    descricao:
      "Perguntas frequentes sobre a loja do Ateliê Milena Kerbage: como pedir pelo WhatsApp, pagamento, frete, retirada em Fortaleza, bordado, trocas, cuidados e Minha conta.",
  },
];

export function temaAjuda(slug: string): TemaAjuda {
  const tema = TEMAS_AJUDA.find((item) => item.slug === slug);
  if (!tema) throw new Error(`tema de ajuda inexistente: ${slug}`);
  return tema;
}

export type Pergunta = {
  id: string; // âncora (#id) na página do tema
  tema: string; // slug do tema em que a resposta completa aparece
  pergunta: string;
  resposta: string;
  link?: { rotulo: string; href: string };
};

const PRONTA = textoPrazo({ min: PRODUCAO_PRONTA.max, max: PRODUCAO_PRONTA.max }); // "2 dias úteis"
const ENCOMENDA = textoPrazo(PRODUCAO_ENCOMENDA);

export const PERGUNTAS: Pergunta[] = [
  // Pedido e pagamento
  {
    id: "como-pedir",
    tema: "como-fazer-pedido",
    pergunta: "Como faço um pedido?",
    resposta:
      "Escolha as peças e coloque na sacola. Na sacola, toque em Fazer pedido pelo WhatsApp, informe seu nome e WhatsApp e envie a mensagem que abre pronta. Uma vendedora do ateliê responde por lá e confirma valores, bordado, frete, prazo e pagamento.",
    link: { rotulo: "Ver a sacola", href: "/carrinho" },
  },
  {
    id: "pagar-no-site",
    tema: "como-fazer-pedido",
    pergunta: "Preciso pagar no site?",
    resposta:
      "Não. Nada é cobrado no site. O pagamento é combinado com a vendedora pelo WhatsApp, depois que ela confirma o pedido com você.",
  },
  {
    id: "formas-de-pagamento",
    tema: "como-fazer-pedido",
    pergunta: "Quais são as formas de pagamento?",
    resposta: `Pix, com ${DESCONTO_PIX_PERCENTUAL}% de desconto nos produtos, ou cartão de crédito em até ${MAX_PARCELAS}x sem juros, respeitada a parcela mínima. A vendedora confirma as condições na conversa.`,
  },
  {
    id: "preco-a-partir-de",
    tema: "como-fazer-pedido",
    pergunta: "Por que os preços aparecem como “a partir de”?",
    resposta:
      "Porque o valor final depende das escolhas de cada peça, como tamanho do berço e bordado, e do frete. A vendedora confirma o valor exato antes de você pagar.",
  },
  {
    id: "cupom",
    tema: "como-fazer-pedido",
    pergunta: "Como uso um cupom de desconto?",
    resposta:
      "Na sacola, abra Cupom de desconto e digite o código. O cupom vai junto na mensagem do pedido e a vendedora confere as regras dele na conversa.",
  },
  {
    id: "conta-cadastro",
    tema: "como-fazer-pedido",
    pergunta: "Preciso criar conta ou fazer login?",
    resposta:
      "Não. A loja não tem cadastro. Seus favoritos e os pedidos que você enviou ficam salvos no próprio aparelho, em Minha conta, e podem ser reenviados pelo WhatsApp quando quiser.",
    link: { rotulo: "Abrir Minha conta", href: "/conta" },
  },
  {
    id: "acompanhar-pedido",
    tema: "como-fazer-pedido",
    pergunta: "Como acompanho meu pedido?",
    resposta:
      "Pela conversa com a vendedora no WhatsApp, onde ela informa a produção, o envio e o código de rastreio, quando houver. Em Minha conta você revê o que enviou e pode reenviar a mensagem.",
    link: { rotulo: "Ver pedidos enviados", href: "/conta/pedidos" },
  },
  // Entregas
  {
    id: "entrega-brasil",
    tema: "entregas",
    pergunta: "Vocês entregam fora de Fortaleza?",
    resposta: "Sim, enviamos para todo o Brasil. O frete e o prazo de entrega são combinados com a vendedora pelo WhatsApp, conforme a sua cidade e o volume das peças.",
  },
  {
    id: "valor-frete",
    tema: "entregas",
    pergunta: "Quanto custa o frete?",
    resposta:
      "O site não calcula frete. A vendedora cota pelo seu CEP e informa o valor e o prazo antes do pagamento. Informar a cidade ou o CEP no pedido agiliza a cotação.",
  },
  {
    id: "retirada",
    tema: "entregas",
    pergunta: "Posso retirar no ateliê?",
    resposta:
      "Pode. No pedido, marque Prefiro retirar no ateliê, em Fortaleza. A vendedora avisa quando as peças estiverem prontas e combina o dia e o horário da retirada.",
  },
  {
    id: "prazo-producao",
    tema: "entregas",
    pergunta: "Qual é o prazo de produção?",
    resposta: `Peças a pronta entrega saem do ateliê em até ${PRONTA}. Peças sob encomenda, costuradas e bordadas para você, levam de ${ENCOMENDA}. Projetos de quartinho completos levam de ${PRAZO_PROJETOS}. Depois vem o prazo do frete.`,
  },
  {
    id: "pedido-misto",
    tema: "entregas",
    pergunta: "E se o pedido tiver peças a pronta entrega e sob encomenda?",
    resposta:
      "O pedido sai inteiro, então vale o prazo da peça mais demorada. Se precisar de alguma peça antes, combine com a vendedora o envio separado e o frete de cada parte.",
  },
  {
    id: "quando-encomendar",
    tema: "entregas",
    pergunta: "Com quanto tempo de antecedência devo encomendar?",
    resposta:
      "Para peças sob encomenda e quartinhos personalizados, peça com folga em relação à data prevista do parto e informe essa data nas observações do pedido. A vendedora confirma se o prazo atende.",
  },
  // Trocas
  {
    id: "arrependimento",
    tema: "trocas-e-devolucoes",
    pergunta: "Posso desistir da compra?",
    resposta:
      "Sim. Em compras feitas à distância, como pelo site e pelo WhatsApp, você pode desistir em até 7 dias a contar do recebimento, conforme o artigo 49 do Código de Defesa do Consumidor. Os valores pagos são devolvidos.",
  },
  {
    id: "troca-defeito",
    tema: "trocas-e-devolucoes",
    pergunta: "A peça chegou com defeito. E agora?",
    resposta:
      "Fale com a vendedora pelo WhatsApp com fotos da peça e do defeito. O ateliê avalia e resolve com conserto, troca ou devolução do valor, nos prazos do Código de Defesa do Consumidor.",
  },
  {
    id: "troca-bordado",
    tema: "trocas-e-devolucoes",
    pergunta: "Peça com bordado personalizado pode ser trocada?",
    resposta:
      "Peças bordadas com o nome do bebê são feitas só para você. Por isso, a troca ou devolução delas é feita em caso de defeito de fabricação ou de bordado diferente do combinado.",
  },
  {
    id: "como-devolver",
    tema: "trocas-e-devolucoes",
    pergunta: "Como envio a peça de volta?",
    resposta:
      "Antes de enviar, fale com a vendedora pelo WhatsApp: ela confirma o pedido, explica como embalar e combina o envio ou a entrega no ateliê. Mande a peça sem uso, com as etiquetas e na embalagem original, sempre que possível.",
  },
  // Bordado
  {
    id: "escolher-bordado",
    tema: "bordado-personalizado",
    pergunta: "Como escolho o bordado com o nome?",
    resposta:
      "Nas peças que aceitam bordado, escolha com bordado ou sem bordado na página do produto. O nome, a grafia e os detalhes são confirmados com a vendedora pelo WhatsApp. Se já tiver o nome, escreva nas observações do pedido.",
  },
  {
    id: "bordado-custa",
    tema: "bordado-personalizado",
    pergunta: "O bordado tem custo?",
    resposta:
      "Depende da peça: a página de cada produto informa se o bordado é incluso ou opcional. A vendedora confirma o valor final na conversa.",
  },
  {
    id: "nome-depois",
    tema: "bordado-personalizado",
    pergunta: "Ainda não escolhemos o nome. Posso pedir assim mesmo?",
    resposta:
      "Pode. Faça o pedido e avise a vendedora: o bordado só entra em produção depois que o nome for confirmado, e o prazo conta a partir daí.",
  },
  // Cuidados
  {
    id: "lavar-antes",
    tema: "tecidos-e-cuidados",
    pergunta: "Preciso lavar as peças antes de usar?",
    resposta:
      "É recomendado lavar o enxoval antes do primeiro uso, com sabão neutro e sem amaciante perfumado, seguindo os cuidados de cada tecido.",
  },
  {
    id: "passar-bordado",
    tema: "tecidos-e-cuidados",
    pergunta: "Como passo uma peça bordada?",
    resposta: "Com ferro em temperatura baixa e com o bordado virado para baixo, pelo avesso, para não amassar o relevo dos pontos.",
  },
  {
    id: "variacao-medida",
    tema: "tecidos-e-cuidados",
    pergunta: "As medidas e as cores podem variar?",
    resposta:
      "Um pouco. As peças são feitas à mão, então as medidas podem variar até 2 cm, e o tom do tecido muda levemente conforme a tela e o lote.",
  },
  {
    id: "sono-seguro",
    tema: "tecidos-e-cuidados",
    pergunta: "Posso deixar o protetor e o travesseiro no berço?",
    resposta:
      "Para o sono seguro, a Sociedade Brasileira de Pediatria recomenda o berço livre de protetores, travesseiros e objetos soltos enquanto o bebê dorme. Use essas peças na decoração e retire na hora de dormir.",
  },
  // Conta de cliente
  {
    id: "conta",
    tema: "perguntas-frequentes",
    pergunta: "Preciso criar conta para fazer o pedido?",
    resposta:
      "Sim, e leva menos de um minuto: nome, WhatsApp, e-mail e senha, ali mesmo na tela do pedido. Com a conta você acompanha os pedidos em qualquer aparelho e ganha 5% OFF na primeira compra (um cupom por pedido; o 5% OFF no Pix é combinado à parte, com a vendedora).",
    link: { rotulo: "Criar conta", href: "/conta/cadastro" },
  },
  {
    id: "esqueci-senha",
    tema: "perguntas-frequentes",
    pergunta: "Esqueci a senha. E agora?",
    resposta:
      "Chame o ateliê no WhatsApp: a vendedora confere a sua conta e manda um link para você criar uma senha nova. O link vale por 2 horas e funciona uma vez.",
    link: { rotulo: "Entrar", href: "/conta/entrar" },
  },
  {
    id: "outro-aparelho",
    tema: "perguntas-frequentes",
    pergunta: "Por que meus favoritos não aparecem em outro aparelho?",
    resposta:
      "Os pedidos ficam na sua conta, em qualquer aparelho. Já os favoritos e a sacola ficam salvos no navegador em que você usou a loja: se limpar os dados do navegador, essas listas são apagadas.",
    link: { rotulo: "Abrir Minha conta", href: "/conta" },
  },
  {
    id: "indicar",
    tema: "perguntas-frequentes",
    pergunta: "Como indico o ateliê para uma amiga?",
    resposta: "Na página Indique o ateliê você manda o link da loja pelo WhatsApp com uma mensagem pronta ou copia o link para enviar como preferir.",
    link: { rotulo: "Indicar o ateliê", href: "/indique" },
  },
  {
    id: "projeto-quartinho",
    tema: "perguntas-frequentes",
    pergunta: "Vocês fazem o quarto completo?",
    resposta:
      "Sim. No Personalizado, kit berço, cortina, tapete e enfeites são pensados juntos, no mesmo tema. Você escolhe um quartinho e pede o orçamento pelo WhatsApp.",
    link: { rotulo: "Como funciona", href: "/personalizado/como-funciona" },
  },
];

export function perguntasDoTema(slug: string): Pergunta[] {
  return PERGUNTAS.filter((pergunta) => pergunta.tema === slug);
}

// Minúsculas e sem acento: "Bordádo" acha "bordado".
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Busca simples: todas as palavras do termo (2+ letras) precisam aparecer na pergunta ou na resposta.
// Acerto na pergunta vale mais que na resposta. Termo vazio: nada.
export function buscarPerguntas(termo: string, perguntas: Pergunta[] = PERGUNTAS): Pergunta[] {
  const palavras = normalizar(termo)
    .split(" ")
    .filter((palavra) => palavra.length >= 2);
  if (palavras.length === 0) return [];
  return perguntas
    .map((item) => {
      const titulo = normalizar(item.pergunta);
      const corpo = normalizar(item.resposta);
      if (!palavras.every((palavra) => titulo.includes(palavra) || corpo.includes(palavra))) return null;
      const pontos = palavras.reduce((soma, palavra) => soma + (titulo.includes(palavra) ? 2 : 1), 0);
      return { item, pontos };
    })
    .filter((resultado): resultado is { item: Pergunta; pontos: number } => resultado !== null)
    .sort((a, b) => b.pontos - a.pontos)
    .map(({ item }) => item);
}

// Endereço da resposta completa: a página do tema com a âncora da pergunta.
export function hrefPergunta(pergunta: Pergunta): string {
  return `${ROTA_AJUDA}/${pergunta.tema}#${pergunta.id}`;
}
