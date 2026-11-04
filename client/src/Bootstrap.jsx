import {useCallback,useEffect,useState} from 'react';
import App from './App';import SchoolSetup from './SchoolSetup';
export default function Bootstrap(){
 const [status,setStatus]=useState(null),[error,setError]=useState('');
 const refresh=useCallback(async()=>{try{const r=await fetch('/api/setup/status',{cache:'no-store'}),data=await r.json();if(!r.ok)throw new Error(data.message||'Kurulum durumu alınamadı.');setStatus(data);setError('');}catch(e){setError(e.message);}},[]);
 useEffect(()=>{void Promise.resolve().then(refresh);},[refresh]);
 if(error)return <main className="panel m-8"><h1 className="text-xl font-bold">Sunucuya ulaşılamadı</h1><p>{error}</p><button className="action" onClick={refresh}>Tekrar dene</button></main>;
 if(!status)return <p role="status" className="p-8">Okul kurulumu kontrol ediliyor…</p>;
 if(!status.activated)return <SchoolSetup status={status} onActivated={refresh}/>;
 return <App deployment={status}/>;
}
