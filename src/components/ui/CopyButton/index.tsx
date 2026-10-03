"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@phosphor-icons/react";
import { IconButton, type IconButtonSize, type IconButtonVariant } from "@/components/ui/IconButton";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { copyText } from "@/lib/clipboard";
import type { IconSource } from "@/lib/icons";

type CopyButtonProps = {
  /** Texto copiado (ou função que o monta na hora do clique). */
  text: string | (() => string);
  /** Descrição da ação (tooltip e nome acessível). */
  label: string;
  icon: IconSource;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
};

/** Botão de ícone que copia um texto e confirma com um check por 1,5 s. */
export function CopyButton({
  text,
  label,
  icon,
  variant = "secondary",
  size = "md",
  disabled,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <>
      <IconButton
        icon={copied ? CheckIcon : icon}
        label={copied ? "Copiado!" : label}
        variant={variant}
        size={size}
        tooltip="bottom"
        disabled={disabled}
        onClick={async () => {
          if (!(await copyText(typeof text === "function" ? text() : text))) return;
          setCopied(true);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setCopied(false), 1500);
        }}
      />
      <VisuallyHidden role="status">{copied ? "Copiado" : ""}</VisuallyHidden>
    </>
  );
}
