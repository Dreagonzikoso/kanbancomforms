export const fromRow = row => ({
  id:row.id,title:row.title,area:row.area,idea:row.idea,intent:row.intent,
  date:row.due_date,format:row.format,template:row.use_template,
  templateName:row.template_name,owner:row.owner,canvaUrl:row.canva_url,
  status:row.status,updatedAt:row.updated_at,
});
export const toRow = post => ({
  title:post.title.trim(),area:post.area,idea:post.idea.trim(),intent:post.intent.trim(),
  due_date:post.date,format:post.format,use_template:post.template,
  template_name:post.template ? (post.templateName||'').trim() : '',
  owner:post.owner.trim(),canva_url:post.canvaUrl||'',status:post.status,
});
export function databaseMessage(error) {
  if (error?.code==='42501') return 'Acesso negado. Peça ao administrador para incluir sua conta na equipe do CAVC.';
  if (error?.code==='42P01'||error?.code==='PGRST205') return 'Banco não configurado. Execute o arquivo supabase/schema.sql no SQL Editor.';
  if (error?.code==='23514') return 'Dados inválidos. Confira área, responsável, prazo e template.';
  if (error?.code==='CONFLICT') return 'Este post foi alterado ou excluído por outra pessoa. Atualize o quadro e abra o post novamente antes de editar.';
  return 'Não foi possível acessar o banco. Verifique sua conexão e tente novamente.';
}
export function createPostRepository(client) {
  return {
    async list() {
      // Explicit membership check prevents a denied SELECT from appearing as an empty board.
      const {data:member,error:memberError}=await client.from('team_members').select('user_id').limit(1);
      if (memberError) throw memberError;
      if (!member?.length) throw {code:'42501'};
      const {data,error}=await client.from('posts').select('*').order('created_at',{ascending:true});
      if(error)throw error;
      return data.map(fromRow);
    },
    async save(post,isNew) {
      let query = isNew ? client.from('posts').insert({...toRow(post),id:post.id}) :
        client.from('posts').update(toRow(post)).eq('id',post.id).eq('updated_at',post.updatedAt);
      const {data,error}=await query.select('*').maybeSingle();
      if(error)throw error;
      if(!data)throw {code:'CONFLICT'};
      return fromRow(data);
    },
    async remove(post) {
      const {data,error}=await client.from('posts').delete().eq('id',post.id).eq('updated_at',post.updatedAt).select('id');
      if(error)throw error;
      if(!data?.length)throw {code:'CONFLICT'};
    },
  };
}
