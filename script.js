let players = [];
let nightCounter = 1;

document.addEventListener('DOMContentLoaded', () => {
    const addPlayerBtn = document.getElementById('addPlayerBtn');
    const playerNameInput = document.getElementById('playerName');
    const playerRoleInput = document.getElementById('playerRole');
    const processNightBtn = document.getElementById('processNightBtn');

    // Клик: Добавление игрока
    addPlayerBtn.addEventListener('click', () => {
        const name = playerNameInput.value.trim();
        const role = playerRoleInput.value.trim() || 'Мирный';

        if (!name) {
            alert('Введите имя игрока!');
            return;
        }

        const newPlayer = {
            id: Date.now().toString(),
            name: name,
            role: role,
            isAlive: true
        };

        players.push(newPlayer);
        playerNameInput.value = '';
        playerRoleInput.value = '';

        updateUI();
        addLog(`Игрок ${name} (${role}) вступил в игру.`);
    });

    // Клик: Итоги ночи
    processNightBtn.addEventListener('click', () => {
        const targetToKillId = document.getElementById('targetToKill').value;
        const targetToHealId = document.getElementById('targetToHeal').value;

        if (!targetToKillId && !targetToHealId) {
            alert('Вы не выбрали ни одного ночного действия!');
            return;
        }

        addLog(`--- Итоги Ночи №${nightCounter} ---`);

        let killedPlayer = players.find(p => p.id === targetToKillId);
        let healedPlayer = players.find(p => p.id === targetToHealId);

        // Логика Мафии и Доктора
        if (killedPlayer) {
            if (healedPlayer && killedPlayer.id === healedPlayer.id) {
                addLog(`🌙 Мафия стреляла в ${killedPlayer.name}, но Доктор спас его!`);
            } else {
                killedPlayer.isAlive = false;
                addLog(`💀 Мафия убила игрока ${killedPlayer.name}.`);
            }
        }

        if (healedPlayer && (!killedPlayer || killedPlayer.id !== healedPlayer.id)) {
            addLog(`🩺 Доктор лечил игрока ${healedPlayer.name}.`);
        }

        nightCounter++;

        // Сбрасываем селекты формы
        document.getElementById('targetToKill').value = '';
        document.getElementById('targetToHeal').value = '';

        updateUI();
    });
});

// Функция перерисовки интерфейса
function updateUI() {
    const container = document.getElementById('playersContainer');
    const killSelect = document.getElementById('targetToKill');
    const healSelect = document.getElementById('targetToHeal');

    // Очищаем старые элементы
    container.innerHTML = '';
    killSelect.innerHTML = '<option value="">-- Выберите жертву --</option>';
    healSelect.innerHTML = '<option value="">-- Кого лечить --</option>';

    players.forEach(player => {
        // 1. Отрисовка списка игроков карточками
        const row = document.createElement('div');
        row.className = `player-row ${player.isAlive ? '' : 'dead'}`;

        row.innerHTML = `
            <div class="player-info">
                <strong>${player.name}</strong>
                <span class="badge">${player.role}</span>
            </div>
            <button class="btn-kill ${player.isAlive ? '' : 'is-dead'}" onclick="toggleLife('${player.id}')">
                ${player.isAlive ? 'Убить' : 'Оживить'}
            </button>
        `;
        container.appendChild(row);

        // 2. Наполнение селекторов выбора (только живыми игроками)
        if (player.isAlive) {
            const optKill = new Object(document.createElement('option'));
            optKill.value = player.id;
            optKill.textContent = player.name;
            killSelect.appendChild(optKill);

            const optHeal = document.createElement('option');
            optHeal.value = player.id;
            optHeal.textContent = player.name;
            healSelect.appendChild(optHeal);
        }
    });
}

// Переключение статуса живой/мертвый вручную (по клику на кнопку в списке)
function toggleLife(id) {
    const player = players.find(p => p.id === id);
    if (player) {
        player.isAlive = !player.isAlive;
        addLog(`Статус игрока ${player.name} изменен вручную на: ${player.isAlive ? 'Жив' : 'Мертв'}.`);
        updateUI();
    }
}

// Функция записи логов
function addLog(text) {
    const logUl = document.getElementById('gameLog');
    const li = document.createElement('li');
    li.textContent = text;
    logUl.insertBefore(li, logUl.firstChild); // новые логи сверху
}
