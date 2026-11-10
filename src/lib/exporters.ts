/**
 * Exportación a imagen (por tarjeta) y a PDF (informe completo).
 *
 * DECISIONES:
 *  - html-to-image (≈10 KB) en vez de html2canvas (≈45 KB): clona el DOM en
 *    un SVG <foreignObject>, respeta mejor fuentes y Tailwind v4.
 *  - jsPDF se carga con import() dinámico: ~350 KB que solo descarga quien
 *    pulsa "Descargar PDF".
 *  - PDF: portada dibujada en vectorial + 2 tarjetas por página (pdfLayout.ts).
 *  - Todo ocurre en el navegador: las imágenes nunca pasan por un servidor.
 *  - Antes de capturar, la UI activa `data-exporting="true"` en <html> (oculta
 *    botones y muestra la marca de agua) y el modo "nombres ocultos".
 */
import { toPng } from 'html-to-image';
import { layoutTwoUp } from './pdfLayout';

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

/** data:URL → Blob en local: no hace falta red (y la CSP tampoco dejaría pedir un data:). */
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Comparte con la hoja nativa del móvil si existe; si no, descarga. */
export async function shareOrDownload(dataUrl: string, filename: string) {
  try {
    const file = new File([dataUrlToBlob(dataUrl)], filename, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Mi informe de Longsaw' });
      return;
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return; // el usuario canceló la hoja de compartir
  }
  download(dataUrl, filename);
}

export interface PdfCover {
  title: string;
  subtitle: string;
  stats: [label: string, value: string][];
  split: { label: string; names: [string, string]; values: [number, number] };
  highlights: string[];
}

// Identidad: verdes de WhatsApp sobre crema.
const C = {
  dark: [7, 94, 84],
  teal: [18, 140, 126],
  green: [37, 211, 102],
  cream: [236, 229, 221],
  bubble: [217, 253, 211],
  ink: [17, 27, 33],
  purple: [123, 44, 191],
} as const;

/** Las fuentes estándar del PDF no tienen emojis: los quitamos. */
const pdfText = (s: string) =>
  s
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

type Pdf = InstanceType<(typeof import('jspdf'))['jsPDF']>;

const MARK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#075E54"/><path d="M256 86c-93 0-168 68-168 152 0 45 21 85 55 113l-14 61 70-31c17 5 36 8 57 8 93 0 168-68 168-151S349 86 256 86z" fill="#25D366"/><g fill="#075E54"><rect x="162" y="226" width="34" height="62" rx="12"/><rect x="239" y="168" width="34" height="120" rx="12"/><rect x="316" y="200" width="34" height="88" rx="12"/></g></svg>';

/** Logotipo (marca + "longsaw" en Fredoka, en blanco) como PNG para la portada. */
async function brandPng(): Promise<{ url: string; ratio: number } | null> {
  try {
    await document.fonts.load('600 200px "Fredoka Variable"');
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(MARK_SVG);
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, 512, 512);
    ctx.font = '600 230px "Fredoka Variable", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText('longsaw', 580, 262);
    const w = Math.ceil(580 + ctx.measureText('longsaw').width + 8);
    const out = document.createElement('canvas');
    out.width = w;
    out.height = 512;
    out.getContext('2d')!.drawImage(canvas, 0, 0);
    return { url: out.toDataURL('image/png'), ratio: w / 512 };
  } catch {
    return null;
  }
}

