import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Lock, Upload, Eye, EyeOff, ChevronDown, Search, X, Check, AlertCircle
} from 'lucide-react';
import { Layout } from '@components/layout/Layout';
import { useAuthStore } from '@store/index';
import { authService } from '@services/supabase';
import { recruiterService, userService } from '@services/api';
import { ROUTES, USER_ROLES, INDUSTRY_TYPES } from '@constants/index';
import {
  validateEmail,
  validatePassword,
  validateFileSize,
} from '@utils/index';
import toast from 'react-hot-toast';

const RECRUITER_REGISTER_VIDEO_URL = 'https://ydvnozzigjihcachxnah.supabase.co/storage/v1/object/sign/website%20public/login1.mp4?token=eyJraWQiOiJjNjk4MjVmYS1iN2I5LTQ5OWItODBjMi1hZjRkNTQ4ZWQ3YjIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlIHB1YmxpYy9sb2dpbjEubXA0Iiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4OTg4NTI4NywiZXhwIjoyNDIwNjA1Mjg3fQ.Ez1vwU3QZa0AOW2vrHZM8UAeUFgiGHzlK_weBv6Hv3k';
const RECRUITER_SIDE_VIDEO_URL = 'https://ydvnozzigjihcachxnah.supabase.co/storage/v1/object/sign/website%20public/recruiter.mp4?token=eyJraWQiOiJjNjk4MjVmYS1iN2I5LTQ5OWItODBjMi1hZjRkNTQ4ZWQ3YjIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlIHB1YmxpYy9yZWNydWl0ZXIubXA0Iiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4OTg5NzU5OCwiZXhwIjoyMTA1MjU3NTk4fQ.NnlHw9gHCUHefjBdpqKRhVUl1UmG24JPK5fe4mGml28';
const RECRUITER_EMAIL_REDIRECT_URL = 'https://jobpoyt.com/recruiter/dashboard';

// ── Country codes ──────────────────────────────────────────────────────────────
const CountryCodes = [
  { code: '+91', name: 'India' },
  { code: '+1', name: 'USA/Canada' },
  { code: '+44', name: 'UK' },
  { code: '+61', name: 'Australia' },
  { code: '+33', name: 'France' },
  { code: '+49', name: 'Germany' },
  { code: '+39', name: 'Italy' },
  { code: '+34', name: 'Spain' },
  { code: '+31', name: 'Netherlands' },
  { code: '+46', name: 'Sweden' },
  { code: '+47', name: 'Norway' },
  { code: '+41', name: 'Switzerland' },
  { code: '+43', name: 'Austria' },
  { code: '+60', name: 'Malaysia' },
  { code: '+65', name: 'Singapore' },
  { code: '+66', name: 'Thailand' },
  { code: '+81', name: 'Japan' },
  { code: '+86', name: 'China' },
  { code: '+55', name: 'Brazil' },
  { code: '+27', name: 'South Africa' },
];

// ── Floating Label Input ────────────────────────────────────────────────────────
interface FloatingInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  prefix?: string;
  required?: boolean;
  showToggle?: boolean;
  onToggle?: () => void;
  showPassword?: boolean;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  label, name, value, onChange, error, type = 'text', placeholder, prefix, required,
  showToggle, onToggle, showPassword,
}) => {
  const inputType = showToggle ? (showPassword ? 'text' : 'password') : type;
  return (
    <div className="relative">
      <input
        type={inputType}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder || ' '}
        required={required}
        aria-required={required}
        className={`
          w-full min-h-[52px] px-3 py-2.5 pt-5 rounded-lg border-2 transition-all duration-200
          bg-white text-gray-900 placeholder-transparent text-sm font-medium
          peer focus:outline-none focus:ring-0
          ${error
          ? 'border-red-300 focus:border-red-500'
          : 'border-slate-300 hover:border-slate-400 focus:border-blue-500'
        }
        `}
        style={{ paddingLeft: prefix ? '3.5rem' : '0.75rem' }}
      />
      <label
        className={`
          absolute left-3 top-1 text-xs font-semibold transition-all duration-200 pointer-events-none
          peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:font-medium peer-placeholder-shown:text-gray-400
          peer-focus:top-1 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-semibold
        ${error ? 'text-red-600' : 'peer-focus:text-blue-600'}
        `}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
          {prefix}
        </span>
      )}

      {showToggle && (
        <div
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onToggle?.();
          }}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer p-1"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </div>
      )}

      {error && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-5 left-3 text-xs text-red-500 font-medium flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </motion.div>
      )}
    </div>
  );
};

