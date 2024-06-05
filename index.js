const findUp = require("find-up");
const fs = require("fs").promises;
const truncate = require("cli-truncate");
const wrap = require("wrap-ansi");
const pad = require("pad");
const path = require("path");
const fuse = require('fuse.js')

const types = require("./constants/types");
const emojis = require("./constants/emoji");

async function loadConfig(filename) {
  try {
    const data = await fs.readFile(filename, 'utf8');
    const obj = JSON.parse(data);
    return obj && obj.config && obj.config['cz-emocom'];
  } catch (error) {
    console.error(`Error reading config from ${filename}:`, error);
    return null;
  }
}

async function loadConfigUpwards(filename) {
  try {
    const filePath = await findUp(filename);
    if (filePath) {
      return loadConfig(filePath);
    }
    return null;
  } catch (error) {
    console.error(`Error finding config upwards from ${filename}:`, error);
    return null;
  }
}

async function loadConfiguration() {
  let config = await loadConfigUpwards('package.json');
  if (config) {
    return config;
  }

  config = await loadConfigUpwards('.czrc');
  if (config) {
    return config;
  }

  config = await loadConfig(path.join(process.cwd(), '.czrc'));
  if (config) {
    return config;
  }

  return {};
}

// Function to get the configuration for commit messages
async function getConfig() {
  const defaultFormat = "{type}{scope}: {subject}";
  const formatWithEmoji = `{type}{scope}: {emoji} {subject}`;

  const defaultConfig = {
    types,
    emojis,
    skipQuestions: [""],
    subjectMaxLength: 75,
    conventional: false,
  };

  // Load additional configuration from external sources
  const loadedConfig = await loadConfiguration();

  // Merge the default config with the loaded config and return it
  const config = {
    ...defaultConfig,
    defaultFormat,
    formatWithEmoji,
    ...loadedConfig,
  };
  return config;
}

/**
 * Function to get the list of type choices for commit types

 * @param {Array<Object>} types - An array of type objects, each containing name, description, and code
 * @returns {Array<Object>} A formatted array of type choices with padded names and descriptions
*/
function getTypeChoices(types) {
  const maxNameLength = types.reduce(
    (maxLength, type) =>
      type.name.length > maxLength ? type.name.length : maxLength,
    0
  );

  return types.map((choice) => ({
    name: `${pad(choice.name, maxNameLength)} ${choice.description
      }`,
    value: choice.name,
    code: choice.code,
  }));
}

/**
 * Function to get the list of emoji choices for commit messages

* @param {Array<Object>} emojis - An array of emoji objects, each containing name, code, emoji, and description
 * @returns {Array<Object>} A formatted array of emoji choices with padded codes, symbols, and descriptions
*/
function getEmojiChoices(emojis) {
  const maxNameLength = emojis.reduce(
    (maxLength, type) =>
      type.name.length > maxLength ? type.name.length : maxLength,
    0
  );

  const data = emojis.map((emoji) => ({
    name: `${pad(emoji.code, maxNameLength)} ${emoji.emoji} ${emoji.description
      }`,
    value: {
      value: emoji.code,
      name: emoji.name,
    },
    code: emoji.code,
  }));
  return [{ name: "None", value: "" }].concat(data);
}

