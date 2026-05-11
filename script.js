const THREE = window.THREE;

const canvasHost = document.querySelector('#gameCanvas');
const startScreen = document.querySelector('#startScreen');
const gameOverScreen = document.querySelector('#gameOverScreen');
const startButton = document.querySelector('#startButton');
const restartButton = document.querySelector('#restartButton');
const pauseHint = document.querySelector('#pauseHint');
const hpValue = document.querySelector('#hpValue');
const hpBar = document.querySelector('#hpBar');
const scoreValue = document.querySelector('#scoreValue');
const killValue = document.querySelector('#killValue');
const timeValue = document.querySelector('#timeValue');
const waveValue = document.querySelector('#waveValue');
const ammoValue = document.querySelector('#ammoValue');
const reserveValue = document.querySelector('#reserveValue');
const comboValue = document.querySelector('#comboValue');
const crosshair = document.querySelector('#crosshair');
const weaponName = document.querySelector('#weaponName');
const fireMode = document.querySelector('#fireMode');
const hitMarker = document.querySelector('#hitMarker');
const damageOverlay = document.querySelector('#damageOverlay');
const killFeed = document.querySelector('#killFeed');
const finalScore = document.querySelector('#finalScore');
const finalTime = document.querySelector('#finalTime');
const finalKills = document.querySelector('#finalKills');
const radarCanvas = document.querySelector('#radarCanvas');
const radar = radarCanvas.getContext('2d');

const WEAPONS = {
  AR: {
    label: 'VOLT AR', type: 'AR', color: 0x37e8ff, damage: 24, headDamage: 48, mag: 30, reserve: 180,
    fireDelay: 90, reload: 1200, spread: 0.022, range: 72, recoil: 0.006, score: 100,
    auto: true, tracerRadius: 0.035, tracerLife: 0.18,
  },
  DMR: {
    label: 'PULSE DMR', type: 'DMR', color: 0xffd36c, damage: 54, headDamage: 110, mag: 12, reserve: 72,
    fireDelay: 310, reload: 1450, spread: 0.008, range: 100, recoil: 0.011, score: 150,
    auto: false, tracerRadius: 0.045, tracerLife: 0.22,
  },
  MG: {
    label: 'RIPPER MG', type: '따발총', color: 0x9dff57, damage: 18, headDamage: 34, mag: 75, reserve: 300,
    fireDelay: 58, reload: 2400, spread: 0.036, range: 68, recoil: 0.0045, score: 85,
    auto: true, tracerRadius: 0.05, tracerLife: 0.2,
  },
  SR: {
    label: 'ECLIPSE SR', type: '저격총', color: 0xff3159, damage: 145, headDamage: 300, mag: 5, reserve: 35,
    fireDelay: 920, reload: 1900, spread: 0.001, range: 165, recoil: 0.019, score: 260,
    auto: false, tracerRadius: 0.07, tracerLife: 0.28,
  },
};

const keys = new Set();
const mouse = { down: false, locked: false };
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);

let scene;
let camera;
let renderer;
let player;
let yaw = 0;
let pitch = 0;
let velocity = new THREE.Vector3();
let enemies = [];
let bullets = [];
let particles = [];
let weaponKey = 'AR';
let weaponState = {};
let lastShot = 0;
let isReloading = false;
let reloadTimer = 0;
let gameState = 'menu';
let elapsed = 0;
let score = 0;
let kills = 0;
let hp = 100;
let wave = 1;
let spawnTimer = 0;
let combo = 1;
let comboTimer = 0;
let arenaGroup;
let weaponModel;
let crosshairPulseTimer = 0;

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02040a);
  scene.fog = new THREE.FogExp2(0x040713, 0.024);

  camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.1, 500);
  player = new THREE.Object3D();
  player.position.set(0, 1.7, 14);
  player.add(camera);
  scene.add(player);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  canvasHost.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x6fdfff, 0x100712, 1.4));
  const moon = new THREE.DirectionalLight(0x9fd8ff, 1.6);
  moon.position.set(-12, 22, 10);
  moon.castShadow = true;
  scene.add(moon);

  const neon = new THREE.PointLight(0xff3159, 3, 65);
  neon.position.set(13, 8, -12);
  scene.add(neon);

  buildArena();
  buildWeaponModel();
  resetWeaponState();
  updateHud();
  animate();
}

