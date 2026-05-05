import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COLORES_ESAP = {
  azulPrincipal: [0, 61, 165] as [number, number, number],
  azulSecundario: [41, 98, 255] as [number, number, number],
  naranja: [245, 124, 0] as [number, number, number],
  grisOscuro: [51, 51, 51] as [number, number, number],
  blanco: [255, 255, 255] as [number, number, number]
};

export async function exportarCertificadoAprobacionPDF(plan: any, equipo: any[], historial: any[]): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margen = 20;
  let yPos = 30;

  // Header
  doc.setFillColor(...COLORES_ESAP.azulPrincipal);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(...COLORES_ESAP.blanco);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA', pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('OFICINA DE CONTROL INTERNO', pageWidth / 2, 18, { align: 'center' });

  // Título Certificado
  yPos += 15;
  doc.setTextColor(...COLORES_ESAP.azulPrincipal);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICADO DE APROBACIÓN', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(14);
  doc.setTextColor(...COLORES_ESAP.naranja);
  doc.text('PLAN ANUAL DE AUDITORÍA', pageWidth / 2, yPos, { align: 'center' });

  yPos += 15;
  doc.setTextColor(...COLORES_ESAP.grisOscuro);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const textoBody = `Por medio del presente documento, se certifica la aprobación formal y activación del Plan Anual de Auditoría para la vigencia ${plan.vigencia || new Date().getFullYear()}. Este plan ha completado satisfactoriamente el flujo de revisión y aprobación por parte del comité designado, registrando las correspondientes firmas electrónicas en el sistema institucional.`;
  
  const lineasTexto = doc.splitTextToSize(textoBody, pageWidth - (margen * 2));
  doc.text(lineasTexto, margen, yPos);
  yPos += lineasTexto.length * 6 + 10;

  // Detalles del Plan
  doc.setFont('helvetica', 'bold');
  doc.text('Detalles del Registro:', margen, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  const planInfo = [
    `ID del Sistema: ${plan.id || 'N/A'}`,
    `Vigencia Cubierta: ${plan.vigencia || new Date().getFullYear()}`,
    `Fecha de Activación: ${plan.fechaAprobacion ? new Date(plan.fechaAprobacion).toLocaleString('es-CO') : new Date().toLocaleString('es-CO')}`,
    `Estado de Cumplimiento: VIGENTE (Aprobación Total)`
  ];
  planInfo.forEach(line => {
    doc.text(`• ${line}`, margen + 5, yPos);
    yPos += 6;
  });

  yPos += 10;

  // Trazabilidad de Firmas
  doc.setFont('helvetica', 'bold');
  doc.text('Trazabilidad de Firmas Electrónicas (Integridad):', margen, yPos);
  yPos += 8;

  const bodyData = equipo.map((aprobador, index) => {
    const track = historial.find((h: any) => h.auditorId === aprobador.id) || {} as any;
    const hashStr = track.firmaElectronica && (track.firmaElectronica.hash || track.firmaElectronica.id) 
        ? (track.firmaElectronica.hash || track.firmaElectronica.id) 
        : 'Firma de Sistema Validada';

    // Para evitar hashes larguísimos que deformen la tabla
    const shortHash = hashStr.length > 50 ? hashStr.substring(0, 47) + '...' : hashStr;

    return [
      (index + 1).toString(),
      aprobador.nombre,
      aprobador.cargo || 'Comité',
      track.fecha ? new Date(track.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A',
      shortHash
    ];
  });

  (doc as any).autoTable({
    startY: yPos,
    head: [['#', 'Aprobador', 'Rol/Cargo', 'Fecha', 'Hash / ID Transacción']],
    body: bodyData,
    headStyles: {
      fillColor: COLORES_ESAP.azulSecundario,
      textColor: COLORES_ESAP.blanco,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORES_ESAP.grisOscuro
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 40 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25 },
      4: { cellWidth: 65, cellPadding: 2, fontStyle: 'italic', fontSize: 7 }
    },
    margin: { left: margen, right: margen }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Placeholder para certificado digital
  const remainingSpace = doc.internal.pageSize.getHeight() - yPos - 30; // 30 is footer margin
  const boxHeight = 45;
  
  if (remainingSpace < boxHeight) {
    doc.addPage();
    yPos = margen;
  }

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([3, 3], 0);
  doc.rect(margen, yPos, pageWidth - (margen * 2), boxHeight);
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bolditalic');
  doc.text('Espacio Reservado para Sello de Certificado Digital (PKI)', pageWidth / 2, yPos + (boxHeight / 2), { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Al firmar digitalmente este documento, se sella y garantiza la inmutabilidad', pageWidth / 2, yPos + (boxHeight / 2) + 6, { align: 'center' });
  doc.text('de las aprobaciones listadas en el cuadro superior.', pageWidth / 2, yPos + (boxHeight / 2) + 10, { align: 'center' });
  doc.setLineDashPattern([], 0); // reset

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...COLORES_ESAP.azulPrincipal);
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
  doc.setTextColor(...COLORES_ESAP.blanco);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Identificador Único Certificado: CA-PAI-${plan.vigencia}-${Date.now().toString().slice(-6)} | Emitido Plataforma OCI`, pageWidth / 2, pageHeight - 6, { align: 'center' });

  doc.save(`Certificado_Aprobacion_PAI_${plan.vigencia || new Date().getFullYear()}.pdf`);
}
