import { motion } from 'framer-motion';
import { ExternalLink, Key, Globe } from 'lucide-react';

const ApiKeySetupGuide = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200"
    >
      <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
        <Key className="w-5 h-5 mr-2" />
        API Key Setup Guide
      </h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-blue-800 mb-2">GitHub Models (Recommended)</h4>
          <p className="text-sm text-blue-700 mb-2">
            Get free access to OpenAI models through GitHub:
          </p>
          <ol className="text-sm text-blue-600 space-y-1 ml-4">
            <li>1. Visit GitHub Models marketplace</li>
            <li>2. Sign in with your GitHub account</li>
            <li>3. Generate an API key</li>
            <li>4. Copy and paste it above</li>
          </ol>
          <a
            href="https://github.com/marketplace/models"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mt-2"
          >
            Get GitHub API Key <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>

        <div>
          <h4 className="font-medium text-blue-800 mb-2">OpenRouter</h4>
          <p className="text-sm text-blue-700 mb-2">
            Access multiple AI providers through one API:
          </p>
          <ol className="text-sm text-blue-600 space-y-1 ml-4">
            <li>1. Create account at OpenRouter</li>
            <li>2. Add credit to your account</li>
            <li>3. Generate an API key</li>
            <li>4. Copy and paste it above</li>
          </ol>
          <a
            href="https://openrouter.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mt-2"
          >
            Get OpenRouter API Key <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>

        <div className="bg-blue-100 rounded-lg p-3 mt-4">
          <div className="flex items-center text-blue-800">
            <Globe className="w-4 h-4 mr-2" />
            <span className="font-medium text-sm">Webapp Keys</span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            If available, webapp keys let you use the service without setting up your own API keys.
            The administrator has pre-configured these for your convenience.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ApiKeySetupGuide;
