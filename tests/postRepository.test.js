import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {createPostRepository,toRow,fromRow,databaseMessage} from '../src/postRepository.js';
const post={id:'2f754ee4-c5ee-4f29-9d47-19825dcc1a45',title:' Post ',area:'APSM',idea:' Ideia ',intent:' Intenção ',date:'2026-12-01',format:'Feed',template:true,templateName:' Modelo ',owner:' Ana ',canvaUrl:'https://www.canva.com/design/a/edit',status:1,updatedAt:'2026-10-22T10:00:00.000Z'};
const row={...toRow(post),id:post.id,updated_at:post.updatedAt};
function setup(handler){
 const calls=[];
 const client=createClient('https://test.supabase.co','public-test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(url,options)=>{const call={url:new URL(url),method:options.method,body:options.body?JSON.parse(options.body):null};calls.push(call);const result=handler(call);return new Response(JSON.stringify(result.body),{status:result.status||200,headers:{'content-type':'application/json'}})}}});
 return {repository:createPostRepository(client),calls};
}
test('mapping preserves post details and clears a disabled template',()=>{
 assert.equal(fromRow(row).canvaUrl,post.canvaUrl);
 assert.equal(fromRow(row).templateName,'Modelo');
 assert.equal(toRow({...post,template:false}).template_name,'');
 assert.equal(toRow(post).owner,'Ana');
});
test('checks membership before loading the shared board',async()=>{
 const {repository,calls}=setup(call=>({body:call.url.pathname.endsWith('team_members')?[{user_id:'member'}]:[row]}));
 assert.deepEqual(await repository.list(),[fromRow(row)]);
 assert.equal(calls[0].url.pathname,'/rest/v1/team_members');
 assert.equal(calls[1].url.searchParams.get('order'),'created_at.asc');
});
test('nonmembers cannot be mistaken for an empty board',async()=>{
 const {repository,calls}=setup(()=>({body:[]}));
 await assert.rejects(repository.list(),e=>e.code==='42501');
 assert.equal(calls.length,1);
});
test('create sends only allowed columns and receives the saved record',async()=>{
 const {repository,calls}=setup(()=>({body:row}));
 assert.deepEqual(await repository.save(post,true),fromRow(row));
 assert.equal(calls[0].method,'POST');
 assert.equal(calls[0].body.id,post.id);
 assert.equal(calls[0].body.updated_at,undefined);
 assert.equal(calls[0].body.template_name,'Modelo');
});
test('updates include version guard and reject a stale record',async()=>{
 const {repository,calls}=setup(()=>({body:null}));
 await assert.rejects(repository.save(post,false),e=>e.code==='CONFLICT');
 assert.equal(calls[0].method,'PATCH');
 assert.equal(calls[0].url.searchParams.get('id'),'eq.'+post.id);
 assert.equal(calls[0].url.searchParams.get('updated_at'),'eq.'+post.updatedAt);
});
test('delete reports a conflict when no current record was removed',async()=>{
 const {repository,calls}=setup(()=>({body:[]}));
 await assert.rejects(repository.remove(post),e=>e.code==='CONFLICT');
 assert.equal(calls[0].method,'DELETE');
 assert.equal(calls[0].url.searchParams.get('updated_at'),'eq.'+post.updatedAt);
});
test('successful update and delete use the returned database result',async()=>{
 const {repository}=setup(call=>({body:call.method==='DELETE'?[{id:post.id}]:{...row,status:2,updated_at:'2026-10-23T10:00:00Z'}}));
 assert.equal((await repository.save({...post,status:2},false)).status,2);
 await repository.remove(post);
});
test('database rejection remains an error, never a successful save',async()=>{
 const {repository}=setup(()=>({status:403,body:{code:'42501',message:'denied'}}));
 await assert.rejects(repository.save(post,true),e=>e.code==='42501');
 assert.match(databaseMessage({code:'42501'}),/Acesso negado/);
 assert.match(databaseMessage({code:'PGRST205'}),/schema.sql/);
 assert.match(databaseMessage({code:'CONFLICT'}),/outra pessoa/);
});
