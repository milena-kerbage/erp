import assert from 'node:assert/strict';
import test from 'node:test';
import '../../scripts/lib/registrar-ts.mjs';

const {catalogoEstatico}=await import('../../src/loja/lib/catalogo/fonte.ts');
const {fotoDoDestino,menuComFotos,produtosDoDestino,produtosEmDestaque,termosDaCuradoria}=await import('../../src/loja/lib/catalogo/curadoria.ts');
const {homeComFotos,edicaoComFotos}=await import('../../src/loja/lib/catalogo/apresentacao.ts');
const {buscarTexto}=await import('../../src/loja/lib/catalogo/listagem.ts');
const {montarMenu}=await import('../../src/loja/componentes/layout/cabecalho/menu.ts');

function catalogo(){
  const original=catalogoEstatico(),base=original.produtos[0];
  const criar=(slug,para,cor,tecido,resumo,pronta=false)=>({...base,slug,nome:slug.replaceAll('-',' '),resumo,
    caminho:'/kit-berco/kits',atributos:{para:[para],cor:[cor],tecido:[tecido],entrega:[pronta?'Pronta entrega':'Sob encomenda']},
    imagens:[{src:`/fotos/${slug}.webp`,alt:slug,tipo:'principal'},{src:`/fotos/${slug}-detalhe.webp`,alt:`Detalhe ${slug}`,tipo:'detalhe'}]});
  return {...original,origem:'banco',maisVendidos:['produto-arquivado'],produtos:[
    criar('kit-berco-sofia','Menina','Rosê','400 fios egípcios','Bordado floral, renda Renascença e nervuras.'),
    criar('kit-berco-thomaz','Menino','Verde-sálvia','Linho e percal 230 fios','Bordado de folhagens em linho.'),
    criar('kit-berco-azul-poa','Menino','Azul bebê','400 fios egípcios','Bordado de poá.'),
    criar('kit-berco-urso','Menino','Cru','Tricô','Tricô com bordado de urso.'),
    criar('kit-berco-richelieu-luxo','Menina','Branco','400 fios egípcios','Renda Renascença.',true),
  ]};
}

test('a imagem da coleção respeita público, cor e categoria, sem substituir categorias vazias por kits',()=>{
  const c=catalogo();
  assert.equal(fotoDoDestino(c,'/kit-berco/kits/menina').alt,'kit-berco-sofia');
  assert.equal(fotoDoDestino(c,'/kit-berco?cor=azul-bebe').alt,'kit-berco-azul-poa');
  assert.equal(fotoDoDestino(c,'/pronta-entrega').alt,'kit-berco-richelieu-luxo');
  assert.equal(fotoDoDestino(c,'/maternidade/bolsas'),undefined);
  assert.deepEqual(produtosDoDestino(c,'https://outra-loja.example/kit-berco'),[]);
});

test('arquivar uma peça ou trocar a capa atualiza a seleção sem referências antigas',()=>{
  const c=catalogo();
  c.produtos=c.produtos.filter(p=>p.slug!=='kit-berco-sofia');
  assert.equal(fotoDoDestino(c,'/kit-berco/kits/menina').alt,'kit-berco-richelieu-luxo');
  c.produtos[0].imagens[0].src='/nova-capa.webp';
  assert.equal(fotoDoDestino(c,'/kit-berco?cor=verde-salvia').src,'/nova-capa.webp');
  const destaques=produtosEmDestaque(c);
  assert.equal(new Set(destaques.map(p=>p.slug)).size,destaques.length);
  assert(!destaques.some(p=>p.slug==='produto-arquivado'));
});

test('home e edição usam produtos existentes e os cards levam a uma seleção com resultado',()=>{
  const c=catalogo(),home=homeComFotos(c),edicao=edicaoComFotos(c);
  for(const grade of [home.novidades,home.porCor,home.quarto,home.enxoval])for(const aba of grade.abas)for(const card of aba.cards){
    assert(card.midia.src,card.rotulo);
    assert(produtosDoDestino(c,card.href).length>0,card.href);
  }
  assert(home.slides.every(s=>s.midia.src));
  assert.equal(edicao.produtos.length,5);
  assert(edicao.produtos.every(slug=>c.produtos.some(p=>p.slug===slug)));
  assert(!edicao.blocos.some(b=>b.id==='banho'));
});

test('menu conserva a foto escolhida no ERP e completa as outras com as capas atuais',()=>{
  const c=catalogo(),menu=montarMenu();
  menu[0].painel.cards[0].src='/campanha-da-equipe.webp';
  const pronto=menuComFotos(menu,c);
  assert.equal(pronto[0].painel.cards[0].src,'/campanha-da-equipe.webp');
  assert(pronto.find(i=>i.id==='para-quem').painel.cards.every(card=>card.src));
  const maternidade=pronto.find(i=>i.id==='maternidade').painel.cards;
  assert.equal(maternidade[0].href,'/kit-berco/kits');
  assert(maternidade.every(c=>c.src));
  assert.equal(menu[0].painel.cards.length,4); // não modifica o cadastro original
});

test('busca inclui os acabamentos descritos, e todos os atalhos sugeridos têm resultado',()=>{
  const c=catalogo();
  assert.equal(buscarTexto(c.produtos,'renascenca nervuras')[0].slug,'kit-berco-sofia');
  assert(termosDaCuradoria(c).includes('floral'));
  for(const termo of termosDaCuradoria(c))assert(buscarTexto(c.produtos,termo).length>0);
});
