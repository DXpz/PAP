
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Upload,
  CheckCircle2,
  FileText,
  X,
  Loader2,
  Mail,
  MessageSquare,
  Clock,
  Send,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { FormState, RequestReason } from '../types';

const LOGO_URL = 'https://static.wixstatic.com/media/98a19d_504d5e7478054d2484448813ac235267~mv2.png';
const WEBHOOK_URL = 'https://hook.eu2.make.com/8pscatpux73uutt3ce8skn4x7k4titqf';
const DAYS_CHECK_WEBHOOK_URL = 'https://hook.eu2.make.com/7d9teuqggxkga8z9ocrffbudympskxo0';
const COMMENT_VALIDATION_WEBHOOK_URL = 'https://hook.eu2.make.com/8bki1qcnemxr5ba38vq72sswgsthopb2';
const PRIMA_VACACIONAL_WEBHOOK_URL = 'https://hook.eu2.make.com/bii2oymlshyggtouwvaca4i8na3hm021';
const BOSSES_API_URL = '/api/getActiveUsers';
const TITLE_TYPING = 'Acción de Personal';
const TYPING_SPEED_MS = 55;
const CURSOR_BLINK_MS = 530;

/** Formato global de fechas: DD/MM/YYYY */
function formatDateDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

/** Dado una fecha (YYYY-MM-DD), devuelve el siguiente día hábil (lunes a viernes). Si termina viernes → lunes; sábado/domingo → lunes */
function getNextBusinessDay(isoDate: string): Date {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

/** Parsea DD/MM/YYYY o D/M/YYYY a YYYY-MM-DD; devuelve '' si no es válido */
function parseDDMMYYYYToISO(str: string): string {
  if (!str || typeof str !== 'string') return '';
  const parts = str.trim().split(/[/\-.]/);
  if (parts.length !== 3) return '';
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  let y = parseInt(parts[2], 10);
  if (y >= 0 && y < 100) y += 2000;
  if (isNaN(d) || isNaN(m) || isNaN(y) || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) return '';
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Input de fecha que muestra y acepta DD/MM/YYYY; value/onChange en YYYY-MM-DD; incluye botón de calendario. min/max en YYYY-MM-DD */
function DateInputDDMMYYYY({
  value,
  onChange,
  className,
  required,
  placeholder = 'DD/MM/YYYY',
  'aria-label': ariaLabel,
  min,
  max
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  required?: boolean;
  placeholder?: string;
  'aria-label'?: string;
  min?: string;
  max?: string;
}) {
  const [display, setDisplay] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      try {
        const d = new Date(value + 'T12:00:00');
        if (!isNaN(d.getTime())) setDisplay(formatDateDDMMYYYY(d));
        else setDisplay('');
      } catch {
        setDisplay('');
      }
    } else setDisplay('');
  }, [value]);

  const handleBlur = () => {
    const iso = parseDDMMYYYYToISO(display);
    if (iso) {
      if (min && iso < min) {
        setDisplay(value ? formatDateDDMMYYYY(new Date(value + 'T12:00:00')) : '');
        return;
      }
      if (max && iso > max) {
        setDisplay(value ? formatDateDDMMYYYY(new Date(value + 'T12:00:00')) : '');
        return;
      }
      onChange(iso);
      setDisplay(formatDateDDMMYYYY(new Date(iso + 'T12:00:00')));
    } else if (value) setDisplay(formatDateDDMMYYYY(new Date(value + 'T12:00:00')));
    else setDisplay('');
  };

  const openCalendar = () => {
    dateInputRef.current?.showPicker?.();
  };

  return (
    <div className="relative flex items-stretch">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`${className ?? ''} pr-12`}
        value={display}
        onChange={(e) => setDisplay(e.target.value.replace(/[^\d/.-]/g, ''))}
        onBlur={handleBlur}
      />
      <input
        ref={dateInputRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute right-0 top-0 w-12 h-full opacity-0 pointer-events-none"
        style={{ minWidth: 48 }}
        value={value || ''}
        min={min}
        max={max}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          if (min && v < min) return;
          if (max && v > max) return;
          onChange(v);
        }}
      />
      <button
        type="button"
        onClick={openCalendar}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-[#E60000] hover:bg-black/5 transition-colors"
        aria-label="Abrir calendario"
      >
        <Calendar size={20} />
      </button>
    </div>
  );
}

/** Genera opciones de hora desde las 6:00 AM hasta las 12:00 AM (medianoche) solo horas completas (sin minutos) */
function generateTimeOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  for (let hour = 6; hour <= 23; hour++) {
    const hourStr = String(hour).padStart(2, '0');
    const value = `${hourStr}:00`;
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour === 12 ? 12 : hour > 12 ? hour - 12 : hour;
    const label = `${displayHour}:00 ${period}`;
    options.push({ value, label });
  }
  // Medianoche (12:00 AM)
  options.push({ value: '24:00', label: '12:00 AM (Medianoche)' });
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

const INITIAL_FORM_STATE: FormState = {
  email: '',
  country: '',
  immediateBoss: '',
  reason: '',
  vacationType: '',
  paymentDate: '',
  comments: '',
  attachment: null,
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  incapacityDays: ''
};

interface ActionPortalProps {
  theme: 'dark' | 'light';
}

