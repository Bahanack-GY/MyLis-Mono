import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiChatService, ChatMessage } from './ai-chat.service';

class ChatDto {
    message: string;
    history: ChatMessage[];
}

@Controller('ai-chat')
@UseGuards(AuthGuard('jwt'))
export class AiChatController {
    constructor(private readonly aiChatService: AiChatService) {}

    @Post()
    async chat(@Body() dto: ChatDto) {
        const reply = await this.aiChatService.chat(dto.message, dto.history ?? []);
        return { reply };
    }
}
