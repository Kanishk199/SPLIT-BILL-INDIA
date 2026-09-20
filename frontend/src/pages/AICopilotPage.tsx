import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, Bot, Zap, RotateCcw } from 'lucide-react';
import { aiApi, remindersApi, groupsApi } from '../api';
import type { AIAction } from '../types';
import { useAuth } from '../store/AuthContext';
import toast from 'react-hot-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: AIAction;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  'Who owes me?',
  'Show my unsettled expenses',
  'How much does Rahul owe?',
  'Split this bill equally',
];

export default function AICopilotPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId') || undefined;
  const billId = searchParams.get('billId') || undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [pendingAction, setPendingAction] = useState<{ type: string; data: Record<string, unknown>; message: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Hey ${user?.name?.split(' ')[0]}! 👋 I'm SplitBot, your AI bill-splitting buddy.\n\nTell me who had what, ask about balances, or just say "split this bill" — I've got you!`,
      timestamp: new Date(),
    }]);
  }, [user?.name]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.chat({
        message: text,
        conversationId,
        context: { groupId, billId },
      });

      setConversationId(res.data.conversationId);

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.data.message,
        action: res.data.action,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);

      // Handle action
      if (res.data.action?.type === 'create_reminder' && res.data.action.data) {
        setPendingAction({
          type: 'reminder',
          data: res.data.action.data,
          message: res.data.message,
        });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      const errorMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: msg || 'Sorry, I had trouble connecting. Please try again!',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handlePendingReminder = async (approve: boolean) => {
    if (!pendingAction) return;
    if (!approve) {
      setPendingAction(null);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Okay, reminder cancelled. Let me know if you need anything else!',
        timestamp: new Date(),
      }]);
      return;
    }

    try {
      const data = pendingAction.data;
      // Find target user by name in groups
      const groupsRes = await groupsApi.list();
      let targetId: string | undefined;
      for (const g of groupsRes.data.groups) {
        const member = g.members?.find((m) => 
          m.user.name.toLowerCase().includes(String(data.targetName || '').toLowerCase())
        );
        if (member) { targetId = member.userId; break; }
      }

      if (!targetId) {
        toast.error("Couldn't find that person in your groups");
        setPendingAction(null);
        return;
      }

      const reminder = await remindersApi.create({
        targetId,
        message: String(data.message || pendingAction.message),
      });
      await remindersApi.send(reminder.data.reminder.id);
      toast.success('Reminder sent! 📨');
      setPendingAction(null);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '✅ Reminder sent! They\'ll get notified.',
        timestamp: new Date(),
      }]);
    } catch (err) {
      toast.error('Failed to send reminder');
      setPendingAction(null);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome-new',
      role: 'assistant',
      content: `Chat cleared! What would you like to do? 🤖`,
      timestamp: new Date(),
    }]);
    setConversationId(undefined);
    setPendingAction(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }} className="animate-fade-in">
      {/* Header */}
      <div style={{
        padding: 'var(--space-5) var(--space-6)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #7C3AED, #10B981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={20} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>SplitBot</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-light)', fontWeight: 600 }}>● Online</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={clearChat} aria-label="Clear chat">
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5)' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 8, background: 'linear-gradient(135deg, #7C3AED, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={12} color="white" />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-light)' }}>SplitBot</span>
              </div>
            )}
            <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

              {/* Action card for reminders */}
              {msg.action?.type === 'create_reminder' && pendingAction && (
                <div className="chat-action-card">
                  <div className="chat-action-title">🤖 Ready to send</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '8px 0' }}>
                    "{String(msg.action.data?.message || '')}"
                  </div>
                  <div className="chat-action-buttons">
                    <button className="btn btn-accent btn-sm" id="approve-reminder-btn" onClick={() => handlePendingReminder(true)}>
                      ✓ Send
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => handlePendingReminder(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Navigate action */}
              {msg.action?.type === 'show_settlements' && (
                <div className="chat-action-card">
                  <div className="chat-action-buttons">
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/groups')}>
                      View Settlements →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: 'linear-gradient(135deg, #7C3AED, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={12} color="white" />
            </div>
            <div className="chat-bubble chat-bubble-bot" style={{ padding: 'var(--space-3) var(--space-4)' }}>
              <div className="chat-typing">
                <div className="chat-typing-dot" />
                <div className="chat-typing-dot" />
                <div className="chat-typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 var(--space-5) var(--space-3)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              className="badge badge-primary"
              style={{ cursor: 'pointer', fontSize: '0.8rem', padding: '6px 12px' }}
              onClick={() => sendMessage(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder='Ask SplitBot anything... "Who owes me?" "Rahul had biryani and coke."'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            id="splitbot-input"
          />
          <button
            className="chat-send-btn"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            id="splitbot-send-btn"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
          SplitBot uses AI to help split bills. Always review before sending. Never sends payments automatically.
        </div>
      </div>
    </div>
  );
}
