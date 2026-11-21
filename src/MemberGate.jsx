import React,{useEffect,useState} from 'react';
import {displayLogin} from './loginIdentity';
import {supabase} from './supabase';

export default function MemberGate({children,user,logout,sessionError}) {
  const [access,setAccess]=useState({status:'loading'});
  const [attempt,setAttempt]=useState(0);

  useEffect(()=>{
    let active=true;
    supabase.from('team_members').select('username,effective_role').eq('user_id',user.id).maybeSingle()
      .then(({data,error})=>{
        if (!active) return;
        setAccess(error?{status:'error'}:{status:data?.effective_role?'approved':'pending',member:data});
      }).catch(()=>{if(active)setAccess({status:'error'})});
    return ()=>{active=false};
  },[user.id,attempt]);

  const username=displayLogin(user,access.member);
  if (access.status==='approved') {
    const identity={id:user.id,username,role:access.member.effective_role,logout,sessionError};
    return React.cloneElement(children,{identity});
  }

  const messages={
    loading:['Verificando acesso…','Consultando sua autorização para o quadro.'],
    pending:['Aguardando aprovação','O secretário precisa aprovar seu cadastro e definir seu cargo na equipe.'],
    error:['Falha ao verificar acesso','Confira a conexão e a configuração das tabelas.'],
  };
  const [title,description]=messages[access.status];
  return <div className="auth-screen"><section className="auth-panel">
    <div className="eyebrow">CAVC · COMUNICAÇÃO</div>
    <h1>{title}</h1>
    <p>{username}</p>
    <p role="status">{description}</p>
    {sessionError&&<p role="alert" className="error">{sessionError}</p>}
    <div className="account-actions">
      {access.status!=='loading'&&<button className="primary" onClick={()=>{setAccess({status:'loading'});setAttempt(n=>n+1)}}>Verificar acesso novamente</button>}
      <button className="secondary" onClick={logout}>Sair</button>
    </div>
  </section></div>;
}
