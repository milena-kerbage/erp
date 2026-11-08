"use client";

import { type CSSProperties, type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { prefereMenosMovimento } from "@/loja/componentes/layout/cabecalho/Gaveta";
import { buscarPaleta, incluido, type Quartinho } from "@/loja/lib/casas/modulos";
import { tomDaPaleta } from "./FotoProjeto";

// Prévia do conjunto ("Seu quartinho"): um quarto estilizado nos tons da paleta (parede e chão) com as
// peças escolhidas no lugar: janela com cortina, berço (lençóis, edredom, saia e mosquiteiro), tapete,
// almofadas, enfeite de porta, mini cama, prateleira de paninhos, manta, bolsa e a saída de
// maternidade no cabide. Ilustração (aria-hidden): a lista do resumo diz o mesmo em texto.
// Movimento: cada peça entra crescendo e sai encolhendo (a saída espera a animação antes de sumir); a
// recém-incluída (`recente`) ganha um halo sálvia; com o mouse, as peças se deslocam de leve conforme
// a profundidade (parallax). Movimento reduzido: sem parallax e sem animações (globalCss da loja).

const SAIDA_MS = 260;

const PECAS_BERCO = ["kit-berco", "protetor", "lencois", "edredom", "saia"];

export function PreviaQuartinho({ quartinho, recente, className }: { quartinho: Quartinho; recente?: string | null; className?: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const cores = buscarPaleta(quartinho.paleta)?.cores.map((cor) => cor.hex) ?? [];
  const [c1, c2, c3] = [cores[0], cores[1] ?? cores[0], cores[2] ?? cores[1] ?? cores[0]];
  const tem = (id: string) => incluido(quartinho, id);
  const realce = (...ids: string[]) => Boolean(recente && ids.includes(recente));
  const berco = PECAS_BERCO.some(tem);

  // Parallax: posição do mouse de -1 a 1 em variáveis CSS (direto no DOM, sem renderizar de novo).
  function mover(evento: PointerEvent<HTMLDivElement>) {
    const elemento = caixa.current;
    if (!elemento || evento.pointerType !== "mouse" || prefereMenosMovimento()) return;
    const area = elemento.getBoundingClientRect();
    elemento.style.setProperty("--px", (((evento.clientX - area.left) / area.width) * 2 - 1).toFixed(3));
    elemento.style.setProperty("--py", (((evento.clientY - area.top) / area.height) * 2 - 1).toFixed(3));
  }

  function soltar() {
    caixa.current?.style.setProperty("--px", "0");
    caixa.current?.style.setProperty("--py", "0");
  }

  return (
    <div
      ref={caixa}
      aria-hidden
      onPointerMove={mover}
      onPointerLeave={soltar}
      className={cx(previa, className)}
      style={{
        backgroundImage: `linear-gradient(180deg, ${tomDaPaleta(c1, 28)} 0%, ${tomDaPaleta(c1, 18)} 64%, ${tomDaPaleta(c2, 40)} 64%, ${tomDaPaleta(c2, 55)} 100%)`,
      }}
    >
      <Peca ativa profundidade={0.4} className={janela}>
        <Peca ativa={tem("cortina")} realce={realce("cortina")} profundidade={0} className={cx(cortina, css({ left: "0" }))} style={{ backgroundColor: tomDaPaleta(c3, 70) }} />
        <Peca ativa={tem("cortina")} realce={realce("cortina")} profundidade={0} className={cx(cortina, css({ right: "0" }))} style={{ backgroundColor: tomDaPaleta(c3, 70) }} />
      </Peca>
      <Peca ativa={tem("enfeite-porta")} realce={realce("enfeite-porta")} profundidade={0.5} className={enfeite} style={{ borderColor: tomDaPaleta(c3, 85) }} />
      <Peca ativa={tem("saida-maternidade")} realce={realce("saida-maternidade")} profundidade={0.6} className={cabide}>
        <span className={roupinha} style={{ backgroundColor: tomDaPaleta(c1, 75) }} />
      </Peca>
      <Peca ativa={tem("paninhos")} realce={realce("paninhos")} profundidade={0.6} className={prateleira}>
        {[c3, c1, c2].map((cor, indice) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: ilustração fixa de 3 paninhos dobrados
          <span key={indice} className={paninho} style={{ backgroundColor: tomDaPaleta(cor, 70) }} />
        ))}
      </Peca>
      <Peca ativa={tem("mosquiteiro")} realce={realce("mosquiteiro")} profundidade={0.7} className={mosquiteiro} style={{ borderBottomColor: tomDaPaleta(c1, 45) }} />
      <Peca ativa={tem("tapete")} realce={realce("tapete")} profundidade={1.4} className={tapete} style={{ backgroundColor: tomDaPaleta(c3, 60) }} />
      <Peca ativa={berco} realce={realce(...PECAS_BERCO)} profundidade={1} className={bercoEstilo}>
        <span className={grade1} />
        <span className={colchao} style={{ backgroundColor: tomDaPaleta(tem("protetor") || tem("kit-berco") || tem("lencois") ? c3 : c1, 70) }} />
        {(tem("edredom") || tem("kit-berco")) && <span className={edredom} style={{ backgroundColor: tomDaPaleta(c1, 80) }} />}
        {(tem("saia") || tem("kit-berco")) && <span className={saia} style={{ backgroundColor: tomDaPaleta(c2, 75) }} />}
      </Peca>
      <Peca ativa={tem("manta")} realce={realce("manta")} profundidade={1.1} className={manta} style={{ backgroundColor: tomDaPaleta(c2, 85) }} />
      <Peca ativa={tem("kit-mini-cama")} realce={realce("kit-mini-cama")} profundidade={1.2} className={miniCama} style={{ backgroundColor: tomDaPaleta(c3, 65) }} />
      <Peca ativa={tem("almofadas")} realce={realce("almofadas")} profundidade={1.3} className={almofadas}>
        {[c1, c3, c2].map((cor, indice) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: ilustração fixa de 3 almofadas
          <span key={indice} className={almofada} style={{ backgroundColor: tomDaPaleta(cor, 80) }} />
        ))}
      </Peca>
      <Peca ativa={tem("bolsa-maternidade")} realce={realce("bolsa-maternidade")} profundidade={1.5} className={bolsa} style={{ backgroundColor: tomDaPaleta(c2, 80) }} />
      {!cores.length && <span className={vazia}>A prévia ganha as cores da paleta</span>}
    </div>
  );
}

