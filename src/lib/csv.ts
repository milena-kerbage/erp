/**
 * Gera e baixa um CSV no próprio navegador (nada sai para outro serviço).
 * Usa ";" e BOM para o Excel em português abrir com acentos e colunas certas.
 */
export function downloadCsv(filename: string, rows: readonly (readonly (string | number | undefined)[])[]) {
  const escape = (value: string | number | undefined) => {
    const text = String(value ?? "");
    return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const content = `﻿${rows.map((row) => row.map(escape).join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
