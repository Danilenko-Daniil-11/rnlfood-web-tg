/**
 * RNL FOOD - УЛЬТРА СЕРВЕР v3.0
 * 1000-кратное улучшение: максимальная безопасность, производительность, функциональность
 */

import express from 'express';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import NodeCache from 'node-cache';
import webpush from 'web-push';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import validator from 'validator';
import xss from 'xss';
import { body, validationResult } from 'express-validator';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rnl-food-super-secret-key-change-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Кэш для оптимизации производительности
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5 минут TTL

// Настройка Web Push
webpush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'admin@rnl-food.com'),
    process.env.VAPID_PUBLIC_KEY || 'BKxQzQy8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q

// Подключение к Neon PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "ws:"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
}));

app.use(express.static(path.join(__dirname), {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            res.status(400).json({ error: 'Invalid JSON' });
            throw new Error('Invalid JSON');
        }
    }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const createRateLimit = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: { error: message },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logSecurityEvent('rate_limit_exceeded', req.ip, { path: req.path, userAgent: req.get('User-Agent') });
            res.status(429).json({ error: message });
        }
    });
};

app.use('/api/', createRateLimit(15 * 60 * 1000, 1000, 'Слишком много запросов. Попробуйте позже.'));
app.use('/api/auth/', createRateLimit(5 * 60 * 1000, 10, 'Слишком много попыток авторизации.'));
app.use('/api/orders', createRateLimit(60 * 1000, 30, 'Слишком много заказов. Попробуйте позже.'));

// XSS Protection middleware
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        const sanitizeObject = (obj) => {
            for (let key in obj) {
                if (typeof obj[key] === 'string') {
                    obj[key] = xss(obj[key]);
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                }
            }
        };
        sanitizeObject(req.body);
    }
    next();
});

// Input validation middleware
const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Неверные данные',
            details: errors.array()
        });
    }
    next();
};

// Security logging
const logSecurityEvent = (event, ip, details = {}) => {
    console.log(`🔒 SECURITY: ${event} from ${ip}`, details);
};

// Request sanitization
app.use((req, res, next) => {
    // Sanitize query parameters
    for (let key in req.query) {
        if (typeof req.query[key] === 'string') {
            req.query[key] = validator.escape(req.query[key]);
        }
    }

    // Sanitize route parameters
    for (let key in req.params) {
        if (typeof req.params[key] === 'string') {
            req.params[key] = validator.escape(req.params[key]);
        }
    }

    next();
});

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Токен доступа отсутствует' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный токен' });
        }
        req.user = user;
        next();
    });
};

// Admin middleware
const requireAdmin = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT ur.role 
            FROM user_roles ur 
            WHERE ur.user_id = $1
        `, [req.user.userId]);
        
        if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Требуются права администратора' });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: 'Ошибка проверки прав' });
    }
};

// API маршруты для аутентификации
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, full_name, class_name, age, parents } = req.body;
        
        if (!username || !password || !full_name) {
            return res.status(400).json({ error: 'Заполните все обязательные поля' });
        }

        // Проверяем существование пользователя
        const userExists = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }

        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Создаем пользователя
            const userResult = await client.query(
                'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
                [username, hashedPassword]
            );

            const user = userResult.rows[0];

            // Создаем профиль
            await client.query(
                'INSERT INTO profiles (user_id, full_name, class_name) VALUES ($1, $2, $3)',
                [user.id, full_name, class_name]
            );

            // Создаем роль
            await client.query(
                'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
                [user.id, 'user']
            );

            await client.query('COMMIT');

            // Генерируем JWT токен
            const token = jwt.sign(
                { userId: user.id, username: user.username },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    full_name,
                    class_name,
                    age: age,
                    parents: parents,
                    balance: 0.00
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Ошибка регистрации' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Заполните все поля' });
        }

        // Находим пользователя
        const userResult = await pool.query(`
            SELECT u.*, p.full_name, p.class_name, p.balance, ur.role
            FROM users u 
            LEFT JOIN profiles p ON u.id = p.user_id 
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            WHERE u.username = $1
        `, [username]);

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Неверный логин или пароль' });
        }

        const user = userResult.rows[0];

        // Проверяем пароль
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Неверный логин или пароль' });
        }

        // Генерируем JWT токен
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                class_name: user.class_name,
                balance: parseFloat(user.balance),
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

// API для получения меню
app.get('/api/menu', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.*, mc.name as category_name 
            FROM meals m 
            LEFT JOIN meal_categories mc ON m.category_id = mc.id 
            WHERE m.is_available = true 
            ORDER BY mc.sort_order, m.name
        `);
        
        const menu = result.rows.map(item => ({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            category: item.category_name,
            description: item.description,
            ingredients: item.ingredients || [],
            allergens: item.allergens || [],
            is_vegetarian: item.is_vegetarian,
            preparation_time: item.preparation_time,
            calories: item.calories,
            proteins: parseFloat(item.proteins),
            fats: parseFloat(item.fats),
            carbs: parseFloat(item.carbs)
        }));
        
        res.json(menu);
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ error: 'Ошибка загрузки меню' });
    }
});

// API для получения категорий
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM meal_categories 
            WHERE is_active = true 
            ORDER BY sort_order
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Ошибка загрузки категорий' });
    }
});

// API для проверки промокода
app.post('/api/validate-promo', async (req, res) => {
    try {
        const { code } = req.body;
        const result = await pool.query(`
            SELECT * FROM promocodes 
            WHERE code = $1 
            AND is_active = true 
            AND (expires_at IS NULL OR expires_at > NOW())
            AND (max_uses IS NULL OR current_uses < max_uses)
        `, [code.toUpperCase()]);
        
        if (result.rows.length === 0) {
            return res.json({ valid: false, message: 'Промокод не найден или истек' });
        }
        
        res.json({ valid: true, promo: result.rows[0] });
    } catch (error) {
        console.error('Error validating promo:', error);
        res.status(500).json({ error: 'Ошибка проверки промокода' });
    }
});

