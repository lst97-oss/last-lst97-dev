# doubtfire-web

## Retrieval summary

- Relationship: Third-party contribution by Nelson.
- Repository: 220428174/doubtfire-web.
- Purpose: Source implementation indicates these responsibilities: calls external http services; uses a distributed or explicit cache.
- Observed capabilities: Calls external HTTP services; Uses a distributed or explicit cache; Defines the Edit Profile Component type or service
- Technology: TypeScript, JavaScript

## Repository metadata
- **Repository:** 220428174/doubtfire-web
- **Visibility:** public
- **URL:** https://github.com/220428174/doubtfire-web
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- GitHub language breakdown is unavailable.

## Project purpose (source-derived)
Source implementation indicates these responsibilities: calls external http services; uses a distributed or explicit cache.
Evidence: `src/app/api/models/unit.ts`, `src/app/api/services/project.service.ts`, `src/app/api/services/tutorial.service.ts`, `src/app/api/services/unit.service.ts`, `src/app/account/edit-profile/edit-profile.component.ts`, `src/app/admin/institution-settings/activity-type-list/activity-type-list.component.ts`, `src/app/admin/institution-settings/campuses/campus-list/campus-list.component.ts`, `src/app/admin/institution-settings/institution-settings.component.ts`, `src/app/admin/institution-settings/overseer-images/overseer-image-list.component.ts`, `src/app/api/models/activity-type/activity-type.ts` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Calls external HTTP services — Evidence: `src/app/api/models/unit.ts`, `src/app/api/services/project.service.ts` (**inferred**)
- Uses a distributed or explicit cache — Evidence: `src/app/api/services/tutorial.service.ts`, `src/app/api/services/unit.service.ts` (**inferred**)
- Defines the Edit Profile Component type or service — Evidence: `src/app/account/edit-profile/edit-profile.component.ts` (**inferred**)
- Defines the Activity Type List Component type or service — Evidence: `src/app/admin/institution-settings/activity-type-list/activity-type-list.component.ts` (**inferred**)
- Defines the Campus List Component type or service — Evidence: `src/app/admin/institution-settings/campuses/campus-list/campus-list.component.ts` (**inferred**)
- Defines the Institution Settings Component type or service — Evidence: `src/app/admin/institution-settings/institution-settings.component.ts` (**inferred**)
- Defines the Overseer Image List Component type or service — Evidence: `src/app/admin/institution-settings/overseer-images/overseer-image-list.component.ts` (**inferred**)
- Defines the Activity Type type or service — Evidence: `src/app/api/models/activity-type/activity-type.ts` (**inferred**)
- Defines the Campus type or service — Evidence: `src/app/api/models/campus/campus.ts` (**inferred**)
- Defines the Grade type or service — Evidence: `src/app/api/models/grade.ts` (**inferred**)
- Defines the Group Membership type or service — Evidence: `src/app/api/models/groups/group-membership.ts` (**inferred**)
- Defines the Group Set type or service — Evidence: `src/app/api/models/groups/group-set.ts` (**inferred**)
- Defines the Group type or service — Evidence: `src/app/api/models/groups/group.ts` (**inferred**)
- Defines the Learning Outcome type or service — Evidence: `src/app/api/models/learning-outcome.ts` (**inferred**)
- Defines the Overseer Assessment type or service — Evidence: `src/app/api/models/overseer/overseer-assessment.ts` (**inferred**)
- Defines the Overseer Image type or service — Evidence: `src/app/api/models/overseer/overseer-image.ts` (**inferred**)
- Defines the Project type or service — Evidence: `src/app/api/models/project.ts` (**inferred**)
- Defines the Discussion Comment type or service — Evidence: `src/app/api/models/task-comment/discussion-comment.ts` (**inferred**)
- Defines the Extension Comment type or service — Evidence: `src/app/api/models/task-comment/extension-comment.ts` (**inferred**)
- Defines the Task Comment type or service — Evidence: `src/app/api/models/task-comment/task-comment.ts` (**inferred**)
- Defines the Task Definition type or service — Evidence: `src/app/api/models/task-definition.ts` (**inferred**)
- Defines the Task Outcome Alignment type or service — Evidence: `src/app/api/models/task-outcome-alignment.ts` (**inferred**)
- Defines the Task Status Enum type or service — Evidence: `src/app/api/models/task-status.ts` (**inferred**)
- Defines the Task Status Ui Data type or service — Evidence: `src/app/api/models/task-status.ts` (**inferred**)

## Tracked files
- **704 tracked files** in total
- Source: 438; tests: 26; documentation: 5; configuration: 18; assets/other: 217

