/**
 * generarReporteExpedientesPDF - Genera y descarga un PDF con los expedientes filtrados
 * Usa html2canvas + jsPDF para descargar directamente sin diálogo de impresión
 */

interface CampoConfig {
  id: string;
  nombre: string;
  tipo: string;
  opciones?: string[];
}

interface ExpedienteReporte {
  id: string;
  radicado?: string;
  tipoProceso?: string;
  medioControl?: string;
  etapa?: string;
  juzgadoConocimiento?: string;
  ubicacionFisica?: string;
  cuantia?: number;
  nivelRiesgo?: string;
  provisionContable?: number;
  fechaEstimacionProvision?: string;
  observacionProvision?: string;
  abogadoAsignado?: string;
  demandante?: string;
  demandado?: string;
  fechaNotificacion?: string | Date;
  fechaVencimiento?: string | Date;
  diasRestantes?: number;
  diasTotales?: number;
  pretensionDemandante?: string;
  pretensiones?: string;
  hechos?: string;
  causaDemanda?: string;
  demandantes?: any[];
  demandados?: any[];
  otrosActores?: any[];
  camposAdicionales?: Record<string, any>;
  ultimaActuacion?: { descripcion?: string; fecha?: string; tipo?: string };
  fechaCreacion?: Date;
  estado?: string;
  tipoConteoTermino?: string;
  [key: string]: any;
}

