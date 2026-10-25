# Antigravity Master Prompt — TraceFix Frontend (GitHub Integration Deferred)

## Your role

Act as a senior product designer and frontend engineer. Build the frontend for **TraceFix**, an observability-driven incident investigation and automated code-repair platform. The product receives deployment/application incidents, investigates likely causes, proposes fixes, validates them, and eventually supports pull-request review.

Your task is to implement the **frontend only**, following the existing repository architecture and documentation. Do not invent backend functionality or replace existing application infrastructure.

---

## 1. Mandatory first step: understand the project before coding

**Do not start implementing UI immediately.**

1. Inspect the repository root and locate `README.md`, all project documentation, architecture diagrams, user-flow documents, package manifests, existing frontend code, design tokens, and reusable components.
2. Read the README and relevant documentation completely before proposing changes. Search nested folders for additional documentation; do not assume the root README is the only source.
3. Read the attached **TraceFix user-flow PDF**. It describes the intended end-to-end flow: application registration, repository connection, monitoring configuration, alert/webhook setup, investigation, validation, and PR creation. Treat API paths and configuration examples in that document as proposed examples unless the repository documents them as implemented.
4. Inspect the existing stack, routes, state management, component library, styling conventions, and available API/client abstractions. Reuse the existing stack and dependencies.
5. Inspect the two supplied UI reference images:
   - **Reference image 1:** document/task cards with status tabs, compact metadata, progress indicators, and a detail panel. Use it as inspiration for the issue-card grid, status indicators, and issue detail drawer.
   - **Reference image 2:** client portal dashboard with a mint-green hero, top navigation, search, task list, asset panel, document cards, project cards, and upcoming items. Use it as inspiration for the main organisation dashboard, summary panels, project/repository overview, and calm visual language.
6. Before making changes, provide a short summary of the architecture, relevant documentation, routes/components to reuse, and an implementation plan. Then proceed with implementation; do not stop after the plan unless a blocking ambiguity exists.

### Source-of-truth rules

- Existing repository documentation and implemented API contracts take precedence over assumptions.
- The attached PDF describes intended product behaviour, not proof that every endpoint or integration already exists.
- Do not invent API endpoints and silently wire the UI to them.
- If a backend capability is not implemented, build a clearly isolated mock/demo adapter or an explicit frontend state, and document it. Keep the interface easy to connect to real APIs later.
- Do not overwrite or remove existing project files without first understanding their purpose.
- Do not modify unrelated services or the temporary e-commerce demo app unless the repository documentation explicitly requires it.

---

## 2. Important scope boundary: GitHub integration is deferred

**Do not implement GitHub integration in this phase. This is an explicit requirement.**

We will design and implement the frontend first. Private-repository authorisation, GitHub App/OAuth setup, repository permissions, listing real pull requests, creating branches, pushing commits, and opening PRs will be planned and implemented later.

For this frontend phase:

- Do not configure GitHub OAuth or a GitHub App.
- Do not request, store, or use GitHub tokens.
- Do not call GitHub APIs to fetch repositories, commits, pull requests, or PR statuses.
- Do not attempt to access private repositories.
- Do not implement real PR creation or code pushing.
- Do not invent backend endpoints for these operations.
- Do not present mock repository/PR information as live GitHub data.

The UI may include **future integration placeholders** where useful to preserve the intended product flow. Examples include a repository connection card, a disabled “Review PR” action when no real PR URL is available, or sample PR metadata clearly labelled “Demo data”. Make these states honest and easy to replace when the integration is designed.

If a screen needs repository or PR information to demonstrate its layout, use clearly labelled mock fixtures behind a replaceable frontend data adapter. Keep the UI components independent of those fixtures.

Do not spend implementation time researching or solving private-repository authentication. Record it as deferred follow-up work only.

---

## 3. Product concept

TraceFix detects application/deployment incidents using observability data, investigates likely causes, proposes code fixes, runs validation, and eventually supports pull-request review.

