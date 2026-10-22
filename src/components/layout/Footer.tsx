import React from 'react';
import { Phone, Mail, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { ClinicSettings } from '../../types';

interface FooterProps {
  settings: ClinicSettings;
  onOpenBooking: () => void;
  onOpenTracker: () => void;
  onOpenFAQ: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  onOpenBooking,
  onOpenTracker,
  onOpenFAQ,
}) => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Clinic Brand & Emergency */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-teal-500 text-slate-950 flex items-center justify-center font-bold text-base">
                O
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Orale'</span>
            </div>
            <p className="text-sm text-slate-400 mb-5 leading-relaxed">
              Modern patient-centered dental clinic offering preventative hygiene, clear aligners, restorative ceramics, and oral surgery with transparent booking.
            </p>
            <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-white">Emergency Dental Triage</p>
                  <p className="text-slate-400 mt-0.5">Severe pain or acute trauma? Call our 24/7 on-call line directly:</p>
                  <p className="font-mono text-amber-300 font-medium mt-1">{settings.emergencyHotline}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide uppercase mb-4">Patient Services</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('services-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Preventive Care & Cleanings
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('services-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Clear Aligner Orthodontics
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('services-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Ceramic Crowns & Fillings
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('services-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Philips Zoom! Teeth Whitening
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('services-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Surgical Extractions
                </button>
              </li>
            </ul>
          </div>

          {/* Patient Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide uppercase mb-4">Clinic Information</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <button type="button" onClick={onOpenBooking} className="hover:text-white transition-colors">
                  Book an Appointment
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenTracker} className="hover:text-white transition-colors">
                  Look Up Appointment Status
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenFAQ} className="hover:text-white transition-colors">
                  Pre-Appointment Instructions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('clinic-policies-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  24-Hour Reschedule Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('dentists-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Meet Our Clinicians
                </button>
              </li>
            </ul>
          </div>

          {/* Hours & Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide uppercase mb-4">Studio Location & Hours</h4>
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>{settings.address}, {settings.city}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="font-mono tabular-nums">{settings.phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{settings.email}</span>
              </div>
              <div className="flex items-start gap-2.5 pt-1">
                <Clock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p>Monday – Friday: 8:30 AM – 5:30 PM</p>
                  <p>Saturday: 9:00 AM – 2:00 PM</p>
                  <p className="text-slate-400">Sunday: Closed (Emergency On-Call)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quiet Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Orale' Dental Studio. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>HIPAA Compliant Practices</span>
            <span aria-hidden="true">·</span>
            <span>OSHA Sterilization Certified</span>
            <span aria-hidden="true">·</span>
            <span>ADA Accredited Practice</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
