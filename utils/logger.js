import pino from 'pino';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();
// Use LOG_LEVEL from .env, default to 'error' if not provided
const level = process.env.LOG_LEVEL || 'error';
// Create transports for pino
let transport = null;
// check if level is debug to remove betterstack logging
if (level === 'debug') {
  transport = pino.transport({
    targets: [
      {
        target: 'pino-pretty', // Use pretty printing in development
        options: {
          colorize: true, // Add colors to the logs
        },
      },
    ]
  })
}
else {
  transport = pino.transport({
    targets: [
      {
        target: 'pino-pretty', // Use pretty printing in development
        options: {
          colorize: true, // Add colors to the logs
        },
      },
      {
        target: "@logtail/pino",
        options: { sourceToken: process.env.BETTERSTACK_TOKEN }
      }
    ]
  })
}

// Create and export the logger instance
const logger = pino({
    level: level,
}, transport);

export default logger;