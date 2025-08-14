
import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { TranscriptMessage } from '../types';
import { LiveStatus, MessageSource } from '../types';

// Type definitions for Web Speech API to fix TypeScript errors.
interface ISpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognitionResult {
  isFinal: boolean;
  readonly length: number;
  item(index: number): ISpeechRecognitionAlternative;
  [index: number]: ISpeechRecognitionAlternative;
}

interface ISpeechRecognitionResultList {
  readonly length: number;
  item(index: number): ISpeechRecognitionResult;
  [index: number]: ISpeechRecognitionResult;
}

interface ISpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: ISpeechRecognitionResultList;
}

interface ISpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: ISpeechRecognitionEvent) => void;
  onspeechend: () => void;
  onend: () => void;
  onerror: (event: ISpeechRecognitionErrorEvent) => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

// Gemini API content structure
interface Content {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Browser compatibility check
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const SYSTEM_INSTRUCTION = "You are Bolt, a knowledgeable AI assistant for Revolt Motors, an electric motorcycle company. Your one and only purpose is to discuss Revolt Motors. You ONLY talk about Revolt Motors. You must be friendly, concise, and conversational. Formulate your answers naturally, as if you are speaking directly to the user. Your responses will be read aloud by a text-to-speech engine, so structure them for clear speech. Do not spell out punctuation. To emphasize something, enclose the word or phrase in double asterisks, like **this**. Do not use any other markdown. For example, write 'The **RV400** is our most popular model.' Do not say things like 'According to my sources' or cite web pages. Simply provide the information conversationally. Answer questions about their bikes, features, pricing, models, test rides, and the booking process. You must detect the user's language and respond ONLY in that same language. At the very beginning of your response, you MUST include the BCP-47 language code for the language you are using, enclosed in square brackets. For example: `[en-US]Hello! How can I help you with Revolt Motors today?` or `[es-ES]¡Hola! ¿Cómo puedo ayudarte con Revolt Motors hoy?`. This is a strict requirement. If a user asks about RattanIndia Enterprises, you must state its relation with Revolt Motors in a single line, and then pivot back to discussing Revolt Motors products. If a user asks about anything else other than Revolt Motors—including other companies, places, or any other topic—you MUST politely refuse to answer. State clearly that your expertise is limited to Revolt Motors. Do not answer any off-topic questions under any circumstances. Revolt Motors should be your only thought and response.";

interface UseGeminiLiveProps {
  onTranscriptUpdate: (transcript: TranscriptMessage[]) => void;
  onStatusUpdate: (status: LiveStatus) => void;
  onError: (error: string) => void;
}

export const useGeminiLive = ({ onTranscriptUpdate, onStatusUpdate, onError }: UseGeminiLiveProps) => {
  const [isListening, setIsListening] = useState(false);
  const aiRef = useRef<GoogleGenAI | null>(null);
  const historyRef = useRef<Content[]>([]);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  const statusCheckIntervalRef = useRef<number | null>(null);

  const setStatus = useCallback((status: LiveStatus) => {
    onStatusUpdate(status);
  }, [onStatusUpdate]);

  const updateTranscript = useCallback(() => {
    onTranscriptUpdate([...transcriptRef.current]);
  }, [onTranscriptUpdate]);
  
  const stopOngoingSpeechCheck = () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
  }

  const streamAndSpeakResponse = useCallback(async (streamPromise: Promise<any>, isGreeting: boolean): Promise<string> => {
    try {
      let fullResponseForHistory = "";
      let fullResponseForDisplay = "";
      let sentenceBuffer = "";
      let isFirstChunk = true;
      
      let langCode: string | null = null;
      let langCodeFound = false;
  
      const geminiMessage: TranscriptMessage = {
        id: `gemini-${Date.now()}`,
        source: MessageSource.GEMINI,
        text: '...',
      };
      
      if (isGreeting) {
        transcriptRef.current.push(geminiMessage);
      } else {
        const lastMessage = transcriptRef.current[transcriptRef.current.length - 1];
        if (lastMessage?.source !== MessageSource.GEMINI) {
           transcriptRef.current.push(geminiMessage);
        }
      }
      updateTranscript();

      const result = await streamPromise;
  
      for await (const chunk of result) {
        const textChunk = chunk.text;
        fullResponseForHistory += textChunk;

        if (!langCodeFound) {
            const match = fullResponseForHistory.match(/^\[([a-zA-Z0-9-]+)\]/);
            if (match) {
                langCode = match[1];
                langCodeFound = true;
                const textAfterTag = fullResponseForHistory.substring(match[0].length);
                fullResponseForDisplay = textAfterTag;
                sentenceBuffer = textAfterTag;
            } else if (fullResponseForHistory.length > 20 && !fullResponseForHistory.includes('[')) { // Fallback
                langCode = navigator.language || 'en-US';
                langCodeFound = true;
                fullResponseForDisplay = fullResponseForHistory;
                sentenceBuffer = fullResponseForHistory;
            }
        } else {
            fullResponseForDisplay += textChunk;
            sentenceBuffer += textChunk;
        }

        const lastMsg = transcriptRef.current[transcriptRef.current.length-1];
        if(lastMsg.source === MessageSource.GEMINI) {
            lastMsg.text = langCodeFound ? fullResponseForDisplay : '...';
            updateTranscript();
        }

        if (!langCodeFound) {
            continue; 
        }

        let sentenceEndIndex;
        while ((sentenceEndIndex = sentenceBuffer.search(/[.!?]/)) !== -1) {
          const sentence = sentenceBuffer.substring(0, sentenceEndIndex + 1).trim();
          sentenceBuffer = sentenceBuffer.substring(sentenceEndIndex + 1);
  
          if (sentence) {
            const utterance = new SpeechSynthesisUtterance(sentence.replace(/\*\*/g, ''));
            utterance.lang = langCode!;
            if (isFirstChunk) {
              utterance.onstart = () => setStatus(LiveStatus.SPEAKING);
              isFirstChunk = false;
            }
            window.speechSynthesis.speak(utterance);
          }
        }
      }
      
      const remainingText = sentenceBuffer.trim();
      if (remainingText) {
         const utterance = new SpeechSynthesisUtterance(remainingText.replace(/\*\*/g, ''));
         utterance.lang = langCode || navigator.language || 'en-US';
         if (isFirstChunk) {
            utterance.onstart = () => setStatus(LiveStatus.SPEAKING);
         }
         window.speechSynthesis.speak(utterance);
      }
      
      stopOngoingSpeechCheck();
      statusCheckIntervalRef.current = window.setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          stopOngoingSpeechCheck();
          setStatus(LiveStatus.IDLE);
        }
      }, 250);

