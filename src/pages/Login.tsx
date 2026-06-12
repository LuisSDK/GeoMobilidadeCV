import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_CREDENTIALS } from '../lib/constants';
import { Zap, MapPin, BarChart3, Bot, Shield, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';

type Mode = 'login' | 'register';

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Password validation
  function validatePassword(pw: string): string | null {
    if (pw.length < 8) return 'A palavra-passe deve ter pelo menos 8 caracteres';
    if (!/[A-Z]/.test(pw)) return 'A palavra-passe deve conter pelo menos uma letra maiúscula';
    if (!/[a-z]/.test(pw)) return 'A palavra-passe deve conter pelo menos uma letra minúscula';
    if (!/[0-9]/.test(pw)) return 'A palavra-passe deve conter pelo menos um número';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return 'A palavra-passe deve conter pelo menos um carácter especial';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'register') {
      if (!nome.trim()) {
        setError('Por favor, introduza o seu nome.');
        return;
      }
      if (password !== confirmPassword) {
        setError('As palavras-passe não coincidem.');
        return;
      }
      const pwError = validatePassword(password);
      if (pwError) {
        setError(pwError);
        return;
      }
      setLoading(true);
      const { error: err } = await signUp(email, password, nome.trim());
      setLoading(false);
      if (err) {
        setError(err);
      } else {
        setSuccess('Conta criada com sucesso! Por favor, verifique o seu email para ativar a conta.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }
    } else {
      setLoading(true);
      const { error: err, role } = await signIn(email, password);
      setLoading(false);
      if (err) {
        setError('Credenciais inválidas. Verifique o email e palavra-passe.');
      } else {
        const targetRole = role ?? (email === 'admin@geomobilidade.cv' ? 'admin' : 'utilizador');
        navigate(targetRole === 'admin' ? '/admin' : '/mapa', { replace: true });
      }
    }
  }

  function fillDemo(type: 'admin' | 'user') {
    const c = DEMO_CREDENTIALS[type];
    setEmail(c.email);
    setPassword(c.password);
    setMode('login');
  }

  const features = [
    { icon: MapPin, label: 'Mapa Interativo WebGIS' },
    { icon: BarChart3, label: 'Dashboard Estatístico' },
    { icon: Zap, label: 'Análise de Cobertura SIG' },
    { icon: Bot, label: 'Chatbot Inteligente' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-cv-blue via-blue-800 to-blue-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" viewBox="0 0 800 600" fill="none">
            <circle cx="400" cy="300" r="250" stroke="white" strokeWidth="1"/>
            <circle cx="400" cy="300" r="180" stroke="white" strokeWidth="1"/>
            <circle cx="400" cy="300" r="110" stroke="white" strokeWidth="1"/>
            <line x1="0" y1="300" x2="800" y2="300" stroke="white" strokeWidth="1"/>
            <line x1="400" y1="0" x2="400" y2="600" stroke="white" strokeWidth="1"/>
            {[30,60,90,120,150].map(a => (
              <line key={a}
                x1={400 + 260 * Math.cos((a*Math.PI)/180)} y1={300 + 260 * Math.sin((a*Math.PI)/180)}
                x2={400 - 260 * Math.cos((a*Math.PI)/180)} y2={300 - 260 * Math.sin((a*Math.PI)/180)}
                stroke="white" strokeWidth="0.5"/>
            ))}
          </svg>
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cv-teal rounded-xl flex items-center justify-center">
              <Zap size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-white leading-tight">
              <span className="text-white/90 font-bold block">GeoMobilidade CV</span>
              <span className="text-cv-gold block">Cabo Verde</span>
            </h3>
          </div>
        </div>

        <p className="text-blue-200 mb-8 text-base leading-relaxed max-w-sm">
            Portal WebGIS de gestão e análise da rede nacional de carregamento de veículos elétricos:
        </p>

        <div className="relative space-y-4 -my-8">
          {features.map(f => (
            <div key={f.label} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <f.icon size={15} className="text-cv-gold" />
              </div>
              <span className="text-blue-100 text-sm">{f.label}</span>
            </div>
          ))}
        </div>

        <div className="relative border-t border-white/10 pt-2 my-16">
          <p className="text-blue-300 text-xs">
            © 2024 GeoMobilidade Cabo Verde
          </p>
          <p className="text-blue-400 text-xs mt-1">República de Cabo Verde</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-cv-blue rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-cv-blue">GeoMobilidade CV</span>
          </div>

          <div className="bg-white rounded-2xl shadow-modal p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                {mode === 'login' ? 'Bem-vindo' : 'Criar Conta'}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {mode === 'login' ? 'Autentique-se para aceder ao portal' : 'Registe-se para aceder ao portal'}
              </p>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-2 mb-6 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'login' ? 'bg-white shadow text-cv-blue' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LogIn size={14} /> Entrar
              </button>
              <button
                onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'register' ? 'bg-white shadow text-cv-blue' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <UserPlus size={14} /> Registar
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6 fade-in">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3 mb-6 fade-in">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome completo</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    required
                    placeholder="O seu nome"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 focus:border-cv-blue transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="utilizador@exemplo.cv"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 focus:border-cv-blue transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Palavra-passe</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 focus:border-cv-blue transition-all pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
                {mode === 'register' && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Mín. 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 carácter especial
                  </p>
                )}
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar palavra-passe</label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 focus:border-cv-blue transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cv-blue hover:bg-blue-800 text-white py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading
                  ? (mode === 'login' ? 'A autenticar...' : 'A criar conta...')
                  : (mode === 'login' ? 'Entrar no Portal' : 'Criar Conta')}
              </button>
            </form>

            {mode === 'login' && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contas de demonstração</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => fillDemo('admin')}
                    className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 hover:border-cv-blue/30 transition-all"
                  >
                    <Shield size={13} className="text-cv-blue" />
                    <div className="text-left">
                      <div className="font-semibold">Administrador</div>
                      <div className="text-slate-400 text-[10px]">Demo</div>
                    </div>
                  </button>
                  <button
                    onClick={() => fillDemo('user')}
                    className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 hover:border-cv-blue/30 transition-all"
                  >
                    <MapPin size={13} className="text-cv-teal" />
                    <div className="text-left">
                      <div className="font-semibold">Utilizador</div>
                      <div className="text-slate-400 text-[10px]">Demo</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
