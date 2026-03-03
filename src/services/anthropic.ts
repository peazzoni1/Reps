import { DailySnapshot, MemoryBullet } from '../types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

type MemorySummary = { date: string; bullets: MemoryBullet[] };

function buildSystemPrompt(data: DailySnapshot[], memorySummaries: MemorySummary[] = []): string {
  const dataSection =
    data.length === 0
      ? 'No exercise or food data has been logged yet.'
      : data
          .map((day) => {
            const exerciseLines =
              day.exercises.length === 0
                ? '  No exercise logged.'
                : day.exercises
                    .map((e) => {
                      const details = e.workoutDetails?.length
                        ? ` (${e.workoutDetails.map((w) => `${w.name}${w.sets ? ` ${w.sets}x${w.reps}` : ''}${w.weight ? ` @ ${w.weight}lb` : ''}`).join(', ')})`
                        : '';
                      return `  - ${e.label}${details} — felt ${e.feelings?.join(', ')}${e.note ? ` — "${e.note}"` : ''}`;
                    })
                    .join('\n');

            const foodLines =
              day.food.length === 0
                ? '  No food logged.'
                : day.food
                    .map((f) => `  - ${f.meal ? `[${f.meal}] ` : ''}${f.description}`)
                    .join('\n');

            return `Date: ${day.date}\nExercise:\n${exerciseLines}\nFood:\n${foodLines}`;
          })
          .join('\n\n');

  const memorySection =
    memorySummaries.length > 0
      ? `\nPrevious session memory:\n${memorySummaries
          .map((m) => `${m.date}:\n${m.bullets.map((b) => `• ${b.text}`).join('\n')}`)
          .join('\n\n')}\n`
      : '';

  return `You are a supportive fitness and nutrition coach inside a personal tracking app. The user tracks their daily exercise sessions and food to get insights and stay on track.

Here is the user's data for up to the last 5 days:

${dataSection}
${memorySection}
Use this data to give personalized, specific, and encouraging responses. Be concise and conversational — this is a chat interface, not a report. If the user asks a general question, anchor your answer to their actual logged data when relevant. If no data is logged yet, still be helpful and invite them to start logging.

Safety guidelines — follow these strictly:
- Never recommend extreme calorie restriction, fasting protocols, or any eating pattern that could be harmful. If a user seems to be under-eating, gently encourage balanced nutrition rather than validating restriction.
- Never suggest pushing through pain, training injured, or ignoring physical warning signs. Always recommend rest and consulting a medical professional when there's any sign of injury or illness.
- Do not provide specific medical, dietary, or clinical advice (e.g. exact macros for a medical condition, advice about medications or supplements). If a topic is outside general wellness coaching, direct the user to a qualified professional.
- However you are allowed to search and make recommendations for exercise apparel and gear if the user asks for it.
- If a user expresses anything suggesting disordered eating, excessive exercise compulsion, or self-harm, respond with empathy, avoid reinforcing the behaviour, and encourage them to speak with a healthcare professional.
- Always frame progress around how the user feels, their consistency, and long-term sustainability — never around weight loss, body appearance, or comparisons to others unless the user explicitly raises it.`;
}

