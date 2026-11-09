/**
 * Página de privacidad en lenguaje claro. Debe mantenerse sincronizada con el
 * comportamiento real del código (ver docs/ARCHITECTURE.md §Privacidad).
 */
export function PrivacyPage({ onBack }: { onBack: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-5 pb-16 pt-8">
      <button type="button" onClick={onBack} className="rounded-full bg-white px-4 py-2 text-sm font-bold">← Volver</button>
      <h1 className="mt-6 text-5xl font-extrabold leading-none">Privacidad, en claro</h1>

      <Block color="bg-card-green" title="Tu chat no sale de tu dispositivo">
        El archivo se lee y se analiza dentro de tu navegador (en un Web Worker). No hay subida a ningún servidor. Puedes comprobarlo
        en la pestaña “Red” de las herramientas de desarrollador: al analizar no se hace ninguna petición.
      </Block>
      <Block color="bg-card-yellow" title="No guardamos nada salvo que lo pidas">
        Si cierras la pestaña, todo desaparece. Solo si pulsas “Guardar en este dispositivo” guardamos el informe (estadísticas y
        algunas frases citadas, nunca el chat entero) en el almacenamiento local de tu navegador. El botón “Borrar todo” lo elimina
        y destruye el proceso que tenía el chat en memoria.
      </Block>
      <Block color="bg-card-blue" title="La IA es opcional y ves lo que se envía">
        Solo si lo aceptas, enviamos a nuestro servidor un resumen de números y como mucho unas 20 frases cortas, con nombres,
        teléfonos, emails, enlaces, DNI e IBAN sustituidos. Antes de enviar ves el contenido exacto y puedes quitar frases. Nuestro
        servidor lo reenvía a Anthropic (Claude) para generar la interpretación y no lo guarda ni lo registra. Anthropic no usa
        los datos enviados por API para entrenar modelos.
      </Block>
      <Block color="bg-card-pink" title="Sin rastreadores">
        No usamos cookies, analíticas, píxeles ni fuentes o scripts de terceros.
      </Block>
      <Block color="bg-card-lavender" title="Sobre la otra persona">
        Un chat también es de la otra persona. Úsalo con cabeza: comparte tarjetas con los nombres ocultos (viene así por defecto)
        y no publiques mensajes suyos sin su permiso.
      </Block>
      <Block color="bg-card-stone" title="Lo que es (y no es) el informe">
        Las estadísticas son exactas sobre el archivo. “Visto”, “posible bloqueo”, “nivel de interés” y los estilos son
        estimaciones y lecturas de entretenimiento basadas en tiempos y textos, no un diagnóstico ni una verdad sobre nadie.
      </Block>
    </main>
  );
}

function Block({ color, title, children }: { color: string; title: string; children: React.ReactNode }) {
  return (
    <section className={`mt-5 rounded-[2rem] ${color} p-6`}>
      <h2 className="text-xl font-extrabold">{title}</h2>
      <p className="mt-2 font-semibold leading-snug opacity-85">{children}</p>
    </section>
  );
}
