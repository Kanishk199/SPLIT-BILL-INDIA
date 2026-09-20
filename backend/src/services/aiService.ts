import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
].filter(Boolean) as string[];

async function generateWithFallback(
  ai: GoogleGenerativeAI,
  content: any
): Promise<string> {
  let lastError: unknown;
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(content);
      return result.response.text();
    } catch (err) {
      lastError = err;
      console.warn(`[AI] ${modelName} failed: ${(err as Error).message}. Retrying fallback...`);
    }
  }
  throw lastError;
}

export interface ExtractedBill {
  title: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  tip: number;
  discount: number;
  total: number;
  rawText?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ParsedAssignment {
  personName: string;
  items: string[];
}

export interface AIAction {
  type: 'assign_items' | 'show_balance' | 'record_payment' | 'create_reminder' | 'general_response' | 'show_settlements';
  data?: Record<string, unknown>;
}

export interface AIResponse {
  message: string;
  action?: AIAction;
}

/**
 * Extract bill details from image using Gemini Vision
 */
export async function extractBillFromImage(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<ExtractedBill> {
  const ai = getGenAI();

  const prompt = `You are a bill parsing expert for an Indian restaurant bill splitting app.
  
Analyze this bill image and extract ALL items, quantities, prices, and totals.
Return ONLY valid JSON with this exact structure:
{
  "title": "restaurant or bill name if visible",
  "items": [
    { "name": "item name", "quantity": 1, "price": 100.00, "totalPrice": 100.00 }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "serviceCharge": 0.00,
  "tip": 0.00,
  "discount": 0.00,
  "total": 0.00,
  "confidence": "high|medium|low"
}

Rules:
- All amounts in INR (remove ₹ symbol, keep numbers)
- If quantity not shown, assume 1
- totalPrice = quantity * price
- Include all line items (food, beverages, etc.)
- Detect tax (GST, CGST, SGST), service charge, tips separately
- If bill is unclear, set confidence to "low"
- Do NOT include the grand total as an item`;

  const text = await generateWithFallback(ai, [
    { text: prompt },
    { inlineData: { mimeType, data: imageBase64 } },
  ]);
  
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse bill from image');
  
  const parsed = JSON.parse(jsonMatch[0]) as ExtractedBill;
  return parsed;
}

/**
 * Parse natural language bill description to extract items
 */
export async function parseBillText(text: string): Promise<ExtractedBill> {
  const ai = getGenAI();

  const prompt = `Extract bill items from this text description of a restaurant bill.
Return ONLY valid JSON with this structure:
{
  "title": "Expense",
  "items": [{ "name": "item", "quantity": 1, "price": 0, "totalPrice": 0 }],
  "subtotal": 0,
  "tax": 0,
  "serviceCharge": 0,
  "tip": 0,
  "discount": 0,
  "total": 0,
  "confidence": "medium"
}

Bill text: "${text}"`;

  const responseText = await generateWithFallback(ai, prompt);
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse bill text');
  return JSON.parse(jsonMatch[0]) as ExtractedBill;
}

/**
 * Parse natural language assignment like "Rahul had biryani and coke. Kanishk had paneer."
 */
export async function parseNaturalLanguageAssignment(
  message: string,
  billItems: Array<{ id: string; name: string }>,
  groupMembers: Array<{ id: string; name: string }>
): Promise<ParsedAssignment[]> {
  const ai = getGenAI();

  const itemNames = billItems.map((i) => i.name).join(', ');
  const memberNames = groupMembers.map((m) => m.name).join(', ');

  const prompt = `You are a bill assignment parser for a group dining app.

Group members: ${memberNames}
Bill items: ${itemNames}

Parse this message and determine who had what items:
"${message}"

Return ONLY valid JSON array:
[
  { "personName": "exact name from group", "items": ["exact item name from bill"] }
]

Rules:
- Match person names case-insensitively (fuzzy match is ok)
- Match item names to the closest item in the bill list
- If someone says "I paid" or "I had", figure out who "I" is from context
- If an item is not mentioned for anyone, leave it unassigned
- Return only people who were assigned items`;

  const text = await generateWithFallback(ai, prompt);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  
  return JSON.parse(jsonMatch[0]) as ParsedAssignment[];
}

/**
 * Main SplitBot chat function
 */
export async function splitBotChat(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }>,
  context: {
    userId: string;
    userName: string;
    currentGroupId?: string;
    currentBillId?: string;
    balanceSummary?: string;
    groupMembers?: Array<{ id: string; name: string }>;
    billItems?: Array<{ id: string; name: string; price: string }>;
  }
): Promise<AIResponse> {
  const ai = getGenAI();

  const systemPrompt = `You are SplitBot, an AI assistant for BillSplit India - an app for splitting bills among friends.
You are helpful, friendly, and speak naturally to Indian Gen-Z users.
The current user is: ${context.userName}

${context.balanceSummary ? `Current balance context:\n${context.balanceSummary}` : ''}
${context.groupMembers?.length ? `Group members: ${context.groupMembers.map((m) => m.name).join(', ')}` : ''}
${context.billItems?.length ? `Current bill items: ${context.billItems.map((i) => `${i.name} (₹${i.price})`).join(', ')}` : ''}

IMPORTANT RULES:
1. You can help with: showing balances, assigning bill items, recording payments, creating reminders
2. NEVER claim a payment has been made unless the user explicitly confirms it
3. For reminders: prepare them and ask user to review before sending
4. For payments: prepare the action and ask user to confirm
5. Always use ₹ for currency, never $ or USD
6. Be concise and friendly - this is a mobile app, not a corporate tool
7. If asked about assignments, return structured action data

When you need to trigger an app action, include it in your response as:
[ACTION: {"type": "action_type", "data": {...}}]

Action types:
- assign_items: {"personName": "...", "items": [...]}
- show_balance: {"userId": "..."}  
- create_reminder: {"targetName": "...", "amount": "...", "message": "..."}
- record_payment: {"from": "...", "to": "...", "amount": "..."}
- show_settlements: {}

Speak in a mix of English and casual Indian expressions naturally. Be warm and helpful.`;

  let lastError: unknown;
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const chat = model.startChat({
        history: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Understood! I\'m SplitBot, ready to help with bill splitting. What can I do for you?' }] },
          ...conversationHistory,
        ],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
      });

      const result = await chat.sendMessage(userMessage);
      const responseText = result.response.text();

      // Extract action if present
      const actionMatch = responseText.match(/\[ACTION:\s*(\{[\s\S]*?\})\]/);
      let action: AIAction | undefined;
      let cleanMessage = responseText;

      if (actionMatch) {
        try {
          action = JSON.parse(actionMatch[1]) as AIAction;
          cleanMessage = responseText.replace(actionMatch[0], '').trim();
        } catch {
          // Ignore parse errors
        }
      }

      return { message: cleanMessage, action };
    } catch (err) {
      lastError = err;
      console.warn(`[AI Chat] ${modelName} failed: ${(err as Error).message}. Retrying fallback...`);
    }
  }
  throw lastError;
}
