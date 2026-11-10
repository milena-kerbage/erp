import {
  SLIDES, PAR_EDITORIAL, NOVIDADES, POR_COR, QUARTO, ENXOVAL,
  FEATURE_PROJETOS, FEATURE_MATERNIDADE, FEATURE_BORDADO,
  type CardGrade, type Feature, type Grade,
} from "@/loja/componentes/inicio/conteudo";
import { EDICAO_ATUAL } from "./edicoes";
import type { CatalogoLoja } from "./fonte";
import { escolherFoto, fotoDoDestino, produtosDoDestino, produtosEmDestaque } from "./curadoria";

export function edicaoComFotos(catalogo: CatalogoLoja) {
  const cadastrados = EDICAO_ATUAL.produtos.filter(slug => catalogo.produtos.some(p => p.slug === slug));
  const produtos = cadastrados.length ? cadastrados : produtosEmDestaque(catalogo, 24).map(p => p.slug);
  const abertura = escolherFoto(catalogo.produtos, ["kit-berco-maria-heloisa"], 2);
  const bordado = escolherFoto(produtosDoDestino(catalogo, "/busca?q=bordado"), ["kit-berco-maria-heloisa"], 1);
  const pronta = fotoDoDestino(catalogo, "/pronta-entrega");
  return {
    ...EDICAO_ATUAL, produtos,
    subtitulo: cadastrados.length ? EDICAO_ATUAL.subtitulo : "Kits de berço, texturas e bordados para receber o bebê com carinho.",
    atalhos: EDICAO_ATUAL.atalhos.filter(a => a.href.startsWith("/personalizado") || produtosDoDestino(catalogo, a.href).length),
    blocos: EDICAO_ATUAL.blocos.flatMap(bloco => {
      const foto = bloco.id === "abertura" ? abertura : bloco.id === "bordado" ? bordado : bloco.href ? fotoDoDestino(catalogo, bloco.href) : undefined;
      if (bloco.midia.src) return [bloco];
      if (!foto) return [];
      return [{ ...bloco, subtitulo: bloco.id === "abertura" ? "Texturas, renda e bordados para preparar o berço." : bloco.id === "bordado" ? "Conheça os bordados e acabamentos dos kits do ateliê." : bloco.id === "pronto-para-levar" && pronta ? "Peças disponíveis para sair do ateliê em até 2 dias úteis." : bloco.subtitulo, midia: { ...bloco.midia, ...foto } }];
    }),
  };
}

export function homeComFotos(catalogo: CatalogoLoja) {
  const temFotos = catalogo.produtos.some(p => p.imagens?.length);
  const edicao = edicaoComFotos(catalogo);
  const quarto = escolherFoto(catalogo.produtos, ["kit-berco-fazendinha", "kit-berco-bia", "kit-berco-raul"]);
  const bordado = escolherFoto(produtosDoDestino(catalogo, "/busca?q=bordado"), ["kit-berco-maria-heloisa"], 1);
  const completarGrade = (grade: Grade): Grade => ({ ...grade, abas: grade.abas.map(aba => ({ ...aba, cards: aba.cards.flatMap(card => {
    const foto = fotoDoDestino(catalogo, card.href);
    return card.midia.src || !temFotos ? [card] : foto ? [{ ...card, midia: { ...card.midia, ...foto } }] : [];
  }) })).filter(aba => aba.cards.length) });
  const cardsDeBusca = (itens: Array<[string, string]>): CardGrade[] => itens.map(([rotulo, termo]) => ({ rotulo, href: `/busca?q=${encodeURIComponent(termo)}`, midia: { tom: "linho", icone: "agulha" } }));
  const novidades = completarGrade(NOVIDADES);
  if (temFotos && novidades.abas.length === 1 && novidades.abas[0].cards.length < 4) {
    novidades.abas[0].cards.push(...completarGrade({ ...NOVIDADES, abas: [{ rotulo: "Kit berço", cards: cardsDeBusca([["Bordados do ateliê", "bordado"], ["Texturas em tricô", "tricô"]]) }] }).abas.flatMap(a => a.cards));
  }
  const porQuarto = completarGrade(QUARTO);
  const temas = completarGrade({ ...QUARTO, titulo: "Temas para o quartinho", abas: [{ rotulo: "Por tema", cards: cardsDeBusca([["Floral", "floral"], ["Safári", "safari"], ["Clássico", "clássico"], ["Tricô", "tricô"], ["Xadrez", "xadrez"], ["Poá", "poá"]]) }] });
  const enxoval = completarGrade(ENXOVAL);
  const acabamentos = completarGrade({ ...ENXOVAL, titulo: "Escolha o acabamento", abas: [{ rotulo: "Tecidos e bordados", cards: cardsDeBusca([["Percal 230 fios", "percal 230 fios"], ["400 fios egípcios", "400 fios"], ["Linho", "linho"], ["Tricô", "tricô"], ["Renda Renascença", "renascença"], ["Nervuras", "nervuras"]]) }] });
  const comFoto = (feature: Feature, foto = fotoDoDestino(catalogo, feature.acoes[0]?.href ?? "")): Feature => ({ ...feature, midia: feature.midia.src ? feature.midia : { ...feature.midia, ...foto } });
  const maternidade = produtosDoDestino(catalogo, "/maternidade").length || !temFotos ? comFoto(FEATURE_MATERNIDADE) : comFoto({
    ...FEATURE_MATERNIDADE, titulo: "Texturas que acolhem, detalhes feitos para durar", atalho: undefined,
    acoes: [{ rotulo: "Conhecer os kits em tricô", href: "/busca?q=tric%C3%B4" }],
  }, escolherFoto(produtosDoDestino(catalogo, "/busca?q=tricô"), ["kit-berco-urso"], 1));
  return {
    slides: SLIDES.map(slide => ({ ...slide,
      subtitulo: slide.id === "edicao-do-mes" ? edicao.subtitulo : slide.subtitulo,
      midia: slide.midia.src ? slide.midia : { ...slide.midia, ...(slide.id === "edicao-do-mes" ? edicao.blocos[0]?.midia : slide.id === "projetos" ? quarto : fotoDoDestino(catalogo, slide.acoes[0]?.href ?? "")) },
    })).filter(slide => !temFotos || slide.midia.src),
    editorial: PAR_EDITORIAL.map(item => ({ ...item, midia: item.midia.src ? item.midia : { ...item.midia, ...fotoDoDestino(catalogo, item.acao.href) } })),
    novidades, porCor: completarGrade(POR_COR), quarto: porQuarto.abas.some(a => a.rotulo === "Por peça") ? porQuarto : temas,
    enxoval: produtosDoDestino(catalogo, "/enxoval").length || !temFotos ? enxoval : acabamentos,
    projetos: comFoto(FEATURE_PROJETOS, quarto), maternidade,
    bordado: comFoto(FEATURE_BORDADO, bordado),
  };
}
