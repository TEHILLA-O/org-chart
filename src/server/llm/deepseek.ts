import { config } from '@/lib/config';

export function isDeepSeekConfigured() {
  return Boolean(config().DEEPSEEK_API_KEY);
}

export async function completeOrgChat(input: {
  question: string;
  facts: string;
}): Promise<{ answer: string; model: string }> {
  const cfg = config();
  const key = cfg.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error('No DeepSeek key is configured.');
  }

  const response = await fetch(`${cfg.DEEPSEEK_API_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are Opply ochart, an organisational chart assistant. Answer only from the supplied organisation facts. Do not invent people, salaries, or unstated reporting lines. If the facts are insufficient, say so.',
        },
        {
          role: 'user',
          content: `Organisation facts:\n${input.facts}\n\nQuestion:\n${input.question}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed (${response.status}).`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  const answer = body.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    throw new Error('DeepSeek returned an empty answer.');
  }
  return { answer, model: body.model ?? 'deepseek-chat' };
}
