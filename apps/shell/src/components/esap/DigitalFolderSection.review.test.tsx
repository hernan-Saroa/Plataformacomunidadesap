import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { runCarpetaReviewInterfaceCases } from '../../../../../packages/shared-hooks/src/carpetaReviewInterfaceCases';
vi.mock('../../services/api/supabase.service', () => {
  const docs = { getDocumentosByCarpeta: vi.fn(), getCarpetaByPersona: vi.fn(), getChecklistForPersona: vi.fn(),
    getTiposDocumentos: vi.fn(), validarDocumento: vi.fn(), rechazarDocumento: vi.fn(), delete: vi.fn(), getDownloadUrl: vi.fn(), reclassify: vi.fn() };
  return { documentosService: docs, supabaseService: { documentos: docs }, tiposDocumentosService: { create: vi.fn() } };
});
vi.mock('../shared/CarpetaDigitalSharedView', async () => ({ CarpetaDigitalSharedView: (await import('../../../../../packages/shared-hooks/src/carpetaReviewInterfaceCases')).ReviewPanelFixture }));
vi.mock('sonner', () => ({ toast: { loading: vi.fn(), success: vi.fn(), error: vi.fn(), dismiss: vi.fn() } }));
import { supabaseService } from '../../services/api/supabase.service';
import { DigitalFolderSection } from './DigitalFolderSection';
runCarpetaReviewInterfaceCases({ afterEach, beforeEach, describe, expect, it, vi, render, screen, fireEvent, waitFor, cleanup, Component: DigitalFolderSection, docs: supabaseService.documentos });
