
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

export interface FormState {
  email: string;
  country: string;
  immediateBoss: string;
  reason: RequestReason | '';
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
