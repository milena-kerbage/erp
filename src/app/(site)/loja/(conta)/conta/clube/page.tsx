import { permanentRedirect } from "next/navigation";

// "Clube Milena (descontinuado)": a loja não tem login, cadastro nem programa de pontos. Endereço antigo que ainda pode estar
// em links e favoritos: vai para "Minha conta neste aparelho" (308).
export default function Redirecionar() {
  permanentRedirect("/conta");
}
