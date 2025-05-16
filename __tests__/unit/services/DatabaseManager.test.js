import { jest } from '@jest/globals';
import {unifiedDatabaseManager} from "../../../src/services/db";
import { AsyncStorageService } from '../../../src/services/db/asyncStorage';

// Mock the repository implementations
jest.mock('../../../src/services/db/petRepository', () => ({
  PetRepository: jest.fn().mockImplementation(() => ({
    getAll: jest.fn().mockResolvedValue([
      { id: '1', name: 'Fluffy', species: 'cat' },
      { id: '2', name: 'Rex', species: 'dog' }
    ]),
    getById: jest.fn().mockImplementation((id) => 
      Promise.resolve({ id: id, name: id === '1' ? 'Fluffy' : 'Rex', species: id === '1' ? 'cat' : 'dog' })
    ),
    create: jest.fn().mockImplementation((pet) => 
      Promise.resolve({ id: '3', ...pet })
    ),
    update: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
  })),
}));

describe('DatabaseManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should successfully initialize the database', async () => {
      jest.spyOn(AsyncStorageService, 'setItem').mockResolvedValueOnce(undefined);
      
      await databaseManager.initialize();
      
      // Check if initialization flag was set
      expect(AsyncStorageService.setItem).toHaveBeenCalledWith('dbInitialized', true);
    });
  });

  describe('pet repository operations', () => {
    it('should retrieve all pets', async () => {
      const pets = await unifiedDatabaseManager.pets.getAll();
      
      expect(pets).toHaveLength(2);
      expect(pets[0].name).toBe('Fluffy');
      expect(pets[1].name).toBe('Rex');
    });

    it('should retrieve a pet by id', async () => {
      const pet = await unifiedDatabaseManager.pets.getById('1');
      
      expect(pet).not.toBeNull();
      expect(pet.id).toBe('1');
      expect(pet.name).toBe('Fluffy');
    });

    it('should create a new pet', async () => {
      const newPet = {
        name: 'Whiskers',
        species: 'cat',
        breed: 'Siamese'
      };
      
      const createdPet = await unifiedDatabaseManager.pets.create(newPet);
      
      expect(createdPet).not.toBeNull();
      expect(createdPet.id).toBe('3');
      expect(createdPet.name).toBe('Whiskers');
    });

    it('should update a pet', async () => {
      const result = await unifiedDatabaseManager.pets.update('1', { name: 'Updated Fluffy' });
      
      expect(result).toBe(true);
    });

    it('should delete a pet', async () => {
      const result = await unifiedDatabaseManager.pets.delete('1');
      
      expect(result).toBe(true);
    });
  });
}); 