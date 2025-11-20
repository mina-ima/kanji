
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

interface KanjiCanvasProps {
  onDraw: () => void;
  onStrokeStart?: () => void;
  onStrokeEnd?: () => void;
  guideCharacter?: string;
}

export interface KanjiCanvasRef {
  clear: () => void;
  getCanvasData: () => string | null;
  isCanvasEmpty: () => boolean;
}

const KanjiCanvas = forwardRef<KanjiCanvasRef, KanjiCanvasProps>(({ onDraw, onStrokeStart, onStrokeEnd, guideCharacter }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  // We store the context in a ref to access it in event handlers without re-renders
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Helper to draw the background grid and guide character
  const drawGuide = (ctx: CanvasRenderingContext2D, width: number, height: number, char?: string) => {
    ctx.clearRect(0, 0, width, height);
    
    // --- Draw Grid (Masu) ---
    ctx.save();
    ctx.strokeStyle = '#cbd5e1'; // slate-300
    ctx.lineWidth = 2; 
    ctx.setLineDash([width * 0.02, width * 0.02]); 
    
    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    
    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    ctx.restore();

    // --- Draw Guide Character ---
    if (char) {
        ctx.save();
        // Use Yuji Syuku for better Tehon visualization (Hane, Tome)
        ctx.font = `${width * 0.8}px 'Yuji Syuku', 'Klee One', serif`;
        ctx.fillStyle = '#e2e8f0'; // slate-200
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Center text adjustment
        ctx.fillText(char, width / 2, height / 2 + (width * 0.03)); 
        ctx.restore();
    }
  };

  // Initialize and handle resizing
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const guideCanvas = guideCanvasRef.current;

    if (!container || !canvas || !guideCanvas) return;

    const handleResize = () => {
        // Get the precise display size of the canvas element
        // We use clientWidth/Height which matches the CSS pixels inside the border
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        if (width === 0 || height === 0) return;

        const dpr = window.devicePixelRatio || 1;

        // 1. Set the physical buffer size (High DPI)
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        guideCanvas.width = width * dpr;
        guideCanvas.height = height * dpr;

        // 2. Scale the context so drawing operations use CSS pixels (0 to width)
        // This fixes the 1/4 size issue and coordinate complexity
        const ctx = canvas.getContext('2d');
        const guideCtx = guideCanvas.getContext('2d');

        if (ctx) {
            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#1e293b';
            ctx.fillStyle = '#1e293b';
            ctx.lineWidth = 6; // Visual thickness in CSS pixels
            contextRef.current = ctx;
        }

        if (guideCtx) {
            guideCtx.scale(dpr, dpr);
            // Wait for font to load before drawing if possible, or just draw
            document.fonts.ready.then(() => {
                drawGuide(guideCtx, width, height, guideCharacter);
            });
        }
    };

    // Initial setup
    handleResize();

    // Watch for size changes
    const resizeObserver = new ResizeObserver(() => {
        handleResize();
    });
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [guideCharacter]); // Re-run if guide character changes

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      if (canvas && ctx) {
        // Clear using the logical size (since context is scaled)
        // We calculate logical size from buffer size
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      }
    },
    getCanvasData: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);
        return tempCanvas.toDataURL('image/jpeg', 0.9);
      }
      return null;
    },
    isCanvasEmpty: () => {
       // A simple check if canvas is effectively empty could be added here,
       // but for now we rely on state management in parent
       return false; 
    }
  }));

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    // getBoundingClientRect returns the position relative to the viewport
    // This automatically accounts for scroll position
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if ('touches' in event) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        const mouseEvent = event as React.MouseEvent;
        clientX = mouseEvent.clientX;
        clientY = mouseEvent.clientY;
    }

    // Since we used ctx.scale(dpr, dpr), we can just use CSS pixel difference.
    // This avoids the "offset" and "1/4 size" bugs caused by manual scaling errors.
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    // Prevent default only for touch to stop scrolling, but allow mouse interaction
    if (event.cancelable && event.type !== 'mousedown') event.preventDefault();
    if (onStrokeStart) onStrokeStart();
    
    const { x, y } = getCoordinates(event);
    const ctx = contextRef.current;
    
    if (ctx) {
      setIsDrawing(true);
      lastPos.current = { x, y };

      ctx.beginPath();
      // Draw a dot
      ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPos.current) return;
    if (event.cancelable) event.preventDefault(); // Vital for preventing scroll on mobile
    
    const { x, y } = getCoordinates(event);
    const ctx = contextRef.current;
    
    if (ctx) {
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        lastPos.current = { x, y };
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
        setIsDrawing(false);
        lastPos.current = null;
        onDraw();
        if (onStrokeEnd) onStrokeEnd();
    }
  };

  return (
    <div 
        ref={containerRef}
        className="relative w-full aspect-square bg-white rounded-xl border-4 border-slate-200 shadow-inner overflow-hidden touch-none"
        style={{ touchAction: 'none' }} // Explicit inline style for safety
    >
        {/* Guide Canvas */}
        <canvas 
            ref={guideCanvasRef} 
            className="absolute inset-0 w-full h-full pointer-events-none block"
        />
        {/* Drawing Canvas */}
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full block cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
        />
    </div>
  );
});

KanjiCanvas.displayName = "KanjiCanvas";

export default KanjiCanvas;