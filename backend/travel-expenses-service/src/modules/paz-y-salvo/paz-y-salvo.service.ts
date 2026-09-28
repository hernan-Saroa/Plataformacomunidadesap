import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, writeFile, unlink } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { getUploadRootDir } from '../../common/storage.util';
import { PendientesService } from '../legalizacion/pendientes.service';
import { FirmaOtpClient, CredencialesFirma } from './firma-otp.client';
import { ContenidoPazYSalvo, PazYSalvo } from './paz-y-salvo.model';
import { PazYSalvoPdfService } from './paz-y-salvo-pdf.service';

export interface UsuarioFirma { userId: string; username?: string }
export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

@Injectable()
export class PazYSalvoService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly pendientes: PendientesService,
    private readonly otp: FirmaOtpClient,
    private readonly pdf: PazYSalvoPdfService,
  ) {}

  buscarPersonas(texto: string) {
    if (texto.trim().length < 2) return [];
    return this.db.query(`SELECT id, numero_documento AS documento,
      concat_ws(' ', primer_nombre, segundo_nombre, primer_apellido, segundo_apellido) AS nombre
      FROM travel_expenses.comisionados WHERE numero_documento ILIKE $1 OR
      concat_ws(' ', primer_nombre, segundo_nombre, primer_apellido, segundo_apellido) ILIKE $1
      ORDER BY primer_nombre, id LIMIT 30`, [`%${texto.trim().slice(0, 100)}%`]);
  }

  async consultarPersona(id: string, usuario: UsuarioFirma) {
    await this.persona(this.db.manager, id);
    const pendientes = await this.pendientes.tieneLegalizacionesPendientes(id);
    const documentos: PazYSalvo[] = await this.db.query(
      'SELECT * FROM travel_expenses.paz_y_salvos WHERE comisionado_id = $1 ORDER BY creado_en DESC', [id]);
    // La consulta de documentos también deja traza en el servidor.
    await this.db.transaction(async m => {
      for (const doc of documentos) await this.evento(m, doc.id, usuario.userId, 'CONSULTADO');
    });
    return { ...pendientes, documentos };
  }

  async solicitar(comisionadoId: string, usuario: UsuarioFirma) {
    return this.db.transaction(async m => {
      const persona = await this.persona(m, comisionadoId);
      await this.sinPendientes(m, comisionadoId);
      const id = randomUUID();
      const contenido: ContenidoPazYSalvo = {
        id, comisionadoId, nombre: persona.nombre, documento: persona.documento,
        coordinadoraId: usuario.userId, coordinadoraNombre: usuario.username || usuario.userId,
        solicitadoEn: new Date().toISOString(),
      };
      const [doc] = await m.query(`INSERT INTO travel_expenses.paz_y_salvos
        (id, comisionado_id, solicitado_por_id, contenido, contenido_sha256)
        VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [id, comisionadoId, usuario.userId, contenido, sha256(JSON.stringify(contenido))]);
      await this.evento(m, id, usuario.userId, 'SOLICITADO');
      return doc as PazYSalvo;
    });
  }

  async solicitarOtp(id: string, usuario: UsuarioFirma, credenciales: CredencialesFirma) {
    const doc = await this.documento(this.db.manager, id);
    this.puedeFirmar(doc, usuario);
    await this.sinPendientes(this.db.manager, doc.comisionado_id);
    const result = await this.otp.solicitar(this.contexto(doc), credenciales);
    await this.evento(this.db.manager, id, usuario.userId, 'OTP_SOLICITADO');
    return result;
  }

  async firmar(id: string, code: string, usuario: UsuarioFirma, credenciales: CredencialesFirma) {
    const doc = await this.documento(this.db.manager, id);
    this.puedeFirmar(doc, usuario);
    await this.sinPendientes(this.db.manager, doc.comisionado_id);
    // Verificación servidor a servidor: nunca se acepta evidencia enviada por el navegador.
    const firma = await this.otp.verificar(this.contexto(doc), code, credenciales);
    const bytes = await this.pdf.generar(doc.contenido, firma, doc.contenido_sha256);
    const archivoHash = sha256(bytes);
    const path = this.archivo(id, archivoHash);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes, { flag: 'wx' });
    try {
      return await this.db.transaction(async m => {
        await m.query("SET LOCAL lock_timeout = '5s'");
        const actual = await this.documento(m, id, true);
        this.puedeFirmar(actual, usuario);
        // Bloqueo breve exclusivamente durante consulta y commit, sin red ni generación PDF.
        // Impide que se pague/inserte una comisión entre la comprobación y la emisión.
        await m.query('LOCK TABLE travel_expenses.solicitudes_comision, travel_expenses.config_legalizacion IN SHARE MODE');
        await this.sinPendientes(m, actual.comisionado_id);
        const [filas] = await m.query(`UPDATE travel_expenses.paz_y_salvos
          SET firma=$2, firmado_en=$3, archivo_sha256=$4 WHERE id=$1 RETURNING *`,
          [id, firma, firma.fechaFirma, archivoHash]);
        await this.evento(m, id, usuario.userId, 'FIRMA_VERIFICADA', {
          evidencia: firma.id, metodo: firma.metodo, context: firma.context,
          verificadoEn: firma.fechaFirma, archivoSha256: archivoHash,
        });
        return filas[0] as PazYSalvo;
      });
    } catch (error) {
      await unlink(path).catch(() => undefined);
      throw error;
    }
  }

  async detalle(id: string, usuario: UsuarioFirma) {
    const doc = await this.documento(this.db.manager, id);
    await this.evento(this.db.manager, id, usuario.userId, 'CONSULTADO');
    const eventos = await this.db.query('SELECT * FROM travel_expenses.paz_y_salvo_eventos WHERE paz_y_salvo_id=$1 ORDER BY id', [id]);
    return { ...doc, eventos };
  }

  async descargar(id: string, usuario: UsuarioFirma): Promise<Buffer> {
    const doc = await this.documento(this.db.manager, id);
    if (!doc.firmado_en || !doc.archivo_sha256) throw new ConflictException('El documento aún no está firmado');
    let bytes: Buffer;
    try { bytes = await readFile(this.archivo(id, doc.archivo_sha256)); }
    catch { throw new ServiceUnavailableException('El archivo no está disponible'); }
    if (sha256(bytes) !== doc.archivo_sha256) throw new ServiceUnavailableException('No fue posible comprobar la integridad del documento');
    await this.evento(this.db.manager, id, usuario.userId, 'DESCARGADO', { archivoSha256: doc.archivo_sha256 });
    return bytes;
  }

  private archivo(id: string, hash: string) {
    const root = getUploadRootDir();
    // Fuera del directorio /uploads servido públicamente por main.ts.
    return join(dirname(root), `${basename(root)}-private`, 'paz-y-salvo', `${id}-${hash}.pdf`);
  }

  private contexto(doc: PazYSalvo) { return `paz-y-salvo:${doc.id}:${doc.contenido_sha256}`; }

  private puedeFirmar(doc: PazYSalvo, usuario: UsuarioFirma) {
    if (doc.solicitado_por_id !== usuario.userId) throw new ForbiddenException('Solo quien solicitó el documento puede firmarlo');
    if (doc.firmado_en) throw new ConflictException('El documento ya fue firmado');
  }

  private async persona(m: EntityManager, id: string) {
    const [persona] = await m.query(`SELECT numero_documento AS documento,
      concat_ws(' ', primer_nombre, segundo_nombre, primer_apellido, segundo_apellido) AS nombre
      FROM travel_expenses.comisionados WHERE id=$1`, [id]);
    if (!persona) throw new NotFoundException('Comisionado no encontrado');
    return persona;
  }

  private async documento(m: EntityManager, id: string, lock = false): Promise<PazYSalvo> {
    const [doc] = await m.query(`SELECT * FROM travel_expenses.paz_y_salvos WHERE id=$1${lock ? ' FOR UPDATE' : ''}`, [id]);
    if (!doc) throw new NotFoundException('Paz y salvo no encontrado');
    return doc;
  }

  private async sinPendientes(m: EntityManager, id: string) {
    const result = await this.pendientes.consultar(m, id);
    if (result.pendiente) throw new ConflictException({ message: 'El comisionado tiene legalizaciones pendientes', ...result });
  }

  private evento(m: EntityManager, id: string, usuarioId: string, accion: string, detalle: object = {}) {
    return m.query(`INSERT INTO travel_expenses.paz_y_salvo_eventos
      (paz_y_salvo_id, usuario_id, accion, detalle) VALUES ($1,$2,$3,$4)`, [id, usuarioId, accion, detalle]);
  }
}
