"use client";

import { useState, type ReactNode } from "react";
import { useServerInsertedHTML } from "next/navigation";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";

/**
 * Coleta os estilos gerados pelo Emotion durante o SSR e os injeta no <head>
 * via useServerInsertedHTML, evitando flash de conteúdo sem estilo (FOUC).
 *
 * Os estilos globais saem em tags próprias (`css-global <nome>`): assim o
 * <Global> do cliente assume cada uma e a substitui quando o tema muda (ex.:
 * sair do modo escuro), em vez de o estilo do servidor ficar para sempre.
 */
export function EmotionRegistry({ children }: { children: ReactNode }) {
  const [registry] = useState(() => {
    const cache = createCache({ key: "css" });
    cache.compat = true;

    const prevInsert = cache.insert;
    let inserted: { name: string; isGlobal: boolean }[] = [];

    cache.insert = (...args) => {
      const [selector, serialized] = args;
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push({ name: serialized.name, isGlobal: !selector });
      }
      return prevInsert(...args);
    };

    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };

    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const entries = registry.flush();
    if (entries.length === 0) return null;

    const key = registry.cache.key;
    const globals: { name: string; style: string }[] = [];
    const names: string[] = [];
    let styles = "";

    for (const { name, isGlobal } of entries) {
      const style = registry.cache.inserted[name];
      if (typeof style !== "string") continue;
      if (isGlobal) {
        globals.push({ name, style });
      } else {
        styles += style;
        names.push(name);
      }
    }

    return (
      <>
        {globals.map(({ name, style }) => (
          <style key={name} data-emotion={`${key}-global ${name}`} dangerouslySetInnerHTML={{ __html: style }} />
        ))}
        {styles && <style data-emotion={`${key} ${names.join(" ")}`} dangerouslySetInnerHTML={{ __html: styles }} />}
      </>
    );
  });

  return <CacheProvider value={registry.cache}>{children}</CacheProvider>;
}
