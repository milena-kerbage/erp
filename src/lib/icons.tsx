import { isValidElement, type ReactElement } from "react";
import type { Icon, IconProps } from "@phosphor-icons/react";

/**
 * Ícone aceito pelos componentes:
 * - Client Components: o componente (`icon={PlusIcon}`)
 * - Server Components: o elemento (`icon={<PlusIcon />}`), porque
 *   componentes não podem ser passados do servidor para o cliente.
 */
export type IconSource = Icon | ReactElement;

export function renderIcon(icon: IconSource, props: IconProps) {
  if (isValidElement(icon)) return icon;
  const Component = icon;
  return <Component {...props} />;
}
