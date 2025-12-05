// Initialisation du jeu
document.addEventListener('DOMContentLoaded', function() {
    console.log("Jeu Snake Inversé - Chargement...");
    
    // Éléments du DOM
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const introScreen = document.getElementById('introScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const playAgainButton = document.getElementById('playAgainButton');
    const backToMenuButton = document.getElementById('backToMenuButton');
    const pauseButton = document.getElementById('pauseButton');
    const restartButton = document.getElementById('restartButton');
    const soundButton = document.getElementById('soundButton');
    
    // Vérification des éléments DOM
    if (!canvas) {
        console.error("Canvas non trouvé !");
        return;
    }
    
    console.log("Canvas trouvé:", canvas.width, "x", canvas.height);
    
    // Éléments d'affichage
    const scoreElement = document.getElementById('score');
    const livesElement = document.getElementById('lives');
    const powerElement = document.getElementById('power');
    const snakeLengthElement = document.getElementById('snakeLength');
    const gameModeElement = document.getElementById('gameMode');
    const gameTimeElement = document.getElementById('gameTime');
    const objectsCollectedElement = document.getElementById('objectsCollected');
    const gamesPlayedElement = document.getElementById('gamesPlayed');
    const bestScoreElement = document.getElementById('bestScore');
    const survivalTimeElement = document.getElementById('survivalTime');
    const gameOverTitle = document.getElementById('gameOverTitle');
    const gameOverMessage = document.getElementById('gameOverMessage');
    const finalScoreElement = document.getElementById('finalScore');
    const finalTimeElement = document.getElementById('finalTime');
    const finalObjectsElement = document.getElementById('finalObjects');
    
    // Variables du jeu
    let gameRunning = false;
    let gamePaused = false;
    let gameStarted = false;
    let soundEnabled = true;
    let score = 0;
    let lives = 3;
    let power = 0;
    let gameTime = 0;
    let timerInterval;
    let objectsCollected = 0;
    let gamesPlayed = 0;
    let bestScore = localStorage.getItem('bestScore') || 0;
    let survivalTime = 0;
    let lastRenderTime = 0;
    
    // Pour afficher le compteur de fruits collectés
    let fruitCounter = {
        show: false,
        message: "",
        startTime: 0,
        duration: 1500 // 1.5 secondes
    };
    
    // Dimensions de la grille
    const gridSize = 20;
    const gridWidth = Math.floor(canvas.width / gridSize);
    const gridHeight = Math.floor(canvas.height / gridSize);
    
    console.log("Taille de la grille:", gridWidth, "x", gridHeight);
    
    // Positions et états
    let apple = { x: 10, y: 10 };
    let snake = [];
    let snakeDirection = { x: 1, y: 0 };
    let snakeSpeed = 7; // Vitesse du serpent (images par seconde)
    let lastSnakeMoveTime = 0;
    
    // Vitesse de la pomme (joueur)
    let appleSpeed = 6; // Vitesse initiale (cases par seconde)
    let lastAppleMoveTime = 0;
    let appleSpeedIncreaseInterval = 30000; // Augmente la vitesse toutes les 30 secondes
    let lastAppleSpeedIncrease = 0;
    
    // Croissance du serpent
    let snakeGrowthInterval = 10000; // Le serpent grandit toutes les 10 secondes
    let lastSnakeGrowth = 0;
    
    // Pouvoirs spéciaux
    let powerUps = [];
    let powerUpActive = false;
    let powerUpType = '';
    let powerUpEndTime = 0;
    
    // Directions possibles
    const directions = {
        UP: { x: 0, y: -1 },
        DOWN: { x: 0, y: 1 },
        LEFT: { x: -1, y: 0 },
        RIGHT: { x: 1, y: 0 }
    };
    
    // Contrôles du joueur
    let playerDirection = directions.RIGHT;
    let keysPressed = {};
    
    // Initialiser les statistiques
    bestScoreElement.textContent = bestScore;
    
    // Types d'objets spéciaux
    const powerUpTypes = [
        { 
            name: 'linux', 
            color: '#009966',
            effect: 'Ralentit le serpent pendant 5 secondes',
            duration: 5000,
            sizeMultiplier: 1.4,
            symbol: '🐧'
        },
        { 
            name: 'github', 
            color: '#ffffff',
            effect: 'Inverse les contrôles du serpent pendant 5 secondes',
            duration: 5000,
            sizeMultiplier: 1.4,
            symbol: '🐙'
        },
        { 
            name: 'opensource', 
            color: '#9d4edd',
            effect: 'Active le mode chasse pour manger le serpent',
            duration: 10000,
            sizeMultiplier: 1.4,
            symbol: '🔓'
        }
    ];
    
    // Sons du jeu (simulés avec des effets visuels)
    function playSound(type) {
        if (!soundEnabled) return;
        
        // Simulation d'effets sonores avec des effets visuels
        switch(type) {
            case 'collect':
                createParticles(apple.x * gridSize + gridSize/2, apple.y * gridSize + gridSize/2, powerUpTypes.find(p => p.name === powerUpType)?.color || '#ffaa00');
                break;
            case 'power':
                canvas.style.boxShadow = '0 0 30px ' + (powerUpTypes.find(p => p.name === powerUpType)?.color || '#ffaa00');
                setTimeout(() => {
                    canvas.style.boxShadow = '0 0 30px rgba(0, 0, 0, 0.7)';
                }, 300);
                break;
            case 'hit':
                canvas.style.boxShadow = '0 0 40px #ff4757';
                setTimeout(() => {
                    canvas.style.boxShadow = '0 0 30px rgba(0, 0, 0, 0.7)';
                }, 300);
                break;
            case 'gameOver':
                canvas.style.boxShadow = '0 0 50px #ff4757';
                setTimeout(() => {
                    canvas.style.boxShadow = '0 0 30px rgba(0, 0, 0, 0.7)';
                }, 500);
                break;
            case 'grow':
                // Effet visuel quand le serpent grandit
                if (snake.length > 0) {
                    const tail = snake[snake.length - 1];
                    createParticles(tail.x * gridSize + gridSize/2, tail.y * gridSize + gridSize/2, '#00ff9d');
                }
                break;
            case 'speedUp':
                // Effet visuel quand la pomme accélère
                createParticles(apple.x * gridSize + gridSize/2, apple.y * gridSize + gridSize/2, '#ffaa00');
                break;
        }
    }
    
    // Afficher un message de compteur de fruits
    function showFruitCounter(type) {
        fruitCounter.show = true;
        fruitCounter.message = `+1 ${type.symbol} ${type.name}`;
        fruitCounter.startTime = Date.now();
        
        // Mettre à jour le compteur dans les statistiques
        objectsCollectedElement.textContent = objectsCollected;
        
        console.log(`Fruit collecté: ${type.name}`);
    }
    
    // Cacher le compteur de fruits après un certain temps
    function updateFruitCounter() {
        if (fruitCounter.show && Date.now() - fruitCounter.startTime > fruitCounter.duration) {
            fruitCounter.show = false;
        }
    }
    
    // Dessiner le compteur de fruits
    function drawFruitCounter() {
        if (!fruitCounter.show) return;
        
        // Calculer l'opacité (fade in/out)
        const elapsed = Date.now() - fruitCounter.startTime;
        const fadeDuration = 300; // 300ms pour fade in/out
        let opacity = 1;
        
        if (elapsed < fadeDuration) {
            // Fade in
            opacity = elapsed / fadeDuration;
        } else if (elapsed > fruitCounter.duration - fadeDuration) {
            // Fade out
            opacity = (fruitCounter.duration - elapsed) / fadeDuration;
        }
        
        // Dessiner un fond semi-transparent
        ctx.fillStyle = `rgba(0, 0, 0, 0.7)`;
        ctx.fillRect(canvas.width - 200, 10, 190, 60);
        
        // Dessiner la bordure
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width - 200, 10, 190, 60);
        
        // Dessiner le texte
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Dessiner l'icône du fruit
        const fruitType = powerUpTypes.find(p => p.symbol === fruitCounter.message.split(' ')[1]);
        if (fruitType) {
            ctx.fillStyle = fruitType.color;
            ctx.font = '24px Arial';
            ctx.fillText(fruitType.symbol, canvas.width - 175, 40);
        }
        
        // Dessiner le message
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(fruitCounter.message, canvas.width - 145, 40);
        
        // Dessiner le compteur total
        ctx.font = '14px Arial';
        ctx.fillText(`Total: ${objectsCollected}`, canvas.width - 145, 60);
    }
    
    // Créer des particules pour les effets visuels
    function createParticles(x, y, color) {
        for (let i = 0; i < 15; i++) {
            const particle = {
                x: x,
                y: y,
                size: Math.random() * 5 + 2,
                speedX: Math.random() * 6 - 3,
                speedY: Math.random() * 6 - 3,
                color: color,
                life: 30
            };
            
            // Animation simple des particules
            drawParticleFrame(particle, particle.life);
        }
    }
    
    function drawParticleFrame(particle, life) {
        if (life <= 0 || !gameRunning) return;
        
        ctx.globalAlpha = life / particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        life--;
        
        if (life > 0) {
            requestAnimationFrame(() => drawParticleFrame(particle, life));
        }
    }
    
    // Initialiser le jeu
    function initGame() {
        console.log("Initialisation du jeu...");
        
        // Réinitialiser les variables
        score = 0;
        lives = 3;
        power = 0;
        gameTime = 0;
        objectsCollected = 0;
        playerDirection = directions.RIGHT;
        snakeDirection = { x: 1, y: 0 };
        snakeSpeed = 7;
        appleSpeed = 8; // Vitesse initiale lente
        powerUpActive = false;
        powerUpType = '';
        lastRenderTime = 0;
        lastAppleSpeedIncrease = 0;
        lastSnakeGrowth = 0;
        fruitCounter.show = false;
        
        // Initialiser la pomme (joueur)
        apple = {
            x: Math.floor(gridWidth / 4),
            y: Math.floor(gridHeight / 2)
        };
        
        console.log("Position initiale de la pomme:", apple.x, apple.y);
        console.log("Vitesse initiale de la pomme:", appleSpeed, "cases/seconde");
        
        // Initialiser le serpent (IA)
        snake = [];
        const snakeStartX = Math.floor(gridWidth * 3/4);
        const snakeStartY = Math.floor(gridHeight / 2);
        
        // Créer le serpent avec 5 segments
        for (let i = 0; i < 5; i++) {
            snake.push({ x: snakeStartX - i, y: snakeStartY });
        }
        
        console.log("Serpent créé avec", snake.length, "segments");
        
        // Initialiser les objets spéciaux
        powerUps = [];
        generatePowerUp();
        
        // Mettre à jour l'affichage
        updateDisplay();
        
        // Cacher l'écran d'introduction et l'écran de fin
        introScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        
        // Démarrer le jeu
        gameRunning = true;
        gameStarted = true;
        gamePaused = false;
        
        // Démarrer le timer
        clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
        
        // Lancer la boucle de jeu
        lastRenderTime = performance.now();
        lastAppleMoveTime = lastRenderTime;
        requestAnimationFrame(gameLoop);
        
        console.log("Jeu démarré !");
    }
    
    // Générer un objet spécial
    function generatePowerUp() {
        // Ne pas générer plus de 3 objets spéciaux à la fois
        if (powerUps.length >= 3) return;
        
        // 30% de chance de générer un objet spécial à chaque appel
        if (Math.random() > 0.7) return;
        
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        let x, y;
        let validPosition = false;
        let attempts = 0;
        
        // Trouver une position valide
        while (!validPosition && attempts < 100) {
            x = Math.floor(Math.random() * gridWidth);
            y = Math.floor(Math.random() * gridHeight);
            validPosition = true;
            attempts++;
            
            // Vérifier que la position n'est pas occupée par la pomme
            if (x === apple.x && y === apple.y) validPosition = false;
            
            // Vérifier que la position n'est pas occupée par le serpent
            for (let segment of snake) {
                if (segment.x === x && segment.y === y) {
                    validPosition = false;
                    break;
                }
            }
            
            // Vérifier que la position n'est pas occupée par un autre objet
            for (let powerUp of powerUps) {
                if (powerUp.x === x && powerUp.y === y) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        if (validPosition) {
            powerUps.push({
                x: x,
                y: y,
                type: type,
                collected: false
            });
            console.log("Objet spécial généré:", type.name, "à", x, y);
        }
    }
    
    // Mettre à jour l'affichage
    function updateDisplay() {
        scoreElement.textContent = score;
        livesElement.textContent = lives;
        
        if (powerUpActive && powerUpType) {
            const timeLeft = Math.max(0, Math.floor((powerUpEndTime - Date.now()) / 1000));
            powerElement.textContent = `${timeLeft}s`;
        } else {
            powerElement.textContent = '0%';
        }
        
        snakeLengthElement.textContent = snake.length;
        gameModeElement.textContent = powerUpActive && powerUpType === 'opensource' ? 'Chasse' : 'Fuite';
        objectsCollectedElement.textContent = objectsCollected;
        gamesPlayedElement.textContent = gamesPlayed;
        bestScoreElement.textContent = bestScore;
        
        // Mettre à jour le temps de survie
        const minutes = Math.floor(survivalTime / 60);
        const seconds = survivalTime % 60;
        survivalTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Mettre à jour le timer
    function updateTimer() {
        if (!gamePaused && gameRunning) {
            gameTime++;
            survivalTime++;
            
            const minutes = Math.floor(gameTime / 60);
            const seconds = gameTime % 60;
            gameTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Générer occasionnellement de nouveaux objets spéciaux
            if (gameTime % 10 === 0) {
                generatePowerUp();
            }
            
            // Faire grandir le serpent toutes les 10 secondes
            if (gameTime % 10 === 0 && gameTime > 0) {
                growSnake();
            }
            
            // Augmenter la vitesse de la pomme toutes les 30 secondes
            if (gameTime % 30 === 0 && gameTime > 0) {
                increaseAppleSpeed();
            }
        }
    }
    
    // Faire grandir le serpent
    function growSnake() {
        if (snake.length === 0) return;
        
        // Ajouter un segment à la fin du serpent
        const tail = snake[snake.length - 1];
        snake.push({ x: tail.x, y: tail.y });
        
        // Jouer un effet sonore/visuel
        playSound('grow');
        
        // Mettre à jour l'affichage
        updateDisplay();
        
        console.log("Le serpent a grandi ! Nouvelle longueur:", snake.length);
    }
    
    // Augmenter la vitesse de la pomme
    function increaseAppleSpeed() {
        // Augmenter la vitesse de 1 case/seconde, max 15
        appleSpeed = Math.min(15, appleSpeed + 1);
        
        // Jouer un effet sonore/visuel
        playSound('speedUp');
        
        // Mettre à jour l'affichage
        updateDisplay();
        
        console.log("Vitesse de la pomme augmentée à:", appleSpeed, "cases/seconde");
    }
    
    // Gérer les entrées clavier
    document.addEventListener('keydown', function(event) {
        if (!gameRunning || gamePaused) return;
        
        // Déplacement de la pomme (joueur)
        switch(event.key) {
            case 'ArrowUp':
                if (playerDirection.y !== 1) {
                    playerDirection = directions.UP;
                }
                event.preventDefault();
                break;
            case 'ArrowDown':
                if (playerDirection.y !== -1) {
                    playerDirection = directions.DOWN;
                }
                event.preventDefault();
                break;
            case 'ArrowLeft':
                if (playerDirection.x !== 1) {
                    playerDirection = directions.LEFT;
                }
                event.preventDefault();
                break;
            case 'ArrowRight':
                if (playerDirection.x !== -1) {
                    playerDirection = directions.RIGHT;
                }
                event.preventDefault();
                break;
            case ' ':
                // Espace pour pause
                togglePause();
                event.preventDefault();
                break;
        }
    });
    
    // Mouvement de la pomme (joueur) - avec vitesse contrôlée
    function moveApple(currentTime) {
        // Déplacer la pomme selon la direction du joueur, mais à une vitesse contrôlée
        if (currentTime - lastAppleMoveTime < 1000 / appleSpeed) return;
        
        lastAppleMoveTime = currentTime;
        
        // Déplacer la pomme
        apple.x += playerDirection.x;
        apple.y += playerDirection.y;
        
        // Gérer les collisions avec les bords
        if (apple.x < 0) apple.x = gridWidth - 1;
        if (apple.x >= gridWidth) apple.x = 0;
        if (apple.y < 0) apple.y = gridHeight - 1;
        if (apple.y >= gridHeight) apple.y = 0;
        
        // Vérifier les collisions avec les objets spéciaux
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const powerUp = powerUps[i];
            
            if (apple.x === powerUp.x && apple.y === powerUp.y && !powerUp.collected) {
                // Collecter l'objet
                powerUps[i].collected = true;
                objectsCollected++;
                score += 100;
                
                // Afficher le compteur de fruits
                showFruitCounter(powerUp.type);
                
                // Activer l'effet de l'objet
                activatePowerUp(powerUp.type);
                
                // Jouer un son
                playSound('collect');
                
                // Supprimer l'objet collecté
                powerUps.splice(i, 1);
                break;
            }
        }
        
        // Vérifier les collisions avec le serpent
        for (let segment of snake) {
            if (apple.x === segment.x && apple.y === segment.y) {
                // Si le mode chasse est actif, manger le serpent
                if (powerUpActive && powerUpType === 'opensource') {
                    // Réduire la taille du serpent (taille - 1)
                    if (snake.length > 0) {
                        snake.pop();
                        score += 200;
                        
                        // Jouer un son
                        playSound('power');
                        
                        // Vérifier si le serpent a été complètement mangé
                        if (snake.length === 0) {
                            gameWin();
                            return;
                        }
                        
                        // Mettre à jour l'affichage après avoir mangé un segment
                        updateDisplay();
                    }
                } else {
                    // Sinon, la pomme perd une vie
                    loseLife();
                    return;
                }
            }
        }
    }
    
    // Activer un pouvoir spécial
    function activatePowerUp(type) {
        powerUpActive = true;
        powerUpType = type.name;
        powerUpEndTime = Date.now() + type.duration;
        
        // Appliquer l'effet selon le type
        switch(type.name) {
            case 'linux':
                // Ralentir le serpent
                snakeSpeed = Math.max(3, snakeSpeed - 3);
                break;
            case 'github':
                // Inverser les contrôles du serpent (fait dans l'IA)
                break;
            case 'opensource':
                // Activer le mode chasse
                break;
        }
        
        // Jouer un son
        playSound('power');
        
        // Mettre à jour l'affichage
        updateDisplay();
        
        console.log("Pouvoir activé:", type.name);
    }
    
    // Désactiver un pouvoir spécial
    function deactivatePowerUp() {
        if (!powerUpActive) return;
        
        // Réinitialiser les effets
        switch(powerUpType) {
            case 'linux':
                snakeSpeed = 7;
                break;
            case 'github':
                // Rétablir les contrôles normaux
                break;
            case 'opensource':
                // Désactiver le mode chasse
                break;
        }
        
        powerUpActive = false;
        powerUpType = '';
        updateDisplay();
        
        console.log("Pouvoir désactivé");
    }
    
    // Mouvement du serpent (IA)
    function moveSnake(currentTime) {
        // Déplacer le serpent à intervalles réguliers basés sur sa vitesse
        if (currentTime - lastSnakeMoveTime < 1000 / snakeSpeed) return;
        
        lastSnakeMoveTime = currentTime;
        
        // Déterminer la nouvelle direction du serpent (IA simple)
        let newDirection = getAIDirection();
        
        // Mettre à jour la direction du serpent
        if (newDirection) {
            snakeDirection = newDirection;
        }
        
        // Calculer la nouvelle tête du serpent
        const head = { 
            x: snake[0].x + snakeDirection.x, 
            y: snake[0].y + snakeDirection.y 
        };
        
        // Gérer les collisions avec les bords
        if (head.x < 0) head.x = gridWidth - 1;
        if (head.x >= gridWidth) head.x = 0;
        if (head.y < 0) head.y = gridHeight - 1;
        if (head.y >= gridHeight) head.y = 0;
        
        // Ajouter la nouvelle tête
        snake.unshift(head);
        
        // Si le serpent n'a pas mangé la pomme, retirer la queue
        // (Dans ce jeu, le serpent ne mange pas la pomme, donc on retire toujours la queue)
        snake.pop();
    }
    
    // IA pour déterminer la direction du serpent
    function getAIDirection() {
        const head = snake[0];
        let possibleDirections = [];
        
        // Éviter de faire un demi-tour
        if (snakeDirection.x !== 1) possibleDirections.push(directions.LEFT);
        if (snakeDirection.x !== -1) possibleDirections.push(directions.RIGHT);
        if (snakeDirection.y !== 1) possibleDirections.push(directions.UP);
        if (snakeDirection.y !== -1) possibleDirections.push(directions.DOWN);
        
        // Si l'objet GitHub est actif, inverser la logique
        if (powerUpActive && powerUpType === 'github') {
            // Chercher à s'éloigner de la pomme
            let bestDirection = snakeDirection;
            let worstDistance = -Infinity;
            
            for (let dir of possibleDirections) {
                const newX = head.x + dir.x;
                const newY = head.y + dir.y;
                
                // Calculer la distance à la pomme
                const dx = Math.abs(newX - apple.x);
                const dy = Math.abs(newY - apple.y);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > worstDistance) {
                    // Vérifier que la position n'est pas occupée par le corps du serpent
                    let collision = false;
                    for (let i = 0; i < snake.length - 1; i++) {
                        if (snake[i].x === newX && snake[i].y === newY) {
                            collision = true;
                            break;
                        }
                    }
                    
                    if (!collision) {
                        worstDistance = distance;
                        bestDirection = dir;
                    }
                }
            }
            
            return bestDirection;
        } else {
            // Chercher à se rapprocher de la pomme
            let bestDirection = snakeDirection;
            let bestDistance = Infinity;
            
            for (let dir of possibleDirections) {
                const newX = head.x + dir.x;
                const newY = head.y + dir.y;
                
                // Calculer la distance à la pomme
                const dx = Math.abs(newX - apple.x);
                const dy = Math.abs(newY - apple.y);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < bestDistance) {
                    // Vérifier que la position n'est pas occupée par le corps du serpent
                    let collision = false;
                    for (let i = 0; i < snake.length - 1; i++) {
                        if (snake[i].x === newX && snake[i].y === newY) {
                            collision = true;
                            break;
                        }
                    }
                    
                    if (!collision) {
                        bestDistance = distance;
                        bestDirection = dir;
                    }
                }
            }
            
            return bestDirection;
        }
    }
    
    // Perdre une vie
    function loseLife() {
        lives--;
        playSound('hit');
        
        if (lives <= 0) {
            gameOver();
        } else {
            // Réinitialiser la position de la pomme
            let validPosition = false;
            while (!validPosition) {
                apple.x = Math.floor(Math.random() * gridWidth);
                apple.y = Math.floor(Math.random() * gridHeight);
                
                validPosition = true;
                
                // Vérifier que la position n'est pas occupée par le serpent
                for (let segment of snake) {
                    if (segment.x === apple.x && segment.y === apple.y) {
                        validPosition = false;
                        break;
                    }
                }
            }
            
            updateDisplay();
        }
    }
    
    // Victoire (le serpent a été complètement mangé)
    function gameWin() {
        gameRunning = false;
        clearInterval(timerInterval);
        
        // Calculer le score bonus
        const timeBonus = Math.floor(1000 / (gameTime || 1));
        const finalScore = score + timeBonus * 10;
        
        // Mettre à jour le meilleur score
        if (finalScore > bestScore) {
            bestScore = finalScore;
            localStorage.setItem('bestScore', bestScore);
        }
        
        // Mettre à jour les statistiques
        gamesPlayed++;
        
        // Afficher l'écran de fin de jeu
        gameOverTitle.textContent = "Victoire !";
        gameOverMessage.textContent = "Vous avez libéré l'espace numérique du serpent !";
        finalScoreElement.textContent = finalScore;
        
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        finalTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        finalObjectsElement.textContent = objectsCollected;
        
        gameOverScreen.style.display = 'flex';
        playSound('gameOver');
        
        console.log("Victoire ! Score:", finalScore);
    }
    
    // Game over (la pomme a été mangée)
    function gameOver() {
        gameRunning = false;
        clearInterval(timerInterval);
        
        // Mettre à jour les statistiques
        gamesPlayed++;
        
        // Afficher l'écran de fin de jeu
        gameOverTitle.textContent = "Fin de la Rébellion";
        gameOverMessage.textContent = "Le serpent a repris le contrôle de l'espace numérique.";
        finalScoreElement.textContent = score;
        
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        finalTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        finalObjectsElement.textContent = objectsCollected;
        
        gameOverScreen.style.display = 'flex';
        playSound('gameOver');
        
        console.log("Game Over. Score final:", score);
    }
    
    // Boucle de jeu principale
    function gameLoop(currentTime) {
        if (!gameRunning) return;
        
        // Calculer le temps écoulé depuis la dernière frame
        const deltaTime = currentTime - lastRenderTime;
        lastRenderTime = currentTime;
        
        // Effacer le canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dessiner l'arrière-plan de la grille
        drawGrid();
        
        // Si le jeu n'est pas en pause
        if (!gamePaused) {
            // Déplacer la pomme (avec vitesse contrôlée)
            moveApple(currentTime);
            
            // Déplacer le serpent
            moveSnake(currentTime);
            
            // Vérifier si un pouvoir spécial a expiré
            if (powerUpActive && Date.now() > powerUpEndTime) {
                deactivatePowerUp();
            }
            
            // Générer occasionnellement de nouveaux objets spéciaux
            if (Math.random() < 0.01) {
                generatePowerUp();
            }
            
            // Mettre à jour le compteur de fruits
            updateFruitCounter();
        }
        
        // Dessiner les éléments du jeu
        drawPowerUps();
        drawSnake();
        drawApple();
        
        // Dessiner le compteur de fruits
        drawFruitCounter();
        
        // Continuer la boucle de jeu
        requestAnimationFrame(gameLoop);
    }
    
    // Dessiner la grille
    function drawGrid() {
        ctx.strokeStyle = 'rgba(64, 156, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Lignes verticales
        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        // Lignes horizontales
        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    
    // Dessiner la pomme (joueur)
    function drawApple() {
        const x = apple.x * gridSize;
        const y = apple.y * gridSize;
        
        // Dessiner un effet de lueur
        const gradient = ctx.createRadialGradient(
            x + gridSize/2, y + gridSize/2, 0,
            x + gridSize/2, y + gridSize/2, gridSize
        );
        
        if (powerUpActive && powerUpType === 'opensource') {
            // Mode chasse actif - pomme en mode agressif
            gradient.addColorStop(0, '#ff4757');
            gradient.addColorStop(1, '#ff002b');
        } else {
            // Mode normal
            gradient.addColorStop(0, '#ff6b81');
            gradient.addColorStop(1, '#ff4757');
        }
        
        // Dessiner la pomme
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x + gridSize/2, y + gridSize/2, gridSize/2 - 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Dessiner la tige
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x + gridSize/2 - 1, y + 2, 2, 5);
        
        // Dessiner la feuille
        ctx.fillStyle = '#2e8b57';
        ctx.beginPath();
        ctx.ellipse(x + gridSize/2 + 5, y + 5, 4, 2, Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
        
        // Effet de lueur externe (dépendant de la vitesse)
        const speedGlow = Math.min(1, appleSpeed / 15) * 2 + 2;
        ctx.strokeStyle = powerUpActive && powerUpType === 'opensource' ? '#ff4757' : '#ff6b81';
        ctx.lineWidth = speedGlow;
        ctx.beginPath();
        ctx.arc(x + gridSize/2, y + gridSize/2, gridSize/2, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Dessiner le serpent
    function drawSnake() {
        // Dessiner chaque segment du serpent
        for (let i = 0; i < snake.length; i++) {
            const segment = snake[i];
            const x = segment.x * gridSize;
            const y = segment.y * gridSize;
            
            // Gradient pour le serpent
            const gradient = ctx.createRadialGradient(
                x + gridSize/2, y + gridSize/2, 0,
                x + gridSize/2, y + gridSize/2, gridSize/2
            );
            
            // Tête du serpent
            if (i === 0) {
                gradient.addColorStop(0, '#00ff9d');
                gradient.addColorStop(1, '#00cc7a');
                
                // Dessiner les yeux
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(x + gridSize/2 - 3, y + gridSize/2 - 3, 2, 0, Math.PI * 2);
                ctx.arc(x + gridSize/2 + 3, y + gridSize/2 - 3, 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Dessiner la langue si le serpent est proche de la pomme
                const dx = Math.abs(segment.x - apple.x);
                const dy = Math.abs(segment.y - apple.y);
                if (dx + dy < 5) {
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x + gridSize/2, y + gridSize/2 + 5);
                    ctx.lineTo(x + gridSize/2 + 8, y + gridSize/2 + 8);
                    ctx.stroke();
                }
            } 
            // Corps du serpent
            else {
                const intensity = 1 - (i / snake.length) * 0.7;
                gradient.addColorStop(0, `rgb(0, ${Math.floor(255 * intensity)}, ${Math.floor(158 * intensity)})`);
                gradient.addColorStop(1, `rgb(0, ${Math.floor(204 * intensity)}, ${Math.floor(122 * intensity)})`);
            }
            
            // Dessiner le segment
            ctx.fillStyle = gradient;
            ctx.fillRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
            
            // Bordure du segment
            ctx.strokeStyle = '#007a49';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
        }
    }
    
    // Dessiner les objets spéciaux (plus grands)
    function drawPowerUps() {
        for (let powerUp of powerUps) {
            if (powerUp.collected) continue;
            
            const x = powerUp.x * gridSize;
            const y = powerUp.y * gridSize;
            const type = powerUp.type;
            
            // Effet de pulsation - plus grand
            const pulse = Math.sin(Date.now() / 300) * 3 + 3;
            const baseSize = (gridSize / 2) * type.sizeMultiplier;
            const size = baseSize + pulse;
            
            // Dessiner un cercle de fond
            ctx.fillStyle = type.color + '40';
            ctx.beginPath();
            ctx.arc(x + gridSize/2, y + gridSize/2, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Dessiner l'icône (plus grande)
            ctx.fillStyle = type.color;
            ctx.beginPath();
            ctx.arc(x + gridSize/2, y + gridSize/2, baseSize - 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Bordure
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + gridSize/2, y + gridSize/2, baseSize - 2, 0, Math.PI * 2);
            ctx.stroke();
            
            // Dessiner un symbole représentatif (plus grand)
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.fillText(type.symbol, x + gridSize/2, y + gridSize/2);
        }
    }
    
    // Basculer la pause
    function togglePause() {
        if (!gameStarted) return;
        
        gamePaused = !gamePaused;
        pauseButton.innerHTML = gamePaused ? 
            '<i class="fas fa-play"></i> Reprendre' : 
            '<i class="fas fa-pause"></i> Pause';
        
        if (gamePaused) {
            console.log("Jeu en pause");
        } else {
            console.log("Jeu repris");
            lastRenderTime = performance.now();
            lastAppleMoveTime = lastRenderTime;
            requestAnimationFrame(gameLoop);
        }
    }
    
    // Événements des boutons
    startButton.addEventListener('click', function() {
        console.log("Bouton Start cliqué");
        initGame();
    });
    
    playAgainButton.addEventListener('click', function() {
        console.log("Rejouer");
        gameOverScreen.style.display = 'none';
        initGame();
    });
    
    backToMenuButton.addEventListener('click', function() {
        console.log("Retour au menu");
        gameOverScreen.style.display = 'none';
        introScreen.style.display = 'flex';
        gameRunning = false;
        clearInterval(timerInterval);
    });
    
    pauseButton.addEventListener('click', togglePause);
    
    restartButton.addEventListener('click', function() {
        if (confirm("Voulez-vous vraiment redémarrer la partie ? Votre progression sera perdue.")) {
            console.log("Redémarrage du jeu");
            initGame();
        }
    });
    
    soundButton.addEventListener('click', function() {
        soundEnabled = !soundEnabled;
        soundButton.innerHTML = soundEnabled ? 
            '<i class="fas fa-volume-up"></i> Son' : 
            '<i class="fas fa-volume-mute"></i> Son';
        console.log("Son", soundEnabled ? "activé" : "désactivé");
    });
    
    // Initialisation de l'affichage
    updateDisplay();
    
    console.log("Jeu Snake Inversé prêt ! Cliquez sur 'COMMENCER LA RÉBELLION'");
});