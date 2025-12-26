/**
 * Datos Mock EXPANDIDOS - Módulos Restantes (MOD-05 a MOD-11)
 * Datos consolidados para completar el sistema
 */

import { 
  SolicitudInforme, 
  RequerimientoOrganosControl,
  ProcesoCoactivo,
  ComunicacionInterna,
  IndicadorPlanAccion,
  RiesgoLegal,
  PlanMejoramiento 
} from '../core/types';

function fechaHace(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha;
}

// ========================================
// MOD-05: TÉRMINOS E INFORMES (50 registros)
// ========================================
export const solicitudesInformesMock: SolicitudInforme[] = Array.from({ length: 50 }, (_, i) => {
  const diasAtras = i * 3 + Math.floor(Math.random() * 5);
  const diasRestantes = Math.max(0, 15 - diasAtras);
  
  return {
    id: `TI-2025-${String(i + 1).padStart(3, '0')}`,
    asunto: `Informe ${i + 1}: Solicitud de información sobre gestión administrativa periodo ${2024 - Math.floor(i/10)}`,
    solicitante: ['Contraloría', 'Procuraduría', 'Auditoría Interna', 'Rectoría'][i % 4],
    responsable: ['Dr. Juan Pérez', 'Dra. Ana López', 'Dr. Carlos Ramírez'][i % 3],
    fechaSolicitud: fechaHace(diasAtras),
    fechaVencimiento: fechaHace(diasAtras - 15),
    diasRestantes,
    estado: diasRestantes === 0 ? 'ENTREGADO' : diasRestantes <= 3 ? 'EN PROCESO' : 'PENDIENTE',
    prioridad: diasRestantes <= 2 ? 'CRÍTICA' : diasRestantes <= 5 ? 'ALTA' : 'NORMAL',
    avance: Math.min(100, Math.floor((15 - diasRestantes) / 15 * 100)),
  };
});

export const estadisticasTerminosInformes = {
  total: solicitudesInformesMock.length,
  criticas: solicitudesInformesMock.filter(s => s.diasRestantes <= 2).length,
  urgentes: solicitudesInformesMock.filter(s => s.diasRestantes > 2 && s.diasRestantes <= 5).length,
  enTermino: solicitudesInformesMock.filter(s => s.diasRestantes > 5).length,
};

// ========================================
// MOD-06: ÓRGANOS DE CONTROL (40 registros)
// ========================================
export const requerimientosOrganosControlMock: RequerimientoOrganosControl[] = Array.from({ length: 40 }, (_, i) => {
  const organismos = ['Contraloría', 'Procuraduría', 'Defensoría del Pueblo', 'Fiscalía'];
  const tipos = ['Requerimiento de información', 'Visita de control', 'Seguimiento', 'Auditoría'];
  const diasAtras = i * 5;
  
  return {
    id: `OC-2025-${String(i + 1).padStart(3, '0')}`,
    organismo: organismos[i % organismos.length],
    tipo: tipos[i % tipos.length],
    asunto: `${tipos[i % tipos.length]} - ${organismos[i % organismos.length]} sobre proceso ${i + 1}`,
    fechaRecepcion: fechaHace(diasAtras),
    fechaVencimiento: fechaHace(diasAtras - 10),
    diasRestantes: Math.max(0, 10 - diasAtras),
    responsable: ['Dr. Juan Pérez', 'Dra. Ana López'][i % 2],
    estado: diasAtras >= 10 ? 'RESPONDIDO' : 'PENDIENTE',
    prioridad: (10 - diasAtras) <= 2 ? 'CRÍTICA' : 'NORMAL',
  };
});

export const estadisticasOrganosControl = {
  total: requerimientosOrganosControlMock.length,
  contraloria: requerimientosOrganosControlMock.filter(r => r.organismo === 'Contraloría').length,
  procuraduria: requerimientosOrganosControlMock.filter(r => r.organismo === 'Procuraduría').length,
  defensoria: requerimientosOrganosControlMock.filter(r => r.organismo === 'Defensoría del Pueblo').length,
  fiscalia: requerimientosOrganosControlMock.filter(r => r.organismo === 'Fiscalía').length,
};

