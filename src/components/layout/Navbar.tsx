import React, { useEffect, useRef, useState } from 'react';
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
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);

  const [activeSection, setActiveSection] = useState('');

  
  const viewMenuRef = useRef<HTMLDivElement>(null);

  // Close the viewing-mode dropdown when clicking outside it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        viewMenuRef.current &&
        !viewMenuRef.current.contains(event.target as Node)
      ) {
        setIsViewMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Track which page section is currently active
  useEffect(() => {
    const sectionIds = [
      'services-section',
      'dentists-section',
      'clinic-policies-section',
    ];

    const handleScroll = () => {
      const marker = window.scrollY + 150;
      let currentSection = '';

      sectionIds.forEach((id) => {
        const section = document.getElementById(id);

        if (section && section.offsetTop <= marker) {
          currentSection = id;
        }
      });

      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);


  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-teal-100 shadow-[0_4px_16px_rgba(13,148,136,0.30)]">
      

      {/* Top Bar Contract (Strict 3 Zones separated by gap-8) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 sm:flex-nowrap sm:justify-start sm:gap-8 sm:py-0 sm:h-16">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => {
              setActiveView('home');
              onRoleChange('patient');
            }}
            className="flex shrink-0 items-center gap-2.5 text-left focus-visible:outline-hidden group"
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
          {activeView !== 'portal' &&
          activeView !== 'admin' &&
          activeView !== 'dentist' && (

          <nav className="hidden xl:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => {
                setActiveView('home');
                const el = document.getElementById('services-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`relative py-2 transition-colors whitespace-nowrap ${
                          activeSection === 'services-section'
                            ? 'text-teal-700 font-semibold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-teal-600'
                            : 'text-slate-600 hover:text-teal-700'
                        }`}
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
              className={`relative py-2 transition-colors whitespace-nowrap ${
                          activeSection === 'dentists-section'
                            ? 'text-teal-700 font-semibold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-teal-600'
                            : 'text-slate-600 hover:text-teal-700'
                        }`}
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
              className={`relative py-2 transition-colors whitespace-nowrap ${
                          activeSection === 'clinic-policies-section'
                            ? 'text-teal-700 font-semibold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-teal-600'
                            : 'text-slate-600 hover:text-teal-700'
                        }`}
            >
              Clinic Policies
            </button>
            <button
              type="button"
              onClick={onOpenFAQ}
              className={`relative py-2 transition-colors whitespace-nowrap ${
                          activeSection === 'faq-section'
                            ? 'text-teal-700 font-semibold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-teal-600'
                            : 'text-slate-600 hover:text-teal-700'
                        }`}
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
        )}
          {/* Zone 3: 1 primary action button + patient portal trigger */}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
             {activeView !== 'portal' &&
              activeView !== 'admin' &&
              activeView !== 'dentist' && (
               <>
            <button
              type="button"
              onClick={onOpenTracker}
              className="xl:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
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
              aria-label="Book Appointment"
              className="inline-flex items-center justify-center gap-2 px-2.5 sm:px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs hover:shadow transition-all whitespace-nowrap"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden min-[380px]:inline">Book Appointment</span>
            </button>
            </>
            )}
          </div>
          
          
          <div className="relative ml-0 basis-full sm:ml-0 sm:basis-auto" ref={viewMenuRef}>
            <button
              type="button"
              onClick={() => setIsViewMenuOpen((open) => !open)}
              aria-expanded={isViewMenuOpen}
              className="flex w-full sm:w-[180px] items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white pl-3 pr-2 py-2.5 text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700 cursor-pointer"
            >
              <span className="whitespace-nowrap">
                {activeView === 'home'
                  ? 'Patient Site'
                  : activeView === 'portal'
                  ? 'Patient Portal'
                  : activeView === 'admin'
                  ? 'Admin Dashboard'
                  : 'Dentist Portal'}
              </span>

              <svg
                className={`h-4 w-4 shrink-0 transition-transform ${
                  isViewMenuOpen ? 'rotate-180' : ''
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.22 7.22a.75.75 0 011.06 0L10 10.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.28a.75.75 0 010-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {isViewMenuOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {[
                  { value: 'home', label: 'Patient Site' },
                  { value: 'portal', label: 'Patient Portal' },
                  { value: 'admin', label: 'Admin Dashboard' },
                  { value: 'dentist', label: 'Dentist Portal' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const view = option.value as
                        | 'home'
                        | 'portal'
                        | 'admin'
                        | 'dentist';

                      if (view === 'home' || view === 'portal') {
                        onRoleChange('patient');
                      } else if (view === 'admin') {
                        onRoleChange('admin');
                      } else {
                        onRoleChange('dentist');
                      }

                      setActiveView(view);
                      setIsViewMenuOpen(false);
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-teal-700 hover:text-white focus:bg-teal-700 focus:text-white focus:outline-none"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>


        </div>
      </div>
    </header>
  );
};
