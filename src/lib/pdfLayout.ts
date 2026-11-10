/**
 * Maquetación del PDF: 2 tarjetas por página, lado a lado.
 *
 * Las tarjetas son verticales (diseñadas para móvil), así que dos columnas
 * aprovechan mucho mejor un A4 vertical que dos filas: cada tarjeta se
 * escala para caber en su columna sin deformarse y se alinea arriba.
 * Función pura (sin DOM) para poder testearla.
 */
export interface Box {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function layoutTwoUp(
  sizes: { width: number; height: number }[],
  page: { width: number; height: number; margin: number; gap: number; top?: number },
): Box[] {
  const top = page.top ?? page.margin;
  const colW = (page.width - 2 * page.margin - page.gap) / 2;
  const colH = page.height - top - page.margin;
  return sizes.map((s, i) => {
    const scale = Math.min(colW / s.width, colH / s.height);
    const w = s.width * scale;
    const h = s.height * scale;
    const col = i % 2;
    return {
      page: Math.floor(i / 2),
      x: page.margin + col * (colW + page.gap) + (colW - w) / 2,
      y: top,
      w,
      h,
    };
  });
}
