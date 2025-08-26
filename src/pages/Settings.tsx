import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  User, 
  Brain, 
  Key, 
  Database,
  Save,
  Shield,
  Globe,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { useFileStore } from '../stores/fileStore';
import { useAuthStore } from '../stores/authStore';
import ApiKeySetupGuide from '../components/Settings/ApiKeySetupGuide';
import { ExternalMemoryCreation } from '../components/Settings/ExternalMemoryCreation';
import SecuritySettings from '../components/Security/SecuritySettings';

const Settings = () => {
  const { user } = useAuthStore();
  const { settings, loading, fetchSettings, updateSettings, canUseWebappKeys } = useSettingsStore();
  const { storageUsed, storageLimit } = useFileStore();
  
  const [formData, setFormData] = useState({
    ai_provider: 'github' as 'github' | 'openrouter',
    selected_model: 'openai/text-embedding-3-large', // Fixed default embedding model
    answer_model: '' as string,
    api_key_mode: 'user' as 'user' | 'webapp',
    github_api_key: '',
    openrouter_api_key: '',
  });

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setFormData({
        ai_provider: settings.ai_provider || 'github',
        selected_model: 'openai/text-embedding-3-large', // Always use default embedding model
        answer_model: settings.answer_model || (settings.ai_provider === 'github' ? 'gpt-4o-mini' : 'openai/gpt-3.5-turbo'),
        api_key_mode: settings.api_key_mode || 'user',
        github_api_key: settings.github_api_key || '',
        openrouter_api_key: settings.openrouter_api_key || '',
      });
    }
  }, [settings]);

  const handleProviderChange = (provider: 'github' | 'openrouter') => {
    setFormData(prev => ({
      ...prev,
      ai_provider: provider,
      selected_model: 'openai/text-embedding-3-large', // Always use default embedding model
      answer_model: provider === 'github' ? 'gpt-4o-mini' : 'openai/gpt-3.5-turbo',
    }));
  };

  const handleKeyModeChange = (mode: 'user' | 'webapp') => {
    setFormData(prev => ({
      ...prev,
      api_key_mode: mode,
    }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(formData);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const storagePercentage = (storageUsed / storageLimit) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center lg:text-left">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 lg:mb-6 shadow-lg"
        >
          <SettingsIcon className="w-8 h-8 text-white" />
        </motion.div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent mb-3">Settings</h1>
        <p className="text-lg text-slate-600">Manage your account and AI preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-8">
          {/* Account Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card-medium rounded-2xl p-8 border border-white/20 backdrop-blur-sm"
          >
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl mr-4 shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Account Information</h3>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 border border-white/20 rounded-xl bg-slate-50/50 text-slate-700 font-medium transition-colors backdrop-blur-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  User ID
                </label>
                <input
                  type="text"
                  value={user?.id || ''}
                  disabled
                  className="w-full px-4 py-3 border border-white/20 rounded-xl bg-slate-50/50 text-slate-700 font-mono text-sm transition-colors backdrop-blur-sm"
                />
              </div>
            </div>
          </motion.div>

          {/* AI Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card-medium rounded-2xl p-8 border border-white/20 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl mr-4 shadow-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">AI Configuration</h3>
              </div>
              <button
                onClick={() => window.open('https://docs.github.com/en/github-models', '_blank')}
                className="text-xs text-slate-600 hover:text-indigo-600 flex items-center transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-indigo-100/50 backdrop-blur-sm"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help & Docs
              </button>
            </div>
            
            <div className="space-y-8">
              {/* API Key Mode Selection */}
              <div className="glass-card-strong rounded-xl p-6 border border-white/30 backdrop-blur-md">
                <label className="block text-sm font-bold text-slate-800 mb-4">
                  🔑 API Key Source
                </label>
                <div className="grid grid-cols-1 gap-4">
                  <label className="relative">
                    <input
                      type="radio"
                      name="api_key_mode"
                      value="user"
                      checked={formData.api_key_mode === 'user'}
                      onChange={() => handleKeyModeChange('user')}
                      className="sr-only"
                    />
                    <div className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 backdrop-blur-sm ${
                      formData.api_key_mode === 'user'
                        ? 'border-indigo-400 bg-indigo-100/50 shadow-lg transform scale-[1.02] ring-2 ring-indigo-300/50'
                        : 'border-white/30 hover:border-indigo-300/50 hover:shadow-md bg-white/20'
                    }`}>
                      <div className="flex items-center">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg mr-4 shadow-lg">
                          <Key className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">Use My Own API Keys</div>
                          <div className="text-sm text-slate-600 mt-1">Provide your own API keys for full control</div>
                        </div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="relative">
                    <input
                      type="radio"
                      name="api_key_mode"
                      value="webapp"
                      checked={formData.api_key_mode === 'webapp'}
                      onChange={() => handleKeyModeChange('webapp')}
                      className="sr-only"
                    />
                    <div className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 backdrop-blur-sm ${
                      formData.api_key_mode === 'webapp'
                        ? 'border-emerald-400 bg-emerald-100/50 shadow-lg transform scale-[1.02] ring-2 ring-emerald-300/50'
                        : 'border-white/30 hover:border-emerald-300/50 hover:shadow-md bg-white/20'
                    }`}>
                      <div className="flex items-center">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg mr-4 shadow-lg">
                          <Globe className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">Use Webapp Keys</div>
                          <div className="text-sm text-slate-600 mt-1">
                            Use pre-configured webapp API keys (no setup required)
                          </div>
                          <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-2">
                            <span className="font-medium">Available:</span>
                            {canUseWebappKeys().github && <span className="bg-emerald-100/70 text-emerald-700 px-2 py-1 rounded-full backdrop-blur-sm">GitHub</span>}
                            {canUseWebappKeys().openrouter && <span className="bg-emerald-100/70 text-emerald-700 px-2 py-1 rounded-full backdrop-blur-sm">OpenRouter</span>}
                            {!canUseWebappKeys().github && !canUseWebappKeys().openrouter && 
                              <span className="bg-red-100/70 text-red-700 px-2 py-1 rounded-full backdrop-blur-sm">None configured</span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Provider Selection */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <label className="block text-sm font-bold text-gray-800 mb-4">
                  🤖 AI Provider
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="relative">
                    <input
                      type="radio"
                      name="provider"
                      value="github"
                      checked={formData.ai_provider === 'github'}
                      onChange={() => handleProviderChange('github')}
                      disabled={formData.api_key_mode === 'webapp' && !canUseWebappKeys().github}
                      className="sr-only"
                    />
                    <div className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      formData.ai_provider === 'github'
                        ? 'border-indigo-400 bg-indigo-100/50 shadow-lg transform scale-[1.02] ring-2 ring-indigo-300/50'
                        : 'border-white/30 hover:border-indigo-300/50 hover:shadow-md bg-white/20'
                    } ${formData.api_key_mode === 'webapp' && !canUseWebappKeys().github 
                        ? 'opacity-50 cursor-not-allowed' : ''
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg mr-3 shadow-lg">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">GitHub Models</div>
                            <div className="text-sm text-slate-600">OpenAI models via GitHub</div>
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-1">
                              <span className="bg-emerald-100/70 text-emerald-700 px-2 py-1 rounded-full backdrop-blur-sm">✓ Free</span>
                              <span className="bg-indigo-100/70 text-indigo-700 px-2 py-1 rounded-full backdrop-blur-sm">✓ High-quality</span>
                              <span className="bg-purple-100/70 text-purple-700 px-2 py-1 rounded-full backdrop-blur-sm">✓ Easy setup</span>
                            </div>
                          </div>
                        </div>
                        {formData.ai_provider === 'github' && (
                          <span className="text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1 rounded-full font-medium shadow-lg">Selected</span>
                        )}
                      </div>
                      {formData.api_key_mode === 'webapp' && !canUseWebappKeys().github && (
                        <div className="text-xs text-red-600 mt-2 flex items-center">
                          <span className="w-1 h-1 bg-red-500 rounded-full mr-1"></span>
                          Webapp key not available
                        </div>
                      )}
                    </div>
                  </label>
                  
                  <label className="relative">
                    <input
                      type="radio"
                      name="provider"
                      value="openrouter"
                      checked={formData.ai_provider === 'openrouter'}
                      onChange={() => handleProviderChange('openrouter')}
                      disabled={formData.api_key_mode === 'webapp' && !canUseWebappKeys().openrouter}
                      className="sr-only"
                    />
                    <div className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 backdrop-blur-sm ${
                      formData.ai_provider === 'openrouter'
                        ? 'border-orange-400 bg-orange-100/50 shadow-lg transform scale-[1.02] ring-2 ring-orange-300/50'
                        : 'border-white/30 hover:border-orange-300/50 hover:shadow-md bg-white/20'
                    } ${formData.api_key_mode === 'webapp' && !canUseWebappKeys().openrouter 
                        ? 'opacity-50 cursor-not-allowed' : ''
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg mr-3 shadow-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">OpenRouter</div>
                            <div className="text-sm text-slate-600">Multiple AI providers</div>
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-1">
                              <span className="bg-purple-100/70 text-purple-700 px-2 py-1 rounded-full backdrop-blur-sm">✓ 50+ models</span>
                              <span className="bg-orange-100/70 text-orange-700 px-2 py-1 rounded-full backdrop-blur-sm">✓ Multi-provider</span>
                              <span className="bg-emerald-100/70 text-emerald-700 px-2 py-1 rounded-full backdrop-blur-sm">✓ Pay-per-use</span>
                            </div>
                          </div>
                        </div>
                        {formData.ai_provider === 'openrouter' && (
                          <span className="text-xs bg-orange-500 text-white px-3 py-1 rounded-full font-medium">Selected</span>
                        )}
                      </div>
                      {formData.api_key_mode === 'webapp' && !canUseWebappKeys().openrouter && (
                        <div className="text-xs text-red-600 mt-2 flex items-center">
                          <span className="w-1 h-1 bg-red-500 rounded-full mr-1"></span>
                          Webapp key not available
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* API Keys - Only show if user mode is selected */}
              {formData.api_key_mode === 'user' && (
                <div className="space-y-4">
                  {formData.ai_provider === 'github' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          GitHub Models API Key
                        </label>
                        <button
                          onClick={() => window.open('https://github.com/settings/tokens', '_blank')}
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          Get API Key →
                        </button>
                      </div>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="password"
                          value={formData.github_api_key}
                          onChange={(e) => setFormData(prev => ({ ...prev, github_api_key: e.target.value }))}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Create a personal access token with "model" scope
                      </p>
                    </div>
                  )}

                  {formData.ai_provider === 'openrouter' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          OpenRouter API Key
                        </label>
                        <button
                          onClick={() => window.open('https://openrouter.ai/keys', '_blank')}
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          Get API Key →
                        </button>
                      </div>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="password"
                          value={formData.openrouter_api_key}
                          onChange={(e) => setFormData(prev => ({ ...prev, openrouter_api_key: e.target.value }))}
                          placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Get your API key from OpenRouter dashboard
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Webapp Keys Info */}
              {formData.api_key_mode === 'webapp' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <div className="font-medium text-green-900">Using Webapp API Keys</div>
                      <div className="text-sm text-green-700 mt-1">
                        You're using pre-configured API keys. No additional setup required!
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Answer Model Selection */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    💬 AI Chat Model
                  </label>
                  <p className="text-xs text-gray-600">
                    Used for generating intelligent responses to search queries
                  </p>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    value={formData.answer_model}
                    onChange={(e) => setFormData(prev => ({ ...prev, answer_model: e.target.value }))}
                    placeholder="e.g., gpt-4o-mini, openai/gpt-4o-mini, anthropic/claude-3-sonnet"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-400 transition-all duration-200"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Enter the model name as it appears on your provider's documentation
                  </p>
                </div>
                
                {/* Answer Model Performance Info */}
                {formData.answer_model && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center text-green-800">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      <span className="text-sm font-medium">Answer Generation Settings</span>
                    </div>
                    <div className="text-xs text-green-700 mt-1">
                      • Chat Model: {formData.answer_model}<br/>
                      • Provider: {formData.ai_provider === 'github' ? 'GitHub Models' : 'OpenRouter'}<br/>
                      • Embedding: Always GitHub Models (openai/text-embedding-3-large)<br/>
                      • Use case: Search result summarization and question answering
                    </div>
                  </div>
                )}
              </div>

              {/* Model Reference Guide */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <svg className="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Chat Model Reference Guide</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="font-medium text-gray-600 mb-1">GitHub Models (Examples):</div>
                    <div className="space-y-1 text-gray-500">
                      <div>• gpt-4o-mini (recommended)</div>
                      <div>• gpt-4o (premium)</div>
                      <div>• gpt-3.5-turbo (budget)</div>
                      <div>• gpt-4 (legacy)</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-600 mb-1">OpenRouter (Examples):</div>
                    <div className="space-y-1 text-gray-500">
                      <div>• openai/gpt-4o-mini</div>
                      <div>• anthropic/claude-3-sonnet</div>
                      <div>• meta-llama/llama-3-8b-instruct</div>
                      <div>• google/gemini-pro</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-xs text-blue-700">
                    <div className="font-medium mb-1">� System Configuration:</div>
                    • Embedding model: <code className="bg-blue-100 px-1 rounded">openai/text-embedding-3-large</code> (always GitHub Models)<br/>
                    • Chat model: User configurable (based on selected provider)<br/>
                    • This ensures optimal search performance with consistent embeddings
                  </div>
                </div>
                
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="text-xs text-gray-500">
                    💡 Visit{' '}
                    <button
                      onClick={() => window.open('https://github.com/marketplace/models', '_blank')}
                      className="text-indigo-600 hover:text-indigo-700 underline"
                    >
                      GitHub Models
                    </button>
                    {' '}or{' '}
                    <button
                      onClick={() => window.open('https://openrouter.ai/models', '_blank')}
                      className="text-indigo-600 hover:text-indigo-700 underline"
                    >
                      OpenRouter Models
                    </button>
                    {' '}for complete model lists
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {!formData.answer_model && (
                      <span className="text-amber-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        Please enter a chat model name
                      </span>
                    )}
                    {formData.api_key_mode === 'user' && (
                      (formData.ai_provider === 'github' && !formData.github_api_key) ||
                      (formData.ai_provider === 'openrouter' && !formData.openrouter_api_key)
                    ) && (
                      <span className="text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3c4.418 0 8 3.582 8 8s-3.582 8-8 8-8-3.582-8-8 3.582-8 8-8z" />
                        </svg>
                        API key required
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={loading || !formData.answer_model || (
                      formData.api_key_mode === 'user' && (
                        (formData.ai_provider === 'github' && !formData.github_api_key) ||
                        (formData.ai_provider === 'openrouter' && !formData.openrouter_api_key)
                      )
                    )}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg hover:shadow-xl font-medium backdrop-blur-sm"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {loading ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Telegram Integration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card-medium rounded-2xl p-8 border border-white/20 backdrop-blur-sm"
          >
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl mr-4 shadow-lg">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">External Memory Creation</h3>
            </div>
            
            <ExternalMemoryCreation />
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Storage Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card-medium rounded-2xl p-6 border border-white/20 backdrop-blur-sm"
          >
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl mr-3 shadow-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Storage</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Used</span>
                  <span className="text-sm font-medium text-slate-800">
                    {Math.round((storageUsed / (1024 * 1024)) * 10) / 10}MB / 100MB
                  </span>
                </div>
                <div className="w-full bg-slate-200/50 rounded-full h-3 shadow-inner backdrop-blur-sm">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      storagePercentage > 90 ? 'bg-gradient-to-r from-red-400 to-red-600' : 
                      storagePercentage > 70 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                    }`}
                    style={{ width: `${storagePercentage}%` }}
                  />
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                <div>• Max file size: 10MB</div>
                <div>• Supported: Images, Videos</div>
                <div>• Total limit: 100MB</div>
              </div>
            </div>
          </motion.div>

          {/* Security Settings */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SecuritySettings />
          </motion.div>

          {/* API Setup Guide */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ApiKeySetupGuide />
          </motion.div>

          {/* App Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card-strong rounded-2xl p-6 border border-white/30 backdrop-blur-md"
          >
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mr-3 shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">MemoryVault</h3>
            </div>
            
            <div className="space-y-2 text-sm text-slate-700">
              <div className="font-medium">Version: 2.0.0</div>
              <div>AI-powered memory management</div>
              <div>Built with React & Supabase</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;