import React from 'react';
import { ShieldCheck, Clock, MapPin, CreditCard, RefreshCw, AlertCircle } from 'lucide-react';
import { ClinicSettings } from '../../types';

interface ClinicPoliciesSectionProps {
  settings: ClinicSettings;
}

export const ClinicPoliciesSection: React.FC<ClinicPoliciesSectionProps> = ({ settings }) => {
  return (
    <section id="clinic-policies-section" className="py-16 md:py-24 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700 mb-2">
            Practice Standards
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Transparent clinic policies and infection control standards
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Clear expectations help our clinic stay prompt and ensure each patient receives dedicated, unhurried attention.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Policy 1: Cancellation & Rescheduling */}
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">24-Hour Reschedule Window</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              We require at least {settings.cancellationCutoffHours} hours advance notice to cancel or reschedule appointments without a late cancellation fee. This allows us to re-open the clinical chair for waitlisted emergency patients.
            </p>
          </div>

          {/* Policy 2: On-Time Arrival & Buffers */}
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Dedicated Buffer Times</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Our automated schedule reserves a mandatory {settings.defaultBufferMinutes}-minute sterilization and room-prep buffer after every procedure, ensuring your operatory is 100% disinfected before you sit down.
            </p>
          </div>

          {/* Policy 3: Sterilization Standards */}
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Hospital-Grade Infection Control</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every instrument undergoes chemical ultrasonic cleaning and class-B vacuum autoclaving with mechanical spore monitoring. Dental operatory waterlines are treated continuously to exceed CDC purity levels.
            </p>
          </div>

          {/* Policy 4: Insurance & Transparent Estimates */}
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Direct Insurance & Estimates</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              We process claims with major PPO dental networks (Delta Dental, Cigna, MetLife, Guardian). Detailed treatment estimates and patient co-pay amounts are provided prior to starting any non-emergency treatment.
            </p>
          </div>

          {/* Policy 5: Emergency Triage */}
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Emergency Protocols</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Acute pain, avulsed (knocked out) teeth, and active dental bleeding are prioritized for same-day walk-in or emergency appointment slots. Our on-call line ({settings.emergencyHotline}) is monitored continuously.
            </p>
          </div>

          {/* Policy 6: Location & Studio Access */}
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Accessibility & Parking</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Located at {settings.address}, with validated 2-hour underground parking and ADA accessible elevator entrances. Please arrive 10 minutes prior for digital check-in.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
