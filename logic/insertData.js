import { supabaseInsert, supabaseUpdate } from "../utils/supabase.js";
import { globalLogger } from "../server.js";

// ## insert new story ##
const insertDataNew = async(token, promptData, genStoryData) => {

    globalLogger.info("--- insertDataNew ---");

    // # Step 1 - insert ThreadID #
    const threadID = await insertThread(token, genStoryData.thread, promptData.userID);
    if (!threadID) {
        globalLogger.error(threadID,"insertThread");
        return false;
    }

    // # Step 2 - insert Story #
    const newStoryID = await insertStory(token, promptData, genStoryData, threadID);
    if (!newStoryID) {
        globalLogger.error(newStoryID,"insertStory");
        return false;
    }

    // # Step 3 - insert suggestions #
    const result = await insertSuggestions(token, genStoryData.suggestions, newStoryID, promptData.userID);
    if (!result) {
        globalLogger.error(result,"insertSuggestions");
        return false;
    }

    return newStoryID;
};

const insertDataContinue = async(token, promptData, genContinueStoryData, threadID) => {

    globalLogger.info("--- insertDataContinue ---");

    // # Step 1 - insert Story #
    const newStoryID = await insertStory(token, promptData, genContinueStoryData, threadID);
    if (!newStoryID) {
        globalLogger.error(newStoryID,"insertStory");
        return false;
    }

    // # Step 2 - insert suggestions #
    const result = await insertSuggestions(token, genContinueStoryData.suggestions, newStoryID, promptData.userID);
    if (!result) {
        globalLogger.error(result,"insertSuggestions");
        return false;
    }

    // # Set 3 - set suggestions used #
    const updateSuggestions = setSuggestionsUsed(token,promptData.storyID, promptData.userID);
    if (!updateSuggestions) {
        globalLogger.error(updateSuggestions,"setSuggestionsUsed");
        return false;
    }

    return newStoryID;
};

// ## helper ##
// insert story
const insertStory = async (token, promptStoryData, genStoryData, threadID) => {

    let result = false;
    let insertData = null;

    // # Step 1 - save story #
    insertData = {
        user_id: promptStoryData.userID,
        title: genStoryData.title,
        text: genStoryData.story,
        fav: false,
        thread_id: threadID,
        stories_type_id: promptStoryData.storyTypeID,
        image_id: promptStoryData.storyTypeImage || 21,
        stories_author_id: promptStoryData.storyAuthors,
        word_count: genStoryData.wordCountStory,
        prompt: promptStoryData.userPrompt,
        maincharacter_id: promptStoryData.mainCharacterID,
        suggestion_id: promptStoryData.suggestionID || null,
        ai_model: genStoryData.aiModel,
        testname: promptStoryData.testName || null,
        character_count: genStoryData.characterCountStory
    };
    result = await supabaseInsert(token,"stories",insertData);
    if (!result) return false;
    const newStoryID = result[0].id;

    // # Step 2 - update parent_id in storys #
    if (promptStoryData.parentID) {
        insertData = {
            parent_id: promptStoryData.parentID,
            relation: "side"
        }
    }
    else {
        insertData = {
            parent_id: newStoryID,
            relation: "main"
        }
    }
    result = await supabaseUpdate(token,"stories",`id=eq.${newStoryID}`,insertData);
    if (!result) return false;

    return newStoryID;
};

// insert thread
const insertThread = async (token, thread, userID) => {

    let insertData = {
        thread: thread, 
        user_id: userID
    }
    const result = await supabaseInsert(token,"threads",insertData);
    if (!result) return false;
    
    return result[0].id;
};

// insert suggestions
const insertSuggestions = async (token, suggestions, storyID, userID) => {

    for (const item of suggestions) {

        let insertData = {
            "title": item.title,
            "message": item.message,
            "story_id": storyID,
            "user_id": userID
        }
        const result = await supabaseInsert(token,"suggestions",insertData);
        if (!result) return false;

    }
    return true;
};
// update suggestion set to used
const setSuggestionsUsed = async(token, storyID, userID) => {

    let insertData = {
        used: true
    };
    const result = await supabaseUpdate(token,"suggestions",`user_id=eq.${userID}&&story_id=eq.${storyID}`,insertData);
 
    if (!result) return false;

    return true;

};


export { insertDataNew, insertDataContinue };
