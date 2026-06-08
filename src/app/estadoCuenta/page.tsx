'use client';

import { useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
    Search,
    Calendar,
    DollarSign,
    CheckCircle2,
    AlertCircle,
    Clock,
    ArrowRight,
    ChevronRight,
    FileText,
    DollarSign as MoneyIcon,
    Layers,
    SlidersHorizontal,
    Mail,
    Lock,
    Loader2,
    Eye,
    EyeOff,
    Code,
    Sparkles,
    Laptop,
    Smartphone,
    Copy,
    Check,
    Plus,
    Percent,
    Coins,
    TrendingDown,
    User as UserIcon,
    HelpCircle,
    BookOpen
} from 'lucide-react';

// ==========================================
// 1. TYPES MATCHING TYPEORM ENTITIES PROVIDED
// ==========================================

export interface Client {
    id: number;
    document_type: string;
    document_number: string;
    business_name: string;
    trade_name: string | null;
    address: string | null;
    district: string | null;
    province: string | null;
    department: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
    seller_id: number | null;
    last_order_at: string | null;
    created_at: string;
}

export interface EstadoCuenta {
    id: number;
    cliente_id: number;
    cliente_business_name: string; // denormalization for ease
    vendedor_id: number;
    vendedor_name: string;
    monto_inicial: number;
    monto_pago: number;
    monto_saldo: number;
    fecha_registro: string;
    id_guia_interna: number;
    guia_interna_code: string;
    estado: 'PENDIENTE' | 'PAGADO';
}

export interface Cuota {
    id: number;
    estado_cuenta_id: number;
    numero_cuota: number;
    monto: number;
    monto_pagado: number;
    saldo: number;
    fecha_vencimiento: string;
    estado: 'PENDIENTE' | 'PAGADO' | 'VENCIDO';
    numero_operacion?: string;
    fecha_pago?: string;
    observacion?: string;
}

export interface Abono {
    id: number;
    cliente_id: number;
    monto_abono: number;
    fecha_abono: string;
    tipo_abono: string; // efectivo | deposito | letra
    moneda_abono: string; // PEN | USD
    id_estado_cuenta: number;
}


// ==========================================
// 2. MOCK DATASETS MATCHING THE SYSTEM
// ==========================================

const INITIAL_CLIENTS: Client[] = [
    {
        id: 1,
        document_type: 'RUC',
        document_number: '20608934211',
        business_name: 'VERCO DISTRIBUIDORA NORTE S.A.C.',
        trade_name: 'Verco Norte Logística',
        address: 'Av. Túpac Amaru 1240, Sector San Fernando',
        district: 'Trujillo',
        province: 'Trujillo',
        department: 'La Libertad',
        country: 'Perú',
        phone: '+51 987 654 321',
        email: 'contacto@verconorte.com.pe',
        seller_id: 101,
        last_order_at: '2026-06-02T14:22:00Z',
        created_at: '2025-01-15T08:00:00Z'
    },
    {
        id: 2,
        document_type: 'RUC',
        document_number: '20456123499',
        business_name: 'CALZADO ARTESANAL EL IMPERIO S.R.L.',
        trade_name: 'Almacén El Imperio',
        address: 'Jr. Gamarra 450, Piso 3',
        district: 'La Victoria',
        province: 'Lima',
        department: 'Lima',
        country: 'Perú',
        phone: '+51 944 112 233',
        email: 'calzado.imperio@outlook.com',
        seller_id: 102,
        last_order_at: '2026-05-28T10:15:00Z',
        created_at: '2025-03-10T09:30:00Z'
    },
    {
        id: 3,
        document_type: 'RUC',
        document_number: '20334812304',
        business_name: 'CORPORACIÓN LOGÍSTICA PACÍFICO SUR S.A.',
        trade_name: 'Pacífico Sur Courier',
        address: 'Av. Elmer Faucett 3445, Callao industrial',
        district: 'Callao',
        province: 'Callao',
        department: 'Callao',
        country: 'Perú',
        phone: '+51 955 888 777',
        email: 'adquisiciones@logpacificosur.pe',
        seller_id: 101,
        last_order_at: '2026-06-05T18:40:00Z',
        created_at: '2025-02-20T11:00:00Z'
    },
    {
        id: 4,
        document_type: 'DNI',
        document_number: '45601122',
        business_name: 'JOSÉ LUIS NIEVA VILLOGAS',
        trade_name: 'Calzado & Moda Nieva',
        address: 'Av. Larco 820, TrujilloCentro',
        district: 'Trujillo',
        province: 'Trujillo',
        department: 'La Libertad',
        country: 'Perú',
        phone: '+51 910 828 312',
        email: 'joseluisnievavillogas@gmail.com',
        seller_id: 102,
        last_order_at: '2026-06-07T12:00:00Z',
        created_at: '2026-01-08T08:50:00Z'
    }
];

const INITIAL_ESTADOS_CUENTA: EstadoCuenta[] = [
    {
        id: 501,
        cliente_id: 1,
        cliente_business_name: 'VERCO DISTRIBUIDORA NORTE S.A.C.',
        vendedor_id: 101,
        vendedor_name: 'Carlos Mendoza',
        monto_inicial: 15000.00,
        monto_pago: 10000.00,
        monto_saldo: 5000.00,
        fecha_registro: '2026-05-10T10:00:00Z',
        id_guia_interna: 892,
        guia_interna_code: 'GI-000892',
        estado: 'PENDIENTE'
    },
    {
        id: 502,
        cliente_id: 2,
        cliente_business_name: 'CALZADO ARTESANAL EL IMPERIO S.R.L.',
        vendedor_id: 102,
        vendedor_name: 'Andrés Del Portal',
        monto_inicial: 8500.00,
        monto_pago: 8500.00,
        monto_saldo: 0.00,
        fecha_registro: '2026-04-18T15:30:00Z',
        id_guia_interna: 754,
        guia_interna_code: 'GI-000754',
        estado: 'PAGADO'
    },
    {
        id: 503,
        cliente_id: 3,
        cliente_business_name: 'CORPORACIÓN LOGÍSTICA PACÍFICO SUR S.A.',
        vendedor_id: 101,
        vendedor_name: 'Carlos Mendoza',
        monto_inicial: 24000.00,
        monto_pago: 8000.00,
        monto_saldo: 16000.00,
        fecha_registro: '2026-05-01T11:15:00Z',
        id_guia_interna: 812,
        guia_interna_code: 'GI-000812',
        estado: 'PENDIENTE'
    },
    {
        id: 504,
        cliente_id: 4,
        cliente_business_name: 'JOSÉ LUIS NIEVA VILLOGAS',
        vendedor_id: 102,
        vendedor_name: 'Andrés Del Portal',
        monto_inicial: 6200.00,
        monto_pago: 1200.05,
        monto_saldo: 4999.95,
        fecha_registro: '2026-05-24T14:40:00Z',
        id_guia_interna: 904,
        guia_interna_code: 'GI-000904',
        estado: 'PENDIENTE'
    },
    {
        id: 505,
        cliente_id: 1,
        cliente_business_name: 'VERCO DISTRIBUIDORA NORTE S.A.C.',
        vendedor_id: 101,
        vendedor_name: 'Carlos Mendoza',
        monto_inicial: 7800.00,
        monto_pago: 7800.00,
        monto_saldo: 0.00,
        fecha_registro: '2026-03-05T09:12:00Z',
        id_guia_interna: 611,
        guia_interna_code: 'GI-000611',
        estado: 'PAGADO'
    }
];

