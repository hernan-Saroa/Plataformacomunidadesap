import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicTitleVerification } from "./PublicTitleVerification";
import graduadosService from "../../services/api/graduados.service";
import { toast } from "sonner";

vi.mock("../../services/api/graduados.service", () => ({
  default: {
    programas: { listarOpciones: vi.fn() },
    autoservicio: {
      buscarCoincidencias: vi.fn(),
      solicitarCertificado: vi.fn(),
      solicitarRevisionConSoporte: vi.fn(),
    },
  },
}));
vi.mock("./VerificationCertificateDisplay", () => ({
  VerificationCertificateDisplay: () => null,
}));
vi.mock("./PublicNavbar", () => ({ PublicNavbar: () => null }));
vi.mock("../assets/ESAPLogo", () => ({ ESAPLogo: () => null }));
vi.mock("../../config/environment", () => ({
  getPublicBaseUrl: () => "https://example.test",
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const api = graduadosService.autoservicio;
const matches = {
  hasMatches: true,
  totalMatches: 1,
  suggestions: [
    {
      graduateId: "graduate-1",
      fullName: "Persona Graduada",
      idNumber: "1234567",
      programName: "Administración Pública",
      degreeTitle: "Administrador Público",
      graduationDate: "2020-01-01",
    },
  ],
};

function enterForm() {
  render(<PublicTitleVerification onBack={() => {}} />);
  fireEvent.change(screen.getByLabelText(/^Nombre/), {
    target: { value: "Persona Graduada" },
  });
  fireEvent.change(screen.getByLabelText(/Número de Documento/), {
    target: { value: "1234567" },
  });
  fireEvent.change(screen.getByLabelText(/Correo en el que/), {
    target: { value: "persona@example.test" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
}

const submit = () => screen.getByRole("button", { name: "Enviar Solicitud" });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(graduadosService.programas.listarOpciones).mockResolvedValue([
    "Administración Pública",
  ]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PublicTitleVerification search error feedback", () => {
  it.each([500, 503, undefined])(
    "shows a persistent message and preserves input on failure %s",
    async (status) => {
      vi.mocked(api.buscarCoincidencias).mockRejectedValue(
        Object.assign(new Error("Internal server error"), { status }),
      );
      enterForm();
      fireEvent.click(submit());

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("No se pudo completar la búsqueda");
      expect(alert).toHaveTextContent("Los datos del formulario se conservan");
      expect(alert).not.toHaveTextContent("Internal server error");
      expect(screen.getByLabelText(/^Nombre/)).toHaveValue("Persona Graduada");
      expect(screen.getByLabelText(/Número de Documento/)).toHaveValue(
        "1234567",
      );
      expect(screen.getByLabelText(/Correo en el que/)).toHaveValue(
        "persona@example.test",
      );
      expect(screen.getByRole("checkbox")).toBeChecked();
      expect(submit()).toBeEnabled();
      expect(api.solicitarCertificado).not.toHaveBeenCalled();
      expect(api.solicitarRevisionConSoporte).not.toHaveBeenCalled();
      expect(
        screen.queryByText(
          "No se encontraron coincidencias en la base de datos",
        ),
      ).not.toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith("Error al verificar los datos", {
        description: expect.stringContaining(
          "No fue posible consultar los registros académicos",
        ),
      });
    },
  );

  it("allows retry with the same data and clears the error after finding matches", async () => {
    vi.mocked(api.buscarCoincidencias)
      .mockRejectedValueOnce(
        Object.assign(new Error("Internal server error"), { status: 500 }),
      )
      .mockResolvedValueOnce(matches as any);
    enterForm();
    fireEvent.click(submit());
    await screen.findByRole("alert");
    fireEvent.click(submit());

    expect(
      await screen.findByText("Selección obligatoria de coincidencias"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(api.buscarCoincidencias).toHaveBeenNthCalledWith(
      2,
      "1234567",
      "",
      "Persona Graduada",
    );
    expect(api.solicitarCertificado).not.toHaveBeenCalled();
  });

  it("also shows the error when searching again after a successful search", async () => {
    vi.mocked(api.buscarCoincidencias)
      .mockResolvedValueOnce(matches as any)
      .mockRejectedValueOnce(
        Object.assign(new Error("Internal server error"), { status: 500 }),
      );
    enterForm();
    fireEvent.click(submit());
    fireEvent.click(
      await screen.findByRole("button", { name: "Buscar nuevamente" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No fue posible consultar los registros académicos",
    );
    expect(api.solicitarCertificado).not.toHaveBeenCalled();
    expect(api.solicitarRevisionConSoporte).not.toHaveBeenCalled();
  });

  it("generates the certificate after retry only when the user selects and confirms the graduate", async () => {
    vi.mocked(api.buscarCoincidencias)
      .mockRejectedValueOnce(
        Object.assign(new Error("Internal server error"), { status: 500 }),
      )
      .mockResolvedValueOnce(matches as any);
    vi.mocked(api.solicitarCertificado).mockResolvedValueOnce({
      existe: true,
      certificado: {
        id: "certificate-1",
        certificateNumber: "CERT-1",
        verificationCode: "verification-1",
        status: "ACTIVE",
        idNumber: "1234567",
        fullName: "Persona Graduada",
        programName: "Administración Pública",
        degreeTitle: "Administrador Público",
        graduationDate: "2020-01-01",
        issueDate: "2026-01-01",
      },
    } as any);
    enterForm();
    fireEvent.click(submit());
    await screen.findByRole("alert");
    fireEvent.click(submit());

    const confirm = await screen.findByRole("button", {
      name: "Confirmar selección",
    });
    expect(confirm).toBeDisabled();
    expect(api.solicitarCertificado).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: /1\. Persona Graduada/ }),
    );
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Certificado generado exitosamente",
      ),
    );
    expect(api.solicitarCertificado).toHaveBeenCalledTimes(1);
    expect(api.solicitarCertificado).toHaveBeenCalledWith(
      expect.objectContaining({
        idNumber: "1234567",
        lastName: "Persona Graduada",
        selectedGraduateId: "graduate-1",
        requesterType: "GRADUATE",
        requesterEmail: "persona@example.test",
      }),
    );
    expect(api.solicitarRevisionConSoporte).not.toHaveBeenCalled();
  });

  it("allows canceling a failed search and clears the message with the form", async () => {
    vi.mocked(api.buscarCoincidencias).mockRejectedValue(
      Object.assign(new Error("Internal server error"), { status: 500 }),
    );
    enterForm();
    fireEvent.click(submit());
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue("");
    expect(screen.getByLabelText(/Número de Documento/)).toHaveValue("");
    expect(screen.getByLabelText(/Correo en el que/)).toHaveValue("");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(api.solicitarCertificado).not.toHaveBeenCalled();
  });

  it("keeps the certificate unavailable message for a future graduation date", async () => {
    vi.mocked(api.buscarCoincidencias).mockRejectedValue(
      Object.assign(
        new Error(
          "El certificado de grado aún no se encuentra disponible para expedición.",
        ),
        { status: 422 },
      ),
    );
    enterForm();
    fireEvent.click(submit());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El certificado de grado aún no se encuentra disponible",
    );
    expect(toast.info).toHaveBeenCalledWith(
      "Certificado no disponible",
      expect.any(Object),
    );
  });

  it("clears the failed search message when the document changes", async () => {
    vi.mocked(api.buscarCoincidencias).mockRejectedValue(
      Object.assign(new Error("Internal server error"), { status: 500 }),
    );
    enterForm();
    fireEvent.click(submit());
    await screen.findByRole("alert");
    fireEvent.change(screen.getByLabelText(/Número de Documento/), {
      target: { value: "7654321" },
    });
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });
});
