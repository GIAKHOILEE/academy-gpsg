import { FooterEnum } from '@enums/footer.enum'

export interface IFooter {
  id: number
  title?: string
  content?: string
  type?: FooterEnum
}
