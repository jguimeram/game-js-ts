import { Game } from './game/Game';

function startGame(debug: boolean) {
    const menu = document.getElementById('menu-overlay');
    if (menu) menu.style.display = 'none';
    
    const game = new Game(debug);
    game.start();
}

function init() {
    const btnGame = document.getElementById('btn-game');
    const btnDebug = document.getElementById('btn-debug');

    btnGame?.addEventListener('click', () => startGame(false));
    btnDebug?.addEventListener('click', () => startGame(true));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
