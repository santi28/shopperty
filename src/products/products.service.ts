import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

import { validate as isUUID } from 'uuid';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productsRepository.create(createProductDto);
      return await this.productsRepository.save(product);
    } catch (error) {
      this.handleDBExeptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, page = 0 } = paginationDto;

    return await this.productsRepository.find({
      take: limit,
      skip: page * limit,
      // TODO: Add relations
    });
  }

  async findOne(id: string) {
    let product: Product;

    if (isUUID(id)) product = await this.productsRepository.findOneBy({ id });
    else {
      const queryBuilder = this.productsRepository.createQueryBuilder();
      product = await queryBuilder.where('slug = :slug', { slug: id }).getOne();
    }

    if (!product) throw new NotFoundException('Product not found');

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productsRepository.preload({
      id,
      ...updateProductDto,
    });

    if (!product) throw new NotFoundException('Product not found');

    try {
      await this.productsRepository.save(product);
      return product;
    } catch (error) {
      this.handleDBExeptions(error);
    }
  }

  async remove(id: string) {
    const { affected } = await this.productsRepository.delete(id);

    if (!affected) throw new NotFoundException('Product not found');

    return { message: 'Product deleted' };
  }

  private handleDBExeptions(error: any) {
    if (error.code === '23505')
      throw new BadRequestException('Slug must be unique');

    this.logger.error(error);
    throw new InternalServerErrorException();
  }
}
