import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { paginate, PaginationDto } from 'src/common/pagination'
import { convertToSlug, throwAppException } from 'src/common/utils'
import { Repository } from 'typeorm'
import { CreatePostDto } from './dtos/create-post.dto'
import { PaginatePostDto } from './dtos/paginate-post.dto'
import { UpdatePostDto } from './dtos/update-post.dto'
import { Post } from './post.entity'
import { IPost } from './post.interface'
import { PostCatalog } from '../post-catalog/post-catalog.entity'
import { ErrorCode } from '@enums/error-codes.enum'
import { PostCatalogType } from '@enums/post.enum'
import { DataSource } from 'typeorm'

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostCatalog)
    private readonly postCatalogRepository: Repository<PostCatalog>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createPostDto: CreatePostDto): Promise<IPost> {
    const { title, content, image, post_catalog_id, description } = createPostDto

    const slug = convertToSlug(title)

    let catalog = null
    if (post_catalog_id) {
      catalog = await this.postCatalogRepository.findOne({ where: { id: post_catalog_id } })
      if (!catalog) {
        throwAppException('POST_CATALOG_NOT_FOUND', ErrorCode.POST_CATALOG_NOT_FOUND)
      }
    }

    const post = this.postRepository.create({
      title,
      slug,
      content,
      image,
      is_active: true,
      is_banner: true,
      post_catalog: catalog,
      description,
    })

    const savedPost = await this.postRepository.save(post)
    const formatPost = {
      id: savedPost.id,
      title: savedPost.title,
      slug: savedPost.slug,
      image: savedPost.image,
      is_active: savedPost.is_active,
      content: savedPost.content,
      description: savedPost.description,
      post_catalog: savedPost.post_catalog
        ? {
            id: savedPost.post_catalog.id,
            name: savedPost.post_catalog.name,
            slug: savedPost.post_catalog.slug,
          }
        : null,
    }
    return formatPost
  }

  async getManyPost(params: PaginatePostDto, isAdmin: boolean, type: PostCatalogType, isKiot: boolean): Promise<any> {
    const { is_banner, ...paginationParams } = params
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.post_catalog', 'post_catalog')
      .select([
        'post.id',
        'post.title',
        'post.slug',
        'post.image',
        'post.is_active',
        'post.is_banner',
        'post.description',
        'post_catalog.id',
        'post_catalog.name',
        'post_catalog.slug',
      ])

    if (isKiot) {
      queryBuilder.andWhere('post.is_kiot = :is_kiot', { is_kiot: true })
    }

    if (type) {
      queryBuilder.andWhere('post_catalog.type = :type', { type: type })
    } else {
      queryBuilder.andWhere('post.post_catalog IS NULL')
    }

    if (!isAdmin) {
      queryBuilder.andWhere('post.is_active = :is_active', { is_active: true })
    }

    if (is_banner) {
      queryBuilder.andWhere('post.is_banner = :is_banner', { is_banner: is_banner === 'true' })
    }

    const { data, meta } = await paginate(queryBuilder, paginationParams)

    const formatPost = data.map(post => {
      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        image: post.image,
        is_active: post.is_active,
        is_banner: post.is_banner,
        description: post.description,
        post_catalog: post.post_catalog
          ? {
              id: post.post_catalog.id,
              name: post.post_catalog.name,
              slug: post.post_catalog.slug,
            }
          : null,
      }
    })

    return {
      data: formatPost,
      meta,
    }
  }

  async getPostById(id: number): Promise<IPost> {
    const post = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.post_catalog', 'post_catalog')
      .where('post.id = :id', { id })
      .getOne()

    if (!post) {
      throwAppException('POST_NOT_FOUND', ErrorCode.POST_NOT_FOUND)
    }

    const formatPost = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      image: post.image,
      content: post.content,
      is_active: post.is_active,
      is_banner: post.is_banner,
      description: post.description,
      post_catalog: post.post_catalog
        ? {
            id: post.post_catalog.id,
            name: post.post_catalog.name,
            slug: post.post_catalog.slug,
          }
        : null,
    }
    return formatPost
  }

  async update(id: number, updatePostDto: UpdatePostDto): Promise<void> {
    const { title, post_catalog_id, ...postDto } = updatePostDto

    const post = await this.postRepository.createQueryBuilder('post').where('post.id = :id', { id }).getOne()

    if (!post) {
      throwAppException('POST_NOT_FOUND', ErrorCode.POST_NOT_FOUND)
    }

    let slug = post.slug
    if (title) {
      slug = convertToSlug(title)
    }

    let post_catalog = post.post_catalog
    if (post_catalog_id) {
      post_catalog = await this.postCatalogRepository.findOne({ where: { id: post_catalog_id } })
      if (!post_catalog) {
        throwAppException('POST_CATALOG_NOT_FOUND', ErrorCode.POST_CATALOG_NOT_FOUND)
      }
    }

    const newPost = {
      ...postDto,
      title: title || post.title,
      slug: slug || post.slug,
      post_catalog: post_catalog || post.post_catalog,
    }

    await this.postRepository.createQueryBuilder('post').update(Post).set(newPost).where('id = :id', { id }).execute()

    return
  }

  async updateIsActive(id: number): Promise<void> {
    const post = await this.postRepository.createQueryBuilder('post').select(['post.id', 'post.is_active']).where('post.id = :id', { id }).getOne()

    if (!post) {
      throwAppException('POST_NOT_FOUND', ErrorCode.POST_NOT_FOUND)
    }
    await this.postRepository.createQueryBuilder('post').update(Post).set({ is_active: !post.is_active }).where('id = :id', { id }).execute()
    return
  }

  async updateIsBanner(id: number): Promise<void> {
    const post = await this.postRepository.createQueryBuilder('post').select(['post.id', 'post.is_banner']).where('post.id = :id', { id }).getOne()

    if (!post) {
      throwAppException('POST_NOT_FOUND', ErrorCode.POST_NOT_FOUND)
    }
    await this.postRepository.createQueryBuilder('post').update(Post).set({ is_banner: !post.is_banner }).where('id = :id', { id }).execute()
    return
  }

  async delete(id: number): Promise<void> {
    const existPost = await this.postRepository.createQueryBuilder('post').where('id = :id', { id }).getOne()
    if (!existPost) {
      throwAppException('POST_NOT_FOUND', ErrorCode.POST_NOT_FOUND)
    }
    await this.postRepository.createQueryBuilder('post').softDelete().where('id = :id', { id }).execute()
    return
  }

  async getPostSlice(pagination: PaginationDto): Promise<any> {
    const { page = 1, limit = 10, orderBy = 'created_at', orderDirection = 'DESC' } = pagination

    const offset = (page - 1) * limit

    const baseSql = `
      SELECT id, is_active, is_banner, title, thumbnail AS image, description, created_at, 'notifications' as source
      FROM notifications
      WHERE is_banner = true AND is_active = true
  
      UNION ALL
  
      SELECT id, is_active, is_banner, title, thumbnail AS image, description, created_at, 'events' as source
      FROM events
      WHERE is_banner = true AND is_active = true
  
      UNION ALL
  
      SELECT id, is_active, is_banner, title, image, description, created_at, 'post' as source
      FROM posts
      WHERE is_banner = true AND is_active = true AND post_catalog_id IS NULL AND deleted_at IS NULL
    `

    // Đếm tổng số
    const countSql = `SELECT COUNT(*) as total FROM (${baseSql}) as combined`

    const totalResult = await this.dataSource.query(countSql)
    const total = parseInt(totalResult[0]?.total || 0)

    // Lấy dữ liệu phân trang
    const dataSql = `
      SELECT * FROM (${baseSql}) as combined
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT ${limit}
      OFFSET ${offset}
    `

    const data = await this.dataSource.query(dataSql)

    const formatData = data.map(item => {
      return {
        id: item.id,
        title: item.title,
        image: item.image,
        description: item.description,
        created_at: item.created_at,
        source: item.source,
      }
    })
    return {
      data: formatData,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /*===========================================
  ================= KIOT ======================
  ============================================*/
  async createKiotPost(createKiotPostDto: CreatePostDto): Promise<IPost> {
    const { title, content, image, description } = createKiotPostDto

    const slug = convertToSlug(title)

    const post = this.postRepository.create({
      title,
      slug,
      content,
      image,
      is_active: true,
      is_banner: false,
      is_kiot: true,
      description,
    })

    const savedPost = await this.postRepository.save(post)
    const formatPost = {
      id: savedPost.id,
      title: savedPost.title,
      slug: savedPost.slug,
      image: savedPost.image,
      is_active: savedPost.is_active,
      content: savedPost.content,
      description: savedPost.description,
      post_catalog: savedPost.post_catalog
        ? {
            id: savedPost.post_catalog.id,
            name: savedPost.post_catalog.name,
            slug: savedPost.post_catalog.slug,
          }
        : null,
    }
    return formatPost
  }
}