function formatCOP(value: number | undefined): string {
  if (!value) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

function formatFecha(fecha: string | Date | undefined): string {
  if (!fecha) return 'Sin fecha';
  try {
    return new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return String(fecha);
  }
}

function getSemaforoColor(dias: number | undefined): { color: string; label: string } {
  if (dias === undefined) return { color: '#6B7280', label: 'Sin datos' };
  if (dias <= 5) return { color: '#DC2626', label: 'CRÍTICO' };
  if (dias <= 15) return { color: '#F59E0B', label: 'PRÓXIMO A VENCER' };
  return { color: '#10B981', label: 'EN TÉRMINO' };
}

function generarPaginaExpediente(exp: ExpedienteReporte, index: number, camposConfig?: CampoConfig[]): string {
  const semaforo = getSemaforoColor(exp.diasRestantes);

  // Partes procesales
  const partesHTML = (() => {
    let html = '';

    // Demandantes
    const demandantes = exp.demandantes || [];
    if (demandantes.length > 0) {
      html += demandantes.map((d: any) => `
        <tr>
          <td style="padding:6px 10px;font-weight:600;color:#F57C00;font-size:11px;border-bottom:1px solid #eee;">DEMANDANTE</td>
          <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${d.nombre || d.nombreCompleto || '—'}</td>
          <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${d.identificacion || d.cedula || '—'}</td>
          <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${d.telefono || '—'}</td>
          <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${d.email || d.correo || '—'}</td>
        </tr>
      `).join('');
    } else if (exp.demandante) {
      html += `<tr>
        <td style="padding:6px 10px;font-weight:600;color:#F57C00;font-size:11px;border-bottom:1px solid #eee;">DEMANDANTE</td>
        <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${exp.demandante}</td>
        <td colspan="3" style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">—</td>
      </tr>`;
    }

    // Demandados
    const demandados = exp.demandados || [];
    if (demandados.length > 0) {
      html += demandados.map((d: any) => `
        <tr>
          <td style="padding:6px 10px;font-weight:600;color:#DC2626;font-size:11px;border-bottom:1px solid #eee;">DEMANDADO</td>
          <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${d.nombre || d.nombreCompleto || '—'}</td>
          <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${d.identificacion || d.cedula || '—'}</td>
          <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${d.telefono || '—'}</td>
          <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${d.email || d.correo || '—'}</td>
        </tr>
      `).join('');
    } else if (exp.demandado) {
      html += `<tr>
        <td style="padding:6px 10px;font-weight:600;color:#DC2626;font-size:11px;border-bottom:1px solid #eee;">DEMANDADO</td>
        <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${exp.demandado}</td>
        <td colspan="3" style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">—</td>
      </tr>`;
    }

    // Otros actores
    const otros = exp.otrosActores || [];
    if (otros.length > 0) {
      html += otros.map((d: any) => `
        <tr>
          <td style="padding:6px 10px;font-weight:600;color:#6B7280;font-size:11px;border-bottom:1px solid #eee;">${d.rol || 'OTRO ACTOR'}</td>
          <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${d.nombre || d.nombreCompleto || '—'}</td>
          <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${d.identificacion || d.cedula || '—'}</td>
          <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${d.telefono || '—'}</td>
          <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${d.email || d.correo || '—'}</td>
        </tr>
      `).join('');
    }

    return html;
  })();

  // Campos adicionales dinámicos (no-documento)
  const camposAdicionalesHTML = (() => {
    const campos = (camposConfig || []).filter(c => c.tipo !== 'documento');
    const vals = exp.camposAdicionales || {};
    const filas = campos
      .map(c => {
        const v = vals[c.id];
        // Booleanos siempre; opciones-multiple solo si hay seleccionadas; resto si tiene valor
        if (c.tipo === 'booleano') {
          const marcado = !!v;
          return `<tr>
            <td style="padding:6px 12px;font-size:11px;color:#6B7280;width:35%;border-bottom:1px solid #E5E7EB;">${c.nombre}</td>
            <td style="padding:6px 12px;font-size:11px;font-weight:700;border-bottom:1px solid #E5E7EB;color:${marcado ? '#059669' : '#6B7280'};">
              ${marcado ? '✅ Sí' : '— No'}
            </td>
          </tr>`;
        }
        if (c.tipo === 'opciones-multiple') {
          const sel: string[] = Array.isArray(v) ? v : [];
          if (sel.length === 0) return '';
          return `<tr>
            <td style="padding:6px 12px;font-size:11px;color:#6B7280;width:35%;border-bottom:1px solid #E5E7EB;vertical-align:top;">${c.nombre}</td>
            <td style="padding:6px 12px;font-size:11px;font-weight:600;border-bottom:1px solid #E5E7EB;">
              ${sel.map(o => `<span style="display:inline-block;margin:2px 4px 2px 0;padding:1px 8px;background:#DBEAFE;color:#1D4ED8;border-radius:12px;font-size:10px;font-weight:700;">✔ ${o}</span>`).join('')}
            </td>
          </tr>`;
        }
        if (v === undefined || v === null || v === '') return '';
        let display = String(v);
        if (c.tipo === 'fecha') {
          try { display = new Date(v).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { /* noop */ }
        }
        return `<tr>
          <td style="padding:6px 12px;font-size:11px;color:#6B7280;width:35%;border-bottom:1px solid #E5E7EB;">${c.nombre}</td>
          <td style="padding:6px 12px;font-size:11px;font-weight:600;border-bottom:1px solid #E5E7EB;">${display}</td>
        </tr>`;
      })
      .filter(Boolean)
      .join('');
    if (!filas) return '';
    return `
      <div style="margin-top:12px;">
        <h3 style="font-size:12px;font-weight:800;color:#003DA5;margin:0 0 6px 0;border-bottom:2px solid #003DA5;padding-bottom:4px;">📋 INFORMACIÓN ESPECÍFICA DEL PROCESO</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;">
          ${filas}
        </table>
      </div>`;
  })();

  // Provisión contable
  const provisionHTML = exp.provisionContable ? `
    <div style="margin-top:12px;padding:10px 14px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;">
      <p style="font-size:11px;font-weight:700;color:#92400E;margin:0 0 6px 0;">🏦 PROVISIÓN CONTABLE</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="font-size:11px;color:#6B7280;padding:2px 0;">Monto:</td>
          <td style="font-size:12px;font-weight:700;color:#D97706;padding:2px 0;">${formatCOP(exp.provisionContable)}</td>
          <td style="font-size:11px;color:#6B7280;padding:2px 0;">Fecha Estimación:</td>
          <td style="font-size:11px;font-weight:600;padding:2px 0;">${formatFecha(exp.fechaEstimacionProvision)}</td>
        </tr>
        ${exp.observacionProvision ? `<tr>
          <td style="font-size:11px;color:#6B7280;padding:4px 0;">Justificación:</td>
          <td colspan="3" style="font-size:11px;font-style:italic;padding:4px 0;">${exp.observacionProvision}</td>
        </tr>` : ''}
      </table>
    </div>
  ` : '';

  return `
    <div class="page" style="page-break-after:always;padding:24px 30px;font-family:'Segoe UI',Arial,sans-serif;">
      <!-- Encabezado institucional -->
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:4px solid #003DA5;padding-bottom:12px;margin-bottom:16px;">
        <div>
          <h1 style="margin:0;font-size:16px;color:#003DA5;font-weight:900;">ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA</h1>
          <p style="margin:2px 0 0 0;font-size:11px;color:#666;">ESAP - Oficina Jurídica • Sistema Integrado de Gestión Legal</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:10px;color:#999;">Expediente ${index + 1}</p>
          <p style="margin:2px 0 0 0;font-size:10px;color:#999;">${new Date().toLocaleDateString('es-CO')}</p>
        </div>
      </div>

      <!-- Título del expediente -->
      <div style="background:linear-gradient(135deg,#F0F7FF,#E0EDFF);padding:14px 18px;border-radius:8px;border-left:5px solid #003DA5;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h2 style="margin:0;font-size:15px;font-weight:900;color:#003DA5;">📋 RADICADO: ${exp.radicado || exp.id}</h2>
            <p style="margin:4px 0 0 0;font-size:12px;color:#555;">${exp.medioControl || exp.tipoProceso || 'Sin clasificar'}</p>
          </div>
          <div style="text-align:right;">
            <span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;color:#fff;background:${semaforo.color};">
              ${semaforo.label} • ${exp.diasRestantes !== undefined ? (exp.diasRestantes < 0 ? `Vencido hace ${Math.abs(exp.diasRestantes)}d` : `${exp.diasRestantes} días`) : '—'}
            </span>
          </div>
        </div>
      </div>

      <!-- Datos generales en grid -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;">
        <tr style="background:#F9FAFB;">
          <td style="padding:8px 12px;font-size:11px;color:#6B7280;width:25%;border-bottom:1px solid #E5E7EB;">Tipo de Proceso</td>
          <td style="padding:8px 12px;font-size:12px;font-weight:700;width:25%;border-bottom:1px solid #E5E7EB;">${exp.tipoProceso || '—'}</td>
          <td style="padding:8px 12px;font-size:11px;color:#6B7280;width:25%;border-bottom:1px solid #E5E7EB;">Etapa Actual</td>
          <td style="padding:8px 12px;font-size:12px;font-weight:700;width:25%;border-bottom:1px solid #E5E7EB;">${exp.etapa || '—'}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-size:11px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Juzgado</td>
          <td style="padding:8px 12px;font-size:11px;font-weight:600;border-bottom:1px solid #E5E7EB;">${exp.juzgadoConocimiento || exp.juzgado || '—'}</td>
          <td style="padding:8px 12px;font-size:11px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Ciudad</td>
          <td style="padding:8px 12px;font-size:11px;font-weight:600;border-bottom:1px solid #E5E7EB;">${exp.ubicacionFisica || '—'}</td>
        </tr>
        <tr style="background:#F9FAFB;">
          <td style="padding:8px 12px;font-size:11px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Cuantía</td>
          <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#059669;border-bottom:1px solid #E5E7EB;">${formatCOP(exp.cuantia)}</td>
          <td style="padding:8px 12px;font-size:11px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Nivel de Riesgo</td>
          <td style="padding:8px 12px;font-size:12px;font-weight:700;border-bottom:1px solid #E5E7EB;color:${exp.nivelRiesgo === 'Alto' ? '#DC2626' : exp.nivelRiesgo === 'Medio' ? '#D97706' : '#059669'};">${exp.nivelRiesgo || 'No evaluado'}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-size:11px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Fecha Notificación</td>
          <td style="padding:8px 12px;font-size:11px;font-weight:600;border-bottom:1px solid #E5E7EB;">${formatFecha(exp.fechaNotificacion)}</td>
          <td style="padding:8px 12px;font-size:11px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Fecha Vencimiento</td>
          <td style="padding:8px 12px;font-size:11px;font-weight:600;border-bottom:1px solid #E5E7EB;">${formatFecha(exp.fechaVencimiento || exp.fechaVencimientoTerminos)}</td>
        </tr>
        <tr style="background:#F9FAFB;">
          <td style="padding:8px 12px;font-size:11px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Tipo de Conteo</td>
          <td style="padding:8px 12px;font-size:11px;font-weight:600;border-bottom:1px solid #E5E7EB;">${exp.tipoConteoTermino === 'CALENDARIO' ? 'Días Calendario' : 'Días Hábiles'}</td>
          <td style="padding:8px 12px;font-size:11px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Estado</td>
          <td style="padding:8px 12px;font-size:11px;font-weight:600;border-bottom:1px solid #E5E7EB;">${exp.estado || 'ACTIVO'}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-size:11px;color:#6B7280;">Abogado Asignado</td>
          <td colspan="3" style="padding:8px 12px;font-size:12px;font-weight:700;color:#003DA5;">${exp.abogadoAsignado || 'Sin asignar'}</td>
        </tr>
      </table>

      ${camposAdicionalesHTML}
      ${provisionHTML}

      <!-- Partes procesales -->
      ${partesHTML ? `
      <div style="margin-top:14px;">
        <h3 style="font-size:12px;font-weight:800;color:#003DA5;margin:0 0 8px 0;border-bottom:2px solid #003DA5;padding-bottom:4px;">👥 PARTES PROCESALES</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;">
          <thead>
            <tr style="background:#F3F4F6;">
              <th style="padding:6px 10px;font-size:10px;text-align:left;color:#6B7280;font-weight:700;">ROL</th>
              <th style="padding:6px 10px;font-size:10px;text-align:left;color:#6B7280;font-weight:700;">NOMBRE</th>
              <th style="padding:6px 10px;font-size:10px;text-align:left;color:#6B7280;font-weight:700;">IDENTIFICACIÓN</th>
              <th style="padding:6px 10px;font-size:10px;text-align:left;color:#6B7280;font-weight:700;">TELÉFONO</th>
              <th style="padding:6px 10px;font-size:10px;text-align:left;color:#6B7280;font-weight:700;">EMAIL</th>
            </tr>
          </thead>
          <tbody>${partesHTML}</tbody>
        </table>
      </div>
      ` : ''}

      <!-- Causa de la demanda -->
      ${(exp.causaDemanda || exp.pretensionDemandante || exp.pretensiones) ? `
      <div style="margin-top:14px;">
        <h3 style="font-size:12px;font-weight:800;color:#003DA5;margin:0 0 8px 0;border-bottom:2px solid #003DA5;padding-bottom:4px;">⚡ CAUSA DE LA DEMANDA</h3>
        <div style="padding:10px 14px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:6px;font-size:11px;line-height:1.6;white-space:pre-wrap;">${exp.causaDemanda || exp.pretensionDemandante || exp.pretensiones}</div>
      </div>
      ` : ''}

      <!-- Resumen de hechos -->
      ${exp.hechos ? `
      <div style="margin-top:14px;">
        <h3 style="font-size:12px;font-weight:800;color:#003DA5;margin:0 0 8px 0;border-bottom:2px solid #003DA5;padding-bottom:4px;">📝 RESUMEN DE HECHOS</h3>
        <div style="padding:10px 14px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;font-size:11px;line-height:1.6;white-space:pre-wrap;">${exp.hechos}</div>
      </div>
      ` : ''}

      <!-- Última actuación -->
      ${exp.ultimaActuacion?.descripcion ? `
      <div style="margin-top:14px;">
        <h3 style="font-size:12px;font-weight:800;color:#003DA5;margin:0 0 8px 0;border-bottom:2px solid #003DA5;padding-bottom:4px;">⚖️ ÚLTIMA ACTUACIÓN PROCESAL</h3>
        <div style="padding:10px 14px;background:#F0F7FF;border:1px solid #BFDBFE;border-radius:6px;">
          <p style="font-size:11px;font-weight:600;margin:0;">${exp.ultimaActuacion.descripcion}</p>
          <p style="font-size:10px;color:#6B7280;margin:4px 0 0 0;">Fecha: ${formatFecha(exp.ultimaActuacion.fecha)} • Tipo: ${exp.ultimaActuacion.tipo || 'Sin tipo'}</p>
        </div>
      </div>
      ` : ''}

      <!-- Pie de página -->
      <div style="margin-top:20px;padding-top:10px;border-top:2px solid #E5E7EB;display:flex;justify-content:space-between;font-size:9px;color:#9CA3AF;">
        <span>Generado por Sistema Integrado de Gestión Legal (SIGL) - ESAP</span>
        <span>${new Date().toLocaleString('es-CO')}</span>
      </div>
    </div>
  `;
}

export function generarReporteExpedientesPDF(expedientes: ExpedienteReporte[], filtroTipo: string, descripcionFiltros?: string, camposConfigPorTipo?: Record<string, CampoConfig[]>): void {
  if (expedientes.length === 0) {
    return;
  }

  const tituloFiltro = filtroTipo === 'TODOS' ? 'Todos los Tipos de Proceso' : filtroTipo;

  // Portada
  const portada = `
    <div class="page" style="page-break-after:always;padding:60px 40px;font-family:'Segoe UI',Arial,sans-serif;text-align:center;display:flex;flex-direction:column;justify-content:center;min-height:90vh;">
      <div style="margin-bottom:40px;">
        <div style="width:100px;height:100px;background:#003DA5;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:28px;font-weight:900;color:#fff;">ESAP</span>
        </div>
        <h1 style="font-size:28px;font-weight:900;color:#003DA5;margin:0;">ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA</h1>
        <p style="font-size:14px;color:#F57C00;margin:8px 0 0 0;font-weight:600;">Oficina Jurídica - Defensa Judicial</p>
      </div>

      <div style="border-top:4px solid #003DA5;border-bottom:4px solid #003DA5;padding:30px 20px;margin:20px 0;">
        <h2 style="font-size:22px;font-weight:800;color:#1F2937;margin:0 0 10px 0;">REPORTE DE EXPEDIENTES JUDICIALES</h2>
        <p style="font-size:16px;color:#003DA5;font-weight:700;margin:0;">Filtro: ${tituloFiltro}</p>
      </div>

      <div style="margin-top:30px;">
        <table style="margin:0 auto;border-collapse:collapse;text-align:left;">
          <tr>
            <td style="padding:6px 20px;font-size:13px;color:#6B7280;">Total de expedientes:</td>
            <td style="padding:6px 20px;font-size:16px;font-weight:800;color:#003DA5;">${expedientes.length}</td>
          </tr>
          <tr>
            <td style="padding:6px 20px;font-size:13px;color:#6B7280;">Fecha de generación:</td>
            <td style="padding:6px 20px;font-size:13px;font-weight:600;">${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
          </tr>
          <tr>
            <td style="padding:6px 20px;font-size:13px;color:#6B7280;">Hora:</td>
            <td style="padding:6px 20px;font-size:13px;font-weight:600;">${new Date().toLocaleTimeString('es-CO')}</td>
          </tr>
          ${descripcionFiltros ? `<tr>
            <td style="padding:6px 20px;font-size:13px;color:#6B7280;vertical-align:top;">Filtros aplicados:</td>
            <td style="padding:6px 20px;font-size:12px;font-weight:600;color:#374151;">${descripcionFiltros}</td>
          </tr>` : ''}
        </table>
      </div>

      <p style="margin-top:60px;font-size:10px;color:#9CA3AF;">Documento generado automáticamente por el Sistema Integrado de Gestión Legal (SIGL)</p>
    </div>
  `;

  // Generar páginas
  const paginasHTML = expedientes.map((exp, idx) => {
    const tipoClave = exp.tipoProceso || '';
    const campos = camposConfigPorTipo?.[tipoClave] || [];
    return generarPaginaExpediente(exp, idx, campos);
  }).join('');

  // HTML completo
  const htmlCompleto = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Expedientes - ${tituloFiltro} - ESAP</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: auto; }
      @page { size: A4; margin: 15mm; }
    }
    body {
      font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
      color: #1F2937;
      line-height: 1.4;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    table { border-spacing: 0; }
  </style>
</head>
<body>
  ${portada}
  ${paginasHTML}
</body>
</html>`;

  // Renderizar en iframe oculto y descargar como PDF
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:900px;height:700px;visibility:hidden;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(htmlCompleto);
  iframeDoc.close();

  // Dar tiempo al iframe para renderizar imágenes y fuentes
  const descargar = async () => {
    await new Promise(r => setTimeout(r, 800));
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const A4_W = 210;
      const A4_H = 297;

      const paginas = iframeDoc.querySelectorAll<HTMLElement>('.page');
      const targets = paginas.length > 0 ? Array.from(paginas) : [iframeDoc.body];

      for (let i = 0; i < targets.length; i++) {
        const canvas = await html2canvas(targets[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: 900,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const imgW = A4_W;
        const imgH = (canvas.height * A4_W) / canvas.width;

        if (i > 0) pdf.addPage();

        // Si la imagen es más alta que A4, dividir en sub-páginas
        if (imgH <= A4_H) {
          pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
        } else {
          let yOffset = 0;
          while (yOffset < imgH) {
            if (yOffset > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, -yOffset, imgW, imgH);
            yOffset += A4_H;
          }
        }
      }

      const fecha = new Date().toISOString().slice(0, 10);
      pdf.save(`Reporte_Expedientes_${tituloFiltro.replace(/\s+/g, '_')}_${fecha}.pdf`);
    } finally {
      document.body.removeChild(iframe);
    }
  };

  // onload puede no disparar con document.write, usar setTimeout como fallback
  let disparado = false;
  const lanzar = () => { if (!disparado) { disparado = true; descargar(); } };
  iframe.onload = lanzar;
  setTimeout(lanzar, 300);
}
