import { Module } from '@nestjs/common';
import { SimpleSaasController } from './simple-saas.controller';

@Module({
  controllers: [SimpleSaasController],
  providers: [],
  exports: []
})
export class SaasModule {} 