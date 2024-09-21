const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let score = 0;
let lives = 0;
let bubbles = [];
let level = 1;
const maxLives = 3; // Số bong bóng rơi tối đa trước khi game over
let lastLevelUpScore = 0; // Điểm số tại lần cuối cùng tăng level
let maxBubbles = 10; // Số bong bóng tối đa trên màn hình
const bubbleRadius = 40; // Bán kính của bong bóng
let windowPadding = 20; // Khoảng cách viền
let isGameRunning = false; // Biến để theo dõi trạng thái game
let isGameOver = false; // Biến để theo dõi trạng thái game over
let isLevelComplete = false;
let nextLevelScore = 100; // Điểm cần đạt để hoàn thành level
let remainingBubbles = 0; // Số bong bóng còn lại cần tạo trong level hiện tại
const gameName = 'Luyện gõ phím';

const groundHeight = 140;
const toothHeight = 20;

// Thêm biến mới để theo dõi các chữ cái đã sử dụng
let usedLetters = [];

// Thêm biến mới để kiểm soát animation răng cưa
let groundOffset = 0;
const groundAnimationSpeed = 2;

// Thêm biến mới để theo dõi chế độ chơi
let isMultiCharMode = false;
// Thêm biến để theo dõi trạng thái hover
let isSingleCharHovered = false;
let isMultiCharHovered = false;

class Bubble {
    constructor(x, y, text) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.speed = 1 + level / 10; // Tăng tốc độ theo level
        this.color = 'yellow'; // Thêm thuộc tính màu sắc
        this.currentIndex = 0; // Chỉ mục ký tự hiện tại đang được gõ
    }
    draw() {
        ctx.fillStyle = this.color; // Sử dụng thuộc tính màu sắc
        ctx.beginPath();
        ctx.arc(this.x, this.y, bubbleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.font = 'bold 20px Consolas';
        
        // Vẽ text với ký tự đã gõ được highlight
        const typedText = this.text.substring(0, this.currentIndex);
        const remainingText = this.text.substring(this.currentIndex);
        const textWidth = ctx.measureText(this.text).width;
        ctx.fillStyle = 'green';
        ctx.fillText(typedText, this.x - textWidth / 2, this.y + 5);
        ctx.fillStyle = 'black';
        ctx.fillText(remainingText, this.x - textWidth / 2 + ctx.measureText(typedText).width, this.y + 5);
    }

    update() {
        this.y += this.speed;
        // Giữ bong bóng trong giới hạn canvas
        this.x = Math.max(bubbleRadius + windowPadding, Math.min(this.x, canvas.width - bubbleRadius - windowPadding));
        
        // Kiểm tra khoảng cách đến mặt đất và thay đổi màu sắc
        const distanceToGround = canvas.height - groundHeight - toothHeight - this.y - bubbleRadius;
        if (distanceToGround <= 10) {
            this.color = '#ccc';
        } else {
            this.color = 'yellow';
        }
    }

    isColliding(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 2 * bubbleRadius; // Kiểm tra va chạm
    }
}

function spawnBubble() {
    if (bubbles.length < maxBubbles && remainingBubbles > 0) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let text;
        
        if (isMultiCharMode) {
            // Tạo một từ ngẫu nhiên từ 2 đến 5 ký tự
            const wordLength = Math.floor(Math.random() * 4) + 2;
            text = '';
            for (let i = 0; i < wordLength; i++) {
                text += letters[Math.floor(Math.random() * letters.length)];
            }
        } else {
            // Chế độ một ký tự (giữ nguyên logic cũ)
            const unusedLetters = letters.split('').filter(letter => !usedLetters.includes(letter));
            if (unusedLetters.length > 0) {
                text = unusedLetters[Math.floor(Math.random() * unusedLetters.length)];
            } else {
                text = letters[Math.floor(Math.random() * letters.length)];
            }
            if (!usedLetters.includes(text)) {
                usedLetters.push(text);
            }
        }
        
        let x, y;
        let attempts = 0;
        const maxAttempts = 50;

        do {
            x = Math.random() * (canvas.width - 2 * (bubbleRadius + windowPadding)) + (bubbleRadius + windowPadding);
            y = bubbleRadius; // Đặt y là bubbleRadius để bong bóng xuất hiện ở trên cùng
            attempts++;
        } while (isCollidingWithAny(x, y) && attempts < maxAttempts);

        if (attempts < maxAttempts) {
            bubbles.push(new Bubble(x, y, text));
            remainingBubbles--;
        }
    }
}

