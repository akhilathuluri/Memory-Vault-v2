import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Memory } from '../types';
import { MemoryExpirationService } from '../services/memoryExpirationService';

interface MemoryExpirationBadgeProps {
  memory: Memory;
  className?: string;
}

export const MemoryExpirationBadge: React.FC<MemoryExpirationBadgeProps> = ({
  memory,
  className = ''
}) => {
  const expirationService = MemoryExpirationService.getInstance();
  const status = expirationService.getExpirationStatus(memory);

  if (!status.isExpiring) {
    return null;
  }

  const isUrgent = status.timeRemaining && (
    status.timeRemaining.includes('m') && !status.timeRemaining.includes('h') && !status.timeRemaining.includes('d')
  );

  const isExpired = status.isExpired;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm ${
      isExpired
        ? 'bg-red-100/80 text-red-700 border border-red-200'
        : isUrgent
        ? 'bg-orange-100/80 text-orange-700 border border-orange-200'
        : 'bg-yellow-100/80 text-yellow-700 border border-yellow-200'
    } ${className}`}>
      {isExpired ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <Clock className="w-3 h-3" />
      )}
      <span>
        {isExpired ? 'Expired' : `${status.timeRemaining} left`}
      </span>
    </div>
  );
};