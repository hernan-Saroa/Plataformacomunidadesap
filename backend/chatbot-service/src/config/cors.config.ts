import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export function getChatbotCorsOptions(value = process.env.CORS_ORIGIN || ''): CorsOptions {
  const origins = value.split(',').map((item) => item.trim().replace(/\/+$/, '')).filter((item) => {
    try {
      const url = new URL(item);
      return ['http:', 'https:'].includes(url.protocol) && url.origin === item;
    } catch { return false; }
  });
  // Las cookies privadas solo se comparten con orígenes explícitos. '*' no
  // habilita credenciales para cualquier sitio. El gateway no necesita CORS interno.
  return { origin: [...new Set(origins)], credentials: true };
}
