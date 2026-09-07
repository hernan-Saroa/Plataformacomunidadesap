-- Historial auditable del flujo de correcciones de certificados laborales.
-- Conserva responsables, mensajes, resultado de notificaciones y cambios aplicados.

BEGIN;

ALTER TABLE certification.certificate_correction_requests
  ADD COLUMN IF NOT EXISTS traceability JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE certification.certificate_correction_requests request
SET traceability =
  jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'type', 'REQUEST_CREATED',
      'title', 'Solicitud de corrección recibida',
      'description', request.description,
      'status', 'PENDING',
      'occurred_at', request.created_at,
      'actor_name', request.requester_name,
      'actor_email', request.requester_email,
      'actor_role', 'SOLICITANTE',
      'metadata', jsonb_build_object(
        'certificate_id', request.certificate_id,
        'due_date', request.due_date,
        'evidence_count', jsonb_array_length(request.submitted_evidence)
      )
    )
  )
  || CASE WHEN request.review_started_at IS NOT NULL THEN
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid()::text,
        'type', 'REVIEW_STARTED',
        'title', 'Revisión iniciada por el coordinador',
        'description', 'El caso fue abierto y quedó en revisión.',
        'status', 'IN_REVIEW',
        'occurred_at', request.review_started_at,
        'actor_name', COALESCE(request.reviewed_by_name, 'Coordinador Certificados Laborales'),
        'actor_email', request.reviewed_by_email,
        'actor_role', 'COORDINADOR',
        'metadata', '{}'::jsonb
      )
    )
  ELSE '[]'::jsonb END
  || CASE WHEN request.resolved_at IS NOT NULL AND request.status = 'APPROVED' THEN
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid()::text,
        'type', 'CERTIFICATE_SENT',
        'title', 'Certificado corregido y enviado',
        'description', COALESCE(request.resolution_description, 'El certificado fue corregido y enviado al correo registrado.'),
        'status', 'APPROVED',
        'occurred_at', request.resolved_at,
        'actor_name', COALESCE(request.reviewed_by_name, 'Coordinador Certificados Laborales'),
        'actor_email', request.reviewed_by_email,
        'actor_role', 'COORDINADOR',
        'metadata', jsonb_build_object(
          'recipient', request.requester_email,
          'delivery_status', 'SENT',
          'corrected_data', COALESCE(request.corrected_data, '{}'::jsonb)
        )
      )
    )
  ELSE '[]'::jsonb END
  || CASE WHEN request.resolved_at IS NOT NULL AND request.status = 'REJECTED' THEN
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid()::text,
        'type', 'REQUEST_REJECTED',
        'title', 'Solicitud rechazada',
        'description', COALESCE(request.resolution_description, 'La solicitud no fue aprobada.'),
        'status', 'REJECTED',
        'occurred_at', request.resolved_at,
        'actor_name', COALESCE(request.reviewed_by_name, 'Coordinador Certificados Laborales'),
        'actor_email', request.reviewed_by_email,
        'actor_role', 'COORDINADOR',
        'metadata', jsonb_build_object(
          'recipient', request.requester_email,
          'delivery_status', 'UNKNOWN',
          'evidence_count', jsonb_array_length(request.resolution_evidence)
        )
      )
    )
  ELSE '[]'::jsonb END
WHERE request.traceability = '[]'::jsonb;

COMMENT ON COLUMN certification.certificate_correction_requests.traceability IS
  'Chronological and immutable business audit trail for the correction request';

COMMIT;
