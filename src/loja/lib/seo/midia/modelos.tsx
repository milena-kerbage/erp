// Modelos de imagem para compartilhamento (Open Graph, WhatsApp, iMessage, redes sociais).
// Satori: só flexbox e um subconjunto de CSS; todo elemento com mais de um filho precisa de display:flex.
// Regras e especificações por rede em publicacao.md §5.
import { LOGO_HORIZONTAL, LOGO_PROPORCAO } from "./logo";

export const FORMATOS = {
  og: { largura: 1200, altura: 630 }, // link compartilhado: Facebook, WhatsApp, LinkedIn, X, iMessage, Discover
  quadrado: { largura: 1080, altura: 1080 }, // feed do Instagram, status do WhatsApp, catálogo
  story: { largura: 1080, altura: 1920 }, // stories e reels (Instagram, WhatsApp, TikTok)
  pinterest: { largura: 1000, altura: 1500 }, // pin 2:3
} as const;

export type Formato = keyof typeof FORMATOS;

// Paleta do Ateliê Milena Kerbage (sálvia do ERP, src/styles/theme.ts).
export const TEMA = {
  // Cores oficiais (mesmas do panda.config.ts; o Satori não lê tokens do Panda).
  fundo: "#F4F3EC",
  cartao: "#FFFFFF",
  texto: "#1D1F1B",
  textoSuave: "#6A6F63",
  linha: "#DAD9CE",
  destaque: "#798568",
  sobreDestaque: "#FFFFFF",
  site: "ateliemilenakerbage.com.br",
} as const;

export type DadosProduto = {
  tipo: "produto";
  nome: string;
  categoria: string; // "Kit berço · Kits completos"
  preco: string; // já formatado: "R$ 1.490,00"
  antesDoPreco?: string; // "a partir de"
  precoDe?: string; // "R$ 1.690,00"
  complemento?: string; // "5% OFF no Pix"
  selo?: string; // "Pronta entrega" | "Entrega para todo o Brasil"
  imagem?: string; // data URI PNG/JPEG (ver gerar.ts)
};

export type DadosChamada = {
  tipo: "categoria" | "conteudo" | "padrao";
  titulo: string;
  subtitulo?: string;
  etiqueta?: string; // "Guia" | "Categoria"
  imagem?: string;
};

export type DadosMidia = DadosProduto | DadosChamada;

const limitar = (texto: string, maximo: number) => (texto.length > maximo ? `${texto.slice(0, maximo - 1).trimEnd()}…` : texto);

function Logo({ altura }: { altura: number }) {
  // biome-ignore lint/performance/noImgElement: o Satori (ImageResponse) só renderiza <img>, não next/image
  return <img src={LOGO_HORIZONTAL} width={Math.round(altura * LOGO_PROPORCAO)} height={altura} alt="" />;
}

/** Foto que preenche a área toda (corte central), como nas vitrines. */
function Foto({ src, largura, altura, raio = 0 }: { src?: string; largura: number; altura: number; raio?: number }) {
  return (
    <div style={{ display: "flex", width: largura, height: altura, borderRadius: raio, background: "#E7E6DC", overflow: "hidden", flexShrink: 0 }}>
      {/* biome-ignore lint/performance/noImgElement: o Satori (ImageResponse) só renderiza <img>, não next/image */}
      {src ? <img src={src} width={largura} height={altura} style={{ objectFit: "cover" }} alt="" /> : null}
    </div>
  );
}

function Etiqueta({ texto, escala, cheia = false }: { texto: string; escala: number; cheia?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        padding: `${8 * escala}px ${18 * escala}px`,
        borderRadius: 999,
        border: `${Math.max(1, Math.round(1.5 * escala))}px solid ${TEMA.destaque}`,
        background: cheia ? TEMA.destaque : "transparent",
        color: cheia ? TEMA.sobreDestaque : TEMA.destaque,
        fontSize: 19 * escala,
        letterSpacing: 0.4 * escala,
      }}
    >
      {texto}
    </div>
  );
}

function Sobrelinha({ texto, escala }: { texto: string; escala: number }) {
  return <div style={{ fontSize: 17 * escala, color: TEMA.textoSuave, textTransform: "uppercase", letterSpacing: 3 * escala }}>{texto}</div>;
}

function Rodape({ escala, complemento }: { escala: number; complemento?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 18 * escala, borderTop: `1px solid ${TEMA.linha}`, fontSize: 18 * escala, color: TEMA.textoSuave }}>
      <div>{TEMA.site}</div>
      {complemento ? <div>{complemento}</div> : null}
    </div>
  );
}

