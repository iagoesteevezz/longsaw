/**
 * Exportación a imagen (por tarjeta) y a PDF (informe completo).
 *
 * DECISIONES:
 *  - html-to-image (≈10 KB) en vez de html2canvas (≈45 KB): clona el DOM en
 *    un SVG <foreignObject>, respeta mejor fuentes y Tailwind v4.
 *  - jsPDF se carga con import() dinámico: ~350 KB que solo descarga quien
 *    pulsa "Descargar PDF".
 *  - Todo ocurre en el navegador: las imágenes nunca pasan por un servidor.
 *  - Antes de capturar, la UI activa `data-exporting="true"` en <html> (oculta
 *    botones y muestra la marca de agua) y el modo "nombres ocultos".
 */
import { toPng } from 'html-to-image';

const PIXEL_RATIO = 2;

export async function nodeToPng(node: HTMLElement): Promise<string> {
  return toPng(node, {
    pixelRatio: PIXEL_RATIO,
    cacheBust: true,
    // OJO: no usar `backgroundColor`: html-to-image lo aplica al nodo raíz y
    // taparía el color pastel de la tarjeta. Las esquinas quedan transparentes.
    style: { margin: '0', transform: 'none', animation: 'none', opacity: '1' },
  });
}

function download(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/** Comparte con la hoja nativa del móvil si existe; si no, descarga. */
export async function shareOrDownload(dataUrl: string, filename: string) {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Mi informe de Longsaw' });
      return;
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return; // el usuario canceló la hoja de compartir
  }
  download(dataUrl, filename);
}

export async function exportPdf(nodes: HTMLElement[], title: string) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 12;

  // Portada sencilla (texto vectorial).
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(30);
  pdf.text('Longsaw', M, 40);
  pdf.setFontSize(16);
  pdf.text(title, M, 52, { maxWidth: W - 2 * M });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(
    'Informe generado en tu navegador. Las lecturas psicológicas son entretenimiento, no un diagnóstico.',
    M,
    H - 20,
    { maxWidth: W - 2 * M },
  );

  let y = H; // fuerza página nueva en la primera tarjeta
  for (const node of nodes) {
    const png = await nodeToPng(node);
    const img = await loadImage(png);
    const w = W - 2 * M;
    let h = (img.height / img.width) * w;
    let drawW = w;
    if (h > H - 2 * M) {
      // Tarjeta más alta que una página: la escalamos para que quepa entera.
      drawW = (w * (H - 2 * M)) / h;
      h = H - 2 * M;
    }
    if (y + h > H - M) {
      pdf.addPage();
      y = M;
    }
    pdf.addImage(png, 'PNG', M + (w - drawW) / 2, y, drawW, h, undefined, 'FAST');
    y += h + 6;
  }
  pdf.save('longsaw-informe.pdf');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

export { download };
