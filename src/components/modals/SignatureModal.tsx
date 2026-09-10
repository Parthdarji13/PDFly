'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, PenTool, Type, Upload, RotateCcw, Check, Sparkles } from 'lucide-react';

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

/**
 * Trim transparent whitespace surrounding a canvas drawing for clean bounding placement
 */
function getTrimmedSignatureDataUrl(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  const width = canvas.width;
  const height = canvas.height;
  if (width === 0 || height === 0) return canvas.toDataURL('image/png');

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    if (!found) {
      return canvas.toDataURL('image/png');
    }

    const padding = 16;
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropWidth = Math.min(width - cropX, maxX - minX + padding * 2);
    const cropHeight = Math.min(height - cropY, maxY - minY + padding * 2);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return canvas.toDataURL('image/png');

    croppedCtx.drawImage(
      canvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    return croppedCanvas.toDataURL('image/png');
  } catch {
    return canvas.toDataURL('image/png');
  }
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Synchronize canvas buffer resolution with DOM dimensions and pixel ratio
  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      // Preserve existing drawing if any
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      const hasContent = canvas.width > 0 && canvas.height > 0;
      if (tempCtx && hasContent) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = sigColor;
        ctx.lineWidth = penWidth;

        if (hasContent && tempCanvas.width > 0 && tempCanvas.height > 0) {
          ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
        }
      }
    }
  }, [sigColor, penWidth]);

  // Handle ResizeObserver to track layout changes and animation settling
  useEffect(() => {
    if (!isOpen || activeTab !== 'draw') return;

    syncCanvasSize();

    // Re-check after animation finishes
    const timer1 = setTimeout(syncCanvasSize, 50);
    const timer2 = setTimeout(syncCanvasSize, 200);

    const container = containerRef.current;
    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        syncCanvasSize();
      });
      observer.observe(container);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (observer) observer.disconnect();
    };
  }, [isOpen, activeTab, syncCanvasSize]);

  // Clear drawing canvas
  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = sigColor;
    ctx.lineWidth = penWidth;
    setHasDrawn(false);
    lastPointRef.current = null;
  };

  if (!isOpen) return null;

  // Convert client pointer or touch coordinates to canvas coordinate space
  const getCanvasCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        return null;
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleStartDraw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if ('touches' in e) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width === 0 || canvas.height === 0) {
      syncCanvasSize();
    }

    const coords = getCanvasCoords(e);
    if (!coords) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = sigColor;
    ctx.lineWidth = penWidth;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineTo(coords.x + 0.01, coords.y + 0.01);
    ctx.stroke();

    lastPointRef.current = coords;
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const handleDrawMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    if ('touches' in e) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    const last = lastPointRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x + 0.01, coords.y + 0.01);
      ctx.stroke();
    }

    lastPointRef.current = coords;
  };

  const handleEndDraw = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.closePath();
      }
      setIsDrawing(false);
      lastPointRef.current = null;
    }
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

    return getTrimmedSignatureDataUrl(canvas);
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
          onAddSignature(getTrimmedSignatureDataUrl(canvas), 'upload');
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
      onAddSignature(getTrimmedSignatureDataUrl(canvas), 'draw');
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
              Draw Signature
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
                  onClick={() => {
                    setSigColor(c.hex);
                    const canvas = canvasRef.current;
                    const ctx = canvas?.getContext('2d');
                    if (ctx) {
                      ctx.strokeStyle = c.hex;
                    }
                  }}
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
              <div ref={containerRef} className="signature-canvas-container">
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
                  <div className="signature-canvas-hint">
                    ✍️ Draw signature with mouse, stylus or finger
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
                    onChange={(e) => {
                      const newWidth = parseInt(e.target.value, 10);
                      setPenWidth(newWidth);
                      const canvas = canvasRef.current;
                      const ctx = canvas?.getContext('2d');
                      if (ctx) {
                        ctx.lineWidth = newWidth;
                      }
                    }}
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
