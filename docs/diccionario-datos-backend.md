# Diccionario de datos - Backend

Generado el 2026-05-07 desde las entidades TypeORM `*.entity.ts` y fuentes SQL encontradas bajo `backend/`.

## Alcance

- Microservicios revisados: 12
- Tablas derivadas de entidades TypeORM: 173
- Tablas adicionales derivadas de SQL: 42
- Tablas documentadas en total: 215
- Columnas documentadas: 3274
- Esquemas detectados: academic_registration, academic_work_plan, audit, auth, control_interno, default, esap, internal_disciplinary_control, legal_management, notifications, requerimientos_oc
- Diagramas MER asociados: 8

> Nota: cuando una entidad no define explícitamente `schema`, se registra como `default` porque TypeORM usará el esquema configurado por conexión o el esquema por defecto de la base de datos.

## Índice por microservicio

- [academic-registration-service](#academic-registration-service): 9 tablas; esquemas academic_registration; MER [academic_registration](<mer/06-may-2026/esap_db - academic_registration.png>)
- [academic-work-plan-service](#academic-work-plan-service): 15 tablas; esquemas academic_work_plan; MER [academic_work_plan](<mer/06-may-2026/esap_db - academic_work_plan.png>)
- [api-gateway](#api-gateway): 0 tablas
- [audit-service](#audit-service): 1 tabla; esquemas audit; MER [audit](<mer/06-may-2026/esap_db - audit.png>)
- [auth-service](#auth-service): 22 tablas; esquemas auth, default; MER [auth](<mer/06-may-2026/esap_db - auth.png>)
- [certification-service](#certification-service): 13 tablas; esquemas default; MER [certification](<mer/06-may-2026/esap_db - certification.png>)
- [internal-disciplinary-control-service](#internal-disciplinary-control-service): 27 tablas; esquemas default, internal_disciplinary_control; MER [internal_disciplinary_control](<mer/06-may-2026/esap_db - internal_disciplinary_control.png>)
- [internal-institutional-control-service](#internal-institutional-control-service): 79 tablas; esquemas control_interno, esap; MER [control_interno](<mer/06-may-2026/esap_db - control_interno.png>)
- [interoperability-service](#interoperability-service): 0 tablas
- [legal-management-service](#legal-management-service): 48 tablas; esquemas legal_management, requerimientos_oc; MER [legal_management](<mer/06-may-2026/esap_db - legal_management.png>)
- [notifications-service](#notifications-service): 1 tabla; esquemas notifications
- [travel-expenses-service](#travel-expenses-service): 0 tablas

## academic-registration-service

Diagramas MER relacionados:
- [academic_registration](<mer/06-may-2026/esap_db - academic_registration.png>)

### Esquema `academic_registration`

MER relacionado: [academic_registration](<mer/06-may-2026/esap_db - academic_registration.png>)
#### Tabla `academic_registration.certificate_template_config`

- Entidad/definición: `TemplateConfig`
- Fuente: `TypeORM`
- Archivo: `backend/academic-registration-service/src/graduation-certificates/template-config.entity.ts`
- Relaciones declaradas:
  - `signer`: ManyToOne -> `Signer` por `signer_id`
  - `changes`: OneToMany -> `TemplateConfigChange`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | integer generated | Sí |  | No | No |  |  |
| `signer_id` | `signerId` | uuid | No | ManyToOne -> Signer | Sí | No |  |  |
| `institution_logo_url` | `institutionLogoUrl` | text | No |  | Sí | No |  |  |
| `institution_logo_filename` | `institutionLogoFilename` | varchar (length 255) | No |  | Sí | No |  |  |
| `typography_font` | `typographyFont` | varchar (length 100) | No |  | No | No | Arial Narrow, Arial, sans-serif |  |
| `signer_title_override` | `signerTitleOverride` | varchar (length 255) | No |  | Sí | No |  |  |
| `certificate_content_html` | `certificateContentHtml` | text | No |  | No | No |  |  |
| `version` | `version` | varchar (length 50) | No |  | No | No | 1.0.0 |  |
| `status` | `status` | varchar (length 50) | No |  | No | No | draft |  |
| `signature_url_override` | `signatureUrlOverride` | text | No |  | Sí | No |  |  |
| `signature_filename_override` | `signatureFilenameOverride` | varchar (length 255) | No |  | Sí | No |  |  |
| `signer_name_override` | `signerNameOverride` | varchar (length 255) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `created_by` | `createdBy` | varchar (length 255) | No |  | Sí | No |  |  |
| `updated_by` | `updatedBy` | varchar (length 255) | No |  | Sí | No |  |  |
| `is_active` | `isActive` | boolean | No |  | No | No | true |  |

#### Tabla `academic_registration.certificate_validations`

- Entidad/definición: `CertificateValidation`
- Fuente: `TypeORM`
- Archivo: `backend/academic-registration-service/src/graduation-certificates/certificate-validation.entity.ts`
- Relaciones declaradas:
  - `certificate`: ManyToOne -> `GraduationCertificate` por `certificate_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `certificate_id` | `certificateId` | uuid | No | ManyToOne -> GraduationCertificate | No | No |  |  |
| `validation_date` | `validationDate` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `ip_address` | `ipAddress` | varchar (length 50) | No |  | Sí | No |  |  |
| `user_agent` | `userAgent` | text | No |  | Sí | No |  |  |
| `location` | `location` | varchar (length 255) | No |  | Sí | No |  |  |
| `result` | `result` | varchar (length 50) | No |  | No | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `academic_registration.graduate_files`

- Entidad/definición: `GraduateFile`
- Fuente: `TypeORM`
- Archivo: `backend/academic-registration-service/src/graduation-certificates/graduate-file.entity.ts`
- Relaciones declaradas:
  - `graduate`: ManyToOne -> `Graduate` por `graduate_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `graduate_id` | `graduateId` | uuid | No | ManyToOne -> Graduate | No | No |  |  |
| `original_name` | `originalName` | varchar (length 255) | No |  | No | No |  |  |
| `stored_name` | `storedName` | varchar (length 255) | No |  | No | No |  |  |
| `mime_type` | `mimeType` | varchar (length 150) | No |  | No | No |  |  |
| `size_bytes` | `sizeBytes` | integer | No |  | No | No |  |  |
| `uploaded_by` | `uploadedBy` | varchar (length 255) | No |  | Sí | No |  |  |
| `uploaded_at` | `uploadedAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `academic_registration.graduates`

- Entidad/definición: `Graduate`
- Fuente: `TypeORM`
- Archivo: `backend/academic-registration-service/src/graduation-certificates/graduate.entity.ts`
- Relaciones declaradas:
  - `certificateRequests`: OneToMany -> `GraduationCertificateRequest`
  - `certificates`: OneToMany -> `GraduationCertificate`
  - `files`: OneToMany -> `GraduateFile`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `person_id` | `personId` | uuid | No |  | No | No |  |  |
| `full_name` | `fullName` | varchar (length 255) | No |  | No | No |  |  |
| `first_name` | `firstName` | varchar (length 255) | No |  | Sí | No |  |  |
| `last_name` | `lastName` | varchar (length 255) | No |  | Sí | No |  |  |
| `id_number` | `idNumber` | varchar (length 50) | No |  | No | No |  |  |
| `id_issue_date` | `idIssueDate` | date | No |  | Sí | No |  |  |
| `email` | `email` | varchar (length 255) | No |  | Sí | No |  |  |
| `phone` | `phone` | varchar (length 50) | No |  | Sí | No |  |  |
| `program_id` | `programId` | uuid | No |  | No | No |  |  |
| `program_name` | `programName` | varchar (length 255) | No |  | No | No |  |  |
| `program_type` | `programType` | varchar (length 50) | No |  | No | No |  |  |
| `enrollment_date` | `enrollmentDate` | date | No |  | Sí | No |  |  |
| `graduation_date` | `graduationDate` | date | No |  | No | No |  |  |
| `ceremony_date` | `ceremonyDate` | date | No |  | Sí | No |  |  |
| `degree_title` | `degreeTitle` | varchar (length 255) | No |  | No | No |  |  |
| `diploma_number` | `diplomaNumber` | varchar (length 100) | No |  | Sí | Sí |  |  |
| `registry_reference` | `actaNumber` | varchar (length 100) | No |  | Sí | No |  | Alias de compatibilidad HTTP para la referencia registro/folio/libro. |
| `resolution_number` | `resolutionNumber` | varchar (length 100) | No |  | Sí | No |  |  |
| `graduation_record_number` | `numActa` | varchar (length 100) | No |  | Sí | No |  | Alias de compatibilidad HTTP/Oracle. |
| `folio_number` | `numFolio` | varchar (length 100) | No |  | Sí | No |  | Alias de compatibilidad HTTP/Oracle. |
| `book_number` | `numLibro` | varchar (length 100) | No |  | Sí | No |  | Alias de compatibilidad HTTP/Oracle. |
| `registry_number` | `numRegistro` | varchar (length 100) | No |  | Sí | No |  | Alias de compatibilidad HTTP/Oracle. |
| `status` | `status` | varchar (length 50) | No |  | No | No | ACTIVE |  |
| `is_verified` | `isVerified` | boolean | No |  | No | No | true |  |
| `campus` | `campus` | varchar (length 100) | No |  | Sí | No |  |  |
| `regional_office_name` | `seccionalName` | varchar (length 255) | No |  | Sí | No |  | Alias de compatibilidad HTTP. |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `created_by` | `createdBy` | varchar (length 255) | No |  | Sí | No |  |  |
| `updated_by` | `updatedBy` | varchar (length 255) | No |  | Sí | No |  |  |

#### Tabla `academic_registration.graduation_certificate_requests`

- Entidad/definición: `GraduationCertificateRequest`
- Fuente: `TypeORM`
- Archivo: `backend/academic-registration-service/src/graduation-certificates/graduation-certificate-request.entity.ts`
- Relaciones declaradas:
  - `graduate`: ManyToOne -> `Graduate` por `graduate_id`
  - `certificates`: OneToMany -> `GraduationCertificate`
  - `reviewFiles`: OneToMany -> `GraduationRequestReviewFile`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `request_number` | `requestNumber` | varchar (length 100) | No |  | No | Sí |  |  |
| `requester_type` | `requesterType` | varchar (length 50) | No |  | No | No |  |  |
| `graduate_id` | `graduateId` | uuid | No | ManyToOne -> Graduate | Sí | No |  |  |
| `id_number` | `idNumber` | varchar (length 50) | No |  | No | No |  |  |
| `id_issue_date` | `idIssueDate` | date | No |  | Sí | No |  |  |
| `full_name` | `fullName` | varchar (length 255) | No |  | No | No |  |  |
| `graduate_last_name` | `graduateLastName` | varchar (length 255) | No |  | Sí | No |  |  |
| `graduate_email` | `graduateEmail` | varchar (length 255) | No |  | Sí | No |  |  |
| `graduate_phone` | `graduatePhone` | varchar (length 50) | No |  | Sí | No |  |  |
| `program_name` | `programName` | varchar (length 255) | No |  | No | No |  |  |
| `graduation_date` | `graduationDate` | date | No |  | Sí | No |  |  |
| `requester_name` | `requesterName` | varchar (length 255) | No |  | Sí | No |  |  |
| `requester_email` | `requesterEmail` | varchar (length 255) | No |  | No | No |  |  |
| `requester_phone` | `requesterPhone` | varchar (length 50) | No |  | Sí | No |  |  |
| `company_name` | `companyName` | varchar (length 255) | No |  | Sí | No |  |  |
| `company_tax_id` | `companyNit` | varchar (length 50) | No |  | Sí | No |  | Alias de compatibilidad para el NIT colombiano. |
| `contact_person` | `contactPerson` | varchar (length 255) | No |  | Sí | No |  |  |
| `certificate_type` | `certificateType` | varchar (length 50) | No |  | No | No | STANDARD |  |
| `validation_code` | `validationCode` | varchar (length 10) | No |  | Sí | No |  |  |
| `validation_expires_at` | `validationExpiresAt` | timestamp | No |  | Sí | No |  |  |
| `is_validated` | `isValidated` | boolean | No |  | No | No | false |  |
| `status` | `status` | varchar (length 50) | No |  | No | No | PENDING |  |
| `observations` | `observations` | text | No |  | Sí | No |  |  |
| `rejection_reason` | `rejectionReason` | text | No |  | Sí | No |  |  |
| `manual_review` | `manualReview` | boolean | No |  | No | No | false |  |
| `reviewed_at` | `reviewedAt` | timestamp | No |  | Sí | No |  |  |
| `reviewed_by` | `reviewedBy` | varchar (length 100) | No |  | Sí | No |  |  |
| `reviewer_name` | `reviewerName` | varchar (length 255) | No |  | Sí | No |  |  |
| `review_notes` | `reviewNotes` | text | No |  | Sí | No |  |  |
| `review_resolution` | `reviewResolution` | varchar (length 50) | No |  | Sí | No |  |  |
| `approval_status` | `approvalStatus` | varchar (length 50) | No |  | Sí | No |  |  |
| `review_recommendation` | `reviewRecommendation` | varchar (length 50) | No |  | Sí | No |  |  |
| `review_recommendation_reason` | `reviewRecommendationReason` | text | No |  | Sí | No |  |  |
| `review_payload` | `reviewPayload` | jsonb | No |  | Sí | No |  |  |
| `review_submitted_at` | `reviewSubmittedAt` | timestamp | No |  | Sí | No |  |  |
| `review_submitted_by` | `reviewSubmittedBy` | varchar (length 100) | No |  | Sí | No |  |  |
| `review_submitted_by_name` | `reviewSubmittedByName` | varchar (length 255) | No |  | Sí | No |  |  |
| `approver_decision` | `approverDecision` | varchar (length 50) | No |  | Sí | No |  |  |
| `approver_notes` | `approverNotes` | text | No |  | Sí | No |  |  |
| `approved_at` | `approvedAt` | timestamp | No |  | Sí | No |  |  |
| `approved_by` | `approvedBy` | varchar (length 100) | No |  | Sí | No |  |  |
| `approver_name` | `approverName` | varchar (length 255) | No |  | Sí | No |  |  |
| `head_decision` | `headDecision` | varchar (length 50) | No |  | Sí | No |  |  |
| `head_notes` | `headNotes` | text | No |  | Sí | No |  |  |
| `head_reviewed_at` | `headReviewedAt` | timestamp | No |  | Sí | No |  |  |
| `head_reviewed_by` | `headReviewedBy` | varchar (length 100) | No |  | Sí | No |  |  |
| `head_reviewer_name` | `headReviewerName` | varchar (length 255) | No |  | Sí | No |  |  |
| `review_timeline` | `reviewTimeline` | jsonb | No |  | No | No | () => "'[]'::jsonb" |  |
| `request_date` | `requestDate` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `validation_date` | `validationDate` | timestamp | No |  | Sí | No |  |  |
| `completion_date` | `completionDate` | timestamp | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `academic_registration.graduation_certificates`

- Entidad/definición: `GraduationCertificate`
- Fuente: `TypeORM`
- Archivo: `backend/academic-registration-service/src/graduation-certificates/graduation-certificate.entity.ts`
- Relaciones declaradas:
  - `request`: ManyToOne -> `GraduationCertificateRequest` por `request_id`
  - `graduate`: ManyToOne -> `Graduate` por `graduate_id`
  - `validations`: OneToMany -> `CertificateValidation`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `request_id` | `requestId` | uuid | No | ManyToOne -> GraduationCertificateRequest | No | No |  |  |
| `graduate_id` | `graduateId` | uuid | No | ManyToOne -> Graduate | Sí | No |  |  |
| `certificate_number` | `certificateNumber` | varchar (length 100) | No |  | No | Sí |  |  |
| `verification_code` | `verificationCode` | varchar (length 50) | No |  | No | Sí |  |  |
| `full_name` | `fullName` | varchar (length 255) | No |  | No | No |  |  |
| `id_number` | `idNumber` | varchar (length 50) | No |  | No | No |  |  |
| `program_name` | `programName` | varchar (length 255) | No |  | No | No |  |  |
| `program_type` | `programType` | varchar (length 50) | No |  | No | No |  |  |
| `degree_title` | `degreeTitle` | varchar (length 255) | No |  | No | No |  |  |
| `graduation_date` | `graduationDate` | date | No |  | No | No |  |  |
| `diploma_number` | `diplomaNumber` | varchar (length 100) | No |  | Sí | No |  |  |
| `registry_reference` | `actaNumber` | varchar (length 100) | No |  | Sí | No |  | Alias de compatibilidad HTTP para la referencia registro/folio/libro. |
| `campus` | `campus` | varchar (length 100) | No |  | Sí | No |  |  |
| `regional_office_name` | `seccionalName` | varchar (length 150) | No |  | Sí | No |  | Alias de compatibilidad HTTP. |
| `signer_name` | `signerName` | varchar (length 255) | No |  | No | No |  |  |
| `signer_position` | `signerPosition` | varchar (length 255) | No |  | No | No |  |  |
| `signature_url` | `signatureUrl` | text | No |  | Sí | No |  |  |
| `pdf_url` | `pdfUrl` | text | No |  | Sí | No |  |  |
| `pdf_filename` | `pdfFilename` | varchar (length 255) | No |  | Sí | No |  |  |
| `template_snapshot` | `templateSnapshot` | jsonb | No |  | Sí | No |  |  |
| `status` | `status` | varchar (length 50) | No |  | No | No | VALID |  |
| `issue_date` | `issueDate` | date | No |  | No | No | () => 'CURRENT_DATE' |  |
| `expiry_date` | `expiryDate` | date | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `created_by` | `createdBy` | varchar (length 255) | No |  | Sí | No |  |  |

#### Tabla `academic_registration.graduation_request_review_files`

- Entidad/definición: `GraduationRequestReviewFile`
- Fuente: `TypeORM`
- Archivo: `backend/academic-registration-service/src/graduation-certificates/graduation-request-review-file.entity.ts`
- Relaciones declaradas:
  - `request`: ManyToOne -> `GraduationCertificateRequest` por `request_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `request_id` | `requestId` | uuid | No | ManyToOne -> GraduationCertificateRequest | No | No |  |  |
| `original_name` | `originalName` | varchar (length 255) | No |  | No | No |  |  |
| `stored_name` | `storedName` | varchar (length 255) | No |  | No | No |  |  |
| `mime_type` | `mimeType` | varchar (length 150) | No |  | No | No |  |  |
| `size_bytes` | `sizeBytes` | integer | No |  | No | No |  |  |
| `uploaded_by` | `uploadedBy` | varchar (length 255) | No |  | Sí | No |  |  |
| `uploaded_at` | `uploadedAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `academic_registration.signers`

- Entidad/definición: `Signer`
- Fuente: `TypeORM`
- Archivo: `backend/academic-registration-service/src/graduation-certificates/signer.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `full_name` | `fullName` | varchar (length 255) | No |  | No | No |  |  |
| `position` | `position` | varchar (length 255) | No |  | No | No |  |  |
| `department` | `department` | varchar (length 255) | No |  | Sí | No |  |  |
| `signature_url` | `signatureUrl` | text | No |  | Sí | No |  |  |
| `is_active` | `isActive` | boolean | No |  | No | No | true |  |
| `is_primary` | `isPrimary` | boolean | No |  | No | No | false |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `academic_registration.template_config_changes`

- Entidad/definición: `TemplateConfigChange`
- Fuente: `TypeORM`
- Archivo: `backend/academic-registration-service/src/graduation-certificates/template-config-change.entity.ts`
- Relaciones declaradas:
  - `templateConfig`: ManyToOne -> `TemplateConfig` por `template_config_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `template_config_id` | `templateConfigId` | integer | No | ManyToOne -> TemplateConfig | No | No |  |  |
| `change_type` | `changeType` | varchar (length 50) | No |  | No | No |  |  |
| `field_changed` | `fieldChanged` | varchar (length 100) | No |  | Sí | No |  |  |
| `old_value` | `oldValue` | text | No |  | Sí | No |  |  |
| `new_value` | `newValue` | text | No |  | Sí | No |  |  |
| `changed_by` | `changedBy` | varchar (length 255) | No |  | No | No |  |  |
| `change_date` | `changeDate` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `observations` | `observations` | text | No |  | Sí | No |  |  |


## academic-work-plan-service

Diagramas MER relacionados:
- [academic_work_plan](<mer/06-may-2026/esap_db - academic_work_plan.png>)

### Esquema `academic_work_plan`

MER relacionado: [academic_work_plan](<mer/06-may-2026/esap_db - academic_work_plan.png>)

#### Tabla `academic_work_plan.AprobacionJefatura`

- Entidad/definición: `AprobacionJefaturaEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/aprobacion-jefatura.entity.ts`
- Índices de entidad: `['ptaId']`, `['jefaturaUserId']`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `ptaId` | `ptaId` | text | No |  | No | No |  |  |
| `jefaturaUserId` | `jefaturaUserId` | text | No |  | No | No |  |  |
| `jefaturaRol` | `jefaturaRol` | text | No |  | No | No | Jefatura de Zona |  |
| `territorialId` | `territorialId` | text | No |  | No | No |  |  |
| `territorialNombre` | `territorialNombre` | text | No |  | Sí | No |  |  |
| `decision` | `decision` | text | No |  | No | No | pendiente |  |
| `comentarios` | `comentarios` | text | No |  | Sí | No |  |  |
| `camposModificados` | `camposModificados` | jsonb | No |  | Sí | No |  |  |
| `componentesBloqueados` | `componentesBloqueados` | jsonb | No |  | Sí | No |  |  |
| `firmaId` | `firmaId` | text | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  |  |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  |  |

#### Tabla `academic_work_plan.Asignatura`

- Entidad/definición: `AsignaturaEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/asignatura.entity.ts`
- Relaciones declaradas:
  - `programa`: ManyToOne -> `ProgramaEntity` por `programaId`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `programaId` | `programaId` | text | No | ManyToOne -> ProgramaEntity | No | No |  |  |
| `nombre` | `nombre` | text | No |  | No | No |  |  |
| `codigo` | `codigo` | text | No |  | Sí | No |  |  |
| `creditos` | `creditos` | int | No |  | No | No | 3 |  |
| `horas` | `horas` | int | No |  | No | No | 144 |  |
| `nucleoTematico` | `nucleoTematico` | text | No |  | Sí | No |  |  |
| `semestre` | `semestre` | text | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' | Fecha de actualización automática |

#### Tabla `academic_work_plan.ConfiguracionSistema`

- Entidad/definición: `PtaConfiguracionEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/pta-configuracion.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `clave` | `id` | text | Sí |  | No | No |  |  |
| `valor` | `rules` | jsonb | No |  | Sí | No |  |  |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  |  |

#### Tabla `academic_work_plan.Docente`

- Entidad/definición: `DocenteEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/docente.entity.ts`
- Relaciones declaradas:
  - `persona`: ManyToOne -> `PersonaEntity` por `personaId`
  - `territorial`: ManyToOne -> `TerritorialEntity` por `territorialId`
  - `sede`: ManyToOne -> `SedeEntity` por `sedeId`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `personaId` | `personaId` | text | No | ManyToOne -> PersonaEntity | No | No |  |  |
| `territorialId` | `territorialId` | text | No | ManyToOne -> TerritorialEntity | No | No |  |  |
| `tipoVinculacion` | `tipoVinculacion` | text | No |  | No | No |  |  |
| `dedicacion` | `dedicacion` | text | No |  | No | No |  |  |
| `estado` | `estado` | text | No |  | No | No | ACTIVO |  |
| `horasAsignables` | `horasAsignables` | int | No |  | No | No | 0 |  |
| `sedeId` | `sedeId` | text | No | ManyToOne -> SedeEntity | Sí | No |  |  |
| `ordenListado` | `ordenListado` | int | No |  | Sí | No |  |  |
| `vinculacionDisplay` | `vinculacionDisplay` | text | No |  | Sí | No |  |  |
| `dedicacionDisplay` | `dedicacionDisplay` | text | No |  | Sí | No |  |  |
| `escalafon` | `escalafon` | text | No |  | Sí | No |  |  |
| `nucleoTematico` | `nucleoTematico` | text | No |  | Sí | No |  |  |
| `nivelFormacion` | `nivelFormacion` | text | No |  | Sí | No |  |  |
| `perfilAcademicoPro` | `perfilAcademicoPro` | text | No |  | Sí | No |  |  |
| `perfilAcademico` | `perfilAcademico` | text | No |  | Sí | No |  |  |
| `pregrado` | `pregrado` | text | No |  | Sí | No |  |  |
| `especializacion` | `especializacion` | text | No |  | Sí | No |  |  |
| `maestria` | `maestria` | text | No |  | Sí | No |  |  |
| `doctorado` | `doctorado` | text | No |  | Sí | No |  |  |
| `posDoctorado` | `posDoctorado` | text | No |  | Sí | No |  |  |
| `investigacion` | `investigacion` | text | No |  | Sí | No |  |  |
| `correoInstitucional` | `correoInstitucional` | text | No |  | Sí | No |  |  |
| `origenVinculacion` | `origenVinculacion` | text | No |  | Sí | No |  |  |
| `actoAdministrativoVinculacion` | `actoAdministrativoVinculacion` | text | No |  | Sí | No |  |  |
| `situacionAdministrativa` | `situacionAdministrativa` | text | No |  | Sí | No |  |  |
| `ultimaEvaluacion` | `ultimaEvaluacion` | text | No |  | Sí | No |  |  |
| `puntajeSalarial` | `puntajeSalarial` | float | No |  | Sí | No |  |  |
| `fechaInicioVinculacion` | `fechaInicioVinculacion` | timestamp | No |  | Sí | No |  |  |
| `fechaFinVinculacion` | `fechaFinVinculacion` | timestamp | No |  | Sí | No |  |  |
| `edadReferencia` | `edadReferencia` | int | No |  | Sí | No |  |  |
| `rangoEdad` | `rangoEdad` | text | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' | Fecha de actualización automática |

#### Tabla `academic_work_plan.HistorialEstadoPTA`

- Entidad/definición: `HistorialEstadoPtaEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/historial-estado-pta.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `ptaId` | `ptaId` | text | No |  | No | No |  |  |
| `estadoAnterior` | `estadoAnterior` | text | No |  | Sí | No |  |  |
| `estadoNuevo` | `estadoNuevo` | text | No |  | No | No |  |  |
| `actorId` | `actorId` | text | No |  | Sí | No |  |  |
| `actorRol` | `actorRol` | text | No |  | Sí | No |  |  |
| `tipoAccion` | `tipoAccion` | text | No |  | Sí | No |  |  |
| `comentarios` | `comentarios` | text | No |  | Sí | No |  |  |
| `detallesTransicion` | `detallesTransicion` | text | No |  | Sí | No |  |  |
| `snapshotPta` | `snapshotPta` | jsonb | No |  | Sí | No |  |  |
| `version` | `version` | int | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  |  |

#### Tabla `academic_work_plan.Persona`

- Entidad/definición: `PersonaEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/persona.entity.ts`
- Relaciones declaradas:
  - `usuario`: ManyToOne -> `UsuarioEntity` por `usuarioId`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `usuarioId` | `usuarioId` | text | No | ManyToOne -> UsuarioEntity | No | No |  |  |
| `identificacion` | `identificacion` | text | No |  | Sí | No |  |  |
| `tipo_identificacion` | `tipo_identificacion` | text | No |  | Sí | No |  |  |
| `telefono` | `telefono` | text | No |  | Sí | No |  |  |
| `direccion` | `direccion` | text | No |  | Sí | No |  |  |
| `primer_nombre` | `primer_nombre` | text | No |  | Sí | No |  |  |
| `segundo_nombre` | `segundo_nombre` | text | No |  | Sí | No |  |  |
| `primer_apellido` | `primer_apellido` | text | No |  | Sí | No |  |  |
| `segundo_apellido` | `segundo_apellido` | text | No |  | Sí | No |  |  |
| `genero` | `genero` | text | No |  | Sí | No |  |  |
| `fecha_nacimiento` | `fecha_nacimiento` | timestamp | No |  | Sí | No |  |  |
| `extension_telefonica` | `extension_telefonica` | text | No |  | Sí | No |  |  |
| `correo_alternativo` | `correo_alternativo` | text | No |  | Sí | No |  |  |
| `tipo_usuario` | `tipo_usuario` | text | No |  | Sí | No |  |  |
| `fecha_fin_contrato` | `fecha_fin_contrato` | timestamp | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' | Fecha de actualización automática |

#### Tabla `academic_work_plan.PlanTrabajoAcademico`

- Entidad/definición: `PlanTrabajoAcademicoEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/plan-trabajo-academico.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `docenteId` | `docenteId` | text | No |  | No | No |  |  |
| `periodo` | `periodo` | text | No |  | No | No |  |  |
| `estado` | `estado` | text | No |  | No | No | BORRADOR |  |
| `version` | `version` | int | No |  | No | No | 1 |  |
| `horasTotales` | `horasTotales` | int | No |  | No | No | 0 |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `motivoDevolucion` | `motivoDevolucion` | text | No |  | Sí | No |  |  |
| `datosEstructurados` | `datosEstructurados` | jsonb | No |  | Sí | No |  |  |
| `dedicacion` | `dedicacion` | text | No |  | Sí | No |  |  |
| `horasAsignables` | `horasAsignables` | int | No |  | Sí | No |  |  |
| `semanasVinculacion` | `semanasVinculacion` | int | No |  | Sí | No |  |  |
| `tipoVinculacion` | `tipoVinculacion` | text | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  |  |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  |  |

#### Tabla `academic_work_plan.Programa`

- Entidad/definición: `ProgramaEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/programa.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `nombre` | `nombre` | text | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `estado` | `estado` | text | No |  | No | No | ACTIVO |  |
| `nivel` | `nivel` | text | No |  | No | No | PREGRADO |  |
| `facultad` | `facultad` | text | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' | Fecha de actualización automática |

#### Tabla `academic_work_plan.PtaEvento`

- Entidad/definición: `PtaEventoEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/pta-evento.entity.ts`
- Índices de entidad: `['ptaId']`, `['docenteId']`, `['sistemaOrigen']`, `['createdAt']`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `ptaId` | `ptaId` | text | No |  | No | No |  |  |
| `docenteId` | `docenteId` | text | No |  | Sí | No |  |  |
| `docenteNombre` | `docenteNombre` | text | No |  | Sí | No |  |  |
| `tipo` | `tipo` | text | No |  | No | No |  |  |
| `estadoAnterior` | `estadoAnterior` | text | No |  | Sí | No |  |  |
| `estadoNuevo` | `estadoNuevo` | text | No |  | Sí | No |  |  |
| `actor` | `actor` | text | No |  | Sí | No |  |  |
| `actorRol` | `actorRol` | text | No |  | Sí | No |  |  |
| `sistemaOrigen` | `sistemaOrigen` | text | No |  | No | No | sistema |  |
| `mensaje` | `mensaje` | text | No |  | Sí | No |  |  |
| `leidoBackoffice` | `leidoBackoffice` | boolean | No |  | No | No | false |  |
| `leidoPortal` | `leidoPortal` | boolean | No |  | No | No | false |  |
| `metadata` | `metadata` | jsonb | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  |  |

#### Tabla `academic_work_plan.PtaEvidencia`

- Entidad/definición: `PtaEvidenciaEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/pta-evidencia.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `ptaId` | `ptaId` | text | No |  | No | No |  |  |
| `nombre` | `nombre` | text | No |  | No | No |  |  |
| `tipoArchivo` | `tipoArchivo` | text | No |  | No | No |  |  |
| `tamanioBytes` | `tamanioBytes` | int | No |  | No | No | 0 |  |
| `categoria` | `categoria` | text | No |  | Sí | No |  |  |
| `componentePta` | `componentePta` | text | No |  | Sí | No |  |  |
| `horasAvance` | `horasAvance` | int | No |  | No | No | 0 |  |
| `storageUrl` | `storageUrl` | text | No |  | Sí | No |  |  |
| `subidoPor` | `subidoPor` | text | No |  | Sí | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `estado` | `estado` | text | No |  | No | No | activo |  |
| `estadoRevision` | `estadoRevision` | text | No |  | No | No | pendiente |  |
| `revisadoPor` | `revisadoPor` | text | No |  | Sí | No |  |  |
| `comentarioRevision` | `comentarioRevision` | text | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  |  |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  |  |

#### Tabla `academic_work_plan.PTAUserData`

- Entidad/definición: `PtaUserDataEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/pta-user-data.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `userId` | `userId` | text | No |  | No | No |  |  |
| `tags` | `tags` | jsonb | No |  | Sí | No |  |  |
| `notes` | `notes` | jsonb | No |  | Sí | No |  |  |
| `pinned` | `pinned` | jsonb | No |  | Sí | No |  |  |
| `priority` | `priority` | jsonb | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  |  |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  |  |

#### Tabla `academic_work_plan.Sede`

- Entidad/definición: `SedeEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/sede.entity.ts`
- Relaciones declaradas:
  - `territorial`: ManyToOne -> `TerritorialEntity` por `territorialId`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `territorialId` | `territorialId` | text | No | ManyToOne -> TerritorialEntity | No | No |  |  |
| `nombre` | `nombre` | text | No |  | No | No |  |  |
| `municipio` | `municipio` | text | No |  | Sí | No |  |  |
| `codigo` | `codigo` | text | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' | Fecha de actualización automática |

#### Tabla `academic_work_plan.SolicitudPTA`

- Entidad/definición: `SolicitudPtaEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/solicitud-pta.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `docenteId` | `docenteId` | text | No |  | No | No |  |  |
| `docenteNombre` | `docenteNombre` | text | No |  | No | No |  |  |
| `docenteEmail` | `docenteEmail` | text | No |  | Sí | No |  |  |
| `caso` | `caso` | text | No |  | No | No |  |  |
| `razon` | `razon` | text | No |  | No | No |  |  |
| `justificacion` | `justificacion` | text | No |  | No | No |  |  |
| `casoLibre` | `casoLibre` | text | No |  | Sí | No |  |  |
| `archivos` | `archivos` | jsonb | No |  | Sí | No |  |  |
| `estado` | `estado` | text | No |  | No | No | pendiente |  |
| `resueltoPor` | `resueltoPor` | text | No |  | Sí | No |  |  |
| `resolucionFecha` | `resolucionFecha` | timestamptz | No |  | Sí | No |  |  |
| `resolucionMotivo` | `resolucionMotivo` | text | No |  | Sí | No |  |  |
| `resolucionAccion` | `resolucionAccion` | text | No |  | Sí | No |  |  |
| `territorialNueva` | `territorialNueva` | text | No |  | Sí | No |  |  |
| `horasPtaOriginal` | `horasPtaOriginal` | int | No |  | Sí | No |  |  |
| `horasPtaNuevo` | `horasPtaNuevo` | int | No |  | Sí | No |  |  |
| `notificacionLeida` | `notificacionLeida` | boolean | No |  | No | No | false |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  |  |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  |  |

#### Tabla `academic_work_plan.Territorial`

- Entidad/definición: `TerritorialEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/territorial.entity.ts`
- Relaciones declaradas:
  - `sedes`: OneToMany -> `SedeEntity`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `nombre` | `nombre` | text | No |  | No | No |  |  |
| `codigo` | `codigo` | text | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' | Fecha de actualización automática |

#### Tabla `academic_work_plan.Usuario`

- Entidad/definición: `UsuarioEntity`
- Fuente: `TypeORM`
- Archivo: `backend/academic-work-plan-service/src/pta/entities/usuario.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `email` | `email` | text | No |  | No | No |  |  |
| `password` | `password` | text | No |  | No | No |  |  |
| `nombre` | `nombre` | text | No |  | Sí | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' | Fecha de actualización automática |


## api-gateway

No se detectaron entidades TypeORM ni tablas documentables en este microservicio.

## audit-service

Diagramas MER relacionados:
- [audit](<mer/06-may-2026/esap_db - audit.png>)

### Esquema `audit`

MER relacionado: [audit](<mer/06-may-2026/esap_db - audit.png>)

#### Tabla `audit.request_logs`

- Entidad/definición: `RequestLog`
- Fuente: `TypeORM`
- Archivo: `backend/audit-service/src/audit/entities/request-log.entity.ts`
- Índices de entidad: `['timestamp']`, `['method']`, `['module']`, `['action']`, `['userId']`, `['ipAddress']`, `['statusCode']`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `method` | `method` | varchar (length 10) | No |  | No | No |  |  |
| `url` | `url` | text | No |  | No | No |  |  |
| `path` | `path` | text | No |  | No | No |  |  |
| `query_params` | `queryParams` | jsonb | No |  | Sí | No |  |  |
| `module` | `module` | varchar (length 100) | No |  | Sí | No |  |  |
| `submodule` | `submodule` | varchar (length 100) | No |  | Sí | No |  |  |
| `action` | `action` | varchar (length 100) | No |  | Sí | No |  |  |
| `version` | `version` | varchar (length 10) | No |  | Sí | No |  |  |
| `ip_address` | `ipAddress` | varchar (length 45) | No |  | Sí | No |  |  |
| `user_agent` | `userAgent` | text | No |  | Sí | No |  |  |
| `origin` | `origin` | text | No |  | Sí | No |  |  |
| `referer` | `referer` | text | No |  | Sí | No |  |  |
| `user_id` | `userId` | bigint | No |  | Sí | No |  |  |
| `user_email` | `userEmail` | varchar (length 255) | No |  | Sí | No |  |  |
| `user_role` | `userRole` | varchar (length 100) | No |  | Sí | No |  |  |
| `status_code` | `statusCode` | integer | No |  | No | No |  |  |
| `response_time_ms` | `responseTimeMs` | integer | No |  | No | No |  |  |
| `response_size_bytes` | `responseSizeBytes` | integer | No |  | No | No | 0 |  |
| `request_body` | `requestBody` | jsonb | No |  | Sí | No |  |  |
| `request_body_size` | `requestBodySize` | integer | No |  | No | No | 0 |  |
| `has_large_body` | `hasLargeBody` | boolean | No |  | No | No | false |  |
| `response_body` | `responseBody` | jsonb | No |  | Sí | No |  |  |
| `response_body_size` | `responseBodySize` | integer | No |  | No | No | 0 |  |
| `has_large_response` | `hasLargeResponse` | boolean | No |  | No | No | false |  |
| `error_message` | `errorMessage` | text | No |  | Sí | No |  |  |
| `error_stack` | `errorStack` | text | No |  | Sí | No |  |  |
| `entity_name` | `entityName` | varchar (length 100) | No |  | Sí | No |  |  |
| `entity_id` | `entityId` | varchar (length 100) | No |  | Sí | No |  |  |
| `previous_data` | `previousData` | jsonb | No |  | Sí | No |  |  |
| `new_data` | `newData` | jsonb | No |  | Sí | No |  |  |
| `changes` | `changes` | jsonb | No |  | Sí | No |  |  |
| `timestamp` | `timestamp` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |


## auth-service

Diagramas MER relacionados:
- [auth](<mer/06-may-2026/esap_db - auth.png>)

Fuentes SQL detectadas:
- `backend/auth-service/schema.sql`

### Esquema `auth`

MER relacionado: [auth](<mer/06-may-2026/esap_db - auth.png>)

#### Tabla `auth.acreditaciones_programa`

- Entidad/definición: `AcreditacionPrograma`
- Fuente: `TypeORM`
- Archivo: `backend/auth-service/src/programas/acreditacion.entity.ts`
- Relaciones declaradas:
  - `programa`: ManyToOne -> `ProgramaAcademico` por `programa_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | bigint generated | Sí |  | No | No |  |  |
| `tipo` | `tipo` | text | No |  | No | No |  |  |
| `vigencia` | `vigencia` | date | No |  | No | No |  |  |

#### Tabla `auth.CARGOS`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/auth-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `ID_CARGO` | `ID_CARGO` | NUMERIC(11,0) | Sí |  | No | No |  |  |
| `COD_CARGO` | `COD_CARGO` | VARCHAR(20) | No |  | No | No |  |  |
| `ID_CARGO01` | `ID_CARGO01` | VARCHAR(20) | No |  | No | No |  |  |
| `NOM_CARGO` | `NOM_CARGO` | VARCHAR(250) | No |  | No | No |  |  |
| `FEC_ULT_ACT` | `FEC_ULT_ACT` | DATE | No |  | Sí | No |  |  |
| `FEC_CREACION` | `FEC_CREACION` | DATE | No |  | Sí | No |  |  |
| `NOM_DES_CARGO` | `NOM_DES_CARGO` | VARCHAR(200) | No |  | Sí | No |  |  |
| `USU_CREACION` | `USU_CREACION` | VARCHAR(20) | No |  | Sí | No |  |  |
| `USU_ACTUALIZACION` | `USU_ACTUALIZACION` | VARCHAR(20) | No |  | Sí | No |  |  |
| `COD_EQUIVALE` | `COD_EQUIVALE` | VARCHAR(20) | No |  | Sí | No |  |  |
| `TIP_JER_CARGO` | `TIP_JER_CARGO` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_JER_CARGO` | `COD_JER_CARGO` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_JER_CARGO` | `EMP_JER_CARGO` | NUMERIC(11,0) | No |  | Sí | No |  |  |

#### Tabla `auth.CENTROS_COSTO`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/auth-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `ID_CEN_COSTO` | `ID_CEN_COSTO` | NUMERIC(11,0) | Sí |  | No | No |  |  |
| `ID_EMPRESA` | `ID_EMPRESA` | NUMERIC(11,0) | No |  | No | No |  |  |
| `COD_CEN_COSTO` | `COD_CEN_COSTO` | VARCHAR(20) | No |  | No | No |  |  |
| `NOM_CEN_COSTO` | `NOM_CEN_COSTO` | VARCHAR(250) | No |  | No | No |  |  |
| `COD_CEN_PADRE` | `COD_CEN_PADRE` | NUMERIC(11,0) | No |  | No | No |  |  |
| `FEC_ULT_ACT` | `FEC_ULT_ACT` | DATE | No |  | Sí | No |  |  |
| `FEC_CREACION` | `FEC_CREACION` | DATE | No |  | Sí | No |  |  |
| `USU_CREACION` | `USU_CREACION` | VARCHAR(20) | No |  | Sí | No |  |  |
| `USU_ACTUALIZACION` | `USU_ACTUALIZACION` | VARCHAR(20) | No |  | Sí | No |  |  |
| `EST_CENTRO` | `EST_CENTRO` | NUMERIC(1,0) | No |  | No | No | 1 |  |
| `ID_GEOPOLITICA` | `ID_GEOPOLITICA` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `IND_MOVIMIENTO` | `IND_MOVIMIENTO` | NUMERIC(5,0) | No |  | No | No |  |  |

#### Tabla `auth.DEPENDENCIAS`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/auth-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `ID_DEPENDENCIA` | `ID_DEPENDENCIA` | NUMERIC(11,0) | Sí |  | No | No |  |  |
| `ID_EMPRESA` | `ID_EMPRESA` | NUMERIC(11,0) | No |  | No | No |  |  |
| `COD_DEPENDENCIA` | `COD_DEPENDENCIA` | VARCHAR(20) | No |  | No | No |  |  |
| `ID_CEN_COSTO` | `ID_CEN_COSTO` | NUMERIC(11,0) | No |  | No | No |  |  |
| `ID_DEPENDENCIA1` | `ID_DEPENDENCIA1` | NUMERIC(11,0) | No |  | No | No |  |  |
| `NOM_DEPENDENCIA` | `NOM_DEPENDENCIA` | VARCHAR(250) | No |  | Sí | No |  |  |
| `NOM_RESPONSABLE` | `NOM_RESPONSABLE` | VARCHAR(40) | No |  | Sí | No |  |  |
| `TIP_UNIDAD` | `TIP_UNIDAD` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `FEC_ULT_ACT` | `FEC_ULT_ACT` | DATE | No |  | Sí | No |  |  |
| `FEC_CREACION` | `FEC_CREACION` | DATE | No |  | Sí | No |  |  |
| `USU_CREACION` | `USU_CREACION` | VARCHAR(20) | No |  | Sí | No |  |  |
| `USU_ACTUALIZACION` | `USU_ACTUALIZACION` | VARCHAR(20) | No |  | Sí | No |  |  |
| `ID_TERCERO` | `ID_TERCERO` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `ID_SEDE` | `ID_SEDE` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `COD_TIP_UNIDAD` | `COD_TIP_UNIDAD` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_PAI_TELEFONO` | `COD_PAI_TELEFONO` | NUMERIC(6,0) | No |  | Sí | No |  |  |
| `COD_ARE_TELEFONO` | `COD_ARE_TELEFONO` | NUMERIC(6,0) | No |  | Sí | No |  |  |
| `NUM_TELEFONO` | `NUM_TELEFONO` | VARCHAR(30) | No |  | Sí | No |  |  |
| `COD_PAI_NUM_FAX` | `COD_PAI_NUM_FAX` | NUMERIC(6,0) | No |  | Sí | No |  |  |
| `COD_ARE_NUM_FAX` | `COD_ARE_NUM_FAX` | NUMERIC(6,0) | No |  | Sí | No |  |  |
| `NUM_APARTADO` | `NUM_APARTADO` | VARCHAR(20) | No |  | Sí | No |  |  |
| `URL_DEPENDENCIA` | `URL_DEPENDENCIA` | VARCHAR(250) | No |  | Sí | No |  |  |
| `DIR_EMAIL` | `DIR_EMAIL` | VARCHAR(250) | No |  | Sí | No |  |  |
| `ID_GEOPOLITICA` | `ID_GEOPOLITICA` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `ID_CARGO` | `ID_CARGO` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `TEL_EXT` | `TEL_EXT` | VARCHAR(5) | No |  | Sí | No |  |  |
| `DIR_DEPENDENCIA` | `DIR_DEPENDENCIA` | VARCHAR(250) | No |  | Sí | No |  |  |
| `NUM_FAX` | `NUM_FAX` | VARCHAR(30) | No |  | Sí | No |  |  |
| `GEN_TIP_UNIDAD` | `GEN_TIP_UNIDAD` | VARCHAR(6) | No |  | Sí | No | 'TIUORG' |  |
| `EMP_COD_TIP_UNIDAD` | `EMP_COD_TIP_UNIDAD` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `DIR_EMAIL2` | `DIR_EMAIL2` | VARCHAR(250) | No |  | Sí | No |  |  |
| `FIR_DEPENDENCIA1` | `FIR_DEPENDENCIA1` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `FIR_DEPENDENCIA2` | `FIR_DEPENDENCIA2` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `FIR_DEPENDENCIA3` | `FIR_DEPENDENCIA3` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `FIR_DEPENDENCIA4` | `FIR_DEPENDENCIA4` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `ID_DEP_FIR_CER1` | `ID_DEP_FIR_CER1` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `ID_DEP_FIR_CER2` | `ID_DEP_FIR_CER2` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `ID_DEP_FIR_CER3` | `ID_DEP_FIR_CER3` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `ID_DEP_FIR_CER4` | `ID_DEP_FIR_CER4` | NUMERIC(11,0) | No |  | Sí | No |  |  |

#### Tabla `auth.GENERICA`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/auth-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `TIP_TABLA` | `TIP_TABLA` | VARCHAR(6) | Sí |  | No | No |  |  |
| `COD_TABLA` | `COD_TABLA` | VARCHAR(6) | Sí |  | No | No |  |  |
| `NOM_TABLA` | `NOM_TABLA` | VARCHAR(20) | No |  | Sí | No |  |  |
| `COD_AUXILIAR1` | `COD_AUXILIAR1` | VARCHAR(250) | No |  | Sí | No |  |  |
| `COD_AUXILIAR2` | `COD_AUXILIAR2` | VARCHAR(250) | No |  | Sí | No |  |  |
| `NOM_ALIAS` | `NOM_ALIAS` | VARCHAR(1000) | No |  | Sí | No |  |  |
| `FEC_ULI_ACT` | `FEC_ULI_ACT` | DATE | No |  | Sí | No |  |  |
| `FEC_CREACION` | `FEC_CREACION` | DATE | No |  | Sí | No |  |  |
| `USU_CREACION` | `USU_CREACION` | VARCHAR(20) | No |  | Sí | No |  |  |
| `USU_ACTUALIZACION` | `USU_ACTUALIZACION` | VARCHAR(20) | No |  | Sí | No |  |  |
| `COD_SNIES` | `COD_SNIES` | VARCHAR(10) | No |  | Sí | No |  |  |
| `NOM_ESTRUCTURA` | `NOM_ESTRUCTURA` | VARCHAR(30) | No |  | Sí | No |  |  |
| `IND_PRIVADA` | `IND_PRIVADA` | NUMERIC(1,0) | No |  | No | No |  |  |
| `IND_VISIBLE` | `IND_VISIBLE` | NUMERIC(1,0) | No |  | Sí | No | 1 |  |
| `DES_TABLA` | `DES_TABLA` | VARCHAR(1000) | No |  | Sí | No |  |  |
| `COD_DIRECTORIO` | `COD_DIRECTORIO` | VARCHAR(256) | No |  | Sí | No |  |  |
| `ID_EMPRESA` | `ID_EMPRESA` | NUMERIC(11,0) | Sí |  | No | No |  |  |

#### Tabla `auth.geopolitica`

- Entidad/definición: `Geopolitica`
- Fuente: `TypeORM`
- Archivo: `backend/auth-service/src/users/geopolitica.entity.ts`
- Relaciones declaradas:
  - `padre`: ManyToOne -> `Geopolitica` por `id_padre`
  - `hijos`: OneToMany -> `Geopolitica`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id_geopolitica` | `idGeopolitica` | bigint | Sí |  | No | No |  |  |
| `cod_geopolitica` | `codGeopolitica` | varchar (length 20) | No |  | No | No |  |  |
| `cod_pais` | `codPais` | smallint | No |  | Sí | No |  |  |
| `cod_departamento` | `codDepartamento` | smallint | No |  | Sí | No |  |  |
| `cod_ciudad` | `codCiudad` | smallint | No |  | Sí | No |  |  |
| `nom_div_geopolitica` | `nomDivGeopolitica` | varchar (length 250) | No |  | Sí | No |  |  |
| `num_habitantes` | `numHabitantes` | bigint | No |  | Sí | No |  |  |
| `tip_division` | `tipDivision` | varchar (length 6) | No |  | Sí | No |  |  |
| `cod_division` | `codDivision` | varchar (length 6) | No |  | Sí | No |  |  |
| `cod_zon_geografica` | `codZonGeografica` | varchar (length 6) | No |  | Sí | No |  |  |
| `fec_ult_act` | `fecUltAct` | date | No |  | Sí | No |  |  |
| `fec_creacion` | `fecCreacion` | date | No |  | Sí | No |  |  |
| `usu_creacion` | `usuCreacion` | varchar (length 20) | No |  | Sí | No |  |  |
| `usu_actualizacion` | `usuActualizacion` | varchar (length 20) | No |  | Sí | No |  |  |
| `cod_lat` | `codLat` | numeric (precision 11, scale 8) | No |  | Sí | No |  |  |
| `cod_lon` | `codLon` | numeric (precision 11, scale 8) | No |  | Sí | No |  |  |
| `id_padre` | `idPadre` | bigint | No | ManyToOne -> Geopolitica | Sí | No |  |  |
| `ind_oculto` | `indOculto` | smallint | No |  | No | No | 0 |  |

#### Tabla `auth.INFORMACION_ADICIONAL_PERSONAS`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/auth-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `ID_TERCERO` | `ID_TERCERO` | NUMERIC(11) | Sí |  | No | No |  |  |
| `OBS_TERCERO` | `OBS_TERCERO` | VARCHAR(1000) | No |  | Sí | No |  |  |
| `NUM_VISA` | `NUM_VISA` | VARCHAR(20) | No |  | Sí | No |  |  |
| `CLA_VISA` | `CLA_VISA` | VARCHAR(20) | No |  | Sí | No |  |  |
| `CLA_LIBRETA` | `CLA_LIBRETA` | VARCHAR(20) | No |  | Sí | No |  |  |
| `GRU_SANGUINEO` | `GRU_SANGUINEO` | VARCHAR(2) | No |  | Sí | No |  |  |
| `FRH_SANGUINEO` | `FRH_SANGUINEO` | VARCHAR(2) | No |  | Sí | No |  |  |
| `ZON_ORIGEN` | `ZON_ORIGEN` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_RAZA` | `COD_RAZA` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_GRU_ETNICO` | `COD_GRU_ETNICO` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_RELIGION` | `COD_RELIGION` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_ESTATURA` | `COD_ESTATURA` | NUMERIC(5) | No |  | Sí | No |  |  |
| `FEC_ULT_ACT` | `FEC_ULT_ACT` | DATE | No |  | Sí | No |  |  |
| `FEC_CREACION` | `FEC_CREACION` | DATE | No |  | Sí | No |  |  |
| `USU_CREACION` | `USU_CREACION` | VARCHAR(20) | No |  | Sí | No |  |  |
| `USU_ACTUALIZACION` | `USU_ACTUALIZACION` | VARCHAR(20) | No |  | Sí | No |  |  |
| `CLA_TERCERO` | `CLA_TERCERO` | VARCHAR(20) | No |  | Sí | No |  |  |
| `IND_GRU_VULNERABLE` | `IND_GRU_VULNERABLE` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `IND_VIC_ARMADO` | `IND_VIC_ARMADO` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `ID_LUG_DESPLAZADO` | `ID_LUG_DESPLAZADO` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `IND_ORI_SECTOR` | `IND_ORI_SECTOR` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `IND_POL_ESPECIAL` | `IND_POL_ESPECIAL` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `NUM_PER_GRUPO` | `NUM_PER_GRUPO` | NUMERIC(4,0) | No |  | Sí | No |  |  |
| `NUM_PER_APORTAN` | `NUM_PER_APORTAN` | NUMERIC(4,0) | No |  | Sí | No |  |  |
| `VAL_ING_FAMILIAR` | `VAL_ING_FAMILIAR` | NUMERIC(14,2) | No |  | Sí | No |  |  |
| `IND_TIP_VIVIENDA` | `IND_TIP_VIVIENDA` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `IND_DEU_VIVIENDA` | `IND_DEU_VIVIENDA` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `POS_HERMANOS` | `POS_HERMANOS` | NUMERIC(2,0) | No |  | Sí | No |  |  |
| `COD_PAI_FRONTERIZO` | `COD_PAI_FRONTERIZO` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_CAPACIDAD` | `COD_CAPACIDAD` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_RESGUARDO` | `COD_RESGUARDO` | VARCHAR(6) | No |  | Sí | No |  |  |
| `CAM_FOTO` | `CAM_FOTO` | TEXT | No |  | Sí | No |  |  |
| `NOM_RESGUARDO` | `NOM_RESGUARDO` | VARCHAR(200) | No |  | Sí | No |  |  |
| `NIV_ESTUDIO` | `NIV_ESTUDIO` | VARCHAR(6) | No |  | Sí | No |  |  |
| `TIP_OCUPACION` | `TIP_OCUPACION` | VARCHAR(6) | No |  | Sí | No |  |  |
| `IND_APORTANTE` | `IND_APORTANTE` | NUMERIC(1,0) | No |  | No | No |  |  |
| `COD_GRU_SANGUINEO` | `COD_GRU_SANGUINEO` | VARCHAR(6) | No |  | Sí | No | 'GRUSAN' |  |
| `EMP_GRU_SANGUINEO` | `EMP_GRU_SANGUINEO` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `COD_FRH_SANGUINEO` | `COD_FRH_SANGUINEO` | VARCHAR(6) | No |  | Sí | No | 'FACHR' |  |
| `EMP_FRH_SANGUINEO` | `EMP_FRH_SANGUINEO` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `GEN_RAZA` | `GEN_RAZA` | VARCHAR(6) | No |  | Sí | No | 'CODRAZ' |  |
| `EMP_COD_RAZA` | `EMP_COD_RAZA` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `GEN_GRU_ETNICO` | `GEN_GRU_ETNICO` | VARCHAR(6) | No |  | Sí | No | 'GRUETN' |  |
| `EMP_COD_GRU_ETNICO` | `EMP_COD_GRU_ETNICO` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `GEN_RELIGION` | `GEN_RELIGION` | VARCHAR(6) | No |  | Sí | No | 'CODREL' |  |
| `EMP_COD_RELIGION` | `EMP_COD_RELIGION` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `GEN_CAPACIDAD` | `GEN_CAPACIDAD` | VARCHAR(6) | No |  | Sí | No | 'GRUCAP' |  |
| `EMP_COD_CAPACIDAD` | `EMP_COD_CAPACIDAD` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `GEN_RESGUARDO` | `GEN_RESGUARDO` | VARCHAR(6) | No |  | Sí | No | 'GRURES' |  |
| `EMP_COD_RESGUARDO` | `EMP_COD_RESGUARDO` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `COD_NIV_ESTUDIO` | `COD_NIV_ESTUDIO` | VARCHAR(6) | No |  | Sí | No | 'NIVFOR' |  |
| `EMP_NIV_ESTUDIO` | `EMP_NIV_ESTUDIO` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `COD_TIP_OCUPACION` | `COD_TIP_OCUPACION` | VARCHAR(6) | No |  | Sí | No | 'TIPOCU' |  |
| `EMP_TIP_OCUPACION` | `EMP_TIP_OCUPACION` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `TIP_SISPEN` | `TIP_SISPEN` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_SIPEN` | `COD_SIPEN` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_SISPEN` | `EMP_SISPEN` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `FEC_AFILIA_SISPEN` | `FEC_AFILIA_SISPEN` | DATE | No |  | Sí | No |  |  |
| `TIP_AFP` | `TIP_AFP` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_AFP` | `COD_AFP` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_AFP` | `EMP_AFP` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `CODIGO_AFP` | `CODIGO_AFP` | VARCHAR(120) | No |  | Sí | No |  |  |
| `URBANIZACION` | `URBANIZACION` | VARCHAR(4000) | No |  | Sí | No |  |  |
| `TELEFONO_2` | `TELEFONO_2` | VARCHAR(20) | No |  | Sí | No |  |  |
| `TIP_APELATIVO` | `TIP_APELATIVO` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_APELATIVO` | `COD_APELATIVO` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_APELATIVO` | `EMP_APELATIVO` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `TEL_OFICINA` | `TEL_OFICINA` | VARCHAR(20) | No |  | Sí | No |  |  |
| `NUM_CUENTA_1` | `NUM_CUENTA_1` | VARCHAR(100) | No |  | Sí | No |  |  |
| `ID_BANCO_1` | `ID_BANCO_1` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `TIP_CUENTA_1` | `TIP_CUENTA_1` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_CUENTA_1` | `COD_CUENTA_1` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_CUENTA_1` | `EMP_CUENTA_1` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `NUM_CUENTA_2` | `NUM_CUENTA_2` | VARCHAR(100) | No |  | Sí | No |  |  |
| `ID_BANCO_2` | `ID_BANCO_2` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `TIP_CUENTA_2` | `TIP_CUENTA_2` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_CUENTA_2` | `COD_CUENTA_2` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_CUENTA_2` | `EMP_CUENTA_2` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `TIP_TABVIA` | `TIP_TABVIA` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_TABVIA` | `COD_TABVIA` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_TABVIA` | `EMP_TABVIA` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `TEL_EMERGENCIA` | `TEL_EMERGENCIA` | VARCHAR(20) | No |  | Sí | No |  |  |
| `CONTACTO_EMERGENCIA` | `CONTACTO_EMERGENCIA` | VARCHAR(1000) | No |  | Sí | No |  |  |
| `TIP_SIT_PADRES` | `TIP_SIT_PADRES` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_SIT_PADRES` | `COD_SIT_PADRES` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_SIT_PADRES` | `EMP_SIT_PADRES` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `NUM_PER_TRABAJAN` | `NUM_PER_TRABAJAN` | NUMERIC(6,0) | No |  | Sí | No |  |  |
| `NUMERO_HERMANOS` | `NUMERO_HERMANOS` | NUMERIC(6,0) | No |  | Sí | No |  |  |
| `NUM_HERMANOS_EDUC_SUPERIOR` | `NUM_HERMANOS_EDUC_SUPERIOR` | NUMERIC(2,0) | No |  | Sí | No |  |  |
| `TIP_COSTEO_ESTUDIOS` | `TIP_COSTEO_ESTUDIOS` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_COSTEO_ESTUDIOS` | `COD_COSTEO_ESTUDIOS` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_COSTEO_ESTUDIOS` | `EMP_COSTEO_ESTUDIOS` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `NUMERO_HIJOS` | `NUMERO_HIJOS` | NUMERIC(2,0) | No |  | Sí | No |  |  |
| `PERFIL_PROFESIONAL` | `PERFIL_PROFESIONAL` | VARCHAR(4000) | No |  | Sí | No |  |  |
| `ANIOS_EXPERIENCIA` | `ANIOS_EXPERIENCIA` | NUMERIC(2,0) | No |  | Sí | No |  |  |
| `TIP_PUE_INDG` | `TIP_PUE_INDG` | VARCHAR(6) | No |  | Sí | No | 'CODPUE' |  |
| `COD_PUE_INDG` | `COD_PUE_INDG` | VARCHAR(6) | No |  | Sí | No | 'CODZON' |  |
| `EMP_PUE_INDG` | `EMP_PUE_INDG` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `TIP_ZONA_RES` | `TIP_ZONA_RES` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_ZONA_RES` | `COD_ZONA_RES` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_ZONA_RES` | `EMP_ZONA_RES` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `TIP_COM_NEGRA` | `TIP_COM_NEGRA` | VARCHAR(6) | No |  | Sí | No | 'CODCOM' |  |
| `COD_COM_NEGRA` | `COD_COM_NEGRA` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_COM_NEGRA` | `EMP_COM_NEGRA` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `IND_REL_FAMILIAR` | `IND_REL_FAMILIAR` | NUMERIC(1,0) | No |  | Sí | No | 0 |  |
| `TIP_REL_FAMILIAR` | `TIP_REL_FAMILIAR` | VARCHAR(6) | No |  | Sí | No | 'TIPREL' |  |
| `COD_REL_FAMILIAR` | `COD_REL_FAMILIAR` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_REL_FAMILIAR` | `EMP_REL_FAMILIAR` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `TIP_DISCAPACIDAD` | `TIP_DISCAPACIDAD` | VARCHAR(6) | No |  | Sí | No | 'CODDIS' |  |
| `COD_DISCAPACIDAD` | `COD_DISCAPACIDAD` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_DISCAPACIDAD` | `EMP_DISCAPACIDAD` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `ID_REGIMEN_ESPECIAL` | `ID_REGIMEN_ESPECIAL` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `TIP_REGIMEN` | `TIP_REGIMEN` | VARCHAR(6) | No |  | Sí | No | 'REGESP' |  |
| `COD_REGIMEN` | `COD_REGIMEN` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_REGIMEN` | `EMP_REGIMEN` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `TIP_LEY_BENEFICIO` | `TIP_LEY_BENEFICIO` | VARCHAR(6) | No |  | Sí | No | 'BENLEY' |  |
| `COD_LEY_BENEFICIO` | `COD_LEY_BENEFICIO` | VARCHAR(6) | No |  | Sí | No |  |  |
| `EMP_LEY_BENEFICIO` | `EMP_LEY_BENEFICIO` | NUMERIC(11,0) | No |  | Sí | No |  |  |

#### Tabla `auth.module`

- Entidad/definición: `Module`
- Fuente: `TypeORM`
- Archivo: `backend/auth-service/src/users/module.entity.ts`
- Relaciones declaradas:
  - `permissions`: OneToMany -> `Permission`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id_module` | `id_module` | uuid generated | Sí |  | No | No |  |  |
| `code` | `code` | varchar (length 50) | No |  | No | Sí |  |  |
| `name` | `name` | varchar (length 100) | No |  | No | No |  |  |
| `description` | `description` | text | No |  | Sí | No |  |  |
| `icon` | `icon` | varchar (length 50) | No |  | No | No | Shield |  |
| `color` | `color` | varchar (length 20) | No |  | No | No | #003DA5 |  |
| `display_order` | `display_order` | integer | No |  | No | No | 0 |  |
| `category` | `category` | 'backoffice' \| 'portal' (length 30) | No |  | No | No | backoffice |  |
| `is_active` | `is_active` | boolean | No |  | No | No | true |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `auth.permission`

- Entidad/definición: `Permission`
- Fuente: `TypeORM`
- Archivo: `backend/auth-service/src/users/permission.entity.ts`
- Relaciones declaradas:
  - `roles`: ManyToMany -> `Role`
  - `module`: ManyToOne -> `Module` por `id_module`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id_permission` | `id_permission` | uuid generated | Sí |  | No | No |  |  |
| `code` | `code` | varchar (length 100) | No |  | No | Sí |  |  |
| `name` | `name` | varchar (length 150) | No |  | No | No |  |  |
| `description` | `description` | text | No |  | Sí | No |  |  |
| `id_module` | `id_module` | uuid | No | ManyToOne -> Module | No | No |  |  |
| `is_active` | `is_active` | boolean | No |  | No | No | true |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `auth.PERSONAS`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/auth-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `ID_TERCERO` | `ID_TERCERO` | NUMERIC(11) | Sí |  | No | No |  |  |
| `NUM_IDENTIFICACION` | `NUM_IDENTIFICACION` | VARCHAR(30) | No |  | No | No |  |  |
| `TIP_IDENTIFICACION` | `TIP_IDENTIFICACION` | VARCHAR(6) | No |  | No | No |  |  |
| `NOM_LARGO` | `NOM_LARGO` | VARCHAR(1000) | No |  | No | No |  |  |
| `SIG_TERCERO` | `SIG_TERCERO` | VARCHAR(10) | No |  | Sí | No |  |  |
| `NOM_TERCERO` | `NOM_TERCERO` | VARCHAR(250) | No |  | No | No |  |  |
| `PRI_APELLIDO` | `PRI_APELLIDO` | VARCHAR(250) | No |  | Sí | No |  |  |
| `SEG_APELLIDO` | `SEG_APELLIDO` | VARCHAR(250) | No |  | Sí | No |  |  |
| `GEN_TERCERO` | `GEN_TERCERO` | VARCHAR(6) | No |  | No | No |  |  |
| `EST_CIVIL` | `EST_CIVIL` | VARCHAR(6) | No |  | Sí | No |  |  |
| `FEC_NACIMIENTO` | `FEC_NACIMIENTO` | DATE | No |  | Sí | No |  |  |
| `COD_NACIONALIDAD` | `COD_NACIONALIDAD` | VARCHAR(6) | No |  | Sí | No |  |  |
| `IND_VIVE` | `IND_VIVE` | NUMERIC(1,0) | No |  | Sí | No | 1 |  |
| `DIR_RESIDENCIA` | `DIR_RESIDENCIA` | VARCHAR(250) | No |  | Sí | No |  |  |
| `DIR_EMAIL` | `DIR_EMAIL` | VARCHAR(100) | No |  | Sí | No |  |  |
| `TEL_RESIDENCIA` | `TEL_RESIDENCIA` | VARCHAR(20) | No |  | Sí | No |  |  |
| `TEL_CELULAR` | `TEL_CELULAR` | VARCHAR(20) | No |  | Sí | No |  |  |
| `ID_UBI_RES` | `ID_UBI_RES` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `ID_UBI_NAC` | `ID_UBI_NAC` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `NUM_TARJETA_MILITAR` | `NUM_TARJETA_MILITAR` | VARCHAR(20) | No |  | Sí | No |  |  |
| `DIS_TARJETA_MILITAR` | `DIS_TARJETA_MILITAR` | VARCHAR(8) | No |  | Sí | No |  |  |
| `COD_ANTERIOR` | `COD_ANTERIOR` | VARCHAR(30) | No |  | Sí | No |  |  |
| `COD_TERCERO` | `COD_TERCERO` | VARCHAR(12) | No |  | Sí | No |  |  |
| `FEC_CREACION` | `FEC_CREACION` | DATE | No |  | Sí | No |  |  |
| `FEC_MODIFICACION` | `FEC_MODIFICACION` | DATE | No |  | Sí | No |  |  |
| `USU_CREACION` | `USU_CREACION` | VARCHAR(20) | No |  | Sí | No |  |  |
| `USU_MODIFICACION` | `USU_MODIFICACION` | VARCHAR(20) | No |  | Sí | No |  |  |
| `GRU_SANGUINEO` | `GRU_SANGUINEO` | VARCHAR(2) | No |  | Sí | No |  |  |
| `FRH_SANGUINEO` | `FRH_SANGUINEO` | VARCHAR(2) | No |  | Sí | No |  |  |
| `ZON_ORIGEN` | `ZON_ORIGEN` | VARCHAR(6) | No |  | Sí | No |  |  |
| `ID_UBI_DOCUMENTO` | `ID_UBI_DOCUMENTO` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `DIG_CHEQUEO` | `DIG_CHEQUEO` | CHAR(1) | No |  | Sí | No |  |  |
| `IND_SORDERA` | `IND_SORDERA` | NUMERIC(6,0) | No |  | Sí | No |  |  |
| `IND_PROB_MOTORES` | `IND_PROB_MOTORES` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `IND_INVIDENTE` | `IND_INVIDENTE` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `IND_VISION_PARCIAL` | `IND_VISION_PARCIAL` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `FEC_EXP_DOCUMENTO` | `FEC_EXP_DOCUMENTO` | DATE | No |  | Sí | No |  |  |
| `FEC_ULT_ACT_LABORAL` | `FEC_ULT_ACT_LABORAL` | DATE | No |  | Sí | No |  |  |
| `IND_ACT_LABORAL` | `IND_ACT_LABORAL` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `COD_CAT_TERCERO` | `COD_CAT_TERCERO` | VARCHAR(5) | No |  | Sí | No |  |  |
| `ATR_TERCERO` | `ATR_TERCERO` | VARCHAR(6) | No |  | Sí | No |  |  |
| `NOM_ARC_FOTO` | `NOM_ARC_FOTO` | VARCHAR(60) | No |  | Sí | No |  |  |
| `NIV_ING_FAMILIAR` | `NIV_ING_FAMILIAR` | NUMERIC(6,0) | No |  | Sí | No |  |  |
| `NOM_BARRIO` | `NOM_BARRIO` | VARCHAR(100) | No |  | Sí | No |  |  |
| `DEP_ECONOMICA` | `DEP_ECONOMICA` | VARCHAR(6) | No |  | Sí | No |  |  |
| `NUM_PER_FAMILIAR` | `NUM_PER_FAMILIAR` | NUMERIC(3,0) | No |  | Sí | No |  |  |
| `NUM_PER_A_CARGO` | `NUM_PER_A_CARGO` | NUMERIC(6,0) | No |  | Sí | No |  |  |
| `ID_BARRIO` | `ID_BARRIO` | NUMERIC(6,0) | No |  | Sí | No |  |  |
| `SEG_NOMBRE` | `SEG_NOMBRE` | VARCHAR(250) | No |  | Sí | No |  |  |
| `COD_PAI_TEL` | `COD_PAI_TEL` | VARCHAR(5) | No |  | Sí | No |  |  |
| `COD_ARE_TEL` | `COD_ARE_TEL` | VARCHAR(5) | No |  | Sí | No |  |  |
| `COD_ARE_NUM_FAX` | `COD_ARE_NUM_FAX` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_ARE_TEL_RESIDENCIA` | `COD_ARE_TEL_RESIDENCIA` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_PAI_NUM_FAX` | `COD_PAI_NUM_FAX` | VARCHAR(6) | No |  | Sí | No |  |  |
| `COD_PAI_TEL_RESIDENCIA` | `COD_PAI_TEL_RESIDENCIA` | VARCHAR(6) | No |  | Sí | No |  |  |
| `ID_EMPRESA` | `ID_EMPRESA` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `NUM_FAX` | `NUM_FAX` | VARCHAR(12) | No |  | Sí | No |  |  |
| `IND_ACT_DAT_TERCERO` | `IND_ACT_DAT_TERCERO` | NUMERIC(1,0) | No |  | Sí | No | 0 |  |
| `COD_USUARIO_LDAP` | `COD_USUARIO_LDAP` | VARCHAR(200) | No |  | Sí | No |  |  |
| `DIR_EMAIL_PER` | `DIR_EMAIL_PER` | VARCHAR(100) | No |  | Sí | No |  |  |
| `COD_TIP_IDENTIFICACION` | `COD_TIP_IDENTIFICACION` | VARCHAR(6) | No |  | No | No | 'TIPIDE' |  |
| `EMP_TIP_IDENTIFICACION` | `EMP_TIP_IDENTIFICACION` | NUMERIC(11,0) | No |  | No | No | 0 |  |
| `TIP_GEN_TERCERO` | `TIP_GEN_TERCERO` | VARCHAR(6) | No |  | No | No | 'TIPGEN' |  |
| `EMP_GEN_TERCERO` | `EMP_GEN_TERCERO` | NUMERIC(11,0) | No |  | No | No | 0 |  |
| `NUM_EST_ECONOMICO` | `NUM_EST_ECONOMICO` | VARCHAR(6) | No |  | Sí | No |  |  |
| `TIP_EST_ECONOMICO` | `TIP_EST_ECONOMICO` | VARCHAR(6) | No |  | Sí | No | 'ESTRAT' |  |
| `EMP_EST_ECONOMICO` | `EMP_EST_ECONOMICO` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `EPS_TERCERO` | `EPS_TERCERO` | VARCHAR(6) | No |  | Sí | No |  |  |
| `TIP_EPS_TERCERO` | `TIP_EPS_TERCERO` | VARCHAR(6) | No |  | Sí | No | 'CODEPS' |  |
| `EMP_EPS_TERCERO` | `EMP_EPS_TERCERO` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `TIP_EST_CIVIL` | `TIP_EST_CIVIL` | VARCHAR(6) | No |  | Sí | No | 'ESTCIV' |  |
| `EMP_EST_CIVIL` | `EMP_EST_CIVIL` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `NAT_TERCERO` | `NAT_TERCERO` | VARCHAR(6) | No |  | Sí | No |  |  |
| `TIP_NAT_TERCERO` | `TIP_NAT_TERCERO` | VARCHAR(6) | No |  | Sí | No | 'NATTER' |  |
| `EMP_NAT_TERCERO` | `EMP_NAT_TERCERO` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `TIP_COD_NACIONALIDAD` | `TIP_COD_NACIONALIDAD` | VARCHAR(6) | No |  | Sí | No | 'TIPNAC' |  |
| `EMP_COD_NACIONALIDAD` | `EMP_COD_NACIONALIDAD` | NUMERIC(11,0) | No |  | Sí | No | 0 |  |
| `FEC_ACT_DAT_TERCERO` | `FEC_ACT_DAT_TERCERO` | DATE | No |  | Sí | No |  |  |
| `FACEBOOK` | `FACEBOOK` | VARCHAR(100) | No |  | Sí | No |  |  |
| `TWITTER` | `TWITTER` | VARCHAR(200) | No |  | Sí | No |  |  |
| `LINKEDIN` | `LINKEDIN` | VARCHAR(200) | No |  | Sí | No |  |  |
| `SKYPE` | `SKYPE` | VARCHAR(100) | No |  | Sí | No |  |  |
| `WHATSAPP` | `WHATSAPP` | VARCHAR(100) | No |  | Sí | No |  |  |
| `IND_CON_LEGALES` | `IND_CON_LEGALES` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `IND_HOJA_VIDA` | `IND_HOJA_VIDA` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `IND_HABEAS_DATA` | `IND_HABEAS_DATA` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `FEC_HABEAS_DATA` | `FEC_HABEAS_DATA` | DATE | No |  | Sí | No |  |  |
| `IP_HABEAS_DATA` | `IP_HABEAS_DATA` | VARCHAR(4000) | No |  | Sí | No |  |  |
| `NUM_PASAPORTE` | `NUM_PASAPORTE` | VARCHAR(200) | No |  | Sí | No |  |  |
| `FEC_VIG_PASAPORTE` | `FEC_VIG_PASAPORTE` | DATE | No |  | Sí | No |  |  |
| `NOM_DOC_FIRMA` | `NOM_DOC_FIRMA` | VARCHAR(250) | No |  | Sí | No |  |  |
| `EXT_DOC_FIRMA` | `EXT_DOC_FIRMA` | VARCHAR(10) | No |  | Sí | No |  |  |
| `DOC_FIRMA` | `DOC_FIRMA` | BYTEA | No |  | Sí | No |  |  |
| `TAM_DOC_FIRMA` | `TAM_DOC_FIRMA` | NUMERIC(32,0) | No |  | Sí | No |  |  |
| `IND_EXP_LABORAR` | `IND_EXP_LABORAR` | NUMERIC(1,0) | No |  | Sí | No |  |  |
| `IND_HABEAS_DATA_EGRE` | `IND_HABEAS_DATA_EGRE` | NUMERIC(1,0) | No |  | Sí | No | 0 |  |
| `FEC_HABEAS_DATA_EGRE` | `FEC_HABEAS_DATA_EGRE` | DATE | No |  | Sí | No |  |  |
| `IP_HABEAS_DATA_EGRE` | `IP_HABEAS_DATA_EGRE` | VARCHAR(4000) | No |  | Sí | No |  |  |
| `PWD_CVLAC` | `PWD_CVLAC` | VARCHAR(4000) | No |  | Sí | No |  |  |
| `NACIONALIDAD_CVLAC` | `NACIONALIDAD_CVLAC` | VARCHAR(200) | No |  | Sí | No |  |  |
| `NOMBRES_CVLAC` | `NOMBRES_CVLAC` | VARCHAR(4000) | No |  | Sí | No |  |  |
| `NUM_IDENTI_CVLAC` | `NUM_IDENTI_CVLAC` | VARCHAR(20) | No |  | Sí | No |  |  |

#### Tabla `auth.programas_academicos`

- Entidad/definición: `ProgramaAcademico`
- Fuente: `TypeORM`
- Archivo: `backend/auth-service/src/programas/programa.entity.ts`
- Relaciones declaradas:
  - `sede`: ManyToOne -> `Sede` por `sede_id`
  - `registroCalificado`: OneToOne -> `RegistroCalificado`
  - `acreditaciones`: OneToMany -> `AcreditacionPrograma`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | bigint generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | text | No |  | No | Sí |  |  |
| `nombre` | `nombre` | text | No |  | No | No |  |  |
| `nivel_formacion` | `nivelFormacion` | text | No |  | No | No |  |  |
| `modalidad` | `modalidad` | text | No |  | No | No |  |  |
| `jornada` | `jornada` | text | No |  | No | No |  |  |
| `duracion_semestres` | `duracionSemestres` | int | No |  | No | No |  |  |
| `creditos` | `creditos` | int | No |  | No | No |  |  |
| `facultad` | `facultad` | text | No |  | Sí | No |  |  |
| `estado` | `estado` | text | No |  | No | No | Activo |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `perfil_egresado` | `perfilEgresado` | text | No |  | Sí | No |  |  |
| `requisitos_ingreso` | `requisitosIngreso` | text (array) | No |  | Sí | No |  |  |
| `costo_matricula` | `costoMatricula` | numeric (precision 14, scale 2) | No |  | Sí | No |  |  |
| `estudiantes_activos` | `estudiantesActivos` | int | No |  | No | No | 0 |  |
| `graduados` | `graduados` | int | No |  | No | No | 0 |  |
| `docentes_asignados` | `docentesAsignados` | int | No |  | No | No | 0 |  |
| `fecha_creacion` | `fechaCreacion` | date | No |  | Sí | No |  |  |
| `ultima_actualizacion` | `ultimaActualizacion` | date | No |  | Sí | No |  |  |

#### Tabla `auth.registros_calificados`

- Entidad/definición: `RegistroCalificado`
- Fuente: `TypeORM`
- Archivo: `backend/auth-service/src/programas/registro-calificado.entity.ts`
- Relaciones declaradas:
  - `programa`: OneToOne -> `ProgramaAcademico` por `programa_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | bigint generated | Sí |  | No | No |  |  |
| `numero` | `numero` | text | No |  | No | No |  |  |
| `fecha_emision` | `fechaEmision` | date | No |  | No | No |  |  |
| `vigencia` | `vigencia` | date | No |  | No | No |  |  |

#### Tabla `auth.role`

- Entidad/definición: `Role`
- Fuente: `TypeORM`
- Archivo: `backend/auth-service/src/users/role.entity.ts`
- Relaciones declaradas:
  - `users`: ManyToMany -> `User`
  - `permissions`: ManyToMany -> `Permission`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `code` | `code` | varchar | No |  | No | Sí |  |  |
| `name` | `name` | varchar | No |  | No | Sí |  |  |
| `description` | `description` | varchar | No |  | Sí | No |  |  |
| `icon` | `icon` | varchar | No |  | No | No | Shield |  |
| `color` | `color` | varchar | No |  | No | No | #003DA5 |  |
| `type` | `type` | 'sistema' \| 'personalizado' | No |  | No | No | personalizado |  |
| `category` | `category` | 'backoffice' \| 'portal' \| 'sistema' \| 'academico' \| 'directivo' \| 'administrativo' | No |  | No | No | sistema |  |
| `is_active` | `is_active` | boolean | No |  | No | No | true |  |
| `requires_2fa` | `requires_2fa` | boolean | No |  | No | No | false |  |
| `created_by` | `created_by` | varchar | No |  | Sí | No |  |  |
| `updated_by` | `updated_by` | varchar | No |  | Sí | No |  |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `auth.ROLE_PERMISSIONS`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/auth-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `ID_ROL` | `ID_ROL` | uuid | Sí |  | No | No |  | REFERENCES auth.ROLE(ID_ROL) |
| `ID_PERMISSION` | `ID_PERMISSION` | uuid | Sí |  | No | No |  | REFERENCES auth.PERMISSION(ID_PERMISSION) |
| `IS_ACTIVE` | `IS_ACTIVE` | bool | No |  | Sí | No | true |  |
| `CREATED_AT` | `CREATED_AT` | TIMESTAMPTZ | No |  | Sí | No |  |  |
| `UPDATED_AT` | `UPDATED_AT` | TIMESTAMPTZ | No |  | Sí | No |  |  |

#### Tabla `auth.seccionales`

- Entidad/definición: `Seccional`
- Fuente: `TypeORM`
- Archivo: `backend/auth-service/src/users/seccional.entity.ts`
- Relaciones declaradas:
  - `ubicacion`: ManyToOne -> `Geopolitica` por `id_ubi_seccional`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id_seccional` | `idSeccional` | bigint generated | Sí |  | No | No |  |  |
| `nom_seccional` | `nomSeccional` | varchar (length 100) | No |  | No | No |  |  |
| `dir_seccional` | `dirSeccional` | varchar (length 250) | No |  | Sí | No |  |  |
| `id_ubi_seccional` | `idUbiSeccional` | bigint | No | ManyToOne -> Geopolitica | Sí | No |  |  |
| `fec_creacion` | `fecCreacion` | date | No |  | Sí | No |  |  |
| `fec_ult_act` | `fecUltAct` | date | No |  | Sí | No |  |  |
| `usu_creacion` | `usuCreacion` | varchar (length 20) | No |  | Sí | No |  |  |
| `usu_actualizacion` | `usuActualizacion` | varchar (length 20) | No |  | Sí | No |  |  |
| `cod_seccional` | `codSeccional` | varchar (length 5) | No |  | Sí | No |  |  |
| `id_empresa` | `idEmpresa` | bigint | No |  | Sí | No |  |  |
| `nit_seccional` | `nitSeccional` | varchar (length 15) | No |  | Sí | No |  |  |

#### Tabla `auth.sedes`

- Entidad/definición: `Sede`
- Fuente: `TypeORM`
- Archivo: `backend/auth-service/src/users/sede.entity.ts`
- Relaciones declaradas:
  - `geopolitica`: ManyToOne -> `Geopolitica` por `id_geopolitica`
  - `seccional`: ManyToOne -> `Seccional` por `id_seccional`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id_sede` | `idSede` | bigint | Sí |  | No | No |  |  |
| `id_empresa` | `idEmpresa` | bigint | No |  | Sí | No | 1 |  |
| `cod_sede` | `codSede` | varchar (length 5) | No |  | Sí | No |  |  |
| `nom_sede` | `nomSede` | varchar (length 50) | No |  | No | No |  |  |
| `id_geopolitica` | `idGeopolitica` | bigint | No | ManyToOne -> Geopolitica | Sí | No |  |  |
| `dir_sede` | `dirSede` | varchar (length 250) | No |  | Sí | No |  |  |
| `fec_ult_act` | `fecUltAct` | date | No |  | Sí | No |  |  |
| `fec_creacion` | `fecCreacion` | date | No |  | Sí | No |  |  |
| `usu_creacion` | `usuCreacion` | varchar (length 20) | No |  | Sí | No |  |  |
| `usu_actualizacion` | `usuActualizacion` | varchar (length 20) | No |  | Sí | No |  |  |
| `cod_atributo` | `codAtributo` | varchar (length 10) | No |  | Sí | No |  |  |
| `id_seccional` | `idSeccional` | bigint | No | ManyToOne -> Seccional | Sí | No |  |  |
| `sede_act` | `sedeAct` | varchar (length 30) | No |  | Sí | No |  |  |
| `num_latitud` | `numLatitud` | numeric (precision 32, scale 29) | No |  | Sí | No |  |  |
| `num_longitud` | `numLongitud` | numeric (precision 32, scale 29) | No |  | Sí | No |  |  |
| `tel_sede` | `telSede` | varchar (length 50) | No |  | Sí | No |  |  |
| `email_sede` | `emailSede` | varchar (length 100) | No |  | Sí | No |  |  |
| `capacidad_estudiantes` | `capacidadEstudiantes` | int | No |  | Sí | No |  |  |
| `capacidad_docentes` | `capacidadDocentes` | int | No |  | Sí | No |  |  |
| `permite_inscripciones` | `permiteInscripciones` | boolean | No |  | Sí | No | true |  |
| `permite_matriculas` | `permiteMatriculas` | boolean | No |  | Sí | No | true |  |
| `visible_portal` | `visiblePortal` | boolean | No |  | Sí | No | true |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |

#### Tabla `auth.TIPOS_TERCERO`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/auth-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `ID_TIP_TERCERO` | `ID_TIP_TERCERO` | NUMERIC(11,0) | Sí |  | No | No |  |  |
| `ID_TERCERO` | `ID_TERCERO` | NUMERIC(11,0) | No |  | No | No |  |  |
| `TIP_TABLA` | `TIP_TABLA` | VARCHAR(6) | No |  | No | No |  |  |
| `COD_TABLA` | `COD_TABLA` | VARCHAR(6) | No |  | No | No |  |  |
| `EMP_TABLA` | `EMP_TABLA` | NUMERIC(11,0) | No |  | No | No | 1 |  |
| `NOM_TIPO_TERCERO` | `NOM_TIPO_TERCERO` | VARCHAR(30) | No |  | Sí | No |  |  |
| `FEC_ULT_ACT` | `FEC_ULT_ACT` | DATE | No |  | Sí | No |  |  |
| `FEC_CREACION` | `FEC_CREACION` | DATE | No |  | Sí | No |  |  |
| `USU_CREACION` | `USU_CREACION` | VARCHAR(20) | No |  | Sí | No |  |  |
| `USU_ACTUALIZACION` | `USU_ACTUALIZACION` | VARCHAR(20) | No |  | Sí | No |  |  |
| `CLA_TERCERO` | `CLA_TERCERO` | VARCHAR(64) | No |  | Sí | No |  |  |
| `GRA_EST_ALUMNO` | `GRA_EST_ALUMNO` | VARCHAR(10) | No |  | Sí | No |  |  |
| `IND_ACTIVO` | `IND_ACTIVO` | NUMERIC(1,0) | No |  | No | No |  |  |
| `IND_RESTAURA` | `IND_RESTAURA` | NUMERIC(1,0) | No |  | No | No |  |  |
| `IND_DEFECTO` | `IND_DEFECTO` | NUMERIC(1,0) | No |  | No | No |  |  |
| `ID_EMPRESA` | `ID_EMPRESA` | NUMERIC(11,0) | No |  | No | No |  |  |
| `FEC_FIN` | `FEC_FIN` | DATE | No |  | Sí | No |  |  |
| `FEC_CLA_TERCERO` | `FEC_CLA_TERCERO` | DATE | No |  | Sí | No |  |  |

#### Tabla `auth.USER`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/auth-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `ID_USER` | `ID_USER` | uuid | Sí |  | No | No |  |  |
| `USERNAME` | `USERNAME` | VARCHAR(100) | No |  | No | No |  |  |
| `PASSWORD` | `PASSWORD` | VARCHAR(255) | No |  | No | No |  |  |
| `ID_TERCERO` | `ID_TERCERO` | NUMERIC(11,0) | No |  | Sí | No |  |  |
| `IS_ACTIVE` | `IS_ACTIVE` | bool | No |  | Sí | No | true |  |
| `TOKEN` | `TOKEN` | NUMERIC(6) | No |  | Sí | No |  |  |
| `CREATED_AT` | `CREATED_AT` | TIMESTAMPTZ | No |  | Sí | No |  |  |
| `UPDATED_AT` | `UPDATED_AT` | TIMESTAMPTZ | No |  | Sí | No |  |  |

#### Tabla `auth.USER_ROLES`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/auth-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `ID_USER` | `ID_USER` | uuid | Sí |  | No | No |  | REFERENCES auth.USER(ID_USER) |
| `ID_ROL` | `ID_ROL` | uuid | Sí |  | No | No |  | REFERENCES auth.ROLE(ID_ROL) |
| `IS_ACTIVE` | `IS_ACTIVE` | bool | No |  | Sí | No | true |  |
| `CREATED_AT` | `CREATED_AT` | TIMESTAMPTZ | No |  | Sí | No |  |  |
| `UPDATED_AT` | `UPDATED_AT` | TIMESTAMPTZ | No |  | Sí | No |  |  |

### Esquema `default`

MER relacionado: [auth](<mer/06-may-2026/esap_db - auth.png>)

#### Tabla `personas`

- Entidad/definición: `Person`
- Fuente: `TypeORM`
- Archivo: `backend/auth-service/src/users/person.entity.ts`
- Relaciones declaradas:
  - `user`: OneToOne -> `User`
  - `seccional`: ManyToOne -> `Seccional` por `id_seccional`
  - `sede`: ManyToOne -> `Sede` por `id_sede`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id_person` | `id` | uuid | Sí |  | No | No |  |  |
| `id_tercero` | `idTercero` | bigint | No |  | Sí | No |  |  |
| `num_identificacion` | `identification_number` | varchar | No |  | No | No |  |  |
| `tip_identificacion` | `identification_type` | varchar | No |  | No | No |  |  |
| `nom_largo` | `full_name` | varchar | No |  | No | No |  |  |
| `nom_tercero` | `first_name` | varchar | No |  | No | No |  |  |
| `pri_apellido` | `last_name` | varchar | No |  | No | No |  |  |
| `gen_tercero` | `gender` | varchar | No |  | No | No |  |  |
| `dir_email` | `email` | varchar | No |  | No | No |  |  |
| `tel_celular` | `phone` | varchar | No |  | Sí | No |  |  |
| `fec_creacion` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `fec_modificacion` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `id_seccional` | `idSeccional` | bigint | No | ManyToOne -> Seccional | Sí | No |  |  |
| `id_sede` | `idSede` | bigint | No | ManyToOne -> Sede | Sí | No |  |  |

#### Tabla `user`

- Entidad/definición: `User`
- Fuente: `TypeORM`
- Archivo: `backend/auth-service/src/users/user.entity.ts`
- Relaciones declaradas:
  - `person`: OneToOne -> `Person` por `id_person`
  - `roles`: ManyToMany -> `Role`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id_user` | `id_user` | uuid generated | Sí |  | No | No |  |  |
| `public_id` | `public_id` | uuid | No |  | No | Sí | () => 'gen_random_uuid()' |  |
| `username` | `username` | varchar | No |  | No | Sí |  |  |
| `password_hash` | `password_hash` | varchar | No |  | No | No |  |  |
| `id_person` | `id_person` | uuid | No | OneToOne -> Person | Sí | No |  |  |
| `is_active` | `is_active` | boolean | No |  | No | No | true |  |
| `token` | `token` | numeric (precision 6, scale 0) | No |  | Sí | No |  |  |
| `token_microsoft` | `tokenMicrosoft` | varchar (length 255) | No |  | Sí | No |  |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `user_roles`

- Entidad/definición: `UserRole`
- Fuente: `TypeORM`
- Archivo: `backend/auth-service/src/users/user-role.entity.ts`
- Relaciones declaradas:
  - `user`: ManyToOne -> `User` por `id_user`
  - `role`: ManyToOne -> `Role` por `id_rol`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id_user` | `user` | uuid | Sí | ManyToOne -> User | No | No |  |  |
| `id_rol` | `role` | uuid | Sí | ManyToOne -> Role | No | No |  |  |
| `is_active` | `is_active` | boolean | No |  | No | No | true |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |


## certification-service

Diagramas MER relacionados:
- [certification](<mer/06-may-2026/esap_db - certification.png>)

### Esquema `default`

MER relacionado: [certification](<mer/06-may-2026/esap_db - certification.png>)

#### Tabla `certificados`

- Entidad/definición: `Certificado`
- Fuente: `TypeORM`
- Archivo: `backend/certification-service/src/certificates/certificado.entity.ts`
- Relaciones declaradas:
  - `solicitud`: ManyToOne -> `SolicitudCertificado` por `solicitud_id`
  - `validaciones`: OneToMany -> `ValidacionCertificado`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo_verificacion` | `codigo_verificacion` | varchar (length 100) | No |  | No | Sí |  |  |
| `numero_certificado` | `numero_certificado` | varchar (length 50) | No |  | No | Sí |  |  |
| `solicitud_id` | `solicitud_id` | uuid | No | ManyToOne -> SolicitudCertificado | No | No |  |  |
| `nombre_completo` | `nombre_completo` | varchar (length 255) | No |  | No | No |  |  |
| `cedula` | `cedula` | varchar (length 50) | No |  | No | No |  |  |
| `carrera_categoria` | `carrera_categoria` | varchar (length 100) | No |  | No | No |  |  |
| `fecha_vinculacion` | `fecha_vinculacion` | date | No |  | No | No |  |  |
| `categoria_cargo` | `categoria_cargo` | varchar (length 100) | No |  | No | No |  |  |
| `ubicacion_cargo` | `ubicacion_cargo` | varchar (length 150) | No |  | Sí | No |  |  |
| `salario_mensual` | `salario_mensual` | decimal (precision 12, scale 2) | No |  | No | No |  |  |
| `salario_texto` | `salario_texto` | varchar (length 255) | No |  | Sí | No |  |  |
| `dependencia` | `dependencia` | varchar (length 255) | No |  | Sí | No |  |  |
| `sede` | `sede` | varchar (length 100) | No |  | Sí | No |  |  |
| `fecha_emision` | `fecha_emision` | date | No |  | No | No |  |  |
| `fecha_expedicion` | `fecha_expedicion` | timestamp | No |  | No | No |  |  |
| `firmante_nombre` | `firmante_nombre` | varchar (length 255) | No |  | No | No |  |  |
| `firmante_cargo` | `firmante_cargo` | varchar (length 150) | No |  | No | No |  |  |
| `firmante_dependencia` | `firmante_dependencia` | varchar (length 255) | No |  | No | No |  |  |
| `pdf_url` | `pdf_url` | varchar (length 255) | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | VIGENTE |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `certificate_requests`

- Entidad/definición: `CertificateRequest`
- Fuente: `TypeORM`
- Archivo: `backend/certification-service/src/certificates/certificate-request.entity.ts`
- Relaciones declaradas:
  - `certificates`: OneToMany -> `Certificate`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `request_number` | `request_number` | varchar (length 50) | No |  | No | Sí |  |  |
| `person_id` | `person_id` | uuid | No |  | Sí | No |  |  |
| `full_name` | `full_name` | varchar (length 255) | No |  | No | No |  |  |
| `id_number` | `id_number` | varchar (length 50) | No |  | No | No |  |  |
| `document_type` | `document_type` | varchar (length 10) | No |  | Sí | No |  |  |
| `career_category` | `career_category` | varchar (length 100) | No |  | No | No |  |  |
| `hiring_date` | `hiring_date` | date | No |  | No | No |  |  |
| `position_category` | `position_category` | varchar (length 100) | No |  | No | No |  |  |
| `position_location` | `position_location` | varchar (length 150) | No |  | Sí | No |  |  |
| `monthly_salary` | `monthly_salary` | decimal (precision 12, scale 2) | No |  | No | No |  |  |
| `salary_text` | `salary_text` | varchar (length 255) | No |  | Sí | No |  |  |
| `department` | `department` | varchar (length 255) | No |  | Sí | No |  |  |
| `cod_cargo` | `cod_cargo` | varchar (length 255) | No |  | Sí | No |  |  |
| `cod_grade` | `cod_grade` | varchar (length 255) | No |  | Sí | No |  |  |
| `campus` | `campus` | varchar (length 100) | No |  | Sí | No |  |  |
| `email` | `email` | varchar (length 100) | No |  | Sí | No |  |  |
| `phone` | `phone` | varchar (length 20) | No |  | Sí | No |  |  |
| `status` | `status` | varchar (length 50) | No |  | No | No | PENDING |  |
| `validation_code` | `validation_code` | varchar (length 10) | No |  | Sí | No |  |  |
| `validation_expires_at` | `validation_expires_at` | timestamp | No |  | Sí | No |  |  |
| `request_date` | `request_date` | timestamp | No |  | Sí | No |  |  |
| `observations` | `observations` | text | No |  | Sí | No |  |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `certificate_template_config`

- Entidad/definición: `TemplateConfig`
- Fuente: `TypeORM`
- Archivo: `backend/certification-service/src/certificates/template-config.entity.ts`
- Relaciones declaradas:
  - `firmante`: ManyToOne -> `Firmante` por `firmante_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | integer generated | Sí |  | No | No |  |  |
| `firmante_id` | `firmanteId` | uuid | No | ManyToOne -> Firmante | Sí | No |  |  |
| `entity_logo_url` | `entityLogoUrl` | text | No |  | Sí | No |  |  |
| `entity_logo_filename` | `entityLogoFilename` | varchar | No |  | Sí | No |  |  |
| `entity_logo_size` | `entityLogoSize` | varchar | No |  | Sí | No |  |  |
| `typography_font` | `typographyFont` | varchar | No |  | Sí | No | Arial Narrow, Arial, sans-serif |  |
| `cargo_title` | `cargoTitle` | text | No |  | Sí | No |  |  |
| `certificate_content_html` | `certificateContentHtml` | text | No |  | Sí | No |  |  |
| `version` | `version` | varchar | No |  | No | No | 1.0.0 |  |
| `status` | `status` | varchar | No |  | No | No | draft |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `created_by` | `createdBy` | varchar | No |  | Sí | No |  |  |
| `updated_by` | `updatedBy` | varchar | No |  | Sí | No |  |  |
| `is_active` | `isActive` | boolean | No |  | No | No | true |  |
| `template_type` | `templateType` | varchar | No |  | No | No | docente |  |
| `signature_url` | `signatureUrl` | text | No |  | Sí | No |  |  |
| `signature_filename` | `signatureFilename` | text | No |  | Sí | No |  |  |
| `signature_size` | `signatureSize` | text | No |  | Sí | No |  |  |
| `signer_name_override` | `signerNameOverride` | text | No |  | Sí | No |  |  |

#### Tabla `certificate_templates`

- Entidad/definición: `CertificateTemplate`
- Fuente: `TypeORM`
- Archivo: `backend/certification-service/src/certificates/certificate-template.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `name` | `name` | varchar (length 100) | No |  | No | No |  |  |
| `description` | `description` | text | No |  | Sí | No |  |  |
| `html_content` | `html_content` | text | No |  | No | No |  |  |
| `certificate_type` | `certificate_type` | varchar (length 50) | No |  | No | No |  |  |
| `is_active` | `is_active` | boolean | No |  | No | No | true |  |
| `version` | `version` | int | No |  | No | No | 1 |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `certificate_validations`

- Entidad/definición: `CertificateValidation`
- Fuente: `TypeORM`
- Archivo: `backend/certification-service/src/certificates/certificate-validation.entity.ts`
- Relaciones declaradas:
  - `certificate`: ManyToOne -> `Certificate` por `certificate_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `certificate_id` | `certificate_id` | uuid | No | ManyToOne -> Certificate | No | No |  |  |
| `validation_date` | `validation_date` | timestamp | No |  | No | No |  |  |
| `ip_address` | `ip_address` | varchar (length 50) | No |  | Sí | No |  |  |
| `user_agent` | `user_agent` | text | No |  | Sí | No |  |  |
| `location` | `location` | varchar (length 255) | No |  | Sí | No |  |  |
| `country` | `country` | varchar (length 100) | No |  | Sí | No |  |  |
| `region` | `region` | varchar (length 120) | No |  | Sí | No |  |  |
| `city` | `city` | varchar (length 120) | No |  | Sí | No |  |  |
| `latitude` | `latitude` | double precision | No |  | Sí | No |  |  |
| `longitude` | `longitude` | double precision | No |  | Sí | No |  |  |
| `isp` | `isp` | varchar (length 255) | No |  | Sí | No |  |  |
| `result` | `result` | varchar (length 50) | No |  | No | No |  |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `certificates`

- Entidad/definición: `Certificate`
- Fuente: `TypeORM`
- Archivo: `backend/certification-service/src/certificates/certificate.entity.ts`
- Relaciones declaradas:
  - `request`: ManyToOne -> `CertificateRequest` por `request_id`
  - `validations`: OneToMany -> `CertificateValidation`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `verification_code` | `verification_code` | varchar (length 100) | No |  | No | Sí |  |  |
| `certificate_number` | `certificate_number` | varchar (length 50) | No |  | No | Sí |  |  |
| `request_id` | `request_id` | uuid | No | ManyToOne -> CertificateRequest | No | No |  |  |
| `full_name` | `full_name` | varchar (length 255) | No |  | No | No |  |  |
| `id_number` | `id_number` | varchar (length 50) | No |  | No | No |  |  |
| `document_type` | `document_type` | varchar (length 10) | No |  | Sí | No |  |  |
| `career_category` | `career_category` | varchar (length 100) | No |  | No | No |  |  |
| `hiring_date` | `hiring_date` | date | No |  | No | No |  |  |
| `position_category` | `position_category` | varchar (length 100) | No |  | No | No |  |  |
| `position_location` | `position_location` | varchar (length 150) | No |  | Sí | No |  |  |
| `monthly_salary` | `monthly_salary` | decimal (precision 12, scale 2) | No |  | No | No |  |  |
| `technical_bonus` | `technical_bonus` | decimal (precision 12, scale 2) | No |  | No | No | 0 |  |
| `include_salary` | `include_salary` | boolean | No |  | No | No | true |  |
| `include_technical_bonus` | `include_technical_bonus` | boolean | No |  | No | No | false |  |
| `salary_text` | `salary_text` | varchar (length 255) | No |  | Sí | No |  |  |
| `department` | `department` | varchar (length 255) | No |  | Sí | No |  |  |
| `cod_cargo` | `cod_cargo` | varchar (length 255) | No |  | Sí | No |  |  |
| `cod_grade` | `cod_grade` | varchar (length 255) | No |  | Sí | No |  |  |
| `campus` | `campus` | varchar (length 100) | No |  | Sí | No |  |  |
| `issue_date` | `issue_date` | date | No |  | No | No |  |  |
| `issuance_timestamp` | `issuance_timestamp` | timestamp | No |  | No | No |  |  |
| `signer_name` | `signer_name` | varchar (length 255) | No |  | No | No |  |  |
| `signer_position` | `signer_position` | varchar (length 150) | No |  | No | No |  |  |
| `signer_department` | `signer_department` | varchar (length 255) | No |  | No | No |  |  |
| `pdf_url` | `pdf_url` | varchar (length 255) | No |  | Sí | No |  |  |
| `template_snapshot` | `template_snapshot` | jsonb | No |  | Sí | No |  |  |
| `template_type` | `template_type` | varchar (length 20) | No |  | Sí | No |  |  |
| `template_version` | `template_version` | varchar (length 20) | No |  | Sí | No |  |  |
| `status` | `status` | varchar (length 50) | No |  | No | No | VALID |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `firmantes`

- Entidad/definición: `Firmante`
- Fuente: `TypeORM`
- Archivo: `backend/certification-service/src/certificates/firmante.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `nombre_completo` | `nombre_completo` | varchar (length 255) | No |  | No | No |  |  |
| `cargo` | `cargo` | varchar (length 150) | No |  | No | No |  |  |
| `dependencia` | `dependencia` | varchar (length 255) | No |  | No | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `es_principal` | `es_principal` | boolean | No |  | No | No | false |  |
| `firma_digital_url` | `firma_digital_url` | text | No |  | Sí | No |  |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `plantillas_certificado`

- Entidad/definición: `PlantillaCertificado`
- Fuente: `TypeORM`
- Archivo: `backend/certification-service/src/certificates/plantilla-certificado.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `nombre` | `nombre` | varchar (length 100) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `contenido_html` | `contenido_html` | text | No |  | No | No |  |  |
| `tipo_certificado` | `tipo_certificado` | varchar (length 50) | No |  | No | No |  |  |
| `activa` | `activa` | boolean | No |  | No | No | true |  |
| `version` | `version` | int | No |  | No | No | 1 |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `signers`

- Entidad/definición: `Signer`
- Fuente: `TypeORM`
- Archivo: `backend/certification-service/src/certificates/signer.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `full_name` | `full_name` | varchar (length 255) | No |  | No | No |  |  |
| `position` | `position` | varchar (length 150) | No |  | No | No |  |  |
| `department` | `department` | varchar (length 255) | No |  | No | No |  |  |
| `is_active` | `is_active` | boolean | No |  | No | No | true |  |
| `is_primary` | `is_primary` | boolean | No |  | No | No | false |  |
| `signature_url` | `signature_url` | text | No |  | Sí | No |  |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `solicitudes_certificado`

- Entidad/definición: `SolicitudCertificado`
- Fuente: `TypeORM`
- Archivo: `backend/certification-service/src/certificates/solicitud-certificado.entity.ts`
- Relaciones declaradas:
  - `certificados`: OneToMany -> `Certificado`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `numero_solicitud` | `numero_solicitud` | varchar (length 50) | No |  | No | Sí |  |  |
| `person_id` | `person_id` | uuid | No |  | Sí | No |  |  |
| `nombre_completo` | `nombre_completo` | varchar (length 255) | No |  | No | No |  |  |
| `cedula` | `cedula` | varchar (length 50) | No |  | No | No |  |  |
| `carrera_categoria` | `carrera_categoria` | varchar (length 100) | No |  | No | No |  |  |
| `fecha_vinculacion` | `fecha_vinculacion` | date | No |  | No | No |  |  |
| `categoria_cargo` | `categoria_cargo` | varchar (length 100) | No |  | No | No |  |  |
| `ubicacion_cargo` | `ubicacion_cargo` | varchar (length 150) | No |  | Sí | No |  |  |
| `salario_mensual` | `salario_mensual` | decimal (precision 12, scale 2) | No |  | No | No |  |  |
| `salario_texto` | `salario_texto` | varchar (length 255) | No |  | Sí | No |  |  |
| `dependencia` | `dependencia` | varchar (length 255) | No |  | Sí | No |  |  |
| `sede` | `sede` | varchar (length 100) | No |  | Sí | No |  |  |
| `email` | `email` | varchar (length 100) | No |  | Sí | No |  |  |
| `telefono` | `telefono` | varchar (length 20) | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | PENDIENTE |  |
| `fecha_solicitud` | `fecha_solicitud` | timestamp | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `technical_bonus_assignments`

- Entidad/definición: `TechnicalBonusAssignment`
- Fuente: `TypeORM`
- Archivo: `backend/certification-service/src/certificates/technical-bonus-assignment.entity.ts`
- Índices de entidad: `'ux_technical_bonus_category_id_number', ['category', 'id_number'], { unique: true }`, `'idx_technical_bonus_category', ['category']`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `category` | `category` | varchar (length 20) | No |  | No | No |  |  |
| `request_id` | `request_id` | uuid | No |  | Sí | No |  |  |
| `full_name` | `full_name` | varchar (length 255) | No |  | No | No |  |  |
| `id_number` | `id_number` | varchar (length 50) | No |  | No | No |  |  |
| `percentage` | `percentage` | decimal (precision 5, scale 2) | No |  | No | No |  |  |
| `created_by` | `created_by` | varchar (length 255) | No |  | Sí | No |  |  |
| `updated_by` | `updated_by` | varchar (length 255) | No |  | Sí | No |  |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updated_at` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `template_config_changes`

- Entidad/definición: `TemplateConfigChange`
- Fuente: `TypeORM`
- Archivo: `backend/certification-service/src/certificates/template-config-change.entity.ts`
- Relaciones declaradas:
  - `templateConfig`: ManyToOne -> `TemplateConfig` por `template_config_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | integer generated | Sí |  | No | No |  |  |
| `template_config_id` | `templateConfigId` | integer | No | ManyToOne -> TemplateConfig | No | No |  |  |
| `change_type` | `changeType` | varchar (length 50) | No |  | No | No |  |  |
| `field_name` | `fieldName` | varchar (length 100) | No |  | No | No |  |  |
| `old_value` | `oldValue` | text | No |  | Sí | No |  |  |
| `new_value` | `newValue` | text | No |  | Sí | No |  |  |
| `metadata` | `metadata` | jsonb | No |  | Sí | No |  |  |
| `changed_at` | `changedAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `changed_by` | `changedBy` | varchar | No |  | Sí | No |  |  |

#### Tabla `validaciones_certificado`

- Entidad/definición: `ValidacionCertificado`
- Fuente: `TypeORM`
- Archivo: `backend/certification-service/src/certificates/validacion-certificado.entity.ts`
- Relaciones declaradas:
  - `certificado`: ManyToOne -> `Certificado` por `certificado_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `certificado_id` | `certificado_id` | uuid | No | ManyToOne -> Certificado | No | No |  |  |
| `codigo_verificacion` | `codigo_verificacion` | varchar (length 100) | No |  | No | No |  |  |
| `fecha_validacion` | `fecha_validacion` | timestamp | No |  | No | No |  |  |
| `ip_validacion` | `ip_validacion` | varchar (length 50) | No |  | Sí | No |  |  |
| `user_agent` | `user_agent` | varchar (length 200) | No |  | Sí | No |  |  |
| `created_at` | `created_at` | timestamp | No |  | No | No |  | Fecha de creación automática |


## internal-disciplinary-control-service

Diagramas MER relacionados:
- [internal_disciplinary_control](<mer/06-may-2026/esap_db - internal_disciplinary_control.png>)

Fuentes SQL detectadas:
- `backend/internal-disciplinary-control-service/create_plantilla_auto_table.sql`
- `backend/internal-disciplinary-control-service/db/add_segunda_instancia_enum.sql`
- `backend/internal-disciplinary-control-service/db/migrations/add_reassignment_unassigned_support.sql`
- `backend/internal-disciplinary-control-service/db/migrations/cleanup_disciplinary_data.sql`

### Esquema `default`

MER relacionado: [internal_disciplinary_control](<mer/06-may-2026/esap_db - internal_disciplinary_control.png>)

#### Tabla `auto_versions`

- Entidad/definición: `AutoVersion`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/auto-version.entity.ts`
- Relaciones declaradas:
  - `auto`: ManyToOne -> `LegalAuto`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `contenido` | `contenido` | text | No |  | No | No |  |  |
| `versionNumber` | `versionNumber` | int | No |  | No | No |  |  |
| `createdBy` | `createdBy` | uuid | No |  | Sí | No |  |  |
| `changeReason` | `changeReason` | text | No |  | Sí | No |  |  |
| `documentUrl` | `documentUrl` | text | No |  | Sí | No |  |  |
| `documentName` | `documentName` | text | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `autos_configuration`

- Entidad/definición: `AutoConfiguration`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/auto-configuration.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `tipo` | `tipo` | varchar (length 100) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | varchar (length 200) | No |  | No | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | activo |  |
| `plantilla` | `plantilla` | text | No |  | Sí | No |  |  |
| `nombre_plantilla` | `nombre_plantilla` | varchar (length 255) | No |  | Sí | No |  |  |
| `descripcion_plantilla` | `descripcion_plantilla` | text | No |  | Sí | No |  |  |
| `version_plantilla` | `version_plantilla` | varchar (length 50) | No |  | No | No | 1.0 |  |
| `estado_plantilla` | `estado_plantilla` | varchar (length 50) | No |  | No | No | activo |  |
| `stage` | `stage` | varchar (length 50) | No |  | Sí | No |  |  |
| `orden` | `orden` | int | No |  | No | No | 0 |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `disciplinary_news`

- Entidad/definición: `DisciplinaryNews`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/disciplinary-news.entity.ts`
- Relaciones declaradas:
  - `processes`: OneToMany -> `DisciplinaryProcess`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `radicado` | `radicado` | varchar | No |  | No | Sí |  |  |
| `fechaRecepcion` | `fechaRecepcion` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `fechaQueja` | `fechaQueja` | timestamp | No |  | Sí | No |  |  |
| `origen` | `origen` | varchar (length 50) | No |  | Sí | No |  |  |
| `territorial` | `territorial` | varchar | No |  | No | No |  |  |
| `dependenciaDenunciado` | `dependenciaDenunciado` | varchar | No |  | No | No |  |  |
| `denunciante` | `denunciante` | jsonb | No |  | Sí | No |  |  |
| `disciplinable` | `disciplinable` | jsonb | No |  | Sí | No |  |  |
| `hechos` | `hechos` | text | No |  | No | No |  |  |
| `conducta_disciplinaria` | `conducta` | varchar (length 100) | No |  | Sí | No |  |  |
| `conductas` | `conductas` | text (array) | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | RADICADA |  |
| `adjuntos` | `adjuntos` | text (array) | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `radicador_id` | `radicadorId` | uuid | No |  | Sí | No |  |  |
| `kanbanStage` | `kanbanStage` | uuid | No |  | Sí | No |  |  |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `fechaHechos` | `fechaHechos` | timestamp | No |  | Sí | No |  |  |
| `fechaCaducidad` | `fechaCaducidad` | timestamp | No |  | Sí | No |  |  |
| `historialAuditoria` | `historialAuditoria` | jsonb | No |  | Sí | No |  |  |
| `proceso_asociado_id` | `procesoAsociadoId` | uuid | No |  | Sí | No |  |  |
| `proceso_asociado_numero` | `procesoAsociadoNumero` | varchar (length 50) | No |  | Sí | No |  |  |
| `proceso_asociado_fecha` | `procesoAsociadoFecha` | timestamp | No |  | Sí | No |  |  |
| `proceso_asociado_justificacion` | `procesoAsociadoJustificacion` | text | No |  | Sí | No |  |  |
| `numero_rc` | `numeroRC` | varchar (length 50) | No |  | Sí | No |  |  |
| `entidad_remision` | `entidadRemision` | varchar (length 255) | No |  | Sí | No |  |  |
| `correo_entidad_remision` | `correoEntidadRemision` | varchar (length 255) | No |  | Sí | No |  |  |
| `fecha_remision` | `fechaRemision` | timestamp | No |  | Sí | No |  |  |
| `tipo_remision` | `tipoRemision` | varchar (length 100) | No |  | Sí | No |  |  |
| `justificacion_remision` | `justificacionRemision` | text | No |  | Sí | No |  |  |
| `descripcion_remision` | `descripcionRemision` | jsonb | No |  | Sí | No |  |  |

#### Tabla `disciplinary_news_processes`

- Entidad/definición: `DisciplinaryNewsProcess`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/disciplinary-news-process.entity.ts`
- Relaciones declaradas:
  - `news`: ManyToOne -> `DisciplinaryNews` por `news_id`
  - `process`: ManyToOne -> `DisciplinaryProcess` por `process_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `news_id` | `newsId` | uuid | No | ManyToOne -> DisciplinaryNews | No | No |  |  |
| `process_id` | `processId` | uuid | No | ManyToOne -> DisciplinaryProcess | No | No |  |  |
| `fecha_asociacion` | `fechaAsociacion` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' |  |
| `justificacion` | `justificacion` | text | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  |  |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  |  |

#### Tabla `disciplinary_process_actuaciones`

- Entidad/definición: `DisciplinaryProcessActuacion`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/disciplinary-process-actuacion.entity.ts`
- Relaciones declaradas:
  - `process`: ManyToOne -> `DisciplinaryProcess` por `processId`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `processId` | `processId` | uuid | No | ManyToOne -> DisciplinaryProcess | No | No |  |  |
| `tipo` | `tipo` | varchar (length 50) | No |  | No | No | ACTUACION |  |
| `etapa` | `etapa` | varchar (length 80) | No |  | Sí | No |  |  |
| `descripcion` | `descripcion` | text | No |  | No | No |  |  |
| `responsableNombre` | `responsableNombre` | varchar (length 255) | No |  | No | No |  |  |
| `fechaActuacion` | `fechaActuacion` | timestamp | No |  | No | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `disciplinary_process_notes`

- Entidad/definición: `DisciplinaryProcessNote`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/disciplinary-process-note.entity.ts`
- Relaciones declaradas:
  - `process`: ManyToOne -> `DisciplinaryProcess` por `processId`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `processId` | `processId` | uuid | No | ManyToOne -> DisciplinaryProcess | No | No |  |  |
| `texto` | `texto` | text | No |  | No | No |  |  |
| `etapa` | `etapa` | varchar (length 80) | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `disciplinary_process_reassignment_requests`

- Entidad/definición: `DisciplinaryProcessReassignmentRequest`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/disciplinary-process-reassignment-request.entity.ts`
- Relaciones declaradas:
  - `process`: ManyToOne -> `DisciplinaryProcess` por `process_id`
  - `currentProfessional`: ManyToOne -> `DisciplinaryProfessional` por `current_professional_id`
  - `newProfessional`: ManyToOne -> `DisciplinaryProfessional` por `new_professional_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `process_id` | `processId` | uuid | No | ManyToOne -> DisciplinaryProcess | No | No |  |  |
| `current_professional_id` | `currentProfessionalId` | uuid | No | ManyToOne -> DisciplinaryProfessional | Sí | No |  |  |
| `was_initially_unassigned` | `wasInitiallyUnassigned` | boolean | No |  | No | No | false |  |
| `new_professional_id` | `newProfessionalId` | uuid | No | ManyToOne -> DisciplinaryProfessional | No | No |  |  |
| `justification` | `justification` | text | No |  | No | No |  |  |
| `priority` | `priority` | enum (enum ReassignmentPriority) | No |  | No | No | ReassignmentPriority.NORMAL |  |
| `status` | `status` | enum (enum ReassignmentRequestStatus) | No |  | No | No | ReassignmentRequestStatus.PENDIENTE |  |
| `jefe_observations` | `jefeObservations` | text | No |  | Sí | No |  |  |
| `rejection_reason` | `rejectionReason` | text | No |  | Sí | No |  |  |
| `resolved_at` | `resolvedAt` | timestamp | No |  | Sí | No |  |  |
| `requested_by` | `requestedBy` | varchar (length 100) | No |  | No | No |  |  |
| `requested_by_id` | `requestedById` | varchar (length 50) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  |  |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  |  |

#### Tabla `disciplinary_process_tasks`

- Entidad/definición: `DisciplinaryProcessTask`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/disciplinary-process-task.entity.ts`
- Relaciones declaradas:
  - `process`: ManyToOne -> `DisciplinaryProcess` por `processId`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `processId` | `processId` | uuid | No | ManyToOne -> DisciplinaryProcess | No | No |  |  |
| `titulo` | `titulo` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `prioridad` | `prioridad` | varchar (length 20) | No |  | No | No | media |  |
| `etapa` | `etapa` | varchar (length 80) | No |  | Sí | No |  |  |
| `responsableNombre` | `responsableNombre` | varchar (length 255) | No |  | Sí | No |  |  |
| `fechaVencimiento` | `fechaVencimiento` | date | No |  | No | No |  |  |
| `completada` | `completada` | boolean | No |  | No | No | false |  |
| `fechaCompletada` | `fechaCompletada` | timestamp | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `disciplinary_processes`

- Entidad/definición: `DisciplinaryProcess`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/disciplinary-process.entity.ts`
- Relaciones declaradas:
  - `news`: ManyToOne -> `DisciplinaryNews` por `newsId`
  - `abogadoAsignado`: ManyToOne -> `DisciplinaryProfessional` por `abogado_asignado_id`
  - `autos`: OneToMany -> `LegalAuto`
  - `evidence`: OneToMany -> `Evidence`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `radicadoProceso` | `radicadoProceso` | varchar | No |  | No | Sí |  |  |
| `newsId` | `newsId` | uuid | No | ManyToOne -> DisciplinaryNews | No | No |  |  |
| `abogado_asignado_id` | `abogadoAsignadoId` | varchar | No | ManyToOne -> DisciplinaryProfessional | Sí | No |  |  |
| `etapaActual` | `etapaActual` | varchar (length 100) | No |  | No | No | VALORACION |  |
| `kanbanStage` | `kanbanStage` | uuid | No |  | Sí | No |  |  |
| `kanbanNotice` | `kanbanNotice` | text | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | ACTIVO |  |
| `fechaPrescripcion` | `fechaPrescripcion` | timestamp | No |  | Sí | No |  |  |
| `fechaVencimientoEtapa` | `fechaVencimientoEtapa` | timestamp | No |  | Sí | No |  |  |
| `fechaInicioEtapa` | `fechaInicioEtapa` | timestamp | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `pruebas` | `pruebas` | text (array) | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `fecha_cierre` | `fechaCierre` | timestamp | No |  | Sí | No |  |  |
| `etapa_al_cierre` | `etapaAlCierre` | varchar (length 100) | No |  | Sí | No |  |  |
| `cerrado_por_id` | `cerradoPorId` | uuid | No |  | Sí | No |  |  |
| `correo_juridica_enviado` | `correoJuridicaEnviado` | boolean | No |  | No | No | false |  |
| `correo_juridica_fecha_envio` | `correoJuridicaFechaEnvio` | timestamp | No |  | Sí | No |  |  |
| `proceso_asociado_id` | `procesoAsociadoId` | uuid | No |  | Sí | No |  |  |
| `proceso_asociado_numero` | `procesoAsociadoNumero` | varchar (length 50) | No |  | Sí | No |  |  |
| `proceso_asociado_tipo` | `procesoAsociadoTipo` | varchar (length 20) | No |  | Sí | No |  |  |
| `proceso_asociado_fecha` | `procesoAsociadoFecha` | timestamp | No |  | Sí | No |  |  |
| `proceso_asociado_justificacion` | `procesoAsociadoJustificacion` | text | No |  | Sí | No |  |  |
| `procesos_consolidados` | `procesosConsolidados` | text (array) | No |  | Sí | No |  |  |
| `proceso_consolidado_principal` | `procesoConsolidadoPrincipal` | uuid | No |  | Sí | No |  |  |
| `informacion_consolidada` | `informacionConsolidada` | jsonb | No |  | Sí | No |  |  |
| `restaurado` | `restaurado` | boolean | No |  | No | No | false |  |

#### Tabla `disciplinary_professional`

- Entidad/definición: `DisciplinaryProfessional`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/disciplinary-professional.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `nombre_completo` | `nombreCompleto` | varchar | No |  | No | No |  |  |
| `email` | `email` | varchar | No |  | No | Sí |  |  |
| `telefono` | `telefono` | varchar | No |  | Sí | No |  |  |
| `cargo` | `cargo` | varchar | No |  | No | No |  |  |
| `especialidad` | `especialidad` | varchar | No |  | Sí | No |  |  |
| `tipo_contrato` | `tipoContrato` | varchar | No |  | Sí | No |  |  |
| `territorial` | `territorial` | varchar | No |  | Sí | No |  |  |
| `capacidad_maxima` | `capacidadMaxima` | integer | No |  | No | No | 10 |  |
| `firma_url` | `firmaUrl` | varchar | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar | No |  | No | No | ACTIVO |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `entidades_remision`

- Entidad/definición: `EntidadRemision`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/entidad-remision.entity.ts`
- Índices de entidad: `['activo']`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `correo` | `correo` | varchar (length 255) | No |  | No | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `created_at` | `fechaCreacion` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `fechaActualizacion` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `evidence`

- Entidad/definición: `Evidence`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/evidence.entity.ts`
- Relaciones declaradas:
  - `process`: ManyToOne -> `DisciplinaryProcess` por `processId`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `url` | `url` | varchar | No |  | No | No |  |  |
| `archivoUrl` | `archivoUrl` | varchar | No |  | No | No |  |  |
| `nombreArchivo` | `nombreArchivo` | varchar | No |  | No | No |  |  |
| `filename` | `filename` | varchar | No |  | Sí | No |  |  |
| `description` | `description` | varchar | No |  | Sí | No |  |  |
| `fileType` | `fileType` | varchar | No |  | Sí | No |  |  |
| `fileSize` | `fileSize` | integer | No |  | Sí | No |  |  |
| `nombreDocumento` | `nombreDocumento` | varchar | No |  | Sí | No |  |  |
| `tipoDocumento` | `tipoDocumento` | varchar | No |  | Sí | No |  |  |
| `tipo` | `tipo` | varchar | No |  | No | No | DOCUMENTO |  |
| `categoria` | `categoria` | varchar | No |  | Sí | No |  |  |
| `destinatario` | `destinatario` | varchar | No |  | Sí | No |  |  |
| `asunto` | `asunto` | varchar | No |  | Sí | No |  |  |
| `participantes` | `participantes` | int | No |  | Sí | No |  |  |
| `etapa` | `etapa` | varchar | No |  | Sí | No |  |  |
| `usuarioCarga` | `usuarioCarga` | varchar | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `processId` | `processId` | varchar | No | ManyToOne -> DisciplinaryProcess | No | No |  |  |

#### Tabla `expediente_compartido`

- Entidad/definición: `ExpedienteCompartido`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/expediente-compartido.entity.ts`
- Relaciones declaradas:
  - `proceso`: ManyToOne -> `DisciplinaryProcess` por `proceso_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `token_acceso` | `tokenAcceso` | varchar | No |  | No | Sí |  |  |
| `proceso_id` | `procesoId` | uuid | No | ManyToOne -> DisciplinaryProcess | No | No |  |  |
| `tipo_compartido` | `tipoCompartido` | enum (enum TipoCompartido) | No |  | No | No | TipoCompartido.LINK |  |
| `estado` | `estado` | enum (enum EstadoCompartido) | No |  | No | No | EstadoCompartido.ACTIVO |  |
| `requiere_clave` | `requiereClave` | boolean | No |  | No | No | false |  |
| `clave_hash` | `claveHash` | varchar | No |  | Sí | No |  |  |
| `tiempo_expiracion_horas` | `tiempoExpiracionHoras` | int | No |  | Sí | No |  |  |
| `fecha_expiracion` | `fechaExpiracion` | timestamp | No |  | Sí | No |  |  |
| `email_destinatario` | `emailDestinatario` | varchar | No |  | Sí | No |  |  |
| `mensaje_adicional` | `mensajeAdicional` | text | No |  | Sí | No |  |  |
| `creado_por` | `creadoPor` | varchar | No |  | Sí | No |  |  |
| `contador_accesos` | `contadorAccesos` | int | No |  | No | No | 0 |  |
| `ultimo_acceso` | `ultimoAcceso` | timestamp | No |  | Sí | No |  |  |
| `ip_ultimo_acceso` | `ipUltimoAcceso` | varchar | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `es_publico` | `esPublico` | boolean | No |  | No | No | false |  |
| `permite_descarga` | `permiteDescarga` | boolean | No |  | No | No | true |  |

#### Tabla `legal_autos`

- Entidad/definición: `LegalAuto`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/legal-auto.entity.ts`
- Relaciones declaradas:
  - `process`: ManyToOne -> `DisciplinaryProcess` por `processId`
  - `versions`: OneToMany -> `AutoVersion`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `processId` | `processId` | uuid | No | ManyToOne -> DisciplinaryProcess | No | No |  |  |
| `tipo` | `tipo` | varchar (length 100) | No |  | No | No |  |  |
| `numero` | `numero` | varchar (length 150) | No |  | Sí | No |  |  |
| `contenido` | `contenido` | text | No |  | No | No |  |  |
| `estado` | `estado` | enum (enum AutoStatus) | No |  | No | No | AutoStatus.BORRADOR |  |
| `firmaUrl` | `firmaUrl` | text | No |  | Sí | No |  |  |
| `documentUrl` | `documentUrl` | text | No |  | Sí | No |  |  |
| `documentName` | `documentName` | text | No |  | Sí | No |  |  |
| `documentType` | `documentType` | text | No |  | Sí | No |  |  |
| `documentSize` | `documentSize` | int | No |  | Sí | No |  |  |
| `notificationDate` | `notificationDate` | timestamp | No |  | Sí | No |  |  |
| `etapaDestino` | `etapaDestino` | varchar (length 50) | No |  | Sí | No |  |  |
| `notificationEvidence` | `notificationEvidence` | text | No |  | Sí | No |  |  |
| `comentarios` | `comentarios` | text | No |  | Sí | No |  |  |
| `rejection_comments` | `rejection_comments` | text | No |  | Sí | No |  |  |
| `prorrogaMeses` | `prorrogaMeses` | int | No |  | Sí | No |  |  |
| `fechaVencimientoAnterior` | `fechaVencimientoAnterior` | timestamp | No |  | Sí | No |  |  |
| `fechaVencimientoNueva` | `fechaVencimientoNueva` | timestamp | No |  | Sí | No |  |  |
| `aprobadoPorId` | `aprobadoPorId` | uuid | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `currentVersion` | `currentVersion` | int | No |  | No | No | 1 |  |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `oficios_configuration`

- Entidad/definición: `OficioConfiguration`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/oficio-configuration.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `tipo` | `tipo` | varchar (length 100) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | varchar (length 200) | No |  | No | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | activo |  |
| `codigo` | `codigo` | varchar (length 50) | No |  | Sí | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `plantilla` | `plantilla` | text | No |  | Sí | No |  |  |
| `nombre_plantilla` | `nombre_plantilla` | varchar (length 255) | No |  | Sí | No |  |  |
| `descripcion_plantilla` | `descripcion_plantilla` | text | No |  | Sí | No |  |  |
| `version_plantilla` | `version_plantilla` | varchar (length 50) | No |  | No | No | 1.0 |  |
| `estado_plantilla` | `estado_plantilla` | varchar (length 50) | No |  | No | No | activo |  |
| `stage` | `stage` | varchar (length 50) | No |  | Sí | No |  |  |
| `orden` | `orden` | int | No |  | No | No | 0 |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `plantilla_auto`

- Entidad/definición: `PlantillaAuto`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/plantilla-auto.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `htmlContent` | `htmlContent` | text | No |  | No | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | activo |  |
| `nombre` | `nombre` | varchar (length 100) | No |  | Sí | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `sequences`

- Entidad/definición: `Sequence`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/sequence.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `name` | `name` | varchar | Sí |  | No | No |  |  |
| `currentValue` | `currentValue` | integer | No |  | No | No | 0 |  |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `stage_configuration`

- Entidad/definición: `StageConfiguration`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/stage-configuration.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `etapa` | `etapa` | varchar | No |  | No | No | RECEPCIÓN |  |
| `diasHabiles` | `diasHabiles` | int | No |  | No | No | 30 |  |
| `color` | `color` | varchar | No |  | No | No | #6B7280 |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `orden` | `orden` | int | No |  | No | No | 0 |  |
| `createdAt` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updatedAt` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `system_configuration`

- Entidad/definición: `SystemConfiguration`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/system-configuration.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `roleCapacities` | `roleCapacities` | jsonb | No |  | No | No | {} |  |
| `notificationSettings` | `notificationSettings` | jsonb | No |  | No | No | {} |  |
| `alertSettings` | `alertSettings` | jsonb | No |  | No | No | {} |  |
| `securitySettings` | `securitySettings` | jsonb | No |  | No | No | {} |  |
| `documentTemplates` | `documentTemplates` | jsonb | No |  | No | No | {} |  |

#### Tabla `tipos_remision`

- Entidad/definición: `TipoRemision`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/tipo-remision.entity.ts`
- Índices de entidad: `['activo']`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 100) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `orden` | `orden` | int | No |  | No | No | 0 |  |
| `created_at` | `fechaCreacion` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `fechaActualizacion` | timestamp | No |  | No | No |  | Fecha de actualización automática |

### Esquema `internal_disciplinary_control`

MER relacionado: [internal_disciplinary_control](<mer/06-may-2026/esap_db - internal_disciplinary_control.png>)

#### Tabla `internal_disciplinary_control.actas_configuration`

- Entidad/definición: `ActaConfiguration`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/acta-configuration.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `tipo` | `tipo` | varchar (length 100) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | varchar (length 200) | No |  | No | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | activo |  |
| `codigo` | `codigo` | varchar (length 50) | No |  | Sí | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `plantilla` | `plantilla` | text | No |  | Sí | No |  |  |
| `nombre_plantilla` | `nombre_plantilla` | varchar (length 255) | No |  | Sí | No |  |  |
| `descripcion_plantilla` | `descripcion_plantilla` | text | No |  | Sí | No |  |  |
| `version_plantilla` | `version_plantilla` | varchar (length 50) | No |  | No | No | 1.0 |  |
| `estado_plantilla` | `estado_plantilla` | varchar (length 50) | No |  | No | No | activo |  |
| `stage` | `stage` | varchar (length 50) | No |  | Sí | No |  |  |
| `orden` | `orden` | int | No |  | No | No | 0 |  |
| `createdat` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updatedat` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `internal_disciplinary_control.alertas_enviadas`

- Entidad/definición: `AlertaEnviada`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/alerta-enviada.entity.ts`
- Índices de entidad: `['terminoId']`, `['reglaAlertaId']`, `['estado']`, `['fechaEnvio']`
- Relaciones declaradas:
  - `termino`: ManyToOne -> `TerminoProcesal` por `termino_id`
  - `reglaAlerta`: ManyToOne -> `ReglaAlerta` por `regla_alerta_id`
  - `auto`: ManyToOne -> `LegalAuto` por `auto_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `termino_id` | `terminoId` | uuid | No | ManyToOne -> TerminoProcesal | Sí | No |  |  |
| `regla_alerta_id` | `reglaAlertaId` | uuid | No | ManyToOne -> ReglaAlerta | Sí | No |  |  |
| `auto_id` | `autoId` | uuid | No | ManyToOne -> LegalAuto | Sí | No |  |  |
| `tipo` | `tipo` | enum (enum TipoAlerta) | No |  | No | No |  |  |
| `destinatario` | `destinatario` | varchar (length 200) | No |  | No | No |  |  |
| `asunto` | `asunto` | varchar (length 500) | No |  | Sí | No |  |  |
| `mensaje` | `mensaje` | text | No |  | Sí | No |  |  |
| `estado` | `estado` | enum (enum EstadoAlerta) | No |  | No | No | EstadoAlerta.PENDIENTE |  |
| `fecha_envio` | `fechaEnvio` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `fecha_lectura` | `fechaLectura` | timestamp | No |  | Sí | No |  |  |
| `error_mensaje` | `errorMensaje` | text | No |  | Sí | No |  |  |
| `creado_por_id` | `creadoPorId` | uuid | No |  | Sí | No |  |  |
| `fecha_creacion` | `fechaCreacion` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `internal_disciplinary_control.dias_festivos`

- Entidad/definición: `DiaFestivo`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/dia-festivo.entity.ts`
- Índices de entidad: `['fecha']`, `['tipo']`, `['activo']`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `fecha` | `fecha` | date | No |  | No | No |  |  |
| `descripcion` | `descripcion` | varchar (length 200) | No |  | No | No |  |  |
| `tipo` | `tipo` | enum (enum TipoFestivo) | No |  | No | No |  |  |
| `territorio` | `territorio` | varchar (length 100) | No |  | Sí | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `creado_por_id` | `creadoPorId` | uuid | No |  | No | No |  |  |
| `fecha_creacion` | `fechaCreacion` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `fecha_actualizacion` | `fechaActualizacion` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `internal_disciplinary_control.disciplinary_behaviors`

- Entidad/definición: `DisciplinaryBehavior`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/disciplinary-behavior.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 50) | No |  | No | Sí |  | Índice:  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | Sí |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `estado` | `estado` | boolean | No |  | No | No | true | Índice:  |
| `orden` | `orden` | integer | No |  | No | No | 0 | Índice:  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `internal_disciplinary_control.plantilla_auto`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-disciplinary-control-service/create_plantilla_auto_table.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `htmlContent` | `htmlContent` | TEXT | No |  | No | No |  |  |
| `estado` | `estado` | VARCHAR(50) | No |  | No | No | 'activo' | CHECK (estado IN ('activo', 'inactivo')) |
| `nombre` | `nombre` | VARCHAR(100) | No |  | Sí | No |  |  |
| `descripcion` | `descripcion` | TEXT | No |  | Sí | No |  |  |
| `createdAt` | `createdAt` | TIMESTAMP WITH TIME ZONE | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updatedAt` | `updatedAt` | TIMESTAMP WITH TIME ZONE | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `internal_disciplinary_control.reglas_alerta`

- Entidad/definición: `ReglaAlerta`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/regla-alerta.entity.ts`
- Índices de entidad: `['activa']`
- Relaciones declaradas:
  - `alertas`: OneToMany -> `AlertaEnviada`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `nombre` | `nombre` | varchar (length 200) | No |  | No | Sí |  |  |
| `dias_anticipacion` | `diasAnticipacion` | int | No |  | No | No |  |  |
| `activa` | `activa` | boolean | No |  | No | No | true |  |
| `enviar_email` | `enviarEmail` | boolean | No |  | No | No | false |  |
| `mostrar_panel` | `mostrarPanel` | boolean | No |  | No | No | true |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `creado_por_id` | `creadoPorId` | uuid | No |  | Sí | No |  |  |
| `fecha_creacion` | `fechaCreacion` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `fecha_actualizacion` | `fechaActualizacion` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `internal_disciplinary_control.terminos_procesales`

- Entidad/definición: `TerminoProcesal`
- Fuente: `TypeORM`
- Archivo: `backend/internal-disciplinary-control-service/src/entities/termino-procesal.entity.ts`
- Índices de entidad: `['procesoId']`, `['responsableId']`, `['estado']`, `['fechaVencimiento']`, `['diasRestantes']`
- Relaciones declaradas:
  - `proceso`: ManyToOne -> `DisciplinaryProcess` por `proceso_id`
  - `alertas`: OneToMany -> `AlertaEnviada`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `proceso_id` | `procesoId` | uuid | No | ManyToOne -> DisciplinaryProcess | No | No |  |  |
| `numero_proceso` | `numeroProceso` | varchar (length 20) | No |  | Sí | No |  |  |
| `actuacion` | `actuacion` | varchar (length 200) | No |  | No | No |  |  |
| `responsable_id` | `responsableId` | uuid | No |  | No | No |  |  |
| `responsable_nombre` | `responsableNombre` | varchar (length 200) | No |  | No | No |  |  |
| `email_responsable` | `emailResponsable` | varchar (length 100) | No |  | No | No |  |  |
| `fecha_inicio` | `fechaInicio` | date | No |  | No | No |  |  |
| `dias_habiles` | `diasHabiles` | int | No |  | No | No |  |  |
| `fecha_vencimiento` | `fechaVencimiento` | date | No |  | No | No |  |  |
| `dias_restantes` | `diasRestantes` | int | No |  | No | No |  |  |
| `estado` | `estado` | enum (enum TerminoEstado) | No |  | No | No | TerminoEstado.PENDIENTE |  |
| `alerta_enviada` | `alertaEnviada` | boolean | No |  | No | No | false |  |
| `fecha_cumplimiento` | `fechaCumplimiento` | date | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `creado_por_id` | `creadoPorId` | uuid | No |  | No | No |  |  |
| `fecha_creacion` | `fechaCreacion` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `fecha_actualizacion` | `fechaActualizacion` | timestamp | No |  | No | No |  | Fecha de actualización automática |


## internal-institutional-control-service

Diagramas MER relacionados:
- [control_interno](<mer/06-may-2026/esap_db - control_interno.png>)

Fuentes SQL detectadas:
- `backend/internal-institutional-control-service/db/add_missing_columns_plan_mejoramiento.sql`
- `backend/internal-institutional-control-service/db/check_and_fix_plan_mejoramiento.sql`
- `backend/internal-institutional-control-service/db/create_missing_tables_planes_mejoramiento.sql`
- `backend/internal-institutional-control-service/db/fix_all_plan_mejoramiento_columns.sql`
- `backend/internal-institutional-control-service/db/fix_hallazgo_foreign_key.sql`
- `backend/internal-institutional-control-service/db/fix_plan_mejoramiento_auditoria_id.sql`
- `backend/internal-institutional-control-service/db/fix_plan_mejoramiento_complete.sql`
- `backend/internal-institutional-control-service/db/fix_plan_mejoramiento_hallazgo_codigo.sql`
- `backend/internal-institutional-control-service/schema-esap-extended.sql`
- `backend/internal-institutional-control-service/schema-esap.sql`
- `backend/internal-institutional-control-service/schema.sql`

### Esquema `control_interno`

MER relacionado: [control_interno](<mer/06-may-2026/esap_db - control_interno.png>)

#### Tabla `control_interno.accion_correctiva`

- Entidad/definición: `AccionCorrectiva`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/planes-mejoramiento/entities/accion-correctiva.entity.ts`
- Relaciones declaradas:
  - `plan`: ManyToOne -> `PlanMejoramiento` por `plan_id`
  - `registrosSeguimiento`: OneToMany -> `RegistroSeguimiento`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `plan_id` | `planId` | uuid | No | ManyToOne -> PlanMejoramiento | No | No |  |  |
| `hallazgo_id` | `hallazgoId` | uuid | No |  | Sí | No |  |  |
| `descripcion` | `descripcion` | text | No |  | No | No |  |  |
| `tipo` | `tipo` | varchar (length 50) | No |  | No | No | AccionCorrectivaTipo.CORRECTIVA |  |
| `responsable` | `responsable` | varchar (length 255) | No |  | No | No |  |  |
| `fecha_inicio` | `fechaInicio` | date | No |  | No | No |  |  |
| `fecha_fin` | `fechaFin` | date | No |  | No | No |  |  |
| `recursos` | `recursos` | text | No |  | Sí | No |  |  |
| `indicador` | `indicador` | varchar (length 500) | No |  | Sí | No |  |  |
| `meta_indicador` | `metaIndicador` | varchar (length 500) | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | AccionCorrectivaEstado.PROGRAMADA |  |
| `porcentaje_avance` | `porcentajeAvance` | int | No |  | No | No | 0 |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `evidencias` | `evidencias` | jsonb | No |  | No | No | () => "'[]'::jsonb" |  |
| `estado_verificacion_oci` | `estadoVerificacionOci` | varchar (length 20) | No |  | Sí | No | sin_verificar |  |
| `evidencia_verificada` | `evidenciaVerificada` | text | No |  | Sí | No |  |  |
| `observacion_oci` | `observacionOci` | text | No |  | Sí | No |  |  |
| `fecha_verificacion_oci` | `fechaVerificacionOci` | timestamp | No |  | Sí | No |  |  |
| `verificada_por_id` | `verificadaPorId` | bigint | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.accion_mejora`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `numero` | `numero` | INTEGER | No |  | No | No |  |  |
| `descripcion` | `descripcion` | TEXT | No |  | No | No |  |  |
| `tipo` | `tipo` | VARCHAR(50) | No |  | No | No |  | CHECK (tipo IN ('correctiva', 'preventiva', 'mejora')) |
| `responsable` | `responsable` | VARCHAR(255) | No |  | No | No |  |  |
| `fecha_inicio` | `fecha_inicio` | DATE | No |  | No | No |  |  |
| `fecha_fin` | `fecha_fin` | DATE | No |  | No | No |  |  |
| `estado` | `estado` | VARCHAR(50) | No |  | No | No |  | CHECK (estado IN ('pendiente', 'en_progreso', 'completada', 'vencida')) |
| `avance` | `avance` | INTEGER | No |  | No | No |  |  |
| `evidencias` | `evidencias` | JSONB | No |  | No | No |  |  |
| `observaciones` | `observaciones` | TEXT | No |  | Sí | No |  |  |
| `plan_mejoramiento_id` | `plan_mejoramiento_id` | UUID | No |  | No | No |  | REFERENCES control_interno.plan_mejoramiento(id) |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.actividad_etapa_auditoria`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `etapa_id` | `etapa_id` | UUID | No |  | No | No |  | REFERENCES control_interno.etapa_auditoria(id) |
| `nombre` | `nombre` | VARCHAR(500) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | TEXT | No |  | Sí | No |  |  |
| `tipo` | `tipo` | VARCHAR(100) | No |  | No | No |  |  |
| `estado` | `estado` | VARCHAR(50) | No |  | No | No | 'pendiente' | CHECK (estado IN ('pendiente', 'en-progreso', 'completada')) |
| `responsable` | `responsable` | VARCHAR(255) | No |  | Sí | No |  |  |
| `fecha_limite` | `fecha_limite` | DATE | No |  | Sí | No |  |  |
| `completada` | `completada` | BOOLEAN | No |  | Sí | No | FALSE |  |
| `fecha_completacion` | `fecha_completacion` | TIMESTAMP | No |  | Sí | No |  |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.actividad_plan_anual_5`

- Entidad/definición: `ActividadPlanAnual5`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/plan-anual-5-roles/entities/actividad-plan-anual-5.entity.ts`
- Relaciones declaradas:
  - `rol`: ManyToOne -> `RolPlanAnual5` por `rol_id`
  - `plan`: ManyToOne -> `PlanAnual5Roles` por `plan_id`
  - `adjuntos`: OneToMany -> `AdjuntoActividadPlanAnual5`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `rol_id` | `rolId` | uuid | No | ManyToOne -> RolPlanAnual5 | No | No |  | Índice:  |
| `plan_id` | `planId` | uuid | No | ManyToOne -> PlanAnual5Roles | No | No |  | Índice:  |
| `nombre` | `nombre` | varchar (length 500) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `responsable` | `responsable` | varchar (length 255) | No |  | No | No |  |  |
| `fecha_inicio` | `fecha_inicio` | date | No |  | No | No |  |  |
| `fecha_fin` | `fecha_fin` | date | No |  | No | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | pendiente | Índice:  |
| `porcentaje_avance` | `porcentaje_avance` | integer | No |  | No | No | 0 |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `prioridad` | `prioridad` | varchar (length 20) | No |  | No | No | Media |  |
| `control` | `control` | text | No |  | Sí | No |  |  |
| `evaluacion` | `evaluacion` | text | No |  | Sí | No |  |  |
| `seguimiento` | `seguimiento` | text | No |  | Sí | No |  |  |
| `requiere_verificacion_director` | `requiereVerificacionDirector` | boolean | No |  | No | No | false |  |
| `verificada_por_director` | `verificadaPorDirector` | boolean | No |  | No | No | false |  |
| `fecha_verificacion` | `fechaVerificacion` | timestamp | No |  | Sí | No |  |  |
| `observaciones_director` | `observacionesDirector` | text | No |  | Sí | No |  |  |
| `configuracion_evidencias` | `configuracionEvidencias` | jsonb | No |  | Sí | No |  |  |
| `tipo_calculo` | `tipoCalculo` | varchar (length 50) | No |  | No | No | manual |  |
| `total_auditorias_programadas` | `totalAuditoriasProgramadas` | integer | No |  | No | No | 0 |  |
| `total_auditorias_finalizadas` | `totalAuditoriasFinalizadas` | integer | No |  | No | No | 0 |  |
| `auditorias_por_tipo` | `auditoriasPorTipo` | jsonb | No |  | Sí | No |  |  |
| `puntos_control` | `puntos_control` | jsonb | No |  | No | No |  |  |
| `frecuencia_puntos_control` | `frecuencia_puntos_control` | varchar (length 20) | No |  | Sí | No |  |  |
| `responsables` | `responsables` | jsonb | No |  | No | No |  |  |
| `fecha_corte` | `fecha_corte` | date | No |  | Sí | No |  |  |
| `entradas_seguimiento` | `entradas_seguimiento` | jsonb | No |  | No | No |  |  |
| `tareas_seguimiento` | `tareas_seguimiento` | jsonb | No |  | No | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.actividad_rol`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `rol_id` | `rol_id` | UUID | No |  | No | No |  | REFERENCES control_interno.rol_decreto_648(id) |
| `nombre` | `nombre` | VARCHAR(255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | TEXT | No |  | Sí | No |  |  |
| `orden` | `orden` | INTEGER | No |  | Sí | No | 0 |  |
| `activa` | `activa` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.adjunto_actividad_plan_anual_5`

- Entidad/definición: `AdjuntoActividadPlanAnual5`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/plan-anual-5-roles/entities/adjunto-actividad-plan-anual-5.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|

#### Tabla `control_interno.aprobacion`

- Entidad/definición: `Aprobacion`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/aprobaciones/entities/aprobacion.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 255) | No |  | Sí | Sí |  |  |
| `tipo` | `tipo` | varchar (length 100, enum AprobacionTipo) | No |  | Sí | No |  |  |
| `titulo` | `titulo` | varchar (length 500) | No |  | Sí | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `solicitante` | `solicitante` | varchar (length 255) | No |  | Sí | No |  |  |
| `fecha_solicitud` | `fechaSolicitud` | date | No |  | Sí | No |  |  |
| `prioridad` | `prioridad` | varchar (length 20, enum AprobacionPrioridad) | No |  | No | No | AprobacionPrioridad.MEDIA |  |
| `estado` | `estado` | varchar (length 50, enum AprobacionEstado) | No |  | No | No | AprobacionEstado.PENDIENTE |  |
| `territorial` | `territorial` | varchar (length 255) | No |  | Sí | No |  |  |
| `sede` | `sede` | varchar (length 255) | No |  | Sí | No |  |  |
| `relacionado` | `relacionado` | varchar (length 255) | No |  | Sí | No |  |  |
| `area` | `area` | varchar (length 255) | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `fecha_aprobacion` | `fechaAprobacion` | timestamp | No |  | Sí | No |  |  |
| `aprobado_por` | `aprobadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `motivo_rechazo` | `motivoRechazo` | text | No |  | Sí | No |  |  |
| `fecha_rechazo` | `fechaRechazo` | timestamp | No |  | Sí | No |  |  |
| `rechazado_por` | `rechazadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `documentos_count` | `documentosCount` | int | No |  | No | No | 0 |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.auditor_perfil`

- Entidad/definición: `AuditorPerfil`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/auditorias/entities/auditor-perfil.entity.ts`
- Índices de entidad: `['personaId'], { unique: true }`, `['especialidad']`, `['estadoDisponibilidad']`, `['activo']`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `persona_id` | `personaId` | bigint | No |  | No | Sí |  |  |
| `especialidad` | `especialidad` | varchar (length 255) | No |  | Sí | No |  |  |
| `cargo` | `cargo` | varchar (length 100) | No |  | Sí | No |  |  |
| `nivel_experiencia` | `nivelExperiencia` | varchar (length 50) | No |  | Sí | No |  |  |
| `estado_disponibilidad` | `estadoDisponibilidad` | varchar (length 50) | No |  | No | No | EstadoDisponibilidad.DISPONIBLE |  |
| `fecha_ultima_actividad` | `fechaUltimaActividad` | date | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.auditoria`

- Entidad/definición: `Auditoria`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/auditorias/entities/auditoria.entity.ts`
- Índices de entidad: `['codigo'], { unique: true }`, `['tipo']`, `['fase']`, `['prioridad']`, `['territorial']`, `['fechaInicio', 'fechaFin']`, `['estadoKanban']`, `['auditorLiderId']`, `['auditorAsignadoId']`
- Relaciones declaradas:
  - `objetivos`: OneToMany -> `ObjetivoAuditoria`
  - `equipoAuditores`: OneToMany -> `EquipoAuditor`
  - `notas`: OneToMany -> `NotaAuditoria`
  - `historial`: OneToMany -> `HistorialAuditoria`
  - `criterios`: OneToMany -> `CriterioAuditoria`
  - `territorialInfo`: OneToOne -> `AuditoriaTerritorialInfo`
  - `especialInfo`: OneToOne -> `AuditoriaEspecialInfo`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 255) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | varchar (length 500) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `tipo` | `tipo` | varchar (length 255) | No |  | No | No |  |  |
| `fase` | `fase` | varchar (length 50) | No |  | No | No | FaseAuditoria.PLANEACION |  |
| `territorial` | `territorial` | varchar (length 255) | No |  | No | No |  |  |
| `sede` | `sede` | varchar (length 255) | No |  | No | No |  |  |
| `responsable` | `responsable` | varchar (length 255) | No |  | No | No |  |  |
| `fecha_inicio` | `fechaInicio` | date | No |  | No | No |  |  |
| `fecha_fin_planeacion` | `fechaFinPlaneacion` | date | No |  | Sí | No |  |  |
| `fecha_inicio_ejecucion` | `fechaInicioEjecucion` | date | No |  | Sí | No |  |  |
| `fecha_fin_ejecucion` | `fechaFinEjecucion` | date | No |  | Sí | No |  |  |
| `fecha_inicio_comunicacion` | `fechaInicioComunicacion` | date | No |  | Sí | No |  |  |
| `fecha_fin` | `fechaFin` | date | No |  | No | No |  |  |
| `progreso` | `progreso` | integer | No |  | No | No | 0 |  |
| `prioridad` | `prioridad` | varchar (length 20) | No |  | No | No | PrioridadAuditoria.MEDIA |  |
| `hallazgos` | `hallazgos` | integer | No |  | No | No | 0 |  |
| `estado_kanban` | `estadoKanban` | varchar (length 50) | No |  | Sí | No |  |  |
| `riesgo_kanban` | `riesgoKanban` | varchar (length 20) | No |  | Sí | No |  |  |
| `semaforo` | `semaforo` | varchar (length 20) | No |  | Sí | No | SemaforoColor.VERDE |  |
| `tipo_kanban` | `tipoKanban` | varchar (length 50) | No |  | Sí | No | TipoKanban.REGULAR |  |
| `prioridad_kanban` | `prioridadKanban` | varchar (length 20) | No |  | Sí | No | PrioridadKanban.MEDIA |  |
| `area_objetivo` | `areaObjetivo` | varchar (length 255) | No |  | Sí | No |  |  |
| `permite_cambiar_objetivos` | `permiteCambiarObjetivos` | boolean | No |  | No | No | true |  |
| `calificacion_riesgo` | `calificacionRiesgo` | varchar (length 255) | No |  | Sí | No |  |  |
| `ultima_actuacion` | `ultimaActuacion` | text | No |  | Sí | No |  |  |
| `dias_restantes` | `diasRestantes` | integer | No |  | Sí | No |  |  |
| `porcentaje_tiempo` | `porcentajeTiempo` | integer | No |  | Sí | No |  |  |
| `total_documentos` | `totalDocumentos` | integer | No |  | No | No | 0 |  |
| `total_informes` | `totalInformes` | integer | No |  | No | No | 0 |  |
| `total_tareas` | `totalTareas` | integer | No |  | No | No | 0 |  |
| `actividades_completas` | `actividadesCompletas` | boolean | No |  | No | No | false |  |
| `actividades_pendientes` | `actividadesPendientes` | integer | No |  | No | No | 0 |  |
| `actividad_plan_anual_id` | `actividadPlanAnualId` | uuid | No |  | Sí | No |  |  |
| `auditor_lider_id` | `auditorLiderId` | uuid | No |  | Sí | No |  |  |
| `auditor_asignado_id` | `auditorAsignadoId` | uuid | No |  | Sí | No |  |  |
| `supervisor_asignado_id` | `supervisorAsignadoId` | uuid | No |  | Sí | No |  |  |
| `alcance` | `alcance` | text | No |  | Sí | No |  |  |
| `proceso_auditado` | `procesoAuditado` | varchar (length 500) | No |  | Sí | No |  |  |
| `responsable_area_nombre` | `responsableAreaNombre` | varchar (length 255) | No |  | Sí | No |  |  |
| `responsable_area_cargo` | `responsableAreaCargo` | varchar (length 255) | No |  | Sí | No |  |  |
| `responsable_area_email` | `responsableAreaEmail` | varchar (length 255) | No |  | Sí | No |  |  |
| `fecha_reunion_apertura` | `fechaReunionApertura` | timestamp | No |  | Sí | No |  |  |
| `observaciones_adicionales` | `observacionesAdicionales` | text | No |  | Sí | No |  |  |
| `checklist_completados` | `checklistCompletados` | jsonb | No |  | Sí | No |  |  |
| `programa_anual_metadata` | `programaAnualMetadata` | jsonb | No |  | Sí | No |  |  |
| `archivada` | `archivada` | boolean | No |  | No | No | false |  |
| `fecha_archivo` | `fechaArchivo` | timestamp | No |  | Sí | No |  |  |
| `activa` | `activa` | boolean | No |  | No | No | true |  |
| `fecha_eliminacion` | `fechaEliminacion` | timestamp | No |  | Sí | No |  |  |
| `aprobada` | `aprobada` | boolean | No |  | No | No | false |  |
| `fecha_aprobacion` | `fechaAprobacion` | timestamp | No |  | Sí | No |  |  |
| `aprobada_por` | `aprobadaPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `aprobada_por_id` | `aprobadaPorId` | bigint | No |  | Sí | No |  |  |
| `fecha_finalizacion` | `fechaFinalizacion` | timestamp | No |  | Sí | No |  |  |
| `finalizada_por` | `finalizadaPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `finalizada_por_id` | `finalizadaPorId` | bigint | No |  | Sí | No |  |  |
| `documento_cierre` | `documentoCierre` | jsonb | No |  | Sí | No |  |  |
| `observaciones_cierre` | `observacionesCierre` | text | No |  | Sí | No |  |  |
| `lecciones_aprendidas` | `leccionesAprendidas` | text | No |  | Sí | No |  |  |
| `recomendaciones_futuras_auditorias` | `recomendacionesFuturasAuditorias` | text | No |  | Sí | No |  |  |
| `informe_cierre_aprobado` | `informeCierreAprobado` | boolean | No |  | No | No | false |  |
| `informe_cierre_aprobado_por` | `informeCierreAprobadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `informe_cierre_aprobado_por_id` | `informeCierreAprobadoPorId` | bigint | No |  | Sí | No |  |  |
| `informe_cierre_aprobado_at` | `informeCierreAprobadoAt` | timestamp | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.auditoria_especial_info`

- Entidad/definición: `AuditoriaEspecialInfo`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/auditorias/entities/auditoria-especial-info.entity.ts`
- Índices de entidad: `['auditoriaId'], { unique: true }`
- Relaciones declaradas:
  - `auditoria`: OneToOne -> `Auditoria` por `auditoria_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | integer generated | Sí |  | No | No |  |  |
| `auditoria_id` | `auditoriaId` | uuid | No | OneToOne -> Auditoria | No | Sí |  |  |
| `tipo_motivo` | `tipoMotivo` | varchar (length 255) | No |  | No | No |  |  |
| `solicitante` | `solicitante` | varchar (length 255) | No |  | No | No |  |  |
| `justificacion` | `justificacion` | text | No |  | No | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.auditoria_gestion`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `codigo` | `codigo` | VARCHAR(255) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | VARCHAR(500) | No |  | No | No |  |  |
| `tipo` | `tipo` | VARCHAR(100) | No |  | No | No |  |  |
| `fase` | `fase` | VARCHAR(50) | No |  | No | No | 'planeacion' | CHECK (fase IN ('planeacion', 'en-curso', 'revision', 'completada')) |
| `territorial` | `territorial` | VARCHAR(255) | No |  | Sí | No |  |  |
| `sede` | `sede` | VARCHAR(255) | No |  | Sí | No |  |  |
| `responsable` | `responsable` | VARCHAR(255) | No |  | No | No |  |  |
| `fecha_inicio` | `fecha_inicio` | DATE | No |  | No | No |  |  |
| `fecha_fin` | `fecha_fin` | DATE | No |  | No | No |  |  |
| `progreso` | `progreso` | INTEGER | No |  | Sí | No | 0 | CHECK (progreso BETWEEN 0 AND 100) |
| `prioridad` | `prioridad` | VARCHAR(20) | No |  | No | No | 'Media' | CHECK (prioridad IN ('Alta', 'Media', 'Baja')) |
| `hallazgos_count` | `hallazgos_count` | INTEGER | No |  | Sí | No | 0 |  |
| `auditoria_programada_id` | `auditoria_programada_id` | UUID | No |  | Sí | No |  | REFERENCES control_interno.auditoria_programada(id) |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.auditoria_programada`

- Entidad/definición: `AuditoriaProgramada`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/programa-anual/entities/auditoria-programada.entity.ts`
- Índices de entidad: `['procesoId']`, `['estado']`, `['tipo']`
- Relaciones declaradas:
  - `proceso`: ManyToOne -> `ProcesoAuditable` por `proceso_id`
  - `programaAnual`: ManyToOne -> `ProgramaAnual` por `programa_anual_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 255) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `proceso_id` | `procesoId` | uuid | No | ManyToOne -> ProcesoAuditable | No | No |  |  |
| `proceso_codigo` | `procesoCodigo` | varchar (length 255) | No |  | No | No |  |  |
| `proceso_nombre` | `procesoNombre` | varchar (length 255) | No |  | No | No |  |  |
| `tipo` | `tipo` | varchar (length 50) | No |  | No | No |  |  |
| `alcance` | `alcance` | text | No |  | No | No |  |  |
| `proceso_auditar` | `procesoAuditar` | varchar (length 255) | No |  | No | No |  |  |
| `auditor_lider` | `auditorLider` | varchar (length 255) | No |  | No | No |  |  |
| `equipo_auditor` | `equipoAuditor` | jsonb | No |  | No | No |  |  |
| `fecha_inicio_planeada` | `fechaInicioPlaneada` | date | No |  | No | No |  |  |
| `fecha_fin_planeada` | `fechaFinPlaneada` | date | No |  | No | No |  |  |
| `duracion_dias` | `duracionDias` | integer | No |  | No | No |  |  |
| `prioridad` | `prioridad` | varchar (length 20) | No |  | No | No |  |  |
| `riesgo_inherente` | `riesgoInherente` | varchar (length 20) | No |  | No | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | EstadoAuditoriaProgramada.PLANEADA |  |
| `es_territorial` | `esTerritorial` | boolean | No |  | No | No | false |  |
| `territorial` | `territorial` | varchar (length 255) | No |  | Sí | No |  |  |
| `es_especial` | `esEspecial` | boolean | No |  | No | No | false |  |
| `solicitada_por` | `solicitadaPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `motivo_especial` | `motivoEspecial` | text | No |  | Sí | No |  |  |
| `etapas` | `etapas` | jsonb | No |  | No | No |  |  |
| `ampliaciones` | `ampliaciones` | jsonb | No |  | Sí | No |  |  |
| `fecha_limite_original` | `fechaLimiteOriginal` | date | No |  | No | No |  |  |
| `fecha_limite_actual` | `fechaLimiteActual` | date | No |  | No | No |  |  |
| `programa_anual_id` | `programaAnualId` | uuid | No | ManyToOne -> ProgramaAnual | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.auditoria_territorial_info`

- Entidad/definición: `AuditoriaTerritorialInfo`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/auditorias/entities/auditoria-territorial-info.entity.ts`
- Índices de entidad: `['auditoriaId'], { unique: true }`
- Relaciones declaradas:
  - `auditoria`: OneToOne -> `Auditoria` por `auditoria_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | integer generated | Sí |  | No | No |  |  |
| `auditoria_id` | `auditoriaId` | uuid | No | OneToOne -> Auditoria | No | Sí |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `ciudad` | `ciudad` | varchar (length 255) | No |  | No | No |  |  |
| `departamento` | `departamento` | varchar (length 255) | No |  | No | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.cache_esap`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `clave` | `clave` | VARCHAR(500) | No |  | No | Sí |  |  |
| `valor` | `valor` | JSONB | No |  | No | No |  |  |
| `fecha_expiracion` | `fecha_expiracion` | TIMESTAMP | No |  | Sí | No |  |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.configuracion_esap`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `clave` | `clave` | VARCHAR(255) | No |  | No | Sí |  |  |
| `valor` | `valor` | TEXT | No |  | No | No |  |  |
| `descripcion` | `descripcion` | TEXT | No |  | Sí | No |  |  |
| `tipo` | `tipo` | VARCHAR(50) | No |  | Sí | No | 'string' | CHECK (tipo IN ('string', 'number', 'boolean', 'json')) |
| `categoria` | `categoria` | VARCHAR(255) | No |  | Sí | No |  |  |
| `activo` | `activo` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.configuracion_profesionales_ocig`

- Entidad/definición: `ConfiguracionProfesionalOCIG`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/configuraciones/entities/configuracion-profesional-ocig.entity.ts`
- Índices de entidad: `['idTercero'], { unique: true }`, `['rolOcig']`, `['activo']`, `['puedeSerLider']`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `id_tercero` | `idTercero` | varchar (length 36) | No |  | No | No |  |  |
| `rol_ocig` | `rolOcig` | varchar (length 100) | No |  | No | No | Auditor |  |
| `especialidades` | `especialidades` | text (array) | No |  | No | No | {} |  |
| `capacidad_maxima_auditorias` | `capacidadMaximaAuditorias` | int | No |  | No | No | 4 |  |
| `horas_mensuales_disponibles` | `horasMensualesDisponibles` | int | No |  | No | No | 150 |  |
| `puede_ser_lider` | `puedeSerLider` | boolean | No |  | No | No | true |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `fecha_asignacion` | `fechaAsignacion` | date | No |  | No | No | () => 'CURRENT_DATE' |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `created_by` | `createdBy` | uuid | No |  | Sí | No |  |  |
| `updated_by` | `updatedBy` | uuid | No |  | Sí | No |  |  |

#### Tabla `control_interno.criterio_auditoria`

- Entidad/definición: `CriterioAuditoria`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/auditorias/entities/criterio-auditoria.entity.ts`
- Índices de entidad: `['auditoriaId']`, `['activo']`
- Relaciones declaradas:
  - `auditoria`: ManyToOne -> `Auditoria` por `auditoria_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | integer generated | Sí |  | No | No |  |  |
| `auditoria_id` | `auditoriaId` | uuid | No | ManyToOne -> Auditoria | No | No |  |  |
| `criterio` | `criterio` | text | No |  | No | No |  |  |
| `orden` | `orden` | integer | No |  | No | No | 0 |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.cronograma_auditoria`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `plan_id` | `plan_id` | UUID | No |  | No | No |  | REFERENCES control_interno.plan_anual(id) |
| `codigo` | `codigo` | VARCHAR(255) | No |  | No | No |  |  |
| `nombre` | `nombre` | VARCHAR(255) | No |  | No | No |  |  |
| `proceso` | `proceso` | VARCHAR(255) | No |  | No | No |  |  |
| `nivel_riesgo` | `nivel_riesgo` | VARCHAR(20) | No |  | Sí | No |  | CHECK (nivel_riesgo IN ('Alto', 'Medio', 'Bajo')) |
| `trimestre` | `trimestre` | VARCHAR(10) | No |  | No | No |  |  |
| `fecha_inicio` | `fecha_inicio` | DATE | No |  | No | No |  |  |
| `fecha_fin` | `fecha_fin` | DATE | No |  | No | No |  |  |
| `auditor_responsable` | `auditor_responsable` | VARCHAR(255) | No |  | Sí | No |  |  |
| `horas_estimadas` | `horas_estimadas` | INTEGER | No |  | No | No |  |  |
| `estado` | `estado` | VARCHAR(50) | No |  | Sí | No | 'planificado' | CHECK (estado IN ('planificado', 'en-ejecucion', 'completada', 'cancelada', 'en-revision')) |
| `es_territorial` | `es_territorial` | BOOLEAN | No |  | Sí | No | FALSE |  |
| `territorial` | `territorial` | VARCHAR(255) | No |  | Sí | No |  |  |
| `es_especial` | `es_especial` | BOOLEAN | No |  | Sí | No | FALSE |  |
| `equipo` | `equipo` | JSONB | No |  | Sí | No |  |  |
| `etapas_cronograma` | `etapas_cronograma` | JSONB | No |  | Sí | No |  |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.datos_automaticos_informe`

- Entidad/definición: `DatosAutomaticosInforme`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/informes-ley/entities/datos-automaticos-informe.entity.ts`
- Índices de entidad: `['entregaId']`, `['tipoDato']`
- Relaciones declaradas:
  - `entrega`: ManyToOne -> `EntregaInformeLey` por `entrega_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `entrega_id` | `entregaId` | uuid | No | ManyToOne -> EntregaInformeLey | No | No |  |  |
| `tipo_dato` | `tipoDato` | varchar (length 100) | No |  | No | No |  |  |
| `datos` | `datos` | jsonb | No |  | No | No | {} |  |
| `fecha_generacion` | `fechaGeneracion` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' |  |
| `fuente_datos` | `fuenteDatos` | varchar (length 255) | No |  | Sí | No |  |  |
| `version_datos` | `versionDatos` | varchar (length 50) | No |  | No | No | 1.0 |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.documento`

- Entidad/definición: `Documento`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/documentos/entities/documento.entity.ts`
- Índices de entidad: `['auditoriaId']`, `['hallazgoId']`, `['planMejoramientoId']`, `['tipoDocumento']`, `['etapa']`
- Relaciones declaradas:
  - `auditoria`: ManyToOne -> `Auditoria` por `auditoria_id`
  - `hallazgo`: ManyToOne -> `Hallazgo` por `hallazgo_id`
  - `planMejoramiento`: ManyToOne -> `PlanMejoramiento` por `plan_mejoramiento_id`
  - `documentoBiblioteca`: ManyToOne -> `Documento` por `documento_biblioteca_id`
  - `versionAnterior`: ManyToOne -> `Documento` por `version_anterior_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `tipo_documento` | `tipoDocumento` | varchar (length 100) | No |  | No | No |  |  |
| `etapa` | `etapa` | varchar (length 50) | No |  | Sí | No |  |  |
| `etapa_kanban_id` | `etapaKanbanId` | uuid | No |  | Sí | No |  |  |
| `etapa_kanban_nombre` | `etapaNombreKanban` | varchar (length 255) | No |  | Sí | No |  |  |
| `auditoria_id` | `auditoriaId` | uuid | No | ManyToOne -> Auditoria | Sí | No |  |  |
| `hallazgo_id` | `hallazgoId` | uuid | No | ManyToOne -> Hallazgo | Sí | No |  |  |
| `plan_mejoramiento_id` | `planMejoramientoId` | uuid | No | ManyToOne -> PlanMejoramiento | Sí | No |  |  |
| `documento_biblioteca_id` | `documentoBibliotecaId` | uuid | No | ManyToOne -> Documento | Sí | No |  |  |
| `visible_auditoria_id` | `visibleAuditoriaId` | uuid | No |  | Sí | No |  |  |
| `ruta_archivo` | `rutaArchivo` | varchar (length 500) | No |  | No | No |  |  |
| `nombre_archivo` | `nombreArchivo` | varchar (length 255) | No |  | No | No |  |  |
| `tipo_mime` | `tipoMime` | varchar (length 100) | No |  | No | No |  |  |
| `tamanio_bytes` | `tamanioBytes` | bigint | No |  | No | No |  |  |
| `version` | `version` | integer | No |  | No | No | 1 |  |
| `version_anterior_id` | `versionAnteriorId` | uuid | No | ManyToOne -> Documento | Sí | No |  |  |
| `subido_por` | `subidoPor` | varchar (length 255) | No |  | No | No |  |  |
| `hash_archivo` | `hashArchivo` | varchar (length 255) | No |  | Sí | No |  |  |
| `comprimido` | `comprimido` | boolean | No |  | No | No | false |  |
| `ruta_servidor_g` | `rutaServidorG` | varchar (length 500) | No |  | Sí | No |  |  |
| `sincronizado_servidor_g` | `sincronizadoServidorG` | boolean | No |  | No | No | false |  |
| `fecha_sincronizacion` | `fechaSincronizacion` | timestamp | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.documento_aprobacion`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `aprobacion_id` | `aprobacion_id` | UUID | No |  | No | No |  | REFERENCES control_interno.aprobacion(id) |
| `documento_id` | `documento_id` | UUID | No |  | Sí | No |  | REFERENCES control_interno.documento(id) |
| `nombre_archivo` | `nombre_archivo` | VARCHAR(255) | No |  | No | No |  |  |
| `ruta_archivo` | `ruta_archivo` | VARCHAR(500) | No |  | Sí | No |  |  |
| `tipo_mime` | `tipo_mime` | VARCHAR(100) | No |  | Sí | No |  |  |
| `tamanio_bytes` | `tamanio_bytes` | BIGINT | No |  | Sí | No |  |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.documento_plan_mejoramiento`

- Entidad/definición: `DocumentoPlanMejoramiento`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/planes-mejoramiento/entities/documento-plan.entity.ts`
- Índices de entidad: `['planMejoramientoId']`, `['accionId']`
- Relaciones declaradas:
  - `planMejoramiento`: ManyToOne -> `PlanMejoramiento` por `plan_mejoramiento_id`
  - `accion`: ManyToOne -> `AccionCorrectiva` por `accion_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `plan_mejoramiento_id` | `planMejoramientoId` | uuid | No | ManyToOne -> PlanMejoramiento | No | No |  |  |
| `accion_id` | `accionId` | uuid | No | ManyToOne -> AccionCorrectiva | Sí | No |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `tipo_documento` | `tipoDocumento` | varchar (length 100) | No |  | No | No |  |  |
| `ruta_archivo` | `rutaArchivo` | varchar (length 500) | No |  | No | No |  |  |
| `nombre_archivo_original` | `nombreArchivoOriginal` | varchar (length 255) | No |  | No | No |  |  |
| `tipo_mime` | `tipoMime` | varchar (length 100) | No |  | No | No |  |  |
| `tamanio_bytes` | `tamanioBytes` | bigint | No |  | No | No |  |  |
| `subido_por` | `subidoPor` | varchar (length 255) | No |  | No | No |  |  |
| `subido_por_id` | `subidoPorId` | bigint | No |  | Sí | No |  |  |
| `fecha_subida` | `fechaSubida` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' |  |
| `estado_validacion` | `estadoValidacion` | varchar (length 50) | No |  | No | No | PENDIENTE_REVISION |  |
| `comentarios_auditor` | `comentariosAuditor` | text | No |  | Sí | No |  |  |
| `fecha_validacion` | `fechaValidacion` | timestamp | No |  | Sí | No |  |  |
| `validado_por` | `validadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `solicita_nueva_evidencia` | `solicitaNuevaEvidencia` | boolean | No |  | No | No | false |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.entrega_informe_ley`

- Entidad/definición: `EntregaInformeLey`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/informes-ley/entities/entrega-informe-ley.entity.ts`
- Índices de entidad: `['informeId']`, `['periodo']`, `['estado']`, `['fechaVencimiento']`
- Relaciones declaradas:
  - `informeLey`: ManyToOne -> `InformeLey` por `informe_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `informe_id` | `informeId` | uuid | No | ManyToOne -> InformeLey | No | No |  |  |
| `periodo` | `periodo` | varchar (length 50) | No |  | No | No |  |  |
| `fecha_vencimiento` | `fechaVencimiento` | date | No |  | No | No |  |  |
| `fecha_entrega` | `fechaEntrega` | timestamp | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | pendiente |  |
| `archivo_nombre` | `archivoNombre` | varchar (length 255) | No |  | Sí | No |  |  |
| `archivo_url` | `archivoUrl` | varchar (length 500) | No |  | Sí | No |  |  |
| `archivo_tamano` | `archivoTamano` | bigint | No |  | Sí | No |  |  |
| `elaborado_por` | `elaboradoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `fecha_elaboracion` | `fechaElaboracion` | timestamp | No |  | Sí | No |  |  |
| `aprobado_por` | `aprobadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `fecha_aprobacion` | `fechaAprobacion` | timestamp | No |  | Sí | No |  |  |
| `enviado_por` | `enviadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `numero_radicado` | `numeroRadicado` | varchar (length 255) | No |  | Sí | No |  |  |
| `fecha_radicacion` | `fechaRadicacion` | timestamp | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `motivo_rechazo` | `motivoRechazo` | text | No |  | Sí | No |  |  |
| `estado_workflow` | `estadoWorkflow` | varchar (length 50) | No |  | Sí | No | borrador |  |
| `datos_automaticos_poblados` | `datosAutomaticosPoblados` | boolean | No |  | Sí | No | false |  |
| `fecha_generacion` | `fechaGeneracion` | timestamp | No |  | Sí | No |  |  |
| `generado_por` | `generadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `formato_archivo` | `formatoArchivo` | varchar (length 50) | No |  | Sí | No |  |  |
| `plantilla_usada` | `plantillaUsada` | varchar (length 255) | No |  | Sí | No |  |  |
| `version_plantilla` | `versionPlantilla` | varchar (length 50) | No |  | Sí | No |  |  |
| `metadata_generacion` | `metadataGeneracion` | jsonb | No |  | Sí | No | {} |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.equipo_auditor`

- Entidad/definición: `EquipoAuditor`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/auditorias/entities/equipo-auditor.entity.ts`
- Índices de entidad: `['auditoriaId']`, `['personaId']`, `['activo']`
- Relaciones declaradas:
  - `auditoria`: ManyToOne -> `Auditoria` por `auditoria_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | integer generated | Sí |  | No | No |  |  |
| `auditoria_id` | `auditoriaId` | uuid | No | ManyToOne -> Auditoria | No | No |  |  |
| `persona_id` | `personaId` | uuid | No |  | No | No |  |  |
| `rol` | `rol` | varchar (length 100) | No |  | No | No | Auditor |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `fecha_asignacion` | `fechaAsignacion` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' |  |
| `fecha_retiro` | `fechaRetiro` | timestamp | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.etapa_auditoria`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `auditoria_id` | `auditoria_id` | UUID | No |  | No | No |  | REFERENCES control_interno.auditoria_programada(id) |
| `etapa` | `etapa` | VARCHAR(50) | No |  | No | No |  | CHECK (etapa IN ('planeacion', 'ejecucion', 'comunicacion')) |
| `estado` | `estado` | VARCHAR(50) | No |  | No | No |  | CHECK (estado IN ('pendiente', 'en_progreso', 'completada')) |
| `fecha_inicio` | `fecha_inicio` | DATE | No |  | No | No |  |  |
| `fecha_fin` | `fecha_fin` | DATE | No |  | Sí | No |  |  |
| `fecha_limite` | `fecha_limite` | DATE | No |  | No | No |  |  |
| `datos` | `datos` | JSONB | No |  | No | No |  |  |
| `porcentaje_avance` | `porcentaje_avance` | INTEGER | No |  | Sí | No | 0 | CHECK (porcentaje_avance BETWEEN 0 AND 100) |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.etapa_kanban`

- Entidad/definición: `EtapaKanban`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/tableros-kanban/entities/etapa-kanban.entity.ts`
- Índices de entidad: `['tableroKanbanId', 'orden']`, `['deletedAt'], { where: 'deleted_at IS NULL' }`
- Relaciones declaradas:
  - `tableroKanban`: ManyToOne -> `TableroKanban` por `tablero_kanban_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `tablero_kanban_id` | `tableroKanbanId` | uuid | No | ManyToOne -> TableroKanban | No | No |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `orden` | `orden` | integer | No |  | No | No |  |  |
| `color` | `color` | varchar (length 7) | No |  | No | No |  |  |
| `tiempo_sla` | `tiempoSLA` | integer | No |  | No | No | 0 |  |
| `limite_wip` | `limiteWIP` | integer | No |  | Sí | No |  |  |
| `visible` | `visible` | boolean | No |  | No | No | true |  |
| `notificar_vencimiento` | `notificarVencimiento` | boolean | No |  | No | No | false |  |
| `dias_anticipacion_alerta` | `diasAnticipacionAlerta` | integer | No |  | No | No | 0 |  |
| `estado` | `estado` | varchar (length 20) | No |  | No | No | EstadoEtapa.INTERMEDIA |  |
| `permitir_retroceso` | `permitirRetroceso` | boolean | No |  | No | No | false |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `deleted_at` | `deletedAt` | timestamp | No |  | Sí | No |  | Borrado lógico |

#### Tabla `control_interno.evaluacion_proceso`

- Entidad/definición: `EvaluacionProceso`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/universo-auditorias/entities/evaluacion-proceso.entity.ts`
- Índices de entidad: `['procesoId', 'vigencia', 'fechaCorte'], { unique: true }`, `['vigencia']`, `['decisionFinal']`
- Relaciones declaradas:
  - `proceso`: ManyToOne -> `ProcesoAuditable` por `proceso_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `proceso_id` | `procesoId` | uuid | No | ManyToOne -> ProcesoAuditable | No | No |  |  |
| `vigencia` | `vigencia` | integer | No |  | No | No |  |  |
| `fecha_corte` | `fechaCorte` | date | No |  | No | No |  |  |
| `dependencia_responsable` | `dependenciaResponsable` | varchar (length 255) | No |  | No | No |  |  |
| `riesgos_extremos` | `riesgosExtremos` | integer | No |  | No | No | 0 |  |
| `riesgos_altos` | `riesgosAltos` | integer | No |  | No | No | 0 |  |
| `riesgos_moderados` | `riesgosModerados` | integer | No |  | No | No | 0 |  |
| `riesgos_bajos` | `riesgosBajos` | integer | No |  | No | No | 0 |  |
| `total_riesgos` | `totalRiesgos` | integer | No |  | No | No | 0 |  |
| `requerimiento_comite` | `requerimientoComite` | boolean | No |  | No | No | false |  |
| `requerimiento_entes_reg` | `requerimientoEntesReg` | boolean | No |  | No | No | false |  |
| `fecha_ultima_auditoria` | `fechaUltimaAuditoria` | date | No |  | Sí | No |  |  |
| `resultado_ultima_auditoria` | `resultadoUltimaAuditoria` | varchar (length 100) | No |  | Sí | No |  |  |
| `criticidad` | `criticidad` | integer | No |  | No | No | 0 |  |
| `exposicion` | `exposicion` | integer | No |  | No | No | 0 |  |
| `mitigantes` | `mitigantes` | integer | No |  | No | No | 0 |  |
| `score_riesgo` | `scoreRiesgo` | integer | No |  | No | No | 0 |  |
| `tiempo_ultima_auditoria` | `tiempoUltimaAuditoria` | integer | No |  | No | No | 0 |  |
| `temas_alta_direccion` | `temasAltaDireccion` | integer | No |  | No | No | 0 |  |
| `objetivos_estrategicos` | `objetivosEstrategicos` | integer | No |  | No | No | 0 |  |
| `hallazgos_anteriores` | `hallazgosAnteriores` | integer | No |  | No | No | 0 |  |
| `ponderacion_final_dafp` | `ponderacionFinalDafp` | decimal (precision 4, scale 2) | No |  | No | No | 0 |  |
| `nivel_criticidad_dafp` | `nivelCriticidadDafp` | varchar (length 20) | No |  | Sí | No |  |  |
| `ciclo_rotacion_dafp` | `cicloRotacionDafp` | varchar (length 20) | No |  | Sí | No |  |  |
| `ponderacion_riesgo` | `ponderacionRiesgo` | varchar (length 20) | No |  | Sí | No |  |  |
| `dias_transcurridos` | `diasTranscurridos` | integer | No |  | Sí | No |  |  |
| `plan_rotacion` | `planRotacion` | varchar (length 20) | No |  | Sí | No |  |  |
| `dias_rotacion` | `diasRotacion` | integer | No |  | No | No | 360 |  |
| `decision_rotacion` | `decisionRotacion` | varchar (length 20) | No |  | Sí | No |  |  |
| `decision_final` | `decisionFinal` | varchar (length 50) | No |  | Sí | No |  |  |
| `motivo_decision` | `motivoDecision` | text | No |  | Sí | No |  |  |
| `prioridad_regla` | `prioridadRegla` | integer | No |  | Sí | No |  |  |
| `creado_por` | `creadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.eventos_timeline`

- Entidad/definición: `EventoTimeline`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/planes-mejoramiento/entities/evento-timeline.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `plan_mejoramiento_id` | `planMejoramientoId` | uuid | No |  | No | No |  |  |
| `tipo` | `tipo` | enum (enum TipoEventoTimeline) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | No | No |  |  |
| `usuario_id` | `usuarioId` | uuid | No |  | Sí | No |  |  |
| `usuario_nombre` | `usuarioNombre` | varchar (length 255) | No |  | Sí | No |  |  |
| `fecha` | `fecha` | timestamp with time zone | No |  | No | No | () => 'CURRENT_TIMESTAMP' |  |
| `metadata` | `metadata` | jsonb | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp with time zone | No |  | No | No |  | Fecha de creación automática |

#### Tabla `control_interno.evidencia_documento`

- Entidad/definición: `EvidenciaDocumento`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/evidencias/entities/evidencia-documento.entity.ts`
- Índices de entidad: `['hallazgoId']`, `['accionCorrectivaId']`, `['planMejoramientoId']`, `['auditoriaId']`, `['estadoValidacion']`, `['tipoDocumento']`
- Relaciones declaradas:
  - `hallazgo`: ManyToOne -> `Hallazgo` por `hallazgo_id`
  - `accionCorrectiva`: ManyToOne -> `AccionCorrectiva` por `accion_correctiva_id`
  - `planMejoramiento`: ManyToOne -> `PlanMejoramiento` por `plan_mejoramiento_id`
  - `auditoria`: ManyToOne -> `Auditoria` por `auditoria_id`
  - `versionAnterior`: OneToOne -> `EvidenciaDocumento` por `version_anterior_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 50) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `tipo_documento` | `tipoDocumento` | varchar (length 100) | No |  | No | No |  |  |
| `hallazgo_id` | `hallazgoId` | uuid | No | ManyToOne -> Hallazgo | Sí | No |  |  |
| `accion_correctiva_id` | `accionCorrectivaId` | uuid | No | ManyToOne -> AccionCorrectiva | Sí | No |  |  |
| `plan_mejoramiento_id` | `planMejoramientoId` | uuid | No | ManyToOne -> PlanMejoramiento | Sí | No |  |  |
| `auditoria_id` | `auditoriaId` | uuid | No | ManyToOne -> Auditoria | Sí | No |  |  |
| `ruta_archivo` | `rutaArchivo` | varchar (length 500) | No |  | No | No |  |  |
| `nombre_archivo_original` | `nombreArchivoOriginal` | varchar (length 255) | No |  | No | No |  |  |
| `tipo_mime` | `tipoMime` | varchar (length 100) | No |  | No | No |  |  |
| `tamanio_bytes` | `tamanioBytes` | bigint | No |  | No | No |  |  |
| `hash_archivo` | `hashArchivo` | varchar (length 255) | No |  | Sí | No |  |  |
| `version` | `version` | integer | No |  | No | No | 1 |  |
| `version_anterior_id` | `versionAnteriorId` | uuid | No | OneToOne -> EvidenciaDocumento | Sí | No |  |  |
| `es_version_actual` | `esVersionActual` | boolean | No |  | No | No | true |  |
| `estado_validacion` | `estadoValidacion` | varchar (length 50) | No |  | No | No | EstadoValidacion.PENDIENTE |  |
| `validado_por` | `validadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `fecha_validacion` | `fechaValidacion` | timestamp | No |  | Sí | No |  |  |
| `observaciones_validacion` | `observacionesValidacion` | text | No |  | Sí | No |  |  |
| `subido_por` | `subidoPor` | varchar (length 255) | No |  | No | No |  |  |
| `subido_por_id` | `subidoPorId` | bigint | No |  | Sí | No |  |  |
| `fecha_subida` | `fechaSubida` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' |  |
| `ruta_servidor_g` | `rutaServidorG` | varchar (length 500) | No |  | Sí | No |  |  |
| `sincronizado_servidor_g` | `sincronizadoServidorG` | boolean | No |  | No | No | false |  |
| `fecha_sincronizacion` | `fechaSincronizacion` | timestamp | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.hallazgo`

- Entidad/definición: `Hallazgo`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/hallazgos/entities/hallazgo.entity.ts`
- Relaciones declaradas:
  - `auditoriaEntity`: ManyToOne -> `Auditoria` por `auditoria_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 255) | No |  | No | Sí |  |  |
| `titulo` | `titulo` | varchar (length 500) | No |  | Sí | No |  |  |
| `categoria` | `categoria` | varchar (length 50) | No |  | No | No |  |  |
| `estado` | `estado` | varchar (length 100) | No |  | No | No | HallazgoEstado.BORRADOR |  |
| `area` | `area` | varchar (length 255) | No |  | No | No |  |  |
| `auditoria` | `auditoria` | varchar (length 255) | No |  | No | No |  |  |
| `auditoria_id` | `auditoriaId` | uuid | No | ManyToOne -> Auditoria | Sí | No |  |  |
| `descripcion` | `descripcion` | text | No |  | No | No |  |  |
| `criterio_incumplido` | `criterioIncumplido` | text | No |  | No | No |  |  |
| `causa` | `causa` | text | No |  | Sí | No |  |  |
| `efecto` | `efecto` | text | No |  | Sí | No |  |  |
| `normativa_relacionada` | `normativaRelacionada` | jsonb | No |  | No | No | () => "'[]'::jsonb" |  |
| `evidencias` | `evidencias` | jsonb | No |  | No | No | () => "'[]'::jsonb" |  |
| `recomendaciones` | `recomendaciones` | jsonb | No |  | No | No | () => "'[]'::jsonb" |  |
| `fecha_deteccion` | `fechaDeteccion` | date | No |  | No | No |  |  |
| `fecha_notificacion` | `fechaNotificacion` | date | No |  | Sí | No |  |  |
| `responsable` | `responsable` | varchar (length 255) | No |  | Sí | No |  |  |
| `fecha_limite_correccion` | `fechaLimiteCorreccion` | date | No |  | Sí | No |  |  |
| `observaciones_controversia` | `observacionesControversia` | text | No |  | Sí | No |  |  |
| `argumentos_controversia` | `argumentosControversia` | text | No |  | Sí | No |  |  |
| `documento_controversia_url` | `documentoControversiaUrl` | varchar (length 500) | No |  | Sí | No |  |  |
| `documento_controversia_nombre` | `documentoControversiaNombre` | varchar (length 255) | No |  | Sí | No |  |  |
| `decision_auditor` | `decisionAuditor` | varchar (length 50) | No |  | Sí | No |  |  |
| `fundamentacion_tecnica` | `fundamentacionTecnica` | text | No |  | Sí | No |  |  |
| `fecha_decision` | `fechaDecision` | timestamp | No |  | Sí | No |  |  |
| `auditor_decision_id` | `auditorDecisionId` | bigint | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.historial_auditoria`

- Entidad/definición: `HistorialAuditoria`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/auditorias/entities/historial-auditoria.entity.ts`
- Índices de entidad: `['auditoriaId']`, `['usuarioId']`, `['tipoEvento']`, `['fecha', 'hora']`
- Relaciones declaradas:
  - `auditoria`: ManyToOne -> `Auditoria` por `auditoria_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `auditoria_id` | `auditoriaId` | uuid | No | ManyToOne -> Auditoria | No | No |  |  |
| `tipo_evento` | `tipoEvento` | varchar (length 50) | No |  | No | No |  |  |
| `fecha` | `fecha` | date | No |  | No | No |  |  |
| `hora` | `hora` | time | No |  | No | No |  |  |
| `usuario_id` | `usuarioId` | uuid | No |  | Sí | No |  |  |
| `accion` | `accion` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `documento_adjunto` | `documentoAdjunto` | varchar (length 500) | No |  | Sí | No |  |  |
| `ip_address` | `ipAddress` | varchar (length 45) | No |  | Sí | No |  |  |
| `user_agent` | `userAgent` | text | No |  | Sí | No |  |  |
| `cambios` | `cambios` | jsonb | No |  | No | No | () => "'[]'::jsonb" |  |
| `estado_anterior` | `estadoAnterior` | varchar (length 50) | No |  | Sí | No |  |  |
| `estado_nuevo` | `estadoNuevo` | varchar (length 50) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `control_interno.historial_generacion_informe`

- Entidad/definición: `HistorialGeneracionInforme`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/informes-ley/entities/historial-generacion-informe.entity.ts`
- Índices de entidad: `['entregaId']`, `['accion']`, `['createdAt']`
- Relaciones declaradas:
  - `entrega`: ManyToOne -> `EntregaInformeLey` por `entrega_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `entrega_id` | `entregaId` | uuid | No | ManyToOne -> EntregaInformeLey | No | No |  |  |
| `accion` | `accion` | varchar (length 100) | No |  | No | No |  |  |
| `usuario_id` | `usuarioId` | varchar (length 255) | No |  | Sí | No |  |  |
| `usuario_nombre` | `usuarioNombre` | varchar (length 255) | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `datos_anteriores` | `datosAnteriores` | jsonb | No |  | Sí | No |  |  |
| `datos_nuevos` | `datosNuevos` | jsonb | No |  | Sí | No |  |  |
| `ip_origen` | `ipOrigen` | varchar (length 50) | No |  | Sí | No |  |  |
| `user_agent` | `userAgent` | text | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `control_interno.historial_plan_anual`

- Entidad/definición: `HistorialPlanAnual`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/plan-anual-5-roles/entities/historial-plan-anual.entity.ts`
- Índices de entidad: `['planId']`, `['usuarioId']`, `['tipoEvento']`, `['fecha', 'hora']`
- Relaciones declaradas:
  - `plan`: ManyToOne -> `PlanAnual5Roles` por `plan_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `plan_id` | `planId` | uuid | No | ManyToOne -> PlanAnual5Roles | No | No |  |  |
| `tipo_evento` | `tipoEvento` | varchar (length 50) | No |  | No | No |  |  |
| `fecha` | `fecha` | date | No |  | No | No |  |  |
| `hora` | `hora` | time | No |  | No | No |  |  |
| `usuario_id` | `usuarioId` | bigint | No |  | No | No |  |  |
| `accion` | `accion` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `ip_address` | `ipAddress` | varchar (length 45) | No |  | Sí | No |  |  |
| `user_agent` | `userAgent` | text | No |  | Sí | No |  |  |
| `cambios` | `cambios` | jsonb | No |  | No | No | () => "'[]'::jsonb" |  |
| `estado_anterior` | `estadoAnterior` | varchar (length 50) | No |  | Sí | No |  |  |
| `estado_nuevo` | `estadoNuevo` | varchar (length 50) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `control_interno.informe_ley`

- Entidad/definición: `InformeLey`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/informes-ley/entities/informe-ley.entity.ts`
- Índices de entidad: `['codigo'], { unique: true }`, `['categoria']`, `['periodicidad']`, `['activo']`
- Relaciones declaradas:
  - `entregas`: OneToMany -> `EntregaInformeLey`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 255) | No |  | No | Sí |  |  |
| `codigo_corto` | `codigoCorto` | varchar (length 255) | No |  | Sí | No |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | No | No |  |  |
| `normativa` | `normativa` | text | No |  | Sí | No |  |  |
| `categoria` | `categoria` | varchar (length 50) | No |  | No | No |  |  |
| `periodicidad` | `periodicidad` | varchar (length 50) | No |  | No | No |  |  |
| `tipo` | `tipo` | varchar (length 50) | No |  | Sí | No |  |  |
| `dia_presentacion` | `diaPresentacion` | integer | No |  | No | No |  |  |
| `entidad_destino` | `entidadDestino` | varchar (length 500) | No |  | Sí | No |  |  |
| `responsable` | `responsable` | varchar (length 255) | No |  | No | No |  |  |
| `area` | `area` | varchar (length 255) | No |  | No | No |  |  |
| `area_responsable` | `areaResponsable` | varchar (length 255) | No |  | Sí | No |  |  |
| `tiene_plantilla` | `tienePlantilla` | boolean | No |  | No | No | false |  |
| `url_plantilla` | `urlPlantilla` | varchar (length 500) | No |  | Sí | No |  |  |
| `requiere_aprobacion` | `requiereAprobacion` | boolean | No |  | No | No | false |  |
| `dias_anticipacion_alerta` | `diasAnticipacionAlerta` | integer | No |  | No | No | 7 |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `fecha_vencimiento` | `fechaVencimiento` | date | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | Sí | No |  |  |
| `dias_restantes` | `diasRestantes` | integer | No |  | Sí | No |  |  |
| `alerta` | `alerta` | varchar (length 50) | No |  | Sí | No |  |  |
| `acciones_sugeridas` | `accionesSugeridas` | jsonb | No |  | Sí | No |  |  |
| `historial` | `historial` | jsonb | No |  | Sí | No |  |  |
| `proximo_recordatorio` | `proximoRecordatorio` | timestamp | No |  | Sí | No |  |  |
| `recordatorios_enviados` | `recordatoriosEnviados` | integer | No |  | Sí | No | 0 |  |
| `formato_template` | `formatoTemplate` | varchar (length 255) | No |  | Sí | No |  |  |
| `datos_integrados` | `datosIntegrados` | jsonb | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.integraciones_esap`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `nombre` | `nombre` | VARCHAR(255) | No |  | No | No |  |  |
| `tipo` | `tipo` | VARCHAR(100) | No |  | No | No |  | CHECK (tipo IN ('api', 'webhook', 'sftp', 'email', 'otro')) |
| `configuracion` | `configuracion` | JSONB | No |  | No | No |  |  |
| `activa` | `activa` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `ultima_sincronizacion` | `ultima_sincronizacion` | TIMESTAMP | No |  | Sí | No |  |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.item_lista_chequeo`

- Entidad/definición: `ItemListaChequeo`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/listas-chequeo/entities/item-lista-chequeo.entity.ts`
- Índices de entidad: `['listaChequeoId', 'orden']`
- Relaciones declaradas:
  - `listaChequeo`: ManyToOne -> `ListaChequeo` por `lista_chequeo_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `lista_chequeo_id` | `listaChequeoId` | uuid | No | ManyToOne -> ListaChequeo | No | No |  |  |
| `texto` | `texto` | text | No |  | No | No |  |  |
| `categoria` | `categoria` | varchar (length 100) | No |  | Sí | No |  |  |
| `obligatorio` | `obligatorio` | boolean | No |  | No | No | false |  |
| `orden` | `orden` | integer | No |  | No | No | 0 |  |
| `completado` | `completado` | boolean | No |  | No | No | false |  |
| `fecha_completado` | `fechaCompletado` | timestamp | No |  | Sí | No |  |  |
| `completado_por` | `completadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `documento_biblioteca_id` | `documentoBibliotecaId` | varchar (length 255) | No |  | Sí | No |  |  |
| `documento_nombre` | `documentoNombre` | varchar (length 500) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.lista_aplicada`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `lista_chequeo_id` | `lista_chequeo_id` | UUID | No |  | No | No |  |  |
| `lista_chequeo_codigo` | `lista_chequeo_codigo` | VARCHAR(255) | No |  | No | No |  |  |
| `lista_chequeo_nombre` | `lista_chequeo_nombre` | VARCHAR(255) | No |  | No | No |  |  |
| `auditoria_id` | `auditoria_id` | VARCHAR(255) | No |  | No | No |  |  |
| `fecha_aplicacion` | `fecha_aplicacion` | DATE | No |  | No | No |  |  |
| `aplicado_por` | `aplicado_por` | VARCHAR(255) | No |  | No | No |  |  |
| `respuestas` | `respuestas` | JSONB | No |  | No | No |  |  |
| `resultado` | `resultado` | JSONB | No |  | No | No |  |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.lista_chequeo`

- Entidad/definición: `ListaChequeo`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/listas-chequeo/entities/lista-chequeo.entity.ts`
- Índices de entidad: `['codigo'], { unique: true }`, `['activa']`, `['tipoAuditoriaId']`, `['deletedAt'], { where: 'deleted_at IS NULL' }`
- Relaciones declaradas:
  - `tipoAuditoria`: ManyToOne -> `TipoAuditoria` por `tipo_auditoria_id`
  - `items`: OneToMany -> `ItemListaChequeo`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 255) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `categoria` | `categoria` | varchar (length 255) | No |  | Sí | No |  |  |
| `tipo` | `tipo` | varchar (length 50) | No |  | No | No | cumplimiento |  |
| `version` | `version` | varchar (length 50) | No |  | No | No | 1.0 |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | activa |  |
| `aplicable_para` | `aplicablePara` | jsonb | No |  | No | No | ["gestion", "cumplimiento"] |  |
| `created_by` | `createdBy` | varchar (length 255) | No |  | No | No | sistema |  |
| `items_json` | `items_json` | jsonb | No |  | Sí | No |  |  |
| `proceso` | `proceso` | varchar (length 255) | No |  | Sí | No |  |  |
| `subproceso` | `subproceso` | varchar (length 255) | No |  | Sí | No |  |  |
| `categoria_esap` | `categoriaEsap` | varchar (length 100) | No |  | Sí | No |  |  |
| `normativa_aplicable` | `normativaAplicable` | text | No |  | Sí | No |  |  |
| `objetivo` | `objetivo` | text | No |  | Sí | No |  |  |
| `version_base` | `versionBase` | varchar (length 50) | No |  | Sí | No |  |  |
| `permite_no_aplica` | `permiteNoAplica` | boolean | No |  | No | No | true |  |
| `requiere_evidencias` | `requiereEvidencias` | boolean | No |  | No | No | true |  |
| `genera_hallazgos_automaticos` | `generaHallazgosAutomaticos` | boolean | No |  | No | No | true |  |
| `tipo_auditoria_id` | `tipoAuditoriaId` | uuid | No | ManyToOne -> TipoAuditoria | Sí | No |  |  |
| `activa` | `activa` | boolean | No |  | No | No | true |  |
| `usos_programados` | `usosProgramados` | integer | No |  | No | No | 0 |  |
| `auditoria_id` | `auditoriaId` | uuid | No |  | Sí | No |  |  |
| `nombre_auditoria` | `nombreAuditoria` | varchar (length 500) | No |  | Sí | No |  |  |
| `auditor_responsable` | `auditorResponsable` | varchar (length 255) | No |  | Sí | No |  |  |
| `fecha_aplicacion` | `fechaAplicacion` | date | No |  | Sí | No |  |  |
| `fecha_diligenciamiento` | `fechaDiligenciamiento` | date | No |  | Sí | No |  |  |
| `items_completados` | `itemsCompletados` | integer | No |  | No | No | 0 |  |
| `cumplimiento` | `cumplimiento` | integer | No |  | No | No | 0 |  |
| `no_cumplimientos` | `noCumplimientos` | integer | No |  | No | No | 0 |  |
| `no_aplica` | `noAplica` | integer | No |  | No | No | 0 |  |
| `hallazgos_generados` | `hallazgosGenerados` | integer | No |  | No | No | 0 |  |
| `fase_planeacion` | `fasePlaneacion` | boolean | No |  | No | No | false |  |
| `fase_ejecucion` | `faseEjecucion` | boolean | No |  | No | No | false |  |
| `fase_comunicacion` | `faseComunicacion` | boolean | No |  | No | No | false |  |
| `fase_seguimiento` | `faseSeguimiento` | boolean | No |  | No | No | false |  |
| `etapa_kanban_id` | `etapaKanbanId` | uuid | No |  | Sí | No |  |  |
| `etapa_kanban_nombre` | `etapaNombreKanban` | varchar (length 255) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `deleted_at` | `deletedAt` | timestamp | No |  | Sí | No |  | Borrado lógico |

#### Tabla `control_interno.logs_auditoria_esap`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `usuario_id` | `usuario_id` | UUID | No |  | Sí | No |  | REFERENCES control_interno.usuarios_esap(id) |
| `accion` | `accion` | VARCHAR(255) | No |  | No | No |  |  |
| `entidad` | `entidad` | VARCHAR(255) | No |  | Sí | No |  |  |
| `entidad_id` | `entidad_id` | UUID | No |  | Sí | No |  |  |
| `detalles` | `detalles` | JSONB | No |  | Sí | No |  |  |
| `ip_address` | `ip_address` | VARCHAR(45) | No |  | Sí | No |  |  |
| `user_agent` | `user_agent` | TEXT | No |  | Sí | No |  |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.nota_auditoria`

- Entidad/definición: `NotaAuditoria`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/auditorias/entities/nota-auditoria.entity.ts`
- Índices de entidad: `['auditoriaId']`, `['autorId']`, `['categoria']`, `['importante']`, `['fecha', 'hora']`
- Relaciones declaradas:
  - `auditoria`: ManyToOne -> `Auditoria` por `auditoria_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `auditoria_id` | `auditoriaId` | uuid | No | ManyToOne -> Auditoria | No | No |  |  |
| `contenido` | `contenido` | text | No |  | No | No |  |  |
| `categoria` | `categoria` | varchar (length 50) | No |  | No | No |  |  |
| `autor_id` | `autorId` | bigint | No |  | No | No |  |  |
| `fecha` | `fecha` | date | No |  | No | No |  |  |
| `hora` | `hora` | time | No |  | No | No |  |  |
| `importante` | `importante` | boolean | No |  | No | No | false |  |
| `editada` | `editada` | boolean | No |  | No | No | false |  |
| `fecha_edicion` | `fechaEdicion` | timestamp | No |  | Sí | No |  |  |
| `editor_id` | `editorId` | bigint | No |  | Sí | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.notificacion`

- Entidad/definición: `Notificacion`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/notificaciones/entities/notificacion.entity.ts`
- Índices de entidad: `['usuarioId']`, `['estado']`, `['tipoNotificacion']`, `['createdAt']`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `usuario_id` | `usuarioId` | varchar (length 255) | No |  | No | No |  |  |
| `tipo_notificacion` | `tipoNotificacion` | varchar (length 100) | No |  | No | No |  |  |
| `titulo` | `titulo` | varchar (length 255) | No |  | No | No |  |  |
| `mensaje` | `mensaje` | text | No |  | No | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | EstadoNotificacion.PENDIENTE |  |
| `canal` | `canal` | varchar (length 50) | No |  | No | No | CanalNotificacion.SISTEMA |  |
| `leida` | `leida` | boolean | No |  | No | No | false |  |
| `fecha_lectura` | `fechaLectura` | timestamp | No |  | Sí | No |  |  |
| `enviada_email` | `enviadaEmail` | boolean | No |  | No | No | false |  |
| `fecha_envio_email` | `fechaEnvioEmail` | timestamp | No |  | Sí | No |  |  |
| `metadata` | `metadata` | jsonb | No |  | Sí | No |  |  |
| `accion_url` | `accionUrl` | varchar (length 500) | No |  | Sí | No |  |  |
| `prioridad` | `prioridad` | varchar (length 20) | No |  | No | No | PrioridadNotificacion.NORMAL |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.objetivo_auditoria`

- Entidad/definición: `ObjetivoAuditoria`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/auditorias/entities/objetivo-auditoria.entity.ts`
- Índices de entidad: `['auditoriaId']`
- Relaciones declaradas:
  - `auditoria`: ManyToOne -> `Auditoria` por `auditoria_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | integer generated | Sí |  | No | No |  |  |
| `auditoria_id` | `auditoriaId` | uuid | No | ManyToOne -> Auditoria | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | No | No |  |  |
| `orden` | `orden` | integer | No |  | No | No | 0 |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.parametro_sistema`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `clave` | `clave` | VARCHAR(255) | No |  | No | Sí |  |  |
| `valor` | `valor` | TEXT | No |  | No | No |  |  |
| `descripcion` | `descripcion` | TEXT | No |  | Sí | No |  |  |
| `tipo` | `tipo` | VARCHAR(50) | No |  | Sí | No | 'string' | CHECK (tipo IN ('string', 'number', 'boolean', 'json')) |
| `categoria` | `categoria` | VARCHAR(255) | No |  | Sí | No |  |  |
| `editable` | `editable` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.paso_workflow_informe`

- Entidad/definición: `PasoWorkflowInforme`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/informes-ley/entities/paso-workflow-informe.entity.ts`
- Índices de entidad: `['workflowId', 'numeroPaso']`
- Relaciones declaradas:
  - `workflow`: ManyToOne -> `WorkflowAprobacionInforme` por `workflow_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `workflow_id` | `workflowId` | uuid | No | ManyToOne -> WorkflowAprobacionInforme | No | No |  |  |
| `numero_paso` | `numeroPaso` | integer | No |  | No | No |  |  |
| `nombre` | `nombre` | varchar (length 100) | No |  | No | No |  |  |
| `nombre_display` | `nombreDisplay` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `responsable` | `responsable` | varchar (length 255) | No |  | Sí | No |  |  |
| `rol_responsable` | `rolResponsable` | varchar (length 255) | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | pendiente |  |
| `fecha_inicio` | `fechaInicio` | timestamp | No |  | Sí | No |  |  |
| `fecha_fin` | `fechaFin` | timestamp | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `accion` | `accion` | varchar (length 50) | No |  | Sí | No |  |  |
| `es_obligatorio` | `esObligatorio` | boolean | No |  | No | No | true |  |
| `orden` | `orden` | integer | No |  | No | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.plan_anual`

- Entidad/definición: `ProgramaAnual`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/programa-anual/entities/programa-anual.entity.ts`
- Índices de entidad: `['año']`, `['estado']`
- Relaciones declaradas:
  - `auditorias`: OneToMany -> `AuditoriaProgramada`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `nombre` | `nombre` | integer | No |  | No | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | borrador |  |
| `fecha_creacion` | `fechaCreacion` | date | No |  | No | No |  |  |
| `fecha_aprobacion` | `fechaAprobacion` | date | No |  | Sí | No |  |  |
| `creado_por` | `creadoPor` | varchar (length 255) | No |  | No | No |  |  |
| `version` | `version` | varchar (length 50) | No |  | No | No | 1.0 |  |
| `total_actividades` | `totalActividades` | integer | No |  | No | No | 0 |  |
| `actividades_completadas` | `actividadesCompletadas` | integer | No |  | No | No | 0 |  |
| `porcentaje_cumplimiento` | `porcentajeCumplimiento` | integer | No |  | No | No | 0 |  |
| `enfoques` | `enfoques` | jsonb | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.plan_anual_5_roles`

- Entidad/definición: `PlanAnual5Roles`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/plan-anual-5-roles/entities/plan-anual-5-roles.entity.ts`
- Relaciones declaradas:
  - `roles`: OneToMany -> `RolPlanAnual5`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `ano` | `fecha_creacion` | integer | No |  | No | No |  | Índice:  |
| `fecha_inicio` | `fecha_inicio` | date | No |  | Sí | No |  |  |
| `fecha_fin` | `fecha_fin` | date | No |  | Sí | No |  |  |
| `responsable` | `responsable` | varchar (length 255) | No |  | No | No |  |  |
| `responsable_id` | `responsable_id` | uuid | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | borrador | Índice:  |
| `porcentaje_cumplimiento_general` | `porcentaje_cumplimiento_general` | integer | No |  | No | No | 0 |  |
| `total_actividades` | `total_actividades` | integer | No |  | No | No | 0 |  |
| `actividades_completadas` | `actividades_completadas` | integer | No |  | No | No | 0 |  |
| `actividades_en_progreso` | `actividades_en_progreso` | integer | No |  | No | No | 0 |  |
| `equipo_aprobacion` | `equipo_aprobacion` | jsonb | No |  | Sí | No |  |  |
| `orden_aprobacion` | `orden_aprobacion` | varchar (length 20) | No |  | Sí | No | secuencial |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.plan_anual_wizard_borrador`

- Entidad/definición: `PlanAnualWizardBorrador`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/plan-anual-5-roles/entities/plan-anual-wizard-borrador.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `usuario_id` | `usuarioId` | varchar (length 255) | No |  | No | Sí |  | Índice:  |
| `payload` | `payload` | jsonb | No |  | No | No | () => "'{}'::jsonb" |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.plan_individual`

- Entidad/definición: `PlanIndividual`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/plan-individual/entities/plan-individual.entity.ts`
- Índices de entidad: `['auditoriaId']`, `['estado']`, `['codigo'], { unique: true }`
- Relaciones declaradas:
  - `auditoria`: ManyToOne -> `AuditoriaProgramada` por `auditoria_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 255) | No |  | No | Sí |  |  |
| `auditoria_id` | `auditoriaId` | uuid | No | ManyToOne -> AuditoriaProgramada | No | No |  |  |
| `auditoria_codigo` | `auditoriaCodigo` | varchar (length 255) | No |  | No | No |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `alcance` | `alcance` | text | No |  | No | No |  |  |
| `objetivo` | `objetivo` | text | No |  | No | No |  |  |
| `proceso_auditar` | `procesoAuditar` | varchar (length 255) | No |  | No | No |  |  |
| `riesgos` | `riesgos` | jsonb | No |  | No | No |  |  |
| `criterios_auditoria` | `criteriosAuditoria` | jsonb | No |  | No | No |  |  |
| `normativa_aplicable` | `normativaAplicable` | jsonb | No |  | No | No |  |  |
| `equipo_auditor` | `equipoAuditor` | jsonb | No |  | No | No |  |  |
| `documentos` | `documentos` | jsonb | No |  | No | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | EstadoPlanIndividual.BORRADOR |  |
| `fecha_creacion` | `fechaCreacion` | date | No |  | No | No |  |  |
| `fecha_envio` | `fechaEnvio` | date | No |  | Sí | No |  |  |
| `enviado_por` | `enviadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.plan_mejoramiento`

- Entidad/definición: `PlanMejoramiento`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/planes-mejoramiento/entities/plan-mejoramiento.entity.ts`
- Relaciones declaradas:
  - `hallazgo`: ManyToOne -> `Hallazgo` por `hallazgo_id`
  - `auditoria`: ManyToOne -> `Auditoria` por `auditoria_id`
  - `acciones`: OneToMany -> `AccionCorrectiva`
  - `seguimientos`: OneToMany -> `SeguimientoTrimestral`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 255) | No |  | No | Sí |  |  |
| `titulo` | `titulo` | varchar (length 500) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `objetivos` | `objetivos` | jsonb | No |  | No | No | () => "'[]'::jsonb" |  |
| `hallazgo_id` | `hallazgoId` | uuid | No | ManyToOne -> Hallazgo | Sí | No |  |  |
| `auditoria_id` | `auditoriaId` | uuid | No | ManyToOne -> Auditoria | Sí | No |  |  |
| `area_responsable` | `areaResponsable` | varchar (length 255) | No |  | No | No |  |  |
| `responsable_implementacion` | `responsableImplementacion` | varchar (length 255) | No |  | No | No |  |  |
| `fecha_limite` | `fechaLimite` | date | No |  | No | No |  |  |
| `estado` | `estado` | varchar (length 50) | No |  | No | No | PlanMejoramientoEstado.BORRADOR |  |
| `fecha_aprobacion` | `fechaAprobacion` | date | No |  | Sí | No |  |  |
| `aprobado_por` | `aprobadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `observaciones_aprobacion` | `observacionesAprobacion` | text | No |  | Sí | No |  |  |
| `motivo_rechazo` | `motivoRechazo` | text | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.plantilla_email`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `codigo` | `codigo` | VARCHAR(255) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | VARCHAR(255) | No |  | No | No |  |  |
| `asunto` | `asunto` | VARCHAR(500) | No |  | No | No |  |  |
| `cuerpo` | `cuerpo` | TEXT | No |  | No | No |  |  |
| `variables_disponibles` | `variables_disponibles` | JSONB | No |  | Sí | No |  |  |
| `activa` | `activa` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.plantilla_informe_ley`

- Entidad/definición: `PlantillaInformeLey`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/informes-ley/entities/plantilla-informe-ley.entity.ts`
- Índices de entidad: `['codigo'], { unique: true }`, `['activa']`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 255) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `tipo_formato` | `tipoFormato` | varchar (length 50) | No |  | No | No |  |  |
| `ruta_plantilla` | `rutaPlantilla` | varchar (length 500) | No |  | No | No |  |  |
| `variables_disponibles` | `variablesDisponibles` | jsonb | No |  | No | No |  |  |
| `estructura_datos` | `estructuraDatos` | jsonb | No |  | No | No | {} |  |
| `activa` | `activa` | boolean | No |  | No | No | true |  |
| `version` | `version` | varchar (length 50) | No |  | No | No | 1.0 |  |
| `creado_por` | `creadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `actualizado_por` | `actualizadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.plantilla_reporte`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `codigo` | `codigo` | VARCHAR(255) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | VARCHAR(255) | No |  | No | No |  |  |
| `tipo` | `tipo` | VARCHAR(100) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | TEXT | No |  | Sí | No |  |  |
| `formato` | `formato` | VARCHAR(50) | No |  | No | No |  | CHECK (formato IN ('PDF', 'Excel', 'Word', 'PowerPoint')) |
| `ruta_template` | `ruta_template` | VARCHAR(500) | No |  | Sí | No |  |  |
| `variables_disponibles` | `variables_disponibles` | JSONB | No |  | Sí | No |  |  |
| `activa` | `activa` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.plantillas_documentos_esap`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `codigo` | `codigo` | VARCHAR(255) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | VARCHAR(255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | TEXT | No |  | Sí | No |  |  |
| `tipo_documento` | `tipo_documento` | VARCHAR(100) | No |  | No | No |  |  |
| `contenido` | `contenido` | TEXT | No |  | No | No |  |  |
| `variables_disponibles` | `variables_disponibles` | JSONB | No |  | Sí | No |  |  |
| `activa` | `activa` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `version` | `version` | INTEGER | No |  | Sí | No | 1 |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.preferencia_notificacion`

- Entidad/definición: `PreferenciaNotificacion`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/notificaciones/entities/preferencia-notificacion.entity.ts`
- Índices de entidad: `['usuarioId'], { unique: true }`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `usuario_id` | `usuarioId` | varchar (length 255) | No |  | No | Sí |  |  |
| `notificaciones_email` | `recibirEmail` | boolean | No |  | No | No | true |  |
| `notificaciones_sistema` | `recibirSistema` | boolean | No |  | No | No | true |  |
| `frecuencia_recordatorios` | `diasAnticipacion` | varchar (length 50) | No |  | No | No | 7 |  |
| `tipos_notificacion` | `tiposNotificacion` | jsonb | No |  | Sí | No |  |  |
| `horario_preferido` | `horarioPreferido` | varchar (length 50) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.proceso_auditable`

- Entidad/definición: `ProcesoAuditable`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/universo-auditorias/entities/proceso-auditable.entity.ts`
- Índices de entidad: `['codigo'], { unique: true }`, `['tipo']`, `['macroproceso']`, `['prioridad']`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 255) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | No | No |  |  |
| `tipo` | `tipo` | varchar (length 50) | No |  | No | No |  |  |
| `macroproceso` | `macroproceso` | varchar (length 255) | No |  | Sí | No |  |  |
| `unidades_auditables` | `unidadesAuditables` | jsonb | No |  | Sí | No | [] |  |
| `responsable` | `responsable` | varchar (length 255) | No |  | No | No |  |  |
| `dependencia` | `dependencia` | varchar (length 255) | No |  | No | No |  |  |
| `territorial` | `territorial` | varchar (length 255) | No |  | Sí | No |  |  |
| `evaluacion_riesgo` | `evaluacionRiesgo` | jsonb | No |  | No | No |  |  |
| `frecuencia_auditoria` | `frecuenciaAuditoria` | varchar (length 255) | No |  | No | No |  |  |
| `ultima_auditoria` | `ultimaAuditoria` | date | No |  | Sí | No |  |  |
| `resultado_ultima_auditoria` | `resultadoUltimaAuditoria` | varchar (length 255) | No |  | Sí | No |  |  |
| `proxima_auditoria` | `proximaAuditoria` | date | No |  | Sí | No |  |  |
| `prioridad` | `prioridad` | integer | No |  | No | No |  |  |
| `priorizacion_anos` | `priorizacionAnos` | integer | No |  | No | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.registro_seguimiento`

- Entidad/definición: `RegistroSeguimiento`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/planes-mejoramiento/entities/registro-seguimiento.entity.ts`
- Relaciones declaradas:
  - `accion`: ManyToOne -> `AccionCorrectiva` por `accion_id`
  - `seguimiento`: ManyToOne -> `SeguimientoTrimestral` por `seguimiento_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `accion_id` | `accionId` | uuid | No | ManyToOne -> AccionCorrectiva | No | No |  |  |
| `seguimiento_id` | `seguimientoId` | uuid | No | ManyToOne -> SeguimientoTrimestral | No | No |  |  |
| `accion_descripcion` | `accionDescripcion` | text | No |  | No | No |  |  |
| `acciones_programadas` | `accionesProgramadas` | int | No |  | No | No | 1 |  |
| `acciones_implementadas` | `accionesImplementadas` | int | No |  | No | No | 0 |  |
| `puntaje_cumplimiento` | `puntajeCumplimiento` | int | No |  | No | No | 0 |  |
| `controles_implementados` | `controlesImplementados` | varchar (length 20) | No |  | No | No |  |  |
| `hallazgo_se_repite` | `hallazgoSeRepite` | varchar (length 20) | No |  | No | No |  |  |
| `puntaje_efectividad` | `puntajeEfectividad` | int | No |  | No | No | 0 |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `evidencias` | `evidencias` | jsonb | No |  | No | No | () => "'[]'::jsonb" |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.reunion_apertura`

- Entidad/definición: `ReunionApertura`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/auditorias/entities/reunion-apertura.entity.ts`
- Índices de entidad: `['auditoriaId']`
- Relaciones declaradas:
  - `auditoria`: ManyToOne -> `Auditoria` por `auditoria_id`
  - `documentoBiblioteca`: ManyToOne -> `Documento` por `documento_biblioteca_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `auditoria_id` | `auditoriaId` | uuid | No | ManyToOne -> Auditoria | No | No |  |  |
| `fecha` | `fecha` | timestamp without time zone | No |  | No | No |  |  |
| `modalidad` | `modalidad` | varchar (length 50) | No |  | No | No |  |  |
| `lugar` | `lugar` | varchar (length 255) | No |  | Sí | No |  |  |
| `enlace_virtual` | `enlaceVirtual` | varchar (length 500) | No |  | Sí | No |  |  |
| `agenda` | `agenda` | jsonb | No |  | Sí | No |  |  |
| `participantes` | `participantes` | jsonb | No |  | Sí | No |  |  |
| `estado_acta` | `estadoActa` | varchar (length 50) | No |  | No | No | pendiente |  |
| `acta_ruta` | `actaRuta` | varchar (length 500) | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `elaborado_por` | `elaboradoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `revisado_por` | `revisadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `documento_biblioteca_id` | `documentoBibliotecaId` | uuid | No | ManyToOne -> Documento | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.reunion_cierre`

- Entidad/definición: `ReunionCierre`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/auditorias/entities/reunion-cierre.entity.ts`
- Índices de entidad: `['auditoriaId']`
- Relaciones declaradas:
  - `auditoria`: ManyToOne -> `Auditoria` por `auditoria_id`
  - `documentoBiblioteca`: ManyToOne -> `Documento` por `documento_biblioteca_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `auditoria_id` | `auditoriaId` | uuid | No | ManyToOne -> Auditoria | No | No |  |  |
| `fecha` | `fecha` | timestamp without time zone | No |  | No | No |  |  |
| `modalidad` | `modalidad` | varchar (length 50) | No |  | No | No |  |  |
| `lugar` | `lugar` | varchar (length 255) | No |  | Sí | No |  |  |
| `enlace_virtual` | `enlaceVirtual` | varchar (length 500) | No |  | Sí | No |  |  |
| `agenda` | `agenda` | jsonb | No |  | Sí | No |  |  |
| `participantes` | `participantes` | jsonb | No |  | Sí | No |  |  |
| `estado_acta` | `estadoActa` | varchar (length 50) | No |  | No | No | pendiente |  |
| `acta_ruta` | `actaRuta` | varchar (length 500) | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `elaborado_por` | `elaboradoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `revisado_por` | `revisadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `documento_biblioteca_id` | `documentoBibliotecaId` | uuid | No | ManyToOne -> Documento | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.rol_decreto_648`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `codigo` | `codigo` | VARCHAR(255) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | VARCHAR(255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | TEXT | No |  | Sí | No |  |  |
| `orden` | `orden` | INTEGER | No |  | Sí | No | 0 |  |
| `activo` | `activo` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `editable` | `editable` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.rol_decreto_648_template`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `rol_numero` | `rol_numero` | INTEGER | No |  | No | Sí |  | CHECK (rol_numero BETWEEN 1 AND 5) |
| `nombre` | `nombre` | VARCHAR(255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | TEXT | No |  | No | No |  |  |
| `color` | `color` | VARCHAR(7) | No |  | No | No | '#3B82F6' |  |
| `activo` | `activo` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.rol_plan_anual`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `plan_id` | `plan_id` | UUID | No |  | No | No |  | REFERENCES control_interno.plan_anual(id) |
| `tipo` | `tipo` | VARCHAR(100) | No |  | No | No |  | CHECK (tipo IN ('Auditor Líder', 'Auditor', 'Prof. Especializado', 'Prof. Universitario', 'Técnico')) |
| `nombre` | `nombre` | VARCHAR(255) | No |  | Sí | No |  |  |
| `email` | `email` | VARCHAR(255) | No |  | Sí | No |  |  |
| `disponibilidad` | `disponibilidad` | VARCHAR(50) | No |  | Sí | No | 'disponible' | CHECK (disponibilidad IN ('disponible', 'parcial', 'no-disponible')) |
| `horas_totales` | `horas_totales` | INTEGER | No |  | Sí | No | 1800 |  |
| `horas_asignadas` | `horas_asignadas` | INTEGER | No |  | Sí | No | 0 |  |
| `auditorias_asignadas` | `auditorias_asignadas` | INTEGER | No |  | Sí | No | 0 |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.rol_plan_anual_5`

- Entidad/definición: `RolPlanAnual5`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/plan-anual-5-roles/entities/rol-plan-anual-5.entity.ts`
- Relaciones declaradas:
  - `plan`: ManyToOne -> `PlanAnual5Roles` por `plan_id`
  - `actividades`: OneToMany -> `ActividadPlanAnual5`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `plan_id` | `planId` | uuid | No | ManyToOne -> PlanAnual5Roles | No | No |  | Índice:  |
| `rol_numero` | `rol_numero` | integer | No |  | No | No |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | No | No |  |  |
| `color` | `color` | varchar (length 7) | No |  | No | No | #3B82F6 |  |
| `porcentaje_cumplimiento` | `porcentaje_cumplimiento` | integer | No |  | No | No | 0 |  |
| `total_actividades` | `total_actividades` | integer | No |  | No | No | 0 |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.seccion_lista_chequeo`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `lista_id` | `lista_id` | UUID | No |  | No | No |  | REFERENCES control_interno.lista_chequeo(id) |
| `orden` | `orden` | INTEGER | No |  | No | No |  |  |
| `nombre` | `nombre` | VARCHAR(255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | TEXT | No |  | Sí | No |  |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.seguimiento_plan_mejoramiento`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `plan_id` | `plan_id` | UUID | No |  | No | Sí |  | REFERENCES control_interno.plan_mejoramiento(id) |
| `numero_seguimiento` | `numero_seguimiento` | INTEGER | No |  | No | Sí |  |  |
| `fecha_seguimiento` | `fecha_seguimiento` | DATE | No |  | No | No |  |  |
| `realizado_por` | `realizado_por` | VARCHAR(255) | No |  | No | No |  |  |
| `observaciones` | `observaciones` | TEXT | No |  | Sí | No |  |  |
| `cumplimiento` | `cumplimiento` | INTEGER | No |  | Sí | No | 0 | CHECK (cumplimiento BETWEEN 0 AND 100) |
| `efectividad` | `efectividad` | INTEGER | No |  | Sí | No | 0 | CHECK (efectividad BETWEEN 0 AND 100) |
| `acciones_implementadas` | `acciones_implementadas` | INTEGER | No |  | Sí | No | 0 |  |
| `acciones_totales` | `acciones_totales` | INTEGER | No |  | Sí | No | 0 |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.seguimiento_trimestral`

- Entidad/definición: `SeguimientoTrimestral`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/planes-mejoramiento/entities/seguimiento-trimestral.entity.ts`
- Relaciones declaradas:
  - `plan`: ManyToOne -> `PlanMejoramiento` por `plan_id`
  - `registros`: OneToMany -> `RegistroSeguimiento`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `plan_id` | `planId` | uuid | No | ManyToOne -> PlanMejoramiento | No | No |  |  |
| `trimestre` | `trimestre` | int | No |  | No | No |  |  |
| `fechaInicio` | `fechaInicio` | int | No |  | No | No |  |  |
| `fecha_fin` | `fechaFin` | date | No |  | No | No |  |  |
| `fecha_seguimiento` | `fechaSeguimiento` | date | No |  | Sí | No |  |  |
| `avance_global` | `avanceGlobal` | int | No |  | No | No | 0 |  |
| `porcentaje_cumplimiento` | `porcentajeCumplimiento` | int | No |  | No | No | 0 |  |
| `porcentaje_efectividad` | `porcentajeEfectividad` | int | No |  | No | No | 0 |  |
| `acciones_revisadas` | `accionesRevisadas` | int | No |  | No | No | 0 |  |
| `acciones_totales` | `accionesTotales` | int | No |  | No | No | 0 |  |
| `observaciones_generales` | `observacionesGenerales` | text | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `control_interno.sesiones_esap`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `usuario_id` | `usuario_id` | UUID | No |  | No | No |  | REFERENCES control_interno.usuarios_esap(id) |
| `token` | `token` | VARCHAR(500) | No |  | No | Sí |  |  |
| `ip_address` | `ip_address` | VARCHAR(45) | No |  | Sí | No |  |  |
| `user_agent` | `user_agent` | TEXT | No |  | Sí | No |  |  |
| `fecha_inicio` | `fecha_inicio` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `fecha_expiracion` | `fecha_expiracion` | TIMESTAMP | No |  | No | No |  |  |
| `activa` | `activa` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.tablero_kanban`

- Entidad/definición: `TableroKanban`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/tableros-kanban/entities/tablero-kanban.entity.ts`
- Índices de entidad: `['tipo']`, `['activo']`, `['deletedAt'], { where: 'deleted_at IS NULL' }`
- Relaciones declaradas:
  - `etapas`: OneToMany -> `EtapaKanban`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `tipo` | `tipo` | varchar (length 50) | No |  | No | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `deleted_at` | `deletedAt` | timestamp | No |  | Sí | No |  | Borrado lógico |

#### Tabla `control_interno.tareas_auditoria`

- Entidad/definición: `TareaAuditoria`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/tareas-auditoria/entities/tarea-auditoria.entity.ts`
- Índices de entidad: `['auditoriaId']`, `['estado']`, `['prioridad']`, `['responsableId']`, `['fechaVencimiento']`
- Relaciones declaradas:
  - `auditoria`: ManyToOne -> `Auditoria` por `auditoria_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `auditoria_id` | `auditoria` | uuid generated | Sí | ManyToOne -> Auditoria | Sí | No |  |  |
| `descripcion` | `descripcion` | varchar (length 255) | No |  | Sí | No |  |  |
| `fase` | `fase` | enum (enum EstadoTarea) | No |  | Sí | No | EstadoTarea.PENDIENTE |  |
| `responsable_id` | `fechaVencimiento` | uuid | No |  | Sí | No |  |  |
| `fecha_completado` | `fechaCompletado` | timestamp | No |  | Sí | No |  |  |
| `notas` | `notas` | int | No |  | Sí | No | 0 |  |

#### Tabla `control_interno.tipo_auditoria`

- Entidad/definición: `TipoAuditoria`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/tipos-auditoria/entities/tipo-auditoria.entity.ts`
- Índices de entidad: `['codigo'], { unique: true }`, `['activa']`, `['deletedAt'], { where: 'deleted_at IS NULL' }`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 255) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `alcance` | `alcance` | text | No |  | Sí | No |  |  |
| `duracion_promedio` | `duracionPromedio` | integer | No |  | No | No | 30 |  |
| `equipo_promedio` | `equipoPromedio` | integer | No |  | No | No | 3 |  |
| `color` | `color` | varchar (length 7) | No |  | No | No | #3B82F6 |  |
| `activa` | `activa` | boolean | No |  | No | No | true |  |
| `auditorias_programadas` | `auditoriasProgramadas` | integer | No |  | No | No | 0 |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `deleted_at` | `deletedAt` | timestamp | No |  | Sí | No |  | Borrado lógico |

#### Tabla `control_interno.usuarios_esap`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `codigo` | `codigo` | VARCHAR(255) | No |  | No | Sí |  |  |
| `nombre_completo` | `nombre_completo` | VARCHAR(255) | No |  | No | No |  |  |
| `email` | `email` | VARCHAR(255) | No |  | No | Sí |  |  |
| `cargo` | `cargo` | VARCHAR(255) | No |  | Sí | No |  |  |
| `area` | `area` | VARCHAR(255) | No |  | Sí | No |  |  |
| `rol` | `rol` | VARCHAR(100) | No |  | Sí | No |  |  |
| `activo` | `activo` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `ultimo_acceso` | `ultimo_acceso` | TIMESTAMP | No |  | Sí | No |  |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.version_lista_chequeo`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `lista_id` | `lista_id` | UUID | No |  | No | No |  | REFERENCES control_interno.lista_chequeo(id) |
| `version` | `version` | VARCHAR(50) | No |  | No | No |  |  |
| `fecha` | `fecha` | DATE | No |  | No | No |  |  |
| `usuario` | `usuario` | VARCHAR(255) | No |  | No | No |  |  |
| `cambios` | `cambios` | TEXT | No |  | No | No |  |  |
| `motivo_cambio` | `motivo_cambio` | TEXT | No |  | No | No |  |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `control_interno.workflow_aprobacion_informe`

- Entidad/definición: `WorkflowAprobacionInforme`
- Fuente: `TypeORM`
- Archivo: `backend/internal-institutional-control-service/src/esap/informes-ley/entities/workflow-aprobacion-informe.entity.ts`
- Índices de entidad: `['entregaId']`, `['estadoWorkflow']`
- Relaciones declaradas:
  - `entrega`: ManyToOne -> `EntregaInformeLey` por `entrega_id`
  - `pasos`: OneToMany -> `PasoWorkflowInforme`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `entrega_id` | `entregaId` | uuid | No | ManyToOne -> EntregaInformeLey | No | No |  |  |
| `paso_actual` | `pasoActual` | integer | No |  | No | No | 1 |  |
| `estado_workflow` | `estadoWorkflow` | varchar (length 50) | No |  | No | No | en-elaboracion |  |
| `completado` | `completado` | boolean | No |  | No | No | false |  |
| `fecha_completado` | `fechaCompletado` | timestamp | No |  | Sí | No |  |  |
| `creado_por` | `creadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

### Esquema `esap`

MER relacionado: [control_interno](<mer/06-may-2026/esap_db - control_interno.png>)

#### Tabla `esap.cache_esap`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap-extended.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `clave` | `clave` | VARCHAR(500) | No |  | No | Sí |  |  |
| `valor` | `valor` | JSONB | No |  | No | No |  |  |
| `fecha_expiracion` | `fecha_expiracion` | TIMESTAMP | No |  | Sí | No |  |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `esap.configuracion_esap`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap-extended.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `clave` | `clave` | VARCHAR(255) | No |  | No | Sí |  |  |
| `valor` | `valor` | TEXT | No |  | No | No |  |  |
| `descripcion` | `descripcion` | TEXT | No |  | Sí | No |  |  |
| `tipo` | `tipo` | VARCHAR(50) | No |  | Sí | No | 'string' | CHECK (tipo IN ('string', 'number', 'boolean', 'json')) |
| `categoria` | `categoria` | VARCHAR(255) | No |  | Sí | No |  |  |
| `activo` | `activo` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `esap.integraciones_esap`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap-extended.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `nombre` | `nombre` | VARCHAR(255) | No |  | No | No |  |  |
| `tipo` | `tipo` | VARCHAR(100) | No |  | No | No |  | CHECK (tipo IN ('api', 'webhook', 'sftp', 'email', 'otro')) |
| `configuracion` | `configuracion` | JSONB | No |  | No | No |  |  |
| `activa` | `activa` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `ultima_sincronizacion` | `ultima_sincronizacion` | TIMESTAMP | No |  | Sí | No |  |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `esap.logs_auditoria_esap`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap-extended.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `usuario_id` | `usuario_id` | UUID | No |  | Sí | No |  | REFERENCES esap.usuarios_esap(id) |
| `accion` | `accion` | VARCHAR(255) | No |  | No | No |  |  |
| `entidad` | `entidad` | VARCHAR(255) | No |  | Sí | No |  |  |
| `entidad_id` | `entidad_id` | UUID | No |  | Sí | No |  |  |
| `detalles` | `detalles` | JSONB | No |  | Sí | No |  |  |
| `ip_address` | `ip_address` | VARCHAR(45) | No |  | Sí | No |  |  |
| `user_agent` | `user_agent` | TEXT | No |  | Sí | No |  |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `esap.plantillas_documentos_esap`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap-extended.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `codigo` | `codigo` | VARCHAR(255) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | VARCHAR(255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | TEXT | No |  | Sí | No |  |  |
| `tipo_documento` | `tipo_documento` | VARCHAR(100) | No |  | No | No |  |  |
| `contenido` | `contenido` | TEXT | No |  | No | No |  |  |
| `variables_disponibles` | `variables_disponibles` | JSONB | No |  | Sí | No |  |  |
| `activa` | `activa` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `version` | `version` | INTEGER | No |  | Sí | No | 1 |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `esap.sesiones_esap`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap-extended.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `usuario_id` | `usuario_id` | UUID | No |  | No | No |  | REFERENCES esap.usuarios_esap(id) |
| `token` | `token` | VARCHAR(500) | No |  | No | Sí |  |  |
| `ip_address` | `ip_address` | VARCHAR(45) | No |  | Sí | No |  |  |
| `user_agent` | `user_agent` | TEXT | No |  | Sí | No |  |  |
| `fecha_inicio` | `fecha_inicio` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `fecha_expiracion` | `fecha_expiracion` | TIMESTAMP | No |  | No | No |  |  |
| `activa` | `activa` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |

#### Tabla `esap.usuarios_esap`

- Entidad/definición: `SQL`
- Fuente: `SQL`
- Archivo: `backend/internal-institutional-control-service/schema-esap-extended.sql`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | UUID | Sí |  | No | No | gen_random_uuid() |  |
| `codigo` | `codigo` | VARCHAR(255) | No |  | No | Sí |  |  |
| `nombre_completo` | `nombre_completo` | VARCHAR(255) | No |  | No | No |  |  |
| `email` | `email` | VARCHAR(255) | No |  | No | Sí |  |  |
| `cargo` | `cargo` | VARCHAR(255) | No |  | Sí | No |  |  |
| `area` | `area` | VARCHAR(255) | No |  | Sí | No |  |  |
| `rol` | `rol` | VARCHAR(100) | No |  | Sí | No |  |  |
| `activo` | `activo` | BOOLEAN | No |  | Sí | No | TRUE |  |
| `ultimo_acceso` | `ultimo_acceso` | TIMESTAMP | No |  | Sí | No |  |  |
| `created_at` | `created_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |
| `updated_at` | `updated_at` | TIMESTAMP | No |  | Sí | No | CURRENT_TIMESTAMP |  |


## interoperability-service

No se detectaron entidades TypeORM ni tablas documentables en este microservicio.

## legal-management-service

Diagramas MER relacionados:
- [legal_management](<mer/06-may-2026/esap_db - legal_management.png>)

### Esquema `legal_management`

MER relacionado: [legal_management](<mer/06-may-2026/esap_db - legal_management.png>)

#### Tabla `legal_management.abogados`

- Entidad/definición: `Abogado`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/abogado.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `nombre_completo` | `nombreCompleto` | varchar | No |  | No | No |  |  |
| `email` | `email` | varchar | No |  | No | Sí |  |  |
| `telefono` | `telefono` | varchar | No |  | Sí | No |  |  |
| `especialidad` | `especialidad` | varchar | No |  | Sí | No |  |  |
| `fecha_ingreso` | `fechaIngreso` | date | No |  | No | No |  |  |
| `estado` | `estado` | varchar | No |  | No | No | ACTIVO |  |
| `foto_url` | `fotoUrl` | varchar | No |  | Sí | No |  |  |
| `auditoria_created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `auditoria_updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.actas`

- Entidad/definición: `Acta`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/acta.entity.ts`
- Relaciones declaradas:
  - `expediente`: ManyToOne -> `Expediente` por `expediente_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `expediente_id` | `expedienteId` | varchar | No | ManyToOne -> Expediente | No | No |  |  |
| `numero_acta` | `numeroActa` | varchar | No |  | Sí | No |  |  |
| `fecha` | `fecha` | date | No |  | Sí | No |  |  |
| `horario` | `horario` | varchar | No |  | Sí | No |  |  |
| `duracion` | `duracion` | varchar | No |  | Sí | No |  |  |
| `lugar` | `lugar` | varchar | No |  | Sí | No |  |  |
| `presidente` | `presidente` | varchar | No |  | Sí | No |  |  |
| `participantes` | `participantes` | text | No |  | Sí | No |  |  |
| `resumen` | `resumen` | text | No |  | Sí | No |  |  |
| `decisiones_tomadas` | `decisionesTomadas` | text | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar | No |  | No | No | Programada |  |
| `archivo_nombre` | `archivoNombre` | varchar | No |  | Sí | No |  |  |
| `archivo_url` | `archivoUrl` | text | No |  | Sí | No |  |  |
| `archivo_tamano` | `archivoTamano` | integer | No |  | Sí | No |  |  |
| `tipo` | `tipo` | varchar | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.actors`

- Entidad/definición: `Actor`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/actor.entity.ts`
- Relaciones declaradas:
  - `expediente`: ManyToOne -> `Expediente` por `expediente_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `expediente_id` | `expediente_id` | varchar | No | ManyToOne -> Expediente | No | No |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `tipo_persona` | `tipoPersona` | varchar (length 50) | No |  | No | No |  |  |
| `identificacion` | `identificacion` | varchar (length 50) | No |  | Sí | No |  |  |
| `rol` | `rol` | varchar (length 50) | No |  | No | No |  |  |
| `cargo` | `cargo` | varchar (length 100) | No |  | Sí | No |  |  |
| `email` | `email` | varchar (length 255) | No |  | Sí | No |  |  |
| `telefono` | `telefono` | varchar (length 50) | No |  | Sí | No |  |  |
| `direccion` | `direccion` | varchar (length 255) | No |  | Sí | No |  |  |
| `apoderado` | `apoderado` | varchar (length 255) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.actuaciones`

- Entidad/definición: `Actuacion`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/actuacion.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `expediente_id` | `expedienteId` | varchar (length 255) | No |  | No | No |  |  |
| `tipo_actuacion` | `tipoActuacion` | varchar | No |  | No | No | ACTUACION |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `fecha_actuacion` | `fechaActuacion` | timestamp | No |  | No | No |  |  |
| `documento_url` | `documentoUrl` | varchar | No |  | Sí | No |  |  |
| `documento_nombre` | `documentoNombre` | varchar | No |  | Sí | No |  |  |
| `usuario_responsable` | `usuarioResponsable` | varchar | No |  | No | No | Sistema |  |
| `origen` | `origen` | varchar | No |  | No | No | MANUAL |  |
| `referencia_id` | `referenciaId` | uuid | No |  | Sí | No |  |  |
| `metadata` | `metadata` | jsonb | No |  | No | No | {} |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `legal_management.adjuntos_correo`

- Entidad/definición: `AdjuntoCorreo`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/adjunto-correo.entity.ts`
- Relaciones declaradas:
  - `correo`: ManyToOne -> `CorreoJuridico` por `correo_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `correo_id` | `correoId` | varchar | No | ManyToOne -> CorreoJuridico | No | No |  |  |
| `graph_message_id` | `graphMessageId` | varchar (length 500) | No |  | No | No |  |  |
| `graph_attachment_id` | `graphAttachmentId` | varchar (length 500) | No |  | No | No |  |  |
| `nombre` | `nombre` | varchar (length 500) | No |  | No | No |  |  |
| `content_type` | `contentType` | varchar (length 255) | No |  | Sí | No |  |  |
| `tamanio` | `tamanio` | integer | No |  | No | No | 0 |  |
| `archivo_local_url` | `archivoLocalUrl` | text | No |  | Sí | No |  |  |
| `descargado` | `descargado` | boolean | No |  | No | No | false |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `legal_management.audiencias`

- Entidad/definición: `Audiencia`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/audiencia.entity.ts`
- Relaciones declaradas:
  - `expediente`: ManyToOne -> `Expediente` por `expediente_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `expediente_id` | `expedienteId` | varchar | No | ManyToOne -> Expediente | No | No |  |  |
| `abogado_id` | `abogadoId` | varchar | No |  | No | No |  |  |
| `abogado_nombre` | `abogadoNombre` | varchar | No |  | Sí | No |  |  |
| `abogado_email` | `abogadoEmail` | varchar | No |  | Sí | No |  |  |
| `titulo` | `titulo` | varchar | No |  | No | No |  |  |
| `fecha_hora_inicio` | `fechaHoraInicio` | timestamp | No |  | No | No |  |  |
| `duracion_minutos` | `duracionMinutos` | integer | No |  | No | No |  |  |
| `modalidad` | `modalidad` | varchar | No |  | No | No |  |  |
| `ubicacion` | `ubicacion` | varchar | No |  | Sí | No |  |  |
| `link_reunion` | `linkReunion` | varchar | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar | No |  | No | No | PROGRAMADA |  |
| `notas_preparacion` | `notasPreparacion` | text | No |  | Sí | No |  |  |
| `historial` | `historial` | jsonb | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `legal_management.autos`

- Entidad/definición: `Auto`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/auto.entity.ts`
- Relaciones declaradas:
  - `expediente`: ManyToOne -> `Expediente` por `expediente_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `expediente_id` | `expedienteId` | uuid | No | ManyToOne -> Expediente | No | No |  |  |
| `numero` | `numero` | varchar | No |  | No | No |  |  |
| `tipo` | `tipo` | varchar | No |  | No | No |  |  |
| `fecha_auto` | `fechaAuto` | timestamp | No |  | No | No |  |  |
| `juzgado` | `juzgado` | varchar | No |  | No | No | Juzgado Interno Disciplinario |  |
| `resumen` | `resumen` | text | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar | No |  | No | No | Pendiente |  |
| `fecha_notificacion` | `fechaNotificacion` | timestamp | No |  | Sí | No |  |  |
| `archivo_url` | `archivoUrl` | varchar | No |  | No | No |  |  |
| `archivo_nombre` | `archivoNombre` | varchar | No |  | No | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.cat_tipos_requerimiento`

- Entidad/definición: `TipoRequerimientoOC`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/tipo-requerimiento-oc.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | varchar | Sí |  | No | No |  |  |
| `nombre` | `nombre` | varchar (length 200) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `orden` | `orden` | integer | No |  | No | No | 0 |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.coactivos_historial`

- Entidad/definición: `CoactivoHistorial`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/coactivo-historial.entity.ts`
- Relaciones declaradas:
  - `proceso`: ManyToOne -> `ProcesoCoactivo` por `proceso_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `proceso_id` | `procesoId` | varchar | No | ManyToOne -> ProcesoCoactivo | No | No |  |  |
| `tipo_evento` | `tipoEvento` | varchar (length 50) | No |  | No | No |  |  |
| `campo_modificado` | `campoModificado` | varchar (length 100) | No |  | Sí | No |  |  |
| `valor_anterior` | `valorAnterior` | text | No |  | Sí | No |  |  |
| `valor_nuevo` | `valorNuevo` | text | No |  | Sí | No |  |  |
| `usuario` | `usuario` | varchar (length 100) | No |  | Sí | No |  |  |
| `detalles` | `detalles` | text | No |  | Sí | No |  |  |
| `fecha_evento` | `fechaEvento` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `legal_management.comentarios`

- Entidad/definición: `Comentario`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/comentario.entity.ts`
- Relaciones declaradas:
  - `expediente`: ManyToOne -> `Expediente` por `expediente_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `expediente_id` | `expedienteId` | varchar | No | ManyToOne -> Expediente | No | No |  |  |
| `contenido` | `contenido` | text | No |  | No | No |  |  |
| `usuario_id` | `usuarioId` | varchar | No |  | Sí | No |  |  |
| `usuario_nombre` | `usuarioNombre` | varchar | No |  | No | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.comentarios_consulta`

- Entidad/definición: `ComentarioConsulta`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/comentario-consulta.entity.ts`
- Relaciones declaradas:
  - `consulta`: ManyToOne -> `ConsultaJuridica` por `consulta_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `consulta_id` | `consultaId` | varchar | No | ManyToOne -> ConsultaJuridica | No | No |  |  |
| `mensaje` | `mensaje` | varchar | No |  | No | No |  |  |
| `usuario` | `usuario` | varchar | No |  | No | No |  |  |
| `cargo` | `cargo` | varchar | No |  | Sí | No |  |  |
| `fecha` | `fecha` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `legal_management.comentarios_oc`

- Entidad/definición: `ComentarioOC`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/comentario-oc.entity.ts`
- Relaciones declaradas:
  - `requerimiento`: ManyToOne -> `RequerimientoOC` por `requerimiento_id`
  - `autor`: ManyToOne -> `Abogado` por `autor_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `requerimiento_id` | `requerimientoId` | uuid | No | ManyToOne -> RequerimientoOC | No | No |  |  |
| `contenido` | `contenido` | text | No |  | No | No |  |  |
| `tipo` | `tipo` | varchar (length 30) | No |  | No | No | general |  |
| `autor_id` | `autorId` | uuid | No | ManyToOne -> Abogado | Sí | No |  |  |
| `autor_nombre` | `autorNombre` | varchar (length 200) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.consulta_juridica_historial`

- Entidad/definición: `ConsultaJuridicaHistorial`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/consulta-juridica-historial.entity.ts`
- Relaciones declaradas:
  - `consulta`: ManyToOne -> `ConsultaJuridica` por `consulta_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `consulta_id` | `consultaId` | varchar | No | ManyToOne -> ConsultaJuridica | No | No |  |  |
| `tipo_evento` | `tipoEvento` | varchar | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | No | No |  |  |
| `detalle` | `detalle` | text | No |  | Sí | No |  |  |
| `usuario` | `usuario` | varchar | No |  | Sí | No |  |  |
| `fecha` | `fecha` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `legal_management.consultas_juridicas`

- Entidad/definición: `ConsultaJuridica`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/consulta-juridica.entity.ts`
- Relaciones declaradas:
  - `abogadoAsignado`: ManyToOne -> `Abogado` por `abogado_asignado_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `numero_radicado` | `numeroRadicado` | varchar | No |  | No | Sí |  |  |
| `fecha_recepcion` | `fechaRecepcion` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' |  |
| `canal_entrada` | `canalEntrada` | varchar | No |  | Sí | No |  |  |
| `tipo_solicitud` | `tipoSolicitud` | varchar | No |  | Sí | No |  |  |
| `dependencia_solicitante` | `dependenciaSolicitante` | varchar | No |  | Sí | No |  |  |
| `nombre_solicitante` | `nombreSolicitante` | varchar | No |  | Sí | No |  |  |
| `cargo_solicitante` | `cargoSolicitante` | varchar | No |  | Sí | No |  |  |
| `email_solicitante` | `emailSolicitante` | varchar | No |  | Sí | No |  |  |
| `telefono_solicitante` | `telefonoSolicitante` | varchar | No |  | Sí | No |  |  |
| `tipo_usuario` | `tipoUsuario` | varchar | No |  | No | No | interno |  |
| `materia_juridica` | `materiaJuridica` | varchar | No |  | Sí | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `antecedentes` | `antecedentes` | text | No |  | Sí | No |  |  |
| `abogado_asignado_id` | `abogadoAsignadoId` | varchar | No | ManyToOne -> Abogado | Sí | No |  |  |
| `abogado_asignado_nombre` | `abogadoAsignadoNombre` | varchar (length 500) | No |  | Sí | No |  |  |
| `fecha_asignacion` | `fechaAsignacion` | timestamp | No |  | Sí | No |  |  |
| `prioridad` | `prioridad` | varchar | No |  | No | No | media |  |
| `complejidad` | `complejidad` | varchar | No |  | Sí | No |  |  |
| `termino_legal_dias` | `terminoLegalDias` | integer | No |  | No | No | 30 |  |
| `fecha_maxima_respuesta` | `fechaMaximaRespuesta` | timestamp | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar | No |  | No | No | en_radicacion |  |
| `numero_oficio_respuesta` | `numeroOficioRespuesta` | varchar | No |  | Sí | No |  |  |
| `fecha_respuesta` | `fechaRespuesta` | timestamp | No |  | Sí | No |  |  |
| `tipo_respuesta` | `tipoRespuesta` | varchar | No |  | Sí | No |  |  |
| `documento_respuesta_url` | `documentoRespuestaUrl` | text | No |  | Sí | No |  |  |
| `respuesta` | `respuesta` | text | No |  | Sí | No |  |  |
| `destinatarios_adicionales` | `destinatariosAdicionales` | text | No |  | Sí | No |  |  |
| `comentario_devolucion_jefe` | `comentarioDevolucionJefe` | text | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `estado_archivo` | `estadoArchivo` | varchar | No |  | No | No | ACTIVO |  |
| `fecha_archivo` | `fechaArchivo` | timestamp | No |  | Sí | No |  |  |
| `usuario_archivo` | `usuarioArchivo` | varchar | No |  | Sí | No |  |  |
| `motivo_archivo` | `motivoArchivo` | text | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.correo_juridico_historial`

- Entidad/definición: `CorreoJuridicoHistorial`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/correo-juridico-historial.entity.ts`
- Relaciones declaradas:
  - `correoJuridico`: ManyToOne -> `CorreoJuridico` por `correo_juridico_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `correo_juridico_id` | `correoJuridicoId` | uuid | No | ManyToOne -> CorreoJuridico | No | No |  |  |
| `tipo_evento` | `tipoEvento` | varchar (length 50) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | No | No |  |  |
| `detalle_json` | `detalleJson` | jsonb | No |  | Sí | No |  |  |
| `usuario` | `usuario` | varchar (length 255) | No |  | No | No | Sistema |  |
| `fecha_creacion` | `fechaCreacion` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `legal_management.correos_juridicos`

- Entidad/definición: `CorreoJuridico`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/correo-juridico.entity.ts`
- Relaciones declaradas:
  - `adjuntos`: OneToMany -> `AdjuntoCorreo`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `graph_message_id` | `graphMessageId` | varchar (length 500) | No |  | No | Sí |  |  |
| `asunto` | `asunto` | varchar (length 500) | No |  | No | No |  |  |
| `remitente_email` | `remitenteEmail` | varchar (length 255) | No |  | No | No |  |  |
| `remitente_nombre` | `remitenteNombre` | varchar (length 255) | No |  | Sí | No |  |  |
| `destinatarios` | `destinatarios` | text | No |  | Sí | No |  |  |
| `fecha_recepcion` | `fechaRecepcion` | timestamp | No |  | No | No |  |  |
| `cuerpo_html` | `cuerpoHtml` | text | No |  | Sí | No |  |  |
| `cuerpo_texto` | `cuerpoTexto` | text | No |  | Sí | No |  |  |
| `tiene_adjuntos` | `tieneAdjuntos` | boolean | No |  | No | No | false |  |
| `leido` | `leido` | boolean | No |  | No | No | false |  |
| `archivado` | `archivado` | boolean | No |  | No | No | false |  |
| `urgente` | `urgente` | boolean | No |  | No | No | false |  |
| `tipo` | `tipo` | varchar (length 20) | No |  | No | No | CORREO |  |
| `categoria` | `categoria` | varchar (length 100) | No |  | Sí | No |  |  |
| `modulo_sugerido` | `moduloSugerido` | varchar (length 100) | No |  | Sí | No |  |  |
| `confianza_clasificacion` | `confianzaClasificacion` | float | No |  | Sí | No |  |  |
| `ai_suggested_category` | `aiSuggestedCategory` | varchar (length 100) | No |  | Sí | No |  |  |
| `is_trained` | `isTrained` | boolean | No |  | No | No | false |  |
| `expediente_id` | `expedienteId` | varchar | No |  | Sí | No |  |  |
| `direccion` | `direccion` | varchar (length 20) | No |  | No | No | ENTRANTE |  |
| `destinatarios_to` | `destinatariosTo` | text | No |  | Sí | No |  |  |
| `is_replied` | `isReplied` | boolean | No |  | No | No | false |  |
| `is_forwarded` | `isForwarded` | boolean | No |  | No | No | false |  |
| `parent_email_id` | `parentEmailId` | uuid | No |  | Sí | No |  |  |
| `thread_id` | `threadId` | varchar (length 500) | No |  | Sí | No |  |  |
| `internet_message_id` | `internetMessageId` | varchar (length 500) | No |  | Sí | No |  |  |
| `proceso_id_sugerido` | `procesoIdSugerido` | varchar (length 100) | No |  | Sí | No |  |  |
| `implicado_sugerido` | `implicadoSugerido` | varchar (length 255) | No |  | Sí | No |  |  |
| `submodulo_sugerido` | `submoduloSugerido` | varchar (length 100) | No |  | Sí | No |  |  |

#### Tabla `legal_management.decisiones_disciplinarias`

- Entidad/definición: `DecisionDisciplinaria`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/decision-disciplinaria.entity.ts`
- Relaciones declaradas:
  - `expediente`: ManyToOne -> `Expediente` por `expediente_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `tipo_decision` | `tipoDecision` | varchar | No |  | No | No |  |  |
| `tipo_fallo` | `tipoFallo` | varchar | No |  | No | No |  |  |
| `sancion` | `sancion` | varchar | No |  | Sí | No |  |  |
| `consideraciones` | `consideraciones` | text | No |  | No | No |  |  |
| `fundamentos_juridicos` | `fundamentosJuridicos` | text | No |  | Sí | No |  |  |
| `responsable` | `responsable` | varchar | No |  | No | No |  |  |
| `cargo_responsable` | `cargoResponsable` | varchar | No |  | Sí | No |  |  |
| `fecha` | `fecha` | date | No |  | No | No | () => 'CURRENT_DATE' |  |
| `expediente_id` | `expedienteId` | varchar | No | ManyToOne -> Expediente | No | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `legal_management.documentos`

- Entidad/definición: `Documento`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/documento.entity.ts`
- Relaciones declaradas:
  - `expediente`: ManyToOne -> `Expediente` por `expediente_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `expediente_id` | `expedienteId` | varchar | No | ManyToOne -> Expediente | No | No |  |  |
| `nombre` | `nombre` | varchar (length 500) | No |  | No | No |  |  |
| `tipo` | `tipo` | varchar (length 100) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `archivo_url` | `archivoUrl` | text | No |  | Sí | No |  |  |
| `archivo_nombre_original` | `archivoNombreOriginal` | varchar (length 500) | No |  | Sí | No |  |  |
| `archivo_tamano` | `archivoTamano` | integer | No |  | Sí | No |  |  |
| `archivo_mime_type` | `archivoMimeType` | varchar (length 100) | No |  | Sí | No |  |  |
| `fecha_documento` | `fechaDocumento` | date | No |  | Sí | No |  |  |
| `numero_folios` | `numeroFolios` | integer | No |  | Sí | No |  |  |
| `confidencial` | `confidencial` | boolean | No |  | No | No | false |  |
| `subido_por` | `subidoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `categoria` | `categoria` | varchar (length 50) | No |  | No | No | documentos |  |
| `etapa` | `etapa` | varchar (length 100) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.documentos_consulta`

- Entidad/definición: `DocumentoConsulta`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/documento-consulta.entity.ts`
- Relaciones declaradas:
  - `consulta`: ManyToOne -> `ConsultaJuridica` por `consulta_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `consulta_id` | `consultaId` | uuid | No | ManyToOne -> ConsultaJuridica | No | No |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `tipo_documento` | `tipoDocumento` | varchar (length 50) | No |  | No | No | otro |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `archivo_url` | `archivoUrl` | text | No |  | Sí | No |  |  |
| `archivo_nombre_original` | `archivoNombreOriginal` | varchar (length 255) | No |  | Sí | No |  |  |
| `tamano_bytes` | `tamanoBytes` | bigint | No |  | Sí | No |  |  |
| `mime_type` | `mimeType` | varchar (length 100) | No |  | Sí | No |  |  |
| `subido_por` | `subidoPor` | varchar (length 200) | No |  | Sí | No |  |  |
| `firmado` | `firmado` | boolean | No |  | No | No | false |  |
| `fecha_documento` | `fechaDocumento` | date | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.documentos_oc`

- Entidad/definición: `DocumentoOC`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/documento-oc.entity.ts`
- Relaciones declaradas:
  - `requerimiento`: ManyToOne -> `RequerimientoOC` por `requerimiento_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `requerimiento_id` | `requerimientoId` | uuid | No | ManyToOne -> RequerimientoOC | No | No |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `tipo_documento` | `tipoDocumento` | varchar (length 50) | No |  | No | No | otro |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `archivo_url` | `archivoUrl` | text | No |  | Sí | No |  |  |
| `tamano_bytes` | `tamanoBytes` | bigint | No |  | Sí | No |  |  |
| `mime_type` | `mimeType` | varchar (length 100) | No |  | Sí | No |  |  |
| `subido_por` | `subidoPor` | varchar (length 200) | No |  | Sí | No |  |  |
| `fecha_documento` | `fechaDocumento` | date | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.evidencias`

- Entidad/definición: `Evidencia`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/evidencia.entity.ts`
- Relaciones declaradas:
  - `expediente`: ManyToOne -> `Expediente` por `expediente_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `expediente_id` | `expedienteId` | varchar | No | ManyToOne -> Expediente | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `aportado_por` | `aportadoPor` | varchar | No |  | Sí | No |  |  |
| `fecha_presentacion` | `fechaPresentacion` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' |  |
| `archivo_nombre` | `archivoNombre` | varchar | No |  | Sí | No |  |  |
| `archivo_url` | `archivoUrl` | text | No |  | Sí | No |  |  |
| `archivo_tamano` | `archivoTamano` | integer | No |  | Sí | No |  |  |
| `tipo` | `tipo` | varchar | No |  | Sí | No |  |  |
| `prioridad` | `prioridad` | varchar | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar | No |  | No | No | Pendiente |  |
| `tipo_archivo` | `tipoArchivo` | varchar | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.excepciones_procesales`

- Entidad/definición: `ExcepcionProcesal`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/excepcion-procesal.entity.ts`
- Relaciones declaradas:
  - `expediente`: ManyToOne -> `Expediente` por `expediente_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `tipo` | `tipo` | TipoExcepcion (length 50) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | No | No |  |  |
| `fundamento` | `fundamento` | text | No |  | Sí | No |  |  |
| `estado` | `estado` | EstadoExcepcion (length 20) | No |  | No | No | PENDIENTE |  |
| `resolucion` | `resolucion` | text | No |  | Sí | No |  |  |
| `fecha_presentacion` | `fechaPresentacion` | date | No |  | No | No | () => 'CURRENT_DATE' |  |
| `fecha_resolucion` | `fechaResolucion` | date | No |  | Sí | No |  |  |
| `presentado_por` | `presentadoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `expediente_id` | `expedienteId` | varchar | No | ManyToOne -> Expediente | No | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.expedientes`

- Entidad/definición: `Expediente`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/expediente.entity.ts`
- Relaciones declaradas:
  - `actors`: OneToMany -> `Actor`
  - `decisiones`: OneToMany -> `DecisionDisciplinaria`
  - `documentos`: OneToMany -> `Documento`
  - `evidencias`: OneToMany -> `Evidencia`
  - `procesoPrincipal`: ManyToOne -> `Expediente` por `proceso_principal_id`
  - `procesosAnexados`: OneToMany -> `Expediente`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `proceso_principal_id` | `procesoPrincipalId` | varchar | No | ManyToOne -> Expediente | Sí | No |  |  |
| `radicado` | `radicado` | varchar (length 50) | No |  | No | Sí |  |  |
| `jurisdiccion` | `jurisdiccion` | varchar | No |  | No | No | Disciplinaria |  |
| `tipo_proceso` | `tipoProceso` | varchar | No |  | No | No | Ordinario |  |
| `demandante` | `demandante` | varchar | No |  | No | No | De Oficio |  |
| `demandado` | `demandado` | varchar | No |  | No | No | ESAP |  |
| `estado` | `estado` | varchar | No |  | No | No | RADICADO |  |
| `fecha_radicacion` | `fechaRadicacion` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' |  |
| `cuantia` | `cuantia` | numeric (precision 15, scale 2) | No |  | Sí | No |  |  |
| `nivel_riesgo` | `nivelRiesgo` | varchar | No |  | Sí | No |  |  |
| `provision_contable` | `provisionContable` | numeric (precision 15, scale 2) | No |  | Sí | No |  |  |
| `fecha_estimacion_provision` | `fechaEstimacionProvision` | timestamp | No |  | Sí | No |  |  |
| `observacion_provision` | `observacionProvision` | text | No |  | Sí | No |  |  |
| `abogado_sustanciador` | `abogadoSustanciador` | varchar | No |  | Sí | No |  |  |
| `abogados_anteriores` | `abogadosAnteriores` | text (array) | No |  | No | No | {} |  |
| `fecha_prescripcion` | `fechaPrescripcion` | timestamp | No |  | Sí | No |  |  |
| `riesgo_prescripcion` | `riesgoPrescripcion` | boolean | No |  | No | No | false |  |
| `termino_procesal_dias` | `terminoProcesalDias` | integer | No |  | Sí | No |  |  |
| `tipo_conteo_termino` | `tipoConteoTermino` | varchar | No |  | No | No | HABILES |  |
| `ultima_actuacion` | `ultimaActuacion` | varchar | No |  | Sí | No |  |  |
| `ubicacion_fisica` | `ubicacionFisica` | varchar | No |  | Sí | No |  |  |
| `sancion_proyectada` | `sancionProyectada` | varchar | No |  | Sí | No |  |  |
| `medio_control` | `medioControl` | varchar | No |  | Sí | No |  |  |
| `juzgado_conocimiento` | `juzgadoConocimiento` | varchar | No |  | Sí | No |  |  |
| `pretension_demandante` | `pretensionDemandante` | text | No |  | Sí | No |  |  |
| `acto_administrativo_demandado` | `actoAdministrativoDemandado` | text | No |  | Sí | No |  |  |
| `fecha_notificacion` | `fechaNotificacion` | timestamp | No |  | Sí | No |  |  |
| `fecha_admision` | `fechaAdmision` | timestamp | No |  | Sí | No |  |  |
| `fecha_vencimiento_termino` | `fechaVencimientoTermino` | timestamp | No |  | Sí | No |  |  |
| `tipo_id_demandante` | `tipoIdDemandante` | varchar | No |  | Sí | No |  |  |
| `numero_id_demandante` | `numeroIdDemandante` | varchar | No |  | Sí | No |  |  |
| `tipo_id_demandado` | `tipoIdDemandado` | varchar | No |  | Sí | No |  |  |
| `numero_id_demandado` | `numeroIdDemandado` | varchar | No |  | Sí | No |  |  |
| `demandante_direccion` | `demandanteDireccion` | varchar (length 500) | No |  | Sí | No |  |  |
| `demandante_telefono` | `demandanteTelefono` | varchar (length 50) | No |  | Sí | No |  |  |
| `demandante_email` | `demandanteEmail` | varchar (length 255) | No |  | Sí | No |  |  |
| `demandante_apoderado` | `demandanteApoderado` | varchar (length 255) | No |  | Sí | No |  |  |
| `demandado_direccion` | `demandadoDireccion` | varchar (length 500) | No |  | Sí | No |  |  |
| `demandado_telefono` | `demandadoTelefono` | varchar (length 50) | No |  | Sí | No |  |  |
| `demandado_email` | `demandadoEmail` | varchar (length 255) | No |  | Sí | No |  |  |
| `etapa_procesal` | `etapaProcesal` | varchar | No |  | No | No | RADICACION |  |
| `documentos_iniciales_urls` | `documentosInicialesUrls` | simple-array | No |  | Sí | No |  |  |
| `etapa` | `etapa` | varchar (length 50) | No |  | Sí | No |  |  |
| `cargo_investigado` | `cargoInvestigado` | varchar (length 255) | No |  | Sí | No |  |  |
| `ley_aplicable` | `leyAplicable` | varchar (length 100) | No |  | Sí | No |  |  |
| `fecha_hechos` | `fechaHechos` | timestamp | No |  | Sí | No |  |  |
| `tipo_falta` | `tipoFalta` | varchar (length 50) | No |  | Sí | No |  |  |
| `dependencia_investigado` | `dependenciaInvestigado` | varchar (length 150) | No |  | Sí | No |  |  |
| `hechos` | `hechos` | text | No |  | Sí | No |  |  |
| `fecha_limite_etapa` | `fechaLimiteEtapa` | timestamp | No |  | Sí | No |  |  |
| `tipo_solicitud` | `tipoSolicitud` | varchar (length 100) | No |  | Sí | No |  |  |
| `radicado_externo` | `radicadoExterno` | varchar (length 50) | No |  | Sí | No |  |  |
| `asunto` | `asunto` | varchar (length 255) | No |  | Sí | No |  |  |
| `datos_requeridos` | `datosRequeridos` | text | No |  | Sí | No |  |  |
| `estado_archivo` | `estadoArchivo` | varchar | No |  | No | No | ACTIVO |  |
| `fecha_archivo` | `fechaArchivo` | timestamp | No |  | Sí | No |  |  |
| `usuario_archivo` | `usuarioArchivo` | varchar | No |  | Sí | No |  |  |
| `motivo_archivo` | `motivoArchivo` | text | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.hallazgos`

- Entidad/definición: `Hallazgo`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/hallazgo.entity.ts`
- Relaciones declaradas:
  - `requerimiento`: ManyToOne -> `RequerimientoOC` por `requerimiento_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `requerimiento_id` | `requerimientoId` | uuid | No | ManyToOne -> RequerimientoOC | Sí | No |  |  |
| `codigo_hallazgo` | `codigoHallazgo` | varchar (length 50) | No |  | No | Sí |  |  |
| `numero_interno` | `numeroInterno` | varchar (length 50) | No |  | Sí | No |  |  |
| `tipo_hallazgo` | `tipoHallazgo` | TipoHallazgo (length 30) | No |  | No | No | ADMINISTRATIVO |  |
| `titulo` | `titulo` | varchar (length 300) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | No | No |  |  |
| `causa_raiz` | `causaRaiz` | text | No |  | Sí | No |  |  |
| `efecto` | `efecto` | text | No |  | Sí | No |  |  |
| `area_responsable` | `areaResponsable` | varchar (length 150) | No |  | Sí | No |  |  |
| `funcionario_responsable` | `funcionarioResponsable` | varchar (length 200) | No |  | Sí | No |  |  |
| `accion_correctiva` | `accionCorrectiva` | text | No |  | No | No |  |  |
| `fecha_compromiso` | `fechaCompromiso` | date | No |  | No | No |  |  |
| `indicador_cumplimiento` | `indicadorCumplimiento` | text | No |  | Sí | No |  |  |
| `meta_indicador` | `metaIndicador` | varchar (length 100) | No |  | Sí | No |  |  |
| `estado` | `estado` | EstadoHallazgo (length 30) | No |  | No | No | ABIERTO |  |
| `porcentaje_avance` | `porcentajeAvance` | integer | No |  | No | No | 0 |  |
| `fecha_ultimo_reporte` | `fechaUltimoReporte` | timestamp | No |  | Sí | No |  |  |
| `fecha_proximo_reporte` | `fechaProximoReporte` | date | No |  | Sí | No |  |  |
| `periodicidad_reporte` | `periodicidadReporte` | PeriodicidadReporte (length 20) | No |  | No | No | TRIMESTRAL |  |
| `documento_plan_url` | `documentoPlanUrl` | text | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `created_by` | `createdBy` | varchar (length 150) | No |  | Sí | No |  |  |

#### Tabla `legal_management.notas_expediente`

- Entidad/definición: `NotaExpediente`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/nota-expediente.entity.ts`
- Relaciones declaradas:
  - `expediente`: ManyToOne -> `Expediente` por `expediente_id`
  - `autor`: ManyToOne -> `Abogado` por `autor_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `expediente_id` | `expedienteId` | varchar | No | ManyToOne -> Expediente | No | No |  |  |
| `contenido` | `contenido` | text | No |  | No | No |  |  |
| `tipo` | `tipo` | varchar | No |  | No | No | general |  |
| `autor_id` | `autorId` | varchar | No | ManyToOne -> Abogado | Sí | No |  |  |
| `autor_nombre` | `autorNombre` | varchar | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.oficios_enviados`

- Entidad/definición: `OficioEnviado`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/oficio-enviado.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `numero` | `numero` | varchar (length 50) | No |  | No | No |  |  |
| `expediente_id` | `expedienteId` | varchar (length 100) | No |  | No | No |  |  |
| `modulo` | `modulo` | varchar (length 50) | No |  | Sí | No |  |  |
| `asunto` | `asunto` | varchar (length 500) | No |  | No | No |  |  |
| `destinatario` | `destinatario` | varchar (length 300) | No |  | No | No |  |  |
| `destinatario_email` | `destinatarioEmail` | varchar (length 200) | No |  | Sí | No |  |  |
| `contenido` | `contenido` | text | No |  | No | No |  |  |
| `contenido_html` | `contenidoHtml` | text | No |  | Sí | No |  |  |
| `firma` | `firma` | varchar (length 200) | No |  | Sí | No |  |  |
| `plantilla` | `plantilla` | varchar (length 50) | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar (length 30) | No |  | No | No | ENVIADO |  |
| `fecha_envio` | `fechaEnvio` | timestamp | No |  | No | No | () => 'NOW()' |  |
| `archivos_adjuntos` | `archivosAdjuntos` | jsonb | No |  | Sí | No |  |  |
| `graph_message_id` | `graphMessageId` | varchar (length 200) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.organismos_control`

- Entidad/definición: `OrganismoControlOC`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/organismo-control-legal.entity.ts`
- Relaciones declaradas:
  - `requerimientos`: OneToMany -> `require`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | integer generated | Sí |  | No | No |  |  |
| `sigla` | `sigla` | varchar (length 20) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | varchar (length 200) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `legal_management.pagos_coactivos`

- Entidad/definición: `PagoCoactivo`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/pago-coactivo.entity.ts`
- Relaciones declaradas:
  - `proceso`: ManyToOne -> `ProcesoCoactivo` por `proceso_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `proceso_id` | `procesoId` | varchar | No | ManyToOne -> ProcesoCoactivo | No | No |  |  |
| `valor` | `valor` | numeric (precision 15, scale 2) | No |  | No | No |  |  |
| `abono_capital` | `abonoCapital` | numeric (precision 15, scale 2) | No |  | No | No | 0 |  |
| `abono_intereses` | `abonoIntereses` | numeric (precision 15, scale 2) | No |  | No | No | 0 |  |
| `abono_costas` | `abonoCostas` | numeric (precision 15, scale 2) | No |  | No | No | 0 |  |
| `fecha_pago` | `fechaPago` | timestamp | No |  | No | No |  |  |
| `soporte_url` | `soporteUrl` | varchar | No |  | Sí | No |  |  |
| `origen` | `origen` | varchar (length 50) | No |  | No | No | MANUAL |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.pei_indicadores`

- Entidad/definición: `PeiIndicador`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/pei-indicador.entity.ts`
- Relaciones declaradas:
  - `registros`: OneToMany -> `PeiRegistroAvance`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | integer generated | Sí |  | No | No |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `eje_estrategico` | `ejeEstrategico` | varchar (length 50) | No |  | No | No |  |  |
| `meta_objetivo` | `metaObjetivo` | decimal (precision 10, scale 2) | No |  | No | No |  |  |
| `unidad_medida` | `unidadMedida` | varchar (length 20) | No |  | No | No | PORCENTAJE |  |
| `fecha_inicio` | `fechaInicio` | date | No |  | No | No |  |  |
| `fecha_fin` | `fechaFin` | date | No |  | No | No |  |  |
| `frecuencia_medicion` | `frecuenciaMedicion` | varchar (length 20) | No |  | No | No | MENSUAL |  |
| `responsable_id` | `responsableId` | uuid | No |  | Sí | No |  |  |
| `responsable_nombre` | `responsableNombre` | varchar (length 200) | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar (length 20) | No |  | No | No | ACTIVO |  |
| `prioridad` | `prioridad` | varchar (length 20) | No |  | No | No | MEDIA |  |
| `tipo_indicador` | `tipoIndicador` | varchar (length 50) | No |  | No | No | GESTION |  |
| `archived_at` | `archivedAt` | timestamp with time zone | No |  | Sí | No |  |  |
| `archived_by` | `archivedBy` | varchar (length 255) | No |  | Sí | No |  |  |
| `archive_reason` | `archiveReason` | text | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.pei_registros_avance`

- Entidad/definición: `PeiRegistroAvance`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/pei-registro-avance.entity.ts`
- Relaciones declaradas:
  - `indicador`: ManyToOne -> `PeiIndicador` por `indicador_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | integer generated | Sí |  | No | No |  |  |
| `indicador_id` | `indicadorId` | integer | No | ManyToOne -> PeiIndicador | No | No |  |  |
| `valor_reportado` | `valorReportado` | decimal (precision 10, scale 2) | No |  | No | No |  |  |
| `porcentaje_avance` | `porcentajeAvance` | decimal (precision 5, scale 2) | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `evidencia_url` | `evidenciaUrl` | text | No |  | Sí | No |  |  |
| `fecha_registro` | `fechaRegistro` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `usuario_registra_id` | `usuarioRegistraId` | uuid | No |  | Sí | No |  |  |

#### Tabla `legal_management.planes_comentarios`

- Entidad/definición: `PlanComentario`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/planes-mejoramiento.entity.ts`
- Relaciones declaradas:
  - `plan`: ManyToOne -> `PlanMejoramiento` por `plan_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `plan_id` | `planId` | varchar | No | ManyToOne -> PlanMejoramiento | No | No |  |  |
| `mensaje` | `mensaje` | text | No |  | No | No |  |  |
| `usuario_id` | `usuarioId` | varchar | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `legal_management.planes_evidencias`

- Entidad/definición: `PlanEvidencia`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/planes-mejoramiento.entity.ts`
- Relaciones declaradas:
  - `plan`: ManyToOne -> `PlanMejoramiento` por `plan_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `plan_id` | `planId` | varchar | No | ManyToOne -> PlanMejoramiento | No | No |  |  |
| `titulo` | `titulo` | varchar | No |  | No | No |  |  |
| `url_archivo` | `urlArchivo` | varchar | No |  | No | No |  |  |
| `tipo_archivo` | `tipoArchivo` | varchar | No |  | Sí | No |  |  |
| `uploaded_by` | `uploadedBy` | varchar | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `legal_management.planes_mejoramiento`

- Entidad/definición: `PlanMejoramiento`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/planes-mejoramiento.entity.ts`
- Relaciones declaradas:
  - `evidencias`: OneToMany -> `PlanEvidencia`
  - `seguimientos`: OneToMany -> `PlanSeguimiento`
  - `comentarios`: OneToMany -> `PlanComentario`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar | No |  | No | Sí |  |  |
| `titulo` | `titulo` | varchar | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `origen` | `origen` | varchar | No |  | No | No |  |  |
| `origen_id` | `origenId` | varchar | No |  | Sí | No |  |  |
| `responsable_id` | `responsableId` | varchar | No |  | Sí | No |  |  |
| `responsable_nombre` | `responsableNombre` | varchar | No |  | Sí | No |  |  |
| `fecha_inicio` | `fechaInicio` | timestamp | No |  | No | No |  |  |
| `fecha_fin_estimada` | `fechaFinEstimada` | timestamp | No |  | No | No |  |  |
| `fecha_cierre_real` | `fechaCierreReal` | timestamp | No |  | Sí | No |  |  |
| `avance_porcentaje` | `avancePorcentaje` | decimal (precision 5, scale 2) | No |  | No | No | 0 |  |
| `presupuesto` | `presupuesto` | decimal (precision 15, scale 2) | No |  | No | No | 0 |  |
| `estado` | `estado` | varchar | No |  | No | No | ABIERTO |  |
| `documento_origen` | `documentoOrigen` | varchar | No |  | Sí | No |  |  |
| `area_responsable` | `areaResponsable` | varchar | No |  | Sí | No |  |  |
| `fecha_recepcion` | `fechaRecepcion` | timestamp | No |  | Sí | No |  |  |
| `fecha_respuesta` | `fechaRespuesta` | timestamp | No |  | Sí | No |  |  |
| `severidad` | `severidad` | varchar | No |  | Sí | No |  |  |
| `archived_at` | `archivedAt` | timestamp with time zone | No |  | Sí | No |  |  |
| `archived_by` | `archivedBy` | varchar (length 255) | No |  | Sí | No |  |  |
| `archive_reason` | `archiveReason` | text | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.planes_seguimientos`

- Entidad/definición: `PlanSeguimiento`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/planes-mejoramiento.entity.ts`
- Relaciones declaradas:
  - `plan`: ManyToOne -> `PlanMejoramiento` por `plan_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `plan_id` | `planId` | varchar | No | ManyToOne -> PlanMejoramiento | No | No |  |  |
| `descripcion_avance` | `descripcionAvance` | text | No |  | No | No |  |  |
| `porcentaje_reportado` | `porcentajeReportado` | decimal (precision 5, scale 2) | No |  | Sí | No |  |  |
| `fecha_reporte` | `fechaReporte` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `usuario_id` | `usuarioId` | varchar | No |  | Sí | No |  |  |

#### Tabla `legal_management.plantillas_documentos`

- Entidad/definición: `PlantillaDocumento`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/plantilla-documento.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `nombre` | `nombre` | varchar (length 500) | No |  | No | No |  |  |
| `categoria` | `categoria` | varchar (length 100) | No |  | No | No |  |  |
| `nombre_original` | `nombreOriginal` | varchar (length 500) | No |  | No | No |  |  |
| `mime_type` | `mimeType` | varchar (length 100) | No |  | No | No |  |  |
| `tamano` | `tamano` | integer | No |  | No | No |  |  |
| `contenido_base64` | `contenidoBase64` | text | No |  | No | No |  |  |
| `subido_por` | `subidoPor` | varchar (length 255) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.procesos_coactivos`

- Entidad/definición: `ProcesoCoactivo`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/proceso-coactivo.entity.ts`
- Relaciones declaradas:
  - `adjuntos`: OneToMany -> `ProcesoCoactivoAdjunto`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `radicado` | `radicado` | varchar | No |  | No | Sí |  |  |
| `deudor` | `deudor` | jsonb | No |  | No | No |  |  |
| `obligacion` | `obligacion` | jsonb | No |  | No | No |  |  |
| `estado` | `estado` | enum (enum PERSUASIVA, COACTIVA, MEDIDAS_CAUTELARES, EXCEPCIONES, LIQUIDACION) | No |  | No | No | PERSUASIVA |  |
| `responsable` | `responsable` | varchar | No |  | Sí | No |  |  |
| `documentos_adjuntos` | `documentosAdjuntos` | int | No |  | No | No | 0 |  |
| `valor_pagado` | `valorPagado` | numeric (precision 15, scale 2) | No |  | No | No | 0 |  |
| `saldo_pendiente` | `saldoPendiente` | numeric (precision 15, scale 2) | No |  | No | No | 0 |  |
| `fecha_ejecutoria` | `fechaEjecutoria` | timestamp | No |  | Sí | No |  |  |
| `tipo_interes_aplicable` | `tipoInteresAplicable` | enum (enum TipoTasaReferencia) | No |  | Sí | No | TipoTasaReferencia.DIAN |  |
| `valor_costas` | `valorCostas` | numeric (precision 15, scale 2) | No |  | No | No | 0 |  |
| `notificaciones_enviadas` | `notificacionesEnviadas` | int | No |  | No | No | 0 |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `ultima_actuacion` | `ultimaActuacion` | timestamp | No |  | Sí | No |  |  |
| `fecha_creacion` | `fechaCreacion` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `estado_archivo` | `estadoArchivo` | varchar (length 20) | No |  | No | No | ACTIVO |  |
| `fecha_archivo` | `fechaArchivo` | timestamp | No |  | Sí | No |  |  |
| `usuario_archivo` | `usuarioArchivo` | varchar (length 150) | No |  | Sí | No |  |  |
| `motivo_archivo` | `motivoArchivo` | text | No |  | Sí | No |  |  |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.procesos_coactivos_adjuntos`

- Entidad/definición: `ProcesoCoactivoAdjunto`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/proceso-coactivo-adjunto.entity.ts`
- Relaciones declaradas:
  - `proceso`: ManyToOne -> `ProcesoCoactivo` por `proceso_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `proceso_id` | `procesoId` | varchar | No | ManyToOne -> ProcesoCoactivo | No | No |  |  |
| `nombre_original` | `nombreOriginal` | varchar | No |  | No | No |  |  |
| `nombre_archivo` | `nombreArchivo` | varchar | No |  | No | No |  |  |
| `mime_type` | `mimeType` | varchar | No |  | No | No |  |  |
| `tamano` | `tamano` | int | No |  | No | No |  |  |
| `tipo` | `tipo` | varchar | No |  | Sí | No |  |  |
| `es_titulo_ejecutivo` | `esTituloEjecutivo` | boolean | No |  | No | No | false |  |
| `archivo_url` | `archivoUrl` | varchar | No |  | Sí | No |  |  |
| `fecha_creacion` | `fechaCreacion` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `legal_management.requerimientos_oc`

- Entidad/definición: `RequerimientoOC`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/requerimiento-oc.entity.ts`
- Relaciones declaradas:
  - `abogadoAsignado`: ManyToOne -> `Abogado` por `abogado_asignado_id`
  - `documentos`: OneToMany -> `DocumentoOC`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `radicado_externo` | `radicadoExterno` | varchar (length 100) | No |  | No | No |  |  |
| `radicado_interno` | `radicadoInterno` | varchar (length 30) | No |  | No | Sí |  |  |
| `organismo_id` | `organismoId` | varchar | No |  | Sí | No |  |  |
| `tipo_requerimiento` | `tipoRequerimiento` | TipoRequerimiento (length 50) | No |  | No | No |  |  |
| `asunto` | `asunto` | text | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `fecha_recepcion` | `fechaRecepcion` | date | No |  | No | No |  |  |
| `unidad_tiempo` | `unidadTiempo` | UnidadTiempo (length 20) | No |  | No | No | DIAS_HABILES |  |
| `plazo_otorgado` | `plazoOtorgado` | integer | No |  | No | No | 15 |  |
| `fecha_vencimiento` | `fechaVencimiento` | date | No |  | No | No |  |  |
| `funcionario_responsable` | `funcionarioResponsable` | varchar (length 200) | No |  | Sí | No |  |  |
| `area_responsable` | `areaResponsable` | varchar (length 150) | No |  | Sí | No |  |  |
| `abogado_asignado_id` | `abogadoAsignadoId` | uuid | No | ManyToOne -> Abogado | Sí | No |  |  |
| `estado` | `estado` | EstadoRequerimiento (length 30) | No |  | No | No | RECIBIDO |  |
| `prioridad` | `prioridad` | Prioridad (length 15) | No |  | No | No | NORMAL |  |
| `archivo_adjunto_url` | `archivoAdjuntoUrl` | text | No |  | Sí | No |  |  |
| `oficio_respuesta_url` | `oficioRespuestaUrl` | text | No |  | Sí | No |  |  |
| `acuse_recibo_url` | `acuseReciboUrl` | text | No |  | Sí | No |  |  |
| `fecha_respuesta` | `fechaRespuesta` | timestamp | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `created_by` | `createdBy` | varchar (length 150) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |
| `estado_archivo` | `estadoArchivo` | varchar | No |  | No | No | ACTIVO |  |
| `fecha_archivo` | `fechaArchivo` | timestamp | No |  | Sí | No |  |  |
| `usuario_archivo` | `usuarioArchivo` | varchar | No |  | Sí | No |  |  |
| `motivo_archivo` | `motivoArchivo` | text | No |  | Sí | No |  |  |

#### Tabla `legal_management.respuesta_borrador_oc`

- Entidad/definición: `RespuestaBorradorOC`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/respuesta-borrador-oc.entity.ts`
- Relaciones declaradas:
  - `requerimiento`: OneToOne -> `RequerimientoOC` por `requerimiento_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `requerimiento_id` | `requerimientoId` | uuid | No | OneToOne -> RequerimientoOC | No | No |  |  |
| `destinatario_nombre` | `destinatarioNombre` | varchar (length 200) | No |  | Sí | No |  |  |
| `destinatario_email` | `destinatarioEmail` | varchar (length 200) | No |  | Sí | No |  |  |
| `destinatario_cargo` | `destinatarioCargo` | varchar (length 150) | No |  | Sí | No |  |  |
| `tipo_respuesta` | `tipoRespuesta` | varchar (length 50) | No |  | Sí | No |  |  |
| `contenido` | `contenido` | text | No |  | Sí | No |  |  |
| `documentos_adjuntos` | `documentosAdjuntos` | jsonb | No |  | No | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.riesgo_historial`

- Entidad/definición: `RiesgoHistorial`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/riesgo-historial.entity.ts`
- Relaciones declaradas:
  - `riesgo`: ManyToOne -> `Riesgo` por `riesgo_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `riesgo_id` | `riesgoId` | uuid | No | ManyToOne -> Riesgo | No | No |  |  |
| `tipo_evento` | `tipoEvento` | varchar (length 50) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | No | No |  |  |
| `campo_modificado` | `campoModificado` | varchar (length 100) | No |  | Sí | No |  |  |
| `valor_anterior` | `valorAnterior` | text | No |  | Sí | No |  |  |
| `valor_nuevo` | `valorNuevo` | text | No |  | Sí | No |  |  |
| `usuario` | `usuario` | varchar (length 200) | No |  | No | No | Sistema |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |

#### Tabla `legal_management.riesgos`

- Entidad/definición: `Riesgo`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/riesgo.entity.ts`
- Relaciones declaradas:
  - `responsableAbogado`: ManyToOne -> `Abogado` por `responsable_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `codigo` | `codigo` | varchar (length 30) | No |  | No | Sí |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | No | No |  |  |
| `proceso` | `proceso` | varchar (length 100) | No |  | No | No |  |  |
| `tipo_riesgo` | `tipoRiesgo` | TipoRiesgo (length 30) | No |  | No | No |  |  |
| `etapa` | `etapa` | EtapaRiesgo (length 30) | No |  | No | No | IDENTIFICADO |  |
| `probabilidad_inherente` | `probabilidadInherente` | integer | No |  | No | No | 3 |  |
| `impacto_inherente` | `impactoInherente` | integer | No |  | No | No | 3 |  |
| `zona_inherente` | `zonaInherente` | ZonaRiesgo (length 20) | No |  | No | No | MODERADO |  |
| `probabilidad_residual` | `probabilidadResidual` | integer | No |  | No | No | 3 |  |
| `impacto_residual` | `impactoResidual` | integer | No |  | No | No | 3 |  |
| `zona_residual` | `zonaResidual` | ZonaRiesgo (length 20) | No |  | No | No | MODERADO |  |
| `causas` | `causas` | jsonb | No |  | No | No |  |  |
| `consecuencias` | `consecuencias` | jsonb | No |  | No | No |  |  |
| `controles_existentes` | `controlesExistentes` | jsonb | No |  | No | No |  |  |
| `plan_tratamiento` | `planTratamiento` | jsonb | No |  | No | No |  |  |
| `responsable` | `responsable` | varchar (length 200) | No |  | No | No |  |  |
| `responsable_id` | `responsableId` | uuid | No | ManyToOne -> Abogado | Sí | No |  |  |
| `cuantia_estimada` | `cuantiaEstimada` | decimal (precision 15, scale 2) | No |  | No | No | 0 |  |
| `provision_contable` | `provisionContable` | decimal (precision 15, scale 2) | No |  | No | No | 0 |  |
| `porcentaje_provision` | `porcentajeProvision` | integer | No |  | No | No | 0 |  |
| `fecha_calculo_provision` | `fechaCalculoProvision` | timestamp | No |  | Sí | No |  |  |
| `modulo_origen` | `moduloOrigen` | varchar (length 50) | No |  | Sí | No |  |  |
| `proceso_id` | `procesoId` | uuid | No |  | Sí | No |  |  |
| `proceso_radicado` | `procesoRadicado` | varchar (length 100) | No |  | Sí | No |  |  |
| `estado` | `estado` | EstadoRiesgo (length 20) | No |  | No | No | ACTIVO |  |
| `motivo_archivo` | `motivoArchivo` | text | No |  | Sí | No |  |  |
| `created_by` | `createdBy` | varchar (length 200) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.solicitudes_insumos`

- Entidad/definición: `SolicitudInsumo`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/solicitud-insumo.entity.ts`
- Relaciones declaradas:
  - `requerimiento`: ManyToOne -> `RequerimientoOC` por `requerimiento_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `requerimiento_id` | `requerimientoId` | uuid | No | ManyToOne -> RequerimientoOC | No | No |  |  |
| `area_destino` | `areaDestino` | varchar (length 150) | No |  | No | No |  |  |
| `funcionario_destino` | `funcionarioDestino` | varchar (length 200) | No |  | Sí | No |  |  |
| `email_destino` | `emailDestino` | varchar (length 150) | No |  | Sí | No |  |  |
| `descripcion_solicitud` | `descripcionSolicitud` | text | No |  | No | No |  |  |
| `documentos_solicitados` | `documentosSolicitados` | text | No |  | Sí | No |  |  |
| `fecha_solicitud` | `fechaSolicitud` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' |  |
| `fecha_vencimiento_interna` | `fechaVencimientoInterna` | timestamp | No |  | No | No |  |  |
| `fecha_respuesta` | `fechaRespuesta` | timestamp | No |  | Sí | No |  |  |
| `estado` | `estado` | EstadoInsumo (length 25) | No |  | No | No | PENDIENTE |  |
| `documentos_entregados_url` | `documentosEntregadosUrl` | text | No |  | Sí | No |  |  |
| `comentario_respuesta` | `comentarioRespuesta` | text | No |  | Sí | No |  |  |
| `solicitado_por` | `solicitadoPor` | varchar (length 150) | No |  | Sí | No |  |  |
| `respondido_por` | `respondidoPor` | varchar (length 150) | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.system_configurations`

- Entidad/definición: `SystemConfiguration`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/system-configuration.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `key` | `key` | varchar | Sí |  | No | No |  |  |
| `module` | `module` | varchar | No |  | No | No |  |  |
| `value` | `value` | jsonb | No |  | No | No |  |  |
| `description` | `description` | varchar | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.tareas_expediente`

- Entidad/definición: `TareaExpediente`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/tarea-expediente.entity.ts`
- Relaciones declaradas:
  - `expediente`: ManyToOne -> `Expediente` por `expediente_id`
  - `responsable`: ManyToOne -> `Abogado` por `responsable_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `expediente_id` | `expedienteId` | varchar | No | ManyToOne -> Expediente | No | No |  |  |
| `titulo` | `titulo` | varchar | No |  | No | No |  |  |
| `descripcion` | `descripcion` | text | No |  | Sí | No |  |  |
| `fecha_vencimiento` | `fechaVencimiento` | timestamp | No |  | Sí | No |  |  |
| `prioridad` | `prioridad` | varchar | No |  | No | No | media |  |
| `estado` | `estado` | varchar | No |  | No | No | pendiente |  |
| `responsable_id` | `responsableId` | varchar | No | ManyToOne -> Abogado | Sí | No |  |  |
| `responsable_nombre` | `responsableNombre` | varchar | No |  | Sí | No |  |  |
| `fecha_creacion` | `fechaCreacion` | timestamp | No |  | No | No | () => 'CURRENT_TIMESTAMP' |  |
| `fecha_completada` | `fechaCompletada` | timestamp | No |  | Sí | No |  |  |
| `creado_por` | `creadoPor` | varchar | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.tasas_referencia`

- Entidad/definición: `TasaReferencia`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/tasa-referencia.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `anio` | `anio` | int | No |  | No | No |  |  |
| `mes` | `mes` | int | No |  | No | No |  |  |
| `valor_tasa` | `valorTasa` | decimal (precision 5, scale 2) | No |  | No | No |  |  |
| `tipo_tasa` | `tipoTasa` | enum (enum TipoTasaReferencia) | No |  | No | No | TipoTasaReferencia.DIAN |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `legal_management.terminos_procesales`

- Entidad/definición: `TerminoProcesal`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/termino-procesal.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `origen_modulo` | `origenModulo` | varchar (length 50) | No |  | No | No |  | Índice:  |
| `referencia_id` | `referenciaId` | uuid | No |  | Sí | No |  | Índice:  |
| `numero_radicado` | `numeroRadicado` | varchar (length 100) | No |  | Sí | No |  |  |
| `nombre_actuacion` | `nombreActuacion` | varchar (length 255) | No |  | No | No |  |  |
| `fecha_base` | `fechaBase` | timestamp with time zone | No |  | No | No |  |  |
| `dias_termino` | `diasTermino` | int | No |  | No | No |  |  |
| `tipo_dias` | `tipoDias` | varchar (length 20) | No |  | No | No | HABILES |  |
| `fecha_vencimiento` | `fechaVencimiento` | timestamp with time zone | No |  | No | No |  | Índice:  |
| `fecha_alerta_preventiva` | `fechaAlertaPreventiva` | timestamp with time zone | No |  | Sí | No |  |  |
| `fecha_alerta_critica` | `fechaAlertaCritica` | timestamp with time zone | No |  | Sí | No |  |  |
| `estado` | `estado` | varchar (length 20) | No |  | No | No | PENDIENTE | Índice:  |
| `prioridad` | `prioridad` | varchar (length 10) | No |  | No | No | MEDIA |  |
| `responsable_id` | `responsableId` | uuid | No |  | Sí | No |  | Índice:  |
| `responsable_nombre` | `responsableNombre` | varchar (length 255) | No |  | Sí | No |  |  |
| `observaciones` | `observaciones` | text | No |  | Sí | No |  |  |
| `created_at` | `createdAt` | timestamp with time zone | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp with time zone | No |  | No | No |  | Fecha de actualización automática |
| `closed_at` | `closedAt` | timestamp with time zone | No |  | Sí | No |  |  |

### Esquema `requerimientos_oc`

MER relacionado: [legal_management](<mer/06-may-2026/esap_db - legal_management.png>)

#### Tabla `requerimientos_oc.cat_organismos_control`

- Entidad/definición: `OrganismoControl`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/organismo-control.entity.ts`
- Relaciones declaradas:
  - `requerimientos`: OneToMany -> `Requerimiento`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | integer generated | Sí |  | No | No |  |  |
| `nombre` | `nombre` | varchar (length 255) | No |  | No | Sí |  |  |
| `sigla` | `sigla` | varchar (length 50) | No |  | No | No |  |  |
| `tipo` | `tipo` | varchar (length 50) | No |  | No | No |  |  |
| `nivel` | `nivel` | varchar (length 50) | No |  | No | No |  |  |
| `activo` | `activo` | boolean | No |  | No | No | true |  |
| `created_at` | `createdAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |

#### Tabla `requerimientos_oc.requerimientos`

- Entidad/definición: `Requerimiento`
- Fuente: `TypeORM`
- Archivo: `backend/legal-management-service/src/entities/requerimiento.entity.ts`
- Relaciones declaradas:
  - `entidad`: ManyToOne -> `OrganismoControl` por `entidad_id`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | `id` | uuid generated | Sí |  | No | No |  |  |
| `radicado_externo` | `radicadoExterno` | varchar (length 50) | No |  | No | No |  |  |
| `radicado_interno` | `radicadoInterno` | varchar (length 20) | No |  | No | Sí |  |  |
| `entidad_id` | `entidadId` | integer | No | ManyToOne -> OrganismoControl | No | No |  |  |
| `asunto` | `asunto` | text | No |  | No | No |  |  |
| `tipo_requerimiento` | `tipoRequerimiento` | varchar | No |  | No | No |  |  |
| `fecha_recepcion` | `fechaRecepcion` | date | No |  | No | No |  |  |
| `fecha_vencimiento` | `fechaVencimiento` | date | No |  | No | No |  |  |
| `estado` | `estado` | varchar | No |  | No | No | EN_PREPARACION |  |
| `prioridad_calculada` | `prioridadCalculada` | varchar | No |  | No | No | NORMAL |  |
| `archivo_adjunto_url` | `archivoAdjuntoUrl` | varchar | No |  | Sí | No |  |  |
| `usuario_asignado_id` | `usuarioAsignadoId` | integer | No |  | Sí | No |  |  |
| `auditoria_created_at` | `auditoriaCreatedAt` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `updated_at` | `updatedAt` | timestamp | No |  | No | No |  | Fecha de actualización automática |


## notifications-service

Fuentes SQL detectadas:
- `backend/notifications-service/db/001_create_notifications_table.sql`

### Esquema `notifications`

#### Tabla `notifications.notificacion`

- Entidad/definición: `Notification`
- Fuente: `TypeORM`
- Archivo: `backend/notifications-service/src/notifications/entities/notification.entity.ts`

| Columna | Propiedad | Tipo | PK | FK/Relación | Nulo | Única | Default | Nota |
|---|---|---|---|---|---|---|---|---|
| `id_notificacion` | `id_notificacion` | uuid generated | Sí |  | No | No |  |  |
| `id_usuario_destinatario` | `id_usuario_destinatario` | varchar | No |  | No | No |  |  |
| `tipo_notificacion` | `tipo_notificacion` | varchar | No |  | No | No |  |  |
| `titulo` | `titulo` | varchar | No |  | No | No |  |  |
| `mensaje` | `mensaje` | text | No |  | No | No |  |  |
| `descripcion_corta` | `descripcion_corta` | varchar | No |  | Sí | No |  |  |
| `icono` | `icono` | varchar | No |  | Sí | No |  |  |
| `color` | `color` | varchar | No |  | Sí | No |  |  |
| `prioridad` | `prioridad` | varchar | No |  | No | No | Media |  |
| `categoria` | `categoria` | varchar | No |  | Sí | No |  |  |
| `leida` | `leida` | boolean | No |  | No | No | false |  |
| `archivada` | `archivada` | boolean | No |  | No | No | false |  |
| `fecha_creacion` | `fecha_creacion` | timestamp | No |  | No | No |  | Fecha de creación automática |
| `fecha_lectura` | `fecha_lectura` | timestamptz | No |  | Sí | No |  |  |
| `fecha_archivado` | `fecha_archivado` | timestamptz | No |  | Sí | No |  |  |
| `tiene_accion` | `tiene_accion` | boolean | No |  | No | No | false |  |
| `texto_boton_accion` | `texto_boton_accion` | varchar | No |  | Sí | No |  |  |
| `url_accion` | `url_accion` | varchar | No |  | Sí | No |  |  |
| `datos_adicionales` | `datos_adicionales` | jsonb | No |  | Sí | No |  |  |
| `email_enviado` | `email_enviado` | boolean | No |  | No | No | false |  |
| `email_entregado` | `email_entregado` | boolean | No |  | No | No | false |  |
| `email_abierto` | `email_abierto` | boolean | No |  | No | No | false |  |
| `email_click` | `email_click` | boolean | No |  | No | No | false |  |
| `fecha_envio_email` | `fecha_envio_email` | timestamptz | No |  | Sí | No |  |  |
| `fecha_apertura_email` | `fecha_apertura_email` | timestamptz | No |  | Sí | No |  |  |


## travel-expenses-service

No se detectaron entidades TypeORM ni tablas documentables en este microservicio.

## Overview general

### Resumen práctico

- El backend documentado contiene 216 tablas y 3280 columnas distribuidas en 11 esquemas.
- La fuente principal del modelo son las entidades TypeORM: 174 tablas. Además, se encontraron 42 tablas definidas solo en archivos SQL.
- Hay 8 diagramas MER vinculados desde `docs/mer/06-may-2026/`, asociados por esquema o dominio de microservicio.
- Los microservicios con mayor superficie de datos son: internal-institutional-control-service (79), legal-management-service (48), internal-disciplinary-control-service (27), auth-service (22), academic-work-plan-service (15).
- Los microservicios sin tablas detectadas son: api-gateway, interoperability-service, travel-expenses-service.

### Lectura por dominio

- `auth-service` concentra usuarios, roles, permisos, personas, sedes, seccionales y catálogos administrativos del esquema `auth`.
- `internal-institutional-control-service` concentra el dominio de control interno: auditorías, hallazgos, planes de mejoramiento, informes de ley, aprobaciones, notificaciones y tableros.
- `legal-management-service` concentra gestión jurídica: expedientes, actuaciones, documentos, consultas jurídicas, riesgos, procesos coactivos, requerimientos de organismos de control y PEI.
- `internal-disciplinary-control-service` concentra control disciplinario: noticias, procesos, autos, evidencias, actuaciones, términos procesales, alertas y configuraciones.
- `academic-registration-service` y `certification-service` cubren certificados, solicitudes, validaciones, firmantes y configuración de plantillas.
- `academic-work-plan-service` cubre planes de trabajo académico, docentes, asignaturas, sedes, programas, evidencias, eventos y aprobaciones.
- `audit-service` y `notifications-service` tienen una superficie acotada orientada a logs de solicitudes y notificaciones.

### Resumen por microservicio

| Microservicio | Esquemas | MER | Tablas | Columnas | TypeORM | SQL |
|---|---|---|---:|---:|---:|---:|
| `academic-registration-service` | `academic_registration` | [academic_registration](<mer/06-may-2026/esap_db - academic_registration.png>) | 10 | 181 | 10 | 0 |
| `academic-work-plan-service` | `academic_work_plan` | [academic_work_plan](<mer/06-may-2026/esap_db - academic_work_plan.png>) | 15 | 192 | 15 | 0 |
| `api-gateway` | N/A | N/A | 0 | 0 | 0 | 0 |
| `audit-service` | `audit` | [audit](<mer/06-may-2026/esap_db - audit.png>) | 1 | 34 | 1 | 0 |
| `auth-service` | `auth`, `default` | [auth](<mer/06-may-2026/esap_db - auth.png>) | 22 | 477 | 12 | 10 |
| `certification-service` | `default` | [certification](<mer/06-may-2026/esap_db - certification.png>) | 13 | 197 | 13 | 0 |
| `internal-disciplinary-control-service` | `default`, `internal_disciplinary_control` | [internal_disciplinary_control](<mer/06-may-2026/esap_db - internal_disciplinary_control.png>) | 27 | 342 | 26 | 1 |
| `internal-institutional-control-service` | `control_interno`, `esap` | [control_interno](<mer/06-may-2026/esap_db - control_interno.png>) | 79 | 1143 | 48 | 31 |
| `interoperability-service` | N/A | N/A | 0 | 0 | 0 | 0 |
| `legal-management-service` | `legal_management`, `requerimientos_oc` | [legal_management](<mer/06-may-2026/esap_db - legal_management.png>) | 48 | 689 | 48 | 0 |
| `notifications-service` | `notifications` | N/A | 1 | 25 | 1 | 0 |
| `travel-expenses-service` | N/A | N/A | 0 | 0 | 0 | 0 |

### Criterios de uso

- Para entender el modelo vigente de una funcionalidad, revisar primero las tablas con fuente `TypeORM`, porque representan el contrato que usa la aplicación.
- Para validar instalaciones, migraciones o tablas heredadas, revisar las tablas con fuente `SQL`, especialmente en `auth-service` e `internal-institutional-control-service`.
- Las tablas marcadas en esquema `default` dependen del esquema configurado en la conexión del microservicio o del esquema por defecto de PostgreSQL.
- Las relaciones listadas provienen de decoradores TypeORM; las tablas derivadas de SQL documentan llaves y restricciones cuando están declaradas en el `CREATE TABLE`.
