import crypto from 'crypto';

import { globalLogger } from '../server.js';
import { supabaseUploadFile, supabaseCreateSignedURL, supabaseUpdate } from '../utils/supabase.js';

// # save audio to supbase storage #
const saveAudio = async (userID, audioBase64) => {

    try {
        // # Step 1 - upload file #
        globalLogger.info("--- saveAudio - supabaseUploadFile ---");
        const filePath = userID + '/' + crypto.randomUUID() + '.mp3';
        const uploadedPath = await supabaseUploadFile(process.env.SUPABASE_BUCKET,filePath, audioBase64);
        if (!uploadedPath) {
            globalLogger.error(uploadedPath,"saveAudio - supabaseUploadFile");
            return false;
        }
        globalLogger.debug(uploadedPath,"saveAudio - uploadedPath:");

        // # Step 2 - create signed url #
        globalLogger.info("--- saveAudio - supabaseCreateSignedURL ---");
        const signUrl = await supabaseCreateSignedURL(process.env.SUPABASE_BUCKET,uploadedPath);
        if (!signUrl) {
            globalLogger.error(signUrl,"saveAudio - supabaseCreateSignedURL");
            return false;
        }
        globalLogger.debug(signUrl,"saveAudio - signURL:")

        return signUrl;
    }
    catch(error) {
        globalLogger.error(error,`Error saveAudio: ${error.message}`);
        return false;
    }
};

// # update story with audio url #
const updateStoryAudio = async(token, storyID, filePath) => {

    let insertData = {
        audio_url: filePath,
    }

    const result = await supabaseUpdate(token,"stories",`id=eq.${storyID}`,insertData);
    if (!result) {
        globalLogger.error(result,"updateStoryAudio - supabaseUpdate");
        return false;
    }

    return true;
};

export { saveAudio, updateStoryAudio };