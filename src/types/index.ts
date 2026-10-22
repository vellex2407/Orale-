export type UserRole = 'patient' | 'dentist' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  dentistId?: string;
  patientId?: string;
}

export interface Patient {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalAlerts?: string[]; // e.g. "Penicillin allergy", "Hypertension"
  insuranceProvider?: string;
  preferredDentistId?: string;
  createdAt: string;
}

export type ServiceCategory =
  | 'cleaning_prevention'
  | 'tooth_repair'
  | 'extraction_surgery'
  | 'braces_alignment'
  | 'dentures_replacement'
  | 'cosmetic'
  | 'consultation';

export interface DentalService {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  durationMinutes: number; // e.g. 45
  bufferMinutes: number; // e.g. 15 for sterilization
  price: number; // Base starting price in PHP
  priceRange: string; // e.g. "₱500 – ₱1,500"
  priceNote?: string; // e.g. "Final price depends on dentist assessment & case complexity"
  appointmentType?: string; // e.g. "In-clinic procedure" or "Assessment first"
  requiresConsultationFirst?: boolean; // For braces, implants, root canals
  preparationNotes: string;
  active: boolean;
}

export interface Dentist {
  id: string;
  name: string;
  title: string; // e.g. "DDS, Board Certified Orthodontist"
  specialty: string;
  bio: string;
  avatarUrl: string;
  email: string;
  phone: string;
  assignedServiceIds: string[];
  active: boolean;
}

export interface WorkingHours {
  id: string;
  dentistId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "08:30"
  endTime: string; // "17:00"
  breakStartTime: string; // "12:30"
  breakEndTime: string; // "13:30"
  isWorkingDay: boolean;
}

export interface TimeOff {
  id: string;
  dentistId: string;
  title: string; // "Annual Dental Conference", "Personal Leave", "Chair Maintenance"
  startDate: string; // "2026-10-25"
  endDate: string; // "2026-10-27"
  reason?: string;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'arrived'
  | 'in_treatment'
  | 'completed'
  | 'rescheduled'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: string;
  bookingReference: string; // e.g. "ORL-8492"
  patientId: string;
  dentistId: string;
  serviceId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "09:00"
  endTime: string; // "09:45"
  status: AppointmentStatus;
  notes?: string;
  patientNotes?: string;
  adminNotes?: string;
  isWalkIn?: boolean;
  cancellationReason?: string;
  rescheduledFromId?: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  appointmentId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  type: 'booking_confirmation' | 'reminder_24h' | 'status_update' | 'cancellation_notice';
  channel: 'email' | 'sms';
  subject: string;
  body: string;
  status: 'sent' | 'delivered' | 'failed';
  sentAt: string;
}

export interface AuditLog {
  id: string;
  entityType: 'appointment' | 'dentist' | 'service' | 'schedule';
  entityId: string;
  action: 'create' | 'update_status' | 'reschedule' | 'cancel' | 'update_schedule';
  performedBy: string; // User name or role
  details: string;
  timestamp: string;
}

export interface ClinicSettings {
  clinicName: string;
  phone: string;
  emergencyHotline: string;
  email: string;
  address: string;
  city: string;
  autoConfirmAppointments: boolean;
  defaultBufferMinutes: number;
  cancellationCutoffHours: number;
  operatingHoursSummary: string;
}
