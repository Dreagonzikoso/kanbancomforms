import React,{useState} from 'react';
import {supabase} from './supabase';
import {roleLabels} from './teamRoles';

function PendingMember({member,onApproved}) {
  const [role,setRole]=useState(member.requested_role || '');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function approve(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const {error}=await supabase.rpc('approve_team_member',{member_id:member.user_id,approved_role:role});
      if (error) throw error;
      onApproved(member.user_id);
    } catch {
      setError('Não foi possível aprovar este cadastro. Atualize a lista e tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return <form className="approval" onSubmit={approve}>
    <div><strong>{member.username}</strong><p>{member.email}</p>
      <p>Cargo solicitado: {roleLabels[member.requested_role] || 'Não informado'}</p></div>
    <label>Cargo efetivo<select required value={role} onChange={e=>setRole(e.target.value)} disabled={busy}>
      <option value="">Selecione o cargo</option>
      {Object.entries(roleLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}
    </select></label>
    <button className="primary" disabled={busy}>Aprovar</button>
    {error&&<p className="error" role="alert">{error}</p>}
  </form>;
}

export default function TeamApprovals({members,refresh,busy,error,onApproved}) {
  return <section aria-labelledby="approvals-title">
    <div className="intro"><h1 id="approvals-title">Aprovar cadastros</h1>
      <button className="secondary" disabled={busy} onClick={refresh}>Atualizar cadastros</button></div>
    {error&&<p role="alert" className="error">{error}</p>}
    {busy&&<p role="status">Consultando cadastros…</p>}
    {!busy&&!error&&!members.length&&<p>Nenhum cadastro confirmado aguardando aprovação.</p>}
    {members.map(member=><PendingMember key={member.user_id} member={member} onApproved={onApproved}/>)}
  </section>;
}
