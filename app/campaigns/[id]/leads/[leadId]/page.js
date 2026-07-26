'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Phone, 
  Mail as MailIcon, 
  MapPin, 
  Building2, 
  ExternalLink, 
  Clock,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Send,
  Edit,
  Save,
  RefreshCw,
  MessageCircle,
  Copy,
  Sparkles,
  Eye,
  TrendingUp,
  Users,
  Kanban,
  Mail,
  Settings,
  Upload,
  Repeat,
  X,
  Check,
  Loader2,
  Pencil,
  SendHorizontal
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

function StatusBadge({ status }) {
  const color = STAGE_COLORS[status] || 'bg-slate-500';
  const label = STAGE_LABELS[status] || status || 'Unknown';
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white ${color}`}>
      {label}
    </span>
  );
}

function ScriptPanel({ title, icon: Icon, content, color, onEdit }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={15} className={color} />
          <span className="text-xs font-medium text-slate-400">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="text-slate-500 hover:text-slate-300 transition-colors text-[10px] flex items-center gap-1"
          >
            {copied ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={() => onEdit()}
            className="text-slate-500 hover:text-slate-300 transition-colors text-[10px] flex items-center gap-1"
          >
            <Pencil size={12} /> Edit
          </button>
        </div>
      </div>
      <div className="bg-[#090D18] rounded-xl p-3 text-xs text-slate-400 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono leading-relaxed">
        {content || 'No script generated yet'}
      </div>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const campaignId = params.id;
  const leadId = params.leadId;
  
  const [lead, setLead] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeScript, setActiveScript] = useState('email');
  const [editingScript, setEditingScript] = useState(false);
  const [editedScriptContent, setEditedScriptContent] = useState('');
  const [editingScriptType, setEditingScriptType] = useState('');
  const [customScripts, setCustomScripts] = useState({});
  const [sendingScript, setSendingScript] = useState(null);
  const [sendingStatus, setSendingStatus] = useState('');

  const scriptTypes = [
    { id: 'email', label: 'Email', icon: Mail, color: 'text-[#5B7CFA]' },
    { id: 'dm', label: 'DM', icon: MessageCircle, color: 'text-pink-400' },
    { id: 'whatsapp', label: 'WhatsApp', icon: Phone, color: 'text-emerald-400' },
    { id: 'call', label: 'Call', icon: Phone, color: 'text-amber-400' },
  ];

  async function loadLeadData() {
    setLoading(true);
    
    // Get lead with reports and messages
    const { data: leadData } = await supabase
      .from('discovered_leads')
      .select('*, website_reports(*), outreach_messages(*)')
      .eq('id', leadId)
      .single();
    setLead(leadData);

    // Get campaign info
    if (leadData?.campaign_id) {
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', leadData.campaign_id)
        .single();
      setCampaign(campaignData);
    }
    
    setLoading(false);
  }

  useEffect(() => {
    if (leadId) {
      loadLeadData();
    }
  }, [leadId]);

  const getScriptContent = (type) => {
    if (!lead) return '';
    
    const customKey = `${lead.id}_${type}`;
    if (customScripts[customKey]) {
      return customScripts[customKey];
    }
    
    const name = lead.business_name || 'Your Business';
    const industry = lead.industry_category || 'business';
    const location = lead.suburb || 'your area';

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
    if (!lead) return;
    const customKey = `${lead.id}_${editingScriptType}`;
    setCustomScripts(prev => ({
      ...prev,
      [customKey]: editedScriptContent
    }));
    
    const { error } = await supabase
      .from('discovered_leads')
      .update({
        custom_scripts: {
          ...(lead.custom_scripts || {}),
          [editingScriptType]: editedScriptContent
        }
      })
      .eq('id', lead.id);
    
    if (error) {
      alert('Failed to save custom script: ' + error.message);
    } else {
      setEditingScript(false);
      setEditedScriptContent('');
      setEditingScriptType('');
      loadLeadData();
    }
  }

  async function sendScript(leadId, channel, content) {
    setSendingScript(channel);
    setSendingStatus('Preparing...');

    try {
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
          loadLeadData();
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
          loadLeadData();
        }
      }
    } catch (err) {
      alert('Error sending: ' + err.message);
    } finally {
      setSendingScript(null);
      setSendingStatus('');
    }
  }

  async function updatePipelineStatus(status) {
    if (!lead) return;
    const { error } = await supabase
      .from('discovered_leads')
      .update({ pipeline_status: status })
      .eq('id', lead.id);
    
    if (error) {
      alert('Error updating status: ' + error.message);
    } else {
      loadLeadData();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#090D18]">
        <div className="text-slate-400 text-lg">Loading lead...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#090D18]">
        <div className="text-slate-400 text-lg">Lead not found</div>
      </div>
    );
  }

  const report = lead.website_reports?.[0];
  const message = lead.outreach_messages?.[0];
  const score = lead.eval_opportunity_score ?? null;

  return (
    <div className="min-h-screen bg-[#090D18] text-slate-200">
      {/* Header */}
      <div className="border-b border-[#18233D] bg-[#0D1424] px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href={`/campaigns/${campaignId}/leads`} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft size={18} /> Back
          </Link>
          <h1 className="text-xl font-bold text-white">{lead.business_name}</h1>
          <span className="text-sm text-slate-500">{campaign?.name || 'No Campaign'}</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={lead.pipeline_status || 'new'}
            onChange={(e) => updatePipelineStatus(e.target.value)}
            className="bg-[#131C31] text-white text-sm px-3 py-2 rounded-xl border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>
            ))}
          </select>
          <Link
            href="/calendar"
            className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-xl border border-[#18233D] hover:bg-[#131C31] transition-colors flex items-center gap-2"
          >
            <CalendarIcon size={16} /> Calendar
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-8 space-y-6">
        {/* Hero Card */}
        <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl p-8 shadow-[0_10px_35px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="flex flex-wrap items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{lead.business_name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Building2 size={14} className="text-slate-500" />
                  {lead.industry_category || 'No category'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={14} className="text-slate-500" />
                  {lead.suburb || 'No location'}
                </span>
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                    <Phone size={14} className="text-slate-500" />
                    {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                    <MailIcon size={14} className="text-slate-500" />
                    {lead.email}
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <StatusBadge status={lead.pipeline_status || 'new'} />
              {lead.eval_opportunity_level && (
                <span className={`text-[10px] px-2.5 py-1 rounded-full border ${getStatusColor(lead.eval_opportunity_level)} border-[#18233D]`}>
                  {lead.eval_opportunity_level}
                </span>
              )}
              {lead.website && (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] px-2.5 py-1 rounded-full border text-[#5B7CFA] border-[#5B7CFA]/30 hover:bg-[#131C31] transition-colors flex items-center gap-1"
                >
                  <ExternalLink size={12} /> Website
                </a>
              )}
            </div>
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
              {lead?.eval_ai_summary && (
                <div className="bg-[#131C31] rounded-xl p-4 border border-[#18233D]">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <Sparkles size={12} className="text-[#5B7CFA]" />
                    <span className="uppercase tracking-wider font-medium">AI Insight</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {lead.eval_ai_summary}
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
            {lead.website ? (
              <div>
                <p className="text-sm text-slate-400 break-all">{lead.website}</p>
                {lead?.eval_recommended_solution && (
                  <div className="mt-4 pt-4 border-t border-[#18233D]">
                    <div className="text-sm font-medium text-white">Recommended Package</div>
                    <div className="text-sm text-[#5B7CFA] mt-1">{lead.eval_recommended_solution.package_type}</div>
                    <div className="text-xs text-slate-500 mt-1.5">
                      {lead.eval_recommended_solution.features?.slice(0, 3).join(' • ')}
                      {lead.eval_recommended_solution.features?.length > 3 && ' • +more'}
                    </div>
                    <div className="text-sm text-white font-medium mt-3">
                      R{lead.eval_recommended_solution.recommended_price}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="text-amber-400 text-sm font-medium">No Website Found</div>
                <p className="text-sm text-slate-500 mt-2">This is a great opportunity for a new website.</p>
                {lead?.eval_recommended_solution && (
                  <div className="mt-4 pt-4 border-t border-[#18233D]">
                    <div className="text-sm font-medium text-white">Recommended Package</div>
                    <div className="text-sm text-[#5B7CFA] mt-1">{lead.eval_recommended_solution.package_type}</div>
                    <div className="text-xs text-slate-500 mt-1.5">
                      {lead.eval_recommended_solution.features?.slice(0, 2).join(' • ')}
                      {lead.eval_recommended_solution.features?.length > 2 && ' • +more'}
                    </div>
                    <div className="text-sm text-white font-medium mt-3">
                      R{lead.eval_recommended_solution.recommended_price}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Missed Opportunities */}
          <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl p-6">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">Missed Opportunities</div>
            {lead?.eval_missed_opportunities && lead.eval_missed_opportunities.length > 0 ? (
              <ul className="space-y-2">
                {lead.eval_missed_opportunities.slice(0, 6).map((item, i) => (
                  <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                    <span className="text-[#5B7CFA]">•</span>
                    {item}
                  </li>
                ))}
                {lead.eval_missed_opportunities.length > 6 && (
                  <li className="text-sm text-slate-500">+{lead.eval_missed_opportunities.length - 6} more</li>
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
          </div>
          
          {/* Script Tabs */}
          <div className="flex gap-1 bg-[#131C31] rounded-xl p-1 mb-4">
            {scriptTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setActiveScript(type.id);
                  if (editingScript) cancelEditingScript();
                }}
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
                      <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
                        {content}
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
                          onClick={() => startEditingScript(activeScript)}
                          className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-[#18233D] hover:bg-[#131C31] transition-colors flex items-center gap-2"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          onClick={() => sendScript(lead.id, activeScript, content)}
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
                    .eq('id', lead.id);
                  loadLeadData();
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
                    body: JSON.stringify({ leadId: lead.id })
                  });
                  if (res.ok) loadLeadData();
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
    </div>
  );
}