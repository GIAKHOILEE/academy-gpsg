import * as dotenv from 'dotenv'
dotenv.config()

export const jwtConfig = {
  jwtAlgorithm: process.env.JWT_ALGORITHM,
  accessToken: {
    secret: process.env.ACCESS_TOKEN_SECRET,
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
  },
  refreshToken: {
    secret: process.env.REFRESH_TOKEN_SECRET,
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  },
}
