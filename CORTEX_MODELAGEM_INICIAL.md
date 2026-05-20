# CORTEX - Modelagem inicial

## Objetivo

O CORTEX deve centralizar a gestão executiva da STI da Defensoria Pública de MS, começando pelos dados que hoje estão organizados na planilha:

- projetos;
- licitações;
- contratos;
- tarefas e entregas;
- áreas responsáveis;
- prazos;
- documentos e processos SEI;
- equipamentos e demandas de infraestrutura.

O sistema deve permitir consulta rápida, visão por categoria, acompanhamento de status e geração de indicadores para decisão.

## Leitura inicial da planilha

Arquivo analisado:

`G:\Meu Drive\# DPGE 2026 #\1. DIRETORIA\PLANEJAMENTO\PAC\CORTEX - CENTRAL DE ORGANIZAÇÃO DE TAREFAS EXECUTIVAS.xlsx`

Abas identificadas:

- `Projetos`: base principal, com 97 registros.
- `Sintético`: resumo por projeto/categoria.
- `Status`: resumo por status.
- `Gráfico por setor`: cruzamento entre área e status.
- `Monitores e Nobreaks`: levantamento operacional de equipamentos.
- `NOBREAKS`: base estruturada de nobreaks por bloco, descrição e quantidade.

## Base principal: Projetos

Campos atuais:

- Ordem
- Projeto
- Categoria
- Valor ano
- SEI
- Contrato
- Descrição
- Área
- Status
- Comentários
- Prazo

Esses campos já formam uma boa primeira estrutura para o módulo de projetos/demandas.

## Categorias encontradas

- Licitações: 53
- Desenvolvimento: 26
- Segurança: 8
- LGPD: 2
- Infra: 2
- Suporte: 1
- Banco de Dados: 1
- SaaS: 1

Observação: a categoria `Licitações` aparece como o maior grupo e provavelmente deve virar um módulo próprio, não apenas uma categoria de projeto.

## Áreas encontradas

- Desenvolvimento: 28
- Diretoria: 26
- LGPD: 9
- Infra: 6
- SEGINFO: 3
- Sustentação: 3
- SEGINFO/LGPD: 1
- Redes/SEGINFO: 1

Sugestão: criar cadastro próprio de áreas, permitindo padronizar nomes e evitar duplicidade futura.

## Status encontrados

- Finalizado: 21
- Em andamento: 21
- Entregue: 7
- Não iniciado: 6
- Pregão: 3
- ETP: 3
- Planejamento: 2
- OIS: 2
- TR: 1
- Gabinete: 1
- Pausado: 1
- Homologação: 1

Observação: há mistura entre status de execução e fases de licitação. Por exemplo, `ETP`, `TR`, `Pregão` e `OIS` parecem fases/processos administrativos, enquanto `Em andamento`, `Finalizado` e `Pausado` são status gerais.

## Estrutura recomendada do sistema

### 1. Projetos e demandas

Campos iniciais:

- título;
- descrição;
- categoria;
- área responsável;
- responsável principal;
- status geral;
- prioridade;
- prazo;
- comentários;
- documentos vinculados;
- processo SEI;
- contrato vinculado;
- licitação vinculada.

### 2. Licitações

Campos iniciais:

- objeto;
- processo SEI;
- fase atual;
- área demandante;
- responsável;
- valor estimado;
- prazo previsto;
- situação;
- comentários;
- documentos: ETP, TR, pesquisa de preços, pareceres, edital, atas e contrato resultante.

Fases sugeridas:

- Planejamento
- ETP
- TR
- Pesquisa de preços
- Análise jurídica
- Pregão
- Homologação
- Contratação
- Finalizada
- Suspensa

### 3. Contratos

Campos iniciais:

- número do contrato;
- fornecedor;
- objeto;
- valor anual;
- valor total;
- vigência inicial;
- vigência final;
- fiscal ou gestor;
- área responsável;
- projeto/licitação de origem;
- status;
- alertas de vencimento;
- documentos vinculados.

### 4. Pessoas e equipes

Campos iniciais:

- nome;
- área;
- função;
- papel no CORTEX;
- telefone/e-mail;
- demandas vinculadas;
- contratos/projetos sob responsabilidade.

### 5. Documentos

Campos iniciais:

- nome do arquivo;
- tipo de documento;
- origem;
- data de upload;
- texto extraído;
- resumo automático;
- entidades identificadas;
- vínculo com projeto, contrato, licitação ou pessoa;
- nível de sigilo;
- tags.

Tipos de arquivo pretendidos:

- PDF;
- Word;
- Excel;
- PowerPoint;
- imagens;
- vídeos;
- áudios.

### 6. Equipamentos e infraestrutura

Com base nas abas `Monitores e Nobreaks` e `NOBREAKS`, pode existir um módulo de inventário/demandas de infraestrutura.

Campos iniciais:

- tipo de equipamento;
- unidade;
- quantidade;
- bloco/grupo;
- situação;
- observações;
- demanda ou processo vinculado.

## Dashboard inicial

Indicadores recomendados para a primeira versão:

- total de projetos/demandas;
- demandas em andamento;
- demandas finalizadas/entregues;
- demandas não iniciadas;
- licitações por fase;
- contratos próximos do vencimento;
- demandas por área;
- demandas por categoria;
- prazos vencidos;
- prazos dos próximos 30, 60 e 90 dias;
- itens sem responsável;
- itens sem prazo;
- itens sem processo SEI.

## Regras de organização

Regras iniciais que o CORTEX deve aplicar:

- todo item deve ter uma área responsável;
- todo item relevante deve ter status;
- licitação deve possuir fase administrativa própria;
- contrato deve possuir data de início e fim de vigência;
- documento importado deve ser vinculado a pelo menos uma entidade;
- itens sem prazo devem aparecer em alerta de saneamento;
- itens sem responsável devem aparecer em alerta de saneamento;
- itens com prazo vencido devem entrar no painel crítico.

## Primeiro MVP recomendado

Para a primeira versão funcional, o escopo deve ser:

1. Dashboard inicial.
2. Listagem de projetos/demandas.
3. Cadastro/edição manual de projeto.
4. Filtros por categoria, área e status.
5. Cadastro separado de licitações.
6. Cadastro separado de contratos.
7. Cadastro de pessoas/áreas.
8. Upload simples de documentos, ainda sem inteligência automática.
9. Dados iniciais importados da aba `Projetos`.

Depois disso, entram as camadas de automação:

- leitura automática de documentos;
- classificação por IA;
- extração de prazos, valores e responsáveis;
- entrada por voz;
- assistente de consulta em linguagem natural.

## Decisão técnica sugerida

Como o objetivo é facilitar edição e manutenção, a primeira versão pode ser construída como aplicação web simples, com:

- interface no navegador;
- dados locais inicialmente simulados ou importados da planilha;
- evolução posterior para banco de dados;
- layout claro e institucional;
- módulos bem separados.

Essa abordagem permite validar o funcionamento antes de escolher uma arquitetura definitiva.

