
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
  const [daysAvailableInfo, setDaysAvailableInfo] = useState<{ remainingDays?: number; requestedDays?: number; message?: string } | null>(null);
  const [isValidatingComment, setIsValidatingComment] = useState(false);
  const [showCommentSuccessAnimation, setShowCommentSuccessAnimation] = useState(false);
  const [showCommentRejectionAnimation, setShowCommentRejectionAnimation] = useState(false);
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

    // Evitar llamadas repetidas si ya validamos este mismo rango con éxito
    if (
      lastDaysCheckRef.current &&
      lastDaysCheckRef.current.start === form.startDate &&
      lastDaysCheckRef.current.end === form.endDate &&
      lastDaysCheckRef.current.ok
    ) {
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

      let checkData: any = null;
      try {
        checkData = await checkResponse.json();
      } catch {
        // Si no devuelve JSON, dejamos checkData en null
      }

      setIsCheckingDays(false);

      const notAvailable =
        !checkResponse.ok ||
        (checkData &&
          (checkData.available === false ||
            checkData.hasDays === false ||
            checkData.status === 'denied'));

      lastDaysCheckRef.current = {
        start: form.startDate,
        end: form.endDate,
        ok: !notAvailable,
      };

      if (notAvailable) {
        setRejectionMessage(
          (checkData && (checkData.message || checkData.error)) ||
            'No cuentas con días disponibles para este rango de fechas.'
        );
        setShowRejectionAnimation(true);
        setTimeout(() => {
          setShowRejectionAnimation(false);
          setRejectionMessage('');
        }, 4200);
        setDaysValidated(false);
        return false;
      }

      // Guardar información de días disponibles para mostrar al usuario
      setDaysAvailableInfo({
        remainingDays: checkData?.remainingDays,
        requestedDays: checkData?.requestedDays,
        message: checkData?.message,
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

  const reasonsRequiringEvidence: RequestReason[] = [
    'Permiso', 'Incapacidad', 'Renuncia', 'Duelo/Matrimonio/Nacimiento', 'Pre-aprobado'
  ];

  const handleEmailChange = (value: string) => {
    const trimmedEmail = value.trim();
    let detectedCountry = '';
    const lowerEmail = trimmedEmail.toLowerCase();
    if (lowerEmail.includes('.sv')) detectedCountry = 'El Salvador';
    else if (lowerEmail.includes('.gt')) detectedCountry = 'Guatemala';

    const jefeInfo = trimmedEmail ? emailToJefeRef.current.get(lowerEmail) : null;

    setForm(prev => ({
      ...prev,
      email: trimmedEmail,
      country: detectedCountry,
      ...(jefeInfo ? {} : { immediateBoss: '', bossEmail: '' })
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

        // Limpiar fechas y resetear validaciones si cambia de reason
        if (field === 'reason') {
          if (value !== 'Vacaciones') {
            newForm.startDate = '';
            newForm.endDate = '';
          }
          setDaysValidated(false);
          setCommentValidated(false);
        }
        
        // Resetear validación de días y comentarios si cambian las fechas en Vacaciones
        if ((field === 'startDate' || field === 'endDate') && prev.reason === 'Vacaciones') {
          setDaysValidated(false);
          setCommentValidated(false);
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

      const payload = {
        ...form,
        vacationType: form.reason === 'Vacaciones' ? 'vacaciones-dias' : form.vacationType,
        paymentDate: form.paymentDate || undefined,
        submittedAt: new Date().toISOString(),
        attachmentName: form.attachment?.name || null,
        attachmentData: base64File,
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

    // Validación para Vacaciones: fechas de inicio (no puede ser hoy) y fin
    if (form.reason === 'Vacaciones') {
      if (!form.startDate || !form.endDate) return false;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const minStart = tomorrow.toISOString().slice(0, 10);
      if (form.startDate < minStart) return false;
      // Validar que fecha fin no sea anterior a fecha inicio ni a mañana
      const minEnd = form.startDate >= minStart ? form.startDate : minStart;
      if (form.endDate < minEnd) return false;
      return true;
    }

    const needsDates = ['Permiso', 'Incapacidad', 'Home Office', 'Goce de dias libres compensatorios', 'Duelo/Matrimonio/Nacimiento'].includes(form.reason);
    if (needsDates && (!form.startDate || !form.endDate)) return false;
    // Validar que fecha fin no sea anterior a fecha inicio ni a mañana
    if (needsDates && form.startDate && form.endDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const minStart = tomorrow.toISOString().slice(0, 10);
      const minEnd = form.startDate >= minStart ? form.startDate : minStart;
      if (form.endDate < minEnd) return false;
    }
    if (form.reason === 'Permiso' && (!form.startTime || !form.endTime)) return false;
    if (form.reason === 'Incapacidad' && !form.incapacityDays) return false;
    if (reasonsRequiringEvidence.includes(form.reason as RequestReason) && !form.attachment) return false;
    return true;
  };

  const isDark = theme === 'dark';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minVacacionesStart = tomorrow.toISOString().slice(0, 10);
  
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
                  {/* Opciones ocultas - mantener lógica intacta */}
                  {/* <option value="Permiso" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Permiso</option>
                  <option value="Renuncia" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Renuncia</option>
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

                  {/* Fechas para Vacaciones */}
                  {form.reason === 'Vacaciones' && (
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
                      {form.endDate && (
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl font-inter ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                          <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
                          <div>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Reincorporación a labores</span>
                            <p className={`text-sm font-medium mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              Debe presentarse a trabajar el{' '}
                              {formatDateDDMMYYYY(getNextBusinessDay(form.endDate))}
                              .
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fechas para otras gestiones (no Vacaciones) */}
                  {['Permiso', 'Incapacidad', 'Home Office', 'Goce de dias libres compensatorios', 'Duelo/Matrimonio/Nacimiento'].includes(form.reason) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className={`text-xs font-semibold uppercase tracking-wider font-inter ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Fecha Inicio
                        </label>
                        <DateInputDDMMYYYY
                          value={form.startDate}
                          onChange={(v) => handleInputChange('startDate', v)}
                          required
                          className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10 placeholder:text-white/40' : 'bg-white text-gray-900 border border-gray-200 placeholder:text-gray-400'}`}
                          aria-label="Fecha inicio"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className={`text-xs font-semibold uppercase tracking-wider font-inter ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Fecha Fin
                        </label>
                        <DateInputDDMMYYYY
                          value={form.endDate}
                          onChange={(v) => handleInputChange('endDate', v)}
                          required
                          min={minEndDate}
                          className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10 placeholder:text-white/40' : 'bg-white text-gray-900 border border-gray-200 placeholder:text-gray-400'}`}
                          aria-label="Fecha fin"
                        />
                      </div>
                    </div>
                  )}

                  {form.reason === 'Permiso' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Clock size={12} /> Hora Inicio
                        </label>
                        <input
                          type="time"
                          required
                          className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10' : 'bg-white text-gray-900 border border-gray-200'}`}
                          value={form.startTime}
                          onChange={(e) => handleInputChange('startTime', e.target.value)}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Clock size={12} /> Hora Fin
                        </label>
                        <input
                          type="time"
                          required
                          className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10' : 'bg-white text-gray-900 border border-gray-200'}`}
                          value={form.endTime}
                          onChange={(e) => handleInputChange('endTime', e.target.value)}
                        />
                      </div>
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

                  {reasonsRequiringEvidence.includes(form.reason as RequestReason) && (
                    <div className={`pt-8 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                      <input ref={fileInputRef} type="file" className="hidden" id="file-upload" onChange={(e) => { if (e.target.files?.[0]) handleInputChange('attachment', e.target.files[0]); }} />
                      <label
                        htmlFor="file-upload"
                        className={`flex items-center justify-between p-6 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${form.attachment ? 'bg-[#E60000]/10 border-[#E60000]/40' : isDark ? 'border-white/10 hover:border-[#E60000]/40 hover:bg-white/5' : 'border-gray-200 hover:border-[#E60000]/40 hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-5">
                          <div className={`p-3 rounded-xl ${form.attachment ? 'bg-[#E60000]/20' : isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                            {form.attachment ? <FileText size={24} className="text-[#E60000]" /> : <Upload size={24} className={isDark ? 'text-gray-400' : 'text-gray-500'} />}
                          </div>
                          <div>
                            <p className={`text-base font-bold font-inter ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {form.attachment ? form.attachment.name : 'Adjuntar Evidencia'}
                            </p>
                            <p className={`text-xs font-inter mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              PDF, JPG, PNG (Max 5MB)
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
                    // Para otros tipos que requieren fechas: mostrar si las fechas están llenas
                    else if (['Permiso', 'Incapacidad', 'Home Office', 'Goce de dias libres compensatorios', 'Duelo/Matrimonio/Nacimiento'].includes(form.reason)) {
                      if (!form.startDate || !form.endDate) return null;
                    }
                    // Para otros tipos sin fechas: mostrar inmediatamente
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
          </form>
        </motion.div>
      )}
    </>
  );
};