## Repository structure
- Inspected 99 source files from the cloned repository (bounded for safety).
- `.github/` (3 tracked files)
- `.husky/` (3 tracked files)
- `docs/` (1 tracked files)
- `karma/` (1 tracked files)
- `src/` (662 tracked files)
- `src/app/account/edit-profile/edit-profile.component.html`
- `src/app/account/edit-profile/edit-profile.component.scss`
- `src/app/account/edit-profile/edit-profile.component.spec.ts`
- `src/app/account/edit-profile/edit-profile.component.ts`
- `src/app/admin/institution-settings/activity-type-list/activity-type-list.component.html`
- `src/app/admin/institution-settings/activity-type-list/activity-type-list.component.scss`
- `src/app/admin/institution-settings/activity-type-list/activity-type-list.component.ts`
- `src/app/admin/institution-settings/campuses/campus-list/campus-list.component.html`
- `src/app/admin/institution-settings/campuses/campus-list/campus-list.component.scss`
- `src/app/admin/institution-settings/campuses/campus-list/campus-list.component.ts`
- `src/app/admin/institution-settings/institution-settings.component.html`
- `src/app/admin/institution-settings/institution-settings.component.scss`
- `src/app/admin/institution-settings/institution-settings.component.ts`
- `src/app/admin/institution-settings/overseer-images/overseer-image-list.component.html`
- `src/app/admin/institution-settings/overseer-images/overseer-image-list.component.scss`
- `src/app/admin/institution-settings/overseer-images/overseer-image-list.component.ts`
- `src/app/admin/modals/create-break-modal/create-break-modal.tpl.html`
- `src/app/admin/modals/create-unit-modal/create-unit-modal.tpl.html`
- `src/app/admin/modals/rollover-teaching-period-modal/rollover-teaching-period-modal.tpl.html`
- `src/app/admin/modals/teaching-period-settings-modal/teaching-period-settings-modal.tpl.html`

## Implementation and test evidence
- Calls external HTTP services — Evidence: `src/app/api/models/unit.ts`, `src/app/api/services/project.service.ts` (**inferred**)
- Uses a distributed or explicit cache — Evidence: `src/app/api/services/tutorial.service.ts`, `src/app/api/services/unit.service.ts` (**inferred**)
- Defines the Edit Profile Component type or service — Evidence: `src/app/account/edit-profile/edit-profile.component.ts` (**inferred**)
- Defines the Activity Type List Component type or service — Evidence: `src/app/admin/institution-settings/activity-type-list/activity-type-list.component.ts` (**inferred**)
- Defines the Campus List Component type or service — Evidence: `src/app/admin/institution-settings/campuses/campus-list/campus-list.component.ts` (**inferred**)
- Defines the Institution Settings Component type or service — Evidence: `src/app/admin/institution-settings/institution-settings.component.ts` (**inferred**)
- Defines the Overseer Image List Component type or service — Evidence: `src/app/admin/institution-settings/overseer-images/overseer-image-list.component.ts` (**inferred**)
- Defines the Activity Type type or service — Evidence: `src/app/api/models/activity-type/activity-type.ts` (**inferred**)
- Defines the Campus type or service — Evidence: `src/app/api/models/campus/campus.ts` (**inferred**)
- Defines the Grade type or service — Evidence: `src/app/api/models/grade.ts` (**inferred**)
- Defines the Group Membership type or service — Evidence: `src/app/api/models/groups/group-membership.ts` (**inferred**)
- Defines the Group Set type or service — Evidence: `src/app/api/models/groups/group-set.ts` (**inferred**)
- Defines the Group type or service — Evidence: `src/app/api/models/groups/group.ts` (**inferred**)
- Defines the Learning Outcome type or service — Evidence: `src/app/api/models/learning-outcome.ts` (**inferred**)
- Defines the Overseer Assessment type or service — Evidence: `src/app/api/models/overseer/overseer-assessment.ts` (**inferred**)
- Defines the Overseer Image type or service — Evidence: `src/app/api/models/overseer/overseer-image.ts` (**inferred**)
- Defines the Project type or service — Evidence: `src/app/api/models/project.ts` (**inferred**)
- Defines the Discussion Comment type or service — Evidence: `src/app/api/models/task-comment/discussion-comment.ts` (**inferred**)
- Defines the Extension Comment type or service — Evidence: `src/app/api/models/task-comment/extension-comment.ts` (**inferred**)
- Defines the Task Comment type or service — Evidence: `src/app/api/models/task-comment/task-comment.ts` (**inferred**)
- Defines the Task Definition type or service — Evidence: `src/app/api/models/task-definition.ts` (**inferred**)
- Defines the Task Outcome Alignment type or service — Evidence: `src/app/api/models/task-outcome-alignment.ts` (**inferred**)
- Defines the Task Status Enum type or service — Evidence: `src/app/api/models/task-status.ts` (**inferred**)
- Defines the Task Status Ui Data type or service — Evidence: `src/app/api/models/task-status.ts` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- JavaScript — Evidence: `Gruntfile.js`, `build.config.js`, `commitlint.config.js`, `env.config.js`, `karma/karma-unit.tpl.js`, `src/assets/wav-worker.js`, `src/common/i18n/localize.js`, `src/i18n/resources-locale_default.js`

## Design and architecture patterns
- Unknown: no supported design-pattern evidence was found.

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No supported architecture-pattern evidence was found; no pattern is asserted.

## Nelson's contribution evidence
- 0 commits, 2 pull requests, 0 issues, 0 reviews
### Pull requests
- bug/user service (CLOSED) — https://github.com/220428174/doubtfire-web/pull/2
- Update user.ts (CLOSED) — https://github.com/220428174/doubtfire-web/pull/1
### Issues
No issue titles are available from the contribution API.
- Commit contributions are reported as aggregate counts; commit messages and diffs are not copied into this report.
- **Coverage limitation:** GitHub capped at least one contribution list; some contribution details may be omitted and commit totals may be partial.
