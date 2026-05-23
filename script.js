// ---------- НАСТРОЙКИ ----------
const GRID_SIZE = 8;
let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
let score = 0;
let currentPieces = [];
let piecesUsedCount = 0;
let isGameActive = true; // Флаг активной игры

// DOM элементы
const gridContainer = document.getElementById('gameGrid');
const gridPreview = document.getElementById('gridPreview');
const piecesArea = document.getElementById('piecesArea');
const scoreSpan = document.getElementById('scoreValue');
const dragGhost = document.getElementById('dragGhost');
const gameOverMessage = document.getElementById('gameOverMessage');
const messageRestartBtn = document.getElementById('messageRestartBtn');

// Элементы модального окна
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const restartBtnModal = document.getElementById('restartBtnModal');
const themeBtnModal = document.getElementById('themeBtnModal');
const modalThemeIcon = document.getElementById('modalThemeIcon');
const modalThemeText = document.getElementById('modalThemeText');

// Переменные для кастомного drag & drop
let draggedPieceIndex = null;
let draggedPieceData = null;
let isDragging = false;
let startTouchX = 0;
let startTouchY = 0;
let currentValidPlacement = null;

// ---------- БИБЛИОТЕКА ФИГУР ----------
const SHAPES_LIB = [
    { matrix: [[1]], width: 1, height: 1 },
    { matrix: [[1, 1]], width: 2, height: 1 },
    { matrix: [[1, 0], [1, 1]], width: 2, height: 2 },
    { matrix: [[0, 1], [1, 1]], width: 2, height: 2 },
    { matrix: [[1, 1, 1]], width: 3, height: 1 },
    { matrix: [[1, 0, 0], [1, 1, 1]], width: 3, height: 2 },
    { matrix: [[0, 1, 0], [1, 1, 1]], width: 3, height: 2 },
    { matrix: [[1, 1], [1, 1]], width: 2, height: 2 },
    { matrix: [[1], [1], [1]], width: 1, height: 3 },
    { matrix: [[1, 1, 0], [0, 1, 1]], width: 3, height: 2 }
];

// ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------
function getRandomShape() {
    const idx = Math.floor(Math.random() * SHAPES_LIB.length);
    const original = SHAPES_LIB[idx];
    return {
        matrix: original.matrix.map(row => [...row]),
        width: original.width,
        height: original.height
    };
}

function generateThreeNewPieces() {
    currentPieces = [];
    for (let i = 0; i < 3; i++) {
        currentPieces.push(getRandomShape());
    }
}

function refreshPiecesIfNeeded() {
    if (piecesUsedCount >= 3 && isGameActive) {
        generateThreeNewPieces();
        piecesUsedCount = 0;
        renderPieces();
    }
}

function canPlacePiece(shape, row, col) {
    for (let r = 0; r < shape.height; r++) {
        for (let c = 0; c < shape.width; c++) {
            if (shape.matrix[r][c] === 1) {
                const targetRow = row + r;
                const targetCol = col + c;
                if (targetRow >= GRID_SIZE || targetCol >= GRID_SIZE) return false;
                if (grid[targetRow][targetCol] !== 0) return false;
            }
        }
    }
    return true;
}

function placePieceOnGrid(shape, row, col) {
    for (let r = 0; r < shape.height; r++) {
        for (let c = 0; c < shape.width; c++) {
            if (shape.matrix[r][c] === 1) {
                grid[row + r][col + c] = 1;
            }
        }
    }
}

function clearLinesAndColumns() {
    let rowsToClear = [];
    let colsToClear = [];

    for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r].every(cell => cell === 1)) {
            rowsToClear.push(r);
        }
    }

    for (let c = 0; c < GRID_SIZE; c++) {
        let full = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (grid[r][c] === 0) {
                full = false;
                break;
            }
        }
        if (full) colsToClear.push(c);
    }

    let clearedCount = 0;
    
    rowsToClear.forEach(r => {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === 1) {
                grid[r][c] = 0;
                clearedCount++;
            }
        }
    });
    
    colsToClear.forEach(c => {
        for (let r = 0; r < GRID_SIZE; r++) {
            if (grid[r][c] === 1) {
                grid[r][c] = 0;
                clearedCount++;
            }
        }
    });

    if (clearedCount > 0) {
        score += clearedCount * 10;
        updateScoreUI();
    }
    return clearedCount > 0;
}

