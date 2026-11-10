# Cloudflare R2 e compressão nativa de imagens

A hospedagem atual foi mantida. O sistema possui integração S3/R2 no servidor, biblioteca de mídia em **Configurações → Fotos e vídeos**, uploads privados para produtos/avaliações/perfis/anexos e compressor nativo com sharp. Os buckets ainda precisam ser criados na conta Cloudflare; sem suas credenciais, a integração externa não está ativa.

## Ativação dos buckets

1. Criar dois buckets **R2 Standard** diferentes: um privado e outro público. Os dois compartilham a franquia gratuita da conta; considerar miniaturas e os dois formatos no volume armazenado.
2. No privado, manter domínio público e `r2.dev` desativados. Ele recebe originais de uploads diretos, arquivos internos e imagens que precisam de autorização/moderação.
3. No público, ativar o endereço `r2.dev` (escolha atual: o DNS do domínio está na Vercel, e o Custom Domain da R2 exige a zona na Cloudflare). Endereço em uso: `https://pub-c1d02ae652d84fb0ab74b8d4ed672919.r2.dev`. Somente arquivos publicados pela gestão na biblioteca de mídia são copiados para ele. O `r2.dev` tem limite de requisições e não passa pelo cache da Cloudflare: serve para homologação e volume baixo; antes de tráfego real, trocar por Custom Domain (`midia.ateliemilenakerbage.com.br`, o que exige mover o DNS para a Cloudflare). [Documentação de domínio e cache](https://developers.cloudflare.com/r2/buckets/public-buckets/).
4. Configurar CORS usando [r2-private-cors.json](../infra/cloudflare/r2-private-cors.json) e [r2-public-cors.json](../infra/cloudflare/r2-public-cors.json). Se o ERP estiver em um domínio de prévia, acrescentar sua origem HTTPS exata ao CORS privado.
5. Gerar credenciais S3 restritas à leitura/escrita dos dois buckets. Definir no ambiente **do servidor**: `MEDIA_STORAGE_DRIVER=r2`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PRIVATE_BUCKET`, `R2_PUBLIC_BUCKET`. Definir a URL pública `NEXT_PUBLIC_LOJA_MEDIA_ORIGIN=https://pub-c1d02ae652d84fb0ab74b8d4ed672919.r2.dev` (ou o Custom Domain, quando houver) e fazer novo build. As credenciais não devem usar prefixo `NEXT_PUBLIC_`.
6. Abrir Configurações → Fotos e vídeos e publicar um arquivo de teste. O vídeo vai diretamente do navegador ao bucket privado por URL assinada de cinco minutos. A finalização verifica dono, tamanho, MIME, assinatura inicial do arquivo e ETag antes da cópia pública. Fotos são convertidas em WebP e AVIF antes da publicação.

Produção usa R2 por padrão. Se a configuração estiver incompleta, novos uploads retornam erro de armazenamento; o sistema não passa silenciosamente a gravar os bytes no banco. O modo `MEDIA_STORAGE_DRIVER=database` existe para testes e uma transição explícita. Arquivos legados no banco continuam legíveis.

## CDN da aplicação

Manter a origem e os registros DNS da hospedagem atual. Se o domínio for colocado no proxy Cloudflare, usar TLS com validação do certificado da origem e preservar os registros exigidos pela hospedagem. A CDN não substitui o servidor Node.js.

Cachear os arquivos estáticos públicos e o domínio exclusivo de mídia. No domínio `midia`, respeitar o `Cache-Control` dos objetos publicados; seus nomes são imutáveis. Não aplicar Cache Everything ao domínio inteiro da aplicação: ERP, autenticação, conta e pedidos devem respeitar `private/no-store`, e HTML/RSC precisa preservar variantes do roteador Next.js. O servidor já envia os cabeçalhos apropriados. [Cache padrão](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/).

As rotas de fotos públicas geradas têm formato explícito na URL (`formato=avif` ou `webp`), cache longo no navegador e `s-maxage=86400` para a CDN da hospedagem. Fotos privadas exigem autenticação e não recebem cache público. O componente de produto usa `picture`, formatos e miniaturas responsivas já prontas, evitando recompressão na hospedagem a cada leitura. Arquivos estáticos comuns continuam compatíveis com o otimizador do Next.js, configurado para AVIF/WebP.

## Perfis automáticos de compressão

| Uso | Lado máximo | Miniatura | WebP | AVIF |
| --- | --- | --- | --- | --- |
| Avaliação | 1280 px | 320 px | Qualidade 62 | Qualidade 42 |
| Produto | 1600 px | 400 px | Qualidade 85 | Qualidade 65, cor 4:4:4 |
| Perfil | 512 px | 128 px | Qualidade 60 | Qualidade 40 |
| Imagem geral/anexo raster | 1440 px | 360 px | Qualidade 64 | Qualidade 44 |

O compressor não amplia fotos pequenas. Aplica a orientação, converte cores para sRGB, mantém transparência e remove metadados como EXIF/GPS/ICC/XMP. Gera os dois formatos e miniaturas. Os níveis de qualidade dos codecs têm escalas diferentes; não representam porcentagens equivalentes de qualidade visual.

O processamento é limitado a duas imagens simultâneas por processo, com fila limitada e teto de 24 megapixels de entrada. O servidor aceita até 3 MiB nos formulários de avaliações/produtos/perfil/anexos e até 12 MiB nas fotos da biblioteca; vídeos da biblioteca têm limite de 128 MiB. A redução no navegador tenta diminuir o upload e mantém qualidade maior para produtos. O servidor sempre refaz a validação, independentemente da extensão e do MIME enviado pelo navegador.

A biblioteca publica somente versões comprimidas das fotos e libera os originais privados após a confirmação no banco. Vídeos são validados e publicados no formato enviado; não há transcodificação de vídeo nesta implementação. As quatro variantes aumentam o armazenamento frente a manter um único arquivo; o objetivo é reduzir os bytes transferidos em cada tamanho/tipo de tela.

Ao duplicar um produto, suas fotos compartilham os objetos imutáveis e recebem novos vínculos no banco. Isso evita transferir/recomprimir e armazenar os mesmos arquivos novamente. A exclusão de uma foto ou produto só libera um objeto quando a última referência é removida.

## Metadados e 64 bits

`erp_core.image_variants` mantém perfil, formato, dimensões, tamanho original, tamanho comprimido, chave do objeto e data. Tamanhos e datas usam **BIGINT de 64 bits** no PostgreSQL; dimensões e pequenos estados usam inteiros menores quando suficientes. O adaptador valida inteiros recebidos para evitar perda silenciosa de precisão no JavaScript.

Não se grava Base64 de imagens em linhas de texto. Ele aumenta o volume em aproximadamente um terço. Com R2 ativo, o banco mantém referências e metadados; os bytes permanecem no storage. O fallback de testes/transição usa BYTEA/BLOB, sem codificação Base64.

## Só a versão atual fica guardada

Para o espaço não crescer à toa, nenhum arquivo substituído ou removido fica no storage:

- Trocar a foto de perfil apaga a anterior (WebP e AVIF, grande e miniatura) logo depois de gravar a nova.
- Remover uma foto de produto, excluir o produto, a avaliação ou o anexo do lead apaga os arquivos na hora. Em produtos duplicados, o arquivo só sai quando a última cópia deixa de usá-lo.
- A biblioteca de mídia tem **Excluir**, que tira o arquivo do bucket público em todos os formatos.
- Se a gravação falhar depois do envio (limite de fotos, revisão desatualizada, limite de avaliações), os arquivos recém-enviados são apagados.
- Reservas de upload não concluídas em 1 hora são limpas no próximo envio da biblioteca.
- Se a própria exclusão no R2 falhar, o arquivo fica sem referência e o GC abaixo o remove.

## Migração e limpeza

As migrações 001–014 foram aplicadas no banco configurado. Nenhum arquivo legado foi removido nessa etapa. Para transferir arquivos já armazenados em BYTEA depois de conectar os buckets:

```sh
npm run storage:migrate
npm run storage:migrate -- --apply
```

O primeiro comando mostra somente contagens/tamanhos. A aplicação lê lotes pequenos, envia cada binário e verifica SHA-256 dos bytes recuperados antes de esvaziar a coluna BYTEA e guardar a chave. Também contempla variantes AVIF presentes no banco. A migração transfere arquivos existentes sem recomprimi-los, preservando seu conteúdo; as novas imagens enviadas pelo sistema passam pelo compressor automaticamente.

Exclusões na aplicação removem suas variantes e tentam liberar os objetos após o commit. Objetos de uploads interrompidos, substituições de perfil e falhas de limpeza podem ser revisados com:

```sh
npm run storage:gc
npm run storage:gc -- --apply
```

O GC tem dry-run por padrão e só remove objetos privados sem referência, dos prefixos da aplicação, com mais de 48 horas. Não deve ser usado em bucket compartilhado com arquivos de outra aplicação. Nenhuma rotina foi agendada automaticamente.

## Verificação

`npm run test:images` verifica os dois formatos, a diferença entre perfis, orientação, transparência, limites e remoção de metadados. `npm run test:storage` usa SDK simulado e PostgreSQL isolado para testar referências sem bytes, publicação validada, migração e integridade dos arquivos. `npm run test:performance:http`, após o build isolado, sobe uma aplicação de produção com usuários e SQLite temporários e valida os endpoints reais, incluindo a entrega WebP/AVIF do perfil. Esses testes não usam registros de teste no Supabase real.