function formatIssues(issues) {
  return issues
    ? "Closes " + (issues.match(/#\d+/g) || []).join(", closes ")
    : "";
}

/**
 * Create inquier.js questions object trying to read `types`, `gitmoji` and `scopes` from the current project
 * `package.json` falling back to nice default :)
 *
 * @param {Object} config Result of the `getConfig` returned promise
 * @return {Array} Return an array of `inquier.js` questions
 */

function createQuestions(config) {
  // Get the choices for commit types and emojis
  const typeChoices = getTypeChoices(config.types);
  const emojiChoices = getEmojiChoices(config.emojis);

  // Create a fuzzy search instance for type choices
  const fuzzyType = new fuse(typeChoices, {
    shouldSort: true,
    threshold: 0.4,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    minMatchCharLength: 1,
    keys: ["name"],
  });

  // Create a fuzzy search instance for emoji choices
  const fuzzyEmoji = new fuse(emojiChoices, {
    shouldSort: true,
    threshold: 0.4,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    minMatchCharLength: 1,
    keys: ["name", "code"],
  });

  // Define the questions to be prompted to the user
  const questions = [
    {
      type: "autocomplete",
      name: "type",
      message:
        config?.questions?.type
        || "Select the type of change you're committing:",
      source: (_, query) =>
        Promise.resolve(query ? fuzzyType.search(query) : typeChoices),
    },
    {
      type: config.scopes ? "list" : "input",
      name: "scope",
      message:
        config?.questions?.scope
        || "Specify a scope:",
      choices:
        config?.scopes && [{ name: "[none]", value: "" }].concat(config.scopes),
      when: !config.skipQuestions.includes("scope"),
    },
    {
      type: "autocomplete",
      name: "gitmoji",
      message: "Choose a gitmoji",
      source: (_, query) =>
        Promise.resolve(query ? fuzzyEmoji.search(query) : emojiChoices),
    },
    {
      type: "maxlength-input",
      name: "subject",
      message:
        config?.questions?.subject
        || "Write a short description:",
      maxLength: config.subjectMaxLength,
    },
    {
      type: "input",
      name: "body",
      message:
        config?.questions?.body
        || "Provide a longer description:",
      when: !config.skipQuestions.includes("body"),
    },
    {
      type: "input",
      name: "issues",
      message:
        config?.questions?.issues
        || "List any breaking changes or issues closed by this change: (press enter to skip)",
      when: !config.skipQuestions.includes("issues"),
    },
  ];

  return questions;
}

/**
 * Formats the git commit message based on the provided answers and configuration.
 *
 * @param {Object} answers - The answers provided by `inquirer.js`.
 * @param {Object} config - The configuration object returned by the `getConfig` function.
 * @return {String} - The formatted git commit message.
 */
function formatCommitMessage(answers, config) {
  const { columns } = process.stdout;
  const scope = answers.scope ? "(" + answers.scope.trim() + ")" : "";
  const subject = answers.subject.trim();
  const format = answers?.gitmoji?.value ? config.formatWithEmoji : defaultFormat;
  const commitMessage = format
    .replace(/{type}/g, answers.type)
    .replace(/{scope}/g, scope)
    .replace(/{emoji}/g, answers?.gitmoji?.value)
    .replace(/{subject}/g, subject)
    // Ensure there is at most one whitespace character between words
    // This handles cases where optional fields (like `scope`) are not provided
    .replace(/\s+/g, " ");

  // Truncate the commit message to fit within the terminal's width
  const head = truncate(commitMessage, columns);

  // Wrap the body of the commit message to fit within the terminal's width
  const body = wrap(answers.body || "", columns);

  // Format the issues part of the commit message
  const footer = formatIssues(answers.issues);

  // Combine the head, body, and footer into the final commit message
  return [head, body, footer].filter(Boolean).join("\n\n").trim();
}

/**
 * Interactively prompts the user for the git commit message.
 *
 * @param {Object} cz - The Commitizen object used to prompt the user.
 * @return {Promise<String>} - A promise that resolves to the git commit message provided by the user.
 */

async function promptCommitMessage(cz) {
  // Register the autocomplete prompt with Commitizen
  cz.prompt.registerPrompt(
    "autocomplete",
    require("inquirer-autocomplete-prompt")
  );

  // Register the maxlength input prompt with Commitizen
  cz.prompt.registerPrompt(
    "maxlength-input",
    require("inquirer-maxlength-input-prompt")
  );
  // Get the commit message configuration
  const config = await getConfig();

  // Create the questions for the commit message prompt based on the configuration
  const questions = createQuestions(config);

  // Prompt the user with the questions and wait for their answers
  const answers = await cz.prompt(questions);

  // Format the commit message based on the user's answers and the configuration
  const message = formatCommitMessage(answers, config);

  // Return the formatted commit message
  return message;
}

/**
* Export an object containing a `prompter` method. This object is used by Commitizen.
*
* @type {Object}
*/
module.exports = {
  prompter: (cz, commit) => {
    promptCommitMessage(cz).then(commit);
  },
};
