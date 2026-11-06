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
  aiRequestsUsed?: number
}

export interface GeneratedImageResult {
  imageUrl: string | null
  imageSource: AiImageSource
  imagePrompt: string | null
  aiRequestsUsed?: number
}

export interface AiEditStyleOptions {
  textColor?: string
  backgroundColor?: string
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  fontSize?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

export interface AiEditedArticleResult {
  title: string
  description: string
  content: string
  editedSelectionHtml: string | null
  wordCount: number
  editMode: 'selection' | 'full'
  aiRequestsUsed: number
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

    const webRef = await this.fetchWebReferenceFromPrompt(prompt, sequenceNumber)
    const webReferenceBlock = webRef
      ? `\nNỘI DUNG THAM KHẢO TỪ ĐƯỜNG LINK ADMIN CUNG CẤP:
- Nguồn bài viết: ${webRef.sourceUrl}
- Tiêu đề gốc trên trang web: "${webRef.referenceTitle}"
- Nội dung trích xuất từ trang web:
${webRef.referenceText}
(Lưu ý: Hãy bám sát thông tin, nhân vật, sự kiện từ bài viết trên trang web này; nếu Admin yêu cầu giữ/copy tiêu đề hoặc ghi nguồn ở cuối bài thì thực hiện đúng theo yêu cầu).\n`
      : ''

    const userPrompt = `Yêu cầu từ Admin (Prompt): "${prompt}"
Danh mục / Chủ đề: "${categoryName || 'Chuyên mục Học viện'}"
Bài số: ${sequenceNumber}/${totalQuantity}.${webReferenceBlock}
Hãy viết bài hoàn chỉnh ngay bây giờ theo đúng cấu trúc nhãn phân cách.`

    const rawText = await this.callGeminiText(systemInstruction, userPrompt)
    let aiRequestsUsed = 1
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
        aiRequestsUsed++
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

    const wantsOriginalWebTitle = Boolean(webRef && /copy\s*title|giữ\s*nguyên\s*tiêu\s*đề|y\s*chang/i.test(prompt))
    const shortTitle = this.normalizeShortTitle(parsed.title || webRef?.referenceTitle || '', wantsOriginalWebTitle)
    content = this.beautifyArticleHtml(content, shortTitle)
    if (webRef && /ghi\s*nguồn|nguồn/i.test(prompt) && !/nguồn\s*:/i.test(content.slice(-500))) {
      content = `${content}\n<p style="text-align: right; margin-top: 18px;"><em><span style="font-size: 18px; color: #555555;">Nguồn: ${webRef.sourceUrl}</span></em></p>`
    }
    wordCount = this.countWords(content)

