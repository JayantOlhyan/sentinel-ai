"use client";

import { useState } from 'react';
import { Shield, AlertTriangle, ShieldAlert, Send, Loader2, Info } from 'lucide-react';

interface AnalyzeResponse {
  risk_score: number;
  classification: "Safe" | "Suspicious" | "Scam";
  explanation: string;
  recommended_action: string;
}

export default function Home() {
  const [message, setMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!message.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze the message. Is the backend running?');
      }

      const data: AnalyzeResponse = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'Safe':
        return 'text-[var(--color-cyber-primary)] border-[var(--color-cyber-primary)] bg-[var(--color-cyber-primary)]/10 glow-primary';
      case 'Suspicious':
        return 'text-[var(--color-cyber-warning)] border-[var(--color-cyber-warning)] bg-[var(--color-cyber-warning)]/10 glow-warning';
      case 'Scam':
        return 'text-[var(--color-cyber-danger)] border-[var(--color-cyber-danger)] bg-[var(--color-cyber-danger)]/10 glow-danger';
      default:
        return 'text-gray-400 border-gray-600 bg-gray-800';
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'Safe':
        return <Shield className="w-8 h-8 md:w-12 md:h-12 text-[var(--color-cyber-primary)]" />;
      case 'Suspicious':
        return <AlertTriangle className="w-8 h-8 md:w-12 md:h-12 text-[var(--color-cyber-warning)]" />;
      case 'Scam':
        return <ShieldAlert className="w-8 h-8 md:w-12 md:h-12 text-[var(--color-cyber-danger)]" />;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[var(--color-cyber-primary)]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[var(--color-cyber-secondary)]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-4xl z-10 glass-panel p-6 md:p-10 rounded-2xl shadow-2xl transition-all duration-300">
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-[var(--color-cyber-border)]/50 mb-4 border border-[var(--color-cyber-border)]">
            <Shield className="w-8 h-8 text-[var(--color-cyber-primary)]" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 bg-gradient-to-r from-[var(--color-cyber-primary)] to-[var(--color-cyber-secondary)] bg-clip-text text-transparent">
            Sentinel AI
          </h1>
          <p className="text-[var(--color-cyber-muted)] text-sm md:text-base max-w-xl mx-auto">
            Real-Time Scam & Fraud Detection System. Paste any suspicious message below to analyze its intent using advanced AI.
          </p>
        </header>

        <div className="space-y-6">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--color-cyber-border)] to-[var(--color-cyber-panel)] rounded-xl opacity-50 group-hover:opacity-100 transition duration-300 blur"></div>
            <div className="relative bg-[var(--color-cyber-panel)] rounded-xl overflow-hidden flex flex-col h-48 border border-[var(--color-cyber-border)]">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Paste SMS, email, or message here... e.g. 'Your account will be suspended. Click this link to verify immediately.'"
                className="flex-1 w-full bg-transparent text-[var(--color-cyber-text)] p-4 outline-none resize-none placeholder:text-[var(--color-cyber-muted)]"
              />
              <div className="p-3 bg-[var(--color-cyber-border)]/20 border-t border-[var(--color-cyber-border)] flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={!message.trim() || isAnalyzing}
                  className="flex items-center gap-2 bg-[var(--color-cyber-primary)] hover:bg-[var(--color-cyber-primary)]/80 text-[#050a0f] px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Analyze Message
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-[var(--color-cyber-danger)]/10 border border-[var(--color-cyber-danger)] text-[var(--color-cyber-danger)] flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Score Panel */}
                <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center text-center">
                  <h3 className="text-[var(--color-cyber-muted)] text-sm font-medium uppercase tracking-wider mb-4">Risk Score</h3>
                  <div className="relative flex items-center justify-center w-32 h-32 md:w-40 md:h-40">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50" cy="50" r="45"
                        fill="transparent"
                        stroke="var(--color-cyber-border)"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50" cy="50" r="45"
                        fill="transparent"
                        stroke={result.classification === 'Safe' ? 'var(--color-cyber-primary)' : result.classification === 'Suspicious' ? 'var(--color-cyber-warning)' : 'var(--color-cyber-danger)'}
                        strokeWidth="8"
                        strokeDasharray={`${result.risk_score * 2.827} 282.7`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-4xl md:text-5xl font-bold">{result.risk_score}</span>
                      <span className="text-xs text-[var(--color-cyber-muted)]">%</span>
                    </div>
                  </div>
                </div>

                {/* Details Panel */}
                <div className="md:col-span-2 glass-panel p-6 rounded-xl flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    {getClassificationIcon(result.classification)}
                    <div>
                      <h3 className="text-[var(--color-cyber-muted)] text-sm font-medium uppercase tracking-wider mb-1">Classification</h3>
                      <div className={`inline-flex px-4 py-1.5 rounded-full border text-sm font-bold tracking-wide ${getClassificationColor(result.classification)}`}>
                        {result.classification.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-2 text-sm font-medium text-[var(--color-cyber-text)]">
                        <Info className="w-4 h-4 text-[var(--color-cyber-secondary)]" />
                        Analysis Explanation
                      </h4>
                      <p className="text-[var(--color-cyber-muted)] text-sm leading-relaxed border-l-2 border-[var(--color-cyber-border)] pl-3">
                        {result.explanation}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="flex items-center gap-2 text-sm font-medium text-[var(--color-cyber-text)]">
                        <ShieldAlert className="w-4 h-4 text-[var(--color-cyber-primary)]" />
                        Recommended Action
                      </h4>
                      <div className="p-4 rounded-lg bg-[var(--color-cyber-bg)] border border-[var(--color-cyber-border)]">
                        <p className="text-[var(--color-cyber-text)] text-sm font-medium">
                          {result.recommended_action}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <footer className="mt-12 text-[var(--color-cyber-muted)] text-xs text-center pb-4">
        Powered by Google Gemini AI • For educational purposes only
      </footer>
    </main>
  );
}
