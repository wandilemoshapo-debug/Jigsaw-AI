// app/campaigns/new/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function createCampaign() {
    if (!name.trim()) {
      alert('Please enter a campaign name');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      alert('Error creating campaign: ' + error.message);
      setLoading(false);
    } else {
      router.push(`/campaigns/${data.id}/dashboard`);
    }
  }

  return (
    <div className="min-h-screen bg-[#090D18] text-slate-200 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/campaigns"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-white">Create New Campaign</h1>
        </div>

        {/* Form */}
        <div className="bg-[#0D1424] border border-[#18233D] rounded-2xl p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Campaign Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cape Town Plumbers"
                className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this campaign about?"
                rows={4}
                className="w-full bg-[#131C31] text-white text-sm rounded-xl p-3 border border-[#18233D] focus:ring-1 focus:ring-[#5B7CFA] outline-none"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#18233D]">
              <button
                onClick={createCampaign}
                disabled={loading}
                className="flex-1 bg-[#5B7CFA] hover:bg-[#7092FF] text-white px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={18} />
                {loading ? 'Creating...' : 'Create Campaign'}
              </button>
              <Link
                href="/campaigns"
                className="flex-1 bg-[#131C31] hover:bg-[#18233D] text-slate-300 px-6 py-3 rounded-xl border border-[#18233D] text-center transition-colors"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}