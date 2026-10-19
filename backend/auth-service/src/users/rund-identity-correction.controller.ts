import { BadRequestException, Body, ConflictException, Controller, Get, Header, HttpCode, Injectable, NotFoundException, Param, Post, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';
import { RundIdentityGuard } from './rund-identity.controller';

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && !v.includes('\0') && v.length <= max;

/** Campos de identidad que el RUND puede corregir tras confirmar una sugerencia OCR, y su columna en auth.personas. */
const CAMPOS: Record<string, { column: string; cast: string; read: string }> = {
  documentNumber: { column: 'num_identificacion', cast: '', read: 'p.num_identificacion::text' },
  documentType: { column: 'tip_identificacion', cast: '', read: 'p.tip_identificacion::text' },
  nombreCompleto: { column: 'nom_largo', cast: '', read: 'p.nom_largo::text' },
  genero: { column: 'gen_tercero', cast: '', read: 'p.gen_tercero::text' },
  fechaNacimiento: { column: 'fec_nacimiento', cast: '::date', read: 'p.fec_nacimiento::text' },
};
const TIPOS_DOCUMENTO = ['CC', 'CE', 'PA', 'PEP'];

export interface CorreccionIdentidad {
  version: 1; operacionId: string; personaId: string; campo: string;
  valorPrevio: string | null; valorNuevo: string; actorId: string; sugerenciaId: string | null;
}

/** Orden explícito: la huella debe ser idéntica en el consumidor y el propietario. */
export function correccionIdentidad(raw: unknown): CorreccionIdentidad {
  const keys = ['version', 'operacionId', 'personaId', 'campo', 'valorPrevio', 'valorNuevo', 'actorId', 'sugerenciaId'];
  if (!record(raw) || Object.keys(raw).length !== keys.length || !keys.every(k => Object.prototype.hasOwnProperty.call(raw, k)) || raw.version !== 1
    || typeof raw.operacionId !== 'string' || !UUID.test(raw.operacionId) || typeof raw.personaId !== 'string' || !UUID.test(raw.personaId)
    || typeof raw.campo !== 'string' || !Object.prototype.hasOwnProperty.call(CAMPOS, raw.campo)
    || !(raw.valorPrevio === null || text(raw.valorPrevio, 300)) || !text(raw.valorNuevo, 300) || !raw.valorNuevo.trim()
    || !text(raw.actorId, 200) || !raw.actorId.trim() || !(raw.sugerenciaId === null || (text(raw.sugerenciaId, 64) && raw.sugerenciaId.length > 0))) {
    throw new BadRequestException('Corrección de identidad inválida.');
  }
  const valor = raw.valorNuevo;
  if (raw.campo === 'documentType' && !TIPOS_DOCUMENTO.includes(valor)) throw new BadRequestException('Tipo de documento inválido.');
  if (raw.campo === 'genero' && !['F', 'M'].includes(valor)) throw new BadRequestException('Género inválido.');
  if (raw.campo === 'documentNumber' && !/^[A-Z0-9]{1,30}$/.test(valor)) throw new BadRequestException('Número de documento inválido.');
  if (raw.campo === 'fechaNacimiento' && !(/^\d{4}-\d\d-\d\d$/.test(valor) && new Date(valor).toISOString().slice(0, 10) === valor)) {
    throw new BadRequestException('Fecha de nacimiento inválida.');
  }
  return { version: 1, operacionId: raw.operacionId.toLowerCase(), personaId: raw.personaId.toLowerCase(), campo: raw.campo,
    valorPrevio: raw.valorPrevio as string | null, valorNuevo: valor, actorId: raw.actorId, sugerenciaId: raw.sugerenciaId as string | null };
}
export const huellaCorreccion = (c: CorreccionIdentidad) => createHash('sha256').update(JSON.stringify(c)).digest('hex');

const PROJECTION = `operacion_id AS "operacionId", persona_id AS "personaId", campo, valor_previo AS "valorPrevio", valor_nuevo AS "valorNuevo",
  huella, estado, aplicada_en AS "aplicadaEn", compensada_en AS "compensadaEn"`;

/**
 * Auth es dueño de auth.personas: aplica o restaura una corrección de identidad pedida por RUND.
 * - Idempotente por operacionId (+ huella); un mismo ID con otro contenido es un conflicto.
 * - Compare-and-set: solo cambia si el valor actual es exactamente el que RUND vio.
 * - Registra la corrección en una tabla propia, que es lo que autoriza al trigger de la cédula (migración 672).
 */
@Injectable()
export class RundIdentityCorrectionService {
  constructor(private readonly db: DataSource) {}

  private unavailable(error: any): never {
    if (error?.code === '42P01' || error?.code === '42883' || (error?.code === 'P0001' && String(error?.message).includes('REQ-RUND-F001'))) {
      throw new ServiceUnavailableException('Auth requiere aplicar la migración 672 para corregir la identidad.');
    }
    throw error;
  }

  async consultar(operacionId: string) {
    if (!UUID.test(operacionId)) throw new BadRequestException('ID de operación inválido.');
    try {
      const [row] = await this.db.query(`SELECT ${PROJECTION} FROM auth.rund_identidad_correccion WHERE operacion_id=$1`, [operacionId.toLowerCase()]);
      return { consulta: { operacionId: operacionId.toLowerCase() }, encontrada: !!row, correccion: row || null };
    } catch (error) { return this.unavailable(error); }
  }

  async aplicar(raw: unknown) {
    const command = correccionIdentidad(raw), huella = huellaCorreccion(command), def = CAMPOS[command.campo];
    try {
      return await this.db.transaction(async manager => {
        // Se bloquea la persona antes de leer el registro: dos solicitudes con el mismo ID se serializan.
        const [persona] = await manager.query(`SELECT ${def.read} AS valor FROM auth.personas p WHERE p.id_person=$1 FOR UPDATE`, [command.personaId]);
        if (!persona) throw new NotFoundException('Persona no encontrada.');
        const [existing] = await manager.query(`SELECT ${PROJECTION} FROM auth.rund_identidad_correccion WHERE operacion_id=$1`, [command.operacionId]);
        if (existing) {
          if (existing.huella !== huella) throw new ConflictException({ message: 'El ID de operación ya corresponde a otra corrección.', error: 'OPERACION_DISTINTA' });
          return { correccion: existing };
        }
        if ((persona.valor ?? null) !== command.valorPrevio) {
          throw new ConflictException({ message: 'El dato de la persona cambió desde que se leyó.', error: 'VALOR_PREVIO_CAMBIO' });
        }
        if (command.campo === 'documentNumber') {
          // Misma llave de exclusión que usaba RUND, para no asignar a la vez el mismo número desde dos servicios.
          await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`rund-document-number:${command.valorNuevo}`]);
          const duplicate = await manager.query(`SELECT 1 FROM auth.personas p
            WHERE regexp_replace(UPPER(COALESCE(p.num_identificacion,'')),'[^A-Z0-9]','','g')=$1 AND p.id_person<>$2::uuid LIMIT 1`, [command.valorNuevo, command.personaId]);
          if (duplicate.length) throw new ConflictException({ message: 'El número de documento ya está asociado a otra persona.', error: 'DOCUMENTO_DUPLICADO' });
        }
        const [inserted] = await manager.query(`INSERT INTO auth.rund_identidad_correccion
          (operacion_id,persona_id,campo,valor_previo,valor_nuevo,huella,actor_id,sugerencia_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          RETURNING ${PROJECTION}`, [command.operacionId, command.personaId, command.campo, command.valorPrevio, command.valorNuevo, huella, command.actorId, command.sugerenciaId]);
        await manager.query(`SELECT set_config('app.rund_identity_correction_id',$1,true)`, [command.operacionId]);
        try {
          await manager.query(`UPDATE auth.personas SET ${def.column}=$2${def.cast}, fec_modificacion=CURRENT_DATE WHERE id_person=$1`, [command.personaId, command.valorNuevo]);
        } catch (error: any) {
          if (error?.code === '23505') throw new ConflictException({ message: 'El número de documento ya está asociado a otra persona.', error: 'DOCUMENTO_DUPLICADO' });
          throw error;
        }
        return { correccion: inserted };
      });
    } catch (error) { return this.unavailable(error); }
  }

  async compensar(operacionId: string, raw: unknown) {
    if (!UUID.test(operacionId)) throw new BadRequestException('ID de operación inválido.');
    if (!record(raw) || Object.keys(raw).length !== 1 || typeof raw.huella !== 'string' || !/^[a-f0-9]{64}$/.test(raw.huella)) {
      throw new BadRequestException('Compensación inválida.');
    }
    const id = operacionId.toLowerCase();
    try {
      return await this.db.transaction(async manager => {
        const [row] = await manager.query(`SELECT ${PROJECTION} FROM auth.rund_identidad_correccion WHERE operacion_id=$1 FOR UPDATE`, [id]);
        if (!row) throw new NotFoundException('Corrección no registrada.');
        if (row.huella !== raw.huella) throw new ConflictException({ message: 'La huella no corresponde a la corrección.', error: 'OPERACION_DISTINTA' });
        if (row.estado === 'COMPENSADA') return { correccion: row };
        const def = CAMPOS[row.campo];
        const [persona] = await manager.query(`SELECT ${def.read} AS valor FROM auth.personas p WHERE p.id_person=$1 FOR UPDATE`, [row.personaId]);
        if (!persona) throw new NotFoundException('Persona no encontrada.');
        if ((persona.valor ?? null) === row.valorNuevo) {
          await manager.query(`SELECT set_config('app.rund_identity_correction_id',$1,true)`, [id]);
          await manager.query(`UPDATE auth.personas SET ${def.column}=$2${def.cast}, fec_modificacion=CURRENT_DATE WHERE id_person=$1`, [row.personaId, row.valorPrevio]);
        } else if ((persona.valor ?? null) !== (row.valorPrevio ?? null)) {
          // El valor ya cambió por otra vía: no se pisa; requiere revisión humana.
          throw new ConflictException({ message: 'La persona tiene cambios posteriores a la corrección.', error: 'CAMBIOS_POSTERIORES' });
        }
        // TypeORM devuelve [filas, cantidad] para UPDATE aunque tenga RETURNING: se vuelve a leer la fila ya actualizada.
        await manager.query(`UPDATE auth.rund_identidad_correccion SET estado='COMPENSADA', compensada_en=clock_timestamp() WHERE operacion_id=$1`, [id]);
        const [updated] = await manager.query(`SELECT ${PROJECTION} FROM auth.rund_identidad_correccion WHERE operacion_id=$1`, [id]);
        return { correccion: updated };
      });
    } catch (error) { return this.unavailable(error); }
  }
}

@Public()
@UseGuards(RundIdentityGuard)
@Controller('internal/rund/v1/personas/correcciones')
export class RundIdentityCorrectionController {
  constructor(private readonly corrections: RundIdentityCorrectionService) {}

  @Post() @HttpCode(200) @Header('Cache-Control', 'private, no-store')
  aplicar(@Body() body: unknown) { return this.corrections.aplicar(body); }

  @Get(':operacionId') @Header('Cache-Control', 'private, no-store')
  consultar(@Param('operacionId') operacionId: string) { return this.corrections.consultar(operacionId); }

  @Post(':operacionId/compensar') @HttpCode(200) @Header('Cache-Control', 'private, no-store')
  compensar(@Param('operacionId') operacionId: string, @Body() body: unknown) { return this.corrections.compensar(operacionId, body); }
}
