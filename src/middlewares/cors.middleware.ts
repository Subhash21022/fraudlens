import cors from 'cors';
import { appConfig } from '../config';

export const corsMiddleware = () =>
   cors({
      // origin: appConfig.allowedOrigins,
      origin: appConfig.allowedOrigins,
      credentials: true,
   });
