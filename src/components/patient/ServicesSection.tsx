import React, { useState } from 'react';
import { DentalService, ServiceCategory } from '../../types';
import { Clock, Shield, Sparkles, ArrowRight, Info } from 'lucide-react';

interface ServicesSectionProps {
  services: DentalService[];
  onSelectService: (serviceId: string) => void;
}

const CATEGORY_TABS: { label: string; value: ServiceCategory | 'all' }[] = [
  { label: 'All Treatments', value: 'all' },
  { label: 'Preventive & Hygiene', value: 'preventive' },
  { label: 'Restorative Care', value: 'restorative' },
  { label: 'Cosmetic & Whitening', value: 'cosmetic' },
  { label: 'Orthodontics & Aligners', value: 'orthodontics' },
  { label: 'Oral Surgery', value: 'surgery' },
];

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
        <div className="max-w-3xl mb-10">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700 mb-2">
            Clinical Catalog
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Evidence-based dental care with upfront pricing
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Every procedure includes digital diagnostic scans, individualized treatment plans, and post-appointment follow-up instructions.
          </p>
        </div>

        {/* Interactive Filter Control (Buttons/Segmented Bar) */}
        <div className="flex flex-wrap items-center gap-2 mb-10 p-1.5 bg-slate-200/60 rounded-xl max-w-fit">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategory === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveCategory(tab.value)}
                className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
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
              className="bg-white rounded-xl border border-slate-200/80 p-6 flex flex-col justify-between hover:border-teal-300 hover:shadow-xs transition-all"
            >
              <div>
                {/* Unboxed Metadata (Zero-pill discipline) */}
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <span className="font-semibold text-teal-700 uppercase tracking-wider">
                    {service.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1 font-mono tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{service.durationMinutes} min</span>
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
                  {service.name}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  {service.description}
                </p>

                {/* Preparation Guide Snippet */}
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600 mb-5">
                  <div className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-700">Pre-visit note: </span>
                      <span>{service.preparationNotes}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price & Action */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] text-slate-400 uppercase font-medium">Indicative fee</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                    ${service.price}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectService(service.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs whitespace-nowrap"
                >
                  <span>Select & Book</span>
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
