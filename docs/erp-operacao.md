# Operação do ERP do Ateliê Milena Kerbage

Atualizado em 12 de outubro de 2026. Este documento descreve as telas e os fluxos internos implementados. A preparação de Meta, Vercel, Supabase e DNS está nos manuais de integração WhatsApp.

## Acesso e permissões

O acesso usa uma conta real do sistema, sessão protegida por cookie e autorização no servidor. A senha de uma conta local deve ser alterada antes de disponibilizar essa conta em um domínio público. Uma conta do ERP não é uma conta da Meta ou do Supabase.

Os perfis operacionais são administrador (`admin`), gestor (`manager`) e membro (`member`). Financeiro, fluxo de caixa e relatórios financeiros exigem administrador ou gestor. O servidor também verifica as permissões nas chamadas diretas da API; esconder ou mostrar um botão não concede uma permissão.

## Rotas de operação

| Página | Uso | API principal |
| --- | --- | --- |
| `/agenda` | Provas, visitas, entregas e compromissos | `/api/erp/records/agenda` |
| `/orcamentos` | Itens, desconto, validade e acompanhamento | `/api/erp/records/orcamentos` |
| `/pedidos` | Todos os pedidos ativos ou arquivados | `/api/erp/records/pedidos` |
| `/pedidos/em-andamento` | Pedidos ainda não entregues ou cancelados | `/api/erp/records/pedidos` |
| `/pedidos/finalizados` | Pedidos entregues ou cancelados | `/api/erp/records/pedidos` |
| `/catalogo` | Modelos e serviços com preço de referência | `/api/erp/records/catalogo` |
| `/producao` | Tarefas por pedido, profissional e prazo | `/api/erp/records/producao` |
| `/estoque` | Cadastro de materiais e saldos | `/api/erp/records/materiais` |
| `/estoque/materiais` | Materiais, unidade, custo e estoque mínimo | `/api/erp/records/materiais` |
| `/estoque/movimentacoes` | Entradas, saídas e correções de estoque | `/api/erp/records/movimentacoes` |
| `/financeiro` | Todos os lançamentos financeiros | `/api/erp/records/financeiro` |
| `/financeiro/receber` | Recebimentos pendentes ou liquidados | `/api/erp/records/financeiro` |
| `/financeiro/pagar` | Pagamentos pendentes ou liquidados | `/api/erp/records/financeiro` |
| `/financeiro/fluxo-de-caixa` | Saldo realizado, projetado e movimento mensal | `/api/erp/reports` |
| `/relatorios` | Financeiro, volume, funis, origens e reposição | `/api/erp/reports` |
| `/conta` | Dados da conta autenticada e atalhos | Conta da sessão |
| `/conta/novidades` | Registro das mudanças desta versão | Conteúdo da versão |
| `/ajuda` | Guias de uso e contato do suporte | Conteúdo de ajuda |

As rotas possuem páginas próprias. Um caminho desconhecido não é tratado como um módulo válido e permanece com resposta 404.

## Cadastros comuns

Em cada módulo, **Novo** abre a ficha com campos próprios daquele domínio. **Salvar** envia a solicitação à API e aguarda a persistência no servidor. Um erro de validação mantém a ficha aberta com a mensagem retornada, para que seja corrigida.

A lista permite busca textual, filtros de situação, intervalo de datas quando aplicável e visualização de registros ativos, arquivados ou todos. Os primeiros 500 registros são carregados; **Carregar mais registros** busca a próxima página. A indicação de quantidade permite identificar quando ainda há cadastros para carregar. A busca e os filtros da tela incidem sobre os registros carregados.

As relações com cliente, pedido, orçamento e material são selecionadas entre cadastros reais. Não há necessidade de digitar IDs técnicos. Quando um vínculo obrigatório ainda não existe, cadastre-o no módulo correspondente antes de preencher a ficha. Se a lista de vínculos não puder ser carregada, a ficha bloqueia o salvamento até uma nova consulta.

