import { supabaseSelect } from '../utils/supabase.js';
import { globalLogger } from '../server.js';

// ## get data new Story ##
const storyDataNew = async (params) => {

    globalLogger.info("--- storyDataNew ---");

    let storyData = {
        mainCharacter: null,
        storyDescriptions: null,
        storyAuthors: null,
        lastStorys: null,
        prompts: null,
        storyTemplates: null,
        sideCharacters: null,
        translations: null,
        storyTypes: null,
        age:null
    };

    // Step 1 - select mainCharacter by mainCharacterID
    storyData.mainCharacter = await supabaseSelect(params.token, "characters",`id=eq.${params.mainCharacterID}`);

    if (storyData.mainCharacter[0]) {

        // select mainCharacter
        storyData. mainCharacter = storyData.mainCharacter[0];
        globalLogger.debug(storyData.mainCharacter,"storyDataNew - Step1 mainCharacter");

        // Step 2 - select storyDescription by storyTypeID
        storyData.storyDescriptions = await supabaseSelect(params.token, "stories_descriptions",`stories_type_id=eq.${params.storyTypeID}&&language=eq.${params.language}`);
        if (!storyData.storyDescriptions || storyData.storyDescriptions.length === 0) {
            globalLogger.error("storyDataNew - Step 2 select storyDescription by storyTypeID.");
            return false;
        }
        storyData.storyDescriptions = storyData.storyDescriptions[0];

        // Step 3 - select lastStorys by users_id
        storyData.lastStorys = await supabaseSelect(params.token, "stories",`user_id=eq.${storyData.mainCharacter.user_id}`,true);
        if (!storyData.lastStorys) {
            globalLogger.error("storyDataNew - Step 3 select lastStorys by users_id.");
            return false;
        }

        // Step 4 - select storyAuthors by ages_id
        storyData.storyAuthors = await supabaseSelect(params.token, "view_ages_stories_authors",`age_id=eq.${storyData.mainCharacter.age_id}`);
        if (!storyData.storyAuthors || storyData.storyAuthors.length === 0) {
            globalLogger.error("storyDataNew - Step 4 select storyAuthors by ages_id.")
            return false;
        }
        // Step 4.1 - remove the Author from the last Story
        storyData.storyAuthors = removeLastStoryAuthor(storyData.storyAuthors,"stories_authors_id",storyData.lastStorys);
        // Step 4.2 - get a random Author
        storyData.storyAuthors = getRandomJsonItem(storyData.storyAuthors);
        
        // Step 5 - select prompts by language
        storyData.prompts = await supabaseSelect(params.token, "prompts",`language=eq.${params.language}`);
        if (!storyData.prompts) {
            globalLogger.error("storyDataNew - Step 5 select prompts by language.");
            return false;
        }
        storyData.prompts = storyData.prompts[0]
        //globalLogger.debug(storyData.prompts,"storyDataNew - Step 5 prompts.");

        // Step 6 - select storyTemplates by storyTypeID AND ages_id
        storyData.storyTemplates = await supabaseSelect(params.token, "stories_templates",`stories_type_id=eq.${params.storyTypeID}&&age_id=eq.${storyData.mainCharacter.age_id}&&language=eq.${params.language}`);
        if (!storyData.storyTemplates || storyData.storyTemplates.length === 0) {
            globalLogger.error("storyDataNew - Step 6 select storyTemplates by storyTypeID AND ages_id.");
            return false;
        }
        // Step 6.1 - if storyTemplates > 0 extract the template from the first value
        if (storyData.storyTemplates.length > 0){
            storyData.storyTemplates = storyData.storyTemplates[0].template;
        }
        globalLogger.debug(storyData.storyTemplates,"storyDataNew - Step 6 - storyTemplate.");

        // Step 7 - select translations by language
        storyData.translations = await supabaseSelect(params.token, "translations",`language=eq.${params.language}`);
        if (!storyData.translations || storyData.translations.length === 0) {
            globalLogger.error("storyDataNew - Step 7 select translations by language.");
            return false;
        }
        // Step 8 - select sideCharacters
        storyData.sideCharacters = await supabaseSelect(params.token, "characters",`user_id=eq.${storyData.mainCharacter.user_id}`);
        if (!storyData.sideCharacters) {
            globalLogger.error("storyDataNew - Step 8 select sideCharacters.");
            return false;
        }

        // Step 9 - select storyTypes by storyTypeID
        storyData.storyTypes = await supabaseSelect(params.token, "stories_types",`id=eq.${params.storyTypeID}`);
        if (!storyData.storyTypes || storyData.storyTypes.length === 0) {
            globalLogger.error("storyDataNew - Step 9 select storyTypes by storyTypeID.");
            return false;
        } 
        // Step 10 - select age by character age_id
        storyData.age = await supabaseSelect(params.token, "ages",`id=eq.${storyData.mainCharacter.age_id}`);
        storyData.age = storyData.age[0];
        if (!storyData.age || storyData.age.length === 0) {
            globalLogger.error("storyDataNew - Step 10 select age by character age_id.");
            return false;
        } 

        return storyData;
    }
    else {
        globalLogger.error("Step 1 - cannot find mainCharacter in DB.");
        return false;
    }
};


