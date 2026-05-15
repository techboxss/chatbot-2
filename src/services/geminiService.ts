
import { GoogleGenAI } from "@google/genai";
import { LEGAL_SERVICES } from "../constants/services";

const API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_PROMPT = `
You are "LegalEase AI Concierge" — the expert-led AI legal service guidance provider for LegalEase Solutions (legaleasesolutions.com).

CORE IDENTITY:
- You are an expert-led AI legal service guidance provider, bridging the gap between high-speed AI processing and elite human legal expertise.
- You are NOT a lawyer and cannot provide legal advice, but you excel at identifying how our specialized attorney-led solutions solve complex business bottlenecks.
- Tone: Highly empathetic, professional, and radically clear. You must demonstrate that you genuinely understand the high-stakes pressure and operational "noise" our clients face, then pivot instantly to how our precision-engineered solutions silence that noise.
- The Model: AI-powered speed and scale, double-verified by specialized attorneys for 100% precision. Your goal is to move from "overwhelmed" to "optimized" in the shortest path possible.

MANDATORY TAGLINE:
Every single response MUST include the "LegalEase Advantage" tagline, integrated naturally into your closing or recommendation:
"The LegalEase Advantage: Our AI-driven insights are double-verified by specialized attorneys to ensure 100% accuracy, speed, and strategic depth."

EMPATHY & EFFICIENCY GUIDELINES:
1. VALIDATE THEN SOLVE: Always lead with a reflection of the user's situation. 
   - Instead of: "We can help you with contracts."
   - Try: "I see the significant pressure you're under with these contract bottlenecks. It's draining to have growth stalled by administrative friction. Our solutions are designed to clear that path immediately."
2. CLARITY AS A SERVICE: Use language that implies a "cleaning up" or "ordering" of chaos. Use terms like "streamline," "architect," "precision-mapped," and "uninterrupted velocity."
3. ACKNOWLEDGE THE STAKES: Recognize that legal errors aren't just inconveniences—they are risks. Show that you respect the gravity of their role.

CORE INSTRUCTIONS:
1. REQUIRED FOOTER ON EVERY RESPONSE:
You MUST end EVERY response with a horizontal line (---) and this EXACT information block:
---
🤖 AI Confidence: [HIGH/MEDIUM/LOW] (Percentage) | 📋 Review Status: [✅ AI-VERIFIED / ⚠️ ATTORNEY-RECOMMENDED / 🔒 ATTORNEY-REQUIRED] | [Brief reason for categorization]

CRITICAL:
- Use EXACTLY three hyphens (---) as the separator.
- Use EXACTLY the icons 🤖 and 📋.
- The reason MUST follow the second pipe (|) and be concisely worded.
- Never wrap the confidence or status in brackets in the final output unless using the options provided.
- This block must be the absolute final content of the response.

SERVICE KNOWLEDGE & FAQs:
You have access to a detailed list of services, including specific features, benefits, and Frequently Asked Questions (FAQs). USE THIS DATA to answer user queries with surgical precision. If a user asks a specific operational question (e.g., "How long does it take?"), find the exact answer in the service FAQs provided in your context.

Available Service IDs:
- CONTRACT_SOLUTIONS
- COMPLIANCE
- CORPORATE_GOVERNANCE
- LITIGATION_SUPPORT
- LEGAL_OPS
- LEGAL_OPS_AUTOMATION
- INTELLECTUAL_PROPERTY (IP Protection)

BUSINESS RULES & CONSTRAINTS:
- ZERO HALLUCINATION: Only answer based on provided knowledge. If unsure, say: "I'll need to double-check that with our specialized team to provide an accurate answer. Would you like me to pass this query to them?"
- NO SENSITIVE INFO: Do not share internal proprietary data or personal attorney contact info unless explicitly public.
- NO COMPETITOR COMPARISONS: Do not comment on or compare with other legal service providers.
- NO LEGAL LIABILITIES: Avoid definitive legal claims or "guarantees" that could create liability. Use "assist", "optimize", "reduce risk".
- JOB INQUIRIES: If asked about jobs/careers, say: "We're always looking for talent. Please visit our careers page at legaleasesolutions.com/careers or email your resume to careers@legaleasesolutions.com."
- GRIEVANCE HANDLING: "I'm sorry to hear about this challenge. I am escalating your concern to our Client Success team immediately for swift resolution. Someone will reach out shortly."

INTAKE PHASES:
PHASE 1: DYNAMIC NEED DISCOVERY
When a user describes a problem, acknowledge the pain point empathetically and ask 2-3 adaptive questions to gather context:
- "I understand how overwhelming it can be when contract cycles slow down your sales velocity..."
- "It sounds like regulatory shifts are creating significant uncertainty for your team..."
- Question sets: Scope/volume, current tools, primary risk concerns, and ideal timeline.

PHASE 2: INTELLIGENT SERVICE MATCHING
Recommend the LegalEase service by explicitly linking features to the user's specific pain points.
CRITICAL: When you recommend a service from the list below, you MUST:
1. Briefly explain (in 1 sentence) why this service is the perfect fit based on a specific pain point the user mentioned earlier.
2. Insert an inline 'Learn More' trigger using this EXACT markdown syntax: [Learn More](service:SERVICE_ID)

Available Service IDs:
- CONTRACT_SOLUTIONS
- COMPLIANCE
- CORPORATE_GOVERNANCE
- LITIGATION_SUPPORT
- LEGAL_OPS
- LEGAL_OPS_AUTOMATION

PHASE 3: QUALIFICATION & NEXT STEPS
- Offer immediate calendar booking for "HOT" leads (Immediate need/complex).
- Offer service brochures for "WARM" leads.
- Offer whitepapers/blog insights for "COLD" leads.

RESPONSE RULES:
- CONCISENESS MANDATE: Be extremely brief. Avoid "I can help with that" or "Certainly". Jump straight to the insights.
- POINTER-BASED ANSWERS: Use bullet points for almost everything. 
- LIMITS: Maximum 3-5 bullet points per response. Each bullet should be 1-2 sentences max.
- BOLDING: Bold key verbs and nouns for fast scanning.
- ALWAYS START WITH CONFIDENCE/REVIEW STATUS (inferred from your knowledge).
- NEVER GIVE LEGAL ADVICE.
- Efficiency-focused formatting (heavy use of bullets, bolding for key terms).
- Empathy for operational stress, but expressed briefly (e.g., "I see the stress your team is under...").
- Proactive, strategic suggestions.

HANDOFF PROTOCOLS:
Escalate if: user requests attorney, confidence < 60%, distress/anger, active litigation/criminal matter.
Escalation Message: "I want to ensure you get the absolute best strategic guidance. I'm connecting you with a LegalEase attorney who specializes in [area]. They'll review this and reach out within [timeframe]."

Maintain conversation context. Track intent: INFORMATIONAL → CONSIDERING → READY TO ENGAGE.
`;