function isCollidingWithAny(x, y) {
    const tempBubble = new Bubble(x, y, '');
    return bubbles.some(bubble => tempBubble.isColliding(bubble));
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Vẽ vùng trời
    ctx.fillStyle = 'lightblue';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Vẽ vùng đất với răng cưa (animation)
    drawGroundWithSawTeeth();
    
    if (!isLevelComplete) {
        bubbles.forEach(bubble => {
            bubble.update();
            bubble.draw();
        });

        bubbles = bubbles.filter(bubble => {
            if (bubble.y > canvas.height - groundHeight - toothHeight - bubbleRadius) {
                lives++;
                remainingBubbles++; // Thêm lại bong bóng vào số lượng cần tạo
                return false;
            }
            return true;
        });

        if (lives >= maxLives) {
            isGameOver = true;
            isGameRunning = false;
        }

        if (score >= nextLevelScore || (remainingBubbles === 0 && bubbles.length === 0)) {
            isLevelComplete = true;
            clearInterval(bubbleSpawnInterval);
        }
    }

    // Vẽ thông tin điểm, mạng, level lên canvas
    drawInfo();

    if (isGameOver) {
        drawGameOver();
    } else if (isLevelComplete) {
        drawNextLevelButton();
    } else {
        checkLevelUp();
    }
}

// Thêm hàm mới để vẽ vùng đất với răng cưa (animation)
function drawGroundWithSawTeeth() {
    const toothWidth = 40;
    
    ctx.fillStyle = 'brown';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);

    // Vẽ răng cưa với animation chạy ngang
    for (let x = -toothWidth; x < canvas.width + toothWidth; x += toothWidth) {
        const adjustedX = x + groundOffset;
        ctx.lineTo(adjustedX, canvas.height - groundHeight);
        ctx.lineTo(adjustedX + toothWidth / 2, canvas.height - groundHeight - toothHeight);
        ctx.lineTo(adjustedX + toothWidth, canvas.height - groundHeight);
    }

    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();

    // Cập nhật offset cho animation
    groundOffset += groundAnimationSpeed;
    if (groundOffset >= toothWidth) {
        groundOffset = 0;
    }
}

// Vẽ các thông tin khác với hiệu ứng inset
const insetText = (text, x, y) => {
    ctx.fillStyle = '#4a4a4a';
    ctx.fillText(text, x + 2, y + 2);
    ctx.fillStyle = '#8a8a8a';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);
};

function drawInfo() {
    ctx.font = 'bold 24px Arial';
    
    // Vẽ chữ gameName với hiệu ứng inset
    insetText(gameName, 10, canvas.height - 100);
    insetText(`Score: ${score}`, 10, canvas.height - 70);
    insetText(`Lives: ${maxLives - lives}`, 10, canvas.height - 40);
    insetText(`Level: ${level}`, 10, canvas.height - 10);
}

function drawStartButton() {
    ctx.fillStyle = 'green';
    ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 - 80, 200, 140);

    ctx.font = 'bold 24px Arial';
    insetText(gameName, canvas.width / 2 - 80, canvas.height / 2 - 40);

    ctx.font = 'bold 20px Arial';
    
    // Vẽ option 1 với màu khác khi hover
    if (isSingleCharHovered) {
        ctx.fillStyle = 'brown';
        ctx.fillRect(canvas.width / 2 - 95, canvas.height / 2 - 20, 190, 30);
    }
    insetText('Gõ 1 chữ cái', canvas.width / 2 - 90, canvas.height / 2);
    
    // Vẽ option 2 với màu khác khi hover
    if (isMultiCharHovered) {
        ctx.fillStyle = 'brown';
        ctx.fillRect(canvas.width / 2 - 95, canvas.height / 2 + 10, 190, 30);
    }
    insetText('Gõ 1 từ', canvas.width / 2 - 90, canvas.height / 2 + 30);
}

function drawGameOver() {
    ctx.fillStyle = 'red';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('Game Over', canvas.width / 2 - 120, canvas.height / 3);
}

function drawNextLevelButton() {
    ctx.fillStyle = 'green';
    ctx.fillRect(canvas.width / 2 - 75, canvas.height / 2 - 25, 150, 50);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Next Level', canvas.width / 2 - 60, canvas.height / 2 + 8);
}

function checkLevelUp() {
    if (score >= nextLevelScore) {
        isLevelComplete = true;
        clearInterval(bubbleSpawnInterval);
    }
}

function resetGame() {
    score = 0;
    lives = 0;
    level = 1;
    lastLevelUpScore = 0;
    nextLevelScore = 100;
    remainingBubbles = 10; // Đặt số bong bóng ban đầu cho level đầu tiên
    bubbles = [];
    usedLetters = []; // Reset danh sách chữ cái đã sử dụng
    isGameOver = false;
    isLevelComplete = false;
    updateBubbleSpawnRate();
}

function startNextLevel() {
    level++;
    lastLevelUpScore = score;
    nextLevelScore += (level + 100); // Tăng điểm cần đạt cho level tiếp theo
    isLevelComplete = false;
    
    // Reset danh sách chữ cái đã sử dụng
    usedLetters = [];
    
    // Tính toán số bong bóng cần cho level này
    remainingBubbles = Math.ceil((nextLevelScore - score) / 10);
    maxBubbles = Math.min(remainingBubbles, 10); // Giới hạn số bong bóng trên màn hình
    
    // Xóa tất cả bong bóng hiện tại
    bubbles = [];
    
    // Cập nhật tốc độ spawn bong bóng
    updateBubbleSpawnRate();
}

