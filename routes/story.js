import Router from 'express';
import dotenv from 'dotenv';
import { body, validationResult } from 'express-validator';

import { globalLogger } from '../server.js';
import appError from '../utils/errors.js';
import validateToken from '../utils/auth.js';
import { supabaseAuth } from '../utils/supabase.js';
import { checkCredit, updateCredit } from '../utils/credit.js';
import { storyDataNew, storyDataContinue, storyDataAudio } from '../logic/storyData.js';
import { promptDataNew, promptDataContinue } from '../logic/promptData.js';
import { getThreadIDOpenAI } from '../utils/openAI.js';
import { genStory } from '../logic/generateStory.js';
import { insertDataNew, insertDataContinue } from '../logic/insertData.js';
import { genAudio } from '../logic/generateAudio.js';
import { saveAudio, updateStoryAudio } from '../logic/insertAudio.js';

// Load environment variables from .env file
dotenv.config();
// create router
const router = Router();

// # POST new Story #
router.post(
    '/new', 
    [
        body("mainCharacterID").isInt().withMessage("Please provide a mainCharacterID"),
        body("storyTypeID").isInt().withMessage("Please provide a storyTypeID"),
        body("language").notEmpty().withMessage("Please provide a language"),
        body("sideCharactersID").isArray().withMessage("Please provide a array of sideCharactersIDs").custom((arr) => arr.every(Number.isInteger)).withMessage("Please provide a array int for sideCharactersIDs"),
        body("userID").notEmpty().withMessage("Please provide a userID")
    ],
    validateToken,
    supabaseAuth,
    checkCredit,
    async (req, res, next) => {

        globalLogger.info("##### POST new Story #####");

        // ## validate body# #
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // ## get request data ##
        // # get token from header #
        const supabaseToken = req.headers['supabase_token'];
        // # get body #
        const { mainCharacterID, storyTypeID, language, sideCharactersID, userID } = req.body;
        // # create params object #
        let params = {
            // Token
            token: supabaseToken,
            // mainCharacterID
            mainCharacterID: mainCharacterID,
            // storyTypeID
            storyTypeID: storyTypeID,
            // language
            language: language,
            // sideCharactersID
            sideCharactersID: sideCharactersID,
            // userID
            userID: userID
        };

        // ### create new Story ###
        try {
        
            // # Step 1 - get storyData for new Story #
            const storyData = await storyDataNew(params);
            if (!storyDataNew) {
                globalLogger.error("new Story - Step 1 get storyData for new Story (storyDataNew).");
                next(new appError());
                return;
            }
            // # Step 2 - create prompt #
            const promptData = promptDataNew(params, storyData);
            if (!promptData) {
                globalLogger.error("new Story - Step 2 create prompt for new story (promptDataNew).");
                next(new appError());
                return;
            }
            // # Step 3 - get threadID #
            globalLogger.info("--- new Story - getThreadIDOpenAI ---");
            const thread = await getThreadIDOpenAI();
            if (!thread) {
                globalLogger.error("new Story - Step 3 get threadID from openAI (getThreadIDOpenAI).");
                next(new appError());
                return;
            }
            // # Step 4 - generate new Story #
            const genStoryData = await genStory(promptData, thread);
            if (!genStoryData) {
                globalLogger.error("new Story - Step 4 - generate new Story (generateNewStory).");
                next(new appError());
                return;
            }
            // # Step 5 - save new Story #
            const insertData = await insertDataNew(params.token, promptData, genStoryData);
            if (!insertData) {
                globalLogger.error("new Story - Step 5 generateNewStory - save new Story (insertDataNew).");
                next(new appError());
                return;
            }
            // # Final Step - update credit #
            const resultUpdateCredit = await updateCredit(params.token, params.userID, process.env.TOKEN_COUNT_STORY);
            if (!resultUpdateCredit) {
                globalLogger.error("new Story - Final Step update credit (updateCredit).");
            }
            
            // send result
            globalLogger.info("##### new Story - done send result #####");
            res.json({storyID: insertData});
    
        } catch (error) {
            globalLogger.error(error,`Post new Story - ${error.message}`);
            next(new appError());
        }
});

