import 'dotenv/config';
import express from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { randomUUID, randomBytes } from 'node:crypto';
import {
  type Appointment,
  type AuditLog,
  type ClinicSettings,
  type DentalService,
  type Dentist,
  type NotificationLog,
  type Patient,
  type TimeOff,
  type WorkingHours,
} from '../src/types';
import { getPool } from './db';

const app = express();

app.use(express.json({ limit: '1mb' }));

const port = Number(process.env.API_PORT || '3001');

type DatabaseRow = RowDataPacket & Record<string, unknown>;

async function queryRows(
  sql: string,
  values: (string | number)[] = []
): Promise<DatabaseRow[]> {
  const [rows] = await getPool().query<DatabaseRow[]>(sql, values);
  return rows;
}

function readStringArray(value: unknown): string[] {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array in the database.');
  }
  return parsed.map(String);
}

function toIsoDateTime(value: unknown): string {
  const dateTime = String(value);
  return `${dateTime.replace(' ', 'T')}Z`;
}

function toService(row: DatabaseRow): DentalService {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category) as DentalService['category'],
    description: String(row.description),
    durationMinutes: Number(row.duration_minutes),
    bufferMinutes: Number(row.buffer_minutes),
    price: Number(row.price),
    priceRange: String(row.price_range),
    priceNote: row.price_note == null ? undefined : String(row.price_note),
    appointmentType: row.appointment_type == null ? undefined : String(row.appointment_type),
    requiresConsultationFirst: Boolean(row.requires_consultation_first),
    preparationNotes: String(row.preparation_notes),
    active: Boolean(row.active),
  };
}

function toDentist(row: DatabaseRow): Dentist {
  return {
    id: String(row.id),
    name: String(row.name),
    title: String(row.title),
    specialty: String(row.specialty),
    bio: String(row.bio),
    avatarUrl: String(row.avatar_url),
    email: String(row.email),
    phone: String(row.phone),
    assignedServiceIds: readStringArray(row.assigned_service_ids),
    active: Boolean(row.active),
  };
}

function toWorkingHours(row: DatabaseRow): WorkingHours {
  return {
    id: String(row.id),
    dentistId: String(row.dentist_id),
    dayOfWeek: Number(row.day_of_week),
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    breakStartTime: String(row.break_start_time).slice(0, 5),
    breakEndTime: String(row.break_end_time).slice(0, 5),
    isWorkingDay: Boolean(row.is_working_day),
  };
}

function toTimeOff(row: DatabaseRow): TimeOff {
  return {
    id: String(row.id),
    dentistId: String(row.dentist_id),
    title: String(row.title),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    reason: row.reason == null ? undefined : String(row.reason),
  };
}