The dashboard must be **issues-first**, not just a list of pull requests. An issue may exist before any code fix or PR is generated. In automatic mode, a PR may eventually exist by the time the user sees the completed investigation. In manual mode, the user first reviews the incident report and authorises the fix-generation stage.

The frontend must communicate the current state of each issue clearly and distinguish:
- incident detection and investigation;
- proposed fix/report awaiting user review;
- fix generation and validation;
- PR awaiting review (demo/placeholder state for now);
- PR accepted/merged or closed/rejected (only in clearly labelled demo data until a real integration exists);
- failed or blocked processing.

Do not imply that approving a PR in GitHub automatically means the production deployment has recovered. Merging and deploying remain part of the configured repository/CI/CD process unless documented otherwise.

---

## 4. Visual direction — closely follow the supplied references

**The goal is to maintain the design language of the two supplied images, not to create a generic dark DevOps dashboard.**

### Reference image 2: main dashboard

Use the second image as the primary layout and visual-language reference:
- pale, cool blue-grey page background;
- large soft mint/green hero panel at the top of the main content;
- restrained dark typography;
- white/light panels with rounded corners;
- thin borders and subtle shadows;
- spacious cards and clear visual hierarchy;
- compact, readable labels and muted secondary text;
- top navigation with organisation identity, primary sections, notifications, and profile/avatar;
- a responsive grid of useful dashboard panels.

Adapt the reference to TraceFix rather than copying unrelated branding or labels. Do not use the BLACKPINK brand/logo or unrelated example content.

Suggested top navigation:
- TraceFix brand
- Overview
- Issues
- Repositories
- Analytics
- Settings
- notifications
- user/profile menu

The main dashboard should have a large welcome/overview hero with a short summary and search or filter control. Under it, show meaningful operational panels, for example:
- Open issues / critical issues / fixes in progress / items awaiting review;
- recent issues;
- repositories configured in the demo workspace;
- issue severity or incident trends;
- recent activity;
- recent generated-fix/validation examples.

Avoid filling every available space with charts. Keep it calm, purposeful, and close to the reference.

### Reference image 1: issue grid and detail panel

Use the first image as the primary reference for the **Issues** page:
- status/filter tabs across the top with counts;
- a responsive grid of white issue cards;
- compact labels and progress/status indicators;
- visual priority ordering;
- a selected issue opens a side panel or detail drawer;
- detail view includes relevant artifacts, status history, and recent updates.

Adapt document cards into incident cards. Do not copy the unrelated document names or legal-document workflow.

### Shared design system

- Prefer light theme matching the references.
- Use mint/soft green as the main accent, supported by pale blue-grey surfaces, white cards, and dark readable text.
- Use severity colors sparingly and consistently: critical/high should be conspicuous; lower-priority items should remain subdued.
- Use rounded cards, subtle borders/shadows, restrained icons, consistent spacing, and small status pills.
- Avoid heavy gradients, neon colors, excessive glassmorphism, giant charts, or a generic black/purple AI aesthetic.
- Use the existing project's icon library if one exists; do not add a new icon dependency unnecessarily.
- Preserve accessibility: keyboard focus, semantic controls, sufficient contrast, clear labels, and responsive layouts.

If the two reference images are not available as files in the repository, use the images attached to this prompt as the visual references. If Antigravity cannot access the attachments, ask for them to be added to the workspace rather than guessing at a different design.

---

## 5. Main dashboard and navigation

Build a responsive organisation-level dashboard similar in structure to reference image 2.

### Organisation overview
Show a welcome heading and a concise overview of the connected organisation/workspace. Include summary metrics such as:
- Open incidents
- Critical incidents
- Investigations in progress
- Fixes awaiting review

These values must come from the existing API if one is documented and implemented. Otherwise, use clearly labelled demo data through a replaceable mock adapter; do not present fabricated values as live production metrics.

### Repositories page
For this phase, implement a **frontend-only repository overview** using clearly labelled demo data or the existing documented application data. Do not connect to GitHub or attempt real repository authorisation.

