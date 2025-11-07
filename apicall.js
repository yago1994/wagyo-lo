import { saveData } from "./firebase.js";
import { showRevise, hideRevise, rateButton, refreshRateButton } from "./ui-control.js";
// import dotenv from 'dotenv';
// dotenv.config();


let open_ai_response;
let responseText = "";
let apireturn;
let data;
let userPrompt = "";
let previous_prompt_result;
let revise_bool = false;
const sendBtn = document.getElementById("send-btn");
const reviseBtn = document.getElementById("revise-btn");
const positiveRatingButton = document.querySelector('#positive-rating');
let entityEl;
let entityContents;
let includes_scene = false
let includes_entity = false
let iteration = 0
let previous_prompt = ''

// openai_test();
function test(){
  console.log("Test successful");
} 

async function openai_test(prompt,revise_bool) {
  // let prompt = "Hello chat! reply with hello";
//   let system_status = `You are an A-Frame prompt generator focused on helping users create 3D assemblages of primitives as a-entities within the A-Frame framework. Your primary task is to understand user inputs and generate tailored prompts that result in A-Frame code, exclusively constructing 0.1x0.1x0.1 a-box a-entities. You update the a-entity without providing explanations.

// Users interact with the A-Frame prompt generator by providing their input, which leads to a prompt for A-Frame code that displays a 3D assemblage of primitives. They can then give feedback on the generated assemblage, which refines the prompt and produces an updated 3D scene. This iterative process continues until the user is satisfied with the A-Frame assemblage.

// Your main function is to facilitate users in creating 3D assemblages of primitives as a-entities in the A-Frame framework. You offer a recursive mechanism for input, enabling users without prior knowledge of prompt crafting to accomplish their 3D creation goals. Put the code inside <a-scene> tags.`

  console.log("content from script is",document.querySelector('script[api_reply]').getAttribute('api_reply'));
  let system_status = "hello";
  
  let user_revise = "Can you revise this code for the following user prompt? And put it inside <a-scene> tags. "
  // let prompt = "Pyramid";
 
  let api_key = process.env.OPENAI_API_KEY;

  let model = "gpt-4o";

  console.log(`API Fired`);

  // var url = "https://api.openai.com/v1/engines/text-davinci-003/completions";
  let url = "https://api.openai.com/v1/chat/completions";
  
  // Test
  var params = {
    "model": model,
    "messages": [
      {"role": "system", "content": system_status},
      {"role": "user", "content": prompt}
    ]
  };
  
  // If Revision
  if (revise_bool == true) {
    
    console.log(`User revision is ${prompt}`);
    console.log(`Previous content was ${previous_prompt_result}`);
    console.log(`Previous prompt had scene ${includes_scene}`);
    
    // If includes_entity == false
    if(!includes_scene){
      previous_prompt_result = "<a-scene> " + previous_prompt_result + " </a-scene>";
    }
      params = {
      "model": model,
      "messages": [
        {"role": "system", "content": system_status},
        {"role": "user", "content": user_revise + "user prompt:" + prompt + "Previous Code:" + previous_prompt_result}
      ]
    };
    console.log("Revision looks like this: " + user_revise + ". user prompt:" + prompt + ". Previous Code:" + previous_prompt_result);
  } else {
    console.log(`User prompt is ${prompt}`);
    // If New Prompt
      params = {
      "model": model,
      "messages": [
        {"role": "system", "content": system_status},
        {"role": "user", "content": prompt + " .Put it inside <a-scene> tags."}
      ]
    };
  }
  
  data = JSON.stringify(params);

  const response = await fetch(url, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api_key}`,
      },
      body: data,
  });

  responseText = await response.text();
  
  console.log(responseText);
  
  // Have until here moved to the server.js
  
  try {
      apireturn = JSON.parse(responseText).choices[0].message.content;
      console.log(apireturn);
      
      const tempDiv = document.createElement('div');
    
      const pattern_scene = /<a-scene>\n(.*)<\/a-scene>/s;
      const match_scene = apireturn.match(pattern_scene);
    
      if (match_scene) {
        const code = '<a-scene>\n'+match_scene[1]+'</a-scene>';
        console.log(code);
        tempDiv.innerHTML = code;
      } else {
        const pattern_entity = /<a-entity>\n(.*)<\/a-entity>/s;
        const match_scene = apireturn.match(pattern_entity);
        console.log("No match found.");
        if (match_scene){
          const code = '<a-entity>\n'+match_scene[1]+'</a-entity>';
          console.log(code);
          tempDiv.innerHTML = code;
        } else {
          tempDiv.innerHTML = apireturn;
        }
      }
    
      const scenetag = tempDiv.querySelector('a-scene');
      const entitytag = tempDiv.querySelector('a-entity');
    
      console.log(tempDiv.innerHTML);
    
    
      if (!scenetag){
        entityEl = tempDiv.querySelector('a-entity');
        entityContents = entityEl.innerHTML;
        includes_scene = false;
      } else {
        entityEl = tempDiv.querySelector('a-scene');

        entityContents = entityEl.innerHTML;
        includes_scene = false;
        
      }
    
      console.log(entityContents);
      // Save the previous prompt in case its needed
      previous_prompt_result = entityContents;
    
      var scene = document.querySelector('a-scene');
    
      // This only works to clean the last object whatever it is
      if(revise_bool){
        const myEntity = document.querySelector("#new-object");
        const parentEntity = myEntity.parentNode;
        parentEntity.removeChild(myEntity);
        saveData(previous_prompt,apireturn, iteration, false, true, prompt);
      } else {
        saveData(prompt,apireturn, iteration);
      }
    
      // Add new entity
      var pyramid = document.createElement('a-entity');
      pyramid.setAttribute('id', 'new-object');
    
      // Append each child element of the temporary div to the scene
      while (entityEl.firstChild) {
        pyramid.appendChild(entityEl.firstChild);
      }
    
      scene.appendChild(pyramid);
    
      // Hide the loading bar after the API call is complete
      sendBtn.innerText = "Send!";
      sendBtn.style.backgroundColor = '#2b8b57';
      reviseBtn.innerText = "Revise!";
      reviseBtn.style.backgroundColor = '#2b8b57';
    
      document.getElementById("myAudio").play();
    
      // Display Revision fields
      showRevise();
    
      // Increase iteration for recording user sessions
      iteration += 1;
      previous_prompt = prompt;
  } catch (err) {
      console.error(err);
      if(revise_bool){
        reviseBtn.innerText = "Error! Resend!";
        reviseBtn.style.backgroundColor = '#c13e3c';
      } else {
        sendBtn.innerText = "Error! Resend";
        sendBtn.style.backgroundColor = '#c13e3c';
      }
    
    document.getElementById("Error").play();
  }

  console.log("supposedly fired the api");
  
  // Now we have the object, can we update the A-Frame realtime?
  
}

sendBtn.addEventListener("click", (event) => {
  // handle click event for Send button
  // event.preventDefault();
  console.log("content from script is",document.querySelector('script[api_reply]').getAttribute('api_reply'));
  
  userPrompt = document.querySelector('input[name="user-prompt"]').value;
    console.log('User prompt:', userPrompt);
  // get input values and do something
  document.getElementById("Bricks").play();
  sendBtn.innerText = "Loading...";
  sendBtn.style.backgroundColor = '#5cc68d';
  // sendBtn.style.animation = 'color-transition 4s infinite;'
  // Hide Revision fields while API is being called
  hideRevise();
  // Call your API function and pass the shape string as a parameter
  // openai_test(userPrompt,false);
  // Refresh the Rate button
  refreshRateButton();
});

reviseBtn.addEventListener("click", (event) => {
  // handle click event for Revise button
  event.preventDefault();
  const revisePrompt = document.querySelector('input[name="revise-prompt"]').value;
  console.log('Revise prompt:', revisePrompt);
  document.getElementById("Bricks").play();
  reviseBtn.innerText = "Loading...";
  reviseBtn.style.backgroundColor = '#5cc68d';
  // Call your API function and pass the shape string as a parameter
  openai_test(revisePrompt,true);
  // Refresh the Rate button
  refreshRateButton();
});

positiveRatingButton.addEventListener("click", (event) => {
  // handle click event for Revise button
  event.preventDefault();
  const previous_iteration = iteration - 1;
  const tagValue = positiveRatingButton.dataset.tag;
    
  // Issue where it rewrites 
  if (tagValue == 0) {
    saveData(userPrompt, responseText, previous_iteration, true);
    rateButton();
  } else {
    saveData(userPrompt, responseText, previous_iteration, false);
    refreshRateButton();
  }
});