// ── Floating Textarea ──────────────────────────────────────────────────────────
interface FloatingTextareaProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

const FloatingTextarea: React.FC<FloatingTextareaProps> = ({
  label, name, value, onChange, error, placeholder, required, rows = 3,
}) => {
  return (
    <div className="relative">
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder || ' '}
        required={required}
        rows={rows}
        aria-required={required}
        className={`
          w-full px-3 py-2.5 pt-5 rounded-lg border transition-all duration-200
          bg-white text-gray-900 placeholder-transparent text-sm font-medium
          peer focus:outline-none focus:ring-0 resize-none
          ${error
          ? 'border-red-300 focus:border-red-500'
          : 'border-gray-300 hover:border-gray-400 focus:border-blue-500'
        }
        `}
      />
      <label
        className={`
          absolute left-3 top-1 text-xs font-semibold transition-all duration-200 pointer-events-none
          peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-placeholder-shown:font-medium peer-placeholder-shown:text-gray-400
          peer-focus:top-1 peer-focus:text-xs peer-focus:font-semibold
        ${error ? 'text-red-600' : 'peer-focus:text-blue-600'}
        `}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {error && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-5 left-4 text-xs text-red-500 font-medium flex items-center gap-1">
          <AlertCircle size={14} />
          {error}
        </motion.div>
      )}
    </div>
  );
};

// ── Searchable Multiselect ─────────────────────────────────────────────────────
interface MultiSelectProps {
  label: string;
  name: string;
  value: string[];
  onChange: (values: string[]) => void;
  options: string[];
  error?: string;
  required?: boolean;
}

