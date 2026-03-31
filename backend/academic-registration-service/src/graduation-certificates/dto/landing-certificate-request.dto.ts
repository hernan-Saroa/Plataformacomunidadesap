export class LandingCertificateRequestDto {
  /**
   * Número de cédula del graduado
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
   * Fecha de graduación en caso de que el solicitante la conozca
   */
  graduationDate?: string;
  /**
   * Apellido(s) del graduado para validaci??n adicional
   */
  lastName?: string;
}
