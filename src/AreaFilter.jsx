import React,{useEffect,useRef} from 'react';
import {Check,ChevronDown,SlidersHorizontal} from 'lucide-react';

export default function AreaFilter({value,options,onChange}) {
  const details=useRef(null);
  const trigger=useRef(null);

  useEffect(()=>{
    function dismiss(event){
      if(!details.current.contains(event.target))details.current.open=false;
    }
    document.addEventListener('pointerdown',dismiss);
    document.addEventListener('focusin',dismiss);
    return ()=>{
      document.removeEventListener('pointerdown',dismiss);
      document.removeEventListener('focusin',dismiss);
    };
  },[]);

  function close(){
    details.current.open=false;
    trigger.current.focus();
  }

  return <details className="area-picker" ref={details} onKeyDown={event=>{
    if(event.key==='Escape'&&details.current.open){
      event.preventDefault();
      close();
    }
  }}>
    <summary ref={trigger} aria-label={`Filtrar por área: ${value}`}>
      <SlidersHorizontal size={15} aria-hidden="true"/>
      <span>{value}</span>
      <ChevronDown size={14} aria-hidden="true" className="area-chevron"/>
    </summary>
    <div className="area-options" role="group" aria-label="Áreas do CAVC">
      {options.map(option=><button key={option} type="button" aria-pressed={option===value}
        onClick={()=>{onChange(option);close()}}>
        <span>{option}</span>{option===value&&<Check size={14} aria-hidden="true"/>}
      </button>)}
    </div>
  </details>;
}
