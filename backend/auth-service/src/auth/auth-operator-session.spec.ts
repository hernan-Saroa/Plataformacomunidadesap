import 'reflect-metadata';
import { GUARDS_METADATA, HEADERS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

describe('Contrato /me para sesión opcional RUND', () => {
  it('conserva GET /me con guard JWT y evita caché compartida o persistente', () => {
    const handler = AuthController.prototype.me;
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('me');
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(JwtAuthGuard);
    expect(Reflect.getMetadata(HEADERS_METADATA, handler)).toContainEqual({ name: 'Cache-Control', value: 'private, no-store' });
  });
  it('deriva cuenta de sub verificado y no de persona, id o roles de un parámetro HTTP', async () => {
    const strategy = Object.create(JwtStrategy.prototype) as JwtStrategy;
    const user = await strategy.validate({ sub: 'CUENTA', id: 'OTRA-CUENTA', personId: 'PERSONA', roles: ['GESTION_PROFESORAL'] });
    const controller = new AuthController({} as any, {} as any, {} as any);
    expect(controller.me({ user, body: { userId: 'SUPLENTE' }, query: { actorId: 'SUPLENTE' } }).userId).toBe('CUENTA');
    expect(controller.me({ user })).toBe(user);
  });
});
