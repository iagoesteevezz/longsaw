/**
 * Portada + subida del archivo. El archivo se lee con FileReader/arrayBuffer
 * y se transfiere al Worker: no hay <form> ni petición de red.
 */
import { useRef, useState } from 'react';
import type { Saved } from '../lib/storage';

export function UploadPage(props: {
  onFile: (buf: ArrayBuffer) => void;
  onDemo: () => void;
  saved: Saved | null;
  onOpenSaved: () => void;
  error: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    props.onFile(await file.arrayBuffer());
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-10 pt-8">
      <header className="flex items-center justify-between">
        <span className="text-xl font-extrabold">💬 longsaw</span>
        <a href="#/privacidad" className="rounded-full bg-white px-4 py-2 text-sm font-bold">Privacidad</a>
      </header>

      <section className="mt-10">
        <h1 className="text-[3.2rem] font-extrabold leading-[0.92] tracking-tight sm:text-7xl">
          ¿Qué dice <span className="rounded-2xl bg-card-pink px-2">vuestro chat</span> de vosotros?
        </h1>
        <p className="mt-5 text-lg font-semibold leading-snug opacity-80">
          Sube un chat exportado de WhatsApp y te devolvemos un informe con quién escribe más, quién tarda en contestar, quién
          inicia, red flags y más. <b>Todo se analiza en tu navegador.</b>
        </p>
      </section>

      {props.error && (
        <div role="alert" className="mt-6 rounded-3xl bg-card-red p-5 font-bold">{props.error}</div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files[0]);
        }}
        className={`mt-8 rounded-[2rem] border-[3px] border-dashed border-ink/30 p-8 text-center transition ${drag ? 'scale-[1.02] bg-card-yellow' : 'bg-white'}`}
      >
        <p className="text-5xl" aria-hidden>📂</p>
        <p className="mt-3 text-xl font-extrabold">Arrastra aquí tu .txt o .zip</p>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="mt-5 w-full rounded-full bg-ink px-6 py-4 text-lg font-extrabold text-white transition hover:scale-[1.02] active:scale-95"
        >
          Elegir archivo
        </button>
        <input
          ref={input}
          type="file"
          accept=".txt,.zip,text/plain,application/zip"
          className="sr-only"
          onChange={(e) => handle(e.target.files?.[0])}
          aria-label="Archivo de chat exportado de WhatsApp"
        />
        <button type="button" onClick={props.onDemo} className="mt-3 w-full rounded-full bg-card-lavender px-6 py-3 font-bold">
          Probar con un chat de ejemplo
        </button>
        {props.saved && (
          <button type="button" onClick={props.onOpenSaved} className="mt-3 w-full rounded-full bg-card-green px-6 py-3 font-bold">
            Abrir el informe que guardaste
          </button>
        )}
      </div>

      <section className="mt-8 grid gap-3">
        <Step n={1} t="Abre el chat en WhatsApp" d="Solo chats entre dos personas (los grupos llegarán más adelante)." />
        <Step n={2} t="Menú ⋮ / nombre del contacto → Más → Exportar chat" d="Elige “Sin archivos multimedia”: es más rápido y no lo necesitamos." />
        <Step n={3} t="Guárdalo y súbelo aquí" d="Funciona con el .zip de iPhone y el .txt de Android, en español o inglés." />
      </section>

      <section className="mt-8 rounded-[2rem] bg-card-green p-6">
        <p className="text-lg font-extrabold">🔒 Tu chat no sale de este dispositivo</p>
        <p className="mt-2 font-semibold leading-snug opacity-80">
          No lo subimos a ningún servidor ni lo guardamos. La interpretación con IA es opcional: te enseñamos exactamente qué
          fragmentos anonimizados se enviarían y decides tú.
        </p>
      </section>
    </main>
  );
}

function Step({ n, t, d }: { n: number; t: string; d: string }) {
  return (
    <div className="flex gap-4 rounded-3xl bg-white p-4">
      <span className="num grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card-yellow text-xl">{n}</span>
      <div>
        <p className="font-extrabold leading-tight">{t}</p>
        <p className="mt-1 text-sm font-semibold opacity-70">{d}</p>
      </div>
    </div>
  );
}
