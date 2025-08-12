import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';

describe('AuthController', () => {
  let authController: AuthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthServiceService,
          useValue: {
            login: jest.fn(),
            createUser: jest.fn(),
            setupAccount: jest.fn(),
            seedDefaultAdmin: jest.fn(),
          },
        },
      ],
    }).compile();

    authController = app.get<AuthController>(AuthController);
  });

  describe('controller', () => {
    it('should be defined', () => {
      expect(authController).toBeDefined();
    });
  });
});
