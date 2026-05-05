/**
 * ModalSIGLPremium - Modal Premium del Design System ESAP
 * ✅ Header con icono, badges y gradiente
 * ✅ Footer fijo con acciones
 * ✅ Contenido con scroll
 * ✅ Diseño corporativo ESAP 2025
 */

import React from 'react';
import { X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';

interface BadgeConfig {
    label: string;
    bg?: string;
    color?: string;
    className?: string;
}

interface ModalSIGLPremiumProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    height?: 'auto' | 'full';
    headerColor?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
    badges?: BadgeConfig[];
    footerInfo?: React.ReactNode;
    footerActions?: React.ReactNode;
    ariaDescription?: string;
    children: React.ReactNode;
}

const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
    full: 'max-w-6xl',
};

const headerColors = {
    blue: 'from-[#003DA5] to-[#0052CC]',
    green: 'from-green-600 to-green-700',
    purple: 'from-purple-600 to-purple-700',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-600 to-red-700',
    gray: 'from-gray-700 to-gray-800',
};

export function ModalSIGLPremium({
    isOpen,
    onClose,
    title,
    subtitle,
    icon,
    size = 'lg',
    height = 'auto',
    headerColor = 'blue',
    badges,
    footerInfo,
    footerActions,
    ariaDescription,
    children,
}: ModalSIGLPremiumProps) {
    const heightClass = height === 'full' ? 'h-[90vh]' : 'max-h-[90vh]';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className={`${sizeClasses[size]} ${heightClass} flex flex-col p-0 overflow-hidden`}
            >
                {/* Títulos ocultos para accesibilidad */}
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <DialogDescription className="sr-only">
                    {ariaDescription || subtitle || title}
                </DialogDescription>

                {/* Header Premium con gradiente */}
                <div className={`flex-shrink-0 bg-gradient-to-r ${headerColors[headerColor]} px-6 py-4`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {icon && (
                                <div className="p-2 bg-white/10 rounded-lg border border-white/20">
                                    {icon}
                                </div>
                            )}
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">
                                    {title}
                                </h2>
                                {subtitle && (
                                    <p className="text-sm text-white/80 font-medium mt-0.5">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {badges?.map((badge, index) => (
                                <Badge
                                    key={index}
                                    style={{
                                        backgroundColor: badge.bg || 'rgba(255, 255, 255, 0.2)',
                                        color: badge.color || '#FFFFFF'
                                    }}
                                    className={badge.className}
                                >
                                    {badge.label}
                                </Badge>
                            ))}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
                                aria-label="Cerrar modal"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contenido con scroll */}
                <div className="flex-1 overflow-y-auto bg-gray-50">
                    {children}
                </div>

                {/* Footer fijo */}
                {(footerInfo || footerActions) && (
                    <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
                        <div>{footerInfo}</div>
                        <div className="flex gap-3">{footerActions}</div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
