export class LandingCertificateRequestDto {
  /**
   * Número de documento del graduado
   */
  idNumber: string;

  /**
   * Fecha de expedición del documento de identidad (en formato dd/mm/aaaa o yyyy-mm-dd)
   */
  idIssueDate?: string;

  /**
   * Tipo de solicitante: GRADUATE o COMPANY
   */
  requesterType?: 'GRADUATE' | 'COMPANY';

  /**
   * Nombre completo del solicitante (o del graduado)
   */
  requesterName: string;

  /**
   * Correo electrónico donde se enviará el certificado
   */
  requesterEmail: string;

  /**
   * Correo del graduado cuando el solicitante es el propio graduado.
   * No debe copiarse desde solicitudes de empresa.
   */
  graduateEmail?: string;

  /**
   * Teléfono del solicitante
   */
  requesterPhone?: string;

  /**
   * Nombre de la empresa, si aplica
   */
  companyName?: string;

  /**
   * NIT de la empresa, si aplica
   */
  companyNit?: string;

  /**
   * Persona de contacto en la empresa
   */
  contactPerson?: string;

  /**
   * Nombre del programa académico (puede venir del formulario o de los datos del graduado)
   */
  programName?: string;

  /**
   * Graduado seleccionado por el usuario en la lista de coincidencias
   */
  selectedGraduateId?: string;

  /**
   * Crear solicitud de revision manual aunque exista una coincidencia activa.
   * Se usa cuando el solicitante tiene otro titulo que no aparece digitalizado.
   */
  forceManualReview?: boolean;

  /**
   * Fecha de graduación en caso de que el solicitante la conozca
   */
  graduationDate?: string;
  /**
   * Apellido(s) del graduado para validaci??n adicional
   */
  lastName?: string;
}
