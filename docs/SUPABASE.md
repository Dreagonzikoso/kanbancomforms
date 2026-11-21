# Configurar o quadro compartilhado no Supabase

## 1. Preparar o banco

Em um projeto novo, execute [schema.sql](../supabase/schema.sql) no SQL Editor. Em seguida, execute a [migração Beta 0.3](../supabase/migrations/202611210001_beta_0_3.sql). Em um projeto com o esquema anterior, execute apenas a migração uma vez, antes de publicar a nova versão da aplicação.

A migração é transacional e preserva os posts, responsáveis em texto e etapas. Os registros antigos ficam sem autor vinculado, pois o banco anterior não registrava essa informação. O Secretário pode gerenciar esses pedidos. Contas já aprovadas mantêm acesso com o cargo inicial Bixo/Bixete. Nomes de responsáveis antigos continuam visíveis, mas o vínculo de uma atribuição nova só é criado a partir de **Post pedido**.

## 2. Habilitar cadastro e confirmação de e-mail

Em **Authentication → Sign In / Providers**, habilite novos cadastros, o provedor Email e **Confirm email**. Configure a URL pública da aplicação como **Site URL** no Supabase para os links de confirmação. Configure um provedor SMTP para uso regular pela equipe.

A partir da Beta 0.3, novas contas entram com o e-mail confirmado. Contas antigas com identificador interno ainda podem usar o nome de usuário original. Cadastros que confirmaram o e-mail aparecem na tela **Aprovar cadastros** do Secretário. A solicitação de um cargo não concede acesso ao quadro.

## 3. Autorizar o primeiro Secretário

Cadastre a conta escolhida pela aplicação e confirme seu e-mail. No SQL Editor, substitua `secretario@seu-dominio.com` pelo e-mail exato e execute o bloco uma vez. O bloco exige um cadastro confirmado e impede a execução quando já existe um Secretário.

```sql
begin;
lock table public.team_members in share row exclusive mode;

do $$
declare
  first_secretary_email constant text := 'secretario@seu-dominio.com';
begin
  if exists (select 1 from public.team_members where effective_role = 'secretario') then
    raise exception 'Já existe um Secretário autorizado.';
  end if;
  update public.team_members m set effective_role = 'secretario'
  from auth.users u
  where u.id = m.user_id and lower(u.email) = lower(first_secretary_email)
    and u.email_confirmed_at is not null;
  if not found then
    raise exception 'Cadastro confirmado não encontrado.';
  end if;
end;
$$;

commit;
```

Na tela **Aguardando aprovação**, clique em **Verificar acesso novamente**. O primeiro Secretário pode aprovar os cadastros seguintes e escolher o cargo efetivo diretamente no quadro.

## 4. Configurar a aplicação

Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` com a URL do projeto e `VITE_SUPABASE_PUBLISHABLE_KEY` com a chave pública publishable ou anon. Essas variáveis entram no JavaScript do navegador. Use apenas a chave pública. No ambiente cloud, adicione as duas variáveis e permita HTTPS ao hostname exato do projeto se a rede estiver restrita.

Reinicie `npm run dev` depois de editar as variáveis. Na Vercel, configure-as no ambiente desejado e faça um novo deploy. Com ambas ausentes, o modo local usa exemplos e `localStorage`.

## 5. Conferir a integração

1. Cadastre e confirme uma conta. Confira a tela de espera e verifique que a conta não pode consultar os posts.
2. Entre como Secretário e aprove o cadastro escolhendo o cargo efetivo. Confira a identidade e o cargo na lateral.
3. Entre como Diretoria, crie um pedido e atribua a um Bixo/Bixete. Verifique que outra Diretoria não pode alterar esse pedido.
4. Entre como a pessoa que recebeu a atribuição. Recuse e verifique que o pedido volta a ficar disponível. Assuma o pedido, edite-o em **Sendo feito** e mova-o para **Post feito**. Outro Bixo/Bixete deve conseguir ler o cartão sem alterá-lo.
5. Atualize o quadro em outro navegador e confira o nome do responsável e a etapa. Edições concorrentes devem pedir atualização quando a versão do post estiver desatualizada.

A proteção de acesso usa RLS e funções do banco. Posts salvos no modo local continuam no navegador e podem ser cadastrados manualmente no quadro compartilhado.
