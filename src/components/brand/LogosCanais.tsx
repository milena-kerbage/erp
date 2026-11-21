import type { Icon } from "@phosphor-icons/react";
import type { SVGProps } from "react";

// Logos dos canais no formato de ícone de aplicativo, com as cores oficiais: WhatsApp no círculo verde e Instagram no
// quadrado com o degradê, os dois com o símbolo branco. Ficam coloridas e legíveis em fundo claro ou escuro (inclusive
// no item ativo do menu). Aceitam as props dos ícones do Phosphor (size, weight etc.) para entrar no menu sem adaptação.
type Props = Omit<SVGProps<SVGSVGElement>, "ref"> & { size?: number | string; weight?: string; mirrored?: boolean; color?: string };

const limpar = ({ size = 20, weight: _peso, mirrored: _espelhado, color: _cor, ...resto }: Props) => ({ width: size, height: size, ...resto });

const SIMBOLO_WHATSAPP = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z";
const SIMBOLO_INSTAGRAM = "M7.03.084c-1.277.06-2.149.264-2.911.563-.789.308-1.458.72-2.123 1.388-.665.668-1.075 1.337-1.38 2.127-.296.764-.496 1.637-.552 2.914-.056 1.278-.069 1.688-.063 4.947.006 3.259.021 3.667.083 4.947.061 1.277.264 2.148.563 2.911.308.789.72 1.457 1.388 2.123.668.665 1.337 1.074 2.129 1.38.763.295 1.636.496 2.913.552 1.277.056 1.688.069 4.946.063 3.258-.006 3.668-.021 4.948-.081 1.28-.061 2.147-.265 2.91-.563.789-.309 1.458-.72 2.123-1.388.665-.668 1.074-1.338 1.379-2.128.296-.764.497-1.636.552-2.913.056-1.281.069-1.69.063-4.948-.006-3.258-.021-3.667-.082-4.946-.061-1.28-.264-2.149-.563-2.912-.308-.789-.72-1.457-1.388-2.123C21.298 1.33 20.628.921 19.838.617 19.074.321 18.202.12 16.924.065 15.647.009 15.236-.005 11.977.001 8.718.008 8.31.022 7.03.084m.14 21.693c-1.17-.051-1.805-.245-2.229-.408-.56-.216-.96-.477-1.382-.895-.422-.418-.681-.819-.9-1.378-.164-.423-.362-1.058-.417-2.228-.06-1.265-.072-1.644-.079-4.848-.007-3.204.005-3.583.061-4.848.05-1.169.246-1.805.408-2.228.216-.561.476-.96.895-1.382.419-.422.818-.681 1.378-.9.423-.165 1.058-.361 2.227-.417 1.266-.06 1.645-.072 4.848-.079 3.203-.007 3.584.005 4.85.061 1.169.051 1.805.244 2.228.408.561.216.96.475 1.382.895.422.419.682.818.9 1.379.166.422.362 1.056.417 2.226.06 1.266.074 1.645.08 4.848.006 3.203-.006 3.583-.061 4.848-.051 1.17-.245 1.806-.408 2.23-.216.56-.476.96-.895 1.381-.419.422-.818.681-1.378.9-.423.165-1.058.362-2.226.417-1.266.06-1.645.072-4.85.079-3.204.007-3.582-.006-4.848-.061M16.953 5.586a1.44 1.44 0 1 0 1.437-1.442 1.44 1.44 0 0 0-1.437 1.442M5.839 12.012c.006 3.403 2.77 6.156 6.173 6.149 3.403-.006 6.157-2.77 6.151-6.173-.007-3.403-2.771-6.157-6.174-6.15-3.403.007-6.156 2.771-6.15 6.174M8 12.008a4 4 0 1 1 4.008 3.992A4 4 0 0 1 8 12.008";

export function LogoWhatsApp(props: Props) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden {...limpar(props)}>
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <path fill="#fff" transform="translate(4.6 4.4) scale(0.62)" d={SIMBOLO_WHATSAPP} />
    </svg>
  );
}

export function LogoInstagram(props: Props) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden {...limpar(props)}>
      <defs>
        <radialGradient id="logo-instagram-degrade" cx="6.4" cy="25.8" r="25.7" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFDD55" />
          <stop offset="0.1" stopColor="#FFDD55" />
          <stop offset="0.5" stopColor="#FF543E" />
          <stop offset="1" stopColor="#C837AB" />
        </radialGradient>
        <radialGradient id="logo-instagram-azul" cx="-4" cy="1.7" r="11.5" gradientTransform="matrix(.2 1 -4.1 .8 4 -2.6)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3771C8" />
          <stop offset="0.13" stopColor="#3771C8" />
          <stop offset="1" stopColor="#6600FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6.5" fill="url(#logo-instagram-degrade)" />
      <rect width="24" height="24" rx="6.5" fill="url(#logo-instagram-azul)" />
      <path fill="#fff" transform="translate(4.8 4.8) scale(0.6)" d={SIMBOLO_INSTAGRAM} />
    </svg>
  );
}

/** Para o menu lateral, que espera um ícone do Phosphor. */
export const IconeWhatsApp = LogoWhatsApp as unknown as Icon;
export const IconeInstagram = LogoInstagram as unknown as Icon;

/**
 * Símbolo do ateliê (o monograma, sem fundo) como ícone: pinta com a cor do texto de quem usa (`currentColor`), então
 * acompanha o tema, o hover e o item ativo do menu. É o ícone do Painel.
 */
export function SimboloAtelie({ size = 20 }: Props) {
  const altura = typeof size === "number" ? size + 2 : size;
  const mascara = "url(/simbolo-black.svg) center / contain no-repeat";
  return <span aria-hidden style={{ display: "inline-block", flexShrink: 0, width: typeof altura === "number" ? Math.round(altura * (656 / 737)) : altura, height: altura, backgroundColor: "currentColor", WebkitMask: mascara, mask: mascara }} />;
}
export const IconeAtelie = SimboloAtelie as unknown as Icon;
