import React, { useState } from 'react';
import { DentalService, ServiceCategory } from '../../types';
import { Clock, ArrowRight, Info, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface ServicesSectionProps {
  services: DentalService[];
  onSelectService: (serviceId: string) => void;
}

const CATEGORY_TABS: { label: string; value: ServiceCategory | 'all' }[] = [
  { label: 'All Treatments', value: 'all' },
  { label: 'Cleaning & Prevention', value: 'cleaning_prevention' },
  { label: 'Tooth Repair & Pain Relief', value: 'tooth_repair' },
  { label: 'Extraction & Oral Surgery', value: 'extraction_surgery' },
  { label: 'Braces & Alignment', value: 'braces_alignment' },
  { label: 'Dentures & Replacement', value: 'dentures_replacement' },
  { label: 'Cosmetic Dentistry', value: 'cosmetic' }, 
  { label: 'Consultation & Diagnostics', value: 'consultation' },
];

const CATEGORY_DISPLAY_NAMES: Record<ServiceCategory, string> = {
  cleaning_prevention: 'Cleaning & Prevention',
  tooth_repair: 'Tooth Repair & Pain Relief',
  extraction_surgery: 'Extraction & Oral Surgery',
  braces_alignment: 'Braces & Alignment',
  dentures_replacement: 'Dentures & Tooth Replacement',
  cosmetic: 'Cosmetic Dentistry',
  consultation: 'Consultation & Diagnostics',
};

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  services,
  onSelectService,
}) => {
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | 'all'>('all');

  const filteredServices = services.filter((s) => {
    if (!s.active) return false;
    if (activeCategory === 'all') return true;
    return s.category === activeCategory;
  });

  return (
    <section id="services-section" className="py-16 md:py-24 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mb-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-800 mb-2">
            Clinical Treatment Menu · Candaba, Pampanga
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Comprehensive Dental Care with Fixed, Transparent Pricing
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Organized by treatment category. All rates are fixed flat fees clearly stated in Philippine Pesos (₱) for Candaba and neighboring Pampanga communities with zero surprise add-ons.
          </p>
        </div>

        {/* Interactive Filter Control (Buttons/Segmented Bar) */}
        <div className="flex flex-wrap items-center gap-1.5 mb-10 p-1.5 bg-slate-300/70 rounded-xl">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategory === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveCategory(tab.value)}
                className={`px-3 py-1.5 text-sm sm:text-sm font-small rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-xl border border-slate-300 p-6 flex flex-col justify-between shadow-sm hover:border-teal-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div>
                {/* Unboxed Metadata (Zero-pill discipline) */}
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2.5">
                  <span className="font-semibold text-teal-800 text-[11px] uppercase tracking-wider">
                    {CATEGORY_DISPLAY_NAMES[service.category]}
                  </span>
                  <span className="flex items-center gap-1 font-mono tabular-nums text-slate-500 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{service.durationMinutes} min</span>
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 leading-snug">
                  {service.name}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                  {service.description}
                </p>

                {/* Consultation Notice if multi-stage or assessment required */}
                {service.requiresConsultationFirst && (
                  <div className="rounded-lg bg-teal-50/70 p-2.5 border border-teal-200/80 text-xs text-teal-900 mb-3.5">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-teal-950">Assessment first: </span>
                        <span>Requires comprehensive diagnostic exam/X-ray prior to procedure installation.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Note / Breakdown */}
                {service.priceNote && (
                  <p className="text-xs text-slate-500 mb-4 italic">
                    Note: {service.priceNote}
                  </p>
                )}

                {/* Preparation Guide Snippet */}
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600 mb-5">
                  <div className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-700">Pre-visit tip: </span>
                      <span>{service.preparationNotes}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price & Action */}
              <div className="pt-4 border-t border-slate-100 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] text-teal-800 font-semibold uppercase tracking-wider">Fixed Fee</div>
                  <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 leading-tight">
                    {service.priceRange || `₱${service.price.toLocaleString()}`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectService(service.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs whitespace-nowrap"
                >
                  <span>Book Slot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