**Atualizar** recarrega a lista e os vínculos. Um campo monetário usa reais; um valor de `120.50` representa R$ 120,50. Quantidades de materiais e dos itens de orçamento aceitam até três casas decimais. Valores monetários aceitam até duas casas decimais.

## Agenda

1. Cadastre a cliente em Leads ou Clientes, quando houver uma pessoa vinculada ao compromisso.
2. Abra **Novo compromisso**, informe a descrição e escolha a cliente.
3. Defina início e término no horário de Fortaleza / Brasília, UTC−3. A tela converte esse horário em data com fuso na API.
4. Informe o local e observações internas.
5. Atualize a situação para agendado, confirmado, realizado ou cancelado.
6. Consulte um intervalo de datas para organizar provas e entregas.

O término precisa ser posterior ao início. A ordenação da agenda utiliza o início do compromisso. A agenda interna não cria eventos no Google Agenda e não envia lembretes externos automaticamente.

## Orçamentos

Cada orçamento relaciona uma cliente e possui título, validade, situação, condições e itens. Cada item identifica uma peça ou serviço, quantidade e valor unitário. É possível adicionar e remover itens; o orçamento deve conservar pelo menos um e aceita até 100 itens.

A tela apresenta subtotal, desconto e total previsto. O servidor valida os itens, arredonda o total de cada linha para centavos e calcula o total definitivo. O consumidor da API não define um total arbitrário para o orçamento. Um desconto não pode exceder o subtotal.

Situações disponíveis: rascunho, enviado, aceito, recusado e expirado. Marcar como enviado registra a etapa do acompanhamento; não dispara WhatsApp ou e-mail. Para entrar em contato com a cliente, utilize Conversas e as regras da integração configurada.

Em um orçamento aceito, **Criar pedido** abre a ficha de pedido com cliente, orçamento e valor relacionados. Confira o prazo e as observações antes de salvar. O novo pedido aparece no módulo Pedidos; orçamento e pedido continuam registros distintos.

## Pedidos

O pedido guarda descrição, cliente, orçamento relacionado quando existir, valor contratado, prazo de entrega e observações. As etapas são pendente, confirmado, em produção, pronto, entregue e cancelado.

Quando um orçamento aceito é selecionado, a tela preenche cliente e valor a partir desse orçamento. O servidor exige aceite ao criar ou trocar esse vínculo e copia o valor do orçamento. Após contratar, revisões posteriores do orçamento não alteram automaticamente o pedido. Para um novo valor contratado, vincule outro orçamento aceito. O servidor verifica a consistência dos vínculos. Evite reutilizar um orçamento de outra cliente.

**Em andamento** exibe as etapas anteriores à entrega. **Finalizados** reúne entregues e cancelados. Arquivar um pedido remove-o dos registros ativos e exige tratar antes os registros ativos relacionados, como tarefas de produção e lançamentos dependentes.

Um pedido não cria automaticamente cobrança externa, nota fiscal, evento de agenda ou tarefa. Cadastre esses registros explicitamente nos módulos correspondentes quando fizerem parte da operação.

## Catálogo

Cadastre modelos e serviços com nome, referência/SKU, categoria, preço de referência, descrição e disponibilidade para novos pedidos. Alterar um preço do catálogo não reescreve os valores de orçamentos ou pedidos já salvos.

O catálogo interno ajuda a padronizar o atendimento. A implementação atual não publica uma loja nem compartilha automaticamente coleções em plataformas externas.

## Produção

Cada tarefa precisa de um pedido relacionado e descreve o trabalho, responsável, prazo, prioridade e observações. As etapas disponíveis são a fazer, corte, costura, prova, acabamento, concluída e cancelada. A prioridade pode ser baixa, normal ou alta.

Use tarefas distintas para etapas que tenham responsáveis ou prazos próprios. Alterar uma tarefa não entrega automaticamente o pedido: a conclusão do pedido deve ser registrada em Pedidos após a conferência do ateliê.

