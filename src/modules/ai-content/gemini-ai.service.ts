import { AiImageSource, AiModuleType } from '@enums/ai-content.enum'
import { Injectable, Logger } from '@nestjs/common'
import { CloudinaryService } from '@services/cloudinary/cloudinary.service'
import { Readable } from 'stream'

export interface GeneratedArticleResult {
  title: string
  description: string
  content: string
  wordCount: number
  imagePrompt: string
  imageSearchKeywords: string
}

export interface GeneratedImageResult {
  imageUrl: string | null
  imageSource: AiImageSource
  imagePrompt: string | null
}

const CURATED_FALLBACK_IMAGES: Record<AiModuleType, string[]> = {
  [AiModuleType.STORY]: [
    'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
  ],
  [AiModuleType.WITNESS_FAITH]: [
    'https://images.unsplash.com/photo-1548625361-16800b32f017?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1200&q=80',
  ],
  [AiModuleType.POST_CATALOG_TOP]: [
    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80',
  ],
}

@Injectable()
export class GeminiAiService {
  private readonly logger = new Logger(GeminiAiService.name)

  private readonly apiKey = process.env.GEMINI_API_KEY || ''
  private readonly contentModel = process.env.GEMINI_CONTENT_MODEL || 'gemini-3.5-flash-lite'
  private readonly imageModels = (process.env.GEMINI_IMAGE_MODELS || 'gemini-3.1-flash-lite-image,gemini-2.5-flash-image')
    .split(',')
    .map(m => m.trim())
    .filter(Boolean)
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models'

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  /**
   * Đếm số từ thực tế trong chuỗi văn bản/HTML (loại bỏ thẻ HTML).
   */
  countWords(text: string): number {
    if (!text) return 0
    const plain = text
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&[a-z0-9#]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!plain) return 0
    return plain.split(' ').filter(Boolean).length
  }

  /**
   * Sinh nội dung bài viết 1000-3000 từ bằng model gemini-3.5-flash-lite.
   */
  async generateArticleContent(params: {
    moduleType: AiModuleType
    categoryName: string
    prompt: string
    sequenceNumber: number
    totalQuantity: number
    existingTitles?: string[]
    minWords?: number
    maxWords?: number
  }): Promise<GeneratedArticleResult> {
    const {
      moduleType,
      categoryName,
      prompt,
      sequenceNumber,
      totalQuantity,
      existingTitles = [],
      minWords = 1000,
      maxWords = 3000,
    } = params

    const moduleGuide = this.getModuleWritingGuide(moduleType, categoryName)
    const avoidTitlesBlock =
      existingTitles.length > 0
        ? `\nCÁC TIÊU ĐỀ ĐÃ TẠO TRƯỚC ĐÓ (TUYỆT ĐỐI KHÔNG TRÙNG LẶP TIÊU ĐỀ HOẶC NỘI DUNG):\n${existingTitles
            .slice(-20)
            .map((t, i) => `${i + 1}. ${t}`)
            .join('\n')}\n`
        : ''

    const systemInstruction = `Bạn là biên tập viên và tác giả chuyên nghiệp của Học viện Mục vụ Tổng Giáo phận Sài Gòn.
Nhiệm vụ của bạn là viết bài viết chất lượng cao, sâu sắc, mạch lạc, giàu giá trị nhân văn và học thuật bằng tiếng Việt, được trình bày HTML đẹp mắt, chuẩn mực như bài báo chuyên khảo của Học viện.

${moduleGuide}

YÊU CẦU BẮT BUỘC VỀ TIÊU ĐỀ (TITLE):
- Tiêu đề (TITLE) PHẢI NGẮN GỌN, SÚC TÍCH, ẤN TƯỢNG: chỉ từ 4 đến 9 từ (tối đa 55 ký tự).
- TUYỆT ĐỐI KHÔNG viết tiêu đề dài dòng, KHÔNG dùng dấu hai chấm ":" để nối thêm vế phụ dài.
- Ví dụ tiêu đề chuẩn: "Nét Hòa Bình Trong Văn Hóa Việt Nam", "Nghệ Thuật Đồng Hành Mục Vụ", "Ánh Sáng Đức Tin Giữa Đời Thường", "Chị Thánh Têrêsa Với Người Trẻ".

YÊU CẦU BẮT BUỘC VỀ ĐỘ DÀI VÀ THIẾT KẾ GIAO DIỆN HTML (CONTENT):
1. Độ dài phần CONTENT phải đạt từ ${Math.max(1400, minWords + 300)} đến ${Math.min(2600, maxWords - 200)} từ (nằm trong khoảng ${minWords} - ${maxWords} từ).
2. Bài viết PHẢI được chia thành 5 - 7 phần lớn (I, II, III...), mỗi phần lớn có các mục nhỏ (1, 2...) và từ 3 - 5 đoạn văn phân tích chi tiết, dẫn chứng cụ thể, câu chuyện minh họa sinh động và bài học suy niệm sâu sắc.
3. Trình bày HTML (CONTENT) PHẢI có đầy đủ inline CSS (căn lề, cỡ chữ to nhỏ phân cấp, màu sắc hài hòa trang trọng) theo đúng chuẩn mẫu sau:
   - Mở đầu bài viết là Tiêu đề lớn căn giữa, chữ IN HOA đậm, cỡ 30px, màu đỏ đô:
     <p style="text-align: center; line-height: 1.4; margin-bottom: 6px;"><strong><span style="font-size: 30px; color: rgb(204, 0, 0);">[TIÊU ĐỀ BÀI VIẾT IN HOA]</span></strong></p>
   - Ngay dưới tiêu đề là dòng bút danh/nguồn căn phải, chữ nghiêng, cỡ 18px:
     <p style="text-align: right; margin-bottom: 20px;"><em><span style="font-size: 18px; color: #555555;">Ban Biên Tập Học Viện Mục Vụ</span></em></p>
   - Đoạn dẫn nhập (Sapo) căn đều 2 bên (justify), cỡ 20px, chữ nghiêng màu xanh đen (#1f3a52), thụt đầu dòng &nbsp;&nbsp;&nbsp;&nbsp;:
     <p style="text-align: justify; line-height: 1.75; margin-bottom: 18px;"><span style="font-size: 20px; color: #1f3a52;"><em>&nbsp;&nbsp;&nbsp;&nbsp;[Đoạn mở đầu khái quát toàn bài...]</em></span></p>
   - Tiêu đề các phần lớn (I, II, III, IV, V...) căn đều (justify), chữ IN HOA đậm, cỡ 22px, màu xanh dương đậm rgb(0, 85, 255):
     <p style="text-align: justify; margin-top: 24px; margin-bottom: 12px;"><strong><span style="color: rgb(0, 85, 255); font-size: 22px;">I. [TÊN PHẦN LỚN IN HOA]</span></strong></p>
   - Tiêu đề các mục nhỏ (1., 2., 3...) căn đều (justify), chữ đậm nghiêng, cỡ 20px, màu xanh ngọc rgb(0, 130, 153):
     <p style="text-align: justify; margin-top: 16px; margin-bottom: 10px;"><span style="font-size: 20px; color: rgb(0, 130, 153);"><strong><em>1. [Tên mục nhỏ]</em></strong></span></p>
   - Các đoạn văn nội dung (<p>) BẮT BUỘC căn đều 2 bên (text-align: justify), cỡ chữ 20px, line-height: 1.75, màu #222222, đầu mỗi đoạn có "&nbsp;&nbsp;&nbsp;&nbsp;" để thụt đầu dòng. Trong đoạn văn, hãy nhấn mạnh các ý chính bằng chữ đậm <strong>, chữ nghiêng <em> hoặc đổi màu tinh tế <span style="color: rgb(180, 40, 0);"><strong>...</strong></span>:
     <p style="text-align: justify; line-height: 1.75; margin-bottom: 14px;"><span style="font-size: 20px; color: #222222;">&nbsp;&nbsp;&nbsp;&nbsp;[Nội dung đoạn văn...]</span></p>
   - Các câu trích dẫn Kinh Thánh, lời danh ngôn hoặc điểm suy niệm nổi bật đặt trong khối trích dẫn căn giữa, chữ cỡ 20px màu nâu đỏ rgb(153, 56, 0):
     <blockquote style="text-align: center; margin: 20px auto; padding: 14px 24px; background-color: #fdfaf6; border-left: 4px solid #c0392b; border-radius: 4px;"><p style="text-align: center; line-height: 1.6; margin: 0;"><span style="font-size: 20px; color: rgb(153, 56, 0);"><strong><em>“[Nội dung câu trích dẫn...]”</em></strong></span></p></blockquote>
4. KHÔNG dùng thẻ <html>, <head>, <body> hay markdown \`\`\`.
5. Đây là bài viết thứ ${sequenceNumber} trên tổng số ${totalQuantity} bài của đợt tạo nội dung. Hãy chọn một góc nhìn, chủ đề cụ thể hoặc nhân vật/câu chuyện riêng biệt để bài viết hoàn toàn độc lập và mới mẻ.
${avoidTitlesBlock}

YÊU CẦU ĐỊNH DẠNG ĐẦU RA (BẮT BUỘC GIỮ ĐÚNG CÁC NHÃN PHÂN CÁCH SAU):
===TITLE===
(Tiêu đề bài viết bằng tiếng Việt thật ngắn gọn từ 4 - 9 từ, tối đa 55 ký tự, không có dấu ngoặc kép)
===DESCRIPTION===
(Đoạn mô tả tóm tắt ngắn gọn từ 2 - 3 câu bằng tiếng Việt, không chứa thẻ HTML)
===IMAGE_PROMPT===
(1 câu mô tả chi tiết bằng tiếng Anh để AI vẽ hình minh họa nghệ thuật, trang nhã, phù hợp nội dung bài viết, không chứa chữ trong ảnh)
===IMAGE_KEYWORDS===
(3 đến 5 từ khóa tiếng Anh ngắn gọn cách nhau bởi dấu cách để tìm kiếm ảnh minh họa liên quan trên kho ảnh quốc tế)
===CONTENT===
(Toàn bộ nội dung bài viết định dạng HTML đã được thiết kế inline style đẹp mắt, dài từ ${minWords} đến ${maxWords} từ)`

    const userPrompt = `Yêu cầu từ Admin (Prompt): "${prompt}"
Danh mục / Chủ đề: "${categoryName || 'Chuyên mục Học viện'}"
Bài số: ${sequenceNumber}/${totalQuantity}.
Hãy viết bài hoàn chỉnh ngay bây giờ theo đúng cấu trúc nhãn phân cách.`

    const rawText = await this.callGeminiText(systemInstruction, userPrompt)
    const parsed = this.parseStructuredOutput(rawText, prompt, sequenceNumber)

    let content = parsed.content
    let wordCount = this.countWords(content)

    // Nếu số từ chưa đạt tối thiểu (1000 từ), gọi bổ sung để mở rộng chiều sâu bài viết
    let expandAttempt = 0
    while (wordCount < minWords && expandAttempt < 2) {
      expandAttempt++
      const neededWords = Math.max(500, minWords - wordCount + 300)
      this.logger.log(
        `Bài "${parsed.title}" hiện có ${wordCount} từ (< ${minWords}). Đang mở rộng lần ${expandAttempt} thêm khoảng ${neededWords} từ...`,
      )
      const expansionPrompt = `Bài viết "${parsed.title}" thuộc chủ đề "${categoryName}" hiện có ${wordCount} từ, cần bổ sung thêm khoảng ${neededWords} - ${neededWords + 400} từ nữa để đạt độ dài chuẩn ${minWords} - ${maxWords} từ.
Yêu cầu gốc của Admin: "${prompt}".
Đoạn cuối hiện tại của bài viết:
${content.slice(-1200)}

Hãy viết tiếp từ 2 - 4 mục lớn nối tiếp mạch văn trên để phân tích sâu hơn, thêm câu chuyện thực tế, ý nghĩa ứng dụng và lời kết trọn vẹn.
YÊU CẦU ĐỊNH DẠNG INLINE STYLE:
- Mục lớn dùng: <p style="text-align: justify; margin-top: 24px; margin-bottom: 12px;"><strong><span style="color: rgb(0, 85, 255); font-size: 22px;">[TÊN MỤC LỚN IN HOA]</span></strong></p>
- Mục nhỏ dùng: <p style="text-align: justify; margin-top: 16px; margin-bottom: 10px;"><span style="font-size: 20px; color: rgb(0, 130, 153);"><strong><em>[Tên mục nhỏ]</em></strong></span></p>
- Đoạn văn dùng: <p style="text-align: justify; line-height: 1.75; margin-bottom: 14px;"><span style="font-size: 20px; color: #222222;">&nbsp;&nbsp;&nbsp;&nbsp;[Nội dung đoạn văn...]</span></p>
Chỉ trả về mã HTML của phần viết thêm (không lặp lại phần đã có, không dùng markdown \`\`\`).`

      try {
        const extraHtml = await this.callGeminiText(
          'Bạn là biên tập viên chuyên nghiệp. Chỉ trả về nội dung HTML nối tiếp có đầy đủ inline style (text-align: justify, font-size: 20px, color) bằng tiếng Việt.',
          expansionPrompt,
        )
        const cleanedExtra = this.cleanHtmlContent(extraHtml)
        if (cleanedExtra) {
          content = `${content}\n${cleanedExtra}`
          wordCount = this.countWords(content)
        }
      } catch (err: any) {
        this.logger.warn(`Không thể mở rộng thêm nội dung lần ${expandAttempt}: ${err?.message}`)
        break
      }
    }

    // Nếu vượt quá maxWords (3000 từ), cắt gọn theo đoạn văn </p> để đảm bảo nằm trong 1000-3000 từ
    if (wordCount > maxWords) {
      content = this.trimHtmlToMaxWords(content, maxWords)
    }

    const shortTitle = this.normalizeShortTitle(parsed.title)
    content = this.beautifyArticleHtml(content, shortTitle)
    wordCount = this.countWords(content)

    return {
      title: shortTitle,
      description: parsed.description,
      content,
      wordCount,
      imagePrompt: parsed.imagePrompt,
      imageSearchKeywords: parsed.imageSearchKeywords,
    }
  }

  /**
   * Tạo ảnh bằng gemini-3.1-flash-lite-image hoặc gemini-2.5-flash-image,
   * thành công thì upload thẳng lên server qua CloudinaryService (StorageService).
   * Nếu không gen được ảnh thì tự động tìm link ảnh trên mạng thế tạm vào.
   */
  async generateOrFallbackImage(params: {
    imagePrompt: string
    imageSearchKeywords: string
    moduleType: AiModuleType
    sequenceNumber?: number
    usedImageUrls?: string[]
  }): Promise<GeneratedImageResult> {
    const { imagePrompt, imageSearchKeywords, moduleType, sequenceNumber = 1, usedImageUrls = [] } = params

    // 1. Thử lần lượt các model gen ảnh (gemini-3.1-flash-lite-image -> gemini-2.5-flash-image)
    for (const model of this.imageModels) {
      try {
        const generated = await this.callGeminiImageModel(model, imagePrompt)
        if (generated?.buffer) {
          const uploadedUrl = await this.uploadBufferToServer(generated.buffer, generated.mimeType, moduleType)
          if (uploadedUrl) {
            this.logger.log(`Đã gen ảnh bằng ${model} và upload lên server: ${uploadedUrl}`)
            return {
              imageUrl: uploadedUrl,
              imageSource: AiImageSource.AI_GENERATED,
              imagePrompt,
            }
          }
        }
      } catch (error: any) {
        this.logger.warn(`Model gen ảnh ${model} không thành công (${error?.message}). Chuyển sang phương án tiếp theo...`)
      }
    }

    // 2. Fallback: Tìm link ảnh trên mạng thế tạm vào
    const fallbackUrl = await this.searchFallbackImageFromWeb(imageSearchKeywords, moduleType, sequenceNumber, usedImageUrls)
    this.logger.log(`Sử dụng link ảnh trên mạng thay thế: ${fallbackUrl}`)

    return {
      imageUrl: fallbackUrl,
      imageSource: AiImageSource.WEB_FALLBACK,
      imagePrompt,
    }
  }

  /* ============================== PRIVATE HELPERS ============================== */

  private getModuleWritingGuide(moduleType: AiModuleType, categoryName: string): string {
    switch (moduleType) {
      case AiModuleType.STORY:
        return `Bối cảnh Module STORY (Câu chuyện - Chủ đề "${categoryName}"):
- Viết một câu chuyện truyền cảm hứng, giàu cảm xúc, có cốt truyện rõ ràng (bối cảnh, nhân vật, tình huống thử thách, bước ngoặt nội tâm và thông điệp đức tin / nhân văn sâu sắc).
- Kết hợp tự sự sinh động với những đoạn suy ngẫm, phân tích giá trị sống và bài học thực tiễn cho người đọc.`
      case AiModuleType.WITNESS_FAITH:
        return `Bối cảnh Module WITNESS-FAITHS (Chứng nhân đức tin - Danh mục "${categoryName}"):
- Viết bài khắc họa chân dung, cuộc đời, biến cố lịch sử/đời thường và tấm gương sống đạo kiên trung của chứng nhân đức tin.
- Tiêu đề (TITLE) nên thể hiện rõ tên hoặc danh hiệu chứng nhân kèm chủ đề nổi bật.
- Phần DESCRIPTION tóm tắt ngắn gọn tiểu sử/điểm sáng của vị chứng nhân.`
      case AiModuleType.POST_CATALOG_TOP:
      default:
        return `Bối cảnh Module POST-CATALOG-TOP (Bài viết chuyên đề / Giới thiệu khóa học & Học thuật - Danh mục "${categoryName}"):
- Viết bài chuyên sâu, có tính hệ thống, học thuật kết hợp thực hành mục vụ, giới thiệu giá trị tri thức và định hướng đào tạo tại Học viện.
- Trình bày mạch lạc với các luận điểm rõ ràng, dẫn chứng thuyết phục và giá trị ứng dụng cao.`
    }
  }

  private async callGeminiText(systemInstruction: string, userPrompt: string): Promise<string> {
    const url = `${this.baseUrl}/${this.contentModel}:generateContent?key=${this.apiKey}`
    const body = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 16384,
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini (${this.contentModel}) HTTP ${response.status}: ${errText.slice(0, 300)}`)
    }

    const data: any = await response.json()
    const parts: any[] = data?.candidates?.[0]?.content?.parts || []
    const text = parts
      .filter(p => typeof p?.text === 'string' && !p?.thought)
      .map(p => p.text)
      .join('\n')
      .trim()

    if (!text) {
      throw new Error(`Gemini (${this.contentModel}) trả về nội dung rỗng`)
    }

    return text
  }

  private async callGeminiImageModel(model: string, imagePrompt: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const url = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`
    const fullPrompt = `Generate a high quality, artistic, warm, respectful editorial illustration (16:9 aspect ratio, no text or letters in the image): ${imagePrompt}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`)
    }

