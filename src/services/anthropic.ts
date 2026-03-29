import { DailySnapshot, MemoryBullet, MovementSession, Goal } from '../types';
import { DailyNote } from './storage';
import { supabase } from '../lib/supabase';

const SUPABASE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/anthropic-proxy`;

async function callAnthropicViaSupabase(
  system: string,
  messages: { role: string; content: string }[],
  maxTokens: number
): Promise<any> {
  // Always refresh session to ensure we have a valid token
  console.log('Refreshing session to get fresh token...');
  const {
    data: { session: refreshedSession },
    error: refreshError,
  } = await supabase.auth.refreshSession();

  if (refreshError || !refreshedSession) {
    console.error('Failed to refresh session:', refreshError);

    // Fallback: try to get existing session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      throw new Error('User must be authenticated to use AI features');
    }

    console.log('Using fallback session');
    return makeAnthropicRequest(session.access_token, system, messages, maxTokens);
  }

  console.log('Session refreshed, expires at:', refreshedSession.expires_at);
  console.log('Current time:', Math.floor(Date.now() / 1000));

  return makeAnthropicRequest(refreshedSession.access_token, system, messages, maxTokens);
}

async function makeAnthropicRequest(
  accessToken: string,
  system: string,
  messages: { role: string; content: string }[],
  maxTokens: number
): Promise<any> {
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('Supabase anon key not configured');
  }

  console.log('Calling Anthropic proxy');
  console.log('Function URL:', SUPABASE_FUNCTION_URL);
  console.log('Access token (first 20 chars):', accessToken.substring(0, 20));

  const response = await fetch(SUPABASE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({
      system,
      messages,
      maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Edge function error:', error);
    throw new Error(`AI service error ${response.status}: ${error}`);
  }

  return response.json();
}

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

type MemorySummary = { date: string; bullets: MemoryBullet[] };

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildSystemPrompt(data: DailySnapshot[], dailyNotes: DailyNote[] = [], memorySummaries: MemorySummary[] = []): string {
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

            const dayNote = dailyNotes.find(n => n.date === day.date);
            const notesLine = dayNote ? `Notes:\n  "${dayNote.content}"` : '';

            return `Date: ${day.date}\nExercise:\n${exerciseLines}\nFood:\n${foodLines}${notesLine ? `\n${notesLine}` : ''}`;
          })
          .join('\n\n');

  const memorySection =
    memorySummaries.length > 0
      ? `\nPrevious session memory:\n${memorySummaries
          .map((m) => `${m.date}:\n${m.bullets.map((b) => `• ${b.text}`).join('\n')}`)
          .join('\n\n')}\n`
      : '';

  return `You are a warm, supportive personal coach inside a fitness tracking app. The user logs exercise and food to stay on track and get useful feedback.

Today's date is ${todayDateStr()}.

Here is the user's data for up to the last 10 days:

${dataSection}
${memorySection}
Tone and approach:
- Be kind, encouraging, and genuinely curious about how the user is doing. This is a conversation, not an assessment.
- Give responses grounded in what's actually logged. Be specific and conversational — this is a chat, not a report.
- When you notice something worth mentioning — a pattern, a gap, a hard week, or meaningful daily notes — frame it with care and curiosity, not criticism. Lead with understanding before offering suggestions.
- Daily notes reveal the user's mental and emotional state — honor that context when it's relevant to the conversation.
- Tie general questions back to their data when it's relevant. If nothing is logged yet, help them figure out where to start in a low-pressure way.

Scope and boundaries:
- You're a fitness and wellness coach. Stay focused on: exercise, nutrition, recovery, sleep, stress management, mental health as it relates to fitness, habit building, and general wellness.
- Gray areas that connect to fitness are fine: weather (affects outdoor training), energy levels, mood, life stress (impacts training), injury prevention, gear and apparel.
- If someone asks something clearly unrelated to fitness/wellness (current events, math problems, general knowledge, coding help, etc.), gently redirect: "I'm here to help with your fitness and wellness journey. Is there something about your training, nutrition, or how you're feeling that I can help with?"
- Don't be robotic about it — if someone shares something personal that led to missing workouts (work stress, family situation), acknowledge it with empathy before guiding back to how you can support their fitness goals.

