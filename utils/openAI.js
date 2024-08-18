import OpenAI from 'openai';
import dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';

import { globalLogger } from '../server.js';

// Load environment variables from .env file
dotenv.config();

// Init openAI with the API-Key
const openAI = new OpenAI({ key: process.env.OPENAI_API_KEY });
const assistantID = process.env.OPENAI_ASSISTANT_ID;


// # get a new threadID #
const getThreadIDOpenAI = async () => {

    const threadID = await createThreadOpenAI();
    if (!threadID) return false;

    return threadID;
}

// # callOpenAI #
const callOpenAI = async (threadID, message, instructions) => {
        // # Step 1 - add Message to thread #
        if (!await addMessageOpenAI(threadID, message)) {
            globalLogger.error("callOpenAI - Step 1 addMessageOpenAI.");
            return false;
        }
        //# Step 2 - run Assistant #
        const runID = await runAssistantOpenAI(threadID, instructions);
        if (!runID) {
            globalLogger.error("callOpenAI - Step 2 runAssistantOpenAI.");
            return false;
        }
        // # Step 3  - wait for completion
        const status = await checkStatusOpenAI(threadID, runID);
        if (!status) {
            globalLogger.error("callOpenAI - Step 3 checkStatusOpenAI.");
            return false;
        }
        //# Step 4 - get message from chatGPT
        const messagesList = await getMessagesOpenAI(threadID);
        if (!messagesList) {
            globalLogger.error("callOpenAI - Step 4 getMessagesOpenAI.");
            return false;
        } 
        // # Step 5 - select last response from chatGPT
        const messageRep = messagesList.body.data[0].content[0].text?.value
        if (!messageRep) {
            globalLogger.error("callOpenAI - Step 5 select messageRep.");
            return false;
        }
        // # Final - return result #
        return messageRep;
}

// # create Thread #
const createThreadOpenAI = async () => {

    try {
        const thread = await openAI.beta.threads.create();

        return thread.id;
    }
    catch(error) {
        globalLogger.error(error,`createThreadOpenAI: ${error.message}`);
        return false;
    }
};
// # add Message #
const addMessageOpenAI = async (threadID, message) => {

    try {
        const response = await openAI.beta.threads.messages.create(threadID, {
            role: "user",
            content: message,
          });
      
          return response;
    }
    catch(error) {
        globalLogger.error(error,`addMessageOpenAI: ${error.message}`);
        return false;
    }
};
// # run Assistant #
const runAssistantOpenAI = async (threadId, instructions) => {

    try {
        const response = await openAI.beta.threads.runs.create(
            threadId,
            { 
              assistant_id: assistantID,
              instructions
            }
        );

        return response.id;
    }
    catch(error) {
        globalLogger.error(error,`runAssistantOpenAI: ${error.message}`);
        return false;
    }
};
// # check status #
const checkStatusOpenAI = async (threadID, runID) => {

    try {

        while(true) {

            const runResp = await openAI.beta.threads.runs.retrieve(threadID, runID);
            if (runResp.status === "queued" || runResp.status === "in_progress") {
                await setTimeout(3000);
            }
            else if (runResp.status === 'failed'){
                globalLogger.error(runResp,`checkStatusOpenAI FAILED!`);
                return false;
            }
            else {
                return true;
            }
    
        }

    } catch (error) {
        globalLogger.error(error,`checkStatusOpenAI: ${error.message}`);
        return false;
    }
};
// # get Messages with threadID #
const getMessagesOpenAI = async (threadID) => {

    try{
        const messagesList = await openAI.beta.threads.messages.list(threadID, {
            order: "desc",
        });

        return messagesList;
    }
    catch(error){
        globalLogger.error(error.message,`getMessagesOpenAI: ${error}`);
        return false;
    }
};

const audioOpenAI = async (text, voice="nova") => {

    globalLogger.info("--- audioOpenAI ---");

    try {
        // call openAI 
        const response = await openAI.audio.speech.create({
            model: "tts-1",
            voice: voice,
            input: text,
        });

        // get the buffer from the response
        const buffer = Buffer.from(await response.arrayBuffer());

        // return buffer as base64
        return buffer.toString('base64');

    } catch (error) {
        globalLogger.error(error,`audioOpenAI: ${error.message}`);
        return false;
    }
};

export { getThreadIDOpenAI, callOpenAI, audioOpenAI };