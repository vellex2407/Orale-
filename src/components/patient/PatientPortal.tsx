import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Shield,
  FileText,
  Phone,
  Mail,
  Edit2,
  Check,
  Plus,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';
import { Patient, Appointment, DentalService, Dentist, ClinicSettings } from '../../types';
import { DentalStorage, formatDateReadable } from '../../services/storage';

interface PatientPortalProps {
  currentPatientId: string;
  onSelectPatient: (patientId: string) => void;
  services: DentalService[];
  dentists: Dentist[];
  settings: ClinicSettings;
  onOpenBooking: () => void;
  onTrackAppointment: (ref: string) => void;
  onRefreshData: () => void;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({
  currentPatientId,
  onSelectPatient,
  services,
  dentists,
  settings,
  onOpenBooking,
  onTrackAppointment,
  onRefreshData,
}) => {
  const patients = DentalStorage.getPatients();
  const currentPatient = patients.find((p) => p.id === currentPatientId) || patients[0];

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [profileForm, setProfileForm] = useState({
    phone: currentPatient?.phone || '',
    email: currentPatient?.email || '',
    emergencyContactName: currentPatient?.emergencyContactName || '',
    emergencyContactPhone: currentPatient?.emergencyContactPhone || '',
    preferredDentistId: currentPatient?.preferredDentistId || '',
  });

  // Save profile changes
  const handleSaveProfile = () => {
    if (!currentPatient) return;
    DentalStorage.findOrCreatePatient({
      ...currentPatient,
      phone: profileForm.phone,
      email: profileForm.email,
      emergencyContactName: profileForm.emergencyContactName,
      emergencyContactPhone: profileForm.emergencyContactPhone,
      preferredDentistId: profileForm.preferredDentistId,
    });
    setIsEditingProfile(false);
    onRefreshData();
  };

  const allAppointments = DentalStorage.getAppointments();
  const patientAppointments = currentPatient
    ? allAppointments.filter((a) => a.patientId === currentPatient.id)
    : [];

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingAppointments = patientAppointments.filter(
    (a) => a.date >= todayStr && a.status !== 'cancelled' && a.status !== 'completed'
  );
  const pastAppointments = patientAppointments.filter(
    (a) => a.date < todayStr || a.status === 'completed' || a.status === 'cancelled'
  );

  return (
    <div className="py-10 bg-slate-50 min-h-[calc(100vh-140px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header Strip with Patient Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              Patient Portal & Health Record
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Welcome back, {currentPatient?.firstName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review upcoming appointments, reschedule visits, and keep your contact information updated.
            </p>
          </div>

          {/* Patient Profile Quick Switcher (Demo portfolio helper) */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs text-slate-500 font-medium">Switch Patient:</span>
            <select
              value={currentPatient?.id}
              onChange={(e) => onSelectPatient(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onOpenBooking}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Appointments (Upcoming & Past) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Upcoming Appointments */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>Upcoming Appointments ({upcomingAppointments.length})</span>
                </h3>
              </div>

              {upcomingAppointments.length === 0 ? (
                <div className="p-8 rounded-xl bg-white border border-slate-200 text-center space-y-3">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">No scheduled upcoming visits</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Regular preventative cleaning and exams are recommended every 6 months to maintain optimal oral health.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenBooking}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <span>Schedule Check-up</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.map((apt) => {
                    const s = services.find((serv) => serv.id === apt.serviceId);
                    const d = dentists.find((dent) => dent.id === apt.dentistId);

                    return (
                      <div
                        key={apt.id}
                        className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div>
                            <span className="text-xs text-slate-400 uppercase font-medium">Reference: </span>
                            <span className="text-xs font-bold font-mono tracking-wider text-slate-900">
                              {apt.bookingReference}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                                apt.status === 'confirmed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {apt.status === 'confirmed' ? 'Confirmed' : 'Pending Review'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                          <div>
                            <span className="text-slate-400 text-xs block">Procedure</span>
                            <span className="font-bold text-slate-900">{s?.name}</span>
                            <span className="text-xs text-slate-500 block font-mono">
                              {s?.durationMinutes} mins · ${s?.price}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 text-xs block">Attending Clinician</span>
                            <span className="font-bold text-slate-900">{d?.name}</span>
                            <span className="text-xs text-slate-500 block">{d?.specialty}</span>
                          </div>

                          <div>
                            <span className="text-slate-400 text-xs block">Date & Time</span>
                            <span className="font-bold text-slate-900 font-mono">
                              {formatDateReadable(apt.date)}
                            </span>
                            <span className="text-xs text-slate-500 block font-mono">
                              {apt.startTime} – {apt.endTime}
                            </span>
                          </div>
                        </div>

                        {s?.preparationNotes && (
                          <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                            <span className="font-semibold text-slate-700">Preparation: </span>
                            {s.preparationNotes}
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => onTrackAppointment(apt.bookingReference)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Reschedule or Cancel</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past Appointment History */}
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Visit History ({pastAppointments.length})</span>
              </h3>

              {pastAppointments.length === 0 ? (
                <div className="p-6 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-500">
                  No prior appointment records found for this profile.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {pastAppointments.map((apt) => {
                    const s = services.find((serv) => serv.id === apt.serviceId);
                    const d = dentists.find((dent) => dent.id === apt.dentistId);

                    return (
                      <div key={apt.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <span className="font-mono tabular-nums font-semibold text-slate-900">{formatDateReadable(apt.date)}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{apt.startTime}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono uppercase text-[11px]">{apt.bookingReference}</span>
                          </div>
                          <div className="font-bold text-slate-900">{s?.name}</div>
                          <div className="text-slate-500 mt-0.5">With {d?.name}</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              apt.status === 'completed'
                                ? 'bg-slate-100 text-slate-700'
                                : apt.status === 'cancelled'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {apt.status.toUpperCase()}
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenBooking()}
                            className="text-teal-700 font-semibold hover:underline"
                          >
                            Re-book
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Profile & Medical Alerts */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-600" />
                  <span>Patient Profile</span>
                </h3>

                {!isEditingProfile ? (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileForm({
                        phone: currentPatient?.phone || '',
                        email: currentPatient?.email || '',
                        emergencyContactName: currentPatient?.emergencyContactName || '',
                        emergencyContactPhone: currentPatient?.emergencyContactPhone || '',
                        preferredDentistId: currentPatient?.preferredDentistId || '',
                      });
                      setIsEditingProfile(true);
                    }}
                    className="text-xs text-teal-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Save</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {!isEditingProfile ? (
                <div className="space-y-3 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Full Name</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {currentPatient?.firstName} {currentPatient?.lastName}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Contact Phone</span>
                    <span className="font-mono tabular-nums text-slate-900">{currentPatient?.phone}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Email Address</span>
                    <span className="text-slate-900">{currentPatient?.email}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Date of Birth</span>
                    <span className="font-mono tabular-nums text-slate-900">{currentPatient?.dateOfBirth}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Emergency Contact</span>
                    <span className="text-slate-900">
                      {currentPatient?.emergencyContactName || 'None set'} ({currentPatient?.emergencyContactPhone || 'N/A'})
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Insurance Policy</span>
                    <span className="text-slate-900">{currentPatient?.insuranceProvider || 'Self-Pay'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Preferred Clinician</span>
                    <span className="text-slate-900">
                      {dentists.find((d) => d.id === currentPatient?.preferredDentistId)?.name || 'Any Clinician'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-600 block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={profileForm.emergencyContactName}
                      onChange={(e) => setProfileForm({ ...profileForm, emergencyContactName: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1">Preferred Clinician</label>
                    <select
                      value={profileForm.preferredDentistId}
                      onChange={(e) => setProfileForm({ ...profileForm, preferredDentistId: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                    >
                      <option value="">Any Available Clinician</option>
                      {dentists.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Medical Alerts Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Recorded Medical Alerts</span>
              </h3>

              {currentPatient?.medicalAlerts && currentPatient.medicalAlerts.length > 0 ? (
                <div className="space-y-1.5">
                  {currentPatient.medicalAlerts.map((alert) => (
                    <div key={alert} className="p-2 rounded-lg bg-amber-50 text-amber-900 text-xs border border-amber-200 font-medium">
                      {alert}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No critical allergies or health conditions flagged.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
