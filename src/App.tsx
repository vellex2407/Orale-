/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/patient/HeroSection';
import { ServicesSection } from './components/patient/ServicesSection';
import { DentistsSection } from './components/patient/DentistsSection';
import { ClinicPoliciesSection } from './components/patient/ClinicPoliciesSection';
import { BookingModal } from './components/patient/BookingModal';
import { BookingTrackerModal } from './components/patient/BookingTrackerModal';
import { PatientPortal } from './components/patient/PatientPortal';
import { PatientAuthModal } from './components/patient/PatientAuthModal';
import { ClinicFAQModal } from './components/patient/ClinicFAQModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { DentistPortal } from './components/dentist/DentistPortal';
import { DentalStorage } from './services/storage';
import { 
  UserRole,
  Appointment,
  DentalService,
  Dentist,
  Patient,
  ClinicSettings,
  TimeOff,
  WorkingHours,
} from './types';

interface ClinicDataResponse {
  services: DentalService[];
  dentists: Dentist[];
  settings: ClinicSettings;
  appointments: Appointment[];
  patients: Patient[];
  workingHours: WorkingHours[];
  timeOff: TimeOff[];
}

interface CurrentAccount {
  id: string;
  email: string;
  role: UserRole;
}

export default function App() {
  // Initial fallback data while MySQL data is loading
  const [services, setServices] = useState<DentalService[]>(() =>
    DentalStorage.getServices()
  );

  const [dentists, setDentists] = useState<Dentist[]>(() =>
    DentalStorage.getDentists()
  );

  const [settings, setSettings] = useState<ClinicSettings>(() =>
    DentalStorage.getSettings()
  );

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [currentAccount, setCurrentAccount] = useState<CurrentAccount | null>(null);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isPatientAuthModalOpen, setIsPatientAuthModalOpen] = useState(false);

  const loadPublicClinicData = async () => {
    try {
      const response = await fetch('/api/public/clinic-data', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to load public clinic data (${response.status})`);
      }

      const data: Partial<ClinicDataResponse> = await response.json();

      if (data.services) setServices(data.services);
      if (data.dentists) setDentists(data.dentists);
      if (data.settings) setSettings(data.settings);
      if (data.workingHours) setWorkingHours(data.workingHours);
    } catch (error) {
      console.error('Error loading public clinic data:', error);
    }
  };

  // Active role & view state
  const [currentRole, setCurrentRole] = useState<UserRole>('patient');
  const [activeView, setActiveView] = useState<'home' | 'portal' | 'admin' | 'dentist'>('home');

  // Modals state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [bookingServiceId, setBookingServiceId] = useState<string | undefined>();
  const [bookingDentistId, setBookingDentistId] = useState<string | undefined>();

  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState<boolean>(false);
  const [trackerInitialRef, setTrackerInitialRef] = useState<string | undefined>();

  const [isFAQModalOpen, setIsFAQModalOpen] = useState<boolean>(false);

  const loadAuthenticatedClinicData = async (account: CurrentAccount) => {
    if (account.role === 'patient') {
      const [profileResponse, appointmentsResponse] = await Promise.all([
        fetch('/api/patient/profile', { credentials: 'include' }),
        fetch('/api/patient/appointments', { credentials: 'include' }),
      ]);
      const profileData: { patient?: Patient; message?: string } =
        await profileResponse.json();
      const appointmentData: { appointments?: Appointment[]; message?: string } =
        await appointmentsResponse.json();
      if (!profileResponse.ok || !profileData.patient) {
        throw new Error(profileData.message || 'Failed to load the patient profile.');
      }
      if (!appointmentsResponse.ok || !appointmentData.appointments) {
        throw new Error(
          appointmentData.message || 'Failed to load patient appointments.'
        );
      }

      setCurrentPatient(profileData.patient);
      setPatients([profileData.patient]);
      setAppointments(appointmentData.appointments);
      setTimeOff([]);
      return;
    }

    const response = await fetch('/api/clinic-data', {
      credentials: 'include',
    });
    const data: ClinicDataResponse & { timeOff: TimeOff[] } = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to load authenticated clinic data (${response.status})`);
    }

    setServices(data.services);
    setDentists(data.dentists);
    setSettings(data.settings);
    setAppointments(data.appointments);
    setPatients(data.patients);
    setWorkingHours(data.workingHours);
    setTimeOff(data.timeOff);
    setCurrentPatient(null);
  };

  const restoreSession = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (response.status === 401) return;
      const data: {
        user?: CurrentAccount;
        patient?: Patient;
        message?: string;
      } = await response.json();
      if (!response.ok || !data.user) {
        throw new Error(data.message || 'Unable to restore the account session.');
      }

      await loadAuthenticatedClinicData(data.user);
      setCurrentAccount(data.user);
      setCurrentRole(data.user.role);
      if (data.patient) setCurrentPatient(data.patient);
      setActiveView(data.user.role === 'patient' ? 'portal' : data.user.role);
    } catch (error) {
      console.error('Unable to restore authenticated session:', error);
    } finally {
      setIsRestoringSession(false);
    }
  };

  useEffect(() => {
    DentalStorage.init();
    void (async () => {
      await loadPublicClinicData();
      await restoreSession();
    })();
  }, []);

  const handleRefreshData = () => {
    if (currentAccount) {
      void loadAuthenticatedClinicData(currentAccount).catch((error: unknown) => {
        console.error('Error refreshing authenticated clinic data:', error);
      });
    } else {
      void loadPublicClinicData();
    }
  };

  const handleAuthenticated = async () => {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    const data: {
      user?: CurrentAccount;
      patient?: Patient;
      message?: string;
    } = await response.json();
    if (!response.ok || !data.user) {
      throw new Error(data.message || 'Unable to load the signed-in account.');
    }

    await loadAuthenticatedClinicData(data.user);
    setCurrentAccount(data.user);
    setCurrentRole(data.user.role);
    if (data.patient) setCurrentPatient(data.patient);
    setActiveView(data.user.role === 'patient' ? 'portal' : data.user.role);
    setIsPatientAuthModalOpen(false);
  };

  const handleLogout = async () => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    const result: { message?: string } = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Unable to log out.');
    }

    setCurrentAccount(null);
    setCurrentPatient(null);
    setPatients([]);
    setAppointments([]);
    setWorkingHours([]);
    setTimeOff([]);
    setCurrentRole('patient');
    setActiveView('home');
  };

  const handleOpenBooking = (serviceId?: string, dentistId?: string) => {
    setBookingServiceId(serviceId);
    setBookingDentistId(dentistId);
    setIsBookingModalOpen(true);
  };

  const handleOpenTracker = (reference?: string) => {
    setTrackerInitialRef(reference);
    setIsTrackerModalOpen(true);
  };

  const handleBookingSuccess = () => {
    handleRefreshData();
  };

  const handleRoleChange = (role: UserRole) => {
    if (role !== 'patient' && currentAccount?.role !== role) return;
    if (role === 'patient' && currentAccount && currentAccount.role !== 'patient') {
      setActiveView('home');
      return;
    }
    setCurrentRole(role);
    if (role === 'admin') setActiveView('admin');
    else if (role === 'dentist') setActiveView('dentist');
    else if (role === 'patient') {
      if (activeView === 'admin' || activeView === 'dentist') setActiveView('home');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        availableRoles={currentAccount ? [currentAccount.role] : ['patient']}
        isAuthenticated={currentAccount !== null}
        onLogout={() => {
          void handleLogout().catch((error: unknown) => {
            console.error('Unable to log out:', error);
            window.alert(
              error instanceof Error ? error.message : 'Unable to log out right now.'
            );
          });
        }}
        patientAccountLabel={
          isRestoringSession
            ? 'Checking session...'
            : currentAccount?.role === 'patient'
              ? 'Patient Portal'
              : 'Patient Account'
        }
        onOpenBooking={() => handleOpenBooking()}
        onOpenTracker={() => handleOpenTracker()}
        onOpenFAQ={() => setIsFAQModalOpen(true)}
        onOpenPatientPortal={() => {
          if (currentAccount?.role === 'patient') {
            setCurrentRole('patient');
            setActiveView('portal');
          } else {
            setIsPatientAuthModalOpen(true);
          }
        }}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* PATIENT VIEW: Public Home */}
        {activeView === 'home' && (
          <>
            <HeroSection
              settings={settings}
              services={services}
              onOpenBooking={(serviceId) => handleOpenBooking(serviceId)}
              onOpenTracker={() => handleOpenTracker()}
            />

            <ServicesSection
              services={services}
              onSelectService={(serviceId) => handleOpenBooking(serviceId)}
            />

            <DentistsSection
              dentists={dentists}
              services={services}
              onSelectDentist={(dentistId) => handleOpenBooking(undefined, dentistId)}
            />

            <ClinicPoliciesSection settings={settings} />
          </>
        )}

        {/* PATIENT VIEW: Patient Portal & History */}
        {activeView === 'portal' &&
          currentAccount?.role === 'patient' &&
          currentPatient && (
          <PatientPortal
            patient={currentPatient}
            appointments={appointments}
            services={services}
            dentists={dentists}
            onOpenBooking={() => handleOpenBooking()}
            onTrackAppointment={(ref) => handleOpenTracker(ref)}
            onPatientUpdated={(patient) => {
              setCurrentPatient(patient);
              setPatients([patient]);
            }}
            onLogout={handleLogout}
          />
        )}

        {/* ADMIN VIEW: Clinic Management Dashboard */}
        {activeView === 'admin' && (
          <AdminDashboard
            services={services}
            dentists={dentists}
            settings={settings}
            appointments={appointments}
            patients={patients}
            workingHours={workingHours}
            timeOffs={timeOff}
            onRefreshData={handleRefreshData}
            onOpenBooking={() => handleOpenBooking()}
          />
        )}

        {/* DENTIST VIEW: Chairside Queue & Schedule */}
        {activeView === 'dentist' && (
          <DentistPortal
            dentists={dentists}
            services={services}
            settings={settings}
            onRefreshData={handleRefreshData}
          />
        )}
      </main>

      {/* Footer on Patient Views */}
      {(activeView === 'home' || activeView === 'portal') && (
        <Footer
          settings={settings}
          onOpenBooking={() => handleOpenBooking()}
          onOpenTracker={() => handleOpenTracker()}
          onOpenFAQ={() => setIsFAQModalOpen(true)}
        />
      )}

      {/* Interactive Booking Modal (5-Step Guided Flow) */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialServiceId={bookingServiceId}
        initialDentistId={bookingDentistId}
        patientProfile={
          currentAccount?.role === 'patient' ? currentPatient : null
        }
        services={services}
        dentists={dentists}
        settings={settings}
        onBookingSuccess={handleBookingSuccess}
        onOpenTrackerForRef={(ref) => handleOpenTracker(ref)}
      />

      {/* Booking Tracker & Rescheduling Modal */}
      <BookingTrackerModal
        isOpen={isTrackerModalOpen}
        onClose={() => setIsTrackerModalOpen(false)}
        initialReference={trackerInitialRef}
        services={services}
        dentists={dentists}
        settings={settings}
        onRefreshData={handleRefreshData}
        authenticatedPatient={
          currentAccount?.role === 'patient' ? currentPatient : null
        }
        patientAppointments={
          currentAccount?.role === 'patient' ? appointments : []
        }
      />

      {/* Clinic FAQ & Guidance Assistant Modal */}
      <ClinicFAQModal
        isOpen={isFAQModalOpen}
        onClose={() => setIsFAQModalOpen(false)}
        settings={settings}
        services={services}
        onOpenBooking={() => {
          setIsFAQModalOpen(false);
          handleOpenBooking();
        }}
      />

      <PatientAuthModal
        isOpen={isPatientAuthModalOpen}
        onClose={() => setIsPatientAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}
