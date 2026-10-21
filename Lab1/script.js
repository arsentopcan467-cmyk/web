
'use strict';

const X_VALUES = ['-4', '-3', '-2', '-1', '0', '1', '2', '3', '4'];
const R_VALUES = ['1', '1.5', '2', '2.5', '3'];
const STORAGE_KEY = 'lab1-results';

const form = document.getElementById('form');
const yInput = document.getElementById('y');
const rSelect = document.getElementById('r');
const errorBox = document.getElementById('error');
const tableBody = document.getElementById('results');
const clearButton = document.getElementById('clear');
const canvas = document.getElementById('plane');
const ctx = canvas.getContext('2d');

const CENTER = canvas.width / 2;
const UNIT = 150;

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'medium' });

function toScaled(numbers) {
    const digits = Math.max(...numbers.map(n => (n.split('.')[1] || '').length));
    return numbers.map(n => {
        const [whole, fraction = ''] = n.split('.');
        return BigInt(whole + fraction.padEnd(digits, '0'));
    });
}

function checkY(y) {
    if (y === '') {
        return 'Введите значение Y.';
    }
    if (!/^-?\d+(\.\d+)?$/.test(y)) {
        return 'Y должен быть числом, например 1.5 или -2.';
    }
    const [value, min, max] = toScaled([y, '-3', '5']);
    if (value <= min || value >= max) {
        return 'Y должен быть больше -3 и меньше 5.';
    }
    return '';
}

function isInArea(x, y, r) {
    const [X, Y, R] = toScaled([x, y, r]);
    const square = X >= -R && X <= 0n && Y >= 0n && Y <= R;
    const circle = X <= 0n && Y <= 0n && 4n * (X * X + Y * Y) <= R * R;
    const triangle = X >= 0n && X <= R && Y <= 0n && 2n * Y >= X - R;
    return square || circle || triangle;
}

function isResult(item) {
    return item !== null && typeof item === 'object'
        && X_VALUES.includes(item.x)
        && R_VALUES.includes(item.r)
        && typeof item.y === 'string' && checkY(item.y) === ''
        && typeof item.hit === 'boolean'
        && Number.isFinite(item.time);
}

function loadResults() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(data) ? data.filter(isResult) : [];
    } catch {
        return [];
    }
}

function saveResults() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    } catch {
        errorBox.textContent = 'Не удалось сохранить результаты в браузере.';
    }
}

function renderTable() {
    tableBody.innerHTML = '';
    for (const result of results) {
        const row = tableBody.insertRow(0);
        const cells = [result.x, result.y, result.r, result.hit ? 'Попадание' : 'Промах', dateFormat.format(result.time)];
        for (const text of cells) {
            row.insertCell().textContent = text;
        }
        row.cells[3].dataset.hit = result.hit ? 'yes' : 'no';
    }
}

function drawPlane() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#3399ff';
    ctx.beginPath();
    ctx.rect(CENTER - UNIT, CENTER - UNIT, UNIT, UNIT);
    ctx.moveTo(CENTER, CENTER);
    ctx.arc(CENTER, CENTER, UNIT / 2, Math.PI / 2, Math.PI);
    ctx.moveTo(CENTER, CENTER);
    ctx.lineTo(CENTER + UNIT, CENTER);
    ctx.lineTo(CENTER, CENTER + UNIT / 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, CENTER, canvas.width, 1);
    ctx.fillRect(CENTER, 0, 1, canvas.height);

    ctx.beginPath();
    ctx.moveTo(canvas.width, CENTER);
    ctx.lineTo(canvas.width - 8, CENTER - 4);
    ctx.lineTo(canvas.width - 8, CENTER + 4);
    ctx.moveTo(CENTER, 0);
    ctx.lineTo(CENTER - 4, 8);
    ctx.lineTo(CENTER + 4, 8);
    ctx.fill();

    ctx.font = '12px Arial';
    ctx.fillText('x', canvas.width - 12, CENTER - 8);
    ctx.fillText('y', CENTER + 8, 12);

    for (const [k, label] of [[1, 'R'], [0.5, 'R/2'], [-0.5, '-R/2'], [-1, '-R']]) {
        const shift = k * UNIT;
        ctx.fillRect(CENTER + shift, CENTER - 4, 1, 8);
        ctx.fillRect(CENTER - 4, CENTER - shift, 8, 1);
        ctx.fillText(label, CENTER + shift - 8, CENTER - 8);
        ctx.fillText(label, CENTER + 8, CENTER - shift + 4);
    }

    for (const result of results) {
        const px = CENTER + (Number(result.x) / Number(result.r)) * UNIT;
        const py = CENTER - (Number(result.y) / Number(result.r)) * UNIT;
        ctx.fillStyle = result.hit ? '#2e7d32' : '#c62828';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, 2 * Math.PI);
        ctx.fill();
    }
}

let results = loadResults();

form.addEventListener('submit', event => {
    event.preventDefault();

    const xs = [...document.querySelectorAll('input[name="x"]:checked')]
        .map(box => box.value)
        .filter(x => X_VALUES.includes(x));
    const y = yInput.value.trim().replace(',', '.');
    const r = rSelect.value;

    const errors = [];
    if (xs.length === 0) {
        errors.push('Выберите хотя бы одно значение X.');
    }
    const yError = checkY(y);
    if (yError !== '') {
        errors.push(yError);
    }
    if (!R_VALUES.includes(r)) {
        errors.push('Выберите значение R.');
    }

    errorBox.textContent = errors.join('\n');
    if (errors.length > 0) {
        return;
    }

    const time = Date.now();
    for (const x of xs) {
        results.push({ x, y, r, hit: isInArea(x, y, r), time });
    }
    saveResults();
    renderTable();
    drawPlane();
});

clearButton.addEventListener('click', () => {
    results = [];
    errorBox.textContent = '';
    saveResults();
    renderTable();
    drawPlane();
});

document.addEventListener('visibilitychange', renderTable);

renderTable();
drawPlane();
