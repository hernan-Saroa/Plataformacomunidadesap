import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { PermisosService } from '../../auth/permisos.service';

import { AlertasCron } from '../alertas/alertas.cron';
import { AlertasModule } from '../alertas/alertas.module';
import { AlertasService } from '../alertas/alertas.service';
import { ParametrosAlertaService } from '../alertas/parametros-alerta.service';
import { NotificacionesModule } from './notificaciones.module';
import { NotificacionesSubscriber } from './notificaciones.subscriber';
import { NotificadorService } from './notificador.service';
import { AvisosService } from './avisos.service';

/**
 * Que los módulos arranquen (EFDS-1183).
 *
 * Las pruebas unitarias construyen cada servicio a mano, así que no ven un
 * proveedor que falte: ese error solo aparece al levantar el servicio, cuando
 * ya está desplegado. Esto monta los módulos reales con una base falsa.
 */
describe('Módulos de alertas y notificaciones · arranque', () => {
  const baseFalsa = { subscribers: [] as unknown[], query: jest.fn().mockResolvedValue([]) };

  @Global()
  // PermisosService lo aporta AuthModule, que es global en la aplicación real.
  @Module({
    providers: [
      { provide: DataSource, useValue: baseFalsa },
      { provide: PermisosService, useValue: { permisosDeRoles: jest.fn().mockResolvedValue([]) } },
    ],
    exports: [DataSource, PermisosService],
  })
  class BaseFalsaModule {}

  it('resuelve todos los proveedores sin que falte ninguno', async () => {
    const modulo = await Test.createTestingModule({
      imports: [BaseFalsaModule, AlertasModule, NotificacionesModule],
    }).compile();

    expect(modulo.get(AlertasService)).toBeDefined();
    expect(modulo.get(AlertasCron)).toBeDefined();
    expect(modulo.get(ParametrosAlertaService)).toBeDefined();
    expect(modulo.get(AvisosService)).toBeDefined();
    expect(modulo.get(NotificadorService)).toBeDefined();
    expect(modulo.get(NotificacionesSubscriber)).toBeDefined();
  });

  it('el motor queda escuchando la trazabilidad al arrancar', async () => {
    baseFalsa.subscribers.length = 0;
    const modulo = await Test.createTestingModule({
      imports: [BaseFalsaModule, NotificacionesModule],
    }).compile();

    expect(baseFalsa.subscribers).toContain(modulo.get(NotificacionesSubscriber));
  });

  it('las alertas usan los parámetros configurados, no los de siempre', async () => {
    const modulo = await Test.createTestingModule({
      imports: [BaseFalsaModule, AlertasModule],
    }).compile();

    // Con @Optional un proveedor mal registrado no rompe el arranque: caería en
    // silencio a los valores por defecto. Aquí se comprueba que sí llega.
    expect((modulo.get(AlertasService) as any).parametros).toBe(modulo.get(ParametrosAlertaService));
  });
});
