import React,{useEffect,useRef} from 'react';
import {Check,ChevronDown} from 'lucide-react';

export default function OptionPicker({value,options,onChange,label,icon,className = ''}) {
  const details=useRef(null);
  const trigger=useRef(null);

  useEffect(()=>{
    function dismiss(event){
      if(details.current&&!details.current.contains(event.target))details.current.open=false;
    }
    document.addEventListener('pointerdown',dismiss);
    document.addEventListener('focusin',dismiss);
    return ()=>{
      document.removeEventListener('pointerdown',dismiss);
      document.removeEventListener('focusin',dismiss);
    };
  },[]);

  const selected=options.find(option=>option.value===value);

  function close(){
    details.current.open=false;
    trigger.current.focus();
  }

  return <details className={`option-picker ${className}`} ref={details} onKeyDown={event=>{
    if(event.key==='Escape'&&details.current.open){
      event.preventDefault();
      close();
    }
  }}>
    <summary ref={trigger} aria-label={`${label}: ${selected.label}`}>
      {icon}
      <span>{selected.label}</span>
      <ChevronDown size={14} aria-hidden="true" className="option-chevron"/>
    </summary>
    <div className="picker-options" role="group" aria-label={label}>
      {options.map(option=><button key={option.value} type="button" aria-pressed={option.value===value}
        onClick={()=>{onChange(option.value);close()}}>
        <span>{option.label}</span>{option.value===value&&<Check size={14} aria-hidden="true"/>}
      </button>)}
    </div>
  </details>;
}
