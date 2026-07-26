'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Plus, 
  Users, 
  Calendar, 
  Building2, 
  Clock, 
  Archive, 
  ChevronDown, 
  ChevronRight,
  X,
  ArrowLeft,
  TrendingUp,
  Send,
  CheckCircle,
  XCircle,
  Repeat,
  Calendar as CalendarIcon,
  Eye,
  Filter,
  Search,
  LayoutDashboard,
  Settings,
  Mail,
  Kanban,
  Upload,
  MoreHorizontal,
  Copy,
  Trash2
} from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = [2024, 2025, 2026, 2027, 2028];

function getStatusColor(status) {
  switch (status) {
    case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
    case 'archived': return 'bg-slate-500/20 text-slate-400 border-slate-500/20';
    case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/20';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'active': return '● Active';
    case 'archived': return '📦 Archived';
    case 'completed': return '✅ Completed';
    default: return 'Unknown';
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function CampaignCard({ campaign, onArchive, onDuplicate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const leadCount = campaign.lead_count || 0;
  const hotCount = campaign.hot_count || 0;
  const warmCount = campaign.warm_count || 0;
  const coolCount = campaign.cool_count || 0;
  const wonCount = campaign.won_count || 0;
  const lostCount = campaign.lost_count || 0;

  const isActive = campaign.status === 'active' && !campaign.is_archived;

  // Calculate campaign duration
  const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
  const endDate = campaign.end_date ? new Date(campaign.end_date) : null;
  const isCurrentWeek = startDate && endDate && 
    new Date() >= startDate && new Date() <= endDate;

  return (
    <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,255,255,0.04)] hover:border-[#18233D]/60 transition-all">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-semibold text-white truncate">{campaign.name}</h3>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full border ${getStatusColor(campaign.status)}`}>
                {getStatusLabel(campaign.status)}
              </span>
              {isCurrentWeek && campaign.status === 'active' && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">
                  ⏳ Current
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Building2 size={12} className="text-slate-500" />
                {campaign.industry || 'No industry'}
              </span>
              {campaign.week_number && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} className="text-slate-500" />
                  Week {campaign.week_number}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-slate-500" />
                {campaign.month || ''} {campaign.year || ''}
              </span>
              {startDate && endDate && (
                <span className="flex items-center gap-1 text-slate-500">
                  <CalendarIcon size={12} className="text-slate-500" />
                  {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-3 shrink-0">
            <Link
              href={`/campaigns/${campaign.id}/dashboard`}
              className="bg-[#5B7CFA] hover:bg-[#7092FF] text-white text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <LayoutDashboard size={14} /> Open
            </Link>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#18233D] transition-colors"
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#18233D] transition-colors"
              >
                <MoreHorizontal size={16} />
              </button>
              {showActions && (
                <div className="absolute right-0 mt-1 w-48 bg-[#131C31] border border-[#18233D] rounded-xl shadow-lg z-10 py-1">
                  {isActive && (
                    <button
                      onClick={() => onArchive(campaign.id)}
                      className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-[#18233D] transition-colors flex items-center gap-2"
                    >
                      <Archive size={14} /> Archive
                    </button>
                  )}
                  <button
                    onClick={() => onDuplicate(campaign.id)}
                    className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-[#18233D] transition-colors flex items-center gap-2"
                  >
                    <Copy size={14} /> Duplicate
                  </button>
                  <button
                    onClick={() => onDelete(campaign.id)}
                    className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row - Fixed: Added the stats display properly */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-[#131C31] rounded-xl p-3 text-center">
            <div className="text-xs text-slate-400">Hot</div>
            <div className="text-lg font-semibold text-white">{hotCount}</div>
          </div>
          <div className="bg-[#131C31] rounded-xl p-3 text-center">
            <div className="text-xs text-slate-400">Warm</div>
            <div className="text-lg font-semibold text-white">{warmCount}</div>
          </div>
          <div className="bg-[#131C31] rounded-xl p-3 text-center">
            <div className="text-xs text-slate-400">Cool</div>
            <div className="text-lg font-semibold text-white">{coolCount}</div>
          </div>
          <div className="bg-[#131C31] rounded-xl p-3 text-center">
            <div className="text-xs text-slate-400">Won</div>
            <div className="text-lg font-semibold text-emerald-400">{wonCount}</div>
          </div>
          <div className="bg-[#131C31] rounded-xl p-3 text-center">
            <div className="text-xs text-slate-400">Lost</div>
            <div className="text-lg font-semibold text-rose-400">{lostCount}</div>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-[#18233D] space-y-3">
            {campaign.notes && (
              <div className="bg-[#131C31] rounded-xl p-3">
                <div className="text-xs font-medium text-slate-400 mb-1">Notes</div>
                <p className="text-sm text-slate-300">{campaign.notes}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#131C31] rounded-xl p-3">
                <div className="text-slate-400">Created</div>
                <div className="text-white">{formatDate(campaign.created_at)}</div>
              </div>
              <div className="bg-[#131C31] rounded-xl p-3">
                <div className="text-slate-400">Last Updated</div>
                <div className="text-white">{formatDate(campaign.updated_at)}</div>
              </div>
            </div>
            {startDate && endDate && (
              <div className="bg-[#131C31] rounded-xl p-3">
                <div className="text-slate-400">Campaign Duration</div>
                <div className="text-white text-sm">
                  {formatDate(campaign.start_date)} → {formatDate(campaign.end_date)}
                  {isCurrentWeek && <span className="text-emerald-400 ml-2">● Active now</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateCampaignModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [weekNumber, setWeekNumber] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-fill dates based on week number
  const handleWeekChange = (week) => {
    setWeekNumber(week);
    if (week && month && year) {
      // Calculate dates based on week number
      const yearNum = parseInt(year);
      const monthIndex = MONTHS.indexOf(month);
      const firstDayOfMonth = new Date(yearNum, monthIndex, 1);
      const dayOfWeek = firstDayOfMonth.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const firstMonday = new Date(yearNum, monthIndex, 1 + daysToMonday);
      const weekOffset = (parseInt(week) - 1) * 7;
      const start = new Date(firstMonday);
      start.setDate(start.getDate() + weekOffset);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = async () => {
    if (!name) {
      alert('Please enter a campaign name');
      return;
    }
    setLoading(true);
    await onSave({
      name,
      industry: industry || null,
      week_number: weekNumber ? parseInt(weekNumber) : null,
      month: month || null,
      year: year ? parseInt(year) : null,
      start_date: startDate || null,
      end_date: endDate || null,
      notes: notes || null,
      status: 'active'
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">New Campaign</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-[#18233D] rounded-xl"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white block mb-1.5">Campaign Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Plumbers"
                className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white block mb-1.5">Industry</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Plumbing"
                className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-white block mb-1.5">Week</label>
                <select
                  value={weekNumber}
                  onChange={(e) => handleWeekChange(e.target.value)}
                  className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
                >
                  <option value="">Select</option>
                  {[1, 2, 3, 4, 5].map((w) => (
                    <option key={w} value={w}>Week {w}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-white block mb-1.5">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
                >
                  <option value="">Select</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-white block mb-1.5">Month</label>
              <select
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  // Recalculate dates if week is selected
                  if (weekNumber) {
                    handleWeekChange(weekNumber);
                  }
                }}
                className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
              >
                <option value="">Select</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-white block mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white block mb-1.5">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-white block mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Campaign notes..."
                className="w-full h-24 bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-[#5B7CFA] hover:bg-[#7092FF] text-white px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              {loading ? (
                <>⏳ Creating...</>
              ) : (
                <>
                  <Plus size={16} /> Create Campaign
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState({});

  async function loadCampaigns() {
    setLoading(true);
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      const campaignsWithCounts = await Promise.all(data.map(async (campaign) => {
        const { count } = await supabase
          .from('discovered_leads')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id);
        
        const { data: leads } = await supabase
          .from('discovered_leads')
          .select('eval_opportunity_level, pipeline_status')
          .eq('campaign_id', campaign.id);
        
        const hotCount = leads?.filter(l => l.eval_opportunity_level === '🔥 Hot').length || 0;
        const warmCount = leads?.filter(l => l.eval_opportunity_level === '🟠 Warm').length || 0;
        const coolCount = leads?.filter(l => l.eval_opportunity_level === '🔵 Cool').length || 0;
        const wonCount = leads?.filter(l => l.pipeline_status === 'won').length || 0;
        const lostCount = leads?.filter(l => l.pipeline_status === 'lost').length || 0;
        
        return {
          ...campaign,
          lead_count: count || 0,
          hot_count: hotCount,
          warm_count: warmCount,
          cool_count: coolCount,
          won_count: wonCount,
          lost_count: lostCount
        };
      }));
      setCampaigns(campaignsWithCounts);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function createCampaign(data) {
    const { error } = await supabase
      .from('campaigns')
      .insert([{
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);
    
    if (error) {
      alert('Error creating campaign: ' + error.message);
    } else {
      setShowCreateModal(false);
      loadCampaigns();
    }
  }

  async function archiveCampaign(id) {
    if (!confirm('Archive this campaign? It will become read-only.')) return;
    const { error } = await supabase
      .from('campaigns')
      .update({ 
        status: 'archived',
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      alert('Error archiving: ' + error.message);
    } else {
      loadCampaigns();
    }
  }

  async function duplicateCampaign(id) {
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) return;
    
    const { error } = await supabase
      .from('campaigns')
      .insert([{
        name: `${campaign.name} (Copy)`,
        industry: campaign.industry,
        week_number: campaign.week_number,
        month: campaign.month,
        year: campaign.year,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        status: 'active',
        notes: campaign.notes ? `Copied from ${campaign.name}` : '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);
    
    if (error) {
      alert('Error duplicating: ' + error.message);
    } else {
      loadCampaigns();
    }
  }

  async function deleteCampaign(id) {
    if (!confirm('Delete this campaign and all its leads?')) return;
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);
    
    if (error) {
      alert('Error deleting: ' + error.message);
    } else {
      loadCampaigns();
    }
  }

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
                         c.industry?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Group by month/year
  const groupedCampaigns = filteredCampaigns.reduce((acc, campaign) => {
    const key = `${campaign.month || 'Unknown'} ${campaign.year || ''}`.trim() || 'Uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(campaign);
    return acc;
  }, {});

  // Sort groups
  const sortedGroups = Object.keys(groupedCampaigns).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    const monthOrder = MONTHS;
    const aMonth = a.split(' ')[0];
    const bMonth = b.split(' ')[0];
    const aYear = parseInt(a.split(' ')[1]) || 0;
    const bYear = parseInt(b.split(' ')[1]) || 0;
    if (aYear !== bYear) return bYear - aYear;
    return monthOrder.indexOf(bMonth) - monthOrder.indexOf(aMonth);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#090D18]">
        <div className="text-slate-400 text-lg">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090D18] text-slate-200">
      {/* Header */}
      <div className="border-b border-[#18233D] bg-[#0D1424] px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Campaigns</h1>
          <span className="text-sm text-slate-500">{campaigns.length} campaigns</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search campaigns..."
              className="w-48 bg-[#131C31] text-white text-sm rounded-xl pl-10 pr-4 py-2 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none placeholder-slate-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#131C31] text-white text-sm rounded-xl px-3 py-2 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="completed">Completed</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#5B7CFA] hover:bg-[#7092FF] text-white text-sm px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> New Campaign
          </button>
        </div>
      </div>

      {/* Campaign Grid */}
      <div className="p-8">
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-white mb-2">No campaigns yet</h2>
            <p className="text-slate-400 text-sm">Create your first campaign to start organizing leads</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-[#5B7CFA] hover:bg-[#7092FF] text-white px-6 py-2 rounded-xl transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus size={16} /> New Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedGroups.map((group) => {
              const isExpanded = expandedMonths[group] !== false;
              const groupCampaigns = groupedCampaigns[group] || [];
              
              return (
                <div key={group}>
                  <button
                    onClick={() => setExpandedMonths(prev => ({ ...prev, [group]: !prev[group] }))}
                    className="flex items-center gap-3 text-lg font-semibold text-white hover:text-[#5B7CFA] transition-colors mb-4"
                  >
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    {group}
                    <span className="text-sm font-normal text-slate-500">
                      ({groupCampaigns.length} campaigns)
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupCampaigns.map((campaign) => (
                        <CampaignCard
                          key={campaign.id}
                          campaign={campaign}
                          onArchive={archiveCampaign}
                          onDuplicate={duplicateCampaign}
                          onDelete={deleteCampaign}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onSave={createCampaign}
        />
      )}
    </div>
  );
}