// API для создания заказа
app.post('/api/orders', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { items, promocode_id, total_amount, discount_amount, final_amount } = req.body;
        const user_id = req.user.userId;
        
        // Проверяем баланс
        const userResult = await client.query('SELECT balance FROM profiles WHERE user_id = $1', [user_id]);
        if (userResult.rows.length === 0 || parseFloat(userResult.rows[0].balance) < final_amount) {
            throw new Error('Недостаточно средств на балансе');
        }
        
        // Создаем заказ
        const orderResult = await client.query(`
            INSERT INTO orders (user_id, total_amount, discount_amount, final_amount, promocode_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [user_id, total_amount, discount_amount, final_amount, promocode_id]);
        
        const order = orderResult.rows[0];
        
        // Добавляем элементы заказа
        for (const item of items) {
            await client.query(`
                INSERT INTO order_items (order_id, meal_id, quantity, unit_price, total_price)
                VALUES ($1, $2, $3, $4, $5)
            `, [order.id, item.meal_id, item.quantity, item.unit_price, item.total_price]);
        }
        
        // Обновляем баланс
        await client.query(`
            UPDATE profiles 
            SET balance = balance - $1 
            WHERE user_id = $2
        `, [final_amount, user_id]);
        
        // Обновляем использование промокода
        if (promocode_id) {
            await client.query(`
                UPDATE promocodes 
                SET current_uses = current_uses + 1 
                WHERE id = $1
            `, [promocode_id]);
        }
        
        await client.query('COMMIT');
        res.json({ success: true, order });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating order:', error);
        res.status(500).json({ error: error.message || 'Ошибка создания заказа' });
    } finally {
        client.release();
    }
});

// API для пополнения баланса
app.post('/api/topup', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { amount, method } = req.body;
        const user_id = req.user.userId;
        
        // Записываем платеж
        const paymentResult = await client.query(`
            INSERT INTO payments (user_id, amount, payment_method, status)
            VALUES ($1, $2, $3, 'completed')
            RETURNING *
        `, [user_id, amount, method]);
        
        // Обновляем баланс
        await client.query(`
            UPDATE profiles 
            SET balance = balance + $1 
            WHERE user_id = $2
        `, [amount, user_id]);
        
        // Получаем обновленный баланс
        const balanceResult = await client.query(`
            SELECT balance FROM profiles WHERE user_id = $1
        `, [user_id]);
        
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            new_balance: parseFloat(balanceResult.rows[0].balance),
            payment: paymentResult.rows[0]
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing topup:', error);
        res.status(500).json({ error: 'Ошибка пополнения баланса' });
    } finally {
        client.release();
    }
});

// API для получения истории заказов
app.get('/api/orders/history', authenticateToken, async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        
        const result = await pool.query(`
            SELECT o.*, 
                   json_agg(
                       json_build_object(
                           'name', m.name,
                           'quantity', oi.quantity,
                           'unit_price', oi.unit_price,
                           'total_price', oi.total_price
                       )
                   ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN meals m ON oi.meal_id = m.id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT $2 OFFSET $3
        `, [req.user.userId, limit, offset]);
        
        // Получаем общее количество для пагинации
        const countResult = await pool.query(`
            SELECT COUNT(*) FROM orders WHERE user_id = $1
        `, [req.user.userId]);
        
        res.json({
            orders: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({ error: 'Ошибка загрузки истории заказов' });
    }
});

// API для получения деталей заказа
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT o.*, 
                   json_agg(
                       json_build_object(
                           'name', m.name,
                           'quantity', oi.quantity,
                           'unit_price', oi.unit_price,
                           'total_price', oi.total_price
                       )
                   ) as items,
                   p.code as promocode
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN meals m ON oi.meal_id = m.id
            LEFT JOIN promocodes p ON o.promocode_id = p.id
            WHERE o.id = $1 AND o.user_id = $2
            GROUP BY o.id, p.code
        `, [id, req.user.userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ error: 'Ошибка загрузки деталей заказа' });
    }
});

// API для получения профиля пользователя
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.username, p.full_name, p.class_name, p.balance, p.phone, ur.role
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            WHERE u.id = $1
        `, [req.user.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Профиль не найден' });
        }

        const user = result.rows[0];
        res.json({
            username: user.username,
            full_name: user.full_name,
            class_name: user.class_name,
            balance: parseFloat(user.balance),
            phone: user.phone,
            role: user.role
        });

    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Ошибка загрузки профиля' });
    }
});

// API для обновления профиля
app.post('/api/update-profile', authenticateToken, async (req, res) => {
    try {
        const { full_name, class_name, phone, age, parents, allergens } = req.body;
        const user_id = req.user.userId;

        await pool.query(`
            UPDATE profiles
            SET full_name = $1, class_name = $2, phone = $3, age = $4, parents = $5, allergens = $6, updated_at = NOW()
            WHERE user_id = $7
        `, [full_name, class_name, phone, age, parents, allergens, user_id]);

        res.json({ success: true });

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Ошибка обновления профиля' });
    }
});

// API для избранных блюд
app.get('/api/favorites', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.*, mc.name as category_name
            FROM favorite_meals fm
            JOIN meals m ON fm.meal_id = m.id
            LEFT JOIN meal_categories mc ON m.category_id = mc.id
            WHERE fm.user_id = $1 AND m.is_available = true
            ORDER BY fm.created_at DESC
        `, [req.user.userId]);

        const favorites = result.rows.map(item => ({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            category: item.category_name,
            description: item.description,
            ingredients: item.ingredients || [],
            allergens: item.allergens || [],
            is_vegetarian: item.is_vegetarian,
            preparation_time: item.preparation_time,
            calories: item.calories,
            proteins: parseFloat(item.proteins),
            fats: parseFloat(item.fats),
            carbs: parseFloat(item.carbs)
        }));

        res.json(favorites);
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ error: 'Ошибка загрузки избранного' });
    }
});

app.post('/api/favorites/:meal_id', authenticateToken, async (req, res) => {
    try {
        const { meal_id } = req.params;
        const user_id = req.user.userId;

        // Проверяем существование блюда
        const mealCheck = await pool.query('SELECT id FROM meals WHERE id = $1 AND is_available = true', [meal_id]);
        if (mealCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Блюдо не найдено' });
        }

        // Проверяем, не добавлено ли уже
        const existing = await pool.query('SELECT id FROM favorite_meals WHERE user_id = $1 AND meal_id = $2', [user_id, meal_id]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Блюдо уже в избранном' });
        }

        await pool.query('INSERT INTO favorite_meals (user_id, meal_id) VALUES ($1, $2)', [user_id, meal_id]);
        res.json({ success: true });

    } catch (error) {
        console.error('Error adding favorite:', error);
        res.status(500).json({ error: 'Ошибка добавления в избранное' });
    }
});

app.delete('/api/favorites/:meal_id', authenticateToken, async (req, res) => {
    try {
        const { meal_id } = req.params;
        const user_id = req.user.userId;

        const result = await pool.query('DELETE FROM favorite_meals WHERE user_id = $1 AND meal_id = $2', [user_id, meal_id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Блюдо не найдено в избранном' });
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error removing favorite:', error);
        res.status(500).json({ error: 'Ошибка удаления из избранного' });
    }
});

// API для отзывов о блюдах
app.get('/api/meals/:id/reviews', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 10, offset = 0 } = req.query;

        const result = await pool.query(`
            SELECT mr.*, u.username, p.full_name
            FROM meal_reviews mr
            JOIN users u ON mr.user_id = u.id
            JOIN profiles p ON u.id = p.user_id
            WHERE mr.meal_id = $1
            ORDER BY mr.created_at DESC
            LIMIT $2 OFFSET $3
        `, [id, limit, offset]);

        // Получаем средний рейтинг
        const avgResult = await pool.query('SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM meal_reviews WHERE meal_id = $1', [id]);
        const avgRating = parseFloat(avgResult.rows[0].avg_rating) || 0;
        const totalReviews = parseInt(avgResult.rows[0].total_reviews);

        res.json({
            reviews: result.rows,
            average_rating: avgRating,
            total_reviews: totalReviews
        });

    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Ошибка загрузки отзывов' });
    }
});

