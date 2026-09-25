import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, resolve, sep } from 'path';
import { SolicitudHistorialEstadoEntity } from '../../entities/solicitud-historial-estado.entity';
import { cargarFestivosAuth } from '../../common/dias-habiles.util';
import { getUploadRootDir } from '../../common/storage.util';
import { NotificationClientService } from '../../common/notification-client.service';
import { ConfigLegalizacionEntity } from './entities/config-legalizacion.entity';
import { LegalizacionComisionEntity } from './entities/legalizacion-comision.entity';
import { LegalizacionSoporteEntity } from './entities/legalizacion-soporte.entity';
import { calcularSemaforo, diasHabilesRestantes, Semaforo } from './plazo-legalizacion.util';
import { esPdfPorContenido } from './pdf-contenido.util';

/**
 * Mismos códigos que PermissionsGuard, que es quien decide el acceso a las rutas.
 * (El controlador de viáticos tiene su propia lista, más corta y no exportada.)
 */
const ROLES_SUPER_ADMIN = [
  'ADMIN',
  'SUPER_ADMIN',
  'ADMINISTRATIVO',
  'SUPER_ADMINISTRADOR',
  'SUPERUSER',
];

export interface UsuarioAutenticado {
  userId: string;
  roles?: Array<string | { code?: string }>;
  role?: string;
}

export function esSuperAdmin(user?: UsuarioAutenticado | null): boolean {
  if (!user) return false;
  const roles = [...(Array.isArray(user.roles) ? user.roles : []), ...(user.role ? [user.role] : [])];
  return roles.some((r) => {
    const code = typeof r === 'string' ? r : r?.code || '';
    return ROLES_SUPER_ADMIN.includes(code.toUpperCase().replace(/\s+/g, '_'));
  });
}

type Relacion = 'SUPER_ADMIN' | 'CREADOR' | 'COMISIONADO' | 'ANALISTA';

interface SolicitudContexto {
  id: string;
  consecutivo_unico: string;
  estado_solicitud: string;
  modalidad_pago: string;
  destino_ciudad: string;
  destino_departamento: string;
  fecha_inicio_ymd: string;
  fecha_fin_ymd: string;
  requiere_tiquetes: boolean;
  tiene_tramo_aereo: boolean;
  creado_por_usuario_id: string;
  analista_asignado_id: string | null;
  comisionado_numero_documento: string;
  comisionado_nombre: string;
  tipo_comisionado: string;
}

export interface ItemChecklist {
  tipoDocumentoSoporteId: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipoRequisito: 'OBLIGATORIO' | 'OPCIONAL';
  condicion: string | null;
  soportes: Array<{ id: string; nombreArchivoOriginal: string; tamanoBytes: number; creadoEn: Date }>;
  cumplido: boolean;
}

export interface Checklist {
  items: ItemChecklist[];
  /** Sin configuración para el tipo de comisionado: nunca cuenta como completo. */
  sinConfiguracion: boolean;
  obligatoriosPendientes: number;
  completo: boolean;
}

const MAX_BYTES = 25 * 1024 * 1024;

@Injectable()
export class LegalizacionService {
  private readonly logger = new Logger(LegalizacionService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Optional() private readonly notificationClient?: NotificationClientService,
  ) {}

  // ---------------------------------------------------------------------------
  // Contexto y acceso
  // ---------------------------------------------------------------------------

  private async cargarSolicitud(solicitudId: string): Promise<SolicitudContexto> {
    const filas: SolicitudContexto[] = await this.dataSource.query(
      `SELECT s.id, s.consecutivo_unico, s.estado_solicitud, s.modalidad_pago,
              s.destino_ciudad, s.destino_departamento,
              to_char(s.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio_ymd,
              to_char(s.fecha_fin, 'YYYY-MM-DD')    AS fecha_fin_ymd,
              s.requiere_tiquetes,
              EXISTS (
                SELECT 1 FROM jsonb_array_elements(COALESCE(s.itinerario, '[]'::jsonb)) t
                 WHERE t->>'tipoTransporte' = 'AEREO'
              ) AS tiene_tramo_aereo,
              s.creado_por_usuario_id, s.analista_asignado_id,
              c.numero_documento AS comisionado_numero_documento,
              trim(concat_ws(' ', c.primer_nombre, c.segundo_nombre, c.primer_apellido, c.segundo_apellido))
                AS comisionado_nombre,
              c.tipo_comisionado
         FROM travel_expenses.solicitudes_comision s
         JOIN travel_expenses.comisionados c ON c.id = s.comisionado_id
        WHERE s.id = $1`,
      [solicitudId],
    );
    if (!filas[0]) throw new NotFoundException('Solicitud de comisión no encontrada.');
    return filas[0];
  }