const INITIAL_CUOTAS: Cuota[] = [
    // Cuotas for statement 501 (VERCO DISTRIBUIDORA NORTE, Remaining 5000)
    {
        id: 1,
        estado_cuenta_id: 501,
        numero_cuota: 1,
        monto: 5000.00,
        monto_pagado: 5000.00,
        saldo: 0.00,
        fecha_vencimiento: '2026-05-25',
        estado: 'PAGADO',
        numero_operacion: 'OP-882193',
        fecha_pago: '2026-05-24T18:30:00Z',
        observacion: 'Transferencia BCP - Carlos Mendoza'
    },
    {
        id: 2,
        estado_cuenta_id: 501,
        numero_cuota: 2,
        monto: 5000.00,
        monto_pagado: 5000.00,
        saldo: 0.00,
        fecha_vencimiento: '2026-06-10',
        estado: 'PAGADO',
        numero_operacion: 'OP-921884',
        fecha_pago: '2026-06-05T13:10:00Z',
        observacion: 'Depósito Interbank - Verificado Almacén'
    },
    {
        id: 3,
        estado_cuenta_id: 501,
        numero_cuota: 3,
        monto: 5000.00,
        monto_pagado: 0.00,
        saldo: 5000.00,
        fecha_vencimiento: '2026-06-25',
        estado: 'PENDIENTE'
    },

    // Cuotas for statement 502 (EL IMPERIO, Remaining 0)
    {
        id: 4,
        estado_cuenta_id: 502,
        numero_cuota: 1,
        monto: 4250.00,
        monto_pagado: 4250.00,
        saldo: 0.00,
        fecha_vencimiento: '2026-05-02',
        estado: 'PAGADO',
        numero_operacion: 'OP-448210',
        fecha_pago: '2026-04-30T10:00:00Z',
        observacion: 'Transferencia BBVA regular'
    },
    {
        id: 5,
        estado_cuenta_id: 502,
        numero_cuota: 2,
        monto: 4250.00,
        monto_pagado: 4250.00,
        saldo: 0.00,
        fecha_vencimiento: '2026-05-18',
        estado: 'PAGADO',
        numero_operacion: 'OP-556112',
        fecha_pago: '2026-05-18T16:45:00Z',
        observacion: 'Contado en oficina con recibo'
    },

    // Cuotas for statement 503 (PACIFICO SUR, Remaining 16000)
    {
        id: 6,
        estado_cuenta_id: 503,
        numero_cuota: 1,
        monto: 8000.00,
        monto_pagado: 8000.00,
        saldo: 0.00,
        fecha_vencimiento: '2026-05-15',
        estado: 'PAGADO',
        numero_operacion: 'OP-771221',
        fecha_pago: '2026-05-15T12:00:00Z',
        observacion: 'Pago bancario directo'
    },
    {
        id: 7,
        estado_cuenta_id: 503,
        numero_cuota: 2,
        monto: 8000.00,
        monto_pagado: 0.00,
        saldo: 8000.00,
        fecha_vencimiento: '2026-05-30',
        estado: 'VENCIDO' // Overdue since 2026-06-08 is current time
    },
    {
        id: 8,
        estado_cuenta_id: 503,
        numero_cuota: 3,
        monto: 8000.00,
        monto_pagado: 0.00,
        saldo: 8000.00,
        fecha_vencimiento: '2026-06-15',
        estado: 'PENDIENTE'
    },

    // Cuotas for statement 504 (JOSÉ LUIS NIEVA, Remaining 4999.95)
    {
        id: 9,
        estado_cuenta_id: 504,
        numero_cuota: 1,
        monto: 2000.00,
        monto_pagado: 1200.05,
        saldo: 799.95,
        fecha_vencimiento: '2026-06-05',
        estado: 'VENCIDO',
        numero_operacion: 'OP-30018',
        fecha_pago: '2026-06-05T09:15:00Z',
        observacion: 'Abono parcial en efectivo'
    },
    {
        id: 10,
        estado_cuenta_id: 504,
        numero_cuota: 2,
        monto: 2100.00,
        monto_pagado: 0.00,
        saldo: 2100.00,
        fecha_vencimiento: '2026-06-20',
        estado: 'PENDIENTE'
    },
    {
        id: 11,
        estado_cuenta_id: 504,
        numero_cuota: 3,
        monto: 2100.00,
        monto_pagado: 0.00,
        saldo: 2100.00,
        fecha_vencimiento: '2026-07-05',
        estado: 'PENDIENTE'
    },

    // Cuotas for statement 505 (VERCO DISTRIBUIDORA NORTE, Remaining 0)
    {
        id: 12,
        estado_cuenta_id: 505,
        numero_cuota: 1,
        monto: 7800.00,
        monto_pagado: 7800.00,
        saldo: 0.00,
        fecha_vencimiento: '2026-03-20',
        estado: 'PAGADO',
        numero_operacion: 'OP-110022',
        fecha_pago: '2026-03-19T11:45:00Z',
        observacion: 'Transferencia depósito de prueba'
    }
];

const INITIAL_ABONOS: Abono[] = [
    {
        id: 1,
        cliente_id: 1,
        monto_abono: 5000.00,
        fecha_abono: '2026-05-24T18:30:00Z',
        tipo_abono: 'deposito',
        moneda_abono: 'PEN',
        id_estado_cuenta: 501
    },
    {
        id: 2,
        cliente_id: 1,
        monto_abono: 5000.00,
        fecha_abono: '2026-06-05T13:10:00Z',
        tipo_abono: 'transferencia',
        moneda_abono: 'PEN',
        id_estado_cuenta: 501
    },
    {
        id: 3,
        cliente_id: 2,
        monto_abono: 4250.00,
        fecha_abono: '2026-04-30T10:00:00Z',
        tipo_abono: 'deposito',
        moneda_abono: 'PEN',
        id_estado_cuenta: 502
    },
    {
        id: 4,
        cliente_id: 2,
        monto_abono: 4250.00,
        fecha_abono: '2026-05-18T16:45:00Z',
        tipo_abono: 'efectivo',
        moneda_abono: 'PEN',
        id_estado_cuenta: 502
    },
    {
        id: 5,
        cliente_id: 3,
        monto_abono: 8000.00,
        fecha_abono: '2026-05-15T12:00:00Z',
        tipo_abono: 'deposito',
        moneda_abono: 'PEN',
        id_estado_cuenta: 503
    },
    {
        id: 6,
        cliente_id: 4,
        monto_abono: 1200.05,
        fecha_abono: '2026-06-05T09:15:00Z',
        tipo_abono: 'efectivo',
        moneda_abono: 'PEN',
        id_estado_cuenta: 504
    },
    {
        id: 7,
        cliente_id: 1,
        monto_abono: 7800.00,
        fecha_abono: '2026-03-19T11:45:00Z',
        tipo_abono: 'transferencia',
        moneda_abono: 'PEN',
        id_estado_cuenta: 505
    }
];


