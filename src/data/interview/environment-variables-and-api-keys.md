# Where should environment variables and sensitive API keys be stored?

- **Category:** Fundamental Questions
- **Source ID:** environment-variables-and-api-keys
- **URL:** https://www.lst97.dev/chat

Usually, environment variables and sensitive API keys should be stored on the server in an .env file and should never be committed to the Git repository. If necessary, the .env file can also be encrypted for additional protection.
