
import dotenv from 'dotenv';
 
dotenv.config();
 
interface Config {
  port: number;
  nodeEnv: string;
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  google: {
    clientId: string | undefined;
  };
  firebase: {
    projectId: string | undefined;
    clientEmail: string | undefined;
    privateKey: string | undefined;
  };
  jwt: {
    accessSecret: string | undefined;
    refreshSecret: string | undefined;
    accessExpires: string;
    refreshExpires: string;
  };
  frontendUrl: string;
  wompi: {
    publicKey: string | undefined;
    privateKey: string | undefined;
    baseUrl: string;
    webhookSecret: string | undefined;
  };
  brevo: {
    apiKey: string | undefined;
    webhookSecret: string | undefined;
  };
  exchangeRate: {
    apiUrl: string;
  };
}
 
export const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
 
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'construescala_hospitality',
  },
 
  // Se mantiene por compatibilidad; ya no se usa para login (lo reemplaza Firebase).
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
  },
 
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  },
 
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
 
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
 
  wompi: {
    publicKey: process.env.WOMPI_PUBLIC_KEY,
    privateKey: process.env.WOMPI_PRIVATE_KEY,
    baseUrl: process.env.WOMPI_BASE_URL || 'https://sandbox.wompi.co/v1',
    webhookSecret: process.env.WOMPI_WEBHOOK_SECRET,
  },
 
  brevo: {
    apiKey: process.env.BREVO_API_KEY,
    webhookSecret: process.env.BREVO_WEBHOOK_SECRET,
  },
 
  exchangeRate: {
    apiUrl: process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest/COP',
  },
};