import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';

describe('registrarTituloDesdeSoporte (título que se escribe al cargar un diploma)', () => {
  const armar = (docente: any) => {
    const manager: any = {
      findOne: jest.fn().mockResolvedValue(docente),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const service: any = Object.create(BancoDocentesService.prototype);
    service.resolveDocenteId = jest.fn().mockResolvedValue('doc-1');
    service.dataSource = { transaction: (cb: any) => cb(manager) };
    service.writeAuditWithManager = jest.fn().mockResolvedValue(undefined);
    return { service: service as BancoDocentesService, manager, audit: service.writeAuditWithManager as jest.Mock };
  };
  const actor = { actorId: 'actor-1', ip: '10.0.0.1' };

  it('sin título en el nivel, lo escrito pasa a ser el título precargado y queda auditado', async () => {
    const { service, manager, audit } = armar({ id: 'doc-1', maestria: null, titulosAdicionales: null });
    const resultado = await service.registrarTituloDesdeSoporte('doc-1', { tipoSoporte: 'diploma_maestria', titulo: '  Maestría en Gobierno ', ...actor });
    expect(resultado).toEqual({ nivel: 'maestria', destino: 'principal', titulo: 'Maestría en Gobierno' });
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), { id: 'doc-1' }, { maestria: 'Maestría en Gobierno' });
    expect(audit).toHaveBeenCalledWith(manager, expect.objectContaining({
      docenteId: 'doc-1', bloque: 'FORMACION', accion: 'EDITAR_TITULO_FORMACION', actorId: 'actor-1', ip: '10.0.0.1',
      campoAfectado: 'MAESTRIA', datoPrevio: undefined, datoNuevo: 'Maestría en Gobierno',
      metadata: expect.objectContaining({ cambios: { MAESTRIA: { anterior: null, nuevo: 'Maestría en Gobierno' } } }),
    }));
  });

  it('con título en el nivel, el nuevo se suma a los adicionales sin tocar el precargado', async () => {
    const { service, manager, audit } = armar({ id: 'doc-1', pregrado: 'Abogado', titulosAdicionales: { pregrado: ['Contador Público'], maestria: ['M1'] } });
    const resultado = await service.registrarTituloDesdeSoporte('doc-1', { tipoSoporte: 'diploma_pregrado', titulo: 'Economista', ...actor });
    expect(resultado.destino).toBe('adicional');
    // Se conservan los adicionales de los demás niveles.
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), { id: 'doc-1' }, { titulosAdicionales: { pregrado: ['Contador Público', 'Economista'], maestria: ['M1'] } });
    expect(audit).toHaveBeenCalledWith(manager, expect.objectContaining({
      campoAfectado: 'TITULOS_ADICIONALES_PREGRADO', datoPrevio: 'Contador Público', datoNuevo: 'Contador Público; Economista',
    }));
  });

  it('el posdoctorado usa su propia columna y etiqueta', async () => {
    const { service, manager, audit } = armar({ id: 'doc-1', posDoctorado: '', titulosAdicionales: null });
    await service.registrarTituloDesdeSoporte('doc-1', { tipoSoporte: 'certificado_posdoctoral', titulo: 'Estancia en Salamanca', ...actor });
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), { id: 'doc-1' }, { posDoctorado: 'Estancia en Salamanca' });
    expect(audit).toHaveBeenCalledWith(manager, expect.objectContaining({ campoAfectado: 'POSDOCTORADO' }));
  });

  it('un título repetido se rechaza y no escribe nada', async () => {
    const { service, manager, audit } = armar({ id: 'doc-1', pregrado: 'Administración Pública', titulosAdicionales: null });
    await expect(service.registrarTituloDesdeSoporte('doc-1', { tipoSoporte: 'diploma_pregrado', titulo: 'administracion publica', ...actor })).rejects.toThrow(/ya está registrado/);
    expect(manager.update).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it('rechaza soportes que no son diplomas de nivel, títulos vacíos y docentes inexistentes', async () => {
    const { service, manager } = armar({ id: 'doc-1', pregrado: null });
    await expect(service.registrarTituloDesdeSoporte('doc-1', { tipoSoporte: 'diploma_bachiller', titulo: 'x', ...actor })).rejects.toThrow(BadRequestException);
    await expect(service.registrarTituloDesdeSoporte('doc-1', { tipoSoporte: 'diploma_pregrado', titulo: '   ', ...actor })).rejects.toThrow(BadRequestException);
    expect(manager.update).not.toHaveBeenCalled();
    const { service: sinDocente } = armar(null);
    await expect(sinDocente.registrarTituloDesdeSoporte('doc-1', { tipoSoporte: 'diploma_pregrado', titulo: 'x', ...actor })).rejects.toThrow(NotFoundException);
  });
});
