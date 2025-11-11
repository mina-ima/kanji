
import React, { useState } from 'react';
import PracticeMode from './components/PracticeMode';
import TestMode from './components/TestMode';
import { BookOpenIcon, PencilIcon } from './components/Icons';

type Mode = 'practice' | 'test';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('practice');

  const headerStyle = "font-m-plus-rounded text-4xl md:text-5xl font-bold text-slate-700 text-center";

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center p-4">
      <header className="my-6 md:my-8 text-center">
        <h1 className={`${headerStyle} drop-shadow-md`}>
          かきとりれんしゅう
        </h1>
        <p className="text-slate-500 text-lg">Kanji Practice Pad</p>
      </header>

      <div className="w-full max-w-sm mx-auto bg-white/70 backdrop-blur-sm p-2 rounded-full shadow-inner flex space-x-2 mb-8">
        <button
          onClick={() => setMode('practice')}
          className={`w-1/2 py-3 rounded-full text-lg font-bold flex items-center justify-center transition-all duration-300 ${
            mode === 'practice'
              ? 'bg-orange-500 text-white shadow-md'
              : 'bg-transparent text-slate-500 hover:bg-amber-100'
          }`}
        >
          <BookOpenIcon className="w-6 h-6 mr-2" />
          れんしゅう
        </button>
        <button
          onClick={() => setMode('test')}
          className={`w-1/2 py-3 rounded-full text-lg font-bold flex items-center justify-center transition-all duration-300 ${
            mode === 'test'
              ? 'bg-sky-500 text-white shadow-md'
              : 'bg-transparent text-slate-500 hover:bg-amber-100'
          }`}
        >
          <PencilIcon className="w-6 h-6 mr-2" />
          てすと
        </button>
      </div>

      <main className="w-full flex-grow flex items-center justify-center">
        {mode === 'practice' ? <PracticeMode /> : <TestMode />}
      </main>

      <footer className="text-center text-slate-400 text-sm py-4">
        <p>Created with Gemini API</p>
      </footer>
    </div>
  );
};

export default App;
