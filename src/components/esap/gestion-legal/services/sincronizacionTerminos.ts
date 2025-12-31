/**
 * Servicio de Sincronización Automática de Términos Legales
 * Auto-genera términos desde todos los módulos hacia Control de Términos e Informes
 */

import { SolicitudInforme } from '../core/types';
import {
  todasLasConfiguraciones,
  calcularFechaVencimiento,
  calcularDiasRestantes,
  ModuloOrigen
} from '../config/terminosLegales';

// ============================================================================
// IMPORTAR DATOS DESDE TODOS LOS MÓDULOS
// ============================================================================
import { expedientesJudicialesMock } from '../data/datosExpedientesJudiciales';
import { procesosDisciplinariosMock } from '../data/datosProcesoDisciplinariosExpandido';
import { consultasJuridicasMock } from '../data/datosConsultasJuridicas';
// Nota: Cuando se implementen OrganosControl, ProcesosCoactivos, CentroComunicaciones,
// importar sus datos mock aquí

// ============================================================================
// FUNCIÓN PRINCIPAL: Sincronizar TODOS los términos desde TODOS los módulos
// ============================================================================

export function sincronizarTodosLosTerminos(): SolicitudInforme[] {
  const terminosGenerados: SolicitudInforme[] = [];

  // 1️⃣ Sincronizar desde DEFENSA JUDICIAL (PJ)
  terminosGenerados.push(...sincronizarDefensaJudicial());

  // 2️⃣ Sincronizar desde JUZGAMIENTO DISCIPLINARIO (PD)
  terminosGenerados.push(...sincronizarJuzgamiento());

  // 3️⃣ Sincronizar desde ASESORÍA JURÍDICA (AJ)
  terminosGenerados.push(...sincronizarAsesoria());

  // 4️⃣ Sincronizar desde ÓRGANOS DE CONTROL (OC)
  // terminosGenerados.push(...sincronizarOrganosControl());

  // 5️⃣ Sincronizar desde PROCESOS COACTIVOS (PC)
  // terminosGenerados.push(...sincronizarProcesosCoactivos());

  // 6️⃣ Sincronizar desde CENTRO DE COMUNICACIONES (CC)
  // terminosGenerados.push(...sincronizarCentroComunicaciones());

  return terminosGenerados;
}

// ============================================================================
// 1️⃣ SINCRONIZACIÓN DEFENSA JUDICIAL
// ============================================================================

function sincronizarDefensaJudicial(): SolicitudInforme[] {
  const terminos: SolicitudInforme[] = [];
  let contador = 1;

  expedientesJudicialesMock.forEach((expediente) => {
    // Mapeo de etapas a tipos de término
    const terminosPorEtapa: { [key: string]: string[] } = {
      'NOTIFICACION': ['Contestación de Tutela', 'Contestación NRD'],
      'CONTESTACION': ['Presentación de Pruebas'],
      'PRUEBAS': ['Alegatos de Conclusión'],
      'SENTENCIA': ['Recurso de Apelación'],
      'SEGUNDA_INSTANCIA': ['Recurso de Casación']
    };

    const terminosAplicables = terminosPorEtapa[expediente.etapa] || [];

    terminosAplicables.forEach((tipoTermino) => {
      const config = todasLasConfiguraciones.find(
        (c) => c.tipo === tipoTermino && c.moduloOrigen === 'DEFENSA_JUDICIAL'
      );

      if (config) {
        const fechaInicio = expediente.fechaNotificacion || new Date();
        const fechaVencimiento = calcularFechaVencimiento(
          fechaInicio,
          config.diasPlazo,
          config.tipoDias === 'HABILES'
        );
        const diasRestantes = calcularDiasRestantes(
          fechaVencimiento,
          config.tipoDias === 'HABILES'
        );

        // Calcular prioridad según días restantes
        let prioridad: 'CRÍTICA' | 'URGENTE' | 'NORMAL' = 'NORMAL';
        if (diasRestantes <= 2) prioridad = 'CRÍTICA';
        else if (diasRestantes <= 5) prioridad = 'URGENTE';

        // Crear término auto-generado
        terminos.push({
          id: `TER-DJ-${String(contador).padStart(3, '0')}-${tipoTermino.substring(0, 3).toUpperCase()}`,
          etapa: diasRestantes <= 0 ? 'VENCIDA' : diasRestantes <= 5 ? 'EN_PROCESO' : 'RECIBIDA',
          tipoInforme: tipoTermino,
          enteSolicitante: expediente.juzgado || 'Sistema Judicial',
          radicadoExterno: expediente.radicado,
          asunto: `${tipoTermino} - ${expediente.id}: ${expediente.asunto}`,
          descripcion: `Término legal auto-generado desde expediente ${expediente.id}. Base normativa: ${config.normativa}`,
          responsable: expediente.abogadoResponsable,
          fechaSolicitud: fechaInicio,
          fechaVencimiento: fechaVencimiento,
          diasTotales: config.diasPlazo,
          diasRestantes: diasRestantes,
          datosRequeridos: [],
          
          // ✅ CAMPOS DE INTEGRACIÓN
          moduloOrigen: 'DEFENSA_JUDICIAL',
          expedienteOrigen: expediente.id,
          autoGenerado: true,
          improrrogable: config.improrrogable,
          baseNormativa: config.normativa,
          consecuenciaIncumplimiento: config.consecuenciaIncumplimiento,
          prioridad: prioridad
        });

        contador++;
      }
    });
  });

  return terminos;
}

