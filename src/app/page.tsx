"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../lib/LanguageContext';
import { useTranslation, Language, translations } from '../lib/i18n';
import { useTheme } from './providers/ThemeProvider';

export default function Home() {
  const [selectedTooltip, setSelectedTooltip] = useState('');
  const [tooltips, setTooltips] = useState<string[]>([]);
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const { dark, toggleTheme } = useTheme();
  const router = useRouter();

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

  const handleStartChat = () => {
    router.push('/chat');
  };

  const handleTooltipSelect = (tooltip: string) => {
    if (tooltip) {
      console.log('Selecionando tooltip:', tooltip); // Debug
      const encodedTooltip = encodeURIComponent(tooltip);
      console.log('Tooltip codificada:', encodedTooltip); // Debug
      router.push(`/chat?tooltip=${encodedTooltip}`);
    }
  };

  return (
    <div className="min-h-screen bg-auth-gradient flex items-center justify-center p-4">
      <div className="bg-auth-gradient bg-opacity-95 border border-white/30 rounded-3xl p-8 w-full max-w-md backdrop-blur-md relative shadow-2xl animate-scaleIn">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-white/30 hover:bg-white/50 text-gray-800 dark:text-white focus:outline-none transition-colors"
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

        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {t('welcome.title') || 'Bem-vindo ao Chat'}
        </h2>

        <div className="space-y-6">
          {/* Dropdown Menu */}
          <div className="space-y-2">
            <label className="block text-white text-sm font-medium mb-2">
              {t('welcome.selectOption') || 'Escolha uma opção para iniciar:'}
            </label>
            <select
              value={selectedTooltip}
              onChange={(e) => setSelectedTooltip(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-auth-gradient border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
            >
              <option value="" className="bg-auth-gradient text-white">
                {t('welcome.selectPlaceholder') || 'Selecione uma opção'}
              </option>
              {tooltips.map((tooltip, index) => (
                <option key={index} value={tooltip} className="bg-auth-gradient text-white">
                  {tooltip}
                </option>
              ))}
            </select>
            {selectedTooltip && (
              <button
                onClick={() => handleTooltipSelect(selectedTooltip)}
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
              >
                {t('welcome.startWithOption') || 'Iniciar com esta opção'}
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-auth-gradient text-white/80">
                {t('welcome.or') || 'ou'}
              </span>
            </div>
          </div>

          {/* Start Chat Button */}
          <button
            onClick={handleStartChat}
            className="w-full px-4 py-3 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors font-medium"
          >
            {t('welcome.startChat') || 'Iniciar conversa'}
          </button>
        </div>
      </div>
    </div>
  );
}
