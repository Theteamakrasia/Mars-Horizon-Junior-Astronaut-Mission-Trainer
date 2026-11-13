# AI Usage & Declaration

**Project:** Mars Horizon — Junior Astronaut Mission Trainer  
**Event:** 2026 NASA Space Apps Challenge

## 1. AI Tools Used

The team used several AI-assisted tools during different stages of the project. Their use overlapped; no tool was assigned ownership of a particular feature or subsystem.

| Tool | How the team used it |
| --- | --- |
| **Anthropic Claude (Sonnet, web)** | Discussing project ideas and requirements, comparing possible approaches, explaining selected code or technical concepts, and reviewing or improving documentation. |
| **ChatGPT (Codex workflow; team-recalled model label: `luna-latest`)** | Assisting with repository and code understanding, implementation approaches, targeted code suggestions, debugging, test ideas, and technical documentation. |
| **OpenCode** with the configured labels **Space Bunny, DeepSeek, MiniMax, and LongCat** | Agent-assisted repository exploration, implementation guidance, code refinement, troubleshooting, and review of selected changes. These are the labels remembered by the team; they are not intended as a claim that each provider performed a separate, exclusive role. |
| **Google Gemini** | Exploring alternative solutions, explaining technical and scientific concepts, and supporting research, review, and documentation work. |

The exact model snapshots and a prompt-by-prompt record were not maintained. Therefore, the table describes the broad ways these tools supported the team; it does not claim that every tool performed every task.

## 2. What AI Assisted With

Across these tools, AI assistance was used selectively for:

- **Ideation and planning:** discussing the game concept, breaking down requirements, considering player journeys, and exploring possible features.
- **Technical understanding:** explaining APIs, browser behavior, TypeScript concepts, simulation logic, and software architecture.
- **Development support:** exploring selected parts of the codebase, comparing implementation options, suggesting targeted code changes, and helping interpret errors.
- **Testing and debugging:** proposing edge cases and test scenarios, interpreting test or build output, and helping investigate unexpected behavior.
- **Writing and communication:** drafting or refining project descriptions, in-game wording, README content, and technical documentation.

## 3. Data and Materials Provided to AI Tools

Depending on the task, the team provided project-related context such as:

- The NASA Space Apps Challenge brief, project goals, requirements, and design notes.
- Game-flow descriptions, resource rules, simulation behavior, and feature specifications.
- Relevant repository files, selected source-code sections, configuration, and implementation questions.
- Compiler, type-checker, test, and build output; error messages; and debugging details.
- Draft UI text, README content, and project documentation.
- Public technical documentation and scientific reference material relevant to the technologies and data services used by the project.

AI tools were used as assistants for working with these materials. The application’s live space-weather and astronomy content comes from the NASA and NOAA sources listed in the References section below, not from AI-generated observations.

## 4. Human Responsibility and Verification

AI output was treated as assistance and suggestions, not as an authoritative or automatically accepted result. Team members remained responsible for the project concept, feature priorities, engineering decisions, code integration, testing, and final submission.

AI tools did not independently build or own the complete project. Where suggested code or text was useful, the team reviewed and adapted it to the project. The team retained responsibility for checking behavior through code review, automated tests, type checks, build checks, and simulation-balance checks.

No AI system was assigned an independent project role, and no claim is made that a model authored the entire codebase.

## 5. References

### Scientific data and educational material

- **NASA Open APIs:** https://api.nasa.gov/  
  API portal for NASA data services used by the project.
- **NASA DONKI — Solar Flare (FLR) API:** https://api.nasa.gov/DONKI/FLR  
  Primary live source for solar-flare observations in the game.
- **NOAA Space Weather Prediction Center:** https://www.swpc.noaa.gov/  
  Secondary space-weather source.
- **NOAA GOES X-ray flare feed:** https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json  
  Fallback feed used when NASA DONKI data cannot be retrieved.
- **NASA Astronomy Picture of the Day (APOD):** https://apod.nasa.gov/apod/astropix.html  
  Daily astronomy image and explanatory material; the game requests Mars-related APOD content through NASA's API.
- **NASA Image and Video Library:** https://images.nasa.gov/  
  Source for the curated NASA imagery used in the game. Image IDs, displayed credits, and NASA detail-page links are recorded in `src/data/nasaGallery.ts`.

The curated gallery includes NASA image records credited to NASA and relevant NASA centres or partner organisations (for example, JPL-Caltech, GSFC, USGS, ASU, SwRI, and ESA where indicated on the individual cards). The in-game credit and source link should be retained with each image.

**Reference-tracking note:** The current gallery records image-level NASA IDs, credits, and detail links. Some short educational facts are stored with an agency/centre credit but do not each have a separate source-page URL in the code. A source-specific link for every static fact would make the fact catalogue more fully auditable.

### Development libraries and tools

- **TypeScript:** https://www.typescriptlang.org/
- **Vite:** https://vite.dev/
- **Vitest:** https://vitest.dev/
- **html-validate:** https://html-validate.org/
- **Node.js:** https://nodejs.org/
- **Docker Engine and Docker Compose:** https://docs.docker.com/
- **NGINX:** https://nginx.org/
- **GNU Make:** https://www.gnu.org/software/make/

The package manifest lists TypeScript, Vite, Vitest, and html-validate as development dependencies. The current application architecture has no third-party runtime npm dependencies.

### Fonts

The project loads these font families from Google Fonts:

- **Nunito:** https://fonts.google.com/specimen/Nunito
- **Orbitron:** https://fonts.google.com/specimen/Orbitron
- **Outfit:** https://fonts.google.com/specimen/Outfit

### Project-owned and bundled assets

The repository's `Assets/` directory contains the artwork, images, icons, audio, and video used by the experience. NASA gallery imagery is separately identified and credited in `src/data/nasaGallery.ts`. The repository does not currently provide a complete, consolidated per-file creator/source/licence register for every bundled asset. Before public distribution, the team should confirm the provenance and licence of each non-original asset and add missing credits.

---

This declaration reflects the team's available recollection of AI-tool use and the sources visible in the project. It is intended to disclose AI assistance without overstating the role of any model or treating AI-generated output as a substitute for the team's work.