// ## get date continue story ##
const storyDataContinue = async (params) => {

    globalLogger.info("--- storyDataContinue ---");

    let storyData = {
        suggestion: null,
        suggestionMessage: null,
        story: null,
        thread: null,
        threadID: null,
        storyID: null
    };

    // # Step 1 - select Suggestion Title by suggestionID #
    storyData.suggestion = await supabaseSelect(params.token, "suggestions",`id=eq.${params.suggestionID}`);
    if (!storyData.suggestion || storyData.suggestion.length === 0) {
        globalLogger.error("storyDataContinue - Step 1 select suggestion.");
        return false;
    }
    storyData.suggestion = storyData.suggestion[0];
    storyData.suggestionsTitle = storyData.suggestion.title;
    storyData.storyID = storyData.suggestion.story_id;

    // # Step 2 - select Story by parentID #
    storyData.story = await supabaseSelect(params.token, "stories",`parent_id=eq.${params.parentID}`);
    if (!storyData.story || storyData.story.length === 0) {
        globalLogger.error("storyDataContinue - Step 2 select parent story.");
        return false;
    } 
    storyData.story = storyData.story[0];

    // # Step 3 - select Thread by storyID #
    storyData.thread = await supabaseSelect(params.token, "threads",`id=eq.${storyData.story.thread_id}&&user_id=eq.${params.userID}`);
    if (!storyData.thread || storyData.thread.length === 0) {
        globalLogger.error("storyDataContinue - Step 3 select thread");
        return false;
    }
    storyData.threadID = storyData.thread[0].id;
    storyData.thread = storyData.thread[0].thread;

    // # Step 4 - select storyAuthor by storyID #
    storyData.storyAuthor = await supabaseSelect(params.token, "stories_authors",`id=eq.${storyData.story.stories_author_id}`);
    if (!storyData.storyAuthor || storyData.storyAuthor.length === 0) {
        globalLogger.error("storyDataContinue - Step 4 select story author");
        return false;
    }
    storyData.storyAuthor = storyData.storyAuthor[0];
    storyData.storyAuthorName = storyData.storyAuthor.name;

    // # Step 5 - select prompts by language #
    storyData.prompts = await supabaseSelect(params.token, "prompts",`language=eq.${params.language}`);
    if (!storyData.prompts) {
        globalLogger.error("storyDataContinue - Step 5 select prompts");
        return false;
    }
    storyData.prompts = storyData.prompts[0];

    return storyData;
}
// ## get date audio story ##
const storyDataAudio = async (token, storyID) => {

    globalLogger.info("--- storyDataAudio ---");

    const story = await supabaseSelect(token, "stories", `id=eq.${storyID}`);

    if (!story) {
        globalLogger.error(story,"storyDataAudio - story not found.");
        return false;
    }

    return story[0].text;
}

// ## helper ##
const getRandomJsonItem = (array) => { 
    return array[Math.floor(Math.random() * array.length)]
};  
const removeLastStoryAuthor = ( jsonArray, matchKey, matchValue) => {

    let value = "";

    if (matchValue.length > 0){
    value = matchValue[0].matchKey;
    }
    else{
    value = "";
    }

    //[Removing a specific object with a given key-value match from the array]
    return jsonArray.filter((item) => item[matchKey] !== value);

};

export { storyDataNew, storyDataContinue, storyDataAudio };