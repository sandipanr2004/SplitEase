import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

// Google public certificates client for Firebase Auth validation
const jwks = jwksClient({
  jwksUri: 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
})

const getKey = (header: any, callback: any) => {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err)
    } else {
      const signingKey = key?.getPublicKey()
      callback(null, signingKey)
    }
  })
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string
    email?: string
  }
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' })
  }

  const token = authHeader.split(' ')[1]

  // Local development mock token verification
  if (token.startsWith('mock-token-')) {
    const uid = token.replace('mock-token-', '')
    req.user = { uid }
    return next()
  }

  // Real Firebase Auth ID Token validation
  const projectId = process.env.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID"
  
  jwt.verify(
    token, 
    getKey, 
    {
      algorithms: ['RS256'],
      audience: projectId !== 'YOUR_PROJECT_ID' ? projectId : undefined,
      issuer: projectId !== 'YOUR_PROJECT_ID' ? `https://securetoken.google.com/${projectId}` : undefined
    }, 
    (err, decoded: any) => {
      if (err) {
        console.error('Authentication Token Verification Failed:', err)
        return res.status(401).json({ error: 'Unauthorized: Invalid token session' })
      }
      
      req.user = {
        uid: decoded.sub,
        email: decoded.email
      }
      next()
    }
  )
}
