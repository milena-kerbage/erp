import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarShape = "rounded" | "circle";

export const avatarSizes: Record<AvatarSize, { box: string; radius: "xs" | "sm" | "md" | "xl" }> = {
  xs: { box: "1.5rem", radius: "xs" },
  sm: { box: "2rem", radius: "sm" },
  md: { box: "2.5rem", radius: "md" },
  lg: { box: "2.75rem", radius: "md" },
  xl: { box: "4rem", radius: "xl" },
};

export const Root = styled("span", transientOptions)<{
  $size: AvatarSize;
  $shape: AvatarShape;
  $ring: boolean;
}>`
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => avatarSizes[$size].box};
  height: ${({ $size }) => avatarSizes[$size].box};
  /* "rounded" acompanha o raio dos controles; "circle" para contêineres redondos */
  border-radius: ${({ theme, $size, $shape }) =>
    $shape === "circle" ? "50%" : theme.radii[avatarSizes[$size].radius]};
  overflow: hidden;
  /* Aparece só enquanto a imagem carrega */
  background-color: ${({ theme }) => theme.palette.sage[100]};
  user-select: none;
  /* Anel da marca separado por um respiro, como destaque do usuário */
  box-shadow: ${({ theme, $ring }) =>
    $ring
      ? `0 0 0 2px ${theme.palette.neutral[0]}, 0 0 0 3.5px ${theme.palette.sage[400]}`
      : "none"};
  transition: border-radius ${({ theme }) => theme.transitions.normal};
`;

export const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;
