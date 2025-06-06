"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaRobot, FaUserCircle, FaRegThumbsUp, FaRegThumbsDown, FaRegCommentDots, FaVolumeUp, FaPaperPlane, FaRegSmile, FaMicrophone, FaPause, FaPlay } from 'react-icons/fa';
import { useTheme } from '../providers/ThemeProvider';
import { useLanguage } from '../../lib/LanguageContext';
import { useTranslation, Language, languageNames, translations } from '../../lib/i18n';
import TypewriterEffect from '../../components/TypewriterEffect';
import CommentModal from '../../components/CommentModal';
import VoiceModal from '../../components/VoiceModal';
import TypingIndicator from '../../components/TypingIndicator';
import { detectContactInfo } from '../../lib/contactDetector';
import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';
import { Toaster } from 'react-hot-toast';
import showToast from '../../lib/toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const EmojiPicker = dynamic(() => import('@emoji-mart/react').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="w-[350px] h-[400px] bg-white dark:bg-[#23234a] rounded-xl" />
});

interface Message {
  id: string;
  content: string;
  user: 'me' | 'bot';
  created_at: string;
}

const ChatComponent = () => {
  console.log('[ChatComponent] Montado');
  const { dark, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const { t } = useTranslation(language as Language);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tooltipFromUrl = searchParams.get('tooltip');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<Record<string, 'like' | 'dislike' | undefined>>({});
  const [commentModal, setCommentModal] = useState<{ open: boolean, message?: { id: string, content: string } }>({ open: false });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEmojiButtonActive, setIsEmojiButtonActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [voiceMode, setVoiceMode] = useState<'idle' | 'recording' | 'ai-speaking'>('idle');
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [voiceModalMode, setVoiceModalMode] = useState<'ai-speaking' | 'ready-to-record' | 'recording' | 'thinking' | 'loading'>('ai-speaking');
  const [greetingLoading, setGreetingLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [isTypewriterActive, setIsTypewriterActive] = useState(false);
  const [ttsLoadingMsgId, setTtsLoadingMsgId] = useState<string | null>(null);
  const [tooltips, setTooltips] = useState<string[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [currentPlayingMessageId, setCurrentPlayingMessageId] = useState<string | null>(null);
  const voiceModalRef = useRef<HTMLDivElement>(null);
  const tooltipProcessedRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isGreetingRendered, setIsGreetingRendered] = useState(false);
  const [tooltipProcessed, setTooltipProcessed] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);

  useEffect(() => {
    return () => {
      console.log('[ChatComponent] Desmontado');
    };
  }, []);

  const handleFirstInteraction = () => {
    if (!isGreetingRendered) {
      setIsGreetingRendered(true);
    }
  };

  const handleScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const threshold = 100;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsNearBottom(atBottom);
  };

  useEffect(() => {
    console.log('[useEffect] Scroll chamado', { messagesLength: messages.length, isNearBottom });
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isNearBottom]);

  React.useEffect(() => {
    console.log('[useEffect] Focus input chamado', { messagesLength: messages.length });
    if (messages.length > 0 && messages[messages.length - 1].user === 'bot' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages]);

  const handleTooltipClick = async (tooltip: string) => {
    if (loading) return;
    
    const userMsg: Message = {
      id: 'user-' + Date.now(),
      content: tooltip,
      user: 'me',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setIsBotTyping(true);

    const prompt = `${tooltip}\n\nPlease answer ONLY in ${languageNames[language as Language] || 'English'}, regardless of the language of the question. Do not mention language or your ability to assist in other languages. Keep your answer short and concise.`;
    try {
      const res = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: prompt,
          conversationHistory: messages
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          content: data.reply || t('chat.greeting'),
          user: 'bot',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-error-' + Date.now(),
          content: t('common.error'),
          user: 'bot',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setIsBotTyping(false);
    }
  };

  // Carregar mensagem de boas-vindas quando o componente for montado
  useEffect(() => {
    console.log('[useEffect] Saudação (inicialização) chamado');
    if (isInitialized) return;

    const initializeChat = async () => {
      console.log('[Saudação] Função initializeChat chamada');
      try {
        setGreetingLoading(true);
        const [instructionsRes, knowledgeRes] = await Promise.all([
          fetch('/AI_INSTRUCTIONS.md'),
          fetch('/AI_KNOWLEDGE.md'),
        ]);
        const instructionsText = await instructionsRes.text();
        const knowledgeText = await knowledgeRes.text();
        const greetingPrompt = `Generate a creative, warm, and original greeting for a new user in ${language}. Use the INSTRUCTIONS to define the tone and style of the message, and the KNOWLEDGE BASE to incorporate specific information about Dengun and its services. Be original and do not copy any examples from the instructions. The greeting should reflect Dengun's professional and welcoming personality, mencionando alguns dos principais serviços e convidando o usuário a explorar como podemos ajudar. Mantenha sua resposta muito curta (1-2 frases).`;
        const res = await fetch('/api/chatgpt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: greetingPrompt }),
        });
        const data = await res.json();

        const welcomeMessage: Message = {
          id: 'welcome',
          content: data.reply && data.reply.trim() ? data.reply : t('chat.greeting'),
          user: 'bot' as const,
          created_at: new Date().toISOString(),
        };

        setMessages([welcomeMessage]);
        setIsInitialized(true);
        setIsGreetingRendered(true);
      } catch (err) {
        setMessages([
          {
            id: 'welcome',
            content: t('chat.greeting'),
            user: 'bot' as const,
            created_at: new Date().toISOString(),
          },
        ]);
        setIsInitialized(true);
        setIsGreetingRendered(true);
      } finally {
        setGreetingLoading(false);
      }
    };

    initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    console.log('[useEffect] Typewriter chamado', { messagesLength: messages.length });
    if (messages.length > 0 && messages[messages.length - 1].user === 'bot') {
      const typeSpeed = 50;
      const startDelay = 100;
      const msg = messages[messages.length - 1].content || '';
      setIsTypewriterActive(true);
      const timeout = setTimeout(() => {
        setIsTypewriterActive(false);
        if (messages[messages.length - 1].id === 'welcome') {
          setIsGreetingRendered(true);
          if (tooltipFromUrl && !tooltipProcessed) {
            const decodedTooltip = decodeURIComponent(tooltipFromUrl);
            handleTooltipClick(decodedTooltip);
            setTooltipProcessed(true);
          }
        }
      }, startDelay + msg.length * typeSpeed);
      return () => clearTimeout(timeout);
    }
  }, [messages, tooltipFromUrl, tooltipProcessed]);

  // Carregar sugestões
  useEffect(() => {
    try {
      const tooltipsArray = translations[language as Language]?.chat?.tooltips;
      
      if (Array.isArray(tooltipsArray) && tooltipsArray.length > 0) {
        const shuffled = [...tooltipsArray].sort(() => 0.5 - Math.random());
        setTooltips(shuffled.slice(0, 4));
      } else {
        console.error('Não foi possível carregar as sugestões para o idioma:', language);
        setTooltips([]);
      }
    } catch (error) {
      console.error('Erro ao carregar sugestões:', error);
      setTooltips([]);
    }
  }, [language]);

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    
    console.log('Toggle Audio - Current state:', { isAudioPlaying, isAudioPaused });
    
    if (isAudioPaused) {
      console.log('Resuming audio playback');
      audioRef.current.play().catch(err => {
        console.error('Error resuming audio:', err);
      });
    } else {
      console.log('Pausing audio playback');
      audioRef.current.pause();
    }
  };

  const playTTS = async (text: string, messageId: string, onEnd?: () => void) => {
    if (typeof window === 'undefined') return;
    
    const loadingToast = showToast.loading('Carregando áudio...');
    
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsAudioPlaying(false);
        setIsAudioPaused(false);
        setCurrentPlayingMessageId(null);
        if (onEnd) onEnd();
      };
      
      audio.onplay = () => {
        setIsAudioPlaying(true);
        setIsAudioPaused(false);
        setCurrentPlayingMessageId(messageId);
      };
      
      audio.onpause = () => {
        setIsAudioPlaying(false);
        setIsAudioPaused(true);
      };
      
      await audio.play();
      showToast.dismiss(loadingToast);
    } catch (err) {
      console.error('TTS error:', err);
      setIsAudioPlaying(false);
      setIsAudioPaused(false);
      setCurrentPlayingMessageId(null);
      showToast.error('Erro ao carregar áudio');
      if (onEnd) onEnd();
    }
  };

  const speakBotMessage = async (text: string) => {
    if (typeof window === 'undefined') return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
    } catch (err) {
      console.error('TTS error:', err);
    }
  };

  const sendEmailWithConversation = async (email: string | null, phone: string | null) => {
    try {
      const conversation = messages.map(msg => 
        `${msg.user === 'me' ? 'Cliente' : 'Assistente'}: ${msg.content}`
      ).join('\n\n');

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          phone,
          conversation,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar email');
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    handleFirstInteraction();
    if (!newMessage.trim() || loading) return;

    // Detecta informações de contato na mensagem
    const { email, phone } = detectContactInfo(newMessage);
    
    const userMsg: Message = {
      id: 'user-' + Date.now(),
      content: newMessage,
      user: 'me',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setNewMessage('');
    setLoading(true);
    setIsBotTyping(true);

    // Se detectou email ou telefone, envia o email
    if (email || phone) {
      await sendEmailWithConversation(email, phone);
    }

    try {
      const res = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: newMessage,
          conversationHistory: messages
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          content: data.reply || t('chat.greeting'),
          user: 'bot',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-error-' + Date.now(),
          content: t('common.error'),
          user: 'bot',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setIsBotTyping(false);
    }
  };

  const handleFeedback = async (messageId: string, type: 'like' | 'dislike', content: string) => {
    setFeedback((prev) => ({
      ...prev,
      [messageId]: prev[messageId] === type ? undefined : type,
    }));
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, type, content }),
      });
    } catch (e) {}
  };

  const speak = (text: string) => {
    if (typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = 'pt-PT';
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.lang?.toLowerCase().startsWith('pt') &&
        (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('microsoft'))
      );
      const fallback = voices.find(v => v.lang?.toLowerCase().startsWith('pt'));
      utter.voice = preferred || fallback || null;
      window.speechSynthesis.speak(utter);
    }
  };

  const handleComment = async (messageId: string, content: string, comment: string) => {
    try {
      await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, content, comment }),
      });
      await fetch('/api/chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: comment }),
      });
    } catch (e) {}
  };

  const handleEmojiButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !showEmojiPicker;
    setShowEmojiPicker(newState);
    setIsEmojiButtonActive(newState);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node) &&
          emojiButtonRef.current && !emojiButtonRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
        setIsEmojiButtonActive(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const insertEmoji = (emoji: string) => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const newValue = newMessage.slice(0, start) + emoji + newMessage.slice(end);
    setNewMessage(newValue);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleToggleRecord = () => {
    console.log('handleToggleRecord called, current mode:', voiceModalMode);
    handleFirstInteraction();
    if (voiceModalMode === 'ready-to-record') {
      startRecording();
    } else if (voiceModalMode === 'recording') {
      stopRecording();
    }
  };

  const startRecording = async () => {
    console.log('startRecording called');
    if (typeof window === 'undefined') return;
    try {
      // Pausa qualquer áudio em reprodução
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsAudioPlaying(false);
        setIsAudioPaused(false);
        setCurrentPlayingMessageId(null);
      }

      setVoiceModalMode('recording');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioUrl(URL.createObjectURL(audioBlob));
        handleAudioSubmit(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Recording error:', err);
      setVoiceModalMode('ready-to-record');
    }
  };

  const stopRecording = () => {
    console.log('stopRecording called');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setVoiceModalMode('thinking');
      mediaRecorderRef.current.stop();
    }
  };

  const handleVoiceModalClose = () => {
    setVoiceModalOpen(false);
    setVoiceModalMode('ai-speaking');
    setVoiceMode('idle');
    
    // Pausa qualquer áudio em reprodução
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsAudioPlaying(false);
      setIsAudioPaused(false);
      setCurrentPlayingMessageId(null);
    }

    // Para a gravação se estiver ativa
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    console.log('[useEffect] Scroll typewriter chamado', { isTypewriterActive, isNearBottom });
    if (isTypewriterActive && isNearBottom) {
      const interval = setInterval(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isTypewriterActive, isNearBottom]);

  const handleAudioSubmit = async (audioBlob: Blob) => {
    setVoiceModalMode('thinking');
    setIsBotTyping(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');
      formData.append('conversationHistory', JSON.stringify(messages));
      
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Falha na transcrição');
      }

      const data = await res.json();
      console.log('Transcription result:', data);
      
      if (data.text) {
        // Adiciona a mensagem do usuário
        const userMsg: Message = {
          id: 'user-' + Date.now(),
          content: data.text,
          user: 'me',
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);
        
        // Se já temos uma resposta do ChatGPT
        if (data.reply) {
          const botMsg: Message = {
            id: 'bot-' + Date.now(),
            content: data.reply,
            user: 'bot',
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, botMsg]);
          setVoiceModalMode('ready-to-record');
          // Reproduz o áudio da resposta do bot
          await playTTS(data.reply, botMsg.id);
        } else {
          // Se não temos resposta, envia para o ChatGPT
          setLoading(true);
          try {
            const chatRes = await fetch('/api/chatgpt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                message: data.text,
                conversationHistory: messages,
                language: data.language
              }),
            });

            if (!chatRes.ok) {
              throw new Error('Falha ao obter resposta do ChatGPT');
            }

            const aiData = await chatRes.json();
            const botMsg: Message = {
              id: 'bot-' + Date.now(),
              content: aiData.reply || t('common.error'),
              user: 'bot',
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, botMsg]);
            // Reproduz o áudio da resposta do bot
            await playTTS(botMsg.content, botMsg.id);
          } catch (err) {
            console.error('ChatGPT error:', err);
            const errorMsg: Message = {
              id: 'bot-error-' + Date.now(),
              content: t('common.error'),
              user: 'bot',
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMsg]);
            // Reproduz o áudio da mensagem de erro
            await playTTS(errorMsg.content, errorMsg.id);
          } finally {
            setLoading(false);
            setVoiceModalMode('ready-to-record');
          }
        }
      } else {
        throw new Error('Nenhum texto transcrito');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setVoiceModalMode('ready-to-record');
      const errorMsg: Message = {
        id: 'bot-error-' + Date.now(),
        content: t('common.error'),
        user: 'bot',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      // Reproduz o áudio da mensagem de erro
      await playTTS(errorMsg.content, errorMsg.id);
    } finally {
      setIsBotTyping(false);
    }
  };

  return (
    <div className="bg-auth-gradient min-h-screen flex items-center justify-center">
      <Toaster position="bottom-right" />
      <div className="w-full h-screen md:h-[90vh] md:max-w-2xl flex flex-col rounded-none md:rounded-3xl shadow-2xl border border-white/30">
        <header className="p-4 md:p-4 flex justify-between items-center relative border-b border-white/20">
          <h1 className="text-2xl font-bold text-white drop-shadow">{t('chat.assistantTitle') || 'Assistente IA'}</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-white/30 hover:bg-white/50 text-gray-800 dark:text-white focus:outline-none"
              aria-label={dark ? t('settings.lightMode') : t('settings.darkMode')}
            >
              {dark ? (
                <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5 text-yellow-400'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M6.05 17.95l-1.414 1.414m12.728 0l-1.414-1.414M6.05 6.05L4.636 4.636' />
                  <circle cx='12' cy='12' r='5' fill='currentColor' />
                </svg>
              ) : (
                <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5 text-gray-700 dark:text-white'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z' />
                </svg>
              )}
            </button>
          </div>
        </header>
        <main
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 px-6 py-4 overflow-y-auto custom-scrollbar">
          {greetingLoading ? (
            <div className="flex justify-center items-center py-8">
              <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></span>
              <span className="ml-3 text-white/80">{t('chat.greetingLoading')}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.user === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.user === 'bot' && (
                    <div className="flex flex-col items-end mr-2 justify-center">
                      <FaRobot className="text-3xl text-white" />
                    </div>
                  )}
                  <div
                    className={`rounded-xl p-4 border-[0.5px] border-white text-white bg-transparent max-w-[90%] md:max-w-[90%] min-w-[100px] text-base relative ${msg.user === 'me' ? 'ml-2' : 'mr-2'}`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      {msg.user === 'bot' ? (
                        <div className="prose prose-invert max-w-none">
                          <TypewriterEffect
                            text={msg.content}
                            speed={50}
                            delay={100}
                            render={(text) => (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ children }) => <p className="mb-2">{children}</p>,
                                  h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
                                  ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                                  li: ({ children }) => <li className="mb-1">{children}</li>,
                                  code: ({ children }) => <code className="bg-gray-800 rounded px-1">{children}</code>,
                                  pre: ({ children }) => <pre className="bg-gray-800 rounded p-2 mb-2 overflow-x-auto">{children}</pre>,
                                  blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-600 pl-4 italic mb-2">{children}</blockquote>,
                                  a: ({ href, children }) => <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                                  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                  em: ({ children }) => <em className="italic">{children}</em>,
                                }}
                              >
                                {text}
                              </ReactMarkdown>
                            )}
                          />
                        </div>
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-5 pb-1 relative justify-between">
                      <div className="flex items-center gap-2">
                        {msg.user === 'bot' && (
                          <>
                            <button
                              className={`transition-colors ${feedback[msg.id] === 'like' ? 'text-green-400' : 'text-white'} hover:text-green-400`}
                              onClick={() => handleFeedback(msg.id, 'like', msg.content)}
                            >
                              <FaRegThumbsUp className="text-lg" />
                            </button>
                            <button
                              className={`transition-colors ${feedback[msg.id] === 'dislike' ? 'text-red-400' : 'text-white'} hover:text-red-400`}
                              onClick={() => handleFeedback(msg.id, 'dislike', msg.content)}
                            >
                              <FaRegThumbsDown className="text-lg" />
                            </button>
                            <button
                              className={`hover:text-blue-300 transition-colors`}
                              onClick={async () => {
                                if (currentPlayingMessageId === msg.id) {
                                  toggleAudioPlayback();
                                } else {
                                  setTtsLoadingMsgId(msg.id);
                                  await playTTS(msg.content, msg.id, () => setTtsLoadingMsgId(null));
                                  setTtsLoadingMsgId(null);
                                }
                              }}
                              disabled={ttsLoadingMsgId === msg.id}
                            >
                              {ttsLoadingMsgId === msg.id ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 inline-block"></span>
                              ) : currentPlayingMessageId === msg.id && isAudioPaused ? (
                                <FaPlay className="text-lg text-white" />
                              ) : currentPlayingMessageId === msg.id && isAudioPlaying ? (
                                <FaPause className="text-lg text-white" />
                              ) : (
                                <FaVolumeUp className="text-lg text-white" />
                              )}
                            </button>
                            <button className="hover:text-blue-300 transition-colors" onClick={() => setCommentModal({ open: true, message: { id: msg.id, content: msg.content } })}><FaRegCommentDots className="text-lg text-white" /></button>
                          </>
                        )}
                      </div>
                      <span className="text-xs opacity-60 whitespace-nowrap">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  {msg.user === 'me' && (
                    <div className="flex flex-col items-end ml-2 justify-center">
                      <FaUserCircle className="text-3xl text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isBotTyping && (
                <div className="flex justify-start">
                  <div className="flex flex-col items-end mr-2 justify-center">
                    <FaRobot className="text-3xl text-white" />
                  </div>
                  <div className="rounded-xl p-4 border-[0.5px] border-white text-white bg-transparent max-w-[90%] md:max-w-[90%] min-w-[100px] text-base relative mr-2">
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>
        <footer className="w-full p-3">
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-3 bg-transparent rounded-2xl px-4 py-2 shadow-md border border-white/30 relative"
          >
            <div className="flex items-center w-full">
              <button
                ref={emojiButtonRef}
                type="button"
                className={`hidden md:inline-flex text-xl text-white hover:text-gray-200 mr-2 ${isEmojiButtonActive ? 'text-blue-400' : ''}`}
                onClick={handleEmojiButtonClick}
                tabIndex={-1}
              >
                <FaRegSmile />
              </button>
              <input
                ref={inputRef}
                type="text"
                placeholder={t('chat.typeMessage')}
                className="flex-1 bg-transparent outline-none px-2 py-2 text-white dark:text-white placeholder-gray-200 dark:placeholder-gray-300"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={loading}
                style={{ background: 'transparent' }}
              />
              <button
                type="submit"
                className="text-xl text-white hover:text-gray-200 disabled:opacity-50 ml-2"
                disabled={!newMessage.trim() || loading}
              >
                <FaPaperPlane />
              </button>
              <button
                type="button"
                className="text-xl text-white hover:text-gray-200 ml-2"
                onClick={() => {
                  setVoiceModalOpen(true);
                  setVoiceModalMode('ready-to-record');
                }}
              >
                <FaMicrophone className="text-xl" />
              </button>
            </div>
            {showEmojiPicker && (
              <div 
                ref={emojiPickerRef}
                className="absolute bottom-12 left-0 z-50 emoji-picker-container"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-white dark:bg-[#23234a] rounded-xl shadow-lg">
                  <EmojiPicker
                    data={data}
                    theme={dark ? 'dark' : 'light'}
                    onEmojiSelect={(e: any) => {
                      insertEmoji(e.native);
                    }}
                    previewPosition="none"
                    skinTonePosition="none"
                    searchPosition="none"
                  />
                </div>
              </div>
            )}
          </form>
        </footer>
      </div>
      <CommentModal
        isOpen={commentModal.open}
        onClose={() => setCommentModal({ open: false })}
        onSubmit={(comment) => {
          if (commentModal.message) {
            handleComment(commentModal.message.id, commentModal.message.content, comment);
          }
        }}
      />
      <VoiceModal
        isOpen={voiceModalOpen && (voiceModalMode === 'ready-to-record' || voiceModalMode === 'recording')}
        onClose={handleVoiceModalClose}
        onSubmit={handleAudioSubmit}
        mode={voiceModalMode}
        onToggleRecord={handleToggleRecord}
        modalRef={voiceModalRef}
      />
    </div>
  );
};

export default ChatComponent; 