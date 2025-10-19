import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { paginate } from 'src/common/pagination'
import { convertToSlug, throwAppException } from 'src/common/utils'
import { Repository } from 'typeorm'
import { CreatePostCatalogDto } from './dtos/create-post-catalog.dto'
import { PaginatePostCatalogDto } from './dtos/paginate-post-catalog.dto'
import { PostCatalog } from './post-catalog.entity'
import { IPostCatalog } from './post-catalog.interface'
import { ErrorCode } from '@enums/error-codes.enum'
import { Post } from '@modules/post/post.entity'
import { PostCatalogType } from '@enums/post.enum'

@Injectable()
export class PostCatalogService {
  constructor(
    @InjectRepository(PostCatalog)
    private readonly postCatalogRepository: Repository<PostCatalog>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async create(createPostCatalogDto: CreatePostCatalogDto, type: PostCatalogType = PostCatalogType.BOTTOM): Promise<IPostCatalog> {
    const { name, parent_id } = createPostCatalogDto

    const postCatalogMaxIndex = await this.postCatalogRepository
      .createQueryBuilder('post_catalog')
      .select('MAX(post_catalog.index) as maxIndex')
      .getRawOne()

    let newIndex = 1.0001
    if (postCatalogMaxIndex?.maxIndex) {
      newIndex = postCatalogMaxIndex.maxIndex + 100
    }

    let parent: PostCatalog = null
    if (parent_id) {
      const exitParent = await this.postCatalogRepository
        .createQueryBuilder('post_catalog')
        .where('post_catalog.id = :id', { id: parent_id })
        .andWhere('post_catalog.type = :type', { type })
        .getOne()
      if (!exitParent) {
        throwAppException('POST_CATALOG_NOT_FOUND', ErrorCode.POST_CATALOG_NOT_FOUND, HttpStatus.NOT_FOUND)
      }
      parent = exitParent
    }
    const newPostCatalog = await this.postCatalogRepository.create({
      ...createPostCatalogDto,
      slug: convertToSlug(name),
      index: newIndex,
      parent,
      type,
    })

    return await this.postCatalogRepository.save(newPostCatalog)
  }

  async findAll(paginatePostCatalogDto: PaginatePostCatalogDto, isAdmin: boolean, type: PostCatalogType = PostCatalogType.BOTTOM): Promise<any> {
    const { parent_id, id, ...rest } = paginatePostCatalogDto
    const queryBuilder = this.postCatalogRepository
      .createQueryBuilder('post_catalog')
      .select([
        'post_catalog.id',
        'post_catalog.name',
        'post_catalog.slug',
        'post_catalog.index',
        'post_catalog.is_active',
        'post_catalog.parent_id',
        'post_catalog.icon',
        'post_catalog.image',
      ])
    if (!id && !parent_id) {
      queryBuilder.andWhere('post_catalog.parent_id IS NULL')
    }

    if (!isAdmin) {
      queryBuilder.andWhere('post_catalog.is_active = :is_active', { is_active: true })
    }
    if (parent_id) {
      queryBuilder.andWhere('post_catalog.parent_id = :parent_id', { parent_id })
    }
    if (id) {
      queryBuilder.andWhere('post_catalog.id = :id', { id })
    }
    if (type) {
      queryBuilder.andWhere('post_catalog.type = :type', { type })
    }
    const { data, meta } = await paginate(queryBuilder, rest)

    // Lấy cây đầy đủ cho mỗi catalog cấp cao nhất
    const dataWithChildren = await Promise.all(
      data.map(async catalog => {
        const children = await this.fetchChildren(catalog.id, isAdmin)
        return {
          id: catalog.id,
          name: catalog.name,
          slug: catalog.slug,
          index: catalog.index,
          is_active: catalog.is_active,
          icon: catalog.icon,
          image: catalog.image,
          parent: null,
          children,
        }
      }),
    )

    return {
      data: dataWithChildren,
      meta,
    }
  }

  // Hàm đệ quy để lấy con
  private async fetchChildren(parentId: number, isAdmin: boolean): Promise<any[]> {
    const children = await this.postCatalogRepository
      .createQueryBuilder('post_catalog')
      .select([
        'post_catalog.id',
        'post_catalog.name',
        'post_catalog.slug',
        'post_catalog.index',
        'post_catalog.is_active',
        'post_catalog.icon',
        'post_catalog.image',
      ])
      .where('post_catalog.parent_id = :parentId', { parentId })
      .andWhere(isAdmin ? '1=1' : 'post_catalog.is_active = :is_active', { is_active: true })
      .orderBy('post_catalog.index', 'ASC')
      .getMany()

    // Lấy con của mỗi con một cách đệ quy
    return Promise.all(
      children.map(async child => {
        const grandChildren = await this.fetchChildren(child.id, isAdmin)
        return {
          id: child.id,
          name: child.name,
          slug: child.slug,
          index: child.index,
          is_active: child.is_active,
          icon: child.icon,
          image: child.image,
          children: grandChildren,
        }
      }),
    )
  }

  async findAllPostCatalogByUser(paginatePostCatalogDto: PaginatePostCatalogDto, type: PostCatalogType = PostCatalogType.BOTTOM): Promise<any> {
    const { parent_id, id, ...rest } = paginatePostCatalogDto
    const queryBuilder = this.postCatalogRepository
      .createQueryBuilder('post_catalog')
      .select([
        'post_catalog.id',
        'post_catalog.name',
        'post_catalog.slug',
        'post_catalog.index',
        'post_catalog.is_active',
        'post_catalog.parent_id',
        'post_catalog.icon',
        'post_catalog.image',
      ])
    queryBuilder.andWhere('post_catalog.is_active = :is_active', { is_active: true })
    if (!id && !parent_id) {
      queryBuilder.andWhere('post_catalog.parent_id IS NULL')
    }

    if (parent_id) {
      queryBuilder.andWhere('post_catalog.parent_id = :parent_id', { parent_id })
    }
    if (id) {
      const rootCatalog = await this.findRootCatalog(Number(id))
      queryBuilder.andWhere('post_catalog.id = :id', { id: rootCatalog.id })
    }
    if (type) {
      queryBuilder.andWhere('post_catalog.type = :type', { type })
    }
    const { data, meta } = await paginate(queryBuilder, rest)

    // Lấy cây đầy đủ cho mỗi catalog cấp cao nhất
    const dataWithChildren = await Promise.all(
      data.map(async catalog => {
        const children = await this.fetchChildren(catalog.id, true)
        return {
          id: catalog.id,
          name: catalog.name,
          slug: catalog.slug,
          index: catalog.index,
          is_active: catalog.is_active,
          icon: catalog.icon,
          image: catalog.image,
          parent: null,
          children,
        }
      }),
    )

    return {
      data: dataWithChildren,
      meta,
    }
  }
  async findRootCatalog(id: number): Promise<PostCatalog> {
    let current = await this.postCatalogRepository.findOne({ where: { id }, relations: ['parent'] })

    while (current?.parent) {
      current = await this.postCatalogRepository.findOne({
        where: { id: current.parent.id },
        relations: ['parent'],
      })
    }

    return current
  }

  async findOne(id: number): Promise<IPostCatalog> {
    const exitPostCatalog = await this.postCatalogRepository.findOneBy({ id })
    if (!exitPostCatalog) {
      throwAppException('POST_CATALOG_NOT_FOUND', ErrorCode.POST_CATALOG_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return exitPostCatalog
  }

  async update(id: number, updatePostCatalogDto: CreatePostCatalogDto): Promise<void> {
    const { parent_id, name, icon, image } = updatePostCatalogDto
    const postCatalog = await this.postCatalogRepository
      .createQueryBuilder('post_catalogs')
      .leftJoin('post_catalogs.parent', 'parent')
      .select(['post_catalogs.id', 'post_catalogs.name', 'post_catalogs.parent_id'])
      .where('post_catalogs.id = :id', { id })
      .getOne()
    if (!postCatalog) {
      throwAppException('POST_CATALOG_NOT_FOUND', ErrorCode.POST_CATALOG_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const newPostCatalog = {
      name: name ? name : postCatalog.name,
      slug: name ? convertToSlug(name) : postCatalog.slug,
      parent: postCatalog.parent,
      icon: icon ? icon : postCatalog.icon,
      image: image ? image : postCatalog.image,
    }

    // if (name) {
    //   const exitName = await this.postCatalogRepository.findOneBy({ name })
    //   if (exitName) {
    //     throw new BadRequestException('Post catalog name already exists')
    //   }
    //   newPostCatalog.name = name
    //   newPostCatalog.slug = convertToSlug(name)
    // }
    if (parent_id) {
      const exitParent = await this.postCatalogRepository.findOneBy({ id: parent_id })
      if (!exitParent) {
        throwAppException('POST_CATALOG_NOT_FOUND', ErrorCode.POST_CATALOG_NOT_FOUND, HttpStatus.NOT_FOUND)
      }
      newPostCatalog.parent = exitParent
    }

    await this.postCatalogRepository.update(id, newPostCatalog)
    return
  }

  async updateActive(id: number): Promise<void> {
    const postCatalog = await this.postCatalogRepository
      .createQueryBuilder('post_catalogs')
      .select(['post_catalogs.id', 'post_catalogs.is_active'])
      .where('post_catalogs.id = :id', { id })
      .getOne()
    if (!postCatalog) {
      throwAppException('POST_CATALOG_NOT_FOUND', ErrorCode.POST_CATALOG_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    await this.postCatalogRepository
      .createQueryBuilder('post_catalogs')
      .update(PostCatalog)
      .set({ is_active: !postCatalog.is_active })
      .where('post_catalogs.id = :id', { id })
      .execute()
    return
  }

  async updateIndex(id: number, index: number): Promise<void> {
    const postCatalog = await this.postCatalogRepository
      .createQueryBuilder('post_catalogs')
      .select(['post_catalogs.id', 'post_catalogs.index'])
      .where('post_catalogs.id = :id', { id })
      .getOne()
    if (!postCatalog) {
      throwAppException('POST_CATALOG_NOT_FOUND', ErrorCode.POST_CATALOG_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    await this.postCatalogRepository
      .createQueryBuilder('post_catalogs')
      .update(PostCatalog)
      .set({ index })
      .where('post_catalogs.id = :id', { id })
      .execute()
    return
  }

  async remove(id: number): Promise<void> {
    const postCatalog = await this.postCatalogRepository.findOneBy({ id })
    if (!postCatalog) {
      throwAppException('POST_CATALOG_NOT_FOUND', ErrorCode.POST_CATALOG_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const post = await this.postRepository.createQueryBuilder('post').where('post.post_catalog_id = :id', { id }).getOne()
    if (post) {
      throwAppException('POST_CATALOG_HAS_POST', ErrorCode.POST_CATALOG_HAS_POST, HttpStatus.BAD_REQUEST)
    }
    await this.postCatalogRepository.delete(id)
    return
  }
}
