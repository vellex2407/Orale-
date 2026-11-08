import 'dotenv/config';
import express from 'express';
import argon2 from 'argon2';
import MySQLStoreFactory from 'express-mysql-session';
import { rateLimit } from 'express-rate-limit';
import session from 'express-session';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { randomUUID, randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
import type { RequestHandler } from 'express';

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret =
  process.env.SESSION_SECRET ||
  (!isProduction ? randomBytes(48).toString('base64url') : '');
if (Buffer.byteLength(sessionSecret) < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 bytes.');
}

const configuredAppOrigin =
  process.env.APP_ORIGIN || (!isProduction ? 'http://127.0.0.1:3000' : '');
let appOrigin: string;
try {
  const parsedOrigin = new URL(configuredAppOrigin);
  if (
    parsedOrigin.origin !== configuredAppOrigin ||
    (isProduction && parsedOrigin.protocol !== 'https:')
  ) {
    throw new Error('APP_ORIGIN must be an origin without a path.');
  }
  appOrigin = parsedOrigin.origin;
} catch {
  throw new Error('Configure APP_ORIGIN as the exact frontend origin.');
}

if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(express.json({ limit: '1mb' }));

const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore(
  {
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
    expiration: 8 * 60 * 60 * 1000,
    createDatabaseTable: false,
    schema: {
      tableName: 'user_sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data',
      },
    },
  },
  getPool()
);

app.use(
  session({
    name: isProduction ? '__Host-orale.sid' : 'orale.sid',
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);

const port = Number(
  isProduction
    ? process.env.PORT || '3001'
    : process.env.API_PORT || '3001'
);
const host = isProduction ? '0.0.0.0' : '127.0.0.1';

type DatabaseRow = RowDataPacket & Record<string, unknown>;
type AccountRole = 'patient' | 'dentist' | 'admin';

interface AuthenticatedAccount {
  id: string;
  email: string;
  role: AccountRole;
  status: 'active' | 'disabled';
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      authenticatedAccount?: AuthenticatedAccount;
    }
  }
}

async function queryRows(
  sql: string,
  values: (string | number)[] = []
): Promise<DatabaseRow[]> {
  const [rows] = await getPool().query<DatabaseRow[]>(sql, values);
  return rows;
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return typeof error.code === 'string' ? error.code : undefined;
}

function isRequestBody(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function findAccountById(id: string): Promise<AuthenticatedAccount | null> {
  const rows = await queryRows(
    'SELECT id, email, role, status FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  const row = rows[0];
  if (!row) return null;

  return {
    id: String(row.id),
    email: String(row.email),
    role: String(row.role) as AccountRole,
    status: String(row.status) as AuthenticatedAccount['status'],
  };
}

const requireAuthenticatedAccount: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    res.status(401).json({ message: 'Authentication is required.' });
    return;
  }

  try {
    const account = await findAccountById(req.session.userId);
    if (!account || account.status !== 'active') {
      res.status(401).json({ message: 'Authentication is required.' });
      return;
    }

    req.authenticatedAccount = account;
    next();
  } catch (error) {
    console.error('Failed to verify authenticated account:', error);
    res.status(503).json({ message: 'Unable to verify the account right now.' });
  }
};

const optionalAuthenticatedAccount: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    next();
    return;
  }

  try {
    const account = await findAccountById(req.session.userId);
    if (!account || account.status !== 'active') {
      res.status(401).json({ message: 'Authentication is required.' });
      return;
    }

    req.authenticatedAccount = account;
    next();
  } catch (error) {
    console.error('Failed to verify booking account:', error);
    res.status(503).json({ message: 'Unable to verify the account right now.' });
  }
};

function requireRole(...roles: AccountRole[]): RequestHandler {
  return (req, res, next) => {
    const account = req.authenticatedAccount;
    if (!account) {
      res.status(401).json({ message: 'Authentication is required.' });
      return;
    }
    if (!roles.includes(account.role)) {
      res.status(403).json({ message: 'You are not authorized to perform this action.' });
      return;
    }
    next();
  };
}

const verifyRequestOrigin: RequestHandler = (req, res, next) => {
  if (req.get('origin') !== appOrigin) {
    res.status(403).json({ message: 'Request origin is not allowed.' });
    return;
  }
  next();
};

const adminMutationGuards: RequestHandler[] = [
  verifyRequestOrigin,
  requireAuthenticatedAccount,
  requireRole('admin'),
];

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many registration attempts. Please try again later.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' },
});

