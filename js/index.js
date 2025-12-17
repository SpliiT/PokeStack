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
  frictionAir: 0.001,  // Réduit de 0 à 0.001 pour ralentir légèrement en l'air
  restitution: 0.1,
};

// Ensemble pour suivre les balles qui ont franchi la barre (global)
let ballsBelowBar = new Set();

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
  originalWidth: 640,
  originalHeight: 960,
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
    const newScore = Game.ballsMerged.reduce((total, count, sizeIndex) => {
      const value = Game.ballSizes[sizeIndex].scoreValue * count;
      return total + value;
    }, 0);

    // Animate score counter
    if (newScore !== Game.score) {
      Game.animateScore(Game.score, newScore);
    }
    Game.score = newScore;
  },

  // Animate score with smooth counter
  animateScore: function (oldScore, newScore) {
    const duration = 500; // ms
    const steps = 30;
    const increment = (newScore - oldScore) / steps;
    let currentStep = 0;

    // Add pop animation
    Game.elements.score.style.animation = 'none';
    setTimeout(() => {
      Game.elements.score.style.animation = '';
    }, 10);

    const interval = setInterval(() => {
      currentStep++;
      const displayScore = Math.round(oldScore + increment * currentStep);
      Game.elements.score.innerText = displayScore;

      if (currentStep >= steps) {
        clearInterval(interval);
        Game.elements.score.innerText = newScore;
      }
    }, duration / steps);
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
    // On ne sauvegarde que le username et highscore en local
    //Le leaderboard est maintenant global via Firebase
    const localData = {
      username: Game.cache.username,
      highscore: Game.cache.highscore,
      gamesPlayed: Game.cache.gamesPlayed
    };
    localStorage.setItem("pokestack-profile", JSON.stringify(localData));
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

  // ===== GESTION DU LEADERBOARD FIREBASE =====
  
  // Sauvegarder un score dans Firebase
  saveScoreToFirebase: async function (username, score) {
    try {
      const scoreData = {
        username: username,
        score: score,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
      };
      
      // Créer une nouvelle entrée avec ID unique
      await database.ref('leaderboard').push(scoreData);
      console.log('✅ Score sauvegardé dans Firebase:', scoreData);
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde Firebase:', error);
    }
  },

  // Charger le leaderboard depuis Firebase
  loadLeaderboardFromFirebase: async function () {
    try {
      const snapshot = await database.ref('leaderboard')
        .orderByChild('score')
        .limitToLast(100) // Charger top 100
        .once('value');
      
      const scores = [];
      snapshot.forEach((childSnapshot) => {
        scores.push(childSnapshot.val());
      });
      
      // Trier par score décroissant
      scores.sort((a, b) => b.score - a.score);
      
      // Garder seulement le top 10 pour affichage
      return scores.slice(0, 10);
    } catch (error) {
      console.error('❌ Erreur lors du chargement Firebase:', error);
      return [];
    }
  },

  // Obtenir le rang d'un utilisateur dans Firebase
  getUserRankFromFirebase: async function (username) {
    try {
      const snapshot = await database.ref('leaderboard')
        .orderByChild('score')
        .once('value');
      
      const scores = [];
      snapshot.forEach((childSnapshot) => {
        scores.push(childSnapshot.val());
      });
      
      // Trier par score décroissant
      scores.sort((a, b) => b.score - a.score);
      
      // Trouver la meilleure position de l'utilisateur
      const userBestScore = Math.max(...scores.filter(s => s.username === username).map(s => s.score), 0);
      const rank = scores.findIndex(entry => entry.username === username && entry.score === userBestScore);
      
      return rank >= 0 ? rank + 1 : null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du rang:', error);
      return null;
    }
  },

  // Vérifier si le score mérite d'être dans le top (pour Firebase)
  isTopScore: function (score) {
    // Avec Firebase, on sauve tous les scores
    // Pas besoin de vérifier si top 10 avant de sauvegarder
    return true;
  },

  displayLeaderboard: async function () {
    const currentUser = Game.getUsername();
    
    // Afficher un loader pendant le chargement
    Game.elements.leaderboardList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #718096; font-size: 18px;">
        Chargement... 🎮
      </div>
    `;
    
    // Charger depuis Firebase
    const leaderboard = await Game.loadLeaderboardFromFirebase();
    
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
      const isCurrentUser = entry.username === currentUser;
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

    // Obtenir le rang de l'utilisateur depuis Firebase
    const userRank = await Game.getUserRankFromFirebase(currentUser);
    if (userRank && userRank <= 100) {
      Game.elements.userRank.innerText = `Tu es ${userRank}${userRank === 1 ? 'er' : 'ème'} au classement global! 🎯`;
    } else {
      Game.elements.userRank.innerText = "Continue pour entrer dans le top 100!";
    }
  },

  showLeaderboard: function () {
    Game.displayLeaderboard();
    Game.elements.leaderboardContainer.style.display = "flex";
  },

  // showLeaderboard: DÉSACTIVÉ - Maintenant géré par MenuManager dans menu.js
  /* 
  showLeaderboard: function () {
    Game.elements.leaderboardContainer.style.display = "flex";

    // Fetch leaderboard from Firebase
    fetch(
      `https://us-central1-suika-game-c549f.cloudfunctions.net/getLeaderboard`
    )
      .then((response) => response.json())
      .then((data) => {
        const leaderboard = data.leaderboard;
        Game.cache.leaderboard = leaderboard;

        // Display leaderboard
        let html = "";
        const currentUser = localStorage.getItem("playerName");
        for (let i = 0; i < leaderboard.length; i++) {
          const entry = leaderboard[i];
          const isCurrentUser = entry.name === currentUser;
          let classes = "leaderboard-entry";
          if (isCurrentUser) classes += " current-user";
          else if (i === 0) classes += " top-1";
          else if (i === 1) classes += " top-2";
          else if (i === 2) classes += " top-3";

          html += `
            <div class="${classes}">
              <div class="leaderboard-rank">${i + 1}</div>
              <div class="leaderboard-name">${entry.name}${isCurrentUser ? ' (You)' : ''}</div>
              <div class="leaderboard-score">${entry.score}</div>
            </div>
          `;
        }
        Game.elements.leaderboardList.innerHTML = html;
      })
      .catch((error) => {
        console.error("Error fetching leaderboard:", error);
        Game.elements.leaderboardList.innerHTML =
          "<p>Error loading leaderboard.</p>";
      });
  },
  */

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

    // Charger uniquement les données locales (pas de leaderboard, c'est Firebase maintenant)
    Game.cache = {
      username: profile.username || "",
      highscore: profile.highscore || 0,
      gamesPlayed: profile.gamesPlayed || 0,
      leaderboard: [] // Pas utilisé avec Firebase
    };
    Game.showHighscore();
    Game.elements.playerName.innerText = Game.getUsername();
  },

  // Sauvegarder le score et mettre à jour le leaderboard
  saveHighscore: function () {
    Game.calculateScore();
    const isNewPersonalRecord = Game.score > Game.cache.highscore;

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

    // Sauvegarder le score dans Firebase (leaderboard global)
    Game.saveScoreToFirebase(Game.getUsername(), Game.score);

    // Afficher le score final
    Game.elements.finalScore.innerText = Game.score;

    // Sauvegarder le profil local (username + highscore)
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

      // Le texte START sera créé après le modal username

      const menuMouseDown = function () {
        if (
          mouseConstraint.body === null ||
          mouseConstraint.body?.label !== "btn-start"
        ) {
          return;
        }

        // Effet press sur le bouton
        Game.pressStartButton();

        Events.off(mouseConstraint, "mousedown", menuMouseDown);
        setTimeout(() => {
          Game.startGame();
        }, 150); // Délai pour l'animation press
      };

      Events.on(mouseConstraint, "mousedown", menuMouseDown);
    });
  },

  // Créer le texte START en overlay
  createStartButtonText: function () {
    const startText = document.createElement('div');
    startText.id = 'start-button-text';
    startText.innerText = 'START';
    startText.style.cssText = `
      position: absolute;
      font-family: 'Pokemon', sans-serif;
      font-size: 3rem;
      font-weight: 900;
      color: #FB1B1B;
      text-shadow: 
        -3px -3px 0 #2A75BB,
        3px -3px 0 #2A75BB,
        -3px 3px 0 #2A75BB,
        3px 3px 0 #2A75BB;
      pointer-events: none;
      z-index: 100;
      transition: transform 0.1s ease;
    `;
    
    // Positionner le texte au centre du bouton
    const updateTextPosition = () => {
      const btnBody = menuStatics.find(item => item.label === 'btn-start');
      if (btnBody) {
        const canvasRect = render.canvas.getBoundingClientRect();
        const scaleUI = canvasRect.width / Game.width;
        
        startText.style.left = `${btnBody.position.x * scaleUI - 70}px`;
        startText.style.top = `${btnBody.position.y * scaleUI - 30}px`;
      }
    };
    
    Game.elements.canvas.appendChild(startText);
    updateTextPosition();
    
    // Mettre à jour la position lors du resize
    window.addEventListener('resize', updateTextPosition);
    
    Game.elements.startText = startText;
  },

  // Effet press sur le bouton START
  pressStartButton: function () {
    if (Game.elements.startText) {
      Game.elements.startText.style.transform = 'scale(0.95) translateY(3px)';
      setTimeout(() => {
        if (Game.elements.startText) {
          Game.elements.startText.style.transform = 'scale(1) translateY(0)';
        }
      }, 100);
    }
  },

  // Démarrer le jeu
  startGame: function () {
    Game.sounds.click.play();

    // Supprimer le texte START
    if (Game.elements.startText) {
      Game.elements.startText.remove();
      Game.elements.startText = null;
    }

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

    // Réinitialiser l'ensemble des balles au démarrage
    ballsBelowBar.clear();

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

    // Ajouter des particules colorées
    Game.createParticles(x, y, r);
  },

  // Système de particules pour les fusions
  createParticles: function (x, y, ballRadius) {
    const particleCount = 10;
    const colors = ['#FFCB05', '#FB1B1B', '#2A75BB', '#FFD700', '#FF6B6B'];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = 3 + rand() * 2;
      const particleRadius = 4 + rand() * 4;
      const color = colors[Math.floor(rand() * colors.length)];
      
      const particle = Bodies.circle(x, y, particleRadius, {
        isStatic: false,
        collisionFilter: { mask: 0x0040 }, // Ne pas collider avec les autres objets
        render: {
          fillStyle: color,
        },
        friction: 0.01,
        frictionAir: 0.03,
        restitution: 0.5,
      });
      
      // Appliquer une vélocité radiale
      Matter.Body.setVelocity(particle, {
        x: Math.cos(angle) * velocity,
        y: Math.sin(angle) * velocity,
      });
      
      Composite.add(engine.world, particle);
      
      // Supprimer la particule après 600ms
      setTimeout(() => {
        Composite.remove(engine.world, particle);
      }, 600);
    }
  },

  // Fonction appelée en cas de défaite
  loseGame: function () {
    Game.stateIndex = GameStates.LOSE;
    
    // Shake animation on game canvas
    const canvas = document.querySelector('#game-canvas');
    canvas.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
      canvas.style.animation = '';
    }, 500);
    
    Game.elements.end.style.display = "flex";
    runner.enabled = false;
    Game.saveHighscore();

    // Réinitialiser l'ensemble des balles qui ont franchi la barre
    ballsBelowBar.clear();
  },

  // Redémarrer le jeu sans recharger la page
  restartGame: function () {
    // Cacher le modal de game over
    Game.elements.end.style.display = "none";
    
    // Supprimer toutes les balles du canvas
    const allBodies = Composite.allBodies(engine.world);
    allBodies.forEach(body => {
      if (!body.isStatic) {
        Composite.remove(engine.world, body);
      }
    });
    
    // Réinitialiser le score et les balles fusionnées
    Game.score = 0;
    Game.elements.score.innerText = "0";
    Game.ballsMerged = Array.apply(null, Array(Game.ballSizes.length)).map(() => 0);
    
    // Clear l'ensemble des balles qui ont franchi la barre
    ballsBelowBar.clear();
    
    // Réactiver le runner
    runner.enabled = true;
    
    // Retour au menu
    Composite.remove(engine.world, gameStatics);
    Composite.add(engine.world, menuStatics);
    Game.elements.ui.style.display = "none";
    Game.stateIndex = GameStates.MENU;
    
    // Réattacher l'event listener du menu
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

  // Anti-cheat: Monitor canvas size
  initAntiCheat: function () {
    // Store original dimensions
    const originalCanvasWidth = render.options.width;
    const originalCanvasHeight = render.options.height;
    
    // Check every second for canvas manipulation
    setInterval(() => {
      if (Game.stateIndex === GameStates.LOSE || Game.stateIndex === GameStates.MENU) return;
      
      // Check if canvas or render dimensions were modified
      if (render.options.width !== originalCanvasWidth || 
          render.options.height !== originalCanvasHeight ||
          Game.width !== Game.originalWidth ||
          Game.height !== Game.originalHeight) {
        
        console.warn('🚨 Canvas manipulation detected!');
        Game.loseGame();
        Game.elements.endTitle.innerText = "⚠️ Triche Détectée!";
        Game.elements.gameEndMessage.innerText = "Modification du canvas interdite!";
      }
    }, 1000);

    // Detect DevTools (warning only)
    let devtoolsOpen = false;
    const threshold = 160;
    
    setInterval(() => {
      if (window.outerWidth - window.innerWidth > threshold || 
          window.outerHeight - window.innerHeight > threshold) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          console.warn('⚠️ DevTools détecté - Joue fair-play! 🎮');
        }
      } else {
        devtoolsOpen = false;
      }
    }, 500);
  },
};

// Initialisation du moteur, du runner et du rendu
const engine = Engine.create({
  gravity: {
    x: 0,
    y: 2.5  // Augmenté de 1 à 2.5 pour des balls plus rapides
  }
});
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

  // Bouton START stylé Pokémon (sans image)
  Bodies.rectangle(Game.width / 2, Game.height * 0.75, 280, 80, {
    isStatic: true,
    label: "btn-start",
    render: { 
      fillStyle: "#FFCB05",
      strokeStyle: "#FB1B1B", 
      lineWidth: 6
    },
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

// Start anti-cheat monitoring
Game.initAntiCheat();

// Redimensionner le canvas en fonction de la taille de l'écran
let resizeTimeout;
const resizeCanvas = () => {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  const aspectRatio = Game.width / Game.height;

  // ZERO marge sur mobile pour maximiser complètement l'espace
  const margin = screenWidth <= 480 ? 0 : (screenWidth <= 768 ? 4 : 8);
  
  let newWidth = screenWidth - (margin * 2);
  let newHeight = screenHeight - (margin * 2);

  if (newWidth / newHeight > aspectRatio) {
    newWidth = newHeight * aspectRatio;
  } else {
    newHeight = newWidth / aspectRatio;
  }

  render.canvas.style.width = `${newWidth}px`;
  render.canvas.style.height = `${newHeight}px`;

  const scaleUI = newWidth / Game.width;
  Game.elements.ui.style.width = `${Game.width}px`;
  Game.elements.ui.style.height = `${Game.height}px`;
  Game.elements.ui.style.transform = `scale(${scaleUI})`;

  // Smooth transition
  Game.elements.ui.style.transition = "transform 0.3s var(--ease-out-expo)";
};

// Throttled resize handler for better performance
const throttledResize = () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(resizeCanvas, 100);
};

// Appeler la fonction de redimensionnement lors du chargement et du redimensionnement de la page
window.addEventListener("resize", throttledResize);
window.addEventListener("orientationchange", resizeCanvas);
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
  
  // Créer le texte START après fermeture du modal
  setTimeout(() => {
    Game.createStartButtonText();
  }, 100);
  
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

/* LEADERBOARD EVENT LISTENERS - Désactivés, maintenant gérés par MenuManager dans menu.js
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
*/
