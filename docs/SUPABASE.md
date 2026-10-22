# Configurar o banco compartilhado com Supabase

A aplicação suporta dois modos:

- **Sem as duas variáveis**: demonstração local, com exemplos e localStorage.
- **Com Supabase configurado**: login obrigatório, quadro compartilhado e dados no PostgreSQL. O banco começa vazio, sem copiar os exemplos locais. Configuração incompleta gera erro, sem retornar silenciosamente ao modo local.

## 1. Criar o projeto e as tabelas

1. Entre em https://supabase.com/dashboard e crie um projeto (New project).
2. Escolha organização, nome, região e uma senha forte para o banco. Guarde essa senha; ela **não é usada pelo site**.
3. Aguarde a criação e abra **SQL Editor → New query**.
4. Copie todo o conteúdo de [`supabase/schema.sql`](../supabase/schema.sql) e execute com **Run**.
5. Confirme no Table Editor as tabelas `posts` e `team_members`.

O arquivo `.env.example` já contém a URL pública do projeto informado.

Execute esse arquivo uma vez num projeto novo. Ele usa uma transação: se houver erro, nenhuma criação é confirmada. Se já houver tabelas com esses nomes, investigue o erro; não apague dados nem desative RLS para fazer funcionar.

## 2. Criar as contas da equipe

O acesso é restrito por convite administrativo. Não há cadastro público no site.

1. Em **Authentication → Providers → Email** (ou nas configurações de autenticação, conforme o painel), mantenha e-mail/senha habilitado e **desative novos cadastros públicos** (“Allow new users to sign up”).
2. Em **Authentication → Users → Add user → Create new user**, crie uma conta por pessoa, com e-mail e senha, e confirme o e-mail pela opção administrativa do painel. Use um canal privado para combinar a senha inicial; não coloque senhas no GitHub ou no código. A redefinição de senha nesta versão é feita pelo administrador no painel.
3. Cadastre a pessoa como membro autorizado pelo SQL Editor, usando o e-mail real da conta criada:

```sql
insert into public.team_members (user_id)
select id from auth.users where lower(email) = lower('pessoa@exemplo.com')
on conflict (user_id) do nothing;
```

4. Confira que a conta foi incluída:

```sql
select u.email from public.team_members m
join auth.users u on u.id = m.user_id;
```

Uma conta autenticada sem registro em `team_members` não acessa os posts. Todos os membros autorizados podem consultar, criar, editar e excluir posts do mesmo quadro.

Para remover uma pessoa, remova seu registro em `team_members` pelo painel ou SQL Editor. O RLS bloqueia os próximos acessos ao banco mesmo se a sessão antiga ainda estiver válida. Dados já visualizados não podem ser retirados da memória de um navegador remoto.

## 3. Configurar o site

No projeto Supabase, encontre a **Project URL** e a chave **publishable**, geralmente no botão **Connect** ou em **Settings → API Keys**. A antiga chave `anon` também é aceita. Não use a senha do banco, `service_role` ou chave `sb_secret_...`.

Na pasta do projeto:

```bash
cp .env.example .env.local
```

Preencha `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://yuujnbjqopcxhwzmpxqs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA
```

Essas duas configurações são públicas e entram no JavaScript entregue ao navegador. A proteção dos dados vem do login e das políticas RLS, **não** de esconder a chave publishable. `.env.local` é ignorado pelo Git. Nunca use uma chave administrativa em uma variável `VITE_`.

Instale/inicie:

```bash
npm ci
npm run dev
```

Após mudar variáveis, reinicie o Vite. Na tela de login, entre com uma das contas autorizadas. O topo indicará **Banco de dados compartilhado**. Se aparecer **Modo local**, as variáveis não chegaram ao build/servidor.

Se usar este ambiente cloud, configure as duas variáveis de aplicação nas configurações do ambiente e permita HTTPS para o hostname exato do projeto (`SEU-PROJETO.supabase.co`) quando houver restrição de rede. Nenhuma chave administrativa é necessária para o site.

## 4. Publicar na Vercel

1. Envie as alterações para o GitHub e faça merge na branch de produção (normalmente `main`).
2. No projeto da Vercel, abra **Settings → Environment Variables** e adicione as duas variáveis acima para **Production**. Para previews usarem esse banco também, adicione em **Preview**; prefira um projeto Supabase separado para testes.
3. Faça um novo **Deploy/Redeploy**: Vite lê essas variáveis durante a compilação. Alterar variáveis sem reconstruir não muda o site publicado.
4. Abra a URL no Brave e entre com uma conta da equipe. Este login por senha não usa redirecionamento OAuth ou link mágico.

## 5. Conferir a integração

1. Crie um post com área, prazo e template.
2. Recarregue e confira se continua no quadro e no dia correto do calendário.
3. Abra o site em outro navegador/perfil, entre com outra conta autorizada e clique em **Atualizar quadro**. Confira o mesmo post.
4. Edite, arraste entre etapas e exclua o post de teste. O site só confirma após o banco responder.
5. Use **Atualizar quadro** para buscar mudanças de outras pessoas. Ao voltar o foco para a janela, o site também atualiza. Esta versão não usa Supabase Realtime.
6. Se duas pessoas editarem o mesmo post, a segunda recebe um aviso de conflito. Atualize e abra novamente o cartão antes de reaplicar a edição; a alteração anterior não é sobrescrita silenciosamente.
7. Uma conta não incluída na equipe deve receber “Acesso negado”. Sem login, o quadro não deve aparecer.

## Posts antigos e limitações

Os posts já salvos em `localStorage` permanecem no navegador e não são enviados automaticamente. Não há migração automática nesta versão; cadastre os pedidos reais no novo quadro. Não limpe o navegador antes de registrar o que deseja conservar. Trocar o site para Supabase não apaga a chave local `cavc-posts`.

A preferência de tema e a sessão continuam locais ao navegador. Nenhum arquivo do Canva é armazenado: salva-se apenas o link e as permissões continuam no Canva. Não há publicação automática em redes sociais, recuperação de senha pelo próprio site, papéis diferentes por membro ou trilha de auditoria.

## Problemas comuns

- **Acesso negado:** confirme conta em `team_members`, projeto das chaves e políticas RLS.
- **Banco não configurado:** execute `schema.sql` no projeto correspondente à URL.
- **Falha de conexão:** confira URL, status do projeto Supabase (inclusive se estiver pausado) e acesso de rede ao hostname.
- **Dados inválidos:** selecione uma das cinco áreas atuais, preencha o template quando marcado e informe responsável nas etapas posteriores a Post pedido.
- **Post alterado por outra pessoa:** atualize o quadro e reabra o cartão antes de salvar novamente.

Não desative RLS nem conceda acesso anônimo às tabelas para corrigir erros.
