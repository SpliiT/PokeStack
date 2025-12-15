// Fonction qui génère un nombre aléatoire
const aleatoire = () => {
  return function () {
    return Math.random();
  };
};

// Initialisation du générateur de nombres aléatoires
const rand = aleatoire();

// Importation des modules Matter.js
const {
  Engine,
  Render,
  Runner,
  Composites,
  Common,
  MouseConstraint,
  Mouse,
  Composite,
  Bodies,
  Events,
} = Matter;

// Paramètres pour le jeu
const wallPad = 64;
const loseHeight = 84;
const statusBarHeight = 48;
const previewBallHeight = 32;
const friction = {
  friction: 0.006,
  frictionStatic: 0.006,
  frictionAir: 0,
  restitution: 0.1,
};

// États possibles du jeu
const GameStates = {
  MENU: 0,
  READY: 1,
  DROP: 2,
  LOSE: 3,
};

// Objet principal du jeu
const Game = {
  width: 640,
  height: 960,
  elements: {
    canvas: document.getElementById("game-canvas"),
    ui: document.getElementById("game-ui"),
    score: document.getElementById("game-score"),
    end: document.getElementById("game-end-container"),
    endTitle: document.getElementById("game-end-title"),
    statusValue: document.getElementById("game-highscore-value"),
    nextballImg: document.getElementById("game-next-ball"),
    previewBall: null,
    usernameModal: document.getElementById("username-modal"),
    usernameInput: document.getElementById("username-input"),
    usernameSubmit: document.getElementById("username-submit"),
    usernameError: document.getElementById("username-error"),
    modalTitle: document.getElementById("modal-title"),
    modalSubtitle: document.getElementById("modal-subtitle"),
    leaderboardContainer: document.getElementById("leaderboard-container"),
    leaderboardList: document.getElementById("leaderboard-list"),
    leaderboardBtn: document.getElementById("leaderboard-btn"),
    closeLeaderboard: document.getElementById("close-leaderboard"),
    viewLeaderboardBtn: document.getElementById("view-leaderboard-btn"),
    playerName: document.getElementById("player-name"),
    finalScore: document.getElementById("final-score"),
    gameEndMessage: document.getElementById("game-end-message"),
    userRank: document.getElementById("user-rank"),
  },
  cache: { 
    highscore: 0, 
    username: "",
    gamesPlayed: 0,
    leaderboard: []
  },
  sounds: {
    click: new Audio("/assets/click.mp3"),
    pop0: new Audio("/assets/pop0.mp3"),
    pop1: new Audio("/assets/pop1.mp3"),
    pop2: new Audio("/assets/pop2.mp3"),
    pop3: new Audio("/assets/pop3.mp3"),
    pop4: new Audio("/assets/pop4.mp3"),
    pop5: new Audio("/assets/pop5.mp3"),
    pop6: new Audio("/assets/pop6.mp3"),
    pop7: new Audio("/assets/pop7.mp3"),
    pop8: new Audio("/assets/pop8.mp3"),
    pop9: new Audio("/assets/pop9.mp3"),
    pop10: new Audio("/assets/pop10.mp3"),
  },

  stateIndex: GameStates.MENU,

  score: 0,
  ballsMerged: [],
  // Fonction pour calculer le score en fonction des balls fusionnés
  calculateScore: function () {
    const score = Game.ballsMerged.reduce((total, count, sizeIndex) => {
      const value = Game.ballSizes[sizeIndex].scoreValue * count;
      return total + value;
    }, 0);

    Game.score = score;
    Game.elements.score.innerText = Game.score;
  },

  // Tableau des tailles de balls avec leurs propriétés
  ballSizes: [
    { radius: 24, scoreValue: 1, img: "./assets/img/circle0.png" },
    { radius: 32, scoreValue: 3, img: "./assets/img/circle1.png" },
    { radius: 40, scoreValue: 6, img: "./assets/img/circle2.png" },
    { radius: 56, scoreValue: 10, img: "./assets/img/circle3.png" },
    { radius: 64, scoreValue: 15, img: "./assets/img/circle4.png" },
    { radius: 72, scoreValue: 21, img: "./assets/img/circle5.png" },
    { radius: 84, scoreValue: 28, img: "./assets/img/circle6.png" },
    { radius: 96, scoreValue: 36, img: "./assets/img/circle7.png" },
    { radius: 128, scoreValue: 45, img: "./assets/img/circle8.png" },
    { radius: 160, scoreValue: 55, img: "./assets/img/circle9.png" },
    { radius: 192, scoreValue: 66, img: "./assets/img/circle10.png" },
    { radius: 224, scoreValue: 78, img: "./assets/img/circle11.png" },
  ],
  currentballSize: 0,
  nextballSize: 0,
  // Fonction pour définir la taille du prochain ball
  setNextballSize: function () {
    Game.nextballSize = Math.floor(rand() * 5);
    Game.elements.nextballImg.src = `./assets/img/circle${Game.nextballSize}.png`;
  },

  // ===== GESTION DU PROFIL UTILISATEUR =====
  getUserProfile: function () {
    const profile = localStorage.getItem("pokestack-profile");
    if (profile === null) {
      return null;
    }
    return JSON.parse(profile);
  },

  saveUserProfile: function () {
    localStorage.setItem("pokestack-profile", JSON.stringify(Game.cache));
  },

  setUsername: function (username) {
    Game.cache.username = username.trim();
    Game.elements.playerName.innerText = Game.cache.username;
    Game.saveUserProfile();
  },

  getUsername: function () {
    return Game.cache.username || "Joueur";
  },

  showUsernameModal: function (isNewRecord = false) {
    if (isNewRecord) {
      Game.elements.modalTitle.innerText = "🎉 Nouveau Record! 🎉";
      Game.elements.modalSubtitle.innerText = "Tu as battu ton record! Entre ton pseudo:";
    } else {
      Game.elements.modalTitle.innerText = "Bienvenue sur PokeStack! 🏆";
      Game.elements.modalSubtitle.innerText = "Entre ton pseudo pour commencer";
    }
    Game.elements.usernameModal.style.display = "flex";
    Game.elements.usernameInput.value = Game.cache.username || "";
    Game.elements.usernameInput.focus();
  },

  hideUsernameModal: function () {
    Game.elements.usernameModal.style.display = "none";
    Game.elements.usernameError.innerText = "";
  },

  // ===== GESTION DU LEADERBOARD =====
  updateLeaderboard: function (score, username) {
    const entry = {
      username: username,
      score: score,
      date: new Date().toISOString().split('T')[0]
    };

    // Ajouter l'entrée
    Game.cache.leaderboard.push(entry);

    // Trier par score décroissant
    Game.cache.leaderboard.sort((a, b) => b.score - a.score);

    // Garder seulement le top 10
    Game.cache.leaderboard = Game.cache.leaderboard.slice(0, 10);

    Game.saveUserProfile();
  },

  isTopScore: function (score) {
    if (Game.cache.leaderboard.length < 10) return true;
    return score > Game.cache.leaderboard[9].score;
  },

  getUserRank: function () {
    const username = Game.getUsername();
    const rank = Game.cache.leaderboard.findIndex(entry => 
      entry.username === username && entry.score === Game.cache.highscore
    );
    return rank >= 0 ? rank + 1 : null;
  },

  displayLeaderboard: function () {
    const leaderboard = Game.cache.leaderboard;
    const currentUser = Game.getUsername();
    
    if (leaderboard.length === 0) {
      Game.elements.leaderboardList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #718096; font-size: 18px;">
          Aucun score enregistré<br>Sois le premier! 🚀
        </div>
      `;
      Game.elements.userRank.innerText = "";
      return;
    }

    let html = "";
    leaderboard.forEach((entry, index) => {
      const rank = index + 1;
      const isCurrentUser = entry.username === currentUser && entry.score === Game.cache.highscore;
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
      
      let classes = "leaderboard-entry";
      if (isCurrentUser) classes += " current-user";
      else if (rank === 1) classes += " top-1";
      else if (rank === 2) classes += " top-2";
      else if (rank === 3) classes += " top-3";

      html += `
        <div class="${classes}">
          <div class="leaderboard-rank">${medal}</div>
          <div class="leaderboard-name">${entry.username}${isCurrentUser ? ' (Toi)' : ''}</div>
          <div class="leaderboard-score">${entry.score}</div>
        </div>
      `;
    });

    Game.elements.leaderboardList.innerHTML = html;

    // Afficher le rang de l'utilisateur
    const userRank = Game.getUserRank();
    if (userRank) {
      Game.elements.userRank.innerText = `Tu es ${userRank}${userRank === 1 ? 'er' : 'ème'} au classement! 🎯`;
    } else {
      Game.elements.userRank.innerText = "Continue pour entrer dans le top 10!";
    }
  },

  showLeaderboard: function () {
    Game.displayLeaderboard();
    Game.elements.leaderboardContainer.style.display = "flex";
  },

  hideLeaderboard: function () {
    Game.elements.leaderboardContainer.style.display = "none";
  },

  // Afficher le score le plus élevé
  showHighscore: function () {
    Game.elements.statusValue.innerText = Game.cache.highscore;
  },

  // Charger le profil et les données
  loadHighscore: function () {
    const profile = Game.getUserProfile();
    if (profile === null) {
      // Nouveau joueur - afficher la modal de pseudo
      Game.showUsernameModal(false);
      return;
    }

    Game.cache = profile;
    Game.showHighscore();
    Game.elements.playerName.innerText = Game.getUsername();
  },

  // Sauvegarder le score et mettre à jour le leaderboard
  saveHighscore: function () {
    Game.calculateScore();
    const isNewPersonalRecord = Game.score > Game.cache.highscore;
    const isTopTenScore = Game.isTopScore(Game.score);

    if (isNewPersonalRecord) {
      Game.cache.highscore = Game.score;
      Game.showHighscore();
      Game.elements.endTitle.innerText = "🎉 Nouveau Record! 🎉";
      Game.elements.gameEndMessage.innerText = "Tu as battu ton record personnel!";
    } else {
      Game.elements.endTitle.innerText = "Game Over!";
      Game.elements.gameEndMessage.innerText = "";
    }

    // Incrémenter le nombre de parties
    Game.cache.gamesPlayed = (Game.cache.gamesPlayed || 0) + 1;

    // Mettre à jour le leaderboard si c'est un top score
    if (isTopTenScore) {
      Game.updateLeaderboard(Game.score, Game.getUsername());
    }

    // Afficher le score final
    Game.elements.finalScore.innerText = Game.score;

    Game.saveUserProfile();
  },

  // Initialiser le jeu
  initGame: function () {
    Game.preloadImages().then(() => {
      Render.run(render);
      Runner.run(runner, engine);

      Composite.add(engine.world, menuStatics);

      Game.loadHighscore();
      Game.elements.ui.style.display = "none";
      Game.ballsMerged = Array.apply(null, Array(Game.ballSizes.length)).map(
        () => 0
      );

      const menuMouseDown = function () {
        if (
          mouseConstraint.body === null ||
          mouseConstraint.body?.label !== "btn-start"
        ) {
          return;
        }

        Events.off(mouseConstraint, "mousedown", menuMouseDown);
        Game.startGame();
      };

      Events.on(mouseConstraint, "mousedown", menuMouseDown);
    });
  },

  // Démarrer le jeu
  startGame: function () {
    Game.sounds.click.play();

    Composite.remove(engine.world, menuStatics);
    Composite.add(engine.world, gameStatics);

    Game.calculateScore();
    Game.elements.endTitle.innerText = "Partie terminée !";
    Game.elements.ui.style.display = "block";
    Game.elements.end.style.display = "none";
    Game.elements.previewBall = Game.generateballBody(
      Game.width / 2,
      previewBallHeight,
      0,
      { isStatic: true }
    );
    Composite.add(engine.world, Game.elements.previewBall);

    setTimeout(() => {
      Game.stateIndex = GameStates.READY;
    }, 250);

    Events.on(mouseConstraint, "mouseup", function (e) {
      Game.addball(e.mouse.position.x);
    });

    Events.on(mouseConstraint, "mousemove", function (e) {
      if (Game.stateIndex !== GameStates.READY) return;
      if (Game.elements.previewBall === null) return;

      Game.elements.previewBall.position.x = e.mouse.position.x;
    });

    // Ajouter un ensemble pour suivre les balles qui ont franchi la barre
    let ballsBelowBar = new Set();

    Events.on(engine, "collisionStart", function (e) {
      for (let i = 0; i < e.pairs.length; i++) {
        const { bodyA, bodyB } = e.pairs[i];

        // Ignorer si la collision est avec le mur
        if (bodyA.isStatic || bodyB.isStatic) continue;

        const aY = bodyA.position.y + bodyA.circleRadius;
        const bY = bodyB.position.y + bodyB.circleRadius;

        // Vérifier si une balle a franchi la barre
        if (aY < loseHeight || bY < loseHeight) {
          // Ajouter la balle à l'ensemble des balles qui ont franchi la barre
          ballsBelowBar.add(bodyA);
          ballsBelowBar.add(bodyB);

          // Déclencher la vérification de la défaite après un délai
          setTimeout(() => {
            if (ballsBelowBar.has(bodyA) || ballsBelowBar.has(bodyB)) {
              Game.loseGame();
            }
          }, 1000); // Délai de 3 secondes
        }

        // Ignorer si les tailles sont différentes
        if (bodyA.sizeIndex !== bodyB.sizeIndex) continue;

        // Ignorer si déjà éclaté
        if (bodyA.popped || bodyB.popped) continue;

        let newSize = bodyA.sizeIndex + 1;

        // Retour à la plus petite taille
        if (
          bodyA.circleRadius >= Game.ballSizes[Game.ballSizes.length - 1].radius
        ) {
          newSize = 0;
        }

        Game.ballsMerged[bodyA.sizeIndex] += 1;

        // Les cercles ont la même taille, alors on les fusionne
        const midPosX = (bodyA.position.x + bodyB.position.x) / 2;
        const midPosY = (bodyA.position.y + bodyB.position.y) / 2;

        bodyA.popped = true;
        bodyB.popped = true;

        Game.sounds[`pop${bodyA.sizeIndex}`].play();
        Composite.remove(engine.world, [bodyA, bodyB]);
        Composite.add(
          engine.world,
          Game.generateballBody(midPosX, midPosY, newSize)
        );
        Game.addPop(midPosX, midPosY, bodyA.circleRadius);
        Game.calculateScore();

        // Supprimer les balles de l'ensemble si elles ont fusionné
        ballsBelowBar.delete(bodyA);
        ballsBelowBar.delete(bodyB);
      }
    });
  },

  // Ajouter une explosion visuelle à l'éclatement d'un ball
  addPop: function (x, y, r) {
    const circle = Bodies.circle(x, y, r, {
      isStatic: true,
      collisionFilter: { mask: 0x0040 },
      angle: rand() * (Math.PI * 2),
      render: {
        sprite: {
          texture: "./assets/img/pop.png",
          xScale: r / 384,
          yScale: r / 384,
        },
      },
    });

    Composite.add(engine.world, circle);
    setTimeout(() => {
      Composite.remove(engine.world, circle);
    }, 100);
  },

  // Fonction appelée en cas de défaite
  loseGame: function () {
    Game.stateIndex = GameStates.LOSE;
    Game.elements.end.style.display = "flex";
    runner.enabled = false;
    Game.saveHighscore();

    // Réinitialiser l'ensemble des balles qui ont franchi la barre
    ballsBelowBar.clear();
  },

  // Trouver l'indice d'un ball en fonction de son rayon
  lookupballIndex: function (radius) {
    const sizeIndex = Game.ballSizes.findIndex((size) => size.radius == radius);
    if (sizeIndex === undefined) return null;
    if (sizeIndex === Game.ballSizes.length - 1) return null;

    return sizeIndex;
  },

  // Générer le corps d'un ball avec ses propriétés
  generateballBody: function (x, y, sizeIndex, extraConfig = {}) {
    const size = Game.ballSizes[sizeIndex];
    const circle = Bodies.circle(x, y, size.radius, {
      ...friction,
      ...extraConfig,
      render: {
        sprite: {
          texture: size.img,
          xScale: size.radius / 512,
          yScale: size.radius / 512,
        },
      },
    });
    circle.sizeIndex = sizeIndex;
    circle.popped = false;

    return circle;
  },

  // Ajouter un ball au jeu
  addball: function (x) {
    if (Game.stateIndex !== GameStates.READY) return;

    Game.sounds.click.play();

    Game.stateIndex = GameStates.DROP;
    const latestball = Game.generateballBody(
      x,
      previewBallHeight,
      Game.currentballSize
    );
    Composite.add(engine.world, latestball);

    Game.currentballSize = Game.nextballSize;
    Game.setNextballSize();
    Game.calculateScore();

    Composite.remove(engine.world, Game.elements.previewBall);
    Game.elements.previewBall = Game.generateballBody(
      render.mouse.position.x,
      previewBallHeight,
      Game.currentballSize,
      {
        isStatic: true,
        collisionFilter: { mask: 0x0040 },
      }
    );

    setTimeout(() => {
      if (Game.stateIndex === GameStates.DROP) {
        Composite.add(engine.world, Game.elements.previewBall);
        Game.stateIndex = GameStates.READY;
      }
    }, 500);
  },

  // Fonction pour précharger toutes les images
  preloadImages: function () {
    const images = [
      "./assets/img/bg-menu.png",
      "./assets/img/btn-start.png",
      "./assets/img/pop.png",
      ...Game.ballSizes.map((size) => size.img),
    ];

    const promises = images.map((src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = reject;
      });
    });

    return Promise.all(promises);
  },
};

// Initialisation du moteur, du runner et du rendu
const engine = Engine.create();
const runner = Runner.create();
const render = Render.create({
  element: Game.elements.canvas,
  engine,
  options: {
    width: Game.width,
    height: Game.height,
    wireframes: false,
    background: "#FFCC01",
  },
});

// Statiques du menu
const menuStatics = [
  Bodies.rectangle(Game.width / 2, Game.height * 0.4, 512, 512, {
    isStatic: true,
    render: { sprite: { texture: "./assets/img/bg-menu.png" } },
  }),

  // Ajout des pokeball dans des cercles
  Array.apply(null, Array(Game.ballSizes.length)).map((_, index) => {
    const x = Game.width / 2 + 192 * Math.cos((Math.PI * 2 * index) / 12);
    const y = Game.height * 0.4 + 192 * Math.sin((Math.PI * 2 * index) / 12);
    const r = 64;

    return Bodies.circle(x, y, r, {
      isStatic: true,
      render: {
        sprite: {
          texture: `./assets/img/circle${index}.png`,
          xScale: r / 1024,
          yScale: r / 1024,
        },
      },
    });
  }),

  Bodies.rectangle(Game.width / 2, Game.height * 0.75, 512, 96, {
    isStatic: true,
    label: "btn-start",
    render: { sprite: { texture: "./assets/img/btn-start.png" } },
  }),
];

// Propriétés des murs
const wallProps = {
  isStatic: true,
  render: { fillStyle: "#FFEEDB" },
  friction,
};

// Statiques du jeu
const gameStatics = [
  // Gauche
  Bodies.rectangle(
    -(wallPad / 2),
    Game.height / 2,
    wallPad,
    Game.height,
    wallProps
  ),

  // Droite
  Bodies.rectangle(
    Game.width + wallPad / 2,
    Game.height / 2,
    wallPad,
    Game.height,
    wallProps
  ),

  // Bas
  Bodies.rectangle(
    Game.width / 2,
    Game.height + wallPad / 2 - statusBarHeight,
    Game.width,
    wallPad,
    wallProps
  ),
];

// Ajouter le contrôle de la souris
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: {
    stiffness: 0.2,
    render: {
      visible: false,
    },
  },
});
render.mouse = mouse;

// Initialiser le jeu
Game.initGame();

// Redimensionner le canvas en fonction de la taille de l'écran
const resizeCanvas = () => {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  const aspectRatio = Game.width / Game.height;

  let newWidth = screenWidth;
  let newHeight = screenHeight;

  if (screenWidth / screenHeight > aspectRatio) {
    newWidth = screenHeight * aspectRatio;
  } else {
    newHeight = screenWidth / aspectRatio;
  }

  render.canvas.style.width = `${newWidth}px`;
  render.canvas.style.height = `${newHeight}px`;

  const scaleUI = newWidth / Game.width;
  Game.elements.ui.style.width = `${Game.width}px`;
  Game.elements.ui.style.height = `${Game.height}px`;
  Game.elements.ui.style.transform = `scale(${scaleUI})`;

  // Ajoutez une animation pour le redimensionnement
  Game.elements.ui.style.transition = "transform 0.3s ease";
};

// Appeler la fonction de redimensionnement lors du chargement et du redimensionnement de la page
window.addEventListener("resize", resizeCanvas);
document.addEventListener("DOMContentLoaded", resizeCanvas);

// ===== EVENT LISTENERS POUR LE LEADERBOARD ET USERNAME =====

// Soumission du pseudo (bouton)
Game.elements.usernameSubmit.addEventListener("click", function () {
  const username = Game.elements.usernameInput.value.trim();
  
  if (username.length === 0) {
    Game.elements.usernameError.innerText = "Entre un pseudo!";
    return;
  }
  
  if (username.length < 2) {
    Game.elements.usernameError.innerText = "Minimum 2 caractères";
    return;
  }
  
  Game.setUsername(username);
  Game.hideUsernameModal();
  
  // Si c'est la première fois, initialiser le highscore
  if (Game.cache.highscore === 0) {
    Game.saveUserProfile();
  }
});

// Soumission du pseudo (touche Entrée)
Game.elements.usernameInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    Game.elements.usernameSubmit.click();
  }
});

// Ouvrir le leaderboard (bouton dans le jeu)
Game.elements.leaderboardBtn.addEventListener("click", function () {
  Game.showLeaderboard();
});

// Ouvrir le leaderboard (bouton dans game over)
Game.elements.viewLeaderboardBtn.addEventListener("click", function () {
  Game.showLeaderboard();
});

// Fermer le leaderboard
Game.elements.closeLeaderboard.addEventListener("click", function () {
  Game.hideLeaderboard();
});

// Fermer le leaderboard en cliquant sur le fond
Game.elements.leaderboardContainer.addEventListener("click", function (e) {
  if (e.target === Game.elements.leaderboardContainer) {
    Game.hideLeaderboard();
  }
});
