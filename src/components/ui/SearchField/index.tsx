"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
} from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Input, Kbd, Root } from "./styles";

type SearchFieldProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  /** Nome acessível do campo. */
  label?: string;
  /** Ctrl+K / ⌘K foca o campo de qualquer lugar da tela. */
  shortcut?: boolean;
  className?: string;
};

function isMacPlatform() {
  return /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);
}

export function SearchField({
  label = "Buscar",
  placeholder = "Buscar...",
  shortcut = false,
  className,
  onKeyDown,
  ...rest
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (!shortcut) return;
    setIsMac(isMacPlatform());

    const onShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [shortcut]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") event.currentTarget.blur();
    onKeyDown?.(event);
  };

  return (
    <Root className={className}>
      <MagnifyingGlassIcon size={16} aria-hidden />
      <Input
        ref={inputRef}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        autoComplete="off"
        onKeyDown={handleKeyDown}
        {...rest}
      />
      {shortcut && <Kbd aria-hidden>{isMac ? "⌘ K" : "Ctrl K"}</Kbd>}
    </Root>
  );
}
