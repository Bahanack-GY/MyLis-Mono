import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CacheService.name);
    private redis: Redis;
    private available = false;

    onModuleInit() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD || undefined,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            connectTimeout: 3000,
        });

        this.redis.on('connect', () => {
            this.available = true;
            this.logger.log('Redis connected');
        });
        this.redis.on('error', (err) => {
            if (this.available) this.logger.warn(`Redis error: ${err.message}`);
            this.available = false;
        });
        this.redis.on('close', () => { this.available = false; });

        this.redis.connect().catch(() => {
            this.logger.warn('Redis unavailable — caching disabled, falling through to DB');
        });
    }

    async onModuleDestroy() {
        await this.redis.quit().catch(() => {});
    }

    async get<T>(key: string): Promise<T | null> {
        if (!this.available) return null;
        try {
            const raw = await this.redis.get(key);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch {
            return null;
        }
    }

    async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
        if (!this.available) return;
        try {
            await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        } catch (err: any) {
            this.logger.warn(`Cache set failed [${key}]: ${err.message}`);
        }
    }

    async del(key: string): Promise<void> {
        if (!this.available) return;
        try {
            await this.redis.del(key);
        } catch {}
    }

    /**
     * Delete all keys matching a glob pattern using SCAN (safe for production).
     * Example: invalidateByPattern('accounting:*')
     */
    async invalidateByPattern(pattern: string): Promise<void> {
        if (!this.available) return;
        try {
            let cursor = '0';
            do {
                const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', '200');
                cursor = nextCursor;
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
            } while (cursor !== '0');
        } catch (err: any) {
            this.logger.warn(`Cache invalidate failed [${pattern}]: ${err.message}`);
        }
    }
}