function buildArena() {
  arenaGroup = new THREE.Group();
  scene.add(arenaGroup);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x07101c, metalness: 0.42, roughness: 0.5 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(150, 150, 40, 40), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  arenaGroup.add(floor);

  const grid = new THREE.GridHelper(150, 50, 0x37e8ff, 0x173047);
  grid.material.opacity = 0.28;
  grid.material.transparent = true;
  arenaGroup.add(grid);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < 34; i += 1) {
    const h = 2 + Math.random() * 12;
    const mat = new THREE.MeshStandardMaterial({
      color: i % 3 === 0 ? 0x111e33 : 0x0c1525,
      emissive: i % 4 === 0 ? 0x082b36 : 0x170712,
      emissiveIntensity: 0.65,
      metalness: 0.55,
      roughness: 0.45,
    });
    const tower = new THREE.Mesh(boxGeo, mat);
    tower.scale.set(2 + Math.random() * 3, h, 2 + Math.random() * 3);
    const angle = Math.random() * Math.PI * 2;
    const radius = 24 + Math.random() * 45;
    tower.position.set(Math.cos(angle) * radius, h / 2, Math.sin(angle) * radius);
    tower.castShadow = true;
    tower.receiveShadow = true;
    arenaGroup.add(tower);
  }

  for (let i = 0; i < 10; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(9 + i * 5, 0.035, 8, 96),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff3159 : 0x37e8ff, transparent: true, opacity: 0.26 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.04;
    arenaGroup.add(ring);
  }
}

function buildWeaponModel() {
  weaponModel = new THREE.Group();
  camera.add(weaponModel);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.22, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x111a2a, metalness: 0.8, roughness: 0.24 }),
  );
  body.position.set(0.34, -0.26, -0.68);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 0.85, 16),
    new THREE.MeshStandardMaterial({ color: 0x222d3f, metalness: 0.9, roughness: 0.2 }),
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.34, -0.24, -1.22);
  const glow = new THREE.PointLight(WEAPONS.AR.color, 1.7, 5);
  glow.name = 'weaponGlow';
  glow.position.set(0.34, -0.22, -1.62);
  weaponModel.add(body, barrel, glow);
}

function resetWeaponState() {
  weaponState = Object.fromEntries(Object.entries(WEAPONS).map(([key, weapon]) => [key, {
    ammo: weapon.mag,
    reserve: weapon.reserve,
  }]));
}

function startGame() {
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  canvasHost.classList.remove('game-over-blur');
  resetRun();
  gameState = 'playing';
  renderer.domElement.requestPointerLock?.();
}

function resetRun() {
  enemies.forEach((enemy) => scene.remove(enemy.group));
  bullets.forEach((bullet) => scene.remove(bullet.mesh));
  particles.forEach((particle) => scene.remove(particle.mesh));
  enemies = [];
  bullets = [];
  particles = [];
  velocity.set(0, 0, 0);
  player.position.set(0, 1.7, 14);
  yaw = 0;
  pitch = 0;
  elapsed = 0;
  score = 0;
  kills = 0;
  hp = 100;
  wave = 1;
  spawnTimer = 0;
  combo = 1;
  comboTimer = 0;
  weaponKey = 'AR';
  isReloading = false;
  resetWeaponState();
  updateCameraRotation();
  updateHud();
  addFeed('AR / DMR / 따발총 / 저격총 전환 준비 완료');
}

function endGame() {
  gameState = 'over';
  document.exitPointerLock?.();
  canvasHost.classList.add('game-over-blur');
  gameOverScreen.classList.remove('hidden');
  finalScore.textContent = score.toLocaleString();
  finalTime.textContent = formatTime(elapsed);
  finalKills.textContent = kills.toLocaleString();
}

function spawnEnemy() {
  const angle = Math.random() * Math.PI * 2;
  const distance = 34 + Math.random() * 38;
  const typeRoll = Math.random();
  const isHunter = typeRoll > 0.68;
  const isTank = typeRoll < Math.min(0.1 + wave * 0.01, 0.28);
  const color = isTank ? 0xff8a3d : isHunter ? 0xff3159 : 0x37e8ff;
  const hpMax = (isTank ? 160 : isHunter ? 80 : 100) + wave * 16;
  const speed = (isTank ? 4.2 : isHunter ? 8.2 : 5.6) + wave * 0.28;

  const group = new THREE.Group();
  group.position.set(Math.cos(angle) * distance, 1.6 + Math.random() * 2.2, Math.sin(angle) * distance);
  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(isTank ? 1.25 : 0.85, 1),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.62, metalness: 0.7, roughness: 0.25 }),
  );
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(isTank ? 0.35 : 0.24, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  core.position.y = 0.18;
  body.castShadow = true;
  group.add(body, core);
  scene.add(group);
  enemies.push({ group, body, core, hp: hpMax, hpMax, speed, type: isTank ? 'TANK' : isHunter ? 'HUNTER' : 'DRONE', attack: isTank ? 15 : 10, cooldown: 0 });
}