// ========================================
// MOD-07: PROCESOS COACTIVOS (35 registros)
// ========================================
export const procesosCoactivosMock: ProcesoCoactivo[] = Array.from({ length: 35 }, (_, i) => {
  const etapas = ['MANDAMIENTO DE PAGO', 'EMBARGO', 'REMATE', 'TERMINADO'];
  const montoBase = 5000000 + (i * 2000000);
  
  return {
    id: `PC-2024-${String(i + 1).padStart(3, '0')}`,
    deudor: `Deudor ${i + 1} - Empresa/Persona Natural`,
    tipoDeuda: ['Multa administrativa', 'Contrato incumplido', 'Servicios públicos'][i % 3],
    montoInicial: montoBase,
    montoActual: Math.floor(montoBase * (1 + (i * 0.05))),
    etapa: etapas[i % etapas.length],
    fechaInicio: fechaHace(365 + i * 10),
    abogadoAsignado: ['Dr. Juan Pérez', 'Dra. Ana López'][i % 2],
    estado: i % 4 === 0 ? 'TERMINADO' : 'ACTIVO',
    diasPrescripcion: Math.max(0, 1800 - (365 + i * 10)),
  };
});

export const estadisticasProcesosCoactivos = {
  total: procesosCoactivosMock.length,
  activos: procesosCoactivosMock.filter(p => p.estado === 'ACTIVO').length,
  montoTotal: procesosCoactivosMock.reduce((sum, p) => sum + p.montoActual, 0),
  proximosAPrescribir: procesosCoactivosMock.filter(p => p.diasPrescripcion <= 90).length,
};

// ========================================
// MOD-08: BUZÓN OFICINA JURÍDICA (70 registros)
// ========================================
export const comunicacionesInternasMock: ComunicacionInterna[] = Array.from({ length: 70 }, (_, i) => {
  const tipos = ['Concepto Jurídico', 'Consulta Interna', 'Solicitud de Revisión', 'Comunicación Oficial'];
  const clasificacionIA = ['Alta', 'Media', 'Baja'][i % 3];
  const diasAtras = Math.floor(i / 2);
  
  return {
    id: `BOJ-2025-${String(i + 1).padStart(4, '0')}`,
    tipo: tipos[i % tipos.length],
    remitente: `Dependencia ${i % 10 + 1}`,
    asunto: `${tipos[i % tipos.length]} - Asunto ${i + 1}`,
    fechaRecepcion: fechaHace(diasAtras),
    clasificacionIA,
    precision: i % 3 === 0 ? 96 : i % 3 === 1 ? 94 : 98,
    prioridad: clasificacionIA === 'Alta' ? 'URGENTE' : 'NORMAL',
    estado: i % 4 === 0 ? 'RESPONDIDO' : 'PENDIENTE',
    asignadoA: i % 4 === 0 ? undefined : ['Dr. Juan Pérez', 'Dra. Ana López'][i % 2],
  };
});

export const estadisticasBuzonOficinaJuridica = {
  total: comunicacionesInternasMock.length,
  sinClasificar: comunicacionesInternasMock.filter(c => !c.asignadoA && c.estado === 'PENDIENTE').length,
  urgentes: comunicacionesInternasMock.filter(c => c.prioridad === 'URGENTE').length,
  precisionPromedio: 96,
};

// ========================================
// MOD-09: PLAN DE ACCIÓN (30 registros)
// ========================================
export const indicadoresPlanAccionMock: IndicadorPlanAccion[] = Array.from({ length: 30 }, (_, i) => {
  const ejes = ['Transparencia', 'Eficiencia', 'Control', 'Participación'];
  const avance = Math.floor(Math.random() * 100);
  
  return {
    id: `PA-2025-${String(i + 1).padStart(2, '0')}`,
    nombre: `Indicador ${i + 1}: Mejora en ${ejes[i % ejes.length].toLowerCase()}`,
    ejeEstrategico: ejes[i % ejes.length],
    responsable: ['Dirección Jurídica', 'Rectoría', 'Planeación'][i % 3],
    meta: 100,
    avance,
    fechaInicio: fechaHace(180),
    fechaVencimiento: fechaHace(-180),
    estado: avance >= 90 ? 'CUMPLIDO' : avance >= 50 ? 'EN PROCESO' : 'RETRASADO',
    criticidad: avance < 30 ? 'ALTA' : avance < 70 ? 'MEDIA' : 'BAJA',
  };
});

export const estadisticasPlanAccion = {
  total: indicadoresPlanAccionMock.length,
  cumplidos: indicadoresPlanAccionMock.filter(i => i.estado === 'CUMPLIDO').length,
  enProceso: indicadoresPlanAccionMock.filter(i => i.estado === 'EN PROCESO').length,
  retrasados: indicadoresPlanAccionMock.filter(i => i.estado === 'RETRASADO').length,
  avanceGlobal: Math.floor(indicadoresPlanAccionMock.reduce((sum, i) => sum + i.avance, 0) / indicadoresPlanAccionMock.length),
};

