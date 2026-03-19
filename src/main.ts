import { Game, GameMode } from './game/Game';

function startGame(debug: boolean, mode: GameMode = GameMode.NORMAL) {
    console.log("Starting game with mode:", mode);
    const menu = document.getElementById('menu-overlay');
    if (menu) menu.style.display = 'none';
    
    const game = new Game(debug, mode);
    game.start();
}

function init() {
    const btnGame = document.getElementById('btn-game');
    const btnHealer = document.getElementById('btn-healer');
    const btnDebug = document.getElementById('btn-debug');

    btnGame?.addEventListener('click', () => startGame(false, GameMode.NORMAL));
    btnHealer?.addEventListener('click', () => {
        console.log("Healer button clicked");
        startGame(false, GameMode.HEALER);
    });
    btnDebug?.addEventListener('click', () => startGame(true, GameMode.NORMAL));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
