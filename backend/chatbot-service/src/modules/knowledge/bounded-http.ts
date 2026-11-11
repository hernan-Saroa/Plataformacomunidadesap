// Límites sobre el cuerpo descomprimido; también se aplican sin Content-Length.
export async function readBounded(response: Response, maxBytes: number): Promise<Buffer> {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel();
    throw new Error('RESPONSE_TOO_LARGE');
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > maxBytes) throw new Error('RESPONSE_TOO_LARGE');
      chunks.push(Buffer.from(part.value));
    }
    return Buffer.concat(chunks);
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