app.post(
  '/api/auth/register',
  verifyRequestOrigin,
  registrationLimiter,
  async (req, res) => {
    if (!isRequestBody(req.body)) {
      res.status(400).json({ message: 'Registration information is required.' });
      return;
    }

    const body = req.body;
    const firstName = readText(body.firstName);
    const lastName = readText(body.lastName);
    const email = readText(body.email).toLowerCase();
    const phone = readText(body.phone);
    const dateOfBirth = readText(body.dateOfBirth);
    const password = typeof body.password === 'string' ? body.password : '';
    const emergencyContactName = readText(body.emergencyContactName);
    const emergencyContactPhone = readText(body.emergencyContactPhone);
    const insuranceProvider = readText(body.insuranceProvider);
    const medicalAlerts = Array.isArray(body.medicalAlerts)
      ? body.medicalAlerts
          .filter((alert): alert is string => typeof alert === 'string')
          .map((alert) => alert.trim())
          .filter((alert) => alert.length > 0 && alert.length <= 255)
          .slice(0, 32)
      : [];

    if (
      firstName.length < 2 ||
      firstName.length > 120 ||
      lastName.length < 2 ||
      lastName.length > 120 ||
      email.length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      phone.length < 7 ||
      phone.length > 40 ||
      !isValidDate(dateOfBirth) ||
      dateOfBirth > new Date().toISOString().slice(0, 10) ||
      password.length < 12 ||
      Buffer.byteLength(password, 'utf8') > 1024 ||
      emergencyContactName.length > 255 ||
      emergencyContactPhone.length > 40 ||
      insuranceProvider.length > 255
    ) {
      res.status(400).json({
        message: 'Please provide valid registration and patient information.',
      });
      return;
    }

    let passwordHash: string;
    try {
      passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });
    } catch (error) {
      console.error('Failed to hash a patient password:', error);
      res.status(500).json({ message: 'Unable to register right now.' });
      return;
    }

    const userId = randomUUID();
    const patientId = randomUUID();
    const now = new Date();
    let connection: Awaited<ReturnType<ReturnType<typeof getPool>['getConnection']>> | null =
      null;
    try {
      connection = await getPool().getConnection();
    } catch (error) {
      console.error('Failed to connect for patient registration:', error);
    }
    if (!connection) {
      res.status(503).json({ message: 'Unable to register right now.' });
      return;
    }

    try {
      await connection.beginTransaction();
      await connection.query<ResultSetHeader>(
        `INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at)
         VALUES (?, ?, ?, 'patient', 'active', ?, ?)`,
        [userId, email, passwordHash, now, now]
      );
      await connection.query<ResultSetHeader>(
        `INSERT INTO patients (
           id, user_id, first_name, last_name, email, phone, date_of_birth,
           emergency_contact_name, emergency_contact_phone, medical_alerts,
           insurance_provider, preferred_dentist_id, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
        [
          patientId,
          userId,
          firstName,
          lastName,
          email,
          phone,
          dateOfBirth,
          emergencyContactName || null,
          emergencyContactPhone || null,
          JSON.stringify(medicalAlerts),
          insuranceProvider || null,
          now,
        ]
      );
      await connection.commit();
      res.status(201).json({
        user: { id: userId, email, role: 'patient' },
        patient: {
          id: patientId,
          firstName,
          lastName,
          email,
          phone,
          dateOfBirth,
          emergencyContactName: emergencyContactName || undefined,
          emergencyContactPhone: emergencyContactPhone || undefined,
          medicalAlerts,
          insuranceProvider: insuranceProvider || undefined,
        },
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Failed to roll back patient registration:', rollbackError);
      }

      if (getErrorCode(error) === 'ER_DUP_ENTRY') {
        res.status(409).json({ message: 'An account with this email already exists.' });
      } else {
        console.error('Failed to register patient account:', error);
        res.status(500).json({ message: 'Unable to register right now.' });
      }
    } finally {
      connection.release();
    }
  }
);

app.post('/api/auth/login', verifyRequestOrigin, loginLimiter, async (req, res) => {
  if (!isRequestBody(req.body)) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  const email = readText(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  try {
    const rows = await queryRows(
      'SELECT id, email, password_hash, role, status FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    const account = rows[0];
    if (
      !account ||
      String(account.status) !== 'active' ||
      !(await argon2.verify(String(account.password_hash), password))
    ) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    req.session.userId = String(account.id);
    await new Promise<void>((resolve, reject) => {
      req.session.save((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    res.json({
      user: {
        id: String(account.id),
        email: String(account.email),
        role: String(account.role) as AccountRole,
      },
    });
  } catch (error) {
    console.error('Patient account login failed:', error);
    res.status(503).json({ message: 'Unable to log in right now.' });
  }
});

app.post('/api/auth/logout', verifyRequestOrigin, (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error('Failed to destroy patient account session:', error);
      res.status(500).json({ message: 'Unable to log out right now.' });
      return;
    }

    res.clearCookie(isProduction ? '__Host-orale.sid' : 'orale.sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
    });
    res.json({ message: 'Logged out successfully.' });
  });
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ message: 'Authentication is required.' });
    return;
  }

  try {
    const account = await findAccountById(req.session.userId);
    if (!account || account.status !== 'active') {
      res.status(401).json({ message: 'Authentication is required.' });
      return;
    }

    if (account.role !== 'patient') {
      res.json({
        user: { id: account.id, email: account.email, role: account.role },
      });
      return;
    }

    const patients = await queryRows(
      `SELECT id, first_name, last_name, email, phone, date_of_birth,
              emergency_contact_name, emergency_contact_phone, medical_alerts,
              insurance_provider, preferred_dentist_id, created_at
       FROM patients
       WHERE user_id = ?
       LIMIT 1`,
      [account.id]
    );
    if (!patients[0]) {
      res.status(404).json({ message: 'The patient profile was not found.' });
      return;
    }

    const patient = patients[0];
    res.json({
      user: { id: account.id, email: account.email, role: account.role },
      patient: {
        id: String(patient.id),
        firstName: String(patient.first_name),
        lastName: String(patient.last_name),
        email: String(patient.email),
        phone: String(patient.phone),
        dateOfBirth: String(patient.date_of_birth),
        emergencyContactName:
          patient.emergency_contact_name == null
            ? undefined
            : String(patient.emergency_contact_name),
        emergencyContactPhone:
          patient.emergency_contact_phone == null
            ? undefined
            : String(patient.emergency_contact_phone),
        medicalAlerts: readStringArray(patient.medical_alerts ?? []),
        insuranceProvider:
          patient.insurance_provider == null
            ? undefined
            : String(patient.insurance_provider),
        preferredDentistId:
          patient.preferred_dentist_id == null
            ? undefined
            : String(patient.preferred_dentist_id),
        createdAt: toIsoDateTime(patient.created_at),
      },
    });
  } catch (error) {
    console.error('Failed to retrieve current account:', error);
    res.status(503).json({ message: 'Unable to retrieve account information right now.' });
  }
});

app.get(
  '/api/patient/profile',
  requireAuthenticatedAccount,
  requireRole('patient'),
  async (req, res) => {
    try {
      const patientRows = await queryRows(
        `SELECT id, first_name, last_name, email, phone, date_of_birth,
                emergency_contact_name, emergency_contact_phone, medical_alerts,
                insurance_provider, preferred_dentist_id, created_at
         FROM patients
         WHERE user_id = ?
         LIMIT 1`,
        [req.authenticatedAccount!.id]
      );
      if (!patientRows[0]) {
        res.status(404).json({ message: 'The patient profile was not found.' });
        return;
      }

      res.json({ patient: toPatient(patientRows[0]) });
    } catch (error) {
      console.error('Failed to load patient profile:', error);
      res.status(503).json({ message: 'Unable to load the patient profile right now.' });
    }
  }
);

app.patch(
  '/api/patient/profile',
  verifyRequestOrigin,
  requireAuthenticatedAccount,
  requireRole('patient'),
  async (req, res) => {
    if (!isRequestBody(req.body)) {
      res.status(400).json({ message: 'Valid patient profile information is required.' });
      return;
    }

    const email = readText(req.body.email).toLowerCase();
    const phone = readText(req.body.phone);
    const emergencyContactName = readText(req.body.emergencyContactName);
    const emergencyContactPhone = readText(req.body.emergencyContactPhone);
    const preferredDentistId = readText(req.body.preferredDentistId);
    if (
      email.length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      phone.length < 7 ||
      phone.length > 40 ||
      emergencyContactName.length > 255 ||
      emergencyContactPhone.length > 40 ||
      preferredDentistId.length > 64
    ) {
      res.status(400).json({ message: 'Please provide valid patient profile information.' });
      return;
    }

    let connection: Awaited<ReturnType<ReturnType<typeof getPool>['getConnection']>> | null =
      null;
    try {
      connection = await getPool().getConnection();
      await connection.beginTransaction();
      const [patientRows] = await connection.query<DatabaseRow[]>(
        `SELECT id
         FROM patients
         WHERE user_id = ?
         LIMIT 1
         FOR UPDATE`,
        [req.authenticatedAccount!.id]
      );
      if (!patientRows[0]) {
        await connection.rollback();
        res.status(404).json({ message: 'The patient profile was not found.' });
        return;
      }

      if (preferredDentistId) {
        const [dentistRows] = await connection.query<DatabaseRow[]>(
          'SELECT id FROM dentists WHERE id = ? AND active = 1 LIMIT 1',
          [preferredDentistId]
        );
        if (!dentistRows[0]) {
          await connection.rollback();
          res.status(400).json({ message: 'The selected preferred dentist is unavailable.' });
          return;
        }
      }

      await connection.query<ResultSetHeader>(
        'UPDATE users SET email = ?, updated_at = ? WHERE id = ?',
        [email, new Date(), req.authenticatedAccount!.id]
      );
      await connection.query<ResultSetHeader>(
        `UPDATE patients
         SET email = ?, phone = ?, emergency_contact_name = ?,
             emergency_contact_phone = ?, preferred_dentist_id = ?
         WHERE user_id = ?`,
        [
          email,
          phone,
          emergencyContactName || null,
          emergencyContactPhone || null,
          preferredDentistId || null,
          req.authenticatedAccount!.id,
        ]
      );

      const [updatedRows] = await connection.query<DatabaseRow[]>(
        `SELECT id, user_id, first_name, last_name, email, phone, date_of_birth,
                emergency_contact_name, emergency_contact_phone, medical_alerts,
                insurance_provider, preferred_dentist_id, created_at
         FROM patients WHERE user_id = ? LIMIT 1`,
        [req.authenticatedAccount!.id]
      );
      await connection.commit();
      res.json({ patient: toPatient(updatedRows[0]) });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('Failed to roll back patient profile update:', rollbackError);
        }
      }
      if (getErrorCode(error) === 'ER_DUP_ENTRY') {
        res.status(409).json({ message: 'An account with this email already exists.' });
      } else {
        console.error('Failed to update patient profile:', error);
        res.status(500).json({ message: 'Unable to update the patient profile right now.' });
      }
    } finally {
      connection?.release();
    }
  }
);

app.get(
  '/api/patient/appointments',
  requireAuthenticatedAccount,
  requireRole('patient'),
  async (req, res) => {
    try {
      const appointments = await queryRows(
        `SELECT a.id, a.booking_reference, a.patient_id, a.dentist_id,
                a.service_id, a.appointment_date, a.start_time, a.end_time,
                a.status, NULL AS notes, a.patient_notes,
                NULL AS admin_notes, a.is_walk_in, a.cancellation_reason,
                a.rescheduled_from_id, a.total_price, a.created_at, a.updated_at
         FROM appointments a
         INNER JOIN patients p ON p.id = a.patient_id
         WHERE p.user_id = ?
         ORDER BY a.appointment_date, a.start_time`,
        [req.authenticatedAccount!.id]
      );
      res.json({ appointments: appointments.map(toAppointment) });
    } catch (error) {
      console.error('Failed to load patient appointments:', error);
      res.status(503).json({ message: 'Unable to load appointments right now.' });
    }
  }
);

app.post(
  '/api/patient/appointments/:id/reschedule',
  verifyRequestOrigin,
  requireAuthenticatedAccount,
  requireRole('patient'),
  async (req, res) => {
    const appointmentId = readText(req.params.id);
    const body = isRequestBody(req.body) ? req.body : {};
    const date = readText(body.date);
    const startTime = readText(body.startTime);
    const dentistId = readText(body.dentistId);
    const reason = readText(body.reason);
    const slotStart = /^\d{2}:\d{2}$/.test(startTime)
      ? timeToMinutes(startTime)
      : -1;

    if (
      !appointmentId ||
      !isValidDate(date) ||
      slotStart < 0 ||
      slotStart >= 1440 ||
      !dentistId ||
      dentistId.length > 64 ||
      reason.length > 500
    ) {
      res.status(400).json({ message: 'Please provide a valid date, time, and dentist.' });
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const requestedDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate < today) {
      res.status(400).json({ message: 'Appointments cannot be rescheduled to a past date.' });
      return;
    }

    let connection: Awaited<ReturnType<ReturnType<typeof getPool>['getConnection']>> | null =
      null;
    try {
      connection = await getPool().getConnection();
      await connection.beginTransaction();

      const [appointmentRows] = await connection.query<DatabaseRow[]>(
        `SELECT a.id, a.service_id, a.dentist_id, a.appointment_date,
                a.start_time, a.end_time, a.status,
                p.first_name, p.last_name
         FROM appointments a
         INNER JOIN patients p ON p.id = a.patient_id
         WHERE a.id = ? AND p.user_id = ?
         LIMIT 1
         FOR UPDATE`,
        [appointmentId, req.authenticatedAccount!.id]
      );
      const appointment = appointmentRows[0];
      if (!appointment) {
        await connection.rollback();
        res.status(404).json({ message: 'Appointment not found.' });
        return;
      }

      if (!['pending', 'confirmed'].includes(String(appointment.status))) {
        await connection.rollback();
        res.status(409).json({
          message: 'This appointment is no longer eligible for rescheduling.',
        });
        return;
      }

      const validation = await validateAppointmentSlot(
        connection,
        String(appointment.service_id),
        dentistId,
        date,
        startTime,
        slotStart,
        appointmentId
      );
      if (!validation.valid) {
        await connection.rollback();
        res.status(validation.statusCode).json({ message: validation.message });
        return;
      }

      const now = new Date();
      const endTime = minutesToTime(validation.slotEnd);
      const performedBy = `${String(appointment.first_name)} ${String(appointment.last_name)} (patient)`;
      await connection.query<ResultSetHeader>(
        `UPDATE appointments
         SET appointment_date = ?, start_time = ?, end_time = ?,
             dentist_id = ?, status = 'confirmed', updated_at = ?
         WHERE id = ?`,
        [date, startTime, endTime, dentistId, now, appointmentId]
      );
      await connection.query<ResultSetHeader>(
        `INSERT INTO audit_logs (
          id, entity_type, entity_id, action, performed_by, details, created_at
        ) VALUES (?, 'appointment', ?, 'reschedule', ?, ?, ?)`,
        [
          randomUUID(),
          appointmentId,
          performedBy,
          JSON.stringify({
            from: {
              date: String(appointment.appointment_date).slice(0, 10),
              startTime: String(appointment.start_time).slice(0, 5),
              dentistId: String(appointment.dentist_id),
            },
            to: { date, startTime, endTime, dentistId },
            reason: reason || null,
          }),
          now,
        ]
      );

      await connection.commit();
      res.json({
        message: 'Appointment successfully rescheduled.',
        appointment: {
          id: appointmentId,
          date,
          startTime,
          endTime,
          dentistId,
          status: 'confirmed',
        },
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('Failed to roll back patient appointment reschedule:', rollbackError);
        }
      }
      console.error('Failed to reschedule patient appointment:', error);
      res.status(500).json({ message: 'Unable to reschedule this appointment right now.' });
    } finally {
      connection?.release();
    }
  }
);

app.post(
  '/api/patient/appointments/:id/cancel',
  verifyRequestOrigin,
  requireAuthenticatedAccount,
  requireRole('patient'),
  async (req, res) => {
    const appointmentId = readText(req.params.id);
    const body = isRequestBody(req.body) ? req.body : {};
    const reason = readText(body.reason);
    if (!appointmentId || !reason || reason.length > 500) {
      res.status(400).json({ message: 'A valid cancellation reason is required.' });
      return;
    }

    let connection: Awaited<ReturnType<ReturnType<typeof getPool>['getConnection']>> | null =
      null;
    try {
      connection = await getPool().getConnection();
      await connection.beginTransaction();

      const [appointmentRows] = await connection.query<DatabaseRow[]>(
        `SELECT a.id, a.status, p.first_name, p.last_name
         FROM appointments a
         INNER JOIN patients p ON p.id = a.patient_id
         WHERE a.id = ? AND p.user_id = ?
         LIMIT 1
         FOR UPDATE`,
        [appointmentId, req.authenticatedAccount!.id]
      );
      const appointment = appointmentRows[0];
      if (!appointment) {
        await connection.rollback();
        res.status(404).json({ message: 'Appointment not found.' });
        return;
      }

      if (!['pending', 'confirmed'].includes(String(appointment.status))) {
        await connection.rollback();
        res.status(409).json({
          message: 'This appointment is no longer eligible for cancellation.',
        });
        return;
      }

      const now = new Date();
      const performedBy = `${String(appointment.first_name)} ${String(appointment.last_name)} (patient)`;
      await connection.query<ResultSetHeader>(
        `UPDATE appointments
         SET status = 'cancelled', cancellation_reason = ?, updated_at = ?
         WHERE id = ?`,
        [reason, now, appointmentId]
      );
      await connection.query<ResultSetHeader>(
        `INSERT INTO audit_logs (
          id, entity_type, entity_id, action, performed_by, details, created_at
        ) VALUES (?, 'appointment', ?, 'cancel', ?, ?, ?)`,
        [
          randomUUID(),
          appointmentId,
          performedBy,
          JSON.stringify({ reason }),
          now,
        ]
      );

      await connection.commit();
      res.json({
        message: 'Appointment successfully cancelled.',
        appointment: { id: appointmentId, status: 'cancelled', cancellationReason: reason },
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('Failed to roll back patient appointment cancellation:', rollbackError);
        }
      }
      console.error('Failed to cancel patient appointment:', error);
      res.status(500).json({ message: 'Unable to cancel this appointment right now.' });
    } finally {
      connection?.release();
    }
  }
);

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

app.get('/api/availability', optionalAuthenticatedAccount, async (req, res) => {
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
    const excludeAppointmentId =
      typeof req.query.excludeAppointmentId === 'string'
        ? req.query.excludeAppointmentId.trim()
        : '';

    if (req.query.excludeAppointmentId !== undefined) {
      if (!excludeAppointmentId) {
        res.status(400).json({ message: 'A valid appointment ID is required.' });
        return;
      }
      if (req.authenticatedAccount?.role !== 'patient') {
        res.status(401).json({ message: 'Authentication is required.' });
        return;
      }

      const ownedAppointments = await queryRows(
        `SELECT a.id
         FROM appointments a
         INNER JOIN patients p ON p.id = a.patient_id
         WHERE a.id = ? AND p.user_id = ?
         LIMIT 1`,
        [excludeAppointmentId, req.authenticatedAccount.id]
      );
      if (!ownedAppointments[0]) {
        res.status(404).json({ message: 'Appointment not found.' });
        return;
      }
    }

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
      `SELECT a.dentist_id, a.start_time, a.end_time,
              COALESCE(s.buffer_minutes, 0) AS existing_buffer
       FROM appointments a
       INNER JOIN services s ON a.service_id = s.id
       WHERE a.dentist_id IN (${placeholders})
         AND a.appointment_date = ?
         AND a.status NOT IN ('cancelled', 'rescheduled')
         ${excludeAppointmentId ? 'AND a.id <> ?' : ''}`,
      excludeAppointmentId
        ? [...dentistIds, date, excludeAppointmentId]
        : [...dentistIds, date]
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
            ) + Number(appointment.existing_buffer);

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
  slotStart: number,
  excludeAppointmentId?: string
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
       AND a.status NOT IN ('cancelled', 'rescheduled')
       ${excludeAppointmentId ? 'AND a.id <> ?' : ''}`,
    excludeAppointmentId
      ? [dentistId, date, excludeAppointmentId]
      : [dentistId, date]
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

app.post(
  '/api/appointments',
  verifyRequestOrigin,
  optionalAuthenticatedAccount,
  async (req, res) => {
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

    // 11. Reuse an authenticated patient's profile, or create a guest patient.
    let patientId: string;
    const appointmentId = randomUUID();
    const bookingReference =
      `ORL-${randomBytes(4).toString('hex').toUpperCase()}`;

    const now = new Date();

    if (req.authenticatedAccount?.role === 'patient') {
      const [patientRows] = await connection.query<DatabaseRow[]>(
        `SELECT id
         FROM patients
         WHERE user_id = ?
         LIMIT 1
         FOR UPDATE`,
        [req.authenticatedAccount.id]
      );
      if (!patientRows[0]) {
        await connection.rollback();
        res.status(404).json({ message: 'The patient profile was not found.' });
        return;
      }

      patientId = String(patientRows[0].id);
      await connection.query<ResultSetHeader>(
        'UPDATE users SET email = ?, updated_at = ? WHERE id = ?',
        [email, now, req.authenticatedAccount.id]
      );
      await connection.query<ResultSetHeader>(
        `UPDATE patients
         SET first_name = ?, last_name = ?, email = ?, phone = ?,
             date_of_birth = ?, emergency_contact_name = ?,
             emergency_contact_phone = ?, medical_alerts = ?,
             insurance_provider = ?, preferred_dentist_id = ?
         WHERE user_id = ?`,
        [
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
          req.authenticatedAccount.id,
        ]
      );
    } else {
      patientId = randomUUID();
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
    }

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
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Failed to roll back appointment booking:', rollbackError);
      }
    }

    console.error('Failed to create appointment:', error);

    if (getErrorCode(error) === 'ER_DUP_ENTRY') {
      res.status(409).json({
        message: 'The email address is already associated with another account.',
      });
    } else {
      res.status(500).json({
        message: 'Unable to complete the appointment booking. Please try again.',
      });
    }
  } finally {
    connection?.release();
  }
  }
);

