import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Mapear códigos de idioma para nomes completos
const languageMap: { [key: string]: string } = {
  'pt': 'português',
  'en': 'inglês',
  'es': 'espanhol',
  'fr': 'francês',
  'de': 'alemão',
  'it': 'italiano',
  'nl': 'holandês',
  'ru': 'russo',
  'zh': 'chinês',
  'ja': 'japonês',
  'ko': 'coreano'
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('audio');
    const conversationHistory = formData.get('conversationHistory');
    
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    // Convert Blob to File for OpenAI
    const audioFile = new File([file], 'audio.wav', { type: file.type || 'audio/wav' });

    // Transcrever o áudio com detecção automática de idioma
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
    });

    // Se houver histórico de conversa, envie para o ChatGPT para processamento
    if (conversationHistory) {
      try {
        const history = JSON.parse(conversationHistory as string);
        const chatResponse = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { 
              role: "system", 
              content: "Você é o assistente de IA da Dengun. Mantenha o contexto da conversa anterior para dar respostas mais relevantes e coerentes. Responda no mesmo idioma da mensagem do usuário."
            },
            ...history.map((msg: any) => ({
              role: msg.user === 'me' ? 'user' : 'assistant',
              content: msg.content
            })),
            { role: "user", content: transcription.text }
          ],
          temperature: 0.8,
          max_tokens: 1000,
        });

        return NextResponse.json({ 
          text: transcription.text,
          reply: chatResponse.choices[0].message.content,
          language: transcription.language
        });
      } catch (error) {
        console.error('Error processing with ChatGPT:', error);
        return NextResponse.json({ 
          text: transcription.text,
          language: transcription.language
        });
      }
    }

    return NextResponse.json({ 
      text: transcription.text,
      language: transcription.language
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
} 