function switchWeapon(nextKey) {
  if (!WEAPONS[nextKey] || weaponKey === nextKey || isReloading) return;
  weaponKey = nextKey;
  lastShot = 0;
  const glow = weaponModel.getObjectByName('weaponGlow');
  glow.color.setHex(WEAPONS[weaponKey].color);
  updateHud();
  addFeed(`${WEAPONS[weaponKey].label} 장착`);
}

function shoot() {
  if (gameState !== 'playing' || isReloading) return;
  const now = performance.now();
  const weapon = WEAPONS[weaponKey];
  const state = weaponState[weaponKey];
  if (now - lastShot < weapon.fireDelay) return;
  if (state.ammo <= 0) {
    reload();
    return;
  }
  state.ammo -= 1;
  lastShot = now;
  pitch = Math.max(-1.25, pitch - weapon.recoil);
  updateCameraRotation();

  const flash = new THREE.PointLight(weapon.color, 5, 12);
  flash.position.copy(player.position).add(new THREE.Vector3(0, -0.1, -0.8).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())));
  scene.add(flash);
  setTimeout(() => scene.remove(flash), 45);
  pulseCrosshair();

  let bestHit = null;
  raycaster.setFromCamera(center, camera);
  raycaster.ray.direction.x += (Math.random() - 0.5) * weapon.spread;
  raycaster.ray.direction.y += (Math.random() - 0.5) * weapon.spread;
  raycaster.ray.direction.normalize();
  raycaster.far = weapon.range;
  const hits = raycaster.intersectObjects(enemies.flatMap((enemy) => [enemy.body, enemy.core]), false);
  if (hits.length) bestHit = hits[0];
  createTracer(raycaster.ray.origin, raycaster.ray.direction, bestHit?.distance || weapon.range, weapon);
  if (bestHit) damageEnemy(bestHit.object, bestHit.point, bestHit.object.geometry.type === 'SphereGeometry');
  updateHud();
}

function damageEnemy(object, point, isHeadshot) {
  const enemy = enemies.find((candidate) => candidate.body === object || candidate.core === object);
  if (!enemy) return;
  const weapon = WEAPONS[weaponKey];
  const damage = isHeadshot ? weapon.headDamage : weapon.damage;
  enemy.hp -= damage;
  showHitMarker(isHeadshot);
  spawnParticles(point, isHeadshot ? 0xffd36c : weapon.color, isHeadshot ? 18 : 10);
  if (enemy.hp <= 0) {
    scene.remove(enemy.group);
    enemies = enemies.filter((candidate) => candidate !== enemy);
    kills += 1;
    combo = Math.min(combo + 0.25, 5);
    comboTimer = 3.5;
    const bonus = Math.round(weapon.score * combo * (isHeadshot ? 1.5 : 1));
    score += bonus;
    addFeed(`${isHeadshot ? 'HEADSHOT ' : ''}${enemy.type} +${bonus}`);
  }
}

function reload() {
  const weapon = WEAPONS[weaponKey];
  const state = weaponState[weaponKey];
  if (isReloading || state.ammo === weapon.mag || state.reserve <= 0) return;
  isReloading = true;
  reloadTimer = weapon.reload / 1000;
  fireMode.textContent = 'RELOADING...';
}

function finishReload() {
  const weapon = WEAPONS[weaponKey];
  const state = weaponState[weaponKey];
  const need = weapon.mag - state.ammo;
  const take = Math.min(need, state.reserve);
  state.ammo += take;
  state.reserve -= take;
  isReloading = false;
  updateHud();
}

function createTracer(origin, direction, distance, weapon) {
  const start = origin.clone().add(direction.clone().multiplyScalar(1.0));
  const end = origin.clone().add(direction.clone().multiplyScalar(Math.min(distance, weapon.range)));
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const length = Math.max(start.distanceTo(end), 0.1);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(weapon.tracerRadius, weapon.tracerRadius * 0.45, length, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: weapon.color, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending }),
  );
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(weapon.tracerRadius * 2.8, 12, 12),
    new THREE.MeshBasicMaterial({ color: weapon.color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending }),
  );
  const tip = new THREE.PointLight(weapon.color, 2.2, 10);
  orb.position.copy(start);
  tip.position.copy(start);
  scene.add(mesh, orb, tip);
  bullets.push({ mesh, orb, light: tip, start, end, life: weapon.tracerLife, maxLife: weapon.tracerLife });
}

