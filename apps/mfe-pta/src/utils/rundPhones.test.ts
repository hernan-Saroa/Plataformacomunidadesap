import { describe, it, expect } from 'vitest';
import { normalizeRundPhones } from './rundPhones';
import { sanitizeManualPhone, validateManualBancoDocenteStep } from './bancoDocenteManual';
import { normalizeRundPhones as backendNormalize } from '../../../../backend/academic-work-plan-service/src/pta/banco-docentes/rund-phones';

describe('Telefonos multiples en el formulario RUND', () => {
  it.each(['3106791787 - 6723168', '3106791787-3001234567', '+57 (310) 6791787 - +57 3001234567', '3106791787 / 6723168', '3106791787\n6723168', '3106791787\r\n6723168', '31067917876723168', '310ABC1787', '3106791787 - 123', '3106791787 - ', '', '06723168', '601-1234567', '3106791787 3001234567'])('conserva lo escrito y usa el mismo contrato del servidor: %s', raw => {
    expect(sanitizeManualPhone(raw)).toBe(raw);
    expect(normalizeRundPhones(raw)).toBe(backendNormalize(raw));
  });
});

 it.each(['3106791787 - 6723168', '3106791787 - 3001234567'])('el formulario admite cada telefono de la lista: %s', telefono => {
   expect(validateManualBancoDocenteStep({ telefono }, 2).telefono).toBeUndefined();
 });
 it.each(['31067917876723168', '3106791787 - 123', '310ABC1787'])('el formulario explica la correccion sin eliminar caracteres: %s', telefono => {
   expect(validateManualBancoDocenteStep({ telefono }, 2).telefono).toContain('guion');
 });
