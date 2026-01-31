# Processing Status Enhancement

## Overview
Improve the Processing indicator in chat mode to provide more visibility into what the agent is doing, reducing user anxiety during long-running operations.

## Problem
The current Processing indicator only shows:
- A timer counting seconds
- Simulated/fake token count
- Generic rotating text ("Thinking...", "Processing...")

Users don't know:
- Is the agent stuck or actually working?
- What tool is currently being used?
- How many tokens have been consumed?
- Is it waiting for API response or executing code?

---

## Solution A: Lightweight Enhancement (Implemented)

### Features
1. **Real Token Usage Display**
   - Shows actual input/output tokens from API
   - Format: `⚡ 12.3k↑ 4.5k↓` (input/output)
   - Falls back to `used/limit` format if detailed breakdown unavailable

2. **Current Tool Display**
   - Shows active tool name and truncated input
   - Format: `🔧 Edit: src/components/Chat.jsx`
   - Clears when tool completes

3. **Smart Status Detection**
   | State | Trigger | Display |
   |-------|---------|---------|
   | Initial | First 3 seconds | `💭 Claude is thinking` |
   | Using Tool | tool_use message | `🔧 {ToolName}: {input}` |
   | Waiting API | No activity >8s | `⏳ Waiting for response...` |
   | Permission | Pending approval | `⏸️ Waiting for you` |
   | Long Running | >20s elapsed | `Still working...` / `Almost there...` |

4. **Provider-Specific Labels**
   - Shows "Claude is thinking", "Cursor is thinking", or "Codex is thinking"
   - Adapts to selected provider automatically

### Implementation Details

#### State Management
```javascript
// Track current tool for status display
const [currentTool, setCurrentTool] = useState(null);

// Set when tool_use message received
setCurrentTool({
  name: part.name,
  input: part.input,
  timestamp: Date.now()
});

// Clear on tool_result, completion, or error
setCurrentTool(null);
```

#### Token Budget Handling
```javascript
// Supports two formats from backend
// Format 1: Detailed breakdown (ideal)
{ inputTokens: 12345, outputTokens: 6789, cacheReadTokens: 0 }

// Format 2: Simple used/total (fallback)
{ used: 19134, total: 160000 }

// Display logic
const display = hasDetailedBreakdown
  ? `${formatTokens(input)}↑ ${formatTokens(output)}↓`
  : `${formatTokens(used)} / ${formatTokens(limit)}`;
```

#### Status Priority Order
1. Explicit status from parent (highest priority)
2. Waiting for permission
3. Current tool being used
4. API waiting detection (>8s inactivity)
5. Provider-specific initial message
6. Rotating action words (lowest priority)

### Files Modified
- `src/components/ClaudeStatus.jsx` - Enhanced status component
- `src/components/ChatInterface.jsx` - Tool tracking and state management

---

## Solution B: Full Enhancement (Future)

### Additional Features

#### 1. Step Progress Bar
Show progress through multi-step operations:
```
[██████░░░░] Step 3/5: Editing files
```

**Implementation Approach:**
- Track tool sequence in session
- Infer steps from message history
- Show progress: planning → reading → editing → verifying → complete

#### 2. Recent Tool History
Show last 3-5 tools used with status:
```
Recently: Read✓ Read✓ Edit✓ Bash(Running)
```

**Implementation Approach:**
- Maintain tool history array in state
- Add completion timestamp on tool_result
- Show icons: ✓ (done), ⟳ (running), ✗ (error)

#### 3. Network/API Latency Indicator
Show when waiting for API vs processing locally:
```
⏱️ API latency: 2.3s  ⏳ Waiting for response...
```

**Implementation Approach:**
- Track request/response timestamps
- Calculate moving average of API latency
- Show indicator when latency exceeds threshold

#### 4. Enhanced Token Visualization
Progress bar showing context window usage:
```
Tokens: [████████░░░░░░░░] 45% (72k/160k)
```

**Implementation Approach:**
- Calculate percentage from used/total
- Color coding: green (<50%), yellow (<80%), red (>80%)
- Show breakdown on hover: input/output/cache

#### 5. Cancellation Feedback
Better feedback when stopping:
```
🛑 Stopping... (completing current tool)
```

**Implementation Approach:**
- Show intermediate "stopping" state
- Wait for server confirmation
- Display result: "Stopped after 3 tools" or "Completed before stop"

### UI Mockup (Full Enhancement)

```
┌─────────────────────────────────────────────────────┐
│ 🔧 Edit: src/components/Chat.jsx                    │
│ ⏱️ 45s  ⚡12.3k↑ 4.5k↓  [██████░░░░] 45%          │
│ Recently: Read✓ Read✓ Edit(Running)                │
│                                       [Stop]       │
└─────────────────────────────────────────────────────┘
```

### Technical Considerations

#### State Complexity
Solution B requires maintaining:
- Tool history array (last 5 operations)
- Step sequence tracking
- Latency measurements (rolling window)
- Progress inference logic

#### Performance Impact
- Minimal: Updates only on WebSocket messages
- Tool history: O(1) with fixed-size array
- Latency tracking: Simple timestamp math

#### Backend Requirements
- Optional: Step metadata in response messages
- Optional: Tool categorization (read/write/execute)
- Current implementation sufficient for basic version

---

## Testing Checklist

### Solution A
- [ ] Token display shows real values from API
- [ ] Tool name appears when tool_use received
- [ ] Tool display clears on completion
- [ ] "Waiting for response" appears after 8s inactivity
- [ ] Provider-specific labels show correctly
- [ ] No React hooks warnings in console

### Solution B (Future)
- [ ] Progress bar shows estimated completion
- [ ] Tool history displays correctly
- [ ] Latency indicator shows API wait time
- [ ] Context window usage bar updates
- [ ] Cancellation shows feedback

---

## Migration Path

1. **Phase 1 (Current)**: Deploy Solution A
   - Real tokens + current tool display
   - Immediate value with minimal risk

2. **Phase 2**: Add tool history
   - Track recent operations
   - Show completion status

3. **Phase 3**: Add progress inference
   - Analyze message patterns
   - Show step estimation

4. **Phase 4**: Full enhancement
   - Latency tracking
   - Visual progress bar
   - Advanced cancellation feedback

---

## Related Issues
- User anxiety during long operations
- Unclear agent state visibility
- Token usage transparency
