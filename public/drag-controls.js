const THREE = AFRAME.THREE;

AFRAME.registerComponent("movable-group", {
  init: function () {
    this.sceneEl = this.el.sceneEl;
    this.dragging = false;
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.startIntersection = new THREE.Vector3();
    this.startPosition = new THREE.Vector3();
    this.intersectionPoint = new THREE.Vector3();
    this.delta = new THREE.Vector3();
    this.dragNormal = new THREE.Vector3(0, 1, 0);
    this.dragPlane = new THREE.Plane();
    this.cameraWorldPos = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.projectedPoint = new THREE.Vector3();
    this.grabOffset = new THREE.Vector3();
    this.grabDistance = 0;

    this.cameraEl = null;
    this.lookControlsEnabled = true;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    this.el.classList.add("movable");
    this.el.addEventListener("mousedown", this.onMouseDown);
  },

  remove: function () {
    this.el.removeEventListener("mousedown", this.onMouseDown);
    this.detachListeners();
  },

  onMouseDown: function (evt) {
    if (!evt.detail || !evt.detail.intersection) {
      return;
    }

    this.dragging = true;
    this.el.emit("drag-started");
    this.startPosition.copy(this.el.object3D.position);
    this.startIntersection.copy(evt.detail.intersection.point);
    this.dragPlane.setFromNormalAndCoplanarPoint(this.dragNormal, this.startIntersection);
    this.grabOffset.copy(this.startPosition).sub(this.startIntersection);

    if (this.sceneEl && this.sceneEl.camera) {
      this.sceneEl.camera.getWorldPosition(this.cameraWorldPos);
      this.grabDistance = this.cameraWorldPos.distanceTo(this.startIntersection);
    } else {
      this.grabDistance = 0;
    }

    evt.stopPropagation();

    if (!this.cameraEl && this.sceneEl && this.sceneEl.camera) {
      this.cameraEl = this.sceneEl.camera.el;
    }

    if (this.cameraEl) {
      const lookControls = this.cameraEl.components["look-controls"];
      if (lookControls) {
        this.lookControlsEnabled = lookControls.data.enabled !== false;
        lookControls.pause();
      }
    }

    const canvas = this.sceneEl.canvas;
    if (canvas) {
      canvas.addEventListener("mousemove", this.onMouseMove);
    }
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("keydown", this.onKeyDown);

    evt.preventDefault();
  },

  onMouseMove: function (evt) {
    if (!this.dragging) {
      return;
    }

    const canvas = this.sceneEl.canvas;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneEl.camera);

    this.direction.copy(this.raycaster.ray.direction);
    this.sceneEl.camera.getWorldPosition(this.cameraWorldPos);

    if (this.grabDistance <= 0) {
      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersectionPoint)) {
        this.el.object3D.position.copy(this.intersectionPoint).add(this.grabOffset);
      }
      return;
    }

    this.projectedPoint
      .copy(this.direction)
      .multiplyScalar(this.grabDistance)
      .add(this.cameraWorldPos);

    this.el.object3D.position.copy(this.projectedPoint).add(this.grabOffset);
  },

  onMouseUp: function () {
    if (!this.dragging) {
      return;
    }

    this.el.emit("drag-ended");
    this.dragging = false;
    this.detachListeners();
  },

  onKeyDown: function (evt) {
    if (!this.dragging) {
      return;
    }

    if (evt.key === "Delete" || evt.key === "Backspace") {
      const parent = this.el.parentNode;
      this.dragging = false;
      this.detachListeners();
      this.el.emit("drag-ended");
      this.el.emit("assembly-removed");
      if (parent) {
        parent.removeChild(this.el);
      }
    }
  },

  detachListeners: function () {
    const canvas = this.sceneEl.canvas;
    if (canvas) {
      canvas.removeEventListener("mousemove", this.onMouseMove);
    }
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("keydown", this.onKeyDown);

    if (this.cameraEl) {
      const lookControls = this.cameraEl.components["look-controls"];
      if (lookControls) {
        if (this.lookControlsEnabled) {
          lookControls.play();
        } else {
          lookControls.pause();
        }
      }
    }
  },
});

