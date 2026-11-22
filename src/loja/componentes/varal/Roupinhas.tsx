import type { Peca } from "@/loja/lib/varal/regras";

// As cinco roupinhas do varal, desenhadas à mão em SVG (traço fino, cantos arredondados). Tudo em tons pastel bem
// clarinhos e delicados: rosa, azul, amarelo, lilás e verde, sem vermelho. Os pregadores são um desenho à parte
// (<Pregadores>), na mesma caixa de 100 × 124: quando a peça cai, eles ficam na corda. A corda passa na altura 12.

const TRACO = { strokeWidth: 1.8, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const COSTURA = { fill: "none", strokeWidth: 1.1, strokeDasharray: "2.4 2.6", strokeLinecap: "round" } as const;

/** Onde ficam os pregadores de cada peça (no eixo x da caixa de 100). */
const PREGADORES: Record<Peca, number[]> = { body: [33, 67], macacao: [34, 66], touca: [50], babador: [33, 67], meinha: [50] };

/** Pregador de madeira clara, preso na corda. */
function Pregador({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 2)`}>
      <rect x={-4} y={0} width={8} height={21} rx={2.4} fill="#F1DFC4" stroke="#C9A77C" strokeWidth={1.4} />
      <path d="M-4 9.5 H4" stroke="#A9AFB3" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M0 13 V21" stroke="#C9A77C" strokeWidth={1} strokeLinecap="round" />
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

function Touca() {
  return (
    <>
      <circle cx={50} cy={31} r={9} fill="#FFFAE6" stroke="#E3CB82" {...TRACO} />
      <path d="M45 28 Q50 24 55 28 M44 33 Q50 30 56 33" fill="none" stroke="#EFDDA3" strokeWidth={1} strokeLinecap="round" />
      <path d="M25 80 Q23 42 50 39 Q77 42 75 80 Z" fill="#FCF1C6" stroke="#E3CB82" {...TRACO} />
      <path d="M38 45 Q34 60 35 76 M50 42 V76 M62 45 Q66 60 65 76" stroke="#EFDDA3" {...COSTURA} />
      <rect x={21} y={76} width={58} height={17} rx={8} fill="#E9DFF7" stroke="#BDA9DC" {...TRACO} />
      <path d="M30 80 V89 M38 80 V89 M46 80 V89 M54 80 V89 M62 80 V89 M70 80 V89" stroke="#CFC0E8" strokeWidth={1.1} strokeLinecap="round" />
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

function Meinha() {
  return (
    <>
      <path d="M38 30 L62 30 L62 68 Q62 74 68 77 L79 83 Q90 89 86 98 Q82 107 69 105 L49 101 Q37 98 38 85 Z" fill="#DCEBD3" stroke="#A9C79B" {...TRACO} />
      <path d="M41 84 Q42 95 52 97" stroke="#BFD8B3" {...COSTURA} />
      <path d="M72 81 Q80 88 80 100" fill="none" stroke="#A9C79B" strokeWidth={1.3} strokeLinecap="round" />
      <rect x={35} y={22} width={30} height={15} rx={5} fill="#FCF1C6" stroke="#E3CB82" {...TRACO} />
      <path d="M42 26 V33 M50 26 V33 M58 26 V33" stroke="#EFDDA3" strokeWidth={1.1} strokeLinecap="round" />
    </>
  );
}

const DESENHO: Record<Peca, () => React.ReactNode> = { body: Body, macacao: Macacao, touca: Touca, babador: Babador, meinha: Meinha };

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
      {PREGADORES[peca].map((x) => <Pregador key={x} x={x} />)}
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
