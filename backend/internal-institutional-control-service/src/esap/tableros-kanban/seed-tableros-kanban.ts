import { DataSource } from 'typeorm';
import { TableroKanban, TipoTablero } from './entities/tablero-kanban.entity';
import { EtapaKanban, EstadoEtapa } from './entities/etapa-kanban.entity';

export async function seedTablerosKanban(dataSource: DataSource) {
  console.log('🔄 Ejecutando seed de Tableros Kanban...');

  const tableroRepo = dataSource.getRepository(TableroKanban);
  const etapaRepo = dataSource.getRepository(EtapaKanban);

  // 0. Eliminar restricciones de base de datos antiguas (Check constraints) que bloquean el Kanban dinámico
  try {
    await dataSource.query(`ALTER TABLE control_interno.auditoria DROP CONSTRAINT IF EXISTS auditoria_estado_kanban_check`);
    console.log('✅ Restricción "auditoria_estado_kanban_check" eliminada para permitir Kanban dinámico.');
  } catch (err: any) {
    console.warn(`⚠️ Omitiendo eliminación de restricción (puede que no exista): ${err.message}`);
  }

  // 1. Asegurar la existencia del tablero principal de auditorías
  let tablero = await tableroRepo.findOne({
    where: { tipo: TipoTablero.AUDITORIAS, activo: true },
  });

  if (!tablero) {
    tablero = tableroRepo.create({
      tipo: TipoTablero.AUDITORIAS,
      nombre: 'Tablero de Auditorías OCI',
      descripcion: 'Tablero principal para la gestión y seguimiento de auditorías institucionales',
      activo: true,
      configuracionVisual: {
        mostrarContadores: true,
        mostrarTiempos: true,
        alertasSLA: true,
        alertasWIP: true,
        transicionesAutomaticas: true,
        compactarVista: false,
        mostrarAvatar: true,
        permitirDragDrop: true
      }
    });
    await tableroRepo.save(tablero);
    console.log('✅ Tablero Kanban de Auditorías creado.');
  } else if (!tablero.configuracionVisual) {
    tablero.configuracionVisual = {
      mostrarContadores: true,
      mostrarTiempos: true,
      alertasSLA: true,
      alertasWIP: true,
      transicionesAutomaticas: true,
      compactarVista: false,
      mostrarAvatar: true,
      permitirDragDrop: true
    };
    await tableroRepo.save(tablero);
    console.log('✅ Configuración visual inicializada en el tablero existente.');
  }

  // 2. Definir las etapas base (Catálogo Oficial)
  const etapasOficiales = [
    {
      nombre: 'Programa Anual',
      descripcion: 'Auditoría programada en plan anual',
      orden: 1,
      color: '#3B82F6',
      tiempoSLA: 15,
      limiteWIP: 999, // Sin límite práctico
      notificarVencimiento: true,
      diasAnticipacionAlerta: 3,
      estado: EstadoEtapa.INICIAL,
    },
    {
      nombre: 'Planeación',
      descripcion: 'Definición de objetivos y alcance',
      orden: 2,
      color: '#8B5CF6',
      tiempoSLA: 15,
      limiteWIP: 5,
      notificarVencimiento: true,
      diasAnticipacionAlerta: 3,
      estado: EstadoEtapa.INTERMEDIA,
    },
    {
      nombre: 'Ejecución',
      descripcion: 'Recopilación de evidencias y pruebas',
      orden: 3,
      color: '#10B981',
      tiempoSLA: 30,
      limiteWIP: 5,
      notificarVencimiento: true,
      diasAnticipacionAlerta: 5,
      estado: EstadoEtapa.INTERMEDIA,
    },
    {
      nombre: 'Comunicación',
      descripcion: 'Elaboración y envío de informes',
      orden: 4,
      color: '#F59E0B',
      tiempoSLA: 10,
      limiteWIP: 999,
      notificarVencimiento: true,
      diasAnticipacionAlerta: 2,
      estado: EstadoEtapa.INTERMEDIA,
    },
    {
      nombre: 'Seguimiento',
      descripcion: 'Seguimiento a planes de mejoramiento y hallazgos',
      orden: 5,
      color: '#06B6D4',
      tiempoSLA: 30,
      limiteWIP: 999,
      notificarVencimiento: true,
      diasAnticipacionAlerta: 5,
      estado: EstadoEtapa.INTERMEDIA,
    },
    {
      nombre: 'Finalizada',
      descripcion: 'Auditoría completada (requiere documento de cierre)',
      orden: 6,
      color: '#6B7280',
      tiempoSLA: 0,
      limiteWIP: 999,
      notificarVencimiento: false,
      diasAnticipacionAlerta: 0,
      estado: EstadoEtapa.FINAL,
    },
  ];

  // 3. Obtener etapas actuales
  const etapasActuales = await etapaRepo.find({
    where: { tableroKanbanId: tablero.id },
  });

  // 4. Sincronizar (Upsert basado en nombre por constraint UNIQUE)
  for (const config of etapasOficiales) {
    let etapa = etapasActuales.find((e) => e.nombre === config.nombre);

    if (!etapa) {
      // Crear nueva etapa solo si no existe
      etapa = etapaRepo.create({
        ...config,
        tableroKanbanId: tablero.id,
      });
      await etapaRepo.save(etapa);
      console.log(`✅ Etapa agregada: ${config.nombre}`);
    } else {
      // ⚠️ IMPORTANTE: No sobrescribimos toda la etapa para respetar SLA/WIP de la UI,
      // pero ASEGURAMOS que sea visible y tenga el orden correcto, por si estaba oculta.
      let needsSave = false;
      if (etapa.visible === false) {
        etapa.visible = true;
        needsSave = true;
      }
      if (etapa.orden !== config.orden) {
        etapa.orden = config.orden;
        needsSave = true;
      }
      
      if (needsSave) {
        await etapaRepo.save(etapa);
        console.log(`🔄 Etapa actualizada (visible/orden): ${config.nombre}`);
      } else {
        console.log(`⏭️ Etapa "${config.nombre}" ya existe y está correcta, se omite sobrescritura.`);
      }
    }
  }

  // 5. Opcional: Eliminar o desactivar etapas repetidas si existían antes del Constraint
  // Se filtran los que no están en la lista oficial
  const nombresOficiales = etapasOficiales.map((e) => e.nombre);
  const etapasAEliminar = etapasActuales.filter((e) => !nombresOficiales.includes(e.nombre));
  
  if (etapasAEliminar.length > 0) {
    console.log(`🧹 Limpiando ${etapasAEliminar.length} etapas no oficiales...`);
    for (const etapa of etapasAEliminar) {
      try {
        await etapaRepo.remove(etapa);
      } catch (err) {
        console.warn(`⚠️ No se pudo eliminar la etapa ${etapa.nombre} (probablemente tenga relaciones). Se oculta.`);
        etapa.visible = false;
        await etapaRepo.save(etapa);
      }
    }
  }

  console.log('🚀 Tablero de Auditorías sincronizado.');

  // =========================================================================
  // 6. ASEGURAR EXISTENCIA DEL TABLERO DE PLANES DE MEJORAMIENTO
  // =========================================================================
  let tableroPM = await tableroRepo.findOne({
    where: { tipo: TipoTablero.PLANES_MEJORAMIENTO, activo: true },
  });

  if (!tableroPM) {
    tableroPM = tableroRepo.create({
      tipo: TipoTablero.PLANES_MEJORAMIENTO,
      nombre: 'Tablero de Planes de Mejoramiento',
      descripcion: 'Seguimiento a acciones correctivas y de mejora',
      activo: true,
    });
    await tableroRepo.save(tableroPM);
    console.log('✅ Tablero Kanban de Planes de Mejoramiento creado.');
  }

  // 7. Definir etapas base para Planes de Mejoramiento
  const etapasPMOficiales = [
    {
      nombre: 'Suscripción y Formulación',
      descripcion: 'Definición del plan de mejoramiento',
      orden: 1,
      color: '#3B82F6',
      tiempoSLA: 10,
      limiteWIP: 999,
      notificarVencimiento: true,
      diasAnticipacionAlerta: 2,
      estado: EstadoEtapa.INICIAL,
    },
    {
      nombre: 'Ejecución de Acciones',
      descripcion: 'Implementación de acciones correctivas',
      orden: 2,
      color: '#F59E0B',
      tiempoSLA: 60,
      limiteWIP: 999,
      notificarVencimiento: true,
      diasAnticipacionAlerta: 10,
      estado: EstadoEtapa.INTERMEDIA,
    },
    {
      nombre: 'Verificación',
      descripcion: 'Verificación de cumplimiento por parte de OCI',
      orden: 3,
      color: '#8B5CF6',
      tiempoSLA: 15,
      limiteWIP: 999,
      notificarVencimiento: true,
      diasAnticipacionAlerta: 3,
      estado: EstadoEtapa.INTERMEDIA,
    },
    {
      nombre: 'Cerrado',
      descripcion: 'Plan completado exitosamente',
      orden: 4,
      color: '#10B981',
      tiempoSLA: 0,
      limiteWIP: 999,
      notificarVencimiento: false,
      diasAnticipacionAlerta: 0,
      estado: EstadoEtapa.FINAL,
    },
  ];

  const etapasPMActuales = await etapaRepo.find({
    where: { tableroKanbanId: tableroPM.id },
  });

  for (const config of etapasPMOficiales) {
    let etapa = etapasPMActuales.find((e) => e.nombre === config.nombre);

    if (!etapa) {
      etapa = etapaRepo.create({
        ...config,
        tableroKanbanId: tableroPM.id, // TS null check pass because of !tableroPM check
      });
      await etapaRepo.save(etapa);
      console.log(`✅ Etapa agregada al PM: ${config.nombre}`);
    } else {
      // ⚠️ Respetar configuración existente en la base de datos
      console.log(`⏭️ Etapa PM "${config.nombre}" ya existe, se omite sobrescritura.`);
    }
  }

  console.log('🚀 Ambos Tableros Kanban sincronizados con éxito.');
}
