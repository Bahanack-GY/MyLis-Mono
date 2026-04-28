export interface CarwashStation {
    id: number;
    nom: string;
    adresse: string | null;
    town: string | null;
    contact: string | null;
    status: string;
    employeeCount: number;
    managerName: string | null;
    syncedAt: string;
}

export interface CarwashEmployee {
    id: number;
    nom: string;
    prenom: string;
    email: string | null;
    telephone: string | null;
    role: string;
    actif: boolean;
    bonusParLavage: number | null;
    globalAccess: boolean;
    stationId: number | null;
    stationName: string | null;
    profilePicture: string | null;
    syncedAt: string;
}

export interface CarwashDailyStat {
    id: number;
    stationId: number;
    stationName: string | null;
    date: string;
    revenue: number;
    expenses: number;
    vehicles: number;
    syncedAt: string;
}

export interface CarwashOverview {
    totalRevenue: number;
    totalExpenses: number;
    totalVehicles: number;
    stationsCount: number;
    employeesCount: number;
}

export interface CarwashSyncStatus {
    lastSync: {
        syncedAt: string;
        status: string;
        stationsCount: number;
        employeesCount: number;
        daysCount: number;
        error: string | null;
    } | null;
    syncing: boolean;
}