function hasAnyValidMove() {
    for (let piece of currentPieces) {
        for (let row = 0; row <= GRID_SIZE - piece.height; row++) {
            for (let col = 0; col <= GRID_SIZE - piece.width; col++) {
                if (canPlacePiece(piece, row, col)) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Проверка на Game Over
function checkGameOver() {
    if (!hasAnyValidMove() && isGameActive) {
        isGameActive = false;
        gameOverMessage.classList.add('active');
    }
}

// Полный перезапуск игры
function fullRestart() {
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    score = 0;
    piecesUsedCount = 0;
    isGameActive = true;
    updateScoreUI();
    generateThreeNewPieces();
    renderGrid();
    renderPieces();
    clearPreview();
    cleanDrag();
    gameOverMessage.classList.remove('active');
}

// ---------- ОТРИСОВКА ----------
function renderGrid() {
    gridContainer.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            if (grid[r][c] === 1) cell.classList.add('filled');
            cell.dataset.row = r;
            cell.dataset.col = c;
            gridContainer.appendChild(cell);
        }
    }
}

function renderPreview(shape, startRow, startCol, isValid) {
    gridPreview.innerHTML = '';
    
    if (!shape || startRow === undefined || startCol === undefined) return;
    
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const previewCell = document.createElement('div');
            previewCell.className = 'preview-cell';
            
            let isPartOfPiece = false;
            for (let pr = 0; pr < shape.height; pr++) {
                for (let pc = 0; pc < shape.width; pc++) {
                    if (shape.matrix[pr][pc] === 1) {
                        const targetRow = startRow + pr;
                        const targetCol = startCol + pc;
                        if (targetRow === r && targetCol === c) {
                            isPartOfPiece = true;
                            break;
                        }
                    }
                }
            }
            
            if (isPartOfPiece) {
                if (!isValid) {
                    previewCell.classList.add('invalid');
                }
            } else {
                previewCell.style.opacity = '0';
            }
            
            gridPreview.appendChild(previewCell);
        }
    }
}

function clearPreview() {
    if (gridPreview) {
        gridPreview.innerHTML = '';
    }
    currentValidPlacement = null;
}

function updateScoreUI() {
    scoreSpan.textContent = score;
}

function renderPieces() {
    piecesArea.innerHTML = '';
    if (!isGameActive) return;
    
    currentPieces.forEach((piece, idx) => {
        const pieceDiv = document.createElement('div');
        pieceDiv.className = 'piece';
        pieceDiv.setAttribute('data-piece-index', idx);

        const miniGrid = document.createElement('div');
        miniGrid.className = 'piece-grid';
        miniGrid.style.gridTemplateColumns = `repeat(${piece.width}, 1fr)`;
        
        for (let r = 0; r < piece.height; r++) {
            for (let c = 0; c < piece.width; c++) {
                const miniCell = document.createElement('div');
                miniCell.className = 'piece-cell';
                if (piece.matrix[r][c] === 1) {
                    miniCell.classList.add('filled-piece');
                } else {
                    miniCell.style.opacity = '0.3';
                }
                miniGrid.appendChild(miniCell);
            }
        }
        pieceDiv.appendChild(miniGrid);
        
        pieceDiv.addEventListener('touchstart', handleTouchStart, { passive: false });
        pieceDiv.addEventListener('touchmove', handleTouchMove, { passive: false });
        pieceDiv.addEventListener('touchend', handleTouchEnd);
        pieceDiv.addEventListener('touchcancel', handleTouchEnd);
        pieceDiv.addEventListener('mousedown', handleMouseDown);
        
        piecesArea.appendChild(pieceDiv);
    });
}

// ---------- ПРИЗРАК ----------
function createGhost(piece) {
    dragGhost.innerHTML = '';
    const ghostGrid = document.createElement('div');
    ghostGrid.className = 'ghost-grid';
    ghostGrid.style.gridTemplateColumns = `repeat(${piece.width}, 1fr)`;
    
    const isSmall = window.innerWidth < 480;
    const gap = isSmall ? 3 : 4;
    ghostGrid.style.gap = `${gap}px`;
    
    for (let r = 0; r < piece.height; r++) {
        for (let c = 0; c < piece.width; c++) {
            const ghostCell = document.createElement('div');
            ghostCell.className = 'ghost-cell';
            if (piece.matrix[r][c] === 1) {
                ghostCell.classList.add('filled');
            } else {
                ghostCell.style.opacity = '0.3';
            }
            ghostGrid.appendChild(ghostCell);
        }
    }
    
    dragGhost.appendChild(ghostGrid);
    
    const cellSize = isSmall ? 24 : 28;
    const padding = isSmall ? 12 : 16;
    const width = piece.width * cellSize + (piece.width - 1) * gap + padding;
    const height = piece.height * cellSize + (piece.height - 1) * gap + padding;
    dragGhost.style.width = `${width}px`;
    dragGhost.style.height = `${height}px`;
}

