CREATE DATABASE IF NOT EXISTS orale_clinic
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE orale_clinic;

CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category ENUM('cleaning_prevention', 'tooth_repair', 'extraction_surgery', 'braces_alignment', 'dentures_replacement', 'cosmetic', 'consultation') NOT NULL,
  description TEXT NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  buffer_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL,
  price_range VARCHAR(120) NOT NULL,
  price_note TEXT NULL,
  appointment_type VARCHAR(120) NULL,
  requires_consultation_first BOOLEAN NOT NULL DEFAULT FALSE,
  preparation_notes TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS dentists (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  specialty VARCHAR(255) NOT NULL,
  bio TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS dentist_services (
  dentist_id VARCHAR(64) NOT NULL,
  service_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (dentist_id, service_id),
  CONSTRAINT fk_dentist_services_dentist FOREIGN KEY (dentist_id) REFERENCES dentists(id) ON DELETE CASCADE,
  CONSTRAINT fk_dentist_services_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS working_hours (
  id VARCHAR(64) PRIMARY KEY,
  dentist_id VARCHAR(64) NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start_time TIME NOT NULL,
  break_end_time TIME NOT NULL,
  is_working_day BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_working_hours_dentist_day (dentist_id, day_of_week),
  CONSTRAINT fk_working_hours_dentist FOREIGN KEY (dentist_id) REFERENCES dentists(id)
);

CREATE TABLE IF NOT EXISTS time_off (
  id VARCHAR(64) PRIMARY KEY,
  dentist_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NULL,
  CONSTRAINT fk_time_off_dentist FOREIGN KEY (dentist_id) REFERENCES dentists(id),
  INDEX idx_time_off_dentist_dates (dentist_id, start_date, end_date)
);

CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  date_of_birth DATE NOT NULL,
  emergency_contact_name VARCHAR(255) NULL,
  emergency_contact_phone VARCHAR(40) NULL,
  medical_alerts JSON NULL,
  insurance_provider VARCHAR(255) NULL,
  preferred_dentist_id VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_patients_email (email),
  INDEX idx_patients_phone (phone),
  CONSTRAINT fk_patients_preferred_dentist FOREIGN KEY (preferred_dentist_id) REFERENCES dentists(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(64) PRIMARY KEY,
  booking_reference VARCHAR(32) NOT NULL UNIQUE,
  patient_id VARCHAR(64) NOT NULL,
  dentist_id VARCHAR(64) NOT NULL,
  service_id VARCHAR(64) NOT NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('pending', 'confirmed', 'arrived', 'in_treatment', 'completed', 'rescheduled', 'cancelled', 'no_show') NOT NULL,
  notes TEXT NULL,
  patient_notes TEXT NULL,
  admin_notes TEXT NULL,
  is_walk_in BOOLEAN NOT NULL DEFAULT FALSE,
  cancellation_reason TEXT NULL,
  rescheduled_from_id VARCHAR(64) NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_appointments_dentist_date (dentist_id, appointment_date, status),
  INDEX idx_appointments_patient_date (patient_id, appointment_date),
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT fk_appointments_dentist FOREIGN KEY (dentist_id) REFERENCES dentists(id),
  CONSTRAINT fk_appointments_service FOREIGN KEY (service_id) REFERENCES services(id),
  CONSTRAINT fk_appointments_rescheduled_from FOREIGN KEY (rescheduled_from_id) REFERENCES appointments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  appointment_id VARCHAR(64) NOT NULL,
  recipient_email VARCHAR(320) NULL,
  recipient_phone VARCHAR(40) NULL,
  type ENUM('booking_confirmation', 'reminder_24h', 'status_update', 'cancellation_notice') NOT NULL,
  channel ENUM('email', 'sms') NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status ENUM('sent', 'delivered', 'failed') NOT NULL,
  sent_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_notifications_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  INDEX idx_notifications_appointment (appointment_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  entity_type ENUM('appointment', 'dentist', 'service', 'schedule') NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  action ENUM('create', 'update_status', 'reschedule', 'cancel', 'update_schedule') NOT NULL,
  performed_by VARCHAR(255) NOT NULL,
  details TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_audit_logs_entity (entity_type, entity_id),
  INDEX idx_audit_logs_created (created_at)
);

CREATE TABLE IF NOT EXISTS clinic_settings (
  id TINYINT UNSIGNED PRIMARY KEY,
  clinic_name VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  emergency_hotline VARCHAR(40) NOT NULL,
  email VARCHAR(320) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(255) NOT NULL,
  auto_confirm_appointments BOOLEAN NOT NULL DEFAULT FALSE,
  default_buffer_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 15,
  cancellation_cutoff_hours SMALLINT UNSIGNED NOT NULL DEFAULT 24,
  operating_hours_summary VARCHAR(255) NOT NULL,
  CONSTRAINT chk_single_clinic_settings CHECK (id = 1)
);