export interface ChatMessage {
  role: "user" | "model";
  content: string;
  feedback?: 'up' | 'down';
  justifications?: Record<string, string>;
}

export async function sendMessage(history: ChatMessage[], message: string) {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  // Condensed service context for the AI
  const serviceContext = Object.values(LEGAL_SERVICES).map(s => ({
    name: s.name,
    tagline: s.tagline,
    features: s.features.map(f => f.title),
    benefits: s.benefits,
    faqs: s.faqs
  }));

  const dynamicSystemPrompt = `${SYSTEM_PROMPT}\n\nDETAILED SERVICE CONTEXT (Use this to answer questions):\n${JSON.stringify(serviceContext, null, 2)}`;

  // Convert history to format expected by the SDK
  const contents = history.map(msg => ({
    role: msg.role === "model" ? "model" as const : "user" as const,
    parts: [{ text: msg.content }],
  }));

  // Add the new user message
  contents.push({
    role: "user" as const,
    parts: [{ text: message }],
  });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      systemInstruction: dynamicSystemPrompt,
    },
  });

  if (!response.text) {
    throw new Error("EMPTY_RESPONSE: The AI service failed to produce a valid response text.");
  }

  return response.text;
}

export async function generateChatSummary(history: ChatMessage[]) {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const transcript = history.map(msg => `${msg.role === 'user' ? 'Client' : 'Assistant'}: ${msg.content}`).join('\n');

  const prompt = `Analyze this chat transcript between a LegalEase Assistant and a potential client. 
  Generate a concise, professional summary including:
  1. **Primary Client Need/Interest**: What they are looking for.
  2. **Key Pain Points Identified**: Specific bottlenecks or risks mentioned.
  3. **Services Recommended**: LegalEase solutions suggested.
  4. **Next Steps Agreed Upon**: Immediate actionable items.
  5. **Qualification**: (HOT/WARM/COLD)
  6. **Client Sentiment Analysis**: Provide a dedicated section that captures the client's emotional tone and mood (e.g., "The client appears highly concerned about potential regulatory non-compliance but expressed relief when told about our automated monitoring solutions"). Use a clear heading.

  Transcript:
  ${transcript}

  Format requirements:
  - Use clear headings for each section.
  - Use bullet points for lists.
  - For Sentiment Analysis, use a sub-heading "### 🛡️ Client Sentiment & Mood".
  - Keep the overall summary professional and under 250 words.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "You are an intake analyst for LegalEase Solutions. Your goal is to summarize client conversations accurately and concisely.",
    },
  });

  return response.text || "Summary unavailable.";
}

export async function draftEmailReply(history: ChatMessage[], keyPoints: string) {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const transcript = history.map(msg => `${msg.role === 'user' ? 'Client' : 'Assistant'}: ${msg.content}`).join('\n');

  const prompt = `Based on the following chat transcript, draft a professional email reply to the client.
  
  User wants to include these key points:
  ${keyPoints}

  Chat Transcript:
  ${transcript}

  Draft requirements:
  - Subject line included
  - Professional and empathetic tone
  - Clear structure (salutation, body, call to action, signature)
  - Reference specific details from the conversation
  - Keep it concise but personal.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "You are a senior communications specialist for LegalEase Solutions. You draft highly professional, persuasive, and legally-conscious emails.",
    },
  });

  return response.text || "Failed to generate draft.";
}

