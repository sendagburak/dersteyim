import {useCallback, useEffect, useRef, useState} from 'react';
import {makeDailyDraft, markStudent, markAllPresent} from './dailyAttendanceState';

const PERIODS=Array.from({length:8},(_,i)=>i+1);
const LABELS={GELDI:'Geldi',GELMEDI:'Gelmedi',GEC:'Geç',IZINLI:'İzinli'};
const BUTTONS=[['GELDI','Geldi','bg-emerald-700'],['GELMEDI','Gelmedi','bg-red-700'],['GEC','Geç','bg-amber-700'],['IZINLI','İzinli','bg-blue-700']];

export default function DailyAttendance({request,classes,periods,classId,onClassChange,date,onDateChange,today,downloadFile,onDirtyChange}) {
  const [selected,setSelected]=useState([1]);
  const [pupils,setPupils]=useState([]);
  const [byPeriod,setByPeriod]=useState({});
  const [dirty,setDirty]=useState(new Set());
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const baseline=useRef({});
  const sequence=useRef(0);
  useEffect(()=>{onDirtyChange(dirty.size>0);},[dirty.size,onDirtyChange]);
  useEffect(()=>()=>onDirtyChange(false),[onDirtyChange]);

  const load=useCallback(async()=>{
    const id=++sequence.current;
    if(!classId||!date){setPupils([]);setByPeriod({});baseline.current={};setDirty(new Set());return;}
    setLoading(true);
    try{
      const response=await request(`/api/attendance/daily/${classId}?date=${date}`);
      const data=await response.json();
      if(!response.ok||!data.success)throw new Error(data.message||'Öğrenci listesi alınamadı.');
      if(id!==sequence.current)return;
      const next=makeDailyDraft(data.periods);
      baseline.current=next;setByPeriod(next);setPupils(data.students);
      setDirty(new Set());
    }catch(error){if(id===sequence.current){setPupils([]);setByPeriod({});setMessage(error.message||'Yoklama listesi alınamadı.');}}
    finally{if(id===sequence.current)setLoading(false);}
  },[classId,date,request]);
  useEffect(()=>{void load();return()=>{sequence.current++;};},[load]);

  const changePeriod=(period,checked)=>{
    if(!checked && dirty.has(period)){
      if(!window.confirm(`${period}. dersteki kaydedilmemiş değişiklikler silinecek. Bu saatin seçimini kaldırmak istiyor musunuz?`))return;
      setByPeriod(prev=>({...prev,[period]:baseline.current[period]}));
      setDirty(prev=>{const next=new Set(prev);next.delete(period);return next;});
    }
    setSelected(prev=>checked?[...prev,period].sort((a,b)=>a-b):prev.filter(p=>p!==period));
  };
  const changeClassOrDate=(value,change)=>{
    if(dirty.size && !window.confirm('Kaydedilmemiş yoklama değişiklikleri silinecek. Devam etmek istiyor musunuz?'))return;
    setDirty(new Set());setMessage('');change(value);
  };
  const markStatus=(studentId,status)=>{
    setByPeriod(prev=>markStudent(prev,selected,studentId,status));
    setDirty(prev=>new Set([...prev,...selected]));
  };
  const handleMarkAllPresent=()=>{
    setByPeriod(prev=>markAllPresent(prev,selected));
    setDirty(prev=>new Set([...prev,...selected]));
  };
  const setNote=value=>{
    setByPeriod(prev=>{const next={...prev};for(const period of selected)if(prev[period])next[period]={...prev[period],note:value};return next;});
    setDirty(prev=>new Set([...prev,...selected]));
  };
  const save=async()=>{
    if(saving||loading||!selected.length||!pupils.length)return;
    setSaving(true);setMessage('');
    try{
      const entries=selected.map(period=>({period,records:byPeriod[period].records,note:byPeriod[period].note,expectedSavedTimestamp:byPeriod[period].version}));
      const response=await request('/api/attendance/save-batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId,date,periods:entries})});
      const result=await response.json();
      if(!response.ok||!result.success){setMessage(result.message||'Yoklama kaydedilemedi.');return;}
      setMessage(result.message);await load();setSelected([]);
    }catch{setMessage('Yoklama kaydedilemedi. Değişiklikleri kontrol edip tekrar deneyin.');}
    finally{setSaving(false);}
  };
  const notes=selected.map(period=>byPeriod[period]?.note||'');
  const commonNote=notes.length&&notes.every(note=>note===notes[0])?notes[0]:'';
  const busy=loading||saving;

  return <div className="space-y-4">
    <section className="panel space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <label className="grid gap-1 text-sm font-semibold">Sınıf / şube
          <select value={classId} disabled={busy} onChange={e=>changeClassOrDate(Number(e.target.value),onClassChange)}>
            {!classes.length&&<option value="">Sınıf bulunamadı</option>}
            {classes.map(c=><option key={c.id} value={c.id}>{c.name} ({c.academic_year})</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Yoklama tarihi
          <input type="date" value={date} max={today||undefined} disabled={busy} onChange={e=>changeClassOrDate(e.target.value,onDateChange)}/>
        </label>
        <button type="button" className="action" disabled={busy||!classId||!date||dirty.size>0} onClick={()=>downloadFile(`/api/attendance/export?classId=${classId}&start=${date}&end=${date}`,'yoklama.xlsx')}>Günlük Excel’i indir</button>
      </div>
      <fieldset disabled={busy}>
        <legend className="font-bold text-sm mb-2">Yoklaması alınacak ders saatleri</legend>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(period=>{const info=periods.find(p=>p.period===period),entry=byPeriod[period];return <label key={period} className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-sm ${selected.includes(period)?'border-blue-600 bg-blue-50 dark:bg-slate-700':'border-slate-300 dark:border-slate-600'}`}>
            <input className="attendance-period-checkbox" type="checkbox" checked={selected.includes(period)} onChange={e=>changePeriod(period,e.target.checked)}/>
            <span><strong>{period}. ders</strong><span className="block text-xs">{info?`${info.start_time}–${info.end_time}`:''} {entry?.saved?'· Kayıtlı':'· Kayıt yok'}</span></span>
          </label>;})}
        </div>
      </fieldset>
      <p className="text-sm">Bir veya birden fazla ders saati seçin. Öğrencinin durum düğmesi, o öğrenci için seçili saatlerin tümüne uygulanır. Diğer saatler değişmez. Yeni bir saat kaydedilirken işaretlenmeyen öğrenciler <strong>Geldi</strong> olarak kaydedilir. Excel yalnızca kaydedilmiş saatleri gösterir; değişiklik yaptıysanız indirmeden önce kaydedin.</p>
    </section>
    {message&&<p role="status" className="panel whitespace-pre-line">{message}</p>}
    {loading&&<p role="status">Günlük yoklama yükleniyor…</p>}
    <section className="panel space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Öğrenciler ({pupils.length})</h2><button type="button" className="border rounded-lg px-3 py-2 text-sm font-semibold" disabled={busy||!selected.length||!pupils.length} onClick={handleMarkAllPresent}>Seçili saatlerde tümünü geldi işaretle</button></div>
      {!selected.length&&<p className="text-sm">Devam etmek için en az bir ders saati seçin.</p>}
      {!loading&&!pupils.length&&<p className="text-sm">Bu sınıfta öğrenci bulunmuyor. Önce öğrenci ekleyin veya listeyi içe aktarın.</p>}
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {pupils.map(student=>{
          const eligible=selected.length>0&&selected.every(p=>byPeriod[p]&&Object.hasOwn(byPeriod[p].records,student.id));
          const statuses=eligible?selected.map(p=>byPeriod[p].records[student.id]):[];
          const current=statuses.length&&statuses.every(s=>s===statuses[0])?statuses[0]:null;
          return <div key={student.id} className="py-4 space-y-2">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div><strong>{student.student_no} · {student.masked_name}</strong>{statuses.length>0&&!current&&<span className="ml-2 text-sm text-amber-700 dark:text-amber-300">Seçili saatlerde durumlar farklı</span>}</div>
              <div className="flex flex-wrap gap-2">{BUTTONS.map(([status,label,color])=><button key={status} type="button" aria-pressed={current===status} disabled={busy||!eligible} onClick={()=>markStatus(student.id,status)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${current===status?color+' text-white':'bg-slate-100 dark:bg-slate-700'} disabled:opacity-50`}>{label}</button>)}</div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs" aria-label={`${student.student_no} günlük ders durumları`}>
              {PERIODS.map(period=>{const entry=byPeriod[period],hasStudent=entry&&Object.hasOwn(entry.records,student.id),recorded=hasStudent&&Object.hasOwn(entry.recorded,student.id),show=hasStudent&&(recorded||selected.includes(period)||dirty.has(period)),status=show?LABELS[entry.records[student.id]]:'Kayıt yok';return <span key={period} className="rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-1">{period}: {status}{show&&!recorded?' (yeni)':''}{dirty.has(period)?' *':''}</span>;})}
            </div>
            {selected.length>0&&!eligible&&<p className="text-xs">Bu öğrenci seçili saatlerin tamamında bulunmuyor; eski kaydını düzenlemek için ilgili saati tek seçin.</p>}
          </div>;
        })}
      </div>
      <label className="grid gap-1 text-sm font-semibold">Seçili dersler için ortak ders notu (isteğe bağlı)
        <input value={commonNote} disabled={busy||!selected.length} maxLength={2000} onChange={e=>setNote(e.target.value)} placeholder={notes.length>1&&!notes.every(note=>note===notes[0])?'Notlar farklı; değiştirilmezse korunur':'Dersin genel içeriği'}/>
      </label>
      <p className="text-xs">Öğrenci adı, sağlık bilgisi veya devamsızlık gerekçesi yazmayın. Excel’de her saatin genel ders notu ayrıca gösterilir. * işareti kaydedilmemiş değişikliği belirtir.</p>
      <button type="button" className="action" disabled={busy||!selected.length||!pupils.length} onClick={save}>{saving?'Kaydediliyor…':'Seçili derslerin yoklamasını kaydet'}</button>
    </section>
  </div>;
}
