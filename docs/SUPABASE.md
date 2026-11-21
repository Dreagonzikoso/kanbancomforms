# Configurar o quadro compartilhado no Supabase

## 1. Preparar o banco

Em um projeto novo, execute [schema.sql](../supabase/schema.sql) no SQL Editor. Depois, aplique cada migração pendente uma vez, na ordem abaixo, antes do deploy.

1. [Beta 0.3](../supabase/migrations/202611210001_beta_0_3.sql)
2. [Beta 0.4](../supabase/migrations/202611210002_beta_0_4.sql)
3. [Beta 0.5](../supabase/migrations/202611210003_beta_0_5.sql)
4. [Beta 0.7](../supabase/migrations/202611210004_beta_0_7.sql)
5. [Beta 0.7.b](../supabase/migrations/202611210005_beta_0_7_b.sql)

Se o banco já está na Beta 0.7, aplique somente a Beta 0.7.b. A função de atribuição da Beta 0.7 é necessária para a opção **Eu vou fazer**. A Beta 0.7.b usa a conta autenticada e aprovada do autor para essa opção.

A migração Beta 0.3 é transacional e preserva os posts, responsáveis em texto e etapas. Os registros antigos ficam sem autor vinculado, pois o banco anterior não registrava essa informação. O Secretário pode gerenciar esses pedidos. Contas já aprovadas mantêm acesso com o cargo inicial Bixo/Bixete. A Beta 0.4 preserva o texto de responsáveis antigos no banco. A interface mostra o nome apenas para atribuições aceitas. Ao retornar um post aceito para **Post pedido**, a atribuição é liberada e será necessário um novo aceite.

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
3. Entre como Diretoria e atribua um pedido no formulário de criação. Também é possível arrastar um pedido sem atribuição para **Sendo feito** para abrir a janela de atribuição. Ao cancelar, o cartão permanece em **Post pedido**. Confira os cargos na lista. Use **Eu vou fazer** para iniciar seu próprio pedido imediatamente. Verifique que outro Diretor sem atribuição não pode alterar o pedido.
4. Entre como a pessoa indicada. Recuse e confira que o pedido permanece em **Post pedido**, disponível para nova atribuição. Atribua novamente e aceite. O post deve ir automaticamente para **Sendo feito**, mostrar o nome do responsável e permitir edição e avanço para **Post feito**.
5. Atualize o quadro em outro navegador e confira o nome do responsável e a etapa. Edições concorrentes devem pedir atualização quando a versão do post estiver desatualizada.

A proteção de acesso usa RLS e funções do banco. Em uma falha temporária, o quadro mantém os dados já carregados, tenta atualizar novamente e também atualiza quando a conexão do navegador volta. Posts salvos no modo local continuam no navegador e podem ser cadastrados manualmente no quadro compartilhado.


## Fotos de perfil

Clique no avatar da lateral para adicionar, trocar ou remover sua foto. O navegador centraliza a imagem em um recorte quadrado e a converte para JPEG. A foto fica no banco e é visível para membros aprovados. O quadro utiliza o autor registrado no pedido e a pessoa responsável após o aceite. Pedidos anteriores ao registro de autoria continuam no quadro com a indicação de autor não registrado.
