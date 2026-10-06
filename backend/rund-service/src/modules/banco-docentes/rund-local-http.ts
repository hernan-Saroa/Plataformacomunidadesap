import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

/** La carga inicial de un modelo local puede superar el límite de cabeceras de fetch. */
export function postLocalJson(url: string, body: unknown, timeoutMs = 600000): Promise<any> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const data = JSON.stringify(body);
    const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
    const request = send(target, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, response => {
      response.on('error', error => { clearTimeout(timer); reject(error); });
      if (response.statusCode !== 200) {
        response.resume();
        request.destroy(new Error('MODELO_NO_DISPONIBLE'));
        return;
      }
      let length = 0;
      const chunks: Buffer[] = [];
      response.on('data', chunk => {
        length += chunk.length;
        if (length > 2 * 1024 * 1024) request.destroy(new Error('RESPUESTA_MODELO_DEMASIADO_GRANDE'));
        else chunks.push(Buffer.from(chunk));
      });
      response.on('end', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { reject(new Error('RESPUESTA_MODELO_INVALIDA')); }
      });
    });
    const timer = setTimeout(() => request.destroy(new Error('MODELO_TIMEOUT')), timeoutMs);
    timer.unref();
    request.on('error', error => { clearTimeout(timer); reject(error); });
    request.end(data);
  });
}
