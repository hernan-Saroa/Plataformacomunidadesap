import { CanActivate, ConflictException, ExecutionContext, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

const ESCRITURAS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** `/procesos/:id` y todo lo que cuelga de él, con o sin prefijo global. */
const RUTA_DE_PROCESO = /\/procesos\/:id(\/|$)/;

/**
 * Lo que se puede tocar aunque el proceso esté detenido.
 *
 * Asignar o relevar al abogado, porque es él quien decide la revisión y un
 * proceso sin abogado tiene que poder recibirlo. Y archivar, porque el
 * expediente de un proceso cancelado también se archiva.
 */
const SE_PERMITEN = [/\/procesos\/:id\/participacion(\/|$)/, /\/procesos\/:id\/archivo-expediente(\/|$)/];

/**
 * Detiene el proceso mientras una revisión del PAA lo exige, y del todo si se
 * canceló.
 *
 * Va como guard global y no en cada servicio porque el proceso avanza por
 * cuarenta controladores: uno que se olvidara de preguntar dejaría avanzar un
 * proceso cuya línea ya no existe. Solo mira escrituras: consultar un proceso
 * detenido es justo lo que hace falta para decidir qué hacer con él.
 *
 * Bloquean la línea eliminada y el cambio de vigencia; la modificación no,
 * porque lo que cambió ya se aplicó o se listó, y el proceso puede seguir
 * mientras el abogado lo mira.
 */
@Injectable()
export class ProcesoSinBloqueoGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest();
    if (!ESCRITURAS.has(request.method)) return true;

    const ruta: string = request.route?.path ?? '';
    if (!RUTA_DE_PROCESO.test(ruta) || SE_PERMITEN.some((r) => r.test(ruta))) return true;

    const procesoId = request.params?.id;
    if (typeof procesoId !== 'string' || !/^[0-9a-f-]{36}$/i.test(procesoId)) return true;

    const [fila] = await this.dataSource.query(
      `SELECT p.estado,
              (SELECT r.codigo FROM hiring.paa_revisiones r
                WHERE r.proceso_id = p.id AND r.estado = 'PENDIENTE' AND r.bloquea
                ORDER BY r.created_at LIMIT 1) AS codigo,
              (SELECT r.tipo FROM hiring.paa_revisiones r
                WHERE r.proceso_id = p.id AND r.estado = 'PENDIENTE' AND r.bloquea
                ORDER BY r.created_at LIMIT 1) AS tipo
         FROM hiring.procesos p WHERE p.id = $1`,
      [procesoId],
    );
    if (!fila) return true;

    if (fila.estado === 'CANCELADO') {
      throw new ConflictException('El proceso se canceló por un cambio del PAA: ya no admite cambios.');
    }
    if (fila.codigo) {
      throw new ConflictException(
        fila.tipo === 'CAMBIO_VIGENCIA'
          ? 'El proceso está detenido por la evaluación del cambio de vigencia del PAA. Sigue cuando se decida si continúa, se devuelve, se migra o se cancela.'
          : `El proceso está detenido: la línea ${fila.codigo} ya no está en el PAA vigente. Sigue cuando se decida si continúa o se cancela.`,
      );
    }
    return true;
  }
}
