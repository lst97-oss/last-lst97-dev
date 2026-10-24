# One command, a pinned template, and a destination it will not overwrite

- **Category:** Developer Tooling
- **Source ID:** last-cli-command-and-safety
- **URL:** https://www.lst97.dev/projects/last-cli
- **Visibility:** Public

`last-cli` is a personal-use scaffolding CLI with exactly one command: `create`. It copies a maintained LAST starter into a new directory, renames the project, and leaves a bootable application. It is published on npm as `@lst97-oss/last-cli`; the Bun invocation is the primary path, and the npm path requires Node.js 22 or newer.

The argument grammar is deliberately tiny. `create` accepts an optional project name and `--yes`, and nothing else. An unknown command or option is an error rather than a silently ignored argument. When no terminal is attached and `--yes` is absent, the CLI refuses to run and prints the invocation it needs; it does not wait on a prompt that can never be answered.

## The interactive path

With a terminal, the CLI asks for the project name if it was not supplied, then asks three questions: which template to use, whether to install dependencies with Bun, and whether to initialise Git. Both setup questions default to yes. The template picker offers only the two real choices: Payload plus TanStack Start, or blank TanStack Start.

`--yes` skips all of it. It still requires a project name, because guessing one would create a directory the user did not ask for. It selects the Payload template, enables Bun installation, and enables `git init`.

## What the destination rules protect

Before downloading anything, the CLI inspects the destination. It must not exist, or it must be an empty directory. A symlink, a regular file, or a non-empty directory is refused. This is the difference between scaffolding and an overwrite: there is no merge mode and no force flag, so a typo cannot replace an existing project.

When the destination is absent, the CLI creates it. When a later step fails, only a directory the CLI created is removed. A directory that already existed but was empty is left in place, because deleting it would delete something the user made. If the cleanup itself fails, the error is aggregated with the original failure rather than swallowed.

## Download and rename

The template is downloaded with `giget` from a GitHub repository, not from a branch or a tag. Both template sources are 40-character commit hashes. A source like `gh:lst97-oss/last-payload-tanstack-start-template#ec730e9617e97cb38fd8feb523aef83a179e7169` is reproducible in a way that a moving `main` reference is not.

After the download, three rewrites happen:

- `package.json` keeps the template's shape but takes the new project name.
- The first Markdown H1 in `README.md` becomes the project name.
- `.env.example` is copied to `.env` with `COPYFILE_EXCL`, so an existing file is never clobbered.

If the template has no package name or no README title, the CLI throws rather than writing a half-renamed project.

## Setup is a convenience, not a precondition

`git init` and `bun install` are attempted only when requested. A missing binary, a non-zero exit, or a spawn failure becomes a warning attached to the result; the project is kept and the warning names the command the user should run in the new directory. The CLI exits non-zero when setup failed, so automation can notice, but it does not delete a project that is otherwise complete.

The CLI never runs database migrations, never starts a database, and never boots the application. It creates the directory and prints the next commands. That boundary keeps scaffolding fast and keeps the generated project's environment the user's responsibility.

## What is deliberately absent

There is no update command, no eject command, no template registry, and no configuration file. The CLI has nothing to configure because the template is the configuration. The source stays small: argument parsing, project-name validation, destination preparation, the download/rename/setup orchestration, and tests that inject the download and command runner so no test clones a repository or spawns a process.

A generated project belongs to its owner. There is no hidden link back to the generator and no later command that can rewrite it.
