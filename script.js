document.addEventListener('DOMContentLoaded', () => {
    // 獲取DOM元素
    const startScreen = document.getElementById('startScreen');
    const gameScreen = document.getElementById('gameScreen');
    const startButton = document.getElementById('startButton');
    const worryInputs = [
        document.getElementById('worry1'),
        document.getElementById('worry2'),
        document.getElementById('worry3')
    ];
    const narrationText = document.getElementById('narration');
    const hintText = document.getElementById('hint');
    const player = document.getElementById('player');
    const enemiesContainer = document.getElementById('enemiesContainer');
    const playerBody = player.querySelector('.player-body'); // 獲取主角身體，用於眼睛移動
    const playerMouth = player.querySelector('.player-mouth'); // 新增：獲取主角嘴巴元素


    let currentWorries = []; // 用來儲存玩家輸入的煩惱
    let gameStartTime = null; // 遊戲開始時間（毫秒）
    let gameEndTime = null;   // 遊戲結束時間（毫秒）
    let playerName = "";      // 玩家名稱

    // 遊戲參數設定 (可自行調整這些值來改變遊戲體驗)
    const ENEMY_SIZE = 60; // 第一階段敵人寬高，需與 style.css 中的 .enemy 保持一致
    const BORDER_BUFFER = 20; // 敵人初始生成時，離開畫面邊緣的緩衝區 (像素)

    // 第一階段敵人參數
    const TOTAL_ENEMIES_LEVEL_3 = 35; // 第一階段煩惱（程度3）的總數
    const ENEMY_SPAWN_INTERVAL = 1000; // 第一階段每個敵人出現的間隔時間（毫秒）
    const PLAYER_CLOSE_DISTANCE = 50; // 敵人與主角多近時算接觸（單位：像素），會被移除

    // 第二階段敵人參數
    const TOTAL_ENEMIES_LEVEL_2 = 40; // 第二階段煩惱（程度2）的總數
    const ENEMY_SPAWN_INTERVAL_STAGE2 = 800; // 第二階段敵人出現的間隔時間（毫秒）
    const BULLET_SPEED = 15; // 子彈移動速度
    const BULLET_SIZE = 10; // 子彈大小 (需與 style.css 中 .bullet 的 width/height 保持一致)
    const STAGE_TRANSITION_DELAY = 5000; // 階段轉換的等待時間（毫秒），例如 5 秒
    const PLAYER_ATTACK_COOLDOWN = 100; // 攻擊冷卻時間（毫秒），避免連發過快

    // 第三階段參數 (新增)
    const TOTAL_ENEMIES_LEVEL_1_SMALL = 20; // 第三階段小敵人數量
    const ENEMY_SPAWN_INTERVAL_STAGE3 = 1000; // 第三階段敵人生成間隔
    const PLAYER_MOVE_SPEED = 5; // 主角移動速度
    const PLAYER_HIT_COOLDOWN = 200; // 主角打擊敵人的時間間隔 (毫秒) (新增)
    const HIT_FORCE = 30; // 敵人被打飛的初始速度（像素/幀）
    // const BOSS_TELEPORT_INTERVAL = 2000; // Boss 瞬移間隔（毫秒）  <-- 移除 Boss 邏輯
    // const BOSS_HIT_EFFECT_DURATION = 1000; // Boss 被打飛後的特效持續時間（毫秒） <-- 移除 Boss 邏輯

    let currentStage = 1; // 追蹤當前遊戲階段，1為第一階段，2為第二階段，3為第三階段
    let enemiesGeneratedCount = 0; // 第一階段已生成的敵人總數
    let spawnIntervalId = null;   // 第一階段的生成計時器ID
    let enemiesGeneratedCountStage2 = 0; // 第二階段已生成的敵人總數
    let spawnIntervalIdStage2 = null; // 第二階段的生成計時器ID
    let lastAttackTime = 0; // 上次子彈攻擊的時間戳記，用於子彈冷卻
    let lastHitTime = 0; // 上次主角打擊敵人的時間戳記，用於打擊冷卻 (新增)

    let currentMouseX = 0; // 追蹤鼠標的當前 X 座標
    let currentMouseY = 0; // 追蹤鼠標的當前 Y 座標

    // 主角移動狀態 (新增)
    let keysPressed = {}; // 記錄按下的鍵
    let playerX = 0; // 主角實時X座標
    let playerY = 0; // 主角實時Y座標
    let animationFrameId = null; // 儲存 requestAnimationFrame ID (新增)

    let enemiesGeneratedCountStage3 = 0; // 第三階段已生成的小敵人總數 (新增)
    let spawnIntervalIdStage3 = null; // 第三階段生成計時器ID (新增)
    // let bossEnemy = null; // 追蹤 Boss 敵人元素 (新增) <-- 移除 Boss 邏輯
    // let isBossDefeated = false; // Boss 是否已被擊敗 (新增) <-- 移除 Boss 邏輯
    // let bossTeleportIntervalId = null; // Boss 瞬移計時器ID (新增) <-- 移除 Boss 邏輯


    // ===== 開始按鈕點擊事件 =====
    startButton.addEventListener('click', () => {
        // 收集玩家輸入的煩惱
        currentWorries = worryInputs.map(input => input.value.trim()).filter(value => value !== '');
        playerName = prompt("請輸入你的名字：", "玩家");
        gameStartTime = Date.now();
        // 如果沒有輸入任何煩惱，可以給一個預設值或提示
        if (currentWorries.length === 0) {
            currentWorries = ["終極煩惱", "中等煩惱", "輕微煩惱"]; // 預設值，按程度排序
            alert("您沒有輸入任何煩惱，將使用預設煩惱進行遊戲！");
        }
        // 確保至少有3個煩惱，如果不足，則補齊
        while (currentWorries.length < 3) {
            currentWorries.push(`預設煩惱 ${currentWorries.length + 1}`);
        }

        // 切換到遊戲畫面
        startScreen.classList.remove('active');
        gameScreen.classList.add('active');

        // 初始化主角位置到中心 (第三階段需要)
        playerX = gameScreen.offsetWidth / 2 - player.offsetWidth / 2;
        playerY = gameScreen.offsetHeight / 2 - player.offsetHeight / 2;
        player.style.left = `${playerX}px`;
        player.style.top = `${playerY}px`;
        player.style.position = 'absolute'; // 確保可以移動

        // ==== 關鍵修改：鼠標移動事件監聽器在這裡啟用 ====
        gameScreen.addEventListener('mousemove', playerEyeControl);

        // 設置遊戲初始文字
        narrationText.textContent = "雖然不嚴重...但擺在那邊就是很煩🙄 這邊建議直接送它下線💥";
        hintText.textContent = "提示：用鼠標點爆敵人！💥";

        // 延遲3秒後開始分批生成第一階段敵人 (給玩家一個準備時間)
        setTimeout(() => {
            // 從程度3的煩惱中選取一個作為敵人名稱
            const worryToSpawn = currentWorries[2]; // 程度3的煩惱
            startSpawningEnemies(worryToSpawn);
        }, 3000);
    }); // 關閉 DOMContentLoaded 事件處理器

    // ===== 鼠標移動事件：控制主角眼睛 **AND** 追蹤鼠標座標 =====
    // 這個事件監聽器現在已被移到 startButton 的點擊事件中啟用
    function playerEyeControl(e) {
        // 在這裡加入一個檢查，確保 playerBody 存在才執行，增強健壯性
        if (!playerBody) {
            console.warn("playerBody 尚未定義，無法控制眼睛。");
            return;
        }

        // 只有在第一階段或第二階段才讓眼睛跟隨鼠標
        if (currentStage === 1 || currentStage === 2) {
            const playerRect = player.getBoundingClientRect();
            const playerCenterX = playerRect.left + playerRect.width / 2;
            const playerCenterY = playerRect.top + playerRect.height / 2;

            const mouseX = e.clientX;
            const mouseY = e.clientY;

            const dx = mouseX - playerCenterX;
            const dy = mouseY - playerCenterY;

            const angle = Math.atan2(dy, dx);
            const eyeMovementRange = 5;
            const eyeOffsetX = Math.cos(angle) * eyeMovementRange;
            const eyeOffsetY = Math.sin(angle) * eyeMovementRange;

            playerBody.querySelectorAll('.player-eye').forEach(eye => {
                eye.style.transform = `translate(${eyeOffsetX}px, ${eyeOffsetY}px)`;
            });
        } else {
            // 第三階段時，眼睛固定
            playerBody.querySelectorAll('.player-eye').forEach(eye => {
                eye.style.transform = `translate(0px, 0px)`;
            });
        }


        currentMouseX = e.clientX;
        currentMouseY = e.clientY;
    }

    // ===== 第一階段敵人生成與分批出現控制 =====

    // 開始分批生成第一階段敵人的函數
    function startSpawningEnemies(worryText) {
        enemiesGeneratedCount = 0; // 每次開始新一輪生成時重置計數

        // 如果有舊的計時器，先清除，避免重複生成
        if (spawnIntervalId) { // 這裡的 spawnIntervalId 應該已經被 let 宣告
            clearInterval(spawnIntervalId);
        }

        // 設置定時器，每隔 ENEMY_SPAWN_INTERVAL 毫秒生成一個敵人
        spawnIntervalId = setInterval(() => {
            // 如果已生成的敵人數量還沒達到總數
            if (enemiesGeneratedCount < TOTAL_ENEMIES_LEVEL_3) {
                generateSingleEnemy(worryText); // 生成一個單獨的敵人
                enemiesGeneratedCount++; // 已生成敵人計數增加
            } else {
                // 所有敵人已生成完畢，停止計時器
                clearInterval(spawnIntervalId);
                spawnIntervalId = null; // 清除ID
                checkGameProgress(); // 生成結束後檢查進度
            }
        }, ENEMY_SPAWN_INTERVAL);
    }

    // 生成單個第一階段敵人的函數
    function generateSingleEnemy(worryText) {
        const enemy = document.createElement('div');
        enemy.classList.add('enemy'); // 預設就是第一階段敵人
        enemy.textContent = worryText; // 顯示程度3的煩惱名稱

        const gameWidth = gameScreen.offsetWidth; // 遊戲畫面寬度
        const gameHeight = gameScreen.offsetHeight; // 遊戲畫面高度

        let startX, startY;
        const side = Math.floor(Math.random() * 4); // 隨機選擇從哪條邊緣出現 (0: top, 1: right, 2: bottom, 3: left)

        // 根據選擇的邊緣計算起始位置，確保敵人完全在畫面外
        switch (side) {
            case 0: // 從上方邊緣出現
                startX = Math.random() * (gameWidth - ENEMY_SIZE); // 隨機 X 軸位置
                startY = -ENEMY_SIZE - BORDER_BUFFER; // 在畫面頂部之外
                break;
            case 1: // 從右方邊緣出現
                startX = gameWidth + BORDER_BUFFER; // 在畫面右側之外
                startY = Math.random() * (gameHeight - ENEMY_SIZE); // 隨機 Y 軸位置
                break;
            case 2: // 從下方邊緣出現
                startX = Math.random() * (gameWidth - ENEMY_SIZE); // 隨機 X 軸位置
                startY = gameHeight + BORDER_BUFFER; // 在畫面底部之外
                break;
            case 3: // 從左方邊緣出現
                startX = -ENEMY_SIZE - BORDER_BUFFER; // 在畫面左側之外
                startY = Math.random() * (gameHeight - ENEMY_SIZE); // 隨機 Y 軸位置
                break;
        }

        enemy.style.left = `${startX}px`;
        enemy.style.top = `${startY}px`;

        enemiesContainer.appendChild(enemy); // 將敵人添加到遊戲畫面中

        // 敵人移動邏輯 (使用 requestAnimationFrame 實現流暢動畫)
        const moveEnemy = () => {
            // 如果敵人已經被移除（例如被點擊），則停止移動
            if (!enemy.parentElement) return;

            const enemyRect = enemy.getBoundingClientRect(); // 敵人當前位置和大小
            const playerRect = player.getBoundingClientRect(); // 主角當前位置和大小

            // 計算主角和敵人的中心點
            const playerCenterX = playerRect.left + playerRect.width / 2;
            const playerCenterY = playerRect.top + playerRect.height / 2;
            const enemyCenterX = enemyRect.left + enemyRect.width / 2;
            const enemyCenterY = enemyRect.top + enemyRect.height / 2;

            // 計算敵人到主角的向量和距離
            const dx = playerCenterX - enemyCenterX;
            const dy = playerCenterY - enemyCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 調整敵人的移動速度
            const baseSpeed = 0.5; // 基本移動速度
            // 速度可以根據已生成敵人的數量來調整，例如，後期敵人會稍微快一點
            const speed = baseSpeed + (enemiesGeneratedCount / TOTAL_ENEMIES_LEVEL_3) * 0.3;

            // 計算新的敵人位置 (除以 60 模擬每秒 60 幀)
            let newX = enemy.offsetLeft + dx * speed / 60;
            let newY = enemy.offsetTop + dy * speed / 60;

            // 加入亂飄效果 (隨機的小範圍偏移，讓移動更自然)
            const driftMagnitude = 2; // 亂飄幅度
            newX += (Math.random() - 0.5) * driftMagnitude;
            newY += (Math.random() - 0.5) * driftMagnitude;

            enemy.style.left = `${newX}px`;
            enemy.style.top = `${newY}px`;

            // 判斷敵人是否與主角足夠接近，如果是則移除敵人 (表示被煩惱纏繞)
            if (distance < PLAYER_CLOSE_DISTANCE) {
                enemy.remove();
                // 這裡可以添加主角被煩惱纏繞後的負面視覺效果或遊戲懲罰
                // 例如：player.classList.add('distressed'); setTimeout(() => player.classList.remove('distressed'), 500);
                checkGameProgress(); // 敵人被移除後，檢查遊戲進度
            }

            requestAnimationFrame(moveEnemy); // 請求下一幀動畫
        };

        requestAnimationFrame(moveEnemy); // 開始移動動畫
    }

    // ===== 第二階段敵人生成與分批出現控制 =====

    // 開始分批生成第二階段敵人的函數
    function startSpawningEnemiesStage2(worryText) {
        enemiesGeneratedCountStage2 = 0; // 重置計數

        if (spawnIntervalIdStage2) {
            clearInterval(spawnIntervalIdStage2);
        }

        spawnIntervalIdStage2 = setInterval(() => {
            if (enemiesGeneratedCountStage2 < TOTAL_ENEMIES_LEVEL_2) {
                generateSingleEnemyStage2(worryText); // 生成第二階段敵人
                enemiesGeneratedCountStage2++;
            } else {
                clearInterval(spawnIntervalIdStage2);
                spawnIntervalIdStage2 = null; // 清除ID
                checkGameProgress(); // 生成結束後檢查進度
            }
        }, ENEMY_SPAWN_INTERVAL_STAGE2);
    }

    // 生成單個第二階段敵人的函數
    function generateSingleEnemyStage2(worryText) {
        const enemy = document.createElement('div');
        enemy.classList.add('enemy', 'type2'); // 新增 type2 class 來定義第二階段敵人樣式
        enemy.textContent = worryText;

        const gameWidth = gameScreen.offsetWidth;
        const gameHeight = gameScreen.offsetHeight;
        const enemySize = 80; // 第二階段敵人可以設定更大一點，需配合 CSS 中的三角形大小
        const minPlayerDistance = 150; // 確保敵人不會在主角周圍生成 (像素)

        let startX, startY;
        let validPositionFound = false;

        // 嘗試多次找到有效位置，避免敵人太靠近主角
        for (let i = 0; i < 50; i++) {
            startX = Math.random() * (gameWidth - enemySize);
            startY = Math.random() * (gameHeight - enemySize);

            // 檢查是否太靠近主角
            const playerRect = player.getBoundingClientRect();
            const playerCenterX = playerRect.left + playerRect.width / 2;
            const playerCenterY = playerRect.top + playerRect.height / 2;

            const enemyCenterX = startX + enemySize / 2;
            const enemyCenterY = startY + enemySize / 2;

            const distanceToPlayer = Math.sqrt(
                Math.pow(enemyCenterX - playerCenterX, 2) +
                Math.pow(enemyCenterY - playerCenterY, 2)
            );

            if (distanceToPlayer > minPlayerDistance) {
                validPositionFound = true;
                break; // 找到有效位置就跳出循環
            }
        }

        // 如果嘗試多次仍找不到有效位置，就強制生成一個隨機位置 (避免卡死)
        if (!validPositionFound) {
            startX = Math.random() * (gameWidth - enemySize);
            startY = Math.random() * (gameHeight - enemySize);
        }

        enemy.style.left = `${startX}px`;
        enemy.style.top = `${startY}px`;

        enemiesContainer.appendChild(enemy);

        // 第二階段敵人不移動，只原地旋轉晃動
        const rotateEnemy = () => {
            if (!enemy.parentElement || enemy.classList.contains('enemy-destroyed')) return; // 敵人不存在或已被摧毀，停止動畫

            // 隨機小幅旋轉
            // parseFloat(enemy.dataset.rotation || 0) 用來獲取上次儲存的角度，如果沒有則從 0 開始
            const rotation = parseFloat(enemy.dataset.rotation || 0) + (Math.random() - 0.5) * 2; // 每次旋轉 -1 到 1 度
            enemy.style.transform = `rotate(${rotation}deg)`;
            enemy.dataset.rotation = rotation; // 儲存當前旋轉角度，方便下次使用

            // 隨機小幅位移，模擬晃動
            const wobbleX = (Math.random() - 0.5) * 0.5; // 每次晃動 -0.25 到 0.25 像素
            const wobbleY = (Math.random() - 0.5) * 0.5;
            enemy.style.left = `${parseFloat(enemy.style.left) + wobbleX}px`;
            enemy.style.top = `${parseFloat(enemy.style.top) + wobbleY}px`;

            requestAnimationFrame(rotateEnemy);
        };
        requestAnimationFrame(rotateEnemy); // 開始旋轉晃動動畫
    }

    // ===== 敵人點擊事件 (事件委託，處理第一階段敵人) =====
    enemiesContainer.addEventListener('click', (e) => {
        // 只處理第一階段敵人（沒有 'type2' 或 'type1' class 的敵人）
        if (e.target.classList.contains('enemy') && !e.target.classList.contains('type2') && !e.target.classList.contains('type1')) {
            const clickedEnemy = e.target;
            // 為敵人添加過渡效果，確保只在點擊時生效
            clickedEnemy.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

            // 添加 'enemy-destroyed' 類別，觸發 CSS 中定義的破碎動畫
            clickedEnemy.classList.add('enemy-destroyed');

            // 在動畫結束後移除敵人元素並檢查遊戲進度
            clickedEnemy.addEventListener('transitionend', () => {
                clickedEnemy.remove(); // 從 DOM 中移除敵人
                checkGameProgress(); // 檢查遊戲是否結束或進入下一階段
            }, { once: true }); // { once: true } 確保這個事件監聽器只會觸發一次，然後自動移除
        }
    });

    // ===== 鍵盤事件：發射子彈 (處理第二階段敵人) =====
    document.addEventListener('keydown', (e) => {
        // 只有在第二階段 (currentStage === 2) 且按下空白鍵 (e.code === 'Space') 時才發射
        if (e.code === 'Space' && currentStage === 2) {
            const now = Date.now(); // 獲取當前時間戳記，用於冷卻時間判斷
            // 判斷是否過了攻擊冷卻時間 (PLAYER_ATTACK_COOLDOWN)
            if (now - lastAttackTime > PLAYER_ATTACK_COOLDOWN) {
                lastAttackTime = now; // 更新上次攻擊時間
                shootBullet(currentMouseX, currentMouseY); // 調用發射子彈函數，目標是鼠標位置
                // 主角嘴巴變形為攻擊狀態
                playerMouth.style.width = '20px';
                playerMouth.style.height = '3px';
                playerMouth.style.borderRadius = '2px';
                playerMouth.style.transform = 'translateX(-50%) translateY(5px)'; // 稍微下移變平
                player.classList.add('attacking'); // 添加 attacking class
                setTimeout(() => {
                    // 恢復嘴巴到默認狀態 (或者在鼠標移動時自動恢復)
                    playerMouth.style.width = '25px';
                    playerMouth.style.height = '5px';
                    playerMouth.style.borderRadius = '2px';
                    playerMouth.style.transform = 'translateX(-50%)';
                    player.classList.remove('attacking'); // 移除 attacking class
                }, 150); // 短暫維持攻擊狀態
            }
        }
        // 第三階段的 Enter 鍵處理
    
        // 阻止默認行為，避免滾動頁面等 (移到 handleKeyDown)
        if (['Space', 'Enter', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }
    });

    // ===== 子彈發射與碰撞處理函數 =====

    // 發射子彈的函數
    function shootBullet(targetX, targetY) {
        // 創建子彈元素
        const bullet = document.createElement('div');
        bullet.classList.add('bullet'); // 添加 CSS 樣式類別

        // 子彈從主角的中心位置發射
        const playerRect = player.getBoundingClientRect(); // 獲取主角的尺寸和位置
        const playerCenterX = playerRect.left + playerRect.width / 2;
        const playerCenterY = playerRect.top + playerRect.height / 2;

        // 設定子彈的初始位置 (要考慮子彈大小，使其中心與主角中心對齊)
        bullet.style.left = `${playerCenterX - BULLET_SIZE / 2}px`;
        bullet.style.top = `${playerCenterY - BULLET_SIZE / 2}px`;

        // 將子彈添加到敵人容器中 (確保與敵人同層，便於管理和碰撞檢測)
        enemiesContainer.appendChild(bullet);

        // 計算子彈的移動方向向量
        const dx = targetX - playerCenterX; // 目標 X (鼠標X) - 主角中心X
        const dy = targetY - playerCenterY; // 目標 Y (鼠標Y) - 主角中心Y
        const distance = Math.sqrt(dx * dx + dy * dy); // 計算距離，用於向量正規化

        // 正規化方向向量 (將向量長度變為 1，這樣乘以速度就是實際移動量)
        const directionX = dx / distance;
        const directionY = dy / distance;

        // 子彈移動邏輯 (使用 requestAnimationFrame 實現平滑動畫)
        const moveBullet = () => {
            // 如果子彈已經被移除 (例如擊中敵人或超出畫面)，則停止移動
            if (!bullet.parentElement) return;

            // 更新子彈位置
            let bulletX = parseFloat(bullet.style.left);
            let bulletY = parseFloat(bullet.style.top);

            bulletX += directionX * BULLET_SPEED; // 沿 X 方向移動
            bulletY += directionY * BULLET_SPEED; // 沿 Y 方向移動

            bullet.style.left = `${bulletX}px`;
            bullet.style.top = `${bulletY}px`;

            // 檢查子彈是否超出遊戲畫面邊界，超出則移除
            if (bulletX < -BULLET_SIZE || bulletX > gameScreen.offsetWidth + BULLET_SIZE ||
                bulletY < -BULLET_SIZE || bulletY > gameScreen.offsetHeight + BULLET_SIZE) {
                bullet.remove(); // 移除子彈元素
                return; // 停止這個子彈的動畫循環
            }

            // 碰撞檢測：子彈與第二階段敵人 (只檢查 type2 敵人)
            const enemiesStage2 = enemiesContainer.querySelectorAll('.enemy.type2'); // 獲取所有第二階段敵人
            enemiesStage2.forEach(enemy => {
                // 如果敵人已經被移除或正在被擊毀，則跳過
                if (!enemy.parentElement || enemy.classList.contains('enemy-destroyed')) return;

                const bulletRect = bullet.getBoundingClientRect(); // 子彈的矩形邊界
                const enemyRect = enemy.getBoundingClientRect();   // 敵人的矩形邊界

                // 執行矩形之間的碰撞檢測 (AABB 碰撞檢測)
                if (bulletRect.left < enemyRect.right &&
                    bulletRect.right > enemyRect.left &&
                    bulletRect.top < enemyRect.bottom &&
                    bulletRect.bottom > enemyRect.top) {

                    // 發生碰撞
                    bullet.remove(); // 移除子彈
                    hitEnemyStage2(enemy); // 調用處理敵人被擊中的函數
                    return; // 子彈已消失，停止對這個子彈的進一步檢查，防止對多個敵人產生效果
                }
            });

            requestAnimationFrame(moveBullet); // 請求下一幀動畫
        };
        requestAnimationFrame(moveBullet); // 開始子彈的移動動畫
    }

    // 第二階段敵人被擊中後處理破碎動畫的函數
    function hitEnemyStage2(enemy) {
        // 為敵人添加過渡效果，確保動畫生效 (與之前點擊第一階段敵人的邏輯類似)
        enemy.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
        enemy.classList.add('enemy-destroyed'); // 添加 CSS 類別來觸發破碎動畫

        // 在動畫結束後移除敵人元素並檢查遊戲進度
        enemy.addEventListener('transitionend', () => {
            enemy.remove(); // 移除敵人元素
            checkGameProgress(); // 檢查遊戲是否結束或進入下一階段
        }, { once: true }); // { once: true } 確保這個事件監聽器只觸發一次
    }

    // ===== 主角移動控制 (第三階段專用) =====
    function startPlayerMovement() {
        // 確保移除舊的鍵盤監聽，避免重複
        // 這裡不需要移除，因為它們是 document 級別的，會在 DOMContentLoaded 後一直存在
        // 只需要確保 gameLoop 根據 currentStage 是否移動主角
        // document.removeEventListener('keydown', handleKeyDown);
        // document.removeEventListener('keyup', handleKeyUp);

        // document.addEventListener('keydown', handleKeyDown); // 這些應該在 DOMContentLoaded 內一次性綁定
        // document.addEventListener('keyup', handleKeyUp);


        // 開始遊戲循環來更新主角位置
        if (animationFrameId) cancelAnimationFrame(animationFrameId); // 如果有舊的循環，先停止
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    // 將鍵盤事件監聽器移到這裡，確保一開始就綁定
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);


    function handleKeyDown(e) {
        keysPressed[e.code] = true;
        // 阻止默認行為，避免滾動頁面等
        if (['Space', 'Enter', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }
    }

    function handleKeyUp(e) {
        keysPressed[e.code] = false;
    }

    function gameLoop() {
        // 在第三階段才允許主角移動
        if (currentStage === 3) {
            let newPlayerX = playerX;
            let newPlayerY = playerY;

            // 移動邏輯
            if (keysPressed['KeyW'] || keysPressed['ArrowUp']) {
                newPlayerY -= PLAYER_MOVE_SPEED;
            }
            if (keysPressed['KeyS'] || keysPressed['ArrowDown']) {
                newPlayerY += PLAYER_MOVE_SPEED;
            }
            if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) {
                newPlayerX -= PLAYER_MOVE_SPEED;
            }
            if (keysPressed['KeyD'] || keysPressed['ArrowRight']) {
                newPlayerX += PLAYER_MOVE_SPEED;
            }

            // 邊界限制
            const playerRect = player.getBoundingClientRect();
            newPlayerX = Math.max(0, Math.min(newPlayerX, gameScreen.offsetWidth - playerRect.width));
            newPlayerY = Math.max(0, Math.min(newPlayerY, gameScreen.offsetHeight - playerRect.height));

            playerX = newPlayerX;
            playerY = newPlayerY;

            player.style.left = `${playerX}px`;
            player.style.top = `${playerY}px`;

            // 碰撞檢測 (主角與第三階段小敵人)
            const now = Date.now();
            const playerRectUpdated = player.getBoundingClientRect(); // 更新主角實際位置
            const playerCenterX = playerRectUpdated.left + playerRectUpdated.width / 2;
            const playerCenterY = playerRectUpdated.top + playerRectUpdated.height / 2;

            enemiesContainer.querySelectorAll('.enemy.type1').forEach(enemy => {
                // 如果敵人已經在被銷毀狀態，跳過
                if (enemy.classList.contains('enemy-destroyed')) return;

                const enemyRect = enemy.getBoundingClientRect();
                const enemyCenterX = enemyRect.left + enemyRect.width / 2;
                const enemyCenterY = enemyRect.top + enemyRect.height / 2;

                const distance = Math.sqrt(
                    Math.pow(playerCenterX - enemyCenterX, 2) +
                    Math.pow(playerCenterY - enemyCenterY, 2)
                );

                // 判斷碰撞距離
                if (distance < (playerRectUpdated.width / 2 + enemyRect.width / 2) * 0.8) {
                    if ((keysPressed['Enter'] || keysPressed['NumpadEnter']) && (now - lastHitTime > PLAYER_HIT_COOLDOWN)) {
                        lastHitTime = now;
                        // 觸發主角攻擊動畫/表情
                        player.classList.add('attacking');
                        playerMouth.style.width = '20px';
                        playerMouth.style.height = '3px';
                        playerMouth.style.borderRadius = '2px';
                        playerMouth.style.transform = 'translateX(-50%) translateY(5px)';
                        setTimeout(() => {
                            player.classList.remove('attacking');
                            playerMouth.style.width = '25px';
                            playerMouth.style.height = '5px';
                            playerMouth.style.borderRadius = '2px';
                            playerMouth.style.transform = 'translateX(-50%)';
                        }, 200);

                        // 直接破碎消失
                        enemy.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
                        enemy.classList.add('enemy-destroyed');
                        enemy.addEventListener('transitionend', () => {
                            enemy.remove();
                            checkGameProgress();
                        }, { once: true });
                    }
                }
            }); // <--- forEach 結束

        }
        animationFrameId = requestAnimationFrame(gameLoop); // 請求下一幀動畫
    }

    // ===== 第三階段敵人生成與打飛邏輯 (新增) =====

    // 開始分批生成第三階段小敵人的函數
    function startSpawningEnemiesStage3(worryText) {
        enemiesGeneratedCountStage3 = 0;
        if (spawnIntervalIdStage3) {
            clearInterval(spawnIntervalIdStage3);
        }

        spawnIntervalIdStage3 = setInterval(() => {
            // Boss 已經被移除，或者所有小怪都已經生成並移除
            const remainingType1Enemies = enemiesContainer.querySelectorAll('.enemy.type1').length;
            if (enemiesGeneratedCountStage3 >= TOTAL_ENEMIES_LEVEL_1_SMALL && remainingType1Enemies === 0) {
                 clearInterval(spawnIntervalIdStage3);
                 spawnIntervalIdStage3 = null;
                 checkGameProgress(); // 檢查遊戲進度，觸發勝利
                 return;
            }

            // 生成小怪，如果小怪數量還沒達到上限
            if (enemiesGeneratedCountStage3 < TOTAL_ENEMIES_LEVEL_1_SMALL) {
                generateSingleEnemyStage3(worryText);
                enemiesGeneratedCountStage3++;
            } else {
                // 所有小怪都已生成，但可能還沒全部被打飛
                // 這裡繼續讓 interval 運行，直到所有小怪都消失
                // 但不再生成新的小怪
            }
        }, ENEMY_SPAWN_INTERVAL_STAGE3);

        // 如果還沒有 Boss 並且所有小怪都已生成，就生成 Boss
        // Boss 也是 Type1 敵人，只是外觀不同
        if (enemiesGeneratedCountStage3 >= TOTAL_ENEMIES_LEVEL_1_SMALL && enemiesContainer.querySelectorAll('.enemy.type1.boss').length === 0) {
            generateSpecialEnemyType1(currentWorries[0]); // 使用程度1煩惱作為大敵人
        }
    }


    // 生成單個第三階段小敵人的函數
    function generateSingleEnemyStage3(worryText) {
        const enemy = document.createElement('div');
        enemy.classList.add('enemy', 'type1'); // 第三階段敵人類別
        enemy.textContent = worryText;

        const gameWidth = gameScreen.offsetWidth;
        const gameHeight = gameScreen.offsetHeight;
        const enemySize = 100; // 需與 CSS 中的 type1 寬高一致
        const playerRect = player.getBoundingClientRect(); // 用於避開主角初始位置


        let startX, startY;
        // 嘗試在遠離主角的位置生成敵人
        for (let i = 0; i < 50; i++) {
            startX = Math.random() * (gameWidth - enemySize);
            startY = Math.random() * (gameHeight - enemySize);
            const dist = Math.sqrt(Math.pow(startX - playerRect.left, 2) + Math.pow(startY - playerRect.top, 2));
            if (dist > 200) break; // 距離主角 200px 以上
        }

        enemy.style.left = `${startX}px`;
        enemy.style.top = `${startY}px`;
        enemiesContainer.appendChild(enemy);

        // 敵人隨機走動邏輯
        let currentEnemyX = startX;
        let currentEnemyY = startY;
        let targetX = Math.random() * (gameWidth - enemySize);
        let targetY = Math.random() * (gameHeight - enemySize);
        const moveSpeed = 0.8; // 敵人移動速度

        const moveEnemy = () => {
            if (!enemy.parentElement || enemy.classList.contains('enemy-destroyed')) return; // 敵人不存在或已被摧毀，停止移動

            const dx = targetX - currentEnemyX;
            const dy = targetY - currentEnemyY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 5) { // 接近目標點，設置新目標
                targetX = Math.random() * (gameWidth - enemySize);
                targetY = Math.random() * (gameHeight - enemySize);
            } else {
                currentEnemyX += (dx / distance) * moveSpeed;
                currentEnemyY += (dy / distance) * moveSpeed;
            }
            enemy.style.left = `${currentEnemyX}px`;
            enemy.style.top = `${currentEnemyY}px`;

            requestAnimationFrame(moveEnemy);
        };
        requestAnimationFrame(moveEnemy);
    }

    // 生成一個特殊 Type1 敵人 (原 Boss，現在只是大號 Type1)
    function generateSpecialEnemyType1(worryText) {
        const specialEnemy = document.createElement('div');
        specialEnemy.classList.add('enemy', 'type1', 'boss'); // 仍然給它 boss class，以便在 CSS 中區分樣式
        specialEnemy.textContent = worryText;

        const gameWidth = gameScreen.offsetWidth;
        const gameHeight = gameScreen.offsetHeight;
        const enemySize = 150; // 與 CSS 中的 boss 寬高一致

        // 初始位置在畫面中心附近
        let startX = gameWidth / 2 - enemySize / 2;
        let startY = gameHeight / 2 - enemySize / 2;
        specialEnemy.style.left = `${startX}px`;
        specialEnemy.style.top = `${startY}px`;
        enemiesContainer.appendChild(specialEnemy);

        // 這個大敵人也將像普通 type1 敵人一樣隨機移動
        let currentEnemyX = startX;
        let currentEnemyY = startY;
        let targetX = Math.random() * (gameWidth - enemySize);
        let targetY = Math.random() * (gameHeight - enemySize);
        const moveSpeed = 0.6; // 大敵人移動速度可以慢一點

        const moveEnemy = () => {
            if (!specialEnemy.parentElement || specialEnemy.classList.contains('enemy-destroyed')) return;

            const dx = targetX - currentEnemyX;
            const dy = targetY - currentEnemyY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 5) {
                targetX = Math.random() * (gameWidth - enemySize);
                targetY = Math.random() * (gameHeight - enemySize);
            } else {
                currentEnemyX += (dx / distance) * moveSpeed;
                currentEnemyY += (dy / distance) * moveSpeed;
            }
            specialEnemy.style.left = `${currentEnemyX}px`;
            specialEnemy.style.top = `${currentEnemyY}px`;

            requestAnimationFrame(moveEnemy);
        };
        requestAnimationFrame(moveEnemy);
    }




    // ===== 檢查遊戲進度函數 (完整替換) =====
    function checkGameProgress() {
        const remainingEnemiesStage1OnScreen = enemiesContainer.querySelectorAll('.enemy:not(.type2):not(.type1)').length;
        const remainingEnemiesStage2OnScreen = enemiesContainer.querySelectorAll('.enemy.type2').length;
        const remainingEnemiesStage3OnScreen = enemiesContainer.querySelectorAll('.enemy.type1').length; // 包含所有 Type1 敵人，不區分是否是 Boss

        // 第一階段結束條件：場上沒有第一階段敵人，且所有第一階段敵人已生成
        if (currentStage === 1 && remainingEnemiesStage1OnScreen === 0 && enemiesGeneratedCount >= TOTAL_ENEMIES_LEVEL_3) {
            currentStage = 2; // 進入第二階段
            document.body.classList.remove('stage1-background', 'stage3-background', 'victory-background');
            document.body.classList.add('stage2-background');
            narrationText.textContent = "好欸～第一波煩惱已經掰掰！🎉 這點程度也想煩你?慢走不送👋";
            hintText.textContent = "提示：游標決定方向，按空白鍵發射子彈！";
            player.classList.remove('happy'); // 移除開心狀態
            
            // 清除第一階段敵人生成計時器
            if (spawnIntervalId) {
                clearInterval(spawnIntervalId);
                spawnIntervalId = null;
            }

            // 延遲一段時間後開始生成第二階段敵人
            setTimeout(() => {
                const worryToSpawnStage2 = currentWorries[1] || "中等煩惱";
                startSpawningEnemiesStage2(worryToSpawnStage2);
            }, STAGE_TRANSITION_DELAY);
        }
        // 第二階段結束條件：場上沒有第二階段敵人，且所有第二階段敵人已生成
        else if (currentStage === 2 && remainingEnemiesStage2OnScreen === 0 && enemiesGeneratedCountStage2 >= TOTAL_ENEMIES_LEVEL_2) {
            currentStage = 3; // 進入第三階段
            document.body.classList.remove('stage1-background', 'stage2-background', 'victory-background');
            document.body.classList.add('stage3-background');
            narrationText.textContent = "第二煩人的終於退場了👏 現在要面對你腦子裡一直repeat的那個超討厭的鬼東西👹!";
            hintText.textContent = "提示：WASD 或方向鍵移動，靠近敵人按 Enter吞噬他們！";
            player.classList.remove('attacking'); // 移除攻擊狀態
            
            // 清除第二階段敵人生成計時器
            if (spawnIntervalIdStage2) {
                clearInterval(spawnIntervalIdStage2);
                spawnIntervalIdStage2 = null;
            }

            // 啟用主角移動
            startPlayerMovement();

            // 延遲一段時間後開始生成第三階段敵人 (小敵人)
            setTimeout(() => {
                const worryToSpawnStage3 = currentWorries[0] || "核心煩惱";
                startSpawningEnemiesStage3(worryToSpawnStage3); // 從程度1的煩惱中選取作為 Type1 敵人
            }, STAGE_TRANSITION_DELAY);

            // 在第三階段開始時立即生成大號 Type1 敵人（原來的 Boss）
            // 確保只生成一個
            if (enemiesContainer.querySelectorAll('.enemy.type1.boss').length === 0) {
                generateSpecialEnemyType1(currentWorries[0]); // 使用程度1煩惱作為大敵人
            }

        }
        // 第三階段結束條件：所有 Type1 敵人（包括 Boss）都被清除
        else if (currentStage === 3 && remainingEnemiesStage3OnScreen === 0 && enemiesGeneratedCountStage3 >= TOTAL_ENEMIES_LEVEL_1_SMALL) {
            narrationText.textContent = "恭喜你清光全場🥳現實雖然沒辦法像這樣點幾下就讓煩惱消失，" +
                "但你今天願意點開這遊戲、正視那些讓你不爽的事，就已經很厲害了啦👏";
            document.body.classList.remove('stage1-background', 'stage2-background', 'stage3-background');
            document.body.classList.add('victory-background');
            hintText.textContent = "";
            player.classList.add('happy'); // 進入勝利開心狀態
            playerMouth.style.width = '28px';
            playerMouth.style.height = '8px';
            playerMouth.style.borderRadius = '0 0 15px 15px';
            playerMouth.style.transform = 'translateX(-50%) translateY(2px)';
            playerBody.querySelectorAll('.player-eye').forEach(eye => {
                eye.style.transform = `translate(0px, 0px)`; // 眼睛歸位
            });

            // 移除所有剩餘敵人 (如果還有，通常此時應該沒有了)
            enemiesContainer.querySelectorAll('.enemy').forEach(enemy => enemy.remove());

            // 停止主角移動循環
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            // 停止第三階段敵人生成計時器
            if (spawnIntervalIdStage3) {
                clearInterval(spawnIntervalIdStage3);
                spawnIntervalIdStage3 = null;
            }
            // 新增：灑彩帶
            launchConfetti();
            // 遊戲勝利
            //  // === 新增：記錄結束時間並上傳到 Firebase ===
        gameEndTime = Date.now();
        const playTimeMs = gameEndTime - gameStartTime;
        const playTimeSec = Math.floor(playTimeMs / 1000);
        const min = Math.floor(playTimeSec / 60);
        const sec = playTimeSec % 60;

        // 上傳到 Firebase
        uploadScoreToFirebase(playerName, playTimeMs);

        // 顯示排行榜
        showLeaderboard();;
        }

        // 如果場上還有敵人，且未生成完畢，則不改變提示
        else if (currentStage === 1 && remainingEnemiesStage1OnScreen === 0 && enemiesGeneratedCount < TOTAL_ENEMIES_LEVEL_3) {
            // 第一階段：場上暫時沒有敵人，但還有敵人未生成
            narrationText.textContent = "欸你是手速怪物吧？煩惱都還沒反應過來就被你解決了😂";
            hintText.textContent = "";
        }
        // 第二階段：場上暫時沒有敵人，但還有敵人未生成
        else if (currentStage === 2 && remainingEnemiesStage2OnScreen === 0 && enemiesGeneratedCountStage2 < TOTAL_ENEMIES_LEVEL_2) {
            narrationText.textContent = "哇你快得我都來不及鼓掌👏 講真的有在發洩到吧～";
            hintText.textContent = "";
        }
        // 第三階段：場上沒有小怪，但 Boss 還在場上（或未生成），或小怪還未全部生成
        else if (currentStage === 3 && (remainingEnemiesStage3OnScreen > 0 || enemiesGeneratedCountStage3 < TOTAL_ENEMIES_LEVEL_1_SMALL)) {
            // 如果場上還有 Type1 敵人（包括大號 Type1），或小怪還沒生成完
            const remainingBoss = enemiesContainer.querySelectorAll('.enemy.type1.boss').length;
            if (remainingBoss > 0) {
                 narrationText.textContent = "與其讓它一直在身邊，主動前往消滅它吧！💥";
            } else {
                 narrationText.textContent = "解決它們!👊👊🔥🔥";
            }
            hintText.textContent = "提示：WASD 或方向鍵移動，靠近敵人按 Enter 吞噬它們！";
        }

            
        }
       

    function launchConfetti() {
        for (let i = 0; i < 80; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.background = `hsl(${Math.random() * 360}, 80%, 60%)`;
            confetti.style.animationDelay = (Math.random() * 0.5) + 's';
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 3000);
        }
    }
    // === Firebase 上傳分數函數 ===
    function uploadScoreToFirebase(name, timeMs) {
    const db = firebase.database();
    // 用 push 產生唯一 key
    db.ref("leaderboard").push({
        name: name,
        timeMs: timeMs,
        timestamp: Date.now()
    });
}

   function showLeaderboard() {
    const db = firebase.database();
    db.ref("leaderboard")
      .orderByChild("timeMs")
      .limitToFirst(10)
      .once("value")
      .then(snapshot => {
        let html = "<h2>排行榜</h2><ol>";
        snapshot.forEach(child => {
            const data = child.val();
            const min = Math.floor(data.timeMs / 1000 / 60);
            const sec = Math.floor((data.timeMs / 1000) % 60);
            html += `<li>${data.name} 只花了 ${min}分${sec}秒消滅了困擾他的事物！</li>`;
        });
        html += "</ol>";
        const leaderboardDiv = document.getElementById('leaderboard');
        leaderboardDiv.innerHTML = html;
        leaderboardDiv.style.display = 'block';
      });
}
});