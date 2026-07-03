import { GoogleGenAI, Type } from "@google/genai";
import { aggregateCollectionByProgramAndDate } from "./paymentService.js";

let aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

/**
 * Parses user natural language query, aggregates financial records, and generates conversational reply
 */
export async function handleNaturalLanguageBotQuery(messageText, currentDateStr = "2026-07-01") {
  const ai = getGeminiClient();

  const parsePrompt = `
    Analyze the user's inquiry: "${messageText}".
    Your task is to extract the Academic Program name and the target Date mentioned.
    
    Academic Program names must be resolved to one of the following exact values if matched:
    - 'Regular'
    - 'Extension'
    - 'Weekend'
    - 'Short Term'
    
    If no program name is matched, return null.
    
    The target Date must be resolved into a clean string in 'YYYY-MM-DD' format.
    The current date is: ${currentDateStr}.
    Interpret relative date expressions (such as "today", "yesterday", "this morning", "3 days ago") strictly based on the current date of ${currentDateStr}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: parsePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            program: { 
              type: Type.STRING, 
              description: "The matched academic program name or null." 
            },
            date: { 
              type: Type.STRING, 
              description: "The resolved ISO date string formatted as YYYY-MM-DD." 
            }
          },
          required: ["program", "date"]
        }
      }
    });

    if (!response.text) {
      return "I'm sorry, I could not parse your query at the moment. Please specify a program (Regular/Extension/Weekend) and a date.";
    }

    const { program, date } = JSON.parse(response.text.trim());

    if (!program || !date) {
      return `I could not identify both a valid program (Regular, Extension, Weekend, Short Term) and a date in your query: "${messageText}". Could you please clarify, e.g. "How much did the Weekend program collect on 2026-07-01?"`;
    }

    // 2. Trigger corresponding aggregation function in paymentService.js
    const aggregationResult = await aggregateCollectionByProgramAndDate(program, date);

    // 3. Format conversational reply using Gemini
    const formatPrompt = `
      You are the Polytechnic College Finance Chatbot.
      The user asked: "${messageText}"
      The current context date is ${currentDateStr}.
      
      The database returned the following financial aggregation results for Program "${program}" on Date "${date}":
      - Total Approved / Auto-Verified Collections: ${aggregationResult.totalCollected} ETB
      - Total Pending Submission Amount: ${aggregationResult.pendingAmount} ETB
      - Total Transaction Submissions: ${aggregationResult.totalTransactions}
      
      Compose a conversational, professional, and friendly response answering the user's question. Use clear formatting, bullet points or emojis if helpful. Speak objectively, and state the numbers clearly in Ethiopian Birr (ETB). Keep it natural yet concise.
    `;

    const replyResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formatPrompt,
    });

    return replyResponse.text || `On ${date}, the ${program} program collected ${aggregationResult.totalCollected} ETB with ${aggregationResult.totalTransactions} transactions.`;

  } catch (error) {
    console.error('[Bot NLP Parser Error]:', error);
    return `An error occurred while processing your natural language request: ${error.message}`;
  }
}

const botQueryParser = {
  handleNaturalLanguageBotQuery
};

export default botQueryParser;
