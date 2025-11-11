
import React, { useState, useRef } from 'react';
import KanjiCanvas, { type KanjiCanvasRef } from './KanjiCanvas';
import { grade1Kanji } from '../services/kanjiData';
import type { Kanji } from '../types';
import { ArrowLeftIcon, ArrowRightIcon, RefreshIcon } from './Icons';

const PracticeMode: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const canvasRef = useRef<KanjiCanvasRef>(null);

  const currentKanji: Kanji = grade1Kanji[currentIndex];

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % grade1Kanji.length);
    canvasRef.current?.clear();
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + grade1Kanji.length) % grade1Kanji.length);
    canvasRef.current?.clear();
  };
  
  const handleClear = () => {
    canvasRef.current?.clear();
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 p-4">
      <div className="w-full max-w-sm md:w-1/2 flex flex-col items-center gap-4">
        <div className="w-full bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md text-center">
            <p className="text-slate-500">かんじ</p>
            <h2 className="text-8xl font-bold text-slate-800 my-2">{currentKanji.character}</h2>
            <div className="space-y-2 text-lg">
                <p><span className="font-bold text-slate-500">よみ:</span> <span className="text-slate-700 font-semibold">{currentKanji.reading}</span></p>
                <p><span className="font-bold text-slate-500">いみ:</span> <span className="text-slate-700 font-semibold">{currentKanji.meaning}</span></p>
            </div>
        </div>
        <div className="flex items-center justify-center gap-4 w-full">
            <button onClick={goToPrevious} className="p-4 bg-white rounded-full shadow-md hover:bg-amber-100 transition-transform transform hover:scale-105">
                <ArrowLeftIcon className="w-6 h-6 text-slate-600" />
            </button>
            <button onClick={handleClear} className="px-8 py-4 bg-orange-500 text-white font-bold rounded-full shadow-lg hover:bg-orange-600 transition-transform transform hover:scale-105 text-xl flex items-center gap-2">
                <RefreshIcon className="w-6 h-6" />
                けす
            </button>
            <button onClick={goToNext} className="p-4 bg-white rounded-full shadow-md hover:bg-amber-100 transition-transform transform hover:scale-105">
                <ArrowRightIcon className="w-6 h-6 text-slate-600" />
            </button>
        </div>
      </div>
      <div className="w-full max-w-sm md:w-1/2">
        <KanjiCanvas ref={canvasRef} onDraw={() => {}}/>
      </div>
    </div>
  );
};

export default PracticeMode;
