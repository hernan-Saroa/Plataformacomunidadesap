import { describe, expect, it, vi } from 'vitest';
import { getDatoExtraido } from './RundValidationPanel';
vi.mock('../../../../../shell/src/services/api', () => ({apiClient:{}}));
vi.mock('./BancoDocenteEditModal', () => ({BancoDocenteEditModal:()=>null}));
vi.mock('./RundDocumentManager', () => ({RundDocumentManager:()=>null}));

describe('Datos de las columnas en el panel RUND', () => {
  const tarjeta = { proteccion_datos:{acceso_completo:true}, bloques:{ TEST:{campos:[
    {campo:'TIPO_DOCUMENTO',valor:'CC'}, {campo:'DOCUMENTO_IDENTIDAD',valor:'1020304050'},
    {campo:'NIVEL_FORMACION',valor:'Maestría'}, {campo:'REGIMEN_NORMATIVO',valor:'Acuerdo 003/2018'},
    {campo:'SITUACION_CATEGORIA',valor:'Servicio Activo'}, {campo:'CATEGORIA_ESCALAFON',valor:'Asociado'},
    {campo:'ULTIMA_EVALUACION',valor:'Excelente'}, {campo:'INVESTIGACION_ACTIVA',valor:'Sí'},
    {campo:'PUNTAJE_SALARIAL',valor:0},
  ]} } };
  it.each([
    ['Tipo y número de documento','CC · 1020304050'], ['Nivel de formación','Maestría'],
    ['Régimen normativo','Acuerdo 003/2018'], ['Situación categoría','Servicio Activo'],
    ['Última evaluación','Excelente'], ['Investigación activa','Sí'], ['Puntaje salarial',0],
  ])('resuelve %s sin confundirlo con otro campo', (label,expected) => {
    expect(getDatoExtraido('TEST',String(label),tarjeta)).toBe(expected);
  });
  it('distingue puntaje restringido de un campo no registrado', () => {
    expect(getDatoExtraido('TEST','Puntaje salarial',{...tarjeta,proteccion_datos:{acceso_completo:false}})).toBe('Información restringida');
  });
});
