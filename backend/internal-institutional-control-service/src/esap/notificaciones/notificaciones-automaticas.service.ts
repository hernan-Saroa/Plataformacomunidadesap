import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, DataSource } from 'typeorm';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { PlanMejoramiento, PlanMejoramientoEstado } from '../planes-mejoramiento/entities/plan-mejoramiento.entity';
import { SeguimientoTrimestral } from '../planes-mejoramiento/entities/seguimiento-trimestral.entity';
import { NotificacionesService } from './notificaciones.service';
import { Notificacion, TipoNotificacion, PrioridadNotificacion, CanalNotificacion } from './entities/notificacion.entity';

@Injectable()
export class NotificacionesAutomaticasService {
  private readonly logger = new Logger(NotificacionesAutomaticasService.name);

  // Días de anticipación para las notificaciones
  private readonly DIAS_ANTICIPACION = [7, 3, 1];

  constructor(
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
    @InjectRepository(PlanMejoramiento)
    private readonly planMejoramientoRepository: Repository<PlanMejoramiento>,
    @InjectRepository(SeguimientoTrimestral)
    private readonly seguimientoTrimestralRepository: Repository<SeguimientoTrimestral>,
    @InjectRepository(Notificacion)
    private readonly notificacionRepository: Repository<Notificacion>,
    private readonly notificacionesService: NotificacionesService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Job que se ejecuta periódicamente para enviar notificaciones automáticas
   * Se ejecuta diariamente (configurado en el scheduler)
   */
  async ejecutarNotificacionesAutomaticas(): Promise<{
    notificacionesEnviadas: number;
    notificacionesError: number;
  }> {
    this.logger.log('Iniciando job de notificaciones automáticas...');

    let notificacionesEnviadas = 0;
    let notificacionesError = 0;

    try {
      // 1. Notificaciones de auditorías próximas a vencer
      const resultadoAuditorias = await this.procesarNotificacionesAuditorias();
      notificacionesEnviadas += resultadoAuditorias.enviadas;
      notificacionesError += resultadoAuditorias.errores;

      // 2. Notificaciones de planes de mejoramiento próximos a vencer
      const resultadoPlanes = await this.procesarNotificacionesPlanesMejoramiento();
      notificacionesEnviadas += resultadoPlanes.enviadas;
      notificacionesError += resultadoPlanes.errores;

      // 3. Notificaciones de seguimientos trimestrales próximos a vencer
      const resultadoSeguimientos = await this.procesarNotificacionesSeguimientosTrimestrales();
      notificacionesEnviadas += resultadoSeguimientos.enviadas;
      notificacionesError += resultadoSeguimientos.errores;

      this.logger.log(
        `Job completado: ${notificacionesEnviadas} notificaciones enviadas, ${notificacionesError} errores`,
      );

      return {
        notificacionesEnviadas,
        notificacionesError,
      };
    } catch (error) {
      this.logger.error(`Error en job de notificaciones automáticas: ${error.message}`, error.stack);
      return {
        notificacionesEnviadas,
        notificacionesError: notificacionesError + 1,
      };
    }
  }

  /**
   * Procesa notificaciones para auditorías próximas a vencer
   */
  private async procesarNotificacionesAuditorias(): Promise<{
    enviadas: number;
    errores: number;
  }> {
    let enviadas = 0;
    let errores = 0;

    for (const diasAnticipacion of this.DIAS_ANTICIPACION) {
      try {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);
        fechaLimite.setHours(0, 0, 0, 0);

        const fechaLimiteFin = new Date(fechaLimite);
        fechaLimiteFin.setHours(23, 59, 59, 999);

        // Buscar auditorías que vencen en X días y que están activas
        const auditorias = await this.auditoriaRepository.find({
          where: {
            fechaFin: MoreThanOrEqual(fechaLimite),
            activa: true,
            archivada: false,
          },
        });

        // Filtrar las que realmente vencen en X días (considerando solo la fecha, no la hora)
        const hoy = new Date();
        const hoyUTC = new Date(Date.UTC(
          hoy.getFullYear(),
          hoy.getMonth(),
          hoy.getDate()
        ));
        
        const auditoriasFiltradas = auditorias.filter((auditoria) => {
          const fechaFin = new Date(auditoria.fechaFin);
          const fechaFinUTC = new Date(Date.UTC(
            fechaFin.getFullYear(),
            fechaFin.getMonth(),
            fechaFin.getDate()
          ));
          const diffMs = fechaFinUTC.getTime() - hoyUTC.getTime();
          const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
          return diffDias === diasAnticipacion;
        });

        for (const auditoria of auditoriasFiltradas) {
          try {
            // Verificar si ya se envió esta notificación
            const notificacionExistente = await this.verificarNotificacionExistente(
              TipoNotificacion.ALERTA_VENCIMIENTO,
              auditoria.id,
              diasAnticipacion,
            );

            if (notificacionExistente) {
              continue; // Ya se envió esta notificación
            }

            // ✅ SINCRONIZACIÓN CON CONFIGURACIÓN: Obtener roles para alertas de vencimiento (EVT-AUD-002)
            let rolesDestinatarios = ['Auditor Líder', 'Auditor de Equipo']; // Fallback
            try {
              const configGlobal = await this.notificacionesService.getGlobalConfig();
              if (configGlobal && configGlobal.tiposNotificacion && configGlobal.tiposNotificacion['EVT-AUD-002']) {
                const configEvento = configGlobal.tiposNotificacion['EVT-AUD-002'] as any;
                rolesDestinatarios = configEvento.destinatarios || rolesDestinatarios;
              }
            } catch (e) {}

            // ✅ SINCRONIZACIÓN CON CONFIGURACIÓN: Disparar evento para que el motor resuelva destinatarios (Jefe OCI, Líder, etc.)
            const fechaVencimiento = new Date(auditoria.fechaFin).toLocaleDateString('es-CO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            await this.notificacionesService.dispararEvento('EVT-AUD-DEADLINE', {
              auditoriaId: auditoria.id,
              auditoriaCodigo: auditoria.codigo,
              tituloCustom: `Auditoría próxima a vencer - ${auditoria.codigo}`,
              mensajeCustom: `La auditoría "${auditoria.nombre}" (${auditoria.codigo}) vence en ${diasAnticipacion} ${diasAnticipacion === 1 ? 'día' : 'días'} (${fechaVencimiento}).`,
              metadata: {
                auditoriaId: auditoria.id,
                auditoriaCodigo: auditoria.codigo,
                fechaVencimiento: auditoria.fechaFin.toISOString(),
                diasAnticipacion,
              },
              url_accion: `/control-interno/auditorias/${auditoria.id}`,
            });

            enviadas++;
          } catch (error) {
            this.logger.error(
              `Error al crear notificación para auditoría ${auditoria.id}: ${error.message}`,
            );
            errores++;
          }
        }
      } catch (error) {
        this.logger.error(
          `Error al procesar notificaciones de auditorías para ${diasAnticipacion} días: ${error.message}`,
        );
        errores++;
      }
    }

