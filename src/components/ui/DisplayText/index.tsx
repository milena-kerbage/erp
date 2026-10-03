"use client";

import { Fragment, useMemo } from "react";
import styled from "@emotion/styled";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { accents, letters, type AccentName } from "./accents";

/**
 * Texto na fonte da marca (Scarlett) com acentos corretos.
 *
 * A Scarlett não tem acentos nem cedilha. Aqui cada letra acentuada é
 * desenhada na própria Scarlett e o acento é sobreposto como vetor,
 * posicionado a partir da linha de base pelas métricas da letra (a linha de
 * base é igual em qualquer sistema; a altura da caixa da linha não é).
 * Leitores de tela recebem o texto original.
 */

const MARKS: Record<string, AccentName> = {
  "\u0300": "grave",
  "\u0301": "acute",
  "\u0302": "circumflex",
  "\u0303": "tilde",
  "\u0308": "diaeresis",
  "\u0327": "cedilla",
};

/** Respiro entre a letra e o acento (1/1000 em). */
const GAP = 60;
/** Os acentos da Sacramento são proporcionais a letras menores que as da Scarlett. */
const SCALE = 1.3;
/** A Scarlett é inclinada: quanto mais alto, mais o acento vai para a direita. */
const SLANT = 0.075;

type Segment = { text: string; marks: AccentName[] };

function segment(text: string): Segment[] {
  const result: Segment[] = [];

  for (const char of text.normalize("NFD")) {
    const mark = MARKS[char];
    const last = result[result.length - 1];

    if (mark && last) {
      // O acento pertence à última letra: isola essa letra num segmento próprio.
      if (last.text.length > 1) {
        const base = last.text.slice(-1);
        last.text = last.text.slice(0, -1);
        result.push({ text: base, marks: [mark] });
      } else {
        last.marks.push(mark);
      }
    } else if (last && last.marks.length === 0) {
      last.text += char;
    } else {
      result.push({ text: char, marks: [] });
    }
  }

  return result;
}

function metricsFor(base: string) {
  const isUpper = base !== base.toLowerCase();
  return (
    letters[base] ?? {
      center: 250,
      top: isUpper ? 967 : 408,
      bottom: isUpper ? -121 : -19,
    }
  );
}

/** Âncora de tamanho zero na linha de base, logo antes da letra acentuada. */
const Anchor = styled.span`
  position: relative;
  display: inline-block;
  width: 0;
  height: 0;
  vertical-align: baseline;
`;

const Accent = styled.svg`
  position: absolute;
  max-width: none;
  pointer-events: none;
`;

function AccentMark({ base, name }: { base: string; name: AccentName }) {
  const accent = accents[name];
  const letter = metricsFor(base);
  const below = name === "cedilla";

  // Coordenadas em 1/1000 em, a partir da origem da letra na linha de base.
  const width = accent.width * SCALE;
  const height = accent.height * SCALE;
  const bottom = below ? letter.bottom + 12 - height : letter.top + GAP;
  const midHeight = bottom + height / 2;
  const left = letter.center - width / 2 + SLANT * midHeight;

  return (
    <Accent
      viewBox={`0 0 ${accent.width} ${accent.height}`}
      fill="currentColor"
      focusable="false"
      style={{
        left: `${left / 1000}em`,
        bottom: `${bottom / 1000}em`,
        width: `${width / 1000}em`,
        height: `${height / 1000}em`,
      }}
    >
      <path d={accent.d} />
    </Accent>
  );
}

export function DisplayText({ children }: { children: string }) {
  const segments = useMemo(() => segment(children), [children]);

  return (
    <>
      <VisuallyHidden>{children}</VisuallyHidden>
      <span aria-hidden>
        {segments.map((part, index) =>
          part.marks.length === 0 ? (
            <Fragment key={index}>{part.text}</Fragment>
          ) : (
            <Fragment key={index}>
              <Anchor>
                {part.marks.map((mark) => (
                  <AccentMark key={mark} base={part.text} name={mark} />
                ))}
              </Anchor>
              {part.text}
            </Fragment>
          ),
        )}
      </span>
    </>
  );
}
