import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { DentalService, Dentist, ClinicSettings, Appointment } from '../../types';
import { DentalStorage, formatDateReadable } from '../../services/storage';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialServiceId?: string;
  initialDentistId?: string;
  services: DentalService[];
  dentists: Dentist[];
  settings: ClinicSettings;
  onBookingSuccess: (appointment: Appointment) => void;
  onOpenTrackerForRef: (ref: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  initialServiceId,
  initialDentistId,
  services,
  dentists,
  settings,
  onBookingSuccess,
  onOpenTrackerForRef,
}) => {
  // Step 1 to 5, plus 6 for confirmed state
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form states
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId || services[0]?.id || '');
  const [selectedDentistId, setSelectedDentistId] = useState<string>(initialDentistId || 'any');
  
  // Date selection (default to tomorrow or next business day)
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTomorrowString());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    time: string;
    dentistId: string;
    dentistName: string;
  } | null>(null);

  // Patient info
  const [patientInfo, setPatientInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '1995-05-15',
    emergencyContactName: '',
    emergencyContactPhone: '',
    insuranceProvider: 'Self-Pay / Private',
    medicalAlerts: [] as string[],
  });

  const [medicalNoteInput, setMedicalNoteInput] = useState<string>('');
  const [patientNotes, setPatientNotes] = useState<string>('');
  const [agreedToPolicy, setAgreedToPolicy] = useState<boolean>(true);

  // Slot calculations
  const [availableSlots, setAvailableSlots] = useState<{ time: string; dentistId: string; dentistName: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Submission error & confirmed appointment
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // Sync initial props
  useEffect(() => {
    if (initialServiceId) setSelectedServiceId(initialServiceId);
    if (initialDentistId) setSelectedDentistId(initialDentistId);
  }, [initialServiceId, initialDentistId]);

  // Recalculate available slots whenever service, dentist preference, or date changes
  useEffect(() => {
    if (!selectedServiceId || !selectedDate) return;

    setLoadingSlots(true);
    setSelectedTimeSlot(null);

    // Compute slots
    const slots = DentalStorage.getAvailableSlots({
      serviceId: selectedServiceId,
      dentistId: selectedDentistId,
      date: selectedDate,
    });

    setAvailableSlots(slots);
    setLoadingSlots(false);
  }, [selectedServiceId, selectedDentistId, selectedDate]);

  if (!isOpen) return null;

  const currentService = services.find((s) => s.id === selectedServiceId);
  const activeDentist = dentists.find((d) => d.id === (selectedTimeSlot?.dentistId || selectedDentistId));

  // Medical alerts list options
  const COMMON_ALERTS = [
    'Penicillin allergy',
    'Latex allergy',
    'High blood pressure',
    'Local anesthetic sensitivity',
    'Dental anxiety',
    'Bleeding disorder',
  ];

  const handleToggleAlert = (alert: string) => {
    setPatientInfo((prev) => {
      const exists = prev.medicalAlerts.includes(alert);
      return {
        ...prev,
        medicalAlerts: exists
          ? prev.medicalAlerts.filter((a) => a !== alert)
          : [...prev.medicalAlerts, alert],
      };
    });
  };

  // Step Validation
  const canProceedFromStep1 = !!selectedServiceId;
  const canProceedFromStep2 = true; // Dentist or 'any'
  const canProceedFromStep3 = !!selectedTimeSlot;
  const canProceedFromStep4 =
    patientInfo.firstName.trim().length >= 2 &&
    patientInfo.lastName.trim().length >= 2 &&
    patientInfo.email.includes('@') &&
    patientInfo.phone.trim().length >= 7;

  // Final submission
  const handleSubmitBooking = () => {
    if (!currentService || !selectedTimeSlot) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const mergedAlerts = [...patientInfo.medicalAlerts];
    if (medicalNoteInput.trim() && !mergedAlerts.includes(medicalNoteInput.trim())) {
      mergedAlerts.push(medicalNoteInput.trim());
    }

    const result = DentalStorage.bookAppointment({
      serviceId: currentService.id,
      dentistId: selectedTimeSlot.dentistId,
      date: selectedDate,
      startTime: selectedTimeSlot.time,
      patientInfo: {
        ...patientInfo,
        medicalAlerts: mergedAlerts,
      },
      patientNotes: patientNotes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (!result.success || !result.appointment) {
      setErrorMessage(result.error || 'The requested slot is no longer available. Please choose another time.');
      // Return to step 3 so the patient can pick another slot without retyping their info
      setCurrentStep(3);
      return;
    }

    setConfirmedAppointment(result.appointment);
    onBookingSuccess(result.appointment);
    setCurrentStep(6); // Success screen
  };

  // Download .ics calendar invite
  const downloadCalendarFile = (apt: Appointment) => {
    const s = currentService?.name || 'Dental Appointment';
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Orale Dental Studio//Booking System//EN',
      'BEGIN:VEVENT',
      `SUMMARY:Orale Dental: ${s}`,
      `DESCRIPTION:Booking Reference: ${apt.bookingReference}. Address: ${settings.address}, ${settings.city}. Contact: ${settings.phone}`,
      `LOCATION:${settings.address}, ${settings.city}`,
      `DTSTART:${apt.date.replace(/-/g, '')}T${apt.startTime.replace(':', '')}00`,
      `DTEND:${apt.date.replace(/-/g, '')}T${apt.endTime.replace(':', '')}00`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `orale-appointment-${apt.bookingReference}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-teal-700">
              {currentStep <= 5 ? `Step ${currentStep} of 5` : 'Booking Complete'}
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              {currentStep === 1 && '1. Choose Dental Service'}
              {currentStep === 2 && '2. Select Your Dentist'}
              {currentStep === 3 && '3. Pick Date & Available Time'}
              {currentStep === 4 && '4. Patient Information'}
              {currentStep === 5 && '5. Review & Confirm Booking'}
              {currentStep === 6 && 'Appointment Confirmed'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        {currentStep <= 5 && (
          <div className="w-full bg-slate-100 h-1">
            <div
              className="bg-teal-600 h-1 transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        )}

        {/* Modal Body with Scroll */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to reserve slot</p>
                <p className="mt-0.5 text-xs text-rose-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* STEP 1: Select Dental Service */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-600">
                Choose the procedure you require. Duration and buffer times are calculated automatically to avoid waiting room delays.
              </p>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {services.filter((s) => s.active).map((service) => {
                  const isSelected = selectedServiceId === service.id;
                  return (
                    <div
                      key={service.id}
                      onClick={() => setSelectedServiceId(service.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/50 ring-1 ring-teal-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <span className="font-semibold uppercase tracking-wider text-teal-700">
                              {service.category.replace('_', ' ')}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{service.durationMinutes} mins</span>
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900">
                            {service.name}
                          </h4>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {service.description}
                          </p>
                          {service.requiresConsultationFirst && (
                            <span className="inline-block mt-1 text-[11px] text-teal-800 font-medium bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              Assessment & planning visit required first
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold font-mono tabular-nums text-slate-900 block">
                            {service.priceRange || `₱${service.price.toLocaleString()}`}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono block">
                            Starts at ₱{service.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Choose Dentist */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-600">
                You can select a preferred clinician or choose <span className="font-medium text-slate-900">Any available dentist</span> for the earliest opening.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Any available option */}
                <div
                  onClick={() => setSelectedDentistId('any')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all sm:col-span-2 ${
                    selectedDentistId === 'any'
                      ? 'border-teal-600 bg-teal-50/50 ring-1 ring-teal-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                      ALL
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Any Available Dentist (Fastest)</div>
                      <div className="text-xs text-slate-500">Shows all available slots across qualified practitioners</div>
                    </div>
                  </div>
                </div>

                {/* Specific dentists */}
                {dentists
                  .filter((d) => d.active)
                  .map((dentist) => {
                    const isAssigned = currentService ? dentist.assignedServiceIds.includes(currentService.id) : true;
                    const isSelected = selectedDentistId === dentist.id;

                    return (
                      <div
                        key={dentist.id}
                        onClick={() => {
                          if (isAssigned) setSelectedDentistId(dentist.id);
                        }}
                        className={`p-4 rounded-xl border transition-all ${
                          !isAssigned
                            ? 'opacity-40 bg-slate-50 border-slate-200 cursor-not-allowed'
                            : isSelected
                            ? 'border-teal-600 bg-teal-50/50 ring-1 ring-teal-600 cursor-pointer'
                            : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={dentist.avatarUrl}
                            alt={dentist.name}
                            className="w-12 h-12 rounded-full object-cover shrink-0 border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="text-sm font-bold text-slate-900">{dentist.name}</div>
                            <div className="text-xs text-slate-500 line-clamp-1">{dentist.specialty}</div>
                            {!isAssigned && (
                              <div className="text-[11px] text-amber-700 mt-1 font-medium">
                                Does not perform this procedure
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* STEP 3: Date & Available Time Slot */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">Treatment & Clinician</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {currentService?.name} ({currentService?.durationMinutes} mins)
                  </div>
                </div>
                <div className="text-xs text-slate-600">
                  Practitioner: <span className="font-semibold text-slate-900">{activeDentist ? activeDentist.name : 'Any Available'}</span>
                </div>
              </div>

              {/* Date Input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                  Select Appointment Date
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full sm:w-64 bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                    {formatDateReadable(selectedDate)}
                  </span>
                </div>
              </div>

              {/* Available Slots Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                    Available Time Slots for {formatDateReadable(selectedDate)}
                  </label>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    {availableSlots.length} openings
                  </span>
                </div>

                {loadingSlots ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    Checking clinical chair availability...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm">
                    <p className="font-semibold text-slate-900">No open slots on this date.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      The clinician may be off or fully booked. Please select another date.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-52 overflow-y-auto pr-1">
                    {availableSlots.map((slot) => {
                      const isSelected =
                        selectedTimeSlot?.time === slot.time &&
                        selectedTimeSlot?.dentistId === slot.dentistId;

                      return (
                        <button
                          key={`${slot.time}_${slot.dentistId}`}
                          type="button"
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'border-teal-600 bg-teal-600 text-white shadow-xs'
                              : 'border-slate-200 hover:border-slate-400 bg-white text-slate-900'
                          }`}
                        >
                          <div className="font-mono text-sm font-bold tabular-nums">
                            {slot.time}
                          </div>
                          <div
                            className={`text-[11px] truncate mt-0.5 ${
                              isSelected ? 'text-teal-100' : 'text-slate-500'
                            }`}
                          >
                            {slot.dentistName.split(' ')[1]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Patient Information */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-600">
                Please provide your contact and health information. This information is confidential and used strictly for appointment reminders and clinical preparation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samantha"
                    value={patientInfo.firstName}
                    onChange={(e) => setPatientInfo({ ...patientInfo, firstName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Miller"
                    value={patientInfo.lastName}
                    onChange={(e) => setPatientInfo({ ...patientInfo, lastName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={patientInfo.email}
                    onChange={(e) => setPatientInfo({ ...patientInfo, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Mobile Number (for SMS confirmation) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+63 917 000 0000"
                    value={patientInfo.phone}
                    onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={patientInfo.dateOfBirth}
                    onChange={(e) => setPatientInfo({ ...patientInfo, dateOfBirth: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">HMO Dental Insurance / Payment Method</label>
                  <select
                    value={patientInfo.insuranceProvider}
                    onChange={(e) => setPatientInfo({ ...patientInfo, insuranceProvider: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  >
                    <option value="Self-Pay / Cash">Self-Pay / Cash</option>
                    <option value="GCash / Maya">GCash / Maya</option>
                    <option value="Credit Card (0% Installment)">Credit Card (0% Installment)</option>
                    <option value="Maxicare Plus / Platinum">Maxicare Plus / Platinum</option>
                    <option value="Intellicare HMO">Intellicare HMO</option>
                    <option value="Medicard Philippines">Medicard Philippines</option>
                    <option value="PhilCare Dental">PhilCare Dental</option>
                    <option value="Pacific Cross Dental">Pacific Cross Dental</option>
                    <option value="Cigna Global">Cigna Global</option>
                  </select>
                </div>
              </div>

              {/* Medical Alerts & Allergies */}
              <div className="pt-2 border-t border-slate-200">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                  Medical Alerts & Allergies (Optional)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COMMON_ALERTS.map((alert) => {
                    const isChecked = patientInfo.medicalAlerts.includes(alert);
                    return (
                      <button
                        key={alert}
                        type="button"
                        onClick={() => handleToggleAlert(alert)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          isChecked
                            ? 'bg-amber-100 border-amber-300 text-amber-900'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {alert}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">Additional notes or specific tooth pain/concerns:</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Mild sensitivity on lower left tooth when drinking cold water..."
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Review & Confirm */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                    Booking Summary
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono tabular-nums text-slate-900 block">
                      {currentService?.priceRange || `₱${currentService?.price?.toLocaleString()}`}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono block">
                      Starts at ₱{currentService?.price?.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-500 block text-xs">Procedure</span>
                    <span className="font-bold text-slate-900">{currentService?.name}</span>
                    <span className="text-xs text-slate-500 block font-mono tabular-nums">
                      Duration: {currentService?.durationMinutes} mins (+ {currentService?.bufferMinutes || 15}m buffer)
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-xs">Assigned Clinician</span>
                    <span className="font-bold text-slate-900">{selectedTimeSlot?.dentistName}</span>
                    <span className="text-xs text-slate-500 block">Orale' Operatory Suite</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-xs">Date & Time</span>
                    <span className="font-bold text-slate-900 font-mono tabular-nums">
                      {formatDateReadable(selectedDate)} at {selectedTimeSlot?.time}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-xs">Patient</span>
                    <span className="font-bold text-slate-900">
                      {patientInfo.firstName} {patientInfo.lastName}
                    </span>
                    <span className="text-xs text-slate-500 block">{patientInfo.email} · {patientInfo.phone}</span>
                  </div>
                </div>

                {patientInfo.medicalAlerts.length > 0 && (
                  <div className="pt-2 text-xs text-amber-800">
                    <span className="font-semibold">Recorded Medical Alerts: </span>
                    {patientInfo.medicalAlerts.join(', ')}
                  </div>
                )}
              </div>

              {/* Policy agreement */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={agreedToPolicy}
                    onChange={(e) => setAgreedToPolicy(e.target.checked)}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>
                    I understand that Orale' enforces a {settings.cancellationCutoffHours}-hour notice for cancellations or rescheduling. No prepayment is required today; payment is collected at the studio via insurance or card.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 6: Confirmation Screen */}
          {currentStep === 6 && confirmedAppointment && (
            <div id="printable-receipt" className="space-y-6 text-center py-4">
              <div className="w-14 h-14 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  {confirmedAppointment.status === 'confirmed' ? 'Appointment Confirmed' : 'Request Submitted'}
                </span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  We look forward to welcoming you!
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  A confirmation email and SMS reminder have been dispatched.
                </p>
              </div>

              {/* Reference Box */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-left max-w-md mx-auto space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Booking Reference</span>
                  <span className="text-base font-bold font-mono tracking-wider text-teal-700">
                    {confirmedAppointment.bookingReference}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">Treatment:</span> {currentService?.name}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Clinician:</span> {selectedTimeSlot?.dentistName}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Date & Time:</span> {formatDateReadable(confirmedAppointment.date)} at {confirmedAppointment.startTime}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Location:</span> {settings.address}, {settings.city}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Preparation:</span> {currentService?.preparationNotes}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => downloadCalendarFile(confirmedAppointment)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Add to Calendar (.ics)</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Print Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTrackerForRef(confirmedAppointment.bookingReference);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                >
                  <span>Track Status</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {currentStep <= 5 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                disabled={
                  (currentStep === 1 && !canProceedFromStep1) ||
                  (currentStep === 2 && !canProceedFromStep2) ||
                  (currentStep === 3 && !canProceedFromStep3) ||
                  (currentStep === 4 && !canProceedFromStep4)
                }
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:hover:bg-teal-600 rounded-lg shadow-xs transition-all"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!agreedToPolicy || isSubmitting}
                onClick={handleSubmitBooking}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 rounded-lg shadow-xs transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Verifying Availability...' : 'Confirm Appointment'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
