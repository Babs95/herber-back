import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaServiceService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    console.log('🗃️ Base de données connectée avec Prisma');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🗃️ Connexion Prisma fermée');
  }
}
