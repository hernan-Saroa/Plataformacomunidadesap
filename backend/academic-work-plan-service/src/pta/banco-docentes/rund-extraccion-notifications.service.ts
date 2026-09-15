import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Entrega persistente independiente: una caída de la campana no repite el OCR. */
@Injectable()
export class RundExtraccionNotificationsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private busy=false;
  private readonly logger=new Logger(RundExtraccionNotificationsService.name);
  constructor(private readonly db:DataSource) {}
  onModuleInit() {
    if (process.env.RUND_OCR_ENABLED!=='true') return;
    this.timer=setInterval(()=>void this.tick(),5000);this.timer.unref();void this.tick();
  }
  onModuleDestroy() {if(this.timer)clearInterval(this.timer);}
  async tick() {
    if(this.busy || process.env.RUND_OCR_ENABLED!=='true')return;
    this.busy=true;
    try {
      const [job]=await this.db.query(`WITH aviso AS (
        UPDATE academic_work_plan."RundExtraccionTrabajo" SET notificacion_proxima=now()+interval '1 minute'
        WHERE id=(SELECT id FROM academic_work_plan."RundExtraccionTrabajo"
          WHERE estado IN ('COMPLETADO','ERROR','OBSOLETO') AND notificado_en IS NULL AND notificacion_proxima<=now()
          ORDER BY creado_en FOR UPDATE SKIP LOCKED LIMIT 1)
        RETURNING id,docente_id,estado,creado_por,notificacion_id)
        SELECT * FROM aviso`);
      if(!job)return;
      // Destinatario concreto: quien solicitó el análisis o cargó el soporte, nunca un envío masivo.
      const [user]=await this.db.query(`SELECT id_user FROM auth."user"
        WHERE COALESCE(is_active,true)=true AND
          (id_user::text=$1 OR id_person::text=$1 OR lower(username)=lower($1))
        ORDER BY (id_user::text=$1) DESC LIMIT 1`,[job.creado_por]);
      if(!user) {
        await this.db.query(`UPDATE academic_work_plan."RundExtraccionTrabajo" SET notificacion_proxima=now()+interval '1 day' WHERE id=$1`,[job.id]);
        return;
      }
      const complete=job.estado==='COMPLETADO';
      const base=(process.env.NOTIFICATIONS_SERVICE_URL||process.env.NOTIFICATION_SERVICE_URL||
        ((process.env.NODE_ENV||'development')==='production'?'http://notifications-service:3009':'http://localhost:3009')).replace(/\/$/,'');
      const response=await fetch(`${base}/notifications`,{
        method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),redirect:'error',
        body:JSON.stringify({clave_idempotencia:job.notificacion_id,id_usuario_destinatario:user.id_user,
          tipo_notificacion:'rund_extraccion_finalizada',titulo:complete?'Análisis documental de RUND finalizado':'Revisa tu análisis documental de RUND',
          mensaje:complete?'Tu análisis terminó. Abre el expediente para revisar el resultado; los datos del perfil requieren confirmación humana.':
            job.estado==='OBSOLETO'?'El documento fue reemplazado o eliminado. Puedes consultar el historial del análisis en RUND.':
            'No fue posible completar el análisis después de los reintentos. Tu documento sigue disponible y puedes volver a intentarlo desde RUND.',
          categoria:'RUND',prioridad:complete?'Media':'Alta',icono:'FileText',color:complete?'purple':'orange',
          tiene_accion:true,texto_boton_accion:'Ver resultado',
          url_accion:`/?module=banco-docentes-pta&rundDocenteId=${encodeURIComponent(job.docente_id)}`,
          datos_adicionales:{rundTrabajoId:job.id,rundDocenteId:job.docente_id},enviar_email:false})
      });
      if(!response.ok)throw new Error('AVISO_NO_DISPONIBLE');
      await this.db.query(`UPDATE academic_work_plan."RundExtraccionTrabajo" SET notificado_en=now() WHERE id=$1`,[job.id]);
    }catch{
      this.logger.warn('Aviso de extracción pendiente; se reintentará sin repetir el análisis.');
    }finally{this.busy=false;}
  }
}
