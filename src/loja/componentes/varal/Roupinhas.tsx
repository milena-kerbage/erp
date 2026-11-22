import type { Peca } from "@/loja/lib/varal/regras";

// As cinco roupinhas do varal, desenhadas à mão em SVG (traço fino, cantos arredondados). Tudo em tons pastel bem
// clarinhos e delicados: rosa (body), azul (macacão), amarelo (vestidinho), lilás (babador) e verde (meinha),
// sem vermelho. Os pregadores são um desenho à parte
// (<Pregadores>), na mesma caixa de 100 × 124: quando a peça cai, eles ficam na corda. A corda passa na altura 12.

const TRACO = { strokeWidth: 1.8, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const COSTURA = { fill: "none", strokeWidth: 1.1, strokeDasharray: "2.4 2.6", strokeLinecap: "round" } as const;

/** Onde ficam os pregadores de cada peça (no eixo x da caixa de 100). */
const PREGADORES: Record<Peca, number[]> = { body: [33, 67], macacao: [34, 66], vestido: [36, 64], babador: [33, 67], meinha: [50] };

/** Pregador de madeira clara, preso na corda. */
function Pregador({ x, n }: { x: number; n: number }) {
  return (
    <g transform={`translate(${x} 2)`}>
      {/* O grupo de dentro é o que se mexe quando o pregador abre (data-n: a ordem em que solta) */}
      <g data-n={n}>
      <rect x={-4} y={0} width={8} height={21} rx={2.4} fill="#F1DFC4" stroke="#C9A77C" strokeWidth={1.4} />
      <path d="M-4 9.5 H4" stroke="#A9AFB3" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M0 13 V21" stroke="#C9A77C" strokeWidth={1} strokeLinecap="round" />
      </g>
    </g>
  );
}

function Body() {
  return (
    <>
      <path d="M38 23 L24 27 L13 41 L24 48 L30 41 L30 80 Q33 97 44 99 L56 99 Q67 97 70 80 L70 41 L76 48 L87 41 L76 27 L62 23 Q50 33 38 23 Z" fill="#FBDDE2" stroke="#E5A9B6" {...TRACO} />
      <path d="M33 46 V79 Q36 92 45 94" stroke="#EFC0CA" {...COSTURA} />
      <path d="M40 25 Q50 36 60 25" fill="none" stroke="#E5A9B6" strokeWidth={1.4} strokeLinecap="round" />
      {[44, 50, 56].map((x) => <circle key={x} cx={x} cy={93.5} r={1.9} fill="#fff" stroke="#E5A9B6" strokeWidth={1.1} />)}
    </>
  );
}

function Macacao() {
  return (
    <>
      <path d="M40 23 L23 29 L10 57 L20 62 L30 44 L30 76 L27 106 Q36 110 46 107 L50 86 L54 107 Q64 110 73 106 L70 76 L70 44 L80 62 L90 57 L77 29 L60 23 Q50 32 40 23 Z" fill="#D9EAF6" stroke="#9FC3DE" {...TRACO} />
      <path d="M28 99 Q37 102 46 100 M54 100 Q63 102 72 99" fill="none" stroke="#9FC3DE" strokeWidth={1.3} strokeLinecap="round" />
      <path d="M50 34 V82" stroke="#B9D4E8" {...COSTURA} />
      {[42, 54, 66].map((y) => <circle key={y} cx={50} cy={y} r={2.1} fill="#fff" stroke="#9FC3DE" strokeWidth={1.1} />)}
    </>
  );
}

/** Vestidinho: corpinho com manguinhas bufantes e gola, lacinho na cintura e a saia rodada com barra ondulada. */
function Vestido() {
  return (
    <>
      {/* A saia rodada */}
      <path d="M37 50 L20 88 Q26 93 32 89 Q38 85 44 89 Q50 93 56 89 Q62 85 68 89 Q74 93 80 88 L63 50 Z" fill="#FCF1C6" stroke="#E3CB82" {...TRACO} />
      <path d="M42 56 L34 84 M50 56 V86 M58 56 L66 84" fill="none" stroke="#F3E3AE" strokeWidth={1.2} strokeLinecap="round" />
      <path d="M24 82 Q50 90 76 82" stroke="#EFDDA3" {...COSTURA} />
      {/* O corpinho com as manguinhas */}
      <path d="M41 23 L33 25 Q24 27 22 37 L31 42 L36 38 L37 50 L63 50 L64 38 L69 42 L78 37 Q76 27 67 25 L59 23 Q50 32 41 23 Z" fill="#FDF5D6" stroke="#E3CB82" {...TRACO} />
      {/* A gola */}
      <path d="M41 23 Q44 33 50 31 Q56 33 59 23 Q50 31 41 23 Z" fill="#FFFDF2" stroke="#E3CB82" strokeWidth={1.3} strokeLinejoin="round" />
      {/* O lacinho rosa na cintura */}
      <path d="M50 50 L43.5 46.5 Q42 50 43.5 53.5 Z M50 50 L56.5 46.5 Q58 50 56.5 53.5 Z" fill="#FBDDE2" stroke="#E5A9B6" strokeWidth={1.1} strokeLinejoin="round" />
      <circle cx={50} cy={50} r={1.9} fill="#FBDDE2" stroke="#E5A9B6" strokeWidth={1.1} />
    </>
  );
}

function Babador() {
  return (
    <>
      {/* As alças sobem até os pregadores */}
      <path d="M35 44 Q31 30 33 20 M65 44 Q69 30 67 20" fill="none" stroke="#BDA9DC" strokeWidth={3.4} strokeLinecap="round" />
      <path d="M35 44 Q31 30 33 20 M65 44 Q69 30 67 20" fill="none" stroke="#E9DFF7" strokeWidth={1.4} strokeLinecap="round" />
      <path d="M31 40 C17 52 17 78 28 92 C38 104 62 104 72 92 C83 78 83 52 69 40 C66 56 34 56 31 40 Z" fill="#E9DFF7" stroke="#BDA9DC" {...TRACO} />
      <path d="M26 62 C24 76 30 90 40 95 M74 62 C76 76 70 90 60 95" stroke="#CFC0E8" {...COSTURA} />
      <path d="M50 87 C39 79 37 71 43 67.5 C46.5 65.5 49.5 68 50 70.5 C50.5 68 53.5 65.5 57 67.5 C63 71 61 79 50 87 Z" fill="#FBDDE2" stroke="#E5A9B6" strokeWidth={1.4} strokeLinejoin="round" />
    </>
  );
}

/** Meinha pequena (proporcional às outras peças): o desenho encolhe em torno do pregador. */
function Meinha() {
  return (
    <g transform="translate(50 20) scale(0.56) translate(-50 -20)">
      <path d="M38 30 L62 30 L62 68 Q62 74 68 77 L79 83 Q90 89 86 98 Q82 107 69 105 L49 101 Q37 98 38 85 Z" fill="#DCEBD3" stroke="#A9C79B" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      <path d="M41 84 Q42 95 52 97" fill="none" stroke="#BFD8B3" strokeWidth={1.5} strokeDasharray="3 3.4" strokeLinecap="round" />
      <path d="M72 81 Q80 88 80 100" fill="none" stroke="#A9C79B" strokeWidth={1.8} strokeLinecap="round" />
      <rect x={35} y={22} width={30} height={15} rx={5} fill="#FCF1C6" stroke="#E3CB82" strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M42 26 V33 M50 26 V33 M58 26 V33" stroke="#EFDDA3" strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

const DESENHO: Record<Peca, () => React.ReactNode> = { body: Body, macacao: Macacao, vestido: Vestido, babador: Babador, meinha: Meinha };

export function Roupinha({ peca }: { peca: Peca }) {
  const Desenho = DESENHO[peca];
  return (
    <svg viewBox="0 0 100 124" width="100%" aria-hidden focusable="false">
      <Desenho />
    </svg>
  );
}

/** Os pregadores da peça, num desenho à parte e na mesma caixa: ficam na corda quando ela cai. */
export function Pregadores({ peca, className }: { peca: Peca; className?: string }) {
  return (
    <svg viewBox="0 0 100 124" width="100%" className={className} aria-hidden focusable="false">
      {/* O da direita solta primeiro (n = 1); o da esquerda (ou o único) segura a peça até o fim (n = 2) */}
      {PREGADORES[peca].map((x, indice) => <Pregador key={x} x={x} n={indice === 0 ? 2 : 1} />)}
    </svg>
  );
}

/** Estrelinha de quatro pontas (o brilho da cena). */
export function Brilho({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden focusable="false">
      <path d="M12 1.5 C12.8 7.2 14.3 10 22.5 12 C14.3 14 12.8 16.8 12 22.5 C11.2 16.8 9.7 14 1.5 12 C9.7 10 11.2 7.2 12 1.5 Z" fill="currentColor" />
    </svg>
  );
}
