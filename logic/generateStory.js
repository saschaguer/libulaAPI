import { callOpenAI } from '../utils/openAI.js';
import { globalLogger } from '../server.js';

const genStory = async (promptData, thread) => {
    
    let genStoryData = {
        thread: thread,
        story: null,
        wordCountStory: 0,
        characterCountStory: 0,
        title: null,
        suggestions: null,
        aiModel: "openAI"
    }

    // # Step 1 - generate Story #
    globalLogger.info("--- genStory callOpenAI story ---");
    genStoryData.story = await callOpenAI(genStoryData.thread, promptData.userPrompt, promptData.storySystem);
    if (!genStoryData.story) {
        globalLogger.error("genStory - Step 1 callOpenAI story.");
        return false;
    }
    // # Step 1.1 - separate Text and Title
    const titleText = extractTitleAndTextOpenAI(genStoryData.story);
    // check if the story is generated
    if (titleText.text === '' || titleText.title === '') {
        globalLogger.error(genStoryData.story,"genStory - Step 1.1 no Story generated!");
        return false;
    }
    genStoryData.story = titleText.text;
    genStoryData.title = titleText.title

    // # Step 2 - count words of the story #
    globalLogger.info("--- genStory countWords ---");
    genStoryData.wordCountStory = countWords(genStoryData.story);

    // # Step 3 - count characters of the story #
    globalLogger.info("--- genStroy countCharacters");
    genStoryData.characterCountStory = countCharacters(genStoryData.story);
    
    // # Step 4 - generate Suggestions #
    globalLogger.info("--- genStory callOpenAI suggestions ---");
    genStoryData.suggestions = await callOpenAI(genStoryData.thread, promptData.suggestionsUser, promptData.suggestionsSystem);
    if (!genStoryData.suggestions) {
        globalLogger.error(genStoryData.suggestions,"genStory - Step 4 callOpenAI suggestions.");
        return false;
    }
    // # Step 4.1 - convert Suggestions in JSON #
    globalLogger.info("--- genStory convertSuggestions ---");
    genStoryData.suggestions = convertSuggestions(genStoryData.suggestions);
    if (!genStoryData.suggestions) {
        globalLogger.error(genStoryData.suggestions,"genStory - Step 4.1 convertSuggestions");
        return false;
    }

    return genStoryData;

};

// ## helper ##
// count words in a string
const countWords = (str) => {
    // Trim the string to remove leading and trailing whitespace
    str = str.trim();

    // Check if the string is empty after trimming
    if (str === "" || typeof str !== 'string') {
        return 0;
    }

    // Split the string by one or more whitespace characters
    const words = str.split(/\s+/);

    return words.length;
};
// count characters in a string
const countCharacters = (str) => {

    // Check if the string is empty
    if (str === "" || typeof str !== 'string') {
        return 0;
    }

    return str.length;
}
// removes quotes from a string
const removeQuotes = (str) => {
    return str.replace(/"/g, '')
};
// convert suggestions into json
const convertSuggestions = (jsonString) => {

    try {
        // remove escape characters
        jsonString = jsonString.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\n```/g, '').replace(/```\n/g, '').replace(/```json\n/g, '');
        globalLogger.debug(JSON.stringify(jsonString),"genStory - convertSuggestions");
        return JSON.parse(jsonString);
    } 
    catch (error) {
        globalLogger.error(JSON.stringify(jsonString),`Error convertSuggestions: ${error.message}`);
        return false;
    }
};
// extract title from text
const extractTitleAndText = (str) => {

    const titleMatch = str.match(/^Titel: (.*?)\n\n/);

    if (titleMatch) {

      const title = titleMatch[1];
      const text = str.replace(titleMatch[0], '').trim();
      return { title, text };

    } else {

      console.error('Title not found');
      return false;

    }
};
// extract title from text for openAI
const extractTitleAndTextOpenAI = (str) => {
    // Regular expression to match the title between the asterisks
    const titleMatch = str.match(/\*\*(.*?)\*\*/);
    let title = '';
    let text = '';
  
    // If a match is found, extract the title and text
    if (titleMatch) {
      title = titleMatch[1]; // The title is the first capture group
      text = str.replace(titleMatch[0], '').trim(); // Remove the title from the text and trim whitespace
    }

    return { title, text };
};

export { genStory };