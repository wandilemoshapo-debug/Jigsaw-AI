'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Users, 
  Kanban,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Repeat,
  Calendar as CalendarIcon,
  Phone,
  Mail as MailIcon,
  Building2,
  MapPin,
  Eye,
  ExternalLink
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
const STAGE_ICONS = {
  new: Clock,
  analyzed: Eye,
  drafted: Send,
  contacted: Send,
  replied: CheckCircle,
  no_reply: XCircle,
  follow_up: Repeat,
  meeting_booked: CalendarIcon,
  won: CheckCircle,
  lost: XCircle
};

export default function CampaignPipelinePage() {
  const params = useParams();
  const campaignId = params.id;
  
  const [campaign, setCampaign] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadCampaignData() {
    setLoading(true);
    
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    setCampaign(campaignData);

    // ✅ FIX: Only get leads where campaign_id matches this campaign
    const { data: leadsData } = await supabase
      .from('discovered_leads')
      .select('*')
      .eq('campaign_id', campaignId)  // ✅ Filter by campaign
      .order('created_at', { ascending: false });
    
    setLeads(leadsData || []);
    setLoading(false);
  }

  useEffect(() => {
    if (campaignId) {
      loadCampaignData();
    }
  }, [campaignId]);

  const stageLeads = STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter(l => l.pipeline_status === stage);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#090D18]">
        <div className="text-slate-400 text-lg">Loading pipeline...</div>
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
          <span className="text-sm text-slate-500">Pipeline</span>
          <span className="text-sm text-slate-500">{leads.length} leads</span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-[1200px]">
          {STAGES.map((stage) => {
            const stageLeadsList = stageLeads[stage] || [];
            const Icon = STAGE_ICONS[stage] || Clock;
            const color = STAGE_COLORS[stage] || 'bg-slate-600';
            
            return (
              <div key={stage} className="flex-1 min-w-[140px]">
                <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-xs font-medium text-white">{STAGE_LABELS[stage]}</span>
                    </div>
                    <span className="text-xs text-slate-500">{stageLeadsList.length}</span>
                  </div>
                  
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {stageLeadsList.map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/campaigns/${campaignId}/leads/${lead.id}`}
                        className="block bg-[#131C31] rounded-xl p-3 border border-[#18233D] hover:border-[#18233D]/60 transition-all"
                      >
                        <div className="text-sm font-medium text-white truncate">{lead.business_name}</div>
                        <div className="text-xs text-slate-400 truncate">{lead.suburb || 'No location'}</div>
                        {lead.eval_opportunity_score !== null && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            Score: {lead.eval_opportunity_score}
                          </div>
                        )}
                      </Link>
                    ))}
                    {stageLeadsList.length === 0 && (
                      <div className="text-xs text-slate-500 text-center py-4">
                        No leads
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}