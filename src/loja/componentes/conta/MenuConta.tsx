"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { css, cx } from "styled-system/css";
import { CabecalhoDropdown, DivisorDropdown, Dropdown, ItemDropdown, TituloDropdown } from "@/loja/componentes/layout/Dropdown";
import { Heart, IdentificationCard, Package, SignIn, SignOut, User, UserPlus } from "@/loja/componentes/icones";
import { PERCENTUAL_BOAS_VINDAS } from "@/loja/lib/contas/regras";
import { AvatarCliente } from "./AvatarCliente";
import { sairDaConta, useConta } from "./estadoConta";

// Ícone de conta do cabeçalho (pílula da loja e cabeçalho mínimo da compra), no padrão de dropdown do
// ERP (Dropdown.tsx). Logada: o avatar ilustrado da cliente e o menu (Minha conta, Pedidos, Favoritos,
// Dados pessoais | Sair). Deslogada: "Sua conta" com Entrar e Criar conta (ganhe 5% OFF).
export function MenuConta({ variante = "pilula" }: { variante?: "pilula" | "compra" }) {
  const conta = useConta();
  const roteador = useRouter();
  const [saindo, setSaindo] = useState(false);
  const cliente = conta.situacao === "pronta" ? conta.cliente : null;
  const classeBotao = cx(variante === "compra" ? botaoCompra : botaoPilula, cliente && comAvatar);
  const tamanhoIcone = variante === "compra" ? 22 : 16;

  if (conta.situacao === "carregando") {
    return (
      <Link href="/conta" aria-label="Minha conta" className={classeBotao}>
        <User size={tamanhoIcone} aria-hidden />
      </Link>
    );
  }

  async function sair() {
    setSaindo(true);
    try {
      await sairDaConta();
      roteador.refresh();
    } finally {
      setSaindo(false);
    }
  }

  return (
    <span className={variante === "compra" ? css({ display: "inline-flex" }) : css({ display: { base: "none", desktop: "inline-flex" } })}>
      <Dropdown
        rotulo={cliente ? `Minha conta, ${cliente.primeiroNome}` : "Sua conta: entrar ou criar conta"}
        classeGatilho={classeBotao}
        gatilho={cliente ? <AvatarCliente cliente={cliente} tamanho={variante === "compra" ? 32 : 28} /> : <User size={tamanhoIcone} aria-hidden />}
      >
        {cliente ? (
          <>
            <CabecalhoDropdown>
              <AvatarCliente cliente={cliente} tamanho={40} />
              <span className={css({ minW: "0" })}>
                <span className={css({ display: "block", fontSize: "sm", fontWeight: "medium", color: "escuro", truncate: true })}>{cliente.nome}</span>
                <span className={css({ display: "block", fontSize: "xs", color: "textoSuave", truncate: true })}>{cliente.email}</span>
              </span>
            </CabecalhoDropdown>
            <DivisorDropdown />
            <ItemDropdown href="/conta" icone={<User aria-hidden />}>
              Minha conta
            </ItemDropdown>
            <ItemDropdown href="/conta/pedidos" icone={<Package aria-hidden />}>
              Pedidos
            </ItemDropdown>
            <ItemDropdown href="/conta/favoritos" icone={<Heart aria-hidden />}>
              Favoritos
            </ItemDropdown>
            <ItemDropdown href="/conta/dados" icone={<IdentificationCard aria-hidden />}>
              Dados pessoais
            </ItemDropdown>
            <DivisorDropdown />
            <ItemDropdown icone={<SignOut aria-hidden />} desabilitado={saindo} aoEscolher={() => void sair()}>
              {saindo ? "Saindo…" : "Sair"}
            </ItemDropdown>
          </>
        ) : (
          <>
            <TituloDropdown>Sua conta</TituloDropdown>
            <ItemDropdown href="/conta/entrar" icone={<SignIn aria-hidden />}>
              Entrar
            </ItemDropdown>
            <ItemDropdown href="/conta/cadastro" icone={<UserPlus aria-hidden />} meta={`ganhe ${PERCENTUAL_BOAS_VINDAS}% OFF`}>
              Criar conta
            </ItemDropdown>
          </>
        )}
      </Dropdown>
    </span>
  );
}

const baseBotao = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "pilula",
  color: "escuro",
  cursor: "pointer",
  transitionProperty: "background-color, box-shadow",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
} as const;

// Mesmo tamanho do ícone de antes: 32 na pílula (só desktop) e 40 no cabeçalho da compra.
const botaoPilula = css({ ...baseBotao, display: { base: "none", desktop: "inline-flex" }, w: "8", h: "8" });
const botaoCompra = css({ ...baseBotao, w: "10", h: "10", _hover: { bg: "superficieSuave" } });
// Logada: o avatar com um anel fino sálvia no hover e quando o menu está aberto.
const comAvatar = css({ "&:hover > span, &[aria-expanded=true] > span": { boxShadow: "[0 0 0 2px token(colors.marcaSuave)]" } });
