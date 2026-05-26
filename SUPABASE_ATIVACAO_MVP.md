# Ativacao da base em nuvem - CORTEX MVP

## O que esta versao faz

O site publicado no GitHub Pages passa a consultar e gravar registros no projeto Supabase `CORTEX MVP`.

URL configurada a partir do Project ID informado na tela do Supabase:

`https://gablscmdxeffewmfnskh.supabase.co`

Chave utilizada:

`publishable key`, adequada para uso publico no navegador.

## Ativar o banco

1. Abra o projeto `CORTEX MVP` no Supabase.
2. No menu lateral principal, abra `SQL Editor`.
3. Clique em `New query`.
4. Abra o arquivo `supabase/01_criar_banco_mvp.sql` desta pasta.
5. Copie todo o conteudo e cole no editor SQL.
6. Clique em `Run`.

## Enviar os dados iniciais

Depois de publicar esta nova versao do site no GitHub Pages:

1. Abra o CORTEX no navegador.
2. A faixa superior informara `Banco conectado, sem dados`.
3. Clique em `Enviar base inicial`.
4. O sistema enviara os 97 registros iniciais para a nuvem.

A partir desse momento, novos cadastros serao compartilhados entre computadores.

## Seguranca desta etapa

Este e um MVP com dados de teste. Para permitir uso sem login, as politicas SQL autorizam consulta e edicao publica dos registros.

Antes de armazenar informacoes reais ou institucionais, a proxima evolucao obrigatoria sera:

- login de usuarios;
- perfis de acesso;
- politicas de seguranca restritas a usuarios autorizados;
- trilha de auditoria.