Show mock/example repository cards with:
- repository name and owner;
- default branch if supplied by the demo fixture;
- a clearly labelled “Demo connection” or “Not connected” status;
- latest demo activity;
- associated issue counts;
- a future “Connect repository” placeholder that does not start OAuth or request credentials.

Do not claim a private or public repository has been accessed. Do not use fake live connection status.

### Analytics/overview panels
Use lightweight, useful visualisations only if supported by the existing project and data. Examples:
- incidents over time;
- issue severity distribution;
- validation status;
- incidents by demo repository.

Do not invent sophisticated analytics or install a large charting package if the existing stack has a suitable solution.

---

## 6. Issues dashboard — the core screen

This is the primary product screen.

Create an issue list/grid inspired by reference image 1. Sort or group issues so critical, service-impacting incidents appear before low-priority issues. The UI should remain useful when the issue has no PR yet.

### Suggested filters/tabs

Use counts derived from the displayed data:
- All issues
- Critical
- Investigating
- Needs review
- Fix in progress
- PR ready (demo state only)
- Resolved

You may adapt the exact labels to match existing enums and product terminology. Avoid duplicate or contradictory statuses.

### Issue card contents

Each issue card should show:
- concise issue title;
- affected application/repository label from the demo fixture;
- severity and priority;
- current workflow status;
- detection time or relative timestamp;
- short symptom/summary;
- current workflow progress or a compact progress indicator;
- whether the example was detected/generated by TraceFix or reported by a human/external source;
- a subtle **View report** action;
- a circular AI-assistant button;
- a **Review PR** action only for sample/demo issues with an explicit demo PR URL or for real URLs supplied by an already-existing application API. Do not fabricate a URL.

The AI button is a secondary/passive circular control with an AI icon. It opens the AI refinement side panel described in section 7. Since the AI repair backend is outside this frontend task, use a clearly labelled demo interaction if needed.

### Source attribution

Make it easy to distinguish, using demo data:
- **TraceFix-generated** — a hypothetical fix/PR generated by TraceFix;
- **Human/external** — a hypothetical existing change created outside TraceFix.

Use an understated badge such as “Demo: TraceFix-generated” or “Demo: External”. Do not imply that real GitHub provenance has been verified.

### Issue detail drawer

Selecting an issue should open a right-side drawer/panel inspired by the detail panel in reference image 1. Include:
- issue title, severity, affected repository/service;
- concise description and current status;
- timeline/activity history;
- alert/monitoring evidence if available;
- suspected cause and supporting evidence, clearly labelled as suspected if unconfirmed;
- affected files/commit/deployment if available in the fixture;
- report preview;
- workflow progress;
- related PR preview and action only if a demo fixture includes an explicit URL;
- relevant actions for the current state.

The drawer should be scrollable on smaller screens and have a clear close action.

---

## 7. Auto-review vs Manual-review operating mode

Add a clear mode selector in Settings, and surface the active mode in the relevant dashboard area. Use a radio group or similarly clear mutually exclusive control. Explain the difference in plain language.

Use these product meanings:

### Automatic mode

1. Incident is detected.
2. TraceFix investigates and identifies a suspected cause.
3. TraceFix generates a candidate fix.
4. TraceFix runs available validation/tests.
5. TraceFix prepares a PR-ready result when the configured validation policy allows it. Actual GitHub PR creation is deferred.
6. TraceFix generates a concise dashboard report describing the incident, reasoning, changes, and validation results.
7. Human review is represented as a future PR review step.

The dashboard report is separate from the concise future GitHub PR description. Do not imply that tests passed if no test result exists.

### Manual-review mode

1. Incident is detected.
2. TraceFix investigates and prepares a brief incident report.
3. The issue appears in **Needs review**.
4. A human reviews the report and chooses whether to proceed with fix generation.
5. If approved, TraceFix prepares a candidate fix and runs validation.
6. TraceFix prepares a solution report and a PR-ready summary. Actual GitHub PR creation is deferred.

The frontend must show different workflow stages and next actions depending on the selected mode and issue state. For example:
- Manual mode, report ready: **Review report** and **Approve fix generation**.
- Fix being generated: show progress and disable conflicting actions.
- PR-ready demo result: show a clearly labelled placeholder review action or a disabled “GitHub integration coming later” action.
- Failed validation: show the failure and available retry/review action, not a false success state.