    return {
      title: shortTitle,
      description: parsed.description,
      content,
      wordCount,
      imagePrompt: parsed.imagePrompt,
      imageSearchKeywords: parsed.imageSearchKeywords,
      aiRequestsUsed,
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
    let aiRequestsUsed = 0

    // 1. Thử lần lượt các model gen ảnh (gemini-3.1-flash-lite-image -> gemini-2.5-flash-image)
    for (const model of this.imageModels) {
      try {
        aiRequestsUsed++
        const generated = await this.callGeminiImageModel(model, imagePrompt)
        if (generated?.buffer) {
          const uploadedUrl = await this.uploadBufferToServer(generated.buffer, generated.mimeType, moduleType)
          if (uploadedUrl) {
            this.logger.log(`Đã gen ảnh bằng ${model} và upload lên server: ${uploadedUrl}`)
            return {
              imageUrl: uploadedUrl,
              imageSource: AiImageSource.AI_GENERATED,
              imagePrompt,
              aiRequestsUsed,
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
      aiRequestsUsed,
    }
  }

  /**
   * Dùng AI chỉnh sửa nội dung bài viết (hoặc chỉnh sửa riêng 1 đoạn văn / vùng bôi đen từ FE):
   * - Hỗ trợ đổi màu chữ, màu nền, đổi căn lề (left, center, right, justify), đổi cỡ chữ, in đậm/in nghiêng/gạch chân.
   * - Hỗ trợ viết lại nội dung đoạn văn, mở rộng, rút gọn, đổi giọng văn theo prompt của Admin.
   * - Nếu có truyền selectedHtml (hoặc selectedText), AI sẽ sửa đúng đoạn đó và tự động ghép lại vào bài viết tổng thể.
   */
  async editArticleContent(params: {
    title?: string
    description?: string
    content: string
    selectedHtml?: string
    instruction?: string
    styleOptions?: AiEditStyleOptions
  }): Promise<AiEditedArticleResult> {
    const {
      title = '',
      description = '',
      content = '',
      selectedHtml,
      instruction = '',
      styleOptions = {},
    } = params

    const resolvedStyles: AiEditStyleOptions = {
      textColor: this.resolveCssColor(styleOptions.textColor),
      backgroundColor: this.resolveCssColor(styleOptions.backgroundColor),
      textAlign: styleOptions.textAlign,
      fontSize: this.resolveCssFontSize(styleOptions.fontSize),
      bold: styleOptions.bold,
      italic: styleOptions.italic,
      underline: styleOptions.underline,
    }

    const styleRequirementLines: string[] = []
    if (resolvedStyles.textColor) styleRequirementLines.push(`- Đổi màu chữ (color) thành: ${resolvedStyles.textColor}`)
    if (resolvedStyles.backgroundColor) styleRequirementLines.push(`- Đổi màu nền (background-color) thành: ${resolvedStyles.backgroundColor}`)
    if (resolvedStyles.textAlign) styleRequirementLines.push(`- Đổi căn lề (text-align) thành: ${resolvedStyles.textAlign}`)
    if (resolvedStyles.fontSize) styleRequirementLines.push(`- Đổi kích thước chữ (font-size) thành: ${resolvedStyles.fontSize}`)
    if (resolvedStyles.bold !== undefined) styleRequirementLines.push(`- Định dạng in đậm (strong): ${resolvedStyles.bold ? 'Bật (bọc <strong>)' : 'Tắt (bỏ <strong>)'}`)
    if (resolvedStyles.italic !== undefined) styleRequirementLines.push(`- Định dạng in nghiêng (em): ${resolvedStyles.italic ? 'Bật (bọc <em>)' : 'Tắt (bỏ <em>)'}`)
    if (resolvedStyles.underline !== undefined) styleRequirementLines.push(`- Định dạng gạch chân (u): ${resolvedStyles.underline ? 'Bật (bọc <u>)' : 'Tắt (bỏ <u>)'}`)

    const trimmedSelection = (selectedHtml || '').trim()
    const trimmedInstruction = (instruction || '').trim()

    // ==================== TRƯỜNG HỢP 1: CHỈNH SỬA RIÊNG 1 ĐOẠN ĐƯỢC CHỌN (SELECTION) ====================
    if (trimmedSelection) {
      const matchedBlock = this.findBlockBySelection(content, trimmedSelection)
      const snippetToEdit = matchedBlock || trimmedSelection

      let editedSnippet = snippetToEdit

      if (trimmedInstruction) {
        const systemPrompt = `Bạn là biên tập viên nội dung và chuyên gia thiết kế trình bày HTML cho Học Viện Công Giáo.
Nhiệm vụ của bạn là chỉnh sửa ĐOẠN HTML ĐƯỢC CHỌN theo đúng yêu cầu của Admin (đổi nội dung, đổi màu sắc, đổi căn lề, đổi cỡ chữ, đóng khung trích dẫn...).
Chỉ trả về duy nhất mã HTML của đoạn sau khi đã sửa (không dùng markdown \`\`\`html, không viết lời giải thích).`

        const userPrompt = `Đoạn HTML hiện tại cần chỉnh sửa:
${snippetToEdit}

Yêu cầu chỉnh sửa từ Admin:
"${trimmedInstruction}"
${styleRequirementLines.length > 0 ? `\nCác thiết lập định dạng bắt buộc áp dụng thêm:\n${styleRequirementLines.join('\n')}` : ''}

Quy tắc trình bày HTML:
- Sử dụng inline CSS trực tiếp trên thẻ <p>, <blockquote>, <span> (ví dụ: style="text-align: justify; line-height: 1.75; margin-bottom: 14px;" và <span style="font-size: 20px; color: rgb(0, 85, 255);">).
- Bảng màu chuẩn gợi ý nếu Admin nhắc tên màu:
  + Đỏ đô / đỏ: rgb(204, 0, 0)
  + Xanh dương / xanh đậm: rgb(0, 85, 255)
  + Xanh ngọc / xanh lam: rgb(0, 130, 153)
  + Nâu đỏ / nâu: rgb(153, 56, 0)
  + Xanh lá: rgb(0, 128, 64)
  + Tím: rgb(128, 0, 128)
  + Đen / chữ thường: #222222
- Nếu Admin chỉ yêu cầu đổi màu, căn lề hoặc cỡ chữ mà không yêu cầu sửa câu chữ, hãy giữ nguyên câu chữ gốc và chỉ cập nhật HTML/CSS.
- Nếu Admin yêu cầu viết lại, mở rộng, rút gọn hoặc thay đổi nội dung đoạn đó, hãy biên tập lại bằng tiếng Việt chuẩn mực, sâu sắc, giàu cảm xúc và áp dụng đúng định dạng HTML/CSS.`

        const rawEdited = await this.callGeminiText(systemPrompt, userPrompt)
        const cleaned = this.cleanHtmlContent(rawEdited)
        if (cleaned) {
          editedSnippet = cleaned
        }
      }

      // Đảm bảo áp dụng chính xác các tùy chọn style tường minh (nếu FE truyền kèm text_color, text_align, font_size...)
      editedSnippet = this.applyExplicitStylesToHtml(editedSnippet, resolvedStyles)

      const updatedFullContent = content
        ? this.replaceSelectionInHtml(content, trimmedSelection, matchedBlock, editedSnippet)
        : editedSnippet

      return {
        title: title ? this.normalizeShortTitle(title) : '',
        description,
        content: updatedFullContent,
        editedSelectionHtml: editedSnippet,
        wordCount: this.countWords(updatedFullContent),
        editMode: 'selection',
        aiRequestsUsed: 1,
      }
    }

    // ==================== TRƯỜNG HỢP 2: CHỈNH SỬA TRÊN TOÀN BỘ BÀI VIẾT ====================
    let nextTitle = title
    let nextDescription = description
    let nextContent = content

    if (trimmedInstruction) {
      const systemPrompt = `Bạn là Tổng biên tập và chuyên gia thiết kế HTML cho Học Viện Công Giáo.
Nhiệm vụ của bạn là chỉnh sửa bài viết HTML hiện có theo đúng yêu cầu của Admin (ví dụ: đổi màu chữ, đổi căn lề, đổi cỡ chữ, sửa nội dung một đoạn cụ thể, thêm/sửa trích dẫn, hoặc đổi tiêu đề).
Giữ nguyên các phần nội dung khác không nằm trong yêu cầu chỉnh sửa.`

      const userPrompt = `Thông tin bài viết hiện tại:
- TIÊU ĐỀ HIỆN TẠI: ${title || '(Chưa có)'}
- MÔ TẢ NGẮN HIỆN TẠI: ${description || '(Chưa có)'}
- NỘI DUNG HTML HIỆN TẠI:
${content}

YÊU CẦU CHỈNH SỬA TỪ ADMIN:
"${trimmedInstruction}"
${styleRequirementLines.length > 0 ? `\nCác thiết lập định dạng bắt buộc áp dụng:\n${styleRequirementLines.join('\n')}` : ''}

Quy tắc thực hiện:
1. Thực hiện chính xác yêu cầu của Admin (đổi màu sắc, căn lề left/center/right/justify, đổi kích thước font-size, sửa câu chữ đoạn được chỉ định, thêm trích dẫn...).
2. Bảng màu chuẩn gợi ý nếu Admin gọi tên màu:
   - Đỏ đô / đỏ: rgb(204, 0, 0)
   - Xanh dương / xanh đậm: rgb(0, 85, 255)
   - Xanh ngọc / xanh lam: rgb(0, 130, 153)
   - Nâu đỏ / nâu: rgb(153, 56, 0)
   - Xanh lá: rgb(0, 128, 64)
   - Tím: rgb(128, 0, 128)
   - Đen / chữ thường: #222222
3. Nếu Admin KHÔNG yêu cầu đổi tiêu đề thì giữ nguyên TIÊU ĐỀ HIỆN TẠI (hoặc đảm bảo tiêu đề ngắn gọn 4-9 từ).
4. Bảo toàn cấu trúc inline CSS đẹp mắt của toàn bộ bài viết. Không dùng markdown \`\`\`html.

BẮT BUỘC trả về đúng cấu trúc đánh dấu sau:
===TITLE===
(Tiêu đề bài viết ngắn gọn)
===DESCRIPTION===
(Mô tả ngắn của bài viết)
===CONTENT===
(Toàn bộ nội dung HTML của bài viết sau khi đã chỉnh sửa)`

      const rawResponse = await this.callGeminiText(systemPrompt, userPrompt)
      const parsed = this.parseStructuredOutput(rawResponse, trimmedInstruction, 1)

      if (parsed.title) {
        nextTitle = this.normalizeShortTitle(parsed.title)
      }
      if (parsed.description) {
        nextDescription = parsed.description
      }
      if (parsed.content) {
        nextContent = parsed.content
      }
    }

    if (styleRequirementLines.length > 0 && !trimmedInstruction) {
      nextContent = this.applyExplicitStylesToHtml(nextContent, resolvedStyles)
    }

    return {
      title: nextTitle ? this.normalizeShortTitle(nextTitle) : '',
      description: nextDescription,
      content: nextContent,
      editedSelectionHtml: null,
      wordCount: this.countWords(nextContent),
      editMode: 'full',
      aiRequestsUsed: 1,
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
      const cleanFallback = fallbackPrompt.replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim()
      title = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : `${(cleanFallback || 'Bài viết chuyên đề').slice(0, 50)} - Phần ${sequenceNumber}`
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
   * Chuẩn hóa tiêu đề ngắn gọn (4 - 10 từ, tối đa ~65 ký tự) hoặc giữ nguyên tiêu đề gốc từ trang web (tối đa 140 ký tự).
   * Luôn loại bỏ URL thô nếu có và đảm bảo không bao giờ vượt quá độ dài cột VARCHAR(255).
   */
  normalizeShortTitle(rawTitle: string, preserveWebTitle = false): string {
    let title = (rawTitle || '')
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/^["'#*-\s]+|["'*]+$/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!title) return 'Bài Viết Chuyên Đề Học Viện'

    if (preserveWebTitle) {
      return title.slice(0, 140).trim()
    }

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
   * Tự động phát hiện đường link (http/https) trong prompt của Admin,
   * tải nội dung bài viết (hoặc chọn bài viết cụ thể nếu link là trang danh mục) để cung cấp ngữ cảnh thực tế cho AI.
   */
  private async fetchWebReferenceFromPrompt(
    prompt: string,
    sequenceNumber = 1,
  ): Promise<{ sourceUrl: string; referenceTitle: string; referenceText: string } | null> {
    if (!prompt) return null
    const urlMatches = prompt.match(/https?:\/\/[^\s"'<>]+/gi)
    if (!urlMatches || urlMatches.length === 0) return null

    const rawUrl = urlMatches[0].replace(/[.,;)]+$/, '')
    let cleanUrl = rawUrl
    try {
      const parsedUrl = new URL(rawUrl)
      parsedUrl.searchParams.delete('fbclid')
      parsedUrl.searchParams.delete('gclid')
      for (const key of Array.from(parsedUrl.searchParams.keys())) {
        if (key.startsWith('utm_') || key.startsWith('_aem')) {
          parsedUrl.searchParams.delete(key)
        }
      }
      cleanUrl = parsedUrl.toString()
    } catch {
      cleanUrl = rawUrl
    }

    try {
      const html = await this.fetchHtmlWithTimeout(cleanUrl, 8000)
      if (!html) return null

      let targetUrl = cleanUrl
      let targetHtml = html

      // Kiểm tra xem trang này có phải trang danh sách chuyên mục (nhiều link bài viết con) hay không
      const articleLinks = this.extractArticleLinksFromListing(html, cleanUrl)
      if (articleLinks.length > 0) {
        const chosenLink = articleLinks[(Math.max(1, sequenceNumber) - 1) % articleLinks.length]
        const detailHtml = await this.fetchHtmlWithTimeout(chosenLink, 8000)
        if (detailHtml) {
          targetUrl = chosenLink
          targetHtml = detailHtml
        }
      }

      const h1Match = targetHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
      const titleTagMatch = targetHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      const extractedTitle = this.decodeHtmlEntities(
        (h1Match?.[1] || titleTagMatch?.[1] || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
        .split(/\s*[|–—-]\s*(?:Hội đồng Giám mục|HDGM|Trang chủ)/i)[0]
        .trim()

      const paragraphs: string[] = []
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
      let pMatch: RegExpExecArray | null
      while ((pMatch = pRegex.exec(targetHtml)) !== null) {
        const text = this.decodeHtmlEntities(
          pMatch[1]
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim(),
        )
        if (text.length >= 40) {
          paragraphs.push(text)
        }
      }

      const bodyText =
        paragraphs.length > 0
          ? paragraphs.join('\n\n').slice(0, 6000)
          : this.decodeHtmlEntities(
              targetHtml
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim(),
            ).slice(0, 4500)

      if (!extractedTitle && !bodyText) return null

      this.logger.log(`Đã đọc nội dung tham khảo từ link: ${targetUrl} (Tiêu đề: "${extractedTitle}")`)
      return {
        sourceUrl: targetUrl,
        referenceTitle: extractedTitle || 'Bài viết tham khảo',
        referenceText: bodyText,
      }
    } catch (err: any) {
      this.logger.warn(`Không thể tải nội dung từ URL trong prompt (${cleanUrl}): ${err?.message}`)
      return null
    }
  }

  private async fetchHtmlWithTimeout(url: string, timeoutMs = 8000): Promise<string | null> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
      })
      if (!response.ok) return null
      return await response.text()
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  private extractArticleLinksFromListing(html: string, baseUrl: string): string[] {
    try {
      const base = new URL(baseUrl)
      const basePath = base.pathname.replace(/\/$/, '')
      const hrefRegex = /<a[^>]+href\s*=\s*["']([^"'#]+)["'][^>]*>/gi
      const candidates: string[] = []
      const seen = new Set<string>()

      let match: RegExpExecArray | null
      while ((match = hrefRegex.exec(html)) !== null) {
        const rawHref = match[1].trim()
        if (!rawHref || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:')) continue
        try {
          const resolved = new URL(rawHref, base.origin)
          if (resolved.origin !== base.origin) continue
          const path = resolved.pathname.replace(/\/$/, '')
          if (!path || path === basePath) continue
          // Nhận diện các đường dẫn bài viết chi tiết (có slug dài hoặc nằm dưới chuyên mục /tin-tuc/, /chi-tiet/, /bai-viet/)
          const lastSegment = path.split('/').pop() || ''
          const looksLikeArticle =
            lastSegment.length > 18 &&
            lastSegment.includes('-') &&
            !/^page-\d+$/i.test(lastSegment) &&
            (path.startsWith(basePath + '/') || /\/(tin-tuc|bai-viet|chi-tiet|guong-chung-nhan)\//i.test(path))
          if (looksLikeArticle && !seen.has(resolved.toString())) {
            seen.add(resolved.toString())
            candidates.push(resolved.toString())
          }
        } catch {
          // ignore invalid href
        }
      }
      return candidates.slice(0, 25)
    } catch {
      return []
    }
  }

  private decodeHtmlEntities(text: string): string {
    if (!text) return ''
    return text
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#039;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
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

  /**
   * Quy đổi tên màu tiếng Việt / tiếng Anh thông dụng hoặc mã HEX/RGB về mã màu CSS hợp lệ.
   */
  resolveCssColor(rawColor?: string): string | undefined {
    if (!rawColor) return undefined
    const cleaned = rawColor.trim()
    if (!cleaned) return undefined

    const lower = cleaned.toLowerCase()
    const colorMap: Record<string, string> = {
      'đỏ': 'rgb(204, 0, 0)',
      'đỏ đô': 'rgb(204, 0, 0)',
      'đỏ sẫm': 'rgb(180, 0, 0)',
      'đỏ tươi': 'rgb(238, 0, 0)',
      red: 'rgb(204, 0, 0)',
      crimson: 'rgb(204, 0, 0)',
      'xanh': 'rgb(0, 85, 255)',
      'xanh dương': 'rgb(0, 85, 255)',
      'xanh biển': 'rgb(0, 85, 255)',
      'xanh đậm': 'rgb(0, 68, 204)',
      blue: 'rgb(0, 85, 255)',
      'xanh ngọc': 'rgb(0, 130, 153)',
      'xanh lam': 'rgb(0, 130, 153)',
      teal: 'rgb(0, 130, 153)',
      'nâu': 'rgb(153, 56, 0)',
      'nâu đỏ': 'rgb(153, 56, 0)',
      'nâu đất': 'rgb(139, 69, 19)',
      brown: 'rgb(153, 56, 0)',
      'xanh lá': 'rgb(0, 128, 64)',
      'xanh lục': 'rgb(0, 128, 64)',
      green: 'rgb(0, 128, 64)',
      'tím': 'rgb(128, 0, 128)',
      purple: 'rgb(128, 0, 128)',
      'cam': 'rgb(211, 84, 0)',
      'vàng cam': 'rgb(211, 84, 0)',
      orange: 'rgb(211, 84, 0)',
      'vàng': 'rgb(184, 134, 11)',
      'vàng đậm': 'rgb(184, 134, 11)',
      'vàng nhạt': '#fdfaf6',
      'kem': '#fdfaf6',
      'đen': '#222222',
      black: '#222222',
      'xám': '#555555',
      'ghi': '#555555',
      gray: '#555555',
      grey: '#555555',
    }

    return colorMap[lower] || cleaned
  }

  /**
   * Chuẩn hóa cỡ chữ về dạng có đơn vị px (ví dụ "22" -> "22px").
   */
  resolveCssFontSize(rawSize?: string): string | undefined {
    if (!rawSize) return undefined
    const cleaned = String(rawSize).trim()
    if (!cleaned) return undefined
    if (/^\d+(\.\d+)?$/.test(cleaned)) {
      return `${cleaned}px`
    }
    return cleaned
  }

  /**
   * Tìm khối HTML (<p>, <blockquote>, <h2>, <h3>) trong bài viết khớp với vùng văn bản/HTML mà người dùng bôi đen.
   */
  private findBlockBySelection(fullContent: string, selection: string): string | null {
    if (!fullContent || !selection) return null
    if (fullContent.includes(selection)) {
      // Nếu selection đã là thẻ block hoàn chỉnh thì dùng luôn
      if (/^<(p|blockquote|h[1-6]|div|ul|ol)\b/i.test(selection.trim())) {
        return selection
      }
    }

    const plainSelection = selection
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!plainSelection) return null

    const blockRegex = /<(p|blockquote|h[1-6])[^>]*>[\s\S]*?<\/\1>/gi
    let match: RegExpExecArray | null
    while ((match = blockRegex.exec(fullContent)) !== null) {
      const blockHtml = match[0]
      const blockPlain = blockHtml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (blockPlain && (blockPlain.includes(plainSelection) || plainSelection.includes(blockPlain))) {
        return blockHtml
      }
    }

    return null
  }

  /**
   * Ghép đoạn HTML đã được AI chỉnh sửa vào lại vị trí tương ứng trong toàn bộ bài viết.
   */
  private replaceSelectionInHtml(
    fullContent: string,
    rawSelection: string,
    matchedBlock: string | null,
    editedSnippet: string,
  ): string {
    if (!fullContent) return editedSnippet

    if (matchedBlock && fullContent.includes(matchedBlock)) {
      return fullContent.replace(matchedBlock, editedSnippet)
    }

    if (fullContent.includes(rawSelection)) {
      return fullContent.replace(rawSelection, editedSnippet)
    }

    // Fallback: so khớp theo plain text của từng đoạn
    const plainSelection = rawSelection
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (plainSelection) {
      const blockRegex = /<(p|blockquote|h[1-6])[^>]*>[\s\S]*?<\/\1>/gi
      let replaced = false
      const updated = fullContent.replace(blockRegex, blockHtml => {
        if (replaced) return blockHtml
        const blockPlain = blockHtml
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        if (blockPlain && (blockPlain.includes(plainSelection) || plainSelection.includes(blockPlain))) {
          replaced = true
          return editedSnippet
        }
        return blockHtml
      })
      if (replaced) return updated
    }

    return `${fullContent}\n${editedSnippet}`
  }

  /**
   * Áp dụng chính xác các tùy chọn định dạng tường minh (màu chữ, màu nền, căn lề, cỡ chữ, đậm, nghiêng, gạch chân)
   * lên đoạn HTML hoặc bài viết.
   */
  applyExplicitStylesToHtml(rawHtml: string, styleOptions: AiEditStyleOptions): string {
    const { textColor, backgroundColor, textAlign, fontSize, bold, italic, underline } = styleOptions
    if (
      !textColor &&
      !backgroundColor &&
      !textAlign &&
      !fontSize &&
      bold === undefined &&
      italic === undefined &&
      underline === undefined
    ) {
      return rawHtml
    }

    let html = rawHtml.trim()
    if (!html) return html

    // Nếu chuỗi truyền vào là plain text chưa có thẻ bao ngoài thì bọc vào <p><span>
    if (!/<[a-z][\s\S]*>/i.test(html)) {
      html = `<p style="text-align: ${textAlign || 'justify'}; line-height: 1.75; margin-bottom: 14px;"><span style="font-size: ${fontSize || '20px'}; color: ${textColor || '#222222'};">${html}</span></p>`
    }

    // 1. Cập nhật căn lề (text-align) và màu nền (background-color) trên các thẻ khối (<p>, <blockquote>, <h2>, <h3>, <div>)
    if (textAlign || backgroundColor) {
      html = html.replace(/<(p|blockquote|h[1-6]|div)([^>]*)>/gi, (fullMatch, tag, attrs) => {
        let nextAttrs = attrs || ''
        const styleMatch = nextAttrs.match(/style\s*=\s*"([^"]*)"/i)
        let styleStr = styleMatch ? styleMatch[1].trim() : ''

        if (textAlign) {
          if (/text-align\s*:/i.test(styleStr)) {
            styleStr = styleStr.replace(/text-align\s*:\s*[^;]+;?/gi, `text-align: ${textAlign};`)
          } else {
            styleStr = `text-align: ${textAlign}; ${styleStr}`.trim()
          }
        }

        if (backgroundColor) {
          if (/background-color\s*:/i.test(styleStr)) {
            styleStr = styleStr.replace(/background-color\s*:\s*[^;]+;?/gi, `background-color: ${backgroundColor};`)
          } else {
            styleStr = `${styleStr}; background-color: ${backgroundColor}; padding: 10px 16px; border-radius: 4px;`.replace(/^;\s*/, '')
          }
        }

        if (styleMatch) {
          nextAttrs = nextAttrs.replace(/style\s*=\s*"[^"]*"/i, `style="${styleStr}"`)
        } else {
          nextAttrs = `${nextAttrs} style="${styleStr}"`
        }
        return `<${tag}${nextAttrs}>`
      })

      // Nếu căn giữa hoặc căn phải thì bỏ khoảng trắng thụt đầu dòng &nbsp; để căn chuẩn
      if (textAlign === 'center' || textAlign === 'right') {
        html = html.replace(/(<span[^>]*>)(?:&nbsp;\s*)+/gi, '$1')
        html = html.replace(/(<p[^>]*>)(?:&nbsp;\s*)+/gi, '$1')
      }
    }

    // 2. Cập nhật màu chữ (color) và kích thước chữ (font-size) trên các thẻ <span> (hoặc thêm <span> nếu chưa có)
    if (textColor || fontSize) {
      if (/<span\b/i.test(html)) {
        html = html.replace(/<span([^>]*)>/gi, (fullMatch, attrs) => {
          let nextAttrs = attrs || ''
          const styleMatch = nextAttrs.match(/style\s*=\s*"([^"]*)"/i)
          let styleStr = styleMatch ? styleMatch[1].trim() : ''

          if (textColor) {
            if (/(^|;|\s)color\s*:/i.test(styleStr)) {
              styleStr = styleStr.replace(/(^|;|\s)color\s*:\s*[^;]+;?/gi, `$1color: ${textColor};`)
            } else {
              styleStr = `${styleStr}; color: ${textColor};`.replace(/^;\s*/, '')
            }
          }

          if (fontSize) {
            if (/font-size\s*:/i.test(styleStr)) {
              styleStr = styleStr.replace(/font-size\s*:\s*[^;]+;?/gi, `font-size: ${fontSize};`)
            } else {
              styleStr = `${styleStr}; font-size: ${fontSize};`.replace(/^;\s*/, '')
            }
          }

          if (styleMatch) {
            nextAttrs = nextAttrs.replace(/style\s*=\s*"[^"]*"/i, `style="${styleStr}"`)
          } else {
            nextAttrs = `${nextAttrs} style="${styleStr}"`
          }
          return `<span${nextAttrs}>`
        })
      } else {
        const spanStyles = [
          fontSize ? `font-size: ${fontSize};` : '',
          textColor ? `color: ${textColor};` : '',
        ]
          .filter(Boolean)
          .join(' ')
        html = html.replace(/<(p|blockquote|h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi, (_, tag, attrs, inner) => {
          return `<${tag}${attrs}><span style="${spanStyles}">${inner}</span></${tag}>`
        })
      }
    }

    // 3. Xử lý in đậm (bold), in nghiêng (italic), gạch chân (underline)
    if (bold === false) {
      html = html.replace(/<\/?(strong|b)\b[^>]*>/gi, '')
    } else if (bold === true && !/<(strong|b)\b/i.test(html)) {
      html = html.replace(/<(p|blockquote|h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi, '<$1$2><strong>$3</strong></$1>')
    }

    if (italic === false) {
      html = html.replace(/<\/?(em|i)\b[^>]*>/gi, '')
    } else if (italic === true && !/<(em|i)\b/i.test(html)) {
      html = html.replace(/<(p|blockquote|h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi, '<$1$2><em>$3</em></$1>')
    }

    if (underline === false) {
      html = html.replace(/<\/?u\b[^>]*>/gi, '')
    } else if (underline === true && !/<u\b/i.test(html)) {
      html = html.replace(/<(p|blockquote|h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi, '<$1$2><u>$3</u></$1>')
    }

    return html
  }
}

