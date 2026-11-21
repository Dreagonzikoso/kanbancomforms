export const fromRow = row => ({
  id:row.id,title:row.title,area:row.area,idea:row.idea,intent:row.intent,
  date:row.due_date,format:row.format,template:row.use_template,
  templateName:row.template_name,owner:row.owner,canvaUrl:row.canva_url,
  status:row.status,updatedAt:row.updated_at,createdBy:row.created_by,
  assignedTo:row.assigned_to,assignmentState:row.assignment_state,
});
export const toRow = post => ({
  title:post.title.trim(),area:post.area,idea:post.idea.trim(),intent:post.intent.trim(),
  due_date:post.date,format:post.format,use_template:post.template,
  template_name:post.template ? (post.templateName||'').trim() : '',
  canva_url:post.canvaUrl||'',
});
export function databaseMessage(error) {
  if (error?.code==='42501') return 'Acesso negado. Confira seu cargo e as permissões para este post.';
  if (error?.code==='42P01'||error?.code==='PGRST205') return 'Banco não configurado. Confira supabase/schema.sql e a migração Beta 0.3.';
  if (error?.code==='23514') {
    if (/assigned member must accept|accepted assignment/.test(error.message || '')) return 'A pessoa indicada precisa aceitar antes de iniciar o post.';
    return 'Dados inválidos. Confira área, responsável, prazo e template.';
  }
  if (error?.code==='CONFLICT'||error?.code==='PT409') return 'Este post foi alterado ou excluído por outra pessoa. Atualize o quadro e abra o post novamente antes de editar.';
  return 'Não foi possível acessar o banco. Verifique sua conexão e tente novamente.';
}
export function isTransientReadError(error) {
  return error?.status===0||error?.status===408||error?.status===429||error?.status>=500;
}

export function createPostRepository(client) {
  return {
    async list() {
      // Explicit membership check prevents a denied SELECT from appearing as an empty board.
      const {data:member,error:memberError,status:memberStatus}=await client.from('team_members').select('user_id').not('effective_role','is',null).limit(1);
      if (memberError) throw {...memberError,status:memberStatus};
      if (!member?.length) throw {code:'42501'};
      const {data,error,status}=await client.from('posts').select('*').order('created_at',{ascending:true});
      if(error)throw {...error,status};
      return data.map(fromRow);
    },
    async save(post,isNew,assigneeId) {
      if(isNew&&assigneeId){
        const {data,error}=await client.rpc('create_post_with_assignment',{
          post_data:{...toRow(post),id:post.id},member_id:assigneeId,
        }).single();
        if(error)throw error;
        return fromRow(data);
      }
      let query = isNew ? client.from('posts').insert({...toRow(post),id:post.id}) :
        client.from('posts').update({...toRow(post),status:post.status}).eq('id',post.id).eq('updated_at',post.updatedAt);
      const {data,error}=await query.select('*').maybeSingle();
      if(error)throw error;
      if(!data)throw {code:'CONFLICT'};
      return fromRow(data);
    },
    async changeAssignment(post,action,memberId) {
      const {data,error}=await client.rpc('change_post_assignment',{
        post_id:post.id,expected_updated_at:post.updatedAt,action,member_id:memberId ?? null,
      }).single();
      if(error)throw error;
      return fromRow(data);
    },
    async remove(post) {
      const {data,error}=await client.from('posts').delete().eq('id',post.id).eq('updated_at',post.updatedAt).select('id');
      if(error)throw error;
      if(!data?.length)throw {code:'CONFLICT'};
    },
  };
}