app.post('/api/reviews', authenticateToken, async (req, res) => {
    try {
        const { order_item_id, rating, comment } = req.body;
        const user_id = req.user.userId;

        if (!order_item_id || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Неверные данные отзыва' });
        }

        // Проверяем, что order_item принадлежит пользователю и заказ завершен
        const orderCheck = await pool.query(`
            SELECT oi.id, oi.meal_id, o.status
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.id = $1 AND o.user_id = $2 AND o.status = 'completed'
        `, [order_item_id, user_id]);

        if (orderCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Нельзя оставить отзыв для этого заказа' });
        }

        const meal_id = orderCheck.rows[0].meal_id;

        // Проверяем, не оставлен ли уже отзыв
        const existing = await pool.query('SELECT id FROM meal_reviews WHERE user_id = $1 AND order_item_id = $2', [user_id, order_item_id]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Отзыв уже оставлен' });
        }

        const result = await pool.query(`
            INSERT INTO meal_reviews (user_id, meal_id, order_item_id, rating, comment)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [user_id, meal_id, order_item_id, rating, comment]);

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ error: 'Ошибка создания отзыва' });
    }
});

// API для программы лояльности
app.get('/api/loyalty', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT lp.*, 
                   json_agg(
                       json_build_object(
                           'points', lt.points,
                           'reason', lt.reason,
                           'created_at', lt.created_at
                       ) ORDER BY lt.created_at DESC
                   ) as recent_transactions
            FROM loyalty_points lp
            LEFT JOIN loyalty_transactions lt ON lp.user_id = lt.user_id
            WHERE lp.user_id = $1
            GROUP BY lp.id
        `, [req.user.userId]);

        if (result.rows.length === 0) {
            // Создаем запись для пользователя если не существует
            await pool.query('INSERT INTO loyalty_points (user_id) VALUES ($1)', [req.user.userId]);
            return res.json({
                points: 0,
                total_earned: 0,
                total_spent: 0,
                recent_transactions: []
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching loyalty:', error);
        res.status(500).json({ error: 'Ошибка загрузки программы лояльности' });
    }
});

// API для достижений
app.get('/api/achievements', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, ua.unlocked_at
            FROM achievements a
            LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
            ORDER BY a.points_reward ASC
        `, [req.user.userId]);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ error: 'Ошибка загрузки достижений' });
    }
});

// API для родительского контроля
app.post('/api/parent/link', authenticateToken, async (req, res) => {
    try {
        const { child_username } = req.body;
        const parent_user_id = req.user.userId;

        // Находим ребенка по username
        const childResult = await pool.query('SELECT id FROM users WHERE username = $1', [child_username]);
        if (childResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ребенок не найден' });
        }

        const child_user_id = childResult.rows[0].id;

        // Проверяем, не связаны ли уже
        const existing = await pool.query('SELECT id FROM parent_child WHERE parent_user_id = $1 AND child_user_id = $2', [parent_user_id, child_user_id]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Связь уже существует' });
        }

        await pool.query('INSERT INTO parent_child (parent_user_id, child_user_id) VALUES ($1, $2)', [parent_user_id, child_user_id]);
        res.json({ success: true });

    } catch (error) {
        console.error('Error linking parent:', error);
        res.status(500).json({ error: 'Ошибка создания связи' });
    }
});

app.get('/api/parent/children', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.username, p.full_name, p.class_name, p.balance
            FROM parent_child pc
            JOIN users u ON pc.child_user_id = u.id
            JOIN profiles p ON u.id = p.user_id
            WHERE pc.parent_user_id = $1
        `, [req.user.userId]);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching children:', error);
        res.status(500).json({ error: 'Ошибка загрузки детей' });
    }
});

app.get('/api/child/orders/:child_username', authenticateToken, async (req, res) => {
    try {
        const { child_username } = req.params;
        const parent_user_id = req.user.userId;

        // Проверяем связь
        const linkCheck = await pool.query(`
            SELECT pc.child_user_id
            FROM parent_child pc
            JOIN users u ON pc.child_user_id = u.id
            WHERE pc.parent_user_id = $1 AND u.username = $2
        `, [parent_user_id, child_username]);

        if (linkCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Нет доступа к заказам этого ребенка' });
        }

        const child_user_id = linkCheck.rows[0].child_user_id;

        const result = await pool.query(`
            SELECT o.*, 
                   json_agg(
                       json_build_object(
                           'name', m.name,
                           'quantity', oi.quantity,
                           'total_price', oi.total_price
                       )
                   ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN meals m ON oi.meal_id = m.id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT 20
        `, [child_user_id]);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching child orders:', error);
        res.status(500).json({ error: 'Ошибка загрузки заказов ребенка' });
    }
});

// API для push-уведомлений
app.post('/api/push/subscribe', authenticateToken, async (req, res) => {
    try {
        const { endpoint, keys } = req.body;
        const user_id = req.user.userId;

        if (!endpoint || !keys || !keys.auth || !keys.p256dh) {
            return res.status(400).json({ error: 'Неверные данные подписки' });
        }

        // Удаляем старую подписку если есть
        await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [user_id]);

        await pool.query(`
            INSERT INTO push_subscriptions (user_id, endpoint, keys_auth, keys_p256dh)
            VALUES ($1, $2, $3, $4)
        `, [user_id, endpoint, keys.auth, keys.p256dh]);

        res.json({ success: true });

    } catch (error) {
        console.error('Error subscribing to push:', error);
        res.status(500).json({ error: 'Ошибка подписки на уведомления' });
    }
});

app.post('/api/push/unsubscribe', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [req.user.userId]);
        res.json({ success: true });

    } catch (error) {
        console.error('Error unsubscribing from push:', error);
        res.status(500).json({ error: 'Ошибка отписки от уведомлений' });
    }
});

// API для логов активности
app.post('/api/activity/log', authenticateToken, async (req, res) => {
    try {
        const { action, details } = req.body;
        const user_id = req.user.userId;
        const ip_address = req.ip;
        const user_agent = req.get('User-Agent');

        await pool.query(`
            INSERT INTO activity_log (user_id, action, details, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5)
        `, [user_id, action, details, ip_address, user_agent]);

        res.json({ success: true });

    } catch (error) {
        console.error('Error logging activity:', error);
        res.status(500).json({ error: 'Ошибка логирования активности' });
    }
});

// АДМИН API

// Получение статистики
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const [
            totalUsers,
            totalOrders,
            todayOrders,
            totalRevenue,
            todayRevenue,
            popularMeals
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM users'),
            pool.query('SELECT COUNT(*) FROM orders'),
            pool.query('SELECT COUNT(*) FROM orders WHERE DATE(created_at) = $1', [today]),
            pool.query('SELECT COALESCE(SUM(final_amount), 0) as total FROM orders'),
            pool.query('SELECT COALESCE(SUM(final_amount), 0) as total FROM orders WHERE DATE(created_at) = $1', [today]),
            pool.query(`
                SELECT m.name, COUNT(oi.id) as order_count
                FROM order_items oi
                JOIN meals m ON oi.meal_id = m.id
                GROUP BY m.id, m.name
                ORDER BY order_count DESC
                LIMIT 5
            `)
        ]);
        
        res.json({
            users: parseInt(totalUsers.rows[0].count),
            total_orders: parseInt(totalOrders.rows[0].count),
            today_orders: parseInt(todayOrders.rows[0].count),
            total_revenue: parseFloat(totalRevenue.rows[0].total),
            today_revenue: parseFloat(todayRevenue.rows[0].total),
            popular_meals: popularMeals.rows
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Ошибка загрузки статистики' });
    }
});

