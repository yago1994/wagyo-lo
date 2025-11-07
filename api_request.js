const { Configuration, OpenAIApi } = require("openai");

const DEFAULT_SYSTEM_PROMPT = `You are an A-Frame prompt generator focused on helping users create 3D assemblages of primitives as a-entities within the A-Frame framework. Your primary task is to understand user inputs and generate tailored prompts that result in A-Frame code, exclusively constructing 0.1x0.1x0.1 a-box a-entities. You update the a-entity without providing explanations.

Users interact with the A-Frame prompt generator by providing their input, which leads to a prompt for A-Frame code that displays a 3D assemblage of primitives. They can then give feedback on the generated assemblage, which refines the prompt and produces an updated 3D scene. This iterative process continues until the user is satisfied with the A-Frame assemblage.

Your main function is to facilitate users in creating 3D assemblages of primitives as a-entities in the A-Frame framework. You offer a recursive mechanism for input, enabling users without prior knowledge of prompt crafting to accomplish their 3D creation goals. Put the code inside <a-scene> tags.`;

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  baseOptions: {
    timeout: 15000,
  },
});

const openai = new OpenAIApi(configuration);

async function api_request(prompt, revise_bool, previous_prompt_result, includes_scene = false) {
  const system_status = DEFAULT_SYSTEM_PROMPT;
  const user_revise = "Can you revise this code for the following user prompt? And put it inside <a-scene> tags. ";
  const model = "gpt-3.5-turbo";

  console.log(`API Fired`);

  let params = {
    model,
    messages: [
      { role: "system", content: system_status },
      { role: "user", content: prompt },
    ],
  };

  console.log("Outbound OpenAI request", {
    revise: revise_bool,
    prompt,
    includeScene: includes_scene,
    previousPromptLength: previous_prompt_result ? previous_prompt_result.length : 0,
  });

  if (revise_bool === true) {
    console.log(`User revision is ${prompt}`);
    console.log(`Previous content was ${previous_prompt_result}`);
    console.log(`Previous prompt had scene ${includes_scene}`);

    const previousWrapped = includes_scene
      ? previous_prompt_result
      : `<a-scene> ${previous_prompt_result} </a-scene>`;

    params = {
      model,
      messages: [
        { role: "system", content: system_status },
        {
          role: "user",
          content: `${user_revise}user prompt:${prompt}Previous Code:${previousWrapped}`,
        },
      ],
    };
    console.log(
      `Revision looks like this: ${user_revise}. user prompt:${prompt}. Previous Code:${previousWrapped}`
    );
  } else {
    console.log(`User prompt is ${prompt}`);

    params = {
      model,
      messages: [
        { role: "system", content: system_status },
        { role: "user", content: `${prompt} .Put it inside <a-scene> tags.` },
      ],
    };
  }

  try {
    const response = await openai.createChatCompletion(params);
    const responseText = await response.data.choices[0].message.content;

    console.log(responseText);
    console.log("OpenAI response received", {
      characters: responseText.length,
    });

    return responseText;
  } catch (error) {
    const status = error?.response?.status;
    const message = error?.response?.data?.error?.message || error.message;
    const code = error?.code;
    const isTimeout =
      code === "ETIMEDOUT" ||
      (typeof message === "string" && message.toLowerCase().includes("timeout"));

    console.error("OpenAI request failed", {
      status,
      code,
      message,
    });

    if (isTimeout) {
      const timeoutError = new Error("OpenAI request timed out");
      timeoutError.code = "OPENAI_TIMEOUT";
      timeoutError.cause = error;
      throw timeoutError;
    }

    const wrapped = new Error("OpenAI request failed");
    wrapped.code = "OPENAI_ERROR";
    wrapped.cause = error;
    throw wrapped;
  }
}

module.exports = api_request;