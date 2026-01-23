/**
 * 🔒 PROTECCIÓN XSS (Cross-Site Scripting)
 * 
 * Sanitiza contenido para prevenir inyección de código malicioso
 * en componentes de React.
 */

/**
 * Sanitiza texto plano para prevenir XSS
 */
export function sanitizeText(text: unknown): string {
  if (typeof text !== 'string') return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Sanitiza HTML permitiendo solo tags seguros
 */
export function sanitizeHTML(html: unknown): string {
  if (typeof html !== 'string') return '';
  
  // Lista blanca de tags permitidos
  const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'span'];
  const allowedTagsRegex = new RegExp(`<(\/?)(?:${allowedTags.join('|')})(\\s[^>]*)?>`, 'gi');
  
  // Remover todos los tags excepto los permitidos
  let sanitized = html.replace(/<[^>]*>/g, (match) => {
    if (allowedTagsRegex.test(match)) {
      return match;
    }
    return '';
  });
  
  // Remover atributos peligrosos
  sanitized = sanitized.replace(/\s(on\w+|style|href|src)\s*=\s*["'][^"']*["']/gi, '');
  
  // Remover javascript: y data: URIs
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');
  
  return sanitized.trim();
}

/**
 * Sanitiza URLs para prevenir javascript: y data: URIs
 */
export function sanitizeURL(url: unknown): string {
  if (typeof url !== 'string') return '';
  
  const trimmedURL = url.trim();
  
  // Lista negra de protocolos peligrosos
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
    'blob:'
  ];
  
  // Verificar protocolos peligrosos
  const lowerURL = trimmedURL.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerURL.startsWith(protocol)) {
      console.warn('[XSS] Dangerous URL protocol blocked:', protocol);
      return '';
    }
  }
  
  // Solo permitir http, https, y URLs relativas
  if (!/^(https?:\/\/|\/)/i.test(trimmedURL)) {
    console.warn('[XSS] Invalid URL format blocked');
    return '';
  }
  
  return trimmedURL;
}

/**
 * Sanitiza nombres (nombres, apellidos)
 */
export function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') return '';
  
  // Solo permitir letras, espacios, guiones, apóstrofes, acentos
  const sanitized = name.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]/g, '');
  
  return sanitized.trim().substring(0, 100); // Límite de longitud
}

/**
 * Sanitiza email
 */
export function sanitizeEmail(email: unknown): string {
  if (typeof email !== 'string') return '';
  
  // Solo permitir caracteres válidos de email
  const sanitized = email.replace(/[^a-zA-Z0-9.@_-]/g, '');
  
  return sanitized.toLowerCase().trim().substring(0, 254); // RFC 5321
}

/**
 * Sanitiza documento de identidad
 */
export function sanitizeDocumento(documento: unknown): string {
  if (typeof documento !== 'string') return '';
  
  // Solo permitir números, letras y guiones
  const sanitized = documento.replace(/[^a-zA-Z0-9-]/g, '');
  
  return sanitized.trim().substring(0, 20);
}

/**
 * Sanitiza ID alfanumérico
 */
export function sanitizeID(id: unknown): string {
  if (typeof id !== 'string') return '';
  
  // Solo permitir alfanuméricos, guiones y guiones bajos
  const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '');
  
  return sanitized.trim().substring(0, 50);
}

/**
 * Sanitiza número de teléfono
 */
export function sanitizePhone(phone: unknown): string {
  if (typeof phone !== 'string') return '';
  
  // Solo permitir números, espacios, paréntesis, guiones y +
  const sanitized = phone.replace(/[^0-9\s()+-]/g, '');
  
  return sanitized.trim().substring(0, 20);
}

/**
 * Sanitiza objeto completo recursivamente
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeText(item) : 
        typeof item === 'object' ? sanitizeObject(item) : 
        item
      );
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Validar y sanitizar entrada de usuario antes de enviar a API
 */
export function sanitizeUserInput(input: {
  nombres?: string;
  apellidos?: string;
  email?: string;
  documento?: string;
  telefono?: string;
  [key: string]: any;
}): typeof input {
  return {
    ...input,
    nombres: input.nombres ? sanitizeName(input.nombres) : undefined,
    apellidos: input.apellidos ? sanitizeName(input.apellidos) : undefined,
    email: input.email ? sanitizeEmail(input.email) : undefined,
    documento: input.documento ? sanitizeDocumento(input.documento) : undefined,
    telefono: input.telefono ? sanitizePhone(input.telefono) : undefined
  };
}

/**
 * Escapar caracteres especiales para uso en RegExp
 */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remover caracteres de control (incluyendo null bytes)
 */
export function removeControlCharacters(text: string): string {
  // Remover caracteres de control excepto \n, \r, \t
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Detectar posible payload XSS
 */
export function detectXSS(text: string): boolean {
  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /eval\(/gi,
    /expression\(/gi,
    /vbscript:/gi,
    /data:text\/html/gi
  ];
  
  return xssPatterns.some(pattern => pattern.test(text));
}

/**
 * Content Security Policy Headers (para implementar en servidor)
 */
export const CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Temporal para desarrollo
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.esap.edu.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};

/**
 * Sanitizar props de React antes de renderizar
 */
export function sanitizeReactProps<T extends Record<string, any>>(props: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(props)) {
    // Skipear funciones y referencias de React
    if (typeof value === 'function' || key === 'children' || key === 'ref') {
      sanitized[key] = value;
      continue;
    }
    
    // Sanitizar strings
    if (typeof value === 'string') {
      // Si es className, style, etc., no sanitizar
      if (['className', 'style', 'id'].includes(key)) {
        sanitized[key] = value;
      } else {
        sanitized[key] = sanitizeText(value);
      }
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeText(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Wrapper para dangerouslySetInnerHTML con sanitización
 */
export function createSafeHTML(html: string): { __html: string } {
  return {
    __html: sanitizeHTML(html)
  };
}

/**
 * Exportaciones para testing
 */
export const __testing__ = {
  detectXSS,
  removeControlCharacters,
  escapeRegExp
};