    const data: any = await response.json()
    const parts: any[] = data?.candidates?.[0]?.content?.parts || []
    for (const part of parts) {
      const inline = part?.inlineData || part?.inline_data
      if (inline?.data) {
        const mimeType = inline.mimeType || inline.mime_type || 'image/png'
        const buffer = Buffer.from(inline.data, 'base64')
        if (buffer.length > 0) {
          return { buffer, mimeType }
        }
      }
    }

    return null
  }

  private async uploadBufferToServer(buffer: Buffer, mimeType: string, moduleType: AiModuleType): Promise<string> {
    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png'
    const multerFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: `ai_${moduleType}_${Date.now()}.${ext}`,
      encoding: '7bit',
      mimetype: mimeType || 'image/png',
      size: buffer.length,
      buffer,
      stream: Readable.from(buffer),
      destination: '',
      filename: '',
      path: '',
    }

    return this.cloudinaryService.uploadFileV2(multerFile)
  }

  /**
   * Tìm kiếm link ảnh thực tế trên mạng (Wikimedia Commons -> Openverse -> Curated Unsplash)
   * khi model gen ảnh bị vượt quota hoặc lỗi.
   */
  async searchFallbackImageFromWeb(
    keywords: string,
    moduleType: AiModuleType,
    sequenceNumber: number = 1,
    usedImageUrls: string[] = [],
  ): Promise<string> {
    const usedSet = new Set(usedImageUrls.filter(Boolean))
    const defaultTopicQuery =
      moduleType === AiModuleType.WITNESS_FAITH
        ? 'catholic saint church portrait'
        : moduleType === AiModuleType.STORY
          ? 'christian faith light nature hope'
          : 'university library study books theology'

    const searchQueries = [keywords, defaultTopicQuery].filter(Boolean)

    // 1. Tìm trên Wikimedia Commons API
    for (const query of searchQueries) {
      try {
        const cleanQuery = query.replace(/[^\w\s]/g, ' ').trim()
        if (!cleanQuery) continue

        const wikiUrl =
          `https://commons.wikimedia.org/w/api.php?action=query&generator=search` +
          `&gsrsearch=${encodeURIComponent(`filetype:bitmap ${cleanQuery}`)}` +
          `&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime&format=json&origin=*`

        const res = await fetch(wikiUrl, {
          headers: { 'User-Agent': 'HVMAcademyAI/1.0 (https://hvmv.edu.vn)' },
          signal: AbortSignal.timeout(8000),
        })

        if (res.ok) {
          const data: any = await res.json()
          const pages: any[] = Object.values(data?.query?.pages || {})
          const candidates = pages
            .map(p => p?.imageinfo?.[0])
            .filter(info => info?.url && /^image\/(jpeg|jpg|png|webp)$/i.test(info?.mime || ''))
            .map(info => info.url as string)

          const unused = candidates.find(u => !usedSet.has(u))
          if (unused) return unused
          if (candidates.length > 0) return candidates[(sequenceNumber - 1) % candidates.length]
        }
      } catch (err: any) {
        this.logger.debug(`Wikimedia search fallback warning: ${err?.message}`)
      }
    }

    // 2. Tìm trên Openverse API
    for (const query of searchQueries) {
      try {
        const cleanQuery = query.replace(/[^\w\s]/g, ' ').trim()
        if (!cleanQuery) continue

        const openverseUrl = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(cleanQuery)}&page_size=10`
        const res = await fetch(openverseUrl, {
          headers: { 'User-Agent': 'HVMAcademyAI/1.0' },
          signal: AbortSignal.timeout(8000),
        })

        if (res.ok) {
          const data: any = await res.json()
          const results: any[] = data?.results || []
          const candidates = results.map(r => r?.url).filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
          const unused = candidates.find(u => !usedSet.has(u))
          if (unused) return unused
          if (candidates.length > 0) return candidates[(sequenceNumber - 1) % candidates.length]
        }
      } catch (err: any) {
        this.logger.debug(`Openverse search fallback warning: ${err?.message}`)
      }
    }

    // 3. Fallback danh sách ảnh chất lượng cao theo từng module
    const pool = CURATED_FALLBACK_IMAGES[moduleType] || CURATED_FALLBACK_IMAGES[AiModuleType.STORY]
    const unusedPool = pool.find(u => !usedSet.has(u))
    return unusedPool || pool[(sequenceNumber - 1) % pool.length]
  }

  private parseStructuredOutput(
    raw: string,
    fallbackPrompt: string,
    sequenceNumber: number,
  ): {
    title: string
    description: string
    imagePrompt: string
    imageSearchKeywords: string
    content: string
  } {
    const extractSection = (tag: string, nextTags: string[]): string => {
      const startRegex = new RegExp(`===${tag}===`, 'i')
      const startMatch = raw.match(startRegex)
      if (!startMatch || startMatch.index === undefined) return ''

      const contentStart = startMatch.index + startMatch[0].length
      const rest = raw.slice(contentStart)

      let minEnd = rest.length
      for (const nextTag of nextTags) {
        const nextMatch = rest.match(new RegExp(`===${nextTag}===`, 'i'))
        if (nextMatch && nextMatch.index !== undefined && nextMatch.index < minEnd) {
          minEnd = nextMatch.index
        }
      }
      return rest.slice(0, minEnd).trim()
    }

    let title = extractSection('TITLE', ['DESCRIPTION', 'IMAGE_PROMPT', 'IMAGE_KEYWORDS', 'CONTENT'])
    let description = extractSection('DESCRIPTION', ['IMAGE_PROMPT', 'IMAGE_KEYWORDS', 'CONTENT'])
    let imagePrompt = extractSection('IMAGE_PROMPT', ['IMAGE_KEYWORDS', 'CONTENT'])
    let imageSearchKeywords = extractSection('IMAGE_KEYWORDS', ['CONTENT'])
    let content = extractSection('CONTENT', [])

    if (!content) {
      content = this.cleanHtmlContent(raw)
    } else {
      content = this.cleanHtmlContent(content)
    }

    title = title
      .replace(/^["'#*-\s]+|["'*]+$/g, '')
      .replace(/<[^>]+>/g, '')
      .trim()

    if (!title) {
      const h1Match = content.match(/<h[12][^>]*>(.*?)<\/h[12]>/i)
      title = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : `${fallbackPrompt.slice(0, 80)} - Phần ${sequenceNumber}`
    }

    description = description.replace(/<[^>]+>/g, '').trim()
    if (!description) {
      const pMatch = content.match(/<p[^>]*>(.*?)<\/p>/i)
      description = pMatch
        ? pMatch[1]
            .replace(/<[^>]+>/g, '')
            .trim()
            .slice(0, 350)
        : title
    }

    if (!imagePrompt) {
      imagePrompt = `Peaceful spiritual and educational illustration representing: ${title}`
    }

    if (!imageSearchKeywords) {
      imageSearchKeywords = 'catholic faith church light study'
    }

    return {
      title,
      description,
      imagePrompt,
      imageSearchKeywords,
      content,
    }
  }

  /**
   * Chuẩn hóa tiêu đề ngắn gọn (4 - 10 từ, tối đa ~65 ký tự).
   * Nếu AI sinh tiêu đề có dấu ":" hoặc "–" kèm vế phụ dài thì lấy vế chính súc tích.
   */
  normalizeShortTitle(rawTitle: string): string {
    let title = (rawTitle || '')
      .replace(/^["'#*-\s]+|["'*]+$/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!title) return 'Bài Viết Chuyên Đề Học Viện'

    // Nếu có dấu ":", " - ", " – " hoặc giới từ nối phụ dài khi tổng số từ > 10, ưu tiên lấy vế chính ngắn gọn tự nhiên
    const words = title.split(' ')
    if (words.length > 10) {
      const splitParts = title.split(/\s*[:–—-]\s*/)
      const mainPart = splitParts[0]?.trim()
      if (mainPart && mainPart.split(' ').length >= 3 && mainPart.split(' ').length <= 10) {
        title = mainPart
      } else {
        const connectorMatch = title.match(/^(.{15,55}?)\s+(?:trong|giữa|trước|nhằm|để|cho|của\s+người|thời\s+đại)\s+/i)
        if (connectorMatch && connectorMatch[1].trim().split(' ').length >= 4) {
          title = connectorMatch[1].trim()
        } else {
          title = words.slice(0, 8).join(' ')
        }
      }
    }

    return title.slice(0, 80).trim()
  }

  /**
   * Chuẩn hóa & làm đẹp HTML theo đúng phong cách các bài viết mẫu trong DB:
   * - Có tiêu đề lớn căn giữa chữ đỏ đô (30px) + dòng bút danh căn phải (18px) ở đầu bài.
   * - Các tiêu đề mục lớn (<h2>) chuyển thành chữ xanh dương đậm (22px, rgb(0, 85, 255)).
   * - Các tiêu đề mục nhỏ (<h3>) chuyển thành chữ xanh ngọc đậm nghiêng (20px, rgb(0, 130, 153)).
   * - Các đoạn văn (<p>) chưa có inline style được căn đều 2 bên (text-align: justify), cỡ chữ 20px, line-height 1.75 và thụt lề đầu dòng.
   * - Các khối trích dẫn (<blockquote>) được đóng khung trang nhã, chữ màu nâu đỏ (rgb(153, 56, 0)).
   */
  beautifyArticleHtml(rawHtml: string, title: string): string {
    let html = this.cleanHtmlContent(rawHtml)

    // 1. Chuyển các thẻ <h2>...</h2> chưa style thành mục lớn màu xanh dương đậm 22px
    html = html.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, inner) => {
      const cleanInner = inner.replace(/<[^>]+>/g, '').trim().toUpperCase()
      return `<p style="text-align: justify; margin-top: 24px; margin-bottom: 12px;"><strong><span style="color: rgb(0, 85, 255); font-size: 22px;">${cleanInner}</span></strong></p>`
    })

    // 2. Chuyển các thẻ <h3>...</h3> chưa style thành mục nhỏ màu xanh ngọc đậm nghiêng 20px
    html = html.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, inner) => {
      const cleanInner = inner.replace(/<[^>]+>/g, '').trim()
      return `<p style="text-align: justify; margin-top: 16px; margin-bottom: 10px;"><span style="font-size: 20px; color: rgb(0, 130, 153);"><strong><em>${cleanInner}</em></strong></span></p>`
    })

    // 3. Làm đẹp các thẻ <blockquote> chưa có style
    html = html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
      const textOnly = inner.replace(/<[^>]+>/g, '').trim()
      return `<blockquote style="text-align: center; margin: 20px auto; padding: 14px 24px; background-color: #fdfaf6; border-left: 4px solid #c0392b; border-radius: 4px;"><p style="text-align: center; line-height: 1.6; margin: 0;"><span style="font-size: 20px; color: rgb(153, 56, 0);"><strong><em>“${textOnly.replace(/^[“"']+|[”"']+$/g, '')}”</em></strong></span></p></blockquote>`
    })

    // 4. Chuẩn hóa các thẻ <p> thuần chưa có style="text-align..."
    html = html.replace(/<p>([\s\S]*?)<\/p>/gi, (_, inner) => {
      const trimmed = inner.trim()
      if (!trimmed) return ''
      const hasIndent = trimmed.startsWith('&nbsp;')
      const indent = hasIndent ? '' : '&nbsp;&nbsp;&nbsp;&nbsp;'
      return `<p style="text-align: justify; line-height: 1.75; margin-bottom: 14px;"><span style="font-size: 20px; color: #222222;">${indent}${trimmed}</span></p>`
    })

    // 5. Đảm bảo đầu bài viết có Header tiêu đề lớn căn giữa màu đỏ đô + dòng bút danh căn phải giống mẫu trong DB
    const hasCenteredHeader = /font-size:\s*(28|30|32|34|36)px/i.test(html.slice(0, 600))
    if (!hasCenteredHeader && title) {
      const headerBlock = [
        `<p style="text-align: center; line-height: 1.4; margin-bottom: 6px;"><strong><span style="font-size: 30px; color: rgb(204, 0, 0);">${title.toUpperCase()}</span></strong></p>`,
        `<p style="text-align: right; margin-bottom: 20px;"><em><span style="font-size: 18px; color: #555555;">Ban Biên Tập Học Viện Mục Vụ</span></em></p>`,
      ].join('\n')
      html = `${headerBlock}\n${html}`
    }

    return html
  }

  private cleanHtmlContent(rawContent: string): string {
    return rawContent
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
  }

  private trimHtmlToMaxWords(html: string, maxWords: number): string {
    const paragraphs = html.split(/(?=<p[\s>]|<h[23][\s>]|<blockquote[\s>]|<ul[\s>]|<ol[\s>])/i)
    if (paragraphs.length <= 1) return html

    let accumulated = ''
    for (const part of paragraphs) {
      const candidate = accumulated ? `${accumulated}\n${part}` : part
      if (this.countWords(candidate) > maxWords) {
        break
      }
      accumulated = candidate
    }

    return accumulated || html
  }
}