function toPatient(row: DatabaseRow): Patient {
  return {
    id: String(row.id),
    userId: row.user_id == null ? undefined : String(row.user_id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    email: String(row.email),
    phone: String(row.phone),
    dateOfBirth: String(row.date_of_birth),
    emergencyContactName: row.emergency_contact_name == null ? undefined : String(row.emergency_contact_name),
    emergencyContactPhone: row.emergency_contact_phone == null ? undefined : String(row.emergency_contact_phone),
    medicalAlerts: readStringArray(row.medical_alerts ?? []),
    insuranceProvider: row.insurance_provider == null ? undefined : String(row.insurance_provider),
    preferredDentistId: row.preferred_dentist_id == null ? undefined : String(row.preferred_dentist_id),
    createdAt: toIsoDateTime(row.created_at),
  };
}

function toAppointment(row: DatabaseRow): Appointment {
  return {
    id: String(row.id),
    bookingReference: String(row.booking_reference),
    patientId: String(row.patient_id),
    dentistId: String(row.dentist_id),
    serviceId: String(row.service_id),
    date: String(row.appointment_date),
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    status: String(row.status) as Appointment['status'],
    notes: row.notes == null ? undefined : String(row.notes),
    patientNotes: row.patient_notes == null ? undefined : String(row.patient_notes),
    adminNotes: row.admin_notes == null ? undefined : String(row.admin_notes),
    isWalkIn: Boolean(row.is_walk_in),
    cancellationReason: row.cancellation_reason == null ? undefined : String(row.cancellation_reason),
    rescheduledFromId: row.rescheduled_from_id == null ? undefined : String(row.rescheduled_from_id),
    totalPrice: Number(row.total_price),
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  };
}

function toNotification(row: DatabaseRow): NotificationLog {
  return {
    id: String(row.id),
    appointmentId: String(row.appointment_id),
    recipientEmail: row.recipient_email == null ? undefined : String(row.recipient_email),
    recipientPhone: row.recipient_phone == null ? undefined : String(row.recipient_phone),
    type: String(row.type) as NotificationLog['type'],
    channel: String(row.channel) as NotificationLog['channel'],
    subject: String(row.subject),
    body: String(row.body),
    status: String(row.status) as NotificationLog['status'],
    sentAt: toIsoDateTime(row.sent_at),
  };
}

function toAuditLog(row: DatabaseRow): AuditLog {
  return {
    id: String(row.id),
    entityType: String(row.entity_type) as AuditLog['entityType'],
    entityId: String(row.entity_id),
    action: String(row.action) as AuditLog['action'],
    performedBy: String(row.performed_by),
    details: String(row.details),
    timestamp: toIsoDateTime(row.created_at),
  };
}

function toSettings(row: DatabaseRow): ClinicSettings {
  return {
    clinicName: String(row.clinic_name),
    phone: String(row.phone),
    emergencyHotline: String(row.emergency_hotline),
    email: String(row.email),
    address: String(row.address),
    city: String(row.city),
    autoConfirmAppointments: Boolean(row.auto_confirm_appointments),
    defaultBufferMinutes: Number(row.default_buffer_minutes),
    cancellationCutoffHours: Number(row.cancellation_cutoff_hours),
    operatingHoursSummary: String(row.operating_hours_summary),
  };
}

app.get('/api/availability', async (req, res) => {
  try {
    const serviceId =
      typeof req.query.serviceId === 'string'
        ? req.query.serviceId.trim()
        : '';

    const date =
      typeof req.query.date === 'string'
        ? req.query.date.trim()
        : '';

    const requestedDentistId =
      typeof req.query.dentistId === 'string'
        ? req.query.dentistId.trim()
        : 'any';

    // Validate request parameters.
    if (!serviceId) {
      res.status(400).json({
        message: 'A serviceId is required.',
      });
      return;
    }

    if (!isValidDate(date)) {
      res.status(400).json({
        message: 'A valid date is required. Use YYYY-MM-DD.',
      });
      return;
    }

    // 1. Retrieve the selected active service.
    const serviceRows = await queryRows(
      `SELECT id, duration_minutes, buffer_minutes
       FROM services
       WHERE id = ? AND active = 1
       LIMIT 1`,
      [serviceId]
    );

    if (serviceRows.length === 0) {
      res.status(404).json({
        message: 'The selected service was not found or is inactive.',
      });
      return;
    }

    const service = serviceRows[0];
    const duration = Number(service.duration_minutes);

    if (!Number.isFinite(duration) || duration <= 0) {
      res.status(500).json({
        message: 'The selected service has an invalid appointment duration.',
      });
      return;
    }

    // 2. Get the clinic's default buffer.
    const settingsRows = await queryRows(
      `SELECT default_buffer_minutes
       FROM clinic_settings
       WHERE id = 1
       LIMIT 1`
    );

    const buffer =
      Number(service.buffer_minutes) ||
      Number(settingsRows[0]?.default_buffer_minutes) ||
      15;

    // 3. Find active dentists who offer this service.
    // A specific dentist can also be requested through dentistId.
    let dentistSql = `
      SELECT d.id, d.name
      FROM dentists d
      INNER JOIN dentist_services ds
        ON ds.dentist_id = d.id
      WHERE d.active = 1
        AND ds.service_id = ?
    `;

    const dentistParams: (string | number)[] = [serviceId];

    if (requestedDentistId && requestedDentistId !== 'any') {
      dentistSql += ' AND d.id = ?';
      dentistParams.push(requestedDentistId);
    }

    dentistSql += ' ORDER BY d.name';

    const dentists = await queryRows(dentistSql, dentistParams);

    if (dentists.length === 0) {
      res.json({
        serviceId,
        date,
        durationMinutes: duration,
        bufferMinutes: buffer,
        slots: [],
      });
      return;
    }

    const dentistIds = dentists.map((dentist) => String(dentist.id));
    const placeholders = dentistIds.map(() => '?').join(', ');
    const dayOfWeek = getDayOfWeek(date);

    // 4. Retrieve working hours for the selected date.
    const workingHours = await queryRows(
      `SELECT dentist_id, day_of_week, start_time, end_time,
              break_start_time, break_end_time, is_working_day
       FROM working_hours
       WHERE dentist_id IN (${placeholders})
         AND day_of_week = ?`,
      [...dentistIds, dayOfWeek]
    );

    // 5. Retrieve dentists who have time off on this date.
    const timeOff = await queryRows(
      `SELECT dentist_id
       FROM time_off
       WHERE dentist_id IN (${placeholders})
         AND start_date <= ?
         AND end_date >= ?`,
      [...dentistIds, date, date]
    );

    // 6. Retrieve existing appointments for the selected date.
    // Cancelled and rescheduled appointments do not block a slot,
    // matching the existing DentalStorage implementation.
    const appointments = await queryRows(
      `SELECT dentist_id, start_time, end_time
       FROM appointments
       WHERE dentist_id IN (${placeholders})
         AND appointment_date = ?
         AND status NOT IN ('cancelled', 'rescheduled')`,
      [...dentistIds, date]
    );

    // 7. Build available slots.
    const availableSlots: {
      time: string;
      dentistId: string;
      dentistName: string;
    }[] = [];

    for (const dentist of dentists) {
      const dentistId = String(dentist.id);
      const dentistName = String(dentist.name);

      // Skip dentists who are on time off.
      const hasTimeOff = timeOff.some(
        (item) => String(item.dentist_id) === dentistId
      );

      if (hasTimeOff) {
        continue;
      }

      // Find this dentist's working hours for the selected weekday.
      const schedule = workingHours.find(
        (item) => String(item.dentist_id) === dentistId
      );

      if (!schedule || Number(schedule.is_working_day) !== 1) {
        continue;
      }

      const workStart = timeToMinutes(String(schedule.start_time));
      const workEnd = timeToMinutes(String(schedule.end_time));

      const breakStart =
        schedule.break_start_time == null
          ? null
          : timeToMinutes(String(schedule.break_start_time));

      const breakEnd =
        schedule.break_end_time == null
          ? null
          : timeToMinutes(String(schedule.break_end_time));

      // Existing appointments for this dentist.
      const dentistAppointments = appointments.filter(
        (appointment) =>
          String(appointment.dentist_id) === dentistId
      );

      // Preserve the existing 30-minute slot interval.
      const stepMinutes = 30;

      for (
        let slotStart = workStart;
        slotStart + duration <= workEnd;
        slotStart += stepMinutes
      ) {
        const slotEnd = slotStart + duration;
        const slotTime = minutesToTime(slotStart);

        // Check whether the requested appointment overlaps
        // the dentist's scheduled break.
        if (
          breakStart !== null &&
          breakEnd !== null &&
          slotStart < breakEnd &&
          slotEnd > breakStart
        ) {
          continue;
        }

        // Check for overlapping existing appointments.
        let hasConflict = false;

        for (const appointment of dentistAppointments) {
          const existingStart = timeToMinutes(
            String(appointment.start_time).slice(0, 5)
          );

          const existingEnd =
            timeToMinutes(
              String(appointment.end_time).slice(0, 5)
            ) + buffer;

          const newEnd = slotEnd + buffer;

          if (
            slotStart < existingEnd &&
            newEnd > existingStart
          ) {
            hasConflict = true;
            break;
          }
        }

        if (hasConflict) {
          continue;
        }

        // Each available slot carries its assigned dentist.
        availableSlots.push({
          time: slotTime,
          dentistId,
          dentistName,
        });
      }
    }

    // Sort by time, then dentist name.
    availableSlots.sort((a, b) => {
      const timeDifference =
        timeToMinutes(a.time) - timeToMinutes(b.time);

      return timeDifference !== 0
        ? timeDifference
        : a.dentistName.localeCompare(b.dentistName);
    });

    res.json({
      serviceId,
      date,
      durationMinutes: duration,
      bufferMinutes: buffer,
      slots: availableSlots,
    });
  } catch (error) {
    console.error('Failed to retrieve appointment availability:', error);

    res.status(503).json({
      message: 'Unable to retrieve appointment availability. Check the database connection.',
    });
  }
});

type DatabaseConnection = Awaited<
  ReturnType<ReturnType<typeof getPool>['getConnection']>
>;

type AppointmentSlotValidation =
  | {
      valid: true;
      service: DatabaseRow;
      status: Appointment['status'];
      slotEnd: number;
    }
  | {
      valid: false;
      statusCode: 400 | 409;
      message: string;
    };

async function validateAppointmentSlot(
  connection: DatabaseConnection,
  serviceId: string,
  dentistId: string,
  date: string,
  startTime: string,
  slotStart: number
): Promise<AppointmentSlotValidation> {
  const [dentistRows] = await connection.query<DatabaseRow[]>(
    `SELECT id
     FROM dentists
     WHERE id = ? AND active = 1
     FOR UPDATE`,
    [dentistId]
  );

  if (dentistRows.length === 0) {
    return {
      valid: false,
      statusCode: 400,
      message: 'The selected dentist is unavailable.',
    };
  }

  const [serviceRows] = await connection.query<DatabaseRow[]>(
    `SELECT id, duration_minutes, buffer_minutes, price
     FROM services
     WHERE id = ? AND active = 1
     LIMIT 1`,
    [serviceId]
  );

  if (serviceRows.length === 0) {
    return {
      valid: false,
      statusCode: 400,
      message: 'The selected service is unavailable.',
    };
  }

  const service = serviceRows[0];
  const duration = Number(service.duration_minutes);
  const serviceBuffer = Number(service.buffer_minutes);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('The selected service has an invalid duration.');
  }

  const [assignmentRows] = await connection.query<DatabaseRow[]>(
    `SELECT dentist_id
     FROM dentist_services
     WHERE dentist_id = ? AND service_id = ?
     LIMIT 1`,
    [dentistId, serviceId]
  );

  if (assignmentRows.length === 0) {
    return {
      valid: false,
      statusCode: 400,
      message: 'The selected dentist does not offer this service.',
    };
  }

  const [settingsRows] = await connection.query<DatabaseRow[]>(
    `SELECT auto_confirm_appointments, default_buffer_minutes
     FROM clinic_settings
     WHERE id = 1
     LIMIT 1`
  );
  const settings = settingsRows[0];
  const buffer = serviceBuffer || Number(settings?.default_buffer_minutes) || 15;
  const status: Appointment['status'] = Number(settings?.auto_confirm_appointments)
    ? 'confirmed'
    : 'pending';

  const [scheduleRows] = await connection.query<DatabaseRow[]>(
    `SELECT start_time, end_time,
            break_start_time, break_end_time, is_working_day
     FROM working_hours
     WHERE dentist_id = ? AND day_of_week = ?
     LIMIT 1`,
    [dentistId, getDayOfWeek(date)]
  );
  const schedule = scheduleRows[0];

  if (!schedule || Number(schedule.is_working_day) !== 1) {
    return {
      valid: false,
      statusCode: 409,
      message: 'The selected dentist does not work on this date.',
    };
  }

  const workStart = timeToMinutes(String(schedule.start_time));
  const workEnd = timeToMinutes(String(schedule.end_time));
  const slotEnd = slotStart + duration;

  if (
    slotStart < workStart ||
    slotEnd > workEnd ||
    (slotStart - workStart) % 30 !== 0
  ) {
    return {
      valid: false,
      statusCode: 409,
      message: 'The selected time is outside the dentist’s available appointment slots.',
    };
  }

  if (
    schedule.break_start_time != null &&
    schedule.break_end_time != null
  ) {
    const breakStart = timeToMinutes(String(schedule.break_start_time));
    const breakEnd = timeToMinutes(String(schedule.break_end_time));

    if (slotStart < breakEnd && slotEnd > breakStart) {
      return {
        valid: false,
        statusCode: 409,
        message: 'The selected time overlaps the dentist’s break.',
      };
    }
  }

  const [timeOffRows] = await connection.query<DatabaseRow[]>(
    `SELECT id
     FROM time_off
     WHERE dentist_id = ?
       AND start_date <= ?
       AND end_date >= ?
     LIMIT 1`,
    [dentistId, date, date]
  );

  if (timeOffRows.length > 0) {
    return {
      valid: false,
      statusCode: 409,
      message: 'The selected dentist is unavailable on this date.',
    };
  }

  const [existingAppointments] = await connection.query<DatabaseRow[]>(
    `SELECT a.start_time, a.end_time,
            COALESCE(s.buffer_minutes, 0) AS existing_buffer
     FROM appointments a
     INNER JOIN services s ON s.id = a.service_id
     WHERE a.dentist_id = ?
       AND a.appointment_date = ?
       AND a.status NOT IN ('cancelled', 'rescheduled')`,
    [dentistId, date]
  );

  const hasConflict = existingAppointments.some((appointment) => {
    const existingStart = timeToMinutes(
      String(appointment.start_time).slice(0, 5)
    );
    const existingEnd =
      timeToMinutes(String(appointment.end_time).slice(0, 5)) +
      Number(appointment.existing_buffer);
    const newEnd = slotEnd + buffer;

    return slotStart < existingEnd && newEnd > existingStart;
  });

  if (hasConflict) {
    return {
      valid: false,
      statusCode: 409,
      message: 'This appointment slot has just been booked. Please select another time.',
    };
  }

  return { valid: true, service, status, slotEnd };
}

