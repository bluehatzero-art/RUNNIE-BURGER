class BurgerRunner {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.config = GAME_CONFIG;
        
        this.setupCanvas();
        this.state = 'loading';
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('burgerRunnerHighScore')) || 0;
        this.speed = this.config.baseSpeed;
        this.frame = 0;
        this.shakeAmount = 0;
        
        // Asset Storage
        this.images = {};
        this.sounds = {};
        
        // Game Objects
        this.burger = null;
        this.obstacles = [];
        this.particles = [];
        this.clouds = [];
        this.nextObstacleFrame = this.frame + (Math.random() * 30 + 150 / this.speed);
        
        this.init();
    }

    setupCanvas() {
        this.canvas.width = Math.min(this.config.canvasWidth, window.innerWidth * 0.95);
        this.canvas.height = Math.min(this.config.canvasHeight, window.innerHeight * 0.95);
    }

async init() {
        this.showLoader();
        console.log("Game Initializing...");
        
        try {
            // Wait for assets with a 5-second "force start" timeout
            await Promise.race([
                this.loadAssets(),
                new Promise(resolve => setTimeout(resolve, 5000)) 
            ]);

            console.log("Assets loaded or timed out. Starting game logic.");
            
            // Fallback: If burger image failed, we still need a burger object
            this.burger = new Burger(this, this.images.burger || new Image());
            
            this.createClouds();
            this.updateHighScoreDisplay();
            this.setupEventListeners();
            
            // FORCE HIDE LOADER
            this.hideLoader();
            this.startGame();
            
        } catch (err) {
            console.error("Critical Init Error:", err);
            this.hideLoader(); // Try to start anyway
            this.startGame();
        }
    }

    async loadAssets() {
        const imageSources = {
            burger: 'assets/images/burger.png',
            pizza: 'assets/images/pizza.png',
            fire: 'assets/images/fire.png',
            tomato: 'assets/images/tomato.png',
            onion: 'assets/images/onion.png',
            lettuce: 'assets/images/lettuce.png',
            cloud1: 'assets/images/cloud1.png',
            cloud2: 'assets/images/cloud2.png',
            background: 'assets/images/background.jpg'
        };

        const soundSources = {
            jump: 'assets/sounds/jump.mp3',
            hit: 'assets/sounds/hit.mp3',
            music: 'assets/sounds/music.mp3'
        };

        const totalAssets = Object.keys(imageSources).length + Object.keys(soundSources).length;
        let loadedCount = 0;

        const updateProgress = () => {
            loadedCount++;
            const progress = (loadedCount / totalAssets) * 100;
            const fill = document.querySelector('.progress-fill');
            if (fill) fill.style.width = `${progress}%`;
        };


        const imagePromises = Object.entries(imageSources).map(([name, src]) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = src;
                img.onload = () => { 
                    this.images[name] = img; 
                    updateProgress(); 
                    resolve(); 
                };
                img.onerror = () => { 
                    // This is the "Safety Net"
                    console.error(`MISSING FILE: ${src}`);
                    // Create a blank image so the game doesn't crash
                    this.images[name] = new Image(); 
                    updateProgress(); 
                    resolve(); 
                };
            });
        });
        // Load Sounds with individual error handling
        const soundPromises = Object.entries(soundSources).map(([name, src]) => {
            return new Promise((resolve) => {
                const audio = new Audio(src);
                audio.oncanplaythrough = () => { 
                    this.sounds[name] = audio; 
                    updateProgress(); 
                    resolve(); 
                };
                audio.onerror = () => { 
                    console.warn(`FAILED TO LOAD SOUND: ${src}`);
                    updateProgress(); 
                    resolve(); 
                };
            });
        });

        return Promise.all([...imagePromises, ...soundPromises]);
    }
    createClouds() {
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * 150,
                img: Math.random() > 0.5 ? this.images.cloud1 : this.images.cloud2,
                speed: 0.2 + Math.random() * 0.5,
                scale: 0.2 + Math.random() * 0.3
            });
        }
    }

    setupEventListeners() {
        const handleAction = () => {
            if (this.state === 'playing') this.burger.jump();
            if (this.state === 'gameOver') this.restart();
        };

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') handleAction();
            if (e.code === 'Escape') this.togglePause();
        });

        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleAction(); });
        this.canvas.addEventListener('mousedown', () => handleAction());
        
        document.getElementById('restartBtn').onclick = () => this.restart();
        document.getElementById('resumeBtn').onclick = () => this.togglePause();
    }

    startGame() {
        this.state = 'playing';
        if (this.sounds.music) {
            this.sounds.music.loop = true;
            this.sounds.music.play().catch(() => {});
        }
        this.gameLoop();
    }

    restart() {
        this.score = 0;
        this.speed = this.config.baseSpeed;
        this.obstacles = [];
        this.particles = [];
        this.frame = 0;
        this.burger.reset();
        this.state = 'playing';
        document.getElementById('gameOverScreen').classList.add('hidden');
        this.updateScoreDisplay();
        this.gameLoop();
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            document.getElementById('pauseScreen').classList.remove('hidden');
        } else if (this.state === 'paused') {
            this.state = 'playing';
            document.getElementById('pauseScreen').classList.add('hidden');
            this.gameLoop();
        }
    }

    update() {
        this.speed = Math.min(this.config.baseSpeed + (this.score * this.config.speedIncrease), this.config.maxSpeed);
        this.burger.update();

        if (this.frame >= this.nextObstacleFrame) {
            this.spawnObstacle();
            this.nextObstacleFrame = this.frame + (Math.random() * 60 + 400 / this.speed);
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.update(this.speed);
            if (this.checkCollision(this.burger, obs)) this.gameOver();
            if (obs.x + obs.width < 0) {
                this.obstacles.splice(i, 1);
                this.score++;
                this.updateScoreDisplay();
            }
        }

        this.clouds.forEach(c => {
            c.x -= c.speed;
            if (c.x < -200) c.x = this.canvas.width + 100;
        });

        this.particles.forEach((p, i) => {
            p.update();
            if (p.life <= 0) this.particles.splice(i, 1);
        });

        if (this.shakeAmount > 0) this.shakeAmount *= 0.9;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Background
        this.ctx.drawImage(this.images.background, 0, 0, this.canvas.width, this.canvas.height);

        // Clouds
        this.clouds.forEach(c => {
            this.ctx.drawImage(c.img, c.x, c.y, c.img.width * c.scale, c.img.height * c.scale);
        });

        this.ctx.save();
        if (this.shakeAmount > 1) {
            this.ctx.translate(Math.random() * this.shakeAmount, Math.random() * this.shakeAmount);
        }

        this.obstacles.forEach(o => o.draw(this.ctx));
        this.particles.forEach(p => p.draw(this.ctx));
        this.burger.draw(this.ctx);
        
        this.ctx.restore();
    }

    gameLoop() {
        if (this.state !== 'playing') return;
        this.update();
        this.draw();
        this.frame++;
        requestAnimationFrame(() => this.gameLoop());
    }

