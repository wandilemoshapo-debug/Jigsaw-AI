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
  Phone 
} from 'lucide-react';

const STAGES = ['new', 'analyzed', 'drafted', 'contacted', 'replied', 'meeting_booked', 'won', 'lost'];
const STAGE_LABELS = {
  new: 'New',
  analyzed: 'Analyzed',
  drafted: 'Drafted',
  contacted: 'Contacted',
  replied: 'Replied',
  meeting_booked: 'Meeting Booked',
  won: 'Won',
  lost: 'Lost'
};
const STAGE_COLORS = {
  new: 'bg-slate-600',
  analyzed: 'bg-blue-600',
  drafted: 'bg-purple-600',
  contacted: 'bg-amber-600',
  replied: 'bg-pink-600',
  meeting_booked: 'bg-yellow-500',
  won: 'bg-emerald-600',
  lost: 'bg-red-700'
};

function scoreColor(score) {
  if (score >= 80) return { ring: '#F59E0B', badge: 'bg-amber-500/20 text-amber-400', label: 'Hot' };
  if (score >= 55) return { ring: '#6366F1', badge: 'bg-indigo-500/20 text-indigo-400', label: 'Warm' };
  if (score >= 30) return { ring: '#38BDF8', badge: 'bg-sky-500/20 text-sky-400', label: 'Cool' };
  return { ring: '#64748B', badge: 'bg-slate-500/20 text-slate-400', label: 'Low' };
}

