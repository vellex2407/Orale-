import React, { useState } from 'react';
import { X, HelpCircle, Search, Sparkles, ChevronDown, ChevronUp, Clock, Phone, Shield } from 'lucide-react';
import { ClinicSettings, DentalService } from '../../types';

interface ClinicFAQModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ClinicSettings;
  services: DentalService[];
  onOpenBooking: () => void;
}

interface FAQItem {
  id: string;
  category: 'prep' | 'pricing' | 'policies' | 'emergencies';
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'prep',
    question: 'How should I prepare for Philips Zoom! teeth whitening?',
    answer:
      'We strongly recommend having a routine dental cleaning within the 6 months prior to whitening to eliminate surface plaque. Avoid coffee, red wine, soy sauce, and tobacco for at least 48 hours following treatment to prevent restaining while the enamel pores are open.',
  },
  {
    id: 'faq-2',
    category: 'prep',
    question: 'What preparation is required for a surgical wisdom tooth extraction?',
    answer:
      'If you are having local anesthesia, eat a light meal 1 to 2 hours prior. If oral conscious sedation has been arranged, follow strict fasting (no food or liquids for 6 hours prior) and arrange an adult companion to drive you home.',
  },
  {
    id: 'faq-3',
    category: 'pricing',
    question: 'Which dental insurance & HMO plans do you accept?',
    answer:
      'Orale accepts leading Philippine HMO providers including Maxicare, Intellicare, Medicard, PhilCare, and Pacific Cross, as well as international insurances (Cigna, Bupa). We also offer 0% interest credit card installment plans and accept GCash/Maya.',
  },
  {
    id: 'faq-4',
    category: 'policies',
    question: 'What is your appointment cancellation and rescheduling policy?',
    answer:
      'To respect our clinicians and patients on our emergency waitlist, we require at least 24 hours advance notice to reschedule or cancel appointments without fee. Cancellations can be completed instantly online via your booking reference.',
  },
  {
    id: 'faq-5',
    category: 'emergencies',
    question: 'What constitutes a dental emergency and how can I be seen today?',
    answer:
      'Severe dental throbbing, facial swelling, uncontrollable oral bleeding, or a knocked-out permanent tooth are prioritized as emergencies. Call our emergency hotline at +63 917 888 9911 immediately. If a permanent tooth has been knocked out, gently place it back in the socket or in a container of cold milk and arrive at our BGC studio within 60 minutes.',
  },
  {
    id: 'faq-6',
    category: 'pricing',
    question: 'Are dental consultation fees applied toward subsequent treatments?',
    answer:
      'Yes! Clear Aligner evaluations (₱2,500) and restorative consult fees are credited toward your completed treatment or aligner package.',
  },
];

export const ClinicFAQModal: React.FC<ClinicFAQModalProps> = ({
  isOpen,
  onClose,
  settings,
  services,
  onOpenBooking,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>('faq-1');
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [assistantReply, setAssistantReply] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredFaqs = FAQS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAskAssistant = () => {
    const q = customQuestion.trim().toLowerCase();
    if (!q) return;

    if (q.includes('price') || q.includes('cost') || q.includes('fee')) {
      const priceList = services
        .slice(0, 4)
        .map((s) => `${s.name}: ₱${s.price.toLocaleString()}`)
        .join(', ');
      setAssistantReply(
        `At Orale' BGC, all pricing is transparent with no hidden chair fees. Sample standard fees: ${priceList}. Detailed quotes are provided after digital 3D examination.`
      );
    } else if (q.includes('insurance') || q.includes('coverage') || q.includes('hmo') || q.includes('maxicare')) {
      setAssistantReply(
        `We accept top HMOs in the Philippines (Maxicare, Intellicare, Medicard, PhilCare, Pacific Cross). We file claims directly for accredited procedures so you only settle your co-pay.`
      );
    } else if (q.includes('emergency') || q.includes('pain') || q.includes('bleed') || q.includes('swelling')) {
      setAssistantReply(
        `For acute dental pain or facial swelling, please call our 24/7 emergency hotline at ${settings.emergencyHotline}. Same-day triage slots are held daily at our BGC studio.`
      );
    } else if (q.includes('cancel') || q.includes('reschedule') || q.includes('change')) {
      setAssistantReply(
        `You can reschedule or cancel anytime online using your booking reference. Please provide at least ${settings.cancellationCutoffHours} hours notice to avoid a late fee.`
      );
    } else if (q.includes('whitening') || q.includes('zoom')) {
      setAssistantReply(
        `Our Philips Zoom! In-Chair Whitening is a 60-minute session (₱14,500) lifting teeth up to 8 shades. Avoid colored drinks (coffee, soy sauce) for 48 hours post-visit.`
      );
    } else {
      setAssistantReply(
        `Orale' Dental Studio is open ${settings.operatingHoursSummary}. Location: ${settings.address}, ${settings.city}. Contact: ${settings.phone}. For custom clinical inquiries, you can book an initial consultation or call our front desk.`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-teal-700">
              Patient Guidance & Prep
            </span>
            <h2 className="text-lg font-bold text-slate-900">Clinic FAQ & Pre-Visit Instructions</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Quick Guidance Assistant Input */}
          <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>Ask Clinic Guidance Assistant</span>
            </div>
            <p className="text-xs text-teal-800">
              Type any question regarding clinic policies, prep instructions, pricing, or appointment procedures:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Do you accept Delta Dental? or What are your hours?"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAssistant()}
                className="flex-1 bg-white border border-teal-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={handleAskAssistant}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Ask Assistant
              </button>
            </div>

            {assistantReply && (
              <div className="p-3 bg-white rounded-lg border border-teal-200 text-xs sm:text-sm text-slate-800 leading-relaxed shadow-2xs">
                <span className="font-semibold text-teal-800 block mb-1">Clinic Assistant Reply:</span>
                {assistantReply}
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search pre-appointment instructions, policies, insurance..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-3.5 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            />
          </div>

          {/* FAQs Accordion */}
          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-xl border border-slate-200 overflow-hidden bg-white transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm font-bold text-slate-900">{faq.question}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Ready to schedule your visit?</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenBooking();
            }}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors"
          >
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
};
