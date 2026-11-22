import React, { useState } from 'react';
import { Server, Wifi, CheckCircle2, AlertCircle, RefreshCw, X, Laptop, Smartphone, Globe, ClipboardPaste } from 'lucide-react';
import { getApiBase, isNativeMobile, getSystemHealth } from '../services/api';
import { GlassPanel, Button, Input } from './ui';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const currentUrl = getApiBase();
  const [url, setUrl] = useState(currentUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const isMobile = isNativeMobile();

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const cleanUrl = url.trim().replace(/\/+$/, '');
    try {
      const res = await fetch(`${cleanUrl}/health`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          success: true,
          message: `Connected successfully! Status: ${data.status}, Device: ${data.device?.toUpperCase() || 'CPU'}`,
        });
      } else {
        setTestResult({
          success: false,
          message: `Server returned HTTP ${res.status}: ${res.statusText}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Failed to connect to ${cleanUrl}. Check that the AI Engine is running.`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const clean = url.trim().replace(/\/+$/, '');
    if (clean) {
      localStorage.setItem('cracksense_api_base', clean);
    } else {
      localStorage.removeItem('cracksense_api_base');
    }
    setTestResult(null);
    onConfigSaved();
    onClose();
  };

  const handleReset = () => {
    localStorage.removeItem('cracksense_api_base');
    const defaultUrl = isMobile ? (import.meta.env.VITE_API_BASE_URL || 'http://10.57.2.244:8000') : 'http://127.0.0.1:8000';
    setUrl(defaultUrl);
    setTestResult(null);
    onConfigSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md">
        <GlassPanel variant="modal" className="p-6 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Server Connection</h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                {isMobile ? (
                  <>
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Cloud API (HTTPS) or Local Development</span>
                  </>
                ) : (
                  <>
                    <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Windows Desktop App</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 mb-4 leading-relaxed">
            {isMobile
              ? 'Connect over the internet via Cloud API (Cloudflare Tunnel, Render, etc.) on 4G/5G/Wi-Fi, or enter a local dev server IP.'
              : 'On desktop, CrackSense connects directly to your local AI engine on 127.0.0.1:8000.'}
          </p>

          {/* URL Input */}
          <div className="space-y-2 mb-4">
            <label className="text-xs font-medium text-slate-300">FastAPI Backend / Cloud API URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. https://xxxx.trycloudflare.com or http://10.57.2.244:8000"
              className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={async () => {
                try {
                  const clip = await navigator.clipboard.readText();
                  if (clip && (clip.startsWith('http://') || clip.startsWith('https://'))) {
                    setUrl(clip.trim());
                  }
                } catch {
                  // clipboard read blocked or unsupported
                }
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1"
            >
              <ClipboardPaste className="w-3 h-3" />
              <span>Paste from Clipboard</span>
            </button>
            <button
              type="button"
              onClick={() => setUrl('https://ai57lwrkaxpvcfaevaehnnxkfu0xmbxp.lambda-url.ap-southeast-2.on.aws')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer flex items-center gap-1"
            >
              <Globe className="w-3 h-3 text-amber-400" />
              <span>AWS Cloud 24/7</span>
            </button>
            <button
              type="button"
              onClick={() => setUrl('https://arsh15-cracksense-api.hf.space')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-all cursor-pointer flex items-center gap-1"
            >
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>HF Space Cloud</span>
            </button>
            <button
              type="button"
              onClick={() => setUrl('http://127.0.0.1:8000')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono border border-slate-600/40 bg-slate-800/40 text-slate-300 hover:bg-slate-700/40 transition-all cursor-pointer"
            >
              Localhost: 127.0.0.1:8000
            </button>
          </div>

          {/* Test connection result badge */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 mb-4 border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              )}
              <span className="leading-tight">{testResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Reset
            </button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTest}
                disabled={testing}
                className="gap-1.5"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                <span>Test</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
              >
                Save & Connect
              </Button>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};