Changing the mode in the UI must not falsely imply the backend policy changed if there is no API behind it. Use the documented settings API if it exists; otherwise isolate it behind a settings adapter and label the current mode as demo/local state.

Do not automatically approve, merge, deploy, or create real PRs.

---

## 8. AI refinement assistant — circular AI button and side panel

Every relevant issue card should have a small circular AI icon button. Clicking it opens a right-side assistant drawer without navigating away from the issue.

This is a **human-guided refinement workflow**, not a generic chatbot.

### Expected interaction

- The panel is scoped to the selected issue and its existing report/PR-ready demo state.
- Show relevant context: issue title, current diagnosis, proposed change, and demo review status when available.
- Provide a chat/input area where the user can say what is wrong or what should change. Example: “This fix does not follow our error-handling convention; use the existing logger and add a regression test.”
- Display assistant responses and a proposed change summary using clearly labelled demo responses.
- Where demo diff data is available, show a readable diff preview or changed-file summary.
- Provide explicit demo actions such as **Review proposed changes**, **Revise proposal**, and **Prepare updated fix**.
- Never imply that typing a message modified a repository, pushed code, or created a PR. The real code-editing/PR workflow will be implemented later.
- The assistant panel should remain available regardless of whether the example's PR-ready state is open, merged/accepted, or closed/rejected. For a closed/merged demo item, show it as context for a follow-up improvement; do not imply a closed PR can be modified in place.
- If the assistant backend is not implemented, create a clearly isolated mock interaction that demonstrates the UI without pretending a real code change occurred.

This feature may be marked as a future premium/paid feature in the UI, but do not build billing or payment functionality unless it already exists in the repository. A small “Premium” label or subtle lock indicator is enough for the frontend prototype.

---

## 9. Brief reports — subtle action and report drawer

Add a small, subtle **View report** action on issue cards and in the issue detail drawer.

The report is generated by the TraceFix workflow and shown on the dashboard. It is distinct from the concise future GitHub PR description.

### In automatic mode, the report should contain

- incident summary;
- observed symptoms and supporting evidence;
- suspected root cause and uncertainty;
- files/areas affected;
- summary of changes proposed;
- tests/checks run and their actual demo results;
- PR-ready summary/status, if prepared;
- remaining concerns or recommended follow-up.

### In manual-review mode

Before fix generation, the report contains:
- incident summary;
- evidence and suspected cause;
- why the issue may have occurred;
- recommended approach;
- risks/uncertainties;
- what will happen if the user approves fix generation.

After fix generation, show an updated solution report containing:
- changes proposed;
- files affected in the demo;
- validation results;
- PR-ready summary/status if prepared;
- remaining concerns.

The report UI should be a compact modal or right-side drawer consistent with the supplied references. Make it clear whether the report is an **initial investigation report** or a **post-fix solution report**.

If report content is not provided by the backend, use realistic demo fixtures and label them as sample/demo content.

---

## 10. GitHub and private repository integration — explicitly out of scope

Do not implement GitHub integration in this phase. This includes:
- OAuth or GitHub App installation;
- private/public repository access;
- listing real repositories or pull requests;
- reading commits or file contents from GitHub;
- creating branches, pushing commits, or opening PRs;
- checking actual PR review/merge status;
- managing GitHub tokens, permissions, or webhooks.

Do not research or solve the authentication approach during this task. It will be designed separately later.

Keep the frontend ready for future integration by using a replaceable repository/PR data adapter and clear UI placeholders. Use demo data only, visibly labelled as demo. Do not fabricate live GitHub state or claim that any real PR was created.

A future “Connect GitHub” button may be displayed as a disabled or informational placeholder, but it must not start an OAuth flow or ask the user for credentials.

---

## 11. Suggested routes and navigation

Inspect existing routes before deciding the final route names. Reuse current routes if they exist. Otherwise, a reasonable initial structure is:

