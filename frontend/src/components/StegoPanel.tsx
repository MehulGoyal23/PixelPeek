import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Unlock, FileText, Sliders, 
  Download, Copy, Activity, HelpCircle, Loader2, Check 
} from 'lucide-react';
import { ImageMetadata, StegoAnalysisResponse, StegoDecodeResponse } from '../types';

interface StegoPanelProps {
  image: ImageMetadata;
  analysis: StegoAnalysisResponse | null;
  onClose: () => void;
}

export const StegoPanel: React.FC<StegoPanelProps> = ({ image, analysis, onClose }) => {
  const [mode, setMode] = useState<'eof' | 'lsb'>('eof');
  const [channels, setChannels] = useState<string>('RGB');
  const [numBits, setNumBits] = useState<number>(1);
  const [stopMarker, setStopMarker] = useState<string>('\\x00');
  const [decoding, setDecoding] = useState<boolean>(false);
  const [result, setResult] = useState<StegoDecodeResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Set default mode based on analysis indicators
  useEffect(() => {
    if (analysis) {
      if (analysis.status === 'detected') {
        setMode('eof');
      } else if (analysis.status === 'suspected') {
        setMode('lsb');
      }
    }
    setResult(null);
    setError(null);
  }, [analysis, image]);

  const handleChannelToggle = (ch: string) => {
    setChannels(prev => {
      let updated = prev;
      if (prev.includes(ch)) {
        updated = prev.replace(ch, '');
      } else {
        // Keep order R-G-B-A
        const order = ['R', 'G', 'B', 'A'];
        const list = (prev + ch).split('');
        updated = order.filter(item => list.includes(item)).join('');
      }
      return updated || 'R'; // Ensure at least one channel is selected
    });
  };

  const handleDecode = async () => {
    setDecoding(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/images/${image.id}/stego/decode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          channels: mode === 'lsb' ? channels : undefined,
          num_bits: mode === 'lsb' ? numBits : undefined,
          stop_marker: mode === 'lsb' && stopMarker ? stopMarker : undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to decrypt stego data');
      }

      const data = await res.json() as StegoDecodeResponse;
      if (data.success) {
        setResult(data);
      } else {
        setError(data.detail || 'No data was decoded');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error decoding payload');
    } finally {
      setDecoding(false);
    }
  };

  const handleCopy = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!result?.payload_hex) return;

    // Convert hex back to raw binary
    const hex = result.payload_hex;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }

    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Choose appropriate name
    const baseName = image.filename.substring(0, image.filename.lastIndexOf('.'));
    const ext = result.is_text ? 'txt' : 'bin';
    a.download = `${baseName}_decrypted_payload.${ext}`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isTrailingDetected = analysis?.trailing_data.has_trailing_data;
  const isEntropySuspected = analysis?.entropy.suspected;

  return (
    <div className="glass-panel meta-panel stego-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={onClose} className="btn-icon-back" aria-label="Go back to metadata">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="panel-title">Stego Decrypter</div>
            <div className="panel-subtitle">{image.filename}</div>
          </div>
        </div>
      </div>

      {/* Analysis Reports */}
      {analysis && (
        <div className="stego-reports">
          <h4 className="section-title">
            <Activity size={14} /> Scan Results
          </h4>
          
          <div className="report-badges">
            <div className={`report-badge ${isTrailingDetected ? 'danger' : 'success'}`}>
              <span>Appended Data (EOF):</span>
              <strong>{isTrailingDetected ? `Detected (${analysis.trailing_data.length} bytes)` : 'None'}</strong>
            </div>
            
            <div className={`report-badge ${isEntropySuspected ? 'warning' : 'success'}`}>
              <span>High Entropy LSB:</span>
              <strong>{isEntropySuspected ? 'Suspected' : 'None'}</strong>
            </div>
          </div>

          {/* Show trailing preview if text */}
          {isTrailingDetected && analysis.trailing_data.is_text && analysis.trailing_data.preview && (
            <div className="stego-preview-box">
              <span className="preview-label">Appended Text Preview:</span>
              <pre className="preview-content">{analysis.trailing_data.preview}</pre>
            </div>
          )}
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="stego-tabs">
        <button 
          className={`stego-tab ${mode === 'eof' ? 'active' : ''}`}
          onClick={() => { setMode('eof'); setResult(null); setError(null); }}
        >
          <FileText size={14} /> Trailing EOF Data
        </button>
        <button 
          className={`stego-tab ${mode === 'lsb' ? 'active' : ''}`}
          onClick={() => { setMode('lsb'); setResult(null); setError(null); }}
        >
          <Sliders size={14} /> LSB Decrypter
        </button>
      </div>

      {/* Config Form */}
      <div className="stego-config">
        {mode === 'eof' && (
          <div className="config-desc">
            Extracts any data concatenated after the standard image EOF marker (e.g. at the end of a JPEG or PNG file). Often contains plain text, scripts, or embedded archives.
          </div>
        )}

        {mode === 'lsb' && (
          <div className="lsb-config-form">
            <div className="form-row">
              <label className="filter-label">Target Channels</label>
              <div className="channel-buttons">
                {['R', 'G', 'B', 'A'].map(ch => {
                  const active = channels.includes(ch);
                  return (
                    <button 
                      key={ch}
                      type="button"
                      className={`btn-ch ${active ? 'active' : ''}`}
                      onClick={() => handleChannelToggle(ch)}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-row">
              <label className="filter-label" htmlFor="numBits">Bits per Channel</label>
              <select 
                id="numBits"
                className="select-custom" 
                value={numBits}
                onChange={(e) => setNumBits(parseInt(e.target.value))}
              >
                <option value={1}>1-bit (Standard LSB)</option>
                <option value={2}>2-bits</option>
                <option value={4}>4-bits</option>
                <option value={8}>8-bits</option>
              </select>
            </div>

            <div className="form-row">
              <label className="filter-label" htmlFor="stopMarker">Stop Marker (Optional)</label>
              <input 
                id="stopMarker"
                type="text" 
                className="input-text" 
                placeholder="e.g. \x00 or [END]"
                value={stopMarker}
                onChange={(e) => setStopMarker(e.target.value)}
              />
              <span className="input-helper">Stops extraction once this sequence is parsed (e.g., standard Null Byte).</span>
            </div>
          </div>
        )}

        <button 
          className="btn btn-primary btn-decode"
          onClick={handleDecode}
          disabled={decoding}
        >
          {decoding ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Decrypting...
            </>
          ) : (
            <>
              <Unlock size={16} /> Decrypt Stego Data
            </>
          )}
        </button>
      </div>

      {/* Results Section */}
      {error && (
        <div className="stego-error">
          <strong>Decryption Failed:</strong> {error}
        </div>
      )}

      {result && (
        <div className="stego-result-section animate-fade-in">
          <div className="result-header">
            <h4 className="section-title">
              <Unlock size={14} /> Decrypted Payload
            </h4>
            <div className="result-actions">
              {result.is_text && result.text && (
                <button className="btn-result-action" onClick={handleCopy} title="Copy to clipboard">
                  {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                </button>
              )}
              {result.payload_hex && (
                <button className="btn-result-action" onClick={handleDownload} title="Download binary file">
                  <Download size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="result-meta">
            <span>Decoded size: <strong>{result.length} bytes</strong></span>
            <span>Format: <strong>{result.is_text ? 'Plain Text' : 'Binary Payload'}</strong></span>
          </div>

          {result.is_text ? (
            <textarea 
              readOnly 
              className="stego-text-output" 
              value={result.text || ''}
              placeholder="No text was extracted"
            />
          ) : (
            <div className="stego-binary-output">
              <HelpCircle size={28} className="text-muted" />
              <div>
                <strong>Binary payload extracted.</strong>
                <p>Click the download icon on the top right to save the payload as a file for external inspection (e.g. hex editors, binwalk).</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