export default function App() {
    // Navigation / Module Toggles
    const [activeModule, setActiveModule] = useState<'estado-cuenta' | 'login-premium'>('estado-cuenta');
    const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'docs'>('preview');

    // Preview options setup (e.g. desktop simulator or mobile frame)
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [copied, setCopied] = useState(false);

    // Core Mutable States (to allow real-time recalculations of payments & balances)
    const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
    const [estadosCuenta, setEstadosCuenta] = useState<EstadoCuenta[]>(INITIAL_ESTADOS_CUENTA);
    const [cuotas, setCuotas] = useState<Cuota[]>(INITIAL_CUOTAS);
    const [abonos, setAbonos] = useState<Abono[]>(INITIAL_ABONOS);

    // States for query filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<number>(1); // Defaults to Verco Distribuidora Norte
    const [startDate, setStartDate] = useState('2026-01-01');
    const [endDate, setEndDate] = useState('2026-12-31');
    const [selectedStatementId, setSelectedStatementId] = useState<number | null>(501); // Defaults to First account

    // Login Module local states
    const [testEmail, setTestEmail] = useState('administrador@verco.com.pe');
    const [testPassword, setTestPassword] = useState('verco2026_secure');
    const [showPassword, setShowPassword] = useState(false);
    const [isSimulateLoading, setIsSimulateLoading] = useState(false);

    // -----------------------------------------------------
    // DATA QUERIES & FILTER COMPUTATIONS (REACT MEMOIZATION)
    // -----------------------------------------------------

    // Filter clients matching query
    const filteredClientsList = useMemo(() => {
        if (!searchQuery.trim()) {
            return clients;
        }
        const q = searchQuery.toLowerCase();
        return clients.filter(c =>
            c.business_name.toLowerCase().includes(q) ||
            (c.trade_name && c.trade_name.toLowerCase().includes(q)) ||
            c.document_number.includes(q)
        );
    }, [clients, searchQuery]);

    // Selected client object
    const selectedClientObj = useMemo(() => {
        return clients.find(c => c.id === selectedClientId) || clients[0];
    }, [clients, selectedClientId]);

    // Filtered account statements according to the client and dates of registration
    const clientAccountsFiltered = useMemo(() => {
        return estadosCuenta.filter(acc => {
            if (acc.cliente_id !== selectedClientId) return false;
            const regDate = acc.fecha_registro.substring(0, 10);
            return regDate >= startDate && regDate <= endDate;
        });
    }, [estadosCuenta, selectedClientId, startDate, endDate]);

    // Compute live aggregates of selected client
    const clientStatSummary = useMemo(() => {
        const activeStatements = estadosCuenta.filter(acc => acc.cliente_id === selectedClientId);

        let balanceTotal = 0;
        let paidTotal = 0;
        let initialTotal = 0;

        activeStatements.forEach(acc => {
            initialTotal += acc.monto_inicial;
            paidTotal += acc.monto_pago;
            balanceTotal += acc.monto_saldo;
        });

        // Count overdue installments (Cuotas)
        const statementIds = activeStatements.map(acc => acc.id);
        const associatedCuotas = cuotas.filter(cuo => statementIds.includes(cuo.estado_cuenta_id));
        const overdueCount = associatedCuotas.filter(cuo => cuo.estado === 'VENCIDO').length;

        // Earliest next due date
        const pendingCuotas = associatedCuotas.filter(cuo => cuo.estado !== 'PAGADO');
        let nextDueDate = '--/--/----';
        if (pendingCuotas.length > 0) {
            const sorted = [...pendingCuotas].sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));
            nextDueDate = sorted[0].fecha_vencimiento;
        }

        return {
            initialTotal,
            paidTotal,
            balanceTotal,
            overdueCount,
            nextDueDate
        };
    }, [estadosCuenta, cuotas, selectedClientId]);

    // Current statement being audited drilldown
    const selectedStatementObj = useMemo(() => {
        if (!selectedStatementId) return null;
        return clientAccountsFiltered.find(acc => acc.id === selectedStatementId) || clientAccountsFiltered[0] || null;
    }, [clientAccountsFiltered, selectedStatementId]);

    // Cuotas linked to the selected statement
    const activeStatementCuotas = useMemo(() => {
        if (!selectedStatementObj) return [];
        return cuotas.filter(cuo => cuo.estado_cuenta_id === selectedStatementObj.id);
    }, [cuotas, selectedStatementObj]);

    // Abonos linked to the selected statement
    const activeStatementAbonos = useMemo(() => {
        if (!selectedStatementObj) return [];
        return abonos.filter(ab => ab.id_estado_cuenta === selectedStatementObj.id);
    }, [abonos, selectedStatementObj]);


    // -----------------------------------------------------
    // LOGIC FOR REGISTERING A LIVE SIMULATED ABONO (PAYMENT)
    // -----------------------------------------------------

    const handleTriggerSimulateAbono = () => {
        if (!selectedStatementObj) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Selección',
                text: 'Por favor, selecciona una proforma/guía de estado de cuenta para aplicar el abono.',
                background: '#0c0c0e',
                color: '#f4f4f5',
                confirmButtonColor: '#4f46e5'
            });
            return;
        }

        if (selectedStatementObj.monto_saldo <= 0) {
            Swal.fire({
                icon: 'info',
                title: 'Estado de Cuenta Cancelado',
                text: 'Este comprobante ya se encuentra totalmente cancelado.',
                background: '#0c0c0e',
                color: '#f4f4f5',
                confirmButtonColor: '#4f46e5'
            });
            return;
        }

        // Gorgeous custom sweetalert prompt matching Verco Dark System
        Swal.fire({
            title: `<span class="text-white text-lg font-bold tracking-tight">REGISTRAR ABONO / PAGO</span>`,
            html: `
        <div class="space-y-4 text-left p-1 text-zinc-300 text-sm font-sans">
          <p class="text-xs text-zinc-400">Guía Interna: <strong class="text-indigo-400">${selectedStatementObj.guia_interna_code}</strong> | Saldo: <strong class="text-zinc-100">S/ ${selectedStatementObj.monto_saldo.toFixed(2)}</strong></p>
          
          <div class="space-y-1">
            <label class="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Monto del Abono (S/)</label>
            <input type="number" id="swal-monto" class="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" value="${selectedStatementObj.monto_saldo.toFixed(2)}" step="0.01" max="${selectedStatementObj.monto_saldo}" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Método de Pago</label>
              <select id="swal-metodo" class="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="transferencia">Transferencia BCP</option>
                <option value="deposito">Depósito BBVA</option>
                <option value="efectivo">Efectivo en Caja</option>
                <option value="letra">Letra de Cambio</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">N° Operación Bancaria</label>
              <input type="text" id="swal-operacion" class="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Ejem: OP-00122" />
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Observación (Opcional)</label>
            <input type="text" id="swal-observacion" class="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Ej: Depósito parcial programado" />
          </div>
        </div>
      `,
            background: '#0c0c0e',
            color: '#f4f4f5',
            showCancelButton: true,
            confirmButtonText: 'Registrar Cobro',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#27272a',
            customClass: {
                popup: 'rounded-2xl border border-zinc-800 shadow-2xl',
                input: 'bg-zinc-900 border border-zinc-800'
            },
            preConfirm: () => {
                const montoInput = document.getElementById('swal-monto') as HTMLInputElement;
                const metodoInput = document.getElementById('swal-metodo') as HTMLSelectElement;
                const operacionInput = document.getElementById('swal-operacion') as HTMLInputElement;
                const observacionInput = document.getElementById('swal-observacion') as HTMLInputElement;

                const valParsed = parseFloat(montoInput.value);
                if (isNaN(valParsed) || valParsed <= 0) {
                    Swal.showValidationMessage('Ingresa un monto válido mayor a cero.');
                    return false;
                }

                if (valParsed > selectedStatementObj.monto_saldo) {
                    Swal.showValidationMessage(`El monto no puede exceder el saldo actual (S/ ${selectedStatementObj.monto_saldo.toFixed(2)})`);
                    return false;
                }

                return {
                    monto: valParsed,
                    metodo: metodoInput.value,
                    operacion: operacionInput.value || `OP-${Math.floor(Math.random() * 900000) + 100000}`,
                    observacion: observacionInput.value || 'Abono registrado por Almacén'
                };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const paymentData = result.value;
                const appliedMonto = paymentData.monto;

                // Perform dynamic math simulation
                // 1. Generate new Abono record
                const newAbonoId = abonos.length + 1;
                const timestamp = new Date().toISOString();
                const newAbonoObj: Abono = {
                    id: newAbonoId,
                    cliente_id: selectedStatementObj.cliente_id,
                    monto_abono: appliedMonto,
                    fecha_abono: timestamp,
                    tipo_abono: paymentData.metodo,
                    moneda_abono: 'PEN',
                    id_estado_cuenta: selectedStatementObj.id
                };

                // 2. Adjust Statement (EstadoCuenta)
                const updatedStatements = estadosCuenta.map(acc => {
                    if (acc.id === selectedStatementObj.id) {
                        const nextPago = acc.monto_pago + appliedMonto;
                        const nextSaldo = acc.monto_inicial - nextPago;
                        return {
                            ...acc,
                            monto_pago: Number(nextPago.toFixed(2)),
                            monto_saldo: Number(Math.max(0, nextSaldo).toFixed(2)),
                            estado: nextSaldo <= 0.01 ? 'PAGADO' as const : 'PENDIENTE' as const
                        };
                    }
                    return acc;
                });

                // 3. Discharge quotas sequentially (Metodo Amortizacion de cuotas pendientes)
                let amountLeftToAmortize = appliedMonto;
                const updatedCuotas = cuotas.map(cuo => {
                    if (cuo.estado_cuenta_id === selectedStatementObj.id && cuo.estado !== 'PAGADO') {
                        if (amountLeftToAmortize <= 0) return cuo;

                        const remainingUnpaidForThisCuota = cuo.saldo;
                        if (amountLeftToAmortize >= remainingUnpaidForThisCuota) {
                            // This cuota is fully discharged
                            amountLeftToAmortize -= remainingUnpaidForThisCuota;
                            return {
                                ...cuo,
                                monto_pagado: cuo.monto,
                                saldo: 0,
                                estado: 'PAGADO' as const,
                                numero_operacion: paymentData.operacion,
                                fecha_pago: timestamp,
                                observacion: `${paymentData.observacion} (${paymentData.metodo.toUpperCase()})`
                            };
                        } else {
                            // Partial payment on this installment
                            const nextMontoPagado = cuo.monto_pagado + amountLeftToAmortize;
                            const nextSaldo = cuo.monto - nextMontoPagado;
                            amountLeftToAmortize = 0;
                            return {
                                ...cuo,
                                monto_pagado: Number(nextMontoPagado.toFixed(2)),
                                saldo: Number(nextSaldo.toFixed(2)),
                                estado: 'PENDIENTE' as const // stays pending but now has smaller balance
                            };
                        }
                    }
                    return cuo;
                });

                // 4. Update memory database states
                setAbonos([newAbonoObj, ...abonos]);
                setEstadosCuenta(updatedStatements);
                setCuotas(updatedCuotas);

                // Swal Alert Success indicator
                Swal.fire({
                    icon: 'success',
                    title: 'Abono Procesado Exitosamente',
                    text: `Se aplicó un abono de S/ ${appliedMonto.toFixed(2)} a la Guía ${selectedStatementObj.guia_interna_code}. Los saldos se han recalculado en vivo.`,
                    background: '#0c0c0e',
                    color: '#f4f4f5',
                    confirmButtonColor: '#4f46e5'
                });
            }
        });
    };

    // -----------------------------------------------------
    // NEXT.JS CLEAN CODE FILES FOR REPOSITORY COPYING
    // -----------------------------------------------------

    const loginCodeTemplate = `'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { loginService } from '../services/authServices';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const { setUser } = useUser();

  const handleLogin = async () => {
    if (loading || isPending) return;

    if (!email.trim() || !password.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Por favor ingresa correo y contraseña.',
        confirmButtonColor: '#4f46e5',
        background: '#0a0a0a',
        color: '#f4f4f5',
        customClass: {
          popup: 'rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md'
        }
      });
      return;
    }

    setLoading(true);

    try {
      const data = await loginService(email.trim(), password);

      const userData = {
        id: data.user.id,
        full_name: data.user.full_name,
        email: data.user.email,
        cellphone: data.user.cellphone || '',
        address_home: data.user.address_home || '',
        id_cedula: data.user.id_cedula || '',
        rol_id: data.user.rol_id,
        role: data.user.role,
        date_register: data.user.date_register,
        state_user: data.user.state_user,
        token: data.access_token,
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_data', JSON.stringify(userData));
        document.cookie = \`access_token=\${data.access_token}; path=/; max-age=86400; SameSite=Lax; Secure;\`;
      }

      setUser(userData);
      setLoading(false);
      router.replace('/home');
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de acceso',
        text: error.message || 'Credenciales incorrectas.',
        confirmButtonColor: '#ef4444',
        background: '#0a0a0a',
        color: '#f4f4f5',
        customClass: {
          popup: 'rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md'
        }
      });
      setLoading(false);
    }
  };

  const busy = loading || isPending;

  return (
    <div className="min-h-screen w-full flex bg-[#0a0a0a] font-sans text-zinc-200 overflow-hidden relative selection:bg-indigo-500/30">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* BRANDING SIDE */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-zinc-800/40 bg-[#0a0a0a]">
        <div className="relative z-10 flex items-center space-x-3.5">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-450/10">
            <span className="text-white font-black text-xl">V</span>
          </div>
          <span className="text-white font-extrabold tracking-[0.25em] text-md uppercase font-sans">Verco</span>
        </div>

        <div className="relative z-10 my-auto text-left py-12">
          <h1 className="text-5xl lg:text-6xl font-light text-white leading-[1.1] tracking-tight">
            Logística <br/>
            <span className="font-extrabold bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-300 bg-clip-text text-transparent">Inteligente.</span>
          </h1>
          <p className="mt-6 text-zinc-400 text-sm max-w-sm leading-relaxed">
            Gestión avanzada de almacenes y cadena de suministro en tiempo real. Controla tus flujos con velocidad extrema.
          </p>
        </div>

        <div className="relative z-10">
          <div className="h-[1px] w-12 bg-indigo-500 mb-6"></div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-semibold">
            &copy; 2026 Verco Corp. All Rights Reserved.
          </p>
        </div>
      </div>

      {/* LOGIN FORM SIDE */}
      <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center p-8 bg-[#0c0c0e]">
        <div className="w-full max-w-md space-y-10">
          <div className="text-left space-y-2">
            <h2 className="text-3xl font-semibold text-white tracking-tight">Bienvenido</h2>
            <p className="text-zinc-500 text-sm">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Correo Electrónico</label>
              <div className="relative group">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@verco.com.pe"
                  disabled={busy}
                  className="w-full bg-zinc-900/50 border border-zinc-850 text-white pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/40 transition-all text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-500">
                  <Mail size={16} />
                </div>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <div className="flex justify-between items-end mb-1 px-1">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Contraseña</label>
              </div>
              <div className="relative group">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={busy}
                  className="w-full bg-zinc-900/50 border border-zinc-850 text-white pl-12 pr-12 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/40 transition-all text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-500">
                  <Lock size={16} />
                </div>
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              onClick={handleLogin}
              disabled={busy}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2"
            >
              {busy ? <Loader2 className="animate-spin h-5 w-5" /> : <span>Iniciar Sesión</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

    const stateAccountCodeTemplate = `'use client';

import { useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import { 
  Search, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  ChevronRight, 
  FileText, 
  Plus, 
  Coins, 
  User, 
  ArrowUpRight 
} from 'lucide-react';

// Se asumen estas interfaces provenientes de la lógica de servicios
export interface Client {
  id: number;
  document_type: string;
  document_number: string;
  business_name: string;
  trade_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  seller_id: number | null;
  created_at: string;
}

export interface EstadoCuenta {
  id: number;
  cliente_id: number;
  monto_inicial: number;
  monto_pago: number;
  monto_saldo: number;
  fecha_registro: string;
  id_guia_interna: number;
  guia_interna_code: string;
  estado: 'PENDIENTE' | 'PAGADO';
}

export interface Cuota {
  id: number;
  estado_cuenta_id: number;
  numero_cuota: number;
  monto: number;
  monto_pagado: number;
  saldo: number;
  fecha_vencimiento: string;
  estado: 'PENDIENTE' | 'PAGADO' | 'VENCIDO';
  numero_operacion?: string;
  fecha_pago?: string;
  observacion?: string;
}

export interface Abono {
  id: number;
  cliente_id: number;
  monto_abono: number;
  fecha_abono: string;
  tipo_abono: string;
  moneda_abono: string;
  id_estado_cuenta: number;
}


// Ejemplo de un componente funcional completo para Next.js 13+ / 14 con Tailwind
export default function EstadoCuentaClientePage() {
  const [clients, setClients] = useState<Client[]>([]); // Se cargan de API
  const [estadosCuenta, setEstadosCuenta] = useState<EstadoCuenta[]>([]);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [abonos, setAbonos] = useState<Abono[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // Filtros aplicados de fecha y cliente
  const filteredStatements = useMemo(() => {
    return estadosCuenta.filter(acc => {
      if (acc.cliente_id !== selectedClientId) return false;
      const date = acc.fecha_registro.substring(0, 10);
      return date >= startDate && date <= endDate;
    });
  }, [estadosCuenta, selectedClientId, startDate, endDate]);

  // Recalculo e ingreso de un abono (Conexión real con SweetAlert2)
  const openAbonoDialog = (statement: EstadoCuenta) => {
    Swal.fire({
      title: 'REGISTRAR ABONO EN COLA',
      html: \`
        <div class="space-y-4 text-left p-1 text-zinc-350 text-sm">
          <p class="text-xs text-zinc-500">Abonando a Guía: <b class="text-indigo-400">\${statement.guia_interna_code}</b></p>
          <div class="space-y-1">
            <label class="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Monto a abonar (S/)</label>
            <input type="number" id="swal-monto" class="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2.5" value="\${statement.monto_saldo}" step="0.01" />
          </div>
          <div class="space-y-1">
            <label class="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">Forma de Pago</label>
            <select id="swal-tipo" class="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2.5">
              <option value="transferencia">Transferencia Bancaria</option>
              <option value="deposito">Depósito Físico</option>
              <option value="efectivo">Efectivo Caja Chica</option>
            </select>
          </div>
        </div>
      \`,
      background: '#0c0c0e',
      color: '#f4f4f5',
      showCancelButton: true,
      confirmButtonText: 'Guardar Abono',
      confirmButtonColor: '#4f46e5',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#27272a',
      preConfirm: () => {
        const amt = parseFloat((document.getElementById('swal-monto') as HTMLInputElement).value);
        const typ = (document.getElementById('swal-tipo') as HTMLSelectElement).value;
        if (isNaN(amt) || amt <= 0 || amt > statement.monto_saldo) {
          Swal.showValidationMessage('Por favor ingrese un monto válido de abono.');
          return false;
        }
        return { amt, typ };
      }
    }).then(async (res) => {
      if (res.isConfirmed && res.value) {
        // Ejecución de peticiones API
        // axios.post('/api/abonos', { ... }) ...
        Swal.fire('¡Operación Exitosa!', 'El abono ha sido imputado adecuadamente.', 'success');
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-200 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Vista Cabecera con Buscador de Razón Social / RUC */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 bg-[#0b0b0d] p-5 rounded-2xl border border-zinc-900">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Buscar por Razón Social, RUC o Nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-800 text-white text-sm rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Rango de fechas */}
          <div className="flex items-center gap-3">
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
            />
            <span className="text-zinc-600 text-xs">a</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        {/* Tabla principal de los Estados de Cuenta */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Listado de Guías Internas / Crédito */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-md font-bold tracking-tight text-white uppercase font-mono text-zinc-400">Comprobantes de Crédito</h3>
            <div className="bg-[#0b0b0d] rounded-2xl border border-zinc-900 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0e0e11] text-zinc-400 border-b border-zinc-900 uppercase">
                  <tr>
                    <th className="p-4">Guía Interna</th>
                    <th className="p-4">Fecha Reg.</th>
                    <th className="p-4 text-right">Monto Inicial</th>
                    <th className="p-4 text-right">Monto Pagado</th>
                    <th className="p-4 text-right">Monto Saldo</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filteredStatements.map(statement => (
                    <tr key={statement.id} className="hover:bg-zinc-900/30">
                      <td className="p-4 font-bold text-white">{statement.guia_interna_code}</td>
                      <td className="p-4 text-zinc-400">{statement.fecha_registro.substring(0, 10)}</td>
                      <td className="p-4 text-right">S/ {statement.monto_inicial.toFixed(2)}</td>
                      <td className="p-4 text-emerald-400 text-right">S/ {statement.monto_pago.toFixed(2)}</td>
                      <td className="p-4 text-amber-500 text-right font-semibold">S/ {statement.monto_saldo.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className={\`px-2 py-0.5 rounded-full text-[10px] font-bold \${
                          statement.estado === 'PAGADO' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-550'
                        }\`}>
                          {statement.estado}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => openAbonoDialog(statement)}
                          className="px-2 py-1 bg-indigo-650 hover:bg-indigo-600 rounded text-white font-bold"
                        >
                          Abonar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen General Lateral */}
          <div className="space-y-6">
            <h3 className="text-md font-bold tracking-tight text-white uppercase font-mono text-zinc-400">Resumen Financiero</h3>
            {/* Componente lateral de detalles e indicadores */}
          </div>

        </div>

      </div>
    </div>
  );
}
`;

    const copyToClipboard = (type: 'login' | 'estado') => {
        const textToCopy = type === 'login' ? loginCodeTemplate : stateAccountCodeTemplate;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Switch helper for demo presets inside Client module
    const handleSelectClient = (clientId: number) => {
        setSelectedClientId(clientId);
        // Find the first account statement for this client to preset details
        const firstStatement = estadosCuenta.find(acc => acc.cliente_id === clientId);
        if (firstStatement) {
            setSelectedStatementId(firstStatement.id);
        } else {
            setSelectedStatementId(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#070708] text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">

            {/* GLOBAL HIGH RELEVANCY NAVIGATION CAROUSEL */}
            <div className="bg-[#0a0a0c] border-b border-zinc-900 py-2.5 px-4 sm:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">

                {/* System Title */}
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-700 flex items-center justify-center border border-indigo-400/20 shadow-md">
                        <span className="text-white font-black text-sm">V</span>
                    </div>
                    <div>
                        <span className="text-[12px] font-bold text-white tracking-wider block font-sans">SISTEMAS VERCO CORP</span>
                        <span className="text-[10px] text-zinc-500 block leading-tight font-mono">WORKSPACE DE LOGÍSTICA & DESARROLLO v2.06</span>
                    </div>
                </div>

                {/* Core Module Switcher */}
                <div className="flex items-center bg-zinc-950 p-1.5 rounded-xl border border-zinc-900 gap-1.5">
                    <button
                        onClick={() => {
                            setActiveModule('estado-cuenta');
                            setActiveTab('preview');
                        }}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeModule === 'estado-cuenta'
                                ? 'bg-zinc-900 text-indigo-400 border border-zinc-800'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                            }`}
                    >
                        <Layers className="h-3.5 w-3.5" />
                        Estado de Cuenta Clientes
                    </button>

                    <button
                        onClick={() => {
                            setActiveModule('login-premium');
                            setActiveTab('preview');
                        }}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeModule === 'login-premium'
                                ? 'bg-zinc-900 text-indigo-400 border border-zinc-800'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                            }`}
                    >
                        <Lock className="h-3.5 w-3.5" />
                        Login Corporativo Dark
                    </button>
                </div>

                {/* Global time & developer indicators */}
                <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-zinc-500 border-l border-zinc-850 pl-4">
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                        <span>2026-06-08</span>
                    </div>
                    <span className="text-zinc-700">|</span>
                    <span className="text-indigo-400 font-semibold uppercase tracking-wider">DEV RUNNING</span>
                </div>

            </div>


            {/* ====================================================
          A. MODULE: CLIENT STATE OF ACCOUNT (ESTADO DE CUENTA)
          ==================================================== */}
            {activeModule === 'estado-cuenta' && (
                <div>
                    {/* TAB OPTIONS HEADER */}
                    <div className="bg-[#0b0b0e]/95 border-b border-zinc-900 sticky top-0 z-40 px-4 py-3 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                        <div className="text-left">
                            <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                                Consulta de Estado de Cuenta <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-500/20">Instante Real</span>
                            </h1>
                            <p className="text-[11px] text-zinc-400">Verifica créditos, amortizaciones, vencimientos y simula desembolsos bancarios.</p>
                        </div>

                        {/* TAB SELECTORS */}
                        <div className="flex items-center gap-2 self-start sm:self-center">
                            <button
                                onClick={() => setActiveTab('preview')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'preview' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                <Laptop className="h-3.5 w-3.5" />
                                Simulador Operativo
                            </button>

                            <button
                                onClick={() => setActiveTab('code')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'code' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                <Code className="h-3.5 w-3.5" />
                                Consumo Next.js
                            </button>

                            <button
                                onClick={() => setActiveTab('docs')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'docs' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                <BookOpen className="h-3.5 w-3.5" />
                                Estructura BD
                            </button>
                        </div>

                    </div>

                    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

                        {/* PREVIEW SUB TAB */}
                        {activeTab === 'preview' && (
                            <div className="space-y-8 animate-fade-in text-left">

                                {/* 1. FILTER AND CLIENT ENQUIRY PANEL */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-[#0b0b0d] p-5 rounded-2xl border border-zinc-905">

                                    {/* Search Query Input */}
                                    <div className="lg:col-span-5 space-y-1.5 relative">
                                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#8a8a93] pl-1 font-mono">Razón Social o RUC del Cliente</label>
                                        <div className="relative">
                                            <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                                            <input
                                                type="text"
                                                placeholder="Buscar por Ej: Distribuidora, Imperio, 2060..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-[#070709] border border-zinc-850 pl-11 pr-4 py-3 h-12 rounded-xl text-zinc-100 placeholder-zinc-650 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                                            />
                                        </div>

                                        {/* Auto search-results indicator */}
                                        {searchQuery.trim() && (
                                            <div className="absolute left-0 right-0 top-[100%] mt-1 bg-zinc-950 border border-zinc-800 rounded-xl max-h-48 overflow-y-auto shadow-2xl z-25 p-1.5 space-y-1 divide-y divide-zinc-900">
                                                {filteredClientsList.length > 0 ? (
                                                    filteredClientsList.map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => {
                                                                handleSelectClient(c.id);
                                                                setSearchQuery('');
                                                            }}
                                                            className="w-full text-left p-2 hover:bg-zinc-900/60 transition-colors text-xs flex justify-between items-center rounded-lg cursor-pointer"
                                                        >
                                                            <div className="font-semibold text-zinc-200">
                                                                {c.business_name}
                                                                <span className="block text-[10px] text-zinc-500 font-mono font-medium">{c.document_type}: {c.document_number}</span>
                                                            </div>
                                                            <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="p-3 text-zinc-500 text-xs text-center font-medium font-mono">Ningún cliente coincide...</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Date Range filters */}
                                    <div className="lg:col-span-4 space-y-1.5">
                                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#8a8a93] pl-1 font-mono">Rango de Registro de Cuentas</label>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="w-full bg-[#070709] border border-zinc-850 pl-9 pr-2 py-2.5 h-12 rounded-xl text-xs text-zinc-150 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    className="w-full bg-[#070709] border border-zinc-850 pl-9 pr-2 py-2.5 h-12 rounded-xl text-xs text-zinc-150 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preset Quick Select for demo */}
                                    <div className="lg:col-span-3 space-y-1.5">
                                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#8a8a93] pl-1 font-mono">Clientes Frecuentes</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => handleSelectClient(1)}
                                                className={`text-[10px] py-3.5 rounded-xl border font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${selectedClientId === 1
                                                        ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30'
                                                        : 'bg-zinc-950/40 text-zinc-400 border-zinc-900 hover:border-zinc-800'
                                                    }`}
                                            >
                                                Verco Norte
                                            </button>
                                            <button
                                                onClick={() => handleSelectClient(4)}
                                                className={`text-[10px] py-3.5 rounded-xl border font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${selectedClientId === 4
                                                        ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30'
                                                        : 'bg-zinc-950/40 text-zinc-400 border-zinc-900 hover:border-zinc-800'
                                                    }`}
                                            >
                                                J. Nieva
                                            </button>
                                        </div>
                                    </div>

                                </div>

                                {/* 2. LIVE STATISTICS SUMMARY WIDGETS */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                                    {/* Total Debt Widget */}
                                    <div className="bg-[#0b0b0d] p-5 rounded-2xl border border-zinc-900 relative overflow-hidden flex flex-col justify-between group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/[0.015] rounded-full blur-2xl pointer-events-none" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Saldo Pendiente</span>
                                            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
                                                <TrendingDown className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="mt-4 text-left">
                                            <span className="text-2xl font-bold tracking-tight text-red-400">S/ {clientStatSummary.balanceTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            <span className="block text-[10px] text-zinc-500 font-medium font-mono mt-1">Suma de saldos de proformas activas</span>
                                        </div>
                                    </div>

                                    {/* Total Amortized Widget */}
                                    <div className="bg-[#0b0b0d] p-5 rounded-2xl border border-zinc-900 relative overflow-hidden flex flex-col justify-between">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.015] rounded-full blur-2xl pointer-events-none" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Total Amortizado</span>
                                            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                                                <Check className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="mt-4 text-left">
                                            <span className="text-2xl font-bold tracking-tight text-emerald-400">S/ {clientStatSummary.paidTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            <span className="block text-[10px] text-zinc-500 font-medium font-mono mt-1">Crédito devuelto e ingresado</span>
                                        </div>
                                    </div>

                                    {/* Overdue Installments Count */}
                                    <div className="bg-[#0b0b0d] p-5 rounded-2xl border border-zinc-900 relative overflow-hidden flex flex-col justify-between">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.015] rounded-full blur-2xl pointer-events-none" />
                                        <div className="flex justify-between items-center text-left">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Cuotas Vencidas</span>
                                            <div className={`p-2 rounded-lg ${clientStatSummary.overdueCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                                <AlertCircle className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="mt-4 text-left">
                                            <span className={`text-2xl font-bold tracking-tight ${clientStatSummary.overdueCount > 0 ? 'text-amber-500' : 'text-zinc-300'}`}>
                                                {clientStatSummary.overdueCount} {clientStatSummary.overdueCount === 1 ? 'cuota' : 'cuotas'}
                                            </span>
                                            <span className="block text-[10px] text-zinc-500 font-medium font-mono mt-1">Requieren contacto de cobro</span>
                                        </div>
                                    </div>

                                    {/* Next Payment Due Date */}
                                    <div className="bg-[#0b0b0d] p-5 rounded-2xl border border-zinc-900 relative overflow-hidden flex flex-col justify-between">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/[0.015] rounded-full blur-2xl pointer-events-none" />
                                        <div className="flex justify-between items-center text-left">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Próximo Vencimiento</span>
                                            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="mt-4 text-left">
                                            <span className="text-lg font-bold tracking-tight text-indigo-400">
                                                {clientStatSummary.nextDueDate !== '--/--/----' ? (
                                                    new Date(clientStatSummary.nextDueDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                                                ) : (
                                                    'Sin Vencimientos Pts.'
                                                )}
                                            </span>
                                            <span className="block text-[10px] text-zinc-500 font-medium font-mono mt-1">Vencimiento más cercano</span>
                                        </div>
                                    </div>

                                </div>

                                {/* 3. CORE SUB-LAYOUT SPLIT (Statements list LEFT, Installments + Abonos RIGHT) */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                                    {/* Left Column: List of general account statements (Comprobantes / Guías) */}
                                    <div className="lg:col-span-7 space-y-4">

                                        {/* Header */}
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-xs font-bold tracking-wider font-mono text-zinc-400 uppercase">
                                                CARTERA DE CRÉDITO DEL CLIENTE ({clientAccountsFiltered.length})
                                            </h3>
                                            <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase">MONEDA: PEN</span>
                                        </div>

                                        {/* Account database loop */}
                                        <div className="bg-[#0b0b0d] rounded-2xl border border-zinc-900 overflow-hidden shadow-2xl">
                                            {clientAccountsFiltered.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-xs whitespace-nowrap">
                                                        <thead className="bg-[#0e0e11] text-zinc-400 border-b border-zinc-900 uppercase text-[10px] font-bold font-mono tracking-wider">
                                                            <tr>
                                                                <th className="p-4">Guía Interna</th>
                                                                <th className="p-4">Fecha Registro</th>
                                                                <th className="p-4 text-right">Monto Inicial</th>
                                                                <th className="p-4 text-right">Amortizado</th>
                                                                <th className="p-4 text-right">Saldo Deuda</th>
                                                                <th className="p-4 text-center">Estado</th>
                                                                <th className="p-4 text-center">Auditar</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-zinc-900/60 font-medium">
                                                            {clientAccountsFiltered.map(acc => {
                                                                const isSelected = selectedStatementId === acc.id;
                                                                return (
                                                                    <tr
                                                                        key={acc.id}
                                                                        onClick={() => setSelectedStatementId(acc.id)}
                                                                        className={`transition-colors cursor-pointer ${isSelected ? 'bg-indigo-600/5 hover:bg-indigo-600/10' : 'hover:bg-zinc-900/20'
                                                                            }`}
                                                                    >
                                                                        <td className="p-4">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-400' : 'bg-transparent'}`} />
                                                                                <span className="text-white font-extrabold">{acc.guia_interna_code}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-4 text-zinc-400">{acc.fecha_registro.substring(0, 10)}</td>
                                                                        <td className="p-4 text-right text-zinc-300">S/ {acc.monto_inicial.toFixed(2)}</td>
                                                                        <td className="p-4 text-right text-emerald-450 font-semibold">S/ {acc.monto_pago.toFixed(2)}</td>
                                                                        <td className="p-4 text-right text-amber-500 font-bold">S/ {acc.monto_saldo.toFixed(2)}</td>
                                                                        <td className="p-4 text-center">
                                                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider ${acc.estado === 'PAGADO'
                                                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                                                    : 'bg-amber-500/10 text-amber-450 border border-amber-500/10'
                                                                                }`}>
                                                                                {acc.estado}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-4 text-center">
                                                                            <button
                                                                                className={`p-1.5 rounded-lg transition-all ${isSelected ? 'bg-indigo-650 text-white' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'
                                                                                    }`}
                                                                            >
                                                                                <ChevronRight className="h-4 w-4" />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="py-12 text-center text-zinc-500">
                                                    <AlertCircle className="mx-auto h-8 w-8 text-zinc-650 mb-3" />
                                                    <p className="text-xs font-semibold">No se encontraron comprobantes de crédito</p>
                                                    <p className="text-[10px] text-zinc-650 mt-1">Intente cambiar el rango de fechas o el cliente de arriba.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Client Master Information Details Block */}
                                        <div className="bg-[#0b0b0d] rounded-2xl border border-zinc-900 p-5 mt-4 space-y-4 text-left">
                                            <div className="flex items-center gap-2.5 border-b border-zinc-900 pb-3">
                                                <div className="p-2 bg-zinc-950 text-indigo-400 rounded-lg">
                                                    <UserIcon className="h-4.5 w-4.5" />
                                                </div>
                                                <div>
                                                    <span className="text-xs font-extrabold text-white uppercase block leading-none">{selectedClientObj.business_name}</span>
                                                    <span className="text-[9px] text-zinc-500 font-mono tracking-wider">{selectedClientObj.document_type}: {selectedClientObj.document_number}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-zinc-500 block uppercase font-mono leading-none">Dirección Fiscal</span>
                                                    <span className="text-zinc-300 font-medium">{selectedClientObj.address || 'Sin dirección registrada'}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-zinc-500 block uppercase font-mono leading-none">Ubicación Geográfica</span>
                                                    <span className="text-zinc-300 font-medium">
                                                        {selectedClientObj.district ? `${selectedClientObj.district}, ${selectedClientObj.province} - ${selectedClientObj.department}` : 'Sin ubicación'}
                                                    </span>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-zinc-500 block uppercase font-mono leading-none">Contacto Directo</span>
                                                    <span className="text-zinc-300 font-medium">{selectedClientObj.phone || 'Sin número'} | {selectedClientObj.email || 'Sin correo'}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-zinc-500 block uppercase font-mono leading-none">Frecuencia de Carga</span>
                                                    <span className="text-indigo-400 font-bold font-mono">Último Pedido: {selectedClientObj.last_order_at ? new Date(selectedClientObj.last_order_at).toLocaleDateString() : 'Ninguno registrado'}</span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    {/* Right Column: Deep auditing into selected accounts (Cuotas / Abonos) */}
                                    <div className="lg:col-span-5 space-y-6 text-left">

                                        {selectedStatementObj ? (
                                            <div className="space-y-6">

                                                {/* Sub Header Segment */}
                                                <div className="bg-[#0b0b0d] p-5 rounded-2xl border border-zinc-900 space-y-4">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div>
                                                            <span className="text-[9px] font-bold font-mono text-zinc-500 block uppercase tracking-wider">PREVISIÓN DE COMPROBANTE</span>
                                                            <h4 className="text-md font-extrabold text-white mt-1">{selectedStatementObj.guia_interna_code}</h4>
                                                        </div>

                                                        {/* Floating Action Abono Register Button */}
                                                        <button
                                                            onClick={handleTriggerSimulateAbono}
                                                            className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/10 border border-indigo-400/20 cursor-pointer"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            Registrar Abono
                                                        </button>
                                                    </div>

                                                    {/* Quick details */}
                                                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-zinc-900/60 font-mono">
                                                        <div className="bg-zinc-950/40 p-2 rounded-lg">
                                                            <span className="text-[9px] text-zinc-500 block uppercase leading-none">Inicial</span>
                                                            <span className="text-zinc-300 font-bold">S/ {selectedStatementObj.monto_inicial.toFixed(0)}</span>
                                                        </div>
                                                        <div className="bg-zinc-950/40 p-2 rounded-lg">
                                                            <span className="text-[9px] text-zinc-500 block uppercase leading-none">Amortizado</span>
                                                            <span className="text-emerald-450 font-bold">S/ {selectedStatementObj.monto_pago.toFixed(0)}</span>
                                                        </div>
                                                        <div className="bg-zinc-950/40 p-2 rounded-lg">
                                                            <span className="text-[9px] text-zinc-500 block uppercase leading-none">Diferencial</span>
                                                            <span className="text-amber-500 font-bold">S/ {selectedStatementObj.monto_saldo.toFixed(0)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* LIST OF INSTALLMENTS (Lista de Cuotas) */}
                                                <div className="space-y-3">
                                                    <span className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider block">Cronograma de Cuotas Recurrentes</span>

                                                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                                        {activeStatementCuotas.map(cuo => {
                                                            const isOverdue = cuo.estado === 'VENCIDO';
                                                            const isPaid = cuo.estado === 'PAGADO';
                                                            return (
                                                                <div
                                                                    key={cuo.id}
                                                                    className={`p-3.5 rounded-xl border transition-all text-xs flex justify-between items-center ${isPaid
                                                                            ? 'bg-emerald-500/[0.015] border-emerald-500/15'
                                                                            : isOverdue
                                                                                ? 'bg-rose-500/[0.015] border-rose-500/15'
                                                                                : 'bg-zinc-950/60 border-zinc-900'
                                                                        }`}
                                                                >
                                                                    {/* Left segment */}
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-extrabold text-white font-mono">Cuota N° {cuo.numero_cuota}</span>

                                                                            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase font-mono tracking-wider ${isPaid
                                                                                    ? 'bg-emerald-500/15 text-emerald-400'
                                                                                    : isOverdue
                                                                                        ? 'bg-rose-500/15 text-rose-450'
                                                                                        : 'bg-zinc-900 text-zinc-400'
                                                                                }`}>
                                                                                {cuo.estado}
                                                                            </span>
                                                                        </div>

                                                                        <span className="text-[10px] text-zinc-400 block">
                                                                            Vence: <strong className="text-zinc-300">{cuo.fecha_vencimiento}</strong>
                                                                        </span>
                                                                        {isPaid && cuo.numero_operacion && (
                                                                            <span className="text-[9px] text-[#86bf95] block font-mono">
                                                                                Op: {cuo.numero_operacion} | {cuo.fecha_pago ? new Date(cuo.fecha_pago).toLocaleDateString() : ''}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Right side pricing */}
                                                                    <div className="text-right space-y-0.5">
                                                                        <span className="block text-zinc-100 font-extrabold font-mono">S/ {cuo.monto.toFixed(2)}</span>
                                                                        {!isPaid && (
                                                                            <span className="block text-[10px] text-amber-500 font-medium">Falta: S/ {cuo.saldo.toFixed(2)}</span>
                                                                        )}
                                                                    </div>

                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* TRANSACTION HISTORY AUDITING LOG (Historial de Abonos) */}
                                                <div className="space-y-3">
                                                    <span className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider block">Auditoría de Pagos Realizados (Abonos)</span>

                                                    <div className="bg-[#0b0b0d] rounded-2xl border border-zinc-900 divide-y divide-zinc-900/60 p-2">
                                                        {activeStatementAbonos.length > 0 ? (
                                                            activeStatementAbonos.map(ab => (
                                                                <div key={ab.id} className="p-3 text-xs flex justify-between items-center bg-zinc-950/20 rounded-xl my-1">
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                                            <span className="font-bold text-zinc-200 capitalize font-mono text-[11px]">{ab.tipo_abono}</span>
                                                                        </div>
                                                                        <span className="text-[10px] text-zinc-500 block font-mono">
                                                                            {new Date(ab.fecha_abono).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>

                                                                    <div className="text-right">
                                                                        <span className="text-emerald-450 font-bold font-mono text-xs">+ S/ {ab.monto_abono.toFixed(2)}</span>
                                                                        <span className="block text-[9px] text-zinc-500 font-mono tracking-widest">{ab.moneda_abono}</span>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="py-8 text-center text-zinc-650 text-xs font-medium font-mono">Ningún abono imputado...</div>
                                                        )}
                                                    </div>
                                                </div>

                                            </div>
                                        ) : (
                                            <div className="bg-[#0b0b0d] rounded-2xl border border-zinc-900 p-8 text-center text-zinc-550">
                                                <FileText className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
                                                <h4 className="text-xs font-extrabold uppercase text-white font-mono tracking-wider">Ninguna Guía Seleccionada</h4>
                                                <p className="text-[11px] text-zinc-550 mt-1 max-w-xs mx-auto">Selecciona una de las proformas de la lista de la izquierda para desplegar sus cuotas y depósitos.</p>
                                            </div>
                                        )}

                                    </div>

                                </div>

                            </div>
                        )}

                        {/* NEXT.JS SOURCE CODE PREVIEW DETAILS TAB */}
                        {activeTab === 'code' && (
                            <div className="space-y-4 animate-fade-in text-left">
                                <div className="bg-[#0b0b0d] rounded-2xl border border-zinc-90 w-full p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-indigo-505/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                                            <Code className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white leading-tight">Implementación Estado de Cuenta para Next.js</h3>
                                            <p className="text-[11px] text-zinc-400">Arraigo completo de tipos TypeScript, amortización secuencial, SwalAlert moderno y diseño sofisticado.</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => copyToClipboard('estado')}
                                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-650/10"
                                    >
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        <span>{copied ? '¡Copiado!' : 'Copiar Archivo de Página'}</span>
                                    </button>
                                </div>

                                <div className="rounded-2xl border border-zinc-900 bg-[#08080a] overflow-hidden text-xs font-mono select-text">
                                    <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-900/80 flex justify-between items-center text-zinc-400">
                                        <span className="text-[10px] font-bold text-zinc-500 font-mono uppercase tracking-wider">src/app/estado-cuenta/page.tsx</span>
                                        <span className="text-[10px] text-indigo-450 bg-indigo-500/10 px-2 py-0.5 rounded font-bold border border-indigo-500/10">TypeORM Compatible</span>
                                    </div>
                                    <pre className="p-4 sm:p-6 overflow-x-auto max-h-[550px] leading-relaxed text-zinc-300">{stateAccountCodeTemplate}</pre>
                                </div>
                            </div>
                        )}

                        {/* TECHNICAL DB SCHEMA DESCRIPTION TAB */}
                        {activeTab === 'docs' && (
                            <div className="space-y-6 animate-fade-in text-left">
                                <div className="bg-[#0b0b0d] rounded-2xl border border-zinc-900 p-6 sm:p-8 space-y-6">

                                    {/* Title block */}
                                    <div className="flex items-center gap-3.5 border-b border-zinc-900 pb-4">
                                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center text-indigo-400">
                                            <Layers className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-md font-bold text-white">Estructura Relacional del Módulo de Cuenta</h3>
                                            <p className="text-xs text-zinc-400">Diagrama conceptual e integridad de base de datos para cobros de carteras Verco.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-400">

                                        {/* Segment 1 */}
                                        <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-900 space-y-2">
                                            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[9px] font-bold uppercase font-mono tracking-wider">1. EstadoCuenta (Maestro)</span>
                                            <p className="leading-relaxed mt-1">
                                                Cada comprobante emitido a crédito (con referencia a la <b>Guía Interna</b> del pedido o <b>Order</b>) registra el monto inicial pactado, la suma histórica amortizada (<code className="text-zinc-300 font-mono">monto_pago</code>) y el divisor residual (<code className="text-zinc-300 font-mono">monto_saldo</code>).
                                            </p>
                                        </div>

                                        {/* Segment 2 */}
                                        <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-900 space-y-2">
                                            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[9px] font-bold uppercase font-mono tracking-wider">2. Cuotas (Cronograma)</span>
                                            <p className="leading-relaxed mt-1">
                                                Relación <code className="text-zinc-300 font-mono">1 a Muchos</code> con el Maestro. Divide el comprobante principal en pagos programados con fecha de vencimiento única, registrando de forma independiente claves de depósito bancario.
                                            </p>
                                        </div>

                                        {/* Segment 3 */}
                                        <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-900 space-y-2">
                                            <span className="px-2 py-0.5 bg-[#4c5de6]/10 text-indigo-400 rounded text-[9px] font-bold uppercase font-mono tracking-wider">3. Abonos (Libro Diario)</span>
                                            <p className="leading-relaxed mt-1">
                                                Audita cada transacción o ingreso de flujo de efectivo del cliente, asociándolo directamente al cliente o comprobante para propósitos contables rápidos.
                                            </p>
                                        </div>

                                    </div>

                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}


            {/* ====================================================
          B. MODULE: CORPORATE LOGIN PREVIEW DESIGNER
          ==================================================== */}
            {activeModule === 'login-premium' && (
                <div>
                    {/* TAB OPTIONS HEADER */}
                    <div className="bg-[#0b0b0e]/95 border-b border-zinc-900 sticky top-0 z-40 px-4 py-3 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                        <div className="text-left">
                            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                                Módulo Iniciar Sesión <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-semibold font-mono">Sophisticated Dark</span>
                            </h2>
                            <p className="text-[11px] text-zinc-400">Personaliza la visualización de la autenticación organizacional premium.</p>
                        </div>

                        {/* TAB SELECTORS */}
                        <div className="flex items-center gap-2 self-start sm:self-center">
                            <button
                                onClick={() => setActiveTab('preview')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'preview' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                <Laptop className="h-3.5 w-3.5" />
                                Doble Panel Decorativo
                            </button>

                            <button
                                onClick={() => setActiveTab('code')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'code' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                <Code className="h-3.5 w-3.5" />
                                Ver Código Login
                            </button>
                        </div>

                    </div>

                    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

                        {/* PREVIEW SUB TAB */}
                        {activeTab === 'preview' && (
                            <div className="space-y-6 animate-fade-in text-left">

                                {/* Visualizer adjustment bar */}
                                <div className="bg-[#0b0b0d] rounded-2xl border border-zinc-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-[10px] uppercase tracking-wider font-extrabold font-mono text-zinc-500">Preset Prueba Directa:</span>
                                        <button
                                            onClick={() => {
                                                setTestEmail('administrador@verco.com.pe');
                                                setTestPassword('verco2026_secure');
                                            }}
                                            className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all cursor-pointer"
                                        >
                                            Cargar Credenciales Correctas
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase tracking-wider font-extrabold font-mono text-zinc-500">Ajustar Dispositivo:</span>
                                        <button
                                            onClick={() => setPreviewDevice('desktop')}
                                            className={`p-2 rounded-xl transition-all cursor-pointer ${previewDevice === 'desktop' ? 'bg-indigo-650 text-white' : 'bg-zinc-900 text-zinc-400'
                                                }`}
                                        >
                                            <Laptop className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setPreviewDevice('mobile')}
                                            className={`p-2 rounded-xl transition-all cursor-pointer ${previewDevice === 'mobile' ? 'bg-indigo-650 text-white' : 'bg-zinc-900 text-zinc-400'
                                                }`}
                                        >
                                            <Smartphone className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* THE LIVE PREVIEW CONTAINER */}
                                <div className="flex items-center justify-center bg-[#050506]/95 border border-zinc-900 rounded-3xl p-2 sm:p-6 min-h-[600px] relative overflow-hidden">

                                    <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-indigo-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

                                    {/* Wrapper viewport */}
                                    <div
                                        className={`w-full overflow-hidden relative shadow-2xl transition-all duration-300 border border-zinc-805 rounded-2xl flex ${previewDevice === 'desktop'
                                                ? 'min-h-[620px] max-w-[950px] bg-[#0a0a0a]'
                                                : 'max-w-[400px] min-h-[600px] bg-[#0c0c0e]'
                                            }`}
                                    >

                                        {/* Left Brand Panel (Desktop) */}
                                        {previewDevice === 'desktop' && (
                                            <div className="w-1/2 relative bg-[#0a0a0a] overflow-hidden border-r border-zinc-900/60 p-12 flex flex-col justify-between">
                                                <div className="absolute top-[-10%] right-[-10%] w-[450px] h-[450px] bg-indigo-600/[0.06] rounded-full blur-[100px] pointer-events-none" />
                                                <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] bg-indigo-500/[0.03] rounded-full blur-[80px] pointer-events-none" />

                                                {/* Top logo */}
                                                <div className="relative z-10 flex items-center space-x-3.5">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md border border-indigo-400/10">
                                                        <span className="text-white font-extrabold text-lg">V</span>
                                                    </div>
                                                    <span className="text-zinc-150 font-black tracking-widest text-md uppercase">Verco</span>
                                                </div>

                                                {/* Central headline typography block */}
                                                <div className="relative z-10 my-auto text-left py-12">
                                                    <span className="text-[10px] font-bold text-indigo-455 font-mono tracking-widest uppercase block mb-3">SISTEMAS LOGÍSTICOS</span>
                                                    <h1 className="text-5xl font-light text-white leading-tight tracking-tight">
                                                        Logística <br />
                                                        <span className="font-extrabold bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-300 bg-clip-text text-transparent">Inteligente.</span>
                                                    </h1>
                                                    <p className="mt-4 text-zinc-450 text-xs md:text-sm leading-relaxed max-w-sm">
                                                        Gestión avanzada de almacenes y cadena de suministro en tiempo real. Máximo rendimiento de inventario.
                                                    </p>
                                                </div>

                                                {/* Footer copy line */}
                                                <div className="relative z-10">
                                                    <div className="h-[1px] w-12 bg-indigo-500 mb-5" />
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                                                        &copy; 2026 Verco Corp. All Rights Reserved.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Right Login Panel */}
                                        <div className={`${previewDevice === 'desktop' ? 'w-1/2' : 'w-full'} flex items-center justify-center p-8 sm:p-12 bg-[#0c0c0e]`}>
                                            <div className="w-full max-w-[320px] space-y-8">

                                                {/* Title block */}
                                                <div className="text-left space-y-2">
                                                    {previewDevice === 'mobile' && (
                                                        <div className="flex items-center space-x-3 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80 w-fit mb-5">
                                                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-700 rounded-lg flex items-center justify-center">
                                                                <span className="text-white font-bold text-md">V</span>
                                                            </div>
                                                            <span className="text-white font-bold tracking-widest text-xs uppercase">Verco</span>
                                                        </div>
                                                    )}
                                                    <h3 className="text-2xl font-semibold text-white tracking-tight">Bienvenido</h3>
                                                    <p className="text-zinc-500 text-xs leading-none">Ingresa tus credenciales para acceder</p>
                                                </div>

                                                {/* Inputs block */}
                                                <div className="space-y-4">

                                                    {/* Email input block */}
                                                    <div className="space-y-1.5 text-left">
                                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-0.5">Correo Electrónico</label>
                                                        <div className="relative group">
                                                            <input
                                                                type="email"
                                                                value={testEmail}
                                                                onChange={(e) => setTestEmail(e.target.value)}
                                                                className="w-full bg-zinc-900/50 border border-zinc-850 text-white pl-11 pr-4 py-3 h-11 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all text-xs"
                                                                placeholder="usuario@verco.com.pe"
                                                            />
                                                            <div className="absolute inset-y-0 left-4 flex items-center text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                                                                <Mail size={16} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Password input block */}
                                                    <div className="space-y-1.5 text-left">
                                                        <div className="flex justify-between items-center ml-0.5 mb-1 text-[10px] font-bold text-zinc-400">
                                                            <label className="uppercase tracking-wider">Contraseña</label>
                                                            <span className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">¿Olvidaste clave?</span>
                                                        </div>
                                                        <div className="relative group">
                                                            <input
                                                                type={showPassword ? 'text' : 'password'}
                                                                value={testPassword}
                                                                onChange={(e) => setTestPassword(e.target.value)}
                                                                className="w-full bg-zinc-900/50 border border-zinc-850 text-white pl-11 pr-11 py-3 h-11 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all text-xs"
                                                                placeholder="••••••••"
                                                            />
                                                            <div className="absolute inset-y-0 left-4 flex items-center text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                                                                <Lock size={16} />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                className="absolute inset-y-0 right-3.5 flex items-center text-zinc-500 hover:text-zinc-350 transition-colors cursor-pointer"
                                                            >
                                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Submit Action */}
                                                    <button
                                                        onClick={async () => {
                                                            setIsSimulateLoading(true);
                                                            setTimeout(() => {
                                                                setIsSimulateLoading(false);
                                                                if (testEmail === 'administrador@verco.com.pe' && testPassword === 'verco2026_secure') {
                                                                    Swal.fire({
                                                                        icon: 'success',
                                                                        title: 'Sesión Iniciada',
                                                                        text: 'Bienvenido de nuevo al sistema Verco.',
                                                                        background: '#0c0c0e',
                                                                        color: '#f4f4f5',
                                                                        confirmButtonColor: '#4f46e5'
                                                                    });
                                                                } else {
                                                                    Swal.fire({
                                                                        icon: 'error',
                                                                        title: 'Credenciales Incorrectas',
                                                                        text: 'Por favor, verifique el correo o contraseña.',
                                                                        background: '#0c0c0e',
                                                                        color: '#f4f4f5',
                                                                        confirmButtonColor: '#ef4444'
                                                                    });
                                                                }
                                                            }, 1200);
                                                        }}
                                                        className="w-full bg-indigo-600 hover:bg-indigo-500 transition-all h-11 rounded-xl text-white font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 mt-6 cursor-pointer"
                                                    >
                                                        {isSimulateLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <>Iniciar Sesión <ArrowRight size={14} /></>}
                                                    </button>

                                                    <div className="pt-6 border-t border-zinc-850 flex items-center justify-between text-[10px] text-zinc-500 leading-none">
                                                        <span className="font-mono">Soporte Corporativo</span>
                                                        <div className="flex items-center gap-1.5 font-semibold text-zinc-450">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span>En línea</span>
                                                        </div>
                                                    </div>

                                                </div>

                                            </div>
                                        </div>

                                    </div>

                                </div>

                            </div>
                        )}

                        {/* NEXT.JS SOURCE CODE PREVIEW DETAILS TAB */}
                        {activeTab === 'code' && (
                            <div className="space-y-4 animate-fade-in text-left">
                                <div className="bg-[#0b0b0d] rounded-2xl border border-zinc-90 w-full p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-indigo-505/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                                            <Code className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white leading-tight">Código Login ("Sophisticated Dark")</h3>
                                            <p className="text-[11px] text-zinc-400">Totalmente compatible con la sintaxis Next.js Client-Side Component.</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => copyToClipboard('login')}
                                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-650/10"
                                    >
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        <span>{copied ? '¡Copiado!' : 'Copiar Login Code'}</span>
                                    </button>
                                </div>

                                <div className="rounded-2xl border border-zinc-900 bg-[#08080a] overflow-hidden text-xs font-mono select-text">
                                    <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-900/80 flex justify-between items-center text-zinc-400">
                                        <span className="text-[10px] font-bold text-zinc-500 font-mono uppercase tracking-wider">src/app/login/page.tsx</span>
                                        <span className="text-[10px] text-indigo-455 bg-indigo-500/10 px-2 py-0.5 rounded font-bold border border-indigo-500/10">CSS Grid Layout</span>
                                    </div>
                                    <pre className="p-4 sm:p-6 overflow-x-auto max-h-[550px] leading-relaxed text-zinc-300">{loginCodeTemplate}</pre>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* FOOTER GENERAL */}
            <footer className="border-t border-zinc-900 mt-20 py-10 text-center font-normal">
                <p className="text-xs text-zinc-500 font-mono">
                    Consola del Sistema de Logística VERCO © 2026. Diseñado bajo las pautas de <strong className="text-indigo-450 font-bold">Sophisticated Dark Theme</strong>.
                </p>
            </footer>

        </div>
    );
}
