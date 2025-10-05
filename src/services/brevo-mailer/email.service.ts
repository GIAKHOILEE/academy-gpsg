import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import * as fs from 'fs'
import * as Handlebars from 'handlebars'
import * as path from 'path'
import { firstValueFrom } from 'rxjs'
import { IReceiver } from './receiver.interface'

export type Attachment = {
  filename: string
  content: Buffer
}

@Injectable()
export class BrevoMailerService {
  private readonly apiUrl = process.env.BREVO_API_URL
  constructor(private readonly httpService: HttpService) {}

  async sendMail(receivers: IReceiver[], subject: string, filePath: string, data: any, attachment?: Attachment, rawContent?: string) {
    console.log('sendMail', receivers, subject, filePath, data)

    try {
      const headers = {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      }

      let htmlContent = ''
      if (rawContent) {
        // nếu FE truyền content thẳng thì dùng luôn
        htmlContent = rawContent
      } else if (filePath) {
        // nếu có filePath thì load template HBS
        htmlContent = this.readAndSendHbs(filePath, data)
      }

      const emailData: any = {
        sender: {
          name: process.env.SENDER_NAME,
          email: process.env.SENDER_EMAIL,
        },
        to: receivers,
        subject: subject,
        htmlContent: htmlContent,
      }
      if (attachment) {
        emailData.attachment = [
          {
            name: attachment.filename,
            content: attachment.content.toString('base64'),
          },
        ]
      }

      const response = await firstValueFrom(this.httpService.post(this.apiUrl, emailData, { headers }))
      console.log('Email sent successfully:', response.data)
    } catch (error) {
      console.error('Error sending email:', error.response?.data || error.message)
      throw new Error('Failed to send email')
    }
  }

  readAndSendHbs(filePath: string, data: any) {
    const filePathResolved = path.resolve(__dirname, '../../templates', `${filePath}.hbs`)
    const fileContent = fs.readFileSync(filePathResolved, 'utf-8')
    const template = Handlebars.compile(fileContent)
    const htmlString = template(data)
    return htmlString
  }
}
