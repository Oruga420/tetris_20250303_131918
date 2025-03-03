document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup with error handling
    const canvas = document.getElementById('tetris');
    if (!canvas) {
        console.error("Could not find tetris canvas element!");
        return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Could not get 2D context from tetris canvas!");
        return;
    }
    
    const nextPieceCanvas = document.getElementById('next-piece');
    if (!nextPieceCanvas) {
        console.error("Could not find next-piece canvas element!");
        return;
    }
    const nextPieceCtx = nextPieceCanvas.getContext('2d');
    if (!nextPieceCtx) {
        console.error("Could not get 2D context from next-piece canvas!");
        return;
    }
    
    // Game variables
    const BLOCK_SIZE = 30;
    const BOARD_WIDTH = 10;
    const BOARD_HEIGHT = 20;
    const COLORS = [
        null,
        '#FF0D72', // I
        '#0DC2FF', // J
        '#0DFF72', // L
        '#F538FF', // O
        '#FF8E0D', // S
        '#FFE138', // T
        '#3877FF'  // Z
    ];

    // Game state
    let board = createMatrix(BOARD_WIDTH, BOARD_HEIGHT);
    let player = {
        pos: {x: 0, y: 0},
        matrix: null,
        score: 0,
        lines: 0,
        level: 1,
        next: null
    };
    let dropCounter = 0;
    let dropInterval = 1000; // Start with 1 second
    let lastTime = 0;
    let gameOver = false;
    let isPaused = false;

    // DOM elements
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const gameOverElement = document.getElementById('game-over');
    const scoreElement = document.getElementById('score');
    const linesElement = document.getElementById('lines');
    const levelElement = document.getElementById('level');
    const finalScoreElement = document.getElementById('final-score');

    // Tetromino pieces
    const pieces = [
        // I
        [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        // J
        [
            [2, 0, 0],
            [2, 2, 2],
            [0, 0, 0]
        ],
        // L
        [
            [0, 0, 3],
            [3, 3, 3],
            [0, 0, 0]
        ],
        // O
        [
            [4, 4],
            [4, 4]
        ],
        // S
        [
            [0, 5, 5],
            [5, 5, 0],
            [0, 0, 0]
        ],
        // T
        [
            [0, 6, 0],
            [6, 6, 6],
            [0, 0, 0]
        ],
        // Z
        [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0]
        ]
    ];

    // Create a matrix (2D array) filled with zeros
    function createMatrix(width, height) {
        const matrix = [];
        for (let y = 0; y < height; y++) {
            matrix.push(Array(width).fill(0));
        }
        return matrix;
    }

    // Create a random piece
    function createPiece() {
        const index = Math.floor(Math.random() * pieces.length);
        return pieces[index];
    }

    // Draw a single square
    function drawBlock(x, y, color, context, size = BLOCK_SIZE) {
        context.fillStyle = color;
        context.fillRect(x * size, y * size, size, size);
        context.strokeStyle = '#222';
        context.strokeRect(x * size, y * size, size, size);
    }

    // Draw the board
    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw board
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                if (board[y][x] !== 0) {
                    drawBlock(x, y, COLORS[board[y][x]], ctx);
                }
            }
        }

        // Draw player piece
        if (player.matrix) {
            for (let y = 0; y < player.matrix.length; y++) {
                for (let x = 0; x < player.matrix[y].length; x++) {
                    if (player.matrix[y][x] !== 0) {
                        drawBlock(
                            x + player.pos.x, 
                            y + player.pos.y, 
                            COLORS[player.matrix[y][x]], 
                            ctx
                        );
                    }
                }
            }
        }
    }

    // Draw the next piece
    function drawNextPiece() {
        nextPieceCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        
        if (player.next) {
            const offsetX = (nextPieceCanvas.width / BLOCK_SIZE - player.next[0].length) / 2;
            const offsetY = (nextPieceCanvas.height / BLOCK_SIZE - player.next.length) / 2;
            
            for (let y = 0; y < player.next.length; y++) {
                for (let x = 0; x < player.next[y].length; x++) {
                    if (player.next[y][x] !== 0) {
                        drawBlock(
                            x + offsetX, 
                            y + offsetY, 
                            COLORS[player.next[y][x]], 
                            nextPieceCtx, 
                            BLOCK_SIZE * 0.8 // Slightly smaller blocks
                        );
                    }
                }
            }
        }
    }

    // Check for collision
    function collide(board, player) {
        const [m, o] = [player.matrix, player.pos];
        
        for (let y = 0; y < m.length; y++) {
            for (let x = 0; x < m[y].length; x++) {
                if (m[y][x] !== 0 && 
                    (board[y + o.y] === undefined || 
                     board[y + o.y][x + o.x] === undefined ||
                     board[y + o.y][x + o.x] !== 0)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // Merge player's tetromino with the board
    function merge(board, player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }

    // Rotate the player's tetromino
    function rotate(matrix, dir) {
        // Transpose the matrix
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < y; x++) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }

        // Reverse each row to get a rotated matrix
        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }

    // Player movement functions
    function playerMove(dir) {
        player.pos.x += dir;
        if (collide(board, player)) {
            player.pos.x -= dir;
        }
    }

    function playerDrop() {
        player.pos.y++;
        if (collide(board, player)) {
            player.pos.y--;
            merge(board, player);
            playerReset();
            clearLines();
            updateScore();
        }
        dropCounter = 0;
    }

    function playerHardDrop() {
        while (!collide(board, player)) {
            player.pos.y++;
        }
        player.pos.y--;
        merge(board, player);
        playerReset();
        clearLines();
        updateScore();
        dropCounter = 0;
    }

    function playerRotate(dir) {
        const pos = player.pos.x;
        let offset = 1;
        rotate(player.matrix, dir);
        
        // Handle wall kicks
        while (collide(board, player)) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > player.matrix[0].length) {
                rotate(player.matrix, -dir);
                player.pos.x = pos;
                return;
            }
        }
    }

    function playerReset() {
        // Use the next piece if available, otherwise create a new one
        player.matrix = player.next || createPiece();
        player.next = createPiece();
        player.pos.y = 0;
        player.pos.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(player.matrix[0].length / 2);
        
        // Check for game over
        if (collide(board, player)) {
            gameOver = true;
            finalScoreElement.textContent = player.score;
            gameOverElement.classList.remove('hidden');
        }
        
        drawNextPiece();
    }

    // Clear completed lines
    function clearLines() {
        let linesCleared = 0;
        
        outer: for (let y = board.length - 1; y >= 0; y--) {
            for (let x = 0; x < board[y].length; x++) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }
            
            // Remove the completed line and add an empty line at the top
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            y++; // Check the same row again
            linesCleared++;
        }
        
        return linesCleared;
    }

    // Update score and level
    function updateScore() {
        const linesCleared = clearLines();
        if (linesCleared > 0) {
            // Award points based on lines cleared
            player.lines += linesCleared;
            
            // Classic Tetris scoring system
            const linePoints = [40, 100, 300, 1200]; // 1, 2, 3, 4 lines
            player.score += linePoints[linesCleared - 1] * player.level;
            
            // Update level every 10 lines
            player.level = Math.floor(player.lines / 10) + 1;
            
            // Speed up as level increases (min 100ms)
            dropInterval = Math.max(100, 1000 - (player.level - 1) * 50);
            
            // Update UI
            scoreElement.textContent = player.score;
            linesElement.textContent = player.lines;
            levelElement.textContent = player.level;
        }
    }

    // Reset the game
    function resetGame() {
        board = createMatrix(BOARD_WIDTH, BOARD_HEIGHT);
        player.score = 0;
        player.lines = 0;
        player.level = 1;
        player.next = createPiece();
        gameOver = false;
        dropInterval = 1000;
        
        scoreElement.textContent = 0;
        linesElement.textContent = 0;
        levelElement.textContent = 1;
        
        gameOverElement.classList.add('hidden');
        
        playerReset();
    }

    // Game loop
    function update(time = 0) {
        if (gameOver || isPaused) {
            // Still draw the board even when paused/game over
            drawBoard();
            requestAnimationFrame(update);
            return;
        }
        
        try {
            const deltaTime = time - lastTime;
            lastTime = time;
            
            dropCounter += deltaTime;
            if (dropCounter > dropInterval) {
                playerDrop();
            }
            
            drawBoard();
            requestAnimationFrame(update);
        } catch (error) {
            console.error("Error in game loop:", error);
            // Try to continue despite errors
            requestAnimationFrame(update);
        }
    }

    // Event listeners
    document.addEventListener('keydown', event => {
        if (gameOver || isPaused) {
            if (event.key === 'p' || event.key === 'P') {
                isPaused = !isPaused;
                if (!isPaused) {
                    lastTime = 0;
                    update();
                }
            }
            return;
        }
        
        switch(event.key) {
            case 'ArrowLeft':
                playerMove(-1);
                break;
            case 'ArrowRight':
                playerMove(1);
                break;
            case 'ArrowDown':
                playerDrop();
                break;
            case 'ArrowUp':
                playerRotate(1);
                break;
            case ' ':
                playerHardDrop();
                break;
            case 'p':
            case 'P':
                isPaused = !isPaused;
                if (!isPaused) {
                    lastTime = 0;
                    update();
                }
                break;
        }
    });

    startButton.addEventListener('click', () => {
        try {
            console.log("Starting game...");
            resetGame();
            startButton.style.display = 'none';
            // Ensure lastTime is reset before starting the game loop
            lastTime = performance.now();
            update(lastTime);
            console.log("Game started successfully!");
        } catch (error) {
            console.error("Error starting the game:", error);
        }
    });

    restartButton.addEventListener('click', () => {
        resetGame();
        update();
    });

    // Initialize next piece preview
    player.next = createPiece();
    drawNextPiece();
    
    // Log successful initialization
    console.log("Tetris game initialized successfully!");
    
    // Initial draw to show game board before starting
    drawBoard();
});