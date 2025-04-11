// Game constants
const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const WORD_LIST_URL = 'https://gist.githubusercontent.com/vncsmnl/25e7c165da276405af8ca4e1c8e17806/raw/aaeb75a75ff48ae8cd8888bae031dcb9884cddaa/wordlist';

// Game state
class GameState {
    constructor() {
        this.currentRow = 0;
        this.currentTile = 0;
        this.gameOver = false;
        this.correctWord = '';
        this.currentGuess = '';
        this.attempts = [];
        this.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            currentStreak: 0,
            maxStreak: 0,
            guessDistribution: Array(MAX_ATTEMPTS).fill(0)
        };
    }
}

// DOM Elements
class DOM {
    static board = document.getElementById('board');
    static keyboard = document.getElementById('keyboard');
    static modals = {
        help: document.getElementById('help-modal'),
        stats: document.getElementById('stats-modal'),
        settings: document.getElementById('settings-modal'),
        gameOver: document.getElementById('game-over-modal')
    };
    static buttons = {
        help: document.getElementById('help-btn'),
        stats: document.getElementById('stats-btn'),
        settings: document.getElementById('settings-btn'),
        closeHelp: document.getElementById('close-help'),
        closeStats: document.getElementById('close-stats'),
        closeSettings: document.getElementById('close-settings'),
        newGame: document.getElementById('new-game-btn'),
        share: document.getElementById('share-btn'),
        resetStats: document.getElementById('reset-stats')
    };
    static toggles = {
        darkMode: document.getElementById('dark-mode-toggle'),
        highContrast: document.getElementById('high-contrast-toggle'),
        abnt2: document.getElementById('abnt2-toggle')
    };
    static statsDisplay = {
        gamesPlayed: document.getElementById('games-played'),
        winPercentage: document.getElementById('win-percentage'),
        currentStreak: document.getElementById('current-streak'),
        maxStreak: document.getElementById('max-streak'),
        guessDistribution: document.getElementById('guess-distribution')
    };
}

// Game class
class WordleGame {
    constructor() {
        this.state = new GameState();
        this.words = [];
    }

    async init() {
        await this.loadWordList();
        this.loadStats();
        this.setupBoard();
        this.setupKeyboard();
        this.setupModals();
        this.newGame();
    }

    async loadWordList() {
        try {
            const response = await fetch(WORD_LIST_URL);
            const text = await response.text();
            this.words = text.split('\n')
                .map(word => word.trim().toUpperCase())
                .filter(word => word.length === WORD_LENGTH);

            if (this.words.length === 0) {
                throw new Error('No valid words found in the word list');
            }
        } catch (error) {
            console.error('Error loading word list:', error);
            // Fallback to a small set of words if the fetch fails
            this.words = [
                "ABRIR", "ACASO", "ACIMA", "AGORA", "AINDA", "ALGUM", "AMIGO", "ANTES", "APENAS", "APOIO"
            ];
        }
    }

