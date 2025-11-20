
import React, { useState, useEffect, useRef, useCallback } from 'react';
import KanjiCanvas, { type KanjiCanvasRef } from './KanjiCanvas';
import { verifyKanji, getKanjiCorrectionStream, getKanjiQuiz } from '../services/geminiService';
import type { Kanji } from '../types';
import { CheckIcon, XIcon, ArrowRightIcon } from './Icons';

type FeedbackState = {
  status: 'idle' | 'correct' | 'incorrect';
  message: string;
  correction?: string;
};

interface TestModeProps {
    kanjiList: Kanji[];
}

const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const TestMode: React.FC<TestModeProps> = ({ kanjiList }) => {
  const [questions, setQuestions] = useState<Kanji[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizSentence, setQuizSentence] = useState('');
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(true);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ status: 'idle', message: '' });
  const [isFinished, setIsFinished] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<KanjiCanvasRef>(null);

  const startTest = useCallback(() => {
    setQuestions(shuffleArray(kanjiList));
    setCurrentIndex(0);
    setScore(0);
    setIsSubmitting(false);
    setFeedback({ status: 'idle', message: '' });
    setIsFinished(false);
    setHasDrawn(false);
    canvasRef.current?.clear();
  }, [kanjiList]);
  
  useEffect(() => {
    startTest();
  }, [startTest]);
  
  const fetchQuiz = useCallback(async (kanjiCharacter: string) => {
      setIsGeneratingQuiz(true);
      setQuizSentence('');
      const quiz = await getKanjiQuiz(kanjiCharacter);
      setQuizSentence(quiz.quizSentence);
      setIsGeneratingQuiz(false);
  }, []);

  useEffect(() => {
    if (questions.length > 0 && !isFinished) {
      const currentKanji = questions[currentIndex].character;
      fetchQuiz(currentKanji);
    }
  }, [currentIndex, questions, isFinished, fetchQuiz]);

  const handleCheckAnswer = async () => {
    if (!canvasRef.current || canvasRef.current.isCanvasEmpty()) return;

    setIsSubmitting(true);
    const imageData = canvasRef.current.getCanvasData();
    if (imageData) {
      const correctAnswer = questions[currentIndex].character;
      const isCorrect = await verifyKanji(imageData, correctAnswer);
      
      if (isCorrect) {
        setFeedback({ status: 'correct', message: 'せいかい！' });
        setScore((s) => s + 1);
        setIsSubmitting(false);
      } else {
        setFeedback({ 
            status: 'incorrect', 
            message: `おしい！ もういちど かいてみよう。`,
            correction: "",
        });
        try {
            const stream = await getKanjiCorrectionStream(imageData, correctAnswer);
            for await (const chunk of stream) {
                setFeedback(prev => ({...prev, correction: (prev.correction ?? "") + chunk.text }));
            }
        } catch(e) {
            console.error(e);
             setFeedback(prev => ({...prev, correction: "ごめんなさい、うまく みれませんでした。" }));
        } finally {
            setIsSubmitting(false);
        }
      }
    } else {
       setFeedback({ status: 'incorrect', message: 'なにか かいてね！' });
       setIsSubmitting(false);
    }
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

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4 p-4">
      <div className="w-full bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-md text-center">
        <div className="flex justify-between items-center text-slate-500 font-semibold mb-2">
            <span>もんだい {currentIndex + 1}/{questions.length}</span>
            <span>とくてん: {score}</span>
        </div>
        <div className="text-xl font-bold min-h-[56px] flex flex-col items-center justify-center p-2 text-slate-700">
          {isGeneratingQuiz ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
              <p className="text-sm text-slate-500 mt-2">もんだいを つくっています...</p>
            </>
          ) : (
            <p className="leading-relaxed tracking-wider">{quizSentence}</p>
          )}
        </div>
        <p className="text-sm text-slate-400">（　）の ことばを かんじで かいてね</p>
      </div>

      <div className="w-full relative">
        <KanjiCanvas ref={canvasRef} onDraw={() => setHasDrawn(true)} />
        {feedback.status !== 'idle' && (
            <div className={`absolute inset-0 flex flex-col justify-center items-center rounded-2xl bg-opacity-90 transition-opacity p-4 ${feedback.status === 'correct' ? 'bg-green-100' : 'bg-red-100'}`}>
                {feedback.status === 'correct' ?
                    <CheckIcon className="w-20 h-20 text-green-500"/> :
                    <XIcon className="w-20 h-20 text-red-500"/>
                }
                <p className={`text-2xl font-bold mt-2 text-center ${feedback.status === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                    {feedback.message}
                </p>
                {feedback.correction !== undefined && (
                    <div className="mt-4 text-center text-slate-600 bg-white/50 p-3 rounded-lg w-full">
                        <p className="font-bold text-sm">せんせいから:</p>
                        <p className="text-md leading-relaxed min-h-[3em]">
                            {feedback.correction}
                            {isSubmitting && <span className="inline-block w-1 h-4 bg-slate-600 animate-pulse ml-1"></span>}
                        </p>
                    </div>
                )}
            </div>
        )}
      </div>

      <div className="w-full h-16 flex items-center justify-center">
        {feedback.status === 'idle' ? (
          <button
            onClick={handleCheckAnswer}
            disabled={isSubmitting || !hasDrawn || isGeneratingQuiz}
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
            disabled={isSubmitting}
            className="w-full px-8 py-4 bg-orange-500 text-white font-bold rounded-full shadow-lg hover:bg-orange-600 transition-transform transform hover:scale-105 text-xl flex items-center justify-center disabled:bg-slate-300"
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