app.post('/api/appointments', async (req, res) => {
  let connection: Awaited<ReturnType<ReturnType<typeof getPool>['getConnection']>> | null = null;

  try {
    const body = req.body as Record<string, unknown>;
    const patientInfo = body.patientInfo as Record<string, unknown> | undefined;

    const serviceId = String(body.serviceId || '').trim();
    const dentistId = String(body.dentistId || '').trim();
    const date = String(body.date || '').trim();
    const startTime = String(body.startTime || '').trim();
    const patientNotes = String(body.patientNotes || '').trim();

    const firstName = String(patientInfo?.firstName || '').trim();
    const lastName = String(patientInfo?.lastName || '').trim();
    const email = String(patientInfo?.email || '').trim().toLowerCase();
    const phone = String(patientInfo?.phone || '').trim();
    const dateOfBirth = String(patientInfo?.dateOfBirth || '').trim();
    const emergencyContactName =
      String(patientInfo?.emergencyContactName || '').trim();
    const emergencyContactPhone =
      String(patientInfo?.emergencyContactPhone || '').trim();
    const insuranceProvider =
      String(patientInfo?.insuranceProvider || '').trim();

    const medicalAlerts = Array.isArray(patientInfo?.medicalAlerts)
      ? patientInfo.medicalAlerts
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    // 1. Validate the submitted information.
    if (
      !serviceId ||
      !dentistId ||
      !isValidDate(date) ||
      !/^\d{2}:\d{2}$/.test(startTime) ||
      !isValidDate(dateOfBirth) ||
      firstName.length < 2 ||
      lastName.length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      phone.length < 7
    ) {
      res.status(400).json({
        message: 'Please provide valid appointment and patient information.',
      });
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const requestedDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      res.status(400).json({
        message: 'Appointments cannot be booked for a past date.',
      });
      return;
    }

    const slotStart = timeToMinutes(startTime);

    if (slotStart < 0 || slotStart >= 1440) {
      res.status(400).json({
        message: 'The selected appointment time is invalid.',
      });
      return;
    }

    // 2. Start a database transaction.
    connection = await getPool().getConnection();
    await connection.beginTransaction();

    const slotValidation = await validateAppointmentSlot(
      connection,
      serviceId,
      dentistId,
      date,
      startTime,
      slotStart
    );

    if (!slotValidation.valid) {
      await connection.rollback();
      res.status(slotValidation.statusCode).json({
        message: slotValidation.message,
      });
      return;
    }

    const { service, status, slotEnd } = slotValidation;

    // 11. Create the patient record.
    const patientId = randomUUID();
    const appointmentId = randomUUID();
    const bookingReference =
      `ORL-${randomBytes(4).toString('hex').toUpperCase()}`;

    const now = new Date();

    await connection.query<ResultSetHeader>(
      `INSERT INTO patients (
        id, user_id, first_name, last_name, email, phone,
        date_of_birth, emergency_contact_name,
        emergency_contact_phone, medical_alerts,
        insurance_provider, preferred_dentist_id, created_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        emergencyContactName || null,
        emergencyContactPhone || null,
        JSON.stringify(medicalAlerts),
        insuranceProvider || null,
        dentistId,
        now,
      ]
    );

    // 12. Create the appointment record.
    const endTime = minutesToTime(slotEnd);

    await connection.query<ResultSetHeader>(
      `INSERT INTO appointments (
        id, booking_reference, patient_id, dentist_id,
        service_id, appointment_date, start_time, end_time,
        status, notes, patient_notes, admin_notes,
        is_walk_in, cancellation_reason, rescheduled_from_id,
        total_price, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, FALSE, NULL, NULL, ?, ?, ?)`,
      [
        appointmentId,
        bookingReference,
        patientId,
        dentistId,
        serviceId,
        date,
        startTime,
        endTime,
        status,
        patientNotes || null,
        Number(service.price),
        now,
        now,
      ]
    );

    // 13. Record the booking in the audit log.
    await connection.query<ResultSetHeader>(
      `INSERT INTO audit_logs (
        id, entity_type, entity_id, action,
        performed_by, details, created_at
      ) VALUES (?, 'appointment', ?, 'create', ?, ?, ?)`,
      [
        randomUUID(),
        appointmentId,
        `${firstName} ${lastName} (patient)`,
        JSON.stringify({
          bookingReference,
          serviceId,
          dentistId,
          date,
          startTime,
          endTime,
          status,
        }),
        now,
      ]
    );

    // 14. Commit all database changes together.
    await connection.commit();

    const appointment: Appointment = {
      id: appointmentId,
      bookingReference,
      patientId,
      dentistId,
      serviceId,
      date,
      startTime,
      endTime,
      status: status as Appointment['status'],
      patientNotes: patientNotes || undefined,
      isWalkIn: false,
      totalPrice: Number(service.price),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    res.status(201).json({
      message: 'Appointment successfully booked.',
      appointment,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Failed to create appointment:', error);

    res.status(500).json({
      message: 'Unable to complete the appointment booking. Please try again.',
    });
  } finally {
    connection?.release();
  }
});

app.post('/api/admin/walk-in-appointments', async (req, res) => {
  let connection: DatabaseConnection | null = null;

  try {
    const body = req.body as Record<string, unknown>;
    const serviceId = String(body.serviceId || '').trim();
    const dentistId = String(body.dentistId || '').trim();
    const date = String(body.date || '').trim();
    const startTime = String(body.startTime || '').trim();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const phone = String(body.phone || '').trim();

    if (
      !serviceId ||
      !dentistId ||
      !isValidDate(date) ||
      !/^\d{2}:\d{2}$/.test(startTime) ||
      firstName.length < 2 ||
      lastName.length < 2 ||
      phone.length < 7
    ) {
      res.status(400).json({
        message: 'Please provide valid appointment details, patient name, and phone number.',
      });
      return;
    }

    const requestedDate = new Date(`${date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      res.status(400).json({
        message: 'Appointments cannot be booked for a past date.',
      });
      return;
    }

    const slotStart = timeToMinutes(startTime);

    if (
      slotStart < 0 ||
      slotStart >= 1440 ||
      Number(startTime.slice(3, 5)) > 59
    ) {
      res.status(400).json({
        message: 'The selected appointment time is invalid.',
      });
      return;
    }

    connection = await getPool().getConnection();
    await connection.beginTransaction();

    const slotValidation = await validateAppointmentSlot(
      connection,
      serviceId,
      dentistId,
      date,
      startTime,
      slotStart
    );

    if (!slotValidation.valid) {
      await connection.rollback();
      res.status(slotValidation.statusCode).json({
        message: slotValidation.message,
      });
      return;
    }

    const { service, status, slotEnd } = slotValidation;
    const patientId = randomUUID();
    const appointmentId = randomUUID();
    const bookingReference =
      `ORL-${randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date();
    const patientEmail = `walkin.${randomUUID()}@clinic-guest.com`;
    const endTime = minutesToTime(slotEnd);
    const patientNotes = 'Walk-in / Phone reception booking';

    await connection.query<ResultSetHeader>(
      `INSERT INTO patients (
        id, user_id, first_name, last_name, email, phone,
        date_of_birth, insurance_provider, preferred_dentist_id, created_at
      ) VALUES (?, NULL, ?, ?, ?, ?, '1990-01-01', ?, ?, ?)`,
      [
        patientId,
        firstName,
        lastName,
        patientEmail,
        phone,
        'Self-Pay / In-Clinic',
        dentistId,
        now,
      ]
    );

    await connection.query<ResultSetHeader>(
      `INSERT INTO appointments (
        id, booking_reference, patient_id, dentist_id,
        service_id, appointment_date, start_time, end_time,
        status, patient_notes, is_walk_in, total_price,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?)`,
      [
        appointmentId,
        bookingReference,
        patientId,
        dentistId,
        serviceId,
        date,
        startTime,
        endTime,
        status,
        patientNotes,
        Number(service.price),
        now,
        now,
      ]
    );

    await connection.query<ResultSetHeader>(
      `INSERT INTO audit_logs (
        id, entity_type, entity_id, action,
        performed_by, details, created_at
      ) VALUES (?, 'appointment', ?, 'create', ?, ?, ?)`,
      [
        randomUUID(),
        appointmentId,
        'Clinic Reception Desk',
        JSON.stringify({
          bookingReference,
          patientId,
          serviceId,
          dentistId,
          date,
          startTime,
          endTime,
          status,
          isWalkIn: true,
        }),
        now,
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Walk-in appointment successfully booked.',
      appointment: {
        id: appointmentId,
        bookingReference,
        patientId,
        dentistId,
        serviceId,
        date,
        startTime,
        endTime,
        status,
        patientNotes,
        isWalkIn: true,
        totalPrice: Number(service.price),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      } satisfies Appointment,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Failed to create walk-in appointment:', error);
    res.status(500).json({
      message: 'Unable to create the walk-in appointment. Please try again.',
    });
  } finally {
    connection?.release();
  }
});


app.patch('/api/appointments/:id/status', async (req, res) => {
  let connection: Awaited<
    ReturnType<ReturnType<typeof getPool>['getConnection']>
  > | null = null;

  try {
    const appointmentId = String(req.params.id || '').trim();
    const body = req.body as Record<string, unknown>;

    const nextStatus = String(body.status || '').trim();
    const performedBy =
      String(body.performedBy || 'Clinic Administrator (Reception)').trim();
    const notes = String(body.notes || '').trim();

    const allowedStatuses: Appointment['status'][] = [
      'pending',
      'confirmed',
      'arrived',
      'in_treatment',
      'completed',
      'rescheduled',
      'cancelled',
      'no_show',
    ];

    if (!appointmentId || !allowedStatuses.includes(nextStatus as Appointment['status'])) {
      res.status(400).json({
        message: 'A valid appointment ID and status are required.',
      });
      return;
    }

    connection = await getPool().getConnection();
    await connection.beginTransaction();

    // Confirm that the appointment exists.
    const [appointmentRows] = await connection.query<DatabaseRow[]>(
      `SELECT id, admin_notes
       FROM appointments
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [appointmentId]
    );

    if (appointmentRows.length === 0) {
      await connection.rollback();

      res.status(404).json({
        message: 'Appointment not found.',
      });
      return;
    }

    const existingAdminNotes =
      appointmentRows[0].admin_notes == null
        ? ''
        : String(appointmentRows[0].admin_notes);

    const updatedAdminNotes = notes
      ? [existingAdminNotes, notes].filter(Boolean).join('\n')
      : existingAdminNotes || null;

    const now = new Date();

    // Update appointment status and administrator notes.
    await connection.query<ResultSetHeader>(
      `UPDATE appointments
       SET status = ?,
           admin_notes = ?,
           updated_at = ?
       WHERE id = ?`,
      [nextStatus, updatedAdminNotes, now, appointmentId]
    );

    // Record the status change in the audit log.
    await connection.query<ResultSetHeader>(
      `INSERT INTO audit_logs (
        id,
        entity_type,
        entity_id,
        action,
        performed_by,
        details,
        created_at
      ) VALUES (?, 'appointment', ?, 'update_status', ?, ?, ?)`,
      [
        randomUUID(),
        appointmentId,
        performedBy,
        JSON.stringify({
          newStatus: nextStatus,
          notes: notes || null,
        }),
        now,
      ]
    );

    // Retrieve the updated appointment.
    const [updatedRows] = await connection.query<DatabaseRow[]>(
      `SELECT *
       FROM appointments
       WHERE id = ?
       LIMIT 1`,
      [appointmentId]
    );

    await connection.commit();

    res.json({
      message: 'Appointment status successfully updated.',
      appointment: toAppointment(updatedRows[0]),
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Failed to update appointment status:', error);

    res.status(500).json({
      message: 'Unable to update appointment status. Please try again.',
    });
  } finally {
    connection?.release();
  }
});


app.get('/api/health', async (_req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'The MySQL database is unavailable. Check the local database service and .env settings.',
    });
  }
});

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
}

