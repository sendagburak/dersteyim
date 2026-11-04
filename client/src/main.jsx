import React, {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import Bootstrap from './Bootstrap.jsx'
class ErrorBoundary extends React.Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error){console.error('VarYok arayüz hatası:',error);}
  render(){if(this.state.failed)return <main className="panel m-6"><h1 className="text-xl font-bold">Ekran yüklenemedi</h1><p>Sayfayı yenileyin. Sorun sürerse sunucu günlüğünü kontrol edin.</p><button className="action mt-4" onClick={()=>location.reload()}>Yenile</button></main>;return this.props.children;}
}
createRoot(document.getElementById('root')).render(<StrictMode><ErrorBoundary><Bootstrap/></ErrorBoundary></StrictMode>)
