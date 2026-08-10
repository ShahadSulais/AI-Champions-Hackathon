# Knowledge Guardians | حُرّاس المعرفة

**Knowledge Guardians** is an AI-powered adaptive learning experience that transforms educational content into interactive story-based adventures using Google Gemini and OpenRouter API.

Users provide learning material, and the AI analyzes key concepts, generates a story, selects suitable educational mini-games, and creates adaptive learning paths based on performance.

## How It Works

1. The user provides learning content.
2. AI extracts key concepts and learning objectives.
3. The content is transformed into an interactive story.
4. Each concept is mapped to a suitable mini-game.
5. The learner progresses by completing educational challenges.
6. The experience adapts based on the learner's performance.
7. A personalized learning summary highlights strengths and concepts that need review.

## Structure

- `client/`: Frontend powered by Vite and Vanilla JS (Arabic RTL).
- `server/`: Backend powered by Node.js, Express, Google Gen AI SDK, and OpenRouter API.
- `shared/`: Shared Arabic normalizer, constants, and types.

## Running locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   Create a `.env` file from `.env.example` and set your `GEMINI_API_KEY` or `OPENROUTER_API_KEY`.

3. Development mode (starts client on port 5173 and server on port 3001):
   ```bash
   npm run dev
   ```

4. Run test suite:
   ```bash
   npm test
   ```

5. Build production bundle:
   ```bash
   npm run build
   ```

## Adaptive Learning

The experience responds to the learner's understanding:

- **Mastered:** Progresses to more advanced challenges.
- **Uncertain:** Receives additional examples or support.
- **Misconception Detected:** Enters a short remedial scene and is reassessed.

## Team

| Team Member | Role |
|---|---|
| **Shahad Sulais** | Team Member |
| **Sira Aldawood** | Team Member |
| **Reemas Alanizi** | Team Member |
| **Malak Afa** | Team Member |

## AI Champions Challenge 2026

Developed for the **AI Champions Challenge 2026**, Knowledge Guardians explores how generative AI can move beyond question generation to create complete, adaptive, and engaging learning experiences.