function updateBubbleSpawnRate() {
    clearInterval(bubbleSpawnInterval);
    const baseSpawnRate = 1000; // Tốc độ cơ bản là 1 giây
    const minSpawnRate = 200; // Tốc độ tối thiểu là 0.2 giây
    const spawnRate = Math.max(minSpawnRate, baseSpawnRate - (level * 50));
    bubbleSpawnInterval = setInterval(spawnBubble, spawnRate);
    console.log(`Updated spawn rate: ${spawnRate}ms`);
}

function gameLoop() {
    if (isGameRunning) {
        update();
    } else {
        drawStartButton(); // Vẽ nút bắt đầu nếu game chưa chạy
        // Thêm hướng dẫn nhấn Enter để bắt đầu
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Press Enter to start', canvas.width / 2 - 100, canvas.height / 2 + 100);
    }

    if (isLevelComplete) {
        drawNextLevelButton();
        // Thêm hướng dẫn nhấn phím bất kỳ
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Press Enter to next level', canvas.width / 2 - 120, canvas.height / 2 + 50);
    }

    requestAnimationFrame(gameLoop);
}

// Thêm sự kiện để theo dõi trạng thái active của cửa sổ
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        isActive = false; // Ngừng tạo bong bóng khi cửa sổ không active
        clearInterval(bubbleSpawnInterval);
    } else {
        isActive = true; // Khởi động lại tạo bong bóng khi cửa sổ trở lại active
        if (isGameRunning) {
            updateBubbleSpawnRate(); // Khởi động lại interval
        }
    }
});

let isActive = true; // Biến để theo dõi trạng thái active của cửa sổ

// Cập nhật sự kiện keydown
document.addEventListener('keydown', (event) => {
    const key = event.key.toUpperCase();
    if (!isGameRunning) {
        if (key === '1' || key === '2') {
            isMultiCharMode = (key === '2');
            isGameRunning = true;
            resetGame();
            updateBubbleSpawnRate();
        }
    } else if (isLevelComplete && key === 'ENTER') {
        startNextLevel();
    } else if (isGameRunning) {
        bubbles.forEach((bubble, index) => {
            if (isMultiCharMode) {
                if (bubble.text[bubble.currentIndex] === key) {
                    bubble.currentIndex++;
                    if (bubble.currentIndex === bubble.text.length) {
                        score += bubble.text.length * 10;
                        bubbles.splice(index, 1);
                    }
                }
            } else {
                if (bubble.text === key) {
                    score += 10;
                    bubbles.splice(index, 1);
                }
            }
            if (remainingBubbles === 0 && bubbles.length === 0) {
                isLevelComplete = true;
                clearInterval(bubbleSpawnInterval);
            }
        });
    }
});

// Thêm sự kiện nhấp chuột để bắt đầu game
canvas.addEventListener('click', (event) => {
    if (!isGameRunning) {
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        if (mouseX >= canvas.width / 2 - 100 && mouseX <= canvas.width / 2 + 100) {
            if (mouseY >= canvas.height / 2 - 10 && mouseY <= canvas.height / 2 + 10) {
                isMultiCharMode = false;
                isGameRunning = true;
                resetGame();
                updateBubbleSpawnRate();
            } else if (mouseY >= canvas.height / 2 + 20 && mouseY <= canvas.height / 2 + 40) {
                isMultiCharMode = true;
                isGameRunning = true;
                resetGame();
                updateBubbleSpawnRate();
            }
        }
    } else if (isLevelComplete) {
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        // Kiểm tra xem nhấp vào nút "Next Level" không
        if (mouseX >= canvas.width / 2 - 75 && mouseX <= canvas.width / 2 + 75 &&
            mouseY >= canvas.height / 2 - 25 && mouseY <= canvas.height / 2 + 25) {
            startNextLevel();
        }
    }
});

canvas.addEventListener('mousemove', (event) => {
    if (!isGameRunning) {
        const mouseX = event.clientX - canvas.offsetLeft;
        const mouseY = event.clientY - canvas.offsetTop;
        
        // Kiểm tra hover cho option 1
        isSingleCharHovered = (mouseX >= canvas.width / 2 - 95 && mouseX <= canvas.width / 2 + 95 &&
                               mouseY >= canvas.height / 2 - 15 && mouseY <= canvas.height / 2 + 15);
        
        // Kiểm tra hover cho option 2
        isMultiCharHovered = (mouseX >= canvas.width / 2 - 95 && mouseX <= canvas.width / 2 + 95 &&
                              mouseY >= canvas.height / 2 + 15 && mouseY <= canvas.height / 2 + 45);
    }
});

let bubbleSpawnInterval;
updateBubbleSpawnRate(); // Khởi tạo interval ban đầu
gameLoop();

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    windowPadding = Math.min(canvas.width, canvas.height) * 0.05; // 5% of the smaller dimension
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);