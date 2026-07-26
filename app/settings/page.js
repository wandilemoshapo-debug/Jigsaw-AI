import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
          <div className="text-6xl mb-4">⚙️</div>
          <p className="text-lg">Settings coming soon!</p>
          <p className="text-sm text-slate-600 mt-2">API keys, email templates, and more</p>
        </div>
      </div>
    </div>
  );
}