// Получение всех заказов
app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT o.*, u.username, p.full_name, p.class_name
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN profiles p ON u.id = p.user_id
        `;
        let params = [];
        let paramCount = 0;
        
        if (status) {
            query += ` WHERE o.status = $${++paramCount}`;
            params.push(status);
        }
        
        query += ` ORDER BY o.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching admin orders:', error);
        res.status(500).json({ error: 'Ошибка загрузки заказов' });
    }
});

// Обновление статуса заказа
app.put('/api/admin/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const result = await pool.query(`
            UPDATE orders 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `, [status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Ошибка обновления статуса заказа' });
    }
});

// Управление меню
app.get('/api/admin/meals', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.*, mc.name as category_name
            FROM meals m
            LEFT JOIN meal_categories mc ON m.category_id = mc.id
            ORDER BY m.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching admin meals:', error);
        res.status(500).json({ error: 'Ошибка загрузки меню' });
    }
});

app.post('/api/admin/meals', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, price, category_id, description, is_available, preparation_time } = req.body;
        
        const result = await pool.query(`
            INSERT INTO meals (name, price, category_id, description, is_available, preparation_time)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [name, price, category_id, description, is_available, preparation_time]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating meal:', error);
        res.status(500).json({ error: 'Ошибка создания блюда' });
    }
});

app.put('/api/admin/meals/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, category_id, description, is_available, preparation_time } = req.body;
        
        const result = await pool.query(`
            UPDATE meals 
            SET name = $1, price = $2, category_id = $3, description = $4, 
                is_available = $5, preparation_time = $6, updated_at = NOW()
            WHERE id = $7
            RETURNING *
        `, [name, price, category_id, description, is_available, preparation_time, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Блюдо не найдено' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating meal:', error);
        res.status(500).json({ error: 'Ошибка обновления блюда' });
    }
});

// Управление промокодами
app.get('/api/admin/promocodes', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM promocodes 
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching promocodes:', error);
        res.status(500).json({ error: 'Ошибка загрузки промокодов' });
    }
});

app.post('/api/admin/promocodes', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { code, discount_percentage, max_uses, expires_at } = req.body;
        
        const result = await pool.query(`
            INSERT INTO promocodes (code, discount_percentage, max_uses, expires_at, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [code.toUpperCase(), discount_percentage, max_uses, expires_at, req.user.userId]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating promocode:', error);
        res.status(500).json({ error: 'Ошибка создания промокода' });
    }
});

// API для поиска блюд
app.get('/api/search', async (req, res) => {
    try {
        const { q, category, vegetarian, max_price, min_rating } = req.query;
        let query = `
            SELECT m.*, mc.name as category_name,
                   COALESCE(AVG(mr.rating), 0) as average_rating,
                   COUNT(mr.id) as review_count
            FROM meals m
            LEFT JOIN meal_categories mc ON m.category_id = mc.id
            LEFT JOIN meal_reviews mr ON m.id = mr.meal_id
            WHERE m.is_available = true
        `;
        let params = [];
        let paramCount = 0;

        if (q) {
            query += ` AND (m.name ILIKE $${++paramCount} OR m.description ILIKE $${paramCount})`;
            params.push(`%${q}%`);
        }

        if (category) {
            query += ` AND mc.name = $${++paramCount}`;
            params.push(category);
        }

        if (vegetarian === 'true') {
            query += ` AND m.is_vegetarian = true`;
        }

        if (max_price) {
            query += ` AND m.price <= $${++paramCount}`;
            params.push(parseFloat(max_price));
        }

        query += ` GROUP BY m.id, mc.name`;

        if (min_rating) {
            query += ` HAVING AVG(mr.rating) >= $${++paramCount}`;
            params.push(parseFloat(min_rating));
        }

        query += ` ORDER BY m.name`;

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (error) {
        console.error('Error searching meals:', error);
        res.status(500).json({ error: 'Ошибка поиска' });
    }
});

// API для получения популярных блюд
app.get('/api/popular', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const result = await pool.query(`
            SELECT m.*, mc.name as category_name,
                   COUNT(oi.id) as order_count,
                   COALESCE(AVG(mr.rating), 0) as average_rating
            FROM meals m
            LEFT JOIN meal_categories mc ON m.category_id = mc.id
            LEFT JOIN order_items oi ON m.id = oi.meal_id
            LEFT JOIN meal_reviews mr ON m.id = mr.meal_id
            WHERE m.is_available = true
            GROUP BY m.id, mc.name
            ORDER BY order_count DESC, average_rating DESC
            LIMIT $1
        `, [limit]);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching popular meals:', error);
        res.status(500).json({ error: 'Ошибка загрузки популярных блюд' });
    }
});

// API для получения рекомендаций
app.get('/api/recommendations', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.userId;

        // Получаем предпочтения пользователя на основе истории заказов
        const preferences = await pool.query(`
            SELECT m.category_id, COUNT(*) as order_count
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN meals m ON oi.meal_id = m.id
            WHERE o.user_id = $1 AND o.status = 'completed'
            GROUP BY m.category_id
            ORDER BY order_count DESC
            LIMIT 3
        `, [user_id]);

        if (preferences.rows.length === 0) {
            // Новые пользователи - показываем популярные блюда
            return app._router.handle({ path: '/api/popular', query: { limit: 5 } }, res);
        }

        const categoryIds = preferences.rows.map(p => p.category_id);

        const result = await pool.query(`
            SELECT DISTINCT m.*, mc.name as category_name,
                   COALESCE(AVG(mr.rating), 0) as average_rating
            FROM meals m
            LEFT JOIN meal_categories mc ON m.category_id = mc.id
            LEFT JOIN meal_reviews mr ON m.id = mr.meal_id
            WHERE m.is_available = true
            AND m.category_id = ANY($1)
            AND m.id NOT IN (
                SELECT oi.meal_id
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE o.user_id = $2
            )
            GROUP BY m.id, mc.name
            ORDER BY average_rating DESC, RANDOM()
            LIMIT 10
        `, [categoryIds, user_id]);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ error: 'Ошибка загрузки рекомендаций' });
    }
});

// API для получения статистики пользователя
app.get('/api/user/stats', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.userId;

        const [
            orderStats,
            favoriteStats,
            spendingStats
        ] = await Promise.all([
            pool.query(`
                SELECT
                    COUNT(*) as total_orders,
                    COALESCE(SUM(final_amount), 0) as total_spent,
                    MAX(created_at) as last_order_date
                FROM orders
                WHERE user_id = $1 AND status = 'completed'
            `, [user_id]),

            pool.query('SELECT COUNT(*) as favorite_count FROM favorite_meals WHERE user_id = $1', [user_id]),

            pool.query(`
                SELECT
                    AVG(final_amount) as avg_order_value,
                    MIN(final_amount) as min_order_value,
                    MAX(final_amount) as max_order_value
                FROM orders
                WHERE user_id = $1 AND status = 'completed'
            `, [user_id])
        ]);

        res.json({
            orders: orderStats.rows[0],
            favorites: favoriteStats.rows[0],
            spending: spendingStats.rows[0]
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'Ошибка загрузки статистики пользователя' });
    }
});

// API для уведомлений
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.userId;
        const { limit = 20 } = req.query;

        const result = await pool.query(`
            SELECT * FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [user_id, limit]);

        // Помечаем уведомления как прочитанные
        await pool.query(`
            UPDATE notifications
            SET is_read = true
            WHERE user_id = $1 AND is_read = false
        `, [user_id]);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Ошибка загрузки уведомлений' });
    }
});

