'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ImportsPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Handle file selection from file manager
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      readFileContent(selectedFile);
    }
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setResult(null);
      setError(null);
      readFileContent(droppedFile);
    }
  };

  // Read file content based on file type
  const readFileContent = (file) => {
    const reader = new FileReader();
    
    // Check file type
    const fileType = file.name.split('.').pop().toLowerCase();
    
    if (fileType === 'csv' || fileType === 'txt' || fileType === 'json') {
      reader.onload = (e) => {
        setFileContent(e.target.result);
      };
      reader.readAsText(file);
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      // For Excel files, we'll use a different approach
      reader.onload = (e) => {
        // We'll handle this in the upload
        setFileContent('excel_file_detected');
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError(`File type .${fileType} is not supported. Please use CSV, Excel, JSON, or TXT.`);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      // For Excel files, we need to use a different approach
      const fileType = file.name.split('.').pop().toLowerCase();
      
      let content = fileContent;
      
      if (fileType === 'xlsx' || fileType === 'xls') {
        // For Excel, we'll send the file as FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'excel');
        
        const response = await fetch('/api/import', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        if (data.error) {
          setError(data.error);
        } else {
          setResult(data);
        }
        setUploading(false);
        return;
      }

      // For CSV, JSON, TXT
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content: content,
          type: fileType,
          filename: file.name
        })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        // Refresh the page after successful import
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Import File</h1>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-8">
          <h2 className="text-xl font-semibold mb-2">Upload Your File</h2>
          <p className="text-sm text-slate-400 mb-6">Supported formats: CSV, Excel (.xlsx, .xls), JSON, TXT</p>

          {/* File input with file manager access */}
          <div className="flex items-center gap-4 mb-4">
            <input
              type="file"
              id="file-upload"
              onChange={handleFileChange}
              className="hidden"
              accept=".csv,.xlsx,.xls,.json,.txt"
            />
            <label
              htmlFor="file-upload"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg cursor-pointer transition-colors flex items-center gap-2"
            >
              📁 Browse Files
            </label>
            <span className="text-sm text-slate-400">
              {file ? `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)` : 'No file selected'}
            </span>
          </div>

          {/* Drag and drop area */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-5xl mb-4">📂</div>
            <p className="text-slate-400">
              Drag and drop your file here
            </p>
            <p className="text-xs text-slate-500 mt-2">
or click &quot;Browse Files&quot; to open your file manager
            </p>
          </div>

          {/* File preview */}
          {file && fileContent && fileContent !== 'excel_file_detected' && (
            <div className="mt-4 bg-slate-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-white">File Preview</span>
                <span className="text-xs text-slate-400">{file.name}</span>
              </div>
              <div className="bg-slate-950 rounded p-3 max-h-40 overflow-auto">
                <pre className="text-xs text-slate-300 whitespace-pre-wrap">
                  {fileContent.substring(0, 500)}
                  {fileContent.length > 500 && '...'}
                </pre>
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <span className="animate-spin">⏳</span> Uploading...
              </>
            ) : (
              <>
                ⬆️ Import File
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg">
              ❌ {error}
            </div>
          )}

          {result && (
            <div className="mt-4 bg-green-900/50 border border-green-700 text-green-200 p-4 rounded-lg">
              <p>✅ Import successful!</p>
              <p className="text-sm mt-2">
                {result.saved || result.count || 'Businesses'} imported from {file?.name || 'file'}
              </p>
              <p className="text-xs text-green-300 mt-1">Redirecting to dashboard...</p>
            </div>
          )}
        </div>

        <div className="mt-8 bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="text-sm font-semibold mb-2">Supported File Formats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-400">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">📄</div>
              CSV
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">📊</div>
              Excel (.xlsx, .xls)
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">📋</div>
              JSON
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">📝</div>
              TXT
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500">
            <p>Column names are automatically detected. Supported columns: Business Name, Phone, Email, Address, Website, Category, Suburb, Brabys URL</p>
          </div>
        </div>
      </div>
    </div>
  );
}