Safety guidelines:
- Don't recommend extreme calorie restriction, fasting, or anything that could encourage under-eating. If it looks like they're under-eating, address it gently and steer toward balance.
- Don't suggest pushing through pain or training injured. Recommend rest and a professional whenever there's a real sign of injury or illness.
- Avoid specific medical or clinical advice — conditions, medications, supplements. Point them to a qualified professional for anything outside general fitness coaching.
- You can recommend gear and apparel if asked.
- If someone expresses anything suggesting disordered eating, compulsive training, or self-harm, respond with care, don't reinforce it, and encourage them to talk to a professional.
- Frame progress around performance, consistency, and how they feel — not weight or appearance, unless they raise it first.`;
}

export async function generateSessionSummary(
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<MemoryBullet[]> {
  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
    .join('\n');

  const json = await callAnthropicViaSupabase(
    `You are summarizing a coaching conversation for future reference. Extract only what matters for ongoing coaching: any goals the user mentioned, patterns or insights that came up, how the user described feeling physically or emotionally, and any decisions or intentions they expressed.

Return 3-5 concise bullet points as a JSON array. Each item has two fields:
- "text": the specific bullet point (avoid generic statements)
- "memoryType": either "persistent" (goals, injuries, preferences, long-term patterns) or "contextual" (mood, stress, weekly feelings, temporary states)

Return only the JSON array with no other text.`,
    [{ role: 'user', content: transcript }],
    400
  );

  const raw = (json.content?.[0]?.text as string) ?? '[]';
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned) as MemoryBullet[];
}

type PreviousMessage = { date: string; headline: string; body: string };

export async function getDailyCheckIn(
  recentData: DailySnapshot[],
  dailyNotes: DailyNote[] = [],
  previousMessages: PreviousMessage[] = [],
  activeGoals: Goal[] = []
): Promise<{ headline: string; body: string }> {
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
            const dayNote = dailyNotes.find(n => n.date === day.date);
            const notes = dayNote ? `Notes:\n  "${dayNote.content}"` : '';
            return `Date: ${day.date}\nExercise:\n${exercises}\nFood:\n${food}${notes ? `\n${notes}` : ''}`;
          })
          .join('\n\n');

  const previousContext =
    previousMessages.length > 0
      ? `\nYour previous daily check-in messages (for continuity — build on these, don't repeat them):\n${previousMessages
          .map((m) => `${m.date}: headline: "${m.headline}" — ${m.body}`)
          .join('\n')}\n`
      : '';

  const goalsContext =
    activeGoals.length > 0
      ? `\nUser's active goals:\n${activeGoals
          .map((g) => {
            const progress = g.targetValue > 0 ? Math.round((g.currentProgress / g.targetValue) * 100) : 0;
            const activityType = g.activityType ? ` (${g.activityType})` : '';
            return `  - "${g.title}"${activityType}: ${g.currentProgress}/${g.targetValue} ${g.targetPeriod} (${progress}% complete)`;
          })
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
    ? `You are a warm, supportive personal coach. The user hasn't logged any activity in ${daysSinceActive} days. Your job is to write a short re-engagement message shown at the top of their fitness tracking app.

Today's date is ${todayStr}.
${goalsContext}
How to write this:
- Be gentle and welcoming — life gets busy, and starting again is what matters. Don't dwell on the gap.
- Keep it forward-looking and low-pressure. The goal is to make one small step feel easy and inviting.
- One concrete, gentle suggestion for what to do today is more useful than general encouragement.
- If they have active goals, you can gently reference them as motivation, but keep it light and non-judgmental.
- No data to review, so don't invent any. Just write to the situation with warmth.
- No filler, no hollow cheerleading, no exclamation marks. Avoid "great job", "keep it up", "you've got this".

Respond with a valid JSON object and nothing else — no markdown, no explanation:
{"headline": "one warm sentence, max 10 words","body": "2–3 sentences"}`
    : `You are a warm, supportive personal coach writing a short daily check-in shown at the top of a fitness tracking app.

Today's date is ${todayStr}.

Here is the user's recent activity data:

${dataSection}
${previousContext}${goalsContext}
How to write this:
- Lead with the most meaningful observation from the data — frame it with curiosity and care, not criticism.
- When you notice patterns — a tough stretch, back-to-back sessions, low energy — acknowledge them with empathy before offering perspective.
- When feelings, daily notes, and training data intersect in an interesting way, point it out gently. The notes often reveal mental/emotional state — honor that.
- If the user has active goals, consider their progress naturally when it's relevant. Celebrate meaningful milestones, acknowledge when they're on track, or gently encourage if they've fallen behind — but don't make every check-in about goals.
- Every 3–4 days, end with a warm, open-ended question about something specific in the data — something worth reflecting on.
- Write with continuity — reference recent days naturally, like someone who genuinely cares and has been paying attention.
- No filler, no hollow cheerleading, no exclamation marks. Avoid "great job", "keep it up", "you've got this". Be warm and real, not performative.
- If nothing has been logged yet, keep it light and inviting — tell them what to log first.

Respond with a valid JSON object and nothing else — no markdown, no explanation:
{"headline": "one warm sentence, max 10 words, capturing the key observation","body": "2–4 sentences of the coaching message"}`;

  const json = await callAnthropicViaSupabase(
    system,
    [{ role: 'user', content: 'Generate my daily check-in.' }],
    300
  );

  const raw = (json.content?.[0]?.text as string) ?? '';
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned) as { headline: string; body: string };
  return parsed;
}