## Estoque

### Materiais

Cadastre nome, referência, unidade de medida, estoque mínimo e custo unitário de referência. O saldo é somente leitura. A unidade define como interpretar todas as movimentações: por exemplo, metros para tecidos e unidades para botões.

O filtro **Apenas materiais no mínimo ou abaixo** destaca a reposição. Materiais com saldo menor ou igual ao mínimo recebem o aviso **Repor estoque**. O servidor impede a alteração da unidade de um material que já possui movimentações, para evitar misturar grandezas diferentes.

### Entradas e saídas

1. Cadastre o material.
2. Abra Movimentações e registre uma entrada para o saldo inicial.
3. Registre novas entradas para compras ou ajustes positivos, e saídas para consumo ou outros ajustes negativos.
4. Informe quantidade, custo unitário, data e motivo/documento. A descrição pode identificar o pedido que consumiu o material.
5. Confira o saldo na ficha de materiais.

A movimentação e a atualização do saldo ocorrem em uma transação no servidor. Uma saída não pode produzir estoque negativo.

Movimentações são imutáveis. Para corrigir, arquive a movimentação incorreta e cadastre uma substituição. Arquivar reverte seu efeito no saldo; restaurar aplica o efeito novamente. A API verifica o resultado e impede reversões que tornem o saldo negativo. Um material não pode ser arquivado enquanto tiver registros ativos relacionados.

## Financeiro

Cadastre contas a receber (`income`) ou a pagar (`expense`) com descrição, valor, vencimento, situação, categoria, observações e vínculos opcionais com cliente/pedido.

Um valor financeiro precisa ser positivo. Situações disponíveis: pendente, pago/recebido e cancelado. Um lançamento liquidado precisa da data da baixa; um lançamento pendente ou cancelado não conserva data de liquidação.

**Registrar baixa** grava a liquidação com a data de hoje no horário de Fortaleza / Brasília. Para uma data diferente, abra **Editar** e informe a data efetiva. Utilize essa ação após confirmar o recebimento ou pagamento.

As métricas nas listas consideram os registros exibidos: valores pendentes, liquidados e vencidos. Se a lista ainda possuir páginas para carregar, esses cartões abrangem o conjunto carregado e filtrado, conforme a legenda. Os relatórios gerais calculam os valores no servidor.

A baixa é um registro contábil interno. Não efetua transferência, débito, Pix, cobrança de cartão ou emissão fiscal. A conciliação com comprovantes e extratos continua sendo uma tarefa do ateliê.

## Fluxo de caixa e relatórios

O período financeiro exige data inicial e final; use **Todo o período** para consultar toda a base financeira. O servidor aplica o intervalo à data da baixa nos lançamentos liquidados e à data de vencimento nos pendentes. Registros cancelados ou arquivados não compõem os valores financeiros ativos.

- **Recebido**: valores de recebimentos liquidados.
- **Pago**: valores de pagamentos liquidados.
- **Saldo realizado**: recebido menos pago.
- **A receber / a pagar**: obrigações pendentes, inclusive as vencidas.
- **Saldo projetado**: saldo realizado mais recebimentos pendentes menos pagamentos pendentes.
- **Movimento mensal**: receitas e despesas liquidadas agrupadas pelo mês da baixa.

Estoque, CRM e volumes dos demais módulos representam a situação atual. Eles não simulam uma fotografia histórica do intervalo financeiro. O volume de lançamentos financeiros segue o período aplicado.

O valor de estoque utiliza saldo atual multiplicado pelo custo unitário cadastrado do material. Não é um cálculo fiscal de custo médio por lote. A soma de orçamento nas oportunidades representa o campo de orçamento dos leads, não receita financeira realizada.

## Arquivamento, restauração e conflitos

DELETE operacional significa arquivamento reversível, preservando identificador, dados e histórico. O servidor verifica vínculos ativos antes de arquivar registros que possuem dependências.

