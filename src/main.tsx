import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fuente autoalojada (npm) en vez de Google Fonts: ninguna petición a terceros.
import '@fontsource-variable/bricolage-grotesque';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
