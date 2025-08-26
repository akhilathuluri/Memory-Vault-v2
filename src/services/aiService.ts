import { useSettingsStore } from '../stores/settingsStore';

// Get the appropriate API key based on user's key mode preference
const getApiKey = (settings: any, provider: 'github' | 'openrouter'): string => {
  if (settings.api_key_mode === 'webapp') {
    // Use webapp keys from environment
    if (provider === 'github') {
      const webappKey = import.meta.env.VITE_WEBAPP_GITHUB_API_KEY;
      if (!webappKey || webappKey === 'your_webapp_github_api_key_here') {
        throw new Error('Webapp GitHub API key not configured. Please contact the administrator.');
      }
      return webappKey;
    } else {
      const webappKey = import.meta.env.VITE_WEBAPP_OPENROUTER_API_KEY;
      if (!webappKey || webappKey === 'your_webapp_openrouter_api_key_here') {
        throw new Error('Webapp OpenRouter API key not configured. Please contact the administrator.');
      }
      return webappKey;
    }
  } else {
    // Use user's own keys
    if (provider === 'github') {
      if (!settings.github_api_key) {
        throw new Error('GitHub API key not configured. Please go to Settings and enter your GitHub Models API key or switch to webapp keys.');
      }
      return settings.github_api_key;
    } else {
      if (!settings.openrouter_api_key) {
        throw new Error('OpenRouter API key not configured. Please go to Settings and enter your OpenRouter API key or switch to webapp keys.');
      }
      return settings.openrouter_api_key;
    }
  }
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
  const settings = useSettingsStore.getState().settings;
  
  if (!settings) {
    throw new Error('AI settings not configured. Please go to Settings and configure your AI provider.');
  }

  // Always use GitHub Models for embeddings, regardless of the selected provider for chat
  const apiKey = getApiKey(settings, 'github');
  return generateGitHubEmbedding(text, apiKey);
};

const generateGitHubEmbedding = async (text: string, apiKey: string): Promise<number[]> => {
  const response = await fetch('https://models.github.ai/inference/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/text-embedding-3-large',
      input: text,
      dimensions: 1536,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate GitHub embedding: ${response.status} ${response.statusText}. ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
};

// Generate AI-powered answer from search results
export const generateAnswer = async (prompt: string, contextItems: any[] = []): Promise<string> => {
  console.log('🤖 AI Service: generateAnswer called with prompt length:', prompt.length);
  
  const { settings } = useSettingsStore.getState();
  
  if (!settings) {
    console.error('🤖 AI Service: No settings found');
    return '';
  }

  console.log('🤖 AI Service: Settings found, api_key_mode:', settings.api_key_mode);

  try {
    const apiKey = getApiKey(settings, settings.ai_provider);
    console.log('🤖 AI Service: Got API key, length:', apiKey.length);

    if (settings.ai_provider === 'github') {
      const answerModel = settings.answer_model || 'gpt-4o-mini';
      console.log('🤖 AI Service: Using GitHub API with model:', answerModel);
      return await generateGitHubAnswer(prompt, apiKey, answerModel);
    } else {
      const answerModel = settings.answer_model || 'openai/gpt-3.5-turbo';
      console.log('🤖 AI Service: Using OpenRouter API with model:', answerModel);
      return await generateOpenRouterAnswer(prompt, apiKey, answerModel);
    }
  } catch (error) {
    console.error('🤖 AI Service: Error generating answer:', error);
    return '';
  }
};

const generateGitHubAnswer = async (prompt: string, apiKey: string, model: string = 'gpt-4o-mini'): Promise<string> => {
  console.log('🤖 GitHub API: Making request with model:', model);
  
  const response = await fetch('https://models.github.ai/inference/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    }),
  });

  console.log('🤖 GitHub API: Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('🤖 GitHub API: Error response:', errorText);
    throw new Error(`GitHub API failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('🤖 GitHub API: Response data:', data);
  
  const content = data.choices?.[0]?.message?.content;
  console.log('🤖 GitHub API: Extracted content:', content ? content.substring(0, 100) + '...' : 'NULL');
  
  return content || '';
};

const generateOpenRouterAnswer = async (prompt: string, apiKey: string, model: string): Promise<string> => {
  // Use the specified model directly (no fallback logic needed since we're passing the answer model)
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate answer');
  }

  const data = await response.json();
  return data.choices[0].message.content;
};