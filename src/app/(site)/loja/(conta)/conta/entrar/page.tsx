import { permanentRedirect } from "next/navigation";

// Endereço antigo (/conta/entrar), de antes de a loja ficar sem login, cadastro nem programa de pontos. Pode estar
// em links e favoritos: vai para "Minha conta neste aparelho" (308).
export default function Redirecionar() {
  permanentRedirect("/conta");
}