app.post('/api/admin/walk-in-appointments', ...adminMutationGuards, async (req, res) => {
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

app.patch('/api/appointments/:id/status', ...adminMutationGuards, async (req, res) => {
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

app.put('/api/admin/working-hours', ...adminMutationGuards, async (req, res) => {
  let connection: Awaited<
    ReturnType<ReturnType<typeof getPool>['getConnection']>
  > | null = null;

  try {
    const body = req.body as Record<string, unknown>;
    const dentistId = String(body.dentistId || '').trim();
    const dayOfWeek = body.dayOfWeek;
    const startTime = String(body.startTime || '').trim();
    const endTime = String(body.endTime || '').trim();
    const breakStartTime = String(body.breakStartTime || '').trim();
    const breakEndTime = String(body.breakEndTime || '').trim();
    const isWorkingDay = body.isWorkingDay;
    const validTime = (time: string) =>
      /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

    if (
      !dentistId ||
      typeof dayOfWeek !== 'number' ||
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6 ||
      typeof isWorkingDay !== 'boolean' ||
      !validTime(startTime) ||
      !validTime(endTime) ||
      !validTime(breakStartTime) ||
      !validTime(breakEndTime) ||
      timeToMinutes(startTime) >= timeToMinutes(endTime) ||
      timeToMinutes(breakStartTime) >= timeToMinutes(breakEndTime)
    ) {
      res.status(400).json({
        message: 'Please provide a valid dentist schedule.',
      });
      return;
    }

    connection = await getPool().getConnection();
    await connection.beginTransaction();

    const [dentistRows] = await connection.query<DatabaseRow[]>(
      `SELECT id
       FROM dentists
       WHERE id = ?
       FOR UPDATE`,
      [dentistId]
    );

    if (dentistRows.length === 0) {
      await connection.rollback();
      res.status(404).json({ message: 'The selected dentist was not found.' });
      return;
    }

    const [existingRows] = await connection.query<DatabaseRow[]>(
      `SELECT *
       FROM working_hours
       WHERE dentist_id = ? AND day_of_week = ?
       LIMIT 1
       FOR UPDATE`,
      [dentistId, dayOfWeek]
    );
    const now = new Date();
    const id = existingRows[0] ? String(existingRows[0].id) : randomUUID();
    const updatedSchedule = {
      dentistId,
      dayOfWeek,
      startTime,
      endTime,
      breakStartTime,
      breakEndTime,
      isWorkingDay,
    };

    await connection.query<ResultSetHeader>(
      `INSERT INTO working_hours (
        id, dentist_id, day_of_week, start_time, end_time,
        break_start_time, break_end_time, is_working_day
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        start_time = VALUES(start_time),
        end_time = VALUES(end_time),
        break_start_time = VALUES(break_start_time),
        break_end_time = VALUES(break_end_time),
        is_working_day = VALUES(is_working_day)`,
      [
        id,
        dentistId,
        dayOfWeek,
        startTime,
        endTime,
        breakStartTime,
        breakEndTime,
        isWorkingDay,
      ]
    );

    await connection.query<ResultSetHeader>(
      `INSERT INTO audit_logs (
        id, entity_type, entity_id, action,
        performed_by, details, created_at
      ) VALUES (?, 'schedule', ?, 'update_schedule', ?, ?, ?)`,
      [
        randomUUID(),
        dentistId,
        'Clinic Administrator (Reception)',
        JSON.stringify({
          operation: existingRows.length > 0 ? 'updated' : 'created',
          previous: existingRows[0] ? toWorkingHours(existingRows[0]) : null,
          schedule: updatedSchedule,
        }),
        now,
      ]
    );

    const [savedRows] = await connection.query<DatabaseRow[]>(
      `SELECT *
       FROM working_hours
       WHERE dentist_id = ? AND day_of_week = ?
       LIMIT 1`,
      [dentistId, dayOfWeek]
    );

    await connection.commit();
    res.json({
      message: 'Dentist schedule successfully saved.',
      workingHours: toWorkingHours(savedRows[0]),
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Failed to save dentist schedule:', error);
    res.status(500).json({
      message: 'Unable to save the dentist schedule. Please try again.',
    });
  } finally {
    connection?.release();
  }
});

app.post('/api/admin/time-off', ...adminMutationGuards, async (req, res) => {
  let connection: Awaited<
    ReturnType<ReturnType<typeof getPool>['getConnection']>
  > | null = null;

  try {
    const body = req.body as Record<string, unknown>;
    const dentistId = String(body.dentistId || '').trim();
    const title = String(body.title || '').trim();
    const startDate = String(body.startDate || '').trim();
    const endDate = String(body.endDate || '').trim();
    const reason = String(body.reason || '').trim();

    if (
      !dentistId ||
      !title ||
      title.length > 255 ||
      !isValidDate(startDate) ||
      !isValidDate(endDate) ||
      endDate < startDate
    ) {
      res.status(400).json({
        message: 'Please provide a dentist, event name, and a valid date range.',
      });
      return;
    }

    connection = await getPool().getConnection();
    await connection.beginTransaction();

    const [dentistRows] = await connection.query<DatabaseRow[]>(
      `SELECT id
       FROM dentists
       WHERE id = ?
       FOR UPDATE`,
      [dentistId]
    );

    if (dentistRows.length === 0) {
      await connection.rollback();
      res.status(404).json({ message: 'The selected dentist was not found.' });
      return;
    }

    const id = randomUUID();
    const now = new Date();

    await connection.query<ResultSetHeader>(
      `INSERT INTO time_off (
        id, dentist_id, title, start_date, end_date, reason
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, dentistId, title, startDate, endDate, reason || null]
    );

    await connection.query<ResultSetHeader>(
      `INSERT INTO audit_logs (
        id, entity_type, entity_id, action,
        performed_by, details, created_at
      ) VALUES (?, 'schedule', ?, 'update_schedule', ?, ?, ?)`,
      [
        randomUUID(),
        id,
        'Clinic Administrator (Reception)',
        JSON.stringify({
          operation: 'time_off_created',
          dentistId,
          title,
          startDate,
          endDate,
          reason: reason || null,
        }),
        now,
      ]
    );

    await connection.commit();
    res.status(201).json({
      message: 'Dentist time-off successfully saved.',
      timeOff: { id, dentistId, title, startDate, endDate, reason: reason || undefined },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Failed to create dentist time-off:', error);
    res.status(500).json({
      message: 'Unable to save dentist time-off. Please try again.',
    });
  } finally {
    connection?.release();
  }
});

app.delete('/api/admin/time-off/:id', ...adminMutationGuards, async (req, res) => {
  let connection: Awaited<
    ReturnType<ReturnType<typeof getPool>['getConnection']>
  > | null = null;

  try {
    const id = String(req.params.id || '').trim();

    if (!id) {
      res.status(400).json({ message: 'A time-off ID is required.' });
      return;
    }

    connection = await getPool().getConnection();
    await connection.beginTransaction();

    const [timeOffRows] = await connection.query<DatabaseRow[]>(
      `SELECT id, dentist_id, title, start_date, end_date, reason
       FROM time_off
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (timeOffRows.length === 0) {
      await connection.rollback();
      res.status(404).json({ message: 'Time-off record not found.' });
      return;
    }

    const record = toTimeOff(timeOffRows[0]);
    const now = new Date();

    await connection.query<ResultSetHeader>(
      'DELETE FROM time_off WHERE id = ?',
      [id]
    );

    await connection.query<ResultSetHeader>(
      `INSERT INTO audit_logs (
        id, entity_type, entity_id, action,
        performed_by, details, created_at
      ) VALUES (?, 'schedule', ?, 'update_schedule', ?, ?, ?)`,
      [
        randomUUID(),
        id,
        'Clinic Administrator (Reception)',
        JSON.stringify({
          operation: 'time_off_deleted',
          timeOff: record,
        }),
        now,
      ]
    );

    await connection.commit();
    res.json({ message: 'Dentist time-off successfully removed.' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Failed to delete dentist time-off:', error);
    res.status(500).json({
      message: 'Unable to remove dentist time-off. Please try again.',
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

app.get('/api/public/clinic-data', async (_req, res) => {
  try {
    const [services, dentists, workingHours, settings] = await Promise.all([
      queryRows('SELECT * FROM services WHERE active = 1 ORDER BY name'),
      queryRows(`
        SELECT d.*,
          (SELECT COALESCE(JSON_ARRAYAGG(ds.service_id), JSON_ARRAY())
           FROM dentist_services ds
           WHERE ds.dentist_id = d.id) AS assigned_service_ids
        FROM dentists d
        WHERE d.active = 1
        ORDER BY d.name
      `),
      queryRows(
        `SELECT id, dentist_id, day_of_week, start_time, end_time,
                break_start_time, break_end_time, is_working_day
         FROM working_hours
         WHERE is_working_day = 1
         ORDER BY dentist_id, day_of_week`
      ),
      queryRows('SELECT * FROM clinic_settings WHERE id = 1'),
    ]);

    res.json({
      services: services.map(toService),
      dentists: dentists.map(toDentist),
      workingHours: workingHours.map(toWorkingHours),
      settings: settings[0] ? toSettings(settings[0]) : null,
    });
  } catch (error) {
    console.error('Failed to load public clinic data:', error);
    res.status(503).json({
      message: 'Unable to load public clinic information right now.',
    });
  }
});

app.get('/api/clinic-data', requireAuthenticatedAccount, async (req, res) => {
  try {
    const account = req.authenticatedAccount;
    if (!account) {
      res.status(401).json({ message: 'Authentication is required.' });
      return;
    }

    const isPatient = account.role === 'patient';
    const isAdmin = account.role === 'admin';
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
      isAdmin
        ? queryRows('SELECT * FROM time_off ORDER BY start_date')
        : Promise.resolve([] as DatabaseRow[]),
      isPatient
        ? queryRows(
            'SELECT * FROM patients WHERE user_id = ? ORDER BY last_name, first_name',
            [account.id]
          )
        : isAdmin
          ? queryRows('SELECT * FROM patients ORDER BY last_name, first_name')
          : Promise.resolve([] as DatabaseRow[]),
      isPatient
        ? queryRows(
            `SELECT a.id, a.booking_reference, a.patient_id, a.dentist_id,
                    a.service_id, a.appointment_date, a.start_time, a.end_time,
                    a.status, NULL AS notes, a.patient_notes,
                    NULL AS admin_notes, a.is_walk_in, a.cancellation_reason,
                    a.rescheduled_from_id, a.total_price, a.created_at, a.updated_at
             FROM appointments a
             INNER JOIN patients p ON p.id = a.patient_id
             WHERE p.user_id = ?
             ORDER BY a.appointment_date, a.start_time`,
            [account.id]
          )
        : isAdmin
          ? queryRows('SELECT * FROM appointments ORDER BY appointment_date, start_time')
          : Promise.resolve([] as DatabaseRow[]),
      isAdmin
        ? queryRows('SELECT * FROM notifications ORDER BY sent_at DESC')
        : Promise.resolve([] as DatabaseRow[]),
      isAdmin
        ? queryRows('SELECT * FROM audit_logs ORDER BY created_at DESC')
        : Promise.resolve([] as DatabaseRow[]),
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

if (isProduction) {
  const frontendDistPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../dist'
  );

  app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'API endpoint not found.' });
  });
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) {
      next();
      return;
    }

    res.sendFile(resolve(frontendDistPath, 'index.html'), (error) => {
      if (error) next(error);
    });
  });
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(
    `${isProduction ? 'PORT' : 'API_PORT'} must be a valid TCP port.`
  );
}

sessionStore.onReady()
  .then(() => {
    app.listen(port, host, () => {
      console.log(`Clinic application listening on http://${host}:${port}`);
    });
  })
  .catch((error: unknown) => {
    console.error('Failed to initialize the MySQL session store:', error);
    process.exitCode = 1;
  });
