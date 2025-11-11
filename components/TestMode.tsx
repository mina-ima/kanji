
import React, { useState, useEffect, useRef, useCallback } from 'react';
import KanjiCanvas, { type KanjiCanvasRef } from './KanjiCanvas';
import { grade1Kanji } from '../services/kanjiData';
import { recognizeKanji } from '../services/geminiService';
import type { Kanji } from '../types';
import { CheckIcon, XIcon, ArrowRightIcon } from './Icons';

type FeedbackState = {
  status: 'idle' | 'correct' | 'incorrect';
  message: string;
};

const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const TestMode: React.FC = () => {
  const [questions, setQuestions] = useState<Kanji[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ status: 'idle', message: '' });
  const [isFinished, setIsFinished] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<KanjiCanvasRef>(null);

  const startTest = useCallback(() => {
    setQuestions(shuffleArray(grade1Kanji));
    setCurrentIndex(0);
    setScore(0);
    setIsSubmitting(false);
    setFeedback({ status: 'idle', message: '' });
    setIsFinished(false);
    setHasDrawn(false);
    canvasRef.current?.clear();
  }, []);
  
  useEffect(() => {
    startTest();
  }, [startTest]);

  const handleCheckAnswer = async () => {
    if (!canvasRef.current || canvasRef.current.isCanvasEmpty()) return;

    setIsSubmitting(true);
    const imageData = canvasRef.current.getCanvasData();
    if (imageData) {
      const recognized = await recognizeKanji(imageData);
      const correctAnswer = questions[currentIndex].character;
      
      if (recognized === correctAnswer) {
        setFeedback({ status: 'correct', message: 'せいかい！' });
        setScore((s) => s + 1);
      } else {
        setFeedback({ status: 'incorrect', message: `ちがうよ。こたえは「${correctAnswer}」` });
      }
    } else {
       setFeedback({ status: 'incorrect', message: 'なにか かいてね！' });
    }
    setIsSubmitting(false);
  };
  
  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setFeedback({ status: 'idle', message: '' });
      canvasRef.current?.clear();
      setHasDrawn(false);
    } else {
      setIsFinished(true);
    }
  };
  
  if (questions.length === 0) {
    return <div>Loading test...</div>;
  }
  
  if (isFinished) {
      return (
          <div className="text-center bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl">
              <h2 className="text-3xl font-bold text-slate-700 font-m-plus-rounded">おつかれさま！</h2>
              <p className="text-5xl font-bold text-sky-600 my-4">{score} / {questions.length}</p>
              <p className="text-slate-500 text-lg mb-6">てん</p>
              <button
                  onClick={startTest}
                  className="px-8 py-4 bg-sky-500 text-white font-bold rounded-full shadow-lg hover:bg-sky-600 transition-transform transform hover:scale-105 text-xl"
              >
                  もういっかい やる
              </button>
          </div>
      )
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4 p-4">
      <div className="w-full bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-md text-center">
        <div className="flex justify-between items-center text-slate-500 font-semibold mb-2">
            <span>もんだい {currentIndex + 1}/{questions.length}</span>
            <span>とくてん: {score}</span>
        </div>
        <p className="text-lg">「{currentQuestion.reading}」を かいてね</p>
        <p className="text-sm text-slate-400">({currentQuestion.meaning})</p>
      </div>

      <div className="w-full relative">
        <KanjiCanvas ref={canvasRef} onDraw={() => setHasDrawn(true)} />
        {feedback.status !== 'idle' && (
            <div className={`absolute inset-0 flex flex-col justify-center items-center rounded-2xl bg-opacity-80 transition-opacity ${feedback.status === 'correct' ? 'bg-green-100' : 'bg-red-100'}`}>
                {feedback.status === 'correct' ?
                    <CheckIcon className="w-24 h-24 text-green-500"/> :
                    <XIcon className="w-24 h-24 text-red-500"/>
                }
                <p className={`text-2xl font-bold mt-2 ${feedback.status === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                    {feedback.message}
                </p>
            </div>
        )}
      </div>

      <div className="w-full h-16 flex items-center justify-center">
        {feedback.status === 'idle' ? (
          <button
            onClick={handleCheckAnswer}
            disabled={isSubmitting || !hasDrawn}
            className="w-full px-8 py-4 bg-sky-500 text-white font-bold rounded-full shadow-lg hover:bg-sky-600 transition-all transform hover:scale-105 text-xl disabled:bg-slate-300 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
                <>
                <CheckIcon className="w-6 h-6 mr-2" />
                こたえあわせ
                </>
            )}
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            className="w-full px-8 py-4 bg-orange-500 text-white font-bold rounded-full shadow-lg hover:bg-orange-600 transition-transform transform hover:scale-105 text-xl flex items-center justify-center"
          >
            つぎのもんだい
            <ArrowRightIcon className="w-6 h-6 ml-2"/>
          </button>
        )}
      </div>
    </div>
  );
};

export default TestMode;
