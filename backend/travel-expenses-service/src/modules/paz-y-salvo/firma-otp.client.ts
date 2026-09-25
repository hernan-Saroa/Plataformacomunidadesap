import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { FirmaOtp } from './paz-y-salvo.model';

export interface CredencialesFirma { authorization?: string; cookie?: string }

@Injectable()
export class FirmaOtpClient {
  private async post(ruta: string, body: object, credenciales: CredencialesFirma): Promise<any> {
    const base = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    let response: Response;
    try {
      response = await fetch(`${base.replace(/\/$/, '')}/signature-otp/${ruta}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...credenciales },
        body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
      });
    } catch { throw new BadGatewayException('No fue posible contactar el servicio de firma'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status >= 500) throw new BadGatewayException('El servicio de firma no está disponible');
      throw new BadRequestException(data.message || 'No fue posible validar la firma');
    }
    return data.success === true && data.data ? data.data : data;
  }

  solicitar(context: string, credenciales: CredencialesFirma) {
    return this.post('request', { context, actionDetail: `Firmar paz y salvo ${context.split(':')[1]}` }, credenciales);
  }

  async verificar(context: string, code: string, credenciales: CredencialesFirma): Promise<FirmaOtp> {
    const result = await this.post('verify', { context, code }, credenciales);
    if (result.context !== context || result.metodo !== 'OTP_EMAIL' || !result.id ||
        !result.email || !Number.isFinite(Date.parse(result.fechaFirma))) {
      throw new BadGatewayException('La evidencia de firma no corresponde al documento');
    }
    return result;
  }
}
