'use client';
// Add this at the top of the file with other imports
import { Archive } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Users, 
  Search, 
  Filter,
  Phone,
  Mail as MailIcon,
  MapPin,
  Building2,
  ExternalLink,
  Clock,
  Send,
  CheckCircle,
  XCircle,
  Repeat,
  Calendar as CalendarIcon,
  Eye,
  TrendingUp,
  AlertCircle,
  Download,
  Upload,
  Plus
} from 'lucide-react';

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

function ScoreBadge({ score }) {
  if (score === null || score === undefined) return null;
  
  let color = 'bg-slate-500/20 text-slate-400';
  let label = 'Low';
  
  if (score >= 75) { color = 'bg-rose-500/20 text-rose-400'; label = 'Hot'; }
  else if (score >= 55) { color = 'bg-orange-500/20 text-orange-400'; label = 'Warm'; }
  else if (score >= 30) { color = 'bg-sky-500/20 text-sky-400'; label = 'Cool'; }
  
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full ${color}`}>
      {label} {score}
    </span>
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

export default function CampaignLeadsPage() {
  const params = useParams();
  const campaignId = params.id;
  
  const [campaign, setCampaign] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetails, setShowDetails] = useState({});

  async function loadCampaignData() {
    setLoading(true);
    
    // Get campaign info
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    setCampaign(campaignData);

    // Get leads for this campaign
    const { data: leadsData } = await supabase
      .from('discovered_leads')
      .select('*, website_reports(*), outreach_messages(*)')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
    
    setLeads(leadsData || []);
    setLoading(false);
  }

  useEffect(() => {
    if (campaignId) {
      loadCampaignData();
    }
  }, [campaignId]);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.business_name?.toLowerCase().includes(search.toLowerCase()) ||
                         lead.suburb?.toLowerCase().includes(search.toLowerCase()) ||
                         lead.industry_category?.toLowerCase().includes(search.toLowerCase());
    const matchesStage = filterStage === 'all' || lead.pipeline_status === filterStage;
    return matchesSearch && matchesStage;
  });

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.pipeline_status === s).length;
    return acc;
  }, {});

  const isArchived = campaign?.is_archived || campaign?.status === 'archived';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#090D18]">
        <div className="text-slate-400 text-lg">Loading leads...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#090D18]">
        <div className="text-slate-400 text-lg">Campaign not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090D18] text-slate-200">
      {/* Header */}
      <div className="border-b border-[#18233D] bg-[#0D1424] px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href={`/campaigns/${campaignId}/dashboard`} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft size={18} /> Back
          </Link>
          <h1 className="text-xl font-bold text-white">{campaign.name}</h1>
          <span className="text-sm text-slate-500">{leads.length} leads</span>
          {isArchived && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/20">
              📦 Archived
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isArchived && (
            <Link
              href={`/campaigns/${campaignId}/import`}
              className="bg-[#5B7CFA] hover:bg-[#7092FF] text-white text-sm px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
            >
              <Upload size={16} /> Import Leads
            </Link>
          )}
          <button
            onClick={() => {
              // Export leads as CSV
              const headers = ['Business Name', 'Phone', 'Email', 'Address', 'Website', 'Category', 'Suburb', 'Status', 'Score'];
              const rows = leads.map(l => [
                l.business_name,
                l.phone || '',
                l.email || '',
                l.address || '',
                l.website || '',
                l.industry_category || '',
                l.suburb || '',
                l.pipeline_status || '',
                l.eval_opportunity_score || ''
              ]);
              const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${campaign.name}-leads.csv`;
              a.click();
            }}
            className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-xl border border-[#18233D] hover:bg-[#131C31] transition-colors flex items-center gap-2"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="border-b border-[#18233D] bg-[#0D1424] px-8 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search leads..."
              className="w-full bg-[#131C31] text-white text-sm rounded-xl pl-10 pr-4 py-2 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none placeholder-slate-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterStage('all')}
              className={`text-[10px] px-3 py-1.5 rounded-full transition-colors ${
                filterStage === 'all' ? 'bg-[#5B7CFA] text-white' : 'text-slate-400 hover:text-white bg-[#131C31] border border-[#18233D]'
              }`}
            >
              All ({leads.length})
            </button>
            {STAGES.map((stage) => (
              <button
                key={stage}
                onClick={() => setFilterStage(stage)}
                className={`text-[10px] px-3 py-1.5 rounded-full transition-colors ${
                  filterStage === stage ? 'bg-[#5B7CFA] text-white' : 'text-slate-400 hover:text-white bg-[#131C31] border border-[#18233D]'
                }`}
              >
                {STAGE_LABELS[stage]} ({stageCounts[stage] || 0})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="p-8">
        <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl overflow-hidden">
          {isArchived && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-sm text-amber-400 flex items-center gap-2">
              <Archive size={16} /> This campaign is archived and read-only.
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#18233D] bg-[#131C31]">
                  <th className="text-left text-xs font-medium text-slate-400 px-4 py-3 uppercase tracking-wider">Business</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-4 py-3 uppercase tracking-wider">Location</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-4 py-3 uppercase tracking-wider">Contact</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-4 py-3 uppercase tracking-wider">Status</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-4 py-3 uppercase tracking-wider">Score</th>
                  <th className="text-right text-xs font-medium text-slate-400 px-4 py-3 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-[#18233D] hover:bg-[#131C31]/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-white">{lead.business_name}</div>
                        <div className="text-xs text-slate-500">{lead.industry_category || 'No category'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-slate-400">
                        <MapPin size={14} className="text-slate-500" />
                        {lead.suburb || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5 text-xs">
                        {lead.phone && <div className="text-slate-400">📞 {lead.phone}</div>}
                        {lead.email && <div className="text-slate-400">✉️ {lead.email}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.pipeline_status || 'new'} />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={lead.eval_opportunity_score} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#18233D] transition-colors"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <Link
                          href={`/campaigns/${campaignId}/leads/${lead.id}`}
                          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#18233D] transition-colors"
                        >
                          <Eye size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-500">
                      No leads found in this campaign.
                      {!isArchived && (
                        <Link
                          href={`/campaigns/${campaignId}/import`}
                          className="text-[#5B7CFA] hover:text-[#7092FF] ml-2"
                        >
                          Import leads →
                        </Link>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}