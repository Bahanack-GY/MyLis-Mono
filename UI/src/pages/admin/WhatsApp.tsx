import { useEffect, useRef, useState } from 'react';
import { Tick01Icon, Clock01Icon, Message02Icon, RefreshIcon, SmartPhone01Icon, WifiDisconnected01Icon, CancelCircleIcon } from 'hugeicons-react';
import api from '../../api/config';

interface PollResponse {
    status: 'disconnected' | 'connecting' | 'connected';
    qr: string | null;
}

interface SentMessage {
    phone: string;
    text: string;
    sentAt: string;
    status: 'sent' | 'failed';
    error?: string;
}

const STATUS_LABEL: Record<string, string> = {
    connected: 'Connecté',
    connecting: 'En attente de scan…',
    disconnected: 'Déconnecté',
};

const STATUS_COLOR: Record<string, string> = {
    connected: 'bg-emerald-100 text-emerald-700',
    connecting: 'bg-amber-100 text-amber-700',
    disconnected: 'bg-red-100 text-red-700',
};

function StatusBadge({ status }: { status: string }) {
    const Icon = status === 'connected' ? Tick01Icon : status === 'connecting' ? Clock01Icon : WifiDisconnected01Icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600'}`}>
            <Icon size={12} />
            {STATUS_LABEL[status] ?? status}
        </span>
    );
}

export default function WhatsAppPage() {
    const [poll, setPoll] = useState<PollResponse>({ status: 'disconnected', qr: null });
    const [messages, setMessages] = useState<SentMessage[]>([]);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchPoll = async () => {
        try {
            const { data } = await api.get<PollResponse>('/whatsapp/poll');
            setPoll(data);
        } catch {}
    };

    const fetchMessages = async () => {
        try {
            const { data } = await api.get<SentMessage[]>('/whatsapp/messages');
            setMessages(data);
        } catch {}
    };

    useEffect(() => {
        fetchPoll();
        fetchMessages();
        pollRef.current = setInterval(fetchPoll, 3_000);
        msgPollRef.current = setInterval(fetchMessages, 10_000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (msgPollRef.current) clearInterval(msgPollRef.current);
        };
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[#283852]">WhatsApp</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Notifications automatiques via WhatsApp</p>
                </div>
                <StatusBadge status={poll.status} />
            </div>

            {/* QR / Connected card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                {poll.status === 'connected' ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                            <SmartPhone01Icon size={32} className="text-emerald-600" />
                        </div>
                        <p className="font-semibold text-gray-800">WhatsApp connecté</p>
                        <p className="text-sm text-gray-500">Les notifications sont envoyées automatiquement.</p>
                    </div>
                ) : poll.qr ? (
                    <div className="flex flex-col items-center gap-4 py-4 text-center">
                        <p className="text-sm font-medium text-gray-700">
                            Scannez ce QR code avec WhatsApp{' '}
                            <span className="text-gray-400">→ Appareils liés → Lier un appareil</span>
                        </p>
                        <img
                            src={poll.qr}
                            alt="WhatsApp QR Code"
                            className="w-56 h-56 rounded-xl border border-gray-200 shadow-sm"
                        />
                        <p className="text-xs text-gray-400 flex items-center gap-1.5">
                            <RefreshIcon size={11} className="animate-spin" />
                            Actualisation automatique toutes les 3 s
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <RefreshIcon size={28} className="text-gray-400 animate-spin" />
                        </div>
                        <p className="font-semibold text-gray-700">Connexion en cours…</p>
                        <p className="text-sm text-gray-400">Le QR code apparaîtra ici dans quelques secondes.</p>
                    </div>
                )}
            </div>

            {/* Sent messages */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Message02Icon size={16} className="text-[#283852]" />
                    <h2 className="font-semibold text-sm text-gray-800">Messages envoyés</h2>
                    <span className="ml-auto text-xs text-gray-400">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
                </div>

                {messages.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm text-gray-400">
                        Aucun message envoyé pour l'instant.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {messages.map((msg, i) => (
                            <div key={i} className="px-5 py-3 flex items-start gap-3">
                                <div className="mt-0.5 shrink-0">
                                    {msg.status === 'sent'
                                        ? <Tick01Icon size={15} className="text-emerald-500" />
                                        : <CancelCircleIcon size={15} className="text-red-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xs font-semibold text-gray-700">{msg.phone}</span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(msg.sentAt).toLocaleString('fr-FR', {
                                                day: '2-digit', month: '2-digit',
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-2">{msg.text}</p>
                                    {msg.error && (
                                        <p className="text-xs text-red-400 mt-0.5">{msg.error}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
