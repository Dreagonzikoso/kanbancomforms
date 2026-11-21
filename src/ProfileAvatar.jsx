import React,{useState} from 'react';

function AvatarImage({photo}) {
  const [failed,setFailed]=useState(false);
  if(failed)return null;
  return <img src={photo} alt="" onError={()=>setFailed(true)}/>;
}

export default function ProfileAvatar({name,photo}) {
  const initials=name.trim().slice(0,2).toUpperCase() || '?';
  return <span className="avatar profile-avatar" aria-hidden="true">
    <span>{initials}</span>
    {photo&&<AvatarImage key={photo} photo={photo}/>}
  </span>;
}
