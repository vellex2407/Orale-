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
import { UserRole, Appointment } from './types';

export default function App() {
  // Initialize relational storage
  useEffect(() => {
    DentalStorage.init();
  }, []);

  const [dataVersion, setDataVersion] = useState<number>(0);
  const handleRefreshData = () => setDataVersion((v) => v + 1);

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

  // Load latest data from storage
  const services = DentalStorage.getServices();
  const dentists = DentalStorage.getDentists();
  const settings = DentalStorage.getSettings();

  const handleOpenBooking = (serviceId?: string, dentistId?: string) => {
    setBookingServiceId(serviceId);
    setBookingDentistId(dentistId);
    setIsBookingModalOpen(true);
  };

  const handleOpenTracker = (reference?: string) => {
    setTrackerInitialRef(reference);
    setIsTrackerModalOpen(true);
  };

  const handleBookingSuccess = (newAppointment: Appointment) => {
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
