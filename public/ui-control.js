import { saveData } from "./firebase.js";

const THREE = AFRAME.THREE;

const sendBtn = document.getElementById("send-btn");
const reviseBtn = document.getElementById("revise-btn");
const positiveRatingButton = document.querySelector("#positive-rating");
const statusBanner = document.getElementById("color-result");

let apireturn;
let userPrompt = "";
let entityEl;
let entityContents;
let includes_scene = false;
let includes_entity = false;
let iteration = 0;
let previous_prompt;
let previous_prompt_result;
let revise_bool = false;
let latestAssembly = null;

setStatus();

function setStatus(message = "", tone = "info") {
  if (!statusBanner) {
    return;
  }

  statusBanner.textContent = message;
  statusBanner.style.display = message ? "block" : "none";

  let background = "rgba(255,255,255,0.85)";
  let color = "#333333";

  if (tone === "warning") {
    background = "#fff4e5";
    color = "#b35b00";
  } else if (tone === "error") {
    background = "#fdecea";
    color = "#b3261e";
  } else if (tone === "success") {
    background = "#e8f5e9";
    color = "#256029";
  }

  statusBanner.style.backgroundColor = background;
  statusBanner.style.color = color;
  statusBanner.style.padding = message ? "0.75rem 1rem" : "0";
  statusBanner.style.borderRadius = message ? "12px" : "0";
  statusBanner.style.marginBottom = message ? "1rem" : "0";
}

function handleRequestFailure(isRevision, status, responseText) {
  const isTimeout = status === 504 ||
    (typeof responseText === "string" && responseText.includes("openai_timeout"));

  if (isTimeout) {
    setStatus(
      "OpenAI timed out after 15 seconds. Try shortening your prompt or resubmitting in a bit.",
      "warning"
    );
  } else {
    setStatus(
      "Something went wrong while talking to the builder. Please try again.",
      "error"
    );
  }

  document.getElementById("Error").play();

  if (isRevision) {
    reviseBtn.innerText = "Try Again";
    reviseBtn.style.backgroundColor = "#c13e3c";
  } else {
    sendBtn.innerText = "Try Again";
    sendBtn.style.backgroundColor = "#c13e3c";
  }
}

// Prompt button functionality
sendBtn.addEventListener("click", function (event) {
  // Prevent the default form submission behavior
  event.preventDefault();

  document.getElementById("Bricks").play();

  userPrompt = document.querySelector('input[name="user_prompt"]').value;
  revise_bool = false;
  previous_prompt = userPrompt;

  setStatus("Generating a new build…", "info");

  // Send an Ajax request to the server
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/", true);
  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhr.timeout = 20000;
  xhr.onload = function () {
    if (xhr.status === 200) {
      // Update the HTML content with the response from the server
      var response = JSON.parse(xhr.responseText);
      // console.log(response.result);
      apireturn = response.result;  

      // Offload specifics of response handling
      handleResponse(response.result, revise_bool);
      setStatus("Builder ready!", "success");
    } else {
      console.error("Request failed. Returned status of " + xhr.status);
      handleRequestFailure(revise_bool, xhr.status, xhr.responseText);
    }
  };
  xhr.onerror = function () {
    console.error("Network error while making request to the builder.");
    handleRequestFailure(revise_bool, xhr.status || 0, xhr.responseText);
  };
  xhr.ontimeout = function () {
    console.error("Client-side timeout waiting for builder response.");
    handleRequestFailure(revise_bool, 504, "client_timeout");
  };
  xhr.send(
    JSON.stringify({
      user_prompt: document.getElementById("user_prompt").value,
      revise_bool: revise_bool,
    })
  );

  sendBtn.innerText = "Loading...";
  sendBtn.style.backgroundColor = "#5cc68d";
  // sendBtn.style.animation = 'color-transition 4s infinite;'
  // Hide Revision fields while API is being called
  hideRevise();
  // Refresh the Rate button
  refreshRateButton();
});

