"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import styled from "@emotion/styled";
import { ArrowClockwiseIcon, ArrowSquareOutIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { ResponsiveTable, TableCard } from "@/components/ui/Table";
import { TextField } from "@/components/ui/TextField";
import { MetricCard } from "@/features/dashboard/components/MetricCard";
import { Card as Cartao, CardHead, EmptyNote, Progress } from "@/features/dashboard/components/ui";
import { AvisoRestrito, dataHora, data, dinheiro, LinkTexto, Nome, plural, Sub, useDadosErp, useRestrito } from "@/features/ecommerce/vendas/comum";
import { erpRequest, requestError } from "@/features/operations/client";
import { Actions, Empty, Notice, Page, PageHeader, Pill } from "@/features/operations/components/ui";
import type { JogadaVaral, ResumoVaral } from "@/lib/loja/varal";
import { type ConfigVaral, NOME_DA_PECA, type PremioVaral, textoDasCondicoes, textoDoPremio, validarConfigVaral } from "@/loja/lib/varal/regras";
import type { Tone } from "@/styles/theme";

// Marketing › Varal de roupinhas: o minigame de cupom da loja. Aqui a gestão liga e desliga o jogo, define os
// prêmios (as chances somam 100%), a validade e o valor mínimo do cupom, e acompanha quem jogou e quem usou.

type Painel = { config: ConfigVaral & { revisao: number }; resumo: ResumoVaral; jogadas: JogadaVaral[]; total: number };
type LinhaPremio = { chave: number; tipo: PremioVaral["tipo"]; valor: string; chance: string; prefixo: string };
type Formulario = { ativo: boolean; validadeDias: string; minimo: string; premios: LinhaPremio[] };

const TIPOS = [{ value: "percentual" as const, label: "Percentual" }, { value: "valor" as const, label: "Valor fixo" }];
const TOM_SITUACAO: Record<JogadaVaral["situacao"], Tone> = { usado: "green", valendo: "blue", expirado: "neutral" };
const ROTULO_SITUACAO: Record<JogadaVaral["situacao"], string> = { usado: "Usado", valendo: "Valendo", expirado: "Expirado" };
const TONS: Tone[] = ["rose", "peach", "yellow", "green", "teal", "blue", "lavender", "neutral"];

const paraReais = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: centavos % 100 ? 2 : 0 });
const paraCentavos = (texto: string) => Math.round(Number(texto.trim().replace(/\./g, "").replace(",", ".")) * 100);

let proximaChave = 1;
const linhaDoPremio = (premio: PremioVaral): LinhaPremio => ({ chave: proximaChave++, tipo: premio.tipo, valor: premio.tipo === "percentual" ? String(premio.valor) : paraReais(premio.valor), chance: String(premio.chance), prefixo: premio.prefixo });
const formularioDe = (config: ConfigVaral): Formulario => ({ ativo: config.ativo, validadeDias: String(config.validadeDias), minimo: config.minimoCentavos ? paraReais(config.minimoCentavos) : "", premios: config.premios.map(linhaDoPremio) });

/** O formulário como o servidor espera (números inteiros; valores em centavos). */
function configDoFormulario(form: Formulario): ConfigVaral {
  return validarConfigVaral({
    ativo: form.ativo,
    validadeDias: Number(form.validadeDias),
    minimoCentavos: form.minimo.trim() ? paraCentavos(form.minimo) : 0,
    premios: form.premios.map((linha) => ({ tipo: linha.tipo, valor: linha.tipo === "percentual" ? Number(linha.valor) : paraCentavos(linha.valor), chance: Number(linha.chance), prefixo: linha.prefixo.trim().toUpperCase() })),
  });
}

