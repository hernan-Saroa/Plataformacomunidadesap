import { getApiGatewayBaseUrl } from '../../config/environment';
import {
  ActividadProceso,
  CamposFaltantesError,
  EstadoAdendas,
  EstadoApertura,
  EstadoAudienciaRiesgos,
  Cdp,
  CondicionesMipymeConfig,
  ConflictoError,
  EstadoDocumentos,
  EstadoMipyme,
  EstadoComite,
  EstadoEvaluacion,
  Adjudicar,
  DeclararDesierto,
  EstadoAdjudicacion,
  EstadoDeclaratoriaDesierta,
  EstadoAudienciaAdjudicacion,
  EstadoInformeDefinitivoProceso,
  EstadoSubsanaciones,
  EstadoTraslado,
  RegistrarSubsanacion,
  TipoPiezaAudiencia,
  EstadoContratoProceso,
  DatosContrato,
  DatosFirma,
  DatosGarantia,
  DatosArl,
  EstadoLegalizacion,
  EstadoSupervision,
  DatosSupervisor,
  EstadoActaInicio,
  DatosActaInicio,
  EstadoPagos,
  DatosPago,
  TipoSoportePago,
  EstadoRegistroPresupuestal,
  DatosSolicitudRp,
  DatosExpedicionRp,
  EstadoPublicacionContrato,
  DatosPublicacionContrato,
  EstadoObservaciones,
  EstadoOfertas,
  MiembroPropuesto,
  EstadoPublicacion,
  EstadoRespaldo,
  EstudioPrevio,
  Expediente,
  SimulacionFormulario,
  Cobertura,
  Matriz,
  FlujoModalidad,
  RegistrarResultado,
  CampoConfigurable,
  ActividadCatalogo,
  ActividadAplicable,
  EtapaConActividades,
  TipologiaConfigurable,
  GuardarTipologia,
  Modalidad,
  GuardarRegla,
  ReglaActividad,
  Persona,
  PlantillaFormato,
  PlazosPublicacion,
  ProcesoResumen,
  RevisionEstudioPrevio,
  SmmlvAnual,
  SugerenciaModalidad,
  UmbralesVigentes,
  UmbralVigente,
  UnidadUmbral,
} from '../types';

const SERVICE_PREFIX = '/hiring/api/v1';

/**
 * Cliente propio en vez del apiClient genérico: el criterio 2 del HU depende
 * de leer el cuerpo del 422 (camposFaltantes), que un `throw new Error(status)`
 * descartaría.
 */
