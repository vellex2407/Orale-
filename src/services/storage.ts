import {
  DentalService,
  Dentist,
  WorkingHours,
  TimeOff,
  Patient,
  Appointment,
  NotificationLog,
  AuditLog,
  ClinicSettings,
  AppointmentStatus,
} from '../types';
import {
  INITIAL_SERVICES,
  INITIAL_DENTISTS,
  INITIAL_WORKING_HOURS,
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_CLINIC_SETTINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from '../data/seedData';

// Storage keys bumped to v3 for Philippine dental treatment menu and price ranges
const STORAGE_KEYS = {
  SERVICES: 'orale_services_v3_ph_menu',
  DENTISTS: 'orale_dentists_v3_ph_menu',
  WORKING_HOURS: 'orale_working_hours_v3_ph_menu',
  TIME_OFF: 'orale_time_off_v3_ph_menu',
  PATIENTS: 'orale_patients_v3_ph_menu',
  APPOINTMENTS: 'orale_appointments_v3_ph_menu',
  NOTIFICATIONS: 'orale_notifications_v3_ph_menu',
  AUDIT_LOGS: 'orale_audit_logs_v3_ph_menu',
  SETTINGS: 'orale_settings_v3_ph_menu',
};

// Format currency in Philippine Peso
export function formatPeso(amount: number): string {
  return `₱${(amount || 0).toLocaleString()}`;
}

// Helper to parse "HH:MM" into minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Helper to convert minutes from midnight to "HH:MM"
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Format date nicely e.g. "Thu, Oct 23, 2026"
export function formatDateReadable(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Safe localStorage helper
function getStored<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage write error', err);
  }
}