function updateGhostPosition(x, y) {
    dragGhost.style.left = `${x - dragGhost.offsetWidth / 2}px`;
    dragGhost.style.top = `${y - dragGhost.offsetHeight / 2}px`;
}

// ---------- ПОИСК КЛЕТКИ ----------
function findNearestCell(x, y) {
    const cells = document.querySelectorAll('.cell');
    let minDistance = Infinity;
    let nearestCell = null;
    
    cells.forEach(cell => {
        const rect = cell.getBoundingClientRect();
        const cellCenterX = rect.left + rect.width / 2;
        const cellCenterY = rect.top + rect.height / 2;
        
        const distance = Math.hypot(x - cellCenterX, y - cellCenterY);
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestCell = cell;
        }
    });
    
    return nearestCell;
}

function calculatePlacementPosition(shape, targetCell) {
    if (!targetCell) return null;
    
    const targetRow = parseInt(targetCell.dataset.row);
    const targetCol = parseInt(targetCell.dataset.col);
    
    let offsetRow = Math.floor((shape.height - 1) / 2);
    let offsetCol = Math.floor((shape.width - 1) / 2);
    
    let startRow = targetRow - offsetRow;
    let startCol = targetCol - offsetCol;
    
    if (startRow < 0) startRow = 0;
    if (startCol < 0) startCol = 0;
    if (startRow + shape.height > GRID_SIZE) startRow = GRID_SIZE - shape.height;
    if (startCol + shape.width > GRID_SIZE) startCol = GRID_SIZE - shape.width;
    
    return { row: startRow, col: startCol };
}

function updatePreviewFromPosition(clientX, clientY) {
    if (!draggedPieceData || !isGameActive) return;
    
    const nearestCell = findNearestCell(clientX, clientY);
    if (nearestCell) {
        const placement = calculatePlacementPosition(draggedPieceData, nearestCell);
        if (placement) {
            const isValid = canPlacePiece(draggedPieceData, placement.row, placement.col);
            renderPreview(draggedPieceData, placement.row, placement.col, isValid);
            currentValidPlacement = isValid ? placement : null;
        } else {
            clearPreview();
        }
    } else {
        clearPreview();
    }
}

function tryPlacePiece(pieceIndex, targetRow, targetCol) {
    if (!isGameActive) return false;
    if (pieceIndex === null || pieceIndex >= currentPieces.length) return false;
    
    const piece = currentPieces[pieceIndex];
    
    if (targetRow + piece.height > GRID_SIZE || targetCol + piece.width > GRID_SIZE) return false;

    if (canPlacePiece(piece, targetRow, targetCol)) {
        placePieceOnGrid(piece, targetRow, targetCol);
        
        currentPieces.splice(pieceIndex, 1);
        piecesUsedCount++;
        
        clearLinesAndColumns();
        refreshPiecesIfNeeded();

        renderGrid();
        renderPieces();
        clearPreview();
        
        // Проверяем на Game Over после хода
        checkGameOver();
        return true;
    }
    return false;
}

// ---------- ОБРАБОТЧИКИ DRAG ----------
function handleTouchStart(e) {
    if (!isGameActive) return;
    e.preventDefault();
    const pieceDiv = e.target.closest('.piece');
    if (!pieceDiv) return;
    
    draggedPieceIndex = parseInt(pieceDiv.getAttribute('data-piece-index'));
    draggedPieceData = currentPieces[draggedPieceIndex];
    
    if (!draggedPieceData) return;
    
    const touch = e.touches[0];
    startTouchX = touch.clientX;
    startTouchY = touch.clientY;
    
    createGhost(draggedPieceData);
    updateGhostPosition(startTouchX, startTouchY);
    dragGhost.style.display = 'block';
    
    piecesArea.classList.add('dragging-active');
    pieceDiv.classList.add('dragging');
    
    isDragging = true;
}

