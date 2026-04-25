# Configuracao Supabase + Brevo - Agente Diy

## Arquitetura

O formulario da LP envia os dados para uma Supabase Edge Function publica:

```text
https://<project-ref>.supabase.co/functions/v1/lead
```

A funcao:

1. valida os campos obrigatorios;
2. salva ou atualiza o lead em `public.waitlist_leads`;
3. cria ou atualiza o contato na Brevo;
4. adiciona o contato a uma lista;
5. dispara um e-mail transacional se `BREVO_TEMPLATE_ID` estiver configurado;
6. devolve sucesso para a LP redirecionar para `obrigado.html`.

## Arquivos relevantes

```text
config.js
supabase/config.toml
supabase/functions/lead/index.ts
supabase/functions/.env.example
supabase/migrations/20260425_create_waitlist_leads.sql
```

## Configuracao publica da LP

Em `config.js`, configure:

```js
window.AGENTE_DIY_CONFIG = {
  leadEndpoint: "https://<project-ref>.supabase.co/functions/v1/lead",
  communityUrl: "https://chat.whatsapp.com/seu-convite",
};
```

## Secrets da Edge Function

Configure estes secrets no projeto Supabase:

```text
BREVO_API_KEY=sua_api_key_da_brevo
BREVO_LIST_ID=id_da_lista_de_espera
BREVO_TEMPLATE_ID=id_do_template_de_email_opcional
WHATSAPP_COMMUNITY_URL=https://chat.whatsapp.com/seu-convite
```

Eles devem ficar no ambiente da Edge Function, nao no front.

## Banco de dados

Rode a migration:

```text
supabase/migrations/20260425_create_waitlist_leads.sql
```

Ela cria a tabela:

```text
public.waitlist_leads
```

## Atributos recomendados na Brevo

Crie estes atributos de contato em `Contact attributes & CRM`:

```text
WHATSAPP
NICHE
AUDIENCE
GOAL
BYOK
SOURCE
```

`FIRSTNAME` e `EMAIL` ja existem por padrao.

## Template de e-mail

Crie um template transacional com variaveis como:

```text
{{ params.name }}
{{ params.communityUrl }}
```

Assunto sugerido:

```text
Sua aplicacao para o Agente Diy foi recebida
```

CTA sugerido:

```text
Entrar na comunidade do WhatsApp
```

## Link da comunidade

Troque o placeholder em `config.js`:

```js
communityUrl: "https://chat.whatsapp.com/COLE-O-LINK-DA-COMUNIDADE"
```

Use o mesmo link tambem em `WHATSAPP_COMMUNITY_URL`.
