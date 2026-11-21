import React,{useEffect,useRef,useState} from 'react';
import {supabase} from './supabase';
import ProfileAvatar from './ProfileAvatar';

const imageTypes=['image/jpeg','image/png','image/webp'];

async function preparePhoto(file) {
  if(!imageTypes.includes(file.type)||file.size>5*1024*1024){
    throw new Error('Escolha uma imagem JPG, PNG ou WebP de até 5 MB.');
  }

  let image;
  try{
    image=await createImageBitmap(file);
    const size=Math.min(image.width,image.height);
    const canvas=document.createElement('canvas');
    canvas.width=128;
    canvas.height=128;
    const context=canvas.getContext('2d',{alpha:false});
    context.fillStyle='#242925';
    context.fillRect(0,0,128,128);
    context.drawImage(image,(image.width-size)/2,(image.height-size)/2,size,size,0,0,128,128);
    return canvas.toDataURL('image/jpeg',0.82);
  }catch{
    throw new Error('Não foi possível abrir essa imagem. Escolha outro arquivo.');
  }finally{
    image?.close();
  }
}

export default function ProfilePhoto({identity,onSaved,onClose}) {
  const dialog=useRef(null);
  const [photo,setPhoto]=useState(identity.photo);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{dialog.current.showModal()},[]);

  function close(){
    dialog.current.close();
    onClose();
  }

  async function selectPhoto(event){
    const file=event.target.files[0];
    event.target.value='';
    if(!file)return;
    setWorking(true);
    setError('');
    try{
      setPhoto(await preparePhoto(file));
    }catch(error){
      setError(error.message);
    }finally{
      setWorking(false);
    }
  }

  async function save(event){
    event.preventDefault();
    if(working)return;
    setWorking(true);
    setError('');
    try{
      const {error}=await supabase.rpc('set_my_avatar',{photo:photo ?? null});
      if(error)throw error;
      onSaved(photo);
      close();
    }catch{
      setError('Não foi possível salvar a foto. Tente novamente.');
      setWorking(false);
    }
  }

  return <dialog className="modal photo-dialog" ref={dialog} aria-labelledby="photo-title"
    onCancel={event=>{event.preventDefault();if(!working)close()}}>
    <h2 id="photo-title">Foto de perfil</h2>
    <form onSubmit={save}>
      <div className="photo-preview"><ProfileAvatar name={identity.username} photo={photo}/></div>
      <label>Escolher imagem
        <input type="file" accept={imageTypes.join(',')} onChange={selectPhoto} disabled={working}/>
        <small>JPG, PNG ou WebP de até 5 MB.</small>
      </label>
      {error&&<p role="alert" className="error">{error}</p>}
      <div className="modal-actions">
        {photo&&<button type="button" className="delete" onClick={()=>setPhoto(null)} disabled={working}>Remover foto</button>}
        <button type="button" className="secondary" onClick={close} disabled={working}>Cancelar</button>
        <button type="submit" className="primary" disabled={working||photo===identity.photo}>Salvar foto</button>
      </div>
    </form>
  </dialog>;
}
