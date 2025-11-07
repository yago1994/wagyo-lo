/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in fastify.get and fastify.post below
 */

require("dotenv").config();

const path = require("path");
// const { Configuration, OpenAIApi } = require("openai");
const api_request = require("./api_request.js");

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false,
});

// ADD FAVORITES ARRAY VARIABLE FROM TODO HERE
// const configuration = new Configuration({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const openai = new OpenAIApi(configuration);

// async function openai_test_1(){
//   console.log("HEllo world");

//   try {
//     const completion = await openai.createCompletion({
//       model: "text-davinci-003",
//       prompt: "Hello world",
//     });
//     console.log(completion.data.choices[0].text);
//   } catch (error) {
//     if (error.response) {
//       console.log(error.response.status);
//       console.log(error.response.data);
//     } else {
//       console.log(error.message);
//     }
//   }
// }


// Setup our static files
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});

// Formbody lets us parse incoming forms
fastify.register(require("@fastify/formbody"));

// View is a templating manager for fastify
fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});

// Load and parse SEO data
const seo = require("./src/seo.json");

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_URL = process.env.PUBLIC_URL;

if (!seo.url || seo.url === "glitch-default") {
  const localHost = HOST === "0.0.0.0" ? "localhost" : HOST;
  seo.url = PUBLIC_URL || `http://${localHost}:${PORT}`;
}

/**
 * Our home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */
fastify.get("/", function (request, reply) {
  // params is an object we'll pass to our handlebars template
  let params = { seo: seo };

  // The Handlebars code will be able to access the parameter values and build them into the page
  return reply.view("/src/pages/index.hbs", params);
});

/**
 * Our POST route to handle and react to form submissions
 *
 * Accepts body data indicating the user choice
 
 // MAKE THE API CALL REQUESTS HERE AND PASS THE CONTENT TO THE CLIENT-SIDE
 */
fastify.post("/", function (request, reply) {
  // Build the params object to pass to the template
  let params = { seo: seo };
  
  console.log("triggered");

  let prompt = request.body.user_prompt;
  let revise = request.body.revise_bool;
  let previous_prompt = request.body.previous_prompt;
  let includes_scene = request.body.includes_scene;
  console.log("Incoming request body", {
    prompt,
    revise,
    hasPreviousPrompt: Boolean(previous_prompt),
    includes_scene,
  });
  
  // Need to detect if revise is true or false
  // API CALL AND GET RESULTS NEED TO HAPPEN HERE
    
  // Send api to HTML
  sendResultToHTML(reply, prompt, revise, previous_prompt, includes_scene);
  
  // The Handlebars template will use the parameter values to update the page with the chosen color
  // reply.view("/src/pages/index.hbs", params);
  // reply.send({ result: testresult });
});

// Run the server and report out to the logs
fastify.listen({ port: PORT, host: HOST }, function (err, address) {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const announcedHost = HOST === "0.0.0.0" ? "localhost" : HOST;
  const resolvedUrl = PUBLIC_URL || `http://${announcedHost}:${PORT}`;
  console.log(`Server running at ${resolvedUrl}`);
  if (resolvedUrl !== address) {
    console.log(`Bound address: ${address}`);
  }
});

// Asynchronous function to wait for the API call to be finalized
async function sendResultToHTML(reply, prompt, revise_bool, previous_prompt,includes_scene){
  try {
    const testresult = await api_request(
      prompt,
      revise_bool,
      previous_prompt,
      includes_scene
    );

    // This works!
    reply.send({ result: testresult});
  } catch (error) {
    if (error?.code === "OPENAI_TIMEOUT") {
      reply.status(504).send({ error: "openai_timeout" });
      return;
    }

    console.error("Failed to fulfil OpenAI request", {
      message: error?.message,
      code: error?.code,
    });
    reply.status(500).send({ error: "openai_error" });
  }
}