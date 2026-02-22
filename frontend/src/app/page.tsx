"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Shield, AlertTriangle, ShieldAlert, Send,
  Loader2, Info, UploadCloud, MessageSquare,
  Phone, Link as LinkIcon, Video, IndianRupee,
  Cpu, CheckCircle2, Github, Twitter, Mail,
  Mic, Square, Play, Trash2, Activity
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface AnalyzeResponse {
  risk_score: number;
  classification: "Safe" | "Suspicious" | "Scam";
  explanation: string;
  recommended_action: string;
  transcript?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'message' | 'call' | 'url'>('message');

  // Analysis State
  const [inputType, setInputType] = useState<'text' | 'image'>('text');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Live STT State
  const [isLiveMonitoring, setIsLiveMonitoring] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interruptionAlert, setInterruptionAlert] = useState(false);
  const [sttDebugLog, setSttDebugLog] = useState<string[]>([]);
  const isLiveMonitoringRef = useRef<boolean>(false);
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);

  // Audio Visualizer State
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Custom Audio Player State
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

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

  const startRecording = async () => {
    try {
      // Use specific constraints to prevent the browser from aggressively muting the microphone
      // or discarding "noise"
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        }
      });
      // Setup Audio Visualizer so user can SEE if mic is working
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextCtor();
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyzer);
      audioContextRef.current = audioCtx;
      analyzerRef.current = analyzer;

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      const updateAudioLevel = () => {
        analyzer.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const average = sum / dataArray.length;
        setAudioLevel(average); // 0 to 255
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

      // Let the browser pick its native reliable format instead of forcing WebM
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Let Blob infer correct type from chunks
        const audioBlob = new Blob(audioChunksRef.current);
        setAudioBlob(audioBlob);
        setAudioURL(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop()); // Stop microphone access

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close().catch(() => { });
        setAudioLevel(0);
      };

      // Pass timeslice (1000ms) to force periodic flushing of chunks
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      setResult(null);
      setError(null);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      setError("Microphone access denied or not available. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const addSttLog = (msg: string) => {
    setSttDebugLog(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()} - ${msg} `]);
  };

  const startLiveMonitoring = async () => {
    try {
      addSttLog("Requesting microphone for Live Server STT...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        }
      });

      liveStreamRef.current = stream;
      setIsLiveMonitoring(true);
      isLiveMonitoringRef.current = true;
      setLiveTranscript('');
      setInterruptionAlert(false);
      setResult(null);
      addSttLog("Microphone streaming started...");

      let currentTranscript = '';

      const recordAndSendChunk = () => {
        if (!isLiveMonitoringRef.current) return;

        try {
          // Use specific mime type or let browser choose
          const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
          const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          const chunks: Blob[] = [];

          recorder.ondataavailable = e => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = async () => {
            if (chunks.length === 0 || !isLiveMonitoringRef.current) return;
            const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
            addSttLog("Sending 5s audio chunk to AI for analysis...");

            const formData = new FormData();
            formData.append('file', blob, 'live_chunk.webm');

            try {
              const response = await fetch(`${API_URL}/analyze-audio-live`, {
                method: 'POST',
                body: formData,
              });

              if (response.ok) {
                const data: AnalyzeResponse = await response.json();
                if (data.transcript && data.transcript.trim()) {
                  currentTranscript += data.transcript + ' ';
                  setLiveTranscript(currentTranscript);
                  addSttLog(`Transcript: "${data.transcript}"`);
                }

                if (data.classification === 'Scam' && data.risk_score > 75) {
                  setInterruptionAlert(true);
                  setResult(data);

                  // Stop everything
                  stopLiveMonitoring();

                  // Play alert sound
                  const audio = new Audio('/alert.mp3');
                  audio.play().catch(() => { });
                }
              } else {
                addSttLog(`Backend returned ${response.status}`);
              }
            } catch (e: any) {
              addSttLog(`Backend error: ${e.message}`);
            }
          };

          // Record for 5 seconds
          recorder.start();
          setTimeout(() => {
            if (recorder.state === 'recording') recorder.stop();
          }, 5000);

        } catch (err: any) {
          addSttLog(`Recorder error: ${err.message}`);
        }
      };

      // Start the first chunk immediately
      recordAndSendChunk();

      // Schedule subsequent chunks
      liveIntervalRef.current = setInterval(recordAndSendChunk, 5000);

    } catch (e: any) {
      addSttLog(`Mic access failed: ${e.message}`);
      setError("Microphone access denied or error occurred.");
    }
  };

  const stopLiveMonitoring = () => {
    setIsLiveMonitoring(false);
    isLiveMonitoringRef.current = false;

    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach(track => track.stop());
      liveStreamRef.current = null;
    }
    addSttLog("Live monitoring stopped.");
  };

  const clearInput = () => {
    setMessage('');
    setUrl('');
    setSelectedImage(null);
    setImagePreview(null);
    setAudioBlob(null);
    setAudioURL(null);
    setRecordingTime(0);
    setLiveTranscript('');
    setInterruptionAlert(false);
    setSttDebugLog([]);
    stopLiveMonitoring();
    setResult(null);
    setError(null);
    setIsPlaying(false);
    setAudioProgress(0);
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
          response = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
          });
        } else {
          const formData = new FormData();
          formData.append('file', selectedImage as File);
          response = await fetch(`${API_URL}/analyze-image`, {
            method: 'POST',
            body: formData,
          });
        }
      } else if (activeTab === 'url') {
        response = await fetch(`${API_URL}/analyze-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
      } else if (activeTab === 'call') {
        const formData = new FormData();
        formData.append('file', audioBlob as Blob, "recording.webm");
        response = await fetch(`${API_URL}/analyze-audio`, {
          method: 'POST',
          body: formData,
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

  // --- Custom Audio Player Handlers ---
  const togglePlayPause = () => {
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioPlayerRef.current) {
      setAudioProgress((audioPlayerRef.current.currentTime / audioPlayerRef.current.duration) * 100 || 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioPlayerRef.current) {
      setAudioDuration(audioPlayerRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekValue = Number(e.target.value);
    if (audioPlayerRef.current) {
      const seekTime = (seekValue / 100) * audioPlayerRef.current.duration;
      audioPlayerRef.current.currentTime = seekTime;
      setAudioProgress(seekValue);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')} `;
  };


  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[var(--color-brand-primary)]/30">

      {/* --- NAVBAR --- */}
      <nav className="w-full flex items-center justify-between px-6 py-4 bg-[var(--color-base-nav)] border-b border-[var(--color-base-border)] z-50 sticky top-0 backdrop-blur-xl transition-colors">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-[var(--color-brand-primary)]" />
          <span className="text-xl font-bold tracking-tight text-[var(--color-base-text)]">Sentinel AI</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm text-[var(--color-base-muted)] font-medium font-sans hover:[&>a]:text-[var(--color-base-text)] transition-colors">
          <a href="#">Products</a>
          <a href="#">Resources</a>
          <a href="#">Contact</a>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button className="bg-[var(--color-base-text)] text-[var(--color-base-bg)] hover:opacity-90 px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm active:scale-95">
            Sign In
          </button>
        </div>
      </nav>

      <main className="flex-1 w-full relative overflow-hidden">

        {/* --- HERO SECTION --- */}
        <section className="relative w-full pt-20 pb-16 md:pt-32 md:pb-24 px-4 flex flex-col items-center justify-center text-center">
          {/* Glowing Background Blobs */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[var(--color-brand-primary)]/10 rounded-full blur-[120px] pointer-events-none dark:bg-[var(--color-brand-primary)]/20 transition-colors duration-700" />

          <div className="relative z-10 flex flex-col items-center max-w-5xl mx-auto">
            <div className="mb-6">
              <span className="pill-badge">
                <Shield className="w-4 h-4 text-[var(--color-brand-primary)]" /> Real-Time Protection
              </span>
            </div>

            <h1 className="text-5xl md:text-[5.5rem] font-bold tracking-tight mb-6 max-w-4xl text-[var(--color-base-text)] leading-[1.1] text-balance">
              AI-Powered Scam Detection <br className="hidden md:block" />
              in Real Time
            </h1>

            <p className="text-lg md:text-xl text-[var(--color-base-muted)] max-w-2xl mb-12 text-balance font-medium">
              Protect yourself from SMS scams, voice frauds, deepfakes, and malicious URLs with cutting-edge AI technology
            </p>

            {/* Pill Tab Switcher (matches reference image) */}
            <div className="flex items-center p-1.5 bg-[var(--color-base-nav)] border border-[var(--color-base-border)] rounded-full shadow-sm mb-16 backdrop-blur-md transition-all">
              <button
                onClick={() => { setActiveTab('message'); document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth' }); }}
                className={`px-6 md:px-8 py-3 rounded-full text-sm md:text-base font-semibold transition-all duration-300 ${activeTab === 'message' ? 'bg-[var(--color-brand-primary)] text-white shadow-md scale-105' : 'text-[var(--color-base-muted)] hover:text-[var(--color-base-text)]'}`}
              >
                Scan Message
              </button>
              <button
                onClick={() => { setActiveTab('call'); document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth' }); }}
                className={`px-6 md:px-8 py-3 rounded-full text-sm md:text-base font-semibold transition-all duration-300 ${activeTab === 'call' ? 'bg-[var(--color-brand-primary)] text-white shadow-md scale-105' : 'text-[var(--color-base-muted)] hover:text-[var(--color-base-text)]'}`}
              >
                Check Call
              </button>
              <button
                onClick={() => { setActiveTab('url'); document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth' }); }}
                className={`px-6 md:px-8 py-3 rounded-full text-sm md:text-base font-semibold transition-all duration-300 ${activeTab === 'url' ? 'bg-[var(--color-brand-primary)] text-white shadow-md scale-105' : 'text-[var(--color-base-muted)] hover:text-[var(--color-base-text)]'}`}
              >
                Analyze URL
              </button>
            </div>
          </div>
        </section>

        {/* --- ANALYZER SECTION --- */}
        <section id="analyzer" className="w-full max-w-5xl mx-auto px-4 py-8 md:py-16">
          <div className="glass-panel p-6 md:p-10 relative overflow-hidden bg-[var(--color-base-panel)] rounded-[2rem]">
            {/* Tab Header */}
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-[var(--color-base-border)]">
              {activeTab === 'message' && <MessageSquare className="w-7 h-7 text-[var(--color-brand-primary)]" />}
              {activeTab === 'call' && <Phone className="w-7 h-7 text-[var(--color-brand-primary)]" />}
              {activeTab === 'url' && <LinkIcon className="w-7 h-7 text-[var(--color-brand-primary)]" />}
              <h2 className="text-3xl font-bold tracking-tight text-[var(--color-base-text)]">
                {activeTab === 'message' ? 'Message Scanner' : activeTab === 'call' ? 'Voice Call Analysis' : 'URL Scanner'}
              </h2>
            </div>

            {/* Input Area */}
            {activeTab === 'message' ? (
              <div className="flex flex-col gap-6">

                {/* Input Toggle (matching user reference) */}
                <div className="flex items-center bg-[var(--color-base-bg)] p-1 rounded-[1rem] w-fit shadow-inner border border-[var(--color-base-border)] transition-all">
                  <button
                    onClick={() => setInputType('text')}
                    className={`px-5 py-2.5 rounded-[0.75rem] text-sm font-semibold transition-all duration-200 ${inputType === 'text' ? 'bg-[var(--color-base-panel)] text-[var(--color-base-text)] shadow-sm' : 'text-[var(--color-base-muted)] hover:text-[var(--color-base-text)]'}`}
                  >
                    Text
                  </button>
                  <button
                    onClick={() => setInputType('image')}
                    className={`px-5 py-2.5 rounded-[0.75rem] text-sm font-semibold transition-all duration-200 ${inputType === 'image' ? 'bg-[var(--color-base-panel)] text-[var(--color-base-text)] shadow-sm' : 'text-[var(--color-base-muted)] hover:text-[var(--color-base-text)]'}`}
                  >
                    Image
                  </button>
                </div>

                {inputType === 'text' ? (
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Paste a suspicious SMS, email, or WhatsApp message here..."
                    className="w-full h-40 bg-[var(--color-base-bg)] border border-[var(--color-base-border)] text-[var(--color-base-text)] p-5 rounded-2xl outline-none focus:border-[var(--color-brand-primary)] focus:ring-4 focus:ring-[var(--color-brand-primary)]/10 resize-none transition-all placeholder:text-[var(--color-base-muted)] shadow-inner"
                  />
                ) : (
                  <div className="w-full flex justify-center items-center">
                    {imagePreview ? (
                      <div className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden border border-[var(--color-base-border)] bg-[var(--color-base-bg)] flex items-center justify-center shadow-inner">
                        <img src={imagePreview} alt="Preview" className="max-h-full object-contain" />
                        <button onClick={clearInput} className="absolute top-3 right-3 bg-[var(--color-base-panel)] hover:bg-[var(--color-base-bg)] p-2 rounded-full text-[var(--color-base-text)] shadow-md transition-all">✕</button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-48 md:h-64 border-2 border-dashed border-[var(--color-base-border)] hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all gap-3 bg-[var(--color-base-bg)] shadow-inner"
                      >
                        <div className="w-14 h-14 bg-[var(--color-base-panel)] rounded-full flex items-center justify-center shadow-sm">
                          <UploadCloud className="w-7 h-7 text-[var(--color-brand-primary)]" />
                        </div>
                        <div className="text-center">
                          <p className="text-[var(--color-base-text)] font-semibold text-lg">Click to upload an image</p>
                          <p className="text-sm text-[var(--color-base-muted)] mt-1">PNG, JPG, JPEG up to 5MB</p>
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
                    <div className="text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-500/20 w-fit font-medium">
                      <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                  ) : <div />}

                  <div className="flex gap-3 w-full sm:w-auto">
                    {(message || url || selectedImage) && (
                      <button onClick={clearInput} className="px-6 py-3 rounded-xl text-sm font-semibold text-[var(--color-base-muted)] hover:text-[var(--color-base-text)] hover:bg-[var(--color-base-bg)] transition-colors mt-auto">
                        Clear
                      </button>
                    )}
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || (inputType === 'text' && !message) || (inputType === 'image' && !selectedImage)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(168,85,247,0.39)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.23)] hover:-translate-y-0.5 active:translate-y-0"
                    >
                      {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Send className="w-5 h-5" /> Analyze</>}
                    </button>
                  </div>
                </div>

                {/* Results Section */}
                {result && (
                  <div className="mt-8 pt-8 border-t border-[var(--color-base-border)] animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                      {/* Risk Score */}
                      <div className="md:col-span-1 bg-[var(--color-base-bg)] rounded-[2rem] p-6 border border-[var(--color-base-border)] flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                        <div className={`absolute inset-0 opacity-10 ${result.classification === 'Safe' ? 'bg-emerald-500' : result.classification === 'Suspicious' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        <h3 className="text-xs text-[var(--color-base-muted)] uppercase tracking-widest font-bold mb-4 z-10">Risk Score</h3>
                        <div className="relative w-28 h-28 flex items-center justify-center z-10">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(168,85,247,0.1)" strokeWidth="8" />
                            <circle
                              cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
                              strokeDasharray={`${result.risk_score * 2.827} 282.7`} strokeLinecap="round"
                              className={`transition-all duration-1000 ${getClassificationColor(result.classification, false)}`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--color-base-text)]">
                            <span className="text-3xl font-black">{result.risk_score}</span>
                            <span className="text-[10px] text-[var(--color-base-muted)] font-bold">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="md:col-span-3 flex flex-col gap-4">
                        <div className="bg-[var(--color-base-bg)] rounded-3xl p-5 border border-[var(--color-base-border)] flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${result.classification === 'Safe' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : result.classification === 'Suspicious' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                              {result.classification === 'Safe' ? <Shield className="w-6 h-6" /> : result.classification === 'Suspicious' ? <AlertTriangle className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                            </div>
                            <div>
                              <p className="text-xs text-[var(--color-base-muted)] uppercase tracking-widest font-bold">Status</p>
                              <p className="text-xl font-bold text-[var(--color-base-text)] tracking-tight">{result.classification}</p>
                            </div>
                          </div>
                          <div className={`px-5 py-2 rounded-full border text-xs font-black uppercase tracking-widest shadow-sm ${getClassificationColor(result.classification)}`}>
                            {result.classification}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                          <div className="bg-[var(--color-base-bg)] rounded-3xl p-6 border border-[var(--color-base-border)] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand-primary)]/5 to-[var(--color-base-bg)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <h4 className="relative z-10 flex items-center gap-2 text-sm font-bold text-[var(--color-base-text)] mb-3">
                              <Info className="w-5 h-5 text-[var(--color-brand-primary)]" /> AI Explanation
                            </h4>
                            <p className="relative z-10 text-sm text-[var(--color-base-muted)] leading-relaxed font-medium group-hover:text-[var(--color-base-text)] transition-colors duration-300">{result.explanation}</p>
                          </div>
                          <div className="bg-[var(--color-brand-primary)] rounded-3xl p-6 border border-[var(--color-brand-primary-hover)] shadow-[0_4px_14px_rgba(168,85,247,0.3)] hover:shadow-[0_10px_30px_-5px_rgba(168,85,247,0.5)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent transition-opacity duration-300" />
                            <h4 className="relative z-10 flex items-center gap-2 text-sm font-bold text-white mb-3 tracking-wide">
                              <CheckCircle2 className="w-5 h-5 text-white" /> Recommended Action
                            </h4>
                            <p className="relative z-10 text-sm font-semibold text-white/90 leading-relaxed group-hover:text-white transition-colors duration-300">{result.recommended_action}</p>
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
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <LinkIcon className="w-6 h-6 text-[var(--color-base-muted)]" />
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full h-16 bg-[var(--color-base-bg)] border border-[var(--color-base-border)] text-[var(--color-base-text)] p-4 pl-14 rounded-2xl outline-none focus:border-[var(--color-brand-primary)] focus:ring-4 focus:ring-[var(--color-brand-primary)]/10 transition-all font-mono shadow-inner placeholder:text-[var(--color-base-muted)] text-lg"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                  {error ? (
                    <div className="text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-500/20 w-fit font-medium">
                      <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                  ) : <div />}

                  <div className="flex gap-3 w-full sm:w-auto">
                    {url && (
                      <button onClick={clearInput} className="px-6 py-3 rounded-xl text-sm font-semibold text-[var(--color-base-muted)] hover:text-[var(--color-base-text)] hover:bg-[var(--color-base-bg)] transition-colors mt-auto">
                        Clear
                      </button>
                    )}
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !url}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(51,65,85,0.39)] hover:shadow-[0_6px_20px_rgba(51,65,85,0.23)] hover:-translate-y-0.5 active:translate-y-0"
                    >
                      {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Send className="w-5 h-5" /> Analyze URL</>}
                    </button>
                  </div>
                </div>

                {/* Results Section for URL */}
                {result && (
                  <div className="mt-8 pt-8 border-t border-[var(--color-base-border)] animate-in slide-in-from-bottom-4 fade-in duration-500 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                      {/* Risk Score */}
                      <div className="md:col-span-1 bg-[var(--color-base-bg)] rounded-[2rem] p-6 border border-[var(--color-base-border)] flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                        <div className={`absolute inset-0 opacity-10 ${result.classification === 'Safe' ? 'bg-emerald-500' : result.classification === 'Suspicious' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        <h3 className="text-xs text-[var(--color-base-muted)] uppercase tracking-widest font-bold mb-4 z-10">Risk Score</h3>
                        <div className="relative w-28 h-28 flex items-center justify-center z-10">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(168,85,247,0.1)" strokeWidth="8" />
                            <circle
                              cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
                              strokeDasharray={`${result.risk_score * 2.827} 282.7`} strokeLinecap="round"
                              className={`transition-all duration-1000 ${getClassificationColor(result.classification, false)}`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--color-base-text)]">
                            <span className="text-3xl font-black">{result.risk_score}</span>
                            <span className="text-[10px] text-[var(--color-base-muted)] font-bold">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="md:col-span-3 flex flex-col gap-4">
                        <div className="bg-[var(--color-base-bg)] rounded-3xl p-5 border border-[var(--color-base-border)] flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${result.classification === 'Safe' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : result.classification === 'Suspicious' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                              {result.classification === 'Safe' ? <Shield className="w-6 h-6" /> : result.classification === 'Suspicious' ? <AlertTriangle className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                            </div>
                            <div>
                              <p className="text-xs text-[var(--color-base-muted)] uppercase tracking-widest font-bold">Status</p>
                              <p className="text-xl font-bold text-[var(--color-base-text)] tracking-tight">{result.classification}</p>
                            </div>
                          </div>
                          <div className={`px-5 py-2 rounded-full border text-xs font-black uppercase tracking-widest shadow-sm ${getClassificationColor(result.classification)}`}>
                            {result.classification}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                          <div className="bg-[var(--color-base-bg)] rounded-3xl p-6 border border-[var(--color-base-border)] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-[var(--color-base-bg)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <h4 className="relative z-10 flex items-center gap-2 text-sm font-bold text-[var(--color-base-text)] mb-3">
                              <Info className="w-5 h-5 text-slate-500" /> AI Explanation
                            </h4>
                            <p className="relative z-10 text-sm text-[var(--color-base-muted)] leading-relaxed font-medium group-hover:text-[var(--color-base-text)] transition-colors duration-300">{result.explanation}</p>
                          </div>
                          <div className="bg-slate-800 dark:bg-slate-700 rounded-3xl p-6 border border-slate-700 dark:border-slate-600 shadow-[0_4px_14px_rgba(51,65,85,0.3)] hover:shadow-[0_10px_30px_-5px_rgba(51,65,85,0.5)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent transition-opacity duration-300" />
                            <h4 className="relative z-10 flex items-center gap-2 text-sm font-bold text-white mb-3 tracking-wide">
                              <CheckCircle2 className="w-5 h-5 text-white" /> Recommended Action
                            </h4>
                            <p className="relative z-10 text-sm font-semibold text-white/90 leading-relaxed group-hover:text-white transition-colors duration-300">{result.recommended_action}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'call' ? (
              <div className="flex flex-col gap-6 items-center">

                {interruptionAlert ? (
                  <div className="w-full flex flex-col items-center justify-center p-12 border-4 border-rose-500 rounded-[2rem] bg-rose-50 dark:bg-rose-500/10 animate-pulse relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-red-600/10 dark:bg-red-600/20 blur-3xl animate-pulse" />
                    <AlertTriangle className="w-24 h-24 text-rose-600 dark:text-rose-500 mb-6 drop-shadow-[0_4px_20px_rgba(244,63,94,0.4)] animate-bounce" />
                    <h2 className="text-4xl font-black text-rose-600 dark:text-rose-500 tracking-wider mb-2 text-center uppercase drop-shadow-sm">SCAM DETECTED</h2>
                    <h3 className="text-2xl font-bold text-[var(--color-base-text)] mb-8 text-center">HANG UP IMMEDIATELY</h3>
                    <button onClick={clearInput} className="relative z-10 px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl transition-all shadow-[0_8px_30px_rgba(244,63,94,0.4)] hover:scale-105 active:scale-95">
                      Dismiss Alert
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center justify-center p-8 md:p-12 border border-[var(--color-base-border)] rounded-[2.5rem] bg-[var(--color-base-bg)] shadow-inner transition-all">

                    {audioURL ? (
                      <div className="w-full max-w-xl flex items-center justify-between gap-4 bg-[var(--color-base-panel)] p-4 rounded-2xl border border-[var(--color-base-border)] shadow-sm">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Hidden actual audio element */}
                          <audio
                            ref={audioPlayerRef}
                            src={audioURL}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={() => setIsPlaying(false)}
                          />

                          {/* Custom Play Button */}
                          <button
                            onClick={togglePlayPause}
                            className="w-14 h-14 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] rounded-2xl flex items-center justify-center text-white transition-all shadow-md flex-shrink-0"
                          >
                            {isPlaying ? <Square className="w-5 h-5 fill-white" /> : <Play className="w-6 h-6 ml-1 fill-white" />}
                          </button>

                          {/* Custom Seek Bar */}
                          <div className="flex-1 flex flex-col gap-1.5 px-2">
                            <div className="flex justify-between text-xs text-[var(--color-base-muted)] font-mono font-bold">
                              <span>{formatTime(audioPlayerRef.current?.currentTime || 0)}</span>
                              <span>{formatTime(audioDuration)}</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={audioProgress}
                              onChange={handleSeek}
                              className="w-full h-2.5 bg-[var(--color-base-border)] rounded-full appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[var(--color-brand-primary)] [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                            />
                          </div>
                        </div>
                        <button onClick={clearInput} className="p-3 bg-[var(--color-base-bg)] rounded-xl text-[var(--color-base-muted)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shadow-inner" aria-label="Delete recording">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-8 py-4">
                        <div className={`relative flex items-center justify-center ${isRecording ? 'animate-pulse' : ''} `}>
                          {isRecording && <div className="absolute inset-0 bg-rose-500 rounded-[2rem] blur-2xl opacity-40 animate-pulse" />}
                          <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`relative z-10 w-28 h-28 rounded-[2rem] flex items-center justify-center transition-all duration-300 ${isRecording
                              ? 'bg-rose-500 hover:bg-rose-600 shadow-[0_10px_40px_rgba(244,63,94,0.4)] scale-95'
                              : 'bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] shadow-[0_10px_40px_rgba(168,85,247,0.3)] hover:scale-105'
                              }`}
                          >
                            {isRecording ? <Square className="w-10 h-10 text-white fill-white" /> : <Mic className="w-12 h-12 text-white" />}
                          </button>
                        </div>

                        <div className="text-center">
                          {isRecording ? (
                            <>
                              <h3 className="text-rose-600 dark:text-rose-400 font-black text-2xl tracking-tight">
                                Recording... {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
                              </h3>
                              <div className="flex justify-center items-center gap-1.5 mt-4 mb-4 h-10">
                                {/* Visualizer Bars */}
                                {Array.from({ length: 8 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-2 bg-rose-500 rounded-full transition-all duration-75"
                                    style={{ height: `${Math.max(6, (audioLevel / 255) * 40 * (Math.random() * 0.5 + 0.5))}px` }}
                                  />
                                ))}
                              </div>
                              <p className="text-[var(--color-base-muted)] text-sm font-medium mt-2">Speak into your microphone. Visualizer should move.</p>
                            </>
                          ) : (
                            <>
                              <h3 className="text-[var(--color-base-text)] font-bold text-xl tracking-tight">Tap to Record Call</h3>
                              <p className="text-[var(--color-base-muted)] text-sm font-medium mt-2 max-w-xs text-balance">Put your phone on speaker to record a suspicious call securely on your device.</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!interruptionAlert && (
                  <div className="w-full flex flex-col gap-6">
                    {/* Live STT Monitor */}
                    <div className="w-full bg-[var(--color-base-bg)] border border-[var(--color-base-border)] rounded-3xl p-6 md:p-8 shadow-inner">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                        <h4 className="flex items-center gap-2 font-bold text-[var(--color-base-text)]">
                          <Activity className="w-6 h-6 text-emerald-500" /> Live Call Monitor
                        </h4>
                        <button
                          onClick={isLiveMonitoring ? stopLiveMonitoring : startLiveMonitoring}
                          className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 shadow-sm ${isLiveMonitoring ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'}`}
                        >
                          {isLiveMonitoring ? <><Square className="w-4 h-4 fill-current" /> Stop</> : <><Mic className="w-4 h-4" /> Start Monitor</>}
                        </button>
                      </div>
                      <div className="bg-[var(--color-base-panel)] rounded-2xl p-6 min-h-[120px] border border-[var(--color-base-border)] font-medium text-[var(--color-base-text)] shadow-sm">
                        {isLiveMonitoring && !liveTranscript ? (
                          <span className="text-[var(--color-brand-primary)] animate-pulse flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Listening... please start speaking...</span>
                        ) : (
                          liveTranscript || <span className="text-[var(--color-base-muted)] italic">Live transcription will appear here. Useful for real-time scam disruption.</span>
                        )}
                      </div>

                      {/* Deep STT Debug Logs */}
                      {sttDebugLog.length > 0 && (
                        <div className="mt-4 text-xs font-mono text-[var(--color-base-muted)] bg-[var(--color-base-panel)] p-4 rounded-xl border border-[var(--color-base-border)]">
                          <p className="text-[var(--color-base-text)] font-semibold mb-2 border-b border-[var(--color-base-border)] pb-2 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> STT Diagnostics</p>
                          <div className="flex flex-col gap-1">
                            {sttDebugLog.map((log, i) => <div key={i}>{log}</div>)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                      {error ? (
                        <div className="text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-500/20 w-fit font-medium">
                          <AlertTriangle className="w-4 h-4" /> {error}
                        </div>
                      ) : <div />}

                      <div className="flex gap-3 w-full sm:w-auto">
                        {/* Only show analyze button if there is a recorded blob */}
                        <button
                          onClick={handleAnalyze}
                          disabled={isAnalyzing || !audioBlob || isRecording || isLiveMonitoring}
                          className="w-full sm:w-48 flex items-center justify-center gap-2 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(168,85,247,0.39)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.23)] hover:-translate-y-0.5 active:translate-y-0"
                        >
                          {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Send className="w-5 h-5" /> Analyze Call</>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Results Section for Voice Call */}
                {result && (
                  <div className="mt-8 pt-8 border-t border-[var(--color-base-border)] animate-in slide-in-from-bottom-4 fade-in duration-500 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                      {/* Risk Score */}
                      <div className="md:col-span-1 bg-[var(--color-base-bg)] rounded-[2rem] p-6 border border-[var(--color-base-border)] flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                        <div className={`absolute inset-0 opacity-10 ${result.classification === 'Safe' ? 'bg-emerald-500' : result.classification === 'Suspicious' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        <h3 className="text-xs text-[var(--color-base-muted)] uppercase tracking-widest font-bold mb-4 z-10">Risk Score</h3>
                        <div className="relative w-28 h-28 flex items-center justify-center z-10">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(168,85,247,0.1)" strokeWidth="8" />
                            <circle
                              cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
                              strokeDasharray={`${result.risk_score * 2.827} 282.7`} strokeLinecap="round"
                              className={`transition-all duration-1000 ${getClassificationColor(result.classification, false)}`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--color-base-text)]">
                            <span className="text-3xl font-black">{result.risk_score}</span>
                            <span className="text-[10px] text-[var(--color-base-muted)] font-bold">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="md:col-span-3 flex flex-col gap-4">
                        <div className="bg-[var(--color-base-bg)] rounded-3xl p-5 border border-[var(--color-base-border)] flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${result.classification === 'Safe' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : result.classification === 'Suspicious' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                              {result.classification === 'Safe' ? <Shield className="w-6 h-6" /> : result.classification === 'Suspicious' ? <AlertTriangle className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                            </div>
                            <div>
                              <p className="text-xs text-[var(--color-base-muted)] uppercase tracking-widest font-bold">Status</p>
                              <p className="text-xl font-bold text-[var(--color-base-text)] tracking-tight">{result.classification}</p>
                            </div>
                          </div>
                          <div className={`px-5 py-2 rounded-full border text-xs font-black uppercase tracking-widest shadow-sm ${getClassificationColor(result.classification)}`}>
                            {result.classification}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {result.transcript && (
                            <div className="bg-[var(--color-base-bg)] rounded-3xl p-6 border border-[var(--color-base-border)] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <h4 className="relative z-10 flex items-center gap-2 text-sm font-bold text-[var(--color-base-text)] mb-3">
                                <MessageSquare className="w-5 h-5 text-[var(--color-brand-primary)]" /> Processed Transcript
                              </h4>
                              <p className="relative z-10 text-sm text-[var(--color-base-muted)] leading-relaxed font-medium bg-[var(--color-base-panel)] group-hover:bg-[var(--color-base-bg)] p-4 rounded-2xl border border-[var(--color-base-border)] transition-colors duration-300 shadow-inner group-hover:shadow-sm">"{result.transcript}"</p>
                            </div>
                          )}
                          <div className="bg-[var(--color-brand-primary)] rounded-3xl p-6 border border-[var(--color-brand-primary-hover)] shadow-[0_4px_14px_rgba(168,85,247,0.3)] hover:shadow-[0_10px_30px_-5px_rgba(168,85,247,0.5)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                            <h4 className="relative z-10 flex items-center gap-2 text-sm font-bold text-white mb-3 tracking-wide">
                              <CheckCircle2 className="w-5 h-5 text-white" /> Recommended Action
                            </h4>
                            <p className="relative z-10 text-sm font-semibold text-white/90 leading-relaxed group-hover:text-white transition-colors duration-300">{result.recommended_action}</p>
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
        <section className="w-full max-w-6xl mx-auto px-4 py-24 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--color-base-text)] tracking-tight">The Growing Threat</h2>
          <p className="text-[var(--color-base-muted)] mb-16 text-lg font-medium">Digital scams are costing Indians billions every year</p>

          <div className="glass-panel p-10 md:p-16 rounded-[2.5rem] mb-12 relative overflow-hidden border border-rose-200 dark:border-rose-500/20 shadow-xl bg-[var(--color-base-panel)]">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50 dark:from-rose-500/5 to-transparent" />
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-rose-500 mb-6">
                <AlertTriangle className="w-10 h-10 md:w-12 md:h-12" />
                <h3 className="text-6xl md:text-8xl font-black tracking-tighter">1,25,000 <span className="text-3xl md:text-5xl">crore</span></h3>
              </div>
              <p className="text-2xl text-[var(--color-base-text)] font-black mb-3">Lost to Scams Annually in India</p>
              <p className="text-base text-[var(--color-base-muted)] font-semibold">And the number keeps growing every year</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-8 rounded-[2rem] flex flex-col items-center border border-[var(--color-brand-primary)]/20 shadow-md bg-gradient-to-br from-[var(--color-brand-primary)]/5 to-[var(--color-base-panel)] hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 bg-[var(--color-brand-primary)]/10 rounded-2xl flex items-center justify-center mb-6">
                <ShieldAlert className="w-8 h-8 text-[var(--color-brand-primary)]" />
              </div>
              <h4 className="text-4xl font-black text-[var(--color-brand-primary)] tracking-tight mb-2">95,000+</h4>
              <p className="text-[var(--color-base-text)] font-bold mb-1">Daily Scam Attempts</p>
              <p className="text-sm text-[var(--color-base-muted)]">Reported across India</p>
            </div>
            <div className="glass-panel p-8 rounded-[2rem] flex flex-col items-center border border-blue-500/20 shadow-md bg-gradient-to-br from-blue-500/5 to-[var(--color-base-panel)] hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                <Phone className="w-8 h-8 text-blue-500" />
              </div>
              <h4 className="text-4xl font-black text-blue-500 tracking-tight mb-2">77%</h4>
              <p className="text-[var(--color-base-text)] font-bold mb-1">Victims Unaware</p>
              <p className="text-sm text-[var(--color-base-muted)]">Until it's too late</p>
            </div>
            <div className="glass-panel p-8 rounded-[2rem] flex flex-col items-center border border-emerald-500/20 shadow-md bg-gradient-to-br from-emerald-500/5 to-[var(--color-base-panel)] hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-emerald-500" />
              </div>
              <h4 className="text-4xl font-black text-emerald-500 tracking-tight mb-2">85%</h4>
              <p className="text-[var(--color-base-text)] font-bold mb-1">Detection Rate</p>
              <p className="text-sm text-[var(--color-base-muted)]">With our AI technology</p>
            </div>
          </div>
        </section>

        {/* --- FEATURES SECTION --- */}
        <section className="w-full max-w-6xl mx-auto px-4 pb-24 pt-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-[var(--color-base-text)] tracking-tight">Comprehensive Protection</h2>
            <p className="text-[var(--color-base-muted)] font-medium text-lg">Multiple layers of AI-powered security to keep you safe</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: <MessageSquare className="text-blue-500 w-7 h-7" />, bg: 'bg-blue-500/10', color: 'group-hover:text-blue-500', title: 'SMS Detection', desc: 'Analyzes text messages for phishing attempts, fake links, and fraudulent patterns using NLP.' },
              { icon: <Phone className="text-purple-500 w-7 h-7" />, bg: 'bg-purple-500/10', color: 'group-hover:text-purple-500', title: 'Voice Scam Detection', desc: 'Real-time voice analysis to detect impersonation, AI-generated voices, and social engineering.' },
              { icon: <Video className="text-rose-500 w-7 h-7" />, bg: 'bg-rose-500/10', color: 'group-hover:text-rose-500', title: 'Deepfake Detector', desc: 'Advanced AI to identify deepfake videos and manipulated media with incredibly high accuracy.' },
              { icon: <LinkIcon className="text-amber-500 w-7 h-7" />, bg: 'bg-amber-500/10', color: 'group-hover:text-amber-500', title: 'URL Safety Scanner', desc: 'Checks URLs against databases of known scams and analyzes website behavior and metadata.' },
              { icon: <IndianRupee className="text-emerald-500 w-7 h-7" />, bg: 'bg-emerald-500/10', color: 'group-hover:text-emerald-500', title: 'Financial Risk Score', desc: 'Provides instant risk assessment for financial transactions and unknown payment links.' },
              { icon: <Cpu className="text-cyan-500 w-7 h-7" />, bg: 'bg-cyan-500/10', color: 'group-hover:text-cyan-500', title: 'Zero-Day Threats', desc: 'Our Gemini-powered engine generalizes to catch completely new, never-before-seen scam tactics.' }
            ].map((f, i) => (
              <div key={i} className="glass-panel p-8 rounded-[2rem] flex flex-col gap-5 group hover:border-[var(--color-base-border)] hover:bg-[var(--color-base-bg)] shadow-sm hover:shadow-md transition-all border border-[var(--color-base-border)]/50 bg-[var(--color-base-panel)]">
                <div className={`w-14 h-14 rounded-2xl ${f.bg} flex items-center justify-center`}>{f.icon}</div>
                <h3 className={`text-xl font-bold text-[var(--color-base-text)] ${f.color} transition-colors tracking-tight`}>{f.title}</h3>
                <p className="text-[var(--color-base-muted)] text-sm leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --- HOW IT WORKS SECTION --- */}
        <section className="w-full max-w-5xl mx-auto px-4 pb-32 text-center">
          <h2 className="text-4xl font-bold mb-4 text-[var(--color-base-text)] tracking-tight">How It Works</h2>
          <p className="text-[var(--color-base-muted)] mb-20 text-lg font-medium">Protection in three simple steps</p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-4 relative">
            <div className="hidden md:block absolute top-12 left-[18%] right-[18%] h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-20 dark:opacity-40 z-0 rounded-full" />

            {[
              { num: 1, title: 'User Input', desc: 'Submit your message, call recording, URL, or image for analysis.', color: 'from-blue-500 to-indigo-500', shadow: 'shadow-[0_10px_30px_rgba(59,130,246,0.3)]' },
              { num: 2, title: 'AI Analysis', desc: 'Our advanced AI models scan for patterns, anomalies, and scam indicators.', color: 'from-purple-500 to-fuchsia-500', shadow: 'shadow-[0_10px_30px_rgba(168,85,247,0.3)]' },
              { num: 3, title: 'Risk Score', desc: 'Get an instant safety rating with detailed explanations and recommendations.', color: 'from-emerald-400 to-teal-500', shadow: 'shadow-[0_10px_30px_rgba(16,185,129,0.3)]' },
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center flex-1 max-w-xs">
                <div className={`w-24 h-24 rounded-[2rem] bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-4xl font-black tracking-tighter mb-8 shadow-xl ${step.shadow} transform hover:-translate-y-2 transition-transform`}>
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-3 text-[var(--color-base-text)] tracking-tight">{step.title}</h3>
                <p className="text-sm text-[var(--color-base-muted)] font-medium leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="w-full bg-[var(--color-base-panel)] border-t border-[var(--color-base-border)] pt-20 pb-12 px-6 lg:px-20 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12 mb-16">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-8 h-8 text-[var(--color-brand-primary)]" />
              <span className="text-2xl font-bold tracking-tight text-[var(--color-base-text)]">Sentinel AI</span>
            </div>
            <p className="text-sm text-[var(--color-base-muted)] mb-8 font-medium leading-relaxed">AI-powered protection against digital scams and fraud. Built for the safety of our digital citizens.</p>
            <div className="flex gap-4">
              <button className="w-12 h-12 rounded-[1rem] bg-[var(--color-base-bg)] border border-[var(--color-base-border)] hover:bg-[var(--color-brand-primary)] hover:border-[var(--color-brand-primary)] flex items-center justify-center text-[var(--color-base-muted)] hover:text-white transition-all shadow-sm"><Github className="w-5 h-5" /></button>
              <button className="w-12 h-12 rounded-[1rem] bg-[var(--color-base-bg)] border border-[var(--color-base-border)] hover:bg-[var(--color-brand-primary)] hover:border-[var(--color-brand-primary)] flex items-center justify-center text-[var(--color-base-muted)] hover:text-white transition-all shadow-sm"><Twitter className="w-5 h-5" /></button>
              <button className="w-12 h-12 rounded-[1rem] bg-[var(--color-base-bg)] border border-[var(--color-base-border)] hover:bg-[var(--color-brand-primary)] hover:border-[var(--color-brand-primary)] flex items-center justify-center text-[var(--color-base-muted)] hover:text-white transition-all shadow-sm"><Mail className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex-1 max-w-xl">
            <h4 className="text-[var(--color-base-text)] font-bold mb-8 text-lg tracking-tight">Team <span className="text-[var(--color-brand-primary)]">Hack Homies</span></h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-6">
              {[
                { name: 'Jayant Olhyan', role: 'Team Leader', init: 'JO' },
                { name: 'Akhil Pratap Singh', role: 'Full Stack Developer', init: 'AS' },
                { name: 'Mithilesh Bisht', role: 'AI/ML Engineer', init: 'MB' }
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-[1rem] bg-[var(--color-base-bg)] border border-[var(--color-base-border)] group-hover:bg-[var(--color-brand-primary)] group-hover:border-[var(--color-brand-primary)] group-hover:text-white text-[var(--color-brand-primary)] flex items-center justify-center text-sm font-black shadow-sm transition-all duration-300">
                    {p.init}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--color-base-text)] group-hover:text-[var(--color-brand-primary)] transition-colors">{p.name}</p>
                    <p className="text-xs text-[var(--color-base-muted)] font-medium">{p.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[var(--color-base-text)] font-bold mb-8 text-lg tracking-tight">Quick Links</h4>
            <ul className="space-y-4 text-sm text-[var(--color-base-muted)] font-medium">
              <li><a href="#" className="hover:text-[var(--color-brand-primary)] transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-base-border)]" /> About Us</a></li>
              <li><a href="#" className="hover:text-[var(--color-brand-primary)] transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-base-border)]" /> Documentation</a></li>
              <li><a href="#" className="hover:text-[var(--color-brand-primary)] transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-base-border)]" /> Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[var(--color-brand-primary)] transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-base-border)]" /> Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-[var(--color-base-border)] text-sm font-medium text-[var(--color-base-muted)] gap-4">
          <p>© 2026 Sentinel AI. All rights reserved. Built with ❤️ in India.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[var(--color-base-text)] transition-colors">Disclaimer</a>
            <a href="#" className="hover:text-[var(--color-base-text)] transition-colors">Cookie Policy</a>
            <a href="#" className="hover:text-[var(--color-base-text)] transition-colors">Report a Bug</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
