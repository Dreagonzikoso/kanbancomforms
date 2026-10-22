import {useEffect,useRef,useState} from 'react';
import {supabase} from './supabase';
import {createPostRepository,databaseMessage} from './postRepository';
const repository = supabase ? createPostRepository(supabase) : null;
export function usePostStore(initial) {
  const [posts,setPosts]=useState(()=>{if(repository)return [];try{const data=JSON.parse(localStorage.getItem('cavc-posts'));return Array.isArray(data)?data:initial}catch{return initial}});
  const [loading,setLoading]=useState(Boolean(repository)),[busy,setBusy]=useState(false),[storeError,setStoreError]=useState('');
  const locked=useRef(false),mounted=useRef(true),request=useRef(0);
  async function refresh() {
    if(!repository||locked.current)return;
    const token=++request.current;setLoading(true);
    try{const rows=await repository.list();if(mounted.current&&token===request.current){setPosts(rows);setStoreError('')}}
    catch(error){if(mounted.current&&token===request.current)setStoreError(databaseMessage(error))}
    finally{if(mounted.current&&token===request.current)setLoading(false)}
  }
  useEffect(()=>{mounted.current=true;refresh();const onFocus=()=>refresh();window.addEventListener('focus',onFocus);return()=>{mounted.current=false;request.current++;window.removeEventListener('focus',onFocus)}},[]);
  async function mutate(post,operation) {
    if(locked.current)return false;
    locked.current=true;request.current++;setLoading(false);setBusy(true);setStoreError('');
    try{
      const saved=repository ? operation==='remove' ? (await repository.remove(post),null) : await repository.save(post,operation==='create') : post;
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
  return {posts,loading,busy,storeError,refresh,savePost:(post,isNew)=>localMutate(post,isNew?'create':'update'),removePost:post=>localMutate(post,'remove'),cloud:Boolean(repository)};
}
