export class DashboardStatsDto {
    global: {
        total: number;
        urgentes: number;
        vencidos: number;
        terminoPromedio: number;
    };
    modules: {
        defensa: { total: number; urgentes: number; vencidos: number };
        juzgamiento: { total: number; criticos: number; vencidos: number }; // Juzgamiento uses 'criticos'
        asesoria: { total: number; urgentes: number; vencidos: number };
        buzon: { total: number; sinRevisar: number; vencidos: number }; // Buzon uses 'sinRevisar'
        terminos: { total: number; urgentes: number; vencidos: number };
    };
    topUrgentes: {
        id: string; // Title or ID
        modulo: string; // 'Defensa', 'Juzgamiento', etc.
        moduleId: string; // For navigation
        dias: number; // Signed int: negative = expired
        color: string;
        isExpired: boolean;
    }[];
}
