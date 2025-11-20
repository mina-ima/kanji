import React, { useState } from 'react';
import PracticeMode from './components/PracticeMode';
import TestMode from './components/TestMode';
import HomeScreen from './components/HomeScreen';
import { BookOpenIcon, PencilIcon, HomeIcon } from './components/Icons';
import { getKanjiForGrade } from './services/kanjiData';

type Mode = 'practice' | 'test';

const App: React.FC = () => {
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('practice');

  const headerStyle = "font-potta text-4xl md:text-5xl font-bold text-slate-700 text-center";

  const handleSelectGrade = (grade: number) => {
    setSelectedGrade(grade);
    setMode('practice'); // Reset to practice mode when entering a grade
  };

  const handleBackToHome = () => {
    setSelectedGrade(null);
  };

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center p-4">
      <header className="my-6 md:my-8 text-center w-full max-w-4xl relative">
        {selectedGrade !== null && (
             <button 
                onClick={handleBackToHome}
                className="absolute left-0 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                aria-label="ホームに戻る"
             >
                <HomeIcon className="w-6 h-6" />
             </button>
        )}
        <h1 className={`${headerStyle} drop-shadow-md`}>
          書き取り練習
        </h1>
        {selectedGrade === null ? (
            <p className="text-slate-500 text-lg mt-2 font-klee">楽しく 漢字を 覚えよう！</p>
        ) : (
            <p className="text-orange-500 text-lg mt-2 font-potta bg-orange-100 inline-block px-4 py-1 rounded-full">
                小学 {selectedGrade} 年生
            </p>
        )}
      </header>

      {selectedGrade === null ? (
        <main className="w-full flex-grow flex items-center justify-center">
            <HomeScreen onSelectGrade={handleSelectGrade} />
        </main>
      ) : (
        <>
            <div className="w-full max-w-sm mx-auto bg-white/70 backdrop-blur-sm p-2 rounded-full shadow-inner flex space-x-2 mb-8 font-potta">
                <button
                onClick={() => setMode('practice')}
                className={`w-1/2 py-3 rounded-full text-lg flex items-center justify-center transition-all duration-300 ${
                    mode === 'practice'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-transparent text-slate-500 hover:bg-amber-100'
                }`}
                >
                <BookOpenIcon className="w-6 h-6 mr-2" />
                練習
                </button>
                <button
                onClick={() => setMode('test')}
                className={`w-1/2 py-3 rounded-full text-lg flex items-center justify-center transition-all duration-300 ${
                    mode === 'test'
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'bg-transparent text-slate-500 hover:bg-amber-100'
                }`}
                >
                <PencilIcon className="w-6 h-6 mr-2" />
                テスト
                </button>
            </div>

            <main className="w-full flex-grow flex items-center justify-center">
                {mode === 'practice' ? (
                    <PracticeMode kanjiList={getKanjiForGrade(selectedGrade)} />
                ) : (
                    <TestMode kanjiList={getKanjiForGrade(selectedGrade)} />
                )}
            </main>
        </>
      )}

      <footer className="text-center text-slate-400 text-sm py-4 mt-auto font-klee">
        <p>Created with Gemini API</p>
      </footer>
    </div>
  );
};

export default App;