import type { WhatsAppTemplate } from "./types";

export function templateKey(template: WhatsAppTemplate): string {
  return `${template.name}:${template.language}`;
}

/** The first release supports simple body text variables and static text components. */
export function templateSupport(template: WhatsAppTemplate): { supported: boolean; reason?: string; parameters: number; body: string } {
  const components = template.components ?? [];
  const body = components.find((component) => component.type.toUpperCase() === "BODY")?.text ?? "";
  const placeholders = [...body.matchAll(/\{\{([^}]+)\}\}/g)].map((match) => match[1].trim());
  const indexes = [...new Set(placeholders.map(Number))].sort((a, b) => a - b);
  const unsupported = components.some((component) => {
    const type = component.type.toUpperCase();
    return (type === "HEADER" && (component.format !== "TEXT" || /\{\{/.test(component.text ?? ""))) ||
      (type === "BUTTONS" && component.buttons?.some((button) => !["URL", "PHONE_NUMBER"].includes(button.type.toUpperCase()) || /\{\{/.test(button.url ?? ""))) ||
      !["HEADER", "BODY", "FOOTER", "BUTTONS"].includes(type);
  });
  if (unsupported || template.parameter_format === "NAMED" || indexes.some((index, position) => !Number.isInteger(index) || index !== position + 1)) {
    return { supported: false, parameters: 0, body, reason: "Este modelo usa mídia, botões dinâmicos, autenticação ou variáveis fora do corpo. Use um modelo simples de texto com variáveis numéricas no corpo." };
  }
  return { supported: true, parameters: indexes.length, body };
}

export function templatePreview(body: string, values: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (placeholder, index: string) => values[Number(index) - 1]?.trim() || placeholder);
}
