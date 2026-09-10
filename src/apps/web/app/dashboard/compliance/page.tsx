'use client';
import { useState } from 'react';
import Link from 'next/link';
import { getToken } from '../../auth';
import { Icon } from '../../components/icons';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
type Citation = { title: string; sectionRef: string; documentId: string };
type Message = { role: 'user' | 'assistant'; text: string; citations?: Citation[]; confidence?: number; escalated?: boolean };
const SUGGESTIONS = ['What is the validity period for a certificate?', 'What are the re-verification rules for weighing scales?', 'Are verification fees refundable?'];
const FIRST_RESPONSE = 'Hi, how can I help you?';
export default function Compliance() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    const isFirstQuestion = !messages.some((message) => message.role === 'user');
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    if (isFirstQuestion) {
      setMessages((prev) => [...prev, { role: 'assistant', text: FIRST_RESPONSE }]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/compliance/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error('request failed');
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer, citations: data.citations, confidence: Number(data.confidence), escalated: data.escalated }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'The compliance service is unavailable right now. Please try again or contact a Legal Metrology officer.', escalated: true }]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <div className="page-header">
        <div><span className="eyebrow">INTELLIGENCE / COMPLIANCE</span><h1>Ask the Rules</h1><p>Get grounded answers from the Legal Metrology Act and General Rules, with source references for every response.</p></div>
        <span className="ai-badge"><Icon name="sparkle" size={11} /> AI-assisted · human verified</span>
      </div>
      <div className="assistant-layout">
        <div className="chat-card">
          <div className="chat-head"><span className="ai-avatar"><Icon name="sparkle" size={16} /></span><div><b>Compliance assistant</b><span>{loading ? 'Thinking…' : 'Online · cites official source text'}</span></div></div>
          <div className="chat-body">
            {messages.map((m, i) => m.role === 'user' ? (
              <div className="chat-message user" key={i}>{m.text}</div>
            ) : (
              <div className="chat-message assistant" key={i}>
                <span className="mini-avatar"><Icon name="sparkle" size={13} /></span>
                <div>
                  {m.text}
                  {typeof m.confidence === 'number' && <div className="citation-confidence">Confidence: {(m.confidence * 100).toFixed(0)}%</div>}
                  {m.escalated && <div className="escalation-banner"><Icon name="alert" size={11} /> Low confidence — escalated for human review by a Legal Metrology officer.</div>}
                  {m.citations?.map((c) => (
                    <div className="citation" key={c.documentId}><b>Source · {c.sectionRef}</b><span>{c.title}</span><Link href="#">View source paragraph ↗</Link></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="suggestions">{SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)}>{s}</button>)}</div>
          <div className="chat-input">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about the Act or Rules..." onKeyDown={(e) => e.key === 'Enter' && ask(input)} />
            <button onClick={() => ask(input)}>↑</button>
          </div>
        </div>
        <div className="source-panel">
          <span className="eyebrow">SOURCE LIBRARY</span>
          <h2>Authoritative corpus</h2>
          <div className="source-item"><b>Legal Metrology Act, 2009</b><span>8 chapters · indexed</span></div>
          <div className="source-item"><b>General Rules, 2011</b><span>42 rules · indexed</span></div>
          <div className="source-item"><b>Delhi notifications</b><span>16 circulars · indexed</span></div>
          <div className="source-note">Answers are advisory. Statutory decisions remain with the authorised officer.</div>
        </div>
      </div>
    </>
  );
}
