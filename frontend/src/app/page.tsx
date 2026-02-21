"use client";

import { useState, useRef } from 'react';
import {
  Shield, AlertTriangle, ShieldAlert, Send,
  Loader2, Info, UploadCloud, MessageSquare,
  Phone, Link as LinkIcon, Video, IndianRupee,
  Cpu, CheckCircle2, Github, Twitter, Mail
} from 'lucide-react';

interface AnalyzeResponse {
  risk_score: number;
  classification: "Safe" | "Suspicious" | "Scam";
  explanation: string;
  recommended_action: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'message' | 'call' | 'url'>('message');

  // Analysis State
  const [inputType, setInputType] = useState<'text' | 'image'>('text');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Please upload a valid image file.");
        return;
      }
      setSelectedImage(file);
      setInputType('image');

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearInput = () => {
    setMessage('');
    setUrl('');
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (activeTab === 'message' && inputType === 'text' && !message.trim()) return;
    if (activeTab === 'message' && inputType === 'image' && !selectedImage) return;
    if (activeTab === 'url' && !url.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      let response;

      if (activeTab === 'message') {
        if (inputType === 'text') {
          response = await fetch('http://localhost:8000/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
          });
        } else {
          const formData = new FormData();
          formData.append('file', selectedImage as File);
          response = await fetch('http://localhost:8000/analyze-image', {
            method: 'POST',
            body: formData,
          });
        }
      } else if (activeTab === 'url') {
        response = await fetch('http://localhost:8000/analyze-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
      } else {
        throw new Error("Tab not supported yet.");
      }

      if (!response.ok) {
        throw new Error('Analysis failed. Is the backend running locally on port 8000?');
      }

      const data: AnalyzeResponse = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getClassificationColor = (classification: string, bg = true) => {
    switch (classification) {
      case 'Safe':
        return bg ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500' : 'text-emerald-400';
      case 'Suspicious':
        return bg ? 'bg-amber-500/20 text-amber-400 border-amber-500' : 'text-amber-400';
      case 'Scam':
        return bg ? 'bg-rose-500/20 text-rose-400 border-rose-500' : 'text-rose-400';
      default:
        return 'text-gray-400 border-gray-600 bg-gray-800';
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-purple-500/30">

      {/* --- NAVBAR --- */}
      <nav className="w-full flex items-center justify-between px-6 py-4 bg-[var(--color-cyber-nav)] border-b border-white/5 z-50 sticky top-0 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-500" />
          <span className="text-xl font-bold tracking-tight">ScamShield</span>
        </div>
        <div className="hidden md:flex gap-6 text-sm text-[var(--color-cyber-muted)] font-medium font-sans">
          <a href="#" className="hover:text-white transition-colors">Products</a>
          <a href="#" className="hover:text-white transition-colors">Resources</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
        <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/10">
          Login
        </button>
      </nav>

      <main className="flex-1 w-full relative">

        {/* --- HERO SECTION --- */}
        <section className="relative w-full pt-20 pb-24 md:pt-32 md:pb-32 px-4 flex flex-col items-center justify-center text-center">
          {/* Glowing Background Blob */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-6 relative">
              <Shield className="w-16 h-16 text-blue-400" strokeWidth={1.5} />
              <div className="absolute -top-2 -right-2 text-yellow-400 animate-pulse">✨</div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl">
              AI-Powered Scam Detection <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-purple-600 bg-clip-text text-transparent">
                in Real Time
              </span>
            </h1>

            <p className="text-lg md:text-xl text-[var(--color-cyber-muted)] max-w-2xl mb-12">
              Protect yourself from SMS scams, voice frauds, deepfakes, and malicious URLs with cutting-edge AI technology
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <button
                onClick={() => { setActiveTab('message'); document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth' }); }}
                className={`px-8 py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.3)]
                  ${activeTab === 'message' ? 'bg-blue-600 text-white hover:bg-blue-500 scale-105' : 'bg-[var(--color-cyber-panel)] text-white hover:bg-blue-600/20'}
                `}
              >
                Scan Message
              </button>
              <button
                onClick={() => { setActiveTab('call'); document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth' }); }}
                className={`px-8 py-3.5 rounded-xl font-semibold transition-all duration-300
                  ${activeTab === 'call' ? 'bg-purple-500 text-white hover:bg-purple-400 scale-105 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'bg-[var(--color-cyber-panel)] text-white hover:bg-purple-500/20'}
                `}
              >
                Check Call
              </button>
              <button
                onClick={() => { setActiveTab('url'); document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth' }); }}
                className={`px-8 py-3.5 rounded-xl font-semibold transition-all duration-300
                  ${activeTab === 'url' ? 'bg-slate-700 text-white hover:bg-slate-600 scale-105' : 'bg-[var(--color-cyber-panel)] text-[var(--color-cyber-muted)] hover:bg-slate-800'}
                `}
              >
                Analyze URL
              </button>
            </div>

            {/* Scroll Indicator */}
            <div className="animate-bounce p-2 rounded-full border border-white/20">
              <div className="w-1.5 h-3 bg-white/50 rounded-full" />
            </div>
          </div>
        </section>

        {/* --- ANALYZER SECTION --- */}
        <section id="analyzer" className="w-full max-w-5xl mx-auto px-4 py-12">
          <div className="glass-panel p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
            {/* Tab Header */}
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[var(--color-cyber-border)]">
              {activeTab === 'message' && <MessageSquare className="w-6 h-6 text-blue-400" />}
              {activeTab === 'call' && <Phone className="w-6 h-6 text-purple-400" />}
              {activeTab === 'url' && <LinkIcon className="w-6 h-6 text-slate-400" />}
              <h2 className="text-2xl font-semibold">
                {activeTab === 'message' ? 'Message & Image Scanner' : activeTab === 'call' ? 'Voice Call Analysis (Coming Soon)' : 'URL Safety Scanner'}
              </h2>
            </div>

            {/* Input Area */}
            {activeTab === 'message' ? (
              <div className="flex flex-col gap-6">

                {/* Input Toggle */}
                <div className="flex bg-[var(--color-cyber-nav)] p-1 rounded-lg w-fit border border-white/5">
                  <button onClick={() => setInputType('text')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${inputType === 'text' ? 'bg-[var(--color-cyber-panel)] text-white shadow' : 'text-gray-400 hover:text-white'}`}>Text</button>
                  <button onClick={() => setInputType('image')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${inputType === 'image' ? 'bg-[var(--color-cyber-panel)] text-white shadow' : 'text-gray-400 hover:text-white'}`}>Image</button>
                </div>

                {inputType === 'text' ? (
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Paste a suspicious SMS, email, or WhatsApp message here..."
                    className="w-full h-40 bg-[var(--color-cyber-nav)] border border-[var(--color-cyber-border)] text-white p-4 rounded-xl outline-none focus:border-blue-500/50 resize-none transition-colors placeholder:text-gray-600"
                  />
                ) : (
                  <div className="w-full flex justify-center items-center">
                    {imagePreview ? (
                      <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden border border-[var(--color-cyber-border)] bg-[var(--color-cyber-nav)] flex items-center justify-center">
                        <img src={imagePreview} alt="Preview" className="max-h-full object-contain" />
                        <button onClick={clearInput} className="absolute top-2 right-2 bg-black/50 hover:bg-black p-2 rounded-full text-white backdrop-blur-sm transition-all">✕</button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-48 md:h-64 border-2 border-dashed border-[var(--color-cyber-border)] hover:border-purple-500/50 hover:bg-purple-500/5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all gap-3"
                      >
                        <UploadCloud className="w-10 h-10 text-gray-400" />
                        <div className="text-center">
                          <p className="text-white font-medium">Click to upload an image</p>
                          <p className="text-sm text-gray-500 mt-1">PNG, JPG, JPEG up to 5MB</p>
                        </div>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                  {error ? (
                    <div className="text-rose-400 text-sm flex items-center gap-2 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 w-fit">
                      <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                  ) : <div />}

                  <div className="flex gap-3 w-full sm:w-auto">
                    {(message || url || selectedImage) && (
                      <button onClick={clearInput} className="px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 mt-auto">
                        Clear
                      </button>
                    )}
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || (inputType === 'text' && !message) || (inputType === 'image' && !selectedImage)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    >
                      {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Send className="w-5 h-5" /> Analyze</>}
                    </button>
                  </div>
                </div>

                {/* Results Section for Message Area */}
                {result && (
                  <div className="mt-8 pt-6 border-t border-[var(--color-cyber-border)] animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                      {/* Risk Score */}
                      <div className="md:col-span-1 bg-[var(--color-cyber-nav)] rounded-xl p-6 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className={`absolute inset-0 opacity-10 ${result.classification === 'Safe' ? 'bg-emerald-500' : result.classification === 'Suspicious' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        <h3 className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-4 z-10">Risk Score</h3>
                        <div className="relative w-28 h-28 flex items-center justify-center z-10">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                            <circle
                              cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
                              strokeDasharray={`${result.risk_score * 2.827} 282.7`} strokeLinecap="round"
                              className={`transition-all duration-1000 ${getClassificationColor(result.classification, false)}`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold">{result.risk_score}</span>
                            <span className="text-[10px] text-gray-500">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="md:col-span-3 flex flex-col gap-4">
                        <div className="bg-[var(--color-cyber-nav)] rounded-xl p-5 border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {result.classification === 'Safe' ? <Shield className="w-6 h-6 text-emerald-400" /> : result.classification === 'Suspicious' ? <AlertTriangle className="w-6 h-6 text-amber-400" /> : <ShieldAlert className="w-6 h-6 text-rose-400" />}
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Status</p>
                              <p className="text-lg font-bold text-white tracking-wide">{result.classification}</p>
                            </div>
                          </div>
                          <div className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest ${getClassificationColor(result.classification)}`}>
                            {result.classification}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                          <div className="bg-[var(--color-cyber-nav)] rounded-xl p-5 border border-white/5">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                              <Info className="w-4 h-4 text-blue-400" /> AI Explanation
                            </h4>
                            <p className="text-sm text-gray-400 leading-relaxed">{result.explanation}</p>
                          </div>
                          <div className="bg-[var(--color-cyber-nav)] rounded-xl p-5 border border-white/5 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                            <h4 className="relative z-10 flex items-center gap-2 text-sm font-semibold text-white mb-3">
                              <CheckCircle2 className="w-4 h-4 text-purple-400" /> Recommended Action
                            </h4>
                            <p className="relative z-10 text-sm font-medium text-blue-100">{result.recommended_action}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'url' ? (
              <div className="flex flex-col gap-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <LinkIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-[var(--color-cyber-nav)] border border-[var(--color-cyber-border)] text-white p-4 pl-12 rounded-xl outline-none focus:border-slate-500/50 transition-colors placeholder:text-gray-600 font-mono"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                  {error ? (
                    <div className="text-rose-400 text-sm flex items-center gap-2 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 w-fit">
                      <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                  ) : <div />}

                  <div className="flex gap-3 w-full sm:w-auto">
                    {url && (
                      <button onClick={clearInput} className="px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 mt-auto">
                        Clear
                      </button>
                    )}
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !url}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-8 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(51,65,85,0.3)]"
                    >
                      {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Send className="w-5 h-5" /> Analyze</>}
                    </button>
                  </div>
                </div>

                {/* Results Section for URL */}
                {result && (
                  <div className="mt-8 pt-6 border-t border-[var(--color-cyber-border)] animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                      {/* Risk Score */}
                      <div className="md:col-span-1 bg-[var(--color-cyber-nav)] rounded-xl p-6 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className={`absolute inset-0 opacity-10 ${result.classification === 'Safe' ? 'bg-emerald-500' : result.classification === 'Suspicious' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        <h3 className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-4 z-10">Risk Score</h3>
                        <div className="relative w-28 h-28 flex items-center justify-center z-10">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                            <circle
                              cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
                              strokeDasharray={`${result.risk_score * 2.827} 282.7`} strokeLinecap="round"
                              className={`transition-all duration-1000 ${getClassificationColor(result.classification, false)}`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold">{result.risk_score}</span>
                            <span className="text-[10px] text-gray-500">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="md:col-span-3 flex flex-col gap-4">
                        <div className="bg-[var(--color-cyber-nav)] rounded-xl p-5 border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {result.classification === 'Safe' ? <Shield className="w-6 h-6 text-emerald-400" /> : result.classification === 'Suspicious' ? <AlertTriangle className="w-6 h-6 text-amber-400" /> : <ShieldAlert className="w-6 h-6 text-rose-400" />}
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Status</p>
                              <p className="text-lg font-bold text-white tracking-wide">{result.classification}</p>
                            </div>
                          </div>
                          <div className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest ${getClassificationColor(result.classification)}`}>
                            {result.classification}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                          <div className="bg-[var(--color-cyber-nav)] rounded-xl p-5 border border-white/5">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                              <Info className="w-4 h-4 text-blue-400" /> AI Explanation
                            </h4>
                            <p className="text-sm text-gray-400 leading-relaxed">{result.explanation}</p>
                          </div>
                          <div className="bg-[var(--color-cyber-nav)] rounded-xl p-5 border border-white/5 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
                            <h4 className="relative z-10 flex items-center gap-2 text-sm font-semibold text-white mb-3">
                              <CheckCircle2 className="w-4 h-4 text-purple-400" /> Recommended Action
                            </h4>
                            <p className="relative z-10 text-sm font-medium text-blue-100">{result.recommended_action}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                  <Phone className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
                <p className="text-gray-400 max-w-sm">This feature is currently under active development. Stay tuned for updates!</p>
              </div>
            )}
          </div>
        </section>

        {/* --- STATS SECTION --- */}
        <section className="w-full max-w-6xl mx-auto px-4 py-20 text-center">
          <h2 className="text-4xl font-bold mb-3">The Growing Threat</h2>
          <p className="text-gray-400 mb-12">Digital scams are costing Indians billions every year</p>

          <div className="glass-panel p-8 md:p-12 rounded-2xl mb-8 relative overflow-hidden border-rose-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 text-rose-400 mb-4">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-6xl md:text-8xl font-black tracking-tight">1,25,000 <span className="text-4xl md:text-6xl md:ml-2">crore</span></h3>
              </div>
              <p className="text-xl text-white font-medium mb-2">Lost to Scams Annually in India</p>
              <p className="text-sm text-gray-500">And the number keeps growing every year</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center border-purple-500/20 bg-gradient-to-br from-purple-500/5">
              <ShieldAlert className="w-8 h-8 text-purple-400 mb-4" />
              <h4 className="text-5xl font-black text-purple-400 mb-2">95,000+</h4>
              <p className="text-white font-medium mb-1">Daily Scam Attempts</p>
              <p className="text-xs text-gray-500">Reported across India</p>
            </div>
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center border-blue-500/20 bg-gradient-to-br from-blue-500/5">
              <Phone className="w-8 h-8 text-blue-400 mb-4" />
              <h4 className="text-5xl font-black text-blue-400 mb-2">77%</h4>
              <p className="text-white font-medium mb-1">Victims Unaware</p>
              <p className="text-xs text-gray-500">Until it's too late</p>
            </div>
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center border-emerald-500/20 bg-gradient-to-br from-emerald-500/5">
              <Shield className="w-8 h-8 text-emerald-400 mb-4" />
              <h4 className="text-5xl font-black text-emerald-400 mb-2">85%</h4>
              <p className="text-white font-medium mb-1">Detection Rate</p>
              <p className="text-xs text-gray-500">With our AI technology</p>
            </div>
          </div>
        </section>

        {/* --- FEATURES SECTION --- */}
        <section className="w-full max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-3">Comprehensive Protection</h2>
            <p className="text-gray-400">Multiple layers of AI-powered security to keep you safe</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <MessageSquare className="text-blue-400 w-6 h-6" />, bg: 'bg-blue-500/10', title: 'SMS Detection', desc: 'Analyzes text messages for phishing attempts, fake links, and fraudulent patterns using NLP.' },
              { icon: <Phone className="text-purple-400 w-6 h-6" />, bg: 'bg-purple-500/10', title: 'Voice Scam Detection', desc: 'Real-time voice analysis to detect impersonation, AI-generated voices, and social engineering.' },
              { icon: <Video className="text-rose-400 w-6 h-6" />, bg: 'bg-rose-500/10', title: 'Deepfake Detector', desc: 'Advanced AI to identify deepfake videos and manipulated media with incredibly high accuracy.' },
              { icon: <LinkIcon className="text-amber-400 w-6 h-6" />, bg: 'bg-amber-500/10', title: 'URL Safety Scanner', desc: 'Checks URLs against databases of known scams and analyzes website behavior and metadata.' },
              { icon: <IndianRupee className="text-emerald-400 w-6 h-6" />, bg: 'bg-emerald-500/10', title: 'Financial Risk Score', desc: 'Provides instant risk assessment for financial transactions and unknown payment links.' },
              { icon: <Cpu className="text-cyan-400 w-6 h-6" />, bg: 'bg-cyan-500/10', title: 'Zero-Day Threats', desc: 'Our Gemini-powered engine generalizes to catch completely new, never-before-seen scam tactics.' }
            ].map((f, i) => (
              <div key={i} className="glass-panel p-6 rounded-2xl flex flex-col gap-4 group hover:border-white/20">
                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center`}>{f.icon}</div>
                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --- HOW IT WORKS SECTION --- */}
        <section className="w-full max-w-5xl mx-auto px-4 py-20 text-center">
          <h2 className="text-4xl font-bold mb-3">How It Works</h2>
          <p className="text-gray-400 mb-16">Protection in three simple steps</p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 relative">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-px bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-50 z-0" />

            {[
              { num: 1, title: 'User Input', desc: 'Submit your message, call recording, URL, or image for analysis.', color: 'from-blue-600 to-blue-400', shadow: 'shadow-blue-500/30' },
              { num: 2, title: 'AI Analysis', desc: 'Our advanced AI models scan for patterns, anomalies, and scam indicators.', color: 'from-purple-600 to-purple-400', shadow: 'shadow-purple-500/30' },
              { num: 3, title: 'Risk Score', desc: 'Get an instant safety rating with detailed explanations and recommendations.', color: 'from-emerald-600 to-emerald-400', shadow: 'shadow-emerald-500/30' },
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center flex-1 max-w-xs">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-3xl font-black tracking-tighter mb-6 shadow-lg ${step.shadow}`}>
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setActiveTab('message'); document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="mt-16 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-full font-bold shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:scale-105 transition-all"
          >
            Try It Now - It's Free
          </button>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="w-full bg-[#0a0614] border-t border-white/5 pt-16 pb-8 px-6 lg:px-20 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12 mb-16">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-6 h-6 text-blue-500" />
              <span className="text-xl font-bold tracking-tight text-white">ScamShield</span>
            </div>
            <p className="text-sm text-gray-500 mb-6">AI-powered protection against digital scams and fraud. Built for the safety of our digital citizens.</p>
            <div className="flex gap-4">
              <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"><Github className="w-5 h-5" /></button>
              <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></button>
              <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"><Mail className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex-1 max-w-xl">
            <h4 className="text-white font-bold mb-6">Our Team</h4>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              {[
                { name: 'Rahul Sharma', role: 'AI/ML Engineer', init: 'RS' },
                { name: 'Priya Patel', role: 'Full Stack Developer', init: 'PP' },
                { name: 'Arjun Kumar', role: 'Security Researcher', init: 'AK' },
                { name: 'Sneha Reddy', role: 'Product Designer', init: 'SR' }
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-purple-500/20">
                    {p.init}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-200">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Quick Links</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-white/5 text-xs text-gray-600 gap-4">
          <p>© 2026 ScamShield. All rights reserved. Built with ❤️ in India.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-gray-400">Disclaimer</a>
            <a href="#" className="hover:text-gray-400">Cookie Policy</a>
            <a href="#" className="hover:text-gray-400">Report a Bug</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
