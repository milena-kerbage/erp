// Inventário estático e reproduzível; só lê código versionável, nunca .env ou .data.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
const filesUnder = directory => readdirSync(directory, {withFileTypes: true}).flatMap(entry => entry.isDirectory() ? filesUnder(join(directory, entry.name)) : [join(directory, entry.name)]).sort();
const sourceFiles = filesUnder('src');
const routeFiles = sourceFiles.filter(file => /\/(page|route)\.(tsx?|jsx?)$/.test(file));
const sqlFiles = filesUnder('src/lib').filter(file => /\.ts$/.test(file) && /\.prepare\(/.test(readFileSync(file, 'utf8')));
const normalize = file => '/' + relative('src/app', file).replace(/\/(page|route)\.[^.]+$/, '').split('/').filter(part => part && !/^\(.+\)$/.test(part)).join('/');
const entries = routeFiles.map(file => {
  const source = readFileSync(file, 'utf8'), internal = normalize(file), loja = file.includes('/(site)/loja/');
  return {file, type: /\/page\./.test(file) ? 'pagina' : 'api', host: loja ? 'loja' : 'erp', path: loja ? internal.replace(/^\/loja(?=\/|$)/, '') || '/' : internal,
    methods: [...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\b|export\s+const\s+(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\b/g)].map(match => match[1] ?? match[2]),
    imports: [...source.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/g)].map(match => match[1])};
});
const inventory = {scope: 'Inventário estático. Caminhos consideram grupos de rotas e reescrita /loja por host. Metadados, layouts e proxy listados separadamente. Imports não provam execução nem quantidade SQL por HTTP.',
  counts: {sourceFiles: sourceFiles.length, pages: entries.filter(entry => entry.type === 'pagina').length, handlers: entries.filter(entry => entry.type === 'api').length},
  entries, sqlModules: sqlFiles.map(file => ({file, prepareSites: [...readFileSync(file, 'utf8').matchAll(/\.prepare\(/g)].length})),
  routingFiles: sourceFiles.filter(file => /\/(layout|proxy|robots|sitemap|opengraph-image|not-found|error|loading|template)\.[^.]+$/.test(file)),
  migrations: readdirSync('supabase/migrations').filter(file => file.endsWith('.sql')).sort()};
writeFileSync('docs/mapa-sistema.json', JSON.stringify(inventory, null, 2) + '\n');
const rows = entries.map(entry => `| ${entry.type} | ${entry.host} | \`${entry.path}\` | ${entry.methods.join(', ') || 'render'} | [código](../${entry.file.replaceAll('(', '%28').replaceAll(')', '%29')}) |`).join('\n');
writeFileSync('docs/mapa-rotas.md', '# Rotas do ERP e da loja\n\nGerado com `node scripts/map-system.mjs`. ' + inventory.scope + '\n\n' + `${inventory.counts.pages} páginas e ${inventory.counts.handlers} handlers no checkout analisado.\n\n` + '| Tipo | Host | Caminho público | Métodos | Arquivo |\n| --- | --- | --- | --- | --- |\n' + rows + '\n');
console.log(JSON.stringify(inventory.counts));
