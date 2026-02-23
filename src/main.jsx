import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'

registerSW({
    immediate: true,
    onNeedRefresh() {
        // Novo SW disponível + skipWaiting ativo → recarrega para aplicar
        window.location.reload()
    },
    onOfflineReady() {
        // silencioso – app pronto para uso offline
    },
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
