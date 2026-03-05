import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const manager = new THREE.LoadingManager();

let camera, scene, renderer, stats, object, loader;
let mixer;
let actions = {};
let activeAction = null;

const clock = new THREE.Clock();

// ✅ NOMBRES EXACTOS como tus .fbx (sin .fbx)
const params = {
  model: 'skin',
  action: 'animacion1', // animación inicial
};

const actionsList = [
  'animacion1',
  'animacion2',
  'animacion3',
  'animacion4',
  'animacion5',
];

init();

function init() {
  const container = document.createElement('div');
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.set(100, 200, 300);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);
  scene.fog = new THREE.Fog(0xa0a0a0, 200, 1000);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 5);
  hemiLight.position.set(0, 200, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 5);
  dirLight.position.set(0, 200, 100);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 180;
  dirLight.shadow.camera.bottom = -100;
  dirLight.shadow.camera.left = -120;
  dirLight.shadow.camera.right = 120;
  scene.add(dirLight);

  // ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
  grid.material.opacity = 0.2;
  grid.material.transparent = true;
  scene.add(grid);

  loader = new FBXLoader(manager);

  // ✅ Cargar SOLO el modelo
  loadModel(params.model);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 100, 0);
  controls.update();

  window.addEventListener('resize', onWindowResize);

  stats = new Stats();
  container.appendChild(stats.dom);

  // GUI (opcional)
  const gui = new GUI();
  gui.add(params, 'action', actionsList).name('Animación').onChange((value) => {
    playAction(value);
  });

  // ✅ Teclas 1..5
  window.addEventListener('keydown', (e) => {
    const idx = Number(e.key) - 1; // '1' -> 0
    if (idx >= 0 && idx < actionsList.length) {
      const name = actionsList[idx];
      params.action = name;
      playAction(name);
    }
  });
}

function loadModel(modelName) {
  loader.load(
    'models/fbx/' + modelName + '.fbx',
    (group) => {
      // limpiar modelo anterior
      if (object) scene.remove(object);

      object = group;

      object.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      scene.add(object);

      // mixer del modelo
      mixer = new THREE.AnimationMixer(object);
      actions = {};
      activeAction = null;

      // ✅ Cargar las 5 animaciones (se agregan al mismo mixer)
      actionsList.forEach((name) => loadAnimation(name));
    },
    undefined,
    (err) => console.error('❌ Error cargando modelo:', modelName, err)
  );
}

function loadAnimation(name) {
  loader.load(
    'models/fbx/' + name + '.fbx',
    (anim) => {
      const clip = anim.animations && anim.animations[0];
      if (!clip) return;

      const action = mixer.clipAction(clip);
      actions[name] = action;

      // reproduce la inicial cuando esté lista
      if (name === params.action && !activeAction) {
        playAction(name, true);
      }
    },
    undefined,
    (err) => console.error('❌ Error cargando animación:', name, err)
  );
}

function playAction(name, instant = false) {
  if (!mixer) return;
  const next = actions[name];
  if (!next) return; // todavía no cargó

  next.reset().play();

  if (activeAction && activeAction !== next) {
    if (instant) {
      activeAction.stop();
    } else {
      activeAction.fadeOut(0.2);
      next.fadeIn(0.2);
    }
  }

  activeAction = next;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
  stats.update();
}