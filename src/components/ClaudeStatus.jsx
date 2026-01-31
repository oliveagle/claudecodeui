import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '../lib/utils';

/**
 * Enhanced Claude Status Component
 * Shows real-time processing status with token usage and current activity
 *
 * Features:
 * - Real token usage from API (input/output/cache)
 * - Current tool/action display
 * - Smart status inference (thinking, using_tool, waiting, etc.)
 * - Progress indication for long operations
 */
function ClaudeStatus({
  status,
  onAbort,
  isLoading,
  provider = 'claude',
  tokenBudget = null,
  currentTool = null,
  messageCount = 0
}) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  // Update elapsed time every second
  useEffect(() => {
    if (!isLoading) {
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading]);

  // Track last activity for "waiting API" detection
  useEffect(() => {
    if (tokenBudget || currentTool) {
      setLastActivityTime(Date.now());
    }
  }, [tokenBudget, currentTool]);

  // Animate the status indicator
  useEffect(() => {
    if (!isLoading) return;

    const timer = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(timer);
  }, [isLoading]);

  // Smart status detection - MUST be before any conditional return
  const getStatusInfo = useMemo(() => {
    if (!isLoading) {
      return { text: '', icon: '✻', color: 'blue' };
    }

    // Priority 1: Explicit status from parent
    if (status?.text) {
      return {
        text: status.text,
        icon: status.icon || '✻',
        color: status.color || 'blue'
      };
    }

    // Priority 2: Waiting for user permission
    if (status?.text === 'Waiting for permission') {
      return {
        text: 'Waiting for you',
        icon: '⏸️',
        color: 'yellow'
      };
    }

    // Priority 3: Current tool being used
    if (currentTool) {
      const toolName = currentTool.name || currentTool.toolName || 'Tool';
      const shortInput = currentTool.input
        ? JSON.stringify(currentTool.input).slice(0, 40).replace(/["{}]/g, '')
        : '';
      const displayInput = shortInput.length > 30 ? shortInput.slice(0, 30) + '...' : shortInput;

      return {
        text: displayInput ? `${toolName}: ${displayInput}` : `Using ${toolName}`,
        icon: '🔧',
        color: 'purple'
      };
    }

    // Priority 4: API waiting detection (no activity for >8s)
    const timeSinceActivity = Date.now() - lastActivityTime;
    if (timeSinceActivity > 8000 && elapsedTime > 10) {
      return {
        text: 'Waiting for response...',
        icon: '⏳',
        color: 'orange'
      };
    }

    // Priority 5: First few seconds - show provider-specific message
    if (elapsedTime < 3) {
      const providerNames = {
        claude: 'Claude',
        cursor: 'Cursor',
        codex: 'Codex'
      };
      return {
        text: `${providerNames[provider] || provider} is thinking`,
        icon: '💭',
        color: 'blue'
      };
    }

    // Default: Rotating action words with context
    const actionWords = [
      'Thinking',
      'Processing',
      'Analyzing',
      elapsedTime > 20 ? 'Still working' : 'Working',
      elapsedTime > 30 ? 'Almost there' : 'Computing'
    ];
    const actionIndex = Math.floor(elapsedTime / 4) % actionWords.length;

    return {
      text: actionWords[actionIndex],
      icon: '✻',
      color: 'blue'
    };
  }, [status, currentTool, elapsedTime, lastActivityTime, provider, isLoading]);

  // Get real token stats - MUST be before any conditional return
  const getTokenStats = useMemo(() => {
    if (!tokenBudget) return null;

    // If we have detailed breakdown from tokenBudget
    if (tokenBudget.inputTokens !== undefined || tokenBudget.outputTokens !== undefined) {
      return {
        input: tokenBudget.inputTokens || tokenBudget.input || 0,
        output: tokenBudget.outputTokens || tokenBudget.output || 0,
        cache: tokenBudget.cacheReadTokens || tokenBudget.cache || 0,
        total: tokenBudget.used || tokenBudget.total || 0
      };
    }

    // Simple used/total format
    return {
      total: tokenBudget.used || 0,
      limit: tokenBudget.total || 160000
    };
  }, [tokenBudget]);

  // Don't show if loading is false - AFTER all hooks
  if (!isLoading) return null;

  // Format token numbers
  const formatTokens = (num) => {
    if (!num || num === 0) return '0';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  // Animation characters
  const spinners = ['✻', '✹', '✸', '✶'];
  const currentSpinner = getStatusInfo.icon === '✻'
    ? spinners[animationPhase]
    : getStatusInfo.icon;

  // Color mapping
  const colorClasses = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    yellow: 'text-yellow-400',
    green: 'text-green-400'
  };
  const spinnerColor = colorClasses[getStatusInfo.color] || colorClasses.blue;

  const canInterrupt = status?.can_interrupt !== false;

  return (
    <div className="w-full mb-3 sm:mb-6 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between max-w-4xl mx-auto bg-gray-800 dark:bg-gray-900 text-white rounded-lg shadow-lg px-2.5 py-2 sm:px-4 sm:py-3 border border-gray-700 dark:border-gray-800">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Animated spinner or icon */}
            <span className={cn(
              "text-base sm:text-xl transition-all duration-500 flex-shrink-0",
              animationPhase % 2 === 0 ? `${spinnerColor} scale-110` : spinnerColor.replace('400', '300')
            )}>
              {currentSpinner}
            </span>

            {/* Status text - compact for mobile */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-medium text-xs sm:text-sm truncate max-w-[200px] sm:max-w-[300px]">
                  {getStatusInfo.text}
                </span>
                <span className="text-gray-400 text-xs sm:text-sm flex-shrink-0">({elapsedTime}s)</span>

                {/* Token stats - show if available */}
                {getTokenStats && (
                  <>
                    <span className="text-gray-500 hidden sm:inline">·</span>
                    <span className="text-gray-300 text-xs sm:text-sm flex-shrink-0 hidden sm:inline" title="Input / Output tokens">
                      ⚡ {formatTokens(getTokenStats.input || getTokenStats.total)}
                      {getTokenStats.output > 0 && ` / ${formatTokens(getTokenStats.output)}`}
                    </span>
                  </>
                )}

                <span className="text-gray-500 hidden md:inline">·</span>
                <span className="text-gray-400 text-xs hidden md:inline">esc to stop</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interrupt button */}
        {canInterrupt && onAbort && (
          <button
            onClick={onAbort}
            className="ml-2 sm:ml-3 text-xs bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-md transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0 font-medium"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">Stop</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default ClaudeStatus;
