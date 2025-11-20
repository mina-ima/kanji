
import React, { useState, useRef, useEffect, useCallback } from 'react';
import KanjiCanvas, { type KanjiCanvasRef } from './KanjiCanvas';
import { getKanjiCorrectionStream, getKanjiExamples } from '../services/geminiService';
import type { Kanji } from '../types';
import { ArrowLeftIcon, ArrowRightIcon, RefreshIcon, SparklesIcon, XIcon, DocumentTextIcon } from './Icons';

interface PracticeModeProps {
    kanjiList: Kanji[];
}

// Helper component to render text with ruby characters for furigana
const RubyText: React.FC<{ text: string }> = ({ text }) => {
  const elements: React.ReactNode[] = [];
  // Regex to find Kanji followed by furigana in parentheses
  const regex = /([\u4e00-\u9faf]+)（([\u3040-\u3093]+)）/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add the text part before the match
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    const kanji = match[1];
    const furigana = match[2];
    
    // Add the ruby element
    elements.push(
      <ruby key={match.index}>
        {kanji}
        <rt className="text-xs select-none">{furigana}</rt>
      </ruby>
    );

    lastIndex = regex.lastIndex;
  }

  // Add the remaining text part after the last match
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return <>{elements.map((el, i) => <React.Fragment key={i}>{el}</React.Fragment>)}</>;
};

