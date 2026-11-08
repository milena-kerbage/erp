import { ORIGEM } from "@/loja/lib/seo/config";

// OpenSearch: permite buscar na loja direto pela barra de endereço (Chrome/Edge/Firefox).
// Ligado no layout por <link rel="search">. A busca em si (/busca) não é indexada (robots.txt).
// A origem é a mesma do resto da loja (src/lib/hosts.ts), então funciona em desenvolvimento e produção.
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>Ateliê Milena</ShortName>
  <Description>Buscar enxoval, kit berço e quarto de bebê no Ateliê Milena Kerbage</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image height="192" width="192" type="image/png">${ORIGEM}/icon.png</Image>
  <Url type="text/html" method="get" template="${ORIGEM}/busca?q={searchTerms}"/>
  <moz:SearchForm xmlns:moz="http://www.mozilla.org/2006/browser/search/">${ORIGEM}/busca</moz:SearchForm>
</OpenSearchDescription>
`;

export function GET() {
  return new Response(XML, {
    headers: {
      "Content-Type": "application/opensearchdescription+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
