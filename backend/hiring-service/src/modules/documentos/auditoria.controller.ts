import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

import { PermisosGuard } from '../../auth/permisos.guard';
import { Permisos } from '../../auth/permisos.decorator';
import { PERMISO_EXPEDIENTE_AUDITAR } from '../../auth/permisos';
import { getHiringAccess } from '../../auth/hiring-access';

import { Trazabilidad } from '../../entities/trazabilidad.entity';

/**
 * Expediente electrónico único para auditoría (EFDS-1186).
 *
 * No guarda nada nuevo: compone en una respuesta lo que ya está repartido en
 * nueve tablas. Es lo que un ente de control pide cuando revisa un proceso, y
 * juntarlo evita que tenga que reconstruirlo pantalla por pantalla.
 *
 * El log centralizado de la plataforma es audit-service y no se duplica aquí:
 * esto es la historia de un expediente, no los eventos del sistema.
 */
@ApiTags('Transversal · Expediente para auditoría')
@Controller('procesos/:id/auditoria')
export class AuditoriaController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_EXPEDIENTE_AUDITAR)
  @ApiOperation({
    summary: 'Expediente completo del proceso, solo lectura',
    description:
      'Proceso, contrato, actividades, documentos con su hash, supervisiones, modificaciones y trazabilidad completa.',
  })
  async consultar(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    const acceso = getHiringAccess(req);
    const em = this.dataSource.manager;

    const [proceso, contrato, actividades, documentos, supervisiones, modificaciones, casos, traza] =
      await Promise.all([
        em.query(`SELECT id, radicado, objeto, modalidad, valor_estimado, etapa, fecha_radicacion,
                         created_by, created_at
                    FROM hiring.procesos WHERE id = $1`, [procesoId]),
        em.query(`SELECT numero, objeto, estado, valor, plazo_dias, contratista_nombre,
                         perfeccionado_at, legalizado_at, ejecucion_desde
                    FROM hiring.contratos
                   WHERE proceso_id = $1 AND estado <> 'RECHAZADO'
                   ORDER BY created_at DESC LIMIT 1`, [procesoId]),
        em.query(`SELECT a.numeral, a.nombre, a.etapa, pa.estado, pa.enviado_por, pa.updated_at
                    FROM hiring.actividades a
                    LEFT JOIN hiring.proceso_actividades pa
                           ON pa.numeral = a.numeral AND pa.proceso_id = $1
                   WHERE pa.id IS NOT NULL
                   ORDER BY a.etapa, a.orden`, [procesoId]),
        // Con el hash: es lo que permite verificar que el documento archivado
        // es el mismo que se subió.
        // `archivo_url` y el tamaño viajan para que el expediente pueda ofrecer
        // la descarga: sin ellos la pantalla enseña el nombre de un archivo que
        // no hay forma de abrir.
        em.query(`SELECT d.id, d.numeral, d.tipo, d.nombre, d.archivo_nombre_original,
                         d.archivo_url, d.archivo_mime_type, d.archivo_tamano,
                         d.hash_sha256, d.subido_por, d.created_at
                    FROM hiring.documentos d
                    JOIN hiring.expedientes e ON e.id = d.expediente_id
                   WHERE e.proceso_id = $1
                   ORDER BY d.created_at`, [procesoId]),
        em.query(`SELECT s.nombre, s.cargo, s.estado, s.fecha_designacion,
                         s.designado_por, s.relevado_at, s.motivo_relevo
                    FROM hiring.supervisiones_contrato s
                    JOIN hiring.contratos c ON c.id = s.contrato_id
                   WHERE c.proceso_id = $1
                   ORDER BY s.created_at`, [procesoId]),
        em.query(`SELECT m.tipo, m.estado, m.justificacion, m.dias_prorroga, m.fecha_efecto,
                         m.plazo_anterior_dias, m.solicitada_por, m.resuelta_por, m.resuelta_at
                    FROM hiring.modificaciones_contrato m
                    JOIN hiring.contratos c ON c.id = m.contrato_id
                   WHERE c.proceso_id = $1
                   ORDER BY m.created_at`, [procesoId]),
        // Solo el conteo: el detalle está bajo reserva legal (EFDS-1182) y se
        // consulta con su propio permiso.
        em.query(`SELECT count(*)::int AS total
                    FROM hiring.casos_incumplimiento ci
                    JOIN hiring.contratos c ON c.id = ci.contrato_id
                   WHERE c.proceso_id = $1`, [procesoId]),
        em.query(`SELECT accion, entidad, usuario_nombre, detalle, created_at
                    FROM hiring.trazabilidad
                   WHERE proceso_id = $1
                   ORDER BY created_at`, [procesoId]),
      ]);

    // Consultar el expediente completo también deja rastro: quien audita queda
    // auditado, igual que en el módulo de incumplimiento.
    await em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidadId: procesoId,
        entidad: 'expediente',
        accion: 'CONSULTAR',
        detalle: { motivo: 'consulta de auditoría' },
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );

    return {
      proceso: proceso[0] ?? null,
      contrato: contrato[0] ?? null,
      actividades,
      documentos,
      supervisiones,
      modificaciones,
      casosIncumplimiento: casos[0]?.total ?? 0,
      trazabilidad: traza,
    };
  }
}
