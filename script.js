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
    const PLAYER_HIT_COOLDOWN = 200; // 主角打擊冷卻時間
    const HIT_FORCE = 30; // 敵人被打飛的初始速度（像素/幀）
    const BOSS_TELEPORT_INTERVAL = 2000; // Boss 瞬移間隔（毫秒）
    const BOSS_HIT_EFFECT_DURATION = 1000; // Boss 被打飛後的特效持續時間（毫秒）

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
    let bossEnemy = null; // 追蹤 Boss 敵人元素 (新增)
    let isBossDefeated = false; // Boss 是否已被擊敗 (新增)
    let bossTeleportIntervalId = null; // Boss 瞬移計時器ID (新增)


    // ===== 開始按鈕點擊事件 =====
    startButton.addEventListener('click', () => {
        // 收集玩家輸入的煩惱
        currentWorries = worryInputs.map(input => input.value.trim()).filter(value => value !== '');

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

        // ==== 關鍵修改：鼠標移動事件監聽器在這裡啟用 ====
        gameScreen.addEventListener('mousemove', playerEyeControl);

        // 設置遊戲初始文字
        narrationText.textContent = "即使小小的一直在那也是很煩啊! 😩 把它們消滅吧!";
        hintText.textContent = "提示：用鼠標點擊敵人！";

        // 延遲3秒後開始分批生成第一階段敵人 (給玩家一個準備時間)
        setTimeout(() => {
            // 從程度3的煩惱中選取一個作為敵人名稱
            const worryToSpawn = currentWorries[2]; // 程度3的煩惱
            startSpawningEnemies(worryToSpawn);
        }, 3000);
    });

    // ===== 鼠標移動事件：控制主角眼睛 **AND** 追蹤鼠標座標 =====
    // 這個事件監聽器現在已被移到 startButton 的點擊事件中啟用
    function playerEyeControl(e) {
        // 在這裡加入一個檢查，確保 playerBody 存在才執行，增強健壯性
        if (!playerBody) {
            console.warn("playerBody 尚未定義，無法控制眼睛。");
            return;
        }

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
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        // 開始遊戲循環來更新主角位置
        if (animationFrameId) cancelAnimationFrame(animationFrameId); // 如果有舊的循環，先停止
        animationFrameId = requestAnimationFrame(gameLoop);
    }

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
        if (currentStage !== 3) {
            cancelAnimationFrame(animationFrameId); // 如果不在第三階段，停止主角移動循環
            return;
        }

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
        if (currentStage === 3) {
            const now = Date.now();
            const playerRect = player.getBoundingClientRect(); // 更新主角實際位置
            const playerCenterX = playerRect.left + playerRect.width / 2;
            const playerCenterY = playerRect.top + playerRect.height / 2;

            enemiesContainer.querySelectorAll('.enemy.type1').forEach(enemy => {
                // 如果是 Boss 且已被擊敗，跳過
                if (enemy.classList.contains('boss') && isBossDefeated) return;
                // 如果敵人已經在被銷毀狀態，跳過
                if (enemy.classList.contains('enemy-destroyed')) return;

                const enemyRect = enemy.getBoundingClientRect();
                const enemyCenterX = enemyRect.left + enemyRect.width / 2;
                const enemyCenterY = enemyRect.top + enemyRect.height / 2;

                const distance = Math.sqrt(
                    Math.pow(playerCenterX - enemyCenterX, 2) +
                    Math.pow(playerCenterY - enemyCenterY, 2)
                );

                // 判斷碰撞距離，可以根據主角和敵人大小調整
                if (distance < playerRect.width / 2 + enemyRect.width / 2 - 20) { // 稍微重疊即視為碰撞
                    if (keysPressed['Enter'] && (now - lastHitTime > PLAYER_HIT_COOLDOWN)) {
                        lastHitTime = now;
                        // 觸發主角攻擊動畫/表情
                        player.classList.add('attacking');
                        playerMouth.style.width = '20px'; // 嘴巴變窄
                        playerMouth.style.height = '3px'; // 變平
                        playerMouth.style.borderRadius = '2px'; // 直線
                        playerMouth.style.transform = 'translateX(-50%) translateY(5px)';

                        setTimeout(() => {
                            player.classList.remove('attacking');
                            // 恢復嘴巴到默認狀態 (或讓 playerEyeControl 重新控制)
                            playerMouth.style.width = '25px';
                            playerMouth.style.height = '5px';
                            playerMouth.style.borderRadius = '2px';
                            playerMouth.style.transform = 'translateX(-50%)'; // 恢復嘴巴預設位置
                        }, 200); // 攻擊動畫持續 200 毫秒

                        // 打飛敵人
                        hitEnemyStage3(enemy, playerCenterX, playerCenterY);
                    }
                }
            });
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
            if (enemiesGeneratedCountStage3 < TOTAL_ENEMIES_LEVEL_1_SMALL) {
                generateSingleEnemyStage3(worryText);
                enemiesGeneratedCountStage3++;
            } else {
                clearInterval(spawnIntervalIdStage3);
                spawnIntervalIdStage3 = null; // 清除ID
                // 小怪生成完畢，如果 Boss 還沒出現，就檢查是否該出現了
                if (!bossEnemy && !isBossDefeated) {
                    checkGameProgress(); // 觸發 Boss 生成邏輯
                }
            }
        }, ENEMY_SPAWN_INTERVAL_STAGE3);
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

    // 生成 Boss 敵人的函數 (新增)
    function generateBossEnemy(worryText) {
        bossEnemy = document.createElement('div');
        bossEnemy.classList.add('enemy', 'type1', 'boss'); // Boss 特有類別
        bossEnemy.textContent = worryText;

        const gameWidth = gameScreen.offsetWidth;
        const gameHeight = gameScreen.offsetHeight;
        const bossSize = 150; // 需與 CSS 中的 boss 寬高一致

        // 初始位置在畫面中心附近
        let startX = gameWidth / 2 - bossSize / 2;
        let startY = gameHeight / 2 - bossSize / 2;
        bossEnemy.style.left = `${startX}px`;
        bossEnemy.style.top = `${startY}px`;
        enemiesContainer.appendChild(bossEnemy);

        // Boss 瞬移邏輯
        bossTeleportIntervalId = setInterval(() => {
            if (!bossEnemy || bossEnemy.classList.contains('enemy-destroyed')) {
                clearInterval(bossTeleportIntervalId);
                bossTeleportIntervalId = null; // 清除ID
                return;
            }
            // 隨機傳送到一個新位置，避開主角
            let newBossX, newBossY;
            for (let i = 0; i < 20; i++) { // 嘗試多次找到好位置
                newBossX = Math.random() * (gameWidth - bossSize);
                newBossY = Math.random() * (gameHeight - bossSize);
                const playerRect = player.getBoundingClientRect();
                const dist = Math.sqrt(Math.pow(newBossX - playerRect.left, 2) + Math.pow(newBossY - playerRect.top, 2));
                if (dist > 250) break; // 距離主角 250px 以上
            }
            bossEnemy.style.left = `${newBossX}px`;
            bossEnemy.style.top = `${newBossY}px`;
        }, BOSS_TELEPORT_INTERVAL);
    }


    // 第三階段敵人被打飛的函數 (新增)
    function hitEnemyStage3(enemy, hitterX, hitterY) {
        // 清除敵人身上的所有 transition
        enemy.style.transition = 'none'; // 暫時移除過渡，確保立刻移動
        enemy.classList.add('hit'); // 添加 hit class 讓它被擊中時變形 (例如變扁)

        // 判斷擊飛方向
        const enemyRect = enemy.getBoundingClientRect();
        const enemyCenterX = enemyRect.left + enemyRect.width / 2;
        const enemyCenterY = enemyRect.top + enemyRect.height / 2;

        const dx = enemyCenterX - hitterX; // 從主角到敵人的方向
        const dy = enemyCenterY - hitterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let directionX = dx / distance;
        let directionY = dy / distance;

        // 如果距離太近（重疊），給一個隨機方向或預設向外推
        if (distance === 0) {
            directionX = (Math.random() - 0.5) * 2;
            directionY = (Math.random() - 0.5) * 2;
        }

        // 打飛移動循環
        const flyOut = () => {
            if (!enemy.parentElement) return;

            let currentEnemyX = parseFloat(enemy.style.left);
            let currentEnemyY = parseFloat(enemy.style.top);

            currentEnemyX += directionX * HIT_FORCE;
            currentEnemyY += directionY * HIT_FORCE;

            enemy.style.left = `${currentEnemyX}px`;
            enemy.style.top = `${currentEnemyY}px`;

            // 檢查是否飛出畫面
            if (currentEnemyX < -enemyRect.width || currentEnemyX > gameScreen.offsetWidth + enemyRect.width ||
                currentEnemyY < -enemyRect.height || currentEnemyY > gameScreen.offsetHeight + enemyRect.height) {

                // 如果是 Boss 被擊飛
                if (enemy.classList.contains('boss')) {
                    if (!isBossDefeated) { // 確保只觸發一次
                        isBossDefeated = true;
                        // 觸發 Boss 擊敗特效和所有小怪爆炸
                        triggerBossDefeatEffect(enemy);
                    }
                } else {
                    enemy.remove(); // 移除普通小怪
                }
                checkGameProgress(); // 檢查遊戲進度
                return;
            }
            requestAnimationFrame(flyOut);
        };
        requestAnimationFrame(flyOut);

        // 短暫時間後移除 'hit' class，恢復正常形狀
        setTimeout(() => {
            if (enemy.parentElement) { // 確保元素還存在
                enemy.classList.remove('hit');
            }
        }, 150); // 150ms 後恢復
    }

    // 觸發 Boss 擊敗特效和所有小怪爆炸 (新增)
    function triggerBossDefeatEffect(boss) {
        // 清除 Boss 的瞬移計時器
        if (bossTeleportIntervalId) {
            clearInterval(bossTeleportIntervalId);
            bossTeleportIntervalId = null; // 清除ID
        }

        // 創建閃亮軌跡
        const numSparkles = 10; // 軌跡點數量
        const bossRect = boss.getBoundingClientRect();
        const bossCenterX = bossRect.left + bossRect.width / 2;
        const bossCenterY = bossRect.top + bossRect.height / 2;

        for (let i = 0; i < numSparkles; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.classList.add('sparkle-trail');
                // 讓軌跡點從 Boss 消失的位置稍微偏離
                sparkle.style.left = `${bossCenterX + (Math.random() - 0.5) * bossRect.width / 2}px`;
                sparkle.style.top = `${bossCenterY + (Math.random() - 0.5) * bossRect.height / 2}px`;
                enemiesContainer.appendChild(sparkle);
                sparkle.addEventListener('animationend', () => sparkle.remove());
            }, i * 50); // 每個點延遲出現
        }

        // 讓場上所有剩餘小怪原地爆炸消失
        enemiesContainer.querySelectorAll('.enemy.type1:not(.boss)').forEach(enemy => {
            // 添加一個快速的爆炸效果 (這裡可以直接移除並調用 checkGameProgress)
            enemy.classList.add('enemy-destroyed'); // 使用現有破碎動畫
            enemy.addEventListener('transitionend', () => {
                enemy.remove();
                checkGameProgress(); // 每個小怪移除後也檢查一下進度 (雖然最終會有 Boss 的檢查)
            }, { once: true });
        });

        // 移除 Boss 元素 (在視覺效果之後)
        setTimeout(() => {
            boss.remove();
            checkGameProgress(); // 再次檢查遊戲進度，觸發勝利
        }, BOSS_HIT_EFFECT_DURATION); // 等待特效結束後移除
    }

    // ===== 檢查遊戲進度函數 (完整替換) =====
    function checkGameProgress() {
        const remainingEnemiesOnScreen = enemiesContainer.querySelectorAll('.enemy').length;
        const remainingEnemiesStage1OnScreen = enemiesContainer.querySelectorAll('.enemy:not(.type2):not(.type1)').length; // 確保不包含 type1 敵人
        const remainingEnemiesStage2OnScreen = enemiesContainer.querySelectorAll('.enemy.type2').length;
        const remainingEnemiesStage3OnScreen = enemiesContainer.querySelectorAll('.enemy.type1:not(.boss)').length; // 第三階段小敵人
        const remainingBossOnScreen = enemiesContainer.querySelector('.enemy.type1.boss'); // Boss 敵人

        // 第一階段結束條件
        if (currentStage === 1 && remainingEnemiesStage1OnScreen === 0 && enemiesGeneratedCount >= TOTAL_ENEMIES_LEVEL_3) {
            narrationText.textContent = "太棒了！第一階段的煩惱都消失了！🎉 準備迎接更大的挑戰！";
            hintText.textContent = "（等待進入第二階段...）";
            
            if (spawnIntervalId) {
                clearInterval(spawnIntervalId);
            }

            // 進入第二階段 (延遲數秒後)
            setTimeout(() => {
                currentStage = 2; // 設置遊戲階段為2
                document.body.classList.remove('stage1-background'); // 移除舊的背景類
                document.body.classList.add('stage2-background');   // 添加新的背景類
                narrationText.textContent = "新的煩惱出現了！它們更難纏！💥";
                hintText.textContent = "提示：按空白鍵發射子彈！";
                
                const worryToSpawnStage2 = currentWorries[1] || "中等煩惱";
                startSpawningEnemiesStage2(worryToSpawnStage2);
            }, STAGE_TRANSITION_DELAY);
        } 
        // 第二階段結束條件
        else if (currentStage === 2 && remainingEnemiesStage2OnScreen === 0 && enemiesGeneratedCountStage2 >= TOTAL_ENEMIES_LEVEL_2) {
            narrationText.textContent = "恭喜！第二階段的煩惱也消滅了！🤩 但還有最後一個心魔...！";
            hintText.textContent = "（準備進入最終階段...）";

            if (spawnIntervalIdStage2) {
                clearInterval(spawnIntervalIdStage2);
            }

            // 進入第三階段 (延遲數秒後)
            setTimeout(() => {
                currentStage = 3; // 設置遊戲階段為3
                document.body.classList.remove('stage2-background');
                document.body.classList.add('stage3-background');

                // 停止鼠標控制眼睛，讓主角臉部能被打擊狀態控制
                gameScreen.removeEventListener('mousemove', playerEyeControl); // 我們稍後會把眼睛控制抽成一個函數

                narrationText.textContent = `這真的是最討厭的${currentWorries[0] || '煩惱'}! 通通解決掉吧!`;
                hintText.textContent = "提示：使用 WASD 或方向鍵移動，靠近敵人按 Enter 打擊！";
                
                // 初始化主角位置 (在第三階段中主角可以自由移動)
                playerX = gameScreen.offsetWidth / 2 - player.offsetWidth / 2;
                playerY = gameScreen.offsetHeight / 2 - player.offsetHeight / 2;
                player.style.left = `${playerX}px`;
                player.style.top = `${playerY}px`;
                
                // 啟用主角移動控制
                startPlayerMovement(); // 稍後會實作這個函數

                // 開始生成第三階段敵人 (小怪)
                const worryToSpawnStage3 = currentWorries[0] || "巨大煩惱";
                startSpawningEnemiesStage3(worryToSpawnStage3);

            }, STAGE_TRANSITION_DELAY);
        }
        // 第三階段結束條件：Boss 被擊敗
        else if (currentStage === 3 && isBossDefeated) {
            narrationText.textContent = `你最終戰勝了${currentWorries[0] || '最深層的煩惱'}！恭喜你，你的內心獲得了平靜！✨`;
            hintText.textContent = "（遊戲結束）";

            // 清除所有計時器
            if (spawnIntervalId3) clearInterval(spawnIntervalId3);
            if (bossTeleportIntervalId) clearInterval(bossTeleportIntervalId);
            if (animationFrameId) cancelAnimationFrame(animationFrameId); // 停止主角移動動畫

            // 讓主角保持開心臉
            player.classList.remove('attacking'); // 確保不是攻擊臉
            player.classList.add('happy');
            playerMouth.style.width = '28px'; // 讓嘴巴固定在開心狀態
            playerMouth.style.height = '8px';
            playerMouth.style.borderRadius = '0 0 15px 15px';
            playerMouth.style.transform = 'translateX(-50%) translateY(2px)';
            playerBody.querySelectorAll('.player-eye').forEach(eye => {
                eye.style.transform = `translate(0px, 0px)`; // 眼睛歸位
            });

            // 移除所有剩餘敵人 (如果還有)
            enemiesContainer.querySelectorAll('.enemy').forEach(enemy => enemy.remove());
        }
        // 第一階段：場上暫時沒有敵人，但還有敵人未生成
        else if (currentStage === 1 && remainingEnemiesStage1OnScreen === 0 && enemiesGeneratedCount < TOTAL_ENEMIES_LEVEL_3) {
            narrationText.textContent = "暫時安全，等待下一個小煩惱出現... 🤔";
            hintText.textContent = "";
        }
        // 第二階段：場上暫時沒有敵人，但還有敵人未生成
        else if (currentStage === 2 && remainingEnemiesStage2OnScreen === 0 && enemiesGeneratedCountStage2 < TOTAL_ENEMIES_LEVEL_2) {
            narrationText.textContent = "暫時安全，等待下一個中等煩惱出現... 🤫";
            hintText.textContent = "";
        }
        // 第三階段：場上沒有小怪，但 Boss 未出現或未被擊敗
        else if (currentStage === 3 && remainingEnemiesStage3OnScreen === 0 && enemiesGeneratedCountStage3 >= TOTAL_ENEMIES_LEVEL_1_SMALL && !remainingBossOnScreen && !isBossDefeated) {
             narrationText.textContent = "核心煩惱出現了！擊敗它！";
             hintText.textContent = "提示：這是最難纏的煩惱！";
             // 清除小怪生成計時器
             if (spawnIntervalIdStage3) clearInterval(spawnIntervalIdStage3);
             // 生成 Boss
             generateBossEnemy(currentWorries[0] || "最終煩惱");
        }
    }
}); // DOMContentLoaded 結束標籤