// Aplica el tema antes de pintar la página (sin destello blanco en modo oscuro).
// Es un archivo aparte y no un <script> inline porque la CSP no permite scripts inline.
// La lógica completa está en src/lib/theme.ts; la clave debe coincidir.
(function () {
  var t = null;
  try {
    t = localStorage.getItem('longsaw-theme');
  } catch (e) {}
  var dark = t ? t === 'dark' : window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.classList.add('dark');
})();
