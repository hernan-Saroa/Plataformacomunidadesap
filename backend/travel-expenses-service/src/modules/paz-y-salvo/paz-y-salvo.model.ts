export interface ContenidoPazYSalvo {
  id: string;
  comisionadoId: string;
  nombre: string;
  documento: string;
  coordinadoraId: string;
  coordinadoraNombre: string;
  solicitadoEn: string;
}
export interface FirmaOtp {
  id: string;
  email: string;
  fechaFirma: string;
  metodo: 'OTP_EMAIL';
  context: string;
}
export interface PazYSalvo {
  id: string;
  comisionado_id: string;
  solicitado_por_id: string;
  contenido: ContenidoPazYSalvo;
  contenido_sha256: string;
  creado_en: Date;
  firma: FirmaOtp | null;
  firmado_en: Date | null;
  archivo_sha256: string | null;
}
