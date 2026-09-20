import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Send, Zap, RotateCcw, Check, Bell,
  CreditCard, Sparkles, Users, RefreshCw
} from 'lucide-react';
import { aiApi, remindersApi, groupsApi, paymentsApi } from '../api';
import type { AIAction, Group } from '../types';
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
  'Show my unsettled balances',
  'Who is in my group?',
  'Remind Rahul to settle up',
  'Rahul paid me ₹200',
  'How do settlements work?',
];

export default function AICopilotPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlGroupId = searchParams.get('groupId') || undefined;
  const billId = searchParams.get('billId') || undefined;

  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(urlGroupId);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [actionStatus, setActionStatus] = useState<Record<string, 'completed' | 'cancelled'>>({});
  const [conversationId, setConversationId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    groupsApi.list()
      .then((res) => setGroups(res.data.groups || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const firstName = user?.name?.split(' ')[0] || 'Friend';
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Hey ${firstName}! 👋 I'm SplitBot, your interactive AI bill-splitting buddy.\n\nI can check who owes you, prepare instant payment reminders, record settlements, and help you split expenses. What's on your mind?`,
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
        context: {
          groupId: selectedGroupId,
          billId,
        },
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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      const errorMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: msg || 'Sorry, I had trouble processing that. Please try again!',
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

  const matchesUser = (userName: string, query: string) => {
    if (!userName || !query) return false;
    const u = userName.toLowerCase().trim();
    const q = query.toLowerCase().trim();
    return u.includes(q) || q.includes(u) || u.split(' ')[0] === q.split(' ')[0];
  };

  const handleExecuteReminder = async (msgId: string, actionData: Record<string, unknown>) => {
    setActionLoading((prev) => ({ ...prev, [msgId]: true }));
    try {
      const targetName = String(actionData.targetName || '').toLowerCase().trim();
      const groupsRes = await groupsApi.list();
      let targetId: string | undefined;

      for (const g of groupsRes.data.groups) {
        const member = g.members?.find((m) =>
          m.userId !== user?.id && matchesUser(m.user.name, targetName)
        );
        if (member) {
          targetId = member.userId;
          break;
        }
      }

      if (!targetId) {
        toast.error(`Could not locate member "${actionData.targetName}" in your groups.`);
        setActionLoading((prev) => ({ ...prev, [msgId]: false }));
        return;
      }

      const reminderRes = await remindersApi.create({
        targetId,
        message: String(actionData.message || `Hey! Friendly reminder for our split: ₹${actionData.amount || ''}`),
      });

      await remindersApi.send(reminderRes.data.reminder.id);
      toast.success(`Reminder sent to ${actionData.targetName || 'member'}! 📨`);
      setActionStatus((prev) => ({ ...prev, [msgId]: 'completed' }));
    } catch {
      toast.error('Failed to send reminder.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [msgId]: false }));
    }
  };

  const handleExecutePayment = async (msgId: string, actionData: Record<string, unknown>) => {
    setActionLoading((prev) => ({ ...prev, [msgId]: true }));
    try {
      const fromName = String(actionData.from || '').toLowerCase().trim();
      const toName = String(actionData.to || '').toLowerCase().trim();
      const amountStr = String(actionData.amount || '0').replace(/[^0-9.]/g, '');

      if (!amountStr || parseFloat(amountStr) <= 0) {
        toast.error('Invalid payment amount detected.');
        setActionLoading((prev) => ({ ...prev, [msgId]: false }));
        return;
      }

      const groupsRes = await groupsApi.list();
      let partnerId: string | undefined;
      let matchedGroupId: string | undefined = selectedGroupId;

      for (const g of groupsRes.data.groups) {
        for (const m of g.members || []) {
          if (m.userId !== user?.id && (matchesUser(m.user.name, fromName) || matchesUser(m.user.name, toName))) {
            partnerId = m.userId;
            matchedGroupId = g.id;
            break;
          }
        }
        if (partnerId) break;
      }

      if (!partnerId) {
        toast.error('Could not find the friend specified in your groups.');
        setActionLoading((prev) => ({ ...prev, [msgId]: false }));
        return;
      }

      const currentUserName = (user?.name || '').toLowerCase();
      const isReceived =
        toName === 'me' ||
        toName === 'i' ||
        toName === 'myself' ||
        matchesUser(currentUserName, toName) ||
        (!fromName.includes('me') && !fromName.includes('i') && matchesUser(currentUserName, toName));

      const fromId = isReceived ? partnerId : user?.id;
      const toId = isReceived ? user?.id : partnerId;

      await paymentsApi.create({
        fromId,
        toId,
        amount: amountStr,
        groupId: matchedGroupId,
        method: 'upi',
        note: `Recorded via SplitBot AI (${actionData.from || 'friend'} -> ${actionData.to || 'you'})`,
      });

      toast.success(`Payment of ₹${amountStr} recorded successfully! 💳`);
      setActionStatus((prev) => ({ ...prev, [msgId]: 'completed' }));
    } catch {
      toast.error('Failed to record payment.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [msgId]: false }));
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome-new',
      role: 'assistant',
      content: `Chat cleared! Ask me anything about your expenses or settlements. 🤖`,
      timestamp: new Date(),
    }]);
    setConversationId(undefined);
    setActionStatus({});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }} className="animate-fade-in">
      <div style={{
        padding: 'var(--space-4) var(--space-6)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #7C3AED, #10B981)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
          }}>
            <Zap size={22} color="white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>SplitBot AI</span>
              <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>● Online</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Interactive Bill & Settlement Assistant
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} color="var(--text-muted)" />
            <select
              className="input"
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
              value={selectedGroupId || ''}
              onChange={(e) => setSelectedGroupId(e.target.value || undefined)}
            >
              <option value="">🌐 All Groups & Balances</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji || '👥'} {g.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={clearChat}
            title="Reset Chat"
            aria-label="Reset Chat"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5)' }}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const status = actionStatus[msg.id];
          const isLoading = actionLoading[msg.id];
          const actionData = msg.action?.data as Record<string, string> | undefined;

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                marginBottom: 16,
              }}
            >
              {!isUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #7C3AED, #10B981)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Zap size={11} color="white" />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-light)' }}>SplitBot</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              <div
                className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-bot'}`}
                style={{ maxWidth: '85%' }}
              >
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.content}</div>

                {/* INTERACTIVE ACTION CARD: Create Reminder */}
                {msg.action?.type === 'create_reminder' && actionData && (
                  <div className="chat-action-card animate-fade-in" style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Bell size={16} color="#F59E0B" />
                      <span className="chat-action-title" style={{ margin: 0 }}>Payment Nudge</span>
                      {actionData.amount ? (
                        <span className="badge badge-warning" style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                          ₹{actionData.amount}
                        </span>
                      ) : null}
                    </div>

                    <div style={{
                      fontSize: '0.85rem',
                      background: 'var(--bg-base)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-secondary)',
                      marginBottom: 12,
                      border: '1px solid var(--border)',
                    }}>
                      "{actionData.message || ''}"
                    </div>

                    {status === 'completed' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10B981', fontSize: '0.85rem', fontWeight: 600 }}>
                        <Check size={16} /> Reminder sent successfully!
                      </div>
                    ) : status === 'cancelled' ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Reminder dismissed.
                      </div>
                    ) : (
                      <div className="chat-action-buttons">
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={isLoading}
                          onClick={() => handleExecuteReminder(msg.id, actionData)}
                        >
                          {isLoading ? (
                            <RefreshCw size={14} className="spinner" />
                          ) : (
                            <>
                              <Send size={13} /> Send Reminder Now
                            </>
                          )}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={isLoading}
                          onClick={() => setActionStatus((prev) => ({ ...prev, [msg.id]: 'cancelled' }))}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* INTERACTIVE ACTION CARD: Record Payment */}
                {msg.action?.type === 'record_payment' && actionData && (
                  <div className="chat-action-card animate-fade-in" style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <CreditCard size={16} color="#10B981" />
                      <span className="chat-action-title" style={{ margin: 0 }}>Record Received Payment</span>
                      {actionData.amount ? (
                        <span className="badge badge-success" style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                          ₹{actionData.amount}
                        </span>
                      ) : null}
                    </div>

                    <div style={{
                      fontSize: '0.85rem',
                      background: 'var(--bg-base)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-secondary)',
                      marginBottom: 12,
                      border: '1px solid var(--border)',
                    }}>
                      <div><strong>From:</strong> {actionData.from || 'Member'}</div>
                      <div><strong>To:</strong> {actionData.to || 'You'}</div>
                      <div><strong>Amount:</strong> ₹{actionData.amount || '0'}</div>
                    </div>

                    {status === 'completed' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10B981', fontSize: '0.85rem', fontWeight: 600 }}>
                        <Check size={16} /> Payment recorded into group balances!
                      </div>
                    ) : status === 'cancelled' ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Payment entry dismissed.
                      </div>
                    ) : (
                      <div className="chat-action-buttons">
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={isLoading}
                          onClick={() => handleExecutePayment(msg.id, actionData)}
                        >
                          {isLoading ? (
                            <RefreshCw size={14} className="spinner" />
                          ) : (
                            <>
                              <Check size={14} /> Confirm & Save Payment
                            </>
                          )}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={isLoading}
                          onClick={() => setActionStatus((prev) => ({ ...prev, [msg.id]: 'cancelled' }))}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* INTERACTIVE ACTION CARD: Show Settlements */}
                {msg.action?.type === 'show_settlements' && (
                  <div className="chat-action-card animate-fade-in" style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Zap size={16} color="#7C3AED" />
                      <span className="chat-action-title" style={{ margin: 0 }}>Smart Settlement Engine</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                      Calculate the minimum number of UPI transactions needed to settle all group debts.
                    </p>
                    <div className="chat-action-buttons">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          const target = selectedGroupId
                            ? `/groups/${selectedGroupId}/settlements`
                            : '/groups';
                          navigate(target);
                        }}
                      >
                        <Zap size={13} /> View Minimum Settlement Plan →
                      </button>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE ACTION CARD: Assign Items */}
                {msg.action?.type === 'assign_items' && (
                  <div className="chat-action-card animate-fade-in" style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Sparkles size={16} color="#3B82F6" />
                      <span className="chat-action-title" style={{ margin: 0 }}>Item Assignment Suggestions</span>
                    </div>
                    <div className="chat-action-buttons">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          if (billId) navigate(`/bills/${billId}/assign`);
                          else navigate('/groups');
                        }}
                      >
                        {billId ? 'Go to Bill Assign Page →' : 'Select a Bill to Assign →'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16 }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #7C3AED, #10B981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
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

      <div style={{
        padding: '8px var(--space-5)',
        background: 'var(--bg-glass)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={13} color="var(--primary-light)" /> Quick:
        </span>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            className="badge badge-primary"
            style={{
              cursor: 'pointer',
              fontSize: '0.8rem',
              padding: '6px 12px',
              border: '1px solid var(--border-primary)',
              background: 'rgba(124, 58, 237, 0.12)',
              color: 'var(--primary-light)',
              borderRadius: 'var(--radius-full)',
              transition: 'all 0.15s ease',
            }}
            onClick={() => sendMessage(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder='Ask SplitBot anything... "Who owes me?", "Remind Rahul", "Rahul paid me 200"'
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
            style={{
              background: input.trim() && !loading ? 'linear-gradient(135deg, #7C3AED, #10B981)' : undefined,
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            <Send size={18} />
          </button>
        </div>
        <div style={{
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          marginTop: 6,
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
        }}>
          <span>⚡ SplitBot AI reads real balances & prepares action cards. Never auto-sends without confirmation.</span>
        </div>
      </div>
    </div>
  );
}
