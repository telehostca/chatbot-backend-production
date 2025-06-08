import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product], 'users'),
  ],
  exports: [
    TypeOrmModule
  ],
})
export class ProductsModule {} 