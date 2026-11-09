"use client";
import {prepareImageUpload} from "@/lib/images/browser";

import { type ChangeEvent, type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { AreaTexto, Campo, Marcacao } from "@/loja/componentes/checkout/Campo";
import { Camera, CheckCircle, Star, X } from "@/loja/componentes/icones";
import { botaoPrimario, botaoSecundario } from "@/loja/componentes/inicio/estilos";
import { Gaveta } from "@/loja/componentes/layout/cabecalho/Gaveta";
import {
  type CampoAvaliacao,
  type ErrosAvaliacao,
  LIMITES_AVALIACAO,
  MENSAGEM_ENVIADA,
  PARA_QUEM,
  problemaDaFoto,
  TIPOS_FOTO,
  validarAvaliacao,
} from "@/loja/lib/avaliacoes/regras";

const ROTULOS_NOTA = ["Ruim", "Regular", "Boa", "Muito boa", "Excelente"] as const;
// A Vercel recusa corpos acima de 4,5 MB antes de chegar à API: acima disto, as fotos são reduzidas
// no navegador em WebP antes do envio. O servidor valida e gera WebP/AVIF.
const ENVIO_CONFORTAVEL = 3.8 * 1024 * 1024;

type FotoEscolhida = { id: string; arquivo: File; url: string };
type Envio = { situacao: "editando" | "enviando" | "concluido"; progresso: number; simulada?: string };
type Resposta = { ok?: boolean; mensagem?: string; aviso?: string; simulada?: boolean; erro?: { codigo: string; mensagem: string; campos?: ErrosAvaliacao } };

const ORDEM_CAMPOS: CampoAvaliacao[] = ["nota", "titulo", "texto", "nome", "cidade", "paraQuem", "fotos", "consentimento"];
const ID_DO_CAMPO: Record<CampoAvaliacao, string> = {
  produto: "avaliacao-titulo",
  nota: "avaliacao-nota",
  titulo: "avaliacao-titulo",
  texto: "avaliacao-texto",
  nome: "avaliacao-nome",
  cidade: "avaliacao-cidade",
  paraQuem: "avaliacao-para-menina",
  fotos: "avaliacao-fotos",
  consentimento: "avaliacao-consentimento",
};

async function prepararFotos(fotos: FotoEscolhida[]): Promise<File[]> {
  const arquivos:File[]=[];
  for(const foto of fotos)arquivos.push(await prepareImageUpload(foto.arquivo,'review'));
  if(arquivos.reduce((total,file)=>total+file.size,0)>ENVIO_CONFORTAVEL)throw new Error('As fotos ainda ficaram grandes para o envio. Envie menos fotos de cada vez.');
  return arquivos;
}

function enviar(dados: FormData, aoProgredir: (fracao: number) => void): Promise<{ status: number; corpo: Resposta | null }> {
  return new Promise((resolver) => {
    const pedido = new XMLHttpRequest();
    pedido.open("POST", "/api/avaliacoes");
    pedido.responseType = "text";
    pedido.upload.onprogress = (evento) => {
      if (evento.lengthComputable) aoProgredir(evento.loaded / evento.total);
    };
    pedido.onload = () => {
      let corpo: Resposta | null = null;
      try {
        corpo = JSON.parse(pedido.responseText) as Resposta;
      } catch {
        corpo = null;
      }
      resolver({ status: pedido.status, corpo });
    };
    pedido.onerror = () => resolver({ status: 0, corpo: null });
    pedido.send(dados);
  });
}

// Gaveta "Escrever uma avaliação" (base Gaveta da loja). Estrelas em radiogroup (setas do teclado),
// campos com contador, até 4 fotos com pré-visualização e remoção (tipo e 3 MB conferidos aqui e de
// novo no servidor), consentimento obrigatório, honeypot e tempo de preenchimento contra robôs, envio
// com progresso real (XMLHttpRequest) e a mensagem final de moderação.
export function FormularioAvaliacao({ aberta, aoFechar, produto }: { aberta: boolean; aoFechar: () => void; produto: { slug: string; nome: string } }) {
  const [nota, setNota] = useState(0);
  const [passando, setPassando] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [paraQuem, setParaQuem] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [fotos, setFotos] = useState<FotoEscolhida[]>([]);
  const [erros, setErros] = useState<ErrosAvaliacao>({});
  const [erroGeral, setErroGeral] = useState("");
  const [envio, setEnvio] = useState<Envio>({ situacao: "editando", progresso: 0 });
  const iniciado = useRef(0);
  const armadilha = useRef<HTMLInputElement>(null);
  const estrelas = useRef<Array<HTMLButtonElement | null>>([]);
  const fotosAtuais = useRef(fotos);
  fotosAtuais.current = fotos;

  // Cada abertura marca o início do preenchimento (contra envio automático instantâneo); reabrir
  // depois de um envio concluído começa uma avaliação nova.
  const concluido = envio.situacao === "concluido";
  const [abertaAntes, setAbertaAntes] = useState(aberta);
  if (aberta !== abertaAntes) {
    setAbertaAntes(aberta);
    if (aberta && concluido) limpar();
  }
  useEffect(() => {
    if (aberta && !iniciado.current) iniciado.current = Date.now();
  }, [aberta]);

  // Libera as pré-visualizações ao sair da página.
  useEffect(() => () => fotosAtuais.current.forEach((foto) => URL.revokeObjectURL(foto.url)), []);

  function limpar() {
    fotos.forEach((foto) => URL.revokeObjectURL(foto.url));
    setNota(0);
    setTitulo("");
    setTexto("");
    setNome("");
    setCidade("");
    setParaQuem("");
    setConsentimento(false);
    setFotos([]);
    setErros({});
    setErroGeral("");
    setEnvio({ situacao: "editando", progresso: 0 });
    iniciado.current = 0;
  }

  function fechar() {
    if (envio.situacao === "enviando") return;
    aoFechar();
  }

  function escolherNota(valor: number, focar = false) {
    setNota(valor);
    setErros((atuais) => ({ ...atuais, nota: undefined }));
    if (focar) estrelas.current[valor - 1]?.focus();
  }

  function teclaNasEstrelas(evento: KeyboardEvent<HTMLDivElement>) {
    const atual = nota || 0;
    if (evento.key === "ArrowRight" || evento.key === "ArrowUp") {
      evento.preventDefault();
      escolherNota(Math.min(5, atual + 1), true);
    } else if (evento.key === "ArrowLeft" || evento.key === "ArrowDown") {
      evento.preventDefault();
      escolherNota(Math.max(1, atual - 1), true);
    } else if (evento.key === "Home") {
      evento.preventDefault();
      escolherNota(1, true);
    } else if (evento.key === "End") {
      evento.preventDefault();
      escolherNota(5, true);
    }
  }

  function adicionarFotos(evento: ChangeEvent<HTMLInputElement>) {
    const escolhidos = [...(evento.target.files ?? [])];
    evento.target.value = "";
    const problemas: string[] = [];
    const novas: FotoEscolhida[] = [];
    const vagas = LIMITES_AVALIACAO.fotos - fotos.length;
    for (const arquivo of escolhidos) {
      const problema = problemaDaFoto(arquivo);
      if (problema) problemas.push(problema);
      else if (novas.length >= vagas) problemas.push(`Você pode enviar até ${LIMITES_AVALIACAO.fotos} fotos.`);
      else novas.push({ id: `${arquivo.name}-${arquivo.size}-${Math.random().toString(36).slice(2)}`, arquivo, url: URL.createObjectURL(arquivo) });
    }
    setFotos((atuais) => [...atuais, ...novas]);
    setErros((atuais) => ({ ...atuais, fotos: problemas.length ? [...new Set(problemas)].join(" ") : undefined }));
  }

  function removerFoto(id: string) {
    setFotos((atuais) => {
      const removida = atuais.find((foto) => foto.id === id);
      if (removida) URL.revokeObjectURL(removida.url);
      return atuais.filter((foto) => foto.id !== id);
    });
    setErros((atuais) => ({ ...atuais, fotos: undefined }));
  }

  function focarPrimeiroErro(lista: ErrosAvaliacao) {
    const primeiro = ORDEM_CAMPOS.find((campo) => lista[campo]);
    if (!primeiro) return;
    const alvo = primeiro === "nota" ? estrelas.current[Math.max(0, nota - 1)] : document.getElementById(ID_DO_CAMPO[primeiro]);
    alvo?.focus();
  }

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (envio.situacao === "enviando") return;
    setErroGeral("");
    const campos = { produto: produto.slug, nota: String(nota), titulo, texto, nome, cidade, paraQuem, consentimento: consentimento ? "true" : "" };
    const validacao = validarAvaliacao(campos);
    const problemasFotos = fotos.map((foto) => problemaDaFoto(foto.arquivo)).filter(Boolean);
    const lista: ErrosAvaliacao = validacao.ok ? {} : { ...validacao.erros };
    if (problemasFotos.length) lista.fotos = problemasFotos.join(" ");
    if (Object.keys(lista).length) {
      setErros(lista);
      setErroGeral("Confira os campos destacados.");
      focarPrimeiroErro(lista);
      return;
    }
    setErros({});
    setEnvio({ situacao: "enviando", progresso: 0 });
    const dados = new FormData();
    for (const [chave, valor] of Object.entries(campos)) dados.append(chave, valor);
    dados.append("site", armadilha.current?.value ?? "");
    dados.append("iniciado", String(iniciado.current || Date.now()));
    for (const arquivo of await prepararFotos(fotos)) dados.append("fotos", arquivo, arquivo.name);
    const { status, corpo } = await enviar(dados, (fracao) => setEnvio({ situacao: "enviando", progresso: fracao }));
    if (status >= 200 && status < 300 && corpo?.ok) {
      setEnvio({ situacao: "concluido", progresso: 1, simulada: corpo.simulada ? corpo.aviso : undefined });
      return;
    }
    setEnvio({ situacao: "editando", progresso: 0 });
    const doServidor = corpo?.erro?.campos ?? {};
    setErros(doServidor);
    setErroGeral(
      corpo?.erro?.mensagem ??
        (status === 413
          ? "As fotos ficaram grandes demais para enviar juntas. Remova uma foto e tente de novo."
          : status === 0
            ? "Sem conexão. Confira a internet e tente de novo."
            : "Não foi possível enviar agora. Tente de novo em instantes."),
    );
    focarPrimeiroErro(doServidor);
  }

  const enviando = envio.situacao === "enviando";
  const notaVisivel = passando || nota;

  return (
    <Gaveta aberta={aberta} aoFechar={fechar} rotuloId="titulo-formulario-avaliacao" largura="busca">
      <div className={cabecalho}>
        <div className={css({ minW: "0" })}>
          <h2 id="titulo-formulario-avaliacao" className={css({ fontSize: "destaque", lineHeight: "subtitulo", color: "escuro" })}>
            Escrever uma avaliação
          </h2>
          <p className={css({ mt: "1", fontSize: "sm", color: "textoSuave", truncate: true })}>{produto.nome}</p>
        </div>
        <button type="button" data-autofoco aria-label="Fechar avaliação" onClick={fechar} disabled={enviando} className={botaoFechar}>
          <X size={16} aria-hidden />
        </button>
      </div>

      {envio.situacao === "concluido" ? (
        <div role="status" className={css({ display: "grid", justifyItems: "start", gap: "4", px: "5", py: "8" })}>
          <CheckCircle size={40} weight="light" aria-hidden className={css({ color: "sucesso" })} />
          <p className={css({ fontSize: "lg", lineHeight: "texto", color: "escuro" })}>{MENSAGEM_ENVIADA}</p>
          <p className={css({ fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>
            A equipe do ateliê lê cada avaliação antes de publicar. Se precisar alterar ou excluir, fale com a gente pelo WhatsApp.
          </p>
          {envio.simulada && <p className={css({ fontSize: "xs", color: "alerta", bg: "alertaSuave", p: "3", borderRadius: "md" })}>{envio.simulada}</p>}
          <button type="button" onClick={aoFechar} className={botaoSecundario}>
            Fechar
          </button>
        </div>
      ) : (
        <form noValidate onSubmit={aoEnviar} aria-describedby={erroGeral ? "avaliacao-erro-geral" : undefined} className={formulario}>
          <div>
            <p id="avaliacao-nota-rotulo" className={rotulo}>
              Sua nota
            </p>
            <div
              id="avaliacao-nota"
              role="radiogroup"
              aria-labelledby="avaliacao-nota-rotulo"
              aria-describedby={erros.nota ? "avaliacao-nota-erro" : undefined}
              aria-invalid={erros.nota ? true : undefined}
              aria-required
              onKeyDown={teclaNasEstrelas}
              onMouseLeave={() => setPassando(0)}
              className={css({ display: "flex", alignItems: "center", gap: "1", mt: "2" })}
            >
              {ROTULOS_NOTA.map((rotuloNota, indice) => {
                const valor = indice + 1;
                return (
                  // biome-ignore lint/a11y/useSemanticElements: estrela clicável com role="radio" e setas (padrão ARIA de radiogroup)
                  <button
                    key={rotuloNota}
                    ref={(elemento) => {
                      estrelas.current[indice] = elemento;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={nota === valor}
                    aria-label={`${valor} ${valor === 1 ? "estrela" : "estrelas"}: ${rotuloNota}`}
                    tabIndex={nota ? (nota === valor ? 0 : -1) : indice === 0 ? 0 : -1}
                    onClick={() => escolherNota(valor)}
                    onMouseEnter={() => setPassando(valor)}
                    className={estrela}
                  >
                    <Star size={30} weight={valor <= notaVisivel ? "fill" : "regular"} aria-hidden />
                  </button>
                );
              })}
              <span aria-hidden className={css({ ml: "2", fontSize: "sm", color: "textoSuave" })}>
                {notaVisivel ? ROTULOS_NOTA[notaVisivel - 1] : "Toque nas estrelas"}
              </span>
            </div>
            {erros.nota && (
              <p id="avaliacao-nota-erro" className={mensagemErro}>
                {erros.nota}
              </p>
            )}
          </div>

          <Campo
            id="avaliacao-titulo"
            rotulo="Título"
            required
            maxLength={LIMITES_AVALIACAO.titulo}
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            placeholder="Ex.: Ficou perfeito no quartinho"
            erro={erros.titulo}
            dica={`${[...titulo].length}/${LIMITES_AVALIACAO.titulo}`}
          />
          <AreaTexto
            id="avaliacao-texto"
            rotulo="Sua avaliação"
            required
            rows={5}
            maxLength={LIMITES_AVALIACAO.textoMaximo}
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Conte do tecido, do acabamento, do bordado e de como ficou no quarto."
            erro={erros.texto}
            dica={`${[...texto.trim()].length}/${LIMITES_AVALIACAO.textoMaximo} (mínimo de ${LIMITES_AVALIACAO.textoMinimo})`}
          />
          <Campo
            id="avaliacao-nome"
            rotulo="Nome que vai aparecer"
            required
            autoComplete="given-name"
            maxLength={LIMITES_AVALIACAO.nome}
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            erro={erros.nome}
            dica="Pode ser só o primeiro nome."
          />
          <Campo
            id="avaliacao-cidade"
            rotulo="Cidade/UF"
            autoComplete="address-level2"
            maxLength={LIMITES_AVALIACAO.cidade}
            value={cidade}
            onChange={(evento) => setCidade(evento.target.value)}
            placeholder="Ex.: Fortaleza/CE"
            erro={erros.cidade}
          />

          <fieldset aria-describedby={erros.paraQuem ? "avaliacao-para-erro" : undefined}>
            <legend className={rotulo}>
              Para quem foi <span className={css({ fontWeight: "normal", color: "textoSuave" })}>(opcional)</span>
            </legend>
            <div className={css({ display: "flex", flexWrap: "wrap", gap: "2", mt: "2" })}>
              {[...Object.entries(PARA_QUEM), ["", "Prefiro não dizer"]].map(([valor, rotuloOpcao]) => (
                <label key={valor || "nenhum"} className={pilula}>
                  <input
                    id={valor ? `avaliacao-para-${valor}` : "avaliacao-para-nenhum"}
                    type="radio"
                    name="avaliacao-para-quem"
                    value={valor}
                    checked={paraQuem === valor}
                    onChange={() => setParaQuem(valor)}
                    className={css({ srOnly: true })}
                  />
                  {rotuloOpcao}
                </label>
              ))}
            </div>
            {erros.paraQuem && (
              <p id="avaliacao-para-erro" className={mensagemErro}>
                {erros.paraQuem}
              </p>
            )}
          </fieldset>

          <div>
            <div className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "3" })}>
              <p id="avaliacao-fotos-rotulo" className={rotulo}>
                Fotos <span className={css({ fontWeight: "normal", color: "textoSuave" })}>(opcional)</span>
              </p>
              <p aria-live="polite" className={css({ fontSize: "sm", color: "textoSuave" })}>
                {fotos.length}/{LIMITES_AVALIACAO.fotos}
              </p>
            </div>
            <p id="avaliacao-fotos-dica" className={css({ mt: "1", fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>
              JPEG, PNG ou WebP, até 3 MB cada. Antes de publicar, a foto é reduzida e perde a localização e os dados da câmera.
            </p>
            <ul aria-labelledby="avaliacao-fotos-rotulo" className={gradeFotos}>
              {fotos.map((foto, indice) => (
                <li key={foto.id} className={css({ position: "relative" })}>
                  {/* biome-ignore lint/performance/noImgElement: pré-visualização local (blob:) do arquivo escolhido */}
                  <img src={foto.url} alt={`Foto ${indice + 1}: ${foto.arquivo.name}`} className={previa} />
                  <button type="button" aria-label={`Remover a foto ${indice + 1}`} onClick={() => removerFoto(foto.id)} disabled={enviando} className={remover}>
                    <X size={12} aria-hidden />
                  </button>
                </li>
              ))}
              {fotos.length < LIMITES_AVALIACAO.fotos && (
                <li>
                  <label htmlFor="avaliacao-fotos" className={adicionar}>
                    <input
                      id="avaliacao-fotos"
                      type="file"
                      accept={TIPOS_FOTO.join(",")}
                      multiple
                      disabled={enviando}
                      onChange={adicionarFotos}
                      aria-describedby={erros.fotos ? "avaliacao-fotos-erro" : "avaliacao-fotos-dica"}
                      aria-invalid={erros.fotos ? true : undefined}
                      className={css({ srOnly: true })}
                    />
                    <Camera size={22} aria-hidden />
                    <span>Adicionar</span>
                  </label>
                </li>
              )}
            </ul>
            {erros.fotos && (
              <p id="avaliacao-fotos-erro" role="alert" className={mensagemErro}>
                {erros.fotos}
              </p>
            )}
          </div>

          <div>
            <Marcacao id="avaliacao-consentimento" checked={consentimento} onChange={(evento) => setConsentimento(evento.target.checked)} aria-invalid={erros.consentimento ? true : undefined} aria-describedby={erros.consentimento ? "avaliacao-consentimento-erro" : undefined}>
              Autorizo o Ateliê Milena Kerbage a publicar nesta página a minha avaliação, com o nome, a cidade e as fotos que enviei. Posso pedir a exclusão a qualquer momento.{" "}
              <a href="/politicas/privacidade#avaliacoes" target="_blank" rel="noopener" className={css({ textDecoration: "underline", textUnderlineOffset: "3px" })}>
                Veja como tratamos seus dados
              </a>
              .
            </Marcacao>
            {erros.consentimento && (
              <p id="avaliacao-consentimento-erro" className={mensagemErro}>
                {erros.consentimento}
              </p>
            )}
          </div>

          {/* Armadilha para robôs: invisível e fora da ordem de foco; pessoas não preenchem. */}
          <div aria-hidden className={css({ position: "absolute", left: "[-10000px]", w: "1", h: "1", overflow: "hidden" })}>
            <label htmlFor="avaliacao-site">Site</label>
            <input ref={armadilha} id="avaliacao-site" type="text" name="site" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          {erroGeral && (
            <p id="avaliacao-erro-geral" role="alert" className={css({ p: "3", borderRadius: "md", bg: "alertaSuave", fontSize: "sm", color: "erro" })}>
              {erroGeral}
            </p>
          )}

          <div className={css({ display: "grid", gap: "3" })}>
            <button type="submit" disabled={enviando} aria-describedby={enviando ? "avaliacao-progresso" : undefined} className={cx(botaoPrimario, css({ w: "full", _disabled: { opacity: "0.7", cursor: "progress" } }))}>
              {enviando ? `Enviando… ${Math.round(envio.progresso * 100)}%` : "Enviar avaliação"}
            </button>
            {enviando && (
              <progress id="avaliacao-progresso" max={1} value={envio.progresso} aria-label="Progresso do envio" className={barraProgresso} />
            )}
            <p className={css({ fontSize: "xs", lineHeight: "texto", color: "textoSuave" })}>
              As avaliações passam por uma revisão do ateliê antes de aparecer na loja.
            </p>
          </div>
        </form>
      )}
    </Gaveta>
  );
}

const cabecalho = css({
  position: "sticky",
  top: "0",
  zIndex: "painelProduto",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "4",
  px: "5",
  pt: "5",
  pb: "4",
  bg: "superficie",
  borderBottomWidth: "1px",
  borderColor: "borda",
});

const botaoFechar = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  w: "10",
  h: "10",
  borderRadius: "pilula",
  bg: "fundoSutil",
  color: "escuro",
  cursor: "pointer",
  _hover: { bg: "superficieSuave" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
  _disabled: { opacity: "0.5", cursor: "default" },
});

const formulario = css({ position: "relative", display: "grid", gap: "6", px: "5", pt: "6", pb: "10" });

const rotulo = css({ fontSize: "sm", fontWeight: "semibold", color: "escuro" });

const mensagemErro = css({ mt: "2", fontSize: "sm", color: "erro" });

const estrela = css({
  display: "inline-flex",
  p: "1",
  borderRadius: "md",
  color: "escuro",
  cursor: "pointer",
  transition: "transform",
  transitionDuration: "rapida",
  _hover: { transform: "scale(1.08)" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const pilula = css({
  display: "inline-flex",
  alignItems: "center",
  minH: "10",
  px: "4",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "borda",
  fontSize: "sm",
  color: "escuro",
  cursor: "pointer",
  _hover: { borderColor: "escuro" },
  "&:has(input:checked)": { bg: "escuro", borderColor: "escuro", color: "fundo" },
  "&:has(input:focus-visible)": { boxShadow: "anelFoco" },
});

const gradeFotos = css({ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "2", mt: "3" });

const previa = css({ display: "block", w: "full", aspectRatio: "square", objectFit: "cover", borderRadius: "md", bg: "fundoProduto" });

const remover = css({
  position: "absolute",
  top: "1",
  right: "1",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "7",
  h: "7",
  borderRadius: "pilula",
  bg: "controleEscuro",
  color: "superficie",
  cursor: "pointer",
  _hover: { bg: "controleEscuroHover" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const adicionar = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1",
  w: "full",
  aspectRatio: "square",
  borderRadius: "md",
  borderWidth: "1px",
  borderStyle: "dashed",
  borderColor: "contornoAmostra",
  fontSize: "xs",
  color: "escuro",
  cursor: "pointer",
  _hover: { bg: "fundoSutil" },
  "&:has(input:focus-visible)": { boxShadow: "anelFoco" },
  "&:has(input:disabled)": { opacity: "0.5", cursor: "default" },
});

const barraProgresso = css({
  w: "full",
  h: "1",
  appearance: "none",
  borderRadius: "pilula",
  overflow: "hidden",
  bg: "superficieSuave",
  "&::-webkit-progress-bar": { bg: "superficieSuave" },
  "&::-webkit-progress-value": { bg: "marca", transitionProperty: "width", transitionDuration: "normal" },
  "&::-moz-progress-bar": { bg: "marca" },
});
