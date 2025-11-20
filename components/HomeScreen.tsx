
import React from 'react';
import { PencilIcon } from './Icons';

interface HomeScreenProps {
  onSelectGrade: (grade: number) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectGrade }) => {
  const grades = [1, 2, 3, 4, 5, 6];

  // Function to get color based on grade for variety
  const getGradeColor = (grade: number) => {
    switch (grade) {
      case 1: return 'bg-red-400 hover:bg-red-500 border-red-500';
      case 2: return 'bg-orange-400 hover:bg-orange-500 border-orange-500';
      case 3: return 'bg-amber-400 hover:bg-amber-500 border-amber-500';
      case 4: return 'bg-green-400 hover:bg-green-500 border-green-500';
      case 5: return 'bg-sky-400 hover:bg-sky-500 border-sky-500';
      case 6: return 'bg-indigo-400 hover:bg-indigo-500 border-indigo-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 flex flex-col items-center animate-fade-in-up">
      <div className="mb-10 text-center">
         <div className="inline-block p-4 bg-white rounded-full shadow-xl mb-4">
            <PencilIcon className="w-16 h-16 text-orange-500" />
         </div>
         <h2 className="font-potta text-3xl md:text-4xl font-bold text-slate-700 mb-2">
           どの がくねん を<br/>れんしゅう する？
         </h2>
         <p className="text-slate-500 font-klee">がくねんを えらんでね</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
        {grades.map((grade) => (
          <button
            key={grade}
            onClick={() => onSelectGrade(grade)}
            className={`${getGradeColor(grade)} text-white font-potta font-bold text-2xl py-8 rounded-3xl shadow-lg border-b-8 active:border-b-0 active:translate-y-2 transition-all duration-150 flex flex-col items-center justify-center`}
          >
            <span className="text-4xl mb-1">{grade}</span>
            <span className="text-lg opacity-90">ねんせい</span>
          </button>
        ))}
      </div>
      
      <div className="mt-12 bg-white/60 backdrop-blur-sm p-4 rounded-xl text-center text-slate-500 text-sm max-w-md font-klee">
        <p>※ 2ねんせい いじょうは まだ すこししか ないよ！</p>
      </div>
    </div>
  );
};

export default HomeScreen;