import { createServer, Server, RequestListener } from 'node:http';
import { AddressInfo } from 'node:net';
import { postLocalJson } from './rund-local-http';

describe('HTTP del modelo local', () => {
  let server: Server;
  let url: string;
  afterEach(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); });
  async function listen(handler: RequestListener) {
    server = createServer(handler);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }
  it('espera cabeceras tardías y conserva la respuesta JSON', async () => {
    await listen((_request, response) => setTimeout(() => response.end(JSON.stringify({message:{content:'listo'}})), 60));
    await expect(postLocalJson(url, {model:'local'}, 2000)).resolves.toEqual({message:{content:'listo'}});
  });
  it('cancela cuando vence el plazo sin recibir cabeceras', async () => {
    await listen(() => undefined);
    await expect(postLocalJson(url, {}, 50)).rejects.toThrow('MODELO_TIMEOUT');
  });
  it('no sigue redirecciones', async () => {
    await listen((_request, response) => { response.writeHead(302, {Location:'https://example.com'}); response.end(); });
    await expect(postLocalJson(url, {})).rejects.toThrow('MODELO_NO_DISPONIBLE');
  });
  it('rechaza respuestas que no son JSON', async () => {
    await listen((_request, response) => response.end('respuesta inválida'));
    await expect(postLocalJson(url, {})).rejects.toThrow('RESPUESTA_MODELO_INVALIDA');
  });
  it('limita el tamaño de la respuesta', async () => {
    await listen((_request, response) => response.end('x'.repeat(2 * 1024 * 1024 + 1)));
    await expect(postLocalJson(url, {})).rejects.toThrow();
  });
});