export const DentalStorage = {
  // Init storage if empty
  init(): void {
    if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) {
      setStored(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.DENTISTS)) {
      setStored(STORAGE_KEYS.DENTISTS, INITIAL_DENTISTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.WORKING_HOURS)) {
      setStored(STORAGE_KEYS.WORKING_HOURS, INITIAL_WORKING_HOURS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TIME_OFF)) {
      setStored(STORAGE_KEYS.TIME_OFF, [] as TimeOff[]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PATIENTS)) {
      setStored(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.APPOINTMENTS)) {
      setStored(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      setStored(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      setStored(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      setStored(STORAGE_KEYS.SETTINGS, INITIAL_CLINIC_SETTINGS);
    }
  },

  resetAll(): void {
    setStored(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    setStored(STORAGE_KEYS.DENTISTS, INITIAL_DENTISTS);
    setStored(STORAGE_KEYS.WORKING_HOURS, INITIAL_WORKING_HOURS);
    setStored(STORAGE_KEYS.TIME_OFF, [] as TimeOff[]);
    setStored(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS);
    setStored(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
    setStored(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    setStored(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    setStored(STORAGE_KEYS.SETTINGS, INITIAL_CLINIC_SETTINGS);
  },

  // Services
  getServices(): DentalService[] {
    return getStored<DentalService[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  },

  getServiceById(id: string): DentalService | undefined {
    return this.getServices().find((s) => s.id === id);
  },

  saveService(service: DentalService): void {
    const list = this.getServices();
    const idx = list.findIndex((s) => s.id === service.id);
    if (idx >= 0) {
      list[idx] = service;
    } else {
      list.push(service);
    }
    setStored(STORAGE_KEYS.SERVICES, list);
    this.addAuditLog('service', service.id, 'create', 'Admin', `Saved service "${service.name}"`);
  },

  // Dentists
  getDentists(): Dentist[] {
    return getStored<Dentist[]>(STORAGE_KEYS.DENTISTS, INITIAL_DENTISTS);
  },

  getDentistById(id: string): Dentist | undefined {
    return this.getDentists().find((d) => d.id === id);
  },

  saveDentist(dentist: Dentist): void {
    const list = this.getDentists();
    const idx = list.findIndex((d) => d.id === dentist.id);
    if (idx >= 0) {
      list[idx] = dentist;
    } else {
      list.push(dentist);
    }
    setStored(STORAGE_KEYS.DENTISTS, list);
  },

  // Working Hours & Time Off
  getWorkingHours(): WorkingHours[] {
    return getStored<WorkingHours[]>(STORAGE_KEYS.WORKING_HOURS, INITIAL_WORKING_HOURS);
  },

  getWorkingHoursForDentist(dentistId: string): WorkingHours[] {
    return this.getWorkingHours().filter((wh) => wh.dentistId === dentistId);
  },

  saveWorkingHours(wh: WorkingHours): void {
    const list = this.getWorkingHours();
    const idx = list.findIndex((item) => item.id === wh.id);
    if (idx >= 0) {
      list[idx] = wh;
    } else {
      list.push(wh);
    }
    setStored(STORAGE_KEYS.WORKING_HOURS, list);
    this.addAuditLog('schedule', wh.dentistId, 'update_schedule', 'Admin', `Updated schedule for day ${wh.dayOfWeek}`);
  },

  getTimeOff(): TimeOff[] {
    return getStored<TimeOff[]>(STORAGE_KEYS.TIME_OFF, []);
  },

  addTimeOff(timeOff: TimeOff): void {
    const list = this.getTimeOff();
    list.push(timeOff);
    setStored(STORAGE_KEYS.TIME_OFF, list);
    this.addAuditLog('dentist', timeOff.dentistId, 'update_schedule', 'Admin', `Blocked time-off: ${timeOff.title} (${timeOff.startDate} to ${timeOff.endDate})`);
  },

  deleteTimeOff(id: string): void {
    const list = this.getTimeOff().filter((t) => t.id !== id);
    setStored(STORAGE_KEYS.TIME_OFF, list);
  },

  // Patients
  getPatients(): Patient[] {
    return getStored<Patient[]>(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS);
  },

  getPatientById(id: string): Patient | undefined {
    return this.getPatients().find((p) => p.id === id);
  },

  findOrCreatePatient(patientData: Omit<Patient, 'id' | 'createdAt'>): Patient {
    const patients = this.getPatients();
    // Match by email or phone
    const existing = patients.find(
      (p) =>
        p.email.toLowerCase() === patientData.email.toLowerCase() ||
        p.phone.replace(/\D/g, '') === patientData.phone.replace(/\D/g, '')
    );
    if (existing) {
      // Update with any newer info
      const updated: Patient = {
        ...existing,
        ...patientData,
      };
      const idx = patients.findIndex((p) => p.id === existing.id);
      patients[idx] = updated;
      setStored(STORAGE_KEYS.PATIENTS, patients);
      return updated;
    }

    const newPatient: Patient = {
      ...patientData,
      id: `pat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    patients.push(newPatient);
    setStored(STORAGE_KEYS.PATIENTS, patients);
    return newPatient;
  },

  // Appointments
  getAppointments(): Appointment[] {
    return getStored<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  },

  getAppointmentById(id: string): Appointment | undefined {
    return this.getAppointments().find((a) => a.id === id);
  },

  getAppointmentByReference(reference: string): Appointment | undefined {
    const cleanRef = reference.trim().toUpperCase();
    return this.getAppointments().find(
      (a) => a.bookingReference.toUpperCase() === cleanRef
    );
  },

  // Availability & Conflict Check (Server-Grade Slot Validation)
  checkSlotConflict(params: {
    dentistId: string;
    date: string;
    startTime: string;
    durationMinutes: number;
    bufferMinutes?: number;
    excludeAppointmentId?: string;
  }): { hasConflict: boolean; reason?: string } {
    const { dentistId, date, startTime, durationMinutes, bufferMinutes = 0, excludeAppointmentId } = params;

    const dentist = this.getDentistById(dentistId);
    if (!dentist || !dentist.active) {
      return { hasConflict: true, reason: 'Selected dentist is not active.' };
    }

    // Check time-off
    const timeOffs = this.getTimeOff().filter((t) => t.dentistId === dentistId);
    const hasTimeOff = timeOffs.some((t) => date >= t.startDate && date <= t.endDate);
    if (hasTimeOff) {
      return { hasConflict: true, reason: 'Dentist is on scheduled leave/time-off on this date.' };
    }

    // Check working hours for that day of week
    const [y, m, d] = date.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay(); // 0 = Sun, 1 = Mon...
    const wh = this.getWorkingHours().find((w) => w.dentistId === dentistId && w.dayOfWeek === dayOfWeek);

    if (!wh || !wh.isWorkingDay) {
      return { hasConflict: true, reason: 'Dentist does not hold clinic hours on this day.' };
    }

    const reqStartMins = timeToMinutes(startTime);
    const reqEndMins = reqStartMins + durationMinutes;

    const workStartMins = timeToMinutes(wh.startTime);
    const workEndMins = timeToMinutes(wh.endTime);

    if (reqStartMins < workStartMins || reqEndMins > workEndMins) {
      return { hasConflict: true, reason: `Requested time falls outside clinic hours (${wh.startTime} - ${wh.endTime}).` };
    }

    // Check break time
    if (wh.breakStartTime && wh.breakEndTime) {
      const breakStartMins = timeToMinutes(wh.breakStartTime);
      const breakEndMins = timeToMinutes(wh.breakEndTime);
      if (reqStartMins < breakEndMins && reqEndMins > breakStartMins) {
        return { hasConflict: true, reason: `Requested time overlaps with dentist's clinical break (${wh.breakStartTime} - ${wh.breakEndTime}).` };
      }
    }

    // Check existing appointments on that date for this dentist
    const appointments = this.getAppointments().filter(
      (a) =>
        a.dentistId === dentistId &&
        a.date === date &&
        a.id !== excludeAppointmentId &&
        a.status !== 'cancelled' &&
        a.status !== 'rescheduled'
    );

    for (const apt of appointments) {
      const existingStart = timeToMinutes(apt.startTime);
      const existingEnd = timeToMinutes(apt.endTime) + bufferMinutes;
      const newStart = reqStartMins;
      const newEnd = reqEndMins + bufferMinutes;

      // Overlap check
      if (newStart < existingEnd && newEnd > existingStart) {
        return {
          hasConflict: true,
          reason: `Slot conflict: Overlaps with an existing appointment from ${apt.startTime} to ${apt.endTime}.`,
        };
      }
    }

    return { hasConflict: false };
  },

  // Calculate available time slots for a given dentist (or any available dentist) and date
  getAvailableSlots(params: {
    serviceId: string;
    dentistId?: string;
    date: string;
  }): { time: string; dentistId: string; dentistName: string }[] {
    const { serviceId, dentistId, date } = params;
    const service = this.getServiceById(serviceId);
    if (!service) return [];

    const settings = this.getSettings();
    const buffer = service.bufferMinutes || settings.defaultBufferMinutes || 15;
    const duration = service.durationMinutes;

    let candidateDentists = this.getDentists().filter((d) => d.active);
    if (dentistId && dentistId !== 'any') {
      candidateDentists = candidateDentists.filter((d) => d.id === dentistId);
    } else {
      candidateDentists = candidateDentists.filter((d) =>
        d.assignedServiceIds.includes(serviceId)
      );
    }

    const availableSlotsMap = new Map<string, { time: string; dentistId: string; dentistName: string }>();

    for (const dentist of candidateDentists) {
      const [y, m, d] = date.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      const wh = this.getWorkingHours().find((w) => w.dentistId === dentist.id && w.dayOfWeek === dayOfWeek);

      if (!wh || !wh.isWorkingDay) continue;

      const workStartMins = timeToMinutes(wh.startTime);
      const workEndMins = timeToMinutes(wh.endTime);

      const stepMins = 30;

      for (let slotTimeMins = workStartMins; slotTimeMins + duration <= workEndMins; slotTimeMins += stepMins) {
        const slotTimeStr = minutesToTime(slotTimeMins);

        const conflictCheck = this.checkSlotConflict({
          dentistId: dentist.id,
          date,
          startTime: slotTimeStr,
          durationMinutes: duration,
          bufferMinutes: buffer,
        });

        if (!conflictCheck.hasConflict) {
          const key = `${slotTimeStr}_${dentist.id}`;
          if (!availableSlotsMap.has(key)) {
            availableSlotsMap.set(key, {
              time: slotTimeStr,
              dentistId: dentist.id,
              dentistName: dentist.name,
            });
          }
        }
      }
    }

    return Array.from(availableSlotsMap.values()).sort(
      (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)
    );
  },

  // Save new appointment with validation & notifications
  bookAppointment(data: {
    serviceId: string;
    dentistId: string;
    date: string;
    startTime: string;
    patientInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      medicalAlerts?: string[];
      insuranceProvider?: string;
    };
    patientNotes?: string;
    isWalkIn?: boolean;
    bookedBy?: string;
  }): { success: boolean; appointment?: Appointment; error?: string } {
    const service = this.getServiceById(data.serviceId);
    if (!service) return { success: false, error: 'Service not found.' };

    const settings = this.getSettings();
    const duration = service.durationMinutes;
    const buffer = service.bufferMinutes || settings.defaultBufferMinutes;

    // Server-side slot re-validation
    const conflict = this.checkSlotConflict({
      dentistId: data.dentistId,
      date: data.date,
      startTime: data.startTime,
      durationMinutes: duration,
      bufferMinutes: buffer,
    });

    if (conflict.hasConflict) {
      return { success: false, error: conflict.reason || 'Requested slot is no longer available.' };
    }

    // Calculate end time
    const startMins = timeToMinutes(data.startTime);
    const endMins = startMins + duration;
    const endTime = minutesToTime(endMins);

    // Save or update patient
    const patient = this.findOrCreatePatient({
      firstName: data.patientInfo.firstName.trim(),
      lastName: data.patientInfo.lastName.trim(),
      email: data.patientInfo.email.trim(),
      phone: data.patientInfo.phone.trim(),
      dateOfBirth: data.patientInfo.dateOfBirth,
      emergencyContactName: data.patientInfo.emergencyContactName,
      emergencyContactPhone: data.patientInfo.emergencyContactPhone,
      medicalAlerts: data.patientInfo.medicalAlerts || [],
      insuranceProvider: data.patientInfo.insuranceProvider,
      preferredDentistId: data.dentistId,
    });

    // Generate unique reference
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingReference = `ORL-${new Date().getFullYear()}-${randomSuffix}`;

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      bookingReference,
      patientId: patient.id,
      dentistId: data.dentistId,
      serviceId: data.serviceId,
      date: data.date,
      startTime: data.startTime,
      endTime,
      status: settings.autoConfirmAppointments ? 'confirmed' : 'pending',
      patientNotes: data.patientNotes,
      isWalkIn: !!data.isWalkIn,
      totalPrice: service.price,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const appointments = this.getAppointments();
    appointments.unshift(newAppointment);
    setStored(STORAGE_KEYS.APPOINTMENTS, appointments);

    // Audit Log
    const performer = data.bookedBy || `${patient.firstName} ${patient.lastName} (Online Portal)`;
    this.addAuditLog(
      'appointment',
      newAppointment.id,
      'create',
      performer,
      `Booked ${service.name} with ${this.getDentistById(data.dentistId)?.name} for ${formatDateReadable(data.date)} at ${data.startTime}. Fee: ₱${service.price.toLocaleString()}. Status: ${newAppointment.status}`
    );

    // Notifications
    const dentist = this.getDentistById(data.dentistId);
    this.createNotification({
      appointmentId: newAppointment.id,
      recipientEmail: patient.email,
      recipientPhone: patient.phone,
      type: 'booking_confirmation',
      channel: 'email',
      subject: `Appointment ${newAppointment.status === 'confirmed' ? 'Confirmed' : 'Received'}: ${settings.clinicName} [Ref: ${bookingReference}]`,
      body: `Mabuhay ${patient.firstName}! Your appointment for ${service.name} with ${dentist?.name} on ${formatDateReadable(data.date)} at ${data.startTime} has been ${newAppointment.status === 'confirmed' ? 'confirmed' : 'submitted for clinic verification'}. Total fee: ₱${service.price.toLocaleString()}. Location: ${settings.address}, ${settings.city}. Phone: ${settings.phone}.`,
    });

    this.createNotification({
      appointmentId: newAppointment.id,
      recipientPhone: patient.phone,
      type: 'booking_confirmation',
      channel: 'sms',
      subject: `${settings.clinicName} Booking`,
      body: `Orale Dental BGC: Ref ${bookingReference}. ${service.name} on ${data.date} at ${data.startTime}. Fee: ₱${service.price.toLocaleString()}. Status: ${newAppointment.status}. Contact: ${settings.phone}`,
    });

    return { success: true, appointment: newAppointment };
  },

  // Update appointment status with lifecycle rules & audit
  updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus,
    performedBy: string,
    notes?: string
  ): boolean {
    const appointments = this.getAppointments();
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return false;

    const oldStatus = apt.status;
    apt.status = status;
    apt.updatedAt = new Date().toISOString();
    if (notes) {
      apt.adminNotes = (apt.adminNotes ? apt.adminNotes + '\n' : '') + notes;
    }

    setStored(STORAGE_KEYS.APPOINTMENTS, appointments);

    this.addAuditLog(
      'appointment',
      apt.id,
      'update_status',
      performedBy,
      `Status changed from "${oldStatus}" to "${status}". Notes: ${notes || 'None'}`
    );

    // Notify patient of status update
    const patient = this.getPatientById(apt.patientId);
    const service = this.getServiceById(apt.serviceId);
    if (patient) {
      this.createNotification({
        appointmentId: apt.id,
        recipientEmail: patient.email,
        recipientPhone: patient.phone,
        type: 'status_update',
        channel: 'email',
        subject: `Update on your Orale' Dental Appointment [Ref: ${apt.bookingReference}]`,
        body: `Dear ${patient.firstName}, your appointment status for ${service?.name || 'procedure'} on ${formatDateReadable(apt.date)} is now: ${status.toUpperCase().replace('_', ' ')}.`,
      });
    }

    return true;
  },

  // Reschedule appointment with slot availability re-check
  rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newStartTime: string,
    newDentistId: string,
    performedBy: string,
    reason?: string
  ): { success: boolean; error?: string } {
    const appointments = this.getAppointments();
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return { success: false, error: 'Appointment not found.' };

    const service = this.getServiceById(apt.serviceId);
    if (!service) return { success: false, error: 'Service record not found.' };

    const conflict = this.checkSlotConflict({
      dentistId: newDentistId,
      date: newDate,
      startTime: newStartTime,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes,
      excludeAppointmentId: apt.id,
    });

    if (conflict.hasConflict) {
      return { success: false, error: conflict.reason || 'New slot is unavailable.' };
    }

    const startMins = timeToMinutes(newStartTime);
    const endMins = startMins + service.durationMinutes;

    const oldDate = apt.date;
    const oldTime = apt.startTime;

    apt.date = newDate;
    apt.startTime = newStartTime;
    apt.endTime = minutesToTime(endMins);
    apt.dentistId = newDentistId;
    apt.status = 'confirmed';
    apt.updatedAt = new Date().toISOString();
    apt.adminNotes = (apt.adminNotes ? apt.adminNotes + '\n' : '') + `Rescheduled from ${oldDate} ${oldTime}. Reason: ${reason || 'Patient request'}`;

    setStored(STORAGE_KEYS.APPOINTMENTS, appointments);

    this.addAuditLog(
      'appointment',
      apt.id,
      'reschedule',
      performedBy,
      `Rescheduled from ${oldDate} ${oldTime} to ${newDate} ${newStartTime}. Reason: ${reason || 'N/A'}`
    );

    const patient = this.getPatientById(apt.patientId);
    if (patient) {
      this.createNotification({
        appointmentId: apt.id,
        recipientEmail: patient.email,
        recipientPhone: patient.phone,
        type: 'status_update',
        channel: 'email',
        subject: `Rescheduled: Your Orale' Dental Appointment [Ref: ${apt.bookingReference}]`,
        body: `Dear ${patient.firstName}, your appointment has been rescheduled to ${formatDateReadable(newDate)} at ${newStartTime} at Orale' Dental Studio BGC.`,
      });
    }

    return { success: true };
  },

  // Cancel appointment and release slot
  cancelAppointment(appointmentId: string, reason: string, performedBy: string): boolean {
    const appointments = this.getAppointments();
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return false;

    apt.status = 'cancelled';
    apt.cancellationReason = reason;
    apt.updatedAt = new Date().toISOString();
    setStored(STORAGE_KEYS.APPOINTMENTS, appointments);

    this.addAuditLog(
      'appointment',
      apt.id,
      'cancel',
      performedBy,
      `Appointment cancelled. Reason: ${reason}`
    );

    const patient = this.getPatientById(apt.patientId);
    if (patient) {
      this.createNotification({
        appointmentId: apt.id,
        recipientEmail: patient.email,
        recipientPhone: patient.phone,
        type: 'cancellation_notice',
        channel: 'email',
        subject: `Cancelled: Orale' Appointment [Ref: ${apt.bookingReference}]`,
        body: `Dear ${patient.firstName}, your dental appointment on ${formatDateReadable(apt.date)} has been cancelled. Reason noted: ${reason}. Please visit our website if you wish to re-book.`,
      });
    }

    return true;
  },

  // Notifications
  getNotifications(): NotificationLog[] {
    return getStored<NotificationLog[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  },

  createNotification(notifData: Omit<NotificationLog, 'id' | 'status' | 'sentAt'>): NotificationLog {
    const list = this.getNotifications();
    const newNotif: NotificationLog = {
      ...notifData,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'delivered',
      sentAt: new Date().toISOString(),
    };
    list.unshift(newNotif);
    setStored(STORAGE_KEYS.NOTIFICATIONS, list);
    return newNotif;
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return getStored<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },

  addAuditLog(
    entityType: AuditLog['entityType'],
    entityId: string,
    action: AuditLog['action'],
    performedBy: string,
    details: string
  ): void {
    const list = this.getAuditLogs();
    const log: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      entityType,
      entityId,
      action,
      performedBy,
      details,
      timestamp: new Date().toISOString(),
    };
    list.unshift(log);
    setStored(STORAGE_KEYS.AUDIT_LOGS, list);
  },

  // Clinic Settings
  getSettings(): ClinicSettings {
    return getStored<ClinicSettings>(STORAGE_KEYS.SETTINGS, INITIAL_CLINIC_SETTINGS);
  },

  updateSettings(settings: Partial<ClinicSettings>): void {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    setStored(STORAGE_KEYS.SETTINGS, updated);
  },
};
