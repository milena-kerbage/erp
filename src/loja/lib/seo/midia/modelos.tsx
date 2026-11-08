// Modelos de imagem para compartilhamento (Open Graph, WhatsApp, iMessage, redes sociais).
// Satori: só flexbox e um subconjunto de CSS; todo elemento com mais de um filho precisa de display:flex.
// Regras e especificações por rede em publicacao.md §5.

export const FORMATOS = {
  og: { largura: 1200, altura: 630 }, // link compartilhado: Facebook, WhatsApp, LinkedIn, X, iMessage, Discover
  quadrado: { largura: 1080, altura: 1080 }, // feed do Instagram, status do WhatsApp, catálogo
  story: { largura: 1080, altura: 1920 }, // stories e reels (Instagram, WhatsApp, TikTok)
  pinterest: { largura: 1000, altura: 1500 }, // pin 2:3
} as const;

export type Formato = keyof typeof FORMATOS;

// Paleta do Ateliê Milena Kerbage (sálvia do ERP, src/styles/theme.ts). Logo nos modelos: pendente.
export const TEMA = {
  // Cores oficiais (mesmas do panda.config.ts; o Satori não lê tokens do Panda).
  fundo: "#EEEFE8",
  cartao: "#FFFFFF",
  texto: "#1D1F1B",
  textoSuave: "#5F6459",
  destaque: "#616D54",
  sobreDestaque: "#FFFFFF",
  marca: "Milena Kerbage",
  submarca: "Ateliê",
} as const;

export type DadosProduto = {
  tipo: "produto";
  nome: string;
  categoria: string; // "Kit berço · Kits completos"
  preco: string; // já formatado: "R$ 1.490,00"
  precoDe?: string; // "R$ 1.690,00"
  complemento?: string; // "ou 10x de R$ 149,00"
  selo?: string; // "Pronta entrega" | "Entrega para todo o Brasil"
  imagem?: string; // data URI PNG/JPEG (ver gerar.ts)
};

export type DadosChamada = {
  tipo: "categoria" | "conteudo" | "padrao";
  titulo: string;
  subtitulo?: string;
  etiqueta?: string; // "Guia" | "Categoria" | "Calculadora"
  imagem?: string;
};

export type DadosMidia = DadosProduto | DadosChamada;

const limitar = (texto: string, maximo: number) => (texto.length > maximo ? `${texto.slice(0, maximo - 1).trimEnd()}…` : texto);

function Marca({ escala }: { escala: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12 * escala }}>
      <div style={{ fontSize: 40 * escala, fontWeight: 800, letterSpacing: -1, color: TEMA.texto }}>{TEMA.marca}</div>
      <div style={{ fontSize: 22 * escala, color: TEMA.textoSuave }}>{TEMA.submarca}</div>
    </div>
  );
}

function Foto({ src, lado }: { src?: string; lado: number }) {
  return (
    <div
      style={{
        display: "flex",
        width: lado,
        height: lado,
        borderRadius: 28,
        background: TEMA.cartao,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: o Satori (ImageResponse) só renderiza <img>, não next/image */}
      {src ? <img src={src} width={lado - 48} height={lado - 48} style={{ objectFit: "contain" }} alt="" /> : null}
    </div>
  );
}

function BlocoPreco({ dados, escala }: { dados: DadosProduto; escala: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 * escala }}>
      {dados.precoDe ? (
        <div style={{ fontSize: 26 * escala, color: TEMA.textoSuave, textDecoration: "line-through" }}>{dados.precoDe}</div>
      ) : null}
      <div style={{ fontSize: 64 * escala, fontWeight: 800, color: TEMA.texto, letterSpacing: -1 }}>{dados.preco}</div>
      {dados.complemento ? <div style={{ fontSize: 26 * escala, color: TEMA.textoSuave }}>{dados.complemento}</div> : null}
    </div>
  );
}

function Selo({ texto, escala }: { texto: string; escala: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        padding: `${10 * escala}px ${22 * escala}px`,
        borderRadius: 999,
        background: TEMA.destaque,
        color: TEMA.sobreDestaque,
        fontSize: 24 * escala,
        fontWeight: 700,
      }}
    >
      {texto}
    </div>
  );
}

export function renderizarMidia(dados: DadosMidia, formato: Formato) {
  const { largura, altura } = FORMATOS[formato];
  const horizontal = largura > altura;
  const escala = horizontal ? 1 : largura / 1000;
  const margem = Math.round(56 * escala);

  if (dados.tipo === "produto") {
    // O produto ocupa o centro: o WhatsApp recorta a miniatura em quadrado nas prévias pequenas.
    // Vertical: a foto fica com o espaço que sobra depois do bloco de texto (~500 px na escala 1).
    const ladoFoto = horizontal ? altura - margem * 2 : Math.min(largura - margem * 2, altura - margem * 3 - Math.round(500 * escala));
    return (
      <div
        style={{
          display: "flex",
          flexDirection: horizontal ? "row" : "column",
          width: "100%",
          height: "100%",
          background: TEMA.fundo,
          padding: margem,
          gap: margem,
          fontFamily: "sans-serif",
        }}
      >
        <Foto src={dados.imagem} lado={ladoFoto} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", gap: 24 * escala }}>
          <Marca escala={escala} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 * escala }}>
            <div style={{ fontSize: 24 * escala, color: TEMA.textoSuave, textTransform: "uppercase", letterSpacing: 1 }}>
              {limitar(dados.categoria, 48)}
            </div>
            <div style={{ fontSize: (horizontal ? 46 : 56) * escala, fontWeight: 700, color: TEMA.texto, lineHeight: 1.15 }}>
              {limitar(dados.nome, 90)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 * escala }}>
            <BlocoPreco dados={dados} escala={escala} />
            {dados.selo ? <Selo texto={limitar(dados.selo, 32)} escala={escala} /> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        background: TEMA.fundo,
        padding: margem,
        fontFamily: "sans-serif",
      }}
    >
      <Marca escala={escala} />
      {dados.imagem && !horizontal ? <Foto src={dados.imagem} lado={largura - margem * 2} /> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 * escala }}>
        {dados.etiqueta ? <Selo texto={limitar(dados.etiqueta, 24)} escala={escala} /> : null}
        <div style={{ fontSize: (horizontal ? 64 : 76) * escala, fontWeight: 800, color: TEMA.texto, lineHeight: 1.1, letterSpacing: -1 }}>
          {limitar(dados.titulo, 80)}
        </div>
        {dados.subtitulo ? (
          <div style={{ fontSize: 30 * escala, color: TEMA.textoSuave, lineHeight: 1.3 }}>{limitar(dados.subtitulo, 140)}</div>
        ) : null}
      </div>
    </div>
  );
}