export function VaralMarketing({ origemLoja }: { origemLoja: string }) {
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  useEffect(() => { const id = window.setTimeout(() => setTermo(busca.trim()), 300); return () => window.clearTimeout(id); }, [busca]);
  const { dados, setDados, carregando, erro, negado, recarregar } = useDadosErp<Painel>(`marketing/varal${termo ? `?busca=${encodeURIComponent(termo)}` : ""}`);
  const restrito = useRestrito(negado);

  const [form, setForm] = useState<Formulario | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aviso, setAviso] = useState("");
  const revisao = dados?.config.revisao;
  // O formulário nasce do cadastro salvo (e renasce quando ele muda de revisão, depois de salvar).
  useEffect(() => { if (dados) setForm(formularioDe(dados.config)); }, [revisao]); // eslint-disable-line react-hooks/exhaustive-deps

  const somaChances = form ? form.premios.reduce((soma, linha) => soma + (Number(linha.chance) || 0), 0) : 0;
  const condicoes = useMemo(() => { try { return form ? textoDasCondicoes(Number(form.validadeDias) || 0, form.minimo.trim() ? paraCentavos(form.minimo) : 0) : ""; } catch { return ""; } }, [form]);
  const mudarPremio = (chave: number, parcial: Partial<LinhaPremio>) => setForm((atual) => atual && ({ ...atual, premios: atual.premios.map((linha) => (linha.chave === chave ? { ...linha, ...parcial } : linha)) }));

  async function salvar(evento?: FormEvent, ativo?: boolean) {
    evento?.preventDefault();
    if (!form) return;
    setErroForm(""); setAviso("");
    let config: ConfigVaral;
    try { config = configDoFormulario(ativo === undefined ? form : { ...form, ativo }); } catch (falha) { setErroForm(falha instanceof Error ? falha.message : "Confira os campos."); return; }
    setSalvando(true);
    try {
      const resposta = await erpRequest<{ config: Painel["config"] }>("marketing/varal", { method: "PUT", body: config });
      setDados((atual) => (atual ? { ...atual, config: resposta.config } : atual));
      setForm(formularioDe(resposta.config));
      setAviso(resposta.config.ativo ? "Salvo. O varal está no ar na loja." : "Salvo. O varal está recolhido: a loja não mostra as chamadas nem aceita jogadas novas.");
    } catch (falha) { setErroForm(requestError(falha)); } finally { setSalvando(false); }
  }

  const resumo = dados?.resumo;
  const maiorPremio = Math.max(1, ...(resumo?.porPremio ?? []).map((linha) => linha.quantidade));

  return <Page>
    <PageHeader title="Varal de roupinhas" description="O minigame de cupom da loja: a cliente escolhe uma roupinha do varal e ganha um desconto. O sorteio acontece no servidor; a peça escolhida não muda as chances."
      actions={<Actions>
        <Button variant="secondary" icon={ArrowClockwiseIcon} onClick={() => void recarregar()} loading={carregando && Boolean(dados)}>Atualizar</Button>
        <Button variant="secondary" icon={ArrowSquareOutIcon} href={`${origemLoja}/varal`} target="_blank" rel="noreferrer">Abrir na loja</Button>
      </Actions>} />

    {restrito ? <AvisoRestrito area="O marketing" /> : <>
      {erro && <Notice role="alert">{erro}</Notice>}
      {!dados || !form || !resumo ? <Empty role="status">Carregando o varal…</Empty> : <>
        <Quadro>
          <Metricas>
            <MetricCard title="Jogadas" href="#jogadas" tone="lavender" value={resumo.jogadas.toLocaleString("pt-BR")} unit={dados.config.ativo ? "varal no ar" : "varal recolhido"} ratio={resumo.jogadas ? 1 : 0} />
            <MetricCard title="Cupons usados" href="#jogadas" tone="green" value={resumo.usados.toLocaleString("pt-BR")} unit={resumo.jogadas ? `${Math.round((resumo.usados / resumo.jogadas) * 100)}% das jogadas` : "nenhuma jogada"} ratio={resumo.jogadas ? resumo.usados / resumo.jogadas : 0} />
            <MetricCard title="Cupons valendo" href="#jogadas" tone="blue" value={resumo.valendo.toLocaleString("pt-BR")} unit="ainda não usados" ratio={resumo.jogadas ? resumo.valendo / resumo.jogadas : 0} />
            <MetricCard title="Desconto concedido" href="#jogadas" tone="peach" value={dinheiro(resumo.descontoCentavos)} unit={plural(resumo.usados, "pedido", "pedidos")} ratio={resumo.usados ? 1 : 0} />
          </Metricas>

          <Duas>
            <CartaoForm aria-label="Regras do jogo" onSubmit={(evento: FormEvent) => void salvar(evento)} noValidate>
              <CardHead title="Regras do jogo">
                <LigaDesliga><span>{form.ativo ? "No ar" : "Recolhido"}</span><Switch checked={form.ativo} onChange={(valor) => { setForm({ ...form, ativo: valor }); void salvar(undefined, valor); }} label="Varal no ar na loja" disabled={salvando} /></LigaDesliga>
              </CardHead>
              <Campos>
                <TextField label="Validade do cupom" required inputMode="numeric" value={form.validadeDias} onChange={(evento) => setForm({ ...form, validadeDias: evento.target.value.replace(/\D/g, "") })} trailing={<Unidade>dias</Unidade>} hint="Contados a partir da jogada." />
                <TextField label="Pedido mínimo" inputMode="decimal" value={form.minimo} placeholder="Sem mínimo" onChange={(evento) => setForm({ ...form, minimo: evento.target.value })} trailing={<Unidade>R$</Unidade>} hint="Subtotal “a partir de” da sacola." />
              </Campos>

              <Premios>
                <div className="cabeca"><span>Prêmio</span><span>Desconto</span><span>Chance</span><span>Prefixo do código</span><span /></div>
                {form.premios.map((linha) => (
                  <div key={linha.chave} className="linha">
                    <Select label="Tipo do prêmio" options={TIPOS} value={linha.tipo} onChange={(tipo) => mudarPremio(linha.chave, { tipo, valor: tipo === linha.tipo ? linha.valor : tipo === "percentual" ? "10" : "30" })} />
                    <TextField label="Desconto" aria-label="Desconto" inputMode={linha.tipo === "percentual" ? "numeric" : "decimal"} value={linha.valor} onChange={(evento) => mudarPremio(linha.chave, { valor: evento.target.value })} trailing={<Unidade>{linha.tipo === "percentual" ? "%" : "R$"}</Unidade>} />
                    <TextField label="Chance" aria-label="Chance" inputMode="numeric" value={linha.chance} onChange={(evento) => mudarPremio(linha.chave, { chance: evento.target.value.replace(/\D/g, "") })} trailing={<Unidade>%</Unidade>} />
                    <TextField label="Prefixo" aria-label="Prefixo do código" value={linha.prefixo} maxLength={12} onChange={(evento) => mudarPremio(linha.chave, { prefixo: evento.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} />
                    <IconButton icon={TrashIcon} label="Remover prêmio" variant="ghost" size="sm" disabled={form.premios.length <= 1} onClick={() => setForm({ ...form, premios: form.premios.filter((item) => item.chave !== linha.chave) })} />
                  </div>
                ))}
              </Premios>
              <Rodape>
                <Button type="button" variant="ghost" size="sm" icon={PlusIcon} disabled={form.premios.length >= 8} onClick={() => setForm({ ...form, premios: [...form.premios, { chave: proximaChave++, tipo: "percentual", valor: "10", chance: "0", prefixo: "" }] })}>Adicionar prêmio</Button>
                <Soma data-certo={somaChances === 100 || undefined}>Chances somadas: {somaChances}%{somaChances === 100 ? "" : " (precisa dar 100%)"}</Soma>
              </Rodape>
              {condicoes && <Sub>Na loja: “{condicoes}” Um cupom por cliente e por pedido.</Sub>}
              {erroForm && <Notice role="alert">{erroForm}</Notice>}
              {aviso && <Notice role="status">{aviso}</Notice>}
              <Actions><Button type="submit" loading={salvando}>Salvar regras</Button></Actions>
            </CartaoForm>

            <Cartao aria-label="Prêmios sorteados">
              <CardHead title="Prêmios sorteados" />
              {!resumo.porPremio.length ? <EmptyNote>Ninguém jogou ainda. As roupinhas estão esperando no varal.</EmptyNote> : <Lista>
                {resumo.porPremio.map((linha, indice) => <li key={linha.premio}>
                  <span><strong>{linha.premio}</strong><small>{plural(linha.quantidade, "cupom", "cupons")} · {plural(linha.usados, "usado", "usados")}</small></span>
                  <Progress ratio={linha.quantidade / maiorPremio} tone={TONS[indice % TONS.length]} label={`${linha.premio}: ${linha.quantidade}`} />
                </li>)}
              </Lista>}
              <Sub>Prêmios cadastrados agora: {dados.config.premios.map((premio) => `${textoDoPremio(premio)} (${premio.chance}%)`).join(", ")}.</Sub>
            </Cartao>
          </Duas>
        </Quadro>

        <Jogadas id="jogadas" aria-label="Quem jogou">
          <Topo><h3>Quem jogou</h3><SearchField label="Buscar jogadas" placeholder="E-mail ou código do cupom" value={busca} onChange={(evento) => setBusca(evento.target.value)} /></Topo>
          {!dados.jogadas.length ? (
            <EmptyState title={termo ? "Nenhuma jogada com essa busca" : "Nenhuma jogada ainda"} description={termo ? "Tente outro e-mail ou código." : "Quando uma cliente escolher uma roupinha na loja, ela aparece aqui com o prêmio e o cupom."} />
          ) : <TableCard><ResponsiveTable>
            <thead><tr><th>Cliente</th><th>Peça</th><th>Prêmio</th><th>Cupom</th><th>Jogou em</th><th>Vale até</th><th>Situação</th><th>Pedido</th></tr></thead>
            <tbody>{dados.jogadas.map((jogada) => <tr key={jogada.id}>
              <td data-principal><Nome>{jogada.email}</Nome></td>
              <td data-label="Peça">{NOME_DA_PECA[jogada.peca] ?? jogada.peca}</td>
              <td data-label="Prêmio"><strong>{jogada.premio}</strong></td>
              <td data-label="Cupom"><Codigo>{jogada.codigo}</Codigo></td>
              <td data-label="Jogou em">{dataHora(jogada.jogouEm)}</td>
              <td data-label="Vale até">{data(jogada.validoAte)}</td>
              <td data-label="Situação"><Pill $tone={TOM_SITUACAO[jogada.situacao]}>{ROTULO_SITUACAO[jogada.situacao]}</Pill></td>
              <td data-label="Pedido">{jogada.pedido ? <LinkTexto href={`/ecommerce/pedidos?pedido=${encodeURIComponent(jogada.pedido)}`}>{jogada.pedido}</LinkTexto> : "—"}</td>
            </tr>)}</tbody>
          </ResponsiveTable></TableCard>}
          {dados.total > dados.jogadas.length && <Sub>{dados.jogadas.length} de {dados.total} jogadas. Use a busca para achar uma cliente.</Sub>}
        </Jogadas>
      </>}
    </>}
  </Page>;
}

/* ---------- Estilos ---------- */

/** O mesmo cartão do Painel, como formulário. */
const CartaoForm = Cartao.withComponent("form");

/** A grade contínua do Painel: sem espaço nem cantos entre os cartões, divididos pela borda. */
const Quadro = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
  --card-border-width: 0 1px 1px 0;
  --card-radius: 0;

  > * { margin-right: -1px; }
  > *:last-child { margin-bottom: -1px; }
`;
const Metricas = styled.div`display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); @media (max-width: 900px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }`;
const Duas = styled.div`display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); @media (max-width: 1100px) { grid-template-columns: minmax(0, 1fr); }`;
const LigaDesliga = styled.div`display: inline-flex; align-items: center; gap: ${({ theme }) => theme.spacing(2)}; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.text.secondary};`;
const Campos = styled.div`display: grid; grid-template-columns: repeat(2, minmax(0, 14rem)); gap: ${({ theme }) => theme.spacing(3)}; @media (max-width: 520px) { grid-template-columns: minmax(0, 1fr); }`;
const Unidade = styled.span`color: ${({ theme }) => theme.colors.text.muted}; font-size: 0.8125rem;`;
/** Uma linha por prêmio; os rótulos ficam no cabeçalho (os campos levam o rótulo só para leitores de tela). */
const Premios = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};

  .cabeca, .linha { display: grid; grid-template-columns: minmax(8rem, 1.1fr) minmax(6rem, 1fr) minmax(5rem, 0.8fr) minmax(7rem, 1.1fr) 2rem; align-items: center; gap: ${({ theme }) => theme.spacing(2)}; }
  .cabeca { font-size: ${({ theme }) => theme.fontSizes.xs}; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.muted}; }
  /* Tela larga: o cabeçalho já nomeia as colunas; o rótulo de cada campo fica só para o leitor de tela */
  .linha > div > label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .linha > div { position: relative; }

  @media (max-width: 640px) {
    .cabeca { display: none; }
    .linha > div > label { position: static; width: auto; height: auto; overflow: visible; clip-path: none; }
    .linha { grid-template-columns: 1fr 1fr; padding-bottom: ${({ theme }) => theme.spacing(3)}; border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle}; }
  }
`;
const Rodape = styled.div`display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: ${({ theme }) => theme.spacing(2)};`;
const Soma = styled.span`font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.danger}; &[data-certo] { color: ${({ theme }) => theme.tones.green.fg}; }`;
const Lista = styled.ul`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(3.5)}; list-style: none;
  li { display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(1.5)}; }
  li > span { display: flex; align-items: baseline; justify-content: space-between; gap: ${({ theme }) => theme.spacing(2)}; }
  strong { font-size: 0.8125rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; color: ${({ theme }) => theme.colors.text.primary}; }
  small { font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.muted}; white-space: nowrap; }
`;
const Jogadas = styled.section`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(3)}; scroll-margin-top: 5rem;`;
const Topo = styled.div`display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: ${({ theme }) => theme.spacing(3)};
  h3 { font-size: 0.9375rem; font-weight: ${({ theme }) => theme.fontWeights.semibold}; color: ${({ theme }) => theme.colors.text.primary}; }
  > :last-child { flex: 0 1 22rem; min-width: 14rem; }
`;
const Codigo = styled.code`font-family: ${({ theme }) => theme.fonts.mono}; font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.secondary}; white-space: nowrap;`;