// Peça com entrada e saída animadas: ao sair, fica montada com data-saindo até o fim da animação. O
// halo da recém-incluída é uma 2ª animação, ligada pelo data-realce (quem usa o desliga depois de ~1,6 s).
function Peca({
  ativa,
  realce = false,
  profundidade = 1,
  className,
  style,
  children,
}: {
  ativa: boolean;
  realce?: boolean;
  profundidade?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const [montada, setMontada] = useState(ativa);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (ativa) {
      setMontada(true);
      setSaindo(false);
      return;
    }
    setSaindo(true);
    const tempo = window.setTimeout(
      () => {
        setMontada(false);
        setSaindo(false);
      },
      prefereMenosMovimento() ? 0 : SAIDA_MS,
    );
    return () => window.clearTimeout(tempo);
  }, [ativa]);

  if (!montada && !ativa) return null;
  return (
    <span
      data-saindo={saindo || undefined}
      data-realce={(realce && !saindo) || undefined}
      className={cx(peca, className)}
      style={{ ...style, "--prof": profundidade } as CSSProperties}
    >
      {children}
    </span>
  );
}

// Quarto 16:10 com cantos de 12; as peças são formas simples posicionadas em % (cqw = largura).
const previa = css({
  position: "relative",
  aspectRatio: "[16 / 10]",
  borderRadius: "lg",
  overflow: "hidden",
  bg: "fundoProduto",
  containerType: "inline-size",
  transitionProperty: "background-image",
  transitionDuration: "lenta",
});

// Toda peça: entra crescendo, sai encolhendo e anda com o parallax (transform, separado do translate
// que centraliza algumas formas e da escala da entrada).
const peca = css({
  position: "absolute",
  display: "block",
  animation: "entrarPeca",
  transform: "[translate3d(calc(var(--px, 0) * var(--prof, 1) * -1.2cqw), calc(var(--py, 0) * var(--prof, 1) * -0.8cqw), 0)]",
  transitionProperty: "transform",
  transitionDuration: "lenta",
  transitionTimingFunction: "padrao",
  "&[data-saindo]": { animation: "sairPeca" },
  "&[data-realce]": {
    animationName: "[entrarPeca, realcePeca]",
    animationDuration: "[480ms, 1400ms]",
    animationTimingFunction: "[cubic-bezier(0.34, 1.4, 0.64, 1), cubic-bezier(0.2, 0, 0, 1)]",
    animationDelay: "[0ms, 120ms]",
    animationFillMode: "both",
  },
});