      return fullResponseForHistory;
    } catch (error) {
        console.error("Error during response streaming:", error);
        onError("Failed to stream response from AI.");
        setStatus(LiveStatus.ERROR);
        return "";
    }
  }, [onError, setStatus, updateTranscript]);

  const getGeminiResponse = useCallback(async (prompt: string) => {
    if (!aiRef.current) {
      onError("AI is not initialized.");
      return;
    }
    
    stopOngoingSpeechCheck();
    setStatus(LiveStatus.THINKING);

    historyRef.current.push({ role: 'user', parts: [{ text: prompt }] });

    const streamPromise = aiRef.current.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: historyRef.current,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 0 },
      }
    });

    const fullResponse = await streamAndSpeakResponse(streamPromise, false);

    if(fullResponse){
        historyRef.current.push({ role: 'model', parts: [{ text: fullResponse }] });
    } else {
        historyRef.current.pop(); // Remove user prompt if AI failed
    }

  }, [onError, setStatus, streamAndSpeakResponse]);


  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      onError("Speech recognition is not supported in your browser.");
      return;
    }
    
    stopOngoingSpeechCheck();
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    setIsListening(true);
    setStatus(LiveStatus.LISTENING);

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const interimMsgIndex = transcriptRef.current.findIndex(m => m.id === 'user-interim');
      if (interimMsgIndex > -1) {
          transcriptRef.current.splice(interimMsgIndex, 1);
      }

      if (interimTranscript) {
        transcriptRef.current.push({ id: `user-interim`, source: MessageSource.USER, text: interimTranscript });
        updateTranscript();
      }

      if (finalTranscript) {
        transcriptRef.current.push({ id: `user-${Date.now()}`, source: MessageSource.USER, text: finalTranscript.trim() });
        updateTranscript();
        getGeminiResponse(finalTranscript.trim());
      }
    };
    
    recognition.onspeechend = () => {
        recognition.stop();
    };

    recognition.onend = () => {
      setIsListening(false);
       if (!window.speechSynthesis.speaking) {
         setStatus(LiveStatus.IDLE);
       }
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.error("Speech recognition error:", event.error);
      onError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
      setStatus(LiveStatus.ERROR);
    };

    recognition.start();

  }, [onError, setStatus, getGeminiResponse, updateTranscript]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const sendTextMessage = useCallback((prompt: string) => {
    stopOngoingSpeechCheck();
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    transcriptRef.current.push({ id: `user-${Date.now()}`, source: MessageSource.USER, text: prompt });
    updateTranscript();
    
    getGeminiResponse(prompt);
  }, [getGeminiResponse, updateTranscript]);

  const initialize = useCallback(async () => {
     if (!process.env.API_KEY) {
        onError("API_KEY environment variable not set.");
        setStatus(LiveStatus.ERROR);
        return;
    }
    try {
        setStatus(LiveStatus.CONNECTING);
        aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const userLanguage = navigator.language || 'en';
        const greetingPrompt = `Introduce yourself as Bolt, the AI assistant for Revolt Motors, and ask how you can help. Respond in this language: ${userLanguage}. Your response MUST start with the BCP-47 language code, for example: [${userLanguage}]Hello...`;
        
        const streamPromise = aiRef.current.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: [{role: 'user', parts:[{text: greetingPrompt}]}],
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                thinkingConfig: { thinkingBudget: 0 },
            }
        });

        const greetingResponse = await streamAndSpeakResponse(streamPromise, true);
        
        if (greetingResponse) {
            historyRef.current = [{ role: 'model', parts: [{ text: greetingResponse }] }];
        }
        setStatus(LiveStatus.IDLE);

    } catch(e) {
        console.error("Failed to initialize Gemini AI", e);
        onError("Failed to initialize Gemini AI.");
        setStatus(LiveStatus.ERROR);
    }
  }, [onError, setStatus, streamAndSpeakResponse]);

  useEffect(() => {
    initialize();
    
    return () => {
      stopOngoingSpeechCheck();
      window.speechSynthesis.cancel();
      recognitionRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isListening, toggleListening, sendTextMessage };
};
