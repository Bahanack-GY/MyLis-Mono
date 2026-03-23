import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { TeamsService } from './teams.service';
import { Team } from '../models/team.model';

describe('TeamsService', () => {
  let service: TeamsService;
  let teamModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    teamModel = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: getModelToken(Team), useValue: teamModel },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  describe('create', () => {
    it('should create a team', async () => {
      const dto = { name: 'Alpha', leadId: 'emp-1' };
      const mockTeam = { id: '1', ...dto };
      teamModel.create.mockResolvedValue(mockTeam);

      const result = await service.create(dto);
      expect(teamModel.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTeam);
    });
  });

  describe('findAll', () => {
    it('should return all teams with employee members', async () => {
      const mockTeams = [{ id: '1', name: 'Alpha' }];
      teamModel.findAll.mockResolvedValue(mockTeams);

      const result = await service.findAll();
      expect(teamModel.findAll).toHaveBeenCalledWith({ include: expect.any(Array) });
      expect(result).toEqual(mockTeams);
    });
  });

  describe('findOne', () => {
    it('should find a team by id with members', async () => {
      const mockTeam = { id: '1', name: 'Alpha' };
      teamModel.findByPk.mockResolvedValue(mockTeam);

      const result = await service.findOne('1');
      expect(teamModel.findByPk).toHaveBeenCalledWith('1', { include: expect.any(Array) });
      expect(result).toEqual(mockTeam);
    });
  });
});
