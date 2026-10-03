"use client";

import styled from "@emotion/styled";
import {
  ArrowCounterClockwiseIcon,
  CircleHalfIcon,
  EyeIcon,
  KeyboardIcon,
  TextAaIcon,
  WavesIcon,
} from "@phosphor-icons/react";
import { HeaderActions } from "@/components/layout/Header/HeaderActions";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { transientOptions } from "@/lib/emotion/transient";
import {
  defaultAccessibility,
  useAccessibility,
  type Appearance,
  type Motion,
  type TextSize,
} from "@/providers/accessibility";
import { Divider, Page, PageHeader, Section, ToggleRow } from "./ui";

const sizes: { value: TextSize; label: string; sample: string }[] = [
  { value: "default", label: "Padrão", sample: "0.9375rem" },
  { value: "large", label: "Grande", sample: "1.0625rem" },
  { value: "larger", label: "Maior", sample: "1.1875rem" },
];

const appearances: { value: Appearance; label: string; hint: string }[] = [
  { value: "light", label: "Claro", hint: "Fundo claro" },
  { value: "dark", label: "Escuro", hint: "Descansa a vista à noite" },
  { value: "system", label: "Como no sistema", hint: "Segue o computador ou celular" },
];

const shortcuts: { keys: string[]; action: string }[] = [
  { keys: ["Ctrl", "K"], action: "Buscar em qualquer tela" },
  { keys: ["Tab"], action: "Ir para o próximo botão ou campo" },
  { keys: ["Esc"], action: "Fechar menus, janelas e cancelar uma edição" },
  { keys: ["↑", "↓"], action: "Navegar em menus, listas e no calendário" },
  { keys: ["Enter"], action: "Enviar a mensagem ou salvar o campo editado" },
  { keys: ["Shift", "Enter"], action: "Quebrar a linha da mensagem" },
];

/* ---------- Estilos ---------- */

const SizeGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing(2)};
`;

/** Opção de tamanho: cartão com "Aa" no tamanho real. */
const SizeOption = styled("button", transientOptions)<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(3)};
  border: 1px solid ${({ theme, $selected }) => ($selected ? theme.colors.primary.main : theme.colors.border.subtle)};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $selected }) =>
    $selected ? `color-mix(in srgb, ${theme.palette.sage[500]} 8%, ${theme.palette.neutral[0]})` : theme.palette.neutral[0]};
  text-align: left;
  transition:
    border-color ${({ theme }) => theme.transitions.fast},
    background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme, $selected }) => ($selected ? theme.colors.primary.main : theme.colors.border.default)};
  }

  strong {
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    line-height: 1.2;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  span {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

/** Miniatura da tela no tema (metade clara e metade escura no "sistema"). */
const Preview = styled("span", transientOptions)<{ $mode: Appearance }>`
  position: relative;
  display: block;
  width: 100%;
  height: 3.5rem;
  margin-bottom: ${({ theme }) => theme.spacing(1)};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $mode }) =>
    $mode === "light"
      ? "#f3f2ec"
      : $mode === "dark"
        ? "#141513"
        : "linear-gradient(90deg, #f3f2ec 50%, #141513 50%)"};

  /* "Painel" e "linhas" da miniatura */
  &::before {
    content: "";
    position: absolute;
    inset: 8px 8px 0 28px;
    border-radius: 4px 4px 0 0;
    background: ${({ $mode }) =>
      $mode === "light"
        ? "#ffffff"
        : $mode === "dark"
          ? "#1f211e"
          : "linear-gradient(90deg, #ffffff 50%, #1f211e 50%)"};
  }

  &::after {
    content: "";
    position: absolute;
    top: 18px;
    left: 38px;
    width: 40%;
    height: 5px;
    border-radius: 3px;
    background: ${({ $mode }) => ($mode === "dark" ? "#4a4e46" : "#cfd6c4")};
    box-shadow: 0 10px 0 ${({ $mode }) => ($mode === "dark" ? "#34372f" : "#e3e5dc")};
  }
