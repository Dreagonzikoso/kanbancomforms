import React,{useEffect,useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {loginEmail,displayLogin,validateRegistration} from './loginIdentity';
import MemberGate from './MemberGate';
import {cloudConfigured,configurationError,supabase} from './supabase';
export default function AuthGate({children}) {
  const [session,setSession]=useState(null),[checking,setChecking]=useState(Boolean(supabase)),[error,setError]=useState(''),[username,setUsername]=useState(''),[showPassword,setShowPassword]=useState(false),[password,setPassword]=useState(''),[busy,setBusy]=useState(false);
  const [registering,setRegistering]=useState(false),[confirmation,setConfirmation]=useState(''),[showConfirmation,setShowConfirmation]=useState(false),[message,setMessage]=useState('');
  function switchMode(){setRegistering(!registering);setError('');setMessage('');setPassword('');setConfirmation('');setShowPassword(false);setShowConfirmation(false)}
  useEffect(()=>{if(!supabase)return;let alive=true;const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{if(alive){setSession(next);setChecking(false)}});supabase.auth.getSession().then(({data,error})=>{if(alive){setSession(data.session);setChecking(false);if(error)setError('Não foi possível recuperar sua sessão. Entre novamente.')}}).catch(()=>{if(alive){setChecking(false);setError('Não foi possível recuperar sua sessão.')}});return()=>{alive=false;subscription.unsubscribe()}},[]);
  async function login(event){
    event.preventDefault();if(busy)return;
    let email;
    try {email=registering?validateRegistration(username,password,confirmation):loginEmail(username)}catch(error){setError(error.message);return}
    setBusy(true);setError('');setMessage('');
    try{
      if(registering){
        const {data,error}=await supabase.auth.signUp({email,password});
        if(error){
          if(error.code==='signup_disabled')setError('O cadastro está desativado no Supabase. Peça ao administrador para habilitá-lo.');
          else if(error.code==='weak_password')setError('A senha não atende aos requisitos de segurança do projeto. Use uma senha mais forte.');
          else if(error.status===429)setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
          else setError('Não foi possível cadastrar. Tente outro nome de usuário ou tente novamente mais tarde.');
          return;
        }
        setPassword('');setConfirmation('');setShowPassword(false);setShowConfirmation(false);
        if(!data.session){setRegistering(false);setMessage('Cadastro recebido. Peça ao administrador para conferir a conta e autorizar seu acesso. Se a confirmação de e-mail estiver ativa, ele também precisará confirmar o identificador interno.');}
        return;
      }
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error)setError('Não foi possível entrar. Confira o nome de usuário e a senha ou tente novamente.');
      else {setPassword('');setShowPassword(false)}
    }catch{setError('Não foi possível concluir. Verifique a conexão.')}
    finally{setBusy(false)}
  }
  async function logout(){setError('');try{const {error}=await supabase.auth.signOut();if(error)setError('Não foi possível sair. Tente novamente.')}catch{setError('Não foi possível sair. Verifique a conexão.')}}
  if(!cloudConfigured)return children;
  if(configurationError)return <div className="auth-screen"><section className="auth-panel"><h1>Configuração do Supabase</h1><p role="alert">{configurationError}</p><p>Confira as variáveis de ambiente e reinicie o servidor ou faça um novo deploy.</p></section></div>;
  if(checking)return <div className="auth-screen" role="status">Verificando sessão…</div>;
  if(session)return <><div className="session-bar"><span>{displayLogin(session.user)}</span><button onClick={logout}>Sair</button>{error&&<span role="alert">{error}</span>}</div><MemberGate key={session.user.id}>{React.cloneElement(children,{key:session.user.id})}</MemberGate></>;
  return <div className="auth-screen"><section className="auth-panel"><div className="eyebrow">CAVC · COMUNICAÇÃO</div><h1>{registering?'Criar conta':'Entrar'}</h1><p>{registering?'Cadastre seu usuário. O acesso ao quadro depende de aprovação da equipe.':'Acesse o quadro compartilhado com sua conta da equipe.'}</p><form onSubmit={login}><label htmlFor="login-username">Nome de usuário</label><input id="login-username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={busy} value={username} onChange={e=>setUsername(e.target.value)} placeholder="Ex.: marina.silva" aria-describedby="login-help"/><small id="login-help">{registering?'De 3 a 40 caracteres: letras sem acento, números, ponto, hífen ou sublinhado.':'Contas antigas também podem entrar com e-mail.'}</small><label htmlFor="login-password">Senha</label><div className="password-field"><input id="login-password" name="password" type={showPassword?'text':'password'} autoComplete={registering?'new-password':'current-password'} minLength={registering?8:undefined} required disabled={busy} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" className="password-toggle" disabled={busy} onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'} aria-pressed={showPassword} aria-controls="login-password">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{registering&&<><small>Use uma senha de pelo menos 8 caracteres.</small><label htmlFor="register-confirmation">Confirmar senha</label><div className="password-field"><input id="register-confirmation" type={showConfirmation?'text':'password'} autoComplete="new-password" required disabled={busy} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/><button type="button" className="password-toggle" disabled={busy} onClick={()=>setShowConfirmation(!showConfirmation)} aria-label={showConfirmation?'Ocultar confirmação de senha':'Mostrar confirmação de senha'} aria-pressed={showConfirmation} aria-controls="register-confirmation">{showConfirmation?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></>}{message&&<p role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?(registering?'Criando conta…':'Entrando…'):(registering?'Criar conta':'Entrar')}</button></form><button type="button" className="auth-switch" disabled={busy} onClick={switchMode}>{registering?'Já tenho uma conta · Entrar':'Não tenho uma conta · Registrar conta'}</button><small>Para obter acesso ou redefinir sua senha, procure o administrador do CAVC.</small></section></div>;
}
