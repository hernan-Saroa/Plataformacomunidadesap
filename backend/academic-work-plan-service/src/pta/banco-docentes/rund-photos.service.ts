import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { validateProfilePhoto } from './rund-photo-validation';

const TABLE = 'academic_work_plan.rund_foto_perfil';
const metadata = 'id,persona_id,nombre,mime,ancho,alto,estado,origen,creado_por,creado_en,revisado_por,revisado_en,observacion';

@Injectable()
export class RundPhotosService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async ownPerson(user: any) {
    if (!user?.userId) throw new UnauthorizedException();
    const [row] = await this.db.query('SELECT id_person FROM auth."user" WHERE id_user::text=$1', [String(user.userId)]);
    if (!row?.id_person) throw new NotFoundException('No se encontró la persona de la sesión.');
    return String(row.id_person);
  }

  async status(person: string) {
    const rows = await this.db.query(`SELECT ${metadata} FROM ${TABLE} WHERE persona_id=$1
      AND (estado IN ('APROBADA','PENDIENTE') OR id IN
        (SELECT id FROM ${TABLE} WHERE persona_id=$1 ORDER BY creado_en DESC,id DESC LIMIT 50))
      ORDER BY creado_en DESC,id DESC`, [person]);
    return { personaId: person, publicada: rows.find((r: any) => r.estado === 'APROBADA') || null,
      solicitud: rows.find((r: any) => r.estado === 'PENDIENTE') || rows[0] || null, historial: rows };
  }

  async published(person: string) {
    const [row] = await this.db.query(`SELECT id,mime,contenido FROM ${TABLE} WHERE persona_id=$1 AND estado='APROBADA'`, [person]);
    return { id: row?.id || null, url: row ? `data:${row.mime};base64,${row.contenido.toString('base64')}` : null };
  }

  async preview(person: string, id: string) {
    const [row] = await this.db.query(`SELECT mime,contenido FROM ${TABLE} WHERE persona_id=$1 AND id=$2`, [person,id]);
    if (!row) throw new NotFoundException('Foto no encontrada.');
    return { url: `data:${row.mime};base64,${row.contenido.toString('base64')}` };
  }

  async upload(person: string, file: Express.Multer.File | undefined, actor: string, origin: 'PTA'|'RUND'|'MASIVA') {
    const info = validateProfilePhoto(file);
    await this.db.transaction(async tx => {
      // Lock the identity so simultaneous uploads/decisions cannot overwrite one
      // another or publish a version which the reviewer has not seen.
      const rows = await tx.query('SELECT id_person FROM auth.personas WHERE id_person=$1 FOR UPDATE', [person]);
      if (!rows.length) throw new NotFoundException('Persona no encontrada.');
      await tx.query(`UPDATE ${TABLE} SET estado='REEMPLAZADA' WHERE persona_id=$1 AND estado='PENDIENTE'`, [person]);
      await tx.query(`INSERT INTO ${TABLE}(persona_id,contenido,mime,nombre,ancho,alto,origen,creado_por)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [person,file!.buffer,info.mime,file!.originalname.slice(0,255),info.width,info.height,origin,actor]);
    });
    return this.status(person);
  }

  async decide(person: string, id: string, decision: string, observation: unknown, actor: string) {
    if (!['APROBADA','RECHAZADA'].includes(decision)) throw new BadRequestException('Seleccione aprobar o rechazar.');
    const note = typeof observation === 'string' ? observation.trim() : '';
    if (note.length > 1000 || (decision === 'RECHAZADA' && note.length < 5))
      throw new BadRequestException('Para rechazar, escriba una observación de 5 a 1000 caracteres.');
    await this.db.transaction(async tx => {
      await tx.query('SELECT id_person FROM auth.personas WHERE id_person=$1 FOR UPDATE', [person]);
      const [photo] = await tx.query(`SELECT id FROM ${TABLE} WHERE persona_id=$1 AND id=$2 AND estado='PENDIENTE'`, [person,id]);
      if (!photo) throw new ConflictException('Esta foto ya fue revisada o reemplazada. Actualice antes de continuar.');
      if (decision === 'APROBADA') await tx.query(`UPDATE ${TABLE} SET estado='ARCHIVADA' WHERE persona_id=$1 AND estado='APROBADA'`, [person]);
      await tx.query(`UPDATE ${TABLE} SET estado=$3,revisado_por=$4,revisado_en=now(),observacion=$5 WHERE persona_id=$1 AND id=$2`, [person,id,decision,actor,note || null]);
    });
    return this.status(person);
  }

  async pending(page: number) {
    const [count] = await this.db.query(`SELECT count(*)::int total FROM ${TABLE} WHERE estado='PENDIENTE'`);
    const items = await this.db.query(`SELECT f.id,f.persona_id,f.nombre,f.origen,f.creado_en,p.nom_largo AS nombre_persona
      FROM ${TABLE} f JOIN auth.personas p ON p.id_person=f.persona_id WHERE f.estado='PENDIENTE'
      ORDER BY f.creado_en,f.id LIMIT 20 OFFSET $1`, [(page-1)*20]);
    return { items, total: count.total, page };
  }

  async bulkPerson(document: string) {
    const rows = await this.db.query(`SELECT DISTINCT p.id_person FROM auth.personas p
      JOIN academic_work_plan."Docente" d ON d."personaId"::text=p.id_person::text
      WHERE p.num_identificacion=$1 AND COALESCE(d."eliminadoRund",false)=false`, [document]);
    if (rows.length !== 1) throw new BadRequestException('El nombre del archivo debe coincidir con el documento de un único docente registrado en RUND.');
    return String(rows[0].id_person);
  }
}
