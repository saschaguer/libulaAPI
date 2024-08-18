// auth.js
import dotenv from 'dotenv';
import appError from './errors.js';
import { globalLogger } from '../server.js';

// Load environment variables from .env file
dotenv.config();

// Token validation middleware
const validateToken = (req, res, next) => {
    globalLogger.info("--- validateToken ---");
    const token = req.headers['authorization'];
    globalLogger.debug(`request Token: ${token}`);
    globalLogger.debug(`secret Token: ${process.env.TOKEN}`);

    // check if token es set
    if (!token) {
        return next(new appError('A token is required for authentication', 403));
    }
    // check if token is valid
    if (token === process.env.TOKEN) {
        return next();
    }
    return next(new appError('Invalid Token', 401));
};

export default validateToken;