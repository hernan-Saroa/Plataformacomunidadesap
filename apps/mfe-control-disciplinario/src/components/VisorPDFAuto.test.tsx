import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VisorPDFAuto } from './VisorPDFAuto';
import { toast } from 'sonner';

// Mock de las dependencias
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    initial: {},
    animate: {},
    exit: {},
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon">X</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Printer: () => <div data-testid="printer-icon">Printer</div>,
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('jsPDF');
vi.mock('html2canvas');

vi.mock('../../../services/api/disciplinary.service', () => ({
  disciplinaryService: {
    getConfiguracionPlantillaAuto: vi.fn(),
  },
}));

// Import after mocking
import { disciplinaryService } from '../../../services/api/disciplinary.service';

describe('VisorPDFAuto', () => {
  const mockAuto = {
    id: 'auto-123',
    numero: 'AUTO-001',
    tipo: 'AUTO_APERTURA',
    contenido: '<p>Contenido del auto</p>',
    estado: 'BORRADOR',
    createdAt: '2024-01-15T10:00:00Z',
    process: {
      radicadoProceso: 'RAD-001',
      news: {
        hechos: 'Hechos del proceso',
        fechaQueja: '2024-01-10',
        denunciante: { nombre: 'Juan Pérez' },
        disciplinable: { nombre: 'María García', cargo: 'Profesora' },
      },
    },
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    auto: mockAuto,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    disciplinaryService.getConfiguracionPlantillaAuto.mockResolvedValue({
      typography: { font: 'Times New Roman' },
      headerTitle: 'REPÚBLICA DE COLOMBIA\nCONTROL DISCIPLINARIO INTERNO',
      autoContentHtml: '<p>Plantilla: [RADICADO] - [FECHA_ACTUAL]</p>',
      logo: null,
      firmante: { nombre: 'Director', cargo: 'Director Disciplinario' },
    });
  });

  it('should not render when isOpen is false', () => {
    render(<VisorPDFAuto {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Vista Previa - Auto Disciplinario')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen is true', async () => {
    render(<VisorPDFAuto {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Vista Previa - Auto Disciplinario')).toBeInTheDocument();
    });

    expect(screen.getByText('AUTO-001 - AUTO_APERTURA')).toBeInTheDocument();
  });

  it('should show loading state while fetching template config', () => {
    render(<VisorPDFAuto {...defaultProps} />);

    expect(screen.getByText('Cargando configuración de plantilla...')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    render(<VisorPDFAuto {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('x-icon'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should render template mode when modoPlantilla is true', async () => {
    render(<VisorPDFAuto {...defaultProps} modoPlantilla={true} />);

    await waitFor(() => {
      expect(screen.getByText('Vista Previa - Plantilla de Auto')).toBeInTheDocument();
    });

    expect(screen.getByText('Plantilla desde Base de Datos')).toBeInTheDocument();
  });

  it('should not show download and print buttons in template mode', async () => {
    render(<VisorPDFAuto {...defaultProps} modoPlantilla={true} />);

    await waitFor(() => {
      expect(screen.queryByTestId('download-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('printer-icon')).not.toBeInTheDocument();
    });
  });

  it('should show download and print buttons in normal mode', async () => {
    render(<VisorPDFAuto {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('download-icon')).toBeInTheDocument();
      expect(screen.getByTestId('printer-icon')).toBeInTheDocument();
    });
  });

  it('should replace variables in template content', async () => {
    render(<VisorPDFAuto {...defaultProps} />);

    await waitFor(() => {
      // Verificar que las variables se reemplazaron
      expect(screen.getByText('RAD-001')).toBeInTheDocument();
      expect(screen.getByText('15/1/2024')).toBeInTheDocument(); // Fecha actual formateada
    });
  });

  it('should handle template mode content correctly', async () => {
    render(<VisorPDFAuto {...defaultProps} modoPlantilla={true} />);

    await waitFor(() => {
      expect(screen.getByText('PLANTILLA DE AUTO - BASE DE DATOS')).toBeInTheDocument();
      expect(screen.getByText('Vista previa de la plantilla sin reemplazar variables')).toBeInTheDocument();
    });
  });

  it('should show footer info correctly', async () => {
    render(<VisorPDFAuto {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Vista previa del documento')).toBeInTheDocument();
      expect(screen.getByText('Generado:')).toBeInTheDocument();
    });
  });

  it('should show template footer info in template mode', async () => {
    render(<VisorPDFAuto {...defaultProps} modoPlantilla={true} />);

    await waitFor(() => {
      expect(screen.getByText('Vista previa de plantilla BD')).toBeInTheDocument();
      expect(screen.getByText('Plantilla cargada desde BD')).toBeInTheDocument();
    });
  });

  it('should handle error when loading template config', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    disciplinaryService.getConfiguracionPlantillaAuto.mockRejectedValue(
      new Error('Error de red')
    );

    render(<VisorPDFAuto {...defaultProps} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error al cargar configuración de plantilla:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should render without auto prop in template mode', async () => {
    render(<VisorPDFAuto {...defaultProps} auto={undefined} modoPlantilla={true} />);

    await waitFor(() => {
      expect(screen.getByText('Vista Previa - Plantilla de Auto')).toBeInTheDocument();
    });
  });
});