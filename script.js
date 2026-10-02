let players = [];
let gamePhase = 'setup';
let nightCounter = 1;
let morningSpeechText = "";

const mafiaFraction = ['Мафия', 'Оборотень', 'Босс', 'Нагнетатель', 'Киллер', 'Сэнсей', 'Камикадзе', 'Ниндзя'];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addPlayerBtn').addEventListener('click', addPlayer);
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('processDayBtn').addEventListener('click', processDayVoting);
});

function addPlayer() {
    if (gamePhase !== 'setup') return;
    const nameInp = document.getElementById('playerName');
    const name = nameInp.value.trim();
    const role = document.getElementById('playerRoleSelect').value;

    if (!name) { alert('Введите имя игрока!'); return; }

    players.push({
        id: Date.now().toString(),
        name: name,
        role: role,
        isAlive: true,
        votes: 0,
        isSilenced: false,
        senseiShield: (role === 'Сэнсей')
    });

    nameInp.value = '';
    updateUI();
    addLog(`Добавлен: ${name} (${role})`);
}

function startGame() {
    if (players.length < 2) { alert('Добавьте хотя бы 2 игроков!'); return; }
    gamePhase = 'night';
    document.getElementById('setupCard').style.display = 'none';
    addLog(`🏁 Игра началась! Наступает Ночь №${nightCounter}`);
    updateUI();
}

function isAlive(role) {
    return players.some(p => p.role === role && p.isAlive);
}

function updateUI() {
    document.getElementById('aliveCount').textContent = players.filter(p => p.isAlive).length;

    const phaseInd = document.getElementById('phaseIndicator');
    const phaseText = document.getElementById('phaseText');
    if (gamePhase === 'setup') {
        phaseText.textContent = '🏙️ Сейчас: Этап настройки стола';
    } else if (gamePhase === 'night') {
        phaseText.textContent = `🌙 Сейчас: Ночь №${nightCounter}`;
        phaseInd.style.background = '#16213e';
    } else {
        phaseText.textContent = `☀️ Сейчас: День №${nightCounter}`;
        phaseInd.style.background = '#d97706';
    }

    const container = document.getElementById('playersContainer');
    container.innerHTML = '';
    players.forEach(p => {
        const row = document.createElement('div');
        row.className = `player-row ${p.isAlive ? '' : 'dead'}`;
        row.innerHTML = `
            <div class="player-info">
                <strong>${p.name}</strong>
                <span class="badge" style="background:${mafiaFraction.includes(p.role)?'#dc2626':'#1f4068'}">${p.role}</span>
            </div>
            <button class="btn-kill ${p.isAlive ? '' : 'is-dead'}" onclick="manualToggleLife('${p.id}')">
                ${p.isAlive ? 'Убить' : 'Оживить'}
            </button>
        `;
        container.appendChild(row);
    });

    renderNightControls();
    renderDayControls();
}
function renderNightControls() {
    const form = document.getElementById('nightForm');
    const title = document.getElementById('actionCardTitle');

    if (gamePhase !== 'night') { form.style.display = 'none'; return; }

    title.textContent = `🌙 Ночные действия (Ночь ${nightCounter})`;
    form.innerHTML = '';
    form.style.display = 'block';

    const alivePlayers = players.filter(p => p.isAlive);

    function createSelectHtml(id, labelText) {
        let html = `<div class="night-action-block"><label>${labelText}</label><select id="${id}"><option value="">-- Пропустить ход --</option>`;
        alivePlayers.forEach(p => { html += `<option value="${p.id}">${p.name}</option>`; });
        html += `</select></div>`;
        return html;
    }

    if (isAlive('Любовница')) form.innerHTML += createSelectHtml('actLove', '💘 Любовница: кого заблокировать?');
    if (isAlive('Телохранитель')) form.innerHTML += createSelectHtml('actGuard', '🛡️ Телохранитель: кого защитить?');

    const totalMafiaAlive = players.filter(p => mafiaFraction.includes(p.role) && p.isAlive);
    const regularShooters = totalMafiaAlive.filter(p => p.role !== 'Босс');
    const hasBoss = isAlive('Босс');

    if (regularShooters.length > 0 || (hasBoss && regularShooters.length === 0)) {
        form.innerHTML += createSelectHtml('actMafia1', '🎯 Мафия: Основная жертва');

        let killerActive = totalMafiaAlive.length === 1 && totalMafiaAlive[0].role === 'Киллер';
        if (killerActive) {
            form.innerHTML += createSelectHtml('actMafia2', '🔥 Киллер (Один): Второй выстрел');
        }
    }

    if (isAlive('Нагнетатель')) form.innerHTML += createSelectHtml('actNagnet', '🤫 Нагнетатель: кого лишить голоса?');
    if (isAlive('Комиссар')) form.innerHTML += createSelectHtml('actSheriff', '🔍 Комиссар: в кого стрелять?');

    if (isAlive('Священник')) {
        form.innerHTML += createSelectHtml('actPriestTarget', '⛪ Священник: выбор цели');
        form.innerHTML += `<div class="night-action-block"><label>⛪ Действие Священника:</label>
            <select id="actPriestType">
                <option value="check">Проверить (Совершал ли убийства?)</option>
                <option value="execute">Казнить (Убить игрока)</option>
            </select></div>`;
    }

    form.innerHTML += `<button onclick="calculateNight()" class="btn-night">☀️ Рассчитать итоги ночи</button>`;
}

