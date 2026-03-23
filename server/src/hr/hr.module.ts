
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from '../models/document.model';
import { Formation } from '../models/formation.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { FormationsService } from './formations.service';
import { FormationsController } from './formations.controller';
import { Entretien } from '../models/entretien.model';
import { EntretiensService } from './entretiens.service';
import { EntretiensController } from './entretiens.controller';
import { Sanction } from '../models/sanction.model';
import { SanctionsService } from './sanctions.service';
import { SanctionsController } from './sanctions.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        SequelizeModule.forFeature([Document, Formation, Employee, Entretien, Sanction, User]),
        NotificationsModule,
    ],
    controllers: [DocumentsController, FormationsController, EntretiensController, SanctionsController],
    providers: [DocumentsService, FormationsService, EntretiensService, SanctionsService],
    exports: [DocumentsService, FormationsService, EntretiensService, SanctionsService],
})
export class HrModule { }