// ========================================
// MOD-10: RIESGOS (40 registros)
// ========================================
export const riesgosLegalesMock: RiesgoLegal[] = Array.from({ length: 40 }, (_, i) => {
  const procesos = ['Contratación', 'Disciplinario', 'Laboral', 'Financiero'];
  const probabilidades = ['Muy Alta', 'Alta', 'Media', 'Baja'];
  const impactos = ['Extremo', 'Alto', 'Moderado', 'Bajo'];
  
  const probabilidad = probabilidades[i % probabilidades.length];
  const impacto = impactos[Math.floor(i / 10) % impactos.length];
  
  let nivel: 'Extremo' | 'Alto' | 'Moderado' | 'Bajo';
  if (probabilidad === 'Muy Alta' && (impacto === 'Extremo' || impacto === 'Alto')) {
    nivel = 'Extremo';
  } else if (probabilidad === 'Alta' || impacto === 'Alto') {
    nivel = 'Alto';
  } else if (impacto === 'Moderado') {
    nivel = 'Moderado';
  } else {
    nivel = 'Bajo';
  }
  
  return {
    id: `RL-2025-${String(i + 1).padStart(2, '0')}`,
    descripcion: `Riesgo ${i + 1}: Posible contingencia en proceso de ${procesos[i % procesos.length].toLowerCase()}`,
    proceso: procesos[i % procesos.length],
    probabilidad,
    impacto,
    nivel,
    controles: `Control preventivo establecido para riesgo ${i + 1}`,
    responsable: ['Oficina Jurídica', 'Auditoría', 'Planeación'][i % 3],
    fechaIdentificacion: fechaHace(90 + i * 5),
    estado: i % 5 === 0 ? 'MATERIALIZADO' : 'LATENTE',
  };
});

export const estadisticasRiesgos = {
  total: riesgosLegalesMock.length,
  extremos: riesgosLegalesMock.filter(r => r.nivel === 'Extremo').length,
  altos: riesgosLegalesMock.filter(r => r.nivel === 'Alto').length,
  moderados: riesgosLegalesMock.filter(r => r.nivel === 'Moderado').length,
  bajos: riesgosLegalesMock.filter(r => r.nivel === 'Bajo').length,
};

// ========================================
// MOD-11: PLANES DE MEJORAMIENTO (45 registros)
// ========================================
export const planesMejoramientoMock: PlanMejoramiento[] = Array.from({ length: 45 }, (_, i) => {
  const origenes = ['Auditoría Interna', 'Contraloría', 'Procuraduría', 'Autocontrol'];
  const estados = ['NO INICIADO', 'EN EJECUCIÓN', 'COMPLETADO', 'VENCIDO'];
  const avance = Math.floor(Math.random() * 100);
  
  return {
    id: `PM-2024-${String(i + 1).padStart(3, '0')}`,
    hallazgo: `Hallazgo ${i + 1}: Debilidad identificada en proceso administrativo`,
    origen: origenes[i % origenes.length],
    accionMejora: `Acción ${i + 1}: Implementar mejora en el proceso`,
    responsable: ['Dirección Jurídica', 'Gestión Humana', 'Financiera'][i % 3],
    fechaInicio: fechaHace(120),
    fechaVencimiento: fechaHace(-60),
    avance,
    estado: avance === 100 ? 'COMPLETADO' : avance >= 50 ? 'EN EJECUCIÓN' : avance === 0 ? 'NO INICIADO' : 'VENCIDO',
    criticidad: avance < 30 && i % 2 === 0 ? 'ALTA' : 'MEDIA',
    evidencias: avance >= 80 ? ['Documento soporte.pdf'] : [],
  };
});

export const estadisticasPlanesMejoramiento = {
  total: planesMejoramientoMock.length,
  completados: planesMejoramientoMock.filter(p => p.estado === 'COMPLETADO').length,
  enEjecucion: planesMejoramientoMock.filter(p => p.estado === 'EN EJECUCIÓN').length,
  vencidos: planesMejoramientoMock.filter(p => p.estado === 'VENCIDO').length,
  avancePromedio: Math.floor(planesMejoramientoMock.reduce((sum, p) => sum + p.avance, 0) / planesMejoramientoMock.length),
};