reviseBtn.addEventListener("click", (event) => {
  // handle click event for Revise button
  event.preventDefault();

  const revisePrompt = document.querySelector(
    'input[name="revise_prompt"]'
  ).value;
  // console.log("Revise prompt:", revisePrompt);

  userPrompt = document.querySelector('input[name="revise_prompt"]').value;
  revise_bool = true;

  document.getElementById("Bricks").play();

  setStatus("Revising the build…", "info");

  // Send an Ajax request to the server
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/", true);
  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhr.timeout = 20000;
  xhr.onload = function () {
    if (xhr.status === 200) {
      // Update the HTML content with the response from the server
      var response = JSON.parse(xhr.responseText);
      // console.log(response.result);

      // Offload specifics of response handling
      handleResponse(response.result, revise_bool);
      setStatus("Revision applied!", "success");
    } else {
      console.error("Request failed. Returned status of " + xhr.status);
      handleRequestFailure(revise_bool, xhr.status, xhr.responseText);
    }
  };
  xhr.onerror = function () {
    console.error("Network error while making request to the builder.");
    handleRequestFailure(revise_bool, xhr.status || 0, xhr.responseText);
  };
  xhr.ontimeout = function () {
    console.error("Client-side timeout waiting for builder response.");
    handleRequestFailure(revise_bool, 504, "client_timeout");
  };
  // Call your API function and pass the shape string as a parameter
  xhr.send(
    JSON.stringify({
      user_prompt: document.getElementById("revise_prompt").value,
      revise_bool: revise_bool,
      previous_prompt: previous_prompt_result,
      includes_scene: includes_scene,
    })
  );

  reviseBtn.innerText = "Loading...";
  reviseBtn.style.backgroundColor = "#5cc68d";

  // Refresh the Rate button
  refreshRateButton();
});

positiveRatingButton.addEventListener("click", (event) => {
  // handle click event for Revise button
  event.preventDefault();
  const previous_iteration = iteration - 1;
  const tagValue = positiveRatingButton.dataset.tag;

  // Handle toggle of favoriting
  if (tagValue == 0) {
    saveData(userPrompt, apireturn, previous_iteration, true);
    rateButton();
  } else {
    saveData(userPrompt, apireturn, previous_iteration, false);
    refreshRateButton();
  }
});

// Handle what to do with the return from API

// Need to handle if coming from revision or if coming from prompt
function handleResponse(apireturn, revise_bool) {
  try {
    const tempDiv = document.createElement("div");

    const pattern_scene = /<a-scene>\n(.*)<\/a-scene>/s;
    const match_scene = apireturn.match(pattern_scene);
    
    // console.log(revise_bool);

    if (match_scene) {
      const code = "<a-scene>\n" + match_scene[1] + "</a-scene>";
      // console.log("matches scene",code);
      tempDiv.innerHTML = code;
    } else {
      const pattern_entity = /<a-entity>\n(.*)<\/a-entity>/s;
      const match_scene = apireturn.match(pattern_entity);
      // console.log("No match found.");
      if (match_scene) {
        const code = "<a-entity>\n" + match_scene[1] + "</a-entity>";
        // console.log(code);
        tempDiv.innerHTML = code;
      } else {
        tempDiv.innerHTML = apireturn;
      }
    }

    const scenetag = tempDiv.querySelector("a-scene");
    const entitytag = tempDiv.querySelector("a-entity");

    // console.log(tempDiv.innerHTML);

    if (!scenetag) {
      entityEl = tempDiv.querySelector("a-entity");
      if (entityEl) {
        entityContents = entityEl.innerHTML;
      }
      includes_scene = false;
    } else {
      entityEl = tempDiv.querySelector("a-scene");
      if (entityEl) {
        entityContents = entityEl.innerHTML;
      }
      includes_scene = false;
    }

    if (!entityEl) {
      console.warn("API response did not include an a-scene or a-entity wrapper; wrapping in default entity.");
      entityEl = document.createElement("a-entity");
      entityEl.innerHTML = apireturn;
      entityContents = entityEl.innerHTML;
    }

    // console.log(entityContents);
    // Save the previous prompt in case its needed
    previous_prompt_result = entityContents;

    var scene = document.querySelector("a-scene");

    // This only works to clean the last object whatever it is
    if (revise_bool) {
      // console.log("this request is a revision");
      if (latestAssembly && latestAssembly.parentNode) {
        latestAssembly.emit("assembly-removed");
        latestAssembly.parentNode.removeChild(latestAssembly);
      }
      saveData(previous_prompt,apireturn, iteration, false, true, userPrompt);
    } else {
      saveData(userPrompt,apireturn, iteration);
    }
    // -------

    // Add new entity
    var pyramid = document.createElement("a-entity");
    pyramid.setAttribute("movable-group", "");
    pyramid.classList.add("generated-assembly");
    pyramid.dataset.prompt = userPrompt || "";

    // Wrap generated content so local origin stays consistent
    const contentWrapper = document.createElement("a-entity");
    contentWrapper.classList.add("assembly-content-wrapper");
    pyramid.appendChild(contentWrapper);

    // Append each child element of the temporary div to the wrapper
    while (entityEl.firstChild) {
      contentWrapper.appendChild(entityEl.firstChild);
    }

    const label = document.createElement("a-entity");
    label.setAttribute("text", "value", userPrompt || "");
    label.setAttribute("text", "align", "center");
    label.setAttribute("text", "color", "#333333");
    label.setAttribute("text", "width", 2);
    label.setAttribute("text", "wrapCount", 24);
    label.setAttribute("position", "0 1 0");
    label.setAttribute(
      "geometry",
      "primitive: plane; height: 0.2; width: 1.4"
    );
    label.setAttribute(
      "material",
      "color: #ffffff; opacity: 0.88"
    );
    label.setAttribute("visible", "false");

    pyramid.addEventListener("mouseenter", () => {
      label.setAttribute("visible", "true");
    });
    pyramid.addEventListener("mouseleave", () => {
      label.setAttribute("visible", "false");
    });

    pyramid.appendChild(label);

    scene.appendChild(pyramid);
    latestAssembly = pyramid;

    positionLabelWithRetry(contentWrapper, label);

    // Hide the loading bar after the API call is complete
    sendBtn.innerText = "Send!";
    sendBtn.style.backgroundColor = "#2b8b57";
    reviseBtn.innerText = "Revise!";
    reviseBtn.style.backgroundColor = "#2b8b57";

    document.getElementById("myAudio").play();

    // Display Revision fields
    showRevise();

    // Increase iteration for recording user sessions
    iteration += 1;

    // console.log("completed the api request and return");
  } catch (err) {
    console.error(err);

    document.getElementById("Error").play();
    setStatus("We couldn't render that response. Please try again.", "error");
  }
}

