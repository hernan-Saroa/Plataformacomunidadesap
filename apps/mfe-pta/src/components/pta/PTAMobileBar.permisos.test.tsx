import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PTAMobileBar } from './PTAMobileBar';

afterEach(cleanup);

describe('navegación móvil PTA según permisos', () => {
  it('con solo Configuración muestra únicamente esa opción al abrir Más', () => {
    const onNavigate = vi.fn();
    render(<PTAMobileBar moduleView="configuracion" onNavigate={onNavigate} tieneVista={vista => vista === 'configuracion'} />);
    expect(screen.queryByRole('button', { name: 'Gestión' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Docentes' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Más vistas' }));
    fireEvent.click(screen.getByRole('button', { name: /Configuración/ }));
    expect(onNavigate).toHaveBeenCalledWith('configuracion');
    expect(screen.queryByRole('button', { name: /Centro de Reportes/ })).toBeNull();
  });

  it('sin Configuración no ofrece esa opción en el menú móvil', () => {
    render(<PTAMobileBar moduleView="gestion" onNavigate={vi.fn()} tieneVista={vista => vista === 'gestion' || vista === 'centro_reportes'} />);
    expect(screen.getByRole('button', { name: 'Gestión' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Más vistas' }));
    expect(screen.queryByRole('button', { name: /Configuración/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Centro de Reportes/ })).toBeTruthy();
  });
});
