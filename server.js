// ### Import modules ###
import express from 'express';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import responseTime from 'response-time';
import ruid from 'express-ruid';

import appError from './utils/errors.js';
import logger from './utils/logger.js';
import story from './routes/story.js';
import { supabaseCreateClient } from './utils/supabase.js';

// Load environment variables from .env file
dotenv.config();

// Create an instance of express
const app = express();

// Define the port number from the environment variable or use a default value
const PORT = process.env.PORT || 8000;

// Middleware to parse JSON bodies
app.use(express.json());

// add uuid to each request
app.use(ruid(
    {
        prefixRoot:"libulaAPI",
        prefixSeparator:"-"
    }
));

// ## rate limit and slow down ##
// Create a slow-down middleware to slow down requests after a threshold
const speedLimiter = slowDown({
    windowMs: 60 * 1000, // 1 minute
    delayAfter: 3, // Allow 3 requests per minute, then add delay
    delayMs: () => 5000, // Add 5 seconds delay per request after the limit
    // maxDelayMs: 20000, // Maximum delay of 20 seconds per request
});
// Create a rate limiter middleware
const maxLimit = process.env.RATE_LIMIT || 10;
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: maxLimit,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false, 
});
// Apply the slow-down middleware before rate-limiting
app.use(speedLimiter);
// Apply rate limiter middleware to all requests
app.use(limiter);

// ## Logging ##
// Create a global logger var
export let globalLogger = "";
// Middleware to set a child logger with userID to the global logger var
app.use((req, res, next) => {
    const requestID = req.rid;
    const userID = req.body["userID"] || "userID not found";
    const method = req.method;
    const url = req.url;

    // # set the global logger #
    globalLogger = logger.child({requestID, userID});

    globalLogger.debug({requestID, userID, method, url },`UserID ${userID} - new request ${method} to ${url}`);
    next();
});
// Middleware to measure request processing time in seconds
app.use(responseTime((req, res, time) => {
    const requestID = req.rid;
    const userID = req.body["userID"] || "userID not found";
    const responseTime = (time).toFixed(3); // Convert milliseconds to seconds
    globalLogger.debug({requestID, userID, responseTime},`UserID ${userID} - response time: ${responseTime} ms`);
}));

// ## Routes ##
app.get('/', (req, res) => {
    res.send('Server is running...');
});
app.use("/story",story);
// app.use("/audio",audio);

// ## error handling ##
// # custom not found error #
app.use((req, res, next) => {
    logger.warn(`${req.method} ${req.url}`);
    next(new appError('URL not found.', 404));
});
// # Global error handling middleware #
app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    err.message = err.message || "internal Server Error!"

    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
    });
});

// Start the server and listen on the specified port
app.listen(PORT, () => {

    // init supabase client prod / test
    if (process.env.SUPABASE_USE_PROD === "true") {
        logger.info("Use Supebase Prod...");
        supabaseCreateClient(process.env.SUPABASE_URL_PROD, process.env.SUPABASE_ANON_KEY_PROD);
    }
    else {
        logger.info("Use Supebase Test...");
        supabaseCreateClient(process.env.SUPABASE_URL_TEST, process.env.SUPABASE_ANON_KEY_TEST);
    }
    console.log(process.env.MODE)
    logger.info(`🚀 Server is running on Port:${PORT}`);
});