function calculateNight() {
    const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";

    let loveTargetId = getVal('actLove');
    let guardTargetId = getVal('actGuard');
    let mafia1Id = getVal('actMafia1');
    let mafia2Id = getVal('actMafia2');
    let nagnetId = getVal('actNagnet');
    let sheriffId = getVal('actSheriff');
    let priestTargetId = getVal('actPriestTarget');
    let priestType = getVal('actPriestType');

    players.forEach(p => p.isSilenced = false);

    let blockedRoles = [];
    if (loveTargetId) {
        let p = players.find(x => x.id === loveTargetId);
        if (p) blockedRoles.push(p.role);
    }

    let targetsToKill = [];
    let logs = [];
    let morningReport = [];

    const isBlocked = (role) => blockedRoles.includes(role);

    if (nagnetId && !isBlocked('Нагнетатель')) {
        let p = players.find(x => x.id === nagnetId);
        if (p) { p.isSilenced = true; logs.push(`Нагнетатель лишил права голоса игрока ${p.name}.`); }
    }

    let mafiaAttacks = [];
    if (mafia1Id && !isBlocked('Мафия') && !isBlocked('Оборотень') && !isBlocked('Босс') && !isBlocked('Киллер') && !isBlocked('Нагнетатель') && !isBlocked('Сэнсей') && !isBlocked('Камикадзе') && !isBlocked('Ниндзя')) {
        mafiaAttacks.push(mafia1Id);
    }
    if (mafia2Id && !isBlocked('Киллер')) mafiaAttacks.push(mafia2Id);

    mafiaAttacks.forEach(targetId => {
        let target = players.find(x => x.id === targetId);
        if (!target) return;

        if (target.role === 'Бессмертный') {
            logs.push(`Мафия атаковала Бессмертного (${target.name}), атака бесполезна.`);
            return;
        }
        targetsToKill.push({ targetId: targetId, reason: 'мафии' });
    });
    if (sheriffId && !isBlocked('Комиссар')) {
        let target = players.find(x => x.id === sheriffId);
        if (target) {
            targetsToKill.push({ targetId: target.id, reason: 'Комиссара' });
            if (!mafiaFraction.includes(target.role)) {
                let commisar = players.find(x => x.role === 'Комиссар' && x.isAlive);
                if (commisar) targetsToKill.push({ targetId: commisar.id, reason: 'своей ошибки (стрелял в мирного)' });
            }
        }
    }

    if (priestTargetId && !isBlocked('Священник')) {
        let target = players.find(x => x.id === priestTargetId);
        if (target) {
            if (priestType === 'execute') {
                targetsToKill.push({ targetId: target.id, reason: 'Священника' });
            } else {
                let clear = (!mafiaFraction.includes(target.role) || target.role === 'Оборотень');
                logs.push(`Священник проверил ${target.name}: грехов за ним ${clear ? 'не обнаружено' : 'обнаружено (Мафия)'}.`);
            }
        }
    }

    let deadThisNight = new Set();

    targetsToKill.forEach(attack => {
        let victim = players.find(x => x.id === attack.targetId);
        if (!victim || !victim.isAlive) return;

        if (guardTargetId && victim.id === guardTargetId && !isBlocked('Телохранитель')) {
            let guard = players.find(x => x.role === 'Телохранитель' && x.isAlive);
            if (guard && !deadThisNight.has(guard.id)) {
                deadThisNight.add(guard.id);
                morningReport.push(`🛡️ Нападение на ${victim.name} было предотвращено! Но Телохранитель погиб, защищая его.`);
                return;
            }
        }

        if (victim.role === 'Сэнсей' && victim.senseiShield) {
            victim.senseiShield = false;
            morningReport.push(`🥋 Сэнсей парировал ночную атаку на себя и остался невредим!`);
            return;
        }

        deadThisNight.add(victim.id);
        morningReport.push(`💀 Был убит игрок ${victim.name} от рук ${attack.reason}.`);
    });

    deadThisNight.forEach(id => {
        let p = players.find(x => x.id === id);
        if (p) p.isAlive = false;
    });

    if (morningReport.length === 0) {
        morningReport.push("🏙️ Утро наступило! Невероятно, но этой ночью никто не погиб. Все живы!");
    }

    morningSpeechText = `--- Результаты Ночи №${nightCounter} ---\n` + morningReport.join('\n');

    logs.forEach(l => addLog(l));
    addLog(`--- Итоги Ночи №${nightCounter} подведены ---`);

    gamePhase = 'day';
    updateUI();
    openModal('speechModal');
    document.getElementById('speechContent').textContent = morningSpeechText;
}

