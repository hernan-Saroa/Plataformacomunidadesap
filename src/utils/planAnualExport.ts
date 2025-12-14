/**
 * UTILIDADES DE EXPORTACIÓN - PLAN ANUAL DE AUDITORÍA
 * Exporta el Plan Anual a Excel y PDF con formato profesional
 */

import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface Actividad {
  id: string;
  nombre: string;
  descripcion: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'pendiente' | 'en-progreso' | 'completada' | 'retrasada';
  porcentajeAvance: number;
  observaciones: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
}

interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  color: string;
  actividades: Actividad[];
  porcentajeCumplimiento: number;
}

interface PlanAnual {
  añoFiscal: number;
  fechaCreacion: string;
  responsable: string;
  estado: 'borrador' | 'aprobado' | 'en-ejecucion' | 'completado';
  roles: Rol[];
}

// ============ FUNCIONES DE EXPORTACIÓN ============

/**
 * Exporta el Plan Anual a formato Excel (CSV compatible)
 */
export function exportarPlanAnualExcel(planAnual: PlanAnual): void {
  try {
    // Preparar datos para CSV
    const csvRows: string[] = [];

    // Encabezado del documento
    csvRows.push(`PLAN ANUAL DE AUDITORÍA ${planAnual.añoFiscal}`);
    csvRows.push(`Basado en los 5 roles del Decreto 648 de 2017`);
    csvRows.push(`Estado: ${planAnual.estado}`);
    csvRows.push(`Responsable: ${planAnual.responsable}`);
    csvRows.push(`Fecha de creación: ${new Date(planAnual.fechaCreacion).toLocaleDateString('es-CO')}`);
    csvRows.push(''); // Línea vacía

    // Métricas generales
    const totalActividades = planAnual.roles.reduce((sum, rol) => sum + rol.actividades.length, 0);
    const actividadesCompletadas = planAnual.roles.reduce(
      (sum, rol) => sum + rol.actividades.filter(a => a.estado === 'completada').length, 0
    );
    const actividadesEnProgreso = planAnual.roles.reduce(
      (sum, rol) => sum + rol.actividades.filter(a => a.estado === 'en-progreso').length, 0
    );
    const cumplimientoGeneral = Math.round(
      planAnual.roles.reduce((sum, rol) => sum + rol.porcentajeCumplimiento, 0) / planAnual.roles.length
    );

    csvRows.push('MÉTRICAS GENERALES');
    csvRows.push(`Cumplimiento General,${cumplimientoGeneral}%`);
    csvRows.push(`Total Actividades,${totalActividades}`);
    csvRows.push(`Actividades Completadas,${actividadesCompletadas}`);
    csvRows.push(`Actividades En Progreso,${actividadesEnProgreso}`);
    csvRows.push(''); // Línea vacía

    // Datos por rol
    planAnual.roles.forEach((rol) => {
      csvRows.push(''); // Línea vacía
      csvRows.push(`ROL ${rol.id}: ${rol.nombre.toUpperCase()}`);
      csvRows.push(`Descripción: ${rol.descripcion}`);
      csvRows.push(`Cumplimiento del Rol: ${rol.porcentajeCumplimiento}%`);
      csvRows.push(`Total de Actividades: ${rol.actividades.length}`);
      csvRows.push(''); // Línea vacía

      if (rol.actividades.length > 0) {
        // Encabezados de la tabla de actividades
        csvRows.push('N°,Actividad,Descripción,Responsable,Fecha Inicio,Fecha Fin,Estado,Prioridad,Avance (%),Observaciones');

        // Datos de actividades
        rol.actividades.forEach((actividad, index) => {
          const row = [
            index + 1,
            `"${actividad.nombre.replace(/"/g, '""')}"`, // Escapar comillas
            `"${actividad.descripcion.replace(/"/g, '""')}"`,
            `"${actividad.responsable.replace(/"/g, '""')}"`,
            new Date(actividad.fechaInicio).toLocaleDateString('es-CO'),
            new Date(actividad.fechaFin).toLocaleDateString('es-CO'),
            getEstadoLabel(actividad.estado),
            actividad.prioridad,
            actividad.porcentajeAvance,
            `"${actividad.observaciones.replace(/"/g, '""')}"`
          ].join(',');
          csvRows.push(row);
        });
      } else {
        csvRows.push('No hay actividades registradas para este rol');
      }
    });

    // Crear el contenido CSV
    const csvContent = csvRows.join('\n');
    
    // Crear BOM para UTF-8 (para que Excel reconozca caracteres especiales)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Descargar archivo
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Plan_Anual_Auditoria_${planAnual.añoFiscal}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Plan Anual exportado a Excel exitosamente');
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    toast.error('Error al exportar a Excel');
  }
}

