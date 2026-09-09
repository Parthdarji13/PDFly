'use client';

import React, { useRef, useState, useEffect } from 'react';
import { X, PenTool, Type, Upload, RotateCcw, Check, Sparkles } from 'lucide-react';
import { SignatureElement } from '../../lib/types';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSignature: (signatureDataUrl: string, type: 'draw' | 'type' | 'upload') => void;
}

const SCRIPT_FONTS = [
  { id: 'GreatVibes', name: 'Great Vibes', family: '"Great Vibes", cursive' },
  { id: 'AlexBrush', name: 'Alex Brush', family: '"Alex Brush", cursive' },
  { id: 'Playfair', name: 'Playfair Italic', family: '"Playfair Display", serif', style: 'italic' },
  { id: 'TimesItalic', name: 'Formal Script', family: '"Times New Roman", Times, serif', style: 'italic' },
];

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onAddSignature,
}) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [sigColor, setSigColor] = useState<string>('#1e3a8a'); // Professional dark navy
  const [penWidth, setPenWidth] = useState<number>(3);

  // Type signature state
  const [typedName, setTypedName] = useState<string>('John Doe');
  const [selectedFont, setSelectedFont] = useState<string>('GreatVibes');

  // Draw signature state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Clear drawing canvas
  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(2, 2);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Canvas draw handlers (Supports Touch & Mouse)
  const getCanvasCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX =
      'touches' in e && e.touches.length > 0
        ? e.touches[0].clientX
        : (e as React.MouseEvent).clientX;
    const clientY =
      'touches' in e && e.touches.length > 0
        ? e.touches[0].clientY
        : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleStartDraw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = sigColor;
    ctx.lineWidth = penWidth;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const handleDrawMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const handleEndDraw = () => {
    setIsDrawing(false);
  };

  // Convert typed text to PNG Data URL
  const getTypedSignatureDataUrl = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const fontObj = SCRIPT_FONTS.find((f) => f.id === selectedFont) || SCRIPT_FONTS[0];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = sigColor;
    ctx.font = `${fontObj.style ? 'italic ' : ''}64px ${fontObj.family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName || 'Signature', 300, 100);

    return canvas.toDataURL('image/png');
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          // Remove white background automatically
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, img.width);
          canvas.height = Math.max(1, img.height);
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          // Key out bright background
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > 220 && g > 220 && b > 220) {
              data[i + 3] = 0; // Alpha transparent
            }
          }
          ctx.putImageData(imgData, 0, 0);
          onAddSignature(canvas.toDataURL('image/png'), 'upload');
          onClose();
        } catch (err) {
          console.error('Failed to process signature image:', err);
        }
      };
      img.onerror = () => {
        console.error('Failed to load signature image');
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      console.error('FileReader error while reading signature file');
    };
    reader.readAsDataURL(file);
  };

  // Apply and place signature
  const handleApplySignature = () => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      onAddSignature(canvas.toDataURL('image/png'), 'draw');
      onClose();
    } else if (activeTab === 'type') {
      const dataUrl = getTypedSignatureDataUrl();
      onAddSignature(dataUrl, 'type');
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title">Create Digital Signature</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Mode Switcher Tabs */}
          <div className="sig-tabs">
            <button
              className={`sig-tab-btn ${activeTab === 'draw' ? 'active' : ''}`}
              onClick={() => setActiveTab('draw')}
            >
              <PenTool size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Draw
            </button>
            <button
              className={`sig-tab-btn ${activeTab === 'type' ? 'active' : ''}`}
              onClick={() => setActiveTab('type')}
            >
              <Type size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Type Cursive
            </button>
            <button
              className={`sig-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Upload Image
            </button>
          </div>

          {/* Color Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ink Color:</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { name: 'Navy Blue', hex: '#1e3a8a' },
                { name: 'Black', hex: '#0f172a' },
                { name: 'Royal Blue', hex: '#2563eb' },
                { name: 'Dark Red', hex: '#991b1b' },
              ].map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setSigColor(c.hex)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: c.hex,
                    border: sigColor === c.hex ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    outlineOffset: '2px',
                    cursor: 'pointer',
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* ================= Tab: Draw ================= */}
          {activeTab === 'draw' && (
            <div>
              <div className="signature-canvas-container">
                <canvas
                  ref={canvasRef}
                  className="signature-canvas"
                  onMouseDown={handleStartDraw}
                  onMouseMove={handleDrawMove}
                  onMouseUp={handleEndDraw}
                  onMouseLeave={handleEndDraw}
                  onTouchStart={handleStartDraw}
                  onTouchMove={handleDrawMove}
                  onTouchEnd={handleEndDraw}
                />
                {!hasDrawn && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none',
                      fontSize: '13px',
                    }}
                  >
                    ✍️ Sign here using mouse or touch screen
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span>Pen Thickness:</span>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={penWidth}
                    onChange={(e) => setPenWidth(parseInt(e.target.value, 10))}
                  />
                </div>

                <button className="btn-secondary" onClick={handleClearCanvas}>
                  <RotateCcw size={14} />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= Tab: Type ================= */}
          {activeTab === 'type' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Your Full Name:
                </label>
                <input
                  type="text"
                  className="inspector-select"
                  style={{ width: '100%', padding: '10px 14px', fontSize: '15px' }}
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Enter name to sign..."
                />
              </div>

              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Select Script Font:
              </label>
              <div className="signature-fonts-grid">
                {SCRIPT_FONTS.map((font) => (
                  <div
                    key={font.id}
                    className={`sig-font-card ${selectedFont === font.id ? 'active' : ''}`}
                    onClick={() => setSelectedFont(font.id)}
                  >
                    <div
                      style={{
                        fontFamily: font.family,
                        fontStyle: font.style || 'normal',
                        fontSize: '24px',
                        color: sigColor,
                        marginBottom: '4px',
                      }}
                    >
                      {typedName || 'Signature'}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {font.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= Tab: Upload ================= */}
          {activeTab === 'upload' && (
            <div
              style={{
                border: '2px dashed var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Upload size={36} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600' }}>
                  Upload PNG or JPEG Signature
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  White background is automatically removed for clean transparent placement.
                </p>
              </div>

              <label className="btn-primary" style={{ cursor: 'pointer' }}>
                <Upload size={15} />
                <span>Browse File</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {activeTab !== 'upload' && (
            <button className="btn-primary" onClick={handleApplySignature}>
              <Check size={16} />
              <span>Insert Signature</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
