import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

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