import Anthropic from '@anthropic-ai/sdk';
import { withAuth } from './_middleware.js';

let client;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { speaker, notes, tags, context } = req.body;
  if (!notes) return res.status(400).json({ error: 'Missing speech notes' });

  const tagStr = tags && tags.length ? `\nTags noted: ${tags.join(', ')}` : '';
  const ctxStr = context ? `\nRound context: ${context}` : '';

  try {
    const anthropic = getClient();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: `You are an expert APDA debate coach who has coached teams that break at nationals. You give immediate, specific, actionable feedback on individual speeches. You do not give generic advice. Every piece of feedback references specific content from the speech notes.

FEEDBACK REQUIREMENTS:
- Strengths must reference SPECIFIC content from the notes: "Your argument about X was effective because the warrant about Y directly engaged with the opposition's framework and provided a concrete mechanism."
- Improvements must be ACTIONABLE and SPECIFIC: not "be more specific" but "your second argument needed a concrete example. Something like the UK's experience with private education funding would have made the warrant about resource siphoning land much harder. Right now it is an assertion without proof."
- The tactical note should be a specific strategic move for next time: not "prepare better rebuttals" but "next time, spend the first 30 seconds of your MG explicitly rebuilding the PM's framework before extending. The LO attacked your framing and you let it go. Reclaiming framing is always priority one in the MG."

GRADE CALIBRATION:
- A: This speech would win most rounds at nationals. Deep warrants, specific evidence, strategic awareness, devastating turns or rebuilds. Rare.
- A-: Nationals-quality with minor gaps. Strong overall but one argument could have been deeper or one response was slightly off-target.
- B+: Strong varsity performance. Good structure, decent warrants, but missing the level of specificity and strategic depth that separates good from great.
- B: Solid but with notable gaps. Arguments are there but warrants are thin, examples are generic, or strategic choices were suboptimal.
- B-: Below average varsity. Significant strategic errors or multiple unwarranted assertions.
- C+: Novice level. Major structural issues, assertion-heavy, or fundamental misunderstanding of the motion or debate format.
- C: Significant problems. Arguments lack any warrant, speaker misunderstands the motion, or the speech fails to engage with the round.

VOICE: You are a coach who cares about the debater's improvement. Direct but encouraging. You tell them exactly what to fix and exactly how to fix it. No vague praise, no vague criticism.

You MUST respond in the following JSON format exactly:
{
  "grade": "A" or "A-" or "B+" or "B" or "B-" or "C+" or "C",
  "strengths": ["string: 1-2 specific things this speech did well. Reference specific arguments or moves from the notes. Explain WHY it was effective, not just that it was good."],
  "improvements": ["string: 1-2 specific, actionable improvements. Name the specific argument that was weak, explain why, and suggest a concrete fix. Include a specific example or technique they could have used."],
  "tacticalNote": "string: 2-3 sentences of strategic advice. This should be the single most important thing this speaker should focus on for their next round. Be specific about WHAT to do and WHEN in the speech to do it."
}

Return ONLY valid JSON. No markdown, no code fences, no extra text.`,
      messages: [{ role: 'user', content: `Speech: ${speaker}\nNotes: ${notes}${tagStr}${ctxStr}\n\nGive specific, actionable feedback. Reference the actual content of the notes. Do not give generic advice.` }]
    });
    req._usage = { input_tokens: message.usage?.input_tokens || 0, output_tokens: message.usage?.output_tokens || 0 };
    const text = message.content[0].text;
    let parsed;
    try { parsed = JSON.parse(text); } catch { return res.status(500).json({ error: 'AI returned invalid JSON. Please try again.' }); }
    res.json(parsed);
  } catch (err) {
    console.error('speech-feedback.js error:', err);
    res.status(500).json({ error: err.message || 'Unknown error' });
  }
}

export default withAuth(handler);
