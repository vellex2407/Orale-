import React, { useState } from 'react';
import { AlertCircle, LockKeyhole, UserRound, X } from 'lucide-react';

interface PatientAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => Promise<void>;
}

type AuthMode = 'login' | 'register';

export const PatientAuthModal: React.FC<PatientAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (mode === 'register' && password !== passwordConfirmation) {
      setError('Your passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'register') {
        const registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            phone,
            dateOfBirth,
            password,
          }),
        });
        const registration = await registerResponse.json();
        if (!registerResponse.ok) {
          throw new Error(registration.message || 'Unable to create your account.');
        }
      }

      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const login = await loginResponse.json();
      if (!loginResponse.ok) {
        throw new Error(login.message || 'Unable to log in.');
      }

      await onAuthenticated();
      onClose();
      setPassword('');
      setPasswordConfirmation('');
    } catch (submitError) {
      console.error('Patient authentication failed:', submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to complete your request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-xs sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-auth-title"
        className="relative my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="bg-gradient-to-r from-teal-900 via-teal-700 to-teal-500 px-5 py-5 text-white sm:px-7">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account dialog"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-teal-50 hover:bg-white/15"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            {mode === 'login' ? (
              <LockKeyhole className="h-5 w-5" />
            ) : (
              <UserRound className="h-5 w-5" />
            )}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-100">
            Orale' Patient Account
          </p>
          <h2 id="patient-auth-title" className="mt-1 text-xl font-bold">
            {mode === 'login' ? 'Welcome back' : 'Create your patient account'}
          </h2>
          <p className="mt-1 text-xs text-teal-50">
            Your profile and appointments are kept securely with the clinic.
          </p>
        </div>

        <div className="p-5 sm:p-7">
          <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => changeMode('login')}
              className={`rounded-md px-3 py-2 transition-colors ${
                mode === 'login' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500'
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => changeMode('register')}
              className={`rounded-md px-3 py-2 transition-colors ${
                mode === 'register' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500'
              }`}
            >
              Create account
            </button>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    First name
                    <input
                      required
                      minLength={2}
                      maxLength={120}
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">
                    Last name
                    <input
                      required
                      minLength={2}
                      maxLength={120}
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Phone number
                    <input
                      required
                      type="tel"
                      minLength={7}
                      maxLength={40}
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">
                    Date of birth
                    <input
                      required
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      autoComplete="bday"
                      value={dateOfBirth}
                      onChange={(event) => setDateOfBirth(event.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    />
                  </label>
                </div>
              </>
            )}

            <label className="block text-xs font-semibold text-slate-700">
              Email address
              <input
                required
                type="email"
                maxLength={320}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Password
              <input
                required
                type="password"
                minLength={12}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
              {mode === 'register' && (
                <span className="mt-1 block font-normal text-slate-500">
                  Use at least 12 characters.
                </span>
              )}
            </label>
            {mode === 'register' && (
              <label className="block text-xs font-semibold text-slate-700">
                Confirm password
                <input
                  required
                  type="password"
                  minLength={12}
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </label>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Log in to your account'
                  : 'Create patient account'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
