import { ErrorCode } from '@enums/error-codes.enum'
import { messages } from '@i18n/messages'
import { HttpStatus } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { ClsServiceManager } from 'nestjs-cls'
import { AppException } from './exeption'
import { Schedule } from '@enums/class.enum'

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
    [Schedule.MONDAY]: 'Thứ 2',
    [Schedule.TUESDAY]: 'Thứ 3',
    [Schedule.WEDNESDAY]: 'Thứ 4',
    [Schedule.THURSDAY]: 'Thứ 5',
    [Schedule.FRIDAY]: 'Thứ 6',
    [Schedule.SATURDAY]: 'Thứ 7',
  }

  return schedule.map(day => dayMap[day])
}