function ScoreRing({ score }) {
  const { ring } = scoreColor(score);
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} stroke="#1E293B" strokeWidth="8" fill="none" />
      <circle 
        cx="44" cy="44" r={r} 
        stroke={ring} strokeWidth="8" fill="none"
        strokeDasharray={c} strokeDashoffset={offset} 
        strokeLinecap="round" transform="rotate(-90 44 44)" 
      />
      <text x="44" y="40" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold">{score}</text>
      <text x="44" y="56" textAnchor="middle" fill="#94A3B8" fontSize="9">/100</text>
    </svg>
  );
}

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [loading, setLoading] = useState(true);

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

  const filtered = leads.filter(l => 
    l.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.industry_category?.toLowerCase().includes(search.toLowerCase()) ||
    l.suburb?.toLowerCase().includes(search.toLowerCase())
  );

  const selected = leads.find(l => l.id === selectedId);
  const report = selected?.website_reports?.[0];
  const message = selected?.outreach_messages?.[0];
  const score = report?.opportunity_score ?? null;

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.pipeline_status === s).length;
    return acc;
  }, {});

  async function approveAndSend() {
    if (!message) return;
    await supabase
      .from('outreach_messages')
      .update({ status: 'sent' })
      .eq('id', message.id);
    await supabase
      .from('discovered_leads')
      .update({ pipeline_status: 'contacted' })
      .eq('id', selected.id);
    loadLeads();
  }

  async function saveEdit() {
    if (!message) return;
    await supabase
      .from('outreach_messages')
      .update({ message_body: draftText })
      .eq('id', message.id);
    setEditing(false);
    loadLeads();
  }

  async function regenerate() {
    if (!selected) return;
    const res = await fetch('/api/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: selected.id })
    });
    if (res.ok) loadLeads();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-slate-400 text-lg">Loading your leads...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col p-4 shrink-0">
          <div className="flex items-center gap-2 mb-8 px-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">J</div>
            <span className="font-bold text-white">JIGSAW AI</span>
          </div>
          <nav className="flex flex-col gap-1 text-sm">
            <a className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white">
              <LayoutDashboard size={16} /> Dashboard
            </a>
            <a className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer">
              <Users size={16} /> Leads
            </a>
            <a className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer">
              <Kanban size={16} /> Pipeline
            </a>
            <a className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer">
              <Mail size={16} /> Outreach
            </a>
            <a className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer">
              <CalendarIcon size={16} /> Calendar
            </a>
            <a className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer">
              <Settings size={16} /> Settings
            </a>
          </nav>
          <div className="mt-auto bg-slate-800 rounded-xl p-3 text-xs">
            <div className="font-semibold text-white mb-2">Daily Summary</div>
            <div className="flex justify-between mb-1">
              <span>Total Leads</span>
              <span>{leads.length}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Drafts Ready</span>
              <span>{leads.filter(l => l.outreach_messages?.[0]?.status === 'draft').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Sent</span>
              <span>{leads.filter(l => l.outreach_messages?.[0]?.status === 'sent').length}</span>
            </div>
          </div>
        </div>

        {/* Lead List */}
        <div className="w-96 border-r border-slate-800 flex flex-col bg-slate-900/50">
          <div className="p-4 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search leads..."
                className="w-full bg-slate-800 text-white text-sm rounded-lg pl-9 pr-4 py-2 border border-slate-700 focus:border-indigo-500 outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((lead) => {
              const leadScore = lead.website_reports?.[0]?.opportunity_score ?? null;
              const { badge, label } = leadScore !== null ? scoreColor(leadScore) : { badge: 'bg-slate-500/20 text-slate-400', label: 'Unknown' };
              const status = lead.outreach_messages?.[0]?.status || 'no message';
              const isSelected = selectedId === lead.id;

              return (
                <div
                  key={lead.id}
                  className={`px-4 py-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                    isSelected ? 'bg-slate-800/70 border-l-2 border-l-indigo-500' : ''
                  }`}
                  onClick={() => setSelectedId(lead.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{lead.business_name}</div>
                      <div className="text-xs text-slate-400 truncate">{lead.suburb || 'Unknown'}</div>
                    </div>
                    <div className="flex flex-col items-end ml-2 shrink-0">
                      {leadScore !== null && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badge}`}>
                          {scoreColor(leadScore).label}
                        </span>
                      )}
                      <span className={`text-[10px] mt-1 px-2 py-0.5 rounded-full ${
                        status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' :
                        status === 'draft' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {status === 'sent' ? 'Sent' : status === 'draft' ? 'Draft' : 'No Message'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                No leads found
              </div>
            )}
          </div>
        </div>

        {/* Lead Detail */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50">
          {selected ? (
            <div className="max-w-3xl">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold text-white">{selected.business_name}</h1>
                  <div className="text-sm text-slate-400 mt-1">
                    {selected.industry_category || 'No category'} • {selected.suburb || 'No location'}
                  </div>
                </div>
                {selected.website && (
                  <a
                    href={selected.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    Visit Site <ExternalLink size={14} />
                  </a>
                )}
              </div>

              {/* Score Card */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-sm font-semibold text-white mb-2">Opportunity Score</div>
                  {score !== null ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold text-white">{score}/100</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${scoreColor(score).badge}`}>
                          {scoreColor(score).label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {report?.score_explanation || 'No explanation available'}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">No score yet</p>
                  )}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <div className="text-sm font-semibold text-white mb-2 self-start">Website Preview</div>
                  {selected.website ? (
                    <p className="text-xs text-slate-400 break-all">{selected.website}</p>
                  ) : (
                    <>
                      <div className="text-amber-400 text-xs font-semibold mb-1">No Website Found</div>
                      <p className="text-xs text-slate-500">This is a great opportunity.</p>
                    </>
                  )}
                </div>
              </div>

              {/* Score Breakdown */}
              {report && report.reachable !== undefined && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
                  <div className="text-sm font-semibold text-white mb-3">Score Breakdown</div>
                  {[
                    ['No Website', !selected.website ? 50 : 0, 50],
                    ['Reachable', report.reachable ? 20 : 0, 20],
                    ['SSL Security', report.hasSSL ? 20 : 0, 20],
                    ['Load Speed', report.loadTimeMs && report.loadTimeMs < 4000 ? 10 : 0, 10],
                    ['Contact Page', report.hasContactPage ? 10 : 0, 10],
                    ['About Page', report.hasAboutPage ? 5 : 0, 5],
                    ['Meta Description', report.hasMetaDescription ? 5 : 0, 5],
                    ['Mobile Friendly', report.hasViewport ? 10 : 0, 10]
                  ].map(([label, val, max]) => (
                    val > 0 && (
                      <div key={label} className="mb-2">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>{label}</span>
                          <span>{val}/{max}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(val / max) * 100}%` }} />
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* Outreach Draft */}
              {message ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-sm font-semibold text-white mb-3">Latest Outreach Draft</div>
                  {editing ? (
                    <textarea
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      className="w-full h-40 bg-slate-800 text-sm text-slate-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                      {message.message_body}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    {editing ? (
                      <button
                        onClick={saveEdit}
                        className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Save
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={approveAndSend}
                          disabled={message.status === 'sent'}
                          className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg disabled:opacity-40 hover:bg-indigo-700 transition-colors"
                        >
                          {message.status === 'sent' ? '✓ Sent' : 'Approve & Send'}
                        </button>
                        <button
                          onClick={() => {
                            setEditing(true);
                            setDraftText(message.message_body);
                          }}
                          className="bg-slate-800 text-slate-300 text-xs px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={regenerate}
                          className="bg-slate-800 text-slate-300 text-xs px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                          Regenerate
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center text-slate-500">
                  No outreach message yet. Generate one by running the outreach script.
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

      {/* Pipeline Stage Strip */}
      <div className="h-16 border-t border-slate-800 bg-slate-900 flex items-center px-4 gap-3 overflow-x-auto shrink-0">
        {STAGES.map(s => (
          <div key={s} className={`flex-1 min-w-[100px] rounded-lg px-3 py-2 text-center ${STAGE_COLORS[s]} bg-opacity-20`}>
            <div className="text-xs text-slate-300">{STAGE_LABELS[s]}</div>
            <div className="text-lg font-bold text-white">{stageCounts[s] || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}