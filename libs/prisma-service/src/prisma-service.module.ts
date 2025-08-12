import { Global, Module } from '@nestjs/common';
import { PrismaServiceService } from './prisma-service.service';

@Global()
@Module({
  providers: [PrismaServiceService],
  exports: [PrismaServiceService],
})
export class PrismaServiceModule {}
