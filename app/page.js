export default function Home() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Jigsaw AI</h1>
        <p className="text-slate-400">Lead Intelligence Platform</p>
        <a href="/dashboard" className="mt-6 inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700">
          Go to Dashboard →
        </a>
      </div>
    </div>
  );
}