const SearchableMultiSelect: React.FC<MultiSelectProps> = ({
  label, name, value, onChange, options, error, required,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => options.filter(opt => opt.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleOption = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          w-full px-4 py-3 pt-6 rounded-xl border-2 transition-all duration-200 text-left
          flex items-center justify-between relative bg-white text-sm
          ${open ? 'border-blue-500 ring-2 ring-blue-100' :
          error ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'
        }
        `}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        id={name}
      >
        <div className="flex-1">
          <label className={`
            absolute left-4 transition-all duration-200 pointer-events-none font-semibold
            ${open || value.length > 0 ? 'top-1.5 text-xs text-gray-700' : 'top-3.5 text-base text-gray-500'
          }`}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="pt-1.5">
            {value.length === 0 ? (
              <span className="text-gray-500">Select options...</span>
            ) : (
              <span className="text-blue-600 font-semibold">{value.length} selected</span>
            )}
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Chips */}
      {value.length > 0 && !open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2 mt-2"
        >
          {value.map(item => (
            <motion.div
              key={item}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold"
            >
              {item}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOption(item);
                }}
                className="cursor-pointer hover:bg-red-500 hover:text-white rounded-full w-5 h-5 flex items-center justify-center transition-all duration-150 hover:scale-110"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    toggleOption(item);
                  }
                }}
                aria-label={`Remove ${item}`}
              >
                <X size={12} strokeWidth={3} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {error && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-5 left-4 text-xs text-red-500 font-medium flex items-center gap-1">
          <AlertCircle size={14} />
          {error}
        </motion.div>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
            role="listbox"
          >
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search options..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-center text-sm text-gray-500">No options found</div>
              ) : (
                filtered.map(opt => (
                  <label
                    key={opt}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors cursor-pointer group"
                    role="option"
                    aria-selected={value.includes(opt)}
                  >
                    <input
                      type="checkbox"
                      checked={value.includes(opt)}
                      onChange={() => toggleOption(opt)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className={`text-sm ${value.includes(opt) ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {opt}
                    </span>
                  </label>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Password Strength Meter ────────────────────────────────────────────────────
interface PasswordStrengthProps {
  password: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthProps> = ({ password }) => {
  const calculateStrength = () => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return Math.min(5, Math.ceil(strength / 1.5));
  };

  const strength = calculateStrength();
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
  const strengthLabel = strengthLabels[Math.max(0, strength - 1)];
  const strengthColor = strengthColors[Math.max(0, strength - 1)];

  const requirements = [
    { met: password.length >= 8, label: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), label: 'Uppercase letter' },
    { met: /[a-z]/.test(password), label: 'Lowercase letter' },
    { met: /[0-9]/.test(password), label: 'Number' },
  ];

  return (
    <div className="space-y-3">
      {password && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${strengthColor}`}
                initial={{ width: 0 }}
                animate={{ width: `${(strength / 5) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className={`text-xs font-bold ${strengthColor.replace('bg-', 'text-')}`}>
              {strengthLabel}
            </span>
          </div>

          <div className="flex w-full items-center justify-between gap-1">
            {requirements.map((req, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex shrink-0 items-center gap-0.5 text-[8px] whitespace-nowrap"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  {req.met ? (
                    <Check size={11} className="flex-shrink-0 text-green-500" strokeWidth={3} />
                  ) : (
                    <div className="w-2.5 h-2.5 border-2 border-gray-300 rounded" />
                  )}
                </motion.div>
                <span className={req.met ? 'text-gray-700 font-medium' : 'text-gray-500'}>
                  {req.label}
                </span>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Logo Upload ────────────────────────────────────────────────────────────────
interface LogoUploadProps {
  logo: File | null;
  preview: string | null;
  onChange: (file: File) => void;
}

const LogoUpload: React.FC<LogoUploadProps> = ({ logo, preview, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
        Company Logo <span className="text-gray-400 normal-case font-normal">(Optional, max 5MB)</span>
      </label>

      <label
        htmlFor="company-logo"
        className="group block border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-2xl p-8 cursor-pointer transition-all duration-200 bg-gray-50 hover:bg-blue-50/30"
      >
        {preview ? (
          <div className="flex items-center gap-4">
            <img src={preview} alt="logo" className="w-16 h-16 object-contain rounded-xl border border-gray-200 bg-white p-2" />
            <div>
              <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                <Check size={16} />
                {logo?.name}
              </div>
              <p className="text-xs text-gray-400 mt-1">Click to change</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600 group-hover:bg-blue-200 transition-colors">
              <Upload size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">Drop your logo here</p>
              <p className="text-xs text-gray-500 mt-0.5">PNG, JPG, SVG · up to 5 MB</p>
            </div>
          </div>
        )}

        <input
          type="file"
          id="company-logo"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!validateFileSize(file, 5)) {
              toast.error('Logo must be under 5MB');
              return;
            }
            onChange(file);
          }}
        />
      </label>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const RecruiterRegister: React.FC = () => {
  const navigate = useNavigate();
  const { setLoading } = useAuthStore();
  const [loading, setLoadingState] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [existingDialogOpen, setExistingDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.classList.add('recruiter-register-scrollbar-hidden');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.classList.remove('recruiter-register-scrollbar-hidden');
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const [formData, setFormData] = useState({
    companyName: '',
    gstNumber: '',
    cinNumber: '',
    companyEmail: '',
    companyPhoneCountry: '+91',
    companyPhone: '',
    companyWebsite: '',
    companyAddress: '',
    companyDescription: '',
    industryType: [] as string[],
    hrContactPerson: '',
    hrEmail: '',
    hrPhoneCountry: '+91',
    hrPhone: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    
    // Allow only numbers for phone fields and limit to 10 digits
    if (name === 'companyPhone' || name === 'hrPhone') {
      value = value.replace(/[^\d]/g, '').slice(0, 10);
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleIndustryChange = (values: string[]) => {
    setFormData(prev => ({ ...prev, industryType: values }));
    if (errors.industryType) setErrors(prev => ({ ...prev, industryType: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.hrContactPerson.trim()) newErrors.hrContactPerson = 'HR contact person is required';
    if (!validateEmail(formData.hrEmail)) newErrors.hrEmail = 'Valid HR email required';
    if (formData.hrPhone.length !== 10) newErrors.hrPhone = 'Phone must be exactly 10 digits';
    if (!validatePassword(formData.password)) newErrors.password = 'Min 8 chars with uppercase, lowercase & number';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setLoadingState(true);
    setLoading(true);

    try {
      const response = await authService.signUp(formData.hrEmail, formData.password, {
        name: formData.hrContactPerson,
        role: USER_ROLES.RECRUITER,
        recruiterProfile: {
          hr_name: formData.hrContactPerson,
          hr_email: formData.hrEmail,
          hr_phone: formData.hrPhone,
        },
      }, RECRUITER_EMAIL_REDIRECT_URL);

      if (response.user) {
        if (response.session) {
          let logoUrl = '';
          if (companyLogo) {
            logoUrl = await userService.uploadCompanyLogo(response.user.id, companyLogo);
          }

          await recruiterService.createRecruiterProfile(response.user.id, {
            ...response.user.user_metadata?.recruiterProfile,
            company_logo_url: logoUrl,
          } as Record<string, unknown>);
        }

        setVerifyDialogOpen(true);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Recruiter registration error:', error);
      if (/already/i.test(msg)) {
        setExistingDialogOpen(true);
      } else {
        toast.error(msg || 'Registration failed');
      }
    } finally {
      setLoadingState(false);
      setLoading(false);
    }
  };

  return (
    <Layout footer={false}>
      <div className="recruiter-register-page relative min-h-screen overflow-hidden py-1 sm:py-2 px-4 sm:px-6 lg:px-8">
        <video
          className="fixed inset-0 h-full w-full object-cover pointer-events-none -z-20"
          src={RECRUITER_REGISTER_VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:min-h-[calc(100vh-84px)] lg:grid-cols-[minmax(0,0.85fr)_minmax(420px,0.95fr)] gap-6 items-start lg:items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
                className="w-full max-w-xs mx-auto lg:max-w-none h-[450px] lg:h-[640px] rounded-2xl overflow-hidden border border-white/70 shadow-xl bg-black/10"
            >
              <video
                className="block w-full h-full object-cover"
                src={RECRUITER_SIDE_VIDEO_URL}
                autoPlay
                muted
                loop
                playsInline
                aria-label="Recruiter overview video"
              />
            </motion.div>

            <div className="min-w-0">
              {/* Hero Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-4"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-400/25 via-blue-500/20 to-violet-500/25 text-blue-700 text-xs font-bold px-4 py-2 rounded-full border border-cyan-200/70 mb-3"
                >
                  <Building2 size={16} />
                  <span>Premium Recruiter Portal</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl sm:text-2xl lg:text-3xl font-black bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 bg-clip-text text-transparent mb-1 leading-tight tracking-tight whitespace-nowrap"
                >
                  Recruiter Registration
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-slate-600 text-[11px] sm:text-xs whitespace-nowrap"
                >
                  Join thousands of recruiters hiring top talent. Get started in minutes.
                </motion.p>
              </motion.div>

              {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="max-w-sm mx-auto bg-white/90 backdrop-blur-xl rounded-2xl border border-white/60 shadow-2xl overflow-hidden"
          >
            <form onSubmit={handleSubmit} noValidate className="divide-y divide-gray-100">
              {/* STEP 1: Company Info */}
              <motion.div
                initial={currentStep !== 1 ? { opacity: 0, x: 100 } : {}}
                animate={currentStep === 1 ? { opacity: 1, x: 0 } : currentStep > 1 ? { opacity: 0, x: -100 } : {}}
                transition={{ duration: 0.4 }}
                className="hidden"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-2xl text-blue-600 mt-1 flex-shrink-0">
                    <Building2 size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Company Information</h2>
                    <p className="text-gray-500 text-sm mt-1">Tell us about your organization</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <FloatingInput
                    label="Company Name"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    error={errors.companyName}
                    required
                  />

                  <SearchableMultiSelect
                    label="Industry Type"
                    name="industryType"
                    value={formData.industryType}
                    onChange={handleIndustryChange}
                    options={INDUSTRY_TYPES}
                    error={errors.industryType}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FloatingInput
                      label="GST Number"
                      name="gstNumber"
                      value={formData.gstNumber}
                      onChange={handleChange}
                      error={errors.gstNumber}
                      required
                    />
                    <FloatingInput
                      label="CIN Number"
                      name="cinNumber"
                      value={formData.cinNumber}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FloatingInput
                      label="Company Email"
                      name="companyEmail"
                      type="email"
                      value={formData.companyEmail}
                      onChange={handleChange}
                      error={errors.companyEmail}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Company Phone
                    </label>
                    <div className="flex gap-2">
                      <div className="relative w-24">
                        <select
                          name="companyPhoneCountry"
                          value={formData.companyPhoneCountry}
                          onChange={handleChange}
                          className="w-full appearance-none pl-3 pr-8 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white text-sm font-medium"
                        >
                          {CountryCodes.map(cc => (
                            <option key={cc.code} value={cc.code}>
                              {cc.code}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                      </div>
                      <div className="flex-1">
                        <FloatingInput
                          label="Phone"
                          name="companyPhone"
                          value={formData.companyPhone}
                          onChange={handleChange}
                          error={errors.companyPhone}
                        />
                      </div>
                    </div>
                  </div>

                  <FloatingInput
                    label="Company Website"
                    name="companyWebsite"
                    type="url"
                    value={formData.companyWebsite}
                    onChange={handleChange}
                    error={errors.companyWebsite}
                    required
                  />

                  <FloatingTextarea
                    label="Registered Address"
                    name="companyAddress"
                    value={formData.companyAddress}
                    onChange={handleChange}
                    error={errors.companyAddress}
                    required
                    rows={2}
                  />

                  <FloatingTextarea
                    label="Company Description"
                    name="companyDescription"
                    value={formData.companyDescription}
                    onChange={handleChange}
                    error={errors.companyDescription}
                    required
                    rows={3}
                  />

                  <LogoUpload
                    logo={companyLogo}
                    preview={logoPreview}
                    onChange={(file) => {
                      setCompanyLogo(file);
                      setLogoPreview(URL.createObjectURL(file));
                    }}
                  />
                </div>

                <motion.button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                >
                  Continue to HR Contact
                  <ChevronDown size={20} className="rotate-270" />
                </motion.button>
              </motion.div>

              {/* STEP 2: HR Contact */}
              <motion.div
                initial={currentStep !== 1 ? { opacity: 0, x: 100 } : {}}
                animate={currentStep === 1 ? { opacity: 1, x: 0 } : currentStep > 1 ? { opacity: 0, x: -100 } : {}}
                transition={{ duration: 0.4 }}
                className={currentStep === 1 ? 'p-4 sm:p-5 space-y-2' : 'hidden'}
              >
                <div className="space-y-4">
                  <FloatingInput
                    label="HR / Recruiter Name"
                    name="hrContactPerson"
                    value={formData.hrContactPerson}
                    onChange={handleChange}
                    error={errors.hrContactPerson}
                    required
                  />

                  <FloatingInput
                    label="Work Email"
                    name="hrEmail"
                    type="email"
                    value={formData.hrEmail}
                    onChange={handleChange}
                    error={errors.hrEmail}
                    required
                  />

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-3">
                      <select
                        name="hrPhoneCountry"
                        value={formData.hrPhoneCountry}
                        onChange={handleChange}
                        className="w-20 px-2 py-2 rounded-lg border-2 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white text-sm font-medium"
                      >
                        {CountryCodes.map(cc => (
                          <option key={cc.code} value={cc.code}>
                            {cc.code}
                          </option>
                        ))}
                      </select>
                      <div className="flex-1">
                        <FloatingInput
                          label="Enter mobile number"
                          name="hrPhone"
                          value={formData.hrPhone}
                          onChange={handleChange}
                          error={errors.hrPhone}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <FloatingInput
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    required
                    showToggle
                    showPassword={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                  />

                  <PasswordStrengthMeter password={formData.password} />

                  <FloatingInput
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    required
                    showToggle
                    showPassword={showConfirm}
                    onToggle={() => setShowConfirm(!showConfirm)}
                  />
                </div>

                <div className="flex justify-end mt-4">
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-auto min-w-32 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-2 px-5 rounded-lg transition-all duration-200 shadow-lg shadow-blue-200 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Registering...' : 'Register'}
                  </motion.button>
                </div>
              </motion.div>

              {/* STEP 3: Account Setup */}
              <motion.div
                initial={currentStep !== 2 ? { opacity: 0, x: 100 } : {}}
                animate={currentStep === 2 ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4 }}
                className={currentStep === 2 ? 'p-4 sm:p-5 space-y-2' : 'hidden'}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600 mt-1 flex-shrink-0">
                    <Lock size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Account Setup</h2>
                    <p className="text-gray-500 text-sm mt-1">Create your recruiter login credentials</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Terms */}
                  <div className="pt-2 text-xs text-gray-500 text-center">
                    By registering, you agree to our{' '}
                    <Link to={ROUTES.TERMS_CONDITIONS} className="text-blue-600 hover:underline font-semibold">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link to={ROUTES.PRIVACY_POLICY} className="text-blue-600 hover:underline font-semibold">
                      Privacy Policy
                    </Link>
                    .
                  </div>
                </div>

                <div className="flex gap-3 mt-5">
                  <motion.button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl transition-all duration-200"
                  >
                    Back
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.02 } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Building2 size={20} />
                        </motion.div>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        Register Company
                      </>
                    )}
                  </motion.button>
                </div>

                <p className="text-center text-sm text-gray-600 mt-4">
                  Already have an account?{' '}
                  <Link to={ROUTES.LOGIN} className="text-blue-600 font-bold hover:underline">
                    Sign in
                  </Link>
                </p>
              </motion.div>
            </form>
          </motion.div>

              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-3 mt-2 flex-wrap"
              >
                {['🔒 ISO 27001', '✅ GDPR Compliant', '⭐ Enterprise Grade'].map((badge, idx) => (
                  <div key={idx} className="text-[11px] font-semibold text-gray-600">
                    {badge}
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Verify Email Modal */}
      <AnimatePresence>
        {verifyDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setVerifyDialogOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm">
                  <Check size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Verify Your Email</h2>
                  <p className="text-xs text-green-600 font-semibold mt-0.5">Registration successful</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-6 mb-6">
                A confirmation email has been sent to <span className="font-semibold">{formData.hrEmail}</span>.
                Please verify your email before logging in.
              </p>
              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={() => window.open('https://mail.google.com', '_blank')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-blue-200"
                >
                  Open Email
                </motion.button>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    onClick={async () => {
                      try {
                        await authService.resendVerificationEmail(formData.hrEmail, RECRUITER_EMAIL_REDIRECT_URL);
                        toast.success('Confirmation email resent');
                      } catch (error) {
                        const message = error instanceof Error ? error.message : 'Unable to resend email';
                        toast.error(message);
                      }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="border border-blue-300 bg-white text-blue-700 font-bold py-2.5 px-3 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-all shadow-sm"
                  >
                    Resend Email
                  </motion.button>
                  <motion.button
                    onClick={() => setVerifyDialogOpen(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="border border-slate-200 bg-slate-50 text-slate-600 font-bold py-2.5 px-3 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm"
                  >
                    Re-edit
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Exists Modal */}
      <AnimatePresence>
        {existingDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setExistingDialogOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <AlertCircle size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Account Already Exists</h2>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                An account with this email already exists. If you have already verified your email, please sign in to continue.
              </p>
              <div className="flex gap-3">
                <motion.button
                  onClick={() => navigate(ROUTES.LOGIN)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all"
                >
                  Sign In
                </motion.button>
                <motion.button
                  onClick={() => setExistingDialogOpen(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 border border-gray-300 text-gray-700 font-bold py-2.5 px-4 rounded-xl hover:bg-gray-50 transition-all"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};
