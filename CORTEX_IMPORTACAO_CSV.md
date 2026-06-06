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

## Atualizacao do banco Supabase: como fazer

Antes de importar CSVs com campos novos na nuvem, execute novamente o SQL de `supabase/01_criar_banco_mvp.sql` no Supabase. Ele cria/adiciona a coluna `detalhes`, usada para guardar todos os campos extras das novas planilhas.

Passo a passo:

1. Abra o painel do Supabase em <https://supabase.com/dashboard>.
2. Entre no projeto usado pelo CORTEX.
3. No menu lateral, clique em **SQL Editor**.
4. Clique em **New query**.
5. No seu computador/repositório, abra o arquivo `supabase/01_criar_banco_mvp.sql`.
6. Copie todo o conteúdo desse arquivo.
7. Cole o conteúdo no editor SQL do Supabase.
8. Clique em **Run**.
9. Aguarde a execução terminar sem erro.
10. Volte ao CORTEX, clique em **Atualizar** e depois em **Importar CSV/planilha**.

Se voce quiser executar somente a atualizacao minima da coluna nova, rode este trecho no SQL Editor:

```sql
alter table public.registros
add column if not exists detalhes jsonb not null default '{}'::jsonb;
```

Recomendacao: para evitar diferencas entre o banco e o sistema, prefira rodar o arquivo completo `supabase/01_criar_banco_mvp.sql`.

## O que foi atualizado no sistema

- O botao **Como importar** aparece ao lado da importacao e resume o passo a passo dentro do proprio CORTEX.
- Quando o Supabase nao estiver configurado, a importacao por CSV funciona em modo local e fica salva no navegador por `localStorage` para nao sumir ao recarregar a pagina.
- Quando o Supabase estiver configurado, a importacao substitui os registros de origem `planilha` na nuvem e preserva cadastros manuais.
