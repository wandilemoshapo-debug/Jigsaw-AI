'use client';
// Add this at the top of the file with other imports
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Phone, 
  Mail as MailIcon,
  Video,
  Check,
  X,
  Edit,
  Trash2,
  Plus,
  ExternalLink,
  Users,
  Building2,
  AlertCircle,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon2,
  Eye,
  RefreshCw,
  Save,
  Clock as ClockIcon
} from 'lucide-react';

function getStatusColor(status) {
  switch (status) {
    case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
    case 'completed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
    case 'cancelled': return 'bg-rose-500/20 text-rose-400 border-rose-500/20';
    case 'rescheduled': return 'bg-amber-500/20 text-amber-400 border-amber-500/20';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/20';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'scheduled': return 'Scheduled';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    case 'rescheduled': return 'Rescheduled';
    default: return 'Unknown';
  }
}

function MeetingCard({ meeting, onUpdate, onDelete, onEdit, onReschedule }) {
  const [expanded, setExpanded] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    const date = new Date(dateString);
    return date.toLocaleString('en-ZA', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      alert('Please select a new date and time');
      return;
    }

    setIsRescheduling(true);
    const newDateTime = new Date(`${newDate}T${newTime}`);

    const updates = {
      meeting_date: newDateTime.toISOString(),
      meeting_status: 'scheduled',
      meeting_notes: meeting.meeting_notes 
        ? `${meeting.meeting_notes}\n\n--- Rescheduled from ${formatDate(meeting.meeting_date)} ---\n${rescheduleNotes || 'Rescheduled to new time.'}`
        : `Rescheduled from ${formatDate(meeting.meeting_date)}\n${rescheduleNotes || 'Rescheduled to new time.'}`
    };

    await onUpdate(meeting.id, updates);
    setShowRescheduleModal(false);
    setIsRescheduling(false);
    setNewDate('');
    setNewTime('');
    setRescheduleNotes('');
  };

  const isRescheduled = meeting.meeting_status === 'rescheduled';

  return (
    <>
      <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,255,255,0.04)] hover:border-[#18233D]/60 transition-all">
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-white truncate">{meeting.business_name || 'Untitled Meeting'}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(meeting.meeting_status)}`}>
                  {getStatusLabel(meeting.meeting_status)}
                </span>
                {meeting.campaign_name && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/20">
                    📁 {meeting.campaign_name}
                  </span>
                )}
                {isRescheduled && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/20 animate-pulse">
                    ⚠️ Needs Reschedule
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                <span className={`flex items-center gap-1 ${isRescheduled ? 'line-through text-slate-500' : ''}`}>
                  <Clock size={12} className="text-slate-500" />
                  {formatDate(meeting.meeting_date)}
                </span>
                {isRescheduled && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <RefreshCw size={12} className="animate-spin-slow" />
                    Awaiting new date
                  </span>
                )}
                {meeting.suburb && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-slate-500" />
                    {meeting.suburb}
                  </span>
                )}
                {meeting.industry_category && (
                  <span className="flex items-center gap-1">
                    <Building2 size={12} className="text-slate-500" />
                    {meeting.industry_category}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 ml-3 shrink-0 flex-wrap">
              {isRescheduled && (
                <button
                  onClick={() => setShowRescheduleModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw size={14} /> Reschedule
                </button>
              )}
              <Link
                href={`/campaigns/${meeting.campaign_id}/leads/${meeting.id}`}
                className="text-slate-400 hover:text-[#5B7CFA] p-1.5 rounded-lg hover:bg-[#18233D] transition-colors"
                title="View Lead"
              >
                <Eye size={14} />
              </Link>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#18233D] transition-colors"
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button
                onClick={() => onEdit(meeting)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#18233D] transition-colors"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => onDelete(meeting.id)}
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Meeting Links */}
          {(meeting.meeting_link || meeting.phone) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {meeting.meeting_link && (
                <a
                  href={meeting.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#5B7CFA] hover:text-[#7092FF] flex items-center gap-1 px-3 py-1 rounded-lg border border-[#18233D] hover:bg-[#131C31] transition-colors"
                >
                  <Video size={12} /> Join Meeting
                </a>
              )}
              {meeting.phone && (
                <a
                  href={`tel:${meeting.phone}`}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1 rounded-lg border border-[#18233D] hover:bg-[#131C31] transition-colors"
                >
                  <Phone size={12} /> {meeting.phone}
                </a>
              )}
              {meeting.email && (
                <a
                  href={`mailto:${meeting.email}`}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1 rounded-lg border border-[#18233D] hover:bg-[#131C31] transition-colors"
                >
                  <MailIcon size={12} /> Email
                </a>
              )}
            </div>
          )}

          {/* Expanded Details */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-[#18233D] space-y-3">
              {meeting.meeting_notes && (
                <div className="bg-[#131C31] rounded-xl p-4 border border-[#18233D]">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
                    <StickyNote size={14} className="text-[#5B7CFA]" />
                    <span>Meeting Notes</span>
                  </div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {meeting.meeting_notes}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-[#131C31] rounded-xl p-3 border border-[#18233D]">
                  <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Original Date & Time</div>
                  <div className={`text-white mt-1 ${isRescheduled ? 'line-through text-slate-500' : ''}`}>
                    {formatDate(meeting.meeting_date)}
                  </div>
                </div>
                <div className="bg-[#131C31] rounded-xl p-3 border border-[#18233D]">
                  <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Status</div>
                  <div className={`mt-1 text-sm ${getStatusColor(meeting.meeting_status)}`}>
                    {getStatusLabel(meeting.meeting_status)}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <select
                  value={meeting.meeting_status || 'scheduled'}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    if (newStatus === 'rescheduled') {
                      // Show reschedule modal
                      setShowRescheduleModal(true);
                    } else {
                      onUpdate(meeting.id, { meeting_status: newStatus });
                    }
                  }}
                  className="text-xs bg-[#131C31] text-white px-3 py-1.5 rounded-lg border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rescheduled">Rescheduled</option>
                </select>
                <button
                  onClick={() => onUpdate(meeting.id, { meeting_status: 'completed' })}
                  className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-colors flex items-center gap-1"
                >
                  <Check size={12} /> Mark Complete
                </button>
                <button
                  onClick={() => {
                    setShowRescheduleModal(true);
                  }}
                  className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20 transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Reschedule
                </button>
                <Link
                  href={`/campaigns/${meeting.campaign_id}/leads/${meeting.id}`}
                  className="text-xs bg-[#5B7CFA]/10 hover:bg-[#5B7CFA]/20 text-[#5B7CFA] px-3 py-1.5 rounded-lg border border-[#5B7CFA]/20 transition-colors flex items-center gap-1"
                >
                  <Eye size={12} /> View Lead
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Reschedule Meeting</h2>
                  <p className="text-sm text-slate-400">{meeting.business_name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Original: {formatDate(meeting.meeting_date)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowRescheduleModal(false);
                    setNewDate('');
                    setNewTime('');
                    setRescheduleNotes('');
                  }}
                  className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-[#18233D] rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white block mb-1.5">New Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white block mb-1.5">New Time</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white block mb-1.5">Reason for Reschedule (optional)</label>
                  <textarea
                    value={rescheduleNotes}
                    onChange={(e) => setRescheduleNotes(e.target.value)}
                    placeholder="e.g. Client requested new time, conflict with other meeting..."
                    className="w-full h-24 bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleReschedule}
                    disabled={isRescheduling}
                    className="flex-1 bg-[#5B7CFA] hover:bg-[#7092FF] text-white px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
                  >
                    {isRescheduling ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Rescheduling...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} /> Confirm Reschedule
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EditMeetingModal({ meeting, onClose, onSave }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [link, setLink] = useState('');
  const [status, setStatus] = useState('scheduled');

  useEffect(() => {
    if (meeting) {
      if (meeting.meeting_date) {
        const d = new Date(meeting.meeting_date);
        setDate(d.toISOString().split('T')[0]);
        setTime(d.toTimeString().slice(0, 5));
      }
      setNotes(meeting.meeting_notes || '');
      setLink(meeting.meeting_link || '');
      setStatus(meeting.meeting_status || 'scheduled');
    }
  }, [meeting]);

  const handleSubmit = () => {
    if (!date || !time) {
      alert('Please select a date and time');
      return;
    }
    const meetingDate = new Date(`${date}T${time}`);
    onSave({
      meeting_date: meetingDate.toISOString(),
      meeting_notes: notes,
      meeting_link: link,
      meeting_status: status
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Edit Meeting</h2>
              <p className="text-sm text-slate-400">{meeting?.business_name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-[#18233D] rounded-xl"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white block mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white block mb-1.5">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white block mb-1.5">Meeting Link</label>
              <input
                type="url"
                placeholder="https://meet.google.com/..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white block mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Meeting agenda, topics discussed, action items..."
                className="w-full h-32 bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white block mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rescheduled">Rescheduled</option>
              </select>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-[#5B7CFA] hover:bg-[#7092FF] text-white px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Save size={16} /> Update Meeting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);

  async function loadMeetings() {
    setLoading(true);
    
    const { data } = await supabase
      .from('discovered_leads')
      .select(`
        *,
        campaigns!discovered_leads_campaign_id_fkey (
          id,
          name
        )
      `)
      .not('meeting_date', 'is', null)
      .order('meeting_date', { ascending: true });
    
    const meetingsWithCampaign = (data || []).map(lead => ({
      ...lead,
      campaign_name: lead.campaigns?.name || 'No Campaign',
      campaign_id: lead.campaign_id
    }));
    
    setMeetings(meetingsWithCampaign);
    setLoading(false);
  }

  useEffect(() => {
    loadMeetings();
  }, []);

  const filteredMeetings = meetings.filter(meeting => {
    if (filterStatus === 'all') return true;
    return meeting.meeting_status === filterStatus;
  });

  async function updateMeeting(leadId, updates) {
    const { error } = await supabase
      .from('discovered_leads')
      .update(updates)
      .eq('id', leadId);
    
    if (!error) {
      loadMeetings();
    } else {
      alert('Error updating meeting: ' + error.message);
    }
  }

  async function deleteMeeting(leadId) {
    if (!confirm('Delete this meeting?')) return;
    const { error } = await supabase
      .from('discovered_leads')
      .update({
        meeting_date: null,
        meeting_notes: null,
        meeting_link: null,
        meeting_status: null
      })
      .eq('id', leadId);
    
    if (!error) {
      loadMeetings();
    } else {
      alert('Error deleting meeting: ' + error.message);
    }
  }

  const statusCounts = meetings.reduce((acc, lead) => {
    const status = lead.meeting_status || 'scheduled';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Count rescheduled meetings that need attention
  const rescheduledCount = meetings.filter(m => m.meeting_status === 'rescheduled').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#090D18]">
        <div className="text-slate-400 text-lg">Loading meetings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090D18] text-slate-200">
      {/* Header */}
      <div className="border-b border-[#18233D] bg-[#0D1424] px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft size={18} /> Dashboard
          </Link>
          <h1 className="text-xl font-bold text-white">Calendar</h1>
          <span className="text-sm text-slate-500">{meetings.length} meetings</span>
          {rescheduledCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <RefreshCw size={12} /> {rescheduledCount} need reschedule
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/calendar/reschedule"
            className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-xl border border-[#18233D] hover:bg-[#131C31] transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} /> Reschedule All
          </Link>
        </div>
      </div>

      {/* Status Filters */}
      <div className="border-b border-[#18233D] bg-[#0D1424] px-8 py-3 flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
            filterStatus === 'all' ? 'bg-[#5B7CFA] text-white' : 'text-slate-400 hover:text-white bg-[#131C31] border border-[#18233D]'
          }`}
        >
          All ({meetings.length})
        </button>
        {['scheduled', 'completed', 'cancelled', 'rescheduled'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filterStatus === status ? 'bg-[#5B7CFA] text-white' : 'text-slate-400 hover:text-white bg-[#131C31] border border-[#18233D]'
            }`}
          >
            {getStatusLabel(status)} ({statusCounts[status] || 0})
          </button>
        ))}
      </div>

      {/* Meeting List */}
      <div className="p-8">
        {filteredMeetings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📅</div>
            <h2 className="text-xl font-semibold text-white mb-2">No meetings scheduled</h2>
            <p className="text-slate-400 text-sm">Schedule your first meeting from the dashboard</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-3">
            {filteredMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onUpdate={updateMeeting}
                onDelete={deleteMeeting}
                onEdit={(meeting) => {
                  setEditingMeeting(meeting);
                  setShowEditModal(true);
                }}
                onReschedule={(meeting) => {
                  // This is handled inside the MeetingCard component
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Meeting Modal */}
      {showEditModal && editingMeeting && (
        <EditMeetingModal
          meeting={editingMeeting}
          onClose={() => {
            setShowEditModal(false);
            setEditingMeeting(null);
          }}
          onSave={(data) => updateMeeting(editingMeeting.id, data)}
        />
      )}
    </div>
  );
}