import dotenv from 'dotenv';

import { audioOpenAI } from '../utils/openAI.js';
import { globalLogger } from '../server.js';


// Load environment variables from .env file
dotenv.config();

// ## gen audio for story ##
const genAudio = async (text, voice) => {

    globalLogger.info("--- genAudio ---");

    try {
        
        let base64Audio = null;

        if (text.length > process.env.SPLIT_SIZE) {
            globalLogger.info("genAudio - split text");
            const splittedText  = splitText(text, process.env.SPLIT_SIZE);

            globalLogger.info(`genAudio - split text length: ${splittedText.length}`);

            for (const text of splittedText) {
                // generate audio with openAI
                const openAIAudio = await audioOpenAI(text, voice);
                // Decode the base64 strings to Buffer (binary data)
                const openAIAudioBinary = Buffer.from(openAIAudio, 'base64');

                // for the first time set base64Audio
                if (base64Audio == null) {
                    base64Audio = openAIAudioBinary;
                }
                else {
                    // Merge the binary data base64Audio and openAIAudioBinary
                    base64Audio = Buffer.concat([base64Audio, openAIAudioBinary]);
                }
            }
            // Encode the merged binary data back to base64
            return base64Audio.toString('base64');

        }
        // return audio of the text is not to long
        return await audioOpenAI(text, voice);

    } catch (error) {
        globalLogger(error,`genAudio: ${error.message}`);
        return false;
    }
};


// ## helper ##
// split text after new line
const splitText = (text, maxLength) => {
    const result = [];
    let start = 0;

    while (start < text.length) {
        // Determine the end of the current chunk
        let end = start + maxLength;

        if (end < text.length) {
            // Find the nearest newline character before the end of the chunk
            let newlinePoint = text.lastIndexOf('\n', end);

            // If a newline is found and it's within the chunk range, set end to it
            if (newlinePoint > start) {
                end = newlinePoint;
            }
        }

        result.push(text.substring(start, end));
        start = end + 1;  // Start at the next character after the newline
    }

    return result;
};


export { genAudio };