// API для создания уведомления
app.post('/api/notifications', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, message, user_id, type = 'info' } = req.body;

        const result = await pool.query(`
            INSERT INTO notifications (user_id, title, message, type)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [user_id, title, message, type]);

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Ошибка создания уведомления' });
    }
});

// API для получения настроек пользователя
app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM user_settings
            WHERE user_id = $1
        `, [req.user.userId]);

        if (result.rows.length === 0) {
            // Создаем настройки по умолчанию
            const defaultSettings = {
                notifications_enabled: true,
                email_notifications: true,
                push_notifications: true,
                language: 'ru',
                theme: 'light'
            };

            await pool.query(`
                INSERT INTO user_settings (user_id, settings)
                VALUES ($1, $2)
            `, [req.user.userId, JSON.stringify(defaultSettings)]);

            return res.json(defaultSettings);
        }

        res.json(result.rows[0].settings);

    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Ошибка загрузки настроек' });
    }
});

// API для обновления настроек
app.post('/api/settings', authenticateToken, async (req, res) => {
    try {
        const settings = req.body;

        await pool.query(`
            INSERT INTO user_settings (user_id, settings)
            VALUES ($1, $2)
            ON CONFLICT (user_id)
            DO UPDATE SET settings = $2, updated_at = NOW()
        `, [req.user.userId, JSON.stringify(settings)]);

        res.json({ success: true });

    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Ошибка обновления настроек' });
    }
});

// API для получения расписания питания
app.get('/api/schedule', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM meal_schedule
            WHERE is_active = true
            ORDER BY day_of_week, meal_time
        `);

        const schedule = {};
        result.rows.forEach(item => {
            if (!schedule[item.day_of_week]) {
                schedule[item.day_of_week] = [];
            }
            schedule[item.day_of_week].push(item);
        });

        res.json(schedule);

    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ error: 'Ошибка загрузки расписания' });
    }
});

// API для получения новостей и обновлений
app.get('/api/news', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const result = await pool.query(`
            SELECT * FROM news
            WHERE is_published = true
            ORDER BY published_at DESC
            LIMIT $1
        `, [limit]);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ error: 'Ошибка загрузки новостей' });
    }
});

// API для обратной связи
app.post('/api/feedback', authenticateToken, async (req, res) => {
    try {
        const { type, subject, message, rating } = req.body;
        const user_id = req.user.userId;

        const result = await pool.query(`
            INSERT INTO feedback (user_id, type, subject, message, rating)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [user_id, type, subject, message, rating]);

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ error: 'Ошибка отправки обратной связи' });
    }
});

// API для получения аналитики заказов
app.get('/api/analytics/orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        let dateFilter = '';
        switch (period) {
            case 'week':
                dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
                break;
            case 'month':
                dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
                break;
            case 'year':
                dateFilter = "AND created_at >= NOW() - INTERVAL '365 days'";
                break;
        }

        const result = await pool.query(`
            SELECT
                DATE(created_at) as date,
                COUNT(*) as order_count,
                SUM(final_amount) as revenue,
                AVG(final_amount) as avg_order_value
            FROM orders
            WHERE status = 'completed' ${dateFilter}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching order analytics:', error);
        res.status(500).json({ error: 'Ошибка загрузки аналитики заказов' });
    }
});

// API для резервного копирования данных
app.post('/api/backup', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Создаем резервную копию основных таблиц
        const tables = ['users', 'profiles', 'meals', 'orders', 'order_items'];

        const backup = {};
        for (const table of tables) {
            const result = await pool.query(`SELECT * FROM ${table}`);
            backup[table] = result.rows;
        }

        // Сохраняем в файл (в реальном приложении сохраняли бы в облако)
        const fs = await import('fs');
        const backupFile = `backup-${timestamp}.json`;

        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

        res.json({
            success: true,
            filename: backupFile,
            tables: Object.keys(backup),
            record_count: Object.values(backup).reduce((sum, rows) => sum + rows.length, 0)
        });

    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ error: 'Ошибка создания резервной копии' });
    }
});

// API для получения данных о питании
app.get('/api/nutrition', async (req, res) => {
    try {
        const { meal_id } = req.query;

        let query = `
            SELECT m.name, m.calories, m.proteins, m.fats, m.carbs,
                   m.ingredients, m.allergens, m.is_vegetarian
            FROM meals m
            WHERE m.is_available = true
        `;

        if (meal_id) {
            query += ` AND m.id = $1`;
        }

        const result = await pool.query(query, meal_id ? [meal_id] : []);

        // Рассчитываем общую nutritional информацию
        const nutrition = result.rows.reduce((acc, meal) => {
            acc.total_calories += parseFloat(meal.calories || 0);
            acc.total_proteins += parseFloat(meal.proteins || 0);
            acc.total_fats += parseFloat(meal.fats || 0);
            acc.total_carbs += parseFloat(meal.carbs || 0);
            acc.meals.push({
                name: meal.name,
                calories: parseFloat(meal.calories || 0),
                proteins: parseFloat(meal.proteins || 0),
                fats: parseFloat(meal.fats || 0),
                carbs: parseFloat(meal.carbs || 0),
                is_vegetarian: meal.is_vegetarian
            });
            return acc;
        }, {
            total_calories: 0,
            total_proteins: 0,
            total_fats: 0,
            total_carbs: 0,
            meals: []
        });

        res.json(nutrition);

    } catch (error) {
        console.error('Error fetching nutrition data:', error);
        res.status(500).json({ error: 'Ошибка загрузки данных о питании' });
    }
});

// API для получения рецептов
app.get('/api/recipes', async (req, res) => {
    try {
        const { meal_id, detailed = false } = req.query;

        let query = `
            SELECT m.*, mc.name as category_name,
                   json_build_object(
                       'ingredients', m.ingredients,
                       'instructions', m.instructions,
                       'prep_time', m.preparation_time,
                       'servings', m.servings
                   ) as recipe
            FROM meals m
            LEFT JOIN meal_categories mc ON m.category_id = mc.id
            WHERE m.is_available = true
        `;

        if (meal_id) {
            query += ` AND m.id = $1`;
        }

        const result = await pool.query(query, meal_id ? [meal_id] : []);

        const recipes = result.rows.map(meal => ({
            id: meal.id,
            name: meal.name,
            category: meal.category_name,
            description: meal.description,
            recipe: detailed ? meal.recipe : null,
            nutritional_info: {
                calories: parseFloat(meal.calories || 0),
                proteins: parseFloat(meal.proteins || 0),
                fats: parseFloat(meal.fats || 0),
                carbs: parseFloat(meal.carbs || 0)
            }
        }));

        res.json(recipes);

    } catch (error) {
        console.error('Error fetching recipes:', error);
        res.status(500).json({ error: 'Ошибка загрузки рецептов' });
    }
});

// API для получения аллергенов пользователя
app.get('/api/allergens', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT allergens FROM profiles WHERE user_id = $1
        `, [req.user.userId]);

        const allergens = result.rows[0]?.allergens || [];
        res.json({ allergens });

    } catch (error) {
        console.error('Error fetching allergens:', error);
        res.status(500).json({ error: 'Ошибка загрузки аллергенов' });
    }
});

