# commitmoji

> Commitizen adapter formats for emoji-enhanced conventional commits.

**commitmoji** allows you to easily use emojis in your commits using [commitizen].

```sh
? Select the type of change you are committing: (Use arrow keys)
❯ feature   A new feature
  fix       A bug fix
  docs      Documentation only changes
  refactor  A code change that neither fixes a bug nor adds a feature
  chore     Other changes that don't modify src or test files
```

## Install

**Globally**

```bash
# Global installation for npm
npm install --global commitizen commitmoji

# Global installation for yarn
yarn global add commitizen commitmoji

# Global installation for pnpm
pnpm add --global commitizen commitmoji
# set as default adapter for your projects
echo '{ "path": "commitmoji" }' > ~/.czrc
```

**Locally**

```bash
# Local installation for npm
npm install --save-dev commitizen commitmoji

# Local installation for yarn
yarn add --dev commitizen commitmoji

# Local installation for pnpm
pnpm add --save-dev commitizen commitmoji
```

Add this to your `package.json`:

```json
"script": {
  "commit": "git-cz"
  // other scripts
},
"config": {
  "commitizen": {
    "path": "commitmoji"
  }
}
```

ℹ️ _`pnpm` requires you to specify `node_modules/commitmoji`._

## Usage

```sh
# npm
npm run commit

# yarn
yarn run commit

# pnpm
pnpm run commit
```

## Customization

By default, `commitmoji` is ready to use immediately after installation. However, users have different needs, so there are several configuration options available to fine-tune it according to project requirements.

### Instructions

You can configure `commitmoji` either globally in the user's home directory (`~/.czrc`) to affect all projects, or locally on a per-project basis in `package.json`. Add the `config` property to the existing object in either location with your preferred settings for customization.

```json
{
  "config": {
    "commitmoji": {}
  }
}
```

### Customization Options

#### Types

By default `commitmoji` comes preconfigured with the [Gitmoji](https://gitmoji.carloscuesta.me/) types.

An [Inquirer.js] choices array:

```json
{
  "config": {
    "commitmoji": {
      "types": [
        {
          "emoji": "🌟",
          "code": ":star2:",
          "description": "A new feature",
          "name": "feature"
        }
      ]
    }
  }
}
```

#### Scopes

An [Inquirer.js] choices array:

```json
{
  "config": {
    "commitmoji": {
      "scopes": ["auth", "seed", "deployment"]
    }
  }
}
```

#### Skip Questions

An array of questions you want to skip:

```json
{
  "config": {
    "commitmoji": {
      "skipQuestions": ["scope", "issues"]
    }
  }
}
```

You have the option to skip the `scope`, `body`, `issues`, and `gitmoji` questions. However, the `type` and `subject` questions are mandatory.

#### Customize Questions

An object that includes customized versions of the original questions:

```json
{
  "config": {
    "commitmoji": {
      "questions": {
        "body": "This will be shown instead of the original text."
      }
    }
  }
}
```

#### Customize the subject max length

The maximum length you want your subject has

```json
{
  "config": {
    "commitmoji": {
      "subjectMaxLength": 200
    }
  }
}
```

## License

MIT © [Nisar Shaikh]

[commitizen]: https://github.com/commitizen/cz-cli
[inquirer.js]: https://github.com/SBoudrias/Inquirer.js/
