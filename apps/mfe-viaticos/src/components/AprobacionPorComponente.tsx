import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSignature,
  ShieldCheck,
  UserCheck,
  Info,
} from 'lucide-react';
import {
  EstadoFirmasResponse,
  SolicitudComisionResponse,
  SolicitudViatico,
} from '../types/viaticos';

export interface PropsAprobacionPorComponente {
  solicitud: SolicitudViatico;
  solicitudCompleta?: SolicitudComisionResponse | null;
  estadoFirmas?: EstadoFirmasResponse | null;
  cargandoFirmas?: boolean;
}

export interface CardComponenteFirma {
  id: string;
  etiqueta: string;
  firmante: string;
  cargo?: string;
  estado: 'APROBADO' | 'PENDIENTE' | 'NO_APLICA' | 'DEVUELTO';
  fecha?: string | null;
  certificado?: string | null;
  observaciones?: string | null;
}

/**
 * Formatea una fecha ISO a español en formato: "01 de oct de 2026".
 */
export function formatearFechaEspanol(fechaStr?: string | Date | null): string {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return '';
  const dia = String(d.getDate()).padStart(2, '0');
  const meses = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  const mes = meses[d.getMonth()];
  const anio = d.getFullYear();
  return `${dia} de ${mes} de ${anio}`;
}

