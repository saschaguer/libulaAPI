import { globalLogger } from "../server.js";

// ## create prompt for new story ##
const promptDataNew = (params, storyData) => {

    globalLogger.info("--- promptDataNew ---");

    // create sideCharacter Prompt
    let sideCharactersPrompt = createSideCharacterPrompt(storyData.sideCharacters, params.sideCharactersID, "id", storyData.translations, storyData.prompts.sidecharacter_prompt);
    // create mainCharacter Prompt
    let mainCharacterGenderType = createMainCharacterGender(storyData.mainCharacter, storyData.translations);
    let mainCharacterAge = createMainCharacterAge(storyData.age, storyData.translations);
    
    // create User Prompt
    storyData.userPrompt = createUserPromptNew(storyData.prompts.story_user, storyData.mainCharacter.name, mainCharacterGenderType, mainCharacterAge, storyData.storyDescriptions.description, storyData.storyAuthors.author, storyData.storyTemplates, sideCharactersPrompt);
    globalLogger.debug(storyData.userPrompt,"promptDataNew - User prompt");

    let promptData = {
        userID: storyData.mainCharacter.user_id,
        mainCharacterID: storyData.mainCharacter.id,
        storyAuthors: storyData.storyAuthors.stories_authors_id,
        storyTypeID: params.storyTypeID,
        storyTypeImage: storyData.storyTypes[0].image_id,
        userPrompt: storyData.userPrompt,
        storySystem: storyData.prompts.story_system,
        titleUser: storyData.prompts.title_user,
        titleSystem: storyData.prompts.title_system,
        suggestionsUser: storyData.prompts.suggestion_user,
        suggestionsSystem: storyData.prompts.suggestion_system,
        testName: params.testName
    }

    return promptData;
};

// ## create prompt for continue story ##
const promptDataContinue = (params, continueStoryData) => {

    globalLogger.info("--- promptDataContinue ---");

    let promptData = {
        userID: params.userID,
        threadID: continueStoryData.threadID,
        thread: continueStoryData.thread,
        suggestionID: params.suggestionID,
        parentID: params.parentID,
        storyTypeID: continueStoryData.story.stories_type_id,
        storyTypeImage: continueStoryData.story.image_id,
        storyAuthors: continueStoryData.storyAuthor.id,
        mainCharacterID: continueStoryData.story.maincharacter_id,
        userPrompt: null,
        storySystem: continueStoryData.prompts.story_system,
        suggestionsUser: continueStoryData.prompts.suggestion_user,
        suggestionsSystem: continueStoryData.prompts.suggestion_system,
        storyID: continueStoryData.storyID
    };

    // create userPrompt
    promptData.userPrompt = createUserPromptContinue(continueStoryData.prompts.continue_user, continueStoryData.suggestionsTitle);

    globalLogger.debug(promptData.userPrompt,"promptDataNew - User prompt");

    return promptData;
};

// ## helper ##
// create prompt for new story
const createUserPromptNew = ( prompt, mainCharacterName, mainCharacterGenderType, mainCharacterAge, storyDescription, author, storyTemplate, sideCharactersPrompt) => {

    // set storyDescription
    prompt = prompt.replace('%storydescription%',storyDescription);
    // set mainCharacterName
    prompt = prompt.replaceAll('%maincharactername%', mainCharacterName);
    // set mainCharacterGender
    prompt = prompt.replace('%maincharactergender%', mainCharacterGenderType);
    // set mainCharacterAge
    prompt = prompt.replace('%maincharacterage%',mainCharacterAge);
    // set author
    prompt = prompt.replace('%author%',author);
    // set storyTemplate
    prompt = prompt.replace('%storytemplate%',storyTemplate);
    // set sideCharactersPromt
    prompt = prompt.replace('%sidecharactersprompt%',sideCharactersPrompt);

    return prompt;
};
// create prompt for continue story
const createUserPromptContinue = (prompt, suggestion) => {

    globalLogger.info("--- createUserPromptContinue ---");

    let newPrompt = prompt;
    newPrompt = newPrompt.replace('%suggestion%', suggestion);

    return newPrompt;
}

const createMainCharacterGender = ( character, translations ) => {
    let genderType = translations.filter((item) => item['value'] === character.gender_type);
    return genderType[0].prompt;

};

const createMainCharacterAge = (age, translations) => {
    let ageTranslation = translations.filter((item) => item['value'] === age.id.toString());
    return ageTranslation[0].translation;
};

const createSideCharacterPrompt = (jsonArray, filterArray, key, translations, prompt) => {

    // if no sideCharacters chosen or found return empty string.
    if (filterArray.length === 0) return "";

    let sideCharacters = "";

    // filter jsonArray
    jsonArray = jsonArray.filter(item => filterArray.includes(item[key]));

    // set sideCharacters string
    for (let json of jsonArray) {

        let genderType = ""
        if (json.gender_type) genderType = translations.filter((item) => item['value'] === json.gender_type)[0].prompt;

        let relationType = "";
        if (json.relation_type) relationType =  translations.filter((item) => item['value'] === json.relation_type)[0].prompt;
    
        sideCharacters = sideCharacters + json.name +" "+genderType+" "+ relationType + ", ";
    }
    // remove last comma
    sideCharacters = sideCharacters.slice(0, -2);
    // check if sideCharacters where found and translated
    if (sideCharacters.length === 0) {
        globalLogger.error(filterArray,"createSideCharacterPrompt - no sideCharacters translated.");
        return "";
    }
    // return prompt for sideCharacters
    return prompt + " " + sideCharacters;

};

export { promptDataNew, promptDataContinue };