function positionLabelWithRetry(wrapper, label, retries = 5, delay = 100) {
  if (adjustLabelPosition(wrapper, label)) {
    return;
  }

  if (retries <= 0) {
    return;
  }

  setTimeout(() => positionLabelWithRetry(wrapper, label, retries - 1, delay), delay);
}

function adjustLabelPosition(wrapper, label) {
  if (!wrapper || !label) {
    return false;
  }

  const object3D = wrapper.object3D;
  if (!object3D) {
    return false;
  }

  object3D.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object3D);

  if (!isFinite(box.max.y) || !isFinite(box.min.y)) {
    return false;
  }

  if (box.isEmpty()) {
    return false;
  }

  const topY = box.max.y;
  label.setAttribute("position", `0 ${topY + 0.1} 0`);

  return true;
}


function showRevise() {
  const revise_group = document.querySelector("#revise-group");
  const revise_button = document.querySelector("#revise-btn");

  revise_group.style.display = "block";
  revise_button.style.display = "block";
}

function hideRevise() {
  const revise_group = document.querySelector("#revise-group");
  const revise_button = document.querySelector("#revise-btn");

  revise_group.style.display = "none";
  revise_button.style.display = "none";
}

function rateButton() {
  const positiveRatingButton = document.querySelector("#positive-rating");

  // Perform the desired action when the positive rating button is clicked
  positiveRatingButton.innerText = "Thanks! 🌟";
  positiveRatingButton.style.color = "#ffffff";
  positiveRatingButton.style.backgroundColor = "#86b8c1";
  positiveRatingButton.dataset.tag = 1;
}

export function refreshRateButton() {
  const positiveRatingButton = document.querySelector("#positive-rating");

  // Perform the desired action when the positive rating button is clicked
  positiveRatingButton.innerText = "Like this build? 👍";
  positiveRatingButton.style.color = "#333333";
  positiveRatingButton.style.backgroundColor = "rgba(255,255,255,0.8)";
  positiveRatingButton.dataset.tag = 0;
}
