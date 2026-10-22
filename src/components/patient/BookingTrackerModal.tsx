import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Printer,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Appointment, DentalService, Dentist, ClinicSettings } from '../../types';
import { DentalStorage, formatDateReadable } from '../../services/storage';

interface BookingTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReference?: string;
  services: DentalService[];
  dentists: Dentist[];
  settings: ClinicSettings;
  onRefreshData: () => void;
}

export const BookingTrackerModal: React.FC<BookingTrackerModalProps> = ({
  isOpen,
  onClose,
  initialReference,
  services,
  dentists,
  settings,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>(initialReference || '');
  const [foundAppointment, setFoundAppointment] = useState<Appointment | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleSlots, setRescheduleSlots] = useState<{ time: string; dentistId: string; dentistName: string }[]>([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<{ time: string; dentistId: string } | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Cancel state
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('Schedule conflict');

  // Load initial reference if provided
  useEffect(() => {
    if (initialReference) {
      setSearchTerm(initialReference);
      handleSearch(initialReference);
    }
  }, [initialReference]);

  if (!isOpen) return null;

  const handleSearch = (termToSearch?: string) => {
    const term = (termToSearch || searchTerm).trim();
    if (!term) return;

    setSearchError(null);
    setIsRescheduling(false);
    setIsCancelling(false);

    // First try exact booking reference
    let apt = DentalStorage.getAppointmentByReference(term);

    // If not found, try search by phone or email
    if (!apt) {
      const cleanPhone = term.replace(/\D/g, '');
      const patients = DentalStorage.getPatients();
      const matchedPatients = patients.filter((p) => {
        const pCleanPhone = p.phone.replace(/\D/g, '');
        return (
          (cleanPhone && pCleanPhone.includes(cleanPhone)) ||
          p.email.toLowerCase().includes(term.toLowerCase())
        );
      });

      if (matchedPatients.length > 0) {
        const patientIds = matchedPatients.map((p) => p.id);
        const allApts = DentalStorage.getAppointments();
        apt = allApts.find((a) => patientIds.includes(a.patientId));
      }
    }

    if (apt) {
      setFoundAppointment(apt);
    } else {
      setFoundAppointment(null);
      setSearchError(`No booking found matching "${term}". Please check the reference code (e.g. ORL-2026-7812) or phone number.`);
    }
  };

  const currentService = foundAppointment ? services.find((s) => s.id === foundAppointment.serviceId) : null;
  const currentDentist = foundAppointment ? dentists.find((d) => d.id === foundAppointment.dentistId) : null;
  const patient = foundAppointment ? DentalStorage.getPatientById(foundAppointment.patientId) : null;

  // Compute available slots when reschedule date is chosen
  const handleRescheduleDateChange = (date: string) => {
    setRescheduleDate(date);
    setSelectedRescheduleSlot(null);
    setRescheduleError(null);

    if (!foundAppointment || !currentService) return;

    const slots = DentalStorage.getAvailableSlots({
      serviceId: currentService.id,
      dentistId: foundAppointment.dentistId,
      date,
    });
    setRescheduleSlots(slots);
  };

  const handleConfirmReschedule = () => {
    if (!foundAppointment || !selectedRescheduleSlot || !rescheduleDate) return;

    const res = DentalStorage.rescheduleAppointment(
      foundAppointment.id,
      rescheduleDate,
      selectedRescheduleSlot.time,
      selectedRescheduleSlot.dentistId,
      `${patient?.firstName || 'Patient'} (Self-service)`,
      rescheduleReason
    );

    if (!res.success) {
      setRescheduleError(res.error || 'Failed to reschedule. Selected slot is no longer open.');
      return;
    }

    // Refresh appointment
    const updated = DentalStorage.getAppointmentById(foundAppointment.id);
    if (updated) setFoundAppointment(updated);
    setIsRescheduling(false);
    onRefreshData();
  };

  const handleConfirmCancel = () => {
    if (!foundAppointment) return;

    DentalStorage.cancelAppointment(
      foundAppointment.id,
      cancelReason,
      `${patient?.firstName || 'Patient'} (Self-service)`
    );

    const updated = DentalStorage.getAppointmentById(foundAppointment.id);
    if (updated) setFoundAppointment(updated);
    setIsCancelling(false);
    onRefreshData();
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md text-xs border border-emerald-200">Confirmed</span>;
      case 'arrived':
        return <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md text-xs border border-blue-200">Arrived at Studio</span>;
      case 'in_treatment':
        return <span className="font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md text-xs border border-purple-200">In Operatory</span>;
      case 'completed':
        return <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs border border-slate-200">Completed</span>;
      case 'cancelled':
        return <span className="font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md text-xs border border-rose-200">Cancelled</span>;
      case 'rescheduled':
        return <span className="font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md text-xs border border-amber-200">Rescheduled</span>;
      case 'no_show':
        return <span className="font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md text-xs border border-rose-200">No Show</span>;
      default:
        return <span className="font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md text-xs border border-amber-200">Pending Clinic Review</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-teal-700">
              Live Patient Service
            </span>
            <h2 className="text-lg font-bold text-slate-900">Track or Manage Appointment</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Lookup Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
              Enter Booking Reference or Contact Phone / Email
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="e.g. ORL-2026-7812 or claire.montague@example.com"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSearch()}
                className="px-4 py-2 bg-slate-900 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Find
              </button>
            </div>
            {searchError && (
              <p className="text-xs text-rose-600 mt-1">{searchError}</p>
            )}
          </div>

          {/* Quick Demo Shortcuts */}
          {!foundAppointment && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
              <span className="font-semibold text-slate-800 block">Try inspecting sample bookings:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSearch('ORL-2026-7812')}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-mono hover:border-teal-500 hover:text-teal-700 text-slate-700 transition-colors"
                >
                  ORL-2026-7812
                </button>
                <button
                  type="button"
                  onClick={() => handleSearch('ORL-2026-9043')}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-mono hover:border-teal-500 hover:text-teal-700 text-slate-700 transition-colors"
                >
                  ORL-2026-9043
                </button>
                <button
                  type="button"
                  onClick={() => handleSearch('ORL-2026-3195')}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-mono hover:border-teal-500 hover:text-teal-700 text-slate-700 transition-colors"
                >
                  ORL-2026-3195
                </button>
              </div>
            </div>
          )}

          {/* Found Appointment Card */}
          {foundAppointment && (
            <div className="space-y-5">
              <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <div className="text-xs text-slate-400 font-medium uppercase">Reference</div>
                    <div className="text-lg font-bold font-mono tracking-wider text-slate-900">
                      {foundAppointment.bookingReference}
                    </div>
                  </div>
                  <div>{getStatusBadge(foundAppointment.status)}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 text-xs block">Service</span>
                    <span className="font-bold text-slate-900">{currentService?.name}</span>
                    <span className="text-xs text-slate-500 block font-mono">
                      {currentService?.durationMinutes} mins · ₱{currentService?.price.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Dentist</span>
                    <span className="font-bold text-slate-900">{currentDentist?.name}</span>
                    <span className="text-xs text-slate-500 block">{currentDentist?.title.split('—')[0]}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Appointment Time</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {formatDateReadable(foundAppointment.date)}
                    </span>
                    <span className="text-xs text-slate-500 block font-mono">
                      {foundAppointment.startTime} – {foundAppointment.endTime}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Patient</span>
                    <span className="font-bold text-slate-900">
                      {patient ? `${patient.firstName} ${patient.lastName}` : 'Guest'}
                    </span>
                    <span className="text-xs text-slate-500 block">{patient?.phone}</span>
                  </div>
                </div>

                {/* Pre-visit note */}
                {currentService?.preparationNotes && (
                  <div className="p-3 rounded-lg bg-teal-50 border border-teal-100 text-xs text-teal-900">
                    <span className="font-semibold">Preparation note: </span>
                    {currentService.preparationNotes}
                  </div>
                )}

                {/* Cancelled reason if any */}
                {foundAppointment.status === 'cancelled' && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    <span className="font-semibold">Cancellation reason: </span>
                    {foundAppointment.cancellationReason || 'Patient requested cancellation.'}
                  </div>
                )}
              </div>

              {/* Action Buttons (Reschedule / Cancel) */}
              {foundAppointment.status !== 'cancelled' && foundAppointment.status !== 'completed' && !isRescheduling && !isCancelling && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRescheduling(true);
                      handleRescheduleDateChange(foundAppointment.date);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reschedule Appointment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCancelling(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Cancel Booking</span>
                  </button>
                </div>
              )}

              {/* RESCHEDULE PANEL */}
              {isRescheduling && (
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-300 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Choose New Date & Slot</h4>
                    <button
                      type="button"
                      onClick={() => setIsRescheduling(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Dismiss
                    </button>
                  </div>

                  {rescheduleError && (
                    <div className="p-3 rounded-lg bg-rose-50 text-rose-800 text-xs border border-rose-200">
                      {rescheduleError}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">New Date</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={rescheduleDate}
                      onChange={(e) => handleRescheduleDateChange(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Available Slots</label>
                    {rescheduleSlots.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No open slots on selected date.</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                        {rescheduleSlots.map((slot) => {
                          const isSel = selectedRescheduleSlot?.time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => setSelectedRescheduleSlot(slot)}
                              className={`p-2 rounded-lg text-xs font-mono font-medium border text-center transition-all ${
                                isSel
                                  ? 'bg-teal-600 border-teal-600 text-white'
                                  : 'bg-white border-slate-200 hover:border-slate-400 text-slate-900'
                              }`}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Reason (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Schedule conflict with work"
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={!selectedRescheduleSlot}
                      onClick={handleConfirmReschedule}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Save Rescheduled Time
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRescheduling(false)}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* CANCEL PANEL */}
              {isCancelling && (
                <div className="p-5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-3">
                  <h4 className="text-sm font-bold text-rose-900">Confirm Cancellation</h4>
                  <p className="text-xs text-rose-700">
                    Are you sure you wish to cancel this appointment? Your reserved clinical operatory slot will be released back into the booking calendar immediately.
                  </p>

                  <div>
                    <label className="text-xs font-semibold text-rose-900 block mb-1">Reason for cancellation</label>
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    >
                      <option value="Schedule conflict">Schedule conflict</option>
                      <option value="Illness / Personal emergency">Illness / Personal emergency</option>
                      <option value="Symptoms resolved">Symptoms resolved</option>
                      <option value="Seeking care elsewhere">Seeking care elsewhere</option>
                      <option value="Financial / Insurance change">Financial / Insurance change</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmCancel}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Confirm & Release Slot
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCancelling(false)}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg"
                    >
                      Keep Booking
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Need live assistance? Call {settings.phone}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
