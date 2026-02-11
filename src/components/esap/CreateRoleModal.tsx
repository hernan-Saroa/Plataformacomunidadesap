import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useState } from 'react';

interface CreateRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRole: (name: string, description: string, type: string) => void;
}

export function CreateRoleModal({ open, onOpenChange, onCreateRole }: CreateRoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('custom');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRole(name, description, type);
    setName('');
    setDescription('');
    setType('custom');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Rol</DialogTitle>
          <DialogDescription>
            Define un rol personalizado para tu organización
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="role-name">
              Nombre del Rol <span className="text-red-500">*</span>
            </Label>
            <Input
              id="role-name"
              placeholder="Ej: Coordinador de Sede Regional"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="role-description"
              placeholder="Describe las responsabilidades y alcance de este rol..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-type">Tipo de Rol</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="role-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Rol Personalizado</SelectItem>
                <SelectItem value="clone">Clonar desde Rol Existente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear y Configurar Permisos</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