spawnObstacle() {
    const types = ['pizza', 'fire', 'tomato', 'onion', 'lettuce'];
    const type = types[Math.floor(Math.random() * types.length)];
    this.obstacles.push(new Obstacle(this, type, this.images[type]));

    // 20% chance to spawn a second obstacle immediately behind it
    if (Math.random() > 0.8) {
        setTimeout(() => {
            const type2 = types[Math.floor(Math.random() * types.length)];
            this.obstacles.push(new Obstacle(this, type2, this.images[type2]));
        }, 200);
    }
}

    checkCollision(b, o) {
        const p = 15; // Padding for tighter collision
        return (b.x + p < o.x + o.width - p &&
                b.x + b.width - p > o.x + p &&
                b.y + p < o.y + o.height - p &&
                b.y + b.height - p > o.y + p);
    }

    gameOver() {
        this.state = 'gameOver';
        this.shakeAmount = 15;
        if (this.sounds.hit) this.sounds.hit.play();
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('burgerRunnerHighScore', this.highScore);
        }
        document.getElementById('finalScore').innerText = this.score;
        document.getElementById('finalHighScore').innerText = this.highScore;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    showLoader() { document.getElementById('loader').classList.remove('hidden'); }
    hideLoader() { document.getElementById('loader').classList.add('hidden'); }
    updateScoreDisplay() { document.getElementById('currentScore').innerText = this.score; }
    updateHighScoreDisplay() { document.getElementById('highScore').innerText = this.highScore; }
}

class Burger {
    constructor(game, img) {
        this.game = game;
        this.img = img;
        this.reset();
    }
    reset() {
        this.width = this.game.config.burger.width;
        this.height = this.game.config.burger.height;
        this.x = 80;
        this.y = this.game.canvas.height - this.height - 40;
        this.vy = 0;
        this.grounded = true;
        this.rotation = 0;
    }
    jump() {
        if (this.grounded) {
            this.vy = this.game.config.burger.jumpPower;
            this.grounded = false;
            if (this.game.sounds.jump) {
                this.game.sounds.jump.pause();        // Stop current play
                this.game.sounds.jump.currentTime = 0; // Reset to start
                this.game.sounds.jump.play().catch(e => console.log("Audio play blocked"));
            }
            for(let i=0; i<8; i++) this.game.particles.push(new Particle(this.x + 20, this.y + this.height));
        }
    }
    update() {
        this.vy += this.game.config.burger.gravity;
        this.y += this.vy;
        const groundY = this.game.canvas.height - this.height - 40;
        if (this.y > groundY) {
            this.y = groundY;
            this.vy = 0;
            this.grounded = true;
            this.rotation = 0;
        }
        if (!this.grounded) this.rotation += 0.05;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        // Squish effect when moving
        const squish = this.grounded ? Math.sin(Date.now() / 100) * 2 : 0;
        ctx.drawImage(this.img, -this.width/2, -this.height/2 + squish, this.width, this.height - squish);
        ctx.restore();
    }
}

class Obstacle {
    constructor(game, type, img) {
        this.game = game;
        this.img = img;
        this.type = type;
        this.width = 60;
        this.height = 60;
        this.x = game.canvas.width + 100;
        this.y = game.canvas.height - this.height - 40;
        if (type === 'pizza') this.y -= (80 + Math.random() * 100); // Pizza flies
    }
    update(speed) { this.x -= speed; }
    draw(ctx) {
        ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
}

class Particle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.life = 1.0;
        this.color = `hsl(${Math.random() * 50 + 20}, 70%, 50%)`;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= 0.02; }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.fillRect(this.x, this.y, 4, 4);
        ctx.globalAlpha = 1;
    }
}

new BurgerRunner();