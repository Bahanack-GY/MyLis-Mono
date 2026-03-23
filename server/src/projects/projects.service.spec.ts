import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ProjectsService } from './projects.service';
import { Project } from '../models/project.model';
import { ProjectMember } from '../models/project-member.model';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectModel: Record<string, jest.Mock>;
  let projectMemberModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    projectModel = {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    projectMemberModel = {
      findAll: jest.fn(),
      create: jest.fn(),
      destroy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getModelToken(Project), useValue: projectModel },
        { provide: getModelToken(ProjectMember), useValue: projectMemberModel },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  describe('findAll', () => {
    it('should return all projects with Client and Department includes', async () => {
      const mockProjects = [{ id: '1', name: 'Project A' }];
      projectModel.findAll.mockResolvedValue(mockProjects);

      const result = await service.findAll();
      expect(projectModel.findAll).toHaveBeenCalledWith({ include: expect.any(Array) });
      expect(result).toEqual(mockProjects);
    });
  });

  describe('findOne', () => {
    it('should find a project by id with includes', async () => {
      const mockProject = { id: '1', name: 'Project A' };
      projectModel.findByPk.mockResolvedValue(mockProject);

      const result = await service.findOne('1');
      expect(projectModel.findByPk).toHaveBeenCalledWith('1', { include: expect.any(Array) });
      expect(result).toEqual(mockProject);
    });

    it('should return null when project not found', async () => {
      projectModel.findByPk.mockResolvedValue(null);
      const result = await service.findOne('999');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a project', async () => {
      const dto = { name: 'New Project', budget: 10000, clientId: 'c-1', departmentId: 'd-1' };
      const mockProject = { id: '1', ...dto };
      projectModel.create.mockResolvedValue(mockProject);

      const result = await service.create(dto);
      expect(projectModel.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockProject);
    });
  });

  describe('update', () => {
    it('should update the project', async () => {
      const updated = [1, [{ id: '1', name: 'Updated' }]];
      projectModel.update.mockResolvedValue(updated);

      const result = await service.update('1', { name: 'Updated' });
      expect(projectModel.update).toHaveBeenCalledWith(
        { name: 'Updated' },
        { where: { id: '1' }, returning: true },
      );
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should destroy the project when found', async () => {
      const mockProject = { id: '1', destroy: jest.fn() };
      projectModel.findByPk.mockResolvedValue(mockProject);

      await service.remove('1');
      expect(mockProject.destroy).toHaveBeenCalled();
    });

    it('should do nothing when project not found', async () => {
      projectModel.findByPk.mockResolvedValue(null);
      await expect(service.remove('999')).resolves.toBeUndefined();
    });
  });

  describe('findByClient', () => {
    it('should return projects for a given client', async () => {
      const mockProjects = [{ id: '1', clientId: 'c-1' }];
      projectModel.findAll.mockResolvedValue(mockProjects);

      const result = await service.findByClient('c-1');
      expect(projectModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clientId: 'c-1' } }),
      );
      expect(result).toEqual(mockProjects);
    });
  });

  describe('findByDepartment', () => {
    it('should return projects for a given department', async () => {
      const mockProjects = [{ id: '1', departmentId: 'd-1' }];
      projectModel.findAll.mockResolvedValue(mockProjects);

      const result = await service.findByDepartment('d-1');
      expect(projectModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { departmentId: 'd-1' } }),
      );
      expect(result).toEqual(mockProjects);
    });
  });
});
