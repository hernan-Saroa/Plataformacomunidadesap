import { BadRequestException, Body, ConflictException, Controller, Get, Header, HttpCode, Injectable, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';
import { RundIdentityGuard } from './rund-identity.controller';

const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const fingerprint = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const projection = `operacion_id AS "operacionId",version,huella_comando AS "huellaComando",estado,
  registrada_en AS "registradaEn",cancelada_en AS "canceladaEn"`;

@Injectable()
export class RundIdentityOperationService {
  constructor(private readonly db: DataSource) {}

  private async recibo(row: any) {
    if (row.estado !== 'APLICADA') return { ...row, identidadAplicada: false };
    const [applied] = await this.db.query('SELECT resultado,aplicada_en AS "aplicadaEn" FROM auth.rund_identidad_operacion WHERE operacion_id=$1 AND estado=\'APLICADA\'', [row.operacionId]);
    if (!applied?.resultado || !applied.aplicadaEn) throw new Error('Recibo aplicado incompleto.');
    return { ...row, ...applied, identidadAplicada: true };
  }

  private id(value: unknown): string {
    if (!uuid(value)) throw new BadRequestException('ID de operación inválido.');
    return value.toLowerCase();
  }

  async consultar(value: unknown) {
    const operacionId = this.id(value);
    const [row] = await this.db.query(`SELECT ${projection} FROM auth.rund_identidad_operacion WHERE operacion_id=$1`, [operacionId]);
    return { consulta: { operacionId }, encontrada: !!row, operacion: row ? await this.recibo(row) : null };
  }

  async registrar(raw: unknown) {
    if (!record(raw) || Object.keys(raw).length !== 3 || raw.version !== 1 || !uuid(raw.operacionId) || !fingerprint(raw.huellaComando)) {
      throw new BadRequestException('Registro de operación inválido.');
    }
    const operacionId = this.id(raw.operacionId), huellaComando = raw.huellaComando;
    // DO NOTHING evita mutar fechas/estados del recibo anterior, incluso bajo concurrencia.
    const [inserted] = await this.db.query(`INSERT INTO auth.rund_identidad_operacion (operacion_id,version,huella_comando)
      VALUES ($1,1,$2) ON CONFLICT (operacion_id) DO NOTHING RETURNING ${projection}`, [operacionId, huellaComando]);
    const row = inserted || (await this.consultar(operacionId)).operacion;
    if (!row) throw new Error('Auth no confirmó el registro de la operación.');
    if (row.huellaComando !== huellaComando) throw new ConflictException('El ID de operación ya corresponde a otro comando.');
    return { operacion: row.estado === 'APLICADA' ? row : { ...row, identidadAplicada: false } };
  }

  async cancelar(value: unknown, raw: unknown) {
    const operacionId = this.id(value);
    if (!record(raw) || Object.keys(raw).length !== 1 || !fingerprint(raw.huellaComando)) throw new BadRequestException('Cancelación de operación inválida.');
    const [updated] = await this.db.query(`WITH cancelada AS (UPDATE auth.rund_identidad_operacion SET estado='CANCELADA',cancelada_en=CURRENT_TIMESTAMP
      WHERE operacion_id=$1 AND huella_comando=$2 AND estado='REGISTRADA' RETURNING ${projection}) SELECT * FROM cancelada`, [operacionId, raw.huellaComando]);
    const row = updated || (await this.consultar(operacionId)).operacion;
    if (!row) throw new NotFoundException('Operación no registrada.');
    if (row.huellaComando !== raw.huellaComando) throw new ConflictException('La huella no corresponde a la operación.');
    if (row.estado === 'APLICADA') throw new ConflictException('Una identidad aplicada no se cancela como intención.');
    if (row.estado !== 'CANCELADA') throw new Error('Auth no confirmó la cancelación.');
    return { operacion: { ...row, identidadAplicada: false } };
  }
}

@Public()
@UseGuards(RundIdentityGuard)
@Controller('internal/rund/v1/personas/escritura/operaciones')
export class RundIdentityOperationController {
  constructor(private readonly operations: RundIdentityOperationService) {}

  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  registrar(@Body() raw: unknown) { return this.operations.registrar(raw); }

  @Get(':operacionId')
  @Header('Cache-Control', 'private, no-store')
  consultar(@Param('operacionId') id: string) { return this.operations.consultar(id); }

  @Post(':operacionId/cancelar')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  cancelar(@Param('operacionId') id: string, @Body() raw: unknown) { return this.operations.cancelar(id, raw); }
}