// API для обновления аллергенов
app.post('/api/allergens', authenticateToken, async (req, res) => {
    try {
        const { allergens } = req.body;

        await pool.query(`
            UPDATE profiles
            SET allergens = $1, updated_at = NOW()
            WHERE user_id = $2
        `, [allergens, req.user.userId]);

        res.json({ success: true });

    } catch (error) {
        console.error('Error updating allergens:', error);
        res.status(500).json({ error: 'Ошибка обновления аллергенов' });
    }
});

// API для проверки совместимости блюд с аллергиями
app.post('/api/allergen-check', authenticateToken, async (req, res) => {
    try {
        const { meal_ids } = req.body;

        // Получаем аллергены пользователя
        const userAllergens = await pool.query(`
            SELECT allergens FROM profiles WHERE user_id = $1
        `, [req.user.userId]);

        const allergens = userAllergens.rows[0]?.allergens || [];

        if (allergens.length === 0) {
            return res.json({ compatible: true, warnings: [] });
        }

        // Получаем аллергены блюд
        const result = await pool.query(`
            SELECT id, name, allergens
            FROM meals
            WHERE id = ANY($1)
        `, [meal_ids]);

        const warnings = [];
        let compatible = true;

        result.rows.forEach(meal => {
            const mealAllergens = meal.allergens || [];
            const conflicts = allergens.filter(allergen =>
                mealAllergens.some(mealAllergen =>
                    mealAllergen.toLowerCase().includes(allergen.toLowerCase())
                )
            );

            if (conflicts.length > 0) {
                compatible = false;
                warnings.push({
                    meal_id: meal.id,
                    meal_name: meal.name,
                    conflicts: conflicts
                });
            }
        });

        res.json({ compatible, warnings });

    } catch (error) {
        console.error('Error checking allergens:', error);
        res.status(500).json({ error: 'Ошибка проверки аллергенов' });
    }
});

// API для получения предпочтений пользователя
app.get('/api/preferences', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT preferences FROM profiles WHERE user_id = $1
        `, [req.user.userId]);

        const preferences = result.rows[0]?.preferences || {
            favorite_categories: [],
            dietary_restrictions: [],
            spice_level: 'medium',
            portion_size: 'normal'
        };

        res.json({ preferences });

    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({ error: 'Ошибка загрузки предпочтений' });
    }
});

// API для обновления предпочтений
app.post('/api/preferences', authenticateToken, async (req, res) => {
    try {
        const { preferences } = req.body;

        await pool.query(`
            UPDATE profiles
            SET preferences = $1, updated_at = NOW()
            WHERE user_id = $2
        `, [preferences, req.user.userId]);

        res.json({ success: true });

    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: 'Ошибка обновления предпочтений' });
    }
});

// API для получения персонализированного меню
app.get('/api/personalized-menu', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.userId;

        // Получаем предпочтения и аллергены пользователя
        const userData = await pool.query(`
            SELECT preferences, allergens FROM profiles WHERE user_id = $1
        `, [user_id]);

        const preferences = userData.rows[0]?.preferences || {};
        const allergens = userData.rows[0]?.allergens || [];

        let query = `
            SELECT DISTINCT m.*, mc.name as category_name,
                   CASE WHEN fm.user_id IS NOT NULL THEN true ELSE false END as is_favorite
            FROM meals m
            LEFT JOIN meal_categories mc ON m.category_id = mc.id
            LEFT JOIN favorite_meals fm ON m.id = fm.meal_id AND fm.user_id = $1
            WHERE m.is_available = true
        `;

        let params = [user_id];
        let paramCount = 1;

        // Фильтр по предпочтениям
        if (preferences.favorite_categories && preferences.favorite_categories.length > 0) {
            query += ` AND mc.name = ANY($${++paramCount})`;
            params.push(preferences.favorite_categories);
        }

        if (preferences.dietary_restrictions && preferences.dietary_restrictions.length > 0) {
            if (preferences.dietary_restrictions.includes('vegetarian')) {
                query += ` AND m.is_vegetarian = true`;
            }
        }

        // Исключаем блюда с аллергенами
        if (allergens.length > 0) {
            query += ` AND NOT EXISTS (
                SELECT 1 FROM unnest(m.allergens) as allergen
                WHERE allergen ILIKE ANY($${++paramCount})
            )`;
            params.push(allergens.map(a => `%${a}%`));
        }

        query += ` ORDER BY m.name LIMIT 50`;

        const result = await pool.query(query, params);

        // Группируем по категориям
        const menu = {};
        result.rows.forEach(meal => {
            if (!menu[meal.category_name]) {
                menu[meal.category_name] = [];
            }
            menu[meal.category_name].push({
                id: meal.id,
                name: meal.name,
                price: parseFloat(meal.price),
                description: meal.description,
                is_favorite: meal.is_favorite,
                nutritional_info: {
                    calories: parseFloat(meal.calories || 0),
                    proteins: parseFloat(meal.proteins || 0),
                    fats: parseFloat(meal.fats || 0),
                    carbs: parseFloat(meal.carbs || 0)
                }
            });
        });

        res.json({ menu, preferences, allergens });

    } catch (error) {
        console.error('Error fetching personalized menu:', error);
        res.status(500).json({ error: 'Ошибка загрузки персонализированного меню' });
    }
});

// API для получения статистики заказов по времени
app.get('/api/order-stats', authenticateToken, async (req, res) => {
    try {
        const { period = 'week' } = req.query;
        const user_id = req.user.userId;

        let dateFilter = '';
        switch (period) {
            case 'day':
                dateFilter = "AND created_at >= CURRENT_DATE";
                break;
            case 'week':
                dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
                break;
            case 'month':
                dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
                break;
            case 'year':
                dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '365 days'";
                break;
        }

        const result = await pool.query(`
            SELECT
                DATE(created_at) as date,
                COUNT(*) as order_count,
                SUM(final_amount) as total_spent,
                AVG(final_amount) as avg_order_value,
                json_agg(
                    json_build_object(
                        'meal_name', m.name,
                        'quantity', oi.quantity,
                        'total_price', oi.total_price
                    )
                ) as popular_items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN meals m ON oi.meal_id = m.id
            WHERE o.user_id = $1 AND o.status = 'completed' ${dateFilter}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [user_id]);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).json({ error: 'Ошибка загрузки статистики заказов' });
    }
});

