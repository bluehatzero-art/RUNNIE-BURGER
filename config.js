// 🍔 Burger Runner - Configuration File
// Easily customize colors, speeds, sounds, and more!

window.GAME_CONFIG = {
    // Game Settings
    canvasWidth: 1200,
    canvasHeight: 600,
    fps: 60,
    
    // Difficulty Scaling
    baseSpeed: 4,
    speedIncrease: 0.1,
    maxSpeed: 10,
    
    // Burger Properties
    burger: {
        width: 60,
        height: 60,
        jumpPower: -20,
        gravity: 0.6,
        bounce: 0.7
    },
    
    // Obstacle Settings
    obstacles: {
        spawnRate: 0.2,
        minSpawnDelay: 30,
        maxSpawnDelay: 60,
        types: ['pizza', 'fire', 'tomato', 'onion', 'lettuce']
    },
    
    // Visual Settings
    colors: {
        sky: ['#87CEEB', '#98D8E8', '#B0E0E6'],
        ground: '#4CAF50',
        burger: {
            bun: '#D2691E',
            patty: '#8B4513',
            cheese: '#FFD700',
            lettuce: '#32CD32'
        }
    },
    
    // Audio Settings (easily replace sound files)
    sounds: {
        jump: 'assets/sounds/jump.mp3',
        hit: 'assets/sounds/hit.mp3',
        music: 'assets/sounds/music.mp3',
        volume: 0.5
    },
    
    // Loader Settings
    loader: {
        colors: ['#ff6b6b', '#ffd93d', '#6bcf7f', '#4d96ff'],
        speed: 2
    },
    
    // Particle Effects
    particles: {
        count: 20,
        life: 60
    }
};