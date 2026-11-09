# Rotas do ERP e da loja

Gerado com `node scripts/map-system.mjs`. Inventário estático. Caminhos consideram grupos de rotas e reescrita /loja por host. Metadados, layouts e proxy listados separadamente. Imports não provam execução nem quantidade SQL por HTTP.

97 páginas e 112 handlers no checkout analisado.

| Tipo | Host | Caminho público | Métodos | Arquivo |
| --- | --- | --- | --- | --- |
| pagina | erp | `/[...slug]` | render | [código](../src/app/%28erp%29/%28app%29/[...slug]/page.tsx) |
| pagina | erp | `/agenda` | render | [código](../src/app/%28erp%29/%28app%29/agenda/page.tsx) |
| pagina | erp | `/ajuda` | render | [código](../src/app/%28erp%29/%28app%29/ajuda/page.tsx) |
| pagina | erp | `/avaliacoes` | render | [código](../src/app/%28erp%29/%28app%29/avaliacoes/page.tsx) |
| pagina | erp | `/catalogo` | render | [código](../src/app/%28erp%29/%28app%29/catalogo/page.tsx) |
| pagina | erp | `/clientes/loja` | render | [código](../src/app/%28erp%29/%28app%29/clientes/loja/page.tsx) |
| pagina | erp | `/clientes` | render | [código](../src/app/%28erp%29/%28app%29/clientes/page.tsx) |
| pagina | erp | `/configuracoes/acessibilidade` | render | [código](../src/app/%28erp%29/%28app%29/configuracoes/acessibilidade/page.tsx) |
| pagina | erp | `/configuracoes/api` | render | [código](../src/app/%28erp%29/%28app%29/configuracoes/api/page.tsx) |
| pagina | erp | `/configuracoes/funis` | render | [código](../src/app/%28erp%29/%28app%29/configuracoes/funis/page.tsx) |
| pagina | erp | `/configuracoes/integracoes` | render | [código](../src/app/%28erp%29/%28app%29/configuracoes/integracoes/page.tsx) |
| pagina | erp | `/configuracoes/midia` | render | [código](../src/app/%28erp%29/%28app%29/configuracoes/midia/page.tsx) |
| pagina | erp | `/configuracoes` | render | [código](../src/app/%28erp%29/%28app%29/configuracoes/page.tsx) |
| pagina | erp | `/configuracoes/perfil` | render | [código](../src/app/%28erp%29/%28app%29/configuracoes/perfil/page.tsx) |
| pagina | erp | `/configuracoes/preferencias` | render | [código](../src/app/%28erp%29/%28app%29/configuracoes/preferencias/page.tsx) |
| pagina | erp | `/configuracoes/usuarios` | render | [código](../src/app/%28erp%29/%28app%29/configuracoes/usuarios/page.tsx) |
| pagina | erp | `/configuracoes/whatsapp` | render | [código](../src/app/%28erp%29/%28app%29/configuracoes/whatsapp/page.tsx) |
| pagina | erp | `/conta/novidades` | render | [código](../src/app/%28erp%29/%28app%29/conta/novidades/page.tsx) |
| pagina | erp | `/conta` | render | [código](../src/app/%28erp%29/%28app%29/conta/page.tsx) |
| pagina | erp | `/conversas` | render | [código](../src/app/%28erp%29/%28app%29/conversas/page.tsx) |
| pagina | erp | `/ecommerce/avaliacoes` | render | [código](../src/app/%28erp%29/%28app%29/ecommerce/avaliacoes/page.tsx) |
| pagina | erp | `/ecommerce/carrinhos` | render | [código](../src/app/%28erp%29/%28app%29/ecommerce/carrinhos/page.tsx) |
| pagina | erp | `/ecommerce/categorias` | render | [código](../src/app/%28erp%29/%28app%29/ecommerce/categorias/page.tsx) |
| pagina | erp | `/ecommerce/clientes` | render | [código](../src/app/%28erp%29/%28app%29/ecommerce/clientes/page.tsx) |
| pagina | erp | `/ecommerce/colecoes` | render | [código](../src/app/%28erp%29/%28app%29/ecommerce/colecoes/page.tsx) |
| pagina | erp | `/ecommerce/cupons` | render | [código](../src/app/%28erp%29/%28app%29/ecommerce/cupons/page.tsx) |
| pagina | erp | `/ecommerce/menu` | render | [código](../src/app/%28erp%29/%28app%29/ecommerce/menu/page.tsx) |
| pagina | erp | `/ecommerce/opcoes` | render | [código](../src/app/%28erp%29/%28app%29/ecommerce/opcoes/page.tsx) |
| pagina | erp | `/ecommerce` | render | [código](../src/app/%28erp%29/%28app%29/ecommerce/page.tsx) |
| pagina | erp | `/ecommerce/pedidos` | render | [código](../src/app/%28erp%29/%28app%29/ecommerce/pedidos/page.tsx) |
| pagina | erp | `/ecommerce/produtos/[id]` | render | [código](../src/app/%28erp%29/%28app%29/ecommerce/produtos/[id]/page.tsx) |
| pagina | erp | `/ecommerce/produtos/novo` | render | [código](../src/app/%28erp%29/%28app%29/ecommerce/produtos/novo/page.tsx) |
| pagina | erp | `/ecommerce/produtos` | render | [código](../src/app/%28erp%29/%28app%29/ecommerce/produtos/page.tsx) |
| pagina | erp | `/estoque/materiais` | render | [código](../src/app/%28erp%29/%28app%29/estoque/materiais/page.tsx) |
| pagina | erp | `/estoque/movimentacoes` | render | [código](../src/app/%28erp%29/%28app%29/estoque/movimentacoes/page.tsx) |
| pagina | erp | `/estoque` | render | [código](../src/app/%28erp%29/%28app%29/estoque/page.tsx) |
| pagina | erp | `/financeiro/fluxo-de-caixa` | render | [código](../src/app/%28erp%29/%28app%29/financeiro/fluxo-de-caixa/page.tsx) |
| pagina | erp | `/financeiro/pagar` | render | [código](../src/app/%28erp%29/%28app%29/financeiro/pagar/page.tsx) |
| pagina | erp | `/financeiro` | render | [código](../src/app/%28erp%29/%28app%29/financeiro/page.tsx) |
| pagina | erp | `/financeiro/receber` | render | [código](../src/app/%28erp%29/%28app%29/financeiro/receber/page.tsx) |
| pagina | erp | `/leads/[id]` | render | [código](../src/app/%28erp%29/%28app%29/leads/[id]/page.tsx) |
| pagina | erp | `/leads` | render | [código](../src/app/%28erp%29/%28app%29/leads/page.tsx) |
| pagina | erp | `/orcamentos` | render | [código](../src/app/%28erp%29/%28app%29/orcamentos/page.tsx) |
| pagina | erp | `/` | render | [código](../src/app/%28erp%29/%28app%29/page.tsx) |
| pagina | erp | `/pedidos/em-andamento` | render | [código](../src/app/%28erp%29/%28app%29/pedidos/em-andamento/page.tsx) |
| pagina | erp | `/pedidos/finalizados` | render | [código](../src/app/%28erp%29/%28app%29/pedidos/finalizados/page.tsx) |
| pagina | erp | `/pedidos/loja` | render | [código](../src/app/%28erp%29/%28app%29/pedidos/loja/page.tsx) |
| pagina | erp | `/pedidos` | render | [código](../src/app/%28erp%29/%28app%29/pedidos/page.tsx) |
| pagina | erp | `/producao` | render | [código](../src/app/%28erp%29/%28app%29/producao/page.tsx) |
| pagina | erp | `/relatorios` | render | [código](../src/app/%28erp%29/%28app%29/relatorios/page.tsx) |
| pagina | erp | `/cookies` | render | [código](../src/app/%28erp%29/%28legal%29/cookies/page.tsx) |
| pagina | erp | `/exclusao-de-dados` | render | [código](../src/app/%28erp%29/%28legal%29/exclusao-de-dados/page.tsx) |
| pagina | erp | `/exclusao-de-dados/status` | render | [código](../src/app/%28erp%29/%28legal%29/exclusao-de-dados/status/page.tsx) |
| pagina | erp | `/politica-de-comunicacao` | render | [código](../src/app/%28erp%29/%28legal%29/politica-de-comunicacao/page.tsx) |
| pagina | erp | `/politicas` | render | [código](../src/app/%28erp%29/%28legal%29/politicas/page.tsx) |
| pagina | erp | `/privacidade` | render | [código](../src/app/%28erp%29/%28legal%29/privacidade/page.tsx) |
| pagina | erp | `/termos` | render | [código](../src/app/%28erp%29/%28legal%29/termos/page.tsx) |
| pagina | erp | `/convite` | render | [código](../src/app/%28erp%29/convite/page.tsx) |
| pagina | erp | `/login` | render | [código](../src/app/%28erp%29/login/page.tsx) |
| pagina | erp | `/recuperar-senha` | render | [código](../src/app/%28erp%29/recuperar-senha/page.tsx) |
| pagina | erp | `/redefinir-senha` | render | [código](../src/app/%28erp%29/redefinir-senha/page.tsx) |
| pagina | loja | `/carrinho` | render | [código](../src/app/%28site%29/loja/%28compra%29/carrinho/page.tsx) |
| pagina | loja | `/checkout` | render | [código](../src/app/%28site%29/loja/%28compra%29/checkout/page.tsx) |
| pagina | loja | `/conta/cadastro` | render | [código](../src/app/%28site%29/loja/%28conta%29/conta/cadastro/page.tsx) |
| pagina | loja | `/conta/clube` | render | [código](../src/app/%28site%29/loja/%28conta%29/conta/clube/page.tsx) |
| pagina | loja | `/conta/dados` | render | [código](../src/app/%28site%29/loja/%28conta%29/conta/dados/page.tsx) |
| pagina | loja | `/conta/entrar` | render | [código](../src/app/%28site%29/loja/%28conta%29/conta/entrar/page.tsx) |
| pagina | loja | `/conta/favoritos` | render | [código](../src/app/%28site%29/loja/%28conta%29/conta/favoritos/page.tsx) |
| pagina | loja | `/conta` | render | [código](../src/app/%28site%29/loja/%28conta%29/conta/page.tsx) |
| pagina | loja | `/conta/pedidos/[numero]` | render | [código](../src/app/%28site%29/loja/%28conta%29/conta/pedidos/[numero]/page.tsx) |
| pagina | loja | `/conta/pedidos` | render | [código](../src/app/%28site%29/loja/%28conta%29/conta/pedidos/page.tsx) |
| pagina | loja | `/conta/redefinir` | render | [código](../src/app/%28site%29/loja/%28conta%29/conta/redefinir/page.tsx) |
| pagina | loja | `/conta/seguranca` | render | [código](../src/app/%28site%29/loja/%28conta%29/conta/seguranca/page.tsx) |
| pagina | loja | `/[...categoria]` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/[...categoria]/page.tsx) |
| pagina | loja | `/ajuda/bordado-personalizado` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/ajuda/bordado-personalizado/page.tsx) |
| pagina | loja | `/ajuda/como-fazer-pedido` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/ajuda/como-fazer-pedido/page.tsx) |
| pagina | loja | `/ajuda/entregas` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/ajuda/entregas/page.tsx) |
| pagina | loja | `/ajuda` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/ajuda/page.tsx) |
| pagina | loja | `/ajuda/perguntas-frequentes` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/ajuda/perguntas-frequentes/page.tsx) |
| pagina | loja | `/ajuda/tecidos-e-cuidados` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/ajuda/tecidos-e-cuidados/page.tsx) |
| pagina | loja | `/ajuda/trocas-e-devolucoes` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/ajuda/trocas-e-devolucoes/page.tsx) |
| pagina | loja | `/busca` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/busca/page.tsx) |
| pagina | loja | `/edicao-do-mes` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/edicao-do-mes/page.tsx) |
| pagina | loja | `/indique` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/indique/page.tsx) |
| pagina | loja | `/` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/page.tsx) |
| pagina | loja | `/personalizado/[slug]` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/personalizado/[slug]/page.tsx) |
| pagina | loja | `/personalizado/monte-o-seu/[etapa]` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/personalizado/monte-o-seu/[etapa]/page.tsx) |
| pagina | loja | `/personalizado/monte-o-seu` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/personalizado/monte-o-seu/page.tsx) |
| pagina | loja | `/personalizado` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/personalizado/page.tsx) |
| pagina | loja | `/politicas/cookies` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/politicas/cookies/page.tsx) |
| pagina | loja | `/politicas` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/politicas/page.tsx) |
| pagina | loja | `/politicas/privacidade` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/politicas/privacidade/page.tsx) |
| pagina | loja | `/politicas/termos` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/politicas/termos/page.tsx) |
| pagina | loja | `/politicas/trocas` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/politicas/trocas/page.tsx) |
| pagina | loja | `/produto/[slug]` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/produto/[slug]/page.tsx) |
| pagina | loja | `/pronta-entrega` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/pronta-entrega/page.tsx) |
| pagina | loja | `/sobre` | render | [código](../src/app/%28site%29/loja/%28vitrine%29/sobre/page.tsx) |
| api | loja | `/api/avaliacoes/foto/[id]` | GET | [código](../src/app/%28site%29/loja/api/avaliacoes/foto/[id]/route.ts) |
| api | loja | `/api/avaliacoes` | GET, POST | [código](../src/app/%28site%29/loja/api/avaliacoes/route.ts) |
| api | loja | `/api/busca/sugestoes` | GET | [código](../src/app/%28site%29/loja/api/busca/sugestoes/route.ts) |
| api | loja | `/api/carrinho` | GET | [código](../src/app/%28site%29/loja/api/carrinho/route.ts) |
| api | loja | `/api/carrinho/sincronizar` | PUT | [código](../src/app/%28site%29/loja/api/carrinho/sincronizar/route.ts) |
| api | loja | `/api/catalogo/imagem/[id]` | GET | [código](../src/app/%28site%29/loja/api/catalogo/imagem/[id]/route.ts) |
| api | loja | `/api/conta/cadastrar` | POST | [código](../src/app/%28site%29/loja/api/conta/cadastrar/route.ts) |
| api | loja | `/api/conta/entrar` | POST | [código](../src/app/%28site%29/loja/api/conta/entrar/route.ts) |
| api | loja | `/api/conta/eu` | GET | [código](../src/app/%28site%29/loja/api/conta/eu/route.ts) |
| api | loja | `/api/conta/excluir` | POST | [código](../src/app/%28site%29/loja/api/conta/excluir/route.ts) |
| api | loja | `/api/conta/pedidos/[numero]` | GET | [código](../src/app/%28site%29/loja/api/conta/pedidos/[numero]/route.ts) |
| api | loja | `/api/conta/pedidos` | GET | [código](../src/app/%28site%29/loja/api/conta/pedidos/route.ts) |
| api | loja | `/api/conta/perfil` | PATCH | [código](../src/app/%28site%29/loja/api/conta/perfil/route.ts) |
| api | loja | `/api/conta/redefinir` | POST | [código](../src/app/%28site%29/loja/api/conta/redefinir/route.ts) |
| api | loja | `/api/conta/sair` | POST | [código](../src/app/%28site%29/loja/api/conta/sair/route.ts) |
| api | loja | `/api/conta/senha` | POST | [código](../src/app/%28site%29/loja/api/conta/senha/route.ts) |
| api | loja | `/api/indexnow-chave` | GET | [código](../src/app/%28site%29/loja/api/indexnow-chave/route.ts) |
| api | loja | `/api/instagram/midia/[id]` | GET | [código](../src/app/%28site%29/loja/api/instagram/midia/[id]/route.ts) |
| api | loja | `/api/localizacao` | GET | [código](../src/app/%28site%29/loja/api/localizacao/route.ts) |
| api | loja | `/api/pedidos` | POST | [código](../src/app/%28site%29/loja/api/pedidos/route.ts) |
| api | loja | `/dev/midia/[formato]` | GET | [código](../src/app/%28site%29/loja/dev/midia/[formato]/route.tsx) |
| api | loja | `/opensearch.xml` | GET | [código](../src/app/%28site%29/loja/opensearch.xml/route.ts) |
| api | erp | `/api/[...path]` | GET, POST, PUT, PATCH, DELETE, OPTIONS | [código](../src/app/api/[...path]/route.ts) |
| api | erp | `/api/auth/[action]` | POST | [código](../src/app/api/auth/[action]/route.ts) |
| api | erp | `/api/erp/api-keys/[id]` | DELETE | [código](../src/app/api/erp/api-keys/[id]/route.ts) |
| api | erp | `/api/erp/api-keys` | GET, POST | [código](../src/app/api/erp/api-keys/route.ts) |
| api | erp | `/api/erp/avaliacoes/[id]` | PATCH, DELETE | [código](../src/app/api/erp/avaliacoes/[id]/route.ts) |
| api | erp | `/api/erp/avaliacoes/foto/[id]` | GET | [código](../src/app/api/erp/avaliacoes/foto/[id]/route.ts) |
| api | erp | `/api/erp/avaliacoes` | GET | [código](../src/app/api/erp/avaliacoes/route.ts) |
| api | erp | `/api/erp/dashboard/activity` | GET | [código](../src/app/api/erp/dashboard/activity/route.ts) |
| api | erp | `/api/erp/dashboard` | GET | [código](../src/app/api/erp/dashboard/route.ts) |
| api | erp | `/api/erp/documentation` | GET | [código](../src/app/api/erp/documentation/route.ts) |
| api | erp | `/api/erp/funnels/[id]` | GET, PATCH, DELETE | [código](../src/app/api/erp/funnels/[id]/route.ts) |
| api | erp | `/api/erp/funnels/reorder` | POST | [código](../src/app/api/erp/funnels/reorder/route.ts) |
| api | erp | `/api/erp/funnels` | GET, POST | [código](../src/app/api/erp/funnels/route.ts) |
| api | erp | `/api/erp/leads/[id]/attachments/[attachmentId]` | GET, DELETE | [código](../src/app/api/erp/leads/[id]/attachments/[attachmentId]/route.ts) |
| api | erp | `/api/erp/leads/[id]/attachments` | POST | [código](../src/app/api/erp/leads/[id]/attachments/route.ts) |
| api | erp | `/api/erp/leads/[id]/notes` | POST | [código](../src/app/api/erp/leads/[id]/notes/route.ts) |
| api | erp | `/api/erp/leads/[id]` | GET, PATCH, DELETE | [código](../src/app/api/erp/leads/[id]/route.ts) |
| api | erp | `/api/erp/leads` | GET, POST | [código](../src/app/api/erp/leads/route.ts) |
| api | erp | `/api/erp/loja/carrinhos/[clienteId]/mensagem` | POST | [código](../src/app/api/erp/loja/carrinhos/[clienteId]/mensagem/route.ts) |
| api | erp | `/api/erp/loja/carrinhos` | GET | [código](../src/app/api/erp/loja/carrinhos/route.ts) |
| api | erp | `/api/erp/loja/categorias/[id]` | GET, PATCH, DELETE | [código](../src/app/api/erp/loja/categorias/[id]/route.ts) |
| api | erp | `/api/erp/loja/categorias/imagens` | GET | [código](../src/app/api/erp/loja/categorias/imagens/route.ts) |
| api | erp | `/api/erp/loja/categorias/ordem` | PUT | [código](../src/app/api/erp/loja/categorias/ordem/route.ts) |
| api | erp | `/api/erp/loja/categorias` | GET, POST | [código](../src/app/api/erp/loja/categorias/route.ts) |
| api | erp | `/api/erp/loja/clientes/[id]/redefinicao` | POST | [código](../src/app/api/erp/loja/clientes/[id]/redefinicao/route.ts) |
| api | erp | `/api/erp/loja/clientes/[id]` | GET | [código](../src/app/api/erp/loja/clientes/[id]/route.ts) |
| api | erp | `/api/erp/loja/clientes` | GET | [código](../src/app/api/erp/loja/clientes/route.ts) |
| api | erp | `/api/erp/loja/colecoes/[id]` | GET, PATCH, DELETE | [código](../src/app/api/erp/loja/colecoes/[id]/route.ts) |
| api | erp | `/api/erp/loja/colecoes` | GET, POST | [código](../src/app/api/erp/loja/colecoes/route.ts) |
| api | erp | `/api/erp/loja/cupons/[id]` | GET, PATCH | [código](../src/app/api/erp/loja/cupons/[id]/route.ts) |
| api | erp | `/api/erp/loja/cupons/[id]/usos` | GET | [código](../src/app/api/erp/loja/cupons/[id]/usos/route.ts) |
| api | erp | `/api/erp/loja/cupons` | GET, POST | [código](../src/app/api/erp/loja/cupons/route.ts) |
| api | erp | `/api/erp/loja/menu/[id]` | PATCH, DELETE | [código](../src/app/api/erp/loja/menu/[id]/route.ts) |
| api | erp | `/api/erp/loja/menu/ordem` | PUT | [código](../src/app/api/erp/loja/menu/ordem/route.ts) |
| api | erp | `/api/erp/loja/menu` | GET, POST | [código](../src/app/api/erp/loja/menu/route.ts) |
| api | erp | `/api/erp/loja/opcoes/[id]` | GET, PATCH, DELETE | [código](../src/app/api/erp/loja/opcoes/[id]/route.ts) |
| api | erp | `/api/erp/loja/opcoes` | GET, POST | [código](../src/app/api/erp/loja/opcoes/route.ts) |
| api | erp | `/api/erp/loja/painel` | GET | [código](../src/app/api/erp/loja/painel/route.ts) |
| api | erp | `/api/erp/loja/pedidos/[numero]` | PATCH | [código](../src/app/api/erp/loja/pedidos/[numero]/route.ts) |
| api | erp | `/api/erp/loja/pedidos` | GET | [código](../src/app/api/erp/loja/pedidos/route.ts) |
| api | erp | `/api/erp/loja/produtos/[id]/arquivar` | POST | [código](../src/app/api/erp/loja/produtos/[id]/arquivar/route.ts) |
| api | erp | `/api/erp/loja/produtos/[id]/duplicar` | POST | [código](../src/app/api/erp/loja/produtos/[id]/duplicar/route.ts) |
| api | erp | `/api/erp/loja/produtos/[id]/imagens/[imagemId]` | GET, PATCH, DELETE | [código](../src/app/api/erp/loja/produtos/[id]/imagens/[imagemId]/route.ts) |
| api | erp | `/api/erp/loja/produtos/[id]/imagens/ordem` | PUT | [código](../src/app/api/erp/loja/produtos/[id]/imagens/ordem/route.ts) |
| api | erp | `/api/erp/loja/produtos/[id]/imagens` | GET, POST | [código](../src/app/api/erp/loja/produtos/[id]/imagens/route.ts) |
| api | erp | `/api/erp/loja/produtos/[id]` | GET, PATCH, DELETE | [código](../src/app/api/erp/loja/produtos/[id]/route.ts) |
| api | erp | `/api/erp/loja/produtos` | GET, POST | [código](../src/app/api/erp/loja/produtos/route.ts) |
| api | erp | `/api/erp/media/[id]/publish` | POST | [código](../src/app/api/erp/media/[id]/publish/route.ts) |
| api | erp | `/api/erp/media` | GET, POST | [código](../src/app/api/erp/media/route.ts) |
| api | erp | `/api/erp/notifications` | GET, PATCH | [código](../src/app/api/erp/notifications/route.ts) |
| api | erp | `/api/erp/preferences` | GET, PATCH | [código](../src/app/api/erp/preferences/route.ts) |
| api | erp | `/api/erp/profile/photo` | GET, POST, DELETE | [código](../src/app/api/erp/profile/photo/route.ts) |
| api | erp | `/api/erp/profile` | GET, PATCH | [código](../src/app/api/erp/profile/route.ts) |
| api | erp | `/api/erp/records/[resource]/[id]` | GET, PATCH, DELETE | [código](../src/app/api/erp/records/[resource]/[id]/route.ts) |
| api | erp | `/api/erp/records/[resource]` | GET, POST | [código](../src/app/api/erp/records/[resource]/route.ts) |
| api | erp | `/api/erp/reports` | GET | [código](../src/app/api/erp/reports/route.ts) |
| api | erp | `/api/erp` | GET | [código](../src/app/api/erp/route.ts) |
| api | erp | `/api/erp/team/[id]/invite` | POST | [código](../src/app/api/erp/team/[id]/invite/route.ts) |
| api | erp | `/api/erp/team/[id]` | PATCH, DELETE | [código](../src/app/api/erp/team/[id]/route.ts) |
| api | erp | `/api/erp/team` | GET, POST | [código](../src/app/api/erp/team/route.ts) |
| api | erp | `/api/erp/webhooks/[id]` | PATCH, DELETE | [código](../src/app/api/erp/webhooks/[id]/route.ts) |
| api | erp | `/api/erp/webhooks/[id]/test` | POST | [código](../src/app/api/erp/webhooks/[id]/test/route.ts) |
| api | erp | `/api/erp/webhooks/deliveries` | GET, POST | [código](../src/app/api/erp/webhooks/deliveries/route.ts) |
| api | erp | `/api/erp/webhooks` | GET, POST | [código](../src/app/api/erp/webhooks/route.ts) |
| api | erp | `/api/erp/workspace` | GET | [código](../src/app/api/erp/workspace/route.ts) |
| api | erp | `/api/meta/data-deletion` | POST | [código](../src/app/api/meta/data-deletion/route.ts) |
| api | erp | `/api/meta/data-deletion/status` | GET | [código](../src/app/api/meta/data-deletion/status/route.ts) |
| api | erp | `/api/whatsapp/consent` | POST | [código](../src/app/api/whatsapp/consent/route.ts) |
| api | erp | `/api/whatsapp/contacts` | DELETE | [código](../src/app/api/whatsapp/contacts/route.ts) |
| api | erp | `/api/whatsapp/conversations` | GET | [código](../src/app/api/whatsapp/conversations/route.ts) |
| api | erp | `/api/whatsapp/management/bootstrap` | POST | [código](../src/app/api/whatsapp/management/bootstrap/route.ts) |
| api | erp | `/api/whatsapp/management/checklist` | PUT | [código](../src/app/api/whatsapp/management/checklist/route.ts) |
| api | erp | `/api/whatsapp/management/config` | GET, PUT | [código](../src/app/api/whatsapp/management/config/route.ts) |
| api | erp | `/api/whatsapp/management/deletions` | GET, POST | [código](../src/app/api/whatsapp/management/deletions/route.ts) |
| api | erp | `/api/whatsapp/management/events` | GET | [código](../src/app/api/whatsapp/management/events/route.ts) |
| api | erp | `/api/whatsapp/management/guide` | GET | [código](../src/app/api/whatsapp/management/guide/route.ts) |
| api | erp | `/api/whatsapp/management/oauth/callback` | GET | [código](../src/app/api/whatsapp/management/oauth/callback/route.ts) |
| api | erp | `/api/whatsapp/management/oauth/start` | POST | [código](../src/app/api/whatsapp/management/oauth/start/route.ts) |
| api | erp | `/api/whatsapp/management/overview` | GET | [código](../src/app/api/whatsapp/management/overview/route.ts) |
| api | erp | `/api/whatsapp/management/secrets` | POST | [código](../src/app/api/whatsapp/management/secrets/route.ts) |
| api | erp | `/api/whatsapp/management/subscribe` | POST | [código](../src/app/api/whatsapp/management/subscribe/route.ts) |
| api | erp | `/api/whatsapp/management/tests` | POST | [código](../src/app/api/whatsapp/management/tests/route.ts) |
| api | erp | `/api/whatsapp/management/token` | POST | [código](../src/app/api/whatsapp/management/token/route.ts) |
| api | erp | `/api/whatsapp/media` | GET | [código](../src/app/api/whatsapp/media/route.ts) |
| api | erp | `/api/whatsapp/messages` | GET, POST | [código](../src/app/api/whatsapp/messages/route.ts) |
| api | erp | `/api/whatsapp/read` | POST | [código](../src/app/api/whatsapp/read/route.ts) |
| api | erp | `/api/whatsapp/status` | GET | [código](../src/app/api/whatsapp/status/route.ts) |
| api | erp | `/api/whatsapp/templates` | GET | [código](../src/app/api/whatsapp/templates/route.ts) |
| api | erp | `/api/whatsapp/unread` | GET | [código](../src/app/api/whatsapp/unread/route.ts) |
| api | erp | `/api/whatsapp/webhook` | GET, POST | [código](../src/app/api/whatsapp/webhook/route.ts) |