    return { enviadas, errores };
  }

  /**
   * Procesa notificaciones para planes de mejoramiento próximos a vencer
   */
  private async procesarNotificacionesPlanesMejoramiento(): Promise<{
    enviadas: number;
    errores: number;
  }> {
    let enviadas = 0;
    let errores = 0;

    for (const diasAnticipacion of this.DIAS_ANTICIPACION) {
      try {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);
        fechaLimite.setHours(0, 0, 0, 0);

        // Buscar planes de mejoramiento que vencen en X días y que están en ejecución
        const planes = await this.planMejoramientoRepository.find({
          where: {
            fechaLimite: MoreThanOrEqual(fechaLimite),
            estado: PlanMejoramientoEstado.EN_EJECUCION,
          },
        });

        // Filtrar los que realmente vencen en X días
        const hoy = new Date();
        const hoyUTC = new Date(Date.UTC(
          hoy.getFullYear(),
          hoy.getMonth(),
          hoy.getDate()
        ));
        
        const planesFiltrados = planes.filter((plan) => {
          const fechaLimitePlan = new Date(plan.fechaLimite);
          const fechaLimiteUTC = new Date(Date.UTC(
            fechaLimitePlan.getFullYear(),
            fechaLimitePlan.getMonth(),
            fechaLimitePlan.getDate()
          ));
          const diffMs = fechaLimiteUTC.getTime() - hoyUTC.getTime();
          const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
          return diffDias === diasAnticipacion;
        });

        for (const plan of planesFiltrados) {
          try {
            // Verificar si ya se envió esta notificación
            const notificacionExistente = await this.verificarNotificacionExistente(
              TipoNotificacion.ALERTA_VENCIMIENTO,
              plan.id,
              diasAnticipacion,
            );

            if (notificacionExistente) {
              continue;
            }

            // Obtener usuario responsable del plan
            const usuarioId = await this.obtenerUsuarioResponsablePlan(plan);

            if (!usuarioId) {
              continue; // No se encontró usuario responsable
            }

            const fechaVencimiento = new Date(plan.fechaLimite).toLocaleDateString('es-CO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            // Obtener información de la auditoría si está disponible
            let auditoriaInfo = '';
            if (plan.auditoriaId) {
              try {
                const auditoria = await this.auditoriaRepository.findOne({
                  where: { id: plan.auditoriaId },
                });
                if (auditoria) {
                  auditoriaInfo = ` para la auditoría ${auditoria.codigo}`;
                }
              } catch (error) {
                // Ignorar error, continuar sin información de auditoría
              }
            }

            await this.notificacionesService.create({
              usuarioId,
              tipoNotificacion: TipoNotificacion.ALERTA_VENCIMIENTO,
              titulo: `Plan de Mejoramiento Pendiente - ${plan.codigo}`,
              mensaje: `El Plan de Mejoramiento "${plan.titulo}" (${plan.codigo})${auditoriaInfo} debe ser presentado antes del ${fechaVencimiento} (faltan ${diasAnticipacion} ${diasAnticipacion === 1 ? 'día' : 'días'}).`,
              prioridad: PrioridadNotificacion.ALTA,
              canal: CanalNotificacion.SISTEMA,
              metadata: {
                planMejoramientoId: plan.id,
                planCodigo: plan.codigo,
                fechaVencimiento: plan.fechaLimite.toISOString(),
                diasAnticipacion,
              },
              accionUrl: `/control-interno/planes-mejoramiento/${plan.id}`,
            });

            enviadas++;
          } catch (error) {
            this.logger.error(
              `Error al crear notificación para plan ${plan.id}: ${error.message}`,
            );
            errores++;
          }
        }
      } catch (error) {
        this.logger.error(
          `Error al procesar notificaciones de planes para ${diasAnticipacion} días: ${error.message}`,
        );
        errores++;
      }
    }

    return { enviadas, errores };
  }

  /**
   * Procesa notificaciones para seguimientos trimestrales próximos a vencer
   */
  private async procesarNotificacionesSeguimientosTrimestrales(): Promise<{
    enviadas: number;
    errores: number;
  }> {
    let enviadas = 0;
    let errores = 0;

    for (const diasAnticipacion of this.DIAS_ANTICIPACION) {
      try {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);
        fechaLimite.setHours(0, 0, 0, 0);

        // Buscar seguimientos trimestrales que vencen en X días
        const seguimientos = await this.seguimientoTrimestralRepository
          .createQueryBuilder('seguimiento')
          .leftJoinAndSelect('seguimiento.plan', 'plan')
          .where('seguimiento.fechaFin >= :fechaLimite', { fechaLimite })
          .andWhere('plan.estado = :estado', {
            estado: PlanMejoramientoEstado.EN_EJECUCION,
          })
          .getMany();

        // Filtrar los que realmente vencen en X días
        const hoy = new Date();
        const hoyUTC = new Date(Date.UTC(
          hoy.getFullYear(),
          hoy.getMonth(),
          hoy.getDate()
        ));
        
        const seguimientosFiltrados = seguimientos.filter((seguimiento) => {
          const fechaFin = new Date(seguimiento.fechaFin);
          const fechaFinUTC = new Date(Date.UTC(
            fechaFin.getFullYear(),
            fechaFin.getMonth(),
            fechaFin.getDate()
          ));
          const diffMs = fechaFinUTC.getTime() - hoyUTC.getTime();
          const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
          return diffDias === diasAnticipacion;
        });

        for (const seguimiento of seguimientosFiltrados) {
          try {
            // Verificar si ya se envió esta notificación
            const notificacionExistente = await this.verificarNotificacionExistente(
              TipoNotificacion.RECORDATORIO_PLAZO,
              seguimiento.planId,
              diasAnticipacion,
              seguimiento.id,
            );

            if (notificacionExistente) {
              continue;
            }

            // Obtener usuario responsable del plan
            const usuarioId = await this.obtenerUsuarioResponsablePlan(seguimiento.plan);

            if (!usuarioId) {
              continue;
            }

            const fechaVencimiento = new Date(seguimiento.fechaFin).toLocaleDateString('es-CO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            await this.notificacionesService.create({
              usuarioId,
              tipoNotificacion: TipoNotificacion.RECORDATORIO_PLAZO,
              titulo: `Seguimiento Trimestral Próximo - ${seguimiento.plan.codigo}`,
              mensaje: `El seguimiento trimestral del Plan de Mejoramiento ${seguimiento.plan.codigo} vence en ${diasAnticipacion} ${diasAnticipacion === 1 ? 'día' : 'días'} (${fechaVencimiento}).`,
              prioridad: PrioridadNotificacion.ALTA,
              canal: CanalNotificacion.SISTEMA,
              metadata: {
                planMejoramientoId: seguimiento.planId,
                planCodigo: seguimiento.plan.codigo,
                seguimientoTrimestralId: seguimiento.id,
                fechaVencimiento: seguimiento.fechaFin.toISOString(),
                diasAnticipacion,
                trimestre: seguimiento.trimestre,
                año: seguimiento.año,
              },
              accionUrl: `/control-interno/planes-mejoramiento/${seguimiento.planId}/seguimientos`,
            });

            enviadas++;
          } catch (error) {
            this.logger.error(
              `Error al crear notificación para seguimiento ${seguimiento.id}: ${error.message}`,
            );
            errores++;
          }
        }
      } catch (error) {
        this.logger.error(
          `Error al procesar notificaciones de seguimientos para ${diasAnticipacion} días: ${error.message}`,
        );
        errores++;
      }
    }

    return { enviadas, errores };
  }

  /**
   * Verifica si ya existe una notificación para evitar duplicados
   */
  private async verificarNotificacionExistente(
    tipoNotificacion: TipoNotificacion,
    entidadId: string,
    diasAnticipacion: number,
    seguimientoId?: string,
  ): Promise<boolean> {
    try {
      const fechaHace24Horas = new Date();
      fechaHace24Horas.setHours(fechaHace24Horas.getHours() - 24);

      // Construir la consulta según el tipo de entidad
      let campoId: string;
      if (seguimientoId) {
        campoId = 'seguimientoTrimestralId';
      } else if (tipoNotificacion === TipoNotificacion.ALERTA_VENCIMIENTO) {
        // Verificar si es auditoría o plan de mejoramiento
        const plan = await this.planMejoramientoRepository.findOne({ where: { id: entidadId } });
        campoId = plan ? 'planMejoramientoId' : 'auditoriaId';
      } else {
        campoId = 'auditoriaId';
      }

      const query = this.notificacionRepository
        .createQueryBuilder('notificacion')
        .where('notificacion.tipoNotificacion = :tipo', { tipo: tipoNotificacion })
        .andWhere(`notificacion.metadata->>'${campoId}' = :entidadId`, { entidadId })
        .andWhere(`notificacion.metadata->>'diasAnticipacion' = :dias`, {
          dias: diasAnticipacion.toString(),
        })
        .andWhere('notificacion.createdAt >= :fecha', { fecha: fechaHace24Horas });

      if (seguimientoId) {
        query.andWhere(`notificacion.metadata->>'seguimientoTrimestralId' = :seguimientoId`, {
          seguimientoId,
        });
      }

      const count = await query.getCount();
      return count > 0;
    } catch (error) {
      this.logger.warn(
        `Error al verificar notificación existente: ${error.message}. Continuando...`,
      );
      return false; // En caso de error, permitir crear la notificación
    }
  }

  /**
   * Obtiene los usuarios a notificar para una auditoría
   */
  private async obtenerUsuariosAuditoria(auditoria: Auditoria): Promise<string[]> {
    const personIds: string[] = [];
    if (auditoria.auditorLiderId) personIds.push(String(auditoria.auditorLiderId));
    if (auditoria.auditorAsignadoId) personIds.push(String(auditoria.auditorAsignadoId));

    if (personIds.length === 0) return [];

    try {
      const result = await this.dataSource.query(
        `SELECT id_user FROM auth."user" WHERE id_person = ANY($1::uuid[]) AND is_active = true`,
        [personIds]
      );
      return result.map((r: any) => String(r.id_user)).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  /**
   * Obtiene el usuario responsable de un plan de mejoramiento
   */
  private async obtenerUsuarioResponsablePlan(plan: PlanMejoramiento): Promise<string | null> {
    try {
      // Buscar usuario por nombre del responsable
      const nombreCompleto = plan.responsableImplementacion.trim();
      
      const result = await this.dataSource.query(
        `
        SELECT u.id_user
        FROM auth."user" u
        WHERE (
          LOWER(TRIM(u.nombre || ' ' || COALESCE(u.apellido, ''))) = LOWER(TRIM($1))
          OR LOWER(TRIM(u.nombre)) = LOWER(TRIM($1))
          OR LOWER(TRIM(u.email)) = LOWER(TRIM($1))
        )
          AND u.is_active = true
        LIMIT 1
      `,
        [nombreCompleto],
      );

      if (result && result.length > 0) {
        return String(result[0].id_user);
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error al obtener usuario responsable del plan ${plan.codigo}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Método de debug para ver qué datos encuentra el sistema
   */
  async debugDatos(): Promise<any> {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const debugInfo: any = {
        fechaActual: hoy.toISOString(),
        diasAnticipacion: this.DIAS_ANTICIPACION,
        auditorias: {},
        planesMejoramiento: {},
        seguimientosTrimestrales: {},
        errores: [],
      };

      // Debug de auditorías
      try {
        for (const dias of this.DIAS_ANTICIPACION) {
          const fechaLimite = new Date();
          fechaLimite.setDate(fechaLimite.getDate() + dias);
          fechaLimite.setHours(0, 0, 0, 0);

          const auditorias = await this.auditoriaRepository.find({
            where: {
              fechaFin: MoreThanOrEqual(fechaLimite),
              activa: true,
              archivada: false,
            },
          });

          const auditoriasFiltradas = auditorias
            .filter((aud) => aud.fechaFin) // Filtrar nulls
            .map((aud) => {
              try {
                // Crear fechas en UTC para evitar problemas de zona horaria
                const fechaFin = new Date(aud.fechaFin);
                const fechaFinUTC = new Date(Date.UTC(
                  fechaFin.getFullYear(),
                  fechaFin.getMonth(),
                  fechaFin.getDate()
                ));
                const hoyUTC = new Date(Date.UTC(
                  hoy.getFullYear(),
                  hoy.getMonth(),
                  hoy.getDate()
                ));
                
                // Calcular diferencia en días
                const diffMs = fechaFinUTC.getTime() - hoyUTC.getTime();
                const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
                
                return {
                  id: aud.id,
                  codigo: aud.codigo || 'N/A',
                  nombre: aud.nombre || 'N/A',
                  fechaFin: aud.fechaFin ? aud.fechaFin.toISOString() : null,
                  fechaFinLocal: fechaFin.toLocaleDateString('es-CO'),
                  diasRestantes: diffDias,
                  auditorLiderId: aud.auditorLiderId,
                  auditorAsignadoId: aud.auditorAsignadoId,
                  activa: aud.activa,
                  archivada: aud.archivada,
                };
              } catch (error) {
                this.logger.warn(`Error procesando auditoría ${aud.id}: ${error.message}`);
                return null;
              }
            })
            .filter((a) => a !== null);

          const filtradas = auditoriasFiltradas.filter((a) => a.diasRestantes === dias);
          debugInfo.auditorias[`${dias}_dias`] = {
            fechaLimite: fechaLimite.toISOString(),
            fechaLimiteLocal: fechaLimite.toLocaleDateString('es-CO'),
            totalEncontradas: auditorias.length,
            filtradas: filtradas,
            todas: auditoriasFiltradas,
            // Información adicional para debugging
            diasRestantesEncontrados: [...new Set(auditoriasFiltradas.map(a => a.diasRestantes))].sort((a, b) => a - b),
          };
        }
      } catch (error) {
        debugInfo.errores.push(`Error en auditorías: ${error.message}`);
        this.logger.error(`Error en debug de auditorías: ${error.message}`);
      }

      // Debug de planes de mejoramiento
      try {
        for (const dias of this.DIAS_ANTICIPACION) {
          const fechaLimite = new Date();
          fechaLimite.setDate(fechaLimite.getDate() + dias);
          fechaLimite.setHours(0, 0, 0, 0);

          const planes = await this.planMejoramientoRepository.find({
            where: {
              fechaLimite: MoreThanOrEqual(fechaLimite),
              estado: PlanMejoramientoEstado.EN_EJECUCION,
            },
          });

          const planesFiltrados = planes
            .filter((plan) => plan.fechaLimite) // Filtrar nulls
            .map((plan) => {
              try {
                // Crear fechas en UTC para evitar problemas de zona horaria
                const fechaLimitePlan = new Date(plan.fechaLimite);
                const fechaLimiteUTC = new Date(Date.UTC(
                  fechaLimitePlan.getFullYear(),
                  fechaLimitePlan.getMonth(),
                  fechaLimitePlan.getDate()
                ));
                const hoyUTC = new Date(Date.UTC(
                  hoy.getFullYear(),
                  hoy.getMonth(),
                  hoy.getDate()
                ));
                
                // Calcular diferencia en días
                const diffMs = fechaLimiteUTC.getTime() - hoyUTC.getTime();
                const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
                
                return {
                  id: plan.id,
                  codigo: plan.codigo || 'N/A',
                  titulo: plan.titulo || 'N/A',
                  fechaLimite: plan.fechaLimite ? plan.fechaLimite.toISOString() : null,
                  fechaLimiteLocal: fechaLimitePlan.toLocaleDateString('es-CO'),
                  diasRestantes: diffDias,
                  estado: plan.estado,
                  responsableImplementacion: plan.responsableImplementacion || 'N/A',
                };
              } catch (error) {
                this.logger.warn(`Error procesando plan ${plan.id}: ${error.message}`);
                return null;
              }
            })
            .filter((p) => p !== null);

          const filtrados = planesFiltrados.filter((p) => p.diasRestantes === dias);
          debugInfo.planesMejoramiento[`${dias}_dias`] = {
            fechaLimite: fechaLimite.toISOString(),
            fechaLimiteLocal: fechaLimite.toLocaleDateString('es-CO'),
            totalEncontrados: planes.length,
            filtrados: filtrados,
            todas: planesFiltrados,
            // Información adicional para debugging
            diasRestantesEncontrados: [...new Set(planesFiltrados.map(p => p.diasRestantes))].sort((a, b) => a - b),
          };
        }
      } catch (error) {
        debugInfo.errores.push(`Error en planes de mejoramiento: ${error.message}`);
        this.logger.error(`Error en debug de planes: ${error.message}`);
      }

      // Debug de seguimientos trimestrales
      try {
        for (const dias of this.DIAS_ANTICIPACION) {
          const fechaLimite = new Date();
          fechaLimite.setDate(fechaLimite.getDate() + dias);
          fechaLimite.setHours(0, 0, 0, 0);

          let seguimientos: SeguimientoTrimestral[] = [];
          try {
            seguimientos = await this.seguimientoTrimestralRepository
              .createQueryBuilder('seguimiento')
              .leftJoinAndSelect('seguimiento.plan', 'plan')
              .where('seguimiento.fechaFin >= :fechaLimite', { fechaLimite })
              .andWhere('plan.estado = :estado', {
                estado: PlanMejoramientoEstado.EN_EJECUCION,
              })
              .getMany();
          } catch (error) {
            this.logger.warn(`Error en query de seguimientos: ${error.message}`);
            // Intentar sin join si falla
            seguimientos = await this.seguimientoTrimestralRepository.find({
              where: {
                fechaFin: MoreThanOrEqual(fechaLimite),
              },
            });
          }

          const seguimientosFiltrados = seguimientos
            .filter((seg) => seg.fechaFin && seg.plan) // Filtrar nulls
            .map((seg) => {
              try {
                // Crear fechas en UTC para evitar problemas de zona horaria
                const fechaFin = new Date(seg.fechaFin);
                const fechaFinUTC = new Date(Date.UTC(
                  fechaFin.getFullYear(),
                  fechaFin.getMonth(),
                  fechaFin.getDate()
                ));
                const hoyUTC = new Date(Date.UTC(
                  hoy.getFullYear(),
                  hoy.getMonth(),
                  hoy.getDate()
                ));
                
                // Calcular diferencia en días
                const diffMs = fechaFinUTC.getTime() - hoyUTC.getTime();
                const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
                
                return {
                  id: seg.id,
                  planId: seg.planId,
                  planCodigo: seg.plan?.codigo || 'N/A',
                  fechaFin: seg.fechaFin ? seg.fechaFin.toISOString() : null,
                  fechaFinLocal: fechaFin.toLocaleDateString('es-CO'),
                  diasRestantes: diffDias,
                  trimestre: seg.trimestre,
                  año: seg.año,
                };
              } catch (error) {
                this.logger.warn(`Error procesando seguimiento ${seg.id}: ${error.message}`);
                return null;
              }
            })
            .filter((s) => s !== null);

          const filtrados = seguimientosFiltrados.filter((s) => s.diasRestantes === dias);
          debugInfo.seguimientosTrimestrales[`${dias}_dias`] = {
            fechaLimite: fechaLimite.toISOString(),
            fechaLimiteLocal: fechaLimite.toLocaleDateString('es-CO'),
            totalEncontrados: seguimientos.length,
            filtrados: filtrados,
            todas: seguimientosFiltrados,
            // Información adicional para debugging
            diasRestantesEncontrados: seguimientosFiltrados.length > 0 
              ? [...new Set(seguimientosFiltrados.map(s => s.diasRestantes))].sort((a, b) => a - b)
              : [],
          };
        }
      } catch (error) {
        debugInfo.errores.push(`Error en seguimientos trimestrales: ${error.message}`);
        this.logger.error(`Error en debug de seguimientos: ${error.message}`);
      }

      return debugInfo;
    } catch (error) {
      this.logger.error(`Error en debugDatos: ${error.message}`, error.stack);
      return {
        error: true,
        message: error.message,
        stack: error.stack,
      };
    }
  }
}
