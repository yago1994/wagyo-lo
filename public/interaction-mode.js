window.DRAG_MODE_ACTIVE = true;

window.addEventListener("DOMContentLoaded", () => {
  const sceneEl = document.querySelector("a-scene");
  if (!sceneEl) {
    return;
  }

  const cursorEl = document.getElementById("mouse-cursor");

  const setCursorVisible = (visible) => {
    if (!cursorEl) {
      return;
    }
    const applyVisibility = () => {
      if (cursorEl.object3D) {
        cursorEl.object3D.visible = visible;
      }
    };

    if (cursorEl.hasLoaded) {
      applyVisibility();
    } else {
      cursorEl.addEventListener("loaded", applyVisibility, { once: true });
    }
  };

  setCursorVisible(false);

  const enterDragMode = () => {
    window.DRAG_MODE_ACTIVE = true;
    document.body.classList.add("drag-mode");
    setCursorVisible(false);
  };

  enterDragMode();
});

