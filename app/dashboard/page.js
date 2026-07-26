'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  LayoutDashboard, 
  Users, 
  Kanban, 
  Mail, 
  Calendar as CalendarIcon, 
  Settings, 
  ExternalLink, 
  Phone,
  Upload,
  MessageCircle,
  Copy,
  CheckCircle,
  AlertCircle,
  Eye,
  Check,
  X,
  TrendingUp,
  Users as UsersIcon,
  Clock,
  Send,
  Building2,
  MapPin,
  Mail as MailIcon,
  Sparkles,
  SendHorizontal,
  Edit,
  Save,
  Repeat,
  Calendar as CalendarIcon2,
  RefreshCw,
  XCircle,
  Loader2,
  Pencil
} from 'lucide-react';

// ============================================================
// CONSTANTS
// ============================================================

const STAGES = ['new', 'analyzed', 'drafted', 'contacted', 'replied', 'no_reply', 'follow_up', 'meeting_booked', 'won', 'lost'];
const STAGE_LABELS = {
  new: 'New',
  analyzed: 'Analyzed',
  drafted: 'Drafted',
  contacted: 'Contacted',
  replied: 'Replied',
  no_reply: 'No Reply',
  follow_up: 'Follow-up',
  meeting_booked: 'Meeting Booked',
  won: 'Won',
  lost: 'Lost'
};
const STAGE_COLORS = {
  new: 'bg-slate-600',
  analyzed: 'bg-blue-500',
  drafted: 'bg-purple-500',
  contacted: 'bg-amber-500',
  replied: 'bg-green-500',
  no_reply: 'bg-red-500',
  follow_up: 'bg-orange-500',
  meeting_booked: 'bg-yellow-500',
  won: 'bg-emerald-500',
  lost: 'bg-rose-500'
};
const STAGE_ICONS = {
  new: Clock,
  analyzed: Eye,
  drafted: Send,
  contacted: SendHorizontal,
  replied: CheckCircle,
  no_reply: XCircle,
  follow_up: Repeat,
  meeting_booked: CalendarIcon2,
  won: Check,
  lost: X
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getStatusColor(status) {
  switch (status) {
    case '🔥 Hot': return 'text-rose-400';
    case '🟠 Warm': return 'text-orange-400';
    case '🔵 Cool': return 'text-sky-400';
    case 'needs_review': return 'text-amber-400';
    case 'has_website': return 'text-emerald-400';
    case 'confirmed_no_website': return 'text-slate-500';
    default: return 'text-slate-500';
  }
}

function ScoreRing({ score }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <div className="absolute inset-0 bg-[#5B7CFA]/5 rounded-full blur-2xl" />
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} stroke="#18233D" strokeWidth="4" fill="none" />
        <circle 
          cx="70" cy="70" r={radius} 
          stroke="#5B7CFA" strokeWidth="4" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} 
          strokeLinecap="round" transform="rotate(-90 70 70)" 
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-bold text-white leading-none">{score}</div>
        <div className="text-[10px] text-slate-500 mt-1">/ 100</div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl p-5 text-center hover:border-[#18233D]/60 transition-colors min-h-[100px] flex flex-col items-center justify-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Icon size={16} className="text-slate-600" />
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

// ============================================================
// FOLLOW-UP SCRIPTS
// ============================================================

const FOLLOWUP_SCRIPTS = {
  dm_followup1: {
    label: 'DM Follow-up 1',
    icon: MessageCircle,
    content: (name) => `Hey ${name || 'there'},

I put together a quick free audit of ${name || 'your business'}'s online presence — found 1–2 specific things that could be improved.

I can send it over — no strings, just useful info.
Want me to send it through?

Wandile`
  },
  dm_followup2: {
    label: 'DM Follow-up 2',
    icon: MessageCircle,
    content: (name) => `Hey ${name || 'there'} — last one from me.

I know you're busy running ${name || 'your business'}, so I'll leave it here.

If you ever decide you want a proper website that brings in leads and looks great on every device, I'm here.

Wishing you a great month.

Wandile`
  },
  email_followup1: {
    label: 'Email Follow-up 1',
    icon: MailIcon,
    content: (name) => `Subject: Re: Website for ${name || 'your business'} — Quick Follow-Up

Hi ${name || 'there'},

I sent an email a few days ago about building a website for ${name || 'your business'} — just wanted to make sure it didn't land in spam.

In short: I build professional websites for businesses like yours, starting from R1,000.

Happy to show you a free concept if you're curious.

Worth a quick chat?

Wandile`
  },
  email_followup2: {
    label: 'Email Follow-up 2',
    icon: MailIcon,
    content: (name) => `Subject: Last Email — Website for ${name || 'your business'}

Hi ${name || 'there'},

I don't want to keep filling your inbox, so this will be my last email.

If you ever want to get ${name || 'your business'} online or upgrade your current site, I'd love to help.

You can reach me any time.

All the best,

Wandile`
  }
};

const REPLY_HANDLERS = {
  not_interested: {
    label: '❌ "Not Interested"',
    content: (name) => `No worries at all — I appreciate you replying. If your situation ever changes, feel free to reach out. Good luck with everything!`
  },
  maybe_later: {
    label: '⏰ "Maybe Later"',
    content: (name) => `Totally understand. When would be a better time for me to follow up? I'll make a note and check back in then.`
  },
  how_much: {
    label: '💰 "How much does it cost?"',
    content: (name) => `Great question! R1,000 starter / R3,000 standard / R6,000 premium. The best way to know which fits is a quick 15-minute call. Does that work?`
  },
  already_have_website: {
    label: '🌐 "I already have a website"',
    content: (name) => `That's great! Is it getting you regular leads? A lot of businesses have a site but it isn't converting visitors. Happy to take a quick free look if you're curious.`
  }
};

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewLead, setReviewLead] = useState(null);
  const [reviewWebsite, setReviewWebsite] = useState('');
  const [activeScript, setActiveScript] = useState('email');
  const [sendingScript, setSendingScript] = useState(null);
  const [sendingStatus, setSendingStatus] = useState('');
  const [showFollowups, setShowFollowups] = useState(false);
  const [showReplyHandlers, setShowReplyHandlers] = useState(false);
  const [editingScript, setEditingScript] = useState(false);
  const [editedScriptContent, setEditedScriptContent] = useState('');
  const [editingScriptType, setEditingScriptType] = useState('');
  const [customScripts, setCustomScripts] = useState({});
  
  // Meeting modal states
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingData, setMeetingData] = useState({
    date: '',
    time: '',
    notes: '',
    link: '',
    status: 'scheduled'
  });

  const scriptTypes = [
    { id: 'email', label: 'Email', icon: Mail, color: 'text-[#5B7CFA]' },
    { id: 'dm', label: 'DM', icon: MessageCircle, color: 'text-pink-400' },
    { id: 'whatsapp', label: 'WhatsApp', icon: Phone, color: 'text-emerald-400' },
    { id: 'call', label: 'Call', icon: Phone, color: 'text-amber-400' },
  ];

  const filterOptions = [
    { value: 'all', label: '📊 All Leads' },
    { value: 'hot', label: '🔥 Hot' },
    { value: 'warm', label: '🟠 Warm' },
    { value: 'cool', label: '🔵 Cool' },
    { value: 'needs_review', label: '⚠️ Review' },
    { value: 'new', label: '🆕 New' },
    { value: 'contacted', label: '📤 Contacted' },
    { value: 'replied', label: '💬 Replied' },
    { value: 'no_reply', label: '❌ No Reply' },
    { value: 'follow_up', label: '🔄 Follow-up' },
    { value: 'meeting_booked', label: '📅 Meeting' },
    { value: 'won', label: '🏆 Won' },
    { value: 'lost', label: '💔 Lost' },
  ];

  // ============================================================
  // DATA LOADING
  // ============================================================

  async function loadLeads() {
    setLoading(true);
    const { data } = await supabase
      .from('discovered_leads')
      .select('*, website_reports(*), outreach_messages(*)')
      .order('created_at', { ascending: false });
    setLeads(data || []);
    if (data?.length && !selectedId) setSelectedId(data[0].id);
    setLoading(false);
  }

  useEffect(() => {
    loadLeads();
  }, []);

  // ============================================================
  // FILTERING
  // ============================================================

  const getFilteredLeads = () => {
    let filtered = leads;

    if (search) {
      filtered = filtered.filter(l => 
        l.business_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.industry_category?.toLowerCase().includes(search.toLowerCase()) ||
        l.suburb?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filterType === 'all') {
      filtered = filtered;
    } else if (filterType === 'hot') {
      filtered = filtered.filter(l => 
        l.eval_opportunity_level === '🔥 Hot' && 
        (!l.pipeline_status || l.pipeline_status === 'new' || l.pipeline_status === 'analyzed' || l.pipeline_status === 'drafted')
      );
    } else if (filterType === 'warm') {
      filtered = filtered.filter(l => 
        l.eval_opportunity_level === '🟠 Warm' && 
        (!l.pipeline_status || l.pipeline_status === 'new' || l.pipeline_status === 'analyzed' || l.pipeline_status === 'drafted')
      );
    } else if (filterType === 'cool') {
      filtered = filtered.filter(l => 
        l.eval_opportunity_level === '🔵 Cool' && 
        (!l.pipeline_status || l.pipeline_status === 'new' || l.pipeline_status === 'analyzed' || l.pipeline_status === 'drafted')
      );
    } else if (filterType === 'needs_review') {
      filtered = filtered.filter(l => l.website_status === 'needs_review');
    } else {
      filtered = filtered.filter(l => l.pipeline_status === filterType);
    }

    return filtered;
  };

  const filteredLeads = getFilteredLeads();
  const selected = leads.find(l => l.id === selectedId);
  const report = selected?.website_reports?.[0];
  const message = selected?.outreach_messages?.[0];
  const score = selected?.eval_opportunity_score ?? null;

  // ============================================================
  // STAGE COUNTS
  // ============================================================

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.pipeline_status === s).length;
    return acc;
  }, {});

  const categoryCounts = {
    all: leads.length,
    hot: leads.filter(l => l.eval_opportunity_level === '🔥 Hot' && (!l.pipeline_status || l.pipeline_status === 'new' || l.pipeline_status === 'analyzed' || l.pipeline_status === 'drafted')).length,
    warm: leads.filter(l => l.eval_opportunity_level === '🟠 Warm' && (!l.pipeline_status || l.pipeline_status === 'new' || l.pipeline_status === 'analyzed' || l.pipeline_status === 'drafted')).length,
    cool: leads.filter(l => l.eval_opportunity_level === '🔵 Cool' && (!l.pipeline_status || l.pipeline_status === 'new' || l.pipeline_status === 'analyzed' || l.pipeline_status === 'drafted')).length,
    review: leads.filter(l => l.website_status === 'needs_review').length,
  };

  // ============================================================
  // SCRIPT CONTENT
  // ============================================================

  const getScriptContent = (type) => {
    if (!selected) return '';
    
    const customKey = `${selected.id}_${type}`;
    if (customScripts[customKey]) {
      return customScripts[customKey];
    }
    
    const name = selected.business_name || 'Your Business';
    const industry = selected.industry_category || 'business';
    const location = selected.suburb || 'your area';

    const scripts = {
      email: `Subject: Quick question about ${name}

Hi there,

I came across ${name} while looking for ${industry} in ${location} — your customers clearly rate your work.

I noticed you don't have a website yet. In South Africa, most people search Google before they call — so potential customers are going straight to competitors.

I help small businesses set up a simple, professional website that actually brings in customers.

Would you be open to a 10-minute call to see if it could work for you?

Best,
Wandile
Jigsaw AI`,

      dm: `Hey ${name} Team,

I came across your business while looking for ${industry} in ${location} — you're clearly doing great work.

One thing I noticed — you don't have a website. Anyone who finds you on Google Maps and wants to learn more hits a dead end.

Would it be helpful if I showed you what a simple website could do for ${name}?

Wandile`,

      whatsapp: `Hi ${name} Team,

I'm Wandile from Jigsaw AI. I help small businesses in ${location} get found on Google and attract more customers.

I noticed you don't have a website yet — so when people search for ${industry} in ${location}, they can't find you.

Would you be interested in seeing what a simple, affordable website could look like for your business?

Happy to send a free concept — no obligation.

Wandile`,

      call: `📞 CALL SCRIPT — ${name}

=== STAGE 1: OPEN THE CALL ===

"Hi, is this ${name}? My name is Wandile from Jigsaw AI. I came across your business while researching ${industry} in ${location}."

"I'll keep this quick — I noticed you don't have a website yet, which means you're losing customers to competitors online."

"Would it be okay if I WhatsApp you a couple of examples of what I've done for businesses like yours? Takes 2 minutes."

=== GATEKEEPER SCRIPT ===

"Hi, could I speak with the owner or the person who handles the business's marketing?"

=== OBJECTION HANDLING ===

"We're not interested"
→ "Is it more than you don't need it right now, or not sure the cost is worth it for your business?"

"Send me an email"
→ "Of course — I'll send you some examples of websites I've built for similar businesses."

=== AFTER THE CALL ===

✅ Send WhatsApp within 15 minutes
✅ Update lead status to "Proposal Stage"
✅ Send proposal within 24 hours

🔑 KEY PAIN POINTS:
• No online presence = customers can't find them
• Missing credibility = losing to competitors
• No lead generation = relying only on word of mouth`
    };

    return scripts[type] || '';
  };

  // ============================================================
  // SCRIPT EDITING
  // ============================================================

  function startEditingScript(type) {
    const content = getScriptContent(type);
    setEditedScriptContent(content);
    setEditingScriptType(type);
    setEditingScript(true);
  }

  function cancelEditingScript() {
    setEditingScript(false);
    setEditedScriptContent('');
    setEditingScriptType('');
  }

  async function saveCustomScript() {
    if (!selected) return;
    const customKey = `${selected.id}_${editingScriptType}`;
    setCustomScripts(prev => ({
      ...prev,
      [customKey]: editedScriptContent
    }));
    
    const { error } = await supabase
      .from('discovered_leads')
      .update({
        custom_scripts: {
          ...(selected.custom_scripts || {}),
          [editingScriptType]: editedScriptContent
        }
      })
      .eq('id', selected.id);
    
    if (error) {
      console.error('Error saving custom script:', error);
      alert('Failed to save custom script: ' + error.message);
    } else {
      setEditingScript(false);
      setEditedScriptContent('');
      setEditingScriptType('');
      loadLeads();
    }
  }

  // ============================================================
  // MEETING FUNCTIONS
  // ============================================================

  async function scheduleMeeting(leadId, meetingInfo) {
    const meetingDate = new Date(`${meetingInfo.date}T${meetingInfo.time}`);
    
    const { error } = await supabase
      .from('discovered_leads')
      .update({
        meeting_date: meetingDate.toISOString(),
        meeting_notes: meetingInfo.notes,
        meeting_link: meetingInfo.link,
        meeting_status: 'scheduled',
        pipeline_status: 'meeting_booked'
      })
      .eq('id', leadId);
    
    if (error) {
      alert('Error scheduling meeting: ' + error.message);
    } else {
      setShowMeetingModal(false);
      setMeetingData({
        date: '',
        time: '',
        notes: '',
        link: '',
        status: 'scheduled'
      });
      loadLeads();
      alert('✅ Meeting scheduled successfully!');
    }
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  async function approveWebsite(leadId, website) {
    if (!website || !website.startsWith('http')) {
      alert('Please enter a valid URL starting with http:// or https://');
      return;
    }
    
    const { error } = await supabase
      .from('discovered_leads')
      .update({
        website: website,
        website_status: 'has_website',
        enrichment_log: 'Manually reviewed and approved'
      })
      .eq('id', leadId);
    
    if (error) {
      alert('Error updating: ' + error.message);
    } else {
      loadLeads();
      setShowReviewModal(false);
      setReviewLead(null);
      setReviewWebsite('');
    }
  }

  async function rejectWebsite(leadId) {
    const { error } = await supabase
      .from('discovered_leads')
      .update({
        website_status: 'confirmed_no_website',
        enrichment_log: 'Manually reviewed - no website found'
      })
      .eq('id', leadId);
    
    if (error) {
      alert('Error updating: ' + error.message);
    } else {
      loadLeads();
      setShowReviewModal(false);
      setReviewLead(null);
    }
  }

  function openReviewModal(lead) {
    setReviewLead(lead);
    setReviewWebsite(lead.website || '');
    setShowReviewModal(true);
  }

  // ============================================================
  // SEND SCRIPT WITH EMAIL
  // ============================================================

  async function sendScript(leadId, channel, content) {
    setSendingScript(channel);
    setSendingStatus('Preparing...');

    try {
      const lead = leads.find(l => l.id === leadId);
      
      if (!lead) {
        alert('Lead not found');
        setSendingScript(null);
        return;
      }

      if (channel === 'email') {
        setSendingStatus('Checking email...');
        
        if (!lead.email) {
          alert('❌ No email address found for this lead.');
          setSendingScript(null);
          return;
        }

        let subject = `Website for ${lead.business_name}`;
        let messageBody = content;
        
        const subjectMatch = content.match(/Subject: (.*?)(?:\n|$)/);
        if (subjectMatch) {
          subject = subjectMatch[1].trim();
          messageBody = content.replace(/Subject: .*?(?:\n|$)/, '').trim();
        }

        setSendingStatus('Sending email...');

        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: lead.email,
            subject: subject,
            message: messageBody,
            leadId: leadId,
            channel: channel
          })
        });

        const result = await response.json();

        if (!response.ok) {
          alert(`❌ Failed to send email: ${result.error || 'Unknown error'}`);
          setSendingScript(null);
          return;
        }

        setSendingStatus('Saving to database...');

        const { error } = await supabase
          .from('outreach_messages')
          .insert({
            lead_id: leadId,
            channel: channel,
            message_body: content,
            status: 'sent',
            sent_at: new Date().toISOString()
          });
        
        if (error) {
          alert('⚠️ Email sent but failed to save to database: ' + error.message);
        } else {
          await supabase
            .from('discovered_leads')
            .update({ pipeline_status: 'contacted' })
            .eq('id', leadId);
          
          alert(`✅ Email sent successfully to ${lead.email}!`);
          loadLeads();
        }
      } else {
        setSendingStatus(`Saving ${channel}...`);
        
        const { error } = await supabase
          .from('outreach_messages')
          .insert({
            lead_id: leadId,
            channel: channel,
            message_body: content,
            status: 'sent',
            sent_at: new Date().toISOString()
          });
        
        if (error) {
          alert('Error saving: ' + error.message);
        } else {
          await supabase
            .from('discovered_leads')
            .update({ pipeline_status: 'contacted' })
            .eq('id', leadId);
          
          alert(`✅ ${channel.charAt(0).toUpperCase() + channel.slice(1)} saved as sent!`);
          loadLeads();
        }
      }
    } catch (err) {
      alert('Error sending: ' + err.message);
    } finally {
      setSendingScript(null);
      setSendingStatus('');
    }
  }

  // ============================================================
  // UPDATE PIPELINE STATUS
  // ============================================================

  async function updatePipelineStatus(leadId, status) {
    try {
      const { error } = await supabase
        .from('discovered_leads')
        .update({ 
          pipeline_status: status
        })
        .eq('id', leadId);
      
      if (error) {
        alert('Error updating status: ' + error.message);
      } else {
        await loadLeads();
        const { data } = await supabase
          .from('discovered_leads')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1);
        if (data?.length) setSelectedId(data[0].id);
        setFilterType(status);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function markNoReply(leadId) {
    await updatePipelineStatus(leadId, 'no_reply');
  }

  async function markFollowUp(leadId) {
    await updatePipelineStatus(leadId, 'follow_up');
  }

  // ============================================================
  // STATS
  // ============================================================

  const hotCount = leads.filter(l => l.eval_opportunity_level === '🔥 Hot' && (!l.pipeline_status || l.pipeline_status === 'new' || l.pipeline_status === 'analyzed' || l.pipeline_status === 'drafted')).length;
  const needsReviewCount = leads.filter(l => l.website_status === 'needs_review').length;
  const draftCount = leads.filter(l => l.outreach_messages?.[0]?.status === 'draft').length;
  const noReplyCount = leads.filter(l => l.pipeline_status === 'no_reply').length;
  const followUpCount = leads.filter(l => l.pipeline_status === 'follow_up').length;
  const contactedCount = leads.filter(l => l.pipeline_status === 'contacted').length;
  const totalCount = leads.length;

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#090D18]">
        <div className="text-slate-400 text-lg">Loading your leads...</div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex h-screen bg-[#090D18] text-slate-200 overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-56 bg-[#0D1424] border-r border-[#18233D] flex flex-col p-5 shrink-0">
        <div className="flex items-center gap-2.5 mb-10 px-2">
          <div className="w-8 h-8 rounded-xl bg-[#5B7CFA] flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-[#5B7CFA]/20">J</div>
          <span className="font-semibold text-white text-sm tracking-tight">Jigsaw AI</span>
        </div>
        <nav className="flex flex-col gap-0.5 text-sm">
          <a href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#5B7CFA]/10 text-[#5B7CFA] text-sm font-medium">
            <LayoutDashboard size={17} /> Dashboard
          </a>
          <a href="/leads" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#18233D] transition-colors text-sm">
            <Users size={17} /> Leads
          </a>
          <a href="/pipeline" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#18233D] transition-colors text-sm">
            <Kanban size={17} /> Pipeline
          </a>
          <a href="/outreach" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#18233D] transition-colors text-sm">
            <Mail size={17} /> Outreach
          </a>
          <a href="/calendar" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#18233D] transition-colors text-sm">
            <CalendarIcon size={17} /> Calendar
          </a>
          <a href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#18233D] transition-colors text-sm">
            <Settings size={17} /> Settings
          </a>
          <a href="/imports" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#18233D] transition-colors text-sm mt-4 border-t border-[#18233D] pt-4">
            <Upload size={17} /> Import
          </a>
        </nav>
        <div className="mt-auto bg-[#131C31] rounded-2xl p-4 border border-[#18233D]">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">🔥 Hot</span>
            <span className="text-white font-medium">{hotCount}</span>
          </div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">📤 Contacted</span>
            <span className="text-amber-400 font-medium">{contactedCount}</span>
          </div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">❌ No Reply</span>
            <span className="text-red-400 font-medium">{noReplyCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">🔄 Follow-up</span>
            <span className="text-orange-400 font-medium">{followUpCount}</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b border-[#18233D] px-8 flex items-center justify-between shrink-0 bg-[#090D18]">
          <h1 className="text-lg font-semibold text-white">
            {filterType === 'all' ? '📊 All Leads' :
             filterType === 'hot' ? '🔥 Hot Leads' :
             filterType === 'warm' ? '🟠 Warm Leads' :
             filterType === 'cool' ? '🔵 Cool Leads' :
             filterType === 'needs_review' ? '⚠️ Needs Review' :
             filterType === 'contacted' ? '📤 Contacted' :
             filterType === 'no_reply' ? '❌ No Reply' :
             filterType === 'follow_up' ? '🔄 Follow-up' :
             filterType === 'replied' ? '💬 Replied' :
             filterType === 'meeting_booked' ? '📅 Meeting' :
             filterType === 'won' ? '🏆 Won' :
             filterType === 'lost' ? '💔 Lost' :
             filterType === 'new' ? '🆕 New' : 'Leads'}
            <span className="text-sm font-normal text-slate-500 ml-3">({filteredLeads.length})</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-amber-400">{contactedCount} contacted</span>
            <span className="text-xs text-red-400">{noReplyCount} no reply</span>
            <span className="text-xs text-orange-400">{followUpCount} follow-up</span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* LEAD LIST */}
          <div className="w-80 border-r border-[#18233D] flex flex-col bg-[#0D1424] shrink-0">
            <div className="p-4 border-b border-[#18233D]">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Search leads..."
                  className="w-full h-12 bg-[#131C31] text-white text-sm rounded-xl pl-10 pr-3 border-0 focus:ring-1 focus:ring-[#5B7CFA] outline-none placeholder-slate-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterType(opt.value)}
                    className={`text-[10px] px-2.5 py-1 rounded-full transition-colors ${
                      filterType === opt.value
                        ? 'bg-[#5B7CFA] text-white'
                        : 'text-slate-400 hover:text-slate-200 bg-[#131C31] border border-[#18233D]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredLeads.map((lead) => {
                const leadScore = lead.eval_opportunity_score ?? null;
                const needsReview = lead.website_status === 'needs_review';
                const isSelected = selectedId === lead.id;
                const isNoReply = lead.pipeline_status === 'no_reply';
                const isFollowUp = lead.pipeline_status === 'follow_up';
                const isContacted = lead.pipeline_status === 'contacted';

                let statusLabel = lead.pipeline_status ? STAGE_LABELS[lead.pipeline_status] : 'New';
                let statusColor = '';
                if (lead.eval_opportunity_level === '🔥 Hot' && (!lead.pipeline_status || lead.pipeline_status === 'new' || lead.pipeline_status === 'analyzed' || lead.pipeline_status === 'drafted')) { 
                  statusLabel = 'Hot'; 
                  statusColor = 'text-rose-400'; 
                } else if (lead.eval_opportunity_level === '🟠 Warm' && (!lead.pipeline_status || lead.pipeline_status === 'new' || lead.pipeline_status === 'analyzed' || lead.pipeline_status === 'drafted')) { 
                  statusLabel = 'Warm'; 
                  statusColor = 'text-orange-400'; 
                } else if (lead.eval_opportunity_level === '🔵 Cool' && (!lead.pipeline_status || lead.pipeline_status === 'new' || lead.pipeline_status === 'analyzed' || lead.pipeline_status === 'drafted')) { 
                  statusLabel = 'Cool'; 
                  statusColor = 'text-sky-400'; 
                } else if (needsReview) { 
                  statusLabel = 'Review'; 
                  statusColor = 'text-amber-400'; 
                } else if (isNoReply) { 
                  statusLabel = 'No Reply'; 
                  statusColor = 'text-red-400'; 
                } else if (isFollowUp) { 
                  statusLabel = 'Follow-up'; 
                  statusColor = 'text-orange-400'; 
                } else if (isContacted) { 
                  statusLabel = 'Contacted'; 
                  statusColor = 'text-amber-400'; 
                } else if (lead.pipeline_status === 'won') { 
                  statusLabel = 'Won'; 
                  statusColor = 'text-emerald-400'; 
                } else if (lead.pipeline_status === 'lost') { 
                  statusLabel = 'Lost'; 
                  statusColor = 'text-rose-400'; 
                } else { 
                  statusColor = 'text-slate-500'; 
                }

                return (
                  <div
                    key={lead.id}
                    className={`px-4 py-4 border-l-2 transition-all cursor-pointer hover:bg-[#131C31] ${
                      isSelected ? 'bg-[#131C31] border-l-[#5B7CFA]' : 'border-l-transparent'
                    } ${isNoReply ? 'border-l-red-500/50' : ''} ${isFollowUp ? 'border-l-orange-500/50' : ''} ${isContacted ? 'border-l-amber-500/50' : ''}`}
                    onClick={() => setSelectedId(lead.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{lead.business_name}</div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">{lead.suburb || 'Unknown'}</div>
                      </div>
                      <div className="flex flex-col items-end ml-3 shrink-0">
                        <span className={`text-[10px] font-medium ${statusColor}`}>{statusLabel}</span>
                        {leadScore !== null && (
                          <span className="text-[10px] text-slate-500 mt-0.5">{leadScore}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredLeads.length === 0 && (
                <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                  {filterType === 'all' ? 'No leads found' :
                   filterType === 'hot' ? 'No hot leads found' :
                   filterType === 'warm' ? 'No warm leads found' :
                   filterType === 'cool' ? 'No cool leads found' :
                   `No leads in ${filterType} category`}
                </div>
              )}
            </div>
          </div>

          {/* LEAD DETAIL */}
          <div className="flex-1 overflow-y-auto p-8 bg-[#090D18]">
            {selected ? (
              <div className="max-w-5xl mx-auto space-y-6">
                {/* Hero Card */}
                <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl p-8 shadow-[0_10px_35px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,255,255,0.04)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-white">{selected.business_name}</h1>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Building2 size={14} className="text-slate-500" />
                          {selected.industry_category || 'No category'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={14} className="text-slate-500" />
                          {selected.suburb || 'No location'}
                        </span>
                        {selected.phone && (
                          <a href={`tel:${selected.phone}`} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                            <Phone size={14} className="text-slate-500" />
                            {selected.phone}
                          </a>
                        )}
                        {selected.email && (
                          <a href={`mailto:${selected.email}`} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                            <MailIcon size={14} className="text-slate-500" />
                            {selected.email}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={selected.pipeline_status || 'new'}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          if (newStatus === 'meeting_booked') {
                            setShowMeetingModal(true);
                            setMeetingData({
                              date: '',
                              time: '',
                              notes: '',
                              link: '',
                              status: 'scheduled'
                            });
                          } else {
                            updatePipelineStatus(selected.id, newStatus);
                          }
                        }}
                        className="bg-[#131C31] text-white text-sm px-3 py-2 rounded-xl border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
                      >
                        {STAGES.map((stage) => (
                          <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>
                        ))}
                      </select>
                      {selected.website && (
                        <a
                          href={selected.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#131C31] hover:bg-[#18233D] text-white text-sm px-4 py-2 rounded-xl border border-[#18233D] transition-colors flex items-center gap-1.5"
                        >
                          <ExternalLink size={14} /> Visit
                        </a>
                      )}
                      {selected.website_status === 'needs_review' && (
                        <button
                          onClick={() => openReviewModal(selected)}
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-sm px-4 py-2 rounded-xl border border-amber-500/20 transition-colors flex items-center gap-1.5"
                        >
                          <Eye size={14} /> Review
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full border ${getStatusColor(selected.website_status)} border-[#18233D]`}>
                      {selected.website_status === 'has_website' ? '🌐 Has Website' :
                       selected.website_status === 'needs_review' ? '⚠️ Needs Review' :
                       selected.website_status === 'confirmed_no_website' ? '📱 No Website' :
                       '❓ Unknown'}
                    </span>
                    {selected.pipeline_status && (
                      <span className={`text-[10px] px-2.5 py-1 rounded-full border ${STAGE_COLORS[selected.pipeline_status]?.replace('bg-', 'text-') || 'text-slate-500'} border-[#18233D]`}>
                        {STAGE_LABELS[selected.pipeline_status] || 'New'}
                      </span>
                    )}
                  </div>

                  {/* Score & Insight Row */}
                  <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-[#18233D]">
                    <div className="flex items-center gap-4">
                      <ScoreRing score={score || 0} />
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Opportunity</div>
                        <div className="text-sm font-medium text-white mt-0.5">
                          {score >= 75 ? 'Highest Priority' :
                           score >= 55 ? 'High Priority' :
                           score >= 30 ? 'Medium Priority' :
                           'Low Priority'}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2">
                      {selected?.eval_ai_summary && (
                        <div className="bg-[#131C31] rounded-xl p-4 border border-[#18233D]">
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <Sparkles size={12} className="text-[#5B7CFA]" />
                            <span className="uppercase tracking-wider font-medium">AI Insight</span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {selected.eval_ai_summary}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Two Column Grid */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Website & Solution */}
                  <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl p-6">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">Website & Solution</div>
                    {selected.website ? (
                      <div>
                        <p className="text-sm text-slate-400 break-all">{selected.website}</p>
                        {selected?.eval_recommended_solution && (
                          <div className="mt-4 pt-4 border-t border-[#18233D]">
                            <div className="text-sm font-medium text-white">Recommended Package</div>
                            <div className="text-sm text-[#5B7CFA] mt-1">{selected.eval_recommended_solution.package_type}</div>
                            <div className="text-xs text-slate-500 mt-1.5">
                              {selected.eval_recommended_solution.features?.slice(0, 3).join(' • ')}
                              {selected.eval_recommended_solution.features?.length > 3 && ' • +more'}
                            </div>
                            <div className="text-sm text-white font-medium mt-3">
                              R{selected.eval_recommended_solution.recommended_price}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-amber-400 text-sm font-medium">
                          {selected.website_status === 'needs_review' ? 'Needs Review' : 'No Website Found'}
                        </div>
                        <p className="text-sm text-slate-500 mt-2">
                          {selected.website_status === 'needs_review' 
                            ? 'Found candidates but need manual verification.'
                            : 'This is a great opportunity for a new website.'}
                        </p>
                        {selected.website_status === 'needs_review' && (
                          <button
                            onClick={() => openReviewModal(selected)}
                            className="mt-4 bg-[#5B7CFA] hover:bg-[#7092FF] text-white text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
                          >
                            <Eye size={16} /> Review Now
                          </button>
                        )}
                        {selected?.eval_recommended_solution && (
                          <div className="mt-4 pt-4 border-t border-[#18233D]">
                            <div className="text-sm font-medium text-white">Recommended Package</div>
                            <div className="text-sm text-[#5B7CFA] mt-1">{selected.eval_recommended_solution.package_type}</div>
                            <div className="text-xs text-slate-500 mt-1.5">
                              {selected.eval_recommended_solution.features?.slice(0, 2).join(' • ')}
                              {selected.eval_recommended_solution.features?.length > 2 && ' • +more'}
                            </div>
                            <div className="text-sm text-white font-medium mt-3">
                              R{selected.eval_recommended_solution.recommended_price}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Missed Opportunities */}
                  <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl p-6">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">Missed Opportunities</div>
                    {selected?.eval_missed_opportunities && selected.eval_missed_opportunities.length > 0 ? (
                      <ul className="space-y-2">
                        {selected.eval_missed_opportunities.slice(0, 6).map((item, i) => (
                          <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                            <span className="text-[#5B7CFA]">•</span>
                            {item}
                          </li>
                        ))}
                        {selected.eval_missed_opportunities.length > 6 && (
                          <li className="text-sm text-slate-500">+{selected.eval_missed_opportunities.length - 6} more</li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500">No opportunities identified</p>
                    )}
                  </div>
                </div>

                {/* Outreach Scripts */}
                <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Outreach Scripts</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowFollowups(!showFollowups)}
                        className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-[#18233D] hover:bg-[#131C31] transition-colors flex items-center gap-1.5"
                      >
                        <Repeat size={12} /> Follow-ups
                      </button>
                      <button
                        onClick={() => setShowReplyHandlers(!showReplyHandlers)}
                        className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-[#18233D] hover:bg-[#131C31] transition-colors flex items-center gap-1.5"
                      >
                        <MessageCircle size={12} /> Replies
                      </button>
                    </div>
                  </div>
                  
                  {/* Script Tabs */}
                  <div className="flex gap-1 bg-[#131C31] rounded-xl p-1 mb-4">
                    {scriptTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setActiveScript(type.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                          activeScript === type.id
                            ? 'bg-[#5B7CFA] text-white'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-[#18233D]'
                        }`}
                      >
                        <type.icon size={14} className={activeScript === type.id ? 'text-white' : type.color} />
                        {type.label}
                      </button>
                    ))}
                  </div>

                  {/* Script Content */}
                  <div className="bg-[#090D18] rounded-xl p-4 border border-[#18233D] min-h-[200px]">
                    {(() => {
                      const content = getScriptContent(activeScript);
                      const isEditing = editingScript && editingScriptType === activeScript;
                      
                      return content ? (
                        <div className="space-y-4">
                          {isEditing ? (
                            <div className="space-y-3">
                              <textarea
                                value={editedScriptContent}
                                onChange={(e) => setEditedScriptContent(e.target.value)}
                                className="w-full h-48 bg-[#131C31] text-sm text-slate-200 rounded-xl p-4 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none font-mono"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={saveCustomScript}
                                  className="bg-[#5B7CFA] hover:bg-[#7092FF] text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                                >
                                  <Save size={14} /> Save Script
                                </button>
                                <button
                                  onClick={cancelEditingScript}
                                  className="bg-[#131C31] hover:bg-[#18233D] text-slate-300 text-sm px-4 py-2 rounded-lg border border-[#18233D] transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
                                  {content}
                                </div>
                                <button
                                  onClick={() => startEditingScript(activeScript)}
                                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#131C31] transition-colors"
                                  title="Edit Script"
                                >
                                  <Pencil size={16} />
                                </button>
                              </div>
                              <div className="flex items-center gap-3 pt-4 border-t border-[#18233D]">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(content);
                                    alert('✅ Copied to clipboard!');
                                  }}
                                  className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-[#18233D] hover:bg-[#131C31] transition-colors flex items-center gap-2"
                                >
                                  <Copy size={14} /> Copy
                                </button>
                                <button
                                  onClick={() => sendScript(selected.id, activeScript, content)}
                                  disabled={sendingScript === activeScript}
                                  className={`flex-1 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                    activeScript === 'email' ? 'bg-[#5B7CFA] hover:bg-[#7092FF]' :
                                    activeScript === 'dm' ? 'bg-pink-500 hover:bg-pink-600' :
                                    activeScript === 'whatsapp' ? 'bg-emerald-500 hover:bg-emerald-600' :
                                    'bg-amber-500 hover:bg-amber-600'
                                  }`}
                                >
                                  {sendingScript === activeScript ? (
                                    <span className="flex items-center gap-2">
                                      <Loader2 size={14} className="animate-spin" />
                                      {sendingStatus || 'Sending...'}
                                    </span>
                                  ) : (
                                    <>
                                      <SendHorizontal size={14} /> Send {activeScript.charAt(0).toUpperCase() + activeScript.slice(1)}
                                    </>
                                  )}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 text-center py-8">
                          No {activeScript} script generated yet.
                        </div>
                      );
                    })()}
                  </div>

                  {/* Follow-up Scripts */}
                  {showFollowups && (
                    <div className="mt-4 pt-4 border-t border-[#18233D]">
                      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Follow-up Scripts</div>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(FOLLOWUP_SCRIPTS).map(([key, script]) => (
                          <div key={key} className="bg-[#131C31] rounded-xl p-3 border border-[#18233D]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-slate-300">{script.label}</span>
                              <button
                                onClick={() => {
                                  const content = script.content(selected.business_name);
                                  navigator.clipboard.writeText(content);
                                  alert('✅ Copied to clipboard!');
                                }}
                                className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                              >
                                <Copy size={12} /> Copy
                              </button>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2">{script.content(selected.business_name)}</p>
                            <button
                              onClick={() => {
                                const content = script.content(selected.business_name);
                                sendScript(selected.id, key.includes('email') ? 'email' : 'dm', content);
                              }}
                              className="mt-2 w-full text-xs bg-[#18233D] hover:bg-[#1e2b4a] text-slate-300 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                            >
                              <SendHorizontal size={12} /> Send Follow-up
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reply Handlers */}
                  {showReplyHandlers && (
                    <div className="mt-4 pt-4 border-t border-[#18233D]">
                      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Reply Handlers</div>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(REPLY_HANDLERS).map(([key, handler]) => (
                          <div key={key} className="bg-[#131C31] rounded-xl p-3 border border-[#18233D]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-slate-300">{handler.label}</span>
                              <button
                                onClick={() => {
                                  const content = handler.content(selected.business_name);
                                  navigator.clipboard.writeText(content);
                                  alert('✅ Copied to clipboard!');
                                }}
                                className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                              >
                                <Copy size={12} /> Copy
                              </button>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2">{handler.content(selected.business_name)}</p>
                            <button
                              onClick={() => {
                                const content = handler.content(selected.business_name);
                                sendScript(selected.id, 'reply', content);
                              }}
                              className="mt-2 w-full text-xs bg-[#18233D] hover:bg-[#1e2b4a] text-slate-300 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                            >
                              <SendHorizontal size={12} /> Send Reply
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => markNoReply(selected.id)}
                        className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
                      >
                        <XCircle size={12} /> No Reply
                      </button>
                      <button
                        onClick={() => markFollowUp(selected.id)}
                        className="text-xs text-orange-400 hover:text-orange-300 px-3 py-1.5 rounded-lg border border-orange-500/20 hover:bg-orange-500/10 transition-colors flex items-center gap-1.5"
                      >
                        <Repeat size={12} /> Follow-up
                      </button>
                      <button
                        onClick={() => updatePipelineStatus(selected.id, 'contacted')}
                        className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-[#18233D] hover:bg-[#131C31] transition-colors flex items-center gap-1.5"
                      >
                        <Phone size={12} /> Log Call
                      </button>
                    </div>
                  </div>
                </div>

                {/* Previous Draft */}
                {message ? (
                  <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Previous Draft</div>
                    </div>
                    <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                      {message.message_body}
                    </p>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={async () => {
                          await supabase
                            .from('outreach_messages')
                            .update({ status: 'sent' })
                            .eq('id', message.id);
                          await supabase
                            .from('discovered_leads')
                            .update({ pipeline_status: 'contacted' })
                            .eq('id', selected.id);
                          loadLeads();
                        }}
                        disabled={message.status === 'sent'}
                        className="bg-[#5B7CFA] hover:bg-[#7092FF] text-white text-sm px-5 py-2 rounded-xl disabled:opacity-40 transition-colors flex items-center gap-1.5"
                      >
                        {message.status === 'sent' ? '✓ Sent' : 'Approve & Send'}
                      </button>
                      <button
                        onClick={async () => {
                          const res = await fetch('/api/regenerate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ leadId: selected.id })
                          });
                          if (res.ok) loadLeads();
                        }}
                        className="bg-[#131C31] hover:bg-[#18233D] text-slate-300 text-sm px-5 py-2 rounded-xl border border-[#18233D] transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw size={14} /> Regenerate
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl p-6 text-center text-slate-500 text-sm">
                    No outreach message yet. Send one using the scripts above.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                Select a lead from the list to view details
              </div>
            )}
          </div>
        </div>

        {/* KPI Footer */}
        <div className="h-20 border-t border-[#18233D] px-8 flex items-center gap-4 shrink-0 bg-[#0D1424]">
          <StatCard icon={UsersIcon} label="Total Leads" value={totalCount} />
          <StatCard icon={TrendingUp} label="Hot Leads" value={hotCount} />
          <StatCard icon={AlertCircle} label="Needs Review" value={needsReviewCount} />
          <StatCard icon={Send} label="Drafts Ready" value={draftCount} />
          <div className="flex-1 flex justify-end gap-4">
            {STAGES.map(s => {
              const count = stageCounts[s] || 0;
              const Icon = STAGE_ICONS[s] || AlertCircle;
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <Icon size={12} className={`${STAGE_COLORS[s]?.replace('bg-', 'text-') || 'text-slate-500'}`} />
                  <span className="text-[10px] text-slate-500">{STAGE_LABELS[s]}</span>
                  <span className="text-xs font-medium text-white">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MEETING MODAL */}
      {showMeetingModal && selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Schedule Meeting</h2>
                  <p className="text-sm text-slate-400">{selected.business_name}</p>
                </div>
                <button
                  onClick={() => setShowMeetingModal(false)}
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
                    value={meetingData.date}
                    onChange={(e) => setMeetingData({...meetingData, date: e.target.value})}
                    className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white block mb-1.5">Time</label>
                  <input
                    type="time"
                    value={meetingData.time}
                    onChange={(e) => setMeetingData({...meetingData, time: e.target.value})}
                    className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white block mb-1.5">Meeting Link (optional)</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={meetingData.link}
                    onChange={(e) => setMeetingData({...meetingData, link: e.target.value})}
                    className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white block mb-1.5">Notes</label>
                  <textarea
                    value={meetingData.notes}
                    onChange={(e) => setMeetingData({...meetingData, notes: e.target.value})}
                    placeholder="Meeting agenda, topics to discuss..."
                    className="w-full h-24 bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
                  />
                </div>

                <button
                  onClick={() => scheduleMeeting(selected.id, meetingData)}
                  className="w-full bg-[#5B7CFA] hover:bg-[#7092FF] text-white px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <CalendarIcon2 size={16} /> Schedule Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {showReviewModal && reviewLead && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Review Lead</h2>
                  <p className="text-sm text-slate-400">{reviewLead.business_name}</p>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-[#18233D] rounded-xl"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-[#131C31] rounded-xl p-4 border border-[#18233D]">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-400">Industry:</div>
                    <div className="text-white">{reviewLead.industry_category || 'Unknown'}</div>
                    <div className="text-slate-400">Location:</div>
                    <div className="text-white">{reviewLead.suburb || 'Unknown'}</div>
                    <div className="text-slate-400">Phone:</div>
                    <div className="text-white">{reviewLead.phone || 'Not available'}</div>
                    <div className="text-slate-400">Brabys URL:</div>
                    <div className="text-white truncate">
                      {reviewLead.brabys_url ? (
                        <a href={reviewLead.brabys_url} target="_blank" rel="noopener noreferrer" className="text-[#5B7CFA] hover:text-[#7092FF]">
                          View Brabys
                        </a>
                      ) : 'Not available'}
                    </div>
                  </div>
                </div>

                {reviewLead.enrichment_log && (
                  <div className="bg-[#131C31] rounded-xl p-4 border border-[#18233D]">
                    <div className="text-sm font-medium text-white mb-2">Enrichment Attempts</div>
                    <div className="text-xs text-slate-400 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                      {reviewLead.enrichment_log}
                    </div>
                  </div>
                )}

                <div className="bg-[#131C31] rounded-xl p-4 border border-[#18233D]">
                  <label className="text-sm font-medium text-white block mb-2">
                    Enter the website URL if found:
                  </label>
                  <input
                    type="text"
                    value={reviewWebsite}
                    onChange={(e) => setReviewWebsite(e.target.value)}
                    placeholder="https://www.example.co.za"
                    className="w-full bg-[#090D18] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Include http:// or https://. Leave blank if no website exists.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => approveWebsite(reviewLead.id, reviewWebsite)}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                  >
                    <Check size={18} /> Approve Website
                  </button>
                  <button
                    onClick={() => rejectWebsite(reviewLead.id)}
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                  >
                    <X size={18} /> No Website
                  </button>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="w-full text-slate-400 hover:text-white text-sm py-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}