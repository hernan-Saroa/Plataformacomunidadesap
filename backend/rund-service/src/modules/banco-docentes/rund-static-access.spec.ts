import express from 'express';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { isProtectedRundUpload, normalizedUploadPath, rundStaticAccess } from './rund-static-access';

describe('Archivos estáticos RUND: URLs históricas, JWT y auditoría', () => {
  const jwt = new JwtService({ secret: 'secret-only-for-security-tests' });
  const token = (role: string) => jwt.sign({ sub: 'usuario-1', roles: [role] }, { expiresIn: '5m' });
  const binary = '%PDF-1.7 documento original 1020304050 puntaje 145.5';
  const db = { query: jest.fn().mockResolvedValue([]) };
  const app = express();
  app.use(rundStaticAccess(db, jwt));
  app.get('/uploads/{*path}', (_req, res) => res.type('text').send(binary));
  beforeEach(() => { db.query.mockClear(); db.query.mockResolvedValue([]); });

  it.each(['/uploads/rund-documentos/1020304050/IDENTIDAD/v1.pdf', '/uploads/carpeta-digital/DOCENTE/RUND/soporte.pdf'])(
    'deniega anónimos y docentes antes de entregar %s', async (path) => {
      await request(app).get(path).expect(401);
      const denied = await request(app).get(path).set('Cookie', `esap_access_token=${token('DOCENTE')}`).expect(403);
      expect(denied.text).not.toContain('1020304050');
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(db.query.mock.calls)).not.toContain('1020304050');
      expect(db.query.mock.calls[1][1]).toContain('DENEGADO');
    },
  );

  it.each(['GESTION_PROFESORAL', 'SUPER_ADMIN'])('mantiene la descarga original para %s y la audita', async (role) => {
    const response = await request(app).get('/uploads/rund-documentos/original.pdf')
      .set('Authorization', `Bearer ${token(role)}`).expect(200);
    expect(response.text).toBe(binary);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(db.query.mock.calls[0][1]).toContain('COMPLETO');
  });

  it('conserva intactos los adjuntos ajenos al RUND', async () => {
    await request(app).get('/uploads/solicitudes-pta/adjunto.pdf').expect(200, binary);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('no entrega el archivo si falla la auditoría', async () => {
    db.query.mockRejectedValue(new Error('sin DB'));
    const response = await request(app).get('/uploads/rund-documentos/original.pdf')
      .set('Authorization', `Bearer ${token('SUPER_ADMIN')}`).expect(503);
    expect(response.text).not.toContain(binary);
  });

  it('reconoce mayúsculas, separadores codificados y segmentos normalizados', () => {
    for (const path of ['/uploads/RUND-DOCUMENTOS/v1.pdf', '/uploads/carpeta-digital/DOCENTE/%52UND/v1.pdf',
      '/uploads/carpeta-digital/DOCENTE/otro/../RUND/v1.pdf', '/uploads%2frund-documentos%2fv1.pdf']) {
      expect(isProtectedRundUpload(normalizedUploadPath(path))).toBe(true);
    }
  });
});
