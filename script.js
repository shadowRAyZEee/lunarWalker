(function () {
  'use strict';

  /* ============================================================================
   * 1. КОНСТАНТЫ И КОНФИГУРАЦИЯ ИГРЫ
   * ============================================================================ */
  const GAME_STATES = {
    MENU: 'MENU',
    RUNNING: 'RUNNING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
    SHOP: 'SHOP',
    LEADERBOARD: 'LEADERBOARD'
  };

  // Полосы движения: левая (-1), центральная (0), правая (+1)
  const LANE_WIDTH = 2.75;
  const LANE_X = [-LANE_WIDTH, 0, LANE_WIDTH];

  // Единая базовая высота условного блока
  const BLOCK_HEIGHT = 1.45;
  const LOW_OBSTACLE_HEIGHT = 1 * BLOCK_HEIGHT;   // 1.45 ед. — перепрыгивается
  const HIGH_OBSTACLE_HEIGHT = 2 * BLOCK_HEIGHT;  // 2.90 ед. — только смена полосы

  // Параметры прыжка (лунная гравитация)
  const MAX_JUMP_HEIGHT = 2.08;
  const JUMP_TIME_APEX = 0.37;
  const LUNAR_GRAVITY = (2 * MAX_JUMP_HEIGHT) / (JUMP_TIME_APEX * JUMP_TIME_APEX);
  const JUMP_INITIAL_VELOCITY = LUNAR_GRAVITY * JUMP_TIME_APEX;
  const FAST_FALL_VELOCITY = -27.0;
  const FAST_FALL_GRAVITY_MULT = 2.8;

  // Скорость бега и прогрессия
  const INITIAL_SPEED = 16.5;
  const MAX_SPEED = 34.0;
  const SPEED_ACCELERATION = 0.28;
  const LANE_SWITCH_SPEED = 14.5;
  const SCORE_PER_METER = 2.5;

  // Интервал появления редкой валюты (Звёздного кристалла) — ровно каждые 300 метров
  const CRYSTAL_INTERVAL_METERS = 300;

  // Дистанции генерации и удаления объектов
  const SPAWN_Z = -135;
  const DESPAWN_Z = 18;
  const CHUNK_LENGTH = 40;
  const CHUNK_COUNT = 5;

  // Каталог из 6 скафандров (оригинальные 3 + 3 новых)
  const SUITS_CATALOG = {
    lunar: {
      id: 'lunar',
      name: '«Лунный»',
      cost: 0,
      description: 'Классический белый скафандр первой лунной экспедиции.',
      primaryHex: 0xf1f5f9,
      secondaryHex: 0x64748b,
      accentHex: 0x38bdf8,
      visorHex: 0x0f172a,
      cssPrimary: '#f1f5f9',
      cssSecondary: '#64748b',
      cssAccent: '#38bdf8'
    },
    martian: {
      id: 'martian',
      name: '«Марсианский»',
      cost: 50,
      description: 'Оранжевый экспедиционный корпус с повышенной заметностью.',
      primaryHex: 0xf97316,
      secondaryHex: 0x7c2d12,
      accentHex: 0xfbbf24,
      visorHex: 0x1e1b4b,
      cssPrimary: '#f97316',
      cssSecondary: '#7c2d12',
      cssAccent: '#fbbf24'
    },
    galactic: {
      id: 'galactic',
      name: '«Галактический»',
      cost: 100,
      description: 'Глубокий фиолетовый композит с неоновыми голубыми акцентами.',
      primaryHex: 0x6d28d9,
      secondaryHex: 0x311068,
      accentHex: 0x00f2fe,
      visorHex: 0x090d16,
      cssPrimary: '#6d28d9',
      cssSecondary: '#311068',
      cssAccent: '#00f2fe'
    },
    cyber: {
      id: 'cyber',
      name: '«Кибер-неон»',
      cost: 150,
      description: 'Титан-графитовая броня с кислотно-изумрудными контурами.',
      primaryHex: 0x1e293b,
      secondaryHex: 0x0f172a,
      accentHex: 0x10b981,
      visorHex: 0x064e3b,
      cssPrimary: '#1e293b',
      cssSecondary: '#0f172a',
      cssAccent: '#10b981'
    },
    solar: {
      id: 'solar',
      name: '«Солнечный страж»',
      cost: 220,
      description: 'Золотое теплоотражающее покрытие для полётов у звезды.',
      primaryHex: 0xfbbf24,
      secondaryHex: 0x92400e,
      accentHex: 0xfffbeb,
      visorHex: 0x0284c7,
      cssPrimary: '#fbbf24',
      cssSecondary: '#92400e',
      cssAccent: '#38bdf8'
    },
    void: {
      id: 'void',
      name: '«Хранитель Бездны»',
      cost: 300,
      description: 'Обсидиановый сплав с пульсирующим багровым реактором.',
      primaryHex: 0x18181b,
      secondaryHex: 0x3f3f46,
      accentHex: 0xf43f5e,
      visorHex: 0x4c0519,
      cssPrimary: '#18181b',
      cssSecondary: '#3f3f46',
      cssAccent: '#f43f5e'
    }
  };

  // Каталог планет для заднего фона (покупаются за редкие Звёздные кристаллы)
  const PLANETS_CATALOG = {
    earth: {
      id: 'earth',
      name: '«Голубая Земля»',
      costCrystals: 0,
      description: 'Родная планета с океанами, материками и облачной атмосферой.',
      bodyColor: '#2563eb',
      detailColor: '#10b981',
      ringColor: null
    },
    saturn: {
      id: 'saturn',
      name: '«Кольца Сатурна»',
      costCrystals: 2,
      description: 'Золотистый газовый гигант с широкой системой ледяных колец.',
      bodyColor: '#eab308',
      detailColor: '#ca8a04',
      ringColor: '#fde047'
    },
    crimson: {
      id: 'crimson',
      name: '«Вулканический колосс»',
      costCrystals: 4,
      description: 'Раскалённая багровая экзопланета с двумя спутниками на орбите.',
      bodyColor: '#dc2626',
      detailColor: '#f97316',
      ringColor: '#fb923c'
    },
    neptune: {
      id: 'neptune',
      name: '«Ледяной Нептун»',
      costCrystals: 6,
      description: 'Бирюзовый сверхгигант с наклонным криогенным поясом.',
      bodyColor: '#06b6d4',
      detailColor: '#3b82f6',
      ringColor: '#a5f3fc'
    },
    pulsar: {
      id: 'pulsar',
      name: '«Квазар Бездны»',
      costCrystals: 10,
      description: 'Сверхмассивное ядро с неоновым аккреционным диском и джетами.',
      bodyColor: '#1e1b4b',
      detailColor: '#a855f7',
      ringColor: '#e879f9'
    }
  };

  const STORAGE_KEY = 'lunar_runner_save_v2';

  /* ============================================================================
   * 2. ПОДСИСТЕМА СОХРАНЕНИЯ (localStorage + fallback в памяти)
   * ============================================================================ */
  const StorageManager = {
    isAvailable: true,
    data: {
      tokens: 0,
      crystals: 0,
      ownedSuits: ['lunar'],
      selectedSuit: 'lunar',
      ownedPlanets: ['earth'],
      selectedPlanet: 'earth',
      bestScore: 0,
      leaderboard: []
    },

    init() {
      try {
        const testKey = '__lunar_storage_test__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        this.isAvailable = true;
      } catch (err) {
        this.isAvailable = false;
        const warnEl = document.getElementById('storage-warning');
        if (warnEl) warnEl.classList.remove('hidden');
      }
      this.load();
    },

    load() {
      if (!this.isAvailable) return;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return;

        // Баланс жетонов и кристаллов
        const tokens = Number(parsed.tokens);
        this.data.tokens = Number.isFinite(tokens) && tokens >= 0 ? Math.floor(tokens) : 0;

        const crystals = Number(parsed.crystals);
        this.data.crystals = Number.isFinite(crystals) && crystals >= 0 ? Math.floor(crystals) : 0;

        // Валидация скафандров
        const validSuitIds = Object.keys(SUITS_CATALOG);
        if (Array.isArray(parsed.ownedSuits)) {
          const filtered = parsed.ownedSuits.filter(id => validSuitIds.includes(id));
          if (!filtered.includes('lunar')) filtered.unshift('lunar');
          this.data.ownedSuits = Array.from(new Set(filtered));
        } else {
          this.data.ownedSuits = ['lunar'];
        }

        if (
          typeof parsed.selectedSuit === 'string' &&
          this.data.ownedSuits.includes(parsed.selectedSuit)
        ) {
          this.data.selectedSuit = parsed.selectedSuit;
        } else {
          this.data.selectedSuit = 'lunar';
        }

        // Валидация планет
        const validPlanetIds = Object.keys(PLANETS_CATALOG);
        if (Array.isArray(parsed.ownedPlanets)) {
          const filteredP = parsed.ownedPlanets.filter(id => validPlanetIds.includes(id));
          if (!filteredP.includes('earth')) filteredP.unshift('earth');
          this.data.ownedPlanets = Array.from(new Set(filteredP));
        } else {
          this.data.ownedPlanets = ['earth'];
        }

        if (
          typeof parsed.selectedPlanet === 'string' &&
          this.data.ownedPlanets.includes(parsed.selectedPlanet)
        ) {
          this.data.selectedPlanet = parsed.selectedPlanet;
        } else {
          this.data.selectedPlanet = 'earth';
        }

        // Валидация таблицы рекордов
        if (Array.isArray(parsed.leaderboard)) {
          const cleanLb = [];
          for (const entry of parsed.leaderboard) {
            if (entry && typeof entry === 'object') {
              const s = Number(entry.score);
              const d = Number(entry.distance);
              if (Number.isFinite(s) && s >= 0) {
                cleanLb.push({
                  score: Math.floor(s),
                  distance: Number.isFinite(d) && d >= 0 ? Math.floor(d) : Math.floor(s / SCORE_PER_METER),
                  date: typeof entry.date === 'string' ? entry.date.slice(0, 32) : '—'
                });
              }
            }
          }
          cleanLb.sort((a, b) => b.score - a.score);
          this.data.leaderboard = cleanLb.slice(0, 10);
        } else {
          this.data.leaderboard = [];
        }

        const best = Number(parsed.bestScore);
        const lbMax = this.data.leaderboard.length > 0 ? this.data.leaderboard[0].score : 0;
        this.data.bestScore = Math.max(
          Number.isFinite(best) && best >= 0 ? Math.floor(best) : 0,
          lbMax
        );
      } catch (e) {
        this.resetToDefaults();
      }
    },

    resetToDefaults() {
      this.data = {
        tokens: 0,
        crystals: 0,
        ownedSuits: ['lunar'],
        selectedSuit: 'lunar',
        ownedPlanets: ['earth'],
        selectedPlanet: 'earth',
        bestScore: 0,
        leaderboard: []
      };
      this.save();
    },

    save() {
      if (!this.isAvailable) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        // Игнорируем переполнение квоты
      }
    },

    recordRunResult(finalScore, finalDistanceMeters, earnedTokens, earnedCrystals) {
      this.data.tokens += Math.max(0, Math.floor(earnedTokens));
      this.data.crystals += Math.max(0, Math.floor(earnedCrystals));

      const intScore = Math.max(0, Math.floor(finalScore));
      const intDist = Math.max(0, Math.floor(finalDistanceMeters));

      if (intScore > this.data.bestScore) {
        this.data.bestScore = intScore;
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      this.data.leaderboard.push({
        score: intScore,
        distance: intDist,
        date: dateStr
      });

      this.data.leaderboard.sort((a, b) => b.score - a.score);
      this.data.leaderboard = this.data.leaderboard.slice(0, 10);
      this.save();
    }
  };

  /* ============================================================================
   * 3. ГЛОБАЛЬНОЕ СОСТОЯНИЕ ИГРЫ И THREE.JS СЦЕНЫ
   * ============================================================================ */
  let currentState = GAME_STATES.MENU;
  let previousMenuState = GAME_STATES.MENU;
  let activeShopTab = 'suits'; // 'suits' | 'planets'

  let scene, camera, renderer;
  let astronaut = null;
  let backgroundPlanetGroup = null;
  let terrainChunks = [];

  // Пулы активных объектов
  const obstaclePool = [];
  const activeObstacles = [];
  const tokenPool = [];
  const activeTokens = [];
  const crystalPool = [];
  const activeCrystals = [];

  // Состояние текущего забега
  const runState = {
    speed: INITIAL_SPEED,
    distance: 0,
    score: 0,
    tokensCollected: 0,
    crystalsCollected: 0,
    nextCrystalTargetDist: CRYSTAL_INTERVAL_METERS,
    currentLaneIndex: 1,
    playerX: 0,
    playerY: 0,
    velocityY: 0,
    isJumping: false,
    runTime: 0,
    nextWaveZ: -38,
    safeLanesPrev: [0, 1, 2],
    resultRecorded: false
  };

  let lastFrameTime = performance.now();

  /* ============================================================================
   * 4. ПРОЦЕДУРНЫЕ МАТЕРИАЛЫ, МОДЕЛЬ КОСМОНАВТА И ПЛАНЕТ
   * ============================================================================ */
  const sharedMaterials = {};

  function initSharedMaterials() {
    sharedMaterials.regolith = new THREE.MeshStandardMaterial({
      color: 0x7b8394,
      roughness: 0.94,
      metalness: 0.05,
      flatShading: true
    });

    sharedMaterials.craterDark = new THREE.MeshStandardMaterial({
      color: 0x525968,
      roughness: 0.96,
      metalness: 0.04,
      flatShading: true
    });

    sharedMaterials.decorRock = new THREE.MeshStandardMaterial({
      color: 0x687082,
      roughness: 0.9,
      metalness: 0.08,
      flatShading: true
    });

    sharedMaterials.lowAsteroid = new THREE.MeshStandardMaterial({
      color: 0x9a5b45,
      roughness: 0.78,
      metalness: 0.18,
      flatShading: true
    });

    sharedMaterials.highAsteroid = new THREE.MeshStandardMaterial({
      color: 0x4c3549,
      roughness: 0.62,
      metalness: 0.35,
      emissive: 0x3b0a1e,
      emissiveIntensity: 0.35,
      flatShading: true
    });

    sharedMaterials.highAsteroidCore = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.75,
      roughness: 0.3,
      flatShading: true
    });

    sharedMaterials.tokenGold = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.85,
      flatShading: true
    });

    sharedMaterials.tokenCenter = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.5
    });

    // Материалы для редкого Звёздного кристалла (раз в 300 м)
    sharedMaterials.crystalCore = new THREE.MeshStandardMaterial({
      color: 0xe879f9,
      emissive: 0xa855f7,
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.7,
      flatShading: true
    });

    sharedMaterials.crystalRing = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
      flatShading: true
    });
  }

  /**
   * Создаёт составную low-poly модель космонавта из примитивов.
   */
  function createAstronautModel() {
    const root = new THREE.Group();
    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    const primaryMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.45,
      metalness: 0.15,
      flatShading: true
    });

    const secondaryMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.55,
      metalness: 0.3,
      flatShading: true
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.5,
      flatShading: true
    });

    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.12,
      metalness: 0.9,
      emissive: 0x082f49,
      emissiveIntensity: 0.3
    });

    // 1. Туловище
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.76, 0.44), primaryMat);
    torsoMesh.position.set(0, 1.06, 0);
    torsoMesh.castShadow = true;
    bodyGroup.add(torsoMesh);

    const chestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.08), accentMat);
    chestPanel.position.set(0, 1.1, -0.24);
    bodyGroup.add(chestPanel);

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.71, 0.13, 0.47), secondaryMat);
    belt.position.set(0, 0.72, 0);
    bodyGroup.add(belt);

    // 2. Шлем и визор
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.68, 0);
    bodyGroup.add(headGroup);

    const helmetRing = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.09, 10), secondaryMat);
    helmetRing.position.set(0, -0.22, 0);
    headGroup.add(helmetRing);

    const helmetMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.54, 0.58), primaryMat);
    helmetMesh.castShadow = true;
    headGroup.add(helmetMesh);

    const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.32, 0.52), visorMat);
    visorMesh.position.set(0, 0.02, -0.06);
    headGroup.add(visorMesh);

    const antennaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6), secondaryMat);
    antennaStem.position.set(0.24, 0.34, 0.05);
    headGroup.add(antennaStem);

    const antennaTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), accentMat);
    antennaTip.position.set(0.24, 0.47, 0.05);
    headGroup.add(antennaTip);

    // 3. Кислородный ранец
    const backpackGroup = new THREE.Group();
    backpackGroup.position.set(0, 1.1, 0.32);
    bodyGroup.add(backpackGroup);

    const packCore = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.66, 0.24), primaryMat);
    packCore.castShadow = true;
    backpackGroup.add(packCore);

    const tankGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.68, 8);
    const leftTank = new THREE.Mesh(tankGeo, secondaryMat);
    leftTank.position.set(-0.18, 0, 0.08);
    backpackGroup.add(leftTank);

    const rightTank = new THREE.Mesh(tankGeo, secondaryMat);
    rightTank.position.set(0.18, 0, 0.08);
    backpackGroup.add(rightTank);

    const packBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.06), accentMat);
    packBeacon.position.set(0, 0.16, 0.14);
    backpackGroup.add(packBeacon);

    // 4. Руки и перчатки
    function createArm(side) {
      const armPivot = new THREE.Group();
      armPivot.position.set(side * 0.46, 1.34, 0);

      const shoulderPad = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.24), accentMat);
      shoulderPad.position.set(0, -0.04, 0);
      armPivot.add(shoulderPad);

      const armSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.44, 0.20), primaryMat);
      armSleeve.position.set(0, -0.26, 0);
      armSleeve.castShadow = true;
      armPivot.add(armSleeve);

      const glove = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.19, 0.23), secondaryMat);
      glove.position.set(0, -0.52, -0.02);
      armPivot.add(glove);

      return armPivot;
    }

    const leftArm = createArm(-1);
    const rightArm = createArm(1);
    bodyGroup.add(leftArm);
    bodyGroup.add(rightArm);

    // 5. Ноги и ботинки
    function createLeg(side) {
      const legPivot = new THREE.Group();
      legPivot.position.set(side * 0.19, 0.68, 0);

      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.46, 0.26), primaryMat);
      thigh.position.set(0, -0.23, 0);
      thigh.castShadow = true;
      legPivot.add(thigh);

      const kneeJoint = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.10, 0.27), accentMat);
      kneeJoint.position.set(0, -0.44, 0);
      legPivot.add(kneeJoint);

      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.22, 0.36), secondaryMat);
      boot.position.set(0, -0.57, -0.04);
      boot.castShadow = true;
      legPivot.add(boot);

      return legPivot;
    }

    const leftLeg = createLeg(-1);
    const rightLeg = createLeg(1);
    bodyGroup.add(leftLeg);
    bodyGroup.add(rightLeg);

    return {
      root,
      bodyGroup,
      headGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      materials: {
        primary: primaryMat,
        secondary: secondaryMat,
        accent: accentMat,
        visor: visorMat
      },
      applySuit(suitId) {
        const cfg = SUITS_CATALOG[suitId] || SUITS_CATALOG.lunar;
        this.materials.primary.color.setHex(cfg.primaryHex);
        this.materials.secondary.color.setHex(cfg.secondaryHex);
        this.materials.accent.color.setHex(cfg.accentHex);
        this.materials.accent.emissive.setHex(cfg.accentHex);
        this.materials.visor.color.setHex(cfg.visorHex);
      }
    };
  }

  /**
   * Создаёт и обновляет 3D-модель планеты на заднем фоне в зависимости от выбранного варианта.
   */
  function applyBackgroundPlanet(planetId) {
    if (!backgroundPlanetGroup) {
      backgroundPlanetGroup = new THREE.Group();
      backgroundPlanetGroup.position.set(-42, 40, -185);
      scene.add(backgroundPlanetGroup);
    }

    // Очищаем старую геометрию планеты
    while (backgroundPlanetGroup.children.length > 0) {
      const child = backgroundPlanetGroup.children.pop();
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    const id = PLANETS_CATALOG[planetId] ? planetId : 'earth';

    if (id === 'earth') {
      // Голубая Земля с зелёными материками и облачным поясом
      const oceanMesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(11.5, 2),
        new THREE.MeshStandardMaterial({
          color: 0x2563eb,
          emissive: 0x075985,
          emissiveIntensity: 0.35,
          roughness: 0.65,
          flatShading: true
        })
      );
      backgroundPlanetGroup.add(oceanMesh);

      const continentsMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(11.75, 1),
        new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x065f46,
          emissiveIntensity: 0.25,
          roughness: 0.8,
          flatShading: true
        })
      );
      continentsMesh.scale.set(1.02, 0.94, 0.98);
      continentsMesh.rotation.set(0.5, 0.8, 0.2);
      backgroundPlanetGroup.add(continentsMesh);

      const atmoRing = new THREE.Mesh(
        new THREE.TorusGeometry(15.2, 0.28, 6, 36),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.45 })
      );
      atmoRing.rotation.x = Math.PI * 0.42;
      atmoRing.rotation.y = 0.25;
      backgroundPlanetGroup.add(atmoRing);
    } else if (id === 'saturn') {
      // Сатурн с широкими двойными кольцами
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(12.5, 2),
        new THREE.MeshStandardMaterial({
          color: 0xeab308,
          emissive: 0x854d0e,
          emissiveIntensity: 0.35,
          roughness: 0.6,
          flatShading: true
        })
      );
      backgroundPlanetGroup.add(core);

      const innerRing = new THREE.Mesh(
        new THREE.RingGeometry(15.5, 22.0, 32),
        new THREE.MeshBasicMaterial({
          color: 0xfde047,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        })
      );
      innerRing.rotation.x = Math.PI * 0.38;
      innerRing.rotation.y = -0.3;
      backgroundPlanetGroup.add(innerRing);

      const outerRing = new THREE.Mesh(
        new THREE.RingGeometry(23.5, 28.5, 32),
        new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5
        })
      );
      outerRing.rotation.x = Math.PI * 0.38;
      outerRing.rotation.y = -0.3;
      backgroundPlanetGroup.add(outerRing);
    } else if (id === 'crimson') {
      // Вулканический гигант с лавовыми разломами и двумя спутниками
      const lavaSphere = new THREE.Mesh(
        new THREE.IcosahedronGeometry(13.0, 2),
        new THREE.MeshStandardMaterial({
          color: 0xdc2626,
          emissive: 0x991b1b,
          emissiveIntensity: 0.55,
          roughness: 0.7,
          flatShading: true
        })
      );
      backgroundPlanetGroup.add(lavaSphere);

      const magmaCrust = new THREE.Mesh(
        new THREE.OctahedronGeometry(13.5, 1),
        new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0xea580c,
          emissiveIntensity: 0.65,
          wireframe: true
        })
      );
      backgroundPlanetGroup.add(magmaCrust);

      const moon1 = new THREE.Mesh(
        new THREE.DodecahedronGeometry(3.2, 0),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xb45309, emissiveIntensity: 0.4, flatShading: true })
      );
      moon1.position.set(22, 10, 6);
      backgroundPlanetGroup.add(moon1);

      const moon2 = new THREE.Mesh(
        new THREE.DodecahedronGeometry(2.1, 0),
        new THREE.MeshStandardMaterial({ color: 0xf87171, emissive: 0x7f1d1d, emissiveIntensity: 0.4, flatShading: true })
      );
      moon2.position.set(-20, -9, 8);
      backgroundPlanetGroup.add(moon2);
    } else if (id === 'neptune') {
      // Ледяной Нептун с вертикальным криогенным кольцом
      const iceCore = new THREE.Mesh(
        new THREE.IcosahedronGeometry(12.5, 2),
        new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x0284c7,
          emissiveIntensity: 0.5,
          roughness: 0.3,
          metalness: 0.4,
          flatShading: true
        })
      );
      backgroundPlanetGroup.add(iceCore);

      const iceRing1 = new THREE.Mesh(
        new THREE.TorusGeometry(19.5, 0.65, 8, 40),
        new THREE.MeshBasicMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.75 })
      );
      iceRing1.rotation.x = 0.35;
      iceRing1.rotation.y = 0.65;
      backgroundPlanetGroup.add(iceRing1);

      const iceRing2 = new THREE.Mesh(
        new THREE.TorusGeometry(16.0, 0.35, 8, 40),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 })
      );
      iceRing2.rotation.x = -0.45;
      iceRing2.rotation.y = -0.4;
      backgroundPlanetGroup.add(iceRing2);
    } else if (id === 'pulsar') {
      // Квазар Бездны (чёрная дыра + неоновый аккреционный диск + полярные джеты)
      const blackHoleCore = new THREE.Mesh(
        new THREE.SphereGeometry(9.5, 20, 20),
        new THREE.MeshBasicMaterial({ color: 0x05030a })
      );
      backgroundPlanetGroup.add(blackHoleCore);

      const photonHalo = new THREE.Mesh(
        new THREE.TorusGeometry(10.4, 0.6, 12, 40),
        new THREE.MeshBasicMaterial({ color: 0xf0abfc })
      );
      backgroundPlanetGroup.add(photonHalo);

      const accretionDisk = new THREE.Mesh(
        new THREE.RingGeometry(12.0, 27.0, 36),
        new THREE.MeshBasicMaterial({
          color: 0xc084fc,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.82
        })
      );
      accretionDisk.rotation.x = Math.PI * 0.4;
      accretionDisk.rotation.y = -0.2;
      backgroundPlanetGroup.add(accretionDisk);

      // Полярные энергетические лучи (джеты)
      const jetBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 2.8, 48, 10),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 })
      );
      jetBeam.rotation.z = 0.2;
      backgroundPlanetGroup.add(jetBeam);
    }
  }

  /* ============================================================================
   * 5. ОКРУЖЕНИЕ ЛУНЫ: ПОВЕРХНОСТЬ, КРАТЕРЫ И ЗВЁЗДНОЕ НЕБО
   * ============================================================================ */
  function createStarfield() {
    const starCount = 1600;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 380;
      positions[i3 + 1] = Math.random() * 140 + 6;
      positions[i3 + 2] = -Math.random() * 260 + 20;

      const tint = 0.75 + Math.random() * 0.25;
      colors[i3] = tint;
      colors[i3 + 1] = tint;
      colors[i3 + 2] = 0.9 + Math.random() * 0.1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.75,
      vertexColors: true,
      transparent: true,
      opacity: 0.92
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // Инициализируем выбранную планету на небосводе
    applyBackgroundPlanet(StorageManager.data.selectedPlanet);

    return points;
  }

  function createTerrainChunk(zOffset) {
    const chunkGroup = new THREE.Group();
    chunkGroup.position.z = zOffset;

    const groundGeo = new THREE.PlaneGeometry(110, CHUNK_LENGTH, 18, 8);
    groundGeo.rotateX(-Math.PI / 2);

    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      if (Math.abs(vx) > 6.2) {
        const hill = Math.sin(vx * 0.25) * 0.65 + (Math.random() - 0.5) * 0.55;
        posAttr.setY(i, Math.max(0, hill));
      }
    }
    groundGeo.computeVertexNormals();

    const groundMesh = new THREE.Mesh(groundGeo, sharedMaterials.regolith);
    groundMesh.receiveShadow = true;
    chunkGroup.add(groundMesh);

    for (let side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const localZ = (i - 1.5) * (CHUNK_LENGTH / 4) + (Math.random() - 0.5) * 4;
        const localX = side * (8.5 + Math.random() * 16);

        if (i % 2 === 0) {
          const radius = 1.6 + Math.random() * 2.2;
          const craterRim = new THREE.Mesh(
            new THREE.RingGeometry(radius * 0.55, radius, 10),
            sharedMaterials.craterDark
          );
          craterRim.rotation.x = -Math.PI / 2;
          craterRim.position.set(localX, 0.06, localZ);
          chunkGroup.add(craterRim);
        } else {
          const rockScale = 0.6 + Math.random() * 1.1;
          const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(rockScale, 0),
            sharedMaterials.decorRock
          );
          rock.scale.y = 0.55;
          rock.position.set(localX, rockScale * 0.25, localZ);
          rock.rotation.y = Math.random() * Math.PI;
          chunkGroup.add(rock);
        }
      }
    }

    scene.add(chunkGroup);
    return chunkGroup;
  }

  /* ============================================================================
   * 6. ПУЛЫ ПРЕПЯТСТВИЙ, ЖЕТОНОВ И РЕДКИХ КРИСТАЛЛОВ (РАЗ В 300 М)
   * ============================================================================ */
  function createObstacleObject(type) {
    const group = new THREE.Group();
    const isHigh = type === 'high';
    const targetHeight = isHigh ? HIGH_OBSTACLE_HEIGHT : LOW_OBSTACLE_HEIGHT;

    if (!isHigh) {
      const mainRock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(BLOCK_HEIGHT * 0.56, 0),
        sharedMaterials.lowAsteroid
      );
      mainRock.scale.set(1.25, 0.92, 0.95);
      mainRock.position.y = targetHeight * 0.5;
      mainRock.castShadow = true;
      mainRock.receiveShadow = true;
      group.add(mainRock);

      const sideShard = new THREE.Mesh(
        new THREE.OctahedronGeometry(BLOCK_HEIGHT * 0.36, 0),
        sharedMaterials.lowAsteroid
      );
      sideShard.position.set(0.45, targetHeight * 0.35, 0.15);
      sideShard.rotation.z = 0.3;
      group.add(sideShard);
    } else {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.88, targetHeight, 7),
        sharedMaterials.highAsteroid
      );
      pillar.position.y = targetHeight * 0.5;
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      group.add(pillar);

      const crystalTop = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.46, 0),
        sharedMaterials.highAsteroidCore
      );
      crystalTop.scale.set(0.85, 1.45, 0.85);
      crystalTop.position.set(0, targetHeight - 0.35, 0);
      group.add(crystalTop);

      const midBand = new THREE.Mesh(
        new THREE.TorusGeometry(0.66, 0.08, 6, 7),
        sharedMaterials.highAsteroidCore
      );
      midBand.rotation.x = Math.PI / 2;
      midBand.position.y = BLOCK_HEIGHT;
      group.add(midBand);
    }

    group.visible = false;
    scene.add(group);

    return {
      type,
      mesh: group,
      lane: 1,
      z: 0,
      height: targetHeight,
      halfWidth: 0.78,
      halfDepth: 0.62,
      active: false
    };
  }

  function acquireObstacle(type) {
    for (let i = 0; i < obstaclePool.length; i++) {
      const obj = obstaclePool[i];
      if (!obj.active && obj.type === type) {
        obj.active = true;
        obj.mesh.visible = true;
        return obj;
      }
    }
    const created = createObstacleObject(type);
    created.active = true;
    created.mesh.visible = true;
    obstaclePool.push(created);
    return created;
  }

  function releaseObstacle(obs) {
    obs.active = false;
    obs.mesh.visible = false;
  }

  function createTokenObject() {
    const group = new THREE.Group();

    const outerRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 0.14, 12),
      sharedMaterials.tokenGold
    );
    outerRing.rotation.x = Math.PI / 2;
    outerRing.castShadow = true;
    group.add(outerRing);

    const coreGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      sharedMaterials.tokenCenter
    );
    coreGem.scale.z = 0.65;
    group.add(coreGem);

    group.visible = false;
    scene.add(group);

    return {
      mesh: group,
      lane: 1,
      x: 0,
      y: 0.8,
      z: 0,
      collected: false,
      active: false
    };
  }

  function acquireToken() {
    for (let i = 0; i < tokenPool.length; i++) {
      const tok = tokenPool[i];
      if (!tok.active) {
        tok.active = true;
        tok.collected = false;
        tok.mesh.visible = true;
        return tok;
      }
    }
    const created = createTokenObject();
    created.active = true;
    created.collected = false;
    created.mesh.visible = true;
    tokenPool.push(created);
    return created;
  }

  function releaseToken(tok) {
    tok.active = false;
    tok.collected = false;
    tok.mesh.visible = false;
  }

  /**
   * Создаёт редкий Звёздный кристалл (появляется раз в 300 метров).
   */
  function createCrystalObject() {
    const group = new THREE.Group();

    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.52, 0),
      sharedMaterials.crystalCore
    );
    diamond.scale.set(0.85, 1.45, 0.85);
    diamond.castShadow = true;
    group.add(diamond);

    const orbitRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.06, 6, 16),
      sharedMaterials.crystalRing
    );
    orbitRing.rotation.x = Math.PI / 3;
    group.add(orbitRing);

    group.visible = false;
    scene.add(group);

    return {
      mesh: group,
      orbitRing,
      lane: 1,
      x: 0,
      baseY: 1.1,
      y: 1.1,
      z: 0,
      collected: false,
      active: false
    };
  }

  function acquireCrystal() {
    for (let i = 0; i < crystalPool.length; i++) {
      const cr = crystalPool[i];
      if (!cr.active) {
        cr.active = true;
        cr.collected = false;
        cr.mesh.visible = true;
        return cr;
      }
    }
    const created = createCrystalObject();
    created.active = true;
    created.collected = false;
    created.mesh.visible = true;
    crystalPool.push(created);
    return created;
  }

  function releaseCrystal(cr) {
    cr.active = false;
    cr.collected = false;
    cr.mesh.visible = false;
  }

  /* ============================================================================
   * 7. ЧЕСТНАЯ ГЕНЕРАЦИЯ ПРЕПЯТСТВИЙ, ЖЕТОНОВ И КРИСТАЛЛОВ (КАЖДЫЕ 300 М)
   * ============================================================================ */
  function spawnNextWave() {
    const zPos = runState.nextWaveZ;

    const prevAnchorLane =
      runState.safeLanesPrev[Math.floor(Math.random() * runState.safeLanesPrev.length)];
    const reachableLanes = [0, 1, 2].filter(l => Math.abs(l - prevAnchorLane) <= 1);
    const guaranteedSafeLane =
      reachableLanes[Math.floor(Math.random() * reachableLanes.length)];

    const pattern = ['none', 'none', 'none'];
    const currentSafeLanes = [];

    for (let lane = 0; lane < 3; lane++) {
      if (lane === guaranteedSafeLane) {
        pattern[lane] = Math.random() < 0.7 ? 'none' : 'low';
      } else {
        const roll = Math.random();
        if (roll < 0.34) {
          pattern[lane] = 'none';
        } else if (roll < 0.68) {
          pattern[lane] = 'low';
        } else {
          pattern[lane] = 'high';
        }
      }

      if (pattern[lane] !== 'high') {
        currentSafeLanes.push(lane);
      }
    }

    const obstacleCount = pattern.filter(p => p !== 'none').length;
    if (obstacleCount === 3 && pattern[guaranteedSafeLane] === 'low') {
      if (Math.random() < 0.55) {
        pattern[guaranteedSafeLane] = 'none';
      }
    }

    // Спавн препятствий
    for (let lane = 0; lane < 3; lane++) {
      const kind = pattern[lane];
      if (kind === 'low' || kind === 'high') {
        const obs = acquireObstacle(kind);
        obs.lane = lane;
        obs.z = zPos;
        obs.mesh.position.set(LANE_X[lane], 0, zPos);
        obs.mesh.rotation.y = (lane * 1.7 + Math.abs(zPos) * 0.3) % (Math.PI * 2);
        activeObstacles.push(obs);
      }
    }

    // Проверяем, соответствует ли дистанция этой волны отметке кратной 300 метрам
    const waveDistanceMeters = runState.distance + Math.abs(zPos);
    let spawnedRareCrystalHere = false;

    if (waveDistanceMeters >= runState.nextCrystalTargetDist) {
      runState.nextCrystalTargetDist += CRYSTAL_INTERVAL_METERS;
      spawnedRareCrystalHere = true;

      const crystal = acquireCrystal();
      crystal.lane = guaranteedSafeLane;
      crystal.x = LANE_X[guaranteedSafeLane];
      crystal.z = zPos;
      crystal.baseY = pattern[guaranteedSafeLane] === 'low' ? LOW_OBSTACLE_HEIGHT + 0.75 : 1.15;
      crystal.y = crystal.baseY;
      crystal.mesh.position.set(crystal.x, crystal.y, crystal.z);
      activeCrystals.push(crystal);
    }

    // Обычные лунные жетоны размещаются, если в этой точке не заспавнился редкий кристалл
    if (!spawnedRareCrystalHere && Math.random() < 0.68) {
      const tokenLane = guaranteedSafeLane;
      const laneObstacle = pattern[tokenLane];
      const tokCount = Math.random() < 0.5 ? 3 : 1;

      for (let i = 0; i < tokCount; i++) {
        const tok = acquireToken();
        const offsetZ = (i - Math.floor(tokCount / 2)) * 2.7;
        tok.lane = tokenLane;
        tok.x = LANE_X[tokenLane];
        tok.z = zPos + offsetZ;

        if (laneObstacle === 'low' && Math.abs(offsetZ) < 2.2) {
          tok.y = LOW_OBSTACLE_HEIGHT + 0.65;
        } else {
          tok.y = 0.85;
        }

        tok.mesh.position.set(tok.x, tok.y, tok.z);
        activeTokens.push(tok);
      }
    }

    runState.safeLanesPrev = currentSafeLanes.length > 0 ? currentSafeLanes : [guaranteedSafeLane];

    const jumpTotalDuration = JUMP_TIME_APEX * 2;
    const minReactionSeconds = Math.max(0.92, jumpTotalDuration + 0.22);
    const minSpacing = runState.speed * minReactionSeconds;
    const randomExtra = 4 + Math.random() * 7;
    runState.nextWaveZ -= (minSpacing + randomExtra);
  }

  /* ============================================================================
   * 8. ФИЗИКА, АНИМАЦИЯ И ПРОВЕРКА СТОЛКНОВЕНИЙ
   * ============================================================================ */
  function resetRunState() {
    while (activeObstacles.length > 0) {
      releaseObstacle(activeObstacles.pop());
    }
    while (activeTokens.length > 0) {
      releaseToken(activeTokens.pop());
    }
    while (activeCrystals.length > 0) {
      releaseCrystal(activeCrystals.pop());
    }

    runState.speed = INITIAL_SPEED;
    runState.distance = 0;
    runState.score = 0;
    runState.tokensCollected = 0;
    runState.crystalsCollected = 0;
    runState.nextCrystalTargetDist = CRYSTAL_INTERVAL_METERS;
    runState.currentLaneIndex = 1;
    runState.playerX = LANE_X[1];
    runState.playerY = 0;
    runState.velocityY = 0;
    runState.isJumping = false;
    runState.runTime = 0;
    runState.nextWaveZ = -42;
    runState.safeLanesPrev = [0, 1, 2];
    runState.resultRecorded = false;

    if (astronaut) {
      astronaut.applySuit(StorageManager.data.selectedSuit);
      astronaut.root.position.set(0, 0, 0);
      astronaut.bodyGroup.rotation.set(0, 0, 0);
    }

    while (runState.nextWaveZ > SPAWN_Z) {
      spawnNextWave();
    }

    updateHudUI();
  }

  function updateGameplay(dt) {
    runState.runTime += dt;

    if (runState.speed < MAX_SPEED) {
      runState.speed = Math.min(MAX_SPEED, runState.speed + SPEED_ACCELERATION * dt);
    }

    const stepZ = runState.speed * dt;
    runState.distance += stepZ;
    runState.score = Math.floor(runState.distance * SCORE_PER_METER);

    // 1. Горизонтальное перемещение между полосами
    const targetX = LANE_X[runState.currentLaneIndex];
    const diffX = targetX - runState.playerX;
    runState.playerX += diffX * Math.min(1, LANE_SWITCH_SPEED * dt);
    if (Math.abs(targetX - runState.playerX) < 0.01) {
      runState.playerX = targetX;
    }

    // 2. Вертикальная физика прыжка
    if (runState.isJumping) {
      const gravMultiplier = runState.velocityY < -18 ? FAST_FALL_GRAVITY_MULT : 1.0;
      runState.velocityY -= LUNAR_GRAVITY * gravMultiplier * dt;
      runState.playerY += runState.velocityY * dt;

      if (runState.playerY <= 0) {
        runState.playerY = 0;
        runState.velocityY = 0;
        runState.isJumping = false;
      }
    }

    // 3. Анимация космонавта
    astronaut.root.position.x = runState.playerX;
    astronaut.root.position.y = runState.playerY;

    const tiltZ = -diffX * 0.14;
    astronaut.bodyGroup.rotation.z = tiltZ;
    astronaut.bodyGroup.rotation.x = runState.isJumping ? 0.08 : 0.14;

    if (runState.isJumping) {
      astronaut.leftLeg.rotation.x = 0.45;
      astronaut.rightLeg.rotation.x = -0.35;
      astronaut.leftArm.rotation.x = -0.55;
      astronaut.rightArm.rotation.x = 0.45;
      astronaut.bodyGroup.position.y = 0;
    } else {
      const stridePhase = runState.distance * 1.15;
      const swing = Math.sin(stridePhase) * 0.72;
      astronaut.leftLeg.rotation.x = swing;
      astronaut.rightLeg.rotation.x = -swing;
      astronaut.leftArm.rotation.x = -swing * 0.85;
      astronaut.rightArm.rotation.x = swing * 0.85;
      astronaut.bodyGroup.position.y = Math.abs(Math.cos(stridePhase)) * 0.08;
    }

    // Вращение фоновой планеты
    if (backgroundPlanetGroup) {
      backgroundPlanetGroup.rotation.y += 0.08 * dt;
    }

    // Следование камеры
    camera.position.x += (runState.playerX * 0.38 - camera.position.x) * Math.min(1, 6 * dt);
    camera.lookAt(runState.playerX * 0.2, 1.35, -14);

    // 4. Перемещение сегментов поверхности
    for (let i = 0; i < terrainChunks.length; i++) {
      const chunk = terrainChunks[i];
      chunk.position.z += stepZ;
      if (chunk.position.z > CHUNK_LENGTH) {
        chunk.position.z -= CHUNK_LENGTH * CHUNK_COUNT;
      }
    }

    // 5. Генерация новых волн впереди
    runState.nextWaveZ += stepZ;
    while (runState.nextWaveZ > SPAWN_Z) {
      spawnNextWave();
    }

    // 6. Проверка столкновений с препятствиями
    const playerHalfWidth = 0.31;
    const playerHalfDepth = 0.24;
    const playerHeight = 1.75;
    const playerBottom = runState.playerY;
    const playerTop = runState.playerY + playerHeight;

    for (let i = activeObstacles.length - 1; i >= 0; i--) {
      const obs = activeObstacles[i];
      obs.z += stepZ;
      obs.mesh.position.z = obs.z;

      const obsX = LANE_X[obs.lane];
      const forgivenessY = obs.type === 'low' ? 0.24 : 0.16;
      const effectiveObsHeight = obs.height - forgivenessY;

      const overlapZ = Math.abs(obs.z) < (obs.halfDepth + playerHalfDepth);
      const overlapX = Math.abs(runState.playerX - obsX) < (obs.halfWidth + playerHalfWidth);
      const overlapY = playerBottom < effectiveObsHeight && playerTop > 0.05;

      if (overlapZ && overlapX && overlapY) {
        triggerGameOver();
        return;
      }

      if (obs.z > DESPAWN_Z) {
        releaseObstacle(obs);
        activeObstacles.splice(i, 1);
      }
    }

    // 7. Обновление и сбор обычных жетонов
    for (let i = activeTokens.length - 1; i >= 0; i--) {
      const tok = activeTokens[i];
      tok.z += stepZ;
      tok.mesh.position.z = tok.z;
      tok.mesh.rotation.y += 3.2 * dt;

      if (!tok.collected) {
        const dx = Math.abs(runState.playerX - tok.x);
        const dz = Math.abs(tok.z);
        const dy = Math.abs((runState.playerY + 0.9) - tok.y);

        if (dx < 0.85 && dz < 0.85 && dy < 1.05) {
          tok.collected = true;
          runState.tokensCollected += 1;
          releaseToken(tok);
          activeTokens.splice(i, 1);
          continue;
        }
      }

      if (tok.z > DESPAWN_Z) {
        releaseToken(tok);
        activeTokens.splice(i, 1);
      }
    }

    // 8. Обновление и сбор редких Звёздных кристаллов (раз в 300 м)
    for (let i = activeCrystals.length - 1; i >= 0; i--) {
      const cr = activeCrystals[i];
      cr.z += stepZ;
      cr.y = cr.baseY + Math.sin(runState.runTime * 4.5) * 0.18;
      cr.mesh.position.set(cr.x, cr.y, cr.z);
      cr.mesh.rotation.y += 2.6 * dt;
      cr.orbitRing.rotation.z += 3.8 * dt;

      if (!cr.collected) {
        const dx = Math.abs(runState.playerX - cr.x);
        const dz = Math.abs(cr.z);
        const dy = Math.abs((runState.playerY + 0.95) - cr.y);

        if (dx < 0.95 && dz < 0.95 && dy < 1.15) {
          cr.collected = true;
          runState.crystalsCollected += 1;
          releaseCrystal(cr);
          activeCrystals.splice(i, 1);
          continue;
        }
      }

      if (cr.z > DESPAWN_Z) {
        releaseCrystal(cr);
        activeCrystals.splice(i, 1);
      }
    }

    updateHudUI();
  }

  function updateIdleScene(dt) {
    const t = performance.now() * 0.002;
    if (astronaut) {
      astronaut.root.position.set(0, 0, 0);
      astronaut.bodyGroup.position.y = Math.sin(t * 1.5) * 0.04;
      astronaut.bodyGroup.rotation.z = 0;
      astronaut.bodyGroup.rotation.x = 0.04;
      astronaut.leftArm.rotation.x = Math.sin(t) * 0.12;
      astronaut.rightArm.rotation.x = -Math.sin(t) * 0.12;
      astronaut.leftLeg.rotation.x = 0;
      astronaut.rightLeg.rotation.x = 0;
    }
    if (backgroundPlanetGroup) {
      backgroundPlanetGroup.rotation.y += 0.12 * dt;
    }
    camera.position.x += (0 - camera.position.x) * Math.min(1, 5 * dt);
    camera.lookAt(0, 1.35, -12);
  }

  /* ============================================================================
   * 9. УПРАВЛЕНИЕ СОСТОЯНИЯМИ И ИНТЕРФЕЙСОМ
   * ============================================================================ */
  const uiElements = {
    hud: document.getElementById('hud'),
    hudScore: document.getElementById('hud-score'),
    hudBest: document.getElementById('hud-best'),
    hudTokens: document.getElementById('hud-tokens'),
    hudCrystals: document.getElementById('hud-crystals'),
    screenMenu: document.getElementById('screen-menu'),
    screenPause: document.getElementById('screen-pause'),
    screenGameOver: document.getElementById('screen-gameover'),
    screenShop: document.getElementById('screen-shop'),
    screenLeaderboard: document.getElementById('screen-leaderboard'),
    goScore: document.getElementById('go-score'),
    goBest: document.getElementById('go-best'),
    goTokens: document.getElementById('go-tokens'),
    goCrystals: document.getElementById('go-crystals'),
    shopBalanceTokens: document.getElementById('shop-balance-tokens'),
    shopBalanceCrystals: document.getElementById('shop-balance-crystals'),
    shopSuitsContainer: document.getElementById('shop-suits-container'),
    shopPlanetsContainer: document.getElementById('shop-planets-container'),
    tabBtnSuits: document.getElementById('tab-btn-suits'),
    tabBtnPlanets: document.getElementById('tab-btn-planets'),
    lbAllTimeBest: document.getElementById('lb-alltime-best'),
    lbTbody: document.getElementById('leaderboard-tbody')
  };

  function hideAllScreens() {
    uiElements.hud.classList.add('hidden');
    uiElements.screenMenu.classList.add('hidden');
    uiElements.screenPause.classList.add('hidden');
    uiElements.screenGameOver.classList.add('hidden');
    uiElements.screenShop.classList.add('hidden');
    uiElements.screenLeaderboard.classList.add('hidden');
  }

  function setState(newState) {
    hideAllScreens();
    currentState = newState;
    lastFrameTime = performance.now();

    switch (newState) {
      case GAME_STATES.MENU:
        if (astronaut) astronaut.applySuit(StorageManager.data.selectedSuit);
        uiElements.screenMenu.classList.remove('hidden');
        break;

      case GAME_STATES.RUNNING:
        uiElements.hud.classList.remove('hidden');
        updateHudUI();
        break;

      case GAME_STATES.PAUSED:
        uiElements.hud.classList.remove('hidden');
        uiElements.screenPause.classList.remove('hidden');
        break;

      case GAME_STATES.GAME_OVER:
        uiElements.screenGameOver.classList.remove('hidden');
        break;

      case GAME_STATES.SHOP:
        renderShopUI();
        uiElements.screenShop.classList.remove('hidden');
        break;

      case GAME_STATES.LEADERBOARD:
        renderLeaderboardUI();
        uiElements.screenLeaderboard.classList.remove('hidden');
        break;
    }
  }

  function startNewRun() {
    resetRunState();
    setState(GAME_STATES.RUNNING);
  }

  function triggerGameOver() {
    if (currentState !== GAME_STATES.RUNNING) return;

    const meters = Math.floor(runState.distance);
    if (!runState.resultRecorded) {
      runState.resultRecorded = true;
      StorageManager.recordRunResult(
        runState.score,
        meters,
        runState.tokensCollected,
        runState.crystalsCollected
      );
    }

    uiElements.goScore.textContent = `${runState.score} (${meters} м)`;
    uiElements.goBest.textContent = String(StorageManager.data.bestScore);
    uiElements.goTokens.textContent = `+${runState.tokensCollected} (всего: ${StorageManager.data.tokens})`;
    uiElements.goCrystals.textContent = `+${runState.crystalsCollected} (всего: ${StorageManager.data.crystals})`;

    setState(GAME_STATES.GAME_OVER);
  }

  function togglePause() {
    if (currentState === GAME_STATES.RUNNING) {
      setState(GAME_STATES.PAUSED);
    } else if (currentState === GAME_STATES.PAUSED) {
      lastFrameTime = performance.now();
      setState(GAME_STATES.RUNNING);
    }
  }

  function updateHudUI() {
    const meters = Math.floor(runState.distance);
    uiElements.hudScore.textContent = `${runState.score} (${meters} м)`;
    const liveBest = Math.max(StorageManager.data.bestScore, runState.score);
    uiElements.hudBest.textContent = String(liveBest);
    uiElements.hudTokens.textContent = String(runState.tokensCollected);
    uiElements.hudCrystals.textContent = String(runState.crystalsCollected);
  }

  /* ============================================================================
   * 10. РЕНДЕР МАГАЗИНА (6 СКАФАНДРОВ И 5 ПЛАНЕТ) И ТАБЛИЦЫ РЕКОРДОВ
   * ============================================================================ */
  function createSuitMiniPreviewSVG(suit) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '64');
    svg.setAttribute('height', '82');
    svg.setAttribute('viewBox', '0 0 68 86');

    const pack = document.createElementNS(svgNS, 'rect');
    pack.setAttribute('x', '14');
    pack.setAttribute('y', '28');
    pack.setAttribute('width', '40');
    pack.setAttribute('height', '30');
    pack.setAttribute('rx', '5');
    pack.setAttribute('fill', suit.cssSecondary);
    svg.appendChild(pack);

    const helmet = document.createElementNS(svgNS, 'rect');
    helmet.setAttribute('x', '19');
    helmet.setAttribute('y', '6');
    helmet.setAttribute('width', '30');
    helmet.setAttribute('height', '24');
    helmet.setAttribute('rx', '6');
    helmet.setAttribute('fill', suit.cssPrimary);
    svg.appendChild(helmet);

    const visor = document.createElementNS(svgNS, 'rect');
    visor.setAttribute('x', '23');
    visor.setAttribute('y', '11');
    visor.setAttribute('width', '22');
    visor.setAttribute('height', '13');
    visor.setAttribute('rx', '3');
    visor.setAttribute('fill', '#0f172a');
    svg.appendChild(visor);

    const torso = document.createElementNS(svgNS, 'rect');
    torso.setAttribute('x', '18');
    torso.setAttribute('y', '31');
    torso.setAttribute('width', '32');
    torso.setAttribute('height', '29');
    torso.setAttribute('rx', '4');
    torso.setAttribute('fill', suit.cssPrimary);
    svg.appendChild(torso);

    const chest = document.createElementNS(svgNS, 'rect');
    chest.setAttribute('x', '25');
    chest.setAttribute('y', '37');
    chest.setAttribute('width', '18');
    chest.setAttribute('height', '11');
    chest.setAttribute('rx', '2');
    chest.setAttribute('fill', suit.cssAccent);
    svg.appendChild(chest);

    const legL = document.createElementNS(svgNS, 'rect');
    legL.setAttribute('x', '20');
    legL.setAttribute('y', '60');
    legL.setAttribute('width', '11');
    legL.setAttribute('height', '20');
    legL.setAttribute('rx', '2');
    legL.setAttribute('fill', suit.cssPrimary);
    svg.appendChild(legL);

    const legR = document.createElementNS(svgNS, 'rect');
    legR.setAttribute('x', '37');
    legR.setAttribute('y', '60');
    legR.setAttribute('width', '11');
    legR.setAttribute('height', '20');
    legR.setAttribute('rx', '2');
    legR.setAttribute('fill', suit.cssPrimary);
    svg.appendChild(legR);

    return svg;
  }

  function createPlanetMiniPreviewSVG(planet) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '76');
    svg.setAttribute('height', '76');
    svg.setAttribute('viewBox', '0 0 80 80');

    if (planet.ringColor) {
      const ringBack = document.createElementNS(svgNS, 'ellipse');
      ringBack.setAttribute('cx', '40');
      ringBack.setAttribute('cy', '40');
      ringBack.setAttribute('rx', '34');
      ringBack.setAttribute('ry', '10');
      ringBack.setAttribute('fill', 'none');
      ringBack.setAttribute('stroke', planet.ringColor);
      ringBack.setAttribute('stroke-width', '4');
      ringBack.setAttribute('transform', 'rotate(-20 40 40)');
      svg.appendChild(ringBack);
    }

    const body = document.createElementNS(svgNS, 'circle');
    body.setAttribute('cx', '40');
    body.setAttribute('cy', '40');
    body.setAttribute('r', '19');
    body.setAttribute('fill', planet.bodyColor);
    svg.appendChild(body);

    const patch = document.createElementNS(svgNS, 'circle');
    patch.setAttribute('cx', '35');
    patch.setAttribute('cy', '35');
    patch.setAttribute('r', '9');
    patch.setAttribute('fill', planet.detailColor);
    patch.setAttribute('opacity', '0.75');
    svg.appendChild(patch);

    return svg;
  }

  function switchShopTab(tabName) {
    activeShopTab = tabName;
    if (tabName === 'suits') {
      uiElements.tabBtnSuits.classList.add('active');
      uiElements.tabBtnPlanets.classList.remove('active');
      uiElements.shopSuitsContainer.classList.remove('hidden');
      uiElements.shopPlanetsContainer.classList.add('hidden');
    } else {
      uiElements.tabBtnSuits.classList.remove('active');
      uiElements.tabBtnPlanets.classList.add('active');
      uiElements.shopSuitsContainer.classList.add('hidden');
      uiElements.shopPlanetsContainer.classList.remove('hidden');
    }
  }

  function renderShopUI() {
    uiElements.shopBalanceTokens.textContent = String(StorageManager.data.tokens);
    uiElements.shopBalanceCrystals.textContent = String(StorageManager.data.crystals);

    // 1. Отрисовка 6 скафандров
    uiElements.shopSuitsContainer.textContent = '';
    const suitKeys = Object.keys(SUITS_CATALOG);

    for (const key of suitKeys) {
      const suit = SUITS_CATALOG[key];
      const isOwned = StorageManager.data.ownedSuits.includes(suit.id);
      const isSelected = StorageManager.data.selectedSuit === suit.id;

      const card = document.createElement('div');
      card.className = 'suit-card' + (isSelected ? ' selected' : '');

      const previewWrap = document.createElement('div');
      previewWrap.className = 'suit-preview';
      previewWrap.appendChild(createSuitMiniPreviewSVG(suit));
      card.appendChild(previewWrap);

      const titleEl = document.createElement('div');
      titleEl.className = 'suit-name';
      titleEl.textContent = suit.name;
      card.appendChild(titleEl);

      const descEl = document.createElement('div');
      descEl.className = 'suit-desc';
      descEl.textContent = suit.description;
      card.appendChild(descEl);

      const costEl = document.createElement('div');
      costEl.className = 'suit-cost';
      costEl.textContent = suit.cost === 0 ? 'Бесплатно' : `${suit.cost} жетонов`;
      card.appendChild(costEl);

      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';

      if (isSelected) {
        actionBtn.className = 'btn btn-success';
        actionBtn.textContent = 'Выбран';
        actionBtn.disabled = true;
      } else if (isOwned) {
        actionBtn.className = 'btn btn-primary';
        actionBtn.textContent = 'Выбрать';
        actionBtn.addEventListener('click', () => {
          StorageManager.data.selectedSuit = suit.id;
          StorageManager.save();
          if (astronaut) astronaut.applySuit(suit.id);
          renderShopUI();
        });
      } else {
        const canAfford = StorageManager.data.tokens >= suit.cost;
        actionBtn.className = 'btn btn-gold';
        actionBtn.textContent = 'Купить';
        actionBtn.disabled = !canAfford;
        actionBtn.addEventListener('click', () => {
          if (
            StorageManager.data.ownedSuits.includes(suit.id) ||
            StorageManager.data.tokens < suit.cost
          ) {
            return;
          }
          StorageManager.data.tokens -= suit.cost;
          StorageManager.data.ownedSuits.push(suit.id);
          StorageManager.data.selectedSuit = suit.id;
          StorageManager.save();
          if (astronaut) astronaut.applySuit(suit.id);
          renderShopUI();
        });
      }

      card.appendChild(actionBtn);
      uiElements.shopSuitsContainer.appendChild(card);
    }

    // 2. Отрисовка 5 планет заднего фона
    uiElements.shopPlanetsContainer.textContent = '';
    const planetKeys = Object.keys(PLANETS_CATALOG);

    for (const key of planetKeys) {
      const planet = PLANETS_CATALOG[key];
      const isOwned = StorageManager.data.ownedPlanets.includes(planet.id);
      const isSelected = StorageManager.data.selectedPlanet === planet.id;

      const card = document.createElement('div');
      card.className = 'suit-card' + (isSelected ? ' selected' : '');

      const previewWrap = document.createElement('div');
      previewWrap.className = 'suit-preview';
      previewWrap.appendChild(createPlanetMiniPreviewSVG(planet));
      card.appendChild(previewWrap);

      const titleEl = document.createElement('div');
      titleEl.className = 'suit-name';
      titleEl.textContent = planet.name;
      card.appendChild(titleEl);

      const descEl = document.createElement('div');
      descEl.className = 'suit-desc';
      descEl.textContent = planet.description;
      card.appendChild(descEl);

      const costEl = document.createElement('div');
      costEl.className = 'suit-cost crystal-cost';
      costEl.textContent =
        planet.costCrystals === 0 ? 'По умолчанию' : `${planet.costCrystals} кристаллов`;
      card.appendChild(costEl);

      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';

      if (isSelected) {
        actionBtn.className = 'btn btn-success';
        actionBtn.textContent = 'На небосводе';
        actionBtn.disabled = true;
      } else if (isOwned) {
        actionBtn.className = 'btn btn-primary';
        actionBtn.textContent = 'Установить';
        actionBtn.addEventListener('click', () => {
          StorageManager.data.selectedPlanet = planet.id;
          StorageManager.save();
          applyBackgroundPlanet(planet.id);
          renderShopUI();
        });
      } else {
        const canAfford = StorageManager.data.crystals >= planet.costCrystals;
        actionBtn.className = 'btn btn-purple';
        actionBtn.textContent = 'Открыть';
        actionBtn.disabled = !canAfford;
        actionBtn.addEventListener('click', () => {
          if (
            StorageManager.data.ownedPlanets.includes(planet.id) ||
            StorageManager.data.crystals < planet.costCrystals
          ) {
            return;
          }
          StorageManager.data.crystals -= planet.costCrystals;
          StorageManager.data.ownedPlanets.push(planet.id);
          StorageManager.data.selectedPlanet = planet.id;
          StorageManager.save();
          applyBackgroundPlanet(planet.id);
          renderShopUI();
        });
      }

      card.appendChild(actionBtn);
      uiElements.shopPlanetsContainer.appendChild(card);
    }

    switchShopTab(activeShopTab);
  }

  function renderLeaderboardUI() {
    uiElements.lbAllTimeBest.textContent = String(StorageManager.data.bestScore);
    uiElements.lbTbody.textContent = '';

    const records = StorageManager.data.leaderboard;
    if (records.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 4;
      emptyCell.style.textAlign = 'center';
      emptyCell.style.padding = '24px';
      emptyCell.style.color = 'var(--text-muted)';
      emptyCell.textContent = 'Пока нет записанных забегов. Совершите свой первый полёт!';
      emptyRow.appendChild(emptyCell);
      uiElements.lbTbody.appendChild(emptyRow);
      return;
    }

    records.forEach((rec, index) => {
      const tr = document.createElement('tr');

      const tdRank = document.createElement('td');
      tdRank.className = 'rank-cell';
      tdRank.textContent = `#${index + 1}`;
      tr.appendChild(tdRank);

      const tdScore = document.createElement('td');
      tdScore.className = 'score-cell';
      tdScore.textContent = String(rec.score);
      tr.appendChild(tdScore);

      const tdDist = document.createElement('td');
      tdDist.className = 'dist-cell';
      tdDist.textContent = `${rec.distance} м`;
      tr.appendChild(tdDist);

      const tdDate = document.createElement('td');
      tdDate.className = 'date-cell';
      tdDate.textContent = rec.date;
      tr.appendChild(tdDate);

      uiElements.lbTbody.appendChild(tr);
    });
  }

  /* ============================================================================
   * 11. ОБРАБОТЧИКИ ВВОДА И СОБЫТИЙ ОКНА
   * ============================================================================ */
  function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      const gameKeys = [
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS'
      ];
      if (gameKeys.includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'Escape') {
        if (currentState === GAME_STATES.RUNNING || currentState === GAME_STATES.PAUSED) {
          if (!e.repeat) togglePause();
        }
        return;
      }

      if (currentState !== GAME_STATES.RUNNING) return;

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        if (e.repeat) return;
        if (runState.currentLaneIndex > 0) {
          runState.currentLaneIndex -= 1;
        }
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        if (e.repeat) return;
        if (runState.currentLaneIndex < 2) {
          runState.currentLaneIndex += 1;
        }
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') {
        if (e.repeat) return;
        if (!runState.isJumping && runState.playerY <= 0.001) {
          runState.isJumping = true;
          runState.velocityY = JUMP_INITIAL_VELOCITY;
        }
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        if (runState.isJumping && runState.playerY > 0.05) {
          runState.velocityY = Math.min(runState.velocityY, FAST_FALL_VELOCITY);
        }
      }
    }, { passive: false });

    window.addEventListener('blur', () => {
      if (currentState === GAME_STATES.RUNNING) {
        setState(GAME_STATES.PAUSED);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && currentState === GAME_STATES.RUNNING) {
        setState(GAME_STATES.PAUSED);
      }
    });

    window.addEventListener('resize', () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Кнопки навигации
    document.getElementById('btn-menu-play').addEventListener('click', startNewRun);

    document.getElementById('btn-menu-shop').addEventListener('click', () => {
      previousMenuState = GAME_STATES.MENU;
      setState(GAME_STATES.SHOP);
    });

    document.getElementById('btn-menu-leaderboard').addEventListener('click', () => {
      previousMenuState = GAME_STATES.MENU;
      setState(GAME_STATES.LEADERBOARD);
    });

    document.getElementById('btn-hud-pause').addEventListener('click', () => {
      if (currentState === GAME_STATES.RUNNING) {
        setState(GAME_STATES.PAUSED);
      }
    });

    document.getElementById('btn-pause-resume').addEventListener('click', () => {
      if (currentState === GAME_STATES.PAUSED) {
        lastFrameTime = performance.now();
        setState(GAME_STATES.RUNNING);
      }
    });

    document.getElementById('btn-pause-menu').addEventListener('click', () => {
      setState(GAME_STATES.MENU);
    });

    document.getElementById('btn-go-retry').addEventListener('click', startNewRun);

    document.getElementById('btn-go-shop').addEventListener('click', () => {
      previousMenuState = GAME_STATES.GAME_OVER;
      setState(GAME_STATES.SHOP);
    });

    document.getElementById('btn-go-menu').addEventListener('click', () => {
      setState(GAME_STATES.MENU);
    });

    document.getElementById('btn-shop-back').addEventListener('click', () => {
      setState(previousMenuState);
    });

    document.getElementById('btn-lb-back').addEventListener('click', () => {
      setState(previousMenuState);
    });

    // Переключение вкладок в магазине
    uiElements.tabBtnSuits.addEventListener('click', () => switchShopTab('suits'));
    uiElements.tabBtnPlanets.addEventListener('click', () => switchShopTab('planets'));
  }

  /* ============================================================================
   * 12. ИНИЦИАЛИЗАЦИЯ THREE.JS И ЕДИНЫЙ ИГРОВОЙ ЦИКЛ
   * ============================================================================ */
  function showFatalError(messageText) {
    hideAllScreens();
    const fatalScreen = document.getElementById('screen-fatal');
    const msgEl = document.getElementById('fatal-message');
    if (msgEl && messageText) {
      msgEl.textContent = messageText;
    }
    if (fatalScreen) {
      fatalScreen.classList.remove('hidden');
    }
  }

  function initThreeScene() {
    if (typeof window.THREE === 'undefined') {
      showFatalError(
        'Не удалось загрузить библиотеку Three.js с CDN. Проверьте подключение к интернету и обновите страницу.'
      );
      return false;
    }

    try {
      const container = document.getElementById('canvas-container');
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x03050a);
      scene.fog = new THREE.FogExp2(0x03050a, 0.0068);

      camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        320
      );
      camera.position.set(0, 3.85, 6.6);
      camera.lookAt(0, 1.35, -14);

      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);

      const ambientLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.68);
      scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight(0xf8fafc, 1.05);
      sunLight.position.set(22, 38, 18);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 5;
      sunLight.shadow.camera.far = 140;
      sunLight.shadow.camera.left = -16;
      sunLight.shadow.camera.right = 16;
      sunLight.shadow.camera.top = 18;
      sunLight.shadow.camera.bottom = -85;
      scene.add(sunLight);

      initSharedMaterials();
      createStarfield();

      terrainChunks = [];
      for (let i = 0; i < CHUNK_COUNT; i++) {
        const zOffset = -i * CHUNK_LENGTH;
        terrainChunks.push(createTerrainChunk(zOffset));
      }

      astronaut = createAstronautModel();
      astronaut.applySuit(StorageManager.data.selectedSuit);
      scene.add(astronaut.root);

      return true;
    } catch (err) {
      showFatalError(
        'Не удалось инициализировать WebGL-контекст. Убедитесь, что ваш браузер и видеокарта поддерживают WebGL.'
      );
      return false;
    }
  }

  function mainLoop(now) {
    requestAnimationFrame(mainLoop);

    const rawDt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    if (currentState === GAME_STATES.RUNNING) {
      updateGameplay(dt);
    } else if (
      currentState === GAME_STATES.MENU ||
      currentState === GAME_STATES.SHOP ||
      currentState === GAME_STATES.LEADERBOARD
    ) {
      updateIdleScene(dt);
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  /* ============================================================================
   * 13. ЗАПУСК ПРИЛОЖЕНИЯ
   * ============================================================================ */
  function bootstrap() {
    StorageManager.init();
    const ok = initThreeScene();
    if (!ok) return;

    setupEventListeners();
    setState(GAME_STATES.MENU);
    lastFrameTime = performance.now();
    requestAnimationFrame(mainLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();