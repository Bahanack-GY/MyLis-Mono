
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppCacheModule } from './cache/cache.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmployeesModule } from './employees/employees.module';
import { TasksModule } from './tasks/tasks.module';
import { TaskNaturesModule } from './task-natures/task-natures.module';
import { HrModule } from './hr/hr.module';
import { OrganizationModule } from './organization/organization.module';
import { LogsModule } from './logs/logs.module';
import { TicketsModule } from './tickets/tickets.module';
import { ClientsModule } from './clients/clients.module';
import { ProjectsModule } from './projects/projects.module';
import { MeetingsModule } from './meetings/meetings.module';
import { InvoicesModule } from './invoices/invoices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';
import { DemandsModule } from './demands/demands.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AccountingModule } from './accounting/accounting.module';
import { PayrollModule } from './payroll/payroll.module';
import { TaxModule } from './tax/tax.module';
import { CommercialModule } from './commercial/commercial.module';
import { BusinessExpensesModule } from './business-expenses/business-expenses.module';
import { ReportsModule } from './reports/reports.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SseModule } from './sse/sse.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ChargeNaturesModule } from './charge-natures/charge-natures.module';
import { FundMovementsModule } from './fund-movements/fund-movements.module';
import { CarwashModule } from './carwash/carwash.module';
import { AiChatModule } from './ai-chat/ai-chat.module';
import { RemindersModule } from './reminders/reminders.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RolesGuard } from './auth/roles.guard';
import { ActivityInterceptor } from './logs/activity.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AppCacheModule,
    SseModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'mylisapp_db',
      autoLoadModels: true,
      synchronize: false,
      logging: false,
      models: [__dirname + '/**/*.model.ts'],
      pool: {
        max: 20,
        min: 2,
        acquire: 30000,
        idle: 10000,
      },
    }),
    AuthModule,
    UsersModule,
    EmployeesModule,
    TasksModule,
    TaskNaturesModule,
    HrModule,
    OrganizationModule,
    LogsModule,
    TicketsModule,
    ClientsModule,
    ProjectsModule,
    MeetingsModule,
    InvoicesModule,
    NotificationsModule,
    WhatsAppModule,
    ChatModule,
    DemandsModule,
    ExpensesModule,
    AccountingModule,
    PayrollModule,
    TaxModule,
    CommercialModule,
    BusinessExpensesModule,
    ReportsModule,
    SuppliersModule,
    ChargeNaturesModule,
    FundMovementsModule,
    CarwashModule,
    AiChatModule,
    RemindersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: ActivityInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }
