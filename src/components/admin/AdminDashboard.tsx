import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Users,
  Settings,
  Shield,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Check,
  Eye,
  FileText,
  DollarSign,
  Activity,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  Appointment,
  DentalService,
  Dentist,
  Patient,
  ClinicSettings,
  NotificationLog,
  AuditLog,
  AppointmentStatus,
  WorkingHours,
  TimeOff,
} from '../../types';
import { DentalStorage, formatDateReadable } from '../../services/storage';

interface AdminDashboardProps {
  services: DentalService[];
  dentists: Dentist[];
  settings: ClinicSettings;
  onRefreshData: () => void;
  onOpenBooking: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  services,
  dentists,
  settings,
  onRefreshData,
  onOpenBooking,
}) => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'schedules' | 'patients' | 'services' | 'audit' | 'settings'>('appointments');

  // Appointment filters
  const todayStr = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterDentistId, setFilterDentistId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Walk-in modal state
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState<boolean>(false);
  const [walkInServiceId, setWalkInServiceId] = useState<string>(services[0]?.id || '');
  const [walkInDentistId, setWalkInDentistId] = useState<string>(dentists[0]?.id || '');
  const [walkInTime, setWalkInTime] = useState<string>('11:00');
  const [walkInDate, setWalkInDate] = useState<string>(todayStr);
  const [walkInFirstName, setWalkInFirstName] = useState<string>('');
  const [walkInLastName, setWalkInLastName] = useState<string>('');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const [walkInError, setWalkInError] = useState<string | null>(null);

  // Status notes modal
  const [statusActionModal, setStatusActionModal] = useState<{
    appointment: Appointment;
    nextStatus: AppointmentStatus;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState<string>('');

  // Notification preview modal
  const [selectedNotification, setSelectedNotification] = useState<NotificationLog | null>(null);

  // Time off modal state
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState<boolean>(false);
  const [timeOffDentistId, setTimeOffDentistId] = useState<string>(dentists[0]?.id || '');
  const [timeOffTitle, setTimeOffTitle] = useState<string>('Clinical Training / Leave');
  const [timeOffStart, setTimeOffStart] = useState<string>(todayStr);
  const [timeOffEnd, setTimeOffEnd] = useState<string>(todayStr);

  // Edit service modal state
  const [editingService, setEditingService] = useState<DentalService | null>(null);

  // Working hours editing state
  const [selectedDentistScheduleId, setSelectedDentistScheduleId] = useState<string>(dentists[0]?.id || '');

  // Local copy of clinic settings
  const [localSettings, setLocalSettings] = useState<ClinicSettings>(settings);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState<boolean>(false);

  // Data
  const appointments = DentalStorage.getAppointments();
  const patients = DentalStorage.getPatients();
  const workingHours = DentalStorage.getWorkingHours();
  const timeOffs = DentalStorage.getTimeOff();
  const notifications = DentalStorage.getNotifications();
  const auditLogs = DentalStorage.getAuditLogs();

  // Filtered Appointments
  const filteredAppointments = appointments.filter((apt) => {
    if (filterDate && apt.date !== filterDate) return false;
    if (filterDentistId !== 'all' && apt.dentistId !== filterDentistId) return false;
    if (filterStatus !== 'all' && apt.status !== filterStatus) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const patient = patients.find((p) => p.id === apt.patientId);
      const patientName = patient ? `${patient.firstName} ${patient.lastName}`.toLowerCase() : '';
      const matchRef = apt.bookingReference.toLowerCase().includes(q);
      const matchName = patientName.includes(q);
      const matchPhone = patient?.phone.includes(q);
      if (!matchRef && !matchName && !matchPhone) return false;
    }

    return true;
  });

  // Calculate quick stats
  const todayAppointments = appointments.filter((a) => a.date === todayStr);
  const pendingCount = appointments.filter((a) => a.status === 'pending').length;
  const completedTodayCount = todayAppointments.filter((a) => a.status === 'completed').length;
  const cancelledCount = appointments.filter((a) => a.status === 'cancelled').length;
  const estimatedRevenue = appointments
    .filter((a) => a.status === 'completed' || a.status === 'confirmed' || a.status === 'arrived')
    .reduce((sum, a) => sum + (a.totalPrice || 0), 0);

  // Handle status update
  const handleExecuteStatusChange = () => {
    if (!statusActionModal) return;

    DentalStorage.updateAppointmentStatus(
      statusActionModal.appointment.id,
      statusActionModal.nextStatus,
      'Clinic Administrator (Reception)',
      actionNotes.trim() || undefined
    );

    setStatusActionModal(null);
    setActionNotes('');
    onRefreshData();
  };

  // Handle walk-in creation
  const handleCreateWalkIn = () => {
    setWalkInError(null);
    if (!walkInFirstName.trim() || !walkInLastName.trim() || !walkInPhone.trim()) {
      setWalkInError('Patient name and phone number are required.');
      return;
    }

    const res = DentalStorage.bookAppointment({
      serviceId: walkInServiceId,
      dentistId: walkInDentistId,
      date: walkInDate,
      startTime: walkInTime,
      patientInfo: {
        firstName: walkInFirstName.trim(),
        lastName: walkInLastName.trim(),
        email: `walkin.${Date.now()}@clinic-guest.com`,
        phone: walkInPhone.trim(),
        dateOfBirth: '1990-01-01',
        insuranceProvider: 'Self-Pay / In-Clinic',
      },
      patientNotes: 'Walk-in / Phone reception booking',
      isWalkIn: true,
      bookedBy: 'Clinic Reception Desk',
    });

    if (!res.success) {
      setWalkInError(res.error || 'Conflict detected for walk-in slot.');
      return;
    }

    setIsWalkInModalOpen(false);
    setWalkInFirstName('');
    setWalkInLastName('');
    setWalkInPhone('');
    onRefreshData();
  };

  // Add time-off
  const handleSaveTimeOff = () => {
    DentalStorage.addTimeOff({
      id: `to-${Date.now()}`,
      dentistId: timeOffDentistId,
      title: timeOffTitle,
      startDate: timeOffStart,
      endDate: timeOffEnd,
    });
    setIsTimeOffModalOpen(false);
    onRefreshData();
  };

  // Save clinic settings
  const handleSaveSettings = () => {
    DentalStorage.updateSettings(localSettings);
    setSettingsSavedMessage(true);
    setTimeout(() => setSettingsSavedMessage(false), 3000);
    onRefreshData();
  };

  return (
    <div className="py-8 bg-slate-100 min-h-[calc(100vh-140px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Dashboard Title & Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-teal-800">
              Clinic Administration & Operatory Command
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-0.5">
              Appointment Management Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsWalkInModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-teal-400" />
              <span>Add Walk-In / Phone Booking</span>
            </button>
          </div>
        </div>

        {/* 5-Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">Today's Visits</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {todayAppointments.length}
            </div>
            <div className="text-[11px] text-teal-700 mt-0.5">Scheduled for today</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">Pending Review</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1">
              {pendingCount}
            </div>
            <div className="text-[11px] text-amber-600 mt-0.5">Awaiting staff confirmation</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">Completed Visits</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
              {completedTodayCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Finished today</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">Cancellations</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-700 mt-1">
              {cancelledCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Slots released</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
            <div className="text-xs font-medium text-slate-500">Estimated Revenue</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              ₱{estimatedRevenue.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Active treatment pipeline</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'appointments'
                ? 'border-teal-600 text-teal-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Appointments ({appointments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'schedules'
                ? 'border-teal-600 text-teal-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Dentist Schedules & Time-Off
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('patients')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'patients'
                ? 'border-teal-600 text-teal-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Patients Directory ({patients.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'services'
                ? 'border-teal-600 text-teal-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Services Catalog ({services.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'audit'
                ? 'border-teal-600 text-teal-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Notifications & Audit Trails
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2 ${
              activeTab === 'settings'
                ? 'border-teal-600 text-teal-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Clinic Settings
          </button>
        </div>

        {/* TAB 1: APPOINTMENTS MANAGEMENT */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative min-w-48 flex-1 sm:max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search patient, phone, reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {/* Filter Date */}
                <div>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                {/* Filter Dentist */}
                <div>
                  <select
                    value={filterDentistId}
                    onChange={(e) => setFilterDentistId(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                  >
                    <option value="all">All Clinicians</option>
                    {dentists.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Status */}
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="arrived">Arrived</option>
                    <option value="in_treatment">In Treatment</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>

                {(filterDate || filterDentistId !== 'all' || filterStatus !== 'all' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterDate('');
                      setFilterDentistId('all');
                      setFilterStatus('all');
                      setSearchQuery('');
                    }}
                    className="text-xs text-teal-700 font-semibold hover:underline"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-500 font-mono tabular-nums">
                Showing {filteredAppointments.length} bookings
              </div>
            </div>

            {/* Appointments Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Booking Ref</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Service</th>
                      <th className="py-3 px-4">Clinician</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No appointments match the chosen filters.
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((apt) => {
                        const s = services.find((serv) => serv.id === apt.serviceId);
                        const d = dentists.find((dent) => dent.id === apt.dentistId);
                        const patient = patients.find((p) => p.id === apt.patientId);

                        return (
                          <tr key={apt.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {apt.bookingReference}
                              {apt.isWalkIn && (
                                <span className="ml-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Walk-in
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums">
                              <span className="font-semibold text-slate-900 block">{formatDateReadable(apt.date)}</span>
                              <span className="text-[11px] text-slate-500">{apt.startTime} – {apt.endTime}</span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-900 block">
                                {patient ? `${patient.firstName} ${patient.lastName}` : 'Walk-in Guest'}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">{patient?.phone}</span>
                              {patient?.medicalAlerts && patient.medicalAlerts.length > 0 && (
                                <span className="inline-block text-[10px] text-amber-800 bg-amber-50 px-1 rounded mt-0.5 border border-amber-200">
                                  Alert: {patient.medicalAlerts[0]}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-900 block">{s?.name}</span>
                              <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                                ₱{apt.totalPrice?.toLocaleString()} · {s?.durationMinutes}m
                              </span>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-medium text-slate-800">{d?.name}</span>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  apt.status === 'confirmed'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : apt.status === 'pending'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : apt.status === 'arrived'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : apt.status === 'in_treatment'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : apt.status === 'completed'
                                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                    : apt.status === 'cancelled'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {apt.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {apt.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setStatusActionModal({ appointment: apt, nextStatus: 'confirmed' })
                                    }
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors"
                                  >
                                    Confirm
                                  </button>
                                )}

                                {apt.status === 'confirmed' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setStatusActionModal({ appointment: apt, nextStatus: 'arrived' })
                                    }
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition-colors"
                                  >
                                    Mark Arrived
                                  </button>
                                )}

                                {apt.status === 'arrived' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setStatusActionModal({ appointment: apt, nextStatus: 'in_treatment' })
                                    }
                                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-semibold transition-colors"
                                  >
                                    In Chair
                                  </button>
                                )}

                                {apt.status === 'in_treatment' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setStatusActionModal({ appointment: apt, nextStatus: 'completed' })
                                    }
                                    className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[11px] font-semibold transition-colors"
                                  >
                                    Complete
                                  </button>
                                )}

                                {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setStatusActionModal({ appointment: apt, nextStatus: 'cancelled' })
                                    }
                                    className="px-2 py-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded text-[11px] transition-colors"
                                  >
                                    Cancel
                                  </button>
                                )}

                                {apt.status === 'confirmed' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setStatusActionModal({ appointment: apt, nextStatus: 'no_show' })
                                    }
                                    className="px-2 py-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded text-[11px] transition-colors"
                                  >
                                    No Show
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCHEDULES & TIME-OFF */}
        {activeTab === 'schedules' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Dentist Working Hours & Roster</h3>
                <p className="text-xs text-slate-500">
                  Select a clinician to view and adjust weekly clinical hours, lunch break windows, and scheduled leaves.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedDentistScheduleId}
                  onChange={(e) => setSelectedDentistScheduleId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900"
                >
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialty})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setIsTimeOffModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Block Time-Off / Leave</span>
                </button>
              </div>
            </div>

            {/* Working Hours Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900">
                Weekly Clinical Schedule for {dentists.find((d) => d.id === selectedDentistScheduleId)?.name}
              </div>
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Day of Week</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Working Hours</th>
                    <th className="py-2.5 px-4">Lunch / Break Period</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const wh = workingHours.find(
                      (w) => w.dentistId === selectedDentistScheduleId && w.dayOfWeek === dayIndex
                    );

                    return (
                      <tr key={dayIndex} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-semibold text-slate-900">{dayNames[dayIndex]}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              wh?.isWorkingDay
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {wh?.isWorkingDay ? 'Active Clinic Day' : 'Day Off'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {wh?.isWorkingDay ? `${wh.startTime} – ${wh.endTime}` : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {wh?.isWorkingDay && wh.breakStartTime ? `${wh.breakStartTime} – ${wh.breakEndTime}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (!wh) return;
                              DentalStorage.saveWorkingHours({
                                ...wh,
                                isWorkingDay: !wh.isWorkingDay,
                              });
                              onRefreshData();
                            }}
                            className="text-xs text-teal-700 font-semibold hover:underline"
                          >
                            {wh?.isWorkingDay ? 'Toggle Off' : 'Toggle On'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Blocked Time-off List */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900">
                Scheduled Leaves & Unavailable Dates ({timeOffs.length})
              </h4>
              {timeOffs.length === 0 ? (
                <p className="text-xs text-slate-500">No time-off or blocked dates currently registered.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {timeOffs.map((to) => {
                    const d = dentists.find((dent) => dent.id === to.dentistId);
                    return (
                      <div key={to.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                        <div className="font-bold text-slate-900">{to.title}</div>
                        <div className="text-slate-500 mt-0.5">{d?.name}</div>
                        <div className="font-mono text-[11px] text-teal-700 mt-1">
                          {to.startDate} to {to.endDate}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            DentalStorage.deleteTimeOff(to.id);
                            onRefreshData();
                          }}
                          className="mt-2 text-rose-700 text-[11px] font-semibold hover:underline"
                        >
                          Remove Block
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PATIENT DIRECTORY */}
        {activeTab === 'patients' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Patient Registry</h3>
                <p className="text-xs text-slate-500">Medical alerts, insurance providers, and contact records</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Patient Name</th>
                    <th className="py-2.5 px-4">Phone & Email</th>
                    <th className="py-2.5 px-4">Date of Birth</th>
                    <th className="py-2.5 px-4">Insurance</th>
                    <th className="py-2.5 px-4">Medical Alerts</th>
                    <th className="py-2.5 px-4 text-right">Appointments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((p) => {
                    const pApts = appointments.filter((a) => a.patientId === p.id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {p.firstName} {p.lastName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-slate-900 block">{p.phone}</span>
                          <span className="text-slate-500 text-[11px]">{p.email}</span>
                        </td>
                        <td className="py-3 px-4 font-mono">{p.dateOfBirth}</td>
                        <td className="py-3 px-4">{p.insuranceProvider || 'Self-Pay'}</td>
                        <td className="py-3 px-4">
                          {p.medicalAlerts && p.medicalAlerts.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.medicalAlerts.map((alert) => (
                                <span key={alert} className="text-[10px] bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200">
                                  {alert}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">None flagged</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {pApts.length} visits
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SERVICES CATALOG */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <div key={service.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-teal-700 tracking-wider">
                      {service.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{service.name}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">{service.description}</p>
                  {service.priceNote && (
                    <p className="text-[11px] text-slate-500 italic">{service.priceNote}</p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-teal-800 font-semibold block text-[11px] uppercase tracking-wider">Fixed Fee</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {service.priceRange || `₱${service.price.toLocaleString()}`}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        Duration: {service.durationMinutes} mins
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[11px]">Room Buffer</span>
                      <span className="font-mono text-slate-600">{service.bufferMinutes || 15}m</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: NOTIFICATIONS & AUDIT TRAILS */}
        {activeTab === 'audit' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Outgoing Notifications Log */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Simulated Outgoing Notifications ({notifications.length})</h3>
                <span className="text-xs text-slate-400">Click to preview message</span>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => setSelectedNotification(notif)}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] text-teal-700">
                        {notif.channel.toUpperCase()} · {notif.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(notif.sentAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800 line-clamp-1">{notif.subject}</div>
                    <div className="text-slate-500 line-clamp-1">{notif.body}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Logs */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Security & Operational Audit Trails</h3>
                <span className="text-xs text-slate-400 font-mono">{auditLogs.length} entries</span>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{log.action.toUpperCase()}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-600">{log.details}</p>
                    <div className="text-[11px] text-slate-400">Actor: {log.performedBy}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CLINIC SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl space-y-6 shadow-2xs">
            <div>
              <h3 className="text-base font-bold text-slate-900">Clinic Scheduling & Workflow Rules</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure auto-confirmation behavior, buffers between procedures, and cancellation rules.
              </p>
            </div>

            {settingsSavedMessage && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                Clinic settings updated successfully!
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Auto Confirm Toggle */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">Auto-Confirm Patient Bookings</span>
                    <span className="text-slate-500">
                      If enabled, new online patient requests are immediately marked as 'Confirmed'. If disabled, requests require receptionist review.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.autoConfirmAppointments}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, autoConfirmAppointments: e.target.checked })
                    }
                    className="w-5 h-5 text-teal-600 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Sterilization Buffer Between Procedures (Minutes)
                  </label>
                  <input
                    type="number"
                    value={localSettings.defaultBufferMinutes}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, defaultBufferMinutes: Number(e.target.value) })
                    }
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Cancellation Cutoff Notice (Hours)
                  </label>
                  <input
                    type="number"
                    value={localSettings.cancellationCutoffHours}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, cancellationCutoffHours: Number(e.target.value) })
                    }
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Clinic Phone</label>
                  <input
                    type="text"
                    value={localSettings.phone}
                    onChange={(e) => setLocalSettings({ ...localSettings, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Emergency 24/7 Hotline</label>
                  <input
                    type="text"
                    value={localSettings.emergencyHotline}
                    onChange={(e) => setLocalSettings({ ...localSettings, emergencyHotline: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Clinic Address</label>
                <input
                  type="text"
                  value={localSettings.address}
                  onChange={(e) => setLocalSettings({ ...localSettings, address: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD WALK-IN APPOINTMENT */}
        {isWalkInModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Add Walk-In / Phone Booking</h3>
                <button
                  type="button"
                  onClick={() => setIsWalkInModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {walkInError && (
                  <div className="p-3 bg-rose-50 text-rose-800 rounded-lg border border-rose-200">
                    {walkInError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">First Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. David"
                      value={walkInFirstName}
                      onChange={(e) => setWalkInFirstName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Last Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Cole"
                      value={walkInLastName}
                      onChange={(e) => setWalkInLastName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Phone Number (09xx-xxx-xxxx) *</label>
                  <input
                    type="tel"
                    placeholder="0917-xxx-xxxx"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Dental Service</label>
                    <select
                      value={walkInServiceId}
                      onChange={(e) => setWalkInServiceId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-2"
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.durationMinutes}m)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Clinician</label>
                    <select
                      value={walkInDentistId}
                      onChange={(e) => setWalkInDentistId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-2"
                    >
                      {dentists.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Date</label>
                    <input
                      type="date"
                      value={walkInDate}
                      onChange={(e) => setWalkInDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Start Time (HH:MM)</label>
                    <input
                      type="time"
                      value={walkInTime}
                      onChange={(e) => setWalkInTime(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWalkInModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateWalkIn}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold"
                  >
                    Book Walk-In
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: STATUS ACTION NOTES */}
        {statusActionModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Update Status to: {statusActionModal.nextStatus.toUpperCase().replace('_', ' ')}
                </h3>
                <button
                  type="button"
                  onClick={() => setStatusActionModal(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <p className="text-slate-600">
                  Ref: <span className="font-mono font-bold text-slate-900">{statusActionModal.appointment.bookingReference}</span>.
                  An automated email/SMS status update will be logged for the patient.
                </p>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Clinical / Administrative Notes (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Patient checked in at front desk; operatory 2 prepared..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStatusActionModal(null)}
                    className="px-3.5 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteStatusChange}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg"
                  >
                    Confirm Status Change
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: NOTIFICATION PREVIEW */}
        {selectedNotification && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                    {selectedNotification.channel.toUpperCase()} Preview
                  </span>
                  <span className="text-xs text-slate-400">· Delivered</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Recipient</span>
                  <span className="font-mono text-slate-900">
                    {selectedNotification.recipientEmail || selectedNotification.recipientPhone}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Subject</span>
                  <span className="font-bold text-slate-900">{selectedNotification.subject}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-1">Message Body</span>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed font-sans">
                    {selectedNotification.body}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Timestamp: {selectedNotification.sentAt}
                </div>
              </div>

              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="px-4 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: TIME OFF BLOCKING */}
        {isTimeOffModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Block Clinician Time-Off</h3>
                <button
                  type="button"
                  onClick={() => setIsTimeOffModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-3.5 text-xs">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Clinician</label>
                  <select
                    value={timeOffDentistId}
                    onChange={(e) => setTimeOffDentistId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-2"
                  >
                    {dentists.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Reason / Event Name</label>
                  <input
                    type="text"
                    value={timeOffTitle}
                    onChange={(e) => setTimeOffTitle(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={timeOffStart}
                      onChange={(e) => setTimeOffStart(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">End Date</label>
                    <input
                      type="date"
                      value={timeOffEnd}
                      onChange={(e) => setTimeOffEnd(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTimeOffModalOpen(false)}
                    className="px-3.5 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTimeOff}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold"
                  >
                    Save & Block Dates
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
