import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { iniciarSincronizacao } from '@/lib/sincronizacao'
import { queryClientInstance } from '@/lib/query-client'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// guarda tudo no aparelho e envia o que foi feito sem internet assim que houver conexão
iniciarSincronizacao(queryClientInstance)

// Mantém o app disponível sem conexão (shell e recursos já visitados)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    // Baixa as outras páginas em segundo plano para que abram mesmo sem conexão
    setTimeout(() => {
      Object.values(import.meta.glob("./pages/*.jsx")).forEach((carregar) => carregar().catch(() => {}));
    }, 4000);
  });
}