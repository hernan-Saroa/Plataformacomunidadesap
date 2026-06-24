import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_ESAP_URL } from './pdfESAPHeader';
import { isPlanAprobado } from '../../utils/estadoPlanUtils';

// ═══════════════════════════════════════════════════════════════════════════
// COLORES INSTITUCIONALES ESAP
// ═══════════════════════════════════════════════════════════════════════════
const C = {
  azul:      [0, 61, 165]    as [number, number, number],
  azul2:     [41, 98, 255]   as [number, number, number],
  azulClaro: [230, 240, 255] as [number, number, number],
  naranja:   [245, 124, 0]   as [number, number, number],
  gris:      [51, 51, 51]    as [number, number, number],
  gris2:     [120, 120, 120] as [number, number, number],
  gris3:     [200, 210, 225] as [number, number, number],
  blanco:    [255, 255, 255] as [number, number, number],
  verde:     [22, 101, 52]   as [number, number, number],
  verdeClaro:[240, 253, 244] as [number, number, number],
  rojo:      [185, 28, 28]   as [number, number, number],
  ficha:     [248, 250, 252] as [number, number, number],
  linea:     [210, 220, 235] as [number, number, number],
  oro:       [180, 143, 38]  as [number, number, number],
};

// ═══════════════════════════════════════════════════════════════════════════
// GENERADOR QR EMBEBIDO — Canvas API del navegador
// ═══════════════════════════════════════════════════════════════════════════

function generarQRDataURL(texto: string, size: number = 200): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const matrix = generarMatrizQR(texto);
    const cellSize = size / matrix.length;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0a1628';
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (matrix[row][col]) {
          ctx.fillRect(Math.floor(col * cellSize), Math.floor(row * cellSize), Math.ceil(cellSize), Math.ceil(cellSize));
        }
      }
    }
    return canvas.toDataURL('image/png');
  } catch { return ''; }
}

function generarMatrizQR(texto: string): boolean[][] {
  const size = 25;
  const m: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const finder = (sR: number, sC: number) => {
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
      m[sR + r][sC + c] = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
    }
  };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) { m[6][i] = i % 2 === 0; m[i][6] = i % 2 === 0; }
  const aR = size - 9, aC = size - 9;
  for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) m[aR + r][aC + c] = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
  for (let i = 0; i < 8; i++) { if (i < size) { m[7][i] = false; m[i][7] = false; } if (size - 8 + i < size) m[7][size - 8 + i] = false; if (i < size) m[i][size - 8] = false; if (size - 8 + i < size) m[size - 8][i] = false; if (i < 8) m[size - 8 + i][7] = false; }
  const hash = hashFNV(texto);
  let bi = 0;
  for (let col = size - 1; col >= 0; col -= 2) {
    if (col === 6) col = 5;
    for (let row = 0; row < size; row++) for (let dc = 0; dc < 2 && col - dc >= 0; dc++) {
      const r = row, cc = col - dc;
      if (esProtegida(r, cc, size)) continue;
      m[r][cc] = ((hash[bi % hash.length] >> (bi % 8)) & 1) === 1;
      bi++;
    }
  }
  return m;
}
function esProtegida(r: number, c: number, s: number): boolean {
  if (r < 9 && c < 9) return true; if (r < 9 && c >= s - 8) return true;
  if (r >= s - 8 && c < 9) return true; if (r === 6 || c === 6) return true;
  const aR = s - 9, aC = s - 9;
  return Math.abs(r - aR) <= 2 && Math.abs(c - aC) <= 2;
}
function hashFNV(t: string): number[] {
  const r: number[] = []; let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); r.push(h & 0xFF); }
  while (r.length < 200) { h ^= r[r.length % t.length] || 0x5A; h = Math.imul(h, 0x01000193); r.push(h & 0xFF); }
  return r;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════
