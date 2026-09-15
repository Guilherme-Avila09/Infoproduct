# Setup do Instagram na API da Meta

Guia pra conectar o Instagram @gui_de_avila à API oficial da Meta. Feito uma
vez só, leva de 30 a 60 minutos. Precisa estar logado no Facebook pessoal do
Guilherme e ter o celular por perto (a Meta pede verificação).

**O que libera:** pesquisa de perfis de influenciadores (seguidores, bio, posts,
engajamento), publicação de posts e carrosséis, leitura e resposta de
comentários, DMs de quem escreveu primeiro e métricas do próprio perfil.

**O que não libera:** mandar a primeira DM pra quem nunca falou com o perfil.
Isso continua manual.

> As telas da Meta mudam de nome com frequência. Se algum botão não bater
> exatamente, procure o equivalente mais próximo.

---

## Etapa 1 — Conta profissional no Instagram

1. No app do Instagram, abrir o perfil e tocar no menu (☰)
2. **Configurações e atividade → Tipo de conta e ferramentas**
3. **Mudar para conta profissional**
4. Escolher uma categoria (ex: "Empreendedor" ou "Agência de marketing")
5. Escolher **Empresa** (Criador também funciona, Empresa é o mais estável na API)

Pronto quando: o perfil mostra o painel profissional.

---

## Etapa 2 — Página do Facebook vinculada

A API só enxerga o Instagram através de uma Página do Facebook.

1. Criar a Página em **facebook.com/pages/create** (nome: Guilherme Avila ou o nome da agência). Pode deixar simples, ela não precisa ser usada
2. Vincular o Instagram à Página:
   - Na Página: **Configurações → Contas vinculadas → Instagram → Conectar**
   - Ou no app do Instagram: **Editar perfil → Página → Conectar**
3. Fazer login no Instagram quando pedir e autorizar

Pronto quando: a Página mostra o Instagram como conta conectada.

---

## Etapa 3 — Portfólio empresarial (Meta Business Suite)

1. Acessar **business.facebook.com** e criar um portfólio empresarial
2. Em **Configurações → Contas → Páginas**, adicionar a Página
3. Em **Configurações → Contas → Contas do Instagram**, adicionar o @gui_de_avila

Pronto quando: Página e Instagram aparecem dentro do portfólio.

---

## Etapa 4 — App de desenvolvedor

1. Acessar **developers.facebook.com** e clicar em **Começar** (verifica o celular)
2. **Meus apps → Criar app**
3. Caso de uso: **Outro** → tipo **Empresa (Business)**
4. Nome do app: `MazyOS Guilherme Avila`. Vincular ao portfólio da etapa 3
5. No painel do app, adicionar os produtos:
   - **Instagram Graph API** (ou "API do Instagram com login do Facebook")
   - **Login do Facebook para Empresas**
6. Em **Configurações do app → Básico**, anotar o **ID do app** e o **Chave secreta do app**

O app pode ficar em **modo de desenvolvimento**. Como o Guilherme é admin do
app e dono das contas, não precisa passar pela revisão da Meta.

---

## Etapa 5 — Gerar o token

### 5.1 Token curto

1. Abrir **developers.facebook.com/tools/explorer** (Graph API Explorer)
2. No canto direito, selecionar o app `MazyOS Guilherme Avila`
3. Em **Permissões**, marcar:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `instagram_content_publish`
   - `instagram_manage_comments`
   - `instagram_manage_messages`
   - `pages_show_list`
   - `pages_read_engagement`
   - `business_management`
4. Clicar em **Gerar token de acesso**, autorizar e, na janela da Meta, **selecionar a Página e o Instagram**
5. Copiar o token gerado (dura cerca de 1 hora)

### 5.2 Trocar por token longo (60 dias)

Colar no navegador, trocando os três valores:

```
https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=ID_DO_APP&client_secret=CHAVE_SECRETA&fb_exchange_token=TOKEN_CURTO
```

A resposta traz um `access_token` novo. Esse é o token longo de usuário.

### 5.3 Pegar o token da Página (não expira)

No Graph API Explorer, colar o token longo no campo de token e rodar:

```
GET me/accounts
```

A resposta lista a Página com dois campos:
- `id` → esse é o **META_PAGE_ID**
- `access_token` → esse é o **META_PAGE_ACCESS_TOKEN** (gerado a partir do token longo, não expira)

Pra conferir: colar o token em **developers.facebook.com/tools/debug/accesstoken**
e verificar se aparece "Expira: nunca".

> Se trocar a senha do Facebook ou remover o app, o token para de funcionar e
> precisa refazer a etapa 5.

---

## Etapa 6 — ID da conta do Instagram

No Graph API Explorer, com o token da Página:

```
GET ID_DA_PAGINA?fields=instagram_business_account
```

O `id` dentro de `instagram_business_account` é o **META_IG_USER_ID**.

---

## Etapa 7 — Salvar no .env

Abrir (ou criar) o arquivo `.env` na raiz do projeto e adicionar:

```
META_APP_ID=
META_APP_SECRET=
META_PAGE_ACCESS_TOKEN=
META_PAGE_ID=
META_IG_USER_ID=
```

O `.env` já está no `.gitignore`, então não vai pro GitHub. Não colar esses
valores em chat, email ou documento compartilhado.

---

## Etapa 8 — Teste

No Graph API Explorer, com o token da Página, pesquisar um perfil qualquer
(precisa ser conta Empresa ou Criador):

```
GET ID_DO_INSTAGRAM?fields=business_discovery.username(instagram){username,followers_count,media_count,biography}
```

Se voltar seguidores e bio, está tudo funcionando. Depois disso é só avisar o
Claude pra montar o script de pesquisa de perfis.

**Limitação a lembrar:** a pesquisa só funciona em perfis Empresa ou Criador.
Influenciador com conta pessoal não aparece.

---

## Problemas comuns

| Erro | Causa provável |
|---|---|
| `me/accounts` volta vazio | Na etapa 5.1 a Página não foi selecionada. Gerar o token de novo e marcar a Página |
| `instagram_business_account` não aparece | Instagram não está vinculado à Página (etapa 2) ou ainda é conta pessoal (etapa 1) |
| Erro de permissão (#10 ou #200) | Faltou marcar alguma permissão na etapa 5.1 |
| `business_discovery` dá erro no perfil pesquisado | O perfil pesquisado é conta pessoal |
| Token parou de funcionar | Senha do Facebook trocada ou app removido. Refazer a etapa 5 |