function TextoProduto({ dados, escala, tituloPx }: { dados: DadosProduto; escala: number; tituloPx: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", gap: 20 * escala }}>
      <Logo altura={Math.round(46 * escala)} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 * escala }}>
        <Sobrelinha texto={limitar(dados.categoria, 40)} escala={escala} />
        <div style={{ fontSize: tituloPx, color: TEMA.texto, lineHeight: 1.12, letterSpacing: -1.2 * escala }}>{limitar(dados.nome, 64)}</div>
        <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 10 * escala, marginTop: 6 * escala }}>
          {dados.antesDoPreco ? <div style={{ fontSize: 20 * escala, color: TEMA.textoSuave }}>{dados.antesDoPreco}</div> : null}
          <div style={{ fontSize: 44 * escala, color: TEMA.texto, letterSpacing: -1 * escala }}>{dados.preco}</div>
          {dados.precoDe ? <div style={{ fontSize: 22 * escala, color: TEMA.textoSuave, textDecoration: "line-through" }}>{dados.precoDe}</div> : null}
        </div>
        {dados.selo ? <Etiqueta texto={limitar(dados.selo, 32)} escala={escala} /> : null}
      </div>
      <Rodape escala={escala} complemento={dados.complemento} />
    </div>
  );
}

function TextoChamada({ dados, escala, tituloPx }: { dados: DadosChamada; escala: number; tituloPx: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", gap: 20 * escala }}>
      <Logo altura={Math.round(50 * escala)} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 * escala }}>
        {dados.etiqueta ? <Sobrelinha texto={limitar(dados.etiqueta, 32)} escala={escala} /> : null}
        <div style={{ fontSize: tituloPx, color: TEMA.texto, lineHeight: 1.08, letterSpacing: -1.6 * escala }}>{limitar(dados.titulo, 70)}</div>
        {dados.subtitulo ? <div style={{ fontSize: 23 * escala, color: TEMA.textoSuave, lineHeight: 1.38 }}>{limitar(dados.subtitulo, 130)}</div> : null}
      </div>
      <Rodape escala={escala} complemento={dados.imagem && escala === 1 ? "Fortaleza, CE" : "Enxoval e quarto de bebê · Fortaleza"} />
    </div>
  );
}

export function renderizarMidia(dados: DadosMidia, formato: Formato) {
  const { largura, altura } = FORMATOS[formato];
  const horizontal = largura > altura;
  const escala = horizontal ? 1 : largura / 820;
  const margem = Math.round(52 * escala);
  const base = { display: "flex", width: "100%", height: "100%", background: TEMA.fundo, fontFamily: "sans-serif" } as const;

  // Horizontal (link compartilhado): a foto ocupa a esquerda inteira, de cima a baixo. O WhatsApp e o iMessage
  // recortam a miniatura no centro, por isso o texto fica do meio para a direita, sem encostar nas bordas.
  if (horizontal) {
    const comFoto = Boolean(dados.imagem);
    const ladoFoto = altura; // quadrada, sangrando até a borda
    const texto = dados.tipo === "produto"
      ? <TextoProduto dados={dados} escala={1} tituloPx={dados.nome.length > 34 ? 44 : 52} />
      : <TextoChamada dados={dados} escala={1} tituloPx={comFoto ? (dados.titulo.length > 30 ? 48 : 56) : dados.titulo.length > 34 ? 62 : 74} />;
    return (
      <div style={{ ...base, flexDirection: "row" }}>
        {comFoto ? <Foto src={dados.imagem} largura={ladoFoto} altura={ladoFoto} /> : null}
        <div style={{ display: "flex", flex: 1, padding: `${margem}px ${margem + 4}px ${margem - 8}px`, ...(comFoto ? {} : { paddingLeft: margem + 28, paddingRight: margem + 28 }) }}>{texto}</div>
      </div>
    );
  }

  // Vertical e quadrado (feed, stories, pin): a foto em cima, com cantos arredondados, e o texto embaixo.
  const alturaTexto = Math.round((dados.tipo === "produto" ? 400 : 370) * escala);
  const alturaFoto = Math.max(0, altura - margem * 3 - alturaTexto);
  return (
    <div style={{ ...base, flexDirection: "column", padding: margem, gap: margem }}>
      {dados.imagem ? <Foto src={dados.imagem} largura={largura - margem * 2} altura={alturaFoto} raio={Math.round(28 * escala)} /> : null}
      {dados.tipo === "produto"
        ? <TextoProduto dados={dados} escala={escala} tituloPx={Math.round(48 * escala)} />
        : <TextoChamada dados={dados} escala={escala} tituloPx={Math.round((dados.imagem ? 54 : 70) * escala)} />}
    </div>
  );
}
