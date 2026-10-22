import React from 'react';
import { Calendar, Search, ShieldCheck, Clock, Award, CheckCircle2 } from 'lucide-react';
import { ClinicSettings, DentalService } from '../../types';

interface HeroSectionProps {
  settings: ClinicSettings;
  services: DentalService[];
  onOpenBooking: (serviceId?: string) => void;
  onOpenTracker: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  settings,
  services,
  onOpenBooking,
  onOpenTracker,
}) => {
  const [selectedServiceId, setSelectedServiceId] = React.useState<string>(services[0]?.id || '');

  return (
    <section className="relative overflow-hidden bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Editorial Copy */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-md border border-teal-200/60">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Modern, Calm & Transparent Dental Care</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-[1.15]" style={{ textWrap: 'balance' }}>
              Precision dentistry designed around your peace of mind.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Experience stress-free oral healthcare with real-time slot booking, zero surprise bills, and hospital-grade sterilization suites led by specialist clinicians.
            </p>

            {/* Quick Service Booking Widget */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs space-y-4 max-w-xl">
              <label htmlFor="service-select" className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
                Find available appointment
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  id="service-select"
                  aria-label="Select dental service"
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes} min · ${s.price})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onOpenBooking(selectedServiceId)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-xs whitespace-nowrap"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Check Open Slots</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Instant slot hold</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>No prepay required</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Free 24h cancellation</span>
                </span>
              </div>
            </div>

            {/* Secondary Action */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onOpenTracker}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-teal-700 hover:underline transition-colors"
              >
                <Search className="w-4 h-4 text-slate-400" />
                <span>Already have a booking? Track or reschedule here</span>
              </button>
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100">
              <img
                src="/src/assets/images/hero_dental_clinic_1792645066086.jpg"
                alt="Modern, calm Orale dental suite interior with floor-to-ceiling garden views"
                className="w-full h-[360px] sm:h-[420px] object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-6 text-white">
                <div className="text-xs font-medium text-teal-300 uppercase tracking-wider mb-1">
                  San Francisco Studio
                </div>
                <h3 className="text-lg font-bold text-white">
                  State-of-the-art restorative dental suite
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-300 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>Open Mon – Sat</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>100% Digital Scanners</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Item Proof & Trust Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 mt-12 border-t border-slate-200">
          <div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">14,200+</div>
            <div className="text-xs text-slate-500 mt-0.5">Successful patient appointments</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">45 mins</div>
            <div className="text-xs text-slate-500 mt-0.5">Average routine visit duration</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">0 min</div>
            <div className="text-xs text-slate-500 mt-0.5">Waiting room delays guaranteed</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">4.9 / 5.0</div>
            <div className="text-xs text-slate-500 mt-0.5">Patient satisfaction score</div>
          </div>
        </div>
      </div>
    </section>
  );
};