// ============================================================================
// 2️⃣ SINCRONIZACIÓN JUZGAMIENTO DISCIPLINARIO
// ============================================================================

function sincronizarJuzgamiento(): SolicitudInforme[] {
  const terminos: SolicitudInforme[] = [];
  let contador = 1;

  // Guard: Verificar que los datos existan
  if (!procesosDisciplinariosMock || !Array.isArray(procesosDisciplinariosMock)) {
    console.warn('⚠️ procesosDisciplinariosMock no está disponible');
    return terminos;
  }

  procesosDisciplinariosMock.forEach((proceso) => {
    // Mapeo de etapas a tipos de término
    const terminosPorEtapa: { [key: string]: string[] } = {
      'E3_FORMULACION_CARGOS': ['Presentación de Descargos'],
      'E4_DESCARGOS': ['Solicitud de Pruebas'],
      'E5_PRUEBAS': ['Alegatos de Conclusión'],
      'E7_FALLO': ['Recurso de Apelación (Fallo)', 'Informe a RRHH (Post-Fallo)']
    };

    const terminosAplicables = terminosPorEtapa[proceso.etapa] || [];

    terminosAplicables.forEach((tipoTermino) => {
      const config = todasLasConfiguraciones.find(
        (c) => c.tipo === tipoTermino && c.moduloOrigen === 'JUZGAMIENTO'
      );

      if (config) {
        const fechaInicio = proceso.fechaInicio || new Date();
        const fechaVencimiento = calcularFechaVencimiento(
          fechaInicio,
          config.diasPlazo,
          config.tipoDias === 'HABILES'
        );
        const diasRestantes = calcularDiasRestantes(
          fechaVencimiento,
          config.tipoDias === 'HABILES'
        );

        let prioridad: 'CRÍTICA' | 'URGENTE' | 'NORMAL' = 'NORMAL';
        if (diasRestantes <= 2) prioridad = 'CRÍTICA';
        else if (diasRestantes <= 5) prioridad = 'URGENTE';

        terminos.push({
          id: `TER-PD-${String(contador).padStart(3, '0')}-${tipoTermino.substring(0, 3).toUpperCase()}`,
          etapa: diasRestantes <= 0 ? 'VENCIDA' : diasRestantes <= 5 ? 'EN_PROCESO' : 'RECIBIDA',
          tipoInforme: tipoTermino,
          enteSolicitante: 'Oficina de Control Disciplinario Interno',
          radicadoExterno: proceso.id, // Usar el ID como radicado
          asunto: `${tipoTermino} - ${proceso.id}: ${proceso.descripcionHechos?.substring(0, 100)}...`,
          descripcion: `Término legal auto-generado desde proceso disciplinario ${proceso.id}. Base normativa: ${config.normativa}`,
          responsable: proceso.investigador, // Campo correcto
          fechaSolicitud: fechaInicio,
          fechaVencimiento: fechaVencimiento,
          diasTotales: config.diasPlazo,
          diasRestantes: diasRestantes,
          datosRequeridos: [],
          
          moduloOrigen: 'JUZGAMIENTO',
          expedienteOrigen: proceso.id,
          autoGenerado: true,
          improrrogable: config.improrrogable,
          baseNormativa: config.normativa,
          consecuenciaIncumplimiento: config.consecuenciaIncumplimiento,
          prioridad: prioridad
        });

        contador++;
      }
    });
  });

  return terminos;
}