const janela = css({
  top: "[12%]",
  left: "[8%]",
  w: "[22%]",
  h: "[38%]",
  borderRadius: "[4px]",
  bg: "superficie",
  boxShadow: "[inset 0 0 0 2px token(colors.borda)]",
  overflow: "hidden",
});

const cortina = css({ top: "0", bottom: "0", w: "[34%]", transformOrigin: "top" });

const enfeite = css({ top: "[18%]", right: "[10%]", w: "[9%]", aspectRatio: "square", borderRadius: "pilula", borderWidth: "[3px]", borderStyle: "solid" });

// Cabide com a saída de maternidade, entre a janela e o enfeite.
const cabide = css({
  top: "[14%]",
  right: "[24%]",
  w: "[7%]",
  h: "[20%]",
  borderTopWidth: "[2px]",
  borderTopStyle: "solid",
  borderColor: "textoSuave",
  borderRadius: "[40% 40% 0 0]",
});

const roupinha = css({ position: "absolute", top: "[18%]", left: "[8%]", right: "[8%]", bottom: "0", borderRadius: "[30% 30% 18% 18%]" });

// Prateleira com 3 paninhos dobrados, na parede da direita.
const prateleira = css({
  top: "[40%]",
  right: "[5%]",
  w: "[15%]",
  display: "flex",
  alignItems: "flex-end",
  gap: "[6%]",
  pb: "[2px]",
  borderBottomWidth: "[3px]",
  borderBottomStyle: "solid",
  borderColor: "superficie",
});

const paninho = css({ flex: "1", h: "[2.6cqw]", borderRadius: "[2px]", boxShadow: "[inset 0 0 0 1px token(colors.contornoAmostra)]" });

const mosquiteiro = css({
  top: "[6%]",
  left: "[50%]",
  translate: "[-50% 0]",
  w: "0",
  h: "0",
  borderLeft: "[18cqw solid transparent]",
  borderRight: "[18cqw solid transparent]",
  borderBottomWidth: "[16cqw]",
  borderBottomStyle: "solid",
  opacity: "[0.7]",
});

const tapete = css({ bottom: "[6%]", left: "[50%]", translate: "[-50% 0]", w: "[46%]", h: "[18%]", borderRadius: "[50%]" });

const bercoEstilo = css({ left: "[38%]", bottom: "[22%]", w: "[34%]", h: "[30%]" });

const grade1 = css({
  position: "absolute",
  inset: "0",
  borderWidth: "[2px]",
  borderColor: "superficie",
  borderTopWidth: "[3px]",
  bgImage: "[repeating-linear-gradient(90deg, token(colors.superficie) 0 2px, transparent 2px 12%)]",
});

const colchao = css({ position: "absolute", left: "[4%]", right: "[4%]", bottom: "[30%]", h: "[22%]", borderRadius: "[2px]", animation: "escurecer" });

const edredom = css({ position: "absolute", left: "[30%]", right: "[4%]", bottom: "[38%]", h: "[16%]", borderRadius: "[3px]", animation: "entrarPeca" });

const saia = css({ position: "absolute", left: "0", right: "0", bottom: "0", h: "[30%]", animation: "escurecer" });

// Manta dobrada sobre a lateral do berço.
const manta = css({ left: "[64%]", bottom: "[34%]", w: "[7%]", h: "[20%]", borderRadius: "[3px 3px 6px 6px]", rotate: "[6deg]" });

const miniCama = css({ left: "[74%]", bottom: "[18%]", w: "[20%]", h: "[9%]", borderRadius: "[3px]" });

const almofadas = css({ left: "[12%]", bottom: "[20%]", display: "flex", gap: "[3%]", w: "[22%]" });

const almofada = css({ flex: "1", aspectRatio: "square", borderRadius: "[40%]", boxShadow: "[inset 0 0 0 1px token(colors.contornoAmostra)]" });

// Bolsa maternidade no chão, com a alça.
const bolsa = css({
  left: "[3%]",
  bottom: "[7%]",
  w: "[10%]",
  h: "[12%]",
  borderRadius: "[3px 3px 8px 8px]",
  boxShadow: "[inset 0 0 0 1px token(colors.contornoAmostra)]",
  _before: {
    content: '""',
    position: "absolute",
    left: "[25%]",
    right: "[25%]",
    bottom: "[100%]",
    h: "[60%]",
    borderWidth: "[2px]",
    borderBottomWidth: "0",
    borderColor: "textoSuave",
    borderRadius: "[50% 50% 0 0]",
  },
});

const vazia = css({
  position: "absolute",
  inset: "0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "xs",
  color: "textoSuave",
});
