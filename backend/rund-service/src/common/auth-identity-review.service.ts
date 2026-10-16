import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const projection=`c.caso_id,c.intencion_id,c.estado,c.asumida_por,
  to_char(c.creada_en AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS creada_en,
  to_char(c.asumida_en AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS asumida_en,
  r.operacion_auth_id,r.huella_comando,r.huella_contexto,r.motivo`;

/** Gestion de casos propios: nunca restaura identidad, confirma perfil o cierra la revision. */
@Injectable()
export class AuthIdentityReviewService {
  constructor(private readonly db:DataSource) {}
  private id(value:unknown) {if(!uuid(value))throw new BadRequestException('Identificador de revision invalido.');return value.toLowerCase();}
  private dto(row:any) {
    return {casoId:row.caso_id,intencionId:row.intencion_id,operacionAuthId:row.operacion_auth_id,huellaComando:row.huella_comando,
      huellaContexto:row.huella_contexto,motivo:row.motivo,estado:row.estado,creadaEn:row.creada_en,
      asumidaPor:row.asumida_por,asumidaEn:row.asumida_en};
  }
  async consultar(value:string) {
    const [row]=await this.db.query(`SELECT ${projection} FROM rund.identidad_revision c
      JOIN rund.identidad_resolucion_auth r USING (intencion_id) WHERE c.caso_id=$1`,[this.id(value)]);
    if(!row)throw new NotFoundException('Caso de revision no registrado.');return this.dto(row);
  }
  async listar(raw:unknown={}) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['limite','cursor','estado'].includes(k)))
      throw new BadRequestException('Consulta de revisiones invalida.');
    const query=raw as Record<string,unknown>,state=query.estado??null;
    if(state!==null&&!['PENDIENTE','EN_REVISION'].includes(state as string))throw new BadRequestException('Estado de revision invalido.');
    const limit=query.limite===undefined?25:typeof query.limite==='string'&&/^[1-9]\d{0,2}$/.test(query.limite)?Number(query.limite):NaN;
    if(!Number.isInteger(limit)||limit<1||limit>100)throw new BadRequestException('Limite de revisiones invalido.');
    let date:string|null=null,caseId:string|null=null;
    if(query.cursor!==undefined) {
      try {
        if(typeof query.cursor!=='string'||query.cursor.length>512||!/^[-\w]+$/.test(query.cursor))throw new Error();
        const cursor=JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8'));
        if(!cursor||Array.isArray(cursor)||Object.keys(cursor).length!==4||cursor.version!==1||!uuid(cursor.casoId)
          ||cursor.estado!==state||typeof cursor.creadaEn!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(cursor.creadaEn)
          ||!Number.isFinite(Date.parse(cursor.creadaEn))||new Date(cursor.creadaEn).toISOString()!==cursor.creadaEn.replace(/(\.\d{3})\d{3}Z$/,'$1Z'))throw new Error();
        date=cursor.creadaEn;caseId=cursor.casoId.toLowerCase();
      }catch {throw new BadRequestException('Cursor de revisiones invalido.');}
    }
    const rows=await this.db.query(`SELECT ${projection} FROM rund.identidad_revision c
      JOIN rund.identidad_resolucion_auth r USING (intencion_id)
      WHERE ($1::text IS NULL OR c.estado=$1) AND ($2::timestamptz IS NULL OR (c.creada_en,c.caso_id)>($2::timestamptz,$3::uuid))
      ORDER BY c.creada_en,c.caso_id LIMIT $4`,[state,date,caseId,limit+1]);
    const page=rows.slice(0,limit),last=page[page.length-1];
    return {casos:page.map(row=>this.dto(row)),siguienteCursor:rows.length>limit&&last?
      Buffer.from(JSON.stringify({version:1,creadaEn:last.creada_en,casoId:last.caso_id,estado:state})).toString('base64url'):null};
  }
  /** actorId procede exclusivamente de la sesion validada del controlador. */
  async asumir(value:string,actorId:string) {
    const caseId=this.id(value),actor=this.id(actorId);
    await this.db.transaction(async manager=>{
      await manager.query("SET LOCAL lock_timeout='5s'");
      const [current]=await manager.query('SELECT * FROM rund.identidad_revision WHERE caso_id=$1 FOR UPDATE',[caseId]);
      if(!current)throw new NotFoundException('Caso de revision no registrado.');
      if(current.estado==='EN_REVISION') {
        if(current.asumida_por!==actor)throw new ConflictException('El caso ya tiene otro responsable.');
        return;
      }
      if(current.estado!=='PENDIENTE')throw new ConflictException('El caso no admite asignacion.');
      const [updated]=await manager.query(`WITH asumida AS (UPDATE rund.identidad_revision SET estado='EN_REVISION',
        asumida_por=$2,asumida_en=CURRENT_TIMESTAMP WHERE caso_id=$1 AND estado='PENDIENTE' RETURNING caso_id) SELECT * FROM asumida`,[caseId,actor]);
      if(!updated)throw new ServiceUnavailableException('RUND no confirmo la asignacion del caso.');
    });
    return this.consultar(caseId);
  }
}