function spawnParticles(point, color, count) {
  for (let i = 0; i < count; i += 1) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 + Math.random() * 0.06, 8, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
    );
    mesh.position.copy(point);
    scene.add(mesh);
    particles.push({
      mesh,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 5, (Math.random() - 0.5) * 8),
      life: 0.45 + Math.random() * 0.25,
    });
  }
}

function update(dt) {
  if (gameState !== 'playing') return;
  elapsed += dt;
  wave = Math.floor(elapsed / 28) + 1;
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    const spawnCount = 1 + Math.floor(wave / 3);
    for (let i = 0; i < spawnCount; i += 1) spawnEnemy();
    spawnTimer = Math.max(0.5, 1.65 - wave * 0.08);
  }

  updateMovement(dt);
  updateEnemies(dt);
  updateProjectiles(dt);

  if (comboTimer > 0) {
    comboTimer -= dt;
  } else {
    combo = Math.max(1, combo - dt * 0.6);
  }
  if (isReloading) {
    reloadTimer -= dt;
    if (reloadTimer <= 0) finishReload();
  }
  updateHud();
}

function updateMovement(dt) {
  const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
  const side = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 13.5 : 8.2;
  const direction = new THREE.Vector3(side, 0, -forward).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  velocity.x = THREE.MathUtils.lerp(velocity.x, direction.x * speed, 0.18);
  velocity.z = THREE.MathUtils.lerp(velocity.z, direction.z * speed, 0.18);
  if (keys.has('Space') && Math.abs(player.position.y - 1.7) < 0.05) velocity.y = 7.2;
  velocity.y -= 18 * dt;
  player.position.addScaledVector(velocity, dt);
  if (player.position.y < 1.7) {
    player.position.y = 1.7;
    velocity.y = 0;
  }
  const limit = 68;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -limit, limit);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -limit, limit);
  weaponModel.position.y = Math.sin(elapsed * (forward || side ? 9 : 3)) * 0.015;
}

function updateEnemies(dt) {
  const playerGround = player.position.clone();
  for (const enemy of enemies) {
    const toPlayer = playerGround.clone().sub(enemy.group.position);
    const distance = toPlayer.length();
    const direction = toPlayer.normalize();
    enemy.group.position.addScaledVector(direction, enemy.speed * dt);
    enemy.group.rotation.x += dt * 1.8;
    enemy.group.rotation.y += dt * 2.5;
    enemy.group.position.y += Math.sin(elapsed * 3 + enemy.group.id) * dt * 0.9;
    enemy.cooldown -= dt;
    if (distance < 2.35 && enemy.cooldown <= 0) {
      enemy.cooldown = 0.85;
      hp = Math.max(0, hp - enemy.attack);
      damageOverlay.style.animation = 'none';
      damageOverlay.offsetHeight;
      damageOverlay.style.animation = 'damagePulse 0.34s ease';
      if (hp <= 0) endGame();
    }
  }
}

function updateProjectiles(dt) {
  bullets.forEach((bullet) => {
    bullet.life -= dt;
    const opacity = Math.max(0, bullet.life / bullet.maxLife);
    const progress = 1 - opacity;
    bullet.mesh.material.opacity = opacity * 0.92;
    bullet.orb.material.opacity = opacity;
    bullet.orb.position.lerpVectors(bullet.start, bullet.end, progress);
    bullet.light.position.copy(bullet.orb.position);
    bullet.light.intensity = opacity * 2.2;
  });
  bullets.filter((bullet) => bullet.life <= 0).forEach((bullet) => {
    scene.remove(bullet.mesh);
    scene.remove(bullet.orb);
    scene.remove(bullet.light);
  });
  bullets = bullets.filter((bullet) => bullet.life > 0);

  particles.forEach((particle) => {
    particle.life -= dt;
    particle.velocity.y -= 10 * dt;
    particle.mesh.position.addScaledVector(particle.velocity, dt);
    particle.mesh.material.opacity = Math.max(0, particle.life / 0.7);
  });
  particles.filter((particle) => particle.life <= 0).forEach((particle) => scene.remove(particle.mesh));
  particles = particles.filter((particle) => particle.life > 0);
}

