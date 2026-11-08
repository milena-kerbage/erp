import qrcode from "qrcode-generator";
import { css, cx } from "styled-system/css";

// QR code desenhado no SERVIDOR (qrcode-generator, MIT): vira um <svg> estático, sem JavaScript no
// navegador. Um único <path> com um quadrado de 1×1 por módulo escuro, `crispEdges` para os módulos
// não borrarem e zona de silêncio branca de 4 módulos (o mínimo da norma ISO/IEC 18004).
const ZONA_SILENCIO = 4;

export function QrCode({ valor, rotulo, className }: { valor: string; rotulo: string; className?: string }) {
  const qr = qrcode(0, "M");
  qr.addData(valor);
  qr.make();
  const modulos = qr.getModuleCount();
  const lado = modulos + ZONA_SILENCIO * 2;

  let caminho = "";
  for (let linha = 0; linha < modulos; linha++) {
    for (let coluna = 0; coluna < modulos; coluna++) {
      if (qr.isDark(linha, coluna)) caminho += `M${coluna + ZONA_SILENCIO} ${linha + ZONA_SILENCIO}h1v1h-1z`;
    }
  }

  return (
    <svg
      role="img"
      aria-label={rotulo}
      viewBox={`0 0 ${lado} ${lado}`}
      shapeRendering="crispEdges"
      data-modulos={modulos}
      className={cx(css({ display: "block", color: "escuro" }), className)}
    >
      <rect width={lado} height={lado} className={css({ fill: "superficie" })} />
      <path d={caminho} fill="currentColor" />
    </svg>
  );
}