function drawCover(pdf: Pdf, cover: PdfCover, brand: { url: string; ratio: number } | null) {
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 16;
  const fill = (c: readonly number[]) => pdf.setFillColor(c[0], c[1], c[2]);
  const ink = (c: readonly number[]) => pdf.setTextColor(c[0], c[1], c[2]);

  // Fondo crema + bloque superior verde a sangre con dos círculos de acento.
  fill(C.cream);
  pdf.rect(0, 0, W, H, 'F');
  fill(C.dark);
  pdf.rect(0, 0, W, 118, 'F');
  fill(C.teal);
  pdf.circle(W - 18, 22, 46, 'F');
  fill(C.green);
  pdf.circle(W - 40, 100, 14, 'F');

  ink([255, 255, 255]);
  if (brand) {
    pdf.addImage(brand.url, 'PNG', M, 12, 11 * brand.ratio, 11);
  } else {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('longsaw', M, 22);
  }
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('INFORME DE CHAT', M, 31);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(38);
  const title = (pdf.splitTextToSize(pdfText(cover.title), W - 2 * M - 30) as string[]).slice(0, 2);
  pdf.text(title, M, 66, { lineHeightFactor: 1.05 });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(13);
  pdf.text(pdfText(cover.subtitle), M, 68 + title.length * 15);

  // Cifras clave en 4 bloques blancos.
  const top = 132;
  const gap = 5;
  const bw = (W - 2 * M - gap * 3) / 4;
  cover.stats.slice(0, 4).forEach(([label, value], i) => {
    const x = M + i * (bw + gap);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, top, bw, 30, 4, 4, 'F');
    ink(C.dark);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text(value, x + 5, top + 15);
    ink(C.ink);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(label, x + 5, top + 24);
  });

  // Reparto de mensajes: barra partida con los colores de cada persona.
  const sy = top + 46;
  const [v0, v1] = cover.split.values;
  const share0 = v0 / Math.max(1, v0 + v1);
  const barW = W - 2 * M;
  ink(C.ink);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(cover.split.label, M, sy);
  fill(C.purple);
  pdf.roundedRect(M, sy + 4, barW, 9, 4.5, 4.5, 'F');
  fill(C.dark);
  if (share0 > 0) pdf.roundedRect(M, sy + 4, Math.max(9, barW * share0), 9, 4.5, 4.5, 'F');
  if (share0 > 0.05 && share0 < 0.95) pdf.rect(M + barW * share0 - 4.5, sy + 4, 4.5, 9, 'F');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`${pdfText(cover.split.names[0])} · ${Math.round(share0 * 100)} %`, M, sy + 20);
  pdf.text(`${100 - Math.round(share0 * 100)} % · ${pdfText(cover.split.names[1])}`, W - M, sy + 20, { align: 'right' });

  // Lo más destacado: frases del informe en burbujas.
  let y = sy + 36;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Lo que notamos', M, y);
  y += 5;
  pdf.setFont('helvetica', 'normal');
  for (const h of cover.highlights) {
    const lines = pdf.splitTextToSize(pdfText(h), W - 2 * M - 14) as string[];
    const bh = lines.length * 5.2 + 7;
    if (y + bh > H - 22) break;
    fill(C.bubble);
    pdf.roundedRect(M, y, W - 2 * M, bh, 4, 4, 'F');
    ink(C.ink);
    pdf.setFontSize(11);
    pdf.text(lines, M + 7, y + 7.5);
    y += bh + 4;
  }

  ink(C.teal);
  pdf.setFontSize(8.5);
  pdf.text(
    'Generado en tu navegador: el chat no se ha subido a ningún sitio. Las lecturas son entretenimiento, no un diagnóstico.',
    M,
    H - 12,
    { maxWidth: W - 2 * M },
  );
}

export async function exportPdf(nodes: HTMLElement[], cover: PdfCover) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  drawCover(pdf, cover, await brandPng());

  const images: { png: string; width: number; height: number }[] = [];
  for (const node of nodes) {
    const png = await nodeToPng(node);
    const img = await loadImage(png);
    images.push({ png, width: img.width, height: img.height });
  }
  const boxes = layoutTwoUp(images, { width: W, height: H, margin: 10, gap: 6, top: 16 });
  let page = -1;
  boxes.forEach((b, i) => {
    if (b.page !== page) {
      pdf.addPage();
      page = b.page;
      pdf.setFillColor(C.cream[0], C.cream[1], C.cream[2]);
      pdf.rect(0, 0, W, H, 'F');
      pdf.setTextColor(C.dark[0], C.dark[1], C.dark[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('longsaw', 10, 10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(page + 2), W - 10, 10, { align: 'right' });
    }
    pdf.addImage(images[i].png, 'PNG', b.x, b.y, b.w, b.h, undefined, 'FAST');
  });
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
