'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';

export default function CampaignImportPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id;
  
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    async function loadCampaign() {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      setCampaign(data);
      setLoading(false);
    }
    loadCampaign();
  }, [campaignId]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    setFile(selectedFile);
    setResult(null);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        const headerLine = lines[0];
        const headerColumns = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        setHeaders(headerColumns);
        
        const previewRows = lines.slice(1, 6).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          return values;
        });
        setPreview(previewRows);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a CSV file');
      return;
    }

    setImporting(true);
    setPipelineRunning(false);
    setError(null);
    setProgress('📂 Reading file...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        
        setProgress('📤 Importing leads...');
        
        const response = await fetch('/api/import-pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content,
            campaign_id: campaignId
          })
        });

        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setImporting(false);
          return;
        }

        setResult(data);
        
        if (data.pipeline_started) {
          setProgress('🚀 Pipeline started... This may take a few minutes.');
          setPipelineRunning(true);
          
          // Poll for updates
          pollPipelineStatus(campaignId);
        } else {
          setProgress('✅ Import complete!');
          setImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setError(err.message);
      setImporting(false);
    }
  };

  const pollPipelineStatus = async (campaignId) => {
    let attempts = 0;
    const maxAttempts = 30; // 30 * 10 seconds = 5 minutes max
    
    const checkStatus = async () => {
      attempts++;
      try {
        const { data: leads } = await supabase
          .from('discovered_leads')
          .select('eval_opportunity_score')
          .eq('campaign_id', campaignId)
          .limit(1);
        
        // Check if leads have scores (pipeline complete)
        if (leads && leads.length > 0 && leads[0].eval_opportunity_score !== null) {
          setProgress('✅ Pipeline complete! Redirecting...');
          setPipelineRunning(false);
          setImporting(false);
          setTimeout(() => {
            router.push(`/campaigns/${campaignId}/dashboard`);
          }, 1500);
          return;
        }
        
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000); // Check every 10 seconds
        } else {
          setProgress('⏳ Pipeline is still running. Check dashboard manually.');
          setPipelineRunning(false);
          setImporting(false);
        }
      } catch (err) {
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000);
        }
      }
    };
    
    setTimeout(checkStatus, 5000); // First check after 5 seconds
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#090D18]">
        <div className="text-slate-400 text-lg">Loading...</div>
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

  const isArchived = campaign.is_archived || campaign.status === 'archived';

  return (
    <div className="min-h-screen bg-[#090D18] text-slate-200">
      {/* Header */}
      <div className="border-b border-[#18233D] bg-[#0D1424] px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href={`/campaigns/${campaignId}/dashboard`} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft size={18} /> Back
          </Link>
          <h1 className="text-xl font-bold text-white">Import Leads</h1>
          <span className="text-sm text-slate-500">{campaign.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {campaign.lead_count || 0} leads currently
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-8">
        {isArchived ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h2 className="text-xl font-semibold text-white mb-2">Campaign Archived</h2>
            <p className="text-slate-400">This campaign is archived and read-only. Cannot import new leads.</p>
          </div>
        ) : (
          <>
            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                dragActive ? 'border-[#5B7CFA] bg-[#5B7CFA]/10' : 'border-[#18233D] hover:border-[#18233D]/60'
              }`}
              onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-2">
                  <div className="text-4xl">📄</div>
                  <div className="text-white font-medium">{file.name}</div>
                  <div className="text-sm text-slate-400">{(file.size / 1024).toFixed(1)} KB</div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-sm text-rose-400 hover:text-rose-300"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-5xl mb-4">📂</div>
                  <h2 className="text-xl font-semibold text-white mb-2">Drop your CSV file here</h2>
                  <p className="text-slate-400 text-sm">or click to browse files</p>
                  <p className="text-xs text-slate-500 mt-1">Pipeline will run automatically after import</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block mt-4 bg-[#5B7CFA] hover:bg-[#7092FF] text-white px-6 py-2 rounded-xl cursor-pointer transition-colors"
                  >
                    Choose CSV File
                  </label>
                </>
              )}
            </div>

            {/* Preview */}
            {file && headers.length > 0 && (
              <div className="mt-6 bg-[#0D1424] border border-[#18233D] rounded-2xl p-6">
                <h3 className="text-sm font-medium text-white mb-3">Preview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#18233D]">
                        {headers.map((header, i) => (
                          <th key={i} className="px-3 py-2 text-left text-xs text-slate-400 font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-[#18233D] border-opacity-50">
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 text-xs text-slate-300">
                              {cell || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500 mt-3">
Showing first 5 rows. All leads will be imported to &quot;{campaign.name}&quot;.
                </p>
              </div>
            )}

            {/* Progress Status */}
            {importing && (
              <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Loader2 size={20} className="animate-spin text-blue-400" />
                  <div>
                    <div className="text-sm text-white">{progress}</div>
                    {pipelineRunning && (
                      <div className="text-xs text-slate-400 mt-1">
                        <ul className="list-disc list-inside">
<li>📁 You&apos;ll be redirected to the dashboard when complete</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="mt-6 w-full bg-[#5B7CFA] hover:bg-[#7092FF] text-white px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Importing...
                </>
              ) : (
                <>
                  <Upload size={16} /> Import {file ? file.name : 'CSV'} to {campaign.name}
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {result && !error && !importing && (
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-400">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} /> 
                  {result.imported} leads imported successfully!
                </div>
                <div className="text-xs text-emerald-300/70 mt-1">
                  Pipeline is running in the background. You will be redirected when complete.
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="mt-6 bg-[#0D1424] border border-[#18233D] rounded-2xl p-4">
              <div className="text-xs text-slate-400">
                <p className="font-medium text-white mb-1">📌 What happens after import:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>✅ Leads imported to <span className="text-white">{campaign.name}</span></li>
                  <li>🔍 Brabys enrichment runs automatically</li>
                  <li>🌐 Website analysis runs automatically</li>
                  <li>📊 AI scoring runs automatically</li>
                  <li>📝 Outreach messages generated automatically</li>
                  <li>📁 You'll be redirected to the dashboard when complete</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}