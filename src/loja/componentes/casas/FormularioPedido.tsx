"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { WhatsappLogo } from "@/loja/componentes/icones";
import {
  type DadosPedido,
  type ItemPedido,
  linkWhatsapp,
  montarMensagem,
  PEDIDO_VAZIO,
  TEMAS_FORMULARIO,
  validarPedido,
} from "@/loja/lib/casas/mensagem";
import { formatarPreco, PACOTES } from "@/loja/lib/casas/catalogo";
import { useProjetosSelecionados } from "./estadoSelecao";

// Resumo de um projeto vindo do servidor (o catálogo inteiro não vai para o navegador).
export type ResumoProjeto = {
  slug: string;
  nome: string;
  tema: string;
  resumo: string; // "Para menina · Floral"
  precoAPartirDe: number;
  paleta: ReadonlyArray<{ nome: string; hex: string }>;
};

export function itensDaSelecao(selecao: Array<{ slug: string; pacote: string }>, projetos: ResumoProjeto[]): ItemPedido[] {
  return selecao.flatMap((item) => {
    const projeto = projetos.find((atual) => atual.slug === item.slug);
    if (!projeto) return [];
    const acrescimo = PACOTES.find((pacote) => pacote.nome === item.pacote)?.acrescimo ?? 0;
    return [{ nome: projeto.nome, pacote: item.pacote, preco: formatarPreco(projeto.precoAPartirDe + acrescimo) }];
  });
}

