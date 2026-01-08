
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Upload,
  CheckCircle2,
  FileText,
  X,
  Loader2,
  Building2,
  Mail,
  MessageSquare,
  Clock,
  Send
} from 'lucide-react';
import { FormState, RequestReason } from '../types';

const LOGO_URL = 'https://static.wixstatic.com/media/98a19d_504d5e7478054d2484448813ac235267~mv2.png';
const WEBHOOK_URL = 'https://hook.eu2.make.com/8pscatpux73uutt3ce8skn4x7k4titqf';
const BOSSES_API_URL = '/api/getActiveUsers';

const INITIAL_FORM_STATE: FormState = {
  email: '',
  country: '',
  immediateBoss: '',
  reason: '',
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
  const [isLoadingBosses, setIsLoadingBosses] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showRejectionAnimation, setShowRejectionAnimation] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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

          const formattedBosses = rawData
            .filter((item: any) => {
              if (!item || typeof item !== 'object') return false;
              // Ahora usamos los campos filtrados del proxy
              const cargo = (item.position || '').toUpperCase();
              return jefesKeywords.some(keyword => cargo.includes(keyword));
            })
            .map((item: any) => {
              // Usar los campos filtrados: name, email, position
              const nombre = item.name || 'Nombre no disponible';
              const cargo = item.position || '';
              const email = item.email || '';

              let displayName = nombre;
              if (cargo && nombre !== 'Nombre no disponible') {
                displayName = `${nombre} - ${cargo}`;
              }

              return {
                name: displayName,
                email: email
              };
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

  const reasonsRequiringEvidence: RequestReason[] = [
    'Permiso', 'Incapacidad', 'Renuncia', 'Duelo/Matrimonio/Nacimiento', 'Pre-aprobado'
  ];

  const handleEmailChange = (value: string) => {
    // Eliminar espacios al inicio y final del email
    const trimmedEmail = value.trim();
    let detectedCountry = '';
    const lowerEmail = trimmedEmail.toLowerCase();
    if (lowerEmail.includes('.sv')) {
      detectedCountry = 'El Salvador';
    } else if (lowerEmail.includes('.gt')) {
      detectedCountry = 'Guatemala';
    }
    setForm(prev => ({ ...prev, email: trimmedEmail, country: detectedCountry }));
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
    setIsSubmitting(true);

    try {
      let base64File = null;
      if (form.attachment) {
        base64File = await fileToBase64(form.attachment);
      }

      const payload = {
        ...form,
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

    const needsDates = ['Vacaciones', 'Permiso', 'Incapacidad', 'Home Office', 'Goce de dias libres compensatorios', 'Duelo/Matrimonio/Nacimiento'].includes(form.reason);
    if (needsDates && (!form.startDate || !form.endDate)) return false;
    if (form.reason === 'Permiso' && (!form.startTime || !form.endTime)) return false;
    if (form.reason === 'Incapacidad' && !form.incapacityDays) return false;
    if (reasonsRequiringEvidence.includes(form.reason as RequestReason) && !form.attachment) return false;
    return true;
  };

  const isDark = theme === 'dark';

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
              <h1 className={`text-2xl font-bold tracking-tight font-inter ${isDark ? 'text-white' : 'text-gray-900'}`}>Acción de Personal</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-12 py-16 space-y-16">
            {/* Datos Básicos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
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
                  <Building2 size={14} className="text-[#E60000]" />
                  País
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={form.country}
                    className={`w-full pb-3 text-base font-bold transition-all font-inter outline-none bg-transparent border-b-2 cursor-default ${isDark ? 'text-white border-white/10' : 'text-gray-900 border-gray-200'}`}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <ChevronRight size={14} className="text-[#E60000]" />
                  Jefe Inmediato
                </label>
                <div className="relative">
                  <select
                    required
                    disabled={isLoadingBosses}
                    className={`w-full pb-3 text-base font-medium transition-all duration-300 appearance-none font-inter outline-none bg-transparent border-b-2 pr-8 ${isDark ? 'text-white border-white/10 focus:border-[#E60000]' : 'text-gray-900 border-gray-200 focus:border-[#E60000]'}`}
                    value={form.immediateBoss}
                    onChange={(e) => handleInputChange('immediateBoss', e.target.value)}
                  >
                    <option value="" disabled className={isDark ? 'bg-zinc-900' : 'bg-white'}>
                      {isLoadingBosses ? 'Cargando...' : 'Seleccionar'}
                    </option>
                    {bosses.map((boss, idx) => (
                      <option key={idx} value={boss.name} className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>
                        {boss.name}
                      </option>
                    ))}
                  </select>
                  {isLoadingBosses ? (
                    <Loader2 className="absolute right-0 bottom-3 text-[#E60000] animate-spin" size={18} />
                  ) : (
                    <ChevronDown className="absolute right-0 bottom-3 opacity-40 pointer-events-none" size={18} />
                  )}
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
                  <option value="Permiso" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Permiso</option>
                  <option value="Incapacidad" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Incapacidad</option>
                  <option value="Renuncia" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Renuncia</option>
                  <option value="Duelo/Matrimonio/Nacimiento" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Duelo / Matrimonio / Nacimiento</option>
                  <option value="Home Office" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Home Office</option>
                  <option value="Goce de dias libres compensatorios" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Días Compensatorios</option>
                  <option value="Pre-aprobado" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Pre-aprobado</option>
                  <option value="Consulta Médica - Emergencia" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Consulta Médica</option>
                  <option value="Otras Solicitudes de Colaborador" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Otras (Colaborador)</option>
                  <option value="Otras Solicitudes de Jefatura" className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Otras (Jefatura)</option>
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
                  {['Vacaciones', 'Permiso', 'Incapacidad', 'Home Office', 'Goce de dias libres compensatorios', 'Duelo/Matrimonio/Nacimiento'].includes(form.reason) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className={`text-xs font-semibold uppercase tracking-wider font-inter ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Fecha Inicio
                        </label>
                        <input
                          type="date"
                          required
                          className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10' : 'bg-white text-gray-900 border border-gray-200'}`}
                          value={form.startDate}
                          onChange={(e) => handleInputChange('startDate', e.target.value)}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className={`text-xs font-semibold uppercase tracking-wider font-inter ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Fecha Fin
                        </label>
                        <input
                          type="date"
                          required
                          className={`w-full px-5 py-4 rounded-xl text-base font-medium transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10' : 'bg-white text-gray-900 border border-gray-200'}`}
                          value={form.endDate}
                          onChange={(e) => handleInputChange('endDate', e.target.value)}
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Comentarios */}
            <div className="space-y-4">
              <label className={`text-xs font-semibold uppercase tracking-wider font-inter flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <MessageSquare size={14} className="text-[#E60000]" />
                Observaciones
              </label>
              <textarea
                required
                rows={6}
                placeholder="Describe el motivo de tu solicitud..."
                className={`w-full px-6 py-5 rounded-2xl text-base font-medium resize-none transition-all duration-300 font-inter outline-none focus:ring-2 focus:ring-[#E60000]/30 ${isDark ? 'bg-white/5 text-white border border-white/10 placeholder:text-white/30' : 'bg-gray-50 text-gray-900 border border-gray-200 placeholder:text-gray-400'}`}
                value={form.comments}
                onChange={(e) => handleInputChange('comments', e.target.value)}
              />
            </div>

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
                disabled={!isFormValid() || isSubmitting}
                className={`flex-1 md:flex-initial md:min-w-[300px] py-5 px-10 rounded-2xl font-bold text-lg transition-all duration-300 font-inter flex items-center justify-center gap-3 ${!isFormValid() || isSubmitting ? 'opacity-40 cursor-not-allowed bg-[#E60000]' : 'bg-[#E60000] hover:bg-[#cc0000] hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#E60000]/30'} text-white`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={22} />
                    <span>Enviando...</span>
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