  /** Documento de identidad del usuario autenticado (auth.user → auth.personas). */
  private async documentoDelUsuario(userId: string): Promise<string | null> {
    const filas: Array<{ num_identificacion: string }> = await this.dataSource.query(
      `SELECT p.num_identificacion
         FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person
        WHERE u.id_user = $1`,
      [userId],
    );
    return filas[0]?.num_identificacion ?? null;
  }

  /**
   * Quién es el usuario respecto de la solicitud. El enlace que la radicó y el
   * propio comisionado (por documento) legalizan; el analista asignado solo
   * consulta. Cualquier otro: 403.
   */
  private async relacion(sol: SolicitudContexto, user: UsuarioAutenticado): Promise<Relacion | null> {
    if (esSuperAdmin(user)) return 'SUPER_ADMIN';
    if (!user?.userId) return null;
    if (sol.creado_por_usuario_id === user.userId) return 'CREADOR';
    const doc = await this.documentoDelUsuario(user.userId);
    if (doc && doc === sol.comisionado_numero_documento) return 'COMISIONADO';
    if (sol.analista_asignado_id && sol.analista_asignado_id === user.userId) return 'ANALISTA';
    return null;
  }

  private async exigirAcceso(
    sol: SolicitudContexto,
    user: UsuarioAutenticado,
    modo: 'LECTURA' | 'ESCRITURA',
  ): Promise<Relacion> {
    const r = await this.relacion(sol, user);
    if (!r || (modo === 'ESCRITURA' && r === 'ANALISTA')) {
      throw new ForbiddenException(
        modo === 'ESCRITURA'
          ? 'Solo el comisionado o el enlace que radicó la comisión pueden cargar su legalización.'
          : 'No tiene acceso a la legalización de esta comisión.',
      );
    }
    return r;
  }

  private async cargarLegalizacion(solicitudId: string): Promise<LegalizacionComisionEntity> {
    const leg = await this.dataSource
      .getRepository(LegalizacionComisionEntity)
      .findOne({ where: { solicitudId } });
    if (!leg) {
      throw new NotFoundException('Esta comisión todavía no tiene legalización abierta.');
    }
    return leg;
  }

