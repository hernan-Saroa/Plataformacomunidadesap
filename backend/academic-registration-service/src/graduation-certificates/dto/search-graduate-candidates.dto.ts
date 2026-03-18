export class SearchGraduateCandidatesDto {
  /**
   * Número de cédula del graduado
   */
  idNumber: string;

  /**
   * Fecha de grado digitada por el usuario
   */
  graduationDate?: string;

  /**
   * Nombre digitado por el usuario para comparar similitud
   */
  lastName?: string;
}
