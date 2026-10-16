import { BadRequestException, ConflictException, Injectable, Module, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { identityWriteFingerprint } from './auth-identity-command';
import { AuthIdentityOperation, AuthIdentityOperationClient, AuthIdentityOperationModule } from './auth-identity-operation.client';

export interface IdentityCoordination {
  intencionId: string;
  operacionAuthId: string;
  version: 1;
  huellaComando: string;
  estado: 'PREPARADA' | 'AUTH_REGISTRADA' | 'AUTH_APLICADA' | 'CANCELADA';
  preparadaEn: string;
  reciboAuth: AuthIdentityOperation | null;
}

/** Registro preparatorio: no aplica/compensa identidad, ni confirma el commit nativo. */
@Injectable()
export class AuthIdentityCoordinationService {
  constructor(private readonly db: DataSource, private readonly auth: AuthIdentityOperationClient) {}

  private id(value: unknown): string {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value))
      throw new BadRequestException('Intencion de identidad invalida.');
    return value.toLowerCase();
  }

  private dto(row: any): IdentityCoordination {
    return { intencionId: row.intencion_id, operacionAuthId: row.operacion_auth_id, version: row.version,
      huellaComando: row.huella_comando, estado: row.estado, preparadaEn: new Date(row.preparada_en).toISOString(), reciboAuth: row.recibo_auth };
  }

  async consultar(value: string): Promise<IdentityCoordination> {
    const [row] = await this.db.query('SELECT * FROM rund.identidad_operacion WHERE intencion_id=$1', [this.id(value)]);
    if (!row) throw new NotFoundException('Intencion de identidad no registrada en RUND.');
    return this.dto(row);
  }

  /** intencionId procede del proceso servidor, estable por operacion de negocio, nunca por documento o fila XLSX. */
  async preparar(value: string, comando: unknown): Promise<IdentityCoordination> {
    const intencionId = this.id(value);
    let huella: string;
    try { huella = identityWriteFingerprint(comando); }
    catch { throw new BadRequestException('Comando de identidad incompatible.'); }
    // Autocommit previo a cualquier HTTP: un rollback posterior de negocio no debe borrar la intencion.
    const [inserted] = await this.db.query(`INSERT INTO rund.identidad_operacion
      (intencion_id,operacion_auth_id,version,huella_comando) VALUES ($1,$2,1,$3)
      ON CONFLICT (intencion_id) DO NOTHING RETURNING *`, [intencionId, randomUUID(), huella]);
    const result = inserted ? this.dto(inserted) : await this.consultar(intencionId);
    if (result.huellaComando !== huella) throw new ConflictException('La intencion corresponde a otro comando de identidad.');
    return result;
  }

  async registrarEnAuth(value: string): Promise<IdentityCoordination> {
    const local = await this.consultar(value);
    const recibo = await this.auth.registrar(local.operacionAuthId, local.huellaComando);
    return this.guardarRecibo(local.intencionId, recibo);
  }

  /** Consulta al propietario sin registrar, aplicar o cancelar automaticamente una solicitud en vuelo. */
  async reconciliar(value: string): Promise<{ coordinacion: IdentityCoordination; consultaAuth: 'NO_ENCONTRADA' | 'CONFIRMADA' }> {
    const local = await this.consultar(value);
    const recibo = await this.auth.consultar(local.operacionAuthId);
    if (recibo === null) {
      if (local.estado !== 'PREPARADA') throw new ServiceUnavailableException('Auth no confirma un recibo previamente conocido.');
      // Otra solicitud puede haber avanzado mientras el GET observaba ausencia.
      const actual = await this.consultar(local.intencionId);
      if (actual.estado !== 'PREPARADA') throw new ServiceUnavailableException('La consulta de ausencia quedo desactualizada.');
      return { coordinacion: actual, consultaAuth: 'NO_ENCONTRADA' };
    }
    return { coordinacion: await this.guardarRecibo(local.intencionId, recibo), consultaAuth: 'CONFIRMADA' };
  }

  private async guardarRecibo(intencionId: string, recibo: AuthIdentityOperation): Promise<IdentityCoordination> {
    // HTTP ya termino: solo se mantienen bloqueos locales durante la persistencia.
    return this.db.transaction(async manager => {
      await manager.query("SET LOCAL lock_timeout='5s'");
      const [actual] = await manager.query(`SELECT *,recibo_auth=$2::jsonb AS recibo_igual
        FROM rund.identidad_operacion WHERE intencion_id=$1 FOR UPDATE`, [intencionId, JSON.stringify(recibo)]);
      if (!actual) throw new NotFoundException('Intencion de identidad no registrada en RUND.');
      if (recibo.operacionId !== actual.operacion_auth_id || recibo.huellaComando !== actual.huella_comando)
        throw new ConflictException('El recibo Auth no corresponde a la intencion.');
      if (actual.recibo_auth && (actual.recibo_auth.version !== recibo.version
        || Date.parse(actual.recibo_auth.registradaEn) !== Date.parse(recibo.registradaEn)))
        throw new ServiceUnavailableException('Auth cambio los metadatos del recibo previamente confirmado.');
      const estado = { REGISTRADA: 'AUTH_REGISTRADA', APLICADA: 'AUTH_APLICADA', CANCELADA: 'CANCELADA' }[recibo.estado];
      if (!estado) throw new ServiceUnavailableException('Estado Auth incompatible.');
      if (actual.recibo_igual) return this.dto(actual);
      if (actual.estado !== 'PREPARADA') {
        // Una respuesta REGISTRADA iniciada antes puede llegar despues de APLICADA/CANCELADA.
        if (recibo.estado === 'REGISTRADA' && actual.estado !== 'AUTH_REGISTRADA') return this.dto(actual);
        if (actual.estado !== 'AUTH_REGISTRADA' || estado === actual.estado)
          throw new ServiceUnavailableException('El recibo Auth contradice el estado confirmado.');
      }
      const [updated] = await manager.query(`WITH confirmada AS (UPDATE rund.identidad_operacion SET estado=$2,recibo_auth=$3::jsonb
        WHERE intencion_id=$1 RETURNING *) SELECT * FROM confirmada`, [intencionId, estado, JSON.stringify(recibo)]);
      if (!updated) throw new ServiceUnavailableException('RUND no confirmo la persistencia del recibo Auth.');
      return this.dto(updated);
    });
  }
}

// Sin imports desde AppModule o modulos activos hasta cerrar la coordinacion nativa.
@Module({ imports: [AuthIdentityOperationModule], providers: [AuthIdentityCoordinationService], exports: [AuthIdentityCoordinationService] })
export class AuthIdentityCoordinationModule {}
