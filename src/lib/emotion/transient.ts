/**
 * Props com prefixo `$` são só de estilo e não chegam ao DOM
 * (mesma convenção do styled-components).
 *
 * @example styled("button", transientOptions)<{ $active: boolean }>`...`
 */
export const transientOptions = {
  shouldForwardProp: (prop: string) => !prop.startsWith("$"),
};
