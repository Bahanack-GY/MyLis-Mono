
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    WASocket,
    Browsers,
    fetchLatestWaWebVersion,
} from 'baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import { join } from 'path';

export interface SentMessage {
    phone: string;
    text: string;
    sentAt: Date;
    status: 'sent' | 'failed';
    error?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/** Minimal no-op logger compatible with baileys */
const noopLogger = {
    level: 'silent',
    fatal: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
    trace: () => {},
    child: () => noopLogger,
} as any;

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(WhatsAppService.name);
    private sock: WASocket | null = null;
    private qrDataUrl: string | null = null;
    private status: ConnectionStatus = 'disconnected';
    private readonly sentMessages: SentMessage[] = [];
    private readonly messageQueue: Array<() => Promise<void>> = [];
    private isProcessingQueue = false;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private destroyed = false;
    private readonly authDir = join(process.cwd(), 'whatsapp-auth');

    async onModuleInit() {
        await this.connect();
    }

    async onModuleDestroy() {
        this.destroyed = true;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        try { this.sock?.end(undefined); } catch {}
    }

    // ── Connection ────────────────────────────────────────────────────────────

    private async connect() {
        if (this.destroyed) return;
        try {
            const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
            const { version } = await fetchLatestWaWebVersion();

            this.sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, noopLogger),
                },
                browser: Browsers.macOS('Chrome'),
                logger: noopLogger,
                printQRInTerminal: false,
                markOnlineOnConnect: false,
                getMessage: async () => undefined,
            });

            this.sock.ev.on('creds.update', saveCreds);

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    this.qrDataUrl = await QRCode.toDataURL(qr);
                    this.status = 'connecting';
                    this.logger.log('QR code ready — scan to pair WhatsApp');
                }

                if (connection === 'open') {
                    this.qrDataUrl = null;
                    this.status = 'connected';
                    this.logger.log('WhatsApp connected');
                }

                if (connection === 'close') {
                    this.status = 'disconnected';
                    const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
                    const loggedOut = code === DisconnectReason.loggedOut;
                    this.logger.warn(`WhatsApp disconnected (code ${code}, loggedOut=${loggedOut})`);

                    if (!loggedOut && !this.destroyed) {
                        const delay = code === DisconnectReason.restartRequired ? 1_000 : 8_000;
                        this.reconnectTimer = setTimeout(() => this.connect(), delay);
                    }
                }
            });
        } catch (err: any) {
            this.logger.error(`WhatsApp connect error: ${err.message}`);
            if (!this.destroyed) {
                this.reconnectTimer = setTimeout(() => this.connect(), 10_000);
            }
        }
    }

    // ── Public Getters ────────────────────────────────────────────────────────

    getQrDataUrl(): string | null { return this.qrDataUrl; }
    getStatus(): ConnectionStatus { return this.status; }
    getSentMessages(limit = 100): SentMessage[] {
        return this.sentMessages.slice(-limit).reverse();
    }

    // ── Number Normalization ──────────────────────────────────────────────────

    /**
     * Normalize a Cameroon phone number to WhatsApp JID format.
     * Cameroon country code: 237
     * Valid mobile numbers: 9 digits starting with 6, 7, 8 (Orange/MTN)
     *                       or 2 (some fixed lines)
     */
    normalizeToJid(phone: string): string | null {
        if (!phone) return null;

        // Strip everything except digits
        let digits = phone.replace(/\D/g, '');

        // Remove country code prefixes
        if (digits.startsWith('00237')) digits = digits.slice(5);
        else if (digits.startsWith('237')) digits = digits.slice(3);
        else if (digits.startsWith('0')) digits = digits.slice(1);

        // Must be exactly 9 digits
        if (digits.length !== 9) return null;

        // Must start with valid Cameroon prefix (2, 6, 7, 8, 9)
        if (!/^[2-9]/.test(digits)) return null;

        return `237${digits}@s.whatsapp.net`;
    }

    // ── Sending ───────────────────────────────────────────────────────────────

    /**
     * Queue a WhatsApp message to be sent with human-like delays.
     * Non-blocking — returns immediately.
     */
    enqueue(phone: string, text: string): void {
        this.messageQueue.push(() => this.sendWithPresence(phone, text));
        if (!this.isProcessingQueue) this.drainQueue();
    }

    private async drainQueue() {
        this.isProcessingQueue = true;
        let batchCount = 0;

        while (this.messageQueue.length > 0) {
            const task = this.messageQueue.shift()!;
            await task();
            batchCount++;

            if (this.messageQueue.length === 0) break;

            if (batchCount % 10 === 0) {
                // Longer cooldown every 10 messages to avoid rate limiting
                const pause = 30_000 + Math.random() * 30_000; // 30–60 s
                this.logger.debug(`Batch pause ${Math.round(pause / 1000)}s`);
                await this.sleep(pause);
            } else {
                // Natural human delay between messages
                const delay = 4_000 + Math.random() * 8_000; // 4–12 s
                await this.sleep(delay);
            }
        }

        this.isProcessingQueue = false;
    }

    private async sendWithPresence(phone: string, text: string): Promise<void> {
        if (!this.sock || this.status !== 'connected') {
            this.record(phone, text, 'failed', 'WhatsApp not connected');
            return;
        }

        const jid = this.normalizeToJid(phone);
        if (!jid) {
            this.record(phone, text, 'failed', `Invalid Cameroon number: "${phone}"`);
            this.logger.warn(`Skipping invalid number: ${phone}`);
            return;
        }

        try {
            // Mark as available briefly before composing
            await this.sock.sendPresenceUpdate('available', jid);
            await this.sleep(400 + Math.random() * 400);

            // Simulate typing — duration proportional to message length (realistic)
            const typingMs = Math.min(1_200 + text.length * 28, 7_000) + Math.random() * 1_500;
            await this.sock.sendPresenceUpdate('composing', jid);
            await this.sleep(typingMs);
            await this.sock.sendPresenceUpdate('paused', jid);
            await this.sleep(200 + Math.random() * 400);

            await this.sock.sendMessage(jid, { text });

            // Go offline after sending (don't linger as "online")
            await this.sock.sendPresenceUpdate('unavailable', jid);

            this.record(phone, text, 'sent');
            this.logger.log(`WhatsApp ✓ → ${phone}`);
        } catch (err: any) {
            this.record(phone, text, 'failed', err.message);
            this.logger.error(`WhatsApp ✗ → ${phone}: ${err.message}`);
        }
    }

    private record(phone: string, text: string, status: 'sent' | 'failed', error?: string) {
        this.sentMessages.push({ phone, text, sentAt: new Date(), status, error });
        // Keep last 500 in memory
        if (this.sentMessages.length > 500) this.sentMessages.shift();
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