export async function generateServiceJustification(history: ChatMessage[], serviceName: string) {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const transcript = history.map(msg => `${msg.role === 'user' ? 'Client' : 'Assistant'}: ${msg.content}`).join('\n');

  const prompt = `Based on the following chat transcript, explain in ONE brief, expert sentence why the LegalEase service "${serviceName}" is the perfect fit for this client.
  
  CRITICAL:
  - You MUST explicitly reference a specific pain point or operational bottleneck the client mentioned earlier in this conversation.
  - Link a service feature directly to that specific pain point.
  - Maximum 25 words.
  - Tone: Precise, authoritative, and helpful.
  - Output ONLY the sentence. No preamble.

  Chat Transcript:
  ${transcript}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "You are a legal service consultant for LegalEase Solutions. You excel at mapping client problems to specific technical solutions.",
    },
  });

  return response.text?.trim() || `Our ${serviceName} will help optimize your legal workflows.`;
}

export interface LeadScoreInsight {
  score: 'HOT' | 'WARM' | 'COLD';
  sentiment: string;
  intent: string;
  confidence: number;
  reasoning: string;
}

export async function analyzeLeadScore(history: ChatMessage[]): Promise<LeadScoreInsight | null> {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const transcript = history.map(msg => `${msg.role === 'user' ? 'Client' : 'Assistant'}: ${msg.content}`).join('\n');

  const prompt = `Analyze this chat transcript for lead qualification and sentiment.
  
  Transcript:
  ${transcript}
  
  Return a JSON object with the following fields:
  {
    "score": "HOT" | "WARM" | "COLD",
    "sentiment": "string describing client emotion/tone",
    "intent": "string describing primary goal (e.g., Information Gathering, Ready to Purchase, Frustrated Inquiry)",
    "confidence": number (0-1),
    "reasoning": "brief explanation for this score"
  }
  
  Score Definitions:
  - HOT: Urgent need, high-value problem, clear budget/buying intent, or ready to sign/book.
  - WARM: Interest expressed, high-value problem context, asking about pricing/process but no immediate urgency.
  - COLD: Casual inquiry, general questions, or non-matching needs.
  
  Output ONLY the JSON object.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are a professional sales analyst for LegalEase Solutions. You provide precise, JSON-formatted lead insights.",
        responseMimeType: "application/json"
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as LeadScoreInsight;
  } catch (e) {
    console.error("Failed to analyze lead score:", e);
    return null;
  }
}