    setupBoard() {
        DOM.board.innerHTML = '';

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const row = document.createElement('div');
            row.className = 'board-row';

            for (let j = 0; j < WORD_LENGTH; j++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                row.appendChild(tile);
            }

            DOM.board.appendChild(row);
        }
    }

    setupKeyboard() {
        // Physical keyboard
        document.addEventListener('keydown', this.handleKeyPress.bind(this));

        // On-screen keyboard
        const keys = document.querySelectorAll('.keyboard-key');
        keys.forEach(key => {
            key.addEventListener('click', () => {
                const keyValue = key.dataset.key;
                this.handleKeyPress({ key: keyValue });
            });
        });
    }

    setupModals() {
        // Help modal
        DOM.buttons.help.addEventListener('click', () => this.toggleModal('help'));
        DOM.buttons.closeHelp.addEventListener('click', () => this.toggleModal('help'));

        // Stats modal
        DOM.buttons.stats.addEventListener('click', () => {
            this.updateStatsDisplay();
            this.toggleModal('stats');
        });
        DOM.buttons.closeStats.addEventListener('click', () => this.toggleModal('stats'));

        // Settings modal
        DOM.buttons.settings.addEventListener('click', () => this.toggleModal('settings'));
        DOM.buttons.closeSettings.addEventListener('click', () => this.toggleModal('settings'));

        // Game over modal
        DOM.buttons.newGame.addEventListener('click', () => {
            this.toggleModal('gameOver');
            this.newGame();
        });
        DOM.buttons.share.addEventListener('click', () => this.shareResult());

        // Settings toggles
        DOM.toggles.darkMode.addEventListener('change', this.toggleDarkMode.bind(this));
        DOM.toggles.highContrast.addEventListener('change', this.toggleHighContrast.bind(this));
        DOM.toggles.abnt2.addEventListener('change', this.toggleKeyboardLayout.bind(this));

        // Reset stats
        DOM.buttons.resetStats.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja reiniciar todas as estatísticas?')) {
                this.resetStats();
                this.updateStatsDisplay();
            }
        });
    }

    handleKeyPress(event) {
        if (this.state.gameOver) return;

        const key = event.key || event.target?.dataset?.key;

        if (key === 'Enter' || key === 'ENTER') {
            this.submitGuess();
        } else if (key === 'Backspace' || key === 'BACKSPACE') {
            this.deleteLetter();
        } else if (/^[A-Za-zÇç]$/.test(key)) {
            this.addLetter(key.toUpperCase());
        }
    }

    addLetter(letter) {
        if (this.state.currentGuess.length < WORD_LENGTH) {
            this.state.currentGuess += letter;

            const tile = document.querySelector(`#board div:nth-child(${this.state.currentRow + 1}) div:nth-child(${this.state.currentGuess.length})`);
            tile.textContent = letter;
            tile.classList.add('bounce');

            setTimeout(() => {
                tile.classList.remove('bounce');
            }, 300);
        }
    }

    deleteLetter() {
        if (this.state.currentGuess.length > 0) {
            const tile = document.querySelector(`#board div:nth-child(${this.state.currentRow + 1}) div:nth-child(${this.state.currentGuess.length})`);
            tile.textContent = '';
            this.state.currentGuess = this.state.currentGuess.slice(0, -1);
        }
    }

    submitGuess() {
        if (this.state.currentGuess.length !== WORD_LENGTH) {
            this.shakeRow();
            return;
        }

        if (!this.words.includes(this.state.currentGuess)) {
            alert('Palavra não reconhecida. Tente outra.');
            return;
        }

        this.state.attempts.push(this.state.currentGuess);
        this.checkGuess();
    }

    checkGuess() {
        const rowTiles = document.querySelectorAll(`#board div:nth-child(${this.state.currentRow + 1}) div`);
        const correctLetters = [];
        const presentLetters = [];

        // First pass: find correct letters
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (this.state.currentGuess[i] === this.state.correctWord[i]) {
                correctLetters.push(i);
            }
        }

        // Second pass: find present letters
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (!correctLetters.includes(i)) {
                if (this.state.correctWord.includes(this.state.currentGuess[i])) {
                    const correctCount = this.state.correctWord.split(this.state.currentGuess[i]).length - 1;
                    const markedCount = correctLetters.filter(idx => this.state.currentGuess[idx] === this.state.currentGuess[i]).length +
                        presentLetters.filter(idx => this.state.currentGuess[idx] === this.state.currentGuess[i]).length;

                    if (markedCount < correctCount) {
                        presentLetters.push(i);
                    }
                }
            }
        }

        this.updateTiles(rowTiles, correctLetters, presentLetters);
        this.checkGameOver(correctLetters.length === WORD_LENGTH);
    }

    updateTiles(rowTiles, correctLetters, presentLetters) {
        for (let i = 0; i < WORD_LENGTH; i++) {
            const tile = rowTiles[i];
            const letter = this.state.currentGuess[i];

            setTimeout(() => {
                tile.classList.add('flip');

                if (correctLetters.includes(i)) {
                    tile.classList.add('correct');
                    this.updateKeyboardColor(letter, true, false);
                } else if (presentLetters.includes(i)) {
                    tile.classList.add('present');
                    this.updateKeyboardColor(letter, false, true);
                } else {
                    tile.classList.add('absent');
                    this.updateKeyboardColor(letter, false, false);
                }
            }, i * 200);
        }
    }

    updateKeyboardColor(letter, isCorrect, isPresent) {
        const key = document.querySelector(`.keyboard-key[data-key="${letter}"]`);

        if (!key) return;

        // Se a tecla já está marcada como correta, não mudamos
        if (key.classList.contains('correct')) return;

        // Se a tecla está marcada como presente e a nova classificação é ausente, não mudamos
        if (key.classList.contains('present') && !isCorrect && !isPresent) return;

        // Remove classes existentes
        key.classList.remove('correct', 'present', 'absent');

        // Adiciona a nova classe baseada na hierarquia
        if (isCorrect) {
            key.classList.add('correct');
        } else if (isPresent) {
            key.classList.add('present');
        } else {
            key.classList.add('absent');
        }
    }

    checkGameOver(isWin) {
        if (isWin) {
            this.handleWin();
        } else if (this.state.currentRow === MAX_ATTEMPTS - 1) {
            this.handleLoss();
        } else {
            this.state.currentRow++;
            this.state.currentGuess = '';
        }
    }

    handleWin() {
        this.state.gameOver = true;
        this.state.stats.gamesPlayed++;
        this.state.stats.gamesWon++;
        this.state.stats.currentStreak++;
        if (this.state.stats.currentStreak > this.state.stats.maxStreak) {
            this.state.stats.maxStreak = this.state.stats.currentStreak;
        }
        this.state.stats.guessDistribution[this.state.currentRow]++;

        this.saveStats();

        setTimeout(() => {
            this.showGameOver(true, this.state.currentRow + 1);
        }, WORD_LENGTH * 200 + 500);
    }

    handleLoss() {
        this.state.gameOver = true;
        this.state.stats.gamesPlayed++;
        this.state.stats.currentStreak = 0;

        this.saveStats();

        setTimeout(() => {
            this.showGameOver(false);
        }, WORD_LENGTH * 200 + 500);
    }

    showGameOver(won, attempts = 0) {
        const modal = DOM.modals.gameOver;
        const title = document.getElementById('game-result-title');
        const message = document.getElementById('game-result-message');
        const resultTiles = document.getElementById('result-tiles');

        title.textContent = won ? 'Você Ganhou!' : 'Você Perdeu';
        message.textContent = won
            ? `Parabéns! Você adivinhou a palavra em ${attempts} tentativa${attempts > 1 ? 's' : ''}.`
            : `A palavra era: ${this.state.correctWord}`;

        this.createResultTiles(resultTiles, attempts);
        this.toggleModal('gameOver');
    }

    createResultTiles(container, attempts) {
        container.innerHTML = '';
        container.classList.remove('flex', 'space-x-2');
        container.classList.add('flex', 'flex-col', 'space-y-2');

        for (let i = 0; i < attempts; i++) {
            const rowTiles = document.querySelectorAll(`#board div:nth-child(${i + 1}) div`);
            const rowContainer = document.createElement('div');
            rowContainer.classList.add('flex', 'space-x-2', 'justify-center');

            for (let j = 0; j < WORD_LENGTH; j++) {
                const tile = rowTiles[j];
                const clone = tile.cloneNode(true);
                clone.classList.remove('flip', 'bounce');
                clone.classList.add('w-6', 'h-6', 'text-xs');
                rowContainer.appendChild(clone);
            }

            container.appendChild(rowContainer);
        }
    }

    shareResult() {
        let shareText = `Wordle | Termooo @vncsmnl ${this.state.stats.gamesPlayed} ${this.state.attempts.length}/${MAX_ATTEMPTS}\n\n`;

        for (let i = 0; i < this.state.attempts.length; i++) {
            const rowTiles = document.querySelectorAll(`#board div:nth-child(${i + 1}) div`);

            for (let j = 0; j < WORD_LENGTH; j++) {
                const tile = rowTiles[j];
                shareText += tile.classList.contains('correct') ? '🟩' :
                    tile.classList.contains('present') ? '🟨' : '⬛';
            }

            shareText += '\n';
        }

        shareText += '\nJogue em: https://vinicius.is-a.dev/wordle';

        if (navigator.share) {
            navigator.share({
                title: 'Wordle | Termooo @vncsmnl  ',
                text: shareText,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                alert('Resultado copiado para a área de transferência!');
            }).catch(console.error);
        }
    }

    newGame() {
        this.state.currentRow = 0;
        this.state.currentTile = 0;
        this.state.gameOver = false;
        this.state.currentGuess = '';
        this.state.attempts = [];

        // Clear the board
        const tiles = document.querySelectorAll('#board div div');
        tiles.forEach(tile => {
            tile.textContent = '';
            tile.className = 'tile';
        });

        // Reset keyboard colors
        const keys = document.querySelectorAll('.keyboard-key');
        keys.forEach(key => {
            if (!key.dataset.key.match(/ENTER|BACKSPACE/)) {
                key.className = 'keyboard-key';
            }
        });

        // Select a random word
        this.state.correctWord = this.words[Math.floor(Math.random() * this.words.length)];
        console.log('Dica: A palavra é:', this.state.correctWord);
    }

    shakeRow() {
        const row = document.querySelector(`#board div:nth-child(${this.state.currentRow + 1})`);
        row.classList.add('shake');

        setTimeout(() => {
            row.classList.remove('shake');
        }, 500);
    }

    toggleModal(modalName) {
        DOM.modals[modalName].classList.toggle('hidden');
    }

    toggleDarkMode(event) {
        document.documentElement.classList.toggle('dark', event.target.checked);
    }

    toggleHighContrast(event) {
        document.documentElement.classList.toggle('high-contrast', event.target.checked);
    }

    toggleKeyboardLayout(event) {
        // Implementation for keyboard layout toggle
    }

    loadStats() {
        const savedStats = localStorage.getItem('wordleStats');
        if (savedStats) {
            this.state.stats = JSON.parse(savedStats);
        }
    }

    saveStats() {
        localStorage.setItem('wordleStats', JSON.stringify(this.state.stats));
    }

    resetStats() {
        this.state.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            currentStreak: 0,
            maxStreak: 0,
            guessDistribution: Array(MAX_ATTEMPTS).fill(0)
        };
        this.saveStats();
    }

    updateStatsDisplay() {
        DOM.statsDisplay.gamesPlayed.textContent = this.state.stats.gamesPlayed;
        DOM.statsDisplay.winPercentage.textContent = this.state.stats.gamesPlayed > 0
            ? `${Math.round((this.state.stats.gamesWon / this.state.stats.gamesPlayed) * 100)}%`
            : '0%';
        DOM.statsDisplay.currentStreak.textContent = this.state.stats.currentStreak;
        DOM.statsDisplay.maxStreak.textContent = this.state.stats.maxStreak;

        this.updateGuessDistribution();
    }

    updateGuessDistribution() {
        const container = DOM.statsDisplay.guessDistribution;
        container.innerHTML = '';

        const maxGuesses = Math.max(...this.state.stats.guessDistribution, 1);

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const row = document.createElement('div');
            row.className = 'flex items-center';

            const label = document.createElement('span');
            label.className = 'w-4 text-right mr-2';
            label.textContent = i + 1;
            row.appendChild(label);

            const barContainer = document.createElement('div');
            barContainer.className = 'flex-grow h-6 bg-gray-200 rounded overflow-hidden';

            const bar = document.createElement('div');
            bar.className = 'h-full bg-green-500 flex items-center justify-end pr-1 text-white text-xs';
            bar.style.width = `${(this.state.stats.guessDistribution[i] / maxGuesses) * 100}%`;
            bar.textContent = this.state.stats.guessDistribution[i] || '';

            barContainer.appendChild(bar);
            row.appendChild(barContainer);

            container.appendChild(row);
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', async () => {
    const game = new WordleGame();
    await game.init();
}); 