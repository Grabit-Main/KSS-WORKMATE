import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn, ZoomOut, RotateCw, RotateCcw, FlipHorizontal,
  RefreshCw, Check, X, Move, Sparkles
} from 'lucide-react';

export const ImageCropModal = ({ imageSrc, onCropSave, onClose, isUploading }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const imgRef = useRef(null);

  // Load image
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
      setZoom(1);
      setRotation(0);
      setFlipH(false);
      setPan({ x: 0, y: 0 });
    };
  }, [imageSrc]);

  // Main Canvas Render
  const drawMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current || !imgLoaded) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const img = imgRef.current;

    ctx.clearRect(0, 0, width, height);

    // Save context for transformed image drawing
    ctx.save();
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -zoom : zoom, zoom);

    // Calculate aspect ratio fitting
    const aspect = img.width / img.height;
    let drawW, drawH;
    if (aspect > 1) {
      drawH = 260;
      drawW = 260 * aspect;
    } else {
      drawW = 260;
      drawH = 260 / aspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Draw dark overlay with transparent circular aperture
    const circleRadius = 130;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.arc(width / 2, height / 2, circleRadius, 0, Math.PI * 2, true);
    ctx.fill();

    // Draw circular border guide
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, circleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner subtle grid crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(width / 2 - circleRadius, height / 2);
    ctx.lineTo(width / 2 + circleRadius, height / 2);
    ctx.moveTo(width / 2, height / 2 - circleRadius);
    ctx.lineTo(width / 2, height / 2 + circleRadius);
    ctx.stroke();
    ctx.restore();
  }, [imgLoaded, pan, zoom, rotation, flipH]);

  // Mini Preview Render
  const drawPreview = useCallback(() => {
    const preview = previewCanvasRef.current;
    if (!preview || !imgRef.current || !imgLoaded) return;
    const ctx = preview.getContext('2d');
    const size = preview.width; // 70px
    const img = imgRef.current;

    ctx.clearRect(0, 0, size, size);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    // Scale factor from main canvas (340px) to preview (70px)
    const scaleFactor = size / 340;
    ctx.translate(size / 2 + pan.x * scaleFactor, size / 2 + pan.y * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -zoom * scaleFactor : zoom * scaleFactor, zoom * scaleFactor);

    const aspect = img.width / img.height;
    let drawW, drawH;
    if (aspect > 1) {
      drawH = 260;
      drawW = 260 * aspect;
    } else {
      drawW = 260;
      drawH = 260 / aspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [imgLoaded, pan, zoom, rotation, flipH]);

  useEffect(() => {
    drawMainCanvas();
    drawPreview();
  }, [drawMainCanvas, drawPreview]);

  // Mouse / Touch Dragging
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleRotate = (deg) => {
    setRotation((prev) => (prev + deg + 360) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setPan({ x: 0, y: 0 });
  };

  // Generate cropped output blob and save
  const handleApplyCrop = () => {
    if (!imgRef.current || !imgLoaded) return;
    const img = imgRef.current;

    const outputCanvas = document.createElement('canvas');
    const outSize = 400; // High resolution 400x400 output
    outputCanvas.width = outSize;
    outputCanvas.height = outSize;
    const ctx = outputCanvas.getContext('2d');

    // Scale from the 260px circle on the 340px canvas
    const scaleFactor = outSize / 260;

    ctx.save();
    ctx.translate(outSize / 2 + pan.x * scaleFactor, outSize / 2 + pan.y * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -zoom * scaleFactor : zoom * scaleFactor, zoom * scaleFactor);

    const aspect = img.width / img.height;
    let drawW, drawH;
    if (aspect > 1) {
      drawH = 260;
      drawW = 260 * aspect;
    } else {
      drawW = 260;
      drawH = 260 / aspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    outputCanvas.toBlob((blob) => {
      if (blob) {
        const previewUrl = URL.createObjectURL(blob);
        onCropSave(blob, previewUrl);
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="card modal-animate" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '24px',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-float)',
        border: '1px solid var(--border)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Crop & Adjust Photo
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Drag to position, zoom, and rotate for the perfect profile avatar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            style={{
              background: 'var(--subtle)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: isUploading ? 'not-allowed' : 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Viewport Canvas with Drag Controls */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <canvas
            ref={canvasRef}
            width={340}
            height={340}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              borderRadius: 'var(--radius-lg)',
              cursor: isDragging ? 'grabbing' : 'grab',
              background: '#090D16',
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
              touchAction: 'none'
            }}
          />

          {/* Hint badge */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(6px)',
            color: 'white',
            fontSize: '11px',
            padding: '3px 10px',
            borderRadius: 'var(--radius-full)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <Move size={12} /> Drag image to adjust
          </div>
        </div>

        {/* Controls Panel */}
        <div style={{
          background: 'var(--subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '18px'
        }}>
          {/* Zoom Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>

            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--brand-600)', cursor: 'pointer' }}
            />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>

            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '38px', textAlign: 'right' }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Transformation Buttons & Mini Preview */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleRotate(-90)}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '12px', gap: '4px' }}
                title="Rotate 90° Left"
              >
                <RotateCcw size={14} />
                <span>-90°</span>
              </button>

              <button
                type="button"
                onClick={() => handleRotate(90)}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '12px', gap: '4px' }}
                title="Rotate 90° Right"
              >
                <RotateCw size={14} />
                <span>+90°</span>
              </button>

              <button
                type="button"
                onClick={() => setFlipH(!flipH)}
                className="btn btn-secondary"
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  gap: '4px',
                  background: flipH ? 'var(--brand-100)' : undefined,
                  color: flipH ? 'var(--brand-700)' : undefined
                }}
                title="Flip Horizontal"
              >
                <FlipHorizontal size={14} />
                <span>Flip</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '6px 8px'
                }}
              >
                Reset
              </button>
            </div>

            {/* Live Result Circular Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-full)',
                border: '2px solid var(--brand-500)',
                overflow: 'hidden',
                background: '#000',
                boxShadow: 'var(--shadow-card)'
              }}>
                <canvas ref={previewCanvasRef} width={70} height={70} style={{ width: '100%', height: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="btn btn-secondary"
            style={{ fontSize: '13px', padding: '9px 18px' }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={isUploading || !imgLoaded}
            className="btn btn-primary"
            style={{ gap: '8px', fontSize: '13px', padding: '9px 22px' }}
          >
            {isUploading ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Uploading Photo...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Apply & Save Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
