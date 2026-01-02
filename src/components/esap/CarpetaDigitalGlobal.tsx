import React from "react";
import { FileText, Download, MapPin, ShieldCheck } from "lucide-react";

interface CarpetaDigitalGlobalProps {
  usuarios: Array<{
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    location?: string;
    status?: string;
    roles?: Array<{ name: string }>;
  }>;
}

export const CarpetaDigitalGlobal: React.FC<CarpetaDigitalGlobalProps> = ({
  usuarios,
}) => {
  const topUsuarios = usuarios.slice(0, 6);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[--esap-primary]" />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Carpeta Digital Global
            </p>
            <p className="text-xs text-gray-600">
              Documentos y trazabilidad de {usuarios.length} usuarios
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[--esap-primary] rounded-lg hover:bg-blue-800 transition-colors">
          <Download className="w-4 h-4" />
          Exportar reporte
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {topUsuarios.length === 0 && (
          <div className="col-span-full text-center text-sm text-gray-600 py-6 border border-dashed border-gray-200 rounded-lg">
            No hay usuarios para mostrar.
          </div>
        )}

        {topUsuarios.map((user, index) => (
          <div
            key={user.id || index}
            className="border border-gray-200 rounded-lg p-3 bg-gray-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {user.firstName || "Usuario"} {user.lastName || ""}
                </p>
                <p className="text-xs text-gray-600">{user.email || "correo@esap.edu.co"}</p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  user.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {user.status === "active" ? "Activo" : "Pendiente"}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{user.location || "Sin ubicación"}</span>
            </div>

            {user.roles && user.roles.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <ShieldCheck className="w-4 h-4" />
                <span>{user.roles.map((r) => r.name).join(", ")}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