function hojeIso(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

// Formulário de orçamento do projeto: nome, WhatsApp, previsão do nascimento, tema, medidas do
// berço/quarto e observações. Sem backend: ao enviar, monta a mensagem (lib/casas/mensagem.ts) e
// abre o WhatsApp do ateliê com ela; a cliente confere e envia por lá. Nada é gravado no site.
export function FormularioPedido({
  numero,
  itens,
  temaInicial = "",
  rotuloBotao = "Pedir orçamento pelo WhatsApp",
}: {
  numero: string;
  itens: ItemPedido[];
  temaInicial?: string;
  rotuloBotao?: string;
}) {
  const base = useId();
  const [dados, setDados] = useState<DadosPedido>({ ...PEDIDO_VAZIO, tema: temaInicial });
  const [erros, setErros] = useState<Partial<Record<keyof DadosPedido, string>>>({});
  const [enviado, setEnviado] = useState<string | null>(null);

  function campo<K extends keyof DadosPedido>(chave: K) {
    return {
      id: `${base}-${chave}`,
      name: chave,
      value: dados[chave],
      "aria-invalid": erros[chave] ? true : undefined,
      "aria-describedby": erros[chave] ? `${base}-${chave}-erro` : undefined,
      onChange: (evento: { target: { value: string } }) => {
        setDados((atual) => ({ ...atual, [chave]: evento.target.value }));
        if (erros[chave]) setErros((atual) => ({ ...atual, [chave]: undefined }));
      },
    };
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const novos = validarPedido(dados, hojeIso());
    setErros(novos);
    const primeiro = Object.keys(novos)[0];
    if (primeiro) {
      document.getElementById(`${base}-${primeiro}`)?.focus();
      return;
    }
    const link = linkWhatsapp(numero, montarMensagem(dados, itens));
    setEnviado(link);
    window.open(link, "_blank", "noopener");
  }

  const erro = (chave: keyof DadosPedido) =>
    erros[chave] ? (
      <p id={`${base}-${chave}-erro`} className={css({ fontSize: "sm", color: "erro" })}>
        {erros[chave]}
      </p>
    ) : null;

  return (
    <form noValidate onSubmit={enviar} className={css({ display: "grid", gap: "5" })}>
      <div className={duasColunas}>
        <Rotulado id={`${base}-nome`} rotulo="Seu nome" erro={erro("nome")}>
          <input type="text" autoComplete="name" required className={entrada} {...campo("nome")} />
        </Rotulado>
        <Rotulado id={`${base}-whatsapp`} rotulo="WhatsApp com DDD" erro={erro("whatsapp")}>
          <input type="tel" inputMode="tel" autoComplete="tel" required className={entrada} {...campo("whatsapp")} />
        </Rotulado>
      </div>
      <div className={duasColunas}>
        <Rotulado
          id={`${base}-nascimento`}
          rotulo="Previsão do nascimento"
          dica="Pode ser aproximada."
          erro={erro("nascimento")}
        >
          <input type="date" required className={entrada} {...campo("nascimento")} />
        </Rotulado>
        <Rotulado id={`${base}-tema`} rotulo="Tema do quarto" erro={erro("tema")}>
          <select required className={cx(entrada, css({ pr: "10" }))} {...campo("tema")}>
            <option value="" disabled>
              Escolha
            </option>
            {TEMAS_FORMULARIO.map((tema) => (
              <option key={tema.valor} value={tema.valor}>
                {tema.rotulo}
              </option>
            ))}
          </select>
        </Rotulado>
      </div>
      <Rotulado
        id={`${base}-medidas`}
        rotulo="Medidas do berço e do quarto"
        opcional
        dica="Ex.: colchão 60 × 130 cm; janela 1,50 × 1,20 m. Se não souber, mande o modelo do berço."
        erro={erro("medidas")}
      >
        <textarea rows={2} maxLength={600} className={cx(entrada, areaTexto)} {...campo("medidas")} />
      </Rotulado>
      <Rotulado id={`${base}-observacoes`} rotulo="Observações" opcional erro={erro("observacoes")}>
        <textarea
          rows={3}
          maxLength={600}
          placeholder="Cores que você ama, nome para bordar, peças extras…"
          className={cx(entrada, areaTexto)}
          {...campo("observacoes")}
        />
      </Rotulado>

      <button type="submit" className={botao({ variante: "escuro", tamanho: "g", largo: true })}>
        <WhatsappLogo size={20} aria-hidden /> {rotuloBotao}
      </button>
      <p className={css({ fontSize: "sm", lineHeight: "relaxed", color: "textoSuave" })}>
        Abrimos o WhatsApp do ateliê com a mensagem pronta; você confere e envia por lá. Nada fica gravado no site.
      </p>
      {enviado && (
        <p role="status" className={css({ fontSize: "sm", color: "escuro" })}>
          O WhatsApp não abriu?{" "}
          <a href={enviado} target="_blank" rel="noopener" className={css({ fontWeight: "semibold", textDecoration: "underline" })}>
            Toque aqui para abrir a conversa
          </a>
          .
        </p>
      )}
    </form>
  );
}

// Página "Peça seu projeto": o mesmo formulário, levando junto os projetos da seleção (se houver).
export function PedidoComSelecao({ numero, projetos }: { numero: string; projetos: ResumoProjeto[] }) {
  const selecao = useProjetosSelecionados() ?? [];
  const itens = itensDaSelecao(selecao, projetos);
  const temas = new Set(selecao.map((item) => projetos.find((projeto) => projeto.slug === item.slug)?.tema));
  return (
    <div className={css({ display: "grid", gap: "6" })}>
      {itens.length > 0 && (
        <div className={css({ p: "5", borderRadius: "cartao", bg: "fundoProduto" })}>
          <p className={css({ fontSize: "sm", fontWeight: "semibold", color: "escuro" })}>Vão junto no pedido os projetos da sua seleção:</p>
          <ul className={css({ mt: "2", display: "grid", gap: "1", fontSize: "sm", color: "texto" })}>
            {itens.map((item) => (
              <li key={item.nome}>
                {item.nome} · {item.pacote} · a partir de {item.preco}
              </li>
            ))}
          </ul>
          <Link
            href="/projetos/selecao"
            className={css({ display: "inline-block", mt: "3", fontSize: "sm", textDecoration: "underline", textUnderlineOffset: "3px" })}
          >
            Editar seleção
          </Link>
        </div>
      )}
      <FormularioPedido
        // Remonta quando a seleção carrega, para o tema sugerido entrar no estado inicial.
        key={itens.map((item) => item.nome).join("|")}
        numero={numero}
        itens={itens}
        temaInicial={temas.size === 1 ? ([...temas][0] ?? "") : ""}
      />
    </div>
  );
}

function Rotulado({
  id,
  rotulo,
  dica,
  opcional = false,
  erro,
  children,
}: {
  id: string;
  rotulo: string;
  dica?: string;
  opcional?: boolean;
  erro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={css({ display: "grid", gap: "1.5", alignContent: "start" })}>
      <label htmlFor={id} className={css({ fontSize: "sm", fontWeight: "semibold", color: "escuro" })}>
        {rotulo}
        {opcional && <span className={css({ fontWeight: "normal", color: "textoSuave" })}> (opcional)</span>}
      </label>
      {children}
      {erro ?? (dica && <p className={css({ fontSize: "sm", color: "textoSuave" })}>{dica}</p>)}
    </div>
  );
}

const duasColunas = css({ display: "grid", gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: "5" });

const entrada = css({
  w: "full",
  h: "12",
  px: "4",
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "campo",
  bg: "fundo",
  fontSize: "md",
  color: "escuro",
  _placeholder: { color: "textoSuave" },
  _focusVisible: { borderColor: "escuro", outline: "none", boxShadow: "[0 0 0 1px token(colors.escuro)]" },
  "&[aria-invalid=true]": { borderColor: "erro" },
});

const areaTexto = css({ h: "auto", py: "3", resize: "vertical" });
