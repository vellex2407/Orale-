import React from 'react';
import { Dentist, DentalService } from '../../types';
import { Calendar, Award, CheckCircle } from 'lucide-react';

interface DentistsSectionProps {
  dentists: Dentist[];
  services: DentalService[];
  onSelectDentist: (dentistId: string) => void;
}

export const DentistsSection: React.FC<DentistsSectionProps> = ({
  dentists,
  services,
  onSelectDentist,
}) => {
  return (
    <section id="dentists-section" className="py-16 md:py-24 bg-white border-b border-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700 mb-2">
            Clinical Faculty
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Experienced dental specialists with gentle bedside care
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Our clinicians are board-certified practitioners dedicated to preventative, aesthetic, and surgical excellence using conservative treatment modalities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {dentists.map((dentist) => {
            const assignedServiceNames = services
              .filter((s) => dentist.assignedServiceIds.includes(s.id))
              .map((s) => s.name);

            return (
              <div
                key={dentist.id}
                className="rounded-xl border border-slate-300 bg-white overflow-hidden flex flex-col justify-between shadow-sm hover:border-teal-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 min-w-0"
              >
                <div>
                  <div className="relative h-72 bg-slate-100 overflow-hidden isolate">
                    <img
                      src={dentist.avatarUrl}
                      alt={dentist.name}
                      className="w-full h-full object-cover object-top block"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="p-6">
                    <div className="inline-block text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-md mb-2.5">
                      {dentist.specialty}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{dentist.name}</h3>
                    <p className="text-xs text-teal-700 font-medium mt-0.5 mb-3">{dentist.title}</p>
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">{dentist.bio}</p>

                    <div>
                      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Specialized Procedures
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        {assignedServiceNames.slice(0, 3).map((name) => (
                          <li key={name} className="flex items-start gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                            <span>{name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <button
                    type="button"
                    onClick={() => onSelectDentist(dentist.id)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-900 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Book with {dentist.name}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
