'use client';

import React, { useState } from 'react';
import { Incident, AiChatMessage } from '@/types';
import { MOCK_AI_CONVERSATION } from '@/data/mockData';

interface AiRefinementDrawerProps {
  incident: Incident | null;
  onClose: () => void;
}

export function AiRefinementDrawer({ incident, onClose }: AiRefinementDrawerProps) {
  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    if (incident && MOCK_AI_CONVERSATION[incident.id]) {
      return MOCK_AI_CONVERSATION[incident.id];
    }
    return [
      {
        id: 'init-1',
        sender: 'assistant',
        timestamp: 'Just now',
        text: `I'm analyzing ${incident?.summary || 'this incident'}. You can request modifications to the candidate patch, query plan, or validation thresholds.`,
      },
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  if (!incident) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTyping) return;

    const userMsg: AiChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      timestamp: 'Just now',
      text: inputMessage,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    setTimeout(() => {
      const assistantReply: AiChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        timestamp: 'Just now',
        text: `Understood. I adjusted the candidate fix logic according to your feedback: "${userMsg.text}". In a production deployment, this triggers a re-run of the baseline/k6 deterministic verification suite before updating the PR branch.`,
        suggestedDiff: `--- a/${incident.affectedFiles?.[0] || 'routes/api.js'}
+++ b/${incident.affectedFiles?.[0] || 'routes/api.js'}
@@ -12,4 +12,6 @@
+ // Refinement applied based on review feedback
+ // Verified against 50 VUs workload with 0 regressions`,
        status: 'READY',
      };
      setMessages((prev) => [...prev, assistantReply]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Refinement Assistant"
      className="fixed inset-y-0 right-0 z-50 w-full max-w-lg flex flex-col border-l transition-transform shadow-2xl animate-in slide-in-from-right duration-200"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-strong)',
        boxShadow: 'var(--shadow-drawer)',
      }}
    >
      {/* Header */}
      <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ backgroundColor: 'var(--ai-accent-bg)', color: 'var(--ai-accent-text)', border: '1px solid var(--ai-accent-border)' }}
          >
            ✨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                AI Refinement Assistant
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--ai-accent-bg)] text-[var(--ai-accent-text)] border border-[var(--ai-accent-border)]">
                Demo
              </span>
            </div>
            <p className="text-xs truncate max-w-xs" style={{ color: 'var(--text-muted)' }}>
              {incident.service} &bull; {incident.endpoint}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI panel"
          className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer hover:bg-[var(--bg-surface)]"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          ✕
        </button>
      </div>

      {/* Context banner */}
      <div className="px-5 py-2.5 border-b text-xs flex items-center justify-between" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          Target commit: <code className="font-mono">{incident.latestJob?.commitSha || 'e05fa467'}</code>
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          {incident.latestJob?.gateResults?.length || 4} gates active
        </span>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span>{msg.sender === 'user' ? 'You' : 'TraceFix AI'}</span>
              <span>&bull;</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`p-3.5 rounded-2xl max-w-[90%] text-xs leading-relaxed border ${
                msg.sender === 'user' ? 'rounded-tr-xs' : 'rounded-tl-xs'
              }`}
              style={{
                backgroundColor: msg.sender === 'user' ? 'var(--mint-hero-text)' : 'var(--bg-card)',
                color: msg.sender === 'user' ? 'var(--text-inverse)' : 'var(--text-primary)',
                borderColor: msg.sender === 'user' ? 'var(--mint-hero-text)' : 'var(--border-subtle)',
              }}
            >
              <p>{msg.text}</p>

              {msg.suggestedDiff && (
                <div className="mt-3 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="text-[10px] uppercase font-bold block mb-1 text-[var(--text-muted)]">
                    Refined Diff Preview
                  </span>
                  <pre
                    className="p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto"
                    style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                  >
                    <code>{msg.suggestedDiff}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-1 text-xs italic" style={{ color: 'var(--text-muted)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--ai-accent)' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s]" style={{ backgroundColor: 'var(--ai-accent)' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s]" style={{ backgroundColor: 'var(--ai-accent)' }} />
            <span className="ml-1">Assistant refining candidate patch...</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="p-4 border-t flex items-center gap-2" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask AI to refine the patch, add logs, or modify SQL..."
          className="flex-1 px-4 py-2.5 text-xs rounded-full border outline-hidden"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isTyping}
          className="px-4 py-2.5 text-xs font-bold rounded-full border cursor-pointer hover:opacity-90 disabled:opacity-40"
          style={{
            backgroundColor: 'var(--mint-hero-text)',
            color: 'var(--text-inverse)',
            borderColor: 'var(--mint-hero-text)',
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