/**
 * Exporta el Plan Anual a formato PDF
 */
export function exportarPlanAnualPDF(planAnual: PlanAnual): void {
  try {
    // Calcular métricas
    const totalActividades = planAnual.roles.reduce((sum, rol) => sum + rol.actividades.length, 0);
    const actividadesCompletadas = planAnual.roles.reduce(
      (sum, rol) => sum + rol.actividades.filter(a => a.estado === 'completada').length, 0
    );
    const actividadesEnProgreso = planAnual.roles.reduce(
      (sum, rol) => sum + rol.actividades.filter(a => a.estado === 'en-progreso').length, 0
    );
    const cumplimientoGeneral = Math.round(
      planAnual.roles.reduce((sum, rol) => sum + rol.porcentajeCumplimiento, 0) / planAnual.roles.length
    );

    // Crear contenido HTML para imprimir
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Plan Anual de Auditoría ${planAnual.añoFiscal}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      color: #1F2937;
      line-height: 1.5;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #003DA5;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #003DA5;
      font-size: 24pt;
      margin: 10px 0;
      font-weight: bold;
    }
    .header .subtitle {
      color: #6B7280;
      font-size: 12pt;
      margin: 5px 0;
    }
    .info-box {
      background: #F3F4F6;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .info-box p {
      margin: 5px 0;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: #F9FAFB;
      border: 2px solid #E5E7EB;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .metric-card .value {
      font-size: 24pt;
      font-weight: bold;
      color: #003DA5;
      margin: 10px 0;
    }
    .metric-card .label {
      font-size: 10pt;
      color: #6B7280;
      text-transform: uppercase;
    }
    .rol-section {
      page-break-inside: avoid;
      margin-bottom: 30px;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      overflow: hidden;
    }
    .rol-header {
      padding: 20px;
      color: white;
      font-weight: bold;
    }
    .rol-header h2 {
      margin: 0 0 10px 0;
      font-size: 16pt;
    }
    .rol-header .descripcion {
      margin: 0;
      font-size: 11pt;
      opacity: 0.95;
    }
    .rol-header .cumplimiento {
      margin-top: 15px;
      font-size: 12pt;
    }
    .rol-body {
      padding: 20px;
      background: white;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    table th {
      background: #F3F4F6;
      color: #374151;
      font-weight: bold;
      padding: 10px;
      text-align: left;
      font-size: 9pt;
      border-bottom: 2px solid #E5E7EB;
    }
    table td {
      padding: 8px;
      border-bottom: 1px solid #E5E7EB;
      font-size: 9pt;
    }
    table tr:last-child td {
      border-bottom: none;
    }
    .estado-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 8pt;
      font-weight: bold;
    }
    .estado-completada { background: #D1FAE5; color: #065F46; }
    .estado-en-progreso { background: #DBEAFE; color: #1E40AF; }
    .estado-pendiente { background: #F3F4F6; color: #374151; }
    .estado-retrasada { background: #FEE2E2; color: #991B1B; }
    .prioridad-alta { background: #FEE2E2; color: #991B1B; }
    .prioridad-media { background: #FEF3C7; color: #92400E; }
    .prioridad-baja { background: #D1FAE5; color: #065F46; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #E5E7EB;
      text-align: center;
      color: #6B7280;
      font-size: 9pt;
    }
    .no-actividades {
      text-align: center;
      color: #9CA3AF;
      padding: 20px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PLAN ANUAL DE AUDITORÍA ${planAnual.añoFiscal}</h1>
    <p class="subtitle">Basado en los 5 roles del Decreto 648 de 2017</p>
    <p class="subtitle">Oficina de Control Interno de Gestión - ESAP</p>
  </div>

  <div class="info-box">
    <p><strong>Estado:</strong> ${getEstadoPlanLabel(planAnual.estado)}</p>
    <p><strong>Responsable:</strong> ${planAnual.responsable}</p>
    <p><strong>Fecha de Creación:</strong> ${new Date(planAnual.fechaCreacion).toLocaleDateString('es-CO', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    })}</p>
    <p><strong>Fecha de Generación:</strong> ${new Date().toLocaleDateString('es-CO', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    })}</p>
  </div>

  <h3 style="color: #003DA5; margin-bottom: 15px;">Métricas Generales</h3>
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="label">Cumplimiento General</div>
      <div class="value">${cumplimientoGeneral}%</div>
    </div>
    <div class="metric-card">
      <div class="label">Total Actividades</div>
      <div class="value">${totalActividades}</div>
    </div>
    <div class="metric-card">
      <div class="label">Completadas</div>
      <div class="value">${actividadesCompletadas}</div>
    </div>
    <div class="metric-card">
      <div class="label">En Progreso</div>
      <div class="value">${actividadesEnProgreso}</div>
    </div>
  </div>

  <h3 style="color: #003DA5; margin: 30px 0 20px 0;">Detalle por Rol</h3>

  ${planAnual.roles.map(rol => `
    <div class="rol-section">
      <div class="rol-header" style="background: ${rol.color};">
        <h2>ROL ${rol.id}: ${rol.nombre.toUpperCase()}</h2>
        <p class="descripcion">${rol.descripcion}</p>
        <div class="cumplimiento">
          📊 Cumplimiento: ${rol.porcentajeCumplimiento}% | 
          📋 ${rol.actividades.length} actividades
        </div>
      </div>
      <div class="rol-body">
        ${rol.actividades.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">N°</th>
                <th style="width: 25%;">Actividad</th>
                <th style="width: 20%;">Responsable</th>
                <th style="width: 12%;">Inicio</th>
                <th style="width: 12%;">Fin</th>
                <th style="width: 10%;">Estado</th>
                <th style="width: 8%;">Prioridad</th>
                <th style="width: 8%;">Avance</th>
              </tr>
            </thead>
            <tbody>
              ${rol.actividades.map((actividad, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${actividad.nombre}</strong></td>
                  <td>${actividad.responsable}</td>
                  <td>${new Date(actividad.fechaInicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</td>
                  <td>${new Date(actividad.fechaFin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <span class="estado-badge estado-${actividad.estado}">
                      ${getEstadoLabel(actividad.estado)}
                    </span>
                  </td>
                  <td>
                    <span class="estado-badge prioridad-${actividad.prioridad.toLowerCase()}">
                      ${actividad.prioridad}
                    </span>
                  </td>
                  <td><strong>${actividad.porcentajeAvance}%</strong></td>
                </tr>
                ${actividad.descripcion || actividad.observaciones ? `
                  <tr>
                    <td colspan="8" style="background: #F9FAFB; font-size: 8pt; color: #6B7280;">
                      ${actividad.descripcion ? `<strong>Descripción:</strong> ${actividad.descripcion}<br>` : ''}
                      ${actividad.observaciones ? `<strong>Observaciones:</strong> ${actividad.observaciones}` : ''}
                    </td>
                  </tr>
                ` : ''}
              `).join('')}
            </tbody>
          </table>
        ` : '<p class="no-actividades">No hay actividades registradas para este rol</p>'}
      </div>
    </div>
  `).join('')}

  <div class="footer">
    <p>Escuela Superior de Administración Pública - ESAP</p>
    <p>Oficina de Control Interno de Gestión</p>
    <p>Documento generado automáticamente por el Sistema de Control Interno</p>
  </div>
</body>
</html>
    `;

    // Abrir ventana de impresión
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Esperar a que se cargue el contenido antes de imprimir
      printWindow.onload = () => {
        printWindow.print();
        toast.success('PDF generado. Usa "Guardar como PDF" en el diálogo de impresión');
      };
    } else {
      toast.error('No se pudo abrir la ventana de impresión. Verifica el bloqueador de ventanas emergentes.');
    }
  } catch (error) {
    console.error('Error al exportar a PDF:', error);
    toast.error('Error al exportar a PDF');
  }
}

// ============ FUNCIONES AUXILIARES ============

function getEstadoLabel(estado: string): string {
  switch (estado) {
    case 'completada': return 'Completada';
    case 'en-progreso': return 'En Progreso';
    case 'pendiente': return 'Pendiente';
    case 'retrasada': return 'Retrasada';
    default: return estado;
  }
}

function getEstadoPlanLabel(estado: string): string {
  switch (estado) {
    case 'borrador': return 'Borrador';
    case 'aprobado': return 'Aprobado';
    case 'en-ejecucion': return 'En Ejecución';
    case 'completado': return 'Completado';
    default: return estado;
  }
}