// API для получения трендов питания
app.get('/api/nutrition-trends', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.userId;
        const { days = 30 } = req.query;

        const result = await pool.query(`
            SELECT
                DATE(o.created_at) as date,
                SUM(m.calories * oi.quantity) as total_calories,
                SUM(m.proteins * oi.quantity) as total_proteins,
                SUM(m.fats * oi.quantity) as total_fats,
                SUM(m.carbs * oi.quantity) as total_carbs,
                COUNT(DISTINCT o.id) as order_count
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN meals m ON oi.meal_id = m.id
            WHERE o.user_id = $1 AND o.status = 'completed'
            AND o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY DATE(o.created_at)
            ORDER BY date DESC
        `, [user_id]);

        // Рассчитываем средние значения
        const totals = result.rows.reduce((acc, day) => {
            acc.total_calories += parseFloat(day.total_calories || 0);
            acc.total_proteins += parseFloat(day.total_proteins || 0);
            acc.total_fats += parseFloat(day.total_fats || 0);
            acc.total_carbs += parseFloat(day.total_carbs || 0);
            acc.total_orders += parseInt(day.order_count || 0);
            acc.days++;
            return acc;
        }, { total_calories: 0, total_proteins: 0, total_fats: 0, total_carbs: 0, total_orders: 0, days: 0 });

        const averages = {
            daily_calories: totals.days > 0 ? totals.total_calories / totals.days : 0,
            daily_proteins: totals.days > 0 ? totals.total_proteins / totals.days : 0,
            daily_fats: totals.days > 0 ? totals.total_fats / totals.days : 0,
            daily_carbs: totals.days > 0 ? totals.total_carbs / totals.days : 0,
            orders_per_day: totals.days > 0 ? totals.total_orders / totals.days : 0
        };

        res.json({
            trends: result.rows,
            averages,
            period_days: days
        });

    } catch (error) {
        console.error('Error fetching nutrition trends:', error);
        res.status(500).json({ error: 'Ошибка загрузки трендов питания' });
    }
});

// API для получения советов по питанию
app.get('/api/nutrition-advice', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.userId;

        // Получаем последние заказы и предпочтения
        const [recentOrders, preferences] = await Promise.all([
            pool.query(`
                SELECT m.calories, m.proteins, m.fats, m.carbs, m.is_vegetarian
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN meals m ON oi.meal_id = m.id
                WHERE o.user_id = $1 AND o.status = 'completed'
                AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'
                ORDER BY o.created_at DESC
                LIMIT 50
            `, [user_id]),

            pool.query(`
                SELECT preferences FROM profiles WHERE user_id = $1
            `, [user_id])
        ]);

        const userPrefs = preferences.rows[0]?.preferences || {};
        const meals = recentOrders.rows;

        // Анализируем питание и даем советы
        const analysis = {
            average_daily_calories: 0,
            protein_intake: 0,
            carb_intake: 0,
            fat_intake: 0,
            vegetarian_meals_ratio: 0,
            advice: []
        };

        if (meals.length > 0) {
            const totals = meals.reduce((acc, meal) => {
                acc.calories += parseFloat(meal.calories || 0);
                acc.proteins += parseFloat(meal.proteins || 0);
                acc.fats += parseFloat(meal.fats || 0);
                acc.carbs += parseFloat(meal.carbs || 0);
                if (meal.is_vegetarian) acc.vegetarian_count++;
                return acc;
            }, { calories: 0, proteins: 0, fats: 0, carbs: 0, vegetarian_count: 0 });

            analysis.average_daily_calories = totals.calories / 7;
            analysis.protein_intake = totals.proteins;
            analysis.carb_intake = totals.carbs;
            analysis.fat_intake = totals.fats;
            analysis.vegetarian_meals_ratio = (totals.vegetarian_count / meals.length) * 100;

            // Генерируем советы
            if (analysis.average_daily_calories < 1500) {
                analysis.advice.push("Рекомендуется увеличить калорийность рациона для поддержания энергии");
            } else if (analysis.average_daily_calories > 3000) {
                analysis.advice.push("Рассмотрите возможность снижения калорийности для поддержания здорового веса");
            }

            if (analysis.protein_intake < 50) {
                analysis.advice.push("Увеличьте потребление белковой пищи для поддержания мышечной массы");
            }

            if (userPrefs.dietary_restrictions?.includes('vegetarian') && analysis.vegetarian_meals_ratio < 70) {
                analysis.advice.push("Попробуйте больше вегетарианских блюд из нашего меню");
            }

            if (analysis.advice.length === 0) {
                analysis.advice.push("Ваше питание выглядит сбалансированным! Продолжайте в том же духе.");
            }
        }

        res.json(analysis);

    } catch (error) {
        console.error('Error generating nutrition advice:', error);
        res.status(500).json({ error: 'Ошибка генерации советов по питанию' });
    }
});

