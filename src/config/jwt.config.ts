import * as dotenv from 'dotenv'
dotenv.config()

export const jwtConfig = {
  expiresIn: Number(process.env.JWT_EXPIRATION_TIME),
  secret: process.env.JWT_SECRET,
}
