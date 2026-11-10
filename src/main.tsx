import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fuente autoalojada (npm) en vez de Google Fonts: ninguna petición a terceros.
import '@fontsource-variable/bricolage-grotesque';
import './index.css';
import App from './App';

// Las animaciones de entrada solo ocultan contenido si hay JS y el usuario no
// pidió menos movimiento: sin esta clase todo se ve en su estado final.
const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const syncMotion = () => document.documentElement.classList.toggle('motion', !reduce?.matches);
syncMotion();
reduce?.addEventListener?.('change', syncMotion);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
