import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'json',
      language: 'pt',
    });

    // Se houver histórico de conversa, envie para o ChatGPT para processamento
    if (conversationHistory) {
      try {
        const history = JSON.parse(conversationHistory as string);
        const chatResponse = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: "Você é o assistente de IA da Dengun. Mantenha o contexto da conversa anterior para dar respostas mais relevantes e coerentes." },
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
          reply: chatResponse.choices[0].message.content 
        });
      } catch (error) {
        console.error('Error processing with ChatGPT:', error);
      }
    }

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
} 