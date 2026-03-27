import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AccountsService } from './accounts.service';

@Controller('accounting')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'ACCOUNTANT')
export class AccountsController {
    constructor(private readonly accountsService: AccountsService) {}

    // ===== SEED =====

    @Post('seed')
    seed() {
        return this.accountsService.seed();
    }

    // ===== CHART OF ACCOUNTS =====

    @Get('accounts')
    findAll() {
        return this.accountsService.findAll();
    }

    @Get('accounts/tree')
    findTree() {
        return this.accountsService.findTree();
    }

    @Get('accounts/:id')
    findOne(@Param('id') id: string) {
        return this.accountsService.findOne(id);
    }

    @Post('accounts')
    create(@Body() dto: any) {
        return this.accountsService.create(dto);
    }

    @Patch('accounts/:id')
    update(@Param('id') id: string, @Body() dto: any) {
        return this.accountsService.update(id, dto);
    }

    @Delete('accounts/:id')
    remove(@Param('id') id: string) {
        return this.accountsService.remove(id);
    }

    // ===== CATEGORIES =====

    @Get('categories')
    findAllCategories() {
        return this.accountsService.findAllCategories();
    }

    // ===== JOURNALS =====

    @Get('journals')
    findAllJournals() {
        return this.accountsService.findAllJournals();
    }

    @Post('journals')
    createJournal(@Body() dto: any) {
        return this.accountsService.createJournal(dto);
    }

    @Patch('journals/:id')
    updateJournal(@Param('id') id: string, @Body() dto: any) {
        return this.accountsService.updateJournal(id, dto);
    }
}