- `/dashboard` — organisation overview;
- `/issues` — issue-first grid and filters;
- `/issues/:id` — issue detail, or use a drawer if that better fits the existing routing;
- `/repositories` — demo repository overview;
- `/analytics` — incidents and validation overview;
- `/settings` — operating mode and available configuration.

Do not build separate pages just to satisfy this list if a well-integrated existing route already exists.

Include sensible loading, empty, error, and populated states. Provide realistic sample data for local demonstration if the backend is not ready.

---

## 12. Responsive behaviour and interaction quality

- Desktop: spacious grid layout, top navigation, issue cards, and right-side detail/assistant drawers.
- Tablet: adapt the grid and prevent panels from becoming cramped.
- Mobile: collapse navigation appropriately, use one-column cards, and make drawers/modal panels usable.
- Buttons and controls must work; avoid decorative, inert UI.
- Add useful hover/focus states and keyboard accessibility.
- Include loading skeletons where data is fetched.
- Include empty states for no incidents, no configured repositories, and no PR-ready demo items.
- Include clear error states for API failures.
- Avoid excessive animation; use subtle transitions only.
- Preserve the existing app's established conventions where they conflict with generic suggestions in this prompt.

---

## 13. Data model and frontend architecture

Before implementing new types, inspect the existing data model and API contracts. Reuse them where appropriate.

If the required contracts do not exist, define frontend types for concepts such as:

- Organisation/workspace;
- Demo repository;
- Incident/issue;
- Incident severity;
- Investigation report;
- Workflow status;
- Validation result;
- PR-ready demo result;
- PR provenance (demo TraceFix-generated or demo external);
- Operating mode (automatic/manual);
- AI refinement conversation and proposed changes.

Keep data access separate from presentational components. Use the project's current state-management approach. Avoid duplicating server state in multiple unrelated places.

Create reusable components for:
- top navigation;
- overview metric cards;
- issue filters;
- issue cards;
- status/severity badges;
- issue detail drawer;
- report drawer/modal;
- AI refinement drawer;
- demo repository cards;
- settings mode selector;
- empty/loading/error states.

Do not over-engineer the architecture. Prefer a small number of well-defined components.

---

## 14. Definition of done

The frontend task is complete when:

1. You have read the README, project documentation, and attached TraceFix user-flow PDF before implementation.
2. The existing application starts using the documented commands.
3. The UI follows the supplied screenshots' light, mint-green, pale blue-grey, rounded-card visual language.
4. The dashboard is organisation-oriented and includes meaningful overview panels.
5. The issues page is the primary incident-management screen and shows issues before/after fix preparation.
6. Issue cards distinguish severity, workflow status, and demo provenance.
7. The detail drawer displays the available incident evidence, timeline, report, and PR-ready demo information.
8. The report action opens a useful report panel.
9. The circular AI button opens a contextual refinement drawer with a working demo interaction.
10. Auto and manual modes show different workflow stages and next actions.
11. Repository and PR information is visibly labelled as demo data unless supplied by an existing documented backend.
12. Loading, empty, error, and mobile states are handled.
13. Existing project functionality has not been broken.
14. No secrets or credentials are added to frontend code.
15. Mock data and deferred GitHub integration are explicitly documented.
16. The README or a relevant frontend document is updated with the implemented screens, run instructions, and mocked integrations.

---

## 15. Final implementation instructions

Start by inspecting and reading the project documentation. Then provide a short architecture summary and implementation plan.

After that, implement the frontend end-to-end. Do not stop at a design proposal or produce only static screenshots. Build the actual interactive frontend in the existing project.

Follow the supplied references closely. Do not redesign the product into a dark, neon, generic DevOps interface.

Keep the scope focused on the frontend. Do not implement the monitoring backend, AI repair engine, deployment orchestration, or GitHub integration.

When finished, report:
- which screens/components were implemented;
- which existing files were changed;
- how to run the application;
- which interactions are real frontend behaviour versus mocked demo behaviour;
- which integrations are explicitly deferred;
- any backend contracts or follow-up work still required.
