import React from 'react';
import { Calendar, Shield, Stethoscope, Search, User, Clock, Phone } from 'lucide-react';
import { UserRole } from '../../types';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenBooking: () => void;
  onOpenTracker: () => void;
  onOpenFAQ: () => void;
  onOpenPatientPortal: () => void;
  activeView: 'home' | 'portal' | 'admin' | 'dentist';
  setActiveView: (view: 'home' | 'portal' | 'admin' | 'dentist') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  onOpenBooking,
  onOpenTracker,
  onOpenFAQ,
  onOpenPatientPortal,
  activeView,
  setActiveView,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Stakeholder Perspective Bar (Allows seamless testing of Patient, Admin, and Dentist roles) */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Viewing mode:</span>
            <div className="inline-flex rounded-md p-0.5 bg-slate-800 border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  onRoleChange('patient');
                  setActiveView('home');
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  currentRole === 'patient' && activeView !== 'portal'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Patient Site
              </button>
              <button
                type="button"
                onClick={() => {
                  onRoleChange('patient');
                  setActiveView('portal');
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  activeView === 'portal'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Patient Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  onRoleChange('admin');
                  setActiveView('admin');
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  currentRole === 'admin'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Admin Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  onRoleChange('dentist');
                  setActiveView('dentist');
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  currentRole === 'dentist'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Dentist Schedule
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>Mon – Sat: 9:00 AM – 6:00 PM</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>Emergency Hotline: 0917-888-9911</span>
            </span>
          </div>
        </div>
      </div>

      {/* Top Bar Contract (Strict 3 Zones separated by gap-8) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => {
              setActiveView('home');
              onRoleChange('patient');
            }}
            className="flex items-center gap-2.5 text-left focus-visible:outline-hidden group"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-xs group-hover:bg-teal-700 transition-colors">
              O
            </div>
            <div className="leading-tight">
              <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-teal-700 transition-colors">
                Orale'
              </span>
              <span className="block text-[11px] text-slate-500 font-medium">Dental Clinic</span>
            </div>
          </button>

          {/* Zone 2: 4-5 clean single-line navigation links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => {
                setActiveView('home');
                const el = document.getElementById('services-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              Services & Pricing
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('home');
                const el = document.getElementById('dentists-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              Dentists
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('home');
                const el = document.getElementById('clinic-policies-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              Clinic Policies
            </button>
            <button
              type="button"
              onClick={onOpenFAQ}
              className="hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              Prep & FAQ
            </button>
            <button
              type="button"
              onClick={onOpenTracker}
              className="flex items-center gap-1.5 text-slate-700 hover:text-teal-600 transition-colors whitespace-nowrap font-medium"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track Booking</span>
            </button>
          </nav>

          {/* Zone 3: 1 primary action button + patient portal trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenTracker}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              title="Track Booking"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onOpenPatientPortal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <User className="w-4 h-4 text-slate-500" />
              <span>Patient Account</span>
            </button>
            <button
              type="button"
              onClick={onOpenBooking}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs hover:shadow transition-all whitespace-nowrap"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