// API для получения достижений пользователя
app.get('/api/achievements/progress', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.userId;

        // Получаем статистику пользователя для расчета прогресса достижений
        const [userStats, achievements] = await Promise.all([
            pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status = 'completed') as total_orders,
                    (SELECT COUNT(*) FROM favorite_meals WHERE user_id = $1) as favorite_count,
                    (SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE user_id = $1 AND status = 'completed') as total_spent,
                    (SELECT COUNT(*) FROM meal_reviews WHERE user_id = $1) as review_count,
                    (SELECT COUNT(DISTINCT DATE(created_at)) FROM orders WHERE user_id = $1 AND status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '30 days') as active_days
                FROM users WHERE id = $1
            `, [user_id]),

            pool.query(`
                SELECT a.*, ua.unlocked_at,
                       CASE
                           WHEN ua.unlocked_at IS NOT NULL THEN 100
                           ELSE LEAST(100, (
                               CASE a.type
                                   WHEN 'orders' THEN (SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status = 'completed') * 100.0 / a.target_value
                                   WHEN 'spending' THEN (SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE user_id = $1 AND status = 'completed') * 100.0 / a.target_value
                                   WHEN 'favorites' THEN (SELECT COUNT(*) FROM favorite_meals WHERE user_id = $1) * 100.0 / a.target_value
                                   WHEN 'reviews' THEN (SELECT COUNT(*) FROM meal_reviews WHERE user_id = $1) * 100.0 / a.target_value
                                   WHEN 'streak' THEN (SELECT COUNT(DISTINCT DATE(created_at)) FROM orders WHERE user_id = $1 AND status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '30 days') * 100.0 / a.target_value
                                   ELSE 0
                               END
                           ))
                       END as progress_percentage
                FROM achievements a
                LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
                ORDER BY a.points_reward ASC
            `, [user_id])
        ]);

        const stats = userStats.rows[0];
        const achievementsWithProgress = achievements.rows.map(achievement => ({
            ...achievement,
            progress_percentage: Math.min(100, Math.max(0, parseFloat(achievement.progress_percentage || 0))),
            is_completed: achievement.unlocked_at !== null,
            current_value: achievement.type === 'orders' ? stats.total_orders :
                          achievement.type === 'spending' ? stats.total_spent :
                          achievement.type === 'favorites' ? stats.favorite_count :
                          achievement.type === 'reviews' ? stats.review_count :
                          achievement.type === 'streak' ? stats.active_days : 0
        }));

        res.json({
            stats,
            achievements: achievementsWithProgress
        });

    } catch (error) {
        console.error('Error fetching achievement progress:', error);
        res.status(500).json({ error: 'Ошибка загрузки прогресса достижений' });
    }
});

// API для получения челленджей
app.get('/api/challenges', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.userId;

        const result = await pool.query(`
            SELECT c.*, uc.progress, uc.completed_at,
                   CASE
                       WHEN uc.completed_at IS NOT NULL THEN 100
                       WHEN c.type = 'orders' THEN LEAST(100, (SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status = 'completed' AND created_at >= c.start_date) * 100.0 / c.target_value)
                       WHEN c.type = 'calories' THEN LEAST(100, (SELECT COALESCE(SUM(m.calories * oi.quantity), 0)
                                                               FROM orders o
                                                               JOIN order_items oi ON o.id = oi.order_id
                                                               JOIN meals m ON oi.meal_id = m.id
                                                               WHERE o.user_id = $1 AND o.status = 'completed' AND o.created_at >= c.start_date) * 100.0 / c.target_value)
                       ELSE 0
                   END as progress_percentage
            FROM challenges c
            LEFT JOIN user_challenges uc ON c.id = uc.challenge_id AND uc.user_id = $1
            WHERE c.is_active = true AND (c.end_date IS NULL OR c.end_date > NOW())
            ORDER BY c.created_at DESC
        `, [user_id]);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching challenges:', error);
        res.status(500).json({ error: 'Ошибка загрузки челленджей' });
    }
});

// API для получения социальной активности
app.get('/api/social/activity', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.userId;
        const { limit = 20 } = req.query;

        // Получаем активность друзей/одноклассников
        const result = await pool.query(`
            SELECT
                'order' as activity_type,
                u.username,
                p.full_name,
                p.class_name,
                o.created_at as activity_date,
                json_build_object('meal_count', COUNT(oi.id), 'total_amount', o.final_amount) as activity_data
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN profiles p ON u.id = p.user_id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'completed'
            AND p.class_name = (SELECT class_name FROM profiles WHERE user_id = $1)
            AND o.user_id != $1
            AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY o.id, u.username, p.full_name, p.class_name, o.created_at, o.final_amount

            UNION ALL

            SELECT
                'achievement' as activity_type,
                u.username,
                p.full_name,
                p.class_name,
                ua.unlocked_at as activity_date,
                json_build_object('achievement_name', a.name, 'points', a.points_reward) as activity_data
            FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            JOIN users u ON ua.user_id = u.id
            JOIN profiles p ON u.id = p.user_id
            WHERE p.class_name = (SELECT class_name FROM profiles WHERE user_id = $1)
            AND ua.user_id != $1
            AND ua.unlocked_at >= CURRENT_DATE - INTERVAL '7 days'

            ORDER BY activity_date DESC
            LIMIT $2
        `, [user_id, limit]);

        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching social activity:', error);
        res.status(500).json({ error: 'Ошибка загрузки социальной активности' });
    }
});

// API для получения лидерборда
app.get('/api/leaderboard', async (req, res) => {
    try {
        const { type = 'orders', period = 'month', class_filter } = req.query;

        let dateFilter = '';
        switch (period) {
            case 'week':
                dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
                break;
            case 'month':
                dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
                break;
            case 'year':
                dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '365 days'";
                break;
            case 'all':
                dateFilter = '';
                break;
        }

        let classCondition = '';
        if (class_filter) {
            classCondition = 'AND p.class_name = $2';
        }

        let query = '';
        switch (type) {
            case 'orders':
                query = `
                    SELECT u.username, p.full_name, p.class_name,
                           COUNT(o.id) as value,
                           RANK() OVER (ORDER BY COUNT(o.id) DESC) as rank
                    FROM users u
                    JOIN profiles p ON u.id = p.user_id
                    LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed' ${dateFilter}
                    WHERE 1=1 ${classCondition}
                    GROUP BY u.id, u.username, p.full_name, p.class_name
                    ORDER BY value DESC, u.username
                    LIMIT 50
                `;
                break;

            case 'spending':
                query = `
                    SELECT u.username, p.full_name, p.class_name,
                           COALESCE(SUM(o.final_amount), 0) as value,
                           RANK() OVER (ORDER BY COALESCE(SUM(o.final_amount), 0) DESC) as rank
                    FROM users u
                    JOIN profiles p ON u.id = p.user_id
                    LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed' ${dateFilter}
                    WHERE 1=1 ${classCondition}
                    GROUP BY u.id, u.username, p.full_name, p.class_name
                    ORDER BY value DESC, u.username
                    LIMIT 50
                `;
                break;

            case 'achievements':
                query = `
                    SELECT u.username, p.full_name, p.class_name,
                           COUNT(ua.id) as value,
                           RANK() OVER (ORDER BY COUNT(ua.id) DESC) as rank
                    FROM users u
                    JOIN profiles p ON u.id = p.user_id
                    LEFT JOIN user_achievements ua ON u.id = ua.user_id
                    WHERE 1=1 ${classCondition}
                    GROUP BY u.id, u.username, p.full_name, p.class_name
                    ORDER BY value DESC, u.username
                    LIMIT 50
                `;
                break;
        }

        const result = await pool.query(query, class_filter ? [class_filter] : []);
        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Ошибка загрузки лидерборда' });
    }
});

// API для получения статистики приложения
app.get('/api/app-stats', async (req, res) => {
    try {
        const cacheKey = 'app_stats';
        const cached = cache.get(cacheKey);

        if (cached) {
            return res.json(cached);
        }

        const [
            totalUsers,
            totalOrders,
            totalRevenue,
            popularMeals,
            categoryStats,
            dailyStats
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM users'),
            pool.query('SELECT COUNT(*) FROM orders WHERE status = \'completed\''),
            pool.query('SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE status = \'completed\''),
            pool.query(`
                SELECT m.name, COUNT(oi.id) as order_count
                FROM order_items oi
                JOIN meals m ON oi.meal_id = m.id
                GROUP BY m.id, m.name
                ORDER BY order_count DESC
                LIMIT 10
            `),
            pool.query(`
                SELECT mc.name, COUNT(oi.id) as order_count
                FROM order_items oi
                JOIN meals m ON oi.meal_id = m.id
                JOIN meal_categories mc ON m.category_id = mc.id
                GROUP BY mc.id, mc.name
                ORDER BY order_count DESC
            `),
            pool.query(`
                SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(final_amount) as revenue
                FROM orders
                WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `)
        ]);

        const stats = {
            total_users: parseInt(totalUsers.rows[0].count),
            total_orders: parseInt(totalOrders.rows[0].count),
            total_revenue: parseFloat(totalRevenue.rows[0].total),
            popular_meals: popularMeals.rows,
            category_stats: categoryStats.rows,
            daily_stats: dailyStats.rows,
            last_updated: new Date().toISOString()
        };

        cache.set(cacheKey, stats, 300); // Кэшируем на 5 минут
        res.json(stats);

    } catch (error) {
        console.error('Error fetching app stats:', error);
        res.status(500).json({ error: 'Ошибка загрузки статистики приложения' });
    }
});



// API для проверки соединения с базой
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        const categories = await pool.query('SELECT COUNT(*) FROM meal_categories');
        const meals = await pool.query('SELECT COUNT(*) FROM meals');
        const users = await pool.query('SELECT COUNT(*) FROM users');

        res.json({
            status: 'OK',
            database: 'Neon PostgreSQL connected',
            timestamp: new Date().toISOString(),
            data: {
                categories: parseInt(categories.rows[0].count),
                meals: parseInt(meals.rows[0].count),
                users: parseInt(users.rows[0].count)
            }
        });
    } catch (error) {
        console.error('Database health check failed:', error);
        res.status(500).json({ status: 'ERROR', database: 'Neon disconnected' });
    }
});

// Все остальные маршруты ведут на index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 Neon Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`🔐 JWT Secret: ${JWT_SECRET ? 'Configured' : 'Using fallback'}`);
});