async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiGatewayBaseUrl()}${SERVICE_PREFIX}${ruta}`, {
    credentials: 'include',
    headers: init?.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...init,
  });

  if (res.ok) {
    const texto = await res.text();
    return (texto ? JSON.parse(texto) : {}) as T;
  }

  let cuerpo: any = {};
  try {
    cuerpo = await res.json();
  } catch {
    /* respuesta sin cuerpo JSON */
  }

  if (res.status === 422 && Array.isArray(cuerpo?.camposFaltantes)) {
    throw new CamposFaltantesError(
      cuerpo.camposFaltantes,
      cuerpo.documentoFaltante === true,
      cuerpo.message,
    );
  }
  if (res.status === 409) {
    throw new ConflictoError(cuerpo?.message ?? 'El estudio previo cambió en otra sesión');
  }
  if (res.status === 401) {
    throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  }
  if (res.status === 403) {
    throw new Error(cuerpo?.message ?? 'No tienes permisos para realizar esta acción');
  }

  throw new Error(cuerpo?.message ?? `Error ${res.status}`);
}

export const contratacionService = {
  listarProcesos: () => pedir<ProcesoResumen[]>('/procesos'),

  /** Catálogo para el selector; se consulta antes de crear el proceso. */
  modalidades: () => pedir<Modalidad[]>('/modalidades'),

  /** Personas para los selectores; el termino filtra por nombre. */
  personas: (q = '') => pedir<Persona[]>(`/personas?q=${encodeURIComponent(q)}`),

  /**
   * Modalidad que corresponde a una cuantía. Se consulta mientras se digita el
   * valor, antes de que el proceso exista.
   */
  sugerenciaModalidad: (valorEstimado: number, signal?: AbortSignal) =>
    pedir<SugerenciaModalidad>(`/umbrales/sugerencia?valorEstimado=${valorEstimado}`, { signal }),

  // ------------------------------------------------------ etapa 4 · CDP ----

  /** Actividades de una etapa con su estado; alimenta el riel. */
  actividades: (procesoId: string, etapa?: number) =>
    pedir<ActividadProceso[]>(
      `/procesos/${procesoId}/actividades${etapa ? `?etapa=${etapa}` : ''}`,
    ),

  respaldoCdp: (procesoId: string) => pedir<EstadoRespaldo>(`/procesos/${procesoId}/cdp`),

  solicitarCdp: (
    procesoId: string,
    datos: { rubro: string; valor: number; vigenciaFiscal?: number; observaciones?: string },
  ) => pedir<Cdp>(`/procesos/${procesoId}/cdp`, { method: 'POST', body: JSON.stringify(datos) }),

  verificarCdp: (procesoId: string) =>
    pedir<Cdp>(`/procesos/${procesoId}/cdp/verificar`, { method: 'POST' }),

  expedirCdp: (
    procesoId: string,
    datos: { numero: string; valor: number; fechaExpedicion: string; vigenciaFiscal?: number },
  ) =>
    pedir<Cdp>(`/procesos/${procesoId}/cdp/expedir`, {
      method: 'POST',
      body: JSON.stringify(datos),
    }),

  rechazarCdp: (procesoId: string, observaciones: string) =>
    pedir<Cdp>(`/procesos/${procesoId}/cdp/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ observaciones }),
    }),

  adjuntarCdp: (procesoId: string, archivo: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', archivo);
    return pedir<Cdp>(`/procesos/${procesoId}/cdp/documento`, { method: 'POST', body: cuerpo });
  },

  // -------------------------------- etapa 5 · adendas del proceso (5.6) -----

  /** Adendas del proceso, con su estado y si se pueden emitir nuevas. */
  adendas: (procesoId: string) => pedir<EstadoAdendas>(`/procesos/${procesoId}/adendas`),

  /**
   * Emite una adenda con su documento firmado.
   *
   * Emitir no publica: la adenda queda registrada con su consecutivo, pero no
   * produce efectos —ni mueve el cronograma— hasta que se publique.
   */
  emitirAdenda: (
    procesoId: string,
    datos: { tipo: 'FONDO' | 'CRONOGRAMA'; objeto: string; vencimientoNuevo?: string },
    documento: File,
  ) => {
    const cuerpo = new FormData();
    cuerpo.append('file', documento);
    cuerpo.append('tipo', datos.tipo);
    cuerpo.append('objeto', datos.objeto);
    if (datos.vencimientoNuevo) cuerpo.append('vencimientoNuevo', datos.vencimientoNuevo);

    return pedir<EstadoAdendas>(`/procesos/${procesoId}/adendas`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Publica una adenda emitida; si es de cronograma, aquí se mueve el plazo. */
  publicarAdenda: (procesoId: string, adendaId: string, fechaPublicacion: string, evidencia: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', evidencia);
    cuerpo.append('fechaPublicacion', fechaPublicacion);

    return pedir<EstadoAdendas>(`/procesos/${procesoId}/adendas/${adendaId}/publicar`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Anula una adenda emitida por error; una publicada ya no se puede anular. */
  anularAdenda: (procesoId: string, adendaId: string, motivo: string) =>
    pedir<EstadoAdendas>(`/procesos/${procesoId}/adendas/${adendaId}/anular`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  // ------------------------ etapa 6 · recepción de ofertas (6.1) ------------

  /** Estado de la recepción: el plazo, si sigue abierta y qué ofertas van. */
  ofertas: (procesoId: string) => pedir<EstadoOfertas>(`/procesos/${procesoId}/ofertas`),

  /**
   * Fija o corrige el vencimiento del plazo.
   *
   * Hace falta cuando la modalidad no tiene plazo parametrizado, y cuando el
   * cronograma cierra a una hora distinta del final del día que calcula la
   * plataforma. Se manda en ISO con zona para que no dependa del navegador.
   */
  fijarPlazoOfertas: (procesoId: string, vencimiento: string) =>
    pedir<EstadoOfertas>(`/procesos/${procesoId}/ofertas/plazo`, {
      method: 'PUT',
      body: JSON.stringify({ vencimiento }),
    }),

  /** Registra una oferta recibida en ventanilla, con su soporte. */
  registrarOferente: (
    procesoId: string,
    datos: {
      nombre: string;
      identificacion: string;
      fechaRadicacion: string;
      valorOfertado?: number;
    },
    soporte: File,
  ) => {
    const cuerpo = new FormData();
    cuerpo.append('file', soporte);
    cuerpo.append('nombre', datos.nombre);
    cuerpo.append('identificacion', datos.identificacion);
    cuerpo.append('fechaRadicacion', datos.fechaRadicacion);
    // Solo si viene: enviarlo vacío haría que el DTO lo leyera como 0, y una
    // oferta de cero pesos entraría al cálculo económico como la más barata.
    if (datos.valorOfertado != null) cuerpo.append('valorOfertado', String(datos.valorOfertado));

    return pedir<EstadoOfertas>(`/procesos/${procesoId}/ofertas`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Retira una oferta registrada por error; solo antes del cierre. */
  retirarOferente: (procesoId: string, oferenteId: string) =>
    pedir<EstadoOfertas>(`/procesos/${procesoId}/ofertas/${oferenteId}`, { method: 'DELETE' }),

  /** Cierra la recepción al vencimiento y con ello publica la lista. */
  cerrarRecepcion: (procesoId: string) =>
    pedir<EstadoOfertas>(`/procesos/${procesoId}/ofertas/cerrar`, { method: 'POST' }),

  // -------------------------- etapa 6 · comité evaluador (6.2) --------------

  /** Comité del proceso, sus miembros y si quien consulta evalúa en él. */
  comite: (procesoId: string) => pedir<EstadoComite>(`/procesos/${procesoId}/comite`),

  /**
   * Designa el comité con su memorando.
   *
   * Los miembros van como JSON dentro del multipart: la petición lleva también
   * el memorando, y `FormData` no transporta arreglos de objetos.
   */
  designarComite: (
    procesoId: string,
    datos: { fechaDesignacion: string; miembros: MiembroPropuesto[] },
    memorando: File,
  ) => {
    const cuerpo = new FormData();
    cuerpo.append('file', memorando);
    cuerpo.append('fechaDesignacion', datos.fechaDesignacion);
    cuerpo.append('miembros', JSON.stringify(datos.miembros));

    return pedir<EstadoComite>(`/procesos/${procesoId}/comite`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Revoca la designación vigente; la anterior se conserva en el expediente. */
  revocarComite: (procesoId: string, motivo: string) =>
    pedir<EstadoComite>(`/procesos/${procesoId}/comite/revocar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  // -------------------------- etapa 8 · contrato electrónico (8.1) ----------

  /** Contrato del proceso, las tipologías y los formatos del SIG. */
  contrato: (procesoId: string) =>
    pedir<EstadoContratoProceso>(`/procesos/${procesoId}/contrato`),

  /**
   * Genera el contrato con la minuta ya diligenciada.
   *
   * Los datos van sueltos en el multipart y no como JSON: son campos planos, y
   * `FormData` los transporta sin necesidad de serializarlos.
   */
  generarContrato: (procesoId: string, datos: DatosContrato, minuta: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', minuta);

    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        cuerpo.append(clave, String(valor));
      }
    }

    return pedir<EstadoContratoProceso>(`/procesos/${procesoId}/contrato`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Registra la aceptación del proponente, con su nombre. */
  aceptarContrato: (procesoId: string, aceptadoPor: string, observacion?: string) =>
    pedir<EstadoContratoProceso>(`/procesos/${procesoId}/contrato/aceptar`, {
      method: 'POST',
      body: JSON.stringify({ aceptadoPor, observacion }),
    }),

  /**
   * Registra la firma de una de las partes, con su evidencia (EFDS-1162).
   *
   * Con la segunda firma el contrato queda perfeccionado; eso lo decide el
   * servidor al comprobar que ya están las dos, no la pantalla.
   */
  firmarContrato: (procesoId: string, datos: DatosFirma, evidencia: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', evidencia);

    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        cuerpo.append(clave, String(valor));
      }
    }

    return pedir<EstadoContratoProceso>(`/procesos/${procesoId}/contrato/firmar`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Registra que el proponente no acepta; la minuta queda en el expediente. */
  rechazarContrato: (procesoId: string, rechazadoPor: string, motivo: string) =>
    pedir<EstadoContratoProceso>(`/procesos/${procesoId}/contrato/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ rechazadoPor, motivo }),
    }),

  // -------------------- etapa 8 · pólizas, garantías y ARL (8.4/8.5) --------

  /** Garantías con sus amparos, la ARL y qué falta para legalizar. */
  legalizacion: (procesoId: string) =>
    pedir<EstadoLegalizacion>(`/procesos/${procesoId}/legalizacion`),

  /**
   * Carga una póliza con sus amparos desglosados.
   *
   * Los amparos van como JSON dentro del multipart: la petición lleva también
   * la póliza, y `FormData` no transporta arreglos de objetos.
   */
  cargarGarantia: (procesoId: string, datos: DatosGarantia, poliza: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', poliza);
    cuerpo.append('aseguradora', datos.aseguradora);
    cuerpo.append('numeroPoliza', datos.numeroPoliza);
    cuerpo.append('amparos', JSON.stringify(datos.amparos));

    return pedir<EstadoLegalizacion>(`/procesos/${procesoId}/legalizacion/garantias`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /**
   * Aprueba una póliza; con todas aprobadas el contrato queda legalizado.
   *
   * Con cuerpo vacío explícito: el gateway trata mal los POST sin body.
   */
  aprobarGarantia: (procesoId: string, garantiaId: string) =>
    pedir<EstadoLegalizacion>(
      `/procesos/${procesoId}/legalizacion/garantias/${garantiaId}/aprobar`,
      { method: 'POST', body: JSON.stringify({}) },
    ),

  /** Devuelve una póliza con el motivo; después se carga la corregida. */
  rechazarGarantia: (procesoId: string, garantiaId: string, motivo: string) =>
    pedir<EstadoLegalizacion>(
      `/procesos/${procesoId}/legalizacion/garantias/${garantiaId}/rechazar`,
      { method: 'POST', body: JSON.stringify({ motivo }) },
    ),

  /** Registra la afiliación a la ARL, obligatoria para persona natural. */
  registrarArl: (procesoId: string, datos: DatosArl, soporte: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', soporte);

    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        cuerpo.append(clave, String(valor));
      }
    }

    return pedir<EstadoLegalizacion>(`/procesos/${procesoId}/legalizacion/arl`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  // ---------------------- etapa 8 · publicación del contrato (8.8) ----------

  /** Dónde se publicó el contrato, si llegó a tiempo y qué falta. */
  publicacionContrato: (procesoId: string) =>
    pedir<EstadoPublicacionContrato>(`/procesos/${procesoId}/publicacion-contrato`),

  /** Registra la publicación con su evidencia. */
  publicarContrato: (
    procesoId: string,
    datos: DatosPublicacionContrato,
    evidencia: File,
  ) => {
    const cuerpo = new FormData();
    cuerpo.append('file', evidencia);

    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        cuerpo.append(clave, String(valor));
      }
    }

    return pedir<EstadoPublicacionContrato>(`/procesos/${procesoId}/publicacion-contrato`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  // ---------------------- etapa 8 · registro presupuestal (8.3) -------------

  /** En qué punto va el RP del contrato y si el monto alcanza a cubrirlo. */
  registroPresupuestal: (procesoId: string) =>
    pedir<EstadoRegistroPresupuestal>(`/procesos/${procesoId}/registro-presupuestal`),

  /** Radica la solicitud ante la Dirección Financiera. */
  solicitarRp: (procesoId: string, datos: DatosSolicitudRp) =>
    pedir<EstadoRegistroPresupuestal>(`/procesos/${procesoId}/registro-presupuestal`, {
      method: 'POST',
      body: JSON.stringify(datos),
    }),

  /** La Financiera confirma que hay recursos que comprometer. */
  verificarRp: (procesoId: string) =>
    pedir<EstadoRegistroPresupuestal>(`/procesos/${procesoId}/registro-presupuestal/verificar`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  /** Expide el RP con su número; el soporte es opcional, como en el CDP. */
  expedirRp: (procesoId: string, datos: DatosExpedicionRp, soporte: File | null) => {
    const cuerpo = new FormData();
    if (soporte) cuerpo.append('file', soporte);

    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        cuerpo.append(clave, String(valor));
      }
    }

    return pedir<EstadoRegistroPresupuestal>(
      `/procesos/${procesoId}/registro-presupuestal/expedir`,
      { method: 'POST', body: cuerpo },
    );
  },

  /** Rechaza la solicitud con su motivo. */
  rechazarRp: (procesoId: string, observaciones: string) =>
    pedir<EstadoRegistroPresupuestal>(`/procesos/${procesoId}/registro-presupuestal/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ observaciones }),
    }),

  // ---------------------- etapa 8 · supervisión del contrato (8.2) ----------

  /** Quién supervisa el contrato, si ya se le avisó y quiénes lo hicieron antes. */
  supervision: (procesoId: string) =>
    pedir<EstadoSupervision>(`/procesos/${procesoId}/supervision`),

  /** Designa al supervisor con el acto administrativo que lo nombra. */
  designarSupervisor: (procesoId: string, datos: DatosSupervisor, acto: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', acto);

    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        cuerpo.append(clave, String(valor));
      }
    }

    return pedir<EstadoSupervision>(`/procesos/${procesoId}/supervision`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Releva al supervisor vigente; el anterior se conserva en el expediente. */
  relevarSupervisor: (procesoId: string, motivo: string) =>
    pedir<EstadoSupervision>(`/procesos/${procesoId}/supervision/relevar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  /** Deja constancia de que se le comunicó la designación (matriz 8.2). */
  avisarSupervisor: (procesoId: string) =>
    pedir<EstadoSupervision>(`/procesos/${procesoId}/supervision/aviso`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  // ----------------------------- etapa 9 · acta de inicio (9.1) -------------

  /** Si el contrato admite acta, quien lo supervisa y el acta vigente. */
  actaInicio: (procesoId: string) =>
    pedir<EstadoActaInicio>(`/procesos/${procesoId}/acta-inicio`),

  /**
   * Suscribe el acta y deja el contrato en ejecucion.
   *
   * Viaja como multipart porque lleva el acta firmada: sin ella hubo una
   * reunion, no un inicio.
   */
  suscribirActaInicio: (procesoId: string, datos: DatosActaInicio, acta: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', acta);

    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        cuerpo.append(clave, String(valor));
      }
    }

    return pedir<EstadoActaInicio>(`/procesos/${procesoId}/acta-inicio`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Anula el acta vigente; el contrato vuelve a legalizado. */
  anularActaInicio: (procesoId: string, motivo: string) =>
    pedir<EstadoActaInicio>(`/procesos/${procesoId}/acta-inicio/anular`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  // --------------------------- etapa 9 · tramite de pagos (9.4) -------------

  /** Cuentas de cobro del contrato, con lo cobrado y lo tramitado. */
  pagos: (procesoId: string) => pedir<EstadoPagos>(`/procesos/${procesoId}/pagos`),

  /**
   * Radica la cuenta con la factura y el informe de actividades.
   *
   * Los dos van en la misma peticion porque los dos los exige el criterio de
   * la historia: la factura es lo que se cobra y el informe lo que sustenta
   * que se presto.
   */
  radicarPago: (procesoId: string, datos: DatosPago, factura: File, informe: File) => {
    const cuerpo = new FormData();
    cuerpo.append('factura', factura);
    cuerpo.append('informe', informe);

    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        cuerpo.append(clave, String(valor));
      }
    }

    return pedir<EstadoPagos>(`/procesos/${procesoId}/pagos`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Suma un soporte: seguridad social, RUT o el anexo que sea. */
  cargarSoportePago: (
    procesoId: string,
    pagoId: string,
    tipo: TipoSoportePago,
    archivo: File,
    descripcion?: string,
  ) => {
    const cuerpo = new FormData();
    cuerpo.append('file', archivo);
    cuerpo.append('tipo', tipo);
    if (descripcion) cuerpo.append('descripcion', descripcion);

    return pedir<EstadoPagos>(`/procesos/${procesoId}/pagos/${pagoId}/soportes`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** El aval del supervisor sobre una cuenta radicada. */
  avalarPago: (procesoId: string, pagoId: string, observacion?: string) =>
    pedir<EstadoPagos>(`/procesos/${procesoId}/pagos/${pagoId}/avalar`, {
      method: 'POST',
      body: JSON.stringify(observacion ? { observacion } : {}),
    }),

  /** Devuelve la cuenta al contratista para que la corrija. */
  devolverPago: (procesoId: string, pagoId: string, motivo: string) =>
    pedir<EstadoPagos>(`/procesos/${procesoId}/pagos/${pagoId}/devolver`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  /** La Direccion Financiera registra que el pago se tramito. */
  tramitarPago: (procesoId: string, pagoId: string, referenciaPago: string) =>
    pedir<EstadoPagos>(`/procesos/${procesoId}/pagos/${pagoId}/tramitar`, {
      method: 'POST',
      body: JSON.stringify({ referenciaPago }),
    }),

  /** Anula una cuenta que no debio radicarse. */
  anularPago: (procesoId: string, pagoId: string, motivo: string) =>
    pedir<EstadoPagos>(`/procesos/${procesoId}/pagos/${pagoId}/anular`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  // -------------------------- etapa 5 · audiencia de riesgos (5.5) ----------

  /** Estado de la audiencia: si aplica, si es obligatoria y si ya se celebró. */
  audienciaRiesgos: (procesoId: string) =>
    pedir<EstadoAudienciaRiesgos>(`/procesos/${procesoId}/audiencia-riesgos`),

  /**
   * Registra la audiencia celebrada con su acta y su matriz consolidada.
   *
   * Los dos documentos van juntos porque la actividad exige la audiencia y la
   * consolidación de su resultado: un acta sin matriz la dejaría a medias.
   */
  registrarAudienciaRiesgos: (
    procesoId: string,
    datos: { fechaCelebracion: string; observaciones?: string },
    acta: File,
    matriz: File,
  ) => {
    const cuerpo = new FormData();
    cuerpo.append('acta', acta);
    cuerpo.append('matriz', matriz);
    cuerpo.append('fechaCelebracion', datos.fechaCelebracion);
    if (datos.observaciones) cuerpo.append('observaciones', datos.observaciones);

    return pedir<EstadoAudienciaRiesgos>(`/procesos/${procesoId}/audiencia-riesgos`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Anula la audiencia para corregirla; donde es obligatoria vuelve a bloquear. */
  anularAudienciaRiesgos: (procesoId: string, motivo: string) =>
    pedir<EstadoAudienciaRiesgos>(`/procesos/${procesoId}/audiencia-riesgos/anular`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  // ------------------------------ etapa 5 · apertura del proceso (5.7) ------

  /** Estado de la apertura y qué falta para poder abrir. */
  apertura: (procesoId: string) => pedir<EstadoApertura>(`/procesos/${procesoId}/apertura`),

  /**
   * Registra la resolución de apertura con el pliego definitivo y abre el proceso.
   *
   * Los tres documentos viajan con los datos en la misma petición: el proceso
   * se abre con todos o no se abre, y dejarlo en dos pasos permitiría un
   * proceso abierto sin el acto que lo respalda. La evidencia prueba que el
   * pliego definitivo se publicó, igual que en la actividad 5.2.
   */
  registrarApertura: (
    procesoId: string,
    datos: { resolucionNumero: string; resolucionFecha: string; secopUrl?: string },
    resolucion: File,
    pliegoDefinitivo: File,
    evidencia: File,
  ) => {
    const cuerpo = new FormData();
    cuerpo.append('resolucion', resolucion);
    cuerpo.append('pliegoDefinitivo', pliegoDefinitivo);
    cuerpo.append('evidencia', evidencia);
    cuerpo.append('resolucionNumero', datos.resolucionNumero);
    cuerpo.append('resolucionFecha', datos.resolucionFecha);
    if (datos.secopUrl) cuerpo.append('secopUrl', datos.secopUrl);

    return pedir<EstadoApertura>(`/procesos/${procesoId}/apertura`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  // ------------------------- etapa 5 · documentos del proceso (5.1) ---------

  /** Qué documentos exige la modalidad y cuáles ya están cargados. */
  documentosProceso: (procesoId: string) =>
    pedir<EstadoDocumentos>(`/procesos/${procesoId}/documentos`),

  /**
   * Formatos del SIG aplicables a una actividad, filtrados por modalidad.
   *
   * Es la cara del gestor de la biblioteca: los administra Configuración por
   * /configuracion/plantillas, y aquí solo se consultan para descargarlos.
   */
  plantillasDeActividad: (numeral: string, modalidad?: string) =>
    pedir<PlantillaFormato[]>(
      `/procesos/plantillas/${encodeURIComponent(numeral)}${
        modalidad ? `?modalidad=${encodeURIComponent(modalidad)}` : ''
      }`,
    ),

  /**
   * Carga uno de los documentos que la actividad exige.
   *
   * El código viaja en el cuerpo junto al archivo: la petición ya es multipart,
   * y ponerlo en la ruta chocaría con `/documentos/iniciar`.
   */
  cargarDocumentoProceso: (procesoId: string, codigo: string, archivo: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', archivo);
    cuerpo.append('codigo', codigo);

    return pedir<EstadoDocumentos>(`/procesos/${procesoId}/documentos`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Deja sin efecto un documento cargado para sustituirlo por otro. */
  anularDocumentoProceso: (procesoId: string, documentoId: string) =>
    pedir<EstadoDocumentos>(`/procesos/${procesoId}/documentos/${documentoId}/anular`, {
      method: 'POST',
      body: '{}',
    }),

  // ---------------------------- etapa 5 · publicación del proyecto de pliego -

  /** Publicación vigente y estado del plazo de publicidad. */
  publicacionPliego: (procesoId: string) =>
    pedir<EstadoPublicacion>(`/procesos/${procesoId}/publicacion-pliego`),

  /**
   * Registra la publicación con su evidencia en una sola petición.
   *
   * La evidencia va aquí y no en un paso posterior porque sin ella no hay
   * registro: es lo único que prueba que la publicación existió, y el registro
   * arranca un plazo legal. Admite imágenes además de documentos, que la prueba
   * suele ser una captura de SECOP II.
   *
   * La fecha es la de la publicación real, no la del registro: es la que
   * arranca el plazo, y el backend calcula el vencimiento con ella.
   */
  registrarPublicacion: (
    procesoId: string,
    datos: { fechaPublicacion: string; secopNumero?: string; secopUrl?: string },
    evidencia: File,
  ) => {
    const cuerpo = new FormData();
    cuerpo.append('file', evidencia);
    cuerpo.append('fechaPublicacion', datos.fechaPublicacion);
    if (datos.secopNumero) cuerpo.append('secopNumero', datos.secopNumero);
    if (datos.secopUrl) cuerpo.append('secopUrl', datos.secopUrl);

    return pedir<EstadoPublicacion>(`/procesos/${procesoId}/publicacion-pliego`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Deja sin efecto la publicación registrada para poder corregirla. */
  anularPublicacion: (procesoId: string, motivo: string) =>
    pedir<EstadoPublicacion>(`/procesos/${procesoId}/publicacion-pliego/anular`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  // ------------------------------- etapa 5 · observaciones al pliego (5.3) ---

  /** Observaciones del proceso con el resumen que decide si la actividad cumple. */
  observaciones: (procesoId: string) =>
    pedir<EstadoObservaciones>(`/procesos/${procesoId}/observaciones`),

  /**
   * Registra una observación recibida, con su soporte si lo hubo.
   *
   * El soporte es opcional, a diferencia de la evidencia de la publicación: una
   * observación pudo llegar por un canal que no deja documento, y exigirlo
   * obligaría a inventarse un archivo o a no registrarla.
   *
   * La fecha es la de presentación, no la del registro: es la que decide si
   * llegó dentro del plazo de publicidad.
   */
  registrarObservacion: (
    procesoId: string,
    datos: {
      presentadoPor: string;
      identificacion?: string;
      fechaPresentacion: string;
      asunto: string;
      contenido: string;
    },
    soporte: File | null,
  ) => {
    const cuerpo = new FormData();
    if (soporte) cuerpo.append('file', soporte);
    cuerpo.append('presentadoPor', datos.presentadoPor);
    if (datos.identificacion) cuerpo.append('identificacion', datos.identificacion);
    cuerpo.append('fechaPresentacion', datos.fechaPresentacion);
    cuerpo.append('asunto', datos.asunto);
    cuerpo.append('contenido', datos.contenido);

    return pedir<EstadoObservaciones>(`/procesos/${procesoId}/observaciones`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** La respuesta cierra la observación; no se reescribe después. */
  responderObservacion: (
    procesoId: string,
    observacionId: string,
    datos: { respuesta: string; modificoPliego: boolean },
  ) =>
    pedir<EstadoObservaciones>(
      `/procesos/${procesoId}/observaciones/${observacionId}/responder`,
      { method: 'POST', body: JSON.stringify(datos) },
    ),

  /** Da por cumplida la actividad cuando venció el plazo y no llegó ninguna. */
  cerrarSinObservaciones: (procesoId: string) =>
    pedir<EstadoObservaciones>(`/procesos/${procesoId}/observaciones/cerrar`, {
      method: 'POST',
      body: '{}',
    }),

  // ---------------------------------- etapa 5 · limitación a MIPYME (5.4) ---

  /** Manifestaciones, condiciones evaluadas y decisión, si ya se tomó. */
  mipyme: (procesoId: string) => pedir<EstadoMipyme>(`/procesos/${procesoId}/mipyme`),

  /** Una MIPYME manifestó interés. De cuántas lo hagan depende la decisión. */
  registrarManifestacionMipyme: (
    procesoId: string,
    datos: { nombre: string; identificacion: string; fechaPresentacion: string },
    soporte: File | null,
  ) => {
    const cuerpo = new FormData();
    if (soporte) cuerpo.append('file', soporte);
    cuerpo.append('nombre', datos.nombre);
    cuerpo.append('identificacion', datos.identificacion);
    cuerpo.append('fechaPresentacion', datos.fechaPresentacion);

    return pedir<EstadoMipyme>(`/procesos/${procesoId}/mipyme/manifestaciones`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /**
   * Registra la decisión sobre la limitación.
   *
   * El motivo lo exige el backend cuando la decisión se aparta del cálculo, y
   * el acto administrativo cuando se limita: limitar restringe quién puede
   * presentarse a un proceso público.
   */
  decidirMipyme: (
    procesoId: string,
    datos: { limitado: boolean; motivo?: string },
    acto: File | null,
  ) => {
    const cuerpo = new FormData();
    if (acto) cuerpo.append('file', acto);
    cuerpo.append('limitado', String(datos.limitado));
    if (datos.motivo) cuerpo.append('motivo', datos.motivo);

    return pedir<EstadoMipyme>(`/procesos/${procesoId}/mipyme/decision`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  // ------------------------ administración de las condiciones de MIPYME -----

  /** Tope de valor y mínimo de manifestaciones, con su marca de confirmado. */
  condicionesMipyme: () => pedir<CondicionesMipymeConfig>('/condiciones-mipyme'),

  /**
   * Cambia una de las dos condiciones.
   *
   * No afecta a las decisiones ya tomadas: cada una congeló los parámetros con
   * los que se evaluó.
   */
  guardarCondicionMipyme: (
    clave: string,
    datos: {
      valor: number;
      unidad?: 'SMMLV' | 'PESOS';
      fundamento?: string;
      confirmado?: boolean;
    },
  ) =>
    pedir<CondicionesMipymeConfig>(`/condiciones-mipyme/${clave}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),

  // -------------------------------- administración de plazos de publicidad ---

  /** Las once modalidades con su plazo, tengan fila o no. */
  plazosPublicacion: () => pedir<PlazosPublicacion>('/plazos-publicacion'),

  /**
   * Fija el plazo de una modalidad, creándolo si no lo tenía.
   *
   * No afecta a lo ya publicado: cada publicación congeló el plazo que le
   * aplicó el día de su registro.
   */
  guardarPlazoPublicacion: (
    modalidad: string,
    datos: { diasHabiles: number; fundamento?: string; confirmado?: boolean },
  ) =>
    pedir<PlazosPublicacion>(`/plazos-publicacion/${modalidad}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),

  // ------------------------------------------- administración de umbrales ---

  umbrales: () => pedir<UmbralesVigentes>('/umbrales'),

  smmlv: () => pedir<SmmlvAnual[]>('/umbrales/smmlv'),

  guardarSmmlv: (anio: number, valor: number) =>
    pedir<SmmlvAnual>('/umbrales/smmlv', {
      method: 'PUT',
      body: JSON.stringify({ anio, valor }),
    }),

  /** Cierra el umbral vigente de la modalidad y abre el nuevo. */
  guardarUmbral: (
    modalidad: string,
    cambio: {
      limiteInferior: number | null;
      limiteSuperior: number | null;
      unidad: UnidadUmbral;
      vigenciaDesde?: string;
    },
  ) =>
    pedir<UmbralVigente>(`/umbrales/${modalidad}`, {
      method: 'PUT',
      body: JSON.stringify(cambio),
    }),

  crearProceso: (objeto: string, modalidad: string, valorEstimado: number) =>

    pedir<ProcesoResumen>('/procesos', {
      method: 'POST',
      body: JSON.stringify({ objeto, modalidad, valorEstimado }),
    }),

  obtenerEstudioPrevio: (procesoId: string) =>
    pedir<EstudioPrevio>(`/procesos/${procesoId}/estudio-previo`),

  guardarBorrador: (procesoId: string, datos: Record<string, any>, version: number) =>
    pedir<{ estado: string; version: number; datos: Record<string, any> }>(
      `/procesos/${procesoId}/estudio-previo`,
      { method: 'PUT', body: JSON.stringify({ datos, version }) },
    ),

  /**
   * Lanza CamposFaltantesError (422) cuando falta algo obligatorio.
   * El cuerpo `{}` es necesario: el gateway descarta la respuesta de un POST
   * sin cuerpo y la convierte en un 400 vacío, perdiendo camposFaltantes.
   */
  enviarARevision: (procesoId: string) =>
    pedir<{ estado: string; enviadoPor: string; enviadoAt: string }>(
      `/procesos/${procesoId}/estudio-previo/enviar`,
      { method: 'POST', body: '{}' },
    ),

  /** Numeral 3.4: aprueba el estudio previo enviado a revisión. */
  aprobar: (procesoId: string, observaciones?: string) =>
    pedir<{ estado: string; decision: string; revisadoPor: string }>(
      `/procesos/${procesoId}/estudio-previo/aprobar`,
      { method: 'POST', body: JSON.stringify({ observaciones }) },
    ),

  /** Numeral 3.4: devuelve al gestor con observaciones (obligatorias). */
  devolver: (procesoId: string, observaciones: string) =>
    pedir<{ estado: string; decision: string; revisadoPor: string }>(
      `/procesos/${procesoId}/estudio-previo/devolver`,
      { method: 'POST', body: JSON.stringify({ observaciones }) },
    ),

  revisiones: (procesoId: string) =>
    pedir<RevisionEstudioPrevio[]>(`/procesos/${procesoId}/estudio-previo/revisiones`),

  obtenerExpediente: (procesoId: string) =>
    pedir<Expediente>(`/procesos/${procesoId}/expediente`),

  adjuntarDocumento: (procesoId: string, archivo: File) => {
    const form = new FormData();
    form.append('file', archivo);
    return pedir<{ id: string; nombre: string }>(
      `/procesos/${procesoId}/estudio-previo/documentos`,
      { method: 'POST', body: form },
    );
  },

  // ------------------------------------------ configuración de etapas ---

  /** Las 63 actividades de la matriz, agrupadas por etapa. */
  catalogoActividades: () => pedir<EtapaConActividades[]>('/configuracion/actividades'),

  // ---------------- configuración · tipologías de contrato (EFDS-1161) ------

  /** Las tipologías con las que se elabora un contrato. */
  tipologias: () => pedir<TipologiaConfigurable[]>('/configuracion/tipologias'),

  /** Crea una tipología o ajusta la que ya existe con ese código. */
  guardarTipologia: (datos: GuardarTipologia) =>
    pedir<TipologiaConfigurable>('/configuracion/tipologias', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),

  /** La retira de circulación; los contratos que la usaron la conservan. */
  retirarTipologia: (codigo: string) =>
    pedir<TipologiaConfigurable>(`/configuracion/tipologias/${codigo}/retirar`, {
      method: 'PUT',
      body: JSON.stringify({}),
    }),

  /** Actividades marcadas según apliquen o no a la modalidad. */
  actividadesDeModalidad: (modalidad: string) =>
    pedir<ActividadAplicable[]>(`/configuracion/actividades/modalidad/${modalidad}`),

  // ---------------------------------------- configuracion · escritura ----

  /** Corrige el texto de una actividad y sus parametros de tramite. */
  actualizarActividad: (
    numeral: string,
    datos: {
      nombre: string;
      descripcion?: string;
      activa?: boolean;
      // Ausente conserva lo guardado; null lo borra. Enviar siempre todos
      // haria que corregir una errata en el nombre vaciara el plazo.
      plazoDias?: number | null;
      responsableCargo?: string | null;
      alertaDiasAntes?: number | null;
    },
  ) =>
    pedir<ActividadCatalogo>(`/configuracion/actividades/${numeral}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),

  /** Marca si la actividad aplica a una modalidad. */
  cambiarAplicabilidad: (
    numeral: string,
    datos: { modalidad: string; aplica: boolean; motivo?: string },
  ) =>
    pedir<ActividadAplicable>(`/configuracion/actividades/${numeral}/aplicabilidad`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),

  /**
   * La rejilla completa: cada actividad contra cada modalidad.
   *
   * Una sola peticion para toda la tabla: pedirla actividad por actividad
   * costaba 63 llamadas para dibujar una pantalla.
   */
  matriz: () => pedir<Matriz>('/configuracion/matriz'),

  /** Lo que la actividad le pide al gestor. */
  campos: (numeral: string) =>
    pedir<CampoConfigurable[]>(`/configuracion/actividades/${numeral}/campos`),

  crearCampo: (numeral: string, datos: { tipo: string; etiqueta: string }) =>
    pedir<CampoConfigurable>(`/configuracion/actividades/${numeral}/campos`, {
      method: 'POST',
      body: JSON.stringify(datos),
    }),

  /** Formatos del SIG registrados, opcionalmente los de una actividad. */
  plantillas: (numeral?: string) =>
    pedir<PlantillaFormato[]>(
      `/configuracion/plantillas${numeral ? `?numeral=${encodeURIComponent(numeral)}` : ''}`,
    ),

  /** Registra un formato con su archivo. El multipart lo arma quien llama. */
  guardarPlantilla: (cuerpo: FormData) =>
    pedir<PlantillaFormato>('/configuracion/plantillas', {
      method: 'POST',
      body: cuerpo,
    }),

  /**
   * Corrige un formato, reemplaza su archivo o lo retira de circulación.
   *
   * Solo viaja lo que se manda: retirar un formato y corregir su nombre son
   * gestos distintos, y uno no debe arrastrar al otro. Con `FormData` el
   * archivo viaja en la misma llamada.
   */
  editarPlantilla: (id: string, datos: FormData | { activo: boolean }) =>
    pedir<PlantillaFormato>(`/configuracion/plantillas/${id}`, {
      method: 'PUT',
      body: datos instanceof FormData ? datos : JSON.stringify(datos),
    }),

  /**
   * Dónde aplica un formato: en qué actividad se ofrece y a qué modalidades
   * alcanza. Omitir `modalidades` deja el alcance como estaba.
   */
  asignarPlantilla: (id: string, numeral: string | null, modalidades?: string[]) =>
    pedir<PlantillaFormato>(`/configuracion/plantillas/${id}/actividad`, {
      method: 'PUT',
      body: JSON.stringify(modalidades ? { numeral, modalidades } : { numeral }),
    }),

  /** Cambia el texto que lee el gestor, o deja de pedir el campo. */
  actualizarCampo: (
    id: string,
    datos: { etiqueta: string; ayuda?: string; obligatorio?: boolean; activo?: boolean },
  ) =>
    pedir<CampoConfigurable>(`/configuracion/campos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),

  // ----------------------------------- evaluación de ofertas (actividad 6.3) ---

  /**
   * Estado de la evaluación: las ofertas de la lista publicada, el resultado
   * que registró el comité con su informe y sus evidencias, y si quien consulta
   * integra ese comité.
   */
  evaluacion: (procesoId: string) =>
    pedir<EstadoEvaluacion>(`/procesos/${procesoId}/evaluacion`),

  /**
   * Registra el resultado con el informe del comité.
   *
   * Va como multipart porque el informe viaja en la misma petición: sin él el
   * resultado sería la opinión de quien lo digitó. Los números se envían solo
   * cuando vienen —`FormData` los convertiría en cadena vacía, y una escala en
   * blanco no es un cero.
   */
  registrarResultadoEvaluacion: (procesoId: string, datos: RegistrarResultado, informe: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', informe);
    cuerpo.append('oferenteId', datos.oferenteId);
    cuerpo.append('justificacion', datos.justificacion);
    if (datos.puntajeObtenido != null) {
      cuerpo.append('puntajeObtenido', String(datos.puntajeObtenido));
    }
    if (datos.puntajeMaximo != null) cuerpo.append('puntajeMaximo', String(datos.puntajeMaximo));
    if (datos.valorEvaluado != null) cuerpo.append('valorEvaluado', String(datos.valorEvaluado));

    return pedir<EstadoEvaluacion>(`/procesos/${procesoId}/evaluacion/resultado`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Deja sin efecto el resultado vigente; el anterior queda con su motivo. */
  rectificarResultadoEvaluacion: (procesoId: string, motivo: string) =>
    pedir<EstadoEvaluacion>(`/procesos/${procesoId}/evaluacion/resultado/rectificar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  /** Una evidencia a la vez: cada una la sube quien la produjo. */
  cargarEvidenciaEvaluacion: (procesoId: string, descripcion: string, archivo: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', archivo);
    cuerpo.append('descripcion', descripcion);

    return pedir<EstadoEvaluacion>(`/procesos/${procesoId}/evaluacion/resultado/evidencias`, {
      method: 'POST',
      body: cuerpo,
    });
  },


  // --------------------- traslado del informe y subsanaciones (6.4 a 6.6) ---

  /**
   * Estado del traslado: el informe en juego con su resultado congelado, el
   * plazo que se le aplicó y lo que queda de término.
   */
  traslado: (procesoId: string) => pedir<EstadoTraslado>(`/procesos/${procesoId}/traslado`),

  /**
   * Genera el informe preliminar congelando el resultado del comité.
   *
   * El archivo es opcional: volver a llamarlo sin adjuntar vuelve a tomar la
   * fotografía —porque el comité rectificó— conservando el documento que ya
   * estaba cargado.
   */
  generarInformeTraslado: (procesoId: string, observacion: string, informe: File | null) => {
    const cuerpo = new FormData();
    if (informe) cuerpo.append('file', informe);
    if (observacion.trim()) cuerpo.append('observacion', observacion.trim());

    return pedir<EstadoTraslado>(`/procesos/${procesoId}/traslado/informe`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /**
   * Publica y traslada el informe, con lo que abre el término.
   *
   * La evidencia va en la misma petición: no hay integración con SECOP II, así
   * que el soporte es lo que prueba la publicación.
   */
  trasladarInforme: (procesoId: string, medioPublicacion: string, evidencia: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', evidencia);
    cuerpo.append('medioPublicacion', medioPublicacion);

    return pedir<EstadoTraslado>(`/procesos/${procesoId}/traslado/trasladar`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Deja sin efecto el informe en juego; el anulado queda con su motivo. */
  anularInformeTraslado: (procesoId: string, motivo: string) =>
    pedir<EstadoTraslado>(`/procesos/${procesoId}/traslado/anular`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  /** Lo presentado contra el informe trasladado, con sus respuestas. */
  subsanaciones: (procesoId: string) =>
    pedir<EstadoSubsanaciones>(`/procesos/${procesoId}/traslado/subsanaciones`),

  /** Transcribe lo que presentó un oferente, con su soporte. */
  registrarSubsanacion: (procesoId: string, datos: RegistrarSubsanacion, soporte: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', soporte);
    cuerpo.append('oferenteId', datos.oferenteId);
    cuerpo.append('tipo', datos.tipo);
    cuerpo.append('presentadoPor', datos.presentadoPor);
    cuerpo.append('fechaPresentacion', datos.fechaPresentacion);
    cuerpo.append('asunto', datos.asunto);
    cuerpo.append('contenido', datos.contenido);
    if (datos.identificacion) cuerpo.append('identificacion', datos.identificacion);

    return pedir<EstadoSubsanaciones>(`/procesos/${procesoId}/traslado/subsanaciones`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Responde un escrito. El documento por dimensión es opcional. */
  responderSubsanacion: (
    procesoId: string,
    subsanacionId: string,
    datos: { aceptada: boolean; respuesta: string },
    documento: File | null,
  ) => {
    const cuerpo = new FormData();
    if (documento) cuerpo.append('file', documento);
    cuerpo.append('aceptada', String(datos.aceptada));
    cuerpo.append('respuesta', datos.respuesta);

    return pedir<EstadoSubsanaciones>(
      `/procesos/${procesoId}/traslado/subsanaciones/${subsanacionId}/responder`,
      { method: 'POST', body: cuerpo },
    );
  },

  /** Da por agotado el término: exige plazo vencido y nada sin responder. */
  cerrarTraslado: (procesoId: string, nota: string) =>
    pedir<EstadoSubsanaciones>(`/procesos/${procesoId}/traslado/subsanaciones/cerrar`, {
      method: 'POST',
      body: JSON.stringify(nota.trim() ? { nota: nota.trim() } : {}),
    }),


  // ---------------------------------------- adjudicación, etapa 7 (7.1-7.4) ---

  /** La audiencia registrada, sus piezas y los sobres abiertos. */
  audienciaAdjudicacion: (procesoId: string) =>
    pedir<EstadoAudienciaAdjudicacion>(`/procesos/${procesoId}/adjudicacion/audiencia`),

  /** Registra que la audiencia se celebró, con su acta. */
  celebrarAudiencia: (
    procesoId: string,
    datos: { celebradaAt: string; presididaPor: string; resumen?: string },
    acta: File,
  ) => {
    const cuerpo = new FormData();
    cuerpo.append('file', acta);
    cuerpo.append('celebradaAt', datos.celebradaAt);
    cuerpo.append('presididaPor', datos.presididaPor);
    if (datos.resumen?.trim()) cuerpo.append('resumen', datos.resumen.trim());

    return pedir<EstadoAudienciaAdjudicacion>(`/procesos/${procesoId}/adjudicacion/audiencia`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  /** Una grabación, una observación con su respuesta, o un anexo. */
  cargarPiezaAudiencia: (
    procesoId: string,
    datos: { tipo: TipoPiezaAudiencia; descripcion: string },
    archivo: File,
  ) => {
    const cuerpo = new FormData();
    cuerpo.append('file', archivo);
    cuerpo.append('tipo', datos.tipo);
    cuerpo.append('descripcion', datos.descripcion);

    return pedir<EstadoAudienciaAdjudicacion>(
      `/procesos/${procesoId}/adjudicacion/audiencia/piezas`,
      { method: 'POST', body: cuerpo },
    );
  },

  /** Abre el sobre económico de una oferta; la evidencia es opcional. */
  abrirSobreEconomico: (
    procesoId: string,
    datos: { oferenteId: string; valorOfertado: number; observacion?: string },
    evidencia: File | null,
  ) => {
    const cuerpo = new FormData();
    if (evidencia) cuerpo.append('file', evidencia);
    cuerpo.append('oferenteId', datos.oferenteId);
    cuerpo.append('valorOfertado', String(datos.valorOfertado));
    if (datos.observacion?.trim()) cuerpo.append('observacion', datos.observacion.trim());

    return pedir<EstadoAudienciaAdjudicacion>(
      `/procesos/${procesoId}/adjudicacion/audiencia/sobres`,
      { method: 'POST', body: cuerpo },
    );
  },

  anularAudiencia: (procesoId: string, motivo: string) =>
    pedir<EstadoAudienciaAdjudicacion>(`/procesos/${procesoId}/adjudicacion/audiencia/anular`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  /** El informe definitivo, con lo que cambió desde el preliminar. */
  informeDefinitivo: (procesoId: string) =>
    pedir<EstadoInformeDefinitivoProceso>(
      `/procesos/${procesoId}/adjudicacion/informe-definitivo`,
    ),

  /** Congela el resultado vigente del comité. El archivo es opcional. */
  generarInformeDefinitivo: (procesoId: string, informe: File | null) => {
    const cuerpo = new FormData();
    if (informe) cuerpo.append('file', informe);

    return pedir<EstadoInformeDefinitivoProceso>(
      `/procesos/${procesoId}/adjudicacion/informe-definitivo`,
      { method: 'POST', body: cuerpo },
    );
  },

  publicarInformeDefinitivo: (procesoId: string, medioPublicacion: string, evidencia: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', evidencia);
    cuerpo.append('medioPublicacion', medioPublicacion);

    return pedir<EstadoInformeDefinitivoProceso>(
      `/procesos/${procesoId}/adjudicacion/informe-definitivo/publicar`,
      { method: 'POST', body: cuerpo },
    );
  },

  anularInformeDefinitivo: (procesoId: string, motivo: string) =>
    pedir<EstadoInformeDefinitivoProceso>(
      `/procesos/${procesoId}/adjudicacion/informe-definitivo/anular`,
      { method: 'POST', body: JSON.stringify({ motivo }) },
    ),

  /** El acto vigente y la ganadora que propone el informe definitivo. */
  adjudicacion: (procesoId: string) =>
    pedir<EstadoAdjudicacion>(`/procesos/${procesoId}/adjudicacion/acto`),

  /**
   * Emite la resolución de adjudicación.
   *
   * La justificación solo se envía cuando el adjudicatario no es la ganadora
   * del informe: el backend la exige ahí y solo ahí.
   */
  adjudicar: (procesoId: string, datos: Adjudicar, acto: File) => {
    const cuerpo = new FormData();
    cuerpo.append('file', acto);
    cuerpo.append('oferenteId', datos.oferenteId);
    cuerpo.append('numeroActo', datos.numeroActo);
    cuerpo.append('fechaActo', datos.fechaActo);
    cuerpo.append('valorAdjudicado', String(datos.valorAdjudicado));
    if (datos.justificacion?.trim()) cuerpo.append('justificacion', datos.justificacion.trim());

    return pedir<EstadoAdjudicacion>(`/procesos/${procesoId}/adjudicacion/acto`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  publicarActoAdjudicacion: (
    procesoId: string,
    datos: { medioPublicacion: string; notificadoAt?: string },
    evidencia: File,
  ) => {
    const cuerpo = new FormData();
    cuerpo.append('file', evidencia);
    cuerpo.append('medioPublicacion', datos.medioPublicacion);
    if (datos.notificadoAt) cuerpo.append('notificadoAt', datos.notificadoAt);

    return pedir<EstadoAdjudicacion>(`/procesos/${procesoId}/adjudicacion/acto/publicar`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  revocarActoAdjudicacion: (procesoId: string, motivo: string) =>
    pedir<EstadoAdjudicacion>(`/procesos/${procesoId}/adjudicacion/acto/revocar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  // ------------------------------------- declaratoria desierta (EFDS-1160) --

  /** La declaratoria vigente, qué causal cabe y qué impide declarar. */
  declaratoriaDesierta: (procesoId: string) =>
    pedir<EstadoDeclaratoriaDesierta>(`/procesos/${procesoId}/adjudicacion/desierta`),

  /**
   * Declara desierto el proceso y lo cierra.
   *
   * El informe del comité va solo cuando la causal es que ninguna oferta quedó
   * habilitada: sin ofertas no hay comité que haya evaluado nada. La
   * justificación, solo cuando el comité ya había registrado una ganadora.
   */
  declararDesierto: (
    procesoId: string,
    datos: DeclararDesierto,
    acto: File,
    informeComite: File | null,
  ) => {
    const cuerpo = new FormData();
    cuerpo.append('acto', acto);
    if (informeComite) cuerpo.append('informeComite', informeComite);
    cuerpo.append('causal', datos.causal);
    cuerpo.append('motivo', datos.motivo);
    cuerpo.append('numeroActo', datos.numeroActo);
    cuerpo.append('fechaActo', datos.fechaActo);
    if (datos.justificacion?.trim()) cuerpo.append('justificacion', datos.justificacion.trim());

    return pedir<EstadoDeclaratoriaDesierta>(`/procesos/${procesoId}/adjudicacion/desierta`, {
      method: 'POST',
      body: cuerpo,
    });
  },

  publicarDeclaratoriaDesierta: (
    procesoId: string,
    datos: { medioPublicacion: string; notificadaAt?: string },
    evidencia: File,
  ) => {
    const cuerpo = new FormData();
    cuerpo.append('file', evidencia);
    cuerpo.append('medioPublicacion', datos.medioPublicacion);
    if (datos.notificadaAt) cuerpo.append('notificadaAt', datos.notificadaAt);

    return pedir<EstadoDeclaratoriaDesierta>(
      `/procesos/${procesoId}/adjudicacion/desierta/publicar`,
      { method: 'POST', body: cuerpo },
    );
  },

  revocarDeclaratoriaDesierta: (procesoId: string, motivo: string) =>
    pedir<EstadoDeclaratoriaDesierta>(`/procesos/${procesoId}/adjudicacion/desierta/revocar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  urlDescarga: (descargaUrl: string) => `${getApiGatewayBaseUrl()}${SERVICE_PREFIX}${descargaUrl}`,
};