Cada registro possui `revision`. Ao editar, arquivar ou restaurar, a interface envia a revisão consultada. Se outra pessoa modificou o registro antes, o servidor responde `409 REVISION_CONFLICT`; a operação não sobrescreve silenciosamente o trabalho anterior.

Para resolver, atualize a lista, abra novamente a ficha e confira os dados recentes antes de reaplicar sua alteração. O arquivamento operacional não substitui as rotinas de atendimento aos direitos de privacidade e exclusão de dados da integração Meta.

## Contrato da API para consumo

As respostas JSON têm cache desabilitado. A API usa a mesma sessão autenticada da interface; o consumo por credenciais de integração é sujeito aos mecanismos e permissões definidos no módulo de API.

### Consultar

`GET /api/erp/records/{resource}?archived=all&limit=500&offset=0`

Resposta: `{resource, records, pagination: {limit, offset, total, hasMore}}`. Cada registro contém os campos do domínio mais `id`, `resource`, `revision`, `createdAt`, `updatedAt` e `archivedAt` quando arquivado.

Valores de `archived`: `false` (padrão, ativos), `all`/`true` (todos) e `only` (apenas arquivados). O limite máximo por página é 500.

`GET /api/erp/records/{resource}/{id}` retorna `{record}`. A opção `?archived=true` permite consultar uma ficha arquivada.

### Criar

`POST /api/erp/records/{resource}` recebe `{record: {...camposDoDominio}}`.

Exemplo de entrada de material:

```json
{
  "record": {
    "materialId": "ID_DO_MATERIAL_EXISTENTE",
    "direction": "in",
    "quantity": 12.5,
    "unitCost": 34.9,
    "date": "2026-10-12",
    "notes": "Compra de tecido para reposição; documento interno 012."
  }
}
```

Exemplo de orçamento: envie `items` com `{description,quantity,unitPrice}` e `discount`. O total é calculado pelo servidor.

### Atualizar

`PATCH /api/erp/records/{resource}/{id}` recebe `{revision: N, record: {...camposAlterados}}`. A API aceita atualização parcial; a ficha da interface envia seus campos editáveis. Campos desconhecidos, IDs de relações inválidos e valores fora dos limites são rejeitados.

### Arquivar e restaurar

`DELETE /api/erp/records/{resource}/{id}?revision=N` arquiva.

`PATCH /api/erp/records/{resource}/{id}` com `{revision:N,restore:true}` restaura.

Movimentações de estoque não aceitam edição dos campos. Arquivamento e restauração aplicam o estorno ou a reaplicação de saldo dentro da transação.

### Relatórios

`GET /api/erp/reports?from=2026-10-01&until=2026-10-31` retorna totais de módulos, indicadores financeiros, agrupamento mensal, reposição/valor de estoque e agrupamentos de leads. Sem os parâmetros, consulta toda a base financeira. Quando informado, o período exige as duas datas.

## Persistência e PostgreSQL

As telas chamam o backend, que usa o adaptador de banco do sistema. O ambiente local pode trabalhar com SQLite para desenvolvimento; Vercel requer a conexão PostgreSQL configurada em `DATABASE_URL` e as migrações Supabase aplicadas.

Os dados operacionais usam o domínio/schema dedicado ao ERP, separado de autenticação, WhatsApp e exclusão Meta. Revise o catálogo de migrações atual no diretório `supabase/migrations` e o documento de implantação antes de publicar. A interface não pede a URL do banco e não conecta diretamente ao Supabase com uma chave administrativa no navegador.

## Suporte e documentação relacionada

- Suporte e privacidade: `milenakerbageatelie@gmail.com`.
- [Manual do gestor WhatsApp](painel-gestor-whatsapp.md).
- [Documentação técnica Meta e WhatsApp](whatsapp-meta.md).
- [Pendências de implantação](pendencias-implantacao-whatsapp.md).

Não envie senhas, tokens Meta, chaves de criptografia ou strings de conexão em pedidos de suporte.