export const AprobacionPorComponente: React.FC<PropsAprobacionPorComponente> = ({
  solicitud,
  solicitudCompleta,
  estadoFirmas,
  cargandoFirmas = false,
}) => {
  const estado =
    solicitudCompleta?.estado ||
    (solicitudCompleta as any)?.estadoSolicitud ||
    solicitud.estado ||
    (solicitud as any).estadoSolicitud ||
    'PENDIENTE_FIRMAS';
  const esPendienteFirmas = estado === 'PENDIENTE_FIRMAS';
  const esDevuelta = estado === 'DEVUELTA';

  // Firmas previas (JSONB o endpoint de firmas)
  const firmasRegistradas: any[] =
    (solicitudCompleta?.camposAdicionales?.firmasAprobacion as any[]) ||
    (solicitud as any).camposAdicionales?.firmasAprobacion ||
    [];

  // Buscar firmas en firmasRegistradas o en estadoFirmas.firmantes
  const firmanteJefeBackend = estadoFirmas?.firmantes?.find(
    (f) => f.tipo === 'JEFE_DEPENDENCIA',
  );
  const firmanteGerenteBackend = estadoFirmas?.firmantes?.find(
    (f) => f.tipo === 'GERENTE_PROYECTO',
  );

  const firmaJefe =
    firmanteJefeBackend?.firma ||
    firmasRegistradas.find(
      (f) => f.tipo === 'JEFE_DEPENDENCIA' && f.estado !== 'RECHAZADO',
    );
  const firmaGerente =
    firmanteGerenteBackend?.firma ||
    firmasRegistradas.find(
      (f) => f.tipo === 'GERENTE_PROYECTO' && f.estado !== 'RECHAZADO',
    );
  const firmaAnalista =
    firmasRegistradas.find(
      (f) =>
        (f.tipo === 'ANALISTA' || f.tipo === 'ANALISTA_VIATICOS') &&
        f.estado !== 'RECHAZADO',
    ) || (solicitudCompleta?.camposAdicionales?.firmaAnalista as any);

  // Información del comisionado o creador de la solicitud
  const creadorNombre =
    solicitudCompleta?.camposAdicionales?.nombreEnlaceElaboro ||
    solicitudCompleta?.camposAdicionales?.elaboro ||
    solicitud.dependencia ||
    'Enlace de Dependencia';

  // Construcción de la lista de componentes según la etapa del flujo institucional
  const componentes: CardComponenteFirma[] = [];

  // 1. Componente Elaboración Enlace (siempre elaborado para llegar a firmas o radicación)
  componentes.push({
    id: 'enlace_elaboro',
    etiqueta: 'ELABORACIÓN — ENLACE',
    firmante: creadorNombre,
    cargo: 'Enlace de Dependencia',
    estado: 'APROBADO',
    fecha: solicitud.creadoEn || (solicitud as any).fechaCreacion,
  });

  // 2. Componente Jefe de Dependencia / Supervisor
  const tituloJefe =
    firmanteJefeBackend?.titulo?.toUpperCase() || 'JEFE DE DEPENDENCIA';
  const nombreJefe = firmaJefe?.nombreFirmante?.trim();
  const jefeAprobado = Boolean(
    firmaJefe && firmaJefe.estado !== 'RECHAZADO' && (firmaJefe.firmadoDigitalmente || firmaJefe.fechaFirma),
  );

  componentes.push({
    id: 'jefe_dependencia',
    etiqueta: tituloJefe,
    firmante: nombreJefe || '—',
    cargo: firmanteJefeBackend?.cargo || 'Jefe Inmediato / Supervisor',
    estado: jefeAprobado
      ? 'APROBADO'
      : esDevuelta && !jefeAprobado
      ? 'DEVUELTO'
      : 'PENDIENTE',
    fecha: firmaJefe?.fechaFirma || null,
    certificado: firmaJefe?.certificadoId || null,
  });

  // 3. Componente Gerente de Proyecto / Ordenador del Gasto
  const tituloGerente =
    firmanteGerenteBackend?.titulo?.toUpperCase() || 'GERENTE DE PROYECTO';
  const nombreGerente = firmaGerente?.nombreFirmante?.trim();
  const gerenteAprobado = Boolean(
    firmaGerente && firmaGerente.estado !== 'RECHAZADO' && (firmaGerente.firmadoDigitalmente || firmaGerente.fechaFirma),
  );

  componentes.push({
    id: 'gerente_proyecto',
    etiqueta: tituloGerente,
    firmante: nombreGerente || '—',
    cargo: firmanteGerenteBackend?.cargo || 'Gerente de Proyecto',
    estado: gerenteAprobado
      ? 'APROBADO'
      : esDevuelta && !gerenteAprobado
      ? 'DEVUELTO'
      : 'PENDIENTE',
    fecha: firmaGerente?.fechaFirma || null,
    certificado: firmaGerente?.certificadoId || null,
  });

  const firmaDirNac =
    (solicitudCompleta?.camposAdicionales?.firmaDireccionNacional as any) ||
    (solicitud as any)?.camposAdicionales?.firmaDireccionNacional ||
    firmasRegistradas.find(
      (f) =>
        (f.tipo === 'DIRECCION_NACIONAL' ||
          f.tipo === 'DIRECTOR_NACIONAL') &&
        f.estado !== 'RECHAZADO',
    );

  const esExtemporanea = Boolean(
    solicitud.extemporanea ||
      (solicitud as any).estadoSolicitud === 'EXTEMPORANEA' ||
      (solicitudCompleta as any)?.extemporanea ||
      (solicitudCompleta as any)?.estadoSolicitud === 'EXTEMPORANEA' ||
      (solicitudCompleta as any)?.fechaAutorizacionDireccion ||
      (solicitud as any)?.fechaAutorizacionDireccion ||
      (solicitudCompleta as any)?.autorizadorDireccionId ||
      (solicitud as any)?.autorizadorDireccionId ||
      firmaDirNac ||
      estado === 'EXTEMPORANEA' ||
      estado === 'AUTORIZACION_DIRECCION',
  );

  if (esPendienteFirmas) {
    // Si aún está en PENDIENTE_FIRMAS, los pasos posteriores no aplican en esta fase previa
    componentes.push(
      {
        id: 'revision_analista',
        etiqueta: 'REVISIÓN — ANALISTA',
        firmante: '—',
        cargo: 'Analista de Viáticos',
        estado: 'NO_APLICA',
      },
      {
        id: 'control_cruzado',
        etiqueta: 'CONTROL CRUZADO',
        firmante: '—',
        cargo: 'Control de Viáticos',
        estado: 'NO_APLICA',
      },
    );

    if (esExtemporanea) {
      componentes.push({
        id: 'autorizacion_direccion',
        etiqueta: 'AUTORIZACIÓN DIRECCIÓN',
        firmante: '—',
        cargo: 'Dirección Nacional (Aval Extemporáneo)',
        estado: 'NO_APLICA',
      });
    }

    componentes.push(
      {
        id: 'autorizacion_corporativa',
        etiqueta: 'AUTORIZACIÓN CORPORATIVA',
        firmante: '—',
        cargo: 'Subdirección de Gestión Corporativa',
        estado: 'NO_APLICA',
      },
      {
        id: 'presupuesto_rp',
        etiqueta: 'PRESUPUESTO — RP',
        firmante: '—',
        cargo: 'Profesional Presupuesto SIIF',
        estado: 'NO_APLICA',
      },
      {
        id: 'tesoreria_giro',
        etiqueta: 'TESORERÍA — GIRO',
        firmante: '—',
        cargo: 'Profesional Tesorería SIIF',
        estado: 'NO_APLICA',
      },
    );
  } else {
    // Si ya pasó las firmas de Jefe y Gerente y tiene estado RADICADA (o superior):
    // Mostrar el resto de firmas del flujo según los avances del expediente

    // 4. Analista de Viáticos
    const etapasPostAnalista = [
      'SOLICITADA_SIIF',
      'VERIFICADA',
      'EN_VERIFICACION',
      'AUTORIZACION_DIRECCION',
      'EN_AUTORIZACION',
      'AUTORIZADA',
      'EN_PRESUPUESTO',
      'COMPROMETIDA',
      'OBLIGADA',
      'PAGADA',
    ];
    const analistaAprobado = Boolean(
      firmaAnalista || etapasPostAnalista.includes(estado),
    );
    const nombreAnalista =
      firmaAnalista?.nombreFirmante ||
      (solicitudCompleta?.camposAdicionales?.reviso
        ? String(solicitudCompleta.camposAdicionales.reviso).replace(/^Revisó:\s*/i, '')
        : solicitud.analistaAsignadoId
        ? `Analista (${solicitud.analistaAsignadoId})`
        : '—');

    componentes.push({
      id: 'analista_viaticos',
      etiqueta: 'REVISIÓN — ANALISTA',
      firmante: analistaAprobado ? nombreAnalista : '—',
      cargo: 'Analista de Viáticos',
      estado: analistaAprobado
        ? 'APROBADO'
        : esDevuelta
        ? 'DEVUELTO'
        : 'PENDIENTE',
      fecha: firmaAnalista?.fechaFirma || null,
    });

    // 5. Control Cruzado (Segunda Revisión)
    const etapasPostControl = [
      'VERIFICADA',
      'AUTORIZACION_DIRECCION',
      'EN_AUTORIZACION',
      'AUTORIZADA',
      'EN_PRESUPUESTO',
      'COMPROMETIDA',
      'OBLIGADA',
      'PAGADA',
    ];
    const controlAprobado = Boolean(
      solicitud.observacionesSegundaRevision ||
        solicitud.fechaSegundaRevision ||
        (solicitudCompleta as any)?.fechaSegundaRevision ||
        (solicitudCompleta as any)?.observacionesSegundaRevision ||
        etapasPostControl.includes(estado),
    );
    const nombreControl =
      solicitudCompleta?.revisorControlNombre ||
      solicitud.revisorControlId ||
      (controlAprobado ? 'Control Viáticos' : '—');

    componentes.push({
      id: 'control_cruzado',
      etiqueta: 'CONTROL CRUZADO',
      firmante: controlAprobado ? nombreControl : '—',
      cargo: 'Verificación 2do Nivel',
      estado: controlAprobado
        ? 'APROBADO'
        : estado === 'SOLICITADA_SIIF'
        ? 'PENDIENTE'
        : 'PENDIENTE',
      fecha: solicitud.fechaSegundaRevision || (solicitudCompleta as any)?.fechaSegundaRevision || null,
      observaciones: solicitud.observacionesSegundaRevision || (solicitudCompleta as any)?.observacionesSegundaRevision || null,
    });

    // Flujo de Autorización:
    // Si es EXTEMPORÁNEA: primero firma Dirección Nacional (RF-AUT-002) y luego la Subdirección (RF-AUT-001)
    // Si es de control cruzado / estado NORMAL: NO requiere intervención de Dirección Nacional, sigue directamente la Subdirección
    if (esExtemporanea) {
      const etapasPostDireccion = [
        'EN_AUTORIZACION',
        'AUTORIZADA',
        'EN_PRESUPUESTO',
        'COMPROMETIDA',
        'OBLIGADA',
        'PAGADA',
      ];
      const decisionDir = String(
        (solicitudCompleta as any)?.decisionDireccion ||
          (solicitud as any)?.decisionDireccion ||
          '',
      ).toUpperCase();
      const fechaDir =
        (solicitudCompleta as any)?.fechaAutorizacionDireccion ||
        (solicitud as any)?.fechaAutorizacionDireccion ||
        firmaDirNac?.fechaFirma ||
        null;
      const certDir =
        firmaDirNac?.certificadoId ||
        (solicitudCompleta as any)?.camposAdicionales?.firmaDireccionNacional?.certificadoId ||
        (solicitud as any)?.camposAdicionales?.firmaDireccionNacional?.certificadoId ||
        null;

      const direccionAprobada = Boolean(
        fechaDir ||
          certDir ||
          firmaDirNac?.firmadoDigitalmente ||
          decisionDir === 'AUTORIZADO' ||
          decisionDir === 'AUTORIZADA' ||
          decisionDir === 'APROBADO' ||
          decisionDir === 'APROBADA' ||
          (solicitudCompleta as any)?.autorizadorDireccionId ||
          (solicitud as any)?.autorizadorDireccionId ||
          etapasPostDireccion.includes(estado),
      );
      const nombreDireccion =
        firmaDirNac?.nombreFirmante ||
        (solicitudCompleta as any)?.autorizadorDireccion?.nombreCompleto ||
        (solicitudCompleta as any)?.autorizadorDireccion?.nomLargo ||
        (solicitudCompleta as any)?.autorizadorDireccionNombre ||
        (solicitud as any)?.autorizadorDireccionNombre ||
        (solicitudCompleta as any)?.camposAdicionales?.firmaDireccionNacional?.nombreFirmante ||
        (solicitud as any)?.camposAdicionales?.firmaDireccionNacional?.nombreFirmante ||
        (direccionAprobada ? 'Dirección Nacional' : '—');

      componentes.push({
        id: 'autorizacion_direccion',
        etiqueta: 'AUTORIZACIÓN DIRECCIÓN',
        firmante: direccionAprobada ? nombreDireccion : '—',
        cargo: 'Dirección Nacional (Aval Extemporáneo)',
        estado: direccionAprobada
          ? 'APROBADO'
          : ['EXTEMPORANEA', 'AUTORIZACION_DIRECCION'].includes(estado)
          ? 'PENDIENTE'
          : 'PENDIENTE',
        fecha: fechaDir,
        certificado: certDir,
        observaciones:
          (solicitudCompleta as any)?.justificacionDireccion ||
          (solicitud as any)?.justificacionDireccion ||
          null,
      });
    }

    // Autorización Corporativa — Subdirección de Gestión Corporativa (Ordenador del Gasto)
    const firmaSubdir =
      (solicitudCompleta?.camposAdicionales?.firmaSubdireccion as any) ||
      (solicitud as any)?.camposAdicionales?.firmaSubdireccion ||
      firmasRegistradas.find(
        (f) =>
          (f.tipo === 'SUBDIRECCION' ||
            f.tipo === 'SUBDIRECTOR' ||
            f.tipo === 'SUBDIRECCION_GESTION_CORPORATIVA') &&
          f.estado !== 'RECHAZADO',
      );
    const decisionSubdir = String(
      (solicitudCompleta as any)?.decisionSubdireccion ||
        (solicitud as any)?.decisionSubdireccion ||
        '',
    ).toUpperCase();
    const fechaSubdir =
      (solicitudCompleta as any)?.fechaAutorizacion ||
      (solicitud as any)?.fechaAutorizacion ||
      firmaSubdir?.fechaFirma ||
      null;
    const certSubdir =
      firmaSubdir?.certificadoId ||
      (solicitudCompleta as any)?.camposAdicionales?.firmaSubdireccion?.certificadoId ||
      (solicitud as any)?.camposAdicionales?.firmaSubdireccion?.certificadoId ||
      null;

    const etapasPostAutorizacion = [
      'AUTORIZADA',
      'EN_PRESUPUESTO',
      'COMPROMETIDA',
      'OBLIGADA',
      'PAGADA',
    ];
    const autorizacionAprobada = Boolean(
      fechaSubdir ||
        certSubdir ||
        firmaSubdir?.firmadoDigitalmente ||
        decisionSubdir === 'AUTORIZADO' ||
        decisionSubdir === 'AUTORIZADA' ||
        decisionSubdir === 'APROBADO' ||
        decisionSubdir === 'APROBADA' ||
        (solicitudCompleta as any)?.autorizadorId ||
        (solicitud as any)?.autorizadorId ||
        etapasPostAutorizacion.includes(estado),
    );
    const nombreSubdirector =
      firmaSubdir?.nombreFirmante ||
      (solicitudCompleta as any)?.autorizador?.nombreCompleto ||
      (solicitudCompleta as any)?.autorizador?.nomLargo ||
      (solicitudCompleta as any)?.autorizadorNombre ||
      (solicitud as any)?.autorizadorNombre ||
      (solicitudCompleta as any)?.camposAdicionales?.firmaSubdireccion?.nombreFirmante ||
      (solicitud as any)?.camposAdicionales?.firmaSubdireccion?.nombreFirmante ||
      (autorizacionAprobada ? 'Subdirección de Gestión Corporativa' : '—');

    componentes.push({
      id: 'autorizacion_corporativa',
      etiqueta: 'AUTORIZACIÓN CORPORATIVA',
      firmante: autorizacionAprobada ? nombreSubdirector : '—',
      cargo: 'Subdirección de Gestión Corporativa (Ordenador del Gasto)',
      estado: autorizacionAprobada
        ? 'APROBADO'
        : estado === 'EN_AUTORIZACION'
        ? 'PENDIENTE'
        : 'PENDIENTE',
      fecha: fechaSubdir,
      certificado: certSubdir,
      observaciones:
        (solicitudCompleta as any)?.observacionesAutorizacion ||
        (solicitud as any)?.observacionesAutorizacion ||
        null,
    });

    // 7. Presupuesto (Expedición RP)
    const etapasPostPresupuesto = ['COMPROMETIDA', 'OBLIGADA', 'PAGADA'];
    const firmaPresupuesto =
      (solicitudCompleta?.camposAdicionales?.firmaPresupuesto as any) ||
      (solicitud as any).camposAdicionales?.firmaPresupuesto ||
      firmasRegistradas.find(
        (f) =>
          (f.tipo === 'PRESUPUESTO' || f.tipo === 'GRUPO_PRESUPUESTO') &&
          f.estado !== 'RECHAZADO',
      );
    const tieneRp = Boolean(
      solicitud.numeroRp ||
        (solicitud as any).codigoRp ||
        firmaPresupuesto ||
        etapasPostPresupuesto.includes(estado),
    );
    const nombrePresupuesto =
      firmaPresupuesto?.nombreFirmante ||
      (tieneRp
        ? `RP Nº ${solicitud.numeroRp || (solicitud as any).codigoRp || 'Registrado'}`
        : '—');
    componentes.push({
      id: 'presupuesto_rp',
      etiqueta: 'PRESUPUESTO — RP',
      firmante: tieneRp ? nombrePresupuesto : '—',
      cargo:
        firmaPresupuesto?.cargoFirmante ||
        'Expedición RP SIIF Nación / Grupo de Presupuesto',
      estado: tieneRp
        ? 'APROBADO'
        : estado === 'EN_PRESUPUESTO' || estado === 'AUTORIZADA'
        ? 'PENDIENTE'
        : 'PENDIENTE',
      fecha:
        firmaPresupuesto?.fechaFirma ||
        solicitud.fechaRp ||
        (solicitud as any).fechaExpedicionRp ||
        null,
      certificado: firmaPresupuesto?.certificadoId || null,
      observaciones:
        solicitud.observacionesRp ||
        ((solicitud as any).codigoRp || solicitud.numeroRp
          ? `RP: ${(solicitud as any).codigoRp || solicitud.numeroRp}`
          : null),
    });

    // 8. Tesorería (Giro y Desembolso)
    const tienePago = Boolean(
      estado === 'PAGADA' ||
        (solicitud as any).numeroOrdenPago ||
        (solicitud as any).fechaPago ||
        (solicitud as any).soportePagoPath,
    );
    componentes.push({
      id: 'tesoreria_giro',
      etiqueta: 'TESORERÍA — GIRO',
      firmante: tienePago
        ? `Orden Nº ${(solicitud as any).numeroOrdenPago || 'Desembolsada'}`
        : (solicitud as any).numeroObligacion
        ? `Obligada (${(solicitud as any).numeroObligacion})`
        : '—',
      cargo: 'Desembolso y Pago SIIF',
      estado: tienePago
        ? 'APROBADO'
        : estado === 'OBLIGADA'
        ? 'PENDIENTE'
        : 'PENDIENTE',
      fecha: (solicitud as any).fechaPago || null,
    });
  }

  // Resumen de estado para el badge superior
  const aprobadosCount = componentes.filter((c) => c.estado === 'APROBADO').length;
  const pendientesCount = componentes.filter((c) => c.estado === 'PENDIENTE').length;

  return (
    <div className="space-y-3.5">
      {/* Encabezado de la Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-[#003DA5]">
              <FileSignature className="w-4 h-4" />
            </span>
            <h4 className="text-sm font-black text-slate-900 tracking-tight">
              Aprobación por Componente
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {esPendienteFirmas
              ? 'Gestión de firmas previas para radicación formal (Jefe de Dependencia y Gerente de Proyecto).'
              : 'Seguimiento integral a las firmas y aprobaciones institucionales del flujo de viáticos.'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {aprobadosCount} Aprobado{aprobadosCount !== 1 ? 's' : ''}
          </span>
          {pendientesCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <Clock className="w-3 h-3 text-amber-600" />
              {pendientesCount} Pendiente{pendientesCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Banner Informativo para el Enlace en estado PENDIENTE_FIRMAS */}
      {esPendienteFirmas && (
        <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl text-amber-950 flex items-start gap-2.5 text-xs">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block text-amber-900">
              Trámite en espera de firmas de aprobación previa
            </span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              El Enlace ya elaboró la solicitud. En esta etapa se requiere la suscripción de las
              firmas del <strong>Jefe de Dependencia / Supervisor</strong> y del{' '}
              <strong>Gerente de Proyecto</strong>. Una vez completadas ambas firmas, la solicitud
              quedará radicada formalmente y continuará al análisis técnico.
            </p>
          </div>
        </div>
      )}

      {/* Grilla de Tarjetas por Componente (Diseño idéntico a la imagen) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {componentes.map((c) => {
          const esAprobado = c.estado === 'APROBADO';
          const esPendiente = c.estado === 'PENDIENTE';
          const esDev = c.estado === 'DEVUELTO';
          const esNoAplica = c.estado === 'NO_APLICA';

          return (
            <div
              key={c.id}
              className={`rounded-2xl p-3 flex flex-col items-center justify-between text-center transition-all min-h-[125px] border ${
                esAprobado
                  ? 'bg-emerald-50/40 border-emerald-200/90 shadow-2xs hover:bg-emerald-50/60'
                  : esPendiente
                  ? 'bg-amber-50/20 border-amber-200/80 shadow-2xs hover:bg-amber-50/40'
                  : esDev
                  ? 'bg-rose-50/40 border-rose-200/90 shadow-2xs'
                  : 'bg-white border-slate-200/80 opacity-65'
              }`}
            >
              {/* Etiqueta / Rol Superior */}
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 truncate w-full text-center">
                {c.etiqueta}
              </span>
              {c.cargo && (
                <span className="text-[9px] text-slate-400 font-medium truncate w-full text-center -mt-0.5" title={c.cargo}>
                  {c.cargo}
                </span>
              )}

              {/* Nombre del Firmante o Guión */}
              <div className="my-1.5 min-h-[34px] flex items-center justify-center px-1">
                <span
                  className={`text-xs font-bold leading-tight line-clamp-2 ${
                    esAprobado
                      ? 'text-slate-900'
                      : esPendiente
                      ? 'text-slate-800'
                      : 'text-slate-400'
                  }`}
                  title={c.firmante !== '—' ? c.firmante : undefined}
                >
                  {c.firmante}
                </span>
              </div>

              {/* Insignia / Estado + Fecha */}
              <div className="flex flex-col items-center gap-1 w-full">
                {esAprobado && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-200/70">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Aprobado</span>
                  </span>
                )}
                {esPendiente && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100/70 text-amber-800 border border-amber-200/70">
                    <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>Pendiente</span>
                  </span>
                )}
                {esNoAplica && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-400 border border-slate-200/60">
                    <span>No aplica</span>
                  </span>
                )}
                {esDev && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100/70 text-rose-800 border border-rose-200/70">
                    <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                    <span>Devuelto</span>
                  </span>
                )}

                {/* Fecha de Firma */}
                {c.fecha && esAprobado && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formatearFechaEspanol(c.fecha)}
                  </span>
                )}

                {/* Observaciones / Justificación si existen */}
                {c.observaciones && (
                  <span
                    className="text-[9.5px] text-slate-500 italic max-w-full truncate mt-0.5 cursor-help block px-1"
                    title={`Observaciones: ${c.observaciones}`}
                  >
                    "{c.observaciones}"
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AprobacionPorComponente;
