import { Game } from './game/Game';

function init() {
    const game = new Game();
    game.start();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