`;

const FieldTitle = styled.span`
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Shortcuts = styled.dl`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2.5)};

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing(4)};
  }

  dt {
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  dd {
    display: inline-flex;
    flex-shrink: 0;
    gap: ${({ theme }) => theme.spacing(1)};
  }

  kbd {
    display: inline-flex;
    align-items: center;
    height: 1.5rem;
    padding: ${({ theme }) => theme.spacing(0, 2)};
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-radius: ${({ theme }) => theme.radii.sm};
    background-color: ${({ theme }) => theme.colors.background.surface};
    font-family: inherit;
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

/* ---------- Tela ---------- */

/** Ajustes de leitura, contraste, movimento e teclado de quem está usando. */
export function AccessibilitySettings() {
  const { settings, update, reset } = useAccessibility();
  const changed = JSON.stringify(settings) !== JSON.stringify(defaultAccessibility);

  return (
    <Page>
      <HeaderActions>
        <Button variant="secondary" icon={ArrowCounterClockwiseIcon} disabled={!changed} onClick={reset}>
          Restaurar padrão
        </Button>
      </HeaderActions>

      <PageHeader
        title="Acessibilidade"
        description="Tema, leitura, contraste e movimento do seu jeito. Vale na hora e fica salvo neste navegador."
      />

      <div>
        <Section title="Aparência" icon={CircleHalfIcon} description="Claro, escuro ou igual ao seu aparelho.">
          <FieldTitle id="appearance">Tema</FieldTitle>
          <SizeGroup role="radiogroup" aria-labelledby="appearance">
            {appearances.map((option) => (
              <SizeOption
                key={option.value}
                type="button"
                role="radio"
                aria-checked={settings.appearance === option.value}
                $selected={settings.appearance === option.value}
                onClick={() => update({ appearance: option.value })}
              >
                <Preview $mode={option.value} aria-hidden />
                <strong style={{ fontSize: "0.8125rem" }}>{option.label}</strong>
                <span>{option.hint}</span>
              </SizeOption>
            ))}
          </SizeGroup>
        </Section>

        <Section title="Leitura" icon={TextAaIcon} description="Tamanho das letras e espaço entre elas, em todas as telas.">
          <FieldTitle id="text-size">Tamanho do texto</FieldTitle>
          <SizeGroup role="radiogroup" aria-labelledby="text-size">
            {sizes.map((size) => (
              <SizeOption
                key={size.value}
                type="button"
                role="radio"
                aria-checked={settings.textSize === size.value}
                $selected={settings.textSize === size.value}
                onClick={() => update({ textSize: size.value })}
              >
                <strong style={{ fontSize: size.sample }}>Aa</strong>
                <span>{size.label}</span>
              </SizeOption>
            ))}
          </SizeGroup>
          <Divider />
          <ToggleRow
            title="Espaçamento de leitura"
            description="Mais espaço entre letras, palavras e linhas. Ajuda em textos longos."
            checked={settings.readableSpacing}
            onChange={(readableSpacing) => update({ readableSpacing })}
          />
        </Section>

        <Section title="Visual" icon={EyeIcon} description="Contraste de textos e bordas e destaque dos links.">
          <ToggleRow
            title="Alto contraste"
            description="Textos secundários e bordas ficam mais escuros."
            checked={settings.highContrast}
            onChange={(highContrast) => update({ highContrast })}
          />
          <Divider />
          <ToggleRow
            title="Sublinhar links"
            description="Links dentro de textos e tabelas ficam sempre sublinhados."
            checked={settings.underlineLinks}
            onChange={(underlineLinks) => update({ underlineLinks })}
          />
        </Section>

        <Section title="Movimento" icon={WavesIcon} description="Animações de menus, janelas e transições da tela.">
          <Select
            label="Animações"
            heading="Animações"
            value={settings.motion}
            onChange={(motion: Motion) => update({ motion })}
            options={[
              { value: "system", label: "Como no sistema", description: "Segue a configuração do seu computador ou celular" },
              { value: "reduce", label: "Reduzir", description: "Quase sem movimento, tudo aparece na hora" },
              { value: "always", label: "Normal", description: "Todas as animações, mesmo com o sistema reduzindo" },
            ]}
          />
        </Section>

        <Section title="Teclado" icon={KeyboardIcon} description="Para usar o sistema sem o mouse.">
          <ToggleRow
            title="Destacar sempre o foco"
            description="Mostra o contorno do item em foco também ao usar o mouse."
            checked={settings.focusAlways}
            onChange={(focusAlways) => update({ focusAlways })}
          />
          <Divider />
          <FieldTitle>Atalhos</FieldTitle>
          <Shortcuts>
            {shortcuts.map((shortcut) => (
              <div key={shortcut.action}>
                <dt>{shortcut.action}</dt>
                <dd>
                  {shortcut.keys.map((key) => (
                    <kbd key={key}>{key}</kbd>
                  ))}
                </dd>
              </div>
            ))}
          </Shortcuts>
        </Section>
      </div>
    </Page>
  );
}
