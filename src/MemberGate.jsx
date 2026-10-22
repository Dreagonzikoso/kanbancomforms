import React,{useEffect,useState} from 'react';
import {supabase} from './supabase';
export default function MemberGate({children}) {
  const [status,setStatus]=useState('loading'),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let alive=true;setStatus('loading');supabase.from('team_members').select('user_id').limit(1).then(({data,error})=>{if(alive)setStatus(error?'error':data?.length?'approved':'pending')}).catch(()=>{if(alive)setStatus('error')});return()=>{alive=false}},[attempt]);
  if(status==='approved')return children;
  return <div className="auth-screen"><section className="auth-panel"><div className="eyebrow">CAVC · COMUNICAÇÃO</div><h1>{status==='loading'?'Verificando acesso…':status==='pending'?'Aguardando aprovação':'Falha ao verificar acesso'}</h1><p role="status">{status==='loading'?'Consultando sua autorização para o quadro.':status==='pending'?'Sua conta está conectada. Um administrador precisa autorizar seu acesso à equipe antes de você consultar ou criar posts.':'Não foi possível consultar sua autorização. Verifique a conexão e a configuração das tabelas.'}</p>{status!=='loading'&&<button className="primary" onClick={()=>setAttempt(n=>n+1)}>Verificar acesso novamente</button>}</section></div>;
}
