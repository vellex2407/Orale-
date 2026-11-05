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
} from './types';

interface ClinicDataResponse {
  services: DentalService[];
  dentists: Dentist[];
  settings: ClinicSettings;
  appointments: Appointment[];
  patients: Patient[];
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

  // Appointments and patients loaded from MySQL
  const [appointments, setAppointments] = useState<Appointment[]>(() =>
    DentalStorage.getAppointments()
  );

  const [patients, setPatients] = useState<Patient[]>(() =>
    DentalStorage.getPatients()
  );

  // Load clinic data from MySQL
  const loadClinicData = async () => {
    try {
      const response = await fetch('/api/clinic-data');

      if (!response.ok) {
        throw new Error(`Failed to load clinic data (${response.status})`);
      }

      const data: ClinicDataResponse = await response.json();

      setServices(data.services);
      setDentists(data.dentists);
      setSettings(data.settings);

      setAppointments(data.appointments);
      setPatients(data.patients);

      console.log('Clinic data successfully loaded from MySQL.');
    } catch (error) {
      console.error('Error loading clinic data:', error);
    }
  };

  // Initialize local storage for components not yet migrated,
  // then retrieve the latest shared data from MySQL.
  useEffect(() => {
    DentalStorage.init();
    void loadClinicData();
  }, []);

  // Refresh shared clinic data after bookings or other changes
  const handleRefreshData = () => {
    void loadClinicData();
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

  // Active patient for portal
  const [currentPatientId, setCurrentPatientId] = useState<string>('pat-1');

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
        onOpenBooking={() => handleOpenBooking()}
        onOpenTracker={() => handleOpenTracker()}
        onOpenFAQ={() => setIsFAQModalOpen(true)}
        onOpenPatientPortal={() => {
          setCurrentRole('patient');
          setActiveView('portal');
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
        {activeView === 'portal' && (
          <PatientPortal
            currentPatientId={currentPatientId}
            onSelectPatient={setCurrentPatientId}
            services={services}
            dentists={dentists}
            settings={settings}
            onOpenBooking={() => handleOpenBooking()}
            onTrackAppointment={(ref) => handleOpenTracker(ref)}
            onRefreshData={handleRefreshData}
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
    </div>
  );
}
