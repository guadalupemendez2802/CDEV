import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ========== CONFIGURACIÓN INICIAL ==========
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.001);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
);
camera.position.set(0, 0, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Ocultar el canvas inicialmente hasta que se presione el botón
renderer.domElement.style.opacity = "0";
renderer.domElement.style.transition = "opacity 1s ease-in";

// ========== CONTROLES ==========
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 50;
controls.maxDistance = 1000;
controls.maxPolarAngle = Math.PI;

// Variables para movimiento con teclado
const keys = {};
// Configuración centralizada (valores fáciles de ajustar)
const CONFIG = {
  MOVE_SPEED: 2,
  STAR_COUNT: 50000,
  STAR_RANGE: 8000,
  CLOUD_COUNT: 70,
  CLOUD_TEXTURE_SIZE: 256,
  PARTICLE_COUNT: 30000,
};

// Event listeners para teclado
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// Mouse movement para rotación adicional
let isMouseDown = false;
let mouseX = 0;
let mouseY = 0;
let targetRotationX = 0;
let targetRotationY = 0;

renderer.domElement.addEventListener("mousedown", (e) => {
  isMouseDown = true;
  mouseX = e.clientX;
  mouseY = e.clientY;
});

renderer.domElement.addEventListener("mouseup", () => {
  isMouseDown = false;
});

renderer.domElement.addEventListener("mousemove", (e) => {
  if (isMouseDown) {
    const deltaX = e.clientX - mouseX;
    const deltaY = e.clientY - mouseY;
    targetRotationY += deltaX * 0.005;
    targetRotationX += deltaY * 0.005;
    mouseX = e.clientX;
    mouseY = e.clientY;
  }
});

// Helper: crear textura radial suave reutilizable para manchas de nebulosa
function createCloudTexture(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.8)");
  gradient.addColorStop(0.6, "rgba(255, 255, 255, 0.4)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

// Helper: elegir color de nebulosa (dos modos: 'cloud' para sprites, 'nebula' para partículas)
function pickNebulaColor(mode = "cloud") {
  const color = new THREE.Color();
  const r = Math.random();
  if (mode === "cloud") {
    if (r < 0.3) {
      color.setHSL(0.85 + Math.random() * 0.1, 0.8, 0.4 + Math.random() * 0.3);
    } else if (r < 0.6) {
      color.setHSL(0.5 + Math.random() * 0.15, 0.7, 0.3 + Math.random() * 0.4);
    } else {
      color.setHSL(0.0 + Math.random() * 0.1, 0.9, 0.4 + Math.random() * 0.3);
    }
  } else {
    // modo 'nebula' - partículas, rangos más intensos
    if (r < 0.25) {
      color.setHSL(0.85 + Math.random() * 0.15, 0.95, 0.4 + Math.random() * 0.4);
    } else if (r < 0.5) {
      color.setHSL(0.5 + Math.random() * 0.2, 0.9, 0.3 + Math.random() * 0.5);
    } else if (r < 0.75) {
      color.setHSL(0.0 + Math.random() * 0.15, 0.98, 0.4 + Math.random() * 0.4);
    } else {
      color.setHSL(0.55 + Math.random() * 0.1, 0.9, 0.5 + Math.random() * 0.3);
    }
  }
  return color;
}

// ========== ESTRELLAS BLANCAS ==========
function createStarfield() {
  const starGeometry = new THREE.BufferGeometry();
  const starCount = CONFIG.STAR_COUNT;
  const positions = [];

  // Crear muchas estrellas blancas pequeñas
  for (let i = 0; i < starCount; i++) {
  const x = (Math.random() - 0.5) * CONFIG.STAR_RANGE;
  const y = (Math.random() - 0.5) * CONFIG.STAR_RANGE;
  const z = (Math.random() - 0.5) * CONFIG.STAR_RANGE;
    positions.push(x, y, z);
  }

  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  // Material simple para estrellas blancas
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    alphaTest: 0.1,
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  // Asegurar que las estrellas se rendericen primero (detrás de todo)
  stars.renderOrder = -1;
  scene.add(stars);
  return stars;
}

const stars = createStarfield();

// ========== MANCHAS DE NEBULOSA (Polvo cósmico) ==========
function createNebulaClouds() {
  const clouds = new THREE.Group();
  const cloudCount = CONFIG.CLOUD_COUNT;
  // Reusar textura radial suave
  const cloudTexture = createCloudTexture(CONFIG.CLOUD_TEXTURE_SIZE);

  for (let i = 0; i < cloudCount; i++) {
    const size = 80 + Math.random() * 220; // Tamaño más grande para volumen

    // Colores de nebulosa (reutiliza la lógica, centralizada)
    const cloudColor = pickNebulaColor("cloud");

    const spriteMaterial = new THREE.SpriteMaterial({
      map: cloudTexture,
      color: cloudColor,
      transparent: true,
      opacity: 0.25 + Math.random() * 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(size, size, 1);

    // Posición aleatoria en el espacio
    sprite.position.set(
      (Math.random() - 0.5) * 2000,
      (Math.random() - 0.5) * 2000,
      (Math.random() - 0.5) * 2000
    );

    // Rotación aleatoria
    sprite.rotation.z = Math.random() * Math.PI * 2;

    clouds.add(sprite);
  }

  scene.add(clouds);
  return clouds;
}

const nebulaClouds = createNebulaClouds();

// ========== NEBULOSA CON PARTÍCULAS ==========
let nebulaDepth = 0; // Profundidad actual en la nebulosa

function createNebula() {
  const nebulaGeometry = new THREE.BufferGeometry();
  const particleCount = CONFIG.PARTICLE_COUNT;
  const positions = [];
  const colors = [];
  const sizes = [];

  let color = new THREE.Color();

  for (let i = 0; i < particleCount; i++) {
    const radius = Math.random() * 800 + 50;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    positions.push(x, y, z);

    // Colores de nebulosa más intensos y variados (reutiliza helper)
    color.copy(pickNebulaColor("nebula"));

    colors.push(color.r, color.g, color.b);
    sizes.push(Math.random() * 5 + 1.5); // Partículas más grandes
  }

  nebulaGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  nebulaGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  nebulaGeometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));

  const nebulaMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float time;
      void main() {
        vColor = color;
        vec3 pos = position;
        pos.y += sin(time + position.x * 0.01) * 2.0;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 + sin(time * 0.5) * 0.2);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
        float alpha = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
        // Hacer los colores más brillantes e intensos
        vec3 brightColor = vColor * 1.5;
        gl_FragColor = vec4(brightColor, alpha * 1.0);
      }
    `,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
  scene.add(nebula);
  return { mesh: nebula, material: nebulaMaterial };
}

const nebula = createNebula();

// ========== ILUMINACIÓN ==========
// Luz ambiental suave
const ambientLight = new THREE.AmbientLight(0x4444ff, 0.3);
scene.add(ambientLight);

// Luces de color para la nebulosa
const light1 = new THREE.PointLight(0xff44aa, 2, 500);
light1.position.set(100, 100, 100);
scene.add(light1);

const light2 = new THREE.PointLight(0x44aaff, 2, 500);
light2.position.set(-100, -100, 100);
scene.add(light2);

const light3 = new THREE.PointLight(0xaa44ff, 1.5, 400);
light3.position.set(0, 150, -100);
scene.add(light3);

// Luz direccional para objetos
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(50, 50, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// ========== OBJETOS 3D ==========

// NAVE ESPACIAL ALIEN
function createAlienSpaceship() {
  const group = new THREE.Group();
  group.rotation.set(0, 0, 0); // asegurar orientación correcta (no invertida)

  // Plato principal (anillo + disco)
  const rim = new THREE.TorusGeometry(14, 2.2, 24, 64);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x7e7e86,
    metalness: 0.95,
    roughness: 0.15,
    envMapIntensity: 1.0,
  });
  const rimMesh = new THREE.Mesh(rim, rimMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.castShadow = true;
  rimMesh.receiveShadow = true;
  group.add(rimMesh);

  const disc = new THREE.CylinderGeometry(12, 12, 1, 48);
  const discMat = new THREE.MeshStandardMaterial({
    color: 0x9da3a6,
    metalness: 0.9,
    roughness: 0.2,
  });
  const discMesh = new THREE.Mesh(disc, discMat);
  discMesh.rotation.x = Math.PI / 2;
  discMesh.position.y = 0.5;
  discMesh.castShadow = true;
  discMesh.receiveShadow = true;
  group.add(discMesh);

  // Cúpula superior
  const topDomeGeo = new THREE.SphereGeometry(6.5, 32, 32);
  const topDomeMat = new THREE.MeshPhysicalMaterial({
    color: 0x6fc7ff,
    transmission: 0.9,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const topDome = new THREE.Mesh(topDomeGeo, topDomeMat);
  topDome.position.y = 3.5;
  topDome.castShadow = true;
  group.add(topDome);

  // (Se elimina cúpula inferior para una silueta más limpia tipo platillo)

  // Ventanas luminosas alrededor del borde
  const windowGeo = new THREE.SphereGeometry(0.8, 12, 12);
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffe066,
    emissive: 0xffd34d,
    emissiveIntensity: 1.6,
    metalness: 0.2,
    roughness: 0.3,
  });
  const windowCount = 12; // cantidad moderada para look clásico
  for (let i = 0; i < windowCount; i++) {
    const angle = (i / windowCount) * Math.PI * 2;
    const r = 12.5;
    const w = new THREE.Mesh(windowGeo, windowMat);
    w.position.set(Math.cos(angle) * r, 0.2, Math.sin(angle) * r);
    group.add(w);
  }

  // Luz central inferior, como “haz” verde fluorescente
  const beam = new THREE.SpotLight(0x39ff14, 2.2, 160, Math.PI / 6, 0.6, 1);
  beam.position.set(0, -1.2, 0);
  beam.target.position.set(0, -25, 0);
  group.add(beam);
  group.add(beam.target);
  // Cono visual para el haz
  const beamGeo = new THREE.ConeGeometry(4.5, 22, 24, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x39ff14,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.position.set(0, -12.5, 0);
  beamMesh.rotation.x = Math.PI;
  group.add(beamMesh);

  group.position.set(-150, 60, -200);
  group.userData = {
    type: "alien",
    name: "Nave Espacial Alienígena",
    description:
      "Esta nave espacial de origen desconocido muestra tecnología avanzada más allá de nuestra comprensión. Sus materiales emiten una extraña fluorescencia verde que sugiere el uso de energía biológica. Los sensores detectan señales de vida orgánica en su interior, pero no hay respuesta a las comunicaciones. Se cree que podría ser una sonda de reconocimiento de una civilización distante, dejada aquí como un faro de advertencia o invitación.",
    music: "sounds/alien.mp3",
    isRotating: false,
  };

  return group;
}

// SATÉLITE ABANDONADO
function createAbandonedSatellite() {
  const group = new THREE.Group();

  // Cuerpo central - más detallado
  const bodyGeometry = new THREE.BoxGeometry(12, 12, 8);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x000000,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Paneles laterales del cuerpo
  const sidePanelGeometry = new THREE.BoxGeometry(0.5, 12, 8);
  const sidePanelMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666,
    metalness: 0.8,
    roughness: 0.2,
  });

  const leftPanel = new THREE.Mesh(sidePanelGeometry, sidePanelMaterial);
  leftPanel.position.set(-6.25, 0, 0);
  group.add(leftPanel);

  const rightPanel = new THREE.Mesh(sidePanelGeometry, sidePanelMaterial);
  rightPanel.position.set(6.25, 0, 0);
  group.add(rightPanel);

  // Paneles solares - más detallados
  const panelGeometry = new THREE.BoxGeometry(25, 15, 0.5);
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0x003366,
    metalness: 0.7,
    roughness: 0.3,
    emissive: 0x001122,
  });

  const panel1 = new THREE.Mesh(panelGeometry, panelMaterial);
  panel1.position.set(18, 0, 0);
  panel1.castShadow = true;
  group.add(panel1);

  const panel2 = new THREE.Mesh(panelGeometry, panelMaterial);
  panel2.position.set(-18, 0, 0);
  panel2.castShadow = true;
  group.add(panel2);

  // Celdas solares en los paneles
  const cellGeometry = new THREE.BoxGeometry(2, 2, 0.1);
  const cellMaterial = new THREE.MeshStandardMaterial({
    color: 0x001133,
    metalness: 0.5,
    roughness: 0.4,
    emissive: 0x000022,
  });

  // Celdas en panel 1
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 4; j++) {
      const cell = new THREE.Mesh(cellGeometry, cellMaterial);
      cell.position.set(18, -6 + j * 4, 0.3);
      cell.position.x += -10 + i * 4;
      group.add(cell);
    }
  }

  // Celdas en panel 2
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 4; j++) {
      const cell = new THREE.Mesh(cellGeometry, cellMaterial);
      cell.position.set(-18, -6 + j * 4, 0.3);
      cell.position.x += -10 + i * 4;
      group.add(cell);
    }
  }

  // Estructura de soporte de paneles
  const supportGeometry = new THREE.CylinderGeometry(0.3, 0.3, 18, 8);
  const supportMaterial = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    metalness: 0.9,
    roughness: 0.1,
  });

  const support1 = new THREE.Mesh(supportGeometry, supportMaterial);
  support1.position.set(6, 0, 0);
  support1.rotation.z = Math.PI / 2;
  group.add(support1);

  const support2 = new THREE.Mesh(supportGeometry, supportMaterial);
  support2.position.set(-6, 0, 0);
  support2.rotation.z = Math.PI / 2;
  group.add(support2);

  // Antenas - mejoradas
  const antennaGeometry = new THREE.CylinderGeometry(0.15, 0.2, 15, 8);
  const antennaMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.9,
    roughness: 0.1,
  });

  const antenna1 = new THREE.Mesh(antennaGeometry, antennaMaterial);
  antenna1.position.set(6, 8, 0);
  antenna1.rotation.z = 0.3;
  group.add(antenna1);

  const antenna2 = new THREE.Mesh(antennaGeometry, antennaMaterial);
  antenna2.position.set(-6, 8, 0);
  antenna2.rotation.z = -0.3;
  group.add(antenna2);

  // Antena central
  const centerAntenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
  centerAntenna.position.set(0, 8, 0);
  centerAntenna.scale.set(1.2, 1, 1);
  group.add(centerAntenna);

  // Disco de comunicación
  const dishGeometry = new THREE.ConeGeometry(3, 1, 16);
  const dishMaterial = new THREE.MeshStandardMaterial({
    color: 0x999999,
    metalness: 0.95,
    roughness: 0.05,
  });
  const dish = new THREE.Mesh(dishGeometry, dishMaterial);
  dish.position.set(0, 10, 0);
  dish.rotation.x = Math.PI;
  group.add(dish);

  // Partes dañadas (flotando) - más variadas
  const debrisMaterials = [
    new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.8,
      roughness: 0.2,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.7,
      roughness: 0.3,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x777777,
      metalness: 0.9,
      roughness: 0.1,
    }),
  ];

  for (let i = 0; i < 8; i++) {
    const debrisType = Math.floor(Math.random() * 3);
    let debrisGeometry;

    if (debrisType === 0) {
      debrisGeometry = new THREE.BoxGeometry(
        2 + Math.random() * 2,
        2 + Math.random() * 2,
        2 + Math.random() * 2
      );
    } else if (debrisType === 1) {
      debrisGeometry = new THREE.CylinderGeometry(
        0.5 + Math.random() * 1,
        0.5 + Math.random() * 1,
        2 + Math.random() * 3,
        8
      );
    } else {
      debrisGeometry = new THREE.SphereGeometry(1 + Math.random() * 1.5, 8, 8);
    }

    const debris = new THREE.Mesh(debrisGeometry, debrisMaterials[debrisType]);
    debris.position.set(
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 50
    );
    debris.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    debris.castShadow = true;
    group.add(debris);
  }

  // Detalles: paneles de instrumentos
  const instrumentGeometry = new THREE.BoxGeometry(1, 1, 0.2);
  const instrumentMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0x001100,
  });

  for (let i = 0; i < 6; i++) {
    const instrument = new THREE.Mesh(instrumentGeometry, instrumentMaterial);
    instrument.position.set(-5 + (i % 3) * 5, -5 + Math.floor(i / 3) * 5, 4.1);
    group.add(instrument);
  }

  // Luz parpadeante (satélite abandonado)
  const satLight = new THREE.PointLight(0xffaa00, 3.2, 90);
  satLight.position.set(0, 0, 0);
  group.add(satLight);

  // Luces adicionales en paneles para resaltar el satélite
  const panelLightL = new THREE.PointLight(0x66aaff, 1.5, 120);
  panelLightL.position.set(18, 0, 6);
  group.add(panelLightL);
  const panelLightR = new THREE.PointLight(0x66aaff, 1.5, 120);
  panelLightR.position.set(-18, 0, 6);
  group.add(panelLightR);

  group.position.set(180, -100, 150);
  group.userData = {
    type: "satellite",
    name: "Satélite Sputnik 1",
    description:
      "Este satélite de comunicaciones humano fue lanzado el 4 de octubre de 1957 para establecer comunicación interplanetaria. Sin embargo, después de solo 6 meses en órbita, perdió contacto con la Tierra. Los últimos datos recibidos mostraban lecturas anómalas de energía y señales de radio desconocidas. Ahora flota silenciosamente, sus paneles solares parcialmente dañados, rodeado de escombros de su propia desintegración. Algunos creen que fue víctima de un encuentro hostil, otros piensan que simplemente sucumbió al vacío del espacio profundo.",
    music: "sounds/satellite.mp3",
    isRotating: false,
  };

  return group;
}

// 3. PLANETA COLORIDO Y EXTRAÑO
function createColorfulPlanet() {
  const group = new THREE.Group();

  // Planeta principal
  const planetGeometry = new THREE.SphereGeometry(25, 64, 64);

  // Material con textura procedural colorida
  const planetMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 30,
    emissive: 0x220022,
  });

  // Crear textura con colores vibrantes
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  // Gradiente base
  const gradient = ctx.createLinearGradient(0, 0, 512, 256);
  gradient.addColorStop(0, "#ff0066");
  gradient.addColorStop(0.25, "#ff6600");
  gradient.addColorStop(0.5, "#ffff00");
  gradient.addColorStop(0.75, "#00ff66");
  gradient.addColorStop(1, "#0066ff");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);

  // Agregar patrones
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 50%)`;
    ctx.beginPath();
    ctx.arc(
      Math.random() * 512,
      Math.random() * 256,
      Math.random() * 30 + 10,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  planetMaterial.map = texture;
  planetMaterial.emissiveMap = texture;
  planetMaterial.emissiveIntensity = 0.3;

  const planet = new THREE.Mesh(planetGeometry, planetMaterial);
  planet.castShadow = true;
  planet.receiveShadow = true;
  group.add(planet);

  // Anillos alrededor del planeta
  const ringGeometry = new THREE.RingGeometry(30, 45, 64);
  const ringMaterial = new THREE.MeshPhongMaterial({
    color: 0xff88ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
    emissive: 0x440044,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.rotation.y = Math.PI / 4;
  group.add(ring);

  // Lunas pequeñas orbitando
  for (let i = 0; i < 3; i++) {
    const moonGeometry = new THREE.SphereGeometry(3, 16, 16);
    const moonMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
      emissive: new THREE.Color().setHSL(Math.random(), 0.5, 0.2),
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    const angle = (i / 3) * Math.PI * 2;
    moon.position.set(
      Math.cos(angle) * 50,
      Math.sin(angle) * 20,
      Math.sin(angle) * 50
    );
    group.add(moon);
  }

  // Atmósfera brillante
  const atmosphereGeometry = new THREE.SphereGeometry(27, 64, 64);
  const atmosphereMaterial = new THREE.MeshPhongMaterial({
    color: 0x88aaff,
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide,
    emissive: 0x2244aa,
  });
  const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  group.add(atmosphere);

  // Luz del planeta
  const planetLight = new THREE.PointLight(0xffaaff, 5, 200);
  planetLight.position.set(0, 0, 0);
  group.add(planetLight);

  group.position.set(0, -200, -300);
  group.userData = {
    type: "planet",
    name: "Planeta Zephyria",
    description:
      "Zephyria es un planeta exótico descubierto recientemente en los confines de esta nebulosa. Su superficie está compuesta por cristales gigantes que reflejan la luz de múltiples formas, creando un espectáculo de colores que cambia constantemente. La atmósfera del planeta contiene partículas de polvo cósmico que brillan con diferentes longitudes de onda, dando la apariencia de auroras permanentes. Los científicos creen que podría albergar formas de vida basadas en silicio, y sus anillos están formados por escombros de lunas antiguas que colisionaron hace millones de años. El planeta emite señales de radio débiles pero consistentes, sugiriendo actividad geológica o incluso biológica.",
    music: "sounds/space.mp3",
    isRotating: false,
  };

  return group;
}

// AGUJERO NEGRO (con disco de acreción y partículas)
function createBlackHole() {
  const group = new THREE.Group();

  // Núcleo del agujero negro (esfera muy oscura)
  const coreGeo = new THREE.SphereGeometry(24, 64, 64);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.castShadow = false;
  core.receiveShadow = false;
  group.add(core);

  // Disco de acreción (anillo brillante)
  const diskGeo = new THREE.TorusGeometry(36, 6, 32, 128);
  const diskMat = new THREE.MeshPhongMaterial({
    color: 0xff8a00,
    emissive: 0xff4400,
    emissiveIntensity: 1.2,
    shininess: 80,
    specular: 0x552200,
  });
  const disk = new THREE.Mesh(diskGeo, diskMat);
  disk.rotation.x = Math.PI / 2;
  group.add(disk);

  // Capa de glow tenue exterior
  const haloGeo = new THREE.TorusGeometry(42, 2.5, 16, 128);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffcc66,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  // Partículas que orbitan el disco
  const orbitCount = 2200;
  const orbitPositions = [];
  const orbitSizes = [];
  for (let i = 0; i < orbitCount; i++) {
    const r = 36 + Math.random() * 12;
    const a = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 2; // leve grosor
    orbitPositions.push(Math.cos(a) * r, y, Math.sin(a) * r);
    orbitSizes.push(1 + Math.random() * 2);
  }
  const orbitGeo = new THREE.BufferGeometry();
  orbitGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(orbitPositions, 3)
  );
  const orbitMat = new THREE.PointsMaterial({
    color: 0xffaa66,
    size: 1.5,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const orbitPts = new THREE.Points(orbitGeo, orbitMat);
  group.add(orbitPts);

  // Animación a través de userData
  group.userData = {
    type: "blackhole",
    name: "Agujero Negro Sagitario A*",
    description:
      "Un pozo gravitacional que devora luz. Su disco de acreción arde en tonos naranja y dorado, alimentado por partículas que orbitan antes de caer para siempre. Con una masa aproximada de 4 millones de soles, su gravedad es tan intensa que ni la luz puede escapar de su horizonte de eventos. Se encuentra a unos 26.000 años luz de la Tierra. Te acercás, y el espacio parece curvarse a su alrededor.",
    music: "sounds/black-hole.mp3",
    isRotating: false,
    animate: (t) => {
      disk.rotation.z = t * 0.15;
      halo.rotation.z = t * 0.08;
      orbitPts.rotation.y = t * 0.12;
    },
  };

  group.position.set(-20, -40, -520);
  return group;
}

// Crear objetos
const alienSpaceship = createAlienSpaceship();
const satellite = createAbandonedSatellite();
const planet = createColorfulPlanet();
const blackHole = createBlackHole();

scene.add(alienSpaceship);
scene.add(satellite);
scene.add(planet);
scene.add(blackHole);

// ========== RAYCASTER PARA DETECCIÓN DE CLICS ==========
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const objects = [alienSpaceship, satellite, planet, blackHole];

let currentAudio = null;
let menuAudio = null;
let isAnimating = false;

renderer.domElement.addEventListener("click", onMouseClick);

function onMouseClick(event) {
  if (isAnimating) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(objects, true);

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    let targetObject = clickedObject;

    // Buscar el objeto padre si es necesario
    while (targetObject.parent && targetObject.parent !== scene) {
      if (objects.includes(targetObject.parent)) {
        targetObject = targetObject.parent;
        break;
      }
      targetObject = targetObject.parent;
    }

    if (targetObject.userData.name) {
      animateCameraToObject(targetObject);
      showDescription(targetObject.userData);
      playMusic(targetObject.userData.music);
    }
  }
}

// ========== ANIMACIÓN DE CÁMARA ==========
let selectedObject = null;

function animateCameraToObject(object) {
  isAnimating = true;
  controls.enabled = false;
  selectedObject = object;

  // Detener rotación de otros objetos
  objects.forEach((obj) => {
    if (obj !== object) {
      obj.userData.isRotating = false;
    }
  });

  // Iniciar rotación del objeto seleccionado
  object.userData.isRotating = true;

  // Aumentar profundidad en la nebulosa
  nebulaDepth += 50;

  // Calcular posición de la cámara: MUY cerca del objeto, centrado
  const objectPosition = object.position.clone();

  // Calcular dirección desde el objeto hacia la cámara actual
  const direction = new THREE.Vector3();
  direction.subVectors(camera.position, objectPosition).normalize();

  // Posición muy cerca del objeto (a solo 40 unidades de distancia)
  const distance = 40;
  const targetPosition = objectPosition.clone();
  targetPosition.add(direction.multiplyScalar(-distance));

  const startPosition = camera.position.clone();

  const duration = 1200; // Más rápido: 1.2 segundos
  const startTime = Date.now();

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (easeOutCubic)
    const ease = 1 - Math.pow(1 - progress, 3);

    // Mover cámara hacia el objeto
    camera.position.lerpVectors(startPosition, targetPosition, ease);

    // SIEMPRE mirar directamente al objeto (centrado)
    camera.lookAt(objectPosition);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isAnimating = false;
      controls.enabled = true;
      controls.target.copy(objectPosition);
      controls.update();
      // Asegurar que sigue mirando al objeto
      camera.lookAt(objectPosition);
    }
  }

  animate();
}

// ========== MOSTRAR DESCRIPCIÓN ==========
function showDescription(objectData) {
  const overlay = document.getElementById("description-overlay");
  const title = document.getElementById("object-title");
  const description = document.getElementById("object-description");

  title.textContent = objectData.name;
  description.textContent = objectData.description;
  overlay.classList.remove("hidden");

  document.getElementById("close-description").onclick = () => {
    overlay.classList.add("hidden");
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    // Detener rotación del objeto
    if (selectedObject) {
      selectedObject.userData.isRotating = false;
      selectedObject = null;
    }
    // Volver a posición inicial
    animateCameraBack();
  };
}

function animateCameraBack() {
  isAnimating = true;
  controls.enabled = false;

  // Reducir profundidad al volver
  nebulaDepth = Math.max(0, nebulaDepth - 30);

  const startPosition = camera.position.clone();
  const targetPosition = new THREE.Vector3(0, 0, 200 - nebulaDepth);
  const duration = 1500;
  const startTime = Date.now();

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);

    camera.position.lerpVectors(startPosition, targetPosition, ease);
    camera.lookAt(0, 0, -nebulaDepth);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isAnimating = false;
      controls.enabled = true;
      controls.target.set(0, 0, -nebulaDepth);
      controls.update();
    }
  }

  animate();
}