  private exigirAbierta(leg: LegalizacionComisionEntity): void {
    if (leg.fechaEnvio) {
      throw new BadRequestException(
        'La legalización ya fue enviada a revisión: no se pueden modificar sus soportes.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Checklist (configuración de EFDS-1258 aplicada a la legalización)
  // ---------------------------------------------------------------------------

  async checklist(sol: SolicitudContexto, legalizacionId: string): Promise<Checklist> {
    const config = await this.dataSource.query(
      `SELECT d.tipo_documento_soporte_id, t.codigo, t.nombre, t.descripcion,
              d.tipo_requisito, d.condicion, d.orden
         FROM travel_expenses.config_legalizacion_documentos d
         JOIN travel_expenses.config_tipo_comisionado ct ON ct.id = d.config_tipo_comisionado_id
         JOIN travel_expenses.tipos_documento_soporte t ON t.id = d.tipo_documento_soporte_id
        WHERE ct.tipo_comisionado = $1 AND ct.activo AND d.activo AND t.activo
        ORDER BY d.orden, t.nombre`,
      [sol.tipo_comisionado],
    );

    const soportes = await this.dataSource.getRepository(LegalizacionSoporteEntity).find({
      where: { legalizacionId },
      order: { creadoEn: 'ASC' },
    });

    const transporteAereo = Boolean(sol.requiere_tiquetes || sol.tiene_tramo_aereo);
    const items: ItemChecklist[] = config
      .filter((c: any) => c.condicion !== 'TRANSPORTE_AEREO' || transporteAereo)
      .map((c: any) => {
        const propios = soportes
          .filter((s) => s.tipoDocumentoSoporteId === c.tipo_documento_soporte_id)
          .map((s) => ({
            id: s.id,
            nombreArchivoOriginal: s.nombreArchivoOriginal,
            tamanoBytes: s.tamanoBytes,
            creadoEn: s.creadoEn,
          }));
        return {
          tipoDocumentoSoporteId: c.tipo_documento_soporte_id,
          codigo: c.codigo,
          nombre: c.nombre,
          descripcion: c.descripcion,
          tipoRequisito: c.tipo_requisito,
          condicion: c.condicion,
          soportes: propios,
          cumplido: propios.length > 0,
        };
      });

    const sinConfiguracion = items.length === 0;
    const obligatoriosPendientes = items.filter(
      (i) => i.tipoRequisito === 'OBLIGATORIO' && !i.cumplido,
    ).length;

    return {
      items,
      sinConfiguracion,
      obligatoriosPendientes,
      completo: !sinConfiguracion && obligatoriosPendientes === 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Consultas
  // ---------------------------------------------------------------------------

  private async parametrosAviso(modalidad: string): Promise<number> {
    const cfg = await this.dataSource
      .getRepository(ConfigLegalizacionEntity)
      .findOne({ where: { modalidadPago: modalidad as any } });
    return cfg?.diasAvisoPorVencer ?? 2;
  }

  private async resumen(
    sol: SolicitudContexto,
    leg: LegalizacionComisionEntity,
    festivos: ReadonlySet<string>,
    ahora: Date,
  ) {
    const diasAviso = await this.parametrosAviso(leg.modalidadPago);
    const semaforo: Semaforo = calcularSemaforo(leg, ahora, diasAviso, festivos);
    return {
      legalizacionId: leg.id,
      solicitudId: sol.id,
      consecutivoUnico: sol.consecutivo_unico,
      estadoSolicitud: sol.estado_solicitud,
      comisionadoNombre: sol.comisionado_nombre,
      destino: [sol.destino_ciudad, sol.destino_departamento].filter(Boolean).join(', '),
      fechaInicio: sol.fecha_inicio_ymd,
      fechaFin: sol.fecha_fin_ymd,
      modalidadPago: leg.modalidadPago,
      plazoDiasHabiles: leg.plazoDiasHabiles,
      fechaLimite: leg.fechaLimite,
      diasHabilesRestantes:
        semaforo === 'VENCIDA' || semaforo === 'ENVIADA'
          ? 0
          : diasHabilesRestantes(ahora, new Date(leg.fechaLimite), festivos),
      calendarioIncompleto: leg.calendarioIncompleto,
      fechaEnvio: leg.fechaEnvio,
      semaforo,
    };
  }

  async listarMias(user: UsuarioAutenticado) {
    if (!user?.userId) throw new ForbiddenException('Usuario no autenticado.');
    const doc = await this.documentoDelUsuario(user.userId);
    const todas = esSuperAdmin(user);

    const ids: Array<{ solicitud_id: string }> = await this.dataSource.query(
      `SELECT l.solicitud_id
         FROM travel_expenses.legalizaciones_comision l
         JOIN travel_expenses.solicitudes_comision s ON s.id = l.solicitud_id
         JOIN travel_expenses.comisionados c ON c.id = s.comisionado_id
        WHERE $1::boolean
           OR s.creado_por_usuario_id = $2
           OR ($3::text IS NOT NULL AND c.numero_documento = $3::text)
        ORDER BY (l.fecha_envio IS NOT NULL), l.fecha_limite`,
      [todas, user.userId, doc],
    );

    const festivos = await cargarFestivosAuth(this.dataSource);
    const ahora = new Date();
    const out: Array<Record<string, unknown>> = [];
    for (const { solicitud_id } of ids) {
      const sol = await this.cargarSolicitud(solicitud_id);
      const leg = await this.cargarLegalizacion(solicitud_id);
      const chk = await this.checklist(sol, leg.id);
      out.push({
        ...(await this.resumen(sol, leg, festivos, ahora)),
        obligatoriosPendientes: chk.obligatoriosPendientes,
        checklistCompleto: chk.completo,
      });
    }
    return out;
  }

  async detalle(solicitudId: string, user: UsuarioAutenticado) {
    const sol = await this.cargarSolicitud(solicitudId);
    const relacion = await this.exigirAcceso(sol, user, 'LECTURA');
    const leg = await this.cargarLegalizacion(solicitudId);
    const festivos = await cargarFestivosAuth(this.dataSource);
    const chk = await this.checklist(sol, leg.id);
    return {
      ...(await this.resumen(sol, leg, festivos, new Date())),
      puedeEditar: relacion !== 'ANALISTA' && !leg.fechaEnvio,
      checklist: chk,
    };
  }

  // ---------------------------------------------------------------------------
  // Soportes
  // ---------------------------------------------------------------------------

  async subirSoporte(
    solicitudId: string,
    tipoDocumentoSoporteId: string,
    archivo: { buffer?: Buffer; originalname?: string; size?: number } | undefined,
    user: UsuarioAutenticado,
  ) {
    if (!archivo?.buffer?.length) throw new BadRequestException('Debe adjuntar un archivo.');
    if (archivo.buffer.length > MAX_BYTES) {
      throw new BadRequestException('El archivo supera el tamaño máximo de 25 MB.');
    }
    if (!tipoDocumentoSoporteId) {
      throw new BadRequestException('Debe indicar el tipo de soporte (tipoDocumentoSoporteId).');
    }

    const sol = await this.cargarSolicitud(solicitudId);
    await this.exigirAcceso(sol, user, 'ESCRITURA');
    const leg = await this.cargarLegalizacion(solicitudId);
    this.exigirAbierta(leg);

    const chk = await this.checklist(sol, leg.id);
    const item = chk.items.find((i) => i.tipoDocumentoSoporteId === tipoDocumentoSoporteId);
    if (!item) {
      throw new BadRequestException('Ese tipo de soporte no forma parte del checklist de esta comisión.');
    }

    if (!esPdfPorContenido(archivo.buffer)) {
      throw new BadRequestException(
        `"${archivo.originalname || 'El archivo'}" no es un PDF válido: su contenido no empieza con la cabecera %PDF-. ` +
          'Cambiar la extensión no convierte un archivo en PDF.',
      );
    }

    const nombreOriginal = (archivo.originalname || 'soporte.pdf').slice(0, 255);
    const rutaRelativa = `${solicitudId}/legalizacion/${randomUUID()}.pdf`;
    const rutaAbsoluta = this.rutaSegura(rutaRelativa);
    await mkdir(resolve(rutaAbsoluta, '..'), { recursive: true });
    await writeFile(rutaAbsoluta, archivo.buffer, { flag: 'wx' });

    try {
      const repo = this.dataSource.getRepository(LegalizacionSoporteEntity);
      const guardado = await repo.save(
        repo.create({
          legalizacionId: leg.id,
          tipoDocumentoSoporteId,
          nombreArchivoOriginal: nombreOriginal,
          rutaRelativa,
          tamanoBytes: archivo.buffer.length,
          sha256: createHash('sha256').update(archivo.buffer).digest('hex'),
          cargadoPorId: user.userId,
        }),
      );
      return {
        id: guardado.id,
        tipoDocumentoSoporteId,
        nombreArchivoOriginal: guardado.nombreArchivoOriginal,
        tamanoBytes: guardado.tamanoBytes,
        creadoEn: guardado.creadoEn,
      };
    } catch (err) {
      // Sin registro no debe quedar un archivo huérfano en disco.
      await unlink(rutaAbsoluta).catch(() => undefined);
      throw err;
    }
  }

  async eliminarSoporte(solicitudId: string, soporteId: string, user: UsuarioAutenticado) {
    const sol = await this.cargarSolicitud(solicitudId);
    await this.exigirAcceso(sol, user, 'ESCRITURA');
    const leg = await this.cargarLegalizacion(solicitudId);
    this.exigirAbierta(leg);

    const repo = this.dataSource.getRepository(LegalizacionSoporteEntity);
    const soporte = await repo.findOne({ where: { id: soporteId, legalizacionId: leg.id } });
    if (!soporte) throw new NotFoundException('Soporte no encontrado en esta legalización.');

    await repo.delete({ id: soporte.id });
    await unlink(this.rutaSegura(soporte.rutaRelativa)).catch((err) =>
      this.logger.warn(`[EFDS-1309] No se pudo borrar el archivo ${soporte.id} del disco: ${err?.message}`),
    );
    return { eliminado: true, id: soporte.id };
  }

  async archivoSoporte(solicitudId: string, soporteId: string, user: UsuarioAutenticado) {
    const sol = await this.cargarSolicitud(solicitudId);
    await this.exigirAcceso(sol, user, 'LECTURA');
    const leg = await this.cargarLegalizacion(solicitudId);
    const soporte = await this.dataSource
      .getRepository(LegalizacionSoporteEntity)
      .findOne({ where: { id: soporteId, legalizacionId: leg.id } });
    if (!soporte) throw new NotFoundException('Soporte no encontrado en esta legalización.');
    return { rutaAbsoluta: this.rutaSegura(soporte.rutaRelativa), nombre: soporte.nombreArchivoOriginal };
  }

  /** La ruta guardada siempre debe resolver dentro de la raíz de almacenamiento. */
  private rutaSegura(rutaRelativa: string): string {
    const raiz = resolve(getUploadRootDir());
    const absoluta = resolve(join(raiz, rutaRelativa));
    if (!absoluta.startsWith(raiz + sep)) {
      throw new BadRequestException('Ruta de archivo inválida.');
    }
    return absoluta;
  }

  // ---------------------------------------------------------------------------
  // Envío a revisión
  // ---------------------------------------------------------------------------

  async enviar(solicitudId: string, user: UsuarioAutenticado) {
    const sol = await this.cargarSolicitud(solicitudId);
    await this.exigirAcceso(sol, user, 'ESCRITURA');

    const resultado = await this.dataSource.transaction(async (m) => {
      const bloqueada: LegalizacionComisionEntity[] = await m.query(
        `SELECT id FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = $1 FOR UPDATE`,
        [solicitudId],
      );
      if (!bloqueada[0]) throw new NotFoundException('Esta comisión todavía no tiene legalización abierta.');

      const leg = await m.getRepository(LegalizacionComisionEntity).findOneOrFail({ where: { solicitudId } });
      this.exigirAbierta(leg);

      const chk = await this.checklist(sol, leg.id);
      if (chk.sinConfiguracion) {
        throw new BadRequestException(
          `No hay soportes de legalización configurados para comisionados de tipo ${sol.tipo_comisionado}. ` +
            'Solicite al Grupo de Viáticos que los configure antes de enviar.',
        );
      }
      if (!chk.completo) {
        const faltan = chk.items
          .filter((i) => i.tipoRequisito === 'OBLIGATORIO' && !i.cumplido)
          .map((i) => i.nombre)
          .join(', ');
        throw new BadRequestException(`Faltan soportes obligatorios: ${faltan}.`);
      }

      leg.fechaEnvio = new Date();
      leg.enviadaPorId = user.userId;
      await m.getRepository(LegalizacionComisionEntity).save(leg);

      const totalSoportes = chk.items.reduce((n, i) => n + i.soportes.length, 0);
      await m.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: sol.id,
        estadoAnterior: sol.estado_solicitud,
        estadoNuevo: sol.estado_solicitud,
        usuarioId: user.userId,
        comentarios: `[EFDS-1309] Legalización enviada a revisión con ${totalSoportes} soporte(s).`,
      });
      return { leg, totalSoportes };
    });

    await this.notificarEnvio(sol, resultado.totalSoportes);
    return {
      legalizacionId: resultado.leg.id,
      fechaEnvio: resultado.leg.fechaEnvio,
      totalSoportes: resultado.totalSoportes,
    };
  }

  private async notificarEnvio(sol: SolicitudContexto, totalSoportes: number): Promise<void> {
    if (!this.notificationClient || !sol.analista_asignado_id) return;
    try {
      await this.notificationClient.send({
        id_usuario_destinatario: sol.analista_asignado_id,
        tipo_notificacion: 'VIATICOS_LEGALIZACION_ENVIADA',
        titulo: `Legalización recibida: ${sol.consecutivo_unico}`,
        mensaje: `El comisionado envió la legalización de ${sol.consecutivo_unico} con ${totalSoportes} soporte(s) para revisión.`,
        icono: 'Receipt',
        color: '#2563eb',
        prioridad: 'Media',
        categoria: 'VIATICOS',
        tiene_accion: true,
        texto_boton_accion: 'Revisar',
        url_accion: '/viaticos',
        datos_adicionales: { solicitudId: sol.id },
      });
    } catch (err: any) {
      this.logger.warn(`[EFDS-1309] No se pudo notificar el envío de ${sol.consecutivo_unico}: ${err?.message}`);
    }
  }
}
