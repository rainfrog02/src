// Firebase 設定
const firebaseConfig = {
    apiKey: "AIzaSyDGG-AcqMnIa7b5udFczx0tdoIoOmQuR7E",
    authDomain: "game0505-92146.firebaseapp.com",
    databaseURL: "https://game0505-92146-default-rtdb.firebaseio.com",
    projectId: "game0505-92146",
    storageBucket: "game0505-92146.firebasestorage.app",
    messagingSenderId: "368998789899",
    appId: "1:368998789899:web:49f620f1bb98c4fb84680e",
    measurementId: "G-5DGKVJDX09"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 遊戲變數
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake;
let apple;
let dx;
let dy;
let score;
let gameInterval;
let gameStartTime;
let gameRunning = false;

// HTML 元素
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const leaderboardScreen = document.getElementById("leaderboardScreen");
const finalScoreElement = document.getElementById("finalScore");
const playerNameInput = document.getElementById("playerName");
const submitScoreButton = document.getElementById("submitScore");
const leaderboardList = document.getElementById("leaderboard");
const restartButton = document.getElementById("restartButton");
const backToStartButton = document.getElementById("backToStart");

// 遊戲初始化
function initGame() {
    snake = [{ x: 10, y: 10 }];
    apple = { x: 5, y: 5 };
    dx = 1;
    dy = 0;
    score = 0;
    gameStartTime = Date.now();
}

// 遊戲迴圈
function gameLoop() {
    if (!gameRunning) return;

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    if (
        head.x < 0 || head.y < 0 ||
        head.x >= tileCount || head.y >= tileCount ||
        snake.some(segment => segment.x === head.x && segment.y === head.y)
    ) {
        gameOver();
        return;
    }

    snake.unshift(head);

    if (head.x === apple.x && head.y === apple.y) {
        score++;
        apple = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } else {
        snake.pop();
    }

    draw();
}

// 繪製遊戲畫面
function draw() {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "lime";
    snake.forEach(segment => {
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
    });

    ctx.fillStyle = "red";
    ctx.fillRect(apple.x * gridSize, apple.y * gridSize, gridSize - 2, gridSize - 2);
}

// 遊戲結束
function gameOver() {
    gameRunning = false;
    clearInterval(gameInterval);
    finalScoreElement.textContent = score;
    gameOverScreen.style.display = "flex";
}

// 開始遊戲
function startGame() {
    initGame();
    startScreen.style.display = "none";
    gameOverScreen.style.display = "none";
    leaderboardScreen.style.display = "none";
    gameRunning = true;
    gameInterval = setInterval(gameLoop, 100);
}

// 提交分數到 Firebase
function submitScore() {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert("請輸入玩家名稱！");
        return;
    }

    const playTime = Math.floor((Date.now() - gameStartTime) / 1000); // 遊戲時間（秒）
    const timestamp = Date.now(); // 儲存時間戳記

    const scoresRef = database.ref('scores');
    const newScoreRef = scoresRef.push();
    newScoreRef.set({
        name: playerName,
        score: score,
        time: playTime,
        timestamp: timestamp
    })
    .then(() => {
        alert("分數已提交！");
        gameOverScreen.style.display = "none";
        showLeaderboard();
    })
    .catch(error => {
        console.error("Error saving score to Firebase:", error);
        alert("儲存分數失敗，請稍後再試。");
    });
}

// 顯示排行榜
function showLeaderboard() {
    leaderboardList.innerHTML = ''; // 清空排行榜
    const scoresRef = database.ref('scores');

    scoresRef.orderByChild('score').limitToLast(10).once('value', (snapshot) => {
        const scores = snapshot.val();
        if (scores) {
            const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b.score - a.score); // 降序排列
            sortedScores.forEach(([key, data]) => {
                const li = document.createElement('li');
                li.textContent = `${data.name}: ${data.score} 分 - ${data.time} 秒`;
                leaderboardList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = "目前沒有任何分數。";
            leaderboardList.appendChild(li);
        }
        leaderboardScreen.style.display = "flex";
    });
}

// 事件監聽
document.addEventListener("keydown", e => {
    if (!gameRunning) return;
    switch (e.key) {
        case "ArrowUp": if (dy === 0) { dx = 0; dy = -1; } break;
        case "ArrowDown": if (dy === 0) { dx = 0; dy = 1; } break;
        case "ArrowLeft": if (dx === 0) { dx = -1; dy = 0; } break;
        case "ArrowRight": if (dx === 0) { dx = 1; dy = 0; } break;
    }
});

submitScoreButton.addEventListener("click", submitScore);
restartButton.addEventListener("click", startGame);
backToStartButton.addEventListener("click", () => {
    leaderboardScreen.style.display = "none";
    startScreen.style.display = "flex";
});