const PracticeMode: React.FC<PracticeModeProps> = ({ kanjiList }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [correction, setCorrection] = useState<string | null>(null);
  const [examples, setExamples] = useState<string[]>([]);
  const [isLoadingExamples, setIsLoadingExamples] = useState(false);
  const [examplesCache, setExamplesCache] = useState<Map<string, string[]>>(new Map());
  const canvasRef = useRef<KanjiCanvasRef>(null);

  const currentKanji: Kanji = kanjiList[currentIndex];

  const resetState = useCallback(() => {
    canvasRef.current?.clear();
    setHasDrawn(false);
    setCorrection(null);
    setIsChecking(false);
  }, []);

  // Reset current index if kanjiList changes
  useEffect(() => {
    setCurrentIndex(0);
    setExamplesCache(new Map());
  }, [kanjiList]);

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % kanjiList.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + kanjiList.length) % kanjiList.length);
  };
  
  // Effect for resetting the canvas when the kanji changes (Navigation)
  useEffect(() => {
    resetState();
  }, [currentIndex, resetState, kanjiList]);

  // Effect for fetching data (Does NOT reset canvas)
  useEffect(() => {
    const fetchAndCacheExamples = async (indexToFetch: number) => {
      const kanjiObj = kanjiList[indexToFetch];
      if (!kanjiObj) return;

      // 1. Check Static Data first
      if (kanjiObj.examples && kanjiObj.examples.length > 0) {
          return; // Already have data, no need to fetch or cache
      }

      const kanjiChar = kanjiObj.character;
      if (examplesCache.has(kanjiChar)) {
        return; // Already cached or being fetched
      }
      // Set a placeholder to prevent re-fetching
      setExamplesCache(prev => new Map(prev).set(kanjiChar, []));
      const fetchedExamples = await getKanjiExamples(kanjiChar);
      setExamplesCache(prev => new Map(prev).set(kanjiChar, fetchedExamples));
    };

    const loadCurrentKanjiData = async () => {
        const current = kanjiList[currentIndex];
        
        // 1. Check Static Data (Fastest)
        if (current.examples && current.examples.length > 0) {
            setExamples(current.examples);
            setIsLoadingExamples(false);
            return;
        }

        // 2. Check Cache or Fetch API
        setIsLoadingExamples(true);
        const kanjiChar = current.character;
        if (examplesCache.has(kanjiChar) && examplesCache.get(kanjiChar)!.length > 0) {
            setExamples(examplesCache.get(kanjiChar)!);
        } else {
            const fetchedExamples = await getKanjiExamples(kanjiChar);
            setExamples(fetchedExamples);
            setExamplesCache(prev => new Map(prev).set(kanjiChar, fetchedExamples));
        }
        setIsLoadingExamples(false);
    };

    loadCurrentKanjiData();

    // Prefetch next kanji
    const nextIndex = (currentIndex + 1) % kanjiList.length;
    fetchAndCacheExamples(nextIndex);

  }, [currentIndex, examplesCache, kanjiList]);


  const handleClear = () => {
    canvasRef.current?.clear();
    setHasDrawn(false);
  }

  const handleCorrection = async () => {
    if (!canvasRef.current || canvasRef.current.isCanvasEmpty() || isChecking) return;

    setIsChecking(true);
    setCorrection("");
    const imageData = canvasRef.current.getCanvasData();
    if (imageData) {
        try {
            const stream = await getKanjiCorrectionStream(imageData, currentKanji.character);
            for await (const chunk of stream) {
                setCorrection(prev => (prev ?? "") + chunk.text);
            }
        } catch(e) {
            console.error(e);
            setCorrection("ごめんなさい、うまく みれませんでした。");
        }
    }
    setIsChecking(false);
  };

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

            <div className="mt-6 pt-4 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-600 mb-3 flex items-center justify-center gap-2">
                    <DocumentTextIcon className="w-6 h-6 text-orange-400" />
                    ことば・れいぶん
                </h3>
                {isLoadingExamples ? (
                    <div className="flex flex-col justify-center items-center h-28">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                        <p className="mt-3 text-slate-500">れいぶんを さがしています...</p>
                    </div>
                ) : (
                    <ul className="space-y-2 text-left text-slate-700">
                        {examples.map((ex, index) => (
                            <li key={index} className="bg-amber-50 p-3 rounded-lg" style={{ lineHeight: '2.2' }}>
                                <span className="text-lg tracking-wide"><RubyText text={ex} /></span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full">
            <button onClick={goToPrevious} className="p-4 bg-white rounded-full shadow-md hover:bg-amber-100 transition-transform transform hover:scale-105 flex justify-center items-center">
                <ArrowLeftIcon className="w-6 h-6 text-slate-600" />
            </button>
             <button onClick={goToNext} className="p-4 bg-white rounded-full shadow-md hover:bg-amber-100 transition-transform transform hover:scale-105 flex justify-center items-center">
                <ArrowRightIcon className="w-6 h-6 text-slate-600" />
            </button>
            <button onClick={handleClear} className="col-span-1 px-6 py-3 bg-white text-slate-600 font-bold rounded-full shadow-lg border border-slate-200 hover:bg-amber-100 transition-transform transform hover:scale-105 text-xl flex items-center gap-2 justify-center">
                <RefreshIcon className="w-6 h-6" />
                けす
            </button>
            <button onClick={handleCorrection} disabled={!hasDrawn || isChecking} className="col-span-1 px-6 py-3 bg-orange-500 text-white font-bold rounded-full shadow-lg hover:bg-orange-600 transition-all transform hover:scale-105 text-xl flex items-center gap-2 justify-center disabled:bg-slate-300 disabled:scale-100 disabled:cursor-not-allowed">
                {isChecking ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                    <>
                        <SparklesIcon className="w-6 h-6" />
                        てんさく
                    </>
                )}
            </button>
        </div>
      </div>
      <div className="w-full max-w-sm md:w-1/2 relative">
        <KanjiCanvas ref={canvasRef} onDraw={() => setHasDrawn(true)}/>
        {correction !== null && (
            <div className="absolute inset-0 flex flex-col justify-center items-center rounded-2xl bg-black/50 p-4 z-10">
                <div className="bg-white rounded-2xl shadow-xl p-6 text-center w-full relative">
                    <button onClick={() => setCorrection(null)} className="absolute top-2 right-2 p-2 rounded-full hover:bg-slate-100">
                        <XIcon className="w-5 h-5 text-slate-500" />
                    </button>
                    <SparklesIcon className="w-12 h-12 text-orange-400 mx-auto mb-2"/>
                    <h3 className="text-xl font-bold text-slate-700 mb-4">せんせいから</h3>
                    <p className="text-slate-600 text-lg leading-relaxed min-h-[5em]">
                        {correction}
                        {isChecking && <span className="inline-block w-1 h-5 bg-slate-600 animate-pulse ml-1"></span>}
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default PracticeMode;
