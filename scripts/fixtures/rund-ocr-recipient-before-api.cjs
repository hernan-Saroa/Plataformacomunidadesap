// Consulta anterior y payload de avisos; exclusivamente para la base temporal de prueba.
exports.recipient = async (database, key) => (await database.query(`SELECT id_user FROM auth."user"
  WHERE COALESCE(is_active,true)=true AND
    (id_user::text=$1 OR id_person::text=$1 OR lower(username)=lower($1))
  ORDER BY (id_user::text=$1) DESC LIMIT 1`, [key])).rows[0]?.id_user ?? null;

exports.payload = (job, userId) => {
  const complete = job.estado === 'COMPLETADO';
  return { clave_idempotencia: job.notificacion_id, id_usuario_destinatario: userId,
    tipo_notificacion: 'rund_extraccion_finalizada', titulo: complete ? 'Análisis documental de RUND finalizado' : 'Revisa tu análisis documental de RUND',
    mensaje: complete ? 'Tu análisis terminó. Abre el expediente para revisar el resultado; los datos del perfil requieren confirmación humana.' :
      job.estado === 'OBSOLETO' ? 'El documento fue reemplazado o eliminado. Puedes consultar el historial del análisis en RUND.' :
        'No fue posible completar el análisis después de los reintentos. Tu documento sigue disponible y puedes volver a intentarlo desde RUND.',
    categoria: 'RUND', prioridad: complete ? 'Media' : 'Alta', icono: 'FileText', color: complete ? 'purple' : 'orange',
    tiene_accion: true, texto_boton_accion: 'Ver resultado',
    url_accion: `/?module=banco-docentes-pta&rundDocenteId=${encodeURIComponent(job.docente_id)}`,
    datos_adicionales: { rundTrabajoId: job.id, rundDocenteId: job.docente_id }, enviar_email: false };
};
