import { AiImageSource, AiModuleType, AiStatus } from '@enums/ai-content.enum'
import { PostCatalogType } from '@enums/post.enum'
import { PostCatalog } from '@modules/post-catalog/post-catalog.entity'
import { Post } from '@modules/post/post.entity'
import { Story } from '@modules/storys/story/story.entity'
import { Topic } from '@modules/storys/topic/topic.entity'
import { WitnessFaithMenu } from '@modules/witness-faiths/_witness-faith-menu/witness-faith-menu.entity'
import { WitnessFaith } from '@modules/witness-faiths/witness-faith.entity'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { CloudinaryService } from '@services/cloudinary/cloudinary.service'
import { AiContentService } from './ai-content.service'
import { AiContentBatch } from './entities/ai-content-batch.entity'
import { AiContentItem } from './entities/ai-content-item.entity'
import { GeminiAiService } from './gemini-ai.service'

describe('AiContentModule (GeminiAiService & AiContentService)', () => {
  let aiContentService: AiContentService
  let geminiAiService: GeminiAiService
  let cloudinaryService: jest.Mocked<Partial<CloudinaryService>>

  const createMockRepo = () => {
    const store: any[] = []
    let idSeq = 1
    return {
      _store: store,
      create: jest.fn(dto => ({ ...dto })),
      save: jest.fn(async entity => {
        if (Array.isArray(entity)) {
          return entity.map(e => {
            if (!e.id) e.id = idSeq++
            return e
          })
        }
        if (!entity.id) {
          entity.id = idSeq++
          entity.created_at = new Date()
          entity.updated_at = new Date()
          store.push(entity)
        } else {
          const idx = store.findIndex(x => x.id === entity.id)
          if (idx >= 0) store[idx] = { ...store[idx], ...entity }
          else store.push(entity)
        }
        return entity
      }),
      findOne: jest.fn(async ({ where }: any) => {
        return store.find(item => {
          return Object.entries(where || {}).every(([k, v]) => item[k] === v)
        })
      }),
      find: jest.fn(async ({ where }: any = {}) => {
        if (!where) return [...store]
        return store.filter(item => {
          return Object.entries(where).every(([k, v]: [string, any]) => {
            if (v && typeof v === 'object' && v._type === 'in') {
              return v._value.includes(item[k])
            }
            return item[k] === v
          })
        })
      }),
      update: jest.fn(async (id: number, partial: any) => {
        const idx = store.findIndex(x => x.id === id)
        if (idx >= 0) store[idx] = { ...store[idx], ...partial }
        return { affected: 1 }
      }),
      delete: jest.fn(async (id: number) => {
        const idx = store.findIndex(x => x.id === id)
        if (idx >= 0) store.splice(idx, 1)
        return { affected: 1 }
      }),
      count: jest.fn(async ({ where }: any = {}) => {
        if (!where) return store.length
        return store.filter(item => Object.entries(where).every(([k, v]) => item[k] === v)).length
      }),
      createQueryBuilder: jest.fn(() => {
        const qb: any = {
          alias: 'entity',
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          innerJoinAndSelect: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          addGroupBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getRawOne: jest.fn(async () => ({ maxIndex: 1, lastCompletedAt: null })),
          getRawMany: jest.fn(async () => []),
          getMany: jest.fn(async () => store.filter(x => x.status === AiStatus.PENDING)),
          getManyAndCount: jest.fn(async () => [store, store.length]),
        }
        return qb
      }),
    }
  }

  let batchRepo: ReturnType<typeof createMockRepo>
  let itemRepo: ReturnType<typeof createMockRepo>
  let storyRepo: ReturnType<typeof createMockRepo>
  let topicRepo: ReturnType<typeof createMockRepo>
  let witnessFaithRepo: ReturnType<typeof createMockRepo>
  let witnessFaithMenuRepo: ReturnType<typeof createMockRepo>
  let postRepo: ReturnType<typeof createMockRepo>
  let postCatalogRepo: ReturnType<typeof createMockRepo>

  beforeEach(async () => {
    batchRepo = createMockRepo()
    itemRepo = createMockRepo()
    storyRepo = createMockRepo()
    topicRepo = createMockRepo()
    witnessFaithRepo = createMockRepo()
    witnessFaithMenuRepo = createMockRepo()
    postRepo = createMockRepo()
    postCatalogRepo = createMockRepo()

    cloudinaryService = {
      uploadFileV2: jest.fn().mockResolvedValue('https://file.hvmv.edu.vn/uploaded_ai_image.png'),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiAiService,
        AiContentService,
        { provide: CloudinaryService, useValue: cloudinaryService },
        { provide: getRepositoryToken(AiContentBatch), useValue: batchRepo },
        { provide: getRepositoryToken(AiContentItem), useValue: itemRepo },
        { provide: getRepositoryToken(Story), useValue: storyRepo },
        { provide: getRepositoryToken(Topic), useValue: topicRepo },
        { provide: getRepositoryToken(WitnessFaith), useValue: witnessFaithRepo },
        { provide: getRepositoryToken(WitnessFaithMenu), useValue: witnessFaithMenuRepo },
        { provide: getRepositoryToken(Post), useValue: postRepo },
        { provide: getRepositoryToken(PostCatalog), useValue: postCatalogRepo },
      ],
    }).compile()

    aiContentService = module.get<AiContentService>(AiContentService)
    geminiAiService = module.get<GeminiAiService>(GeminiAiService)
  })

  it('counts words accurately excluding HTML tags', () => {
    const html = '<h2>Tiêu đề</h2><p>Đây là <strong>bài viết</strong> thử nghiệm có mười hai từ.</p>'
    expect(geminiAiService.countWords(html)).toBe(12)
  })

  it('creates a Story AI batch with dealine/promt aliases and creates PENDING placeholders in Story module', async () => {
    jest.spyOn(aiContentService, 'processNextQueuedItemIfReady').mockResolvedValue(null)
    await topicRepo.save({ id: 1, name: 'Chủ đề Đức Tin', description: 'Mô tả' })

    const result = await aiContentService.createStoryBatch({
      topic_id: 1,
      dealine: { start_day: '2026-11-06', end_day: '2026-11-10' },
      quantity: 3,
      is_image: true,
      promt: 'Viết 3 câu chuyện về lòng nhân ái',
    })

    expect(result.batch.module_type).toBe(AiModuleType.STORY)
    expect(result.batch.quantity).toBe(3)
    expect(result.batch.status).toBe(AiStatus.PENDING)
    expect(result.items).toHaveLength(3)

    // Kiểm tra bản ghi giữ chỗ trong bảng stories đã có ai_status = PENDING
    expect(storyRepo._store).toHaveLength(3)
    expect(storyRepo._store[0].ai_status).toBe(AiStatus.PENDING)
    expect(storyRepo._store[0].topic_id).toBe(1)

    // Kiểm tra Topic đã được cập nhật ai_status = PENDING
    const updatedTopic = await topicRepo.findOne({ where: { id: 1 } })
    expect(updatedTopic.ai_status).toBe(AiStatus.PENDING)
  })

  it('executes item generation (1000-3000 words + image upload) and inserts into WitnessFaith module', async () => {
    jest.spyOn(aiContentService, 'processNextQueuedItemIfReady').mockResolvedValue(null)
    await witnessFaithMenuRepo.save({ id: 2, name: 'Các Thánh Tử Đạo' })

    const longWords = Array.from({ length: 1250 }, (_, i) => `từ_${i + 1}`).join(' ')
    jest.spyOn(geminiAiService, 'generateArticleContent').mockResolvedValue({
      title: 'Chân dung Thánh Tử Đạo Việt Nam',
      description: 'Tóm tắt cuộc đời chứng nhân đức tin kiên trung.',
      content: `<h2>Phần 1</h2><p>${longWords}</p>`,
      wordCount: 1252,
      imagePrompt: 'Portrait of a Vietnamese saint in warm oil painting style',
      imageSearchKeywords: 'catholic saint portrait',
    })

    jest.spyOn(geminiAiService, 'generateOrFallbackImage').mockResolvedValue({
      imageUrl: 'https://file.hvmv.edu.vn/uploaded_ai_image.png',
      imageSource: AiImageSource.AI_GENERATED,
      imagePrompt: 'Portrait of a Vietnamese saint',
    })

    const created = await aiContentService.createWitnessFaithBatch({
      witness_faith_menu_id: 2,
      start_day: '2026-11-06',
      end_day: '2026-11-08',
      quantity: 1,
      is_image: true,
      prompt: 'Viết về các thánh tử đạo',
    })

    const itemId = created.items[0].id
    const generatedItem = await aiContentService.executeItemGeneration(itemId, true)

    expect(generatedItem.status).toBe(AiStatus.COMPLETED)
    expect(generatedItem.word_count).toBeGreaterThanOrEqual(1000)
    expect(generatedItem.word_count).toBeLessThanOrEqual(3000)
    expect(generatedItem.image_url).toBe('https://file.hvmv.edu.vn/uploaded_ai_image.png')
    expect(generatedItem.image_source).toBe(AiImageSource.AI_GENERATED)

    // Kiểm tra bản ghi trong module WitnessFaith đã được cập nhật đầy đủ và ai_status = COMPLETED
    const wfRecord = witnessFaithRepo._store[0]
    expect(wfRecord.name).toBe('Chân dung Thánh Tử Đạo Việt Nam')
    expect(wfRecord.image).toBe('https://file.hvmv.edu.vn/uploaded_ai_image.png')
    expect(wfRecord.ai_status).toBe(AiStatus.COMPLETED)
  })

  it('creates PostCatalogTop batch and syncs updates between AI article management API and Post module', async () => {
    jest.spyOn(aiContentService, 'processNextQueuedItemIfReady').mockResolvedValue(null)
    await postCatalogRepo.save({
      id: 5,
      name: 'Giới thiệu khóa học Thần học',
      slug: 'gioi-thieu-khoa-hoc-than-hoc',
      type: PostCatalogType.TOP,
    })

    const created = await aiContentService.createPostCatalogTopBatch({
      post_catalog_id: 5,
      start_day: '2026-11-06',
      end_day: '2026-11-10',
      quantity: 1,
      is_image: false,
      prompt: 'Viết bài giới thiệu khóa học thần học',
    })

    const articleId = created.items[0].id
    await aiContentService.updateArticle(articleId, {
      title: 'Khóa học Thần học Căn bản 2026',
      description: 'Mô tả khóa học thần học',
      content: '<p>Nội dung khóa học...</p>',
      image_url: 'https://example.com/course.jpg',
    })

    const postRecord = postRepo._store[0]
    expect(postRecord.title).toBe('Khóa học Thần học Căn bản 2026')
    expect(postRecord.image).toBe('https://example.com/course.jpg')
    expect(postRecord.post_catalog_id).toBe(5)
  })

  it('edits generated article content by AI (color, alignment, font size, selected paragraph) and syncs to module', async () => {
    jest.spyOn(aiContentService, 'processNextQueuedItemIfReady').mockResolvedValue(null)
    await postCatalogRepo.save({
      id: 6,
      name: 'Đào tạo Mục vụ',
      slug: 'dao-tao-muc-vu',
      type: PostCatalogType.TOP,
    })

    const created = await aiContentService.createPostCatalogTopBatch({
      post_catalog_id: 6,
      start_day: '2026-11-06',
      end_day: '2026-11-10',
      quantity: 1,
      is_image: false,
      prompt: 'Viết bài về mục vụ',
    })

    const articleId = created.items[0].id
    await aiContentService.updateArticle(articleId, {
      title: 'Đồng Hành Mục Vụ',
      description: 'Mô tả ngắn',
      content:
        '<p style="text-align: justify;"><span style="font-size: 20px; color: #222222;">Đoạn một giữ nguyên.</span></p>\n<p style="text-align: justify;"><span style="font-size: 20px; color: #222222;">Đoạn hai cần đổi màu và căn giữa.</span></p>',
    })

    const editRes = await aiContentService.aiEditArticleById(articleId, {
      selected_text: 'Đoạn hai cần đổi màu và căn giữa.',
      text_color: 'đỏ đô',
      text_align: 'center',
      font_size: '24px',
      bold: true,
      auto_save: true,
    })

    expect(editRes.edit_mode).toBe('selection')
    expect(editRes.auto_saved).toBe(true)
    expect(editRes.edited_selection_html).toContain('text-align: center')
    expect(editRes.edited_selection_html).toContain('color: rgb(204, 0, 0)')
    expect(editRes.edited_selection_html).toContain('font-size: 24px')
    expect(editRes.edited_selection_html).toContain('<strong>')
    expect(editRes.content).toContain('Đoạn một giữ nguyên.')
    expect(editRes.content).toContain('color: rgb(204, 0, 0)')
    expect(editRes.ai_request_count).toBeGreaterThanOrEqual(1)

    // Kiểm tra bản ghi trong bảng posts đã được đồng bộ nội dung mới và ai_request_count
    const postRecord = postRepo._store[0]
    expect(postRecord.content).toContain('color: rgb(204, 0, 0)')
    expect(postRecord.content).toContain('text-align: center')
    expect(postRecord.ai_request_count).toBe(editRes.ai_request_count)
  })

  it('handles prompts starting with very long URLs (>250 chars) without exceeding column name/title length', async () => {
    jest.spyOn(aiContentService, 'processNextQueuedItemIfReady').mockResolvedValue(null)
    await witnessFaithMenuRepo.save({ id: 3, name: 'Gương Chứng Nhân' })

    const res = await aiContentService.createBatch({
      module_type: AiModuleType.WITNESS_FAITH,
      category_id: 3,
      start_day: '2026-11-06',
      end_day: '2026-11-13',
      quantity: 1,
      is_image: false,
      prompt:
        'https://hdgmvietnam.com/tin-tuc/guong-chung-nhan?fbclid=IwY2xjawVajoxleHRuA2FlbQIxMABwZG9mBWJyaWQRMWhOMThtUng2YUo4VWVMOTZzcnRjBmFwcF9pZBAyMjIwMzkxNzg4MjAwODkyAAEf2-WO4mMKOuRWR4LT5bbVjgw2m_aPxGceeQlvBeMGIjjOiVU5D3KZ74na5YU_aem_6U_T77OlkVT6LJ8_T_zKvg\n\nBạn vô trang web link phía trên đọc 1 bài Thánh có tiêu đề về một vị thánh cụ thể. Có thể copy title y chang bài viết trong web đó từ định dạng màu sắc bài viết đó. Chốt cuối bài nhớ ghi nguồn đã lấy từ đâu nhé',
      interval_minutes: 1,
    })

    expect(res.items).toHaveLength(1)
    expect(res.items[0].title.length).toBeLessThanOrEqual(120)
    expect(res.items[0].title).not.toContain('http')
    expect(witnessFaithRepo._store[0].name.length).toBeLessThanOrEqual(120)
  })
})

