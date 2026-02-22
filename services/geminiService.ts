
import { GoogleGenAI, Type } from "@google/genai";
import { Task } from "../types";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const getAIPrioritization = async (tasks: Task[]) => {
  const ai = getAIClient();
  const taskList = tasks.map(t => `${t.title} (${t.priority} priority, category: ${t.category})`).join('\n');
  
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `As a productivity coach, analyze these tasks and suggest an optimal order of execution for maximum efficiency. Explain why. Tasks:\n${taskList}`,
    config: {
      temperature: 0.7,
    }
  });

  return response.text;
};

export const generateSmartSchedule = async (tasks: Task[]) => {
  const ai = getAIClient();
  const taskList = tasks.filter(t => !t.completed).map(t => `- ${t.title} (${t.priority})`).join('\n');
  
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `Create a professional hourly schedule from 07:00 to 22:00 using these tasks. Be realistic about energy levels (hard tasks in the morning). 
    Return the result in a clean list format. 
    Tasks to include:\n${taskList}`,
    config: {
      temperature: 0.7,
    }
  });

  return response.text;
};

export const chatWithCoach = async (history: { role: 'user' | 'model', message: string }[], userInput: string) => {
  const ai = getAIClient();
  const chat = ai.chats.create({
    model: 'gemini-3.1-pro-preview',
    config: {
      systemInstruction: 'You are "LifeFlow AI Coach", a supportive, expert life strategist. You help users manage time, set goals, and overcome procrastination. Keep responses concise and motivating.',
    }
  });

  const response = await chat.sendMessage({ message: userInput });
  return response.text;
};
