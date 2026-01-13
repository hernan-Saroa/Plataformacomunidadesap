import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../ui/dialog';
import { Button } from '../../../../ui/button';
import { Input } from '../../../../ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { Send, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '../../../../ui/avatar';
import { buildApiUrl } from '../../../../../config/environment';

interface ModalComentariosProps {
    open: boolean;
    onClose: () => void;
    plan: any;
    onSuccess: () => void;
}

const API_URL = buildApiUrl('legal', '/planes-mejoramiento');

export function ModalComentarios({ open, onClose, plan, onSuccess }: ModalComentariosProps) {
    const [mensaje, setMensaje] = useState('');
    const [sending, setSending] = useState(false);

    /* 
       Ideally we'd fetch comments separately or rely on 'plan.comentarios' passed via prop.
       If plan.comentarios is stale (only updated on full refresh), we might want to fetch here.
       For simplicity, we assume plan object is relatively fresh or we rely on parent refresh.
    */

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [plan?.comentarios]); // Auto scroll on new comments

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mensaje.trim()) return;

        setSending(true);
        try {
            await axios.post(`${API_URL}/${plan.id}/comentarios`, {
                mensaje: mensaje
            });
            setMensaje('');
            onSuccess(); // Parent refresh to get new comment
        } catch (error) {
            console.error('Error sending comment', error);
            toast.error('Error al enviar comentario');
        } finally {
            setSending(false);
        }
    };

    if (!plan) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px] h-[500px] flex flex-col p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Comentarios del Plan</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={scrollRef}>
                    {plan.comentarios && plan.comentarios.length > 0 ? (
                        plan.comentarios.map((c: any) => (
                            <div key={c.id} className="flex gap-2 items-start">
                                <Avatar className="w-6 h-6 mt-1">
                                    <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">U</AvatarFallback>
                                </Avatar>
                                <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm border border-gray-100 max-w-[85%]">
                                    <p className="text-xs text-gray-800">{c.mensaje}</p>
                                    <p className="text-[10px] text-gray-400 mt-1 text-right">
                                        {new Date(c.createdAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-gray-400 text-sm">
                            No hay comentarios aún.
                        </div>
                    )}
                </div>

                <div className="p-3 border-t bg-white">
                    <form onSubmit={handleSend} className="flex gap-2">
                        <Input
                            placeholder="Escribe un comentario..."
                            className="flex-1"
                            value={mensaje}
                            onChange={e => setMensaje(e.target.value)}
                        />
                        <Button type="submit" size="icon" disabled={sending || !mensaje.trim()} className="h-10 w-10 shrink-0 bg-[#003DA5]">
                            <Send className="w-4 h-4 text-white" />
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}

