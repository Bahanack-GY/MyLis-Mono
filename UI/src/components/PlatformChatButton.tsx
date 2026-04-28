import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message01Icon, Cancel01Icon, SentIcon, BotIcon, UserIcon, Loading02Icon } from 'hugeicons-react';
import api from '../api/config';

const TEAL = '#33cbcc';
const NAVY = '#283852';

interface Message {
    role: 'user' | 'model';
    parts: string;
}

export default function PlatformChatButton() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [open]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg: Message = { role: 'user', parts: text };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setInput('');
        setLoading(true);

        try {
            const { data } = await api.post<{ reply: string }>('/ai-chat', {
                message: text,
                history: messages,
            });
            setMessages([...nextMessages, { role: 'model', parts: data.reply }]);
        } catch {
            setMessages([...nextMessages, {
                role: 'model',
                parts: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.",
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <>
            {/* Chat panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className="fixed bottom-24 right-6 z-[110] w-[360px] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
                        style={{ maxHeight: '520px' }}
                    >
                        {/* Header */}
                        <div
                            className="flex items-center justify-between px-4 py-3 shrink-0"
                            style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})` }}
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <BotIcon size={18} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm leading-none">Assistant MyLIS</p>
                                    <p className="text-white/70 text-xs mt-0.5">Propulsé par Gemini</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
                                aria-label="Fermer"
                            >
                                <Cancel01Icon size={16} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-3 min-h-[280px]">
                            {messages.length === 0 && (
                                <div className="text-center py-6">
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                                        style={{ background: `${TEAL}20` }}
                                    >
                                        <BotIcon size={24} style={{ color: TEAL }} />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">Bonjour ! Comment puis-je vous aider ?</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Posez-moi des questions sur vos employés, revenus, dépenses ou demandes.
                                    </p>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                        msg.role === 'user' ? 'bg-[#283852]' : ''
                                    }`}
                                        style={msg.role === 'model' ? { background: `${TEAL}25` } : {}}
                                    >
                                        {msg.role === 'user'
                                            ? <UserIcon size={14} className="text-white" />
                                            : <BotIcon size={14} style={{ color: TEAL }} />
                                        }
                                    </div>
                                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                        msg.role === 'user'
                                            ? 'bg-[#283852] text-white rounded-tr-none'
                                            : 'bg-white text-gray-800 shadow-sm rounded-tl-none'
                                    }`}>
                                        {msg.parts}
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div className="flex gap-2 flex-row">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                        style={{ background: `${TEAL}25` }}>
                                        <BotIcon size={14} style={{ color: TEAL }} />
                                    </div>
                                    <div className="bg-white shadow-sm rounded-2xl rounded-tl-none px-3 py-3 flex items-center gap-1">
                                        {[0, 1, 2].map(i => (
                                            <motion.div
                                                key={i}
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{ background: TEAL }}
                                                animate={{ y: [0, -4, 0] }}
                                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <div className="bg-white border-t border-gray-100 p-3 shrink-0 flex gap-2">
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKey}
                                placeholder="Posez votre question…"
                                disabled={loading}
                                className="flex-1 text-sm rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-[#33cbcc] transition-colors disabled:bg-gray-50"
                            />
                            <button
                                onClick={send}
                                disabled={!input.trim() || loading}
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                                style={{ background: NAVY }}
                                aria-label="Envoyer"
                            >
                                {loading
                                    ? <Loading02Icon size={16} className="text-white animate-spin" />
                                    : <SentIcon size={16} className="text-white" />
                                }
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating button */}
            <motion.button
                onClick={() => setOpen(o => !o)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-6 right-6 z-[110] w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})` }}
                aria-label="Ouvrir l'assistant"
            >
                <AnimatePresence mode="wait">
                    {open
                        ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <Cancel01Icon size={22} className="text-white" />
                          </motion.div>
                        : <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <Message01Icon size={22} className="text-white" />
                          </motion.div>
                    }
                </AnimatePresence>
            </motion.button>
        </>
    );
}