// ========== REPRODUCIR MÚSICA ==========
function playMusic(musicPath) {
  if (currentAudio) {
    currentAudio.pause();
  }

  currentAudio = new Audio(musicPath);
  currentAudio.volume = 0.5;
  currentAudio.loop = true;
  currentAudio.play().catch((e) => {
    console.log("Error reproduciendo música:", e);
  });
}

function playMenuMusic() {
  if (menuAudio) return;
  menuAudio = new Audio("sounds/calm-space-music.mp3");
  menuAudio.loop = true;
  menuAudio.volume = 0.4;
  const tryPlay = () => {
    menuAudio.play().catch(() => {
      document.addEventListener(
        "click",
        () => {
          menuAudio && menuAudio.play().catch(() => {});
        },
        { once: true }
      );
    });
  };
  tryPlay();
}

// ========== ANIMACIÓN PRINCIPAL ==========
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.01;

  // Actualizar controles
  controls.update();

  // Movimiento con teclado
  {
    // Movimiento en el plano XZ relativo a la orientación de la cámara
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; // evitar subir/bajar al avanzar
    if (forward.lengthSq() > 0) forward.normalize();

  // Vector derecha relativo a la cámara (Forward x Up = Right)
  const right = new THREE.Vector3();
  right.crossVectors(forward, camera.up).normalize();

    let delta = new THREE.Vector3();

    if (keys["ArrowUp"] || keys["KeyW"]) {
      delta.add(forward);
    }
    if (keys["ArrowDown"] || keys["KeyS"]) {
      delta.sub(forward);
    }
    // Flecha izquierda -> mover cámara hacia la izquierda
    if (keys["ArrowLeft"]) {
      delta.sub(right);
    }
    // Tecla A mantiene movimiento a la izquierda
    if (keys["KeyA"]) {
      delta.sub(right);
    }
    if (keys["ArrowRight"] || keys["KeyD"]) {
      delta.add(right);
    }

    if (delta.lengthSq() > 0) {
      delta.normalize().multiplyScalar(CONFIG.MOVE_SPEED);
      camera.position.add(delta);
      controls.target.add(delta); // mantener foco coherente al desplazarse
    }
  }

  // Rotación con mouse
  if (isMouseDown) {
    camera.rotation.y += targetRotationY * 0.1;
    camera.rotation.x += targetRotationX * 0.1;
    targetRotationX *= 0.9;
    targetRotationY *= 0.9;
  }

  // Rotación de objetos (solo si están seleccionados)
  objects.forEach((obj) => {
    if (obj.userData.isRotating) {
      obj.rotation.y += 0.02; // Rotación más rápida cuando está seleccionado
      if (obj.userData.type === "satellite") {
        obj.rotation.z += 0.01;
      }
    } else {
      // Rotación lenta normal
      if (obj === alienSpaceship) {
        obj.rotation.y += 0.005;
        obj.rotation.x += 0.002;
      } else if (obj === satellite) {
        obj.rotation.y += 0.003;
        obj.rotation.z += 0.001;
      } else if (obj === planet) {
        obj.rotation.y += 0.002;
      }
    }
  });

  // Rotar anillos del planeta
  planet.children.forEach((child, index) => {
    if (child.geometry && child.geometry.type === "RingGeometry") {
      child.rotation.z += 0.01;
    }
  });

  // Animación de luces
  light1.position.x = 100 + Math.sin(time) * 20;
  light1.position.y = 100 + Math.cos(time * 0.7) * 20;
  light1.intensity = 2 + Math.sin(time * 2) * 0.5;

  // Pulso leve del haz de la nave
  if (alienSpaceship && alienSpaceship.children) {
    alienSpaceship.children.forEach((child) => {
      if (child.isSpotLight) {
        child.intensity = 2.0 + Math.sin(time * 2.5) * 0.4;
      }
    });
  }

  light2.position.x = -100 + Math.cos(time * 0.8) * 15;
  light2.position.y = -100 + Math.sin(time * 1.2) * 15;
  light2.intensity = 2 + Math.cos(time * 2.5) * 0.5;

  light3.position.z = -100 + Math.sin(time * 0.6) * 30;
  light3.intensity = 1.5 + Math.sin(time * 1.5) * 0.3;

  // Actualizar material de nebulosa
  if (nebula.material.uniforms) {
    nebula.material.uniforms.time.value = time;
  }

  // Rotar nebulosa lentamente
  nebula.mesh.rotation.y += 0.0002;
  nebula.mesh.rotation.x += 0.0001;

  // Rotar estrellas
  stars.rotation.y += 0.0001;

  // Rotar manchas de nebulosa lentamente
  nebulaClouds.rotation.y += 0.0001;
  nebulaClouds.rotation.x += 0.00005;

  // Animar agujero negro si existe
  if (
    blackHole &&
    blackHole.userData &&
    typeof blackHole.userData.animate === "function"
  ) {
    blackHole.userData.animate(time);
  }

  renderer.render(scene, camera);
}

// ========== MENÚ INICIAL ==========
const startMenu = document.getElementById("start-menu");
const startButton = document.getElementById("start-button");
const instructions = document.querySelector(".instructions");

playMenuMusic();

startButton.addEventListener("click", () => {
  // Ocultar menú con animación
  startMenu.style.animation = "fadeOut 0.8s ease-out";
  setTimeout(() => {
    startMenu.classList.add("hidden");
    // Mostrar canvas con fade in
    renderer.domElement.style.opacity = "1";
    // Mostrar instrucciones
    instructions.classList.remove("hidden");
    if (menuAudio) {
      menuAudio.pause();
      menuAudio = null;
    }
  }, 800);
});

// Iniciar animación solo cuando se carga la página
animate();

// ========== AJUSTAR AL REDIMENSIONAR ==========
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