function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function getDayOfWeek(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

app.get('/api/clinic-data', async (_req, res) => {
  try {
    const db = getPool();
    const [
      services,
      dentists,
      workingHours,
      timeOff,
      patients,
      appointments,
      notifications,
      auditLogs,
      settings,
    ] = await Promise.all([
      queryRows('SELECT * FROM services ORDER BY name'),
      queryRows(`
        SELECT d.*,
          (SELECT COALESCE(JSON_ARRAYAGG(ds.service_id), JSON_ARRAY())
           FROM dentist_services ds
           WHERE ds.dentist_id = d.id) AS assigned_service_ids
        FROM dentists d
        ORDER BY d.name
      `),
      queryRows('SELECT * FROM working_hours ORDER BY dentist_id, day_of_week'),
      queryRows('SELECT * FROM time_off ORDER BY start_date'),
      queryRows('SELECT * FROM patients ORDER BY last_name, first_name'),
      queryRows('SELECT * FROM appointments ORDER BY appointment_date, start_time'),
      queryRows('SELECT * FROM notifications ORDER BY sent_at DESC'),
      queryRows('SELECT * FROM audit_logs ORDER BY created_at DESC'),
      queryRows('SELECT * FROM clinic_settings WHERE id = 1'),
    ]);

    res.json({
      services: services.map(toService),
      dentists: dentists.map(toDentist),
      workingHours: workingHours.map(toWorkingHours),
      timeOff: timeOff.map(toTimeOff),
      patients: patients.map(toPatient),
      appointments: appointments.map(toAppointment),
      notifications: notifications.map(toNotification),
      auditLogs: auditLogs.map(toAuditLog),
      settings: settings[0] ? toSettings(settings[0]) : null,
    });
  } catch (error) {
    console.error('Failed to load clinic data:', error);
    res.status(503).json({
      message: 'Unable to load clinic data. Confirm the schema is migrated and the MySQL service is running.',
    });
  }
});

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('API_PORT must be a valid TCP port.');
}

app.listen(port, '127.0.0.1', () => {
  console.log(`Local clinic API listening on http://127.0.0.1:${port}`);
});
