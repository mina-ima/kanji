
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

interface KanjiCanvasProps {
  onDraw: () => void;
}

export interface KanjiCanvasRef {
  clear: () => void;
  getCanvasData: () => string | null;
  isCanvasEmpty: () => boolean;
}

const KanjiCanvas = forwardRef<KanjiCanvasRef, KanjiCanvasProps>(({ onDraw }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(ratio, ratio);
        ctx.strokeStyle = '#334155'; // slate-700
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setContext(ctx);
      }
    }
  }, []);

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const { offsetX, offsetY } = getCoordinates(event);
    if (context) {
      context.beginPath();
      context.moveTo(offsetX, offsetY);
      setIsDrawing(true);
    }
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return;
    event.preventDefault();
    const { offsetX, offsetY } = getCoordinates(event);
    context.lineTo(offsetX, offsetY);
    context.stroke();
  };

  const stopDrawing = () => {
    if (context) {
      context.closePath();
    }
    setIsDrawing(false);
    onDraw();
  };

  const getCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in event) {
        return {
            offsetX: event.touches[0].clientX - rect.left,
            offsetY: event.touches[0].clientY - rect.top
        };
    }
    return {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
    };
  }

  useImperativeHandle(ref, () => ({
    clear: () => {
      if (context && canvasRef.current) {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    },
    getCanvasData: () => {
        const canvas = canvasRef.current;
        if (!canvas || isCanvasEmpty()) return null;
        return canvas.toDataURL('image/png');
    },
    isCanvasEmpty: isCanvasEmpty,
  }));
  
  const isCanvasEmpty = (): boolean => {
    const canvas = canvasRef.current;
    if (!context || !canvas) return true;
    const pixelBuffer = new Uint32Array(
      context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    return !pixelBuffer.some(color => color !== 0);
  };


  return (
    <div className="w-full aspect-square bg-white rounded-2xl shadow-lg p-2 relative">
      <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
        <div className="w-full h-[2px] bg-gray-200"></div>
        <div className="h-full w-[2px] bg-gray-200"></div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair touch-none"
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

export default KanjiCanvas;
