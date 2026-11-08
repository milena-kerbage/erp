import { css, cx } from "styled-system/css";
import {
  Baby,
  Bed,
  Butterfly,
  ChatsCircle,
  Cloud,
  Feather,
  Flower,
  FlowerTulip,
  Gift,
  Handbag,
  Heart,
  Leaf,
  Medal,
  Moon,
  Needle,
  Package,
  Ruler,
  Sparkle,
  Star,
  Truck,
  Yarn,
} from "@/loja/componentes/icones";
import { brilhoAoCarregar } from "@/loja/componentes/produto/esqueleto";
import { ImagemSuave } from "@/loja/componentes/produto/ImagemSuave";

// Mídia dos módulos da home e do mega menu: foto ou vídeo quando houver (`src`, em
// public/vitrine/home/...) e, enquanto não há foto, uma composição nos tons da marca: degradê suave
// (sálvia, linho e neutros), trama de tecido em CSS e um ícone de traço fino com um anel em volta.
// Sem tamanho próprio: ocupa o contêiner (quem usa define a proporção: 100vh, 1:1, 5:6, 16:9).
// Pode ser usada em Server e Client Components (sem estado).

export type TomMidia =
  | "salvia"
  | "musgo"
  | "noite"
  | "salviaClara"
  | "linho"
  | "areia"
  | "rose"
  | "azul"
  | "cru"
  | "cinza"
  | "branco"
  | "verde"
  | "aconchego";

export type NomeIcone =
  | "bebe"
  | "berco"
  | "borboleta"
  | "conversa"
  | "nuvem"
  | "pena"
  | "flor"
  | "tulipa"
  | "presente"
  | "bolsa"
  | "coracao"
  | "folha"
  | "medalha"
  | "lua"
  | "agulha"
  | "pacote"
  | "regua"
  | "brilho"
  | "caminhao"
  | "estrela"
  | "novelo";

const ICONES = {
  bebe: Baby,
  berco: Bed,
  borboleta: Butterfly,
  conversa: ChatsCircle,
  nuvem: Cloud,
  pena: Feather,
  flor: Flower,
  tulipa: FlowerTulip,
  presente: Gift,
  bolsa: Handbag,
  coracao: Heart,
  folha: Leaf,
  medalha: Medal,
  lua: Moon,
  agulha: Needle,
  pacote: Package,
  regua: Ruler,
  brilho: Sparkle,
  caminhao: Truck,
  estrela: Star,
  novelo: Yarn,
} as const;

// Tons escuros recebem texto branco por cima (com o scrim do módulo); os claros, texto escuro abaixo.
const TONS_ESCUROS: TomMidia[] = ["salvia", "musgo", "noite", "aconchego"];

export function tomEscuro(tom: TomMidia): boolean {
  return TONS_ESCUROS.includes(tom);
}

const VIDEO = /\.(mp4|webm)$/i;

export function Midia({
  src,
  alt = "",
  tom = "linho",
  icone = "bebe",
  sizes = "100vw",
  preload = false,
  zoom = false,
  parallax = false,
  iconeNoAlto = false,
  apenasCor = false,
  className,
}: {
  src?: string;
  alt?: string;
  tom?: TomMidia;
  icone?: NomeIcone;
  sizes?: string;
  preload?: boolean; // primeira mídia da página (LCP)
  zoom?: boolean; // 1.01 em repouso e 1.1 no hover do "group" (cards da referência, 250 ms)
  parallax?: boolean; // mídia grande que anda com a rolagem (view-timeline), estática sem suporte
  iconeNoAlto?: boolean; // mídias de tela cheia com texto embaixo: o ícone sobe e não disputa com o texto
  apenasCor?: boolean; // só a composição de cor, sem trama nem selo (ex.: fundo "fora de foco" do atendimento)
  className?: string;
}) {
  const Icone = ICONES[icone];
  return (
    <div className={cx(moldura, src && brilhoAoCarregar, parallax && linhaDoTempo, className)}>
      <div data-parallax={parallax || undefined} className={cx(camada, zoom && comZoom, parallax && comParallax)}>
        {src && VIDEO.test(src) ? (
          <video src={src} autoPlay muted loop playsInline preload="metadata" aria-label={alt || undefined} className={cobrir} />
        ) : src ? (
          <ImagemSuave src={src} alt={alt} fill sizes={sizes} preload={preload} className={cobrir} />
        ) : (
          <div aria-hidden className={cx(espera, TONS[tom], tomEscuro(tom) ? sobreEscuro : sobreClaro, iconeNoAlto ? noAlto : noCentro)}>
            {!apenasCor && <span className={trama} />}
            {!apenasCor && (
              <span className={selo}>
                <Icone weight="thin" className={css({ w: "full", h: "full" })} />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const moldura = css({ position: "relative", overflow: "hidden", bg: "fundoProduto" });

const camada = css({ position: "absolute", inset: "0" });

const comZoom = css({
  transform: "scale(1.01)",
  transition: "transform",
  transitionDuration: "zoom",
  transitionTimingFunction: "[ease]",
  "@media (hover: hover)": { _groupHover: { transform: "scale(1.1)" } },
  _motionReduce: { transform: "none", _groupHover: { transform: "none" } },
});

// Parallax guiado pela rolagem (lululemon-animacoes-edicao.md §1): a moldura define a view-timeline e
// a camada, 30% mais alta, anda de −15% a +15% da altura da moldura enquanto ela cruza a tela (range
// "cover"); nunca aparece borda. Sem suporte a animation-timeline ou com movimento reduzido: estática.
// Os ancestrais não podem ser contêineres de rolagem (overflow: clip, não hidden), senão a linha do
// tempo fica presa a eles.
const linhaDoTempo = css({ viewTimelineName: "--parallax", viewTimelineAxis: "block" });

const comParallax = css({
  "&[data-parallax]": { top: "[-15%]", bottom: "[-15%]", willChange: "transform" },
  _motionSafe: {
    "@supports (animation-timeline: view())": {
      animationName: "parallaxMidia",
      animationDuration: "[1ms]",
      animationTimingFunction: "linear",
      animationFillMode: "both",
      animationTimeline: "--parallax",
      animationRange: "cover",
    },
  },
});

const cobrir = css({ position: "absolute", inset: "0", w: "full", h: "full", objectFit: "cover" });

const espera = css({ position: "absolute", inset: "0", display: "flex", justifyContent: "center" });
const noCentro = css({ alignItems: "center" });
const noAlto = css({ alignItems: "flex-start", pt: "[24svh]" });

// Trama de linho: fios finos na horizontal e na vertical, quase invisíveis, e uma luz suave no alto.
const trama = css({
  position: "absolute",
  inset: "0",
  bgImage:
    "[radial-gradient(120% 90% at 18% 8%, color-mix(in srgb, token(colors.superficie) 22%, transparent), transparent 60%), repeating-linear-gradient(0deg, color-mix(in srgb, currentColor 7%, transparent) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, color-mix(in srgb, currentColor 5%, transparent) 0 1px, transparent 1px 5px)]",
  mixBlendMode: "normal",
});

// Ícone de traço fino dentro de um anel (o "selo" do ateliê), proporcional à mídia.
const selo = css({
  position: "relative",
  display: "block",
  w: "[clamp(18px, 16%, 132px)]",
  aspectRatio: "square",
  opacity: "[0.55]",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: "[-42%]",
    borderRadius: "full",
    borderWidth: "1px",
    borderColor: "currentColor",
    opacity: "[0.35]",
  },
});

const sobreEscuro = css({ color: "fundo" });
const sobreClaro = css({ color: "marca" });

const TONS: Record<TomMidia, string> = {
  salvia: css({ bgImage: "[linear-gradient(160deg, token(colors.marca) 0%, token(colors.marcaContraste) 55%, token(colors.fundoBannerEscuro) 100%)]" }),
  musgo: css({ bgImage: "[linear-gradient(200deg, token(colors.logo) 0%, token(colors.marca) 50%, token(colors.marcaContraste) 100%)]" }),
  noite: css({ bgImage: "[linear-gradient(180deg, token(colors.fundoBannerEscuro) 0%, token(colors.escuro) 100%)]" }),
  salviaClara: css({ bgImage: "[linear-gradient(160deg, token(colors.marcaSuave) 0%, token(colors.tecido.salvia) 100%)]" }),
  linho: css({ bgImage: "[linear-gradient(160deg, token(colors.fundo) 0%, token(colors.fundoProduto) 45%, token(colors.marcaSuave) 100%)]" }),
  areia: css({ bgImage: "[linear-gradient(160deg, token(colors.fundoSutil) 0%, token(colors.superficieSuave) 50%, token(colors.placeholder) 100%)]" }),
  rose: css({ bgImage: "[linear-gradient(160deg, token(colors.fundo) 0%, token(colors.tecido.rose) 100%)]" }),
  azul: css({ bgImage: "[linear-gradient(160deg, token(colors.fundo) 0%, token(colors.tecido.azulBebe) 100%)]" }),
  verde: css({ bgImage: "[linear-gradient(160deg, token(colors.fundoProduto) 0%, token(colors.tecido.salvia) 100%)]" }),
  cru: css({ bgImage: "[linear-gradient(160deg, token(colors.fundo) 0%, token(colors.tecido.cru) 100%)]" }),
  cinza: css({ bgImage: "[linear-gradient(160deg, token(colors.fundoSutil) 0%, token(colors.tecido.cinza) 100%)]" }),
  branco: css({ bgImage: "[linear-gradient(160deg, token(colors.superficie) 0%, token(colors.fundoSutil) 100%)]" }),
  // Ambiente interno fora de foco (como a foto da promoção do app na referência): manchas de luz
  // quente, âmbar, linho e rosa antigo, sobre marrom profundo.
  aconchego: css({
    bgColor: "aconchego.profundo",
    bgImage:
      "[radial-gradient(30% 42% at 22% 36%, token(colors.aconchego.ambar), transparent 72%), radial-gradient(18% 26% at 68% 20%, token(colors.aconchego.linho), transparent 75%), radial-gradient(30% 40% at 82% 70%, token(colors.aconchego.rosado), transparent 72%), radial-gradient(22% 30% at 12% 88%, color-mix(in srgb, token(colors.aconchego.linho) 60%, transparent), transparent 72%), radial-gradient(16% 22% at 46% 84%, color-mix(in srgb, token(colors.aconchego.ambar) 70%, transparent), transparent 75%), linear-gradient(170deg, token(colors.aconchego.sombra) 0%, token(colors.aconchego.profundo) 100%)]",
  }),
};