export const ActionPortal: React.FC<ActionPortalProps> = ({ theme }) => {
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [bosses, setBosses] = useState<Array<{ name: string, email: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingDays, setIsCheckingDays] = useState(false);
  const [isLoadingBosses, setIsLoadingBosses] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showRejectionAnimation, setShowRejectionAnimation] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [showDaysAvailableAnimation, setShowDaysAvailableAnimation] = useState(false);
  const [diasPendientes, setDiasPendientes] = useState<number | null>(null);
  const [daysAvailableInfo, setDaysAvailableInfo] = useState<{
    remainingDays?: number;
    requestedDays?: number;
    message?: string;
    /** Fecha oficial de retorno enviada por el webhook, ya formateada en DD/MM/YYYY */
    returnDateText?: string;
  } | null>(null);
  const [isValidatingComment, setIsValidatingComment] = useState(false);
  const [showCommentSuccessAnimation, setShowCommentSuccessAnimation] = useState(false);
  const [showCommentRejectionAnimation, setShowCommentRejectionAnimation] = useState(false);
  const [showEmergencyAttachment, setShowEmergencyAttachment] = useState(false);
  const [commentValidationMessage, setCommentValidationMessage] = useState('');
  const [commentValidated, setCommentValidated] = useState(false);
  const [daysValidated, setDaysValidated] = useState(false);
  const [typedTitleLength, setTypedTitleLength] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [typingBossText, setTypingBossText] = useState('');
  const [typingBossLength, setTypingBossLength] = useState(0);
  const typingBossEmailRef = useRef('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetchDoneRef = useRef(false);
  const emailToJefeRef = useRef<Map<string, { nombre_jefe: string; correo_jefe: string }>>(new Map());
  /** Mapa email del usuario (de la API) -> área, para buscar nombre y área del jefe por su correo */
  const emailToAreaRef = useRef<Map<string, string>>(new Map());
  const lastDaysCheckRef = useRef<{ start: string; end: string; ok: boolean } | null>(null);
  const daysCheckDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentValidationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primaVacacionalDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isCheckingPrima, setIsCheckingPrima] = useState(false);
  const [primaVacacionalInfo, setPrimaVacacionalInfo] = useState<string | null>(null);

  useEffect(() => {
    if (typedTitleLength >= TITLE_TYPING.length) return;
    const t = setTimeout(() => setTypedTitleLength((n) => n + 1), TYPING_SPEED_MS);
    return () => clearTimeout(t);
  }, [typedTitleLength]);

  useEffect(() => {
    if (typedTitleLength < TITLE_TYPING.length) return;
    const t = setInterval(() => setCursorVisible((v) => !v), CURSOR_BLINK_MS);
    return () => clearInterval(t);
  }, [typedTitleLength]);

  useEffect(() => {
    if (!typingBossText || typingBossLength >= typingBossText.length) return;
    const t = setTimeout(() => setTypingBossLength((n) => n + 1), TYPING_SPEED_MS);
    return () => clearTimeout(t);
  }, [typingBossText, typingBossLength]);

  useEffect(() => {
    if (!typingBossText || typingBossLength < typingBossText.length) return;
    setForm(prev => ({ ...prev, immediateBoss: typingBossText, bossEmail: typingBossEmailRef.current }));
    setTypingBossText('');
    setTypingBossLength(0);
  }, [typingBossText, typingBossLength]);

  const getStr = (item: any, ...keys: string[]) => {
    if (!item || typeof item !== 'object') return '';
    for (const k of keys) if (item[k] != null && String(item[k]).trim() !== '') return String(item[k]).trim();
    return '';
  };

  const validateVacationDays = useCallback(async (): Promise<boolean> => {
    if (form.reason !== 'Vacaciones' || !form.startDate || !form.endDate) {
      return true;
    }

    try {
      setIsCheckingDays(true);
      const checkPayload = {
        email: form.email,
        country: form.country,
        startDate: form.startDate,
        endDate: form.endDate,
        immediateBoss: form.immediateBoss,
      };

      const checkResponse = await fetch(DAYS_CHECK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkPayload),
      });

      // Leer el cuerpo como texto primero para poder intentar múltiples parseos
      const rawText = await checkResponse.text();

      let checkData: any = null;
      try {
        checkData = JSON.parse(rawText);
      } catch {
        // Si no es JSON válido, dejamos checkData en null
      }

      setIsCheckingDays(false);

      // tiene_dias_disponibles es la única fuente de verdad.
      // Si no se puede determinar con certeza que es true, se rechaza (fail-safe).
      let notAvailable: boolean;

      // Palabras clave que indican rechazo en Status / estatus
      const REJECTION_KEYWORDS = ['no aprobado', 'sin saldo', 'excedente', 'rechazado', 'denied', 'insuficiente'];
      const isRejectionStatus = (val: string) =>
        REJECTION_KEYWORDS.some(k => val.toLowerCase().includes(k));

      if (checkData !== null && 'tiene_dias_disponibles' in checkData) {
        const raw = checkData.tiene_dias_disponibles;
        const tieneDias = raw === true || raw === 'true' || raw === 1;

        // Aunque tiene_dias_disponibles sea true, verificar Status/estatus
        const status: string =
          checkData?.resultado?.estatus ||
          checkData?.Status ||
          checkData?.status ||
          checkData?.resultado?.Status ||
          '';

        notAvailable = !tieneDias || (!!status && isRejectionStatus(status));
      } else if (checkData === null && rawText) {
        const lower = rawText.toLowerCase();
        if (lower.includes('tiene_dias_disponibles')) {
          const hasTrueFlag = lower.includes('tiene_dias_disponibles') && lower.includes('true');
          const hasRejection = REJECTION_KEYWORDS.some(k => lower.includes(k));
          notAvailable = !hasTrueFlag || hasRejection;
        } else {
          notAvailable = true;
        }
      } else if (!checkResponse.ok) {
        notAvailable = true;
      } else {
        notAvailable = true;
      }

      // Helper: extraer dias_pendientes_actuales con fallback a rawText si JSON malformado
      const extractDiasPendientes = (): number | null => {
        if (checkData !== null) {
          const val = checkData?.dias_pendientes_actuales ?? checkData?.Dias_pendientes ?? checkData?.dias_pendientes ?? checkData?.dias_disponibles;
          if (val !== undefined && val !== null) return Number(val);
        }
        const match = rawText.match(/dias_pendientes_actuales\s*[":]*\s*(\d+)/i) ||
                      rawText.match(/Dias_pendientes\s*[":]*\s*(\d+)/i);
        return match ? Number(match[1]) : null;
      };

      // Helper: extraer fecha_retorno_oficial desde resultado o raíz
      const extractReturnDate = (): string | undefined => {
        const raw = checkData?.resultado?.fecha_retorno_oficial ?? checkData?.fecha_retorno_oficial;
        if (typeof raw !== 'string' || !raw.trim() || raw.trim().toLowerCase() === 'n/a') return undefined;
        const iso = parseDDMMYYYYToISO(raw.trim());
        return iso ? formatDateDDMMYYYY(new Date(iso + 'T12:00:00')) : raw.trim();
      };

      if (notAvailable) {
        const diasPend = extractDiasPendientes();
        setDiasPendientes(diasPend);

        // Mensaje de rechazo: prioridad → resultado.mensaje → resultado.estatus → genérico
        const mensajeRechazo =
          checkData?.resultado?.mensaje ||
          checkData?.resultado?.estatus ||
          checkData?.message || checkData?.error ||
          'Los días solicitados superan tu saldo de días disponibles.';
        setRejectionMessage(mensajeRechazo);
        setShowRejectionAnimation(true);
        setTimeout(() => {
          setShowRejectionAnimation(false);
          setRejectionMessage('');
        }, 4200);
        setDaysValidated(false);
        return false;
      }

      // Aprobado — limpiar pendientes y guardar info
      setDiasPendientes(null);
      setDaysAvailableInfo({
        remainingDays: checkData?.dias_pendientes_actuales ?? checkData?.Dias_pendientes ?? checkData?.dias_disponibles,
        requestedDays: checkData?.dias_solicitados ?? checkData?.Dias_solicitados ?? checkData?.requestedDays,
        message: checkData?.resultado?.mensaje || checkData?.message,
        returnDateText: extractReturnDate(),
      });
      setShowDaysAvailableAnimation(true);
      setTimeout(() => {
        setShowDaysAvailableAnimation(false);
        setDaysValidated(true);
      }, 3500);

      return true;
    } catch (error) {
      console.error('Error al verificar días disponibles:', error);
      setIsCheckingDays(false);
      setRejectionMessage('No se pudo verificar tu saldo de días. Intenta de nuevo.');
      setShowRejectionAnimation(true);
      setTimeout(() => {
        setShowRejectionAnimation(false);
        setRejectionMessage('');
      }, 4200);
      return false;
    }
  }, [form.reason, form.startDate, form.endDate, form.email, form.country, form.immediateBoss]);

  useEffect(() => {
    if (fetchDoneRef.current) return;
    fetchDoneRef.current = true;

    const fetchBosses = async () => {
      try {
        setIsLoadingBosses(true);
        const response = await fetch(BOSSES_API_URL, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          const rawData = Array.isArray(result) ? result : (result.data || result.users || result.result || []);
          const jefesKeywords = ['JEFE', 'GERENTE', 'DIRECTOR', 'LIDER', 'SUPERVISOR', 'COORDINADOR', 'MANAGER', 'HEAD'];

          const map = new Map<string, { nombre_jefe: string; correo_jefe: string }>();
          const emailToArea = new Map<string, string>();
          rawData.forEach((item: any) => {
            const email = getStr(item, 'email', 'correo', 'anamai', 'mail');
            const nombreJefe = getStr(item, 'Nombre_jefe', 'nombre_jefe', 'nombreJefe');
            const correoJefe = getStr(item, 'Correo_jefe', 'correo_jefe', 'correoJefe');
            if (email && nombreJefe) map.set(email.toLowerCase(), { nombre_jefe: nombreJefe, correo_jefe: correoJefe });
            const area = getStr(item, 'area', 'anarea', 'department', 'departamento');
            if (email) emailToArea.set(email.toLowerCase(), area);
          });
          emailToJefeRef.current = map;
          emailToAreaRef.current = emailToArea;

          const formattedBosses = rawData
            .filter((item: any) => {
              if (!item || typeof item !== 'object') return false;
              const cargo = getStr(item, 'position', 'cargo', 'puesto', 'anapos', 'titulo').toUpperCase();
              return jefesKeywords.some(keyword => cargo.includes(keyword));
            })
            .map((item: any) => {
              const nombre = getStr(item, 'name', 'nombre', 'ananam', 'fullName', 'nombre_completo') || 'Nombre no disponible';
              const cargo = getStr(item, 'position', 'cargo', 'anapos', 'puesto', 'titulo');
              const email = getStr(item, 'email', 'correo', 'anamai', 'mail');

              let displayName = nombre;
              if (cargo && nombre !== 'Nombre no disponible') displayName = `${nombre} - ${cargo}`;

              return { name: displayName, email };
            })
            .filter((boss: any) => boss.name && boss.name !== 'Nombre no disponible' && boss.email);

          setBosses(formattedBosses);
        } else {
          setBosses([{ name: "Error de autorización API", email: "" }]);
        }
      } catch (error) {
        setBosses([{ name: "Error de conexión. Por favor, recarga la página.", email: "" }]);
      } finally {
        setIsLoadingBosses(false);
      }
    };

    fetchBosses();
  }, []);

  // Validar días disponibles en tiempo real cuando se selecciona un rango de Vacaciones
  useEffect(() => {
    if (form.reason === 'Vacaciones' && form.startDate && form.endDate) {
      void validateVacationDays();
    }
  }, [form.reason, form.startDate, form.endDate, validateVacationDays]);

  // Consultar webhook de prima vacacional con delay de 3s al seleccionarla
  useEffect(() => {
    if (primaVacacionalDebounceRef.current) clearTimeout(primaVacacionalDebounceRef.current);
    setPrimaVacacionalInfo(null);

    if (form.reason === 'Vacaciones' && (form.vacationType === 'pago-prima-vacacional' || form.vacationType === 'ambos')) {
      primaVacacionalDebounceRef.current = setTimeout(async () => {
        try {
          setIsCheckingPrima(true);
          const payload = {
            email: form.email,
            nombre: form.immediateBoss,
            pais: form.country,
            jefe_inmediato: form.immediateBoss,
            correo_jefe: form.bossEmail,
            tipo_solicitud: form.vacationType,
          };
          const res = await fetch(PRIMA_VACACIONAL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const text = await res.text();
          let msg: string | null = null;
          try {
            const data = JSON.parse(text);
            msg = data?.mensaje || data?.message || data?.resultado || null;
          } catch {
            if (text && text.trim()) msg = text.trim();
          }
          setPrimaVacacionalInfo(msg);
        } catch {
          setPrimaVacacionalInfo(null);
        } finally {
          setIsCheckingPrima(false);
        }
      }, 3000);
    }

    return () => {
      if (primaVacacionalDebounceRef.current) clearTimeout(primaVacacionalDebounceRef.current);
    };
  }, [form.reason, form.vacationType, form.email, form.immediateBoss, form.country, form.bossEmail]);

  const reasonsRequiringEvidence: RequestReason[] = [
    'Permiso', 'Incapacidad', 'Renuncia', 'Duelo/Matrimonio/Nacimiento', 'Pre-aprobado',
    'Goce de dias libres compensatorios', 'Otras Solicitudes de Colaborador', 'Otras Solicitudes de Jefatura'
  ];

  const handleEmailChange = (value: string) => {
    const trimmedEmail = value.trim();
    let detectedCountry = '';
    const lowerEmail = trimmedEmail.toLowerCase();
    if (lowerEmail.includes('.sv')) detectedCountry = 'El Salvador';
    else if (lowerEmail.includes('.gt')) detectedCountry = 'Guatemala';

    const jefeInfo = trimmedEmail ? emailToJefeRef.current.get(lowerEmail) : null;

    // Leer el estado actual del jefe ANTES de actualizar
    const teniáJefe = !!form.immediateBoss;
    const perdióJefe = !jefeInfo && teniáJefe;

    if (perdióJefe) {
      // Cancelar debounces pendientes
          if (daysCheckDebounceRef.current) clearTimeout(daysCheckDebounceRef.current);
          if (commentValidationDebounceRef.current) clearTimeout(commentValidationDebounceRef.current);
          if (primaVacacionalDebounceRef.current) clearTimeout(primaVacacionalDebounceRef.current);
          setPrimaVacacionalInfo(null);
          setIsCheckingPrima(false);
      // Resetear todos los estados derivados
      setDaysValidated(false);
      setCommentValidated(false);
      setDaysAvailableInfo(null);
      setDiasPendientes(null);
      setCommentValidationMessage('');
      setShowEmergencyAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Resetear el formulario completo manteniendo solo el email nuevo
      setForm(prev => ({
        ...prev,
        email: trimmedEmail,
        country: detectedCountry,
        immediateBoss: '',
        bossEmail: '',
        reason: '',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        comments: '',
        attachment: null,
        incapacityDays: '',
        vacationType: '',
        paymentDate: '',
      }));
      return;
    }

    // Sin cambio de jefe: solo actualizar email y país
    setForm(prev => ({
      ...prev,
      email: trimmedEmail,
      country: detectedCountry,
      ...(!jefeInfo && { immediateBoss: '', bossEmail: '' }),
    }));

    if (jefeInfo) {
      typingBossEmailRef.current = jefeInfo.correo_jefe;
      const correoJefe = (jefeInfo.correo_jefe || '').toLowerCase();
      const area = correoJefe ? emailToAreaRef.current.get(correoJefe) : '';
      const nombreJefe = jefeInfo.nombre_jefe.includes(' - ') ? jefeInfo.nombre_jefe.split(' - ')[0] : jefeInfo.nombre_jefe;
      const textToShow = area ? `${nombreJefe} - ${area}` : jefeInfo.nombre_jefe;
      setTypingBossText(textToShow);
      setTypingBossLength(0);
    }
  };

  const validateComment = async (comment: string): Promise<boolean> => {
    if (!form.reason || !comment.trim()) {
      setCommentValidationMessage('');
      return false;
    }

    return new Promise((resolve) => {
      (async () => {
        try {
          setIsValidatingComment(true);
          setCommentValidationMessage('');

          const validationPayload = {
            motivo: form.reason,
            tipoGestion: form.reason,
            comentario: comment.trim(),
          };

          const response = await fetch(COMMENT_VALIDATION_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validationPayload),
          });

          let validationData: any = null;
          let responseText = '';
          
          try {
            // Intentar obtener el texto primero
            responseText = await response.text();
            
            // Intentar parsear como JSON
            if (responseText.trim()) {
              try {
                validationData = JSON.parse(responseText);
              } catch (jsonError) {
                // Si no es JSON, tratar el texto como el resultado
                validationData = { Resultado: responseText.trim() };
              }
            }
          } catch (error) {
            console.error('Error al leer respuesta:', error);
          }

          setIsValidatingComment(false);

          // Obtener el campo Resultado (priorizar mayúsculas, luego minúsculas)
          const resultado = validationData?.Resultado || validationData?.resultado || '';
          const resultadoText = String(resultado).toLowerCase().trim();
          
          // Función auxiliar para limpiar mensajes
          const cleanMessage = (msg: string): string => {
            if (!msg) return '';
            
            // Detectar si el mensaje contiene el formato { "Resultado": aceptado } o similar
            const jsonMatch = msg.match(/\{\s*["']?Resultado["']?\s*:\s*["']?([^"'}]+)["']?\s*\}/i);
            if (jsonMatch) {
              const resultado = jsonMatch[1].toLowerCase().trim();
              // Si es solo "aceptado" o "rechazado", devolver vacío (el título ya lo indica)
              if (resultado === 'aceptado' || resultado === 'rechazado') {
                return '';
              }
              return jsonMatch[1].trim();
            }
            
            // Intentar parsear como JSON si parece ser un objeto JSON
            try {
              const parsed = JSON.parse(msg);
              if (parsed && typeof parsed === 'object') {
                // Si es un objeto con Resultado, extraer solo el valor
                const resultado = parsed.Resultado || parsed.resultado || '';
                if (resultado) {
                  const resultadoStr = String(resultado).toLowerCase().trim();
                  // Si solo dice "aceptado" o "rechazado", devolver vacío (el título ya lo indica)
                  if (resultadoStr === 'aceptado' || resultadoStr === 'rechazado') {
                    return '';
                  }
                  return String(resultado);
                }
                // Si hay otros campos como message, usarlos
                return parsed.message || parsed.Message || parsed.body || parsed.Body || '';
              }
            } catch {
              // No es JSON válido, continuar con limpieza de texto
            }
            
            // Remover "Resultado:" o "resultado:" del inicio
            let cleaned = msg.replace(/^resultado\s*:\s*/i, '').trim();
            // Remover llaves y comillas si parece JSON
            cleaned = cleaned.replace(/^[\{\[\s]*["']?resultado["']?\s*:\s*["']?/i, '').replace(/["']?\s*[\}\]]*$/, '').trim();
            
            // Si solo dice "Aceptado" o "Rechazado", devolver vacío (el título ya lo indica)
            const cleanedLower = cleaned.toLowerCase();
            if (cleanedLower === 'aceptado' || cleanedLower === 'rechazado') {
              return '';
            }
            
            // Si contiene solo el resultado sin contexto útil, devolver vacío
            if (cleanedLower.match(/^[\{\[]?\s*["']?resultado["']?\s*:\s*["']?(aceptado|rechazado)["']?\s*[\}\]]?$/i)) {
              return '';
            }
            
            return cleaned;
          };
          
          // Verificar PRIMERO el campo Resultado directamente
          if (resultadoText.includes('aceptado')) {
            // Aceptado: mostrar animación de éxito
            const rawMsg = validationData?.message || validationData?.Body || validationData?.body || resultado || '';
            const successMsg = cleanMessage(rawMsg);
            setCommentValidationMessage(successMsg);
            setShowCommentSuccessAnimation(true);
            setTimeout(() => {
              setShowCommentSuccessAnimation(false);
              setCommentValidationMessage('');
              setCommentValidated(true);
              resolve(true);
            }, 3200);
            return;
          }
          
          if (resultadoText.includes('rechazado')) {
            // Rechazado: mostrar animación de rechazo
            const rawMsg = validationData?.message || validationData?.error || validationData?.Body || validationData?.body || resultado || '';
            const errorMsg = cleanMessage(rawMsg);
            setCommentValidationMessage(errorMsg);
            setShowCommentRejectionAnimation(true);
            setTimeout(() => {
              setShowCommentRejectionAnimation(false);
              setCommentValidationMessage('');
              setCommentValidated(false);
              resolve(false);
            }, 4200);
            return;
          }
          
          // Si no hay campo Resultado, usar lógica de fallback
          const bodyText = String(validationData?.Body || validationData?.body || '').toLowerCase().trim();
          const hasValidFlag = validationData?.valid === true || validationData?.approved === true;
          const hasRejectedFlag = validationData?.valid === false || validationData?.approved === false;
          
          if (hasRejectedFlag || bodyText.includes('rechazado')) {
            const rawMsg = validationData?.message || validationData?.error || validationData?.Body || validationData?.body || '';
            const errorMsg = cleanMessage(rawMsg);
            setCommentValidationMessage(errorMsg);
            setShowCommentRejectionAnimation(true);
            setTimeout(() => {
              setShowCommentRejectionAnimation(false);
              setCommentValidationMessage('');
              setCommentValidated(false);
              resolve(false);
            }, 4200);
            return;
          }
          
          if (hasValidFlag || bodyText.includes('aceptado') || (response.ok && validationData)) {
            const rawMsg = validationData?.message || validationData?.Body || validationData?.body || '';
            const successMsg = cleanMessage(rawMsg);
            setCommentValidationMessage(successMsg);
            setShowCommentSuccessAnimation(true);
            setTimeout(() => {
              setShowCommentSuccessAnimation(false);
              setCommentValidationMessage('');
              setCommentValidated(true);
              resolve(true);
            }, 3200);
            return;
          }
          
          // Por defecto, rechazar
          const rawMsg = validationData?.message || validationData?.error || validationData?.Body || validationData?.body || '';
          const errorMsg = cleanMessage(rawMsg);
          setCommentValidationMessage(errorMsg);
          setShowCommentRejectionAnimation(true);
          setTimeout(() => {
            setShowCommentRejectionAnimation(false);
            setCommentValidationMessage('');
            setCommentValidated(false);
            resolve(false);
          }, 4200);
          return;
        } catch (error) {
          console.error('Error al validar comentario:', error);
          setIsValidatingComment(false);
          setCommentValidationMessage('No se pudo validar tu justificación. Intenta de nuevo.');
          setShowCommentRejectionAnimation(true);
          setTimeout(() => {
            setShowCommentRejectionAnimation(false);
            setCommentValidationMessage('');
            setCommentValidated(false);
            resolve(false);
          }, 4200);
        }
      })();
    });
  };

  const handleInputChange = (field: keyof FormState, value: any) => {
    if (field === 'email') {
      handleEmailChange(value);
    } else if (field === 'immediateBoss') {
      // Extraer el email del jefe seleccionado
      const selectedBoss = bosses.find(boss => boss.name === value);
      setForm(prev => ({
        ...prev,
        immediateBoss: value,
        bossEmail: selectedBoss?.email || ''
      }));
      return;
    } else {
      setForm(prev => {
        const newForm = { ...prev, [field]: value };

        // Limpiar todo al cambiar de tipo de gestión
        if (field === 'reason') {
          newForm.startDate = '';
          newForm.endDate = '';
          newForm.startTime = '';
          newForm.endTime = '';
          newForm.comments = '';
          newForm.attachment = null;
          newForm.incapacityDays = '';
          newForm.vacationType = '';
          newForm.paymentDate = '';
          setDaysValidated(false);
          setCommentValidated(false);
          setDaysAvailableInfo(null);
          setDiasPendientes(null);
          setCommentValidationMessage('');
          setShowEmergencyAttachment(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
        
        // Resetear validación de días y comentarios si cambian las fechas en Vacaciones
        if ((field === 'startDate' || field === 'endDate') && prev.reason === 'Vacaciones') {
          setDaysValidated(false);
          setCommentValidated(false);
          setDiasPendientes(null);
        }
        
        // Resetear validación de comentarios si cambia el comentario
        if (field === 'comments') {
          setCommentValidated(false);
        }

        // Calcular días automáticamente si es incapacidad
        if ((field === 'startDate' || field === 'endDate') && prev.reason === 'Incapacidad') {
          const start = field === 'startDate' ? value : prev.startDate;
          const end = field === 'endDate' ? value : prev.endDate;

          if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días
            newForm.incapacityDays = diffDays.toString();
          }
        }

        return newForm;
      });
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setForm(INITIAL_FORM_STATE);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isCheckingDays) return;

    // Validar días disponibles para Vacaciones también al enviar (por seguridad)
    if (form.reason === 'Vacaciones') {
      const ok = await validateVacationDays();
      if (!ok) return;
    }

    setIsSubmitting(true);

    try {
      let base64File = null;
      if (form.attachment) {
        base64File = await fileToBase64(form.attachment);
      }

      const now = new Date();
      const fechaCreacion = formatDateDDMMYYYY(now);

      // Para Consulta Médica - Emergencia sin adjunto, no enviar campos de archivo
      const isEmergencyWithoutFile = form.reason === 'Consulta Médica - Emergencia' && !form.attachment;

      const payload = {
        ...form,
        vacationType: form.reason === 'Vacaciones' ? (form.vacationType || 'vacaciones-dias') : form.vacationType,
        paymentDate: (() => {
          if (form.reason === 'Vacaciones' && (form.vacationType === 'pago-prima-vacacional' || form.vacationType === 'ambos')) {
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return formatDateDDMMYYYY(lastDay);
          }
          return form.paymentDate || undefined;
        })(),
        fecha_creacion: fechaCreacion,
        submittedAt: now.toISOString(),
        ...(!isEmergencyWithoutFile && {
          attachmentName: form.attachment?.name || null,
          attachmentData: base64File,
        }),
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Verificar si la respuesta es exitosa
      if (response.ok) {
        // Intentar leer la respuesta como JSON para verificar si hay error del backend
        try {
          const result = await response.json();

          // Verificar si el webhook devolvió un error (correo no encontrado)
          if (result.error || result.status === 'error' || result.success === false) {
            setIsSubmitting(false);
            setRejectionMessage(result.message || 'Correo Inválido');
            setShowRejectionAnimation(true);
            setTimeout(() => {
              setShowRejectionAnimation(false);
              setRejectionMessage('');
            }, 4200); // 1 segundo más que la animación de éxito
            return;
          }
        } catch (e) {
          // Si no es JSON, asumimos que es exitoso
        }

        // Éxito
        setIsSubmitting(false);
        setShowSuccessAnimation(true);
        setTimeout(() => {
          setShowSuccessAnimation(false);
          setSubmitted(true);
        }, 3200);
      } else {
        // Error HTTP (400, 404, 500, etc)
        let errorMessage = 'Correo Inválido';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Si no se puede parsear, usar mensaje por defecto
        }

        setIsSubmitting(false);
        setRejectionMessage(errorMessage);
        setShowRejectionAnimation(true);
        setTimeout(() => {
          setShowRejectionAnimation(false);
          setRejectionMessage('');
        }, 4200);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsSubmitting(false);
      setRejectionMessage('Error de conexión');
      setShowRejectionAnimation(true);
      setTimeout(() => {
        setShowRejectionAnimation(false);
        setRejectionMessage('');
      }, 4200);
    }
  };

  const isFormValid = () => {
    const basicFields = form.email && form.country && form.immediateBoss && form.reason && form.comments.trim().length > 0;
    if (!basicFields) return false;

    // Validación para Vacaciones
    if (form.reason === 'Vacaciones') {
      if (!form.vacationType) return false;
      // Para solo pago de prima vacacional no se requieren fechas
      if (form.vacationType === 'pago-prima-vacacional') return true;
      // Para días o ambos: validar fechas
      if (!form.startDate || !form.endDate) return false;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const minStart = tomorrow.toISOString().slice(0, 10);
      if (form.startDate < minStart) return false;
      const minEnd = form.startDate >= minStart ? form.startDate : minStart;
      if (form.endDate < minEnd) return false;
      if (!daysValidated) return false;
      return true;
    }

    // Validaciones específicas para Permiso (solo una fecha)
    if (form.reason === 'Permiso') {
      if (!form.startDate) return false;
      // Para Permiso, endDate debe ser igual a startDate (se establece automáticamente)
      if (form.endDate !== form.startDate) return false;
      
      // Validar que fecha no sea antes de hoy (se puede seleccionar hoy, pero no días anteriores)
      const today = new Date();
      const minStart = today.toISOString().slice(0, 10);
      if (form.startDate < minStart) return false;
      
      if (!form.startTime || !form.endTime) return false;
      
      // Validar que las horas estén en el rango permitido (6:00 AM - 6:00 PM)
      if (form.startTime < '06:00' || form.startTime > '18:00') return false;
      if (!form.endTime) return false; // La hora fin debe estar calculada
      
      // Validar que hora fin sea posterior a hora inicio
      if (form.endTime <= form.startTime) return false;
      
      // Validar máximo 3 horas de permiso (solo horas completas)
      const [startH] = form.startTime.split(':').map(Number);
      const [endH] = form.endTime.split(':').map(Number);
      const diffHours = endH - startH;
      
      // La diferencia debe ser exactamente 3 horas (o menos si se alcanza el límite de 18:00)
      if (diffHours > 3) return false;
      return true; // Permiso solo necesita fecha y horas, no necesita validación de fechas múltiples
    }

    // Validaciones específicas para Pre-aprobado: fecha (desde hoy) y hora hasta la que se trabajará
    if (form.reason === 'Pre-aprobado') {
      if (!form.startDate) return false;
      // No puede ser antes de hoy, pero sí se permite hoy
      const todayStr = new Date().toISOString().slice(0, 10);
      if (form.startDate < todayStr) return false;
      if (!form.startTime || !form.endTime) return false; // hora inicio y hora fin
      if (form.endTime <= form.startTime) return false;
      if (!form.attachment) return false;
    }

    // Goce de días libres: solo fecha inicio (mín hoy), endDate se iguala automáticamente
    if (form.reason === 'Goce de dias libres compensatorios') {
      if (!form.startDate) return false;
      const todayStr = new Date().toISOString().slice(0, 10);
      if (form.startDate < todayStr) return false;
    }

    const needsDates = ['Incapacidad', 'Home Office', 'Duelo/Matrimonio/Nacimiento'].includes(form.reason);
    if (needsDates && (!form.startDate || !form.endDate)) return false;
    if (needsDates && form.startDate && form.endDate) {
      const todayStr = new Date().toISOString().slice(0, 10);
      // Fecha inicio no puede ser anterior a hoy
      if (form.startDate < todayStr) return false;
      // Fecha fin no puede ser anterior a fecha inicio
      if (form.endDate < form.startDate) return false;
    }
    
    if (form.reason === 'Incapacidad' && !form.incapacityDays) return false;
    if (reasonsRequiringEvidence.includes(form.reason as RequestReason) && !form.attachment) return false;
    return true;
  };

  const isDark = theme === 'dark';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minVacacionesStart = tomorrow.toISOString().slice(0, 10);
  
  // Para Permiso: mínimo es hoy (se puede seleccionar hoy, pero no días anteriores)
  const today = new Date();
  const minPermisoDate = today.toISOString().slice(0, 10);
  
  // Calcular el mínimo para fecha fin: debe ser al menos mañana y no anterior a fecha inicio
  const minVacacionesEnd = form.startDate && form.startDate >= minVacacionesStart 
    ? form.startDate 
    : minVacacionesStart;
  
  // Mínimo general para fecha fin en otros tipos de gestión: al menos mañana y no anterior a fecha inicio
  const minEndDate = form.startDate && form.startDate >= minVacacionesStart
    ? form.startDate
    : minVacacionesStart;

  return (
    <>
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center font-inter backdrop-blur-2xl"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-8">
                <div className="w-28 h-28 rounded-full flex items-center justify-center bg-gradient-to-br from-[#E60000] to-[#cc0000] shadow-2xl shadow-[#E60000]/50">
                  <CheckCircle2 className="w-16 h-16 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 font-inter">¡Perfecto!</h2>
              <p className="text-gray-400 font-inter">Gestión enviada exitosamente</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCheckingDays && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center font-inter backdrop-blur-2xl"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center"
            >
              <motion.img
                src={LOGO_URL}
                alt="RED Logo"
                className="h-32 w-auto mb-10"
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <h2 className="text-3xl font-bold text-white mb-3 font-inter">Verificando días disponibles</h2>
              <p className="text-sm text-gray-400 font-inter text-center max-w-md">
                Por favor espera un momento mientras validamos tu saldo de vacaciones con el sistema central.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDaysAvailableAnimation && daysAvailableInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center font-inter backdrop-blur-2xl"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-8">
                <div className="w-32 h-32 rounded-full flex items-center justify-center bg-gradient-to-br from-green-500/20 to-green-600/10 border-2 border-green-500/40 shadow-2xl shadow-green-500/30">
                  <CheckCircle2 className="w-20 h-20 text-green-500" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 font-inter">¡Días Disponibles!</h2>
              {daysAvailableInfo.remainingDays !== undefined && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-4 px-6 py-4 rounded-2xl bg-white/5 border border-white/10"
                >
                  <p className="text-sm text-gray-400 mb-2 font-inter">Días disponibles restantes</p>
                  <p className="text-4xl font-bold text-white font-inter">
                    {daysAvailableInfo.remainingDays} {daysAvailableInfo.remainingDays === 1 ? 'día' : 'días'}
                  </p>
                  {daysAvailableInfo.requestedDays !== undefined && (
                    <p className="text-xs text-gray-500 mt-2 font-inter">
                      Solicitas: {daysAvailableInfo.requestedDays} {daysAvailableInfo.requestedDays === 1 ? 'día' : 'días'}
                    </p>
                  )}
                </motion.div>
              )}
              {daysAvailableInfo.message && (
                <p className="text-sm text-gray-400 font-inter text-center max-w-md">{daysAvailableInfo.message}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isValidatingComment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center font-inter backdrop-blur-2xl"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center"
            >
              <motion.img
                src={LOGO_URL}
                alt="RED Logo"
                className="h-32 w-auto mb-10"
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <h2 className="text-3xl font-bold text-white mb-3 font-inter">Validando tu justificación</h2>
              <p className="text-sm text-gray-400 font-inter text-center max-w-md">
                Por favor espera un momento mientras validamos tu justificación con el sistema central.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCommentSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center font-inter backdrop-blur-2xl"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-8">
                <div className="w-28 h-28 rounded-full flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600 shadow-2xl shadow-green-500/50">
                  <CheckCircle2 className="w-16 h-16 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 font-inter">¡Justificación Válida!</h2>
              <p className="text-gray-400 font-inter">{commentValidationMessage || 'Tu justificación ha sido aprobada.'}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCommentRejectionAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center font-inter backdrop-blur-2xl"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-8">
                <div className="w-28 h-28 rounded-full flex items-center justify-center bg-gradient-to-br from-red-600 to-red-800 shadow-2xl shadow-red-600/50">
                  <X className="w-16 h-16 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 font-inter">¡Justificación Rechazada!</h2>
              <p className="text-gray-400 font-inter">{commentValidationMessage || 'Tu justificación no cumple con los requisitos.'}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRejectionAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center font-inter backdrop-blur-2xl"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-8">
                <div className="w-28 h-28 rounded-full flex items-center justify-center bg-gradient-to-br from-red-600 to-red-800 shadow-2xl shadow-red-600/50">
                  <X className="w-16 h-16 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 font-inter">¡Rechazado!</h2>
              <p className="text-gray-400 font-inter">{rejectionMessage || 'Correo Inválido'}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {submitted ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-3xl p-16 text-center max-w-md mx-auto font-inter ${isDark ? 'bg-zinc-900/80 backdrop-blur-xl' : 'bg-white shadow-2xl'}`}
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 bg-green-500/10">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h2 className={`text-2xl font-bold mb-4 font-inter ${isDark ? 'text-white' : 'text-gray-900'}`}>Solicitud Enviada</h2>
          <p className={`mb-10 text-sm font-inter ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Tu jefatura recibirá la notificación de inmediato</p>
          <button
            type="button"
            onClick={() => { setSubmitted(false); setForm(INITIAL_FORM_STATE); }}
            className="w-full py-5 rounded-2xl font-bold transition-all duration-300 bg-[#E60000] text-white hover:bg-[#cc0000] font-inter"
          >
            Nueva Gestión
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={`rounded-3xl overflow-hidden max-w-6xl w-full font-inter ${isDark ? 'bg-zinc-900/80 backdrop-blur-2xl' : 'bg-white shadow-2xl'}`}
        >
          {/* Header */}
          <div className={`px-12 py-10 flex items-center justify-between ${isDark ? 'border-b border-white/5' : 'border-b border-gray-100'}`}>
            <div className="flex items-center space-x-6">
              <img src={LOGO_URL} alt="RED Logo" className="h-14 w-auto" />
              <div className={`w-px h-8 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
              <h1 className={`text-2xl font-bold tracking-tight font-inter ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {TITLE_TYPING.slice(0, typedTitleLength)}
                {typedTitleLength <= TITLE_TYPING.length && (
                  <span className={cursorVisible ? 'opacity-100' : 'opacity-0'} style={{ transition: 'opacity 0.1s' }}>|</span>
                )}
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-12 py-16 space-y-16">
            {/* Datos Básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <Mail size={14} className="text-[#E60000]" />
                  Correo
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="usuario@red.com"
                    className={`w-full pb-3 text-base font-medium transition-all duration-300 font-inter outline-none bg-transparent border-b-2 ${isDark ? 'text-white border-white/10 placeholder:text-white/30 focus:border-[#E60000]' : 'text-gray-900 border-gray-200 placeholder:text-gray-400 focus:border-[#E60000]'}`}
                    value={form.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <ChevronRight size={14} className="text-[#E60000]" />
                  Jefe Inmediato
                </label>
                <div className="relative">
                  {typingBossText ? (
                    <div
                      className={`w-full pb-3 text-base font-medium font-inter border-b-2 ${isDark ? 'text-white border-white/10' : 'text-gray-900 border-gray-200'}`}
                      aria-hidden
                    >
                      {typingBossText.slice(0, typingBossLength)}
                      <span className="opacity-100" style={{ transition: 'opacity 0.1s' }}>|</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                      value={form.immediateBoss}
                      placeholder={isLoadingBosses ? 'Cargando...' : 'Se completará al ingresar tu correo'}
                      className={`w-full pb-3 text-base font-medium font-inter outline-none bg-transparent border-b-2 cursor-default ${isDark ? 'text-white border-white/10 placeholder:text-white/40' : 'text-gray-900 border-gray-200 placeholder:text-gray-400'}`}
                    />
                  )}
                  {typingBossText ? null : isLoadingBosses ? (
                    <Loader2 className="absolute right-0 bottom-3 text-[#E60000] animate-spin" size={18} />
                  ) : null}
                </div>
              </div>
            </div>

            {/* Tipo de Gestión y campos — solo se muestran cuando el correo es válido y el jefe está cargado */}
            <AnimatePresence>
            {form.immediateBoss && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.4 }}
                className="space-y-16"
              >

            {/* Motivo */}
            <div className="space-y-4">
              <label className={`text-xs font-semibold uppercase tracking-wider font-inter ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Tipo de Gestión
              </label>
              <div className="relative">
                <select
                  required
                  className={`w-full px-6 py-5 rounded-2xl text-lg font-bold uppercase transition-all duration-300 appearance-none font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 pr-12 ${isDark ? 'bg-white/5 text-white border border-white/10 hover:bg-white/8' : 'bg-gray-50 text-gray-900 border border-gray-200 hover:bg-gray-100'}`}
                  value={form.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value as RequestReason)}
                >
                  <option value="" disabled className={isDark ? 'bg-zinc-900' : 'bg-white'}>
                    Seleccionar tipo
                  </option>
                  <option value="Vacaciones" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Vacaciones</option>
                  <option value="Incapacidad" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Incapacidad</option>
                  <option value="Permiso" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Permiso</option>
                  <option value="Pre-aprobado" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Pre-aprobado</option>
                  <option value="Goce de dias libres compensatorios" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Goce de días libres compensatorios</option>
                  <option value="Consulta Médica - Emergencia" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Consulta Médica - Emergencia</option>
                  <option value="Renuncia" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Renuncia</option>
                  <option value="Otras Solicitudes de Colaborador" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Otras solicitudes de colaborador</option>
                  <option value="Otras Solicitudes de Jefatura" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Otras solicitudes de jefatura</option>
                  {/* Opciones ocultas - mantener lógica intacta */}
                  {/* <option value="Renuncia" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Renuncia</option>
                  <option value="Duelo/Matrimonio/Nacimiento" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Duelo / Matrimonio / Nacimiento</option>
                  <option value="Home Office" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Home Office</option>
                  <option value="Goce de dias libres compensatorios" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Días Compensatorios</option>
                  <option value="Pre-aprobado" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Pre-aprobado</option>
                  <option value="Consulta Médica - Emergencia" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Consulta Médica</option>
                  <option value="Otras Solicitudes de Colaborador" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Otras (Colaborador)</option>
                  <option value="Otras Solicitudes de Jefatura" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Otras (Jefatura)</option> */}
                </select>
                <ChevronDown className={`absolute right-5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none ${isDark ? 'text-white' : 'text-gray-600'}`} size={22} />
              </div>
            </div>

            {/* Campos Dinámicos */}
            <AnimatePresence mode="wait">
              {form.reason && (
                <motion.div
                  key={form.reason}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-2xl p-10 space-y-8 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}
                >
                  {/* Mensaje importante para Vacaciones */}
                  {form.reason === 'Vacaciones' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className={`flex items-start gap-4 p-5 rounded-xl ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}
                    >
                      <AlertCircle size={22} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className={`text-sm font-bold mb-2 font-inter ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                          Importante: Vacaciones Lineales
                        </p>
                        <p className={`text-xs leading-relaxed font-inter ${isDark ? 'text-amber-200/80' : 'text-amber-700'}`}>
                          Cada gestión de vacaciones debe ser <span className="font-bold">continua y lineal</span>. Si deseas tomar vacaciones de forma no continua (por ejemplo: 2 días, trabajar 1 día, y luego tomar más días), debes crear <span className="font-bold">múltiples acciones de personal separadas</span> para cada período.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Tipo de solicitud de vacaciones — aparece inmediatamente */}
                  {form.reason === 'Vacaciones' && (
                    <div className="space-y-4">
                      <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Tipo de solicitud
                        <span className="relative group inline-flex">
                          <AlertCircle size={15} className="text-amber-500 flex-shrink-0 cursor-help" />
                          <span className={`absolute left-0 top-full z-10 mt-1 w-72 px-3 py-2 text-xs font-normal rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity ${isDark ? 'bg-zinc-800 text-gray-200 border border-white/10' : 'bg-white text-gray-800 border border-gray-200'}`}>
                            Selecciona si deseas únicamente los días de vacaciones, el pago de prima vacacional, o ambos.
                          </span>
                        </span>
                      </label>
                      <div className="relative">
                        <select
                          required
                          className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 appearance-none font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 pr-12 ${isDark ? 'bg-white/5 text-white border border-white/10 hover:bg-white/8' : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'}`}
                          value={form.vacationType}
                          onChange={(e) => handleInputChange('vacationType', e.target.value)}
                        >
                          <option value="" disabled className={isDark ? 'bg-zinc-900' : 'bg-white'}>Seleccionar tipo</option>
                          <option value="vacaciones-dias" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Días de vacaciones</option>
                          <option value="pago-prima-vacacional" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Pago de prima vacacional</option>
                          <option value="ambos" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Ambos (días + prima vacacional)</option>
                        </select>
                        <ChevronDown className={`absolute right-5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none ${isDark ? 'text-white' : 'text-gray-600'}`} size={20} />
                      </div>

                      {/* Fecha de pago — calculada automáticamente al fin de mes */}
                      {(form.vacationType === 'pago-prima-vacacional' || form.vacationType === 'ambos') && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`flex items-start gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}
                        >
                          {isCheckingPrima
                            ? <Loader2 size={18} className="text-amber-500 flex-shrink-0 animate-spin mt-0.5" />
                            : <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          }
                          <div className="space-y-1">
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                              {isCheckingPrima ? 'Consultando información...' : 'Fecha de pago de prima vacacional'}
                            </span>
                            {!isCheckingPrima && (
                              <>
                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  El pago se realizará el{' '}
                                  <span className="font-bold">
                                    {(() => {
                                      const now = new Date();
                                      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                                      return formatDateDDMMYYYY(lastDay);
                                    })()}
                                  </span>
                                  {' '}(último día del mes en curso).
                                </p>
                                {primaVacacionalInfo && (
                                  <p className={`text-xs leading-relaxed ${isDark ? 'text-amber-200/80' : 'text-amber-700'}`}>
                                    {primaVacacionalInfo}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Fechas para Vacaciones — no aplica para solo pago de prima */}
                  {form.reason === 'Vacaciones' && form.vacationType !== 'pago-prima-vacacional' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Fecha Inicio
                            <span className="relative group inline-flex">
                              <AlertCircle size={16} className="text-amber-500 flex-shrink-0 cursor-help" />
                              <span className={`absolute left-0 top-full z-10 mt-1 w-64 px-3 py-2 text-xs font-normal rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity ${isDark ? 'bg-zinc-800 text-gray-200 border border-white/10' : 'bg-white text-gray-800 border border-gray-200'}`}>
                                La fecha de inicio indica que, al día siguiente de crear esta Acción de Personal, comenzarán sus vacaciones.
                              </span>
                            </span>
                          </label>
                          <DateInputDDMMYYYY
                            value={form.startDate}
                            onChange={(v) => handleInputChange('startDate', v)}
                            required
                            min={minVacacionesStart}
                            className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10 placeholder:text-white/40' : 'bg-white text-gray-900 border border-gray-200 placeholder:text-gray-400'}`}
                            aria-label="Fecha inicio"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Fecha Fin
                            <span className="relative group inline-flex">
                              <AlertCircle size={16} className="text-amber-500 flex-shrink-0 cursor-help" />
                              <span className={`absolute left-0 top-full z-10 mt-1 w-64 px-3 py-2 text-xs font-normal rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity ${isDark ? 'bg-zinc-800 text-gray-200 border border-white/10' : 'bg-white text-gray-800 border border-gray-200'}`}>
                                La fecha fin es el último día de vacaciones; debe presentarse a trabajar al día siguiente.
                              </span>
                            </span>
                          </label>
                          <DateInputDDMMYYYY
                            value={form.endDate}
                            onChange={(v) => handleInputChange('endDate', v)}
                            required
                            min={minVacacionesEnd}
                            className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10 placeholder:text-white/40' : 'bg-white text-gray-900 border border-gray-200 placeholder:text-gray-400'}`}
                            aria-label="Fecha fin"
                          />
                        </div>
                      </div>
                      {form.endDate && daysValidated && (
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl font-inter ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                          <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
                          <div>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Reincorporación a labores</span>
                            <p className={`text-sm font-medium mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              Debe presentarse a trabajar el{' '}
                              {daysAvailableInfo?.returnDateText
                                ? daysAvailableInfo.returnDateText
                                : formatDateDDMMYYYY(getNextBusinessDay(form.endDate))}
                              .
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Notificación de días pendientes insuficientes */}
                      {form.endDate && !daysValidated && diasPendientes !== null && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-inter ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}
                        >
                          <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
                          <div>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Días pendientes de goce</span>
                            <p className={`text-sm font-medium mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              Únicamente tienes <span className="font-bold">{diasPendientes} {diasPendientes === 1 ? 'día disponible' : 'días disponibles'}</span> de goce. Ajusta el rango de fechas.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Fecha única para Permiso */}
                  {form.reason === 'Permiso' && (
                    <div className="space-y-3">
                      <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Fecha de Permiso
                        <span className="relative group inline-flex">
                          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 cursor-help" />
                          <span className={`absolute left-0 top-full z-10 mt-1 w-64 px-3 py-2 text-xs font-normal rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity ${isDark ? 'bg-zinc-800 text-gray-200 border border-white/10' : 'bg-white text-gray-800 border border-gray-200'}`}>
                            Es el día que se desea pedir permiso. Se recomienda solicitarlo con anticipación de dos días si es posible.
                          </span>
                        </span>
                      </label>
                      <DateInputDDMMYYYY
                        value={form.startDate}
                        onChange={(v) => {
                          handleInputChange('startDate', v);
                          // Para Permiso, la fecha fin es la misma que la fecha inicio
                          handleInputChange('endDate', v);
                        }}
                        required
                        min={minPermisoDate}
                        className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10 placeholder:text-white/40' : 'bg-white text-gray-900 border border-gray-200 placeholder:text-gray-400'}`}
                        aria-label="Fecha de permiso"
                      />
                    </div>
                  )}

                  {/* Fechas para otras gestiones (no Vacaciones, no Permiso, no Goce) */}
                  {['Incapacidad', 'Home Office', 'Duelo/Matrimonio/Nacimiento'].includes(form.reason) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Fecha Inicio
                          {form.reason === 'Incapacidad' && (
                            <span className="relative group inline-flex">
                              <AlertCircle size={15} className="text-amber-500 flex-shrink-0 cursor-help" />
                              <span className={`absolute left-0 top-full z-10 mt-1 w-64 px-3 py-2 text-xs font-normal rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity ${isDark ? 'bg-zinc-800 text-gray-200 border border-white/10' : 'bg-white text-gray-800 border border-gray-200'}`}>
                                Primer día de la incapacidad. No se pueden seleccionar fechas anteriores al día de hoy.
                              </span>
                            </span>
                          )}
                        </label>
                        <DateInputDDMMYYYY
                          value={form.startDate}
                          onChange={(v) => handleInputChange('startDate', v)}
                          required
                          min={minPermisoDate}
                          className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10 placeholder:text-white/40' : 'bg-white text-gray-900 border border-gray-200 placeholder:text-gray-400'}`}
                          aria-label="Fecha inicio"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Fecha Fin
                          {form.reason === 'Incapacidad' && (
                            <span className="relative group inline-flex">
                              <AlertCircle size={15} className="text-amber-500 flex-shrink-0 cursor-help" />
                              <span className={`absolute left-0 top-full z-10 mt-1 w-64 px-3 py-2 text-xs font-normal rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity ${isDark ? 'bg-zinc-800 text-gray-200 border border-white/10' : 'bg-white text-gray-800 border border-gray-200'}`}>
                                Último día de la incapacidad. Debe ser igual o posterior a la fecha de inicio.
                              </span>
                            </span>
                          )}
                        </label>
                        <DateInputDDMMYYYY
                          value={form.endDate}
                          onChange={(v) => handleInputChange('endDate', v)}
                          required
                          min={form.startDate && form.startDate >= minPermisoDate ? form.startDate : minPermisoDate}
                          className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10 placeholder:text-white/40' : 'bg-white text-gray-900 border border-gray-200 placeholder:text-gray-400'}`}
                          aria-label="Fecha fin"
                        />
                      </div>
                    </div>
                  )}

                  {/* Fecha para Goce de días libres compensatorios (solo inicio, mín hoy) */}
                  {form.reason === 'Goce de dias libres compensatorios' && (
                    <div className="space-y-3">
                      <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Calendar size={12} /> Fecha de Goce
                        <span className="relative group inline-flex">
                          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 cursor-help" />
                          <span className={`absolute left-0 top-full z-10 mt-1 w-64 px-3 py-2 text-xs font-normal rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity ${isDark ? 'bg-zinc-800 text-gray-200 border border-white/10' : 'bg-white text-gray-800 border border-gray-200'}`}>
                            Día en el que se tomará el goce de días libres compensatorios. Puede ser el día actual o una fecha futura.
                          </span>
                        </span>
                      </label>
                      <DateInputDDMMYYYY
                        value={form.startDate}
                        onChange={(v) => {
                          handleInputChange('startDate', v);
                          handleInputChange('endDate', v);
                        }}
                        required
                        min={minPermisoDate}
                        className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10 placeholder:text-white/40' : 'bg-white text-gray-900 border border-gray-200 placeholder:text-gray-400'}`}
                        aria-label="Fecha de goce"
                      />
                    </div>
                  )}

                  {form.reason === 'Permiso' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <Clock size={12} /> Hora Inicio
                          </label>
                          <div className="relative">
                            <select
                              required
                              className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 appearance-none font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 pr-12 ${isDark ? 'bg-white/5 text-white border border-white/10 hover:bg-white/8' : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'}`}
                              value={form.startTime}
                              onChange={(e) => {
                                const startTime = e.target.value;
                                handleInputChange('startTime', startTime);
                                
                                // Calcular automáticamente la hora fin (hora inicio + 3 horas)
                                if (startTime) {
                                  const [startH] = startTime.split(':').map(Number);
                                  const endHour = startH + 3;
                                  
                                  // Validar que no exceda las 6:00 PM (18:00)
                                  if (endHour <= 18) {
                                    const endTime = `${String(endHour).padStart(2, '0')}:00`;
                                    handleInputChange('endTime', endTime);
                                  } else {
                                    // Si excede, usar 6:00 PM como máximo
                                    handleInputChange('endTime', '18:00');
                                  }
                                } else {
                                  handleInputChange('endTime', '');
                                }
                              }}
                            >
                              <option value="" disabled className={isDark ? 'bg-zinc-900' : 'bg-white'}>
                                Seleccionar hora
                              </option>
                              {TIME_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value} className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className={`absolute right-5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none ${isDark ? 'text-white' : 'text-gray-600'}`} size={22} />
                          </div>
                          <p className={`text-xs font-inter ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Horario permitido: 6:00 AM - 6:00 PM
                          </p>
                        </div>
                        <div className="space-y-3">
                          <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <Clock size={12} /> Hora Fin
                            <span className="relative group inline-flex">
                              <AlertCircle size={16} className="text-amber-500 flex-shrink-0 cursor-help" />
                              <span className={`absolute left-0 top-full z-10 mt-1 w-64 px-3 py-2 text-xs font-normal rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity ${isDark ? 'bg-zinc-800 text-gray-200 border border-white/10' : 'bg-white text-gray-800 border border-gray-200'}`}>
                                Si el permiso excede las 3 horas, será considerado como permiso sin goce de sueldo.
                              </span>
                            </span>
                          </label>
                          <div className="relative">
                            <select
                              required
                              disabled
                              className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 appearance-none font-inter outline-none pr-12 cursor-not-allowed ${isDark ? 'bg-white/5 text-white/60 border border-white/10' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                              value={form.endTime}
                            >
                              <option value="" disabled className={isDark ? 'bg-zinc-900' : 'bg-white'}>
                                {form.startTime ? 'Se calculará automáticamente' : 'Selecciona hora inicio primero'}
                              </option>
                              {form.endTime && (
                                <option value={form.endTime} className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>
                                  {TIME_OPTIONS.find(opt => opt.value === form.endTime)?.label || form.endTime}
                                </option>
                              )}
                            </select>
                            <ChevronDown className={`absolute right-5 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none ${isDark ? 'text-white' : 'text-gray-600'}`} size={22} />
                          </div>
                          <p className={`text-xs font-inter ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Se calcula automáticamente: hora inicio + 3 horas
                          </p>
                        </div>
                      </div>
                      {form.startTime && form.endTime && (() => {
                        const [startH] = form.startTime.split(':').map(Number);
                        const [endH] = form.endTime.split(':').map(Number);
                        const diffHours = endH - startH;
                        
                        if (diffHours > 3) {
                          return (
                            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl font-inter ${isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                              <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                              <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                                El permiso no puede exceder 3 horas. Duración actual: {diffHours} horas.
                              </p>
                            </div>
                          );
                        }
                        return (
                          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl font-inter ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                            <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className={`text-sm font-medium mb-2 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                                Duración del permiso: {diffHours} {diffHours === 1 ? 'hora' : 'horas'} (máximo permitido: 3 horas)
                              </p>
                              <p className={`text-xs leading-relaxed ${isDark ? 'text-amber-200/80' : 'text-amber-700'}`}>
                                <span className="font-semibold">Importante:</span> Cuando se retire y regrese, debe marcar su entrada y salida para evitar conflictos y llevar un registro adecuado.
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Fecha y hora para Pre-aprobado */}
                  {form.reason === 'Pre-aprobado' && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Fecha del Pre-aprobado
                          <span className="relative group inline-flex">
                            <AlertCircle size={16} className="text-amber-500 flex-shrink-0 cursor-help" />
                            <span className={`absolute left-0 top-full z-10 mt-1 w-64 px-3 py-2 text-xs font-normal rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity ${isDark ? 'bg-zinc-800 text-gray-200 border border-white/10' : 'bg-white text-gray-800 border border-gray-200'}`}>
                              Día en que se hará efectivo el pre-aprobado.
                            </span>
                          </span>
                        </label>
                        <DateInputDDMMYYYY
                          value={form.startDate}
                          onChange={(v) => {
                            handleInputChange('startDate', v);
                            handleInputChange('endDate', v);
                          }}
                          required
                          min={minPermisoDate}
                          className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10 placeholder:text-white/40' : 'bg-white text-gray-900 border border-gray-200 placeholder:text-gray-400'}`}
                          aria-label="Fecha del pre-aprobado"
                        />
                      </div>

                      {form.startDate && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="grid grid-cols-1 md:grid-cols-2 gap-6"
                        >
                          {/* Hora Inicio */}
                          <div className="space-y-3">
                            <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              <Clock size={12} /> Hora Inicio
                              <span className="relative group inline-flex">
                                <AlertCircle size={16} className="text-amber-500 flex-shrink-0 cursor-help" />
                                <span className={`absolute left-0 top-full z-10 mt-1 w-64 px-3 py-2 text-xs font-normal rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity ${isDark ? 'bg-zinc-800 text-gray-200 border border-white/10' : 'bg-white text-gray-800 border border-gray-200'}`}>
                                  Hora en la que comienza el tiempo adicional que el colaborador se quedará después de su jornada laboral.
                                </span>
                              </span>
                            </label>
                            <div className="relative">
                              <select
                                required
                                className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 appearance-none font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 pr-12 ${isDark ? 'bg-white/5 text-white border border-white/10 hover:bg-white/8' : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'}`}
                                value={form.startTime}
                                onChange={(e) => {
                                  handleInputChange('startTime', e.target.value);
                                  // Resetear hora fin si es menor o igual a la nueva hora inicio
                                  if (form.endTime && e.target.value >= form.endTime) {
                                    handleInputChange('endTime', '');
                                  }
                                }}
                              >
                                <option value="" disabled className={isDark ? 'bg-zinc-900' : 'bg-white'}>
                                  Seleccionar hora
                                </option>
                                {TIME_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value} className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className={`absolute right-5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none ${isDark ? 'text-white' : 'text-gray-600'}`} size={22} />
                            </div>
                          </div>

                          {/* Hora Fin */}
                          <div className="space-y-3">
                            <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              <Clock size={12} /> Hora Fin
                              <span className="relative group inline-flex">
                                <AlertCircle size={16} className="text-amber-500 flex-shrink-0 cursor-help" />
                                <span className={`absolute left-0 top-full z-10 mt-1 w-64 px-3 py-2 text-xs font-normal rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity ${isDark ? 'bg-zinc-800 text-gray-200 border border-white/10' : 'bg-white text-gray-800 border border-gray-200'}`}>
                                  Hora hasta la que el colaborador estará trabajando ese día antes de retirarse.
                                </span>
                              </span>
                            </label>
                            <div className="relative">
                              <select
                                required
                                className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 appearance-none font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 pr-12 ${isDark ? 'bg-white/5 text-white border border-white/10 hover:bg-white/8' : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'}`}
                                value={form.endTime}
                                onChange={(e) => handleInputChange('endTime', e.target.value)}
                              >
                                <option value="" disabled className={isDark ? 'bg-zinc-900' : 'bg-white'}>
                                  Seleccionar hora
                                </option>
                                {TIME_OPTIONS.filter(opt => !form.startTime || opt.value > form.startTime).map((option) => (
                                  <option key={option.value} value={option.value} className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className={`absolute right-5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none ${isDark ? 'text-white' : 'text-gray-600'}`} size={22} />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Aviso de radio/teléfono corporativo */}
                      {form.startDate && form.startTime && form.endTime && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                          className={`flex items-start gap-4 p-5 rounded-xl ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}
                        >
                          <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-1">
                            <p className={`text-sm font-bold font-inter ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                              Uso obligatorio del radio / teléfono corporativo
                            </p>
                            <ul className={`text-xs leading-relaxed font-inter space-y-1 list-disc list-inside ${isDark ? 'text-amber-200/80' : 'text-amber-700'}`}>
                              <li>El equipo debe permanecer <span className="font-semibold">encendido</span> durante toda la jornada (normal y extraordinaria).</li>
                              <li>El <span className="font-semibold">GPS debe estar activado</span> en todo momento.</li>
                              <li><span className="font-semibold">Prohibido</span> apagar el equipo o desactivar el GPS durante la jornada.</li>
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {form.reason === 'Incapacidad' && form.startDate && form.endDate && (
                    <div className="md:col-span-2">
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex items-center justify-between p-5 rounded-xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-[#E60000]/10">
                            <Clock size={18} className="text-[#E60000]" />
                          </div>
                          <div>
                            <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              Días Totales
                            </p>
                            <p className={`text-2xl font-bold mt-1 font-inter ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {form.incapacityDays || '0'} {form.incapacityDays === '1' ? 'día' : 'días'}
                            </p>
                          </div>
                        </div>
                        <p className={`text-xs font-inter ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          Calculado automáticamente
                        </p>
                      </motion.div>
                    </div>
                  )}

                  {reasonsRequiringEvidence.includes(form.reason as RequestReason) &&
                   // Para Pre-aprobado: solo mostrar archivo si ya hay fecha, hora inicio y hora fin
                   (form.reason !== 'Pre-aprobado' || (form.startDate && form.startTime && form.endTime)) &&
                   // Para Goce: solo mostrar archivo si ya hay fecha seleccionada
                   (form.reason !== 'Goce de dias libres compensatorios' || !!form.startDate) && (
                    <div className={`pt-8 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        id="file-upload"
                        // Solo se permiten archivos PDF en todos los casos
                        accept="application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          // Validación extra por si el navegador no respeta el accept
                          if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                            setRejectionMessage(`El formato "${file.name.split('.').pop()?.toUpperCase() || 'desconocido'}" no está permitido. Solo se aceptan archivos PDF.`);
                            setShowRejectionAnimation(true);
                            setTimeout(() => {
                              setShowRejectionAnimation(false);
                              setRejectionMessage('');
                            }, 4200);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                            return;
                          }
                          handleInputChange('attachment', file);
                        }}
                      />
                      <label
                        htmlFor="file-upload"
                        className={`flex items-center justify-between p-6 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${form.attachment ? 'bg-[#E60000]/10 border-[#E60000]/40' : isDark ? 'border-white/10 hover:border-[#E60000]/40 hover:bg-white/5' : 'border-gray-200 hover:border-[#E60000]/40 hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-5">
                          <div className={`p-3 rounded-xl ${form.attachment ? 'bg-[#E60000]/20' : isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                            {form.attachment ? <FileText size={24} className="text-[#E60000]" /> : <Upload size={24} className={isDark ? 'text-gray-400' : 'text-gray-500'} />}
                          </div>
                          <div>
                            <p className={`text-base font-bold font-inter flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {form.attachment ? form.attachment.name : 'Adjuntar Evidencia'}
                              {!form.attachment && (
                                <span className="relative group inline-flex" onClick={(e) => e.preventDefault()}>
                                  <AlertCircle size={15} className="text-amber-500 flex-shrink-0 cursor-help" />
                                  <span className={`absolute left-0 top-full z-10 mt-1 w-72 px-3 py-2 text-xs font-normal rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity ${isDark ? 'bg-zinc-800 text-gray-200 border border-white/10' : 'bg-white text-gray-800 border border-gray-200'}`}>
                                    Sube un PDF que respalde tu solicitud, como un documento oficial, una carta con todos los detalles o cualquier evidencia relevante.
                                  </span>
                                </span>
                              )}
                            </p>
                            <p className={`text-xs font-inter mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              Solo PDF (Max 5MB)
                            </p>
                          </div>
                        </div>
                        {form.attachment && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); handleInputChange('attachment', null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="p-2 rounded-full hover:bg-white/10 text-[#E60000] transition-all"
                          >
                            <X size={20} />
                          </button>
                        )}
                      </label>
                    </div>
                  )}

                  {/* Justificación - Solo se muestra cuando corresponde */}
                  {(() => {
                    // Para Vacaciones: solo mostrar si los días están validados
                    if (form.reason === 'Vacaciones') {
                      if (!daysValidated) return null;
                    }
                    // Para Permiso: necesita fecha de permiso, horas Y archivo subido
                    else if (form.reason === 'Permiso') {
                      if (!form.startDate || !form.startTime || !form.endTime) return null;
                      // Solo mostrar justificación después de subir el archivo
                      if (!form.attachment) return null;
                    }
                    // Para Goce de días libres: solo fecha inicio + archivo
                    else if (form.reason === 'Goce de dias libres compensatorios') {
                      if (!form.startDate) return null;
                      if (!form.attachment) return null;
                    }
                    // Para otros tipos que requieren fechas: mostrar si las fechas están llenas
                    else if (['Incapacidad', 'Home Office', 'Duelo/Matrimonio/Nacimiento'].includes(form.reason)) {
                      if (!form.startDate || !form.endDate) return null;
                      // Si requiere evidencia, solo mostrar justificación después de subir el archivo
                      if (reasonsRequiringEvidence.includes(form.reason as RequestReason) && !form.attachment) return null;
                    }
                    // Para Pre-aprobado: necesita fecha, hora inicio, hora fin Y archivo
                    else if (form.reason === 'Pre-aprobado') {
                      if (!form.startDate || !form.startTime || !form.endTime) return null;
                      if (!form.attachment) return null;
                    }
                    // Para otros tipos sin fechas: mostrar inmediatamente (a menos que requieran evidencia)
                    else if (reasonsRequiringEvidence.includes(form.reason as RequestReason)) {
                      if (!form.attachment) return null;
                    }
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className={`pt-8 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}
                      >
                        <div className="space-y-4">
                          <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <MessageSquare size={14} className="text-[#E60000]" />
                            Justificación
                            {form.reason === 'Consulta Médica - Emergencia' && (
                              <span className="relative group inline-flex">
                                <AlertCircle size={15} className="text-amber-500 flex-shrink-0 cursor-help" />
                                <span className={`absolute left-0 top-full z-10 mt-1 w-72 px-3 py-2 text-xs font-normal rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity ${isDark ? 'bg-zinc-800 text-gray-200 border border-white/10' : 'bg-white text-gray-800 border border-gray-200'}`}>
                                  Por tratarse de una emergencia, el adjunto con la cita o documento médico podrá ser presentado posteriormente. Por ahora solo se validará la justificación.
                                </span>
                              </span>
                            )}
                          </label>
                          <textarea
                            required
                            rows={6}
                            placeholder="Describe el motivo de tu solicitud..."
                            className={`w-full px-6 py-5 rounded-2xl text-base font-medium resize-none transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10 placeholder:text-white/30' : 'bg-gray-50 text-gray-900 border border-gray-200 placeholder:text-gray-400'}`}
                            value={form.comments}
                            onChange={(e) => handleInputChange('comments', e.target.value)}
                            onBlur={async (e) => {
                              if (form.reason && e.target.value.trim()) {
                                await validateComment(e.target.value);
                              }
                            }}
                          />
                          {form.reason === 'Consulta Médica - Emergencia' && (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className={`flex items-start gap-3 p-4 rounded-xl ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}
                            >
                              <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 space-y-2">
                                <p className={`text-xs leading-relaxed font-inter ${isDark ? 'text-amber-200/80' : 'text-amber-700'}`}>
                                  <span className="font-semibold">Recuerda:</span> Deberás subir el adjunto con la cita médica o documentación correspondiente una vez que dispongas de ella. Este documento será requerido para cerrar la solicitud.
                                </p>
                                {!showEmergencyAttachment && (
                                  <button
                                    type="button"
                                    onClick={() => setShowEmergencyAttachment(true)}
                                    className={`text-xs font-semibold underline underline-offset-2 transition-colors font-inter ${isDark ? 'text-amber-300 hover:text-amber-100' : 'text-amber-800 hover:text-amber-600'}`}
                                  >
                                    ¿Ya tienes la cita médica? Súbela aquí →
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}

                          {/* Adjunto opcional para Consulta Médica - Emergencia */}
                          {form.reason === 'Consulta Médica - Emergencia' && showEmergencyAttachment && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.35 }}
                            >
                              <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                id="file-upload-emergency"
                                accept="application/pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                                    setRejectionMessage(`El formato "${file.name.split('.').pop()?.toUpperCase() || 'desconocido'}" no está permitido. Solo se aceptan archivos PDF.`);
                                    setShowRejectionAnimation(true);
                                    setTimeout(() => { setShowRejectionAnimation(false); setRejectionMessage(''); }, 4200);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                    return;
                                  }
                                  handleInputChange('attachment', file);
                                }}
                              />
                              <label
                                htmlFor="file-upload-emergency"
                                className={`flex items-center justify-between p-5 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${form.attachment ? 'bg-[#E60000]/10 border-[#E60000]/40' : isDark ? 'border-white/10 hover:border-[#E60000]/40 hover:bg-white/5' : 'border-gray-200 hover:border-[#E60000]/40 hover:bg-gray-50'}`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`p-3 rounded-xl ${form.attachment ? 'bg-[#E60000]/20' : isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                                    {form.attachment ? <FileText size={22} className="text-[#E60000]" /> : <Upload size={22} className={isDark ? 'text-gray-400' : 'text-gray-500'} />}
                                  </div>
                                  <div>
                                    <p className={`text-sm font-bold font-inter ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                      {form.attachment ? form.attachment.name : 'Adjuntar cita médica'}
                                    </p>
                                    <p className={`text-xs font-inter mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Solo PDF (Max 5MB)</p>
                                  </div>
                                </div>
                                {form.attachment && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); handleInputChange('attachment', null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                    className="p-2 rounded-full hover:bg-white/10 text-[#E60000] transition-all"
                                  >
                                    <X size={18} />
                                  </button>
                                )}
                              </label>
                            </motion.div>
                          )}
                        </div>

                      </motion.div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botones */}
            <div className="flex flex-col md:flex-row items-center gap-4 pt-8">
              <button
                type="button"
                onClick={handleReset}
                className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 font-inter ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                Limpiar
              </button>
              <button
                type="submit"
                disabled={!isFormValid() || isSubmitting || isCheckingDays}
                className={`flex-1 md:flex-initial md:min-w-[300px] py-5 px-10 rounded-2xl font-bold text-lg transition-all duration-300 font-inter flex items-center justify-center gap-3 ${
                  !isFormValid() || isSubmitting || isCheckingDays
                    ? 'opacity-40 cursor-not-allowed bg-[#E60000]'
                    : 'bg-[#E60000] hover:bg-[#cc0000] hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#E60000]/30'
                } text-white`}
              >
                {isSubmitting || isCheckingDays ? (
                  <>
                    <Loader2 className="animate-spin" size={22} />
                    <span>{isCheckingDays ? 'Verificando días…' : 'Enviando...'}</span>
                  </>
                ) : (
                  <>
                    <span>Enviar Solicitud</span>
                    <Send size={20} />
                  </>
                )}
              </button>
            </div>

              </motion.div>
            )}
            </AnimatePresence>
          </form>
        </motion.div>
      )}
    </>
  );
};
