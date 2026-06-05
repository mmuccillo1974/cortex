# CORTEX - Importacao simples por CSV/JSON

Este guia mostra a forma mais simples de carregar a planilha recriada quando o arquivo Excel `.xlsx` nao puder ser enviado pela ferramenta usada.

## Caminho recomendado

1. No Excel, abra a planilha recriada.
2. Para cada aba que deseja importar, use **Salvar como** ou **Exportar** no formato **CSV UTF-8**.
3. Renomeie cada CSV exatamente com o nome do modulo:
   - `Projetos.csv`
   - `Contratos.csv`
   - `Tarefas.csv`
   - `Licitacoes.csv`
   - `Pessoas.csv`
   - `Skills.csv`
   - `Avaliacoes.csv`
   - `Alocacoes.csv`
   - `Ausencias.csv`
   - `Remuneracao.csv`
4. No CORTEX, clique em **Importar CSV/planilha**.
5. Selecione um ou varios arquivos CSV de uma vez.
6. Confirme a importacao.

A importacao tambem aceita `.xlsx`, `.xls` e `.json`, mas o CSV e o formato mais simples quando o Excel nao for aceito.

## Abas e views criadas

### Projetos

Arquivo: `Projetos.csv`

Colunas reconhecidas, inclusive nomes equivalentes:

- `ID`, `ID Projeto` ou `Ordem`
- `Projeto`
- `Descricao do Projeto` ou `Descricao`
- `Categoria`
- `Valor Anual Estimado`, `Valor ano` ou `Valor Anual`
- `Processo SEI` ou `SEI`
- `Contrato/Instrumento` ou `Contrato`
- `Segmento STI Responsavel`, `Area` ou `Area Responsavel`
- `Fase / Status Atual`, `Status` ou `Fase`
- `Observacoes` ou `Comentarios`
- `Prazo Previsto` ou `Prazo`

### Contratos

Arquivo: `Contratos.csv`

Colunas recomendadas:

- `ID Contrato`
- `ID Projeto`
- `Numero do Contrato`
- `Tipo de Instrumento`
- `Fornecedor / Contratada`
- `CNPJ da Contratada`
- `Objeto do Contrato`
- `Processo SEI`
- `Data de Assinatura`
- `Data de Inicio da Vigencia`
- `Prazo de Vigencia em Meses`
- `Data de Vencimento`
- `Data Limite para Providencias`
- `Fiscal do Contrato`
- `Gestor do Contrato`
- `Area Demandante`
- `Segmento STI Responsavel`
- `Valor Mensal`
- `Valor Anual`
- `Valor Total Contratado`
- `Status do Contrato`
- `Fase da Renovacao`
- `Observacoes Contratuais`

A view **Contratos** usa principalmente `Data de Vencimento` para calcular contratos vencidos, vencendo em 90 dias e sem vencimento.

### Tarefas

Arquivo: `Tarefas.csv`

Colunas recomendadas:

- `ID Tarefa`
- `ID Projeto`
- `Titulo da Tarefa`
- `Descricao da Tarefa`
- `Tipo de Entrega`
- `Responsavel Principal`
- `Apoio / Participantes`
- `Area Responsavel`
- `Prioridade`
- `Status da Tarefa`
- `Data de Criacao`
- `Data de Inicio Prevista`
- `Data de Inicio Real`
- `Prazo Previsto`
- `Data de Conclusao`
- `Percentual de Conclusao`
- `Dependencia`
- `Bloqueador`
- `Proxima Acao`
- `Data da Proxima Acao`
- `Observacoes`

A view **Tarefas** usa principalmente `Prazo Previsto`, `Status da Tarefa` e `Responsavel Principal` para mostrar tarefas atrasadas, vencendo em 7 dias e sem responsavel.

### Pessoas e equipe STI

Arquivo principal: `Pessoas.csv`

Colunas recomendadas:

- `ID Pessoa`
- `Nome Completo`
- `Nome Usual`
- `E-mail`
- `Telefone`
- `Vinculo`
- `Cargo / Funcao`
- `Papel na STI`
- `Segmento STI`
- `Gestor Imediato`
- `Data de Nascimento`
- `Data de Entrada na Defensoria`
- `Data de Entrada na STI`
- `Status`
- `Regime de Trabalho`
- `Carga Horaria Semanal`
- `Observacoes Gerais`

Arquivos auxiliares:

- `Skills.csv`
- `Avaliacoes.csv`
- `Alocacoes.csv`
- `Ausencias.csv`
- `Remuneracao.csv`

## Atencao com dados sensiveis

`Remuneracao.csv`, avaliacoes e observacoes de pessoas podem conter dados sensiveis. Antes de usar dados reais na nuvem, ative autenticacao e politicas restritivas no Supabase. O script MVP ainda permite operacoes publicas para facilitar testes.

## Atualizacao do banco Supabase

Antes de importar CSVs com campos novos, execute novamente o SQL de `supabase/01_criar_banco_mvp.sql` no Supabase. Ele cria/adiciona a coluna `detalhes`, usada para guardar todos os campos extras das novas planilhas.
