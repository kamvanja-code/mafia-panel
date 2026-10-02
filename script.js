let players = [];
let nightCounter = 1;

document.addEventListener('DOMContentLoaded', () => {
    const addPlayerBtn = document.getElementById('addPlayerBtn');
    const playerNameInput = document.getElementById('playerName');
    const playerRoleSelect = document.getElementById('playerRoleSelect');
    const processNightBtn = document.getElementById('processNightBtn');

    // Добавление игрока
    addPlayerBtn.addEventListener('click', () => {
        const name = playerNameInput.value.trim();
        const role = playerRoleSelect.value;

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

        updateUI();
        addLog(`Игрок ${name} (${role}) вступил в игру.`);
    });

    // Расчет результатов ночи
    processNightBtn.addEventListener('click', () => {
        const isMafiaActive = isRoleActiveAndAlive('Мафия');
        const isDoctorActive = isRoleActiveAndAlive('Доктор');

        const targetToKillId = document.getElementById('targetToKill').value;
        const targetToHealId = document.getElementById('targetToHeal').value;

        addLog(`--- Итоги Ночи №${nightCounter} ---`);

        let killedPlayer = isMafiaActive ? players.find(p => p.id === targetToKillId) : null;
        let healedPlayer = isDoctorActive ? players.find(p => p.id === targetToHealId) : null;

        // Логика Мафии
        if (killedPlayer) {
            // Если мафия стреляла, а Доктор жив и выбрал того же игрока
            if (healedPlayer && killedPlayer.id === healedPlayer.id) {
                addLog(`🌙 Мафия пыталась убить ${killedPlayer.name}, но Доктор спас его!`);
            } else {
                killedPlayer.isAlive = false;
                addLog(`💀 Мафия убила игрока ${killedPlayer.name}.`);
            }
        }

        // Логика Доктора (если лечил кого-то другого или мафия вообще не стреляла)
        if (healedPlayer && (!killedPlayer || killedPlayer.id !== healedPlayer.id)) {
            addLog(`🩺 Доктор вылечил игрока ${healedPlayer.name}.`);
        }

        nightCounter++;
        updateUI();
    });
});

// Проверка: есть ли роль за столом и жива ли она
function isRoleActiveAndAlive(roleName) {
    return players.some(p => p.role === roleName && p.isAlive);
}

// Функция обновления всего интерфейса
function updateUI() {
    const container = document.getElementById('playersContainer');
    const killSelect = document.getElementById('targetToKill');
    const healSelect = document.getElementById('targetToHeal');

    const mafiaBlock = document.getElementById('mafiaActionBlock');
    const doctorBlock = document.getElementById('doctorActionBlock');
    const noRolesMsg = document.getElementById('noActiveRolesMessage');
    const processBtn = document.getElementById('processNightBtn');

    // Очищаем списки выбора
    container.innerHTML = '';
    killSelect.innerHTML = '<option value="">-- Не стрелять --</option>';
    healSelect.innerHTML = '<option value="">-- Не лечить --</option>';

    // Проверяем статусы ролей
    const mafiaAlive = isRoleActiveAndAlive('Мафия');
    const doctorAlive = isRoleActiveAndAlive('Доктор');

    // Отображаем или скрываем блоки действий на основе статуса жизни
    mafiaBlock.style.display = mafiaAlive ? 'block' : 'none';
    doctorBlock.style.display = doctorAlive ? 'block' : 'none';

    // Если хоть кто-то активен, показываем кнопку расчета ночи
    if (mafiaAlive || doctorAlive) {
        noRolesMsg.style.display = 'none';
        processBtn.style.display = 'block';
    } else {
        noRolesMsg.style.display = 'block';
        processBtn.style.display = 'none';
    }

    // Рендерим игроков и наполняем списки живыми
    players.forEach(player => {
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

        // Добавляем только живых в списки ночного выбора
        if (player.isAlive) {
            const opt = document.createElement('option');
            opt.value = player.id;
            opt.textContent = player.name;

            if (mafiaAlive) killSelect.appendChild(opt.cloneNode(true));
            if (doctorAlive) healSelect.appendChild(opt);
        }
    });
}

// Ручное изменение статуса (кнопка Убить/Оживить в списке игроков)
function toggleLife(id) {
    const player = players.find(p => p.id === id);
    if (player) {
        player.isAlive = !player.isAlive;
        addLog(`Ведущий изменил статус ${player.name} на: ${player.isAlive ? 'Жив' : 'Мертв'}.`);
        updateUI();
    }
}

function addLog(text) {
    const logUl = document.getElementById('gameLog');
    const li = document.createElement('li');
    li.textContent = text;
    logUl.insertBefore(li, logUl.firstChild);
}