// # POST continue Story #
router.post(
    '/continue', 
    [
        body("suggestionID").isInt().withMessage("Please provide a suggestionID"),
        body("parentID").isInt().withMessage("Please provide a parentID"),
        body("language").notEmpty().withMessage("Please provide a language"),
        body("userID").notEmpty().withMessage("Please provide a userID")
    ],
    validateToken,
    supabaseAuth,
    checkCredit,
    async (req, res, next) => {

        globalLogger.info("##### POST continue Story #####");

        // ## validate body# #
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // ## get request data ##
        // # get token from header #
        const supabaseToken = req.headers['supabase_token'];
        // # get body #
        const { suggestionID, parentID, language, userID } = req.body;
        // # create params object #
        let params = {
            // Token
            token: supabaseToken,
            // suggestionID
            suggestionID: suggestionID,
            // parentID
            parentID: parentID,
            // language
            language: language,
            // userID
            userID: userID
        };

        // ### create continue Story ###
        try {
        
            // # Step 1 - get Data for continue Story #
            const storyData = await storyDataContinue(params);
            if (!storyData) {
                globalLogger.error("continue Story - Step 1 get Data for continue Story (storyDataContinue).");
                next(new appError());
                return;
            }
            // # Step 2 - create prompt for continue Story #
            const promptData = promptDataContinue(params, storyData);
            if (!promptData) {
                globalLogger.error("continue Story - Step 2 create prompt continue Story (promptDataContinue).");
                next(new appError());
                return;
            }
            // # Step 3 - generate continue Story #
            const genStoryData = await genStory(promptData, storyData.thread);
            if (!genStoryData) {
                globalLogger.error("continue Story - Step 3 generate continue Story (genStory).");
                next(new appError());
                return;
            }
            // # Step 4 - save continue Story #
            const insertData = await insertDataContinue(params.token, promptData, genStoryData, storyData.threadID);
            if (!insertData) {
                console.error("continue Story - Step 4 save continue Story (insertDataContinue).");
                next(new appError());
                return;
            }
            // # Final Step - update credit #
            const resultUpdateCredit = await updateCredit(params.token, params.userID, process.env.TOKEN_COUNT_STORY);
            if (!resultUpdateCredit) {
                globalLogger.error("continue Story - Final Step update credit (updateCredit).");
            }
    
            // send result
            globalLogger.info("##### continue Story - done send result #####");
            res.json({storyID: insertData, parentID: params.parentID});
    
    
        } catch (error) {
            globalLogger.error(error,`POST continue Story: ${error.message}`);
            next(new appError());
        }
});

// # POST audio Story #
router.post(
    '/audio', 
    [
        body("storyID").isInt().withMessage("Please provide a suggestionID"),
        body("userID").notEmpty().withMessage("Please provide a userID"),
        body("voice").notEmpty().withMessage("Please provide a voice"),
    ],
    validateToken,
    supabaseAuth,
    checkCredit,
    async (req, res, next) => {

        globalLogger.info("##### POST audio Story #####");

        // ## validate body# #
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // ## get request data ##
        // # get token from header #
        const supabaseToken = req.headers['supabase_token'];
        // # get body #
        const { storyID, userID, voice } = req.body;
        // # create params object #
        let params = {
            // Token
            token: supabaseToken,
            // storyID
            storyID: storyID,
            // userID
            userID: userID,
            // voice
            voice: voice,
        };

        // ### generate audio Story ###
        try {
        
            // # Step 1 - storyDataAudio
            const storyText = await storyDataAudio(params.token, params.storyID);
            if (!storyText) {
                globalLogger.error("audio Story - Step 1 get story text (storyDataAudio).");
                next(new appError());
                return;
            }
            // # Step 2 - genAudio
            const audioBase64 = await genAudio(storyText, params.voice);
            if (!audioBase64) {
                globalLogger.error("audio Story - Step 2 genAudio (genAudio).");
                next(new appError());
                return;
            }
            // # Step 3 - saveAudio #
            const filePath = await saveAudio(params.userID, audioBase64);
            if (!filePath) {
                globalLogger.error("audio Story - Step 3 saveAudio (saveAudio).");
                next(new appError());
                return;
            }
            // # Step 4 - updateStory #
            const updateStory = await updateStoryAudio(params.token, params.storyID, filePath);
            if (!updateStory) {
                console.error("audio Story - Step 4 updateStoryAudio (updateStoryAudio).");
                next(new appError());
                return;
            }
            // # Final Step - update credit #
            const resultUpdateCredit = await updateCredit(params.token, params.userID, process.env.TOKEN_COUNT_AUDIO);
            if (!resultUpdateCredit) {
                globalLogger.error("audio Story - Final Step update credit!");
            }
    
            // send result
            globalLogger.info("##### audio Story - done send result #####");
            res.json({audioUrl: filePath});
    
        } catch (error) {
            globalLogger.error(error,`POST audio Story: ${error.message}`);
            next(new appError());
        }
});

export default router;