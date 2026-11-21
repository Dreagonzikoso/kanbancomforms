import React, {useState, useEffect, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {Plus, Search, ArrowUpRight, LayoutGrid, CalendarDays, X, Check, Sun, Moon, ChevronLeft, ChevronRight, Link, ArrowRight, Trash2, CheckCircle2, Circle, Clock3, Radio, Layers, Pencil} from 'lucide-react';
import './style.css';
import './light-theme.css';
import AuthGate from './AuthGate';
import TeamApprovals from './TeamApprovals';
import AreaFilter from './AreaFilter';
import ProfileAvatar from './ProfileAvatar';
import ProfilePhoto from './ProfilePhoto';
import {roleLabels} from './teamRoles';
import {supabase} from './supabase';
import {usePostStore} from './usePostStore';
const stages = ['Post pedido','Sendo feito','Post feito','Programado','Postado'];
const icons = [Circle,Clock3,CheckCircle2,CalendarDays,Radio];
const areas=['Academica','Mobilização','Eventos','APSM','Gestão'];
const initial = [
{id:'1',title:'Semana de recepção dos calouros',area:'Gestão',idea:'Apresentar a programação da semana de recepção e dar boas-vindas aos novos estudantes.',intent:'Divulgar a programação e acolher os calouros.',date:'2026-11-05',format:'Carrossel',template:true,templateName:'Modelo institucional',owner:'',status:0},
{id:'2',title:'Cine CAVC: próxima sessão',area:'Eventos',idea:'Divulgar a próxima sessão do cineclube e convidar os estudantes.',intent:'Aumentar a participação no cineclube.',date:'2026-11-08',format:'Feed',template:false,owner:'',status:0},
{id:'3',title:'Inscrições para os grupos de estudo',area:'Academica',idea:'Compartilhar os grupos disponíveis e como se inscrever.',intent:'Conectar estudantes aos grupos de estudo.',date:'2026-11-06',format:'Carrossel',template:true,templateName:'Modelo institucional',owner:'Marina',status:1},
{id:'4',title:'Vem aí: interclasses 2026',area:'Eventos',idea:'Criar um teaser para o campeonato interclasses.',intent:'Gerar interesse no evento.',date:'2026-11-10',format:'Story',template:false,owner:'Lucas',status:1},
{id:'5',title:'Prestação de contas • outubro',area:'Gestão',idea:'Apresentar o resumo financeiro do mês de outubro.',intent:'Garantir transparência na gestão.',date:'2026-11-04',format:'Carrossel',template:true,templateName:'Modelo institucional',owner:'Ana',status:2},
{id:'6',title:'Assembleia geral dos estudantes',area:'Gestão',idea:'Convite para a assembleia geral com pauta e local.',intent:'Incentivar a participação estudantil.',date:'2026-11-03',format:'Feed',template:true,templateName:'Modelo institucional',owner:'Marina',status:3},
{id:'7',title:'Um novo semestre, novas ideias',area:'Gestão',idea:'Mensagem de abertura do semestre.',intent:'Aproximar a comunidade do CAVC.',date:'2026-10-20',format:'Feed',template:false,owner:'Lucas',status:4}];
const empty={title:'',area:'Gestão',idea:'',intent:'',date:'',format:'Feed',template:false,templateName:'',owner:'',canvaUrl:'',status:0};
const validCanva=value=>{try{const url=new URL(value);return url.protocol==='https:'&&(url.hostname==='canva.com'||url.hostname.endsWith('.canva.com'))&&!url.username&&!url.password}catch{return false}};
const dateLabel=d=>d?new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.',''):'Sem prazo';
function PostPeople({author,responsible,authorRegistered}){
  return <div className="post-people">
    <PostPerson label="Pedido por" person={author} fallback={authorRegistered?'Nome indisponível':'Autor não registrado'}/>
    {responsible&&<PostPerson label="Responsável" person={responsible}/>}
  </div>;
}
function PostPerson({label,person,fallback}){
  return <div className="post-person">
    {person&&<ProfileAvatar name={person.name} photo={person.photo}/>}
    <div><small>{label}</small><strong>{person?.name || fallback}</strong></div>
  </div>;
}
function App({identity}){
 const dialogRef=useRef(null);
 const directoryRequest=useRef(0);
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('cavc-theme')==='light'?'light':'dark'}catch{return 'dark'}});
 const [month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
 const [dragged,setDragged]=useState(null),[dropTarget,setDropTarget]=useState(null);
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.querySelector('meta[name=theme-color]').content=theme==='light'?'#fbf1dc':'#101112';try{localStorage.setItem('cavc-theme',theme)}catch{}},[theme]);
 const {posts,loading,busy,storeError,syncError,refresh,savePost,removePost,changeAssignment,cloud}=usePostStore(initial);
 const [query,setQuery]=useState(''),[area,setArea]=useState('Todas as áreas'),[modal,setModal]=useState(null),[draft,setDraft]=useState(empty),[error,setError]=useState(''),[notice,setNotice]=useState(''),[view,setView]=useState('board');
 const [directory,setDirectory]=useState([]),[directoryError,setDirectoryError]=useState(''),[directoryBusy,setDirectoryBusy]=useState(false);
 const [assignee,setAssignee]=useState('');
 const [photoOpen,setPhotoOpen]=useState(false);
 const [profiles,setProfiles]=useState({});
 useEffect(()=>{
   if(!cloud)return;
   const ids=[...new Set(posts.flatMap(post=>[
     post.createdBy,
     post.assignmentState==='accepted'?post.assignedTo:null,
   ]).filter(Boolean))];
   if(!ids.length)return;
   let active=true;
   async function loadProfiles(){
     try{
       const {data,error}=await supabase.rpc('board_member_profiles',{member_ids:ids});
       if(active&&!error)setProfiles(Object.fromEntries(data.map(member=>[
         member.user_id,{name:member.username,photo:member.avatar_data},
       ])));
     }catch{
       // Keep the latest profiles on a temporary connection failure.
     }
   }
   loadProfiles();
   return ()=>{active=false};
 },[cloud,posts]);
 function profile(id){
   if(id&&id===identity?.id)return {name:identity.username,photo:identity.photo};
   return profiles[id];
 }
 function responsibleFor(post){
   if(cloud&&post.assignmentState!=='accepted')return null;
   return profile(post.assignedTo)||(post.owner?{name:post.owner}:null);
 }

 const secretary=identity?.role==='secretario';
 const director=identity?.role==='diretoria';
 const canCreate=!cloud||secretary||director;
 const manages=post=>!cloud||secretary||(director&&post?.createdBy===identity.id);
 const worksOn=post=>cloud&&post?.assignedTo===identity.id&&post.assignmentState==='accepted'&&post.status===1;
 const canMove=(post,status)=>{
   if (!post) return false;
   if (!cloud) return true;
   if (status===post.status) return true;
   if (post.status===0 || (status===1&&post.assignmentState!=='accepted')) return false;
   return manages(post)||(worksOn(post)&&status===2);
 };
 const original=modal==='edit'?posts.find(post=>post.id===draft.id):null;
 const canEdit=modal==='new'?canCreate:Boolean(original&&(manages(original)||worksOn(original)));
 const canAssign=cloud&&original?.status===0&&manages(original);
 const canRespond=cloud&&original?.status===0&&original.assignedTo===identity.id&&original.assignmentState==='pending';
 const approvalView=view==='approvals'&&secretary;
 const viewTitle=approvalView?'Aprovar cadastros':view==='board'?'Quadro de posts':'Calendário';

 async function refreshDirectory(){
   if(!cloud||!canCreate)return;
   const request=++directoryRequest.current;
   setDirectoryBusy(true);
   setDirectoryError('');
   try{
     const {data,error}=await supabase.rpc('team_directory');
     if(error)throw error;
     if(request===directoryRequest.current)setDirectory(data || []);
   }catch{if(request===directoryRequest.current)setDirectoryError('Não foi possível consultar os membros da equipe.')}
   finally{if(request===directoryRequest.current)setDirectoryBusy(false)}
 }
 useEffect(()=>{refreshDirectory()},[canCreate,cloud]);

 async function updateAssignment(action){
   setError('');
   if(busy||!original)return;
   if(Object.keys(original).some(key=>original[key]!==draft[key])){
     setError('Salve as alterações do post antes de mudar a atribuição.');
     return;
   }
   if(await changeAssignment(original,action,action==='assign'?assignee:undefined)){
     if(action==='accept')setNotice('Post movido para Sendo feito.');
     setModal(null);
   }
 }

 async function movePost(id,status){
   if(busy||loading)return;
   const post=posts.find(p=>p.id===id);
   setDragged(null);setDropTarget(null);
   if(!post||post.status===status||!canMove(post,status))return;
   if(status>0&&!post.owner.trim()){
     open({...post,status});
     setError(cloud?'Atribua o post e aguarde o aceite para iniciar.':'Para mover este post, informe o responsável e salve as alterações.');
     return;
   }
   if(await savePost({...post,status},false))setNotice(`Post movido para ${stages[status]}.`);
 }
 async function deletePost(){
   if(original&&manages(original)&&window.confirm('Excluir este post? Essa ação não pode ser desfeita.')&&await removePost(draft))setModal(null);
 }
 useEffect(()=>{if(!modal)return;const previous=document.activeElement;const onKey=e=>{if(e.key==='Escape'&&!busy)setModal(null);if(e.key==='Tab'){const nodes=dialogRef.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};document.addEventListener('keydown',onKey);const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=overflow;previous?.focus()}},[modal,busy]);
 function open(post){setError('');setAssignee(post?.assignedTo || '');if(cloud&&post?.status===0&&manages(post))refreshDirectory();setDraft(post?{...post}:{...empty});setModal(post?'edit':'new')}
 async function save(e){e.preventDefault();if(busy||!canEdit)return;if(!areas.includes(draft.area)){setError('Selecione uma das áreas atuais do CAVC.');return}if(draft.template&&!draft.templateName?.trim()){setError('Informe qual template será usado.');return}if(draft.canvaUrl&&!validCanva(draft.canvaUrl)){setError('Use um link HTTPS do Canva (canva.com).');return}if(draft.status>0&&!draft.owner.trim()){setError(cloud?'Atribua o post e aguarde o aceite para iniciar.':'Informe quem é responsável pelo post nesta etapa.');return}const isNew=modal==='new';if(await savePost({...draft,id:isNew?crypto.randomUUID():draft.id},isNew)){setModal(null);setNotice(modal==='new'?'Solicitação adicionada ao quadro.':'Post atualizado.');setTimeout(()=>setNotice(''),3500)}}
 const filtered=posts.filter(p=>(area==='Todas as áreas'||p.area===area)&&`${p.title} ${p.area} ${responsibleFor(p)?.name || ""} ${profile(p.createdBy)?.name || ""} ${p.idea}`.toLowerCase().includes(query.toLowerCase()));
 const active=posts.filter(p=>p.status<4).length;
 return <div className="app"><aside><a className="brand" href="#" aria-label="CAVC Gestão Lumiar, início"><span className="brand-mark"><img src={`${import.meta.env.BASE_URL}lumiar.png`} alt="" width="32" height="34"/></span><div>CAVC<span>Gestão Lumiar</span></div></a><div className="workspace-label">ESPAÇO DE TRABALHO</div><button className={view==='board'?'nav active':'nav'} onClick={()=>setView('board')}><LayoutGrid size={17}/>Quadro de posts<span>{posts.length}</span></button><button className={view==='calendar'?'nav active':'nav'} onClick={()=>setView('calendar')}><CalendarDays size={17}/>Calendário<ArrowUpRight size={13}/></button>{secretary&&<button className={approvalView?'nav active':'nav'} onClick={()=>{setView('approvals');refreshDirectory()}}>Aprovar cadastros</button>}<div className="profile">{identity?<button type="button" className="photo-trigger" aria-label="Alterar foto de perfil" title="Alterar foto de perfil" onClick={()=>setPhotoOpen(true)}><ProfileAvatar name={identity.username} photo={identity.photo}/><Pencil size={12} aria-hidden="true"/></button>:<ProfileAvatar name="CC"/>}<div className="profile-name">{identity?.username || 'Equipe de comunicação'}<small>{roleLabels[identity?.role] || 'Centro Acadêmico CAVC'}</small></div>{identity&&<button className="secondary" onClick={identity.logout}>Sair</button>}</div></aside>
 <main><header><div className="breadcrumb">Espaço de trabalho <span>/</span> <b>{viewTitle}</b></div><button className="theme-toggle" onClick={()=>setTheme(theme==='dark'?'light':'dark')} aria-label={theme==='dark'?'Ativar tema claro':'Ativar tema escuro'}>{theme==='dark'?<Sun size={16}/>:<Moon size={16}/>}<span>{theme==='dark'?'Tema claro':'Tema escuro'}</span></button></header><section className="page">{identity?.sessionError&&<p className="error" role="alert">{identity.sessionError}</p>}{approvalView?<TeamApprovals members={directory.filter(member=>!member.effective_role)} refresh={refreshDirectory} busy={directoryBusy} error={directoryError} onApproved={()=>refreshDirectory()}/>:<><div className="storage-status"><span>{cloud?'Banco de dados compartilhado':'Modo local · dados apenas neste navegador'}</span>{cloud&&<button disabled={loading||busy} onClick={()=>refresh()}>{loading?'Carregando…':'Atualizar quadro'}</button>}</div>{syncError&&<p role="status">{syncError}</p>}{storeError&&<p className="error" role="alert">{storeError}</p>}<div className="intro"><div><div className="eyebrow">CAVC Gestão Lumiar</div><h1>{view==='board'?'Quadro de posts':'Calendário de posts'}</h1><p>Solicitações e acompanhamento da produção de posts.</p></div>{canCreate&&<button className="primary" onClick={()=>open()}><Plus size={17}/> Solicitar post</button>}</div>
 <div className="stats"><div><span className="stat-icon"><Layers size={17}/></span><div><strong>{posts.length.toString().padStart(2,'0')}</strong><span>Posts no quadro</span></div></div><div><span className="stat-icon"><Clock3 size={17}/></span><div><strong>{active.toString().padStart(2,'0')}</strong><span>Em andamento</span></div></div><div><span className="stat-icon green"><CheckCircle2 size={17}/></span><div><strong>{posts.filter(p=>p.status===4).length.toString().padStart(2,'0')}</strong><span>Posts publicados</span></div></div></div>
 <div className="toolbar"><div className="tabs"><button className={view==='board'?'selected':''} onClick={()=>setView('board')}><LayoutGrid size={16}/>Quadro</button><button className={view==='calendar'?'selected':''} onClick={()=>setView('calendar')}><CalendarDays size={16}/>Calendário</button></div><div className="filters"><label className="search"><Search size={16}/><input placeholder="Buscar um post..." value={query} onChange={e=>setQuery(e.target.value)}/></label><AreaFilter value={area} options={['Todas as áreas',...areas]} onChange={setArea}/></div></div>
 {view==='board'?<div className="board">{stages.map((stage,i)=>{const Icon=icons[i];const items=filtered.filter(p=>p.status===i);return <section className={'column stage-'+i+(dropTarget===i?' drop-target':'')} key={stage} onDragOver={e=>{if(dragged&&canMove(posts.find(post=>post.id===dragged),i)){e.preventDefault();e.dataTransfer.dropEffect='move';setDropTarget(i)}}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDropTarget(null)}} onDrop={e=>{e.preventDefault();movePost(e.dataTransfer.getData('text/plain'),i)}}><div className="column-header"><span className="stage-icon"><Icon size={14}/></span><h2>{stage}</h2><span className="count">{items.length}</span>{canCreate&&(!cloud||i===0)&&<button aria-label={'Adicionar em '+stage} onClick={()=>{open();setDraft({...empty,status:i})}}><Plus size={16}/></button>}</div><div className="cards">{items.map(post=><button className={'card'+(dragged===post.id?' dragging':'')} key={post.id} draggable={!busy&&!loading&&(manages(post)||worksOn(post))} onDragStart={e=>{setDragged(post.id);e.dataTransfer.setData('text/plain',post.id);e.dataTransfer.effectAllowed='move'}} onDragEnd={()=>{setDragged(null);setDropTarget(null)}} onClick={()=>{if(!busy)open(post)}}><div className={'tag area-'+areas.indexOf(post.area)}>{post.area}</div><h3>{post.title}</h3><p>{post.idea}</p><div className="card-tags"><span>{post.format}</span>{post.canvaUrl&&<span>↗ Canva</span>}{post.template&&<span className="template" title={post.templateName||'Template não informado'}>◈ {post.templateName||'Template não informado'}</span>}</div><div className="card-footer"><span><CalendarDays size={12}/>{dateLabel(post.date)}</span>{cloud&&post.assignmentState==='pending'&&<span>Aguardando aceite</span>}</div>{cloud?<PostPeople authorRegistered={Boolean(post.createdBy)} author={profile(post.createdBy)} responsible={responsibleFor(post)}/>:responsibleFor(post)&&<div className="post-people"><PostPerson label="Responsável" person={responsibleFor(post)}/></div>}</button>)}{canCreate&&(!cloud||i===0)&&<button className="add-card" onClick={()=>{open();setDraft({...empty,status:i})}}><Plus size={14}/>Adicionar post</button>}</div></section>})}</div>:<MonthlyCalendar month={month} setMonth={setMonth} posts={filtered} open={open}/>}

 <footer><span><span className="live-dot"/> {filtered.length} posts {query||area!=='Todas as áreas'?'encontrados':'organizados'}</span><span><b>CAVC</b></span></footer><div className="local-note">{cloud?'Os posts são compartilhados entre os membros autorizados da equipe. Use Atualizar quadro para buscar alterações.':'Seus dados ficam salvos neste navegador. O quadro inicia com posts de exemplo.'}</div></>}</section></main>
 {photoOpen&&<ProfilePhoto identity={identity} onSaved={identity.setPhoto} onClose={()=>setPhotoOpen(false)}/>}
 {notice&&<div className="toast" role="status"><Check size={17}/>{notice}</div>}
 {modal&&<div className="overlay" onClick={e=>{if(e.target===e.currentTarget&&!busy)setModal(null)}}><section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><div className="eyebrow">SOLICITAÇÃO DE POST</div><h2 id="modal-title">{modal==='new'?'Solicitar um post':'Detalhes do post'}</h2></div><button className="close" disabled={busy} aria-label="Fechar" onClick={()=>setModal(null)}><X size={21}/></button></div><form onSubmit={save}><fieldset className="post-fields" disabled={!canEdit||busy}><label>Título do post<input autoFocus required maxLength={120} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Título da solicitação"/></label><div className="form-row"><label>Área do CAVC<select value={draft.area} onChange={e=>setDraft({...draft,area:e.target.value})}>{!areas.includes(draft.area)&&<option value={draft.area} disabled>{draft.area} (selecione uma área atual)</option>}{areas.map(a=><option key={a}>{a}</option>)}</select></label><label>Prazo de entrega<input type="date" required value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label></div><label>Ideias e orientações<textarea required rows={3} value={draft.idea} onChange={e=>setDraft({...draft,idea:e.target.value})} placeholder="Conte o que precisa aparecer no post, referências e informações importantes."/></label><label>Intenção do post<textarea required rows={2} value={draft.intent} onChange={e=>setDraft({...draft,intent:e.target.value})} placeholder="O que queremos comunicar ou alcançar?"/></label><div className="form-row"><label>Formato<select value={draft.format} onChange={e=>setDraft({...draft,format:e.target.value})}>{['Feed','Carrossel','Story','Reels'].map(f=><option key={f}>{f}</option>)}</select></label><label>Etapa<select disabled={cloud&&(modal==='new'||original?.status===0)} value={draft.status} onChange={e=>setDraft({...draft,status:Number(e.target.value)})}>{stages.map((s,i)=><option value={i} key={s} disabled={cloud&&original&&!canMove(original,i)}>{s}</option>)}</select></label></div>{cloud?original&&<PostPeople authorRegistered={Boolean(original.createdBy)} author={profile(original.createdBy)} responsible={responsibleFor(original)}/>:<label>Responsável {draft.status===0&&<span className="optional">(opcional)</span>}<input required={draft.status>0} value={draft.owner} onChange={e=>setDraft({...draft,owner:e.target.value})} placeholder="Quem vai fazer esse post?"/></label>}<label>Link do Canva <span className="optional">(opcional)</span><input type="url" value={draft.canvaUrl||''} onChange={e=>setDraft({...draft,canvaUrl:e.target.value.trim()})} placeholder="https://www.canva.com/design/..."/><small>Adicione o arquivo onde o post está sendo desenvolvido.</small></label>{validCanva(draft.canvaUrl)&&<a className="canva-link" href={draft.canvaUrl} target="_blank" rel="noopener noreferrer"><Link size={15}/>Abrir design no Canva<ArrowUpRight size={14}/></a>}<label className="checkbox"><input type="checkbox" checked={draft.template} onChange={e=>setDraft({...draft,template:e.target.checked})}/><span>Usar um template existente<small>O material seguirá a identidade de um modelo do CAVC.</small></span></label>{draft.template&&<label>Qual template será usado?<input required maxLength={200} value={draft.templateName||''} onChange={e=>setDraft({...draft,templateName:e.target.value})} placeholder="Nome ou referência do template"/></label>}</fieldset>
 {cloud&&draft.assignmentState==='pending'&&<p className="post-assignee">Aguardando aceite{canAssign&&draft.owner ? ` de ${draft.owner}` : ''}</p>}
 {canAssign&&<div className="assignment-controls">
   <label>Atribuir a<select value={assignee} onChange={e=>setAssignee(e.target.value)} disabled={busy||directoryBusy}>
     <option value="">Selecione um membro da equipe</option>
     {directory.filter(member=>member.effective_role&&member.user_id!==identity.id).map(member=><option value={member.user_id} key={member.user_id}>{member.username} · {roleLabels[member.effective_role]}</option>)}
   </select></label>
   {directoryError&&<p role="alert" className="error">{directoryError}</p>}
   <button type="button" className="secondary" disabled={busy||directoryBusy||!assignee||assignee===original.assignedTo} onClick={()=>updateAssignment('assign')}>Enviar atribuição</button>
   {(original.assignedTo||original.owner)&&<button type="button" className="secondary" disabled={busy} onClick={()=>updateAssignment('unassign')}>Liberar post</button>}
 </div>}
 {(error||storeError)&&<p className="error" role="alert">{error||storeError}</p>}
 <div className="modal-actions">
   {modal==='edit'&&original&&manages(original)&&<button type="button" className="delete" disabled={busy} onClick={deletePost}><Trash2 size={16}/>Excluir</button>}
   <button type="button" className="secondary" disabled={busy} onClick={()=>setModal(null)}>{canEdit?'Cancelar':'Fechar'}</button>
   {canRespond&&<><button type="button" className="secondary" disabled={busy} onClick={()=>updateAssignment('decline')}>Recusar</button><button type="button" className="primary" disabled={busy} onClick={()=>updateAssignment('accept')}>Aceitar atribuição</button></>}
   {canEdit&&<button className="primary" type="submit" disabled={busy}>{busy?'Salvando…':modal==='new'?'Criar solicitação':'Salvar alterações'}<ArrowRight size={16}/></button>}
 </div></form></section></div>}
 </div>
}
function MonthlyCalendar({month,setMonth,posts,open}){
 const year=month.getFullYear(),m=month.getMonth(),offset=new Date(year,m,1).getDay();
 const count=new Date(year,m+1,0).getDate(),length=Math.ceil((offset+count)/7)*7;
 const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const today=key(new Date());
 return <section className="monthly-calendar" aria-label="Calendário mensal de prazos"><div className="month-toolbar"><div><h2>{month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</h2><p>Posts organizados pelo prazo de entrega</p></div><div className="month-controls"><button aria-label="Mês anterior" onClick={()=>setMonth(new Date(year,m-1,1))}><ChevronLeft size={18}/></button><button onClick={()=>setMonth(new Date(new Date().getFullYear(),new Date().getMonth(),1))}>Hoje</button><button aria-label="Próximo mês" onClick={()=>setMonth(new Date(year,m+1,1))}><ChevronRight size={18}/></button></div></div><div className="calendar-scroll"><div className="month-grid">{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=><div className="weekday" key={d}>{d}</div>)}{Array.from({length},(_,i)=>{const date=new Date(year,m,i-offset+1),dayKey=key(date);return <div className={'month-day'+(date.getMonth()!==m?' outside':'')+(dayKey===today?' today':'')} key={dayKey}><span className="day-number">{date.getDate()}</span>{posts.filter(p=>p.date===dayKey).map(p=><button className={'calendar-post status-'+p.status} key={p.id} onClick={()=>open(p)} title={`${p.title} — ${stages[p.status]}`}><strong>{p.title}</strong><small>{stages[p.status]} · {p.area}</small></button>)}</div>})}</div></div>{posts.some(p=>!p.date)&&<div className="undated"><h3>Sem prazo</h3>{posts.filter(p=>!p.date).map(p=><button onClick={()=>open(p)} key={p.id}>{p.title}</button>)}</div>}</section>
}
try{
  if(localStorage.getItem('cavc-theme')==='light'){
    document.documentElement.dataset.theme='light';
    document.querySelector('meta[name=theme-color]').content='#fbf1dc';
  }
}catch{}
createRoot(document.getElementById('root')).render(<AuthGate><App/></AuthGate>);
