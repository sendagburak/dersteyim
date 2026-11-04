import {useState} from 'react';
export default function SchoolRecovery(){
 const [message,setMessage]=useState('');
 const open=async()=>{setMessage('');try{const r=await fetch('/api/setup/open-credentials',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),d=await r.json();setMessage(d.message||'Klasör açıldı.');}catch{setMessage('Klasör açılamadı. Belgeler/Dersteyim klasörünü elle açın.');}};
 return <div className="mt-4 text-sm"><button type="button" className="underline" onClick={open}>Şifremi unuttum</button>{message&&<p role="status" className="mt-2">{message}</p>}</div>;
}
