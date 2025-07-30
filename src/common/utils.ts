import { Schedule } from '@enums/class.enum'
import { ErrorCode } from '@enums/error-codes.enum'
import { messages } from '@i18n/messages'
import { HttpStatus } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import * as fs from 'fs'
import * as handlebars from 'handlebars'
import { ClsServiceManager } from 'nestjs-cls'
import * as path from 'path'
import puppeteer from 'puppeteer'
// import { generatePdf } from 'html-pdf-node'
// import * as PDFDocument from 'pdfkit'
import { AppException } from './exeption'
import * as os from 'os'

export function generateHash(password: string): string {
  return bcrypt.hashSync(password, 10)
}

export function validateHash(password: string | undefined, hash: string | undefined): Promise<boolean> {
  if (!password || !hash) {
    return Promise.resolve(false)
  }

  return bcrypt.compare(password, hash)
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return bcrypt.hash(password, saltRounds)
}

export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '')
}

export function convertToSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function formatStringDate(stringDate: string): string {
  const date = new Date(stringDate)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${day}/${month}/${year} ${hours}:${minutes}`
}

export function generateRandomString(length = 5): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function getLocalizedMessage(message: string, lang: string): string {
  const translations = messages[lang] || messages.vi
  return translations[message] || message
}

export function throwAppException(message: string, code: ErrorCode, status = HttpStatus.BAD_REQUEST): never {
  const cls = ClsServiceManager.getClsService()
  const req = cls.get<Request>('request')
  const lang = req?.headers['accept-language']?.split(',')[0] || 'vi'
  const messageTranslated = getLocalizedMessage(message, lang)
  throw new AppException(messageTranslated, code, status)
}

export function mapScheduleToVietnamese(schedule: Schedule[]): string[] {
  const dayMap: { [key in Schedule]: string } = {
    [Schedule.SUNDAY]: 'Chủ nhật',
    [Schedule.MONDAY]: 'Hai',
    [Schedule.TUESDAY]: 'Ba',
    [Schedule.WEDNESDAY]: 'Tư',
    [Schedule.THURSDAY]: 'Năm',
    [Schedule.FRIDAY]: 'Sáu',
    [Schedule.SATURDAY]: 'Bảy',
  }

  return schedule.map(day => dayMap[day])
}

// gen pdf with library puppeteer
export async function renderPdfFromTemplate(templateName: string, data: any): Promise<Buffer> {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`)

  // Kiểm tra file tồn tại
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`)
  }

  // Đọc và biên dịch template
  const source = fs.readFileSync(templatePath, 'utf-8')
  const template = handlebars.compile(source)
  const html = template(data)
  // Dùng puppeteer để render HTML thành PDF

  const isLinux = os.platform() === 'linux'
  const browser = await puppeteer.launch({
    // headless: true, // dùng 'new' để tránh warning trên phiên bản mới
    // // args: ['--no-sandbox', '--disable-setuid-sandbox'], // để dùng được trên môi trường server
    executablePath: isLinux ? '/usr/bin/google-chrome' : undefined,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      // Thêm các args cho Alpine
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-sync',
      '--no-default-browser-check',
      '--disable-web-security',
    ],
  })

  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })

  const boundingBox = await page.evaluate(() => {
    const body = document.body
    const html = document.documentElement

    return {
      width: Math.max(body.scrollWidth, html.scrollWidth),
      height: Math.max(body.scrollHeight, html.scrollHeight),
    }
  })
  const pdfBuffer = await page.pdf({
    printBackground: true,
    preferCSSPageSize: true,
    width: `${boundingBox.width}px`,
    height: `${boundingBox.height}px`,
  })
  await browser.close()

  return Buffer.from(pdfBuffer)
}

// gen pdf with library html-pdf-node
// export async function renderPdfFromTemplateV2(templateName: string, data: any): Promise<Buffer> {
//   const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`)

//   if (!fs.existsSync(templatePath)) {
//     throw new Error(`Template file not found: ${templatePath}`)
//   }

//   const source = fs.readFileSync(templatePath, 'utf-8')
//   const template = handlebars.compile(source)
//   const html = template(data)

//   const file = { content: html }

//   const pdfBuffer = await generatePdf(file, { format: 'A4', printBackground: true })

//   return pdfBuffer
// }

// gen pdf with library js-layout
// export async function renderPdfFromTemplateV3(templateName: string, data: any): Promise<Buffer> {
//   const templatePath = path.join(__dirname, '..', 'templates', 'js-layout', `${templateName}.js`)

//   if (!fs.existsSync(templatePath)) {
//     throw new Error(`PDF template not found: ${templatePath}`)
//   }

//   const module = await import(templatePath)
//   const render = module.render || module.default

//   if (typeof render !== 'function') {
//     throw new Error(`render is not a function in ${templatePath}`)
//   }

//   const doc = new PDFDocument({ size: 'A4', margin: 50 })
//   const fontPath = path.resolve(__dirname, '..', 'fonts', 'Roboto-Regular.ttf')
//   doc.registerFont('Roboto', fontPath)
//   doc.font('Roboto')

//   const buffers: Buffer[] = []
//   doc.on('data', buffers.push.bind(buffers))

//   render(doc, data)

//   return new Promise(resolve => {
//     doc.end()
//     doc.on('end', () => {
//       resolve(Buffer.concat(buffers))
//     })
//   })
// }

export function arrayToObject(array: any[], key: string): any {
  return array.reduce((acc, item) => {
    acc[item[key]] = item
    return acc
  }, {})
}
