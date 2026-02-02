
export type RequestReason =
  | 'Vacaciones'
  | 'Permiso'
  | 'Incapacidad'
  | 'Renuncia'
  | 'Duelo/Matrimonio/Nacimiento'
  | 'Pre-aprobado'
  | 'Home Office'
  | 'Consulta Médica - Emergencia'
  | 'Otras Solicitudes de Colaborador'
  | 'Otras Solicitudes de Jefatura'
  | 'Goce de dias libres compensatorios';

export type VacationType = 
  | 'vacaciones-dias'
  | 'pago-prima-vacacional'
  | 'ambos'
  | '';

export interface FormState {
  email: string;
  country: string;
  immediateBoss: string;
  bossEmail?: string; // Email del jefe inmediato
  reason: RequestReason | '';
  vacationType?: VacationType; // Tipo de vacaciones
  paymentDate?: string; // Fecha de pago de prima vacacional
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  incapacityDays?: string;
  comments: string;
  attachment?: File | null;
  // Legacy fields for backward compatibility if needed in UI logic
  vacationPeriod?: string;
}
