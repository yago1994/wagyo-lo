# Wagyo Lo

Wagyo Lo is a Fastify application that renders a Handlebars view and exposes a JSON endpoint for generating and revising A-Frame code with OpenAI's Chat Completions API.

## Requirements

- Node.js 18 or later
- An OpenAI API key configured in `.env` as `OPENAI_API_KEY`

## Getting Started

1. Install dependencies and start the local server:

   ```bash
   npm install
   npm start
   ```

2. Visit `http://localhost:3000` to access the UI. The root route renders `index.hbs`, which includes the input form and client scripts under `public/`.

3. Submitting the form triggers `apicall.js`, which shows a loading state and sends the prompt to the Fastify POST endpoint (`/`). The server logs the inbound payload, forwards it to OpenAI, and returns the generated code as JSON.

4. The API response is parsed client-side, converted into DOM nodes, and injected into the live A-Frame scene. Revisions pass the previous response back to the server so OpenAI can build upon existing code.

To change the network address, export `PORT`, `HOST`, or `PUBLIC_URL` before running `npm start`.

## Project Layout

- `server.js` – Fastify setup, routing, request logging, and template rendering.
- `api_request.js` – Server-side OpenAI helper that builds chat payloads and logs all outbound responses.
- `public/` – Static assets (A-Frame scene, client scripts, styles, sounds).
- `src/pages/index.hbs` – Handlebars template rendered for the root route.
- `src/seo.json` – Metadata injected into the template.

## Environment

Create a `.env` file with the keys your deployment needs (remember Fastify ignores `.env` unless you load it). At minimum, provide `OPENAI_API_KEY`. You can also set `SYSTEM_STATUS`, `PORT`, `HOST`, or `PUBLIC_URL` to control behaviour in different environments.

Example:

```
OPENAI_API_KEY="sk-..."
PORT=3000
HOST=0.0.0.0
```
