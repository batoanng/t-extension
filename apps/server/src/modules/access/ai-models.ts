export const aiModelProviders = [
  {
    id: 'openai',
    label: 'OpenAI',
    models: [
      {
        id: 'gpt-5.5',
        label: 'GPT 5.5',
      },
      {
        id: 'gpt-5.4',
        label: 'GPT 5.4',
      },
      {
        id: 'gpt-5.4-mini',
        label: 'GPT 5.4 Mini',
      },
    ],
  },
  {
    id: 'claude',
    label: 'Claude',
    models: [
      {
        id: 'claude-opus-4.7',
        label: 'Claude Opus 4.7',
      },
      {
        id: 'claude-sonnet-4.6',
        label: 'Claude Sonnet 4.6',
      },
      {
        id: 'claude-haiku-4.5',
        label: 'Claude Haiku 4.5',
      },
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    models: [
      {
        id: 'deepseek-v4-flash',
        label: 'DeepSeek V4 Flash',
      },
      {
        id: 'deepseek-v4-pro',
        label: 'DeepSeek V4 Pro',
      },
    ],
  },
  {
    id: 'gemini',
    label: 'Gemini',
    models: [
      {
        id: 'gemini-2.5-pro',
        label: 'Gemini 2.5 Pro',
      },
      {
        id: 'gemini-3-flash',
        label: 'Gemini 3 Flash',
      },
      {
        id: 'gemini-3.1-pro',
        label: 'Gemini 3.1 Pro',
      },
    ],
  },
] as const;

export type AiModelProviderId = (typeof aiModelProviders)[number]['id'];
