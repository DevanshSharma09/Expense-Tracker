import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import hamsterMascot from '../../assets/security-hamster.jpg';

const pageVariants = {
  initial: { opacity: 0, y: 18, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, filter: 'blur(8px)' },
};

const inputBase =
  'h-12 w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 hover:border-white/20 focus:border-cyan-300/60 focus:bg-white/[0.08] focus:shadow-[0_0_0_4px_rgba(103,232,249,0.08)]';

function AmbientParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        id: index,
        left: `${8 + ((index * 37) % 84)}%`,
        top: `${10 + ((index * 23) % 78)}%`,
        size: 2 + (index % 4),
        delay: (index % 7) * 0.28,
        duration: 5 + (index % 5),
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute rounded-full bg-cyan-200/50 shadow-[0_0_16px_rgba(103,232,249,0.75)]"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
          }}
          animate={{ y: [-8, 10, -8], opacity: [0.15, 0.75, 0.15], scale: [1, 1.45, 1] }}
          transition={{ duration: particle.duration, delay: particle.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function AuthHero() {
  return (
    <section className="relative flex min-h-[46vh] flex-1 overflow-hidden bg-[#121212] px-6 py-8 sm:px-10 lg:min-h-screen lg:px-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,rgba(139,92,246,0.24),transparent_31%),radial-gradient(circle_at_78%_72%,rgba(52,211,153,0.16),transparent_29%),linear-gradient(135deg,#121212_0%,#0f1015_48%,#090a0f_100%)]" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.11)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute -left-28 top-28 h-72 w-72 rounded-full bg-violet-500/18 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
      <AmbientParticles />

      <div className="relative z-10 flex w-full flex-col justify-between">
        <div className="flex items-center justify-between gap-4 text-xs uppercase text-zinc-400">
          <span className="font-bold tracking-[0.24em] text-white">SMART EXPENSE BOOK</span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-medium tracking-[0.18em] text-zinc-400">
            SECURE LEDGER v1.0
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 py-10 text-center">
          <motion.div
            className="relative rounded-[2rem] border border-emerald-300/20 bg-[#171717]/90 p-4 shadow-[0_28px_100px_rgba(0,0,0,0.78),0_0_54px_rgba(139,92,246,0.16)] backdrop-blur-xl"
            animate={{ y: [-8, 8, -8] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute -inset-8 rounded-full bg-emerald-300/12 blur-3xl" />
            <div className="absolute inset-x-10 bottom-3 h-10 rounded-full bg-black/80 blur-xl" />
            <img
              src={hamsterMascot}
              alt="Financial analyst hamster mascot"
              className="relative aspect-square h-56 rounded-[1.45rem] border border-white/10 object-cover shadow-[0_24px_80px_rgba(0,0,0,0.7)] sm:h-72"
            />
            <div className="absolute -right-5 top-10 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-[11px] font-medium text-emerald-100 shadow-2xl backdrop-blur-md">
              Audits 24/7
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.55 }}
            className="space-y-3"
          >
            <h1 className="mx-auto max-w-lg text-[2.5rem] font-bold leading-tight text-white">
              Smart splits, zero awkward money talks.
            </h1>
            <p className="inline-flex items-center justify-center gap-2 text-base text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
              Your shared ledger is safe here.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-[11px] text-zinc-500">
          <span>Shared wallets</span>
          <span className="text-center">Encrypted ledger</span>
          <span className="text-right">MERN ready</span>
        </div>
      </div>
    </section>
  );
}

function AuthField({ label, ...props }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <input className={inputBase} {...props} />
    </label>
  );
}

export default function AuthPage({ mode, onSubmit }) {
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();

    if (isRegister && form.password !== form.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050506] text-white lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <AuthHero />

      <section className="relative flex min-h-[54vh] items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(124,58,237,0.18),transparent_34%),linear-gradient(180deg,#09090b,#050506)]" />
        <div className="absolute right-12 top-20 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.42, ease: 'easeOut' }}
            className="relative w-full max-w-md"
          >
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.065] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.58)] backdrop-blur-2xl sm:p-8">
              <div className="mb-8">
                <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs text-cyan-100/80">
                  Developer identity console
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-white">
                  {isRegister ? 'Create account' : 'Sign in'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {isRegister
                    ? 'Spin up a secure workspace for shipping serious code.'
                    : 'Enter your secure workspace and keep the build moving.'}
                </p>
              </div>

              <form className="space-y-4" onSubmit={submit}>
                {isRegister && (
                  <AuthField label="Full Name" type="text" placeholder="Ada Lovelace" value={form.name} onChange={updateField('name')} required />
                )}
                <AuthField label="Email" type="email" placeholder="you@company.dev" value={form.email} onChange={updateField('email')} required />
                <AuthField label="Password" type="password" placeholder="Enter your passphrase" value={form.password} onChange={updateField('password')} required />
                {isRegister && (
                  <AuthField
                    label="Confirm Password"
                    type="password"
                    placeholder="Confirm your passphrase"
                    value={form.confirmPassword}
                    onChange={updateField('confirmPassword')}
                    required
                  />
                )}

                {!isRegister && (
                  <div className="flex justify-end">
                    <button type="button" className="text-sm text-zinc-400 transition hover:text-cyan-200">
                      Forgot Password
                    </button>
                  </div>
                )}

                <motion.button
                  type="submit"
                  whileHover={{ y: -1, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={loading}
                  className="mt-2 h-12 w-full rounded-2xl bg-white text-sm font-semibold text-zinc-950 shadow-[0_12px_40px_rgba(255,255,255,0.16)] transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Securing session...' : isRegister ? 'Create Account' : 'Sign In'}
                </motion.button>
              </form>

              <p className="mt-7 text-center text-sm text-zinc-400">
                {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                <Link className="font-medium text-cyan-200 transition hover:text-white" to={isRegister ? '/login' : '/register'}>
                  {isRegister ? 'Sign In' : 'Register'}
                </Link>
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  );
}
