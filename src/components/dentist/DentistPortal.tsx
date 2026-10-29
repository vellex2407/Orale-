import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  ShieldAlert,
  CheckCircle,
  Play,
  FileText,
  AlertCircle,
  Activity,
  Layers,
} from 'lucide-react';
import { Dentist, DentalService, Patient, Appointment, ClinicSettings } from '../../types';
import { DentalStorage, formatDateReadable } from '../../services/storage';

interface DentistPortalProps {
  dentists: Dentist[];
  services: DentalService[];
  settings: ClinicSettings;
  onRefreshData: () => void;
}

export const DentistPortal: React.FC<DentistPortalProps> = ({
  dentists,
  services,
  settings,
  onRefreshData,
}) => {
  const [selectedDentistId, setSelectedDentistId] = useState<string>(dentists[0]?.id || '');
  const activeDentist = dentists.find((d) => d.id === selectedDentistId) || dentists[0];

  const todayStr = new Date().toISOString().split('T')[0];
  const allAppointments = DentalStorage.getAppointments();
  const patients = DentalStorage.getPatients();

  const dentistAppointments = allAppointments.filter((a) => a.dentistId === activeDentist?.id);
  const todayQueue = dentistAppointments
    .filter((a) => a.date === todayStr && a.status !== 'cancelled')
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingApts = dentistAppointments
    .filter((a) => a.date > todayStr && a.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const handleUpdateStatus = (appointmentId: string, status: Appointment['status']) => {
    DentalStorage.updateAppointmentStatus(
      appointmentId,
      status,
      `${activeDentist?.name} (Operatory Chair)`
    );
    onRefreshData();
  };

  return (
    <div className="py-8 bg-slate-100 min-h-[calc(100vh-140px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Clinician Header with Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-teal-800 via-teal-600 to-teal-400 shadow-[0_8px_24px_rgba(13,148,136,0.30)]">
          <div className="flex items-center gap-3">
            <img
              src={activeDentist?.avatarUrl}
              alt={activeDentist?.name}
              className="w-12 h-12 rounded-full object-cover border border-slate-300"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-teal-100">
                Operatory Clinical View
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {activeDentist?.name} — Chairside Schedule
              </h1>
              <p className="text-xs text-teal-50">{activeDentist?.title}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto min-w-0">
            <span className="text-xs text-teal-50 font-medium whitespace-nowrap">Switch Clinician:</span>
            <select
              value={selectedDentistId}
              onChange={(e) => setSelectedDentistId(e.target.value)}
              className="w-full sm:w-auto min-w-0 max-w-full bg-white/95 border border-white/50 rounded-lg px-3 py-1.5 text-xs text-teal-900 font-semibold focus:ring-2 focus:ring-teal-200 focus:outline-hidden"
            >
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialty})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Today's Operatory Queue */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" />
                <span>Today's Patient Queue ({todayQueue.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatDateReadable(todayStr)} · Operatory Suite A
              </p>
            </div>
          </div>

          {todayQueue.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs sm:text-sm">
              No clinical appointments scheduled for today. Enjoy your day or review clinical notes.
            </div>
          ) : (
            <div className="space-y-3.5">
              {todayQueue.map((apt) => {
                const s = services.find((serv) => serv.id === apt.serviceId);
                const patient = patients.find((p) => p.id === apt.patientId);

                return (
                  <div
                    key={apt.id}
                    className={`p-4 rounded-xl border transition-all ${
                      apt.status === 'in_treatment'
                        ? 'border-purple-300 bg-purple-50/50 ring-1 ring-purple-300'
                        : apt.status === 'arrived'
                        ? 'border-blue-300 bg-blue-50/40'
                        : apt.status === 'completed'
                        ? 'border-slate-200 bg-slate-50 opacity-75'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {apt.startTime} – {apt.endTime}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-slate-500 text-[11px]">{apt.bookingReference}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              apt.status === 'in_treatment'
                                ? 'bg-purple-100 text-purple-800'
                                : apt.status === 'arrived'
                                ? 'bg-blue-100 text-blue-800'
                                : apt.status === 'completed'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {apt.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {patient ? `${patient.firstName} ${patient.lastName}` : 'Walk-in Patient'}
                          </h4>
                          <span className="text-xs text-slate-500">· {s?.name}</span>
                        </div>

                        {/* Medical Alert Badge (High safety relevance for dentist) */}
                        {patient?.medicalAlerts && patient.medicalAlerts.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 max-w-fit">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="font-semibold">Medical Alert: </span>
                            <span>{patient.medicalAlerts.join(', ')}</span>
                          </div>
                        )}

                        {apt.patientNotes && (
                          <p className="text-xs text-slate-600 italic">
                            Patient note: "{apt.patientNotes}"
                          </p>
                        )}
                      </div>

                      {/* Chair Action Buttons */}
                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        {apt.status === 'arrived' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(apt.id, 'in_treatment')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Call to Chair</span>
                          </button>
                        )}

                        {apt.status === 'in_treatment' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(apt.id, 'completed')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Finish Treatment</span>
                          </button>
                        )}

                        {apt.status === 'confirmed' && (
                          <span className="text-xs text-slate-400 italic">Waiting for front desk check-in</span>
                        )}

                        {apt.status === 'completed' && (
                          <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Finished</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Patient Queue */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-600" />
            <span>Upcoming Scheduled Consultations ({upcomingApts.length})</span>
          </h3>

          {upcomingApts.length === 0 ? (
            <p className="text-xs text-slate-500">No future visits scheduled beyond today.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingApts.map((apt) => {
                const s = services.find((serv) => serv.id === apt.serviceId);
                const patient = patients.find((p) => p.id === apt.patientId);
                return (
                  <div key={apt.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="font-semibold text-slate-900 font-mono">{formatDateReadable(apt.date)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{apt.startTime}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono uppercase text-[11px]">{apt.bookingReference}</span>
                      </div>
                      <div className="font-bold text-slate-900 mt-0.5">
                        {patient ? `${patient.firstName} ${patient.lastName}` : 'Guest Patient'} — {s?.name}
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {apt.status.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