function handleTouchMove(e) {
    if (!isDragging || draggedPieceIndex === null || !isGameActive) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    updateGhostPosition(touch.clientX, touch.clientY);
    updatePreviewFromPosition(touch.clientX, touch.clientY);
}

function handleTouchEnd(e) {
    if (!isDragging || draggedPieceIndex === null) {
        cleanDrag();
        return;
    }
    e.preventDefault();
    
    let endX, endY;
    if (e.changedTouches && e.changedTouches[0]) {
        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;
    } else {
        endX = startTouchX;
        endY = startTouchY;
    }
    
    const nearestCell = findNearestCell(endX, endY);
    
    if (nearestCell && draggedPieceData && isGameActive) {
        const placement = calculatePlacementPosition(draggedPieceData, nearestCell);
        if (placement) {
            tryPlacePiece(draggedPieceIndex, placement.row, placement.col);
        }
    }
    
    cleanDrag();
}

function handleMouseDown(e) {
    if (!isGameActive) return;
    e.preventDefault();
    const pieceDiv = e.target.closest('.piece');
    if (!pieceDiv) return;
    
    draggedPieceIndex = parseInt(pieceDiv.getAttribute('data-piece-index'));
    draggedPieceData = currentPieces[draggedPieceIndex];
    
    if (!draggedPieceData) return;
    
    startTouchX = e.clientX;
    startTouchY = e.clientY;
    
    createGhost(draggedPieceData);
    updateGhostPosition(startTouchX, startTouchY);
    dragGhost.style.display = 'block';
    
    piecesArea.classList.add('dragging-active');
    pieceDiv.classList.add('dragging');
    
    isDragging = true;
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(e) {
    if (!isDragging || !isGameActive) return;
    e.preventDefault();
    
    updateGhostPosition(e.clientX, e.clientY);
    updatePreviewFromPosition(e.clientX, e.clientY);
}

function handleMouseUp(e) {
    if (!isDragging) {
        cleanDrag();
        return;
    }
    
    const nearestCell = findNearestCell(e.clientX, e.clientY);
    
    if (nearestCell && draggedPieceData && isGameActive) {
        const placement = calculatePlacementPosition(draggedPieceData, nearestCell);
        if (placement) {
            tryPlacePiece(draggedPieceIndex, placement.row, placement.col);
        }
    }
    
    cleanDrag();
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
}

function cleanDrag() {
    dragGhost.style.display = 'none';
    piecesArea.classList.remove('dragging-active');
    clearPreview();
    
    document.querySelectorAll('.piece').forEach(p => {
        p.classList.remove('dragging');
    });
    
    draggedPieceIndex = null;
    draggedPieceData = null;
    isDragging = false;
    currentValidPlacement = null;
}

// ---------- ТЕМЫ ----------
function initTheme() {
    const savedTheme = localStorage.getItem('blockblast-theme');
    if (savedTheme) {
        document.body.className = savedTheme;
        updateThemeUI(savedTheme);
    } else {
        document.body.className = 'dark-theme';
        updateThemeUI('dark-theme');
    }
}

function updateThemeUI(theme) {
    const isDark = theme === 'dark-theme';
    if (isDark) {
        modalThemeIcon.textContent = '🌙';
        modalThemeText.textContent = 'Тёмная тема';
    } else {
        modalThemeIcon.textContent = '☀️';
        modalThemeText.textContent = 'Светлая тема';
    }
}

function toggleTheme() {
    const currentTheme = document.body.className;
    const newTheme = currentTheme === 'dark-theme' ? 'light-theme' : 'dark-theme';
    document.body.className = newTheme;
    localStorage.setItem('blockblast-theme', newTheme);
    updateThemeUI(newTheme);
}

// ---------- МОДАЛЬНОЕ ОКНО ----------
function openSettingsModal() {
    if (isGameActive) {
        settingsModal.classList.add('active');
    }
}

function closeSettingsModal() {
    settingsModal.classList.remove('active');
}

function restartGame() {
    fullRestart();
    closeSettingsModal();
}

// ---------- ИНИЦИАЛИЗАЦИЯ ----------
function init() {
    initTheme();
    fullRestart();
    
    settingsBtn.addEventListener('click', openSettingsModal);
    closeSettings.addEventListener('click', closeSettingsModal);
    restartBtnModal.addEventListener('click', restartGame);
    themeBtnModal.addEventListener('click', toggleTheme);
    messageRestartBtn.addEventListener('click', fullRestart);
    
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });
}

window.addEventListener('DOMContentLoaded', init);