
// ===== GENERAL MENU MANAGEMENT =====
const MenuManager = {
  elements: {
    menuContainer: document.getElementById('menu-container'),
    closeMenuBtn: document.getElementById('close-menu'),
    pokeballBtn: null, // Sera sélectionné dans init()
    
    // Sections
    mainMenuSection: document.getElementById('main-menu-section'),
    leaderboardSection: document.getElementById('leaderboard-section'),
    
    // Main menu buttons
    restartBtn: document.getElementById('restart-game-btn'),
    showLeaderboardBtn: document.getElementById('show-leaderboard-btn'),
    toggleSoundBtn: document.getElementById('toggle-sound-btn'),
    
    // Navigation
    backToMenuBtn: document.getElementById('back-to-menu'),
    
    // Sound icons
    soundOnIcon: document.getElementById('sound-on-icon'),
    soundOffIcon: document.getElementById('sound-off-icon'),
    soundStatusText: document.getElementById('sound-status-text'),
    
    // Leaderboard
    leaderboardList: document.getElementById('leaderboard-list'),
    userRank: document.getElementById('user-rank')
  },
  
  soundEnabled: true,
  
  init() {
    // Load sound preference
    const savedSound = localStorage.getItem('soundEnabled');
    this.soundEnabled = savedSound === null ? true : savedSound === 'true';
    this.updateSoundUI();
    
    // Sélectionner le bouton Pokéball (peut être créé dynamiquement)
    setTimeout(() => {
      this.elements.pokeballBtn = document.getElementById('leaderboard-btn') || document.querySelector('.pokeball-btn');
      
      if (this.elements.pokeballBtn) {
        this.elements.pokeballBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.openMenu();
        });
        console.log('Menu: Pokéball button found and event listener added');
      } else {
        console.warn('Menu: Pokéball button not found');
      }
    }, 1000);
    
    // Event listeners for other buttons
    this.elements.closeMenuBtn?.addEventListener('click', () => this.closeMenu());
    this.elements.menuContainer?.addEventListener('click', (e) => {
      if (e.target === this.elements.menuContainer) this.closeMenu();
    });
    
    this.elements.restartBtn?.addEventListener('click', () => this.restartGame());
    this.elements.showLeaderboardBtn?.addEventListener('click', () => this.showLeaderboard());
    this.elements.toggleSoundBtn?.addEventListener('click', () => this.toggleSound());
    this.elements.backToMenuBtn?.addEventListener('click', () => this.showMainMenu());
  },
  
  openMenu() {
    this.elements.menuContainer.style.display = 'flex';
    this.showMainMenu();
  },
  
  closeMenu() {
    this.elements.menuContainer.style.display = 'none';
  },
  
  showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.menu-section').forEach(section => {
      section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.classList.add('active');
    }
  },
  
  showMainMenu() {
    this.showSection('main-menu-section');
  },
  
  showLeaderboard() {
    this.showSection('leaderboard-section');
    this.fetchLeaderboard();
  },
  
  restartGame() {
    this.closeMenu();
    if (typeof Game !== 'undefined' && Game.restartGame) {
      Game.restartGame();
    }
  },
  
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('soundEnabled', this.soundEnabled);
    this.updateSoundUI();
    
    // Update global sound setting
    if (typeof Game !== 'undefined' && Game.sounds) {
      Object.values(Game.sounds).forEach(sound => {
        sound.muted = !this.soundEnabled;
      });
    }
  },
  
  updateSoundUI() {
    if (this.soundEnabled) {
      this.elements.soundOnIcon.style.display = 'block';
      this.elements.soundOffIcon.style.display = 'none';
      this.elements.soundStatusText.textContent = 'Son: ON';
    } else {
      this.elements.soundOnIcon.style.display = 'none';
      this.elements.soundOffIcon.style.display = 'block';
      this.elements.soundStatusText.textContent = 'Son: OFF';
    }
  },
  
  async fetchLeaderboard() {
    try {
      // Utiliser Firebase Realtime Database directement
      if (typeof database !== 'undefined' && database) {
        const leaderboardRef = database.ref('leaderboard');
        const snapshot = await leaderboardRef.orderByChild('score').limitToLast(100).once('value');
        const data = snapshot.val();
        
        if (data) {
          // Convertir en array et trier par score décroissant
          const leaderboard = Object.values(data).sort((a, b) => b.score - a.score).slice(0, 10);
          this.displayLeaderboard(leaderboard);
        } else {
          this.elements.leaderboardList.innerHTML = '<p style="text-align: center;">Aucun score enregistré</p>';
        }
      } else {
        this.elements.leaderboardList.innerHTML = '<p style="text-align: center; color: var(--error);">Firebase non disponible</p>';
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      this.elements.leaderboardList.innerHTML = '<p style="text-align: center; color: var(--error);">Erreur de chargement du classement</p>';
    }
  },
  
  displayLeaderboard(leaderboard) {
    const currentUser = localStorage.getItem('playerName');
    let html = '';
    
    console.log('Leaderboard data:', leaderboard);
    
    leaderboard.forEach((entry, index) => {
      const rank = index + 1;
      // Gérer différents formats: entry.name, entry.username, ou entry directement
      const playerName = entry.name || entry.username || entry.playerName || 'Joueur inconnu';
      const score = entry.score || 0;
      
      const isCurrentUser = playerName === currentUser;
      const topClass = rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : '';
      const currentClass = isCurrentUser ? 'current-user' : '';
      
      html += `
        <div class="leaderboard-entry ${topClass} ${currentClass}">
          <div class="leaderboard-rank">${rank}</div>
          <div class="leaderboard-name">${playerName}</div>
          <div class="leaderboard-score">${score}</div>
        </div>
      `;
    });
    
    this.elements.leaderboardList.innerHTML = html;
    
    // Show user rank
    const userEntry = leaderboard.find(entry => {
      const playerName = entry.name || entry.username || entry.playerName;
      return playerName === currentUser;
    });
    
    if (userEntry) {
      const userRank = leaderboard.indexOf(userEntry) + 1;
      this.elements.userRank.textContent = `Votre classement: #${userRank}`;
    } else {
      this.elements.userRank.textContent = '';
    }
  }
};

// Initialize menu when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => MenuManager.init());
} else {
  MenuManager.init();
}