function renderDayControls() {
    const form = document.getElementById('dayForm');
    const title = document.getElementById('actionCardTitle');
    const container = document.getElementById('votingContainer');

    if (gamePhase !== 'day') { form.style.display = 'none'; return; }

    title.textContent = `☀️ Дневное голосование (День ${nightCounter})`;
    container.innerHTML = '';
    form.style.display = 'block';

    players.filter(p => p.isAlive).forEach(p => {
        const div = document.createElement('div');
        div.className = 'vote-row';
        div.innerHTML = `
            <span>${p.name} ${p.isSilenced ? '<span class="silent-tag">[МОЛЧИТ]</span>' : ''}</span>
            <div class="vote-controls">
                <span class="vote-count" id="vCount-${p.id}">0</span>
                <button class="btn-v-plus" onclick="changeVote('${p.id}', 1)" ${p.isSilenced ? 'disabled' : ''}>+1</button>
                <button class="btn-v-minus" onclick="changeVote('${p.id}', -1)" ${p.isSilenced ? 'disabled' : ''}>-1</button>
            </div>
        `;
        container.appendChild(div);
        p.votes = 0;
    });
}

function changeVote(id, amount) {
    const player = players.find(p => p.id === id);
    if (!player) return;
    player.votes = Math.max(0, player.votes + amount);
    document.getElementById(`vCount-${id}`).textContent = player.votes;
}

function processDayVoting() {
    let alive = players.filter(p => p.isAlive);
    if (alive.length === 0) return;

    let maxVotes = Math.max(...alive.map(p => p.votes));
    let candidates = alive.filter(p => p.votes === maxVotes && p.votes > 0);

    if (candidates.length !== 1) {
        morningSpeechText = "⚖️ Голосование окончено. Город разделился во мнениях или никто не проголосовал. Никто не покинул стол.";
        addLog("Днём никто не был изгнан.");
    } else {
        let exiled = candidates[0];
        exiled.isAlive = false;
        morningSpeechText = `⚖️ По итогам дневного голосования город изгнал игрока: ${exiled.name} (${exiled.role}).`;
        addLog(`Город изгнал: ${exiled.name}`);

        if (exiled.role === 'Камикадзе') {
            let targets = players.filter(p => p.isAlive && p.id !== exiled.id);
            if (targets.length > 0) {
                let collateral = targets[Math.floor(Math.random() * targets.length)];
                collateral.isAlive = false;
                morningSpeechText += `\n💥 Изгнанный оказался Камикадзе! Уходя, он взрывает игрока: ${collateral.name}.`;
                addLog(`Камикадзе уничтожил ${collateral.name}`);
            }
        }
    }

    nightCounter++;
    gamePhase = 'night';
    updateUI();
    openModal('speechModal');
    document.getElementById('speechContent').textContent = morningSpeechText;
}

function manualToggleLife(id) {
    const player = players.find(p => p.id === id);
    if (player) {
        player.isAlive = !player.isAlive;
        addLog(`Статус ${player.name} изменен вручную (${player.isAlive ? 'Жив' : 'Мертв'})`);
        updateUI();
    }
}

function openModal(id) { document.getElementById(id).style.display = 'block'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function addLog(text) {
    const logUl = document.getElementById('gameLog');
    const li = document.createElement('li');
    li.textContent = text;
    logUl.insertBefore(li, logUl.firstChild);
}
