import React,{useEffect,useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {loginEmail,validateRegistration} from './loginIdentity';
import {roleLabels} from './teamRoles';
import MemberGate from './MemberGate';
import {cloudConfigured,configurationError,supabase} from './supabase';
export default function AuthGate({children}) {
  const [session,setSession]=useState(null),[checking,setChecking]=useState(Boolean(supabase)),[error,setError]=useState(''),[username,setUsername]=useState(''),[showPassword,setShowPassword]=useState(false),[password,setPassword]=useState(''),[busy,setBusy]=useState(false);
  const [registering,setRegistering]=useState(false),[confirmation,setConfirmation]=useState(''),[showConfirmation,setShowConfirmation]=useState(false),[message,setMessage]=useState('');
  const [email,setEmail]=useState(''),[requestedRole,setRequestedRole]=useState('');
  function switchMode(){setRegistering(!registering);setError('');setMessage('');setPassword('');setConfirmation('');setShowPassword(false);setShowConfirmation(false)}
  useEffect(()=>{if(!supabase)return;let alive=true;const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{if(alive){setSession(next);setChecking(false)}});supabase.auth.getSession().then(({data,error})=>{if(alive){setSession(data.session);setChecking(false);if(error)setError('Não foi possível recuperar sua sessão. Entre novamente.')}}).catch(()=>{if(alive){setChecking(false);setError('Não foi possível recuperar sua sessão.')}});return()=>{alive=false;subscription.unsubscribe()}},[]);
  async function login(event){
    event.preventDefault();if(busy)return;
    let credentials;
    try {credentials=registering?validateRegistration(email,username,requestedRole,password,confirmation):{email:loginEmail(username)}}catch(error){setError(error.message);return}
    setBusy(true);setError('');setMessage('');
    try{
      if(registering){
        const {data,error}=await supabase.auth.signUp({email:credentials.email,password,options:{data:credentials.data}});
        if(error){
          if(error.code==='signup_disabled')setError('O cadastro está desativado no Supabase. Peça ao administrador para habilitá-lo.');
          else if(error.code==='weak_password')setError('A senha não atende aos requisitos de segurança do projeto. Use uma senha mais forte.');
          else if(error.status===429)setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
          else setError('Não foi possível cadastrar. Confira os dados, use um nome de usuário disponível ou tente novamente mais tarde.');
          return;
        }
        setPassword('');setConfirmation('');setShowPassword(false);setShowConfirmation(false);
        if(!data.session){setUsername(credentials.email);setRegistering(false);setMessage('Confira sua caixa de entrada e confirme o e-mail. Depois, aguarde a aprovação do secretário.');}
        return;
      }
      const {error}=await supabase.auth.signInWithPassword({email:credentials.email,password});
      if(error?.code==='email_not_confirmed')setError('Confirme seu e-mail antes de entrar.');
      else if(error)setError('Não foi possível entrar. Confira o e-mail e a senha ou tente novamente.');
      else {setPassword('');setShowPassword(false)}
    }catch{setError('Não foi possível concluir. Verifique a conexão.')}
    finally{setBusy(false)}
  }
  async function logout(){setError('');try{const {error}=await supabase.auth.signOut();if(error)setError('Não foi possível sair. Tente novamente.')}catch{setError('Não foi possível sair. Verifique a conexão.')}}
  if(!cloudConfigured)return children;
  if(configurationError)return <div className="auth-screen"><section className="auth-panel"><h1>Configuração do Supabase</h1><p role="alert">{configurationError}</p><p>Confira as variáveis de ambiente e reinicie o servidor ou faça um novo deploy.</p></section></div>;
  if(checking)return <div className="auth-screen" role="status">Verificando sessão…</div>;
  if(session)return <MemberGate key={session.user.id} user={session.user} logout={logout} sessionError={error}>{children}</MemberGate>;
  return <div className="auth-screen"><section className="auth-panel"><div className="eyebrow">CAVC · COMUNICAÇÃO</div><h1>{registering?'Criar conta':'Entrar'}</h1><p>{registering?'Confirme seu e-mail e aguarde a aprovação do secretário.':'Acesse o quadro compartilhado com sua conta da equipe.'}</p><form onSubmit={login}>{registering&&<><label>E-mail<input type="email" autoComplete="email" required disabled={busy} value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Cargo solicitado<select required disabled={busy} value={requestedRole} onChange={e=>setRequestedRole(e.target.value)}><option value="">Selecione o cargo</option>{Object.entries(roleLabels).map(([role,label])=><option key={role} value={role}>{label}</option>)}</select></label></>}<label htmlFor="login-username">{registering?'Nome de usuário':'E-mail'}</label><input id="login-username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={busy} value={username} onChange={e=>setUsername(e.target.value)} placeholder={registering?"Ex.: marina.silva":"nome@exemplo.com"} aria-describedby="login-help"/><small id="login-help">{registering?'De 3 a 40 caracteres: letras sem acento, números, ponto, hífen ou sublinhado.':'Cadastros antigos também aceitam o nome de usuário original.'}</small><label htmlFor="login-password">Senha</label><div className="password-field"><input id="login-password" name="password" type={showPassword?'text':'password'} autoComplete={registering?'new-password':'current-password'} minLength={registering?8:undefined} required disabled={busy} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" className="password-toggle" disabled={busy} onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'} aria-pressed={showPassword} aria-controls="login-password">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{registering&&<><small>Use uma senha de pelo menos 8 caracteres.</small><label htmlFor="register-confirmation">Confirmar senha</label><div className="password-field"><input id="register-confirmation" type={showConfirmation?'text':'password'} autoComplete="new-password" required disabled={busy} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/><button type="button" className="password-toggle" disabled={busy} onClick={()=>setShowConfirmation(!showConfirmation)} aria-label={showConfirmation?'Ocultar confirmação de senha':'Mostrar confirmação de senha'} aria-pressed={showConfirmation} aria-controls="register-confirmation">{showConfirmation?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></>}{message&&<p role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?(registering?'Criando conta…':'Entrando…'):(registering?'Criar conta':'Entrar')}</button></form><button type="button" className="auth-switch" disabled={busy} onClick={switchMode}>{registering?'Já tenho uma conta · Entrar':'Não tenho uma conta · Registrar conta'}</button><small>Para obter acesso ou redefinir sua senha, procure o administrador do CAVC.</small></section></div>;
}
