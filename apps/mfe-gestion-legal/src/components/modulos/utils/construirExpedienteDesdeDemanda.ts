import type { NuevaDemandaData } from '../ModalNuevaDemanda';

/**
 * Mapea los datos del formulario de Nueva Demanda (Defensa Judicial) al formato de
 * `Expediente` que espera el backend (`legalService.crearExpediente`).
 *
 * Replica el mapeo de `ModuloDefensaJudicialV3.handleSaveNuevaDemanda` para reutilizarlo en el
 * flujo de "Crear proceso desde una comunicación" (Centro de Comunicaciones → Clasificación IA).
 * IMPORTANTE: mantener sincronizado con `handleSaveNuevaDemanda` si cambia el mapeo de Defensa.
 *
 * @param demandaData   Datos del formulario.
 * @param columnasTablero Columnas Kanban del tipo de proceso seleccionado (para la etapa inicial).
 */
export function construirExpedienteDesdeDemanda(
  demandaData: NuevaDemandaData,
  columnasTablero: { id: string }[] = [],
): Record<string, any> {
  return {
    radicado: demandaData.numeroRadicado,
    tipoProceso: demandaData.tipoProceso,
    jurisdiccion: 'Contencioso Administrativo',
    demandante: demandaData.demandantes[0]?.nombre || 'Sin Demandante',
    demandado: demandaData.demandados[0]?.nombre || 'Sin Demandado',
    estado: 'ACTIVO',
    fechaRadicacion: new Date().toISOString(),
    cuantia: typeof demandaData.cuantia === 'string'
      ? parseFloat((demandaData.cuantia as string).replace(/[^0-9.-]/g, '')) || 0
      : demandaData.cuantia,
    nivelRiesgo: demandaData.nivelRiesgo,
    provisionContable: demandaData.provisionContable || 0,
    fechaEstimacionProvision: demandaData.fechaEstimacionProvision
      ? new Date(demandaData.fechaEstimacionProvision).toISOString()
      : undefined,
    observacionProvision: demandaData.observacionesProvision,
    abogadoSustanciador: (demandaData as any).abogadoResponsable || demandaData.abogadoAsignado,
    medioControl: demandaData.medioControl,
    juzgadoConocimiento: `${demandaData.juzgado} - ${demandaData.ciudad}, ${demandaData.departamento}`,
    ubicacionFisica: demandaData.ciudad,
    pretensionDemandante: demandaData.pretensiones,
    fechaNotificacion: demandaData.fechaNotificacion,
    fechaVencimientoTermino: demandaData.fechaVencimiento,
    etapaProcesal: demandaData.etapa || (columnasTablero.length > 0 ? columnasTablero[0].id : 'RADICACION'),
    ultimaActuacion: undefined,
    camposAdicionales: {
      ...(demandaData.camposAdicionales
        ? Object.fromEntries(
            Object.entries(demandaData.camposAdicionales).map(([k, v]) => [
              k,
              (v && typeof v === 'object' && (v as any).base64 && (v as any).esNuevo)
                ? { nombre: (v as any).nombre, tipoMime: (v as any).tipoMime, tamano: (v as any).tamano, cargado: true }
                : v,
            ]),
          )
        : {}),
      ...(demandaData.territorial ? { territorial: demandaData.territorial } : {}),
      ...(demandaData.dependencia ? { dependencia: demandaData.dependencia } : {}),
      ...((demandaData as any).territorialNombre ? { territorialNombre: (demandaData as any).territorialNombre } : {}),
      ...((demandaData as any).dependenciaNombre ? { dependenciaNombre: (demandaData as any).dependenciaNombre } : {}),
    },
    actors: [
      ...demandaData.demandantes.map((d) => ({
        nombre: d.nombre,
        tipoPersona: d.tipoPersona,
        identificacion: d.identificacion,
        rol: 'DEMANDANTE',
        telefono: d.telefono,
        email: d.email,
        direccion: d.direccion,
        apoderado: d.apoderado,
      })),
      ...demandaData.demandados.map((d) => ({
        nombre: d.nombre,
        tipoPersona: d.tipoPersona,
        identificacion: d.identificacion,
        rol: 'DEMANDADO',
        cargo: d.cargo,
        telefono: d.telefono,
        email: d.email,
        direccion: d.direccion,
        apoderado: d.apoderado,
      })),
      ...demandaData.otrosActores.map((d) => ({
        nombre: d.nombre,
        tipoPersona: d.tipoPersona,
        identificacion: d.identificacion,
        rol: d.rol || 'OTRO',
        telefono: d.telefono,
        email: d.email,
        direccion: d.direccion,
        apoderado: d.apoderado,
      })),
    ],
    tipoIdDemandante: demandaData.demandantes[0]?.tipoPersona === 'natural' ? 'CC' : 'NIT',
    numeroIdDemandante: demandaData.demandantes[0]?.identificacion || '',
    demandanteDireccion: demandaData.demandantes[0]?.direccion || '',
    demandanteTelefono: demandaData.demandantes[0]?.telefono || '',
    demandanteEmail: demandaData.demandantes[0]?.email || '',
    demandanteApoderado: demandaData.demandantes[0]?.apoderado || '',
    tipoIdDemandado: demandaData.demandados[0]?.tipoPersona === 'natural' ? 'CC' : 'NIT',
    numeroIdDemandado: demandaData.demandados[0]?.identificacion || '',
    demandadoDireccion: demandaData.demandados[0]?.direccion || '',
    demandadoTelefono: demandaData.demandados[0]?.telefono || '',
    demandadoEmail: demandaData.demandados[0]?.email || '',
    esDelitoAdminPublica: demandaData.esDelitoAdminPublica || false,
    esConductaPatrimonioPublico: demandaData.esConductaPatrimonioPublico || false,
    territorial: demandaData.territorial,
    dependencia: demandaData.dependencia,
    territorialNombre: (demandaData as any).territorialNombre,
    dependenciaNombre: (demandaData as any).dependenciaNombre,
  };
}
