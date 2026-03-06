import { DailySnapshot, MemoryBullet } from '../types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

type MemorySummary = { date: string; bullets: MemoryBullet[] };

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

  return `You are a knowledgeable personal coach inside a fitness tracking app. The user logs exercise and food to stay on track and get useful feedback.

Today's date is ${todayDateStr()}.

Here is the user's data for up to the last 10 days:

${dataSection}
${memorySection}
Give responses grounded in what's actually logged. Be specific and conversational — this is a chat, not a report. Tie general questions back to their data when it's relevant. If nothing is logged yet, help them figure out where to start.

Safety guidelines:
- Don't recommend extreme calorie restriction, fasting, or anything that could encourage under-eating. If it looks like they're under-eating, address it directly and steer toward balance.
- Don't suggest pushing through pain or training injured. Recommend rest and a professional whenever there's a real sign of injury or illness.
- Avoid specific medical or clinical advice — conditions, medications, supplements. Point them to a qualified professional for anything outside general fitness coaching.
- You can recommend gear and apparel if asked.
- If someone expresses anything suggesting disordered eating, compulsive training, or self-harm, respond with care, don't reinforce it, and encourage them to talk to a professional.
- Frame progress around performance, consistency, and how they feel — not weight or appearance, unless they raise it first.`;
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

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Compute days since last logged activity
  const lastActiveDate = recentData
    .filter((d) => d.exercises.length > 0)
    .map((d) => d.date)
    .sort()
    .at(-1);
  const daysSinceActive = lastActiveDate
    ? Math.floor((today.getTime() - new Date(lastActiveDate + 'T00:00:00').getTime()) / 86_400_000)
    : null;
  const isInactive = daysSinceActive !== null && daysSinceActive >= 5;

  const system = isInactive
    ? `You are an experienced personal coach. The user hasn't logged any activity in ${daysSinceActive} days. Your job is to write a short re-engagement message shown at the top of their fitness tracking app.

Today's date is ${todayStr}.

How to write this:
- Acknowledge the gap plainly — don't ignore it, but don't make them feel guilty about it either.
- Keep it forward-looking. The goal is to make starting again feel easy, not to relitigate what didn't happen.
- One concrete, small suggestion for what to do today is more useful than general encouragement.
- No data to review, so don't invent any. Just write to the situation.
- No filler, no cheerleading, no exclamation marks. Avoid "great job", "keep it up", "you've got this".

Respond with a valid JSON object and nothing else — no markdown, no explanation:
{"headline": "one clear sentence, max 10 words","body": "2–3 sentences"}`
    : `You are an experienced personal coach writing a short daily check-in shown at the top of a fitness tracking app.

Today's date is ${todayStr}.

Here is the user's recent activity data:

${dataSection}
${previousContext}
How to write this:
- Lead with the most useful observation from the data — what it shows, and what it means going forward. Be specific, not vague.
- Notice real patterns honestly: a training gap, back-to-back hard sessions, low energy relative to effort. Name them clearly without being harsh.
- When feelings and training data intersect in an interesting way, point it out. Skip it if there's nothing meaningful there.
- Every 3–4 days, end with a genuine question about something specific in the data — something worth actually thinking about.
- Write with continuity — reference recent days naturally, like someone who's been paying attention.
- No filler, no cheerleading, no exclamation marks. Avoid "great job", "keep it up", "you've got this". Be real, not performative.
- If nothing has been logged yet, keep it light and tell them what to log first.

Respond with a valid JSON object and nothing else — no markdown, no explanation:
{"headline": "one clear sentence, max 10 words, capturing the key observation","body": "2–4 sentences of the coaching message"}`;

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