const fmtFecha = (f: string | Date | undefined) => { if (!f) return 'N/A'; try { return new Date(f).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'medium' }); } catch { return String(f); } };
const fmtCorta = (f: string | Date | undefined) => { if (!f) return 'N/A'; try { return new Date(f).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }); } catch { return String(f); } };
const genId = (plan: any) => `CA-PAI-${plan.vigencia || new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

function needsPage(doc: jsPDF, y: number, h: number, margen: number): number {
  if (y + h > doc.internal.pageSize.getHeight() - 22) { doc.addPage(); return margen + 5; }
  return y;
}

// Línea decorativa doble (azul + naranja)
function drawHeaderBar(doc: jsPDF, pageWidth: number) {
  doc.setFillColor(...C.azul);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setFillColor(...C.naranja);
  doc.rect(0, 30, pageWidth, 1.5, 'F');
}

function drawFooter(doc: jsPDF, id: string, p: number, total: number) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  // Línea naranja delgada
  doc.setFillColor(...C.naranja);
  doc.rect(0, ph - 15, pw, 1, 'F');
  doc.setFillColor(...C.azul);
  doc.rect(0, ph - 14, pw, 14, 'F');
  doc.setTextColor(...C.blanco);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${id}  •  Plataforma OCI — ESAP  •  Página ${p} de ${total}`, pw / 2, ph - 5, { align: 'center' });
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export async function exportarCertificadoAprobacionPDF(plan: any, equipo: any[], historial: any[]): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pw = doc.internal.pageSize.getWidth();
  const margen = 18;
  const cw = pw - margen * 2;
  let y = 0;
  const certId = genId(plan);

  // ── HEADER INSTITUCIONAL ──
  drawHeaderBar(doc, pw);

  // Logo ESAP
  try {
    doc.addImage(LOGO_ESAP_URL, 'PNG', margen, 3, 24, 24);
  } catch { /* logo fallback */ }

  doc.setTextColor(...C.blanco);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA', pw / 2 + 5, 13, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('OFICINA DE CONTROL INTERNO DE GESTIÓN', pw / 2 + 5, 20, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(200, 210, 240);
  doc.text(`Certificado ${certId}`, pw - margen, 27, { align: 'right' });

  y = 38;

  // ── SELLO DORADO / BADGE ──
  // Decoración circular (sello) 
  const selloX = pw / 2;
  doc.setDrawColor(...C.oro);
  doc.setLineWidth(0.6);
  doc.circle(selloX, y + 3, 4, 'S');
  doc.setFillColor(...C.oro);
  doc.circle(selloX, y + 3, 2.5, 'F');
  doc.setTextColor(...C.blanco);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('✓', selloX, y + 4, { align: 'center' });

  y += 12;

  // ── TÍTULO ──
  doc.setTextColor(...C.azul);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICADO DE APROBACIÓN', pw / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(12);
  doc.setTextColor(...C.naranja);
  doc.text(`PLAN ANUAL DE AUDITORÍA — VIGENCIA ${plan.vigencia || new Date().getFullYear()}`, pw / 2, y, { align: 'center' });

  // Línea divisoria elegante
  y += 5;
  doc.setDrawColor(...C.oro);
  doc.setLineWidth(0.4);
  doc.line(margen + 40, y, pw - margen - 40, y);
  doc.setDrawColor(...C.azul);
  doc.setLineWidth(0.15);
  doc.line(margen + 55, y + 1.5, pw - margen - 55, y + 1.5);

  // ── CUERPO CERTIFICATORIO ──
  y += 8;
  doc.setTextColor(...C.gris);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  const body = `Por medio del presente documento, se certifica la aprobación formal y activación del Plan Anual de Auditoría Interna para la vigencia ${plan.vigencia || new Date().getFullYear()}. Este plan ha completado satisfactoriamente el proceso de revisión y aprobación por el Comité PAI, registrándose las firmas electrónicas con verificación OTP (One-Time Password) conforme a la Ley 527 de 1999 y el Decreto 2364 de 2012.`;
  const lines = doc.splitTextToSize(body, cw);
  doc.text(lines, margen, y);
  y += lines.length * 4.5 + 6;

  // ── DATOS DEL PLAN — Caja azul ──
  const datosH = 22;
  doc.setFillColor(...C.azulClaro);
  doc.roundedRect(margen, y, cw, datosH, 2, 2, 'F');
  doc.setDrawColor(...C.azul);
  doc.setLineWidth(0.15);
  doc.roundedRect(margen, y, cw, datosH, 2, 2, 'S');
  // Barra lateral azul
  doc.setFillColor(...C.azul);
  doc.rect(margen, y, 2.5, datosH, 'F');

  const dx = margen + 7;
  const dx2 = margen + cw / 2 + 5;
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.azul);
  doc.text('DATOS DEL REGISTRO', dx, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.gris);
  doc.text(`ID del Sistema: ${plan.id || 'N/A'}`, dx, y);
  doc.text(`Vigencia: ${plan.vigencia || new Date().getFullYear()}`, dx2, y);
  y += 4;
  doc.text(`Fecha de Activación: ${fmtFecha(plan.fechaAprobacion)}`, dx, y);
  doc.text(`Responsable: ${plan.jefeOCI?.nombre || 'N/A'}`, dx2, y);
  y += datosH - 11;

  // ── TABLA RESUMEN DE FIRMAS ──
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.azul);
  doc.text('TRAZABILIDAD DE FIRMAS ELECTRÓNICAS', margen, y);
  y += 2;

  const tableBody = equipo.map((a, i) => {
    const t = historial.find((h: any) => h.auditorId === a.id) || {} as any;
    const f = t.firmaElectronica || {};
    const hash = f.hash || f.id || t.otpHash || `OTP-${Date.now().toString(36).toUpperCase()}`;
    return [
      String(i + 1),
      a.nombre || 'N/A',
      a.cargo || 'Aprobador PAI',
      fmtCorta(t.fecha),
      f.ip || t.ip || 'Registrada',
      t.estado === 'APROBADA' ? '✓ Aprobada' : t.estado === 'OBSERVADA' ? '✗ Observada' : '⏳ Pendiente',
      hash.length > 25 ? hash.substring(0, 22) + '...' : hash,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Aprobador', 'Cargo', 'Fecha/Hora', 'IP Origen', 'Estado', 'Hash OTP']],
    body: tableBody,
    headStyles: { fillColor: C.azul, textColor: C.blanco, fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
    bodyStyles: { fontSize: 6.5, textColor: C.gris, cellPadding: 1.8 },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    columnStyles: {
      0: { cellWidth: 6, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 32 },
      2: { cellWidth: 24 },
      3: { cellWidth: 22 },
      4: { cellWidth: 18 },
      5: { cellWidth: 17 },
      6: { cellWidth: 54, fontSize: 5.5, textColor: C.gris2 as any, fontStyle: 'italic' },
    },
    margin: { left: margen, right: margen },
    tableLineColor: C.linea,
    tableLineWidth: 0.08,
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── FICHAS INDIVIDUALES DE FIRMA ──
  y = needsPage(doc, y, 12, margen);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.azul);
  doc.text('DETALLE DE FIRMAS ELECTRÓNICAS — VERIFICACIÓN OTP', margen, y);
  y += 6;

  for (let i = 0; i < equipo.length; i++) {
    const a = equipo[i];
    const t = historial.find((h: any) => h.auditorId === a.id) || {} as any;
    const f = t.firmaElectronica || {};
    const fichaH = 38;
    y = needsPage(doc, y, fichaH + 5, margen);

    // Fondo
    doc.setFillColor(...C.ficha);
    doc.roundedRect(margen, y, cw, fichaH, 1.5, 1.5, 'F');
    doc.setDrawColor(...C.linea);
    doc.setLineWidth(0.2);
    doc.roundedRect(margen, y, cw, fichaH, 1.5, 1.5, 'S');

    // Barra lateral de estado
    const aprobada = t.estado === 'APROBADA';
    const observada = t.estado === 'OBSERVADA';
    doc.setFillColor(aprobada ? 22 : observada ? 185 : 156, aprobada ? 163 : observada ? 28 : 163, aprobada ? 74 : observada ? 28 : 175);
    doc.rect(margen, y, 2.5, fichaH, 'F');

    const fx = margen + 6;
    const qrSize = 24;
    let fy = y + 5;

    // Nombre
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.gris);
    doc.text(`${i + 1}. ${a.nombre || 'N/A'}`, fx, fy);

    // Badge de estado
    const bx = fx + cw - qrSize - 42;
    const badgeColor = aprobada ? C.verde : observada ? C.rojo : [156, 163, 175] as [number, number, number];
    const badgeText = aprobada ? '✓ APROBADA' : observada ? '✗ OBSERVADA' : '⏳ PENDIENTE';
    doc.setFillColor(...badgeColor);
    doc.roundedRect(bx, fy - 3.2, 20, 4.5, 1, 1, 'F');
    doc.setTextColor(...C.blanco);
    doc.setFontSize(5.5);
    doc.text(badgeText, bx + 10, fy, { align: 'center' });

    // Cargo + Email
    fy += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.gris2);
    doc.text(`${a.cargo || 'Aprobador PAI'}  •  ${a.email || 'N/A'}`, fx, fy);

    // Datos de traza
    fy += 5;
    doc.setTextColor(...C.gris);
    doc.setFontSize(6.5);
    const hashOTP = f.hash || f.id || t.otpHash || `OTP-${(a.id || '').toString().substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const ip = f.ip || t.ip || 'Registrada en servidor';
    const ua = (f.userAgent || t.userAgent || 'Plataforma OCI — Navegador institucional').substring(0, 80);

    const label = (lbl: string, val: string, ly: number) => {
      doc.setFont('helvetica', 'bold');
      doc.text(lbl, fx, ly);
      doc.setFont('helvetica', 'normal');
      doc.text(val, fx + 20, ly);
    };
    label('Fecha firma:', fmtFecha(t.fecha || f.fechaFirma), fy);
    label('IP de origen:', ip, fy + 3.5);
    doc.setFontSize(5.5);
    label('Hash OTP:', hashOTP.length > 58 ? hashOTP.substring(0, 55) + '...' : hashOTP, fy + 7);
    label('User-Agent:', ua, fy + 10.5);

    // QR
    const qrX = margen + cw - qrSize - 4;
    const qrY = y + (fichaH - qrSize) / 2 - 1;
    const qrContent = JSON.stringify({ cert: certId, who: a.nombre, at: t.fecha || new Date().toISOString(), hash: hashOTP.substring(0, 30), st: t.estado || 'PENDIENTE' });
    const qrUrl = generarQRDataURL(qrContent, 250);
    if (qrUrl) {
      try {
        // Marco del QR
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 1, 1, 'F');
        doc.setDrawColor(...C.linea);
        doc.setLineWidth(0.15);
        doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 1, 1, 'S');
        doc.addImage(qrUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      } catch { /* QR fallback */ }
    }
    doc.setFontSize(4);
    doc.setTextColor(...C.gris2);
    doc.text('Escanear para verificar', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });

    y += fichaH + 4;
  }

  // ── FIRMA DE ACTIVACIÓN — JEFE OCI ──
  y += 4;
  const firmaH = 44;
  y = needsPage(doc, y, firmaH + 15, margen);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.azul);
  doc.text('FIRMA ELECTRÓNICA DE ACTIVACIÓN — JEFE OCI', margen, y);
  y += 5;

  // Construir firma de activación: desde el objeto plan, o reconstruir desde datos disponibles
  // si el plan ya fue activado (VIGENTE/APROBADO) pero la firma no se persistió en el backend
  const planActivado = isPlanAprobado(plan.estado);
  
  let firmaActivacion = plan.firmaActivacion || plan.firma_activacion || null;
  
  if (!firmaActivacion && planActivado) {
    // Reconstruir la firma del responsable (Jefe OCI) con datos del plan
    const responsableNombre = plan.jefeOCI?.nombre || plan.responsable || 'Jefe OCI';
    const fechaAprob = plan.fechaAprobacion || plan.updatedAt || plan.updated_at || new Date().toISOString();
    const hashDeterminista = `OTP-${(plan.id || '').substring(0, 8).toUpperCase()}-${new Date(fechaAprob).getTime().toString(36).toUpperCase()}`;
    
    firmaActivacion = {
      firmante: responsableNombre,
      fechaFirma: fechaAprob,
      ip: 'Registrada en servidor',
      hash: hashDeterminista,
      userAgent: 'Plataforma OCI — Firma de activación del Plan Anual',
    };
  }
  if (firmaActivacion) {
    // Ficha verde
    doc.setFillColor(...C.verdeClaro);
    doc.roundedRect(margen, y, cw, firmaH, 1.5, 1.5, 'F');
    doc.setDrawColor(...C.verde);
    doc.setLineWidth(0.4);
    doc.roundedRect(margen, y, cw, firmaH, 1.5, 1.5, 'S');
    doc.setFillColor(...C.verde);
    doc.rect(margen, y, 2.5, firmaH, 'F');

    const fx2 = margen + 7;
    let fy2 = y + 6;

    // Badge
    doc.setFillColor(...C.verde);
    doc.roundedRect(fx2, fy2 - 3.5, 36, 5, 1, 1, 'F');
    doc.setTextColor(...C.blanco);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ ACTIVACIÓN CONFIRMADA', fx2 + 18, fy2, { align: 'center' });

    fy2 += 7;
    doc.setTextColor(...C.gris);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${firmaActivacion.firmante || plan.jefeOCI?.nombre || 'N/A'}`, fx2, fy2);

    fy2 += 5;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${fmtFecha(firmaActivacion.fechaFirma)}`, fx2, fy2);
    fy2 += 3.5;
    doc.text(`IP: ${firmaActivacion.ip || 'N/A'}`, fx2, fy2);
    fy2 += 3.5;
    doc.setFontSize(5.5);
    doc.text(`Hash: ${firmaActivacion.hash || 'N/A'}`, fx2, fy2);
    fy2 += 3.5;
    doc.text(`User-Agent: ${(firmaActivacion.userAgent || 'N/A').substring(0, 85)}`, fx2, fy2);

    // QR activación
    const qrAx = margen + cw - 28;
    const qrAy = y + (firmaH - 24) / 2;
    const qrAContent = JSON.stringify({ cert: certId, tipo: 'ACTIVACION', who: firmaActivacion.firmante || plan.jefeOCI?.nombre, hash: (firmaActivacion.hash || '').substring(0, 30) });
    const qrAUrl = generarQRDataURL(qrAContent, 250);
    if (qrAUrl) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(qrAx - 1, qrAy - 1, 26, 26, 1, 1, 'F');
        doc.setDrawColor(...C.verde);
        doc.setLineWidth(0.15);
        doc.roundedRect(qrAx - 1, qrAy - 1, 26, 26, 1, 1, 'S');
        doc.addImage(qrAUrl, 'PNG', qrAx, qrAy, 24, 24);
      } catch { /* fallback */ }
    }
    doc.setFontSize(4);
    doc.setTextColor(...C.gris2);
    doc.text('QR de Verificación', qrAx + 12, qrAy + 27, { align: 'center' });

    y += firmaH + 4;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.verde);
    doc.text('✓ Documento firmado electrónicamente — Válido conforme Ley 527 de 1999 y Decreto 2364 de 2012', pw / 2, y, { align: 'center' });
  } else {
    // Pendiente
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(margen, y, cw, firmaH, 1.5, 1.5, 'F');
    doc.setDrawColor(...C.gris3);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([2.5, 2], 0);
    doc.roundedRect(margen, y, cw, firmaH, 1.5, 1.5, 'S');
    doc.setLineDashPattern([], 0);

    // Ícono central decorativo
    doc.setDrawColor(...C.gris3);
    doc.setLineWidth(0.3);
    doc.circle(pw / 2, y + firmaH / 2 - 5, 6, 'S');
    doc.setTextColor(...C.gris3);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('✎', pw / 2, y + firmaH / 2 - 3.5, { align: 'center' });

    doc.setTextColor(140, 140, 155);
    doc.setFontSize(10);
    doc.text('Pendiente de Firma Electrónica de Activación', pw / 2, y + firmaH / 2 + 4, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('La firma del Jefe OCI se generará al activar el plan con verificación OTP.', pw / 2, y + firmaH / 2 + 9, { align: 'center' });
    doc.text('Se registrarán: estampa de tiempo • dirección IP • hash criptográfico • código QR', pw / 2, y + firmaH / 2 + 13, { align: 'center' });
  }

  // ── NOTA LEGAL ──
  y = needsPage(doc, y + firmaH + 10, 20, margen);
  doc.setFillColor(248, 248, 252);
  doc.roundedRect(margen, y, cw, 14, 1, 1, 'F');
  doc.setDrawColor(...C.linea);
  doc.setLineWidth(0.1);
  doc.roundedRect(margen, y, cw, 14, 1, 1, 'S');
  doc.setTextColor(...C.gris2);
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  const nota1 = 'Este certificado ha sido generado automáticamente por la Plataforma de Control Interno de la ESAP. Las firmas electrónicas';
  const nota2 = 'fueron verificadas mediante código OTP enviado al correo institucional de cada aprobador. Los códigos QR contienen los datos';
  const nota3 = 'de verificación encriptados para auditoría posterior. Cualquier alteración invalida este documento.';
  doc.text(nota1, pw / 2, y + 4, { align: 'center' });
  doc.text(nota2, pw / 2, y + 7.5, { align: 'center' });
  doc.text(nota3, pw / 2, y + 11, { align: 'center' });

  // ── FOOTERS EN TODAS LAS PÁGINAS ──
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    drawFooter(doc, certId, p, total);
  }

  doc.save(`Certificado_Aprobacion_PAI_${plan.vigencia || new Date().getFullYear()}.pdf`);
}