export async function generateSessionSummary(
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<MemoryBullet[]> {
  if (!API_KEY) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set.');

  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
    .join('\n');

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: `You are summarizing a coaching conversation for future reference. Extract only what matters for ongoing coaching: any goals the user mentioned, patterns or insights that came up, how the user described feeling physically or emotionally, and any decisions or intentions they expressed.

Return 3-5 concise bullet points as a JSON array. Each item has two fields:
- "text": the specific bullet point (avoid generic statements)
- "memoryType": either "persistent" (goals, injuries, preferences, long-term patterns) or "contextual" (mood, stress, weekly feelings, temporary states)

Return only the JSON array with no other text.`,
      messages: [{ role: 'user', content: transcript }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${error}`);
  }

  const json = await response.json();
  const raw = (json.content?.[0]?.text as string) ?? '[]';
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned) as MemoryBullet[];
}

type PreviousMessage = { date: string; headline: string; body: string };

export async function getDailyCheckIn(
  recentData: DailySnapshot[],
  previousMessages: PreviousMessage[] = []
): Promise<{ headline: string; body: string }> {
  if (!API_KEY) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set.');

  const dataSection =
    recentData.length === 0
      ? 'No activity has been logged yet.'
      : recentData
          .map((day) => {
            const exercises =
              day.exercises.length === 0
                ? '  No exercise.'
                : day.exercises
                    .map((e) => {
                      const details = e.workoutDetails?.length
                        ? ` (${e.workoutDetails.map((w) => `${w.name}${w.sets ? ` ${w.sets}x${w.reps}` : ''}${w.weight ? ` @ ${w.weight}lb` : ''}`).join(', ')})`
                        : '';
                      return `  - ${e.label}${details} — felt ${e.feelings?.join(', ')}${e.note ? ` — "${e.note}"` : ''}`;
                    })
                    .join('\n');
            const food =
              day.food.length === 0
                ? '  No food logged.'
                : day.food.map((f) => `  - ${f.meal ? `[${f.meal}] ` : ''}${f.description}`).join('\n');
            return `Date: ${day.date}\nExercise:\n${exercises}\nFood:\n${food}`;
          })
          .join('\n\n');

  const previousContext =
    previousMessages.length > 0
      ? `\nYour previous daily check-in messages (for continuity — build on these, don't repeat them):\n${previousMessages
          .map((m) => `${m.date}: headline: "${m.headline}" — ${m.body}`)
          .join('\n')}\n`
      : '';

  const system = `You are a personal fitness and wellness coach inside a daily tracking app. Your job is to write the user's morning check-in card — a brief, specific message shown at the top of their home screen.

Here is the user's recent activity data:

${dataSection}
${previousContext}
Coaching philosophy — follow these strictly:
- Be forward-looking first. Lead with what today's context means for the user going forward. Historical data is supporting evidence, not the headline.
- You have a consistent point of view: consistency and showing up matter more than intensity or perfection. Notice patterns gently. Occasionally name something the user might not have seen — a gap, a trend, a quiet contradiction in the data.
- When feelings data is available alongside exercise data, look for intersections — an unexpected correlation between how the user moved and how they felt is the most valuable insight.
- Roughly every 3–4 days, end the body with a genuine reflective question rather than a statement — open, non-pushy, inviting thought not just action. Base this on the day count implied by the data or previous messages.
- Write as if you have memory. Acknowledge continuity from recent days where relevant. This should feel like an ongoing conversation, not a fresh generic message.
- Tone: warm, calm, specific. Never generic motivational language. Never "crush it", "you've got this", "great job", or "keep it up". Never exclamation marks. Write like a thoughtful human coach who has followed this person for months.
- If no data has been logged yet, write a warm, low-pressure invitation to log their first session.

Respond with a valid JSON object and nothing else — no markdown, no explanation:
{"headline": "one punchy sentence, max 10 words, capturing the core insight or framing for the day","body": "2–4 sentences of the full coaching message"}`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system,
      messages: [{ role: 'user', content: 'Generate my daily check-in.' }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${error}`);
  }

  const json = await response.json();
  const raw = (json.content?.[0]?.text as string) ?? '';
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned) as { headline: string; body: string };
  return parsed;
}

export async function sendChatMessage(
  userMessage: string,
  history: ConversationMessage[],
  recentData: DailySnapshot[],
  memorySummaries: MemorySummary[] = []
): Promise<string> {
  if (!API_KEY) {
    throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set.');
  }

  const messages: ConversationMessage[] = [
    ...history,
    { role: 'user', content: userMessage },
  ];

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(recentData, memorySummaries),
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${error}`);
  }

  const json = await response.json();
  return (json.content?.[0]?.text as string) ?? '';
}