export async function sendChatMessage(
  userMessage: string,
  history: ConversationMessage[],
  recentData: DailySnapshot[],
  dailyNotes: DailyNote[] = [],
  memorySummaries: MemorySummary[] = []
): Promise<string> {
  const messages: ConversationMessage[] = [
    ...history,
    { role: 'user', content: userMessage },
  ];

  const json = await callAnthropicViaSupabase(
    buildSystemPrompt(recentData, dailyNotes, memorySummaries),
    messages,
    1024
  );

  return (json.content?.[0]?.text as string) ?? '';
}

export async function generatePostWorkoutMessage(
  session: MovementSession
): Promise<{ title: string; body: string } | null> {
  const details = session.workoutDetails?.length
    ? ` (${session.workoutDetails.map(w => `${w.name}${w.sets ? ` ${w.sets}x${w.reps}` : ''}${w.weight ? ` @ ${w.weight}lb` : ''}`).join(', ')})`
    : '';
  const feelings = session.feelings?.length ? ` — felt ${session.feelings.join(', ')}` : '';
  const note = session.note ? ` — "${session.note}"` : '';
  const sessionSummary = `${session.label}${details}${feelings}${note}`;

  try {
    const json = await callAnthropicViaSupabase(
      `You are a warm personal coach sending a short push notification to someone who just logged a workout. Write something brief, specific to what they did, and genuinely encouraging — not hollow or generic. No exclamation marks. No "great job" or "keep it up".

Respond with a valid JSON object only:
{"title": "5-7 words max", "body": "one sentence, specific to their session"}`,
      [{ role: 'user', content: `The user just logged: ${sessionSummary}` }],
      120
    );

    const raw = (json.content?.[0]?.text as string) ?? '';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as { title: string; body: string };
  } catch {
    return null;
  }
}

export async function generateDailyRecapMessage(
  todaySnapshot?: DailySnapshot
): Promise<{ title: string; body: string } | null> {
  const exerciseCount = todaySnapshot?.exercises.length ?? 0;
  const foodCount = todaySnapshot?.food.length ?? 0;

  const dataSummary = todaySnapshot
    ? `Today's activity:
Exercise: ${exerciseCount > 0 ? todaySnapshot.exercises.map(e => e.label).join(', ') : 'None logged'}
Food: ${foodCount > 0 ? `${foodCount} ${foodCount === 1 ? 'entry' : 'entries'} logged` : 'None logged'}`
    : 'No activity logged today.';

  try {
    const json = await callAnthropicViaSupabase(
      `You are a warm personal coach sending an 8PM daily recap notification. Focus on:
- What they accomplished today (if anything)
- Gently remind them to log anything they might have missed
- Keep it brief, warm, and actionable

${dataSummary}

If they logged activity: acknowledge it warmly and remind them to log anything missing.
If they logged nothing: gentle, non-judgmental reminder to log their day before bed.

No exclamation marks. No hollow cheerleading. Be warm and specific.

Respond with a valid JSON object only:
{"title": "4-6 words", "body": "1-2 sentences max"}`,
      [{ role: 'user', content: 'Generate the daily recap notification.' }],
      120
    );

    const raw = (json.content?.[0]?.text as string) ?? '';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as { title: string; body: string };
  } catch {
    return null;
  }
}