function updateHud() {
  const weapon = WEAPONS[weaponKey];
  const state = weaponState[weaponKey];
  hpValue.textContent = Math.ceil(hp);
  hpBar.style.width = `${hp}%`;
  scoreValue.textContent = score.toLocaleString();
  killValue.textContent = kills.toLocaleString();
  timeValue.textContent = formatTime(elapsed);
  waveValue.textContent = wave;
  ammoValue.textContent = state.ammo;
  reserveValue.textContent = state.reserve;
  comboValue.textContent = `x${combo.toFixed(1)}`;
  weaponName.textContent = weapon.label;
  fireMode.textContent = isReloading ? 'RELOADING...' : `${weapon.type} / ${weapon.auto ? 'AUTO' : 'SEMI'} / ${Math.round(1000 / weapon.fireDelay * 60)} RPM`;
  crosshair.style.setProperty('--weapon-color', `#${weapon.color.toString(16).padStart(6, '0')}`);
  crosshair.style.setProperty('--spread', `${Math.max(10, Math.round(weapon.spread * 720))}px`);
  drawRadar();
}

function drawRadar() {
  radar.clearRect(0, 0, 130, 130);
  radar.strokeStyle = 'rgba(55, 232, 255, 0.24)';
  radar.lineWidth = 1;
  radar.beginPath();
  radar.arc(65, 65, 58, 0, Math.PI * 2);
  radar.moveTo(65, 7);
  radar.lineTo(65, 123);
  radar.moveTo(7, 65);
  radar.lineTo(123, 65);
  radar.stroke();
  radar.fillStyle = '#37e8ff';
  radar.beginPath();
  radar.arc(65, 65, 4, 0, Math.PI * 2);
  radar.fill();
  for (const enemy of enemies) {
    const dx = enemy.group.position.x - player.position.x;
    const dz = enemy.group.position.z - player.position.z;
    const x = THREE.MathUtils.clamp(65 + dx * 0.8, 9, 121);
    const y = THREE.MathUtils.clamp(65 + dz * 0.8, 9, 121);
    radar.fillStyle = enemy.type === 'TANK' ? '#ff8a3d' : enemy.type === 'HUNTER' ? '#ff3159' : '#f4fbff';
    radar.beginPath();
    radar.arc(x, y, enemy.type === 'TANK' ? 4 : 3, 0, Math.PI * 2);
    radar.fill();
  }
}

function pulseCrosshair() {
  clearTimeout(crosshairPulseTimer);
  crosshair.classList.remove('shooting');
  crosshair.offsetHeight;
  crosshair.classList.add('shooting');
  crosshairPulseTimer = setTimeout(() => crosshair.classList.remove('shooting'), 95);
}

function showHitMarker(headshot) {
  hitMarker.classList.toggle('headshot', headshot);
  hitMarker.classList.remove('show');
  hitMarker.offsetHeight;
  hitMarker.classList.add('show');
}

function addFeed(text) {
  const item = document.createElement('div');
  item.className = 'kill-item';
  item.textContent = text;
  killFeed.prepend(item);
  setTimeout(() => item.remove(), 2400);
}

function updateCameraRotation() {
  player.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('pointerlockchange', () => {
  mouse.locked = document.pointerLockElement === renderer.domElement;
  pauseHint.classList.toggle('visible', gameState === 'playing' && !mouse.locked);
});

document.addEventListener('mousemove', (event) => {
  if (!mouse.locked || gameState !== 'playing') return;
  yaw -= event.movementX * 0.0022;
  pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.0022, -1.35, 1.25);
  updateCameraRotation();
});

document.addEventListener('keydown', (event) => {
  keys.add(event.code);
  if (event.code === 'Digit1') switchWeapon('AR');
  if (event.code === 'Digit2') switchWeapon('DMR');
  if (event.code === 'Digit3') switchWeapon('MG');
  if (event.code === 'Digit4') switchWeapon('SR');
  if (event.code === 'KeyR') reload();
});

document.addEventListener('keyup', (event) => keys.delete(event.code));

document.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return;
  mouse.down = true;
  if (gameState === 'playing' && !mouse.locked) renderer.domElement.requestPointerLock?.();
  shoot();
});

document.addEventListener('mouseup', () => {
  mouse.down = false;
});

setInterval(() => {
  if (mouse.down && WEAPONS[weaponKey].auto) shoot();
}, 18);

startButton.addEventListener('click', (event) => {
  event.stopPropagation();
  startGame();
});

restartButton.addEventListener('click', (event) => {
  event.stopPropagation();
  startGame();
});

init();
