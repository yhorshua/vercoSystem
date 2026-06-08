
// Simple module for registering "abono" (payment installment)

export interface Abono {
	id: string; // unique id
	cuentaId: string; // account id
	fecha: string; // ISO date
	monto: number; // positive amount
	comentario?: string;
}

// In-memory store (replace with real DB in production)
const store: Abono[] = [];

// Utils
export function formatCurrency(value: number): string {
	return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
}

export function validarAbono(payload: Partial<Abono>): { ok: boolean; errores?: string[] } {
	const errores: string[] = [];
	if (!payload.cuentaId) errores.push('cuentaId es requerido');
	if (!payload.monto && payload.monto !== 0) errores.push('monto es requerido');
	else if (typeof payload.monto !== 'number' || isNaN(payload.monto) || payload.monto <= 0) errores.push('monto debe ser un número positivo');
	if (!payload.fecha) errores.push('fecha es requerida');
	else if (isNaN(Date.parse(payload.fecha))) errores.push('fecha inválida');
	return { ok: errores.length === 0, errores: errores.length ? errores : undefined };
}

// Create and save a new abono
export function registrarAbono(input: Partial<Abono>): { ok: boolean; abono?: Abono; errores?: string[] } {
	const v = validarAbono(input);
	if (!v.ok) return { ok: false, errores: v.errores };

	const abono: Abono = {
		id: generateId(),
		cuentaId: input.cuentaId as string,
		fecha: new Date(input.fecha as string).toISOString(),
		monto: Number((input.monto as number)),
		comentario: input.comentario?.toString(),
	};

	store.push(abono);
	return { ok: true, abono };
}

export function listarAbonos(cuentaId?: string): Abono[] {
	if (!cuentaId) return [...store];
	return store.filter(a => a.cuentaId === cuentaId);
}

export function obtenerPorId(id: string): Abono | undefined {
	return store.find(a => a.id === id);
}

function generateId(): string {
	return 'ab-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// Example quick CLI-like helper (not executed automatically)
export function ejemplo(): void {
	// ejemplo de uso
	const res = registrarAbono({ cuentaId: 'cta-123', fecha: new Date().toISOString(), monto: 50000, comentario: 'Pago parcial' });
	if (res.ok) console.log('Abono registrado:', res.abono);
	else console.warn('Errores:', res.errores);
}

export default { registrarAbono, listarAbonos, obtenerPorId, validarAbono, formatCurrency };
