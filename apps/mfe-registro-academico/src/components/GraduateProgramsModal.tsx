import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@esap-mfe/shared-ui/dialog";
import { Input } from "@esap-mfe/shared-ui/input";
import graduadosService, {
  GraduateProgramCatalogItem,
} from "../../services/api/graduados.service";
import "./GraduateProgramsModal.css";

type GraduateProgramsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: GraduateProgramCatalogItem[];
  onProgramsChange: (programs: GraduateProgramCatalogItem[]) => void;
};

const GRADUATE_PROGRAM_CATALOG_CHANGE_EVENT =
  "esap:graduate-program-catalog-changed";

const notifyProgramCatalogChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(GRADUATE_PROGRAM_CATALOG_CHANGE_EVENT),
    );
  }
};

const normalizeProgramKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const sortPrograms = (programs: GraduateProgramCatalogItem[]) =>
  [...programs].sort((first, second) =>
    first.name.localeCompare(second.name, "es", { sensitivity: "base" }),
  );

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const getMinimumLengthMessage = (length: number) => {
  const missing = Math.max(3 - length, 0);
  return `El nombre debe tener mínimo 3 caracteres. Falta${missing === 1 ? "" : "n"} ${missing} carácter${missing === 1 ? "" : "es"}.`;
};

export function GraduateProgramsModal({
  open,
  onOpenChange,
  programs,
  onProgramsChange,
}: GraduateProgramsModalProps) {
  const [newProgramName, setNewProgramName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [programToDelete, setProgramToDelete] =
    useState<GraduateProgramCatalogItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [programBeingEdited, setProgramBeingEdited] =
    useState<GraduateProgramCatalogItem | null>(null);
  const [editProgramName, setEditProgramName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const confirmDeleteButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!programToDelete) return;
    const focusTimer = window.setTimeout(() => {
      confirmDeleteButtonRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [programToDelete]);

  const normalizedDraftName = normalizeProgramKey(newProgramName);
  const newProgramDisplayName = newProgramName.trim().replace(/\s+/g, " ");
  const isCreateNameTooShort =
    newProgramDisplayName.length > 0 && newProgramDisplayName.length < 3;
  const duplicateProgram = useMemo(
    () =>
      normalizedDraftName
        ? programs.find(
            (program) =>
              normalizeProgramKey(program.name) === normalizedDraftName,
          )
        : undefined,
    [normalizedDraftName, programs],
  );
  const canCreate =
    newProgramDisplayName.length >= 3 &&
    Boolean(normalizedDraftName) &&
    !duplicateProgram &&
    !isCreating;
  const normalizedEditName = normalizeProgramKey(editProgramName);
  const duplicateEditedProgram = useMemo(
    () =>
      normalizedEditName
        ? programs.find(
            (program) =>
              program.id !== programBeingEdited?.id &&
              normalizeProgramKey(program.name) === normalizedEditName,
          )
        : undefined,
    [normalizedEditName, programBeingEdited?.id, programs],
  );
  const normalizedEditDisplayName = editProgramName.trim().replace(/\s+/g, " ");
  const isEditNameTooShort = normalizedEditDisplayName.length < 3;
  const canSaveEdit =
    Boolean(programBeingEdited) &&
    normalizedEditDisplayName.length >= 3 &&
    Boolean(normalizedEditName) &&
    !duplicateEditedProgram &&
    normalizedEditDisplayName !== programBeingEdited?.name &&
    !isSavingEdit;
  const programsInUse = programs.filter(
    (program) => program.usageCount > 0,
  ).length;
  const programsAvailable = programs.length - programsInUse;

  const filteredPrograms = useMemo(() => {
    const query = normalizeProgramKey(searchQuery);
    if (!query) return sortPrograms(programs);
    return sortPrograms(
      programs.filter((program) =>
        normalizeProgramKey(program.name).includes(query),
      ),
    );
  }, [programs, searchQuery]);

  const handleModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (isCreating || isDeleting || isSavingEdit)) return;
    if (!nextOpen) {
      setNewProgramName("");
      setSearchQuery("");
      setProgramToDelete(null);
      setProgramBeingEdited(null);
      setEditProgramName("");
    }
    onOpenChange(nextOpen);
  };

  const beginEditing = (program: GraduateProgramCatalogItem) => {
    setProgramBeingEdited(program);
    setEditProgramName(program.name);
  };

  const cancelEditing = () => {
    if (isSavingEdit) return;
    setProgramBeingEdited(null);
    setEditProgramName("");
  };

  const handleEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!programBeingEdited || !canSaveEdit) return;

    setIsSavingEdit(true);
    try {
      const updated = await graduadosService.programas.editar(
        programBeingEdited.id,
        normalizedEditDisplayName,
      );
      onProgramsChange(
        sortPrograms(
          programs.map((program) =>
            program.id === updated.id ? updated : program,
          ),
        ),
      );
      notifyProgramCatalogChanged();
      setProgramBeingEdited(null);
      setEditProgramName("");
      toast.success("Programa actualizado", {
        description: `${updated.name} ya está actualizado en los formularios y la carga masiva.`,
      });
    } catch (error: any) {
      toast.error("No se pudo actualizar el programa", {
        description: getErrorMessage(error, "Intente nuevamente."),
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const displayName = newProgramName.trim().replace(/\s+/g, " ");
    const normalizedName = normalizeProgramKey(displayName);

    if (displayName.length < 3) {
      toast.error("El nombre debe tener al menos 3 caracteres");
      return;
    }
    if (displayName.length > 255) {
      toast.error("El nombre no puede superar 255 caracteres");
      return;
    }
    if (!normalizedName) {
      toast.error("Ingrese un nombre de programa válido");
      return;
    }

    const duplicate = programs.find(
      (program) => normalizeProgramKey(program.name) === normalizedName,
    );
    if (duplicate) {
      toast.error("El programa ya existe", {
        description: duplicate.name,
      });
      return;
    }

    setIsCreating(true);
    try {
      const created = await graduadosService.programas.crear(displayName);
      onProgramsChange(sortPrograms([...programs, created]));
      notifyProgramCatalogChanged();
      setNewProgramName("");
      toast.success("Programa creado", {
        description: `${created.name} ya está disponible en los formularios y la carga masiva.`,
      });
    } catch (error: any) {
      toast.error("No se pudo crear el programa", {
        description: getErrorMessage(error, "Intente nuevamente."),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!programToDelete || !programToDelete.canDelete) return;

    setIsDeleting(true);
    try {
      await graduadosService.programas.eliminar(programToDelete.id);
      onProgramsChange(
        programs.filter((program) => program.id !== programToDelete.id),
      );
      notifyProgramCatalogChanged();
      toast.success("Programa eliminado", {
        description: programToDelete.name,
      });
      setProgramToDelete(null);
    } catch (error: any) {
      toast.error("No se pudo eliminar el programa", {
        description: getErrorMessage(error, "Intente nuevamente."),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleModalOpenChange}>
      <DialogContent
        className="graduate-programs-modal"
        onEscapeKeyDown={(event) => {
          if (isCreating || isDeleting || isSavingEdit) {
            event.preventDefault();
            return;
          }
          if (programToDelete) {
            event.preventDefault();
            setProgramToDelete(null);
          }
        }}
      >
        <DialogHeader className="graduate-programs-modal__header">
          <DialogTitle className="graduate-programs-modal__title">
            <span className="graduate-programs-modal__title-icon">
              <BookOpen aria-hidden="true" />
            </span>
            <span>
              Administrar programas
              <small>Catálogo manual de programas</small>
            </span>
          </DialogTitle>
          <DialogDescription className="graduate-programs-modal__description">
            Aquí solo se muestran los programas creados desde este módulo. Al
            guardarlos estarán disponibles en filtros, edición, revisión y
            carga masiva.
          </DialogDescription>
        </DialogHeader>

        <div className="graduate-programs-modal__body">
          <form
            onSubmit={handleCreate}
            className="graduate-programs-modal__create-card"
          >
            <label
              htmlFor="new-graduate-program"
              className="graduate-programs-modal__label"
            >
              Nuevo programa
            </label>
            <div className="graduate-programs-modal__create-row">
              <Input
                id="new-graduate-program"
                value={newProgramName}
                onChange={(event) =>
                  setNewProgramName(event.target.value.slice(0, 255))
                }
                placeholder="Ej. MAESTRÍA EN GESTIÓN PÚBLICA"
                minLength={3}
                maxLength={255}
                autoComplete="off"
                aria-invalid={
                  Boolean(duplicateProgram) || isCreateNameTooShort
                }
                aria-describedby="graduate-program-name-help"
                className="graduate-programs-modal__input"
              />
              <button
                type="submit"
                disabled={!canCreate}
                className="graduate-programs-modal__add-button"
              >
                {isCreating ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Plus aria-hidden="true" />
                )}
                {isCreating ? "Agregando..." : "Agregar programa"}
              </button>
            </div>
            <div
              id="graduate-program-name-help"
              className="graduate-programs-modal__field-help"
            >
              <p
                className={
                  duplicateProgram || isCreateNameTooShort
                    ? "is-error"
                    : undefined
                }
              >
                {duplicateProgram
                  ? `Este programa ya existe como “${duplicateProgram.name}”.`
                  : isCreateNameTooShort
                    ? getMinimumLengthMessage(newProgramDisplayName.length)
                    : "Mínimo 3 y máximo 255 caracteres. No se permiten nombres repetidos aunque cambien tildes, mayúsculas o espacios."}
              </p>
              <span>{newProgramName.length}/255</span>
            </div>
          </form>

          <div className="graduate-programs-modal__toolbar">
            <div className="graduate-programs-modal__summary">
              <p>Programas creados desde este módulo</p>
              <div aria-label="Resumen del catálogo">
                <span>
                  <strong>{programs.length}</strong> total
                </span>
                <span>
                  <strong>{programsInUse}</strong> en uso
                </span>
                <span>
                  <strong>{programsAvailable}</strong> eliminables
                </span>
              </div>
            </div>
            <div className="graduate-programs-modal__search">
              <Search aria-hidden="true" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar programa..."
                aria-label="Buscar un programa"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Limpiar búsqueda"
                  className="graduate-programs-modal__clear-search"
                >
                  <X aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="graduate-programs-modal__list">
            {filteredPrograms.length ? (
              <div>
                {filteredPrograms.map((program) => (
                  <div
                    key={program.id}
                    className={`graduate-programs-modal__program-row${programBeingEdited?.id === program.id ? " is-editing" : ""}`}
                  >
                    <span className="graduate-programs-modal__program-icon">
                      <GraduationCap aria-hidden="true" />
                    </span>
                    {programBeingEdited?.id === program.id ? (
                      <form
                        onSubmit={handleEdit}
                        className="graduate-programs-modal__edit-form"
                      >
                        <div className="graduate-programs-modal__edit-field">
                          <Input
                            value={editProgramName}
                            onChange={(event) =>
                              setEditProgramName(
                                event.target.value.slice(0, 255),
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.preventDefault();
                                event.stopPropagation();
                                cancelEditing();
                              }
                            }}
                            minLength={3}
                            maxLength={255}
                            autoFocus
                            aria-label={`Editar ${program.name}`}
                            aria-invalid={
                              Boolean(duplicateEditedProgram) ||
                              isEditNameTooShort
                            }
                            className="graduate-programs-modal__edit-input"
                          />
                          <div className="graduate-programs-modal__edit-help">
                            <span
                              className={
                                duplicateEditedProgram || isEditNameTooShort
                                  ? "is-error"
                                  : undefined
                              }
                            >
                              {duplicateEditedProgram
                                ? `Ya existe como “${duplicateEditedProgram.name}”.`
                                : isEditNameTooShort
                                  ? getMinimumLengthMessage(
                                      normalizedEditDisplayName.length,
                                    )
                                  : "Mínimo 3 y máximo 255 caracteres. Edite el nombre y guarde los cambios."}
                            </span>
                            <span>{editProgramName.length}/255</span>
                          </div>
                        </div>
                        <div className="graduate-programs-modal__edit-actions">
                          <button
                            type="button"
                            onClick={cancelEditing}
                            disabled={isSavingEdit}
                            className="graduate-programs-modal__cancel-edit-button"
                          >
                            <X aria-hidden="true" />
                            <span>Cancelar</span>
                          </button>
                          <button
                            type="submit"
                            disabled={!canSaveEdit}
                            className="graduate-programs-modal__save-edit-button"
                          >
                            {isSavingEdit ? (
                              <Loader2
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Check aria-hidden="true" />
                            )}
                            <span>
                              {isSavingEdit ? "Guardando..." : "Guardar"}
                            </span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="graduate-programs-modal__program-info">
                          <p>{program.name}</p>
                          <small>
                            {program.usageCount > 0
                              ? `Asignado a ${program.usageCount} graduado${program.usageCount === 1 ? "" : "s"}`
                              : "Disponible para asignar"}
                          </small>
                        </div>
                        <div className="graduate-programs-modal__program-actions">
                          {program.usageCount > 0 && (
                            <span className="graduate-programs-modal__usage-badge">
                              <ShieldCheck aria-hidden="true" />
                              En uso
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => beginEditing(program)}
                            disabled={isSavingEdit}
                            className="graduate-programs-modal__edit-button"
                            aria-label={`Editar ${program.name}`}
                          >
                            <Pencil aria-hidden="true" />
                            <span>Editar</span>
                          </button>
                          {program.canDelete && (
                            <button
                              type="button"
                              onClick={() => setProgramToDelete(program)}
                              className="graduate-programs-modal__delete-button"
                              aria-label={`Eliminar ${program.name}`}
                            >
                              <Trash2 aria-hidden="true" />
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="graduate-programs-modal__empty-state">
                <span>
                  {searchQuery ? (
                    <Search aria-hidden="true" />
                  ) : (
                    <BookOpen aria-hidden="true" />
                  )}
                </span>
                <strong>
                  {searchQuery
                    ? "No encontramos coincidencias"
                    : "Aún no hay programas"}
                </strong>
                <p>
                  {searchQuery
                    ? "Pruebe con otro nombre o limpie la búsqueda."
                    : "Agregue el primer programa académico al catálogo."}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="graduate-programs-modal__footer">
          <button
            type="button"
            onClick={() => handleModalOpenChange(false)}
            className="graduate-programs-modal__close-button"
          >
            Cerrar
          </button>
        </DialogFooter>

        {programToDelete && (
          <div
            className="graduate-programs-modal__confirm-layer"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="graduate-program-delete-title"
            aria-describedby="graduate-program-delete-description"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isDeleting) {
                setProgramToDelete(null);
              }
            }}
          >
            <div className="graduate-programs-delete-dialog">
              <div
                id="graduate-program-delete-title"
                className="graduate-programs-delete-dialog__title"
              >
                <span>
                  <AlertTriangle aria-hidden="true" />
                </span>
                <span>Eliminar programa</span>
              </div>
              <div
                id="graduate-program-delete-description"
                className="graduate-programs-delete-dialog__description"
              >
                <strong>{programToDelete.name}</strong>
                <span>
                  Se eliminará del filtro, los formularios, la revisión de
                  solicitudes y la plantilla de carga masiva. Esta acción no
                  se puede deshacer.
                </span>
              </div>
              <div className="graduate-programs-delete-dialog__footer">
                <button
                  type="button"
                  onClick={() => setProgramToDelete(null)}
                  disabled={isDeleting}
                  className="graduate-programs-delete-dialog__cancel"
                >
                  Cancelar
                </button>
                <button
                  ref={confirmDeleteButtonRef}
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={isDeleting}
                  className="graduate-programs-delete-dialog__confirm"
                >
                  {isDeleting && (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  )}
                  {isDeleting ? "Eliminando..." : "Eliminar programa"}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
