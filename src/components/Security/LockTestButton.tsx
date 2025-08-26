import React from 'react';
import { useSecurityStore } from '../../stores/securityStore';
import { Lock } from 'lucide-react';

const LockTestButton: React.FC = () => {
  const { lockState, lockVault } = useSecurityStore();

  const handleTestLock = () => {
    console.log('🧪 Test Lock Button: Current lock state before:', lockState);
    lockVault('manual');
    
    // Check state after a brief delay
    setTimeout(() => {
      console.log('🧪 Test Lock Button: Lock state after 100ms:', lockState);
    }, 100);
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
      <h3 className="font-semibold text-yellow-800 mb-2">🧪 Lock Test</h3>
      <p className="text-sm text-yellow-700 mb-3">
        Current State: {lockState.isLocked ? '🔒 Locked' : '🔓 Unlocked'}
        {lockState.lockReason && ` (${lockState.lockReason})`}
      </p>
      <button
        onClick={handleTestLock}
        className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
      >
        <Lock className="w-4 h-4" />
        <span>Test Lock</span>
      </button>
    </div>
  );
};

export default LockTestButton;