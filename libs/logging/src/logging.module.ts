import { Module, Global } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { PrismaModule } from '@app/prisma-service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
