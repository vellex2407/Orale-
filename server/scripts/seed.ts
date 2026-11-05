import 'dotenv/config';
import {
  INITIAL_APPOINTMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CLINIC_SETTINGS,
  INITIAL_DENTISTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PATIENTS,
  INITIAL_SERVICES,
  INITIAL_WORKING_HOURS,
} from '../../src/data/seedData';
import { closePool, getPool } from '../db';

async function seed(): Promise<void> {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    for (const service of INITIAL_SERVICES) {
      await connection.execute(
        `INSERT IGNORE INTO services
          (id, name, category, description, duration_minutes, buffer_minutes, price, price_range, price_note, appointment_type, requires_consultation_first, preparation_notes, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          service.id,
          service.name,
          service.category,
          service.description,
          service.durationMinutes,
          service.bufferMinutes,
          service.price,
          service.priceRange,
          service.priceNote ?? null,
          service.appointmentType ?? null,
          !!service.requiresConsultationFirst,
          service.preparationNotes,
          service.active,
        ]
      );
    }

    for (const dentist of INITIAL_DENTISTS) {
      await connection.execute(
        `INSERT IGNORE INTO dentists
          (id, name, title, specialty, bio, avatar_url, email, phone, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dentist.id,
          dentist.name,
          dentist.title,
          dentist.specialty,
          dentist.bio,
          dentist.avatarUrl,
          dentist.email,
          dentist.phone,
          dentist.active,
        ]
      );

      for (const serviceId of dentist.assignedServiceIds) {
        await connection.execute(
          'INSERT IGNORE INTO dentist_services (dentist_id, service_id) VALUES (?, ?)',
          [dentist.id, serviceId]
        );
      }
    }

    for (const hours of INITIAL_WORKING_HOURS) {
      await connection.execute(
        `INSERT IGNORE INTO working_hours
          (id, dentist_id, day_of_week, start_time, end_time, break_start_time, break_end_time, is_working_day)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          hours.id,
          hours.dentistId,
          hours.dayOfWeek,
          hours.startTime,
          hours.endTime,
          hours.breakStartTime,
          hours.breakEndTime,
          hours.isWorkingDay,
        ]
      );
    }

    for (const patient of INITIAL_PATIENTS) {
      await connection.execute(
        `INSERT IGNORE INTO patients
          (id, user_id, first_name, last_name, email, phone, date_of_birth, emergency_contact_name, emergency_contact_phone, medical_alerts, insurance_provider, preferred_dentist_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patient.id,
          patient.userId ?? null,
          patient.firstName,
          patient.lastName,
          patient.email,
          patient.phone,
          patient.dateOfBirth,
          patient.emergencyContactName ?? null,
          patient.emergencyContactPhone ?? null,
          JSON.stringify(patient.medicalAlerts ?? []),
          patient.insuranceProvider ?? null,
          patient.preferredDentistId ?? null,
          patient.createdAt.replace('T', ' ').replace('Z', ''),
        ]
      );
    }

    for (const appointment of INITIAL_APPOINTMENTS) {
      await connection.execute(
        `INSERT IGNORE INTO appointments
          (id, booking_reference, patient_id, dentist_id, service_id, appointment_date, start_time, end_time, status, notes, patient_notes, admin_notes, is_walk_in, cancellation_reason, rescheduled_from_id, total_price, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          appointment.id,
          appointment.bookingReference,
          appointment.patientId,
          appointment.dentistId,
          appointment.serviceId,
          appointment.date,
          appointment.startTime,
          appointment.endTime,
          appointment.status,
          appointment.notes ?? null,
          appointment.patientNotes ?? null,
          appointment.adminNotes ?? null,
          !!appointment.isWalkIn,
          appointment.cancellationReason ?? null,
          appointment.rescheduledFromId ?? null,
          appointment.totalPrice,
          appointment.createdAt.replace('T', ' ').replace('Z', ''),
          appointment.updatedAt.replace('T', ' ').replace('Z', ''),
        ]
      );
    }

    for (const notification of INITIAL_NOTIFICATIONS) {
      await connection.execute(
        `INSERT IGNORE INTO notifications
          (id, appointment_id, recipient_email, recipient_phone, type, channel, subject, body, status, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notification.id,
          notification.appointmentId,
          notification.recipientEmail ?? null,
          notification.recipientPhone ?? null,
          notification.type,
          notification.channel,
          notification.subject,
          notification.body,
          notification.status,
          notification.sentAt.replace('T', ' ').replace('Z', ''),
        ]
      );
    }

    for (const log of INITIAL_AUDIT_LOGS) {
      await connection.execute(
        `INSERT IGNORE INTO audit_logs
          (id, entity_type, entity_id, action, performed_by, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          log.id,
          log.entityType,
          log.entityId,
          log.action,
          log.performedBy,
          log.details,
          log.timestamp.replace('T', ' ').replace('Z', ''),
        ]
      );
    }

    const settings = INITIAL_CLINIC_SETTINGS;
    await connection.execute(
      `INSERT IGNORE INTO clinic_settings
        (id, clinic_name, phone, emergency_hotline, email, address, city, auto_confirm_appointments, default_buffer_minutes, cancellation_cutoff_hours, operating_hours_summary)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        settings.clinicName,
        settings.phone,
        settings.emergencyHotline,
        settings.email,
        settings.address,
        settings.city,
        settings.autoConfirmAppointments,
        settings.defaultBufferMinutes,
        settings.cancellationCutoffHours,
        settings.operatingHoursSummary,
      ]
    );

    await connection.commit();
    console.log('Demo data inserted (existing database records were left unchanged).');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await closePool();
  }
}

seed().catch((error: unknown) => {
  console.error('Database seed failed:', error);
  process.exitCode = 1;
});
