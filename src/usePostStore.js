import {useEffect,useRef,useState} from 'react';
import {supabase} from './supabase';
import {createPostRepository,databaseMessage,isTransientReadError} from './postRepository';
const repository = supabase ? createPostRepository(supabase) : null;
export function usePostStore(initial) {
  const [posts,setPosts]=useState(()=>{if(repository)return [];try{const data=JSON.parse(localStorage.getItem('cavc-posts'));return Array.isArray(data)?data:initial}catch{return initial}});
  const [loading,setLoading]=useState(Boolean(repository)),[busy,setBusy]=useState(false),[storeError,setStoreError]=useState('');
  const [syncError,setSyncError]=useState('');
  const locked=useRef(false),mounted=useRef(true),request=useRef(0);
  const reading=useRef(false),retryTimer=useRef(null);
  async function refresh(allowRetry=true) {
    if(!repository||locked.current||reading.current)return;
    clearTimeout(retryTimer.current);
    const token=++request.current;
    reading.current=true;
    setLoading(true);
    try{
      const rows=await repository.list();
      if(mounted.current&&token===request.current){
        setPosts(rows);
        setSyncError('');
      }
    }catch(error){
      if(mounted.current&&token===request.current){
        if(isTransientReadError(error)){
          setSyncError('Conexão instável. O quadro mantém os últimos dados carregados.');
          if(allowRetry)retryTimer.current=setTimeout(()=>refresh(false),5000);
        }else{
          if(error.code==='42501')setPosts([]);
          setSyncError(databaseMessage(error));
        }
      }
    }finally{
      if(mounted.current&&token===request.current){
        reading.current=false;
        setLoading(false);
      }
    }
  }
  useEffect(()=>{
    mounted.current=true;
    const reconnect=()=>refresh();
    refresh();
    window.addEventListener('focus',reconnect);
    window.addEventListener('online',reconnect);
    return ()=>{
      mounted.current=false;
      request.current++;
      reading.current=false;
      clearTimeout(retryTimer.current);
      window.removeEventListener('focus',reconnect);
      window.removeEventListener('online',reconnect);
    };
  },[]);
  async function mutate(post,operation,action,memberId) {
    if(locked.current)return false;
    locked.current=true;request.current++;reading.current=false;setLoading(false);setBusy(true);setStoreError('');
    try{
      let saved;
      if(operation==='remove')await repository.remove(post);
      else if(operation==='assignment')saved=await repository.changeAssignment(post,action,memberId);
      else saved=await repository.save(post,operation==='create');
      if(!mounted.current)return false;
      setPosts(current=>{
        const next=operation==='remove'?current.filter(p=>p.id!==post.id):operation==='create'?[...current,saved]:current.map(p=>p.id===post.id?saved:p);
        return next;
      });
      return true;
    }catch(error){if(mounted.current)setStoreError(databaseMessage(error));return false}
    finally{locked.current=false;if(mounted.current)setBusy(false)}
  }
  // Local persistence is performed before committing React state, so failed saves stay visible.
  async function localMutate(post,operation){
    if(repository)return mutate(post,operation);
    try{const next=operation==='remove'?posts.filter(p=>p.id!==post.id):operation==='create'?[...posts,post]:posts.map(p=>p.id===post.id?post:p);localStorage.setItem('cavc-posts',JSON.stringify(next));setPosts(next);setStoreError('');return true}
    catch{setStoreError('Não foi possível salvar neste navegador. Verifique o espaço disponível.');return false}
  }
  return {posts,loading,busy,storeError,syncError,refresh,savePost:(post,isNew)=>localMutate(post,isNew?'create':'update'),changeAssignment:(post,action,memberId)=>mutate(post,'assignment',action,memberId),removePost:post=>localMutate(post,'remove'),cloud:Boolean(repository)};
}
