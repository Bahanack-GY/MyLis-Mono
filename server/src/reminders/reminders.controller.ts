import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RemindersService } from './reminders.service';

@Controller('reminders')
@UseGuards(AuthGuard('jwt'))
export class RemindersController {
    constructor(private readonly remindersService: RemindersService) {}

    @Get()
    findAll(@Request() req) {
        return this.remindersService.findAll(req.user.userId);
    }

    @Post()
    create(
        @Request() req,
        @Body() body: { title: string; description?: string; dueDate: string },
    ) {
        return this.remindersService.create(req.user.userId, body);
    }

    @Patch(':id/done')
    markDone(@Param('id') id: string, @Request() req) {
        return this.remindersService.markDone(id, req.user.userId);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.remindersService.remove(id, req.user.userId);
    }
}
