
import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { WhatsAppService } from './whatsapp.service';

@SkipThrottle()
@Roles('MANAGER')
@Controller('whatsapp')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class WhatsAppController {
    constructor(private readonly whatsAppService: WhatsAppService) {}

    /** Single polling endpoint — returns status + QR in one call */
    @Get('poll')
    poll() {
        return {
            status: this.whatsAppService.getStatus(),
            qr: this.whatsAppService.getQrDataUrl(),
        };
    }

    @Get('messages')
    getMessages() {
        return this.whatsAppService.getSentMessages(200);
    }
}
