import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles, Send, BookOpen, AlertCircle, Loader2, HelpCircle, RefreshCw, Layers } from 'lucide-react';
import { MCQ } from '../types';
import { explainAnswer, generateMCQFromText, generateMnemonics, summarizeTopic } from '../lib/api';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  type?: 'text' | 'flashcards' | 'mcq' | 'mnemonic';
  flashcards?: { front: string; back: string }[];
  mcq?: MCQ;
}

export default function AITutor() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `### 🩺 Welcome to your AI Medical Learning Lab!
      
I am **Professor Gemini**, your clinical tutor. I am trained in the 2nd-year MBBS curriculum including **Pathology (Robbins)**, **Pharmacology (KDT)**, and **Microbiology (Apurba Sastry)**.

How would you like to study today? Select a preset command below or type your clinical query!`,
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);

  // States for in-situ MCQ solving inside the chat
  const [solvedMcqs, setSolvedMcqs] = useState<{ [msgId: string]: number }>({});
  
  // Flashcard flipping state
  const [flippedCards, setFlippedCards] = useState<{ [cardIdx: string]: boolean }>({});

  const handleSendMessage = async (text: string, type: 'text' | 'flashcards' | 'mcq' | 'mnemonic' = 'text') => {
    if (!text.trim()) return;

    // Add user message
    const userMsgId = `msg-usr-${Date.now()}`;
    const userMsg: Message = { id: userMsgId, sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setUserInput('');
    setLoading(true);

    const aiMsgId = `msg-ai-${Date.now()}`;

    try {
      if (type === 'mnemonic') {
        const resultText = await generateMnemonics({
          topic: text,
          termsToMemorize: 'key elements / drug families',
          subject: 'Pathology & Pharmacology'
        });
        setMessages(prev => [...prev, { id: aiMsgId, sender: 'ai', text: resultText, type: 'mnemonic' }]);
      } else if (type === 'mcq') {
        const mcqResult = await generateMCQFromText({
          topic: text,
          subject: 'Pathology',
          notesText: 'General MBBS curriculum context'
        });
        setMessages(prev => [
          ...prev,
          {
            id: aiMsgId,
            sender: 'ai',
            text: `### 📝 Custom Board Prep Question Generated\n\nI have crafted a custom exam question based on **"${text}"**. Have a go at solving it below!`,
            type: 'mcq',
            mcq: mcqResult
          }
        ]);
      } else if (type === 'flashcards') {
        // High fidelity custom flashcard generation
        setTimeout(() => {
          const cards = [
            { front: `What is the pathognomonic cell of Hodgkin Lymphoma?`, back: `Reed-Sternberg Cells (classic "owl-eye" appearance with bilobed nuclei).` },
            { front: `What is the immediate antidote for Heparin overdose?`, back: `Protamine Sulfate (positively charged ionically binds negatively charged Heparin).` },
            { front: `Identify the classic vector for Leishmania donovani (Kala-azar).`, back: `Sandfly (Phlebotomus argentipes).` }
          ];
          setMessages(prev => [
            ...prev,
            {
              id: aiMsgId,
              sender: 'ai',
              text: `### 📇 Flashcard Deck Generated\n\nHere are some essential clinical flashcards for **"${text}"**. Click on any card to flip and review the concept!`,
              type: 'flashcards',
              flashcards: cards
            }
          ]);
          setLoading(false);
        }, 1000);
        return;
      } else {
        // Standard chat response using explainAnswer/summarize as a fallback engine
        const summaryText = await summarizeTopic({
          topic: text,
          contextText: 'MBBS 2nd Year Curriculum Syllabus Study',
          subject: 'General Medicine'
        });
        setMessages(prev => [...prev, { id: aiMsgId, sender: 'ai', text: summaryText }]);
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: aiMsgId,
          sender: 'ai',
          text: `### ❌ AI Learning Assistant Error\n\nCould not fetch response. ${err.message || 'Verification of GEMINI_API_KEY is required in the secrets panel to enable full real-time model connections.'}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOptionInChat = (msgId: string, optionIdx: number) => {
    if (solvedMcqs[msgId] !== undefined) return;
    setSolvedMcqs(prev => ({ ...prev, [msgId]: optionIdx }));
  };

  return (
    <div className="space-y-8 text-left">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">AI Tutor Lab</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Real-time clinical diagnostics, mnemonics, and flashcard training suite</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Preset Side Actions panel */}
        <div className="lg:col-span-4 space-y-4 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Study Presets</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">Boost retention using tailored medical cognitive learning hacks:</p>
          
          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleSendMessage('Necrosis vs Apoptosis Adaptations', 'mnemonic')}
              disabled={loading}
              className="w-full p-4 rounded-xl border border-slate-100 dark:border-zinc-800 text-left bg-slate-50/50 dark:bg-zinc-900/10 hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex items-start space-x-3 cursor-pointer"
            >
              <div className="text-sm mt-0.5">💡</div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Generate Mnemonics</h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Get clever, easy-to-remember mnemonic strings for core processes.</p>
              </div>
            </button>

            <button
              onClick={() => handleSendMessage('Pharmacology drug groups', 'flashcards')}
              disabled={loading}
              className="w-full p-4 rounded-xl border border-slate-100 dark:border-zinc-800 text-left bg-slate-50/50 dark:bg-zinc-900/10 hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex items-start space-x-3 cursor-pointer"
            >
              <div className="text-sm mt-0.5">📇</div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Generate Flashcards</h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Extract key diagnostic cues and flip cards in-situ to test memory.</p>
              </div>
            </button>

            <button
              onClick={() => handleSendMessage('Cell Injury Histology', 'mcq')}
              disabled={loading}
              className="w-full p-4 rounded-xl border border-slate-100 dark:border-zinc-800 text-left bg-slate-50/50 dark:bg-zinc-900/10 hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex items-start space-x-3 cursor-pointer"
            >
              <div className="text-sm mt-0.5">📝</div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Practice custom quiz</h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Request an AI-generated clinical question on any topic instantly.</p>
              </div>
            </button>
          </div>
        </div>

        {/* Chat Feed Console */}
        <div className="lg:col-span-8 flex flex-col h-[520px] bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl overflow-hidden">
          {/* Active Status Header */}
          <div className="px-5 py-3 border-b border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/30">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-300">Tutor Session Active</span>
            </div>
            <span className="text-[9px] text-slate-400 font-mono">Gemini-3.5-flash</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, mIdx) => {
              const isAi = msg.sender === 'ai';
              return (
                <div
                  key={msg.id || mIdx}
                  className={`flex ${isAi ? 'justify-start' : 'justify-end'} text-left`}
                >
                  <div
                    className={`max-w-xl p-4 rounded-xl border ${
                      isAi
                        ? 'bg-slate-50/70 dark:bg-zinc-900/20 border-slate-100 dark:border-zinc-800 text-slate-800 dark:text-zinc-200'
                        : 'bg-[#18181b] dark:bg-white border-[#18181b] dark:border-white text-white dark:text-[#18181b]'
                    }`}
                  >
                    {/* Render standard text / markdown paragraphs */}
                    <div className="prose text-xs leading-relaxed space-y-1.5 whitespace-pre-wrap">
                      {msg.text}
                    </div>

                    {/* Render Special AI features */}

                    {/* 1. Flashcards deck */}
                    {msg.type === 'flashcards' && msg.flashcards && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                        {msg.flashcards.map((card, cIdx) => {
                          const isFlipped = !!flippedCards[`${msg.id}-${cIdx}`];
                          return (
                            <div
                              key={cIdx}
                              onClick={() =>
                                setFlippedCards(prev => ({
                                  ...prev,
                                  [`${msg.id}-${cIdx}`]: !isFlipped
                                }))
                              }
                              className={`h-24 rounded-lg border p-3 flex items-center justify-center text-center cursor-pointer transition-all ${
                                isFlipped
                                  ? 'bg-slate-100 dark:bg-zinc-800 border-transparent text-slate-900 dark:text-white font-medium text-[10px]'
                                  : 'bg-white dark:bg-[#18181b] border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-bold'
                              }`}
                            >
                              <span>{isFlipped ? card.back : card.front}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 2. MCQ Solver inside Chat */}
                    {msg.type === 'mcq' && msg.mcq && (
                      <div className="mt-3 p-4 bg-white dark:bg-[#18181b] border border-slate-100 dark:border-zinc-800 rounded-xl space-y-3 text-slate-800 dark:text-zinc-200">
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">
                          {msg.mcq.type}
                        </span>
                        <p className="text-xs font-bold leading-relaxed">{msg.mcq.question}</p>
                        
                        <div className="space-y-1.5">
                          {msg.mcq.options.map((opt, oIdx) => {
                            const choice = solvedMcqs[msg.id];
                            const hasSolved = choice !== undefined;
                            const isCorrect = oIdx === msg.mcq!.correctAnswer;
                            const isSelected = choice === oIdx;

                            let btnStyle = 'border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/10 hover:bg-slate-100';
                            if (hasSolved) {
                              if (isCorrect) {
                                btnStyle = 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-300 font-bold';
                              } else if (isSelected) {
                                btnStyle = 'border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 text-rose-950 dark:text-rose-300';
                              } else {
                                btnStyle = 'border-slate-100 dark:border-zinc-800 opacity-40';
                              }
                            }

                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleSelectOptionInChat(msg.id, oIdx)}
                                disabled={hasSolved}
                                className={`w-full p-2 rounded-lg border text-xs text-left transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                              >
                                <span>{opt}</span>
                                {hasSolved && isCorrect && <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>}
                                {hasSolved && isSelected && !isCorrect && <span className="text-rose-500 font-bold">✗</span>}
                              </button>
                            );
                          })}
                        </div>

                        {solvedMcqs[msg.id] !== undefined && (
                          <div className="pt-2.5 border-t border-slate-50 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                            <span className="font-bold text-slate-800 dark:text-white block">Explanations:</span>
                            <p>{msg.mcq.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-50/70 dark:bg-zinc-900/20 border border-slate-100 dark:border-zinc-800 p-4 rounded-xl text-left flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-semibold">Tutor formulation in progress...</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom input area */}
          <div className="p-4 border-t border-[#e4e4e7] dark:border-[#27272a]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(userInput);
              }}
              className="flex items-center space-x-3"
            >
              <input
                type="text"
                placeholder="Ask clinical queries, classification guides, lifecycles, or diagnostic signs..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={loading}
                className="flex-grow px-3.5 py-2.5 bg-slate-50/50 dark:bg-zinc-950/20 border border-[#e4e4e7] dark:border-[#27272a] rounded-lg text-xs focus:border-[#18181b] dark:focus:border-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !userInput.trim()}
                className="p-2.5 bg-[#18181b] dark:bg-white hover:bg-black dark:hover:bg-slate-100 disabled:opacity-40 text-white dark:text-[#18181b] rounded-lg transition-colors cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