// ============================================================================
// 3️⃣ SINCRONIZACIÓN ASESORÍA JURÍDICA
// ============================================================================

function sincronizarAsesoria(): SolicitudInforme[] {
  const terminos: SolicitudInforme[] = [];
  let contador = 1;

  consultasJuridicasMock.forEach((consulta) => {
    // Determinar tipo de término según el tema jurídico y urgencia
    let tipoTermino = 'Concepto Jurídico Normal';
    
    // Si la consulta tiene menos de 5 días restantes, es urgente
    if (consulta.diasRestantes <= 5) {
      tipoTermino = 'Concepto Jurídico Urgente';
    }
    
    // Si el tema es sobre contratos, usar término específico
    if (consulta.temaJuridico.toLowerCase().includes('contrat')) {
      tipoTermino = 'Revisión de Contratos';
    }
    
    // Si menciona licitación
    if (consulta.temaJuridico.toLowerCase().includes('licitaci') || 
        consulta.temaJuridico.toLowerCase().includes('public')) {
      tipoTermino = 'Concepto para Licitación';
    }

    const config = todasLasConfiguraciones.find(
      (c) => c.tipo === tipoTermino && c.moduloOrigen === 'ASESORIA'
    );

    if (config && consulta.etapa !== 'CONCEPTO_EMITIDO') {
      const fechaInicio = consulta.fechaRadicacion;
      const fechaVencimiento = calcularFechaVencimiento(
        fechaInicio,
        config.diasPlazo,
        config.tipoDias === 'HABILES'
      );
      const diasRestantes = calcularDiasRestantes(
        fechaVencimiento,
        config.tipoDias === 'HABILES'
      );

      let prioridad: 'CRÍTICA' | 'URGENTE' | 'NORMAL' = 'NORMAL';
      if (diasRestantes <= 2) prioridad = 'CRÍTICA';
      else if (diasRestantes <= 5) prioridad = 'URGENTE';

      terminos.push({
        id: `TER-AJ-${String(contador).padStart(3, '0')}-${tipoTermino.substring(0, 3).toUpperCase()}`,
        etapa: diasRestantes <= 0 ? 'VENCIDA' : diasRestantes <= 5 ? 'EN_PROCESO' : 'RECIBIDA',
        tipoInforme: tipoTermino,
        enteSolicitante: consulta.solicitante,
        radicadoExterno: consulta.radicado,
        asunto: `${tipoTermino} - ${consulta.id}: ${consulta.temaJuridico}`,
        descripcion: `Término legal auto-generado desde consulta jurídica ${consulta.id}. SLA interno de respuesta.`,
        responsable: consulta.abogadoAsignado,
        fechaSolicitud: fechaInicio,
        fechaVencimiento: fechaVencimiento,
        diasTotales: config.diasPlazo,
        diasRestantes: diasRestantes,
        datosRequeridos: [],
        
        moduloOrigen: 'ASESORIA',
        expedienteOrigen: consulta.id,
        autoGenerado: true,
        improrrogable: config.improrrogable,
        baseNormativa: config.normativa,
        consecuenciaIncumplimiento: config.consecuenciaIncumplimiento,
        prioridad: prioridad
      });

      contador++;
    }
  });

  return terminos;
}

// ============================================================================
// 4️⃣ SINCRONIZACIÓN ÓRGANOS DE CONTROL (Placeholder - implementar cuando existan datos)
// ============================================================================

/*
function sincronizarOrganosControl(): SolicitudInforme[] {
  const terminos: SolicitudInforme[] = [];
  // TODO: Implementar cuando existan datos mock de Órganos de Control
  return terminos;
}
*/

// ============================================================================
// 5️⃣ SINCRONIZACIÓN PROCESOS COACTIVOS (Placeholder - implementar cuando existan datos)
// ============================================================================

/*
function sincronizarProcesosCoactivos(): SolicitudInforme[] {
  const terminos: SolicitudInforme[] = [];
  // TODO: Implementar cuando existan datos mock de Procesos Coactivos
  return terminos;
}
*/

// ============================================================================
// 6️⃣ SINCRONIZACIÓN CENTRO DE COMUNICACIONES (Placeholder - implementar cuando existan datos)
// ============================================================================

/*
function sincronizarCentroComunicaciones(): SolicitudInforme[] {
  const terminos: SolicitudInforme[] = [];
  // TODO: Implementar cuando existan datos mock de Centro de Comunicaciones
  return terminos;
}
*/