let players = [];
let gamePhase = 'setup';
let nightCounter = 1;
let morningSpeechText = "";

const mafiaFraction = ['Мафия', 'Оборотень', 'Босс', 'Нагнетатель', 'Киллер', 'Сэнсей', 'Камикадзе', 'Ниндзя'];
const activePeaceful = ['Доктор', 'Бессмертный', 'Любовница', 'Телохранитель', 'Комиссар', 'Священник', 'Журналист', 'Свидетель'];

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

function getSelectOptionsHtml(alivePlayers) {
    let html = '<option value="">-- Не выбирать --</option>';
    alivePlayers.forEach(p => { html += `<option value="${p.id}">${p.name}</option>`; });
    return html;
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

        let borderCol = '#1f4068';
        let badgeBg = '#1f4068';

        if (mafiaFraction.includes(p.role)) { borderCol = '#dc2626'; badgeBg = '#dc2626'; }
        else if (activePeaceful.includes(p.role)) { borderCol = '#10b981'; badgeBg = '#10b981'; }
        else if (p.role === 'Маньяк') { borderCol = '#8b5cf6'; badgeBg = '#8b5cf6'; }

        row.style.borderLeftColor = borderCol;

        row.innerHTML = `
            <div class="player-info">
                <strong>${p.name}</strong>
                <span class="badge" style="background:${badgeBg}">${p.role}</span>
            </div>
            <button class="btn-kill ${p.isAlive ? '' : 'is-dead'}" onclick="manualToggleLife('${p.id}')">
                ${p.isAlive ? 'Убить' : 'Оживить'}
            </button>
        `;
        container.appendChild(row);
    });

    renderNightControls();
    renderDayControls();
    checkGameEnd();
}

function renderNightControls() {
    const form = document.getElementById('nightForm');
    const title = document.getElementById('actionCardTitle');

    if (gamePhase !== 'night') { form.style.display = 'none'; return; }

    title.textContent = `🌙 Ночные действия (Ночь ${nightCounter})`;
    form.innerHTML = '';
    form.style.display = 'block';

    const alivePlayers = players.filter(p => p.isAlive);
    const opts = getSelectOptionsHtml(alivePlayers);

    if (isAlive('Любовница')) {
        form.innerHTML += `<div class="night-role-card" style="border-left: 4px solid #10b981;">
            <h4>💘 Любовница</h4>
            <div class="night-field-group"><label>Кого заблокировать на эту ночь?</label><select id="actLove">${opts}</select></div>
        </div>`;
    }

    if (isAlive('Телохранитель')) {
        form.innerHTML += `<div class="night-role-card" style="border-left: 4px solid #10b981;">
            <h4>🛡️ Телохранитель</h4>
            <div class="night-field-group"><label>Кого защитить от атаки?</label><select id="actGuard">${opts}</select></div>
        </div>`;
    }

    if (isAlive('Доктор')) {
        form.innerHTML += `<div class="night-role-card" style="border-left: 4px solid #10b981;">
            <h4>🩺 Доктор</h4>
            <div class="night-field-group"><label>Кого вылечить ночью?</label><select id="actHeal">${opts}</select></div>
        </div>`;
    }

    const totalMafiaAlive = players.filter(p => mafiaFraction.includes(p.role) && p.isAlive);
    const regularShooters = totalMafiaAlive.filter(p => p.role !== 'Босс');
    const hasBoss = isAlive('Босс');

    if (regularShooters.length > 0 || (hasBoss && regularShooters.length === 0)) {
        let mafiaCardHtml = `<div class="night-role-card" style="border-left: 4px solid #dc2626;">
            <h4>🎯 Фракция Мафии</h4>
            <div class="night-field-group"><label>Основная цель для стрельбы:</label><select id="actMafia1">${opts}</select></div>`;
        if (totalMafiaAlive.length === 1 && totalMafiaAlive[0].role === 'Киллер') {
            mafiaCardHtml += `<div class="night-field-group"><label>🔥 Второй выстрел Киллера:</label><select id="actMafia2">${opts}</select></div>`;
        }
        mafiaCardHtml += `</div>`;
        form.innerHTML += mafiaCardHtml;
    }
    if (isAlive('Ниндзя')) {
        form.innerHTML += `<div class="night-role-card" style="border-left: 4px solid #dc2626;">
            <h4>🥷 Ниндзя</h4>
            <div class="night-field-group"><label>Какого игрока атаковать скрытно?</label><select id="actNinjaGuessTarget">${opts}</select></div>
            <div class="night-field-group"><label>Предположение роли:</label>
                <select id="actNinjaRoleGuess"><option value="">-- Нет предположения --</option>
                <option value="Мирный">Мирный</option><option value="Бессмертный">Бессмертный</option>
                <option value="Любовница">Любовница</option><option value="Телохранитель">Телохранитель</option>
                <option value="Комиссар">Комиссар</option><option value="Священник">Священник</option>
                <option value="Журналист">Журналист</option><option value="Свидетель">Свидетель</option>
                <option value="Маньяк">Маньяк</option><option value="Доктор">Доктор</option></select></div>
        </div>`;
    }

    if (isAlive('Маньяк')) {
        form.innerHTML += `<div class="night-role-card" style="border-left: 4px solid #8b5cf6;">
            <h4>🔮 Маньяк</h4>
            <div class="night-field-group"><label>Цель охоты (умрёт, если не обычный Мирный):</label><select id="actManiac">${opts}</select></div>
        </div>`;
    }

    if (isAlive('Нагнетатель')) {
        form.innerHTML += `<div class="night-role-card" style="border-left: 4px solid #dc2626;">
            <h4>🤫 Нагнетатель</h4>
            <div class="night-field-group"><label>Кого заставить молчать весь следующий день?</label><select id="actNagnet">${opts}</select></div>
        </div>`;
    }

    if (isAlive('Комиссар')) {
        form.innerHTML += `<div class="night-role-card" style="border-left: 4px solid #10b981;">
            <h4>🔍 Комиссар</h4>
            <div class="night-field-group"><label>В кого совершить выстрел?</label><select id="actSheriff">${opts}</select></div>
        </div>`;
    }

    if (isAlive('Священник')) {
        form.innerHTML += `<div class="night-role-card" style="border-left: 4px solid #10b981;">
            <h4>⛪ Священник</h4>
            <div class="night-field-group"><label>Выбор цели:</label><select id="actPriestTarget">${opts}</select></div>
            <div class="night-field-group"><label>Тип действия:</label><select id="actPriestType"><option value="check">Проверить</option><option value="execute">Казнить</option></select></div>
        </div>`;
    }

    if (isAlive('Журналист')) {
        form.innerHTML += `<div class="night-role-card" style="border-left: 4px solid #10b981;">
            <h4>📰 Журналист</h4>
            <div class="night-field-group"><label>Первый игрок:</label><select id="actJourno1">${opts}</select></div>
            <div class="night-field-group"><label>Второй игрок:</label><select id="actJourno2">${opts}</select></div>
        </div>`;
    }

    if (isAlive('Свидетель')) {
        form.innerHTML += `<div class="night-role-card" style="border-left: 4px solid #10b981;">
            <h4>👁️ Свидетель</h4>
            <div class="night-field-group"><label>За кем установить слежку?</label><select id="actWitness">${opts}</select></div>
        </div>`;
    }

    form.innerHTML += `<button onclick="calculateNight()" class="btn-night">☀️ Рассчитать итоги ночи</button>`;
}

function calculateNight() {
    const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";

    let loveTargetId = getVal('actLove');
    let guardTargetId = getVal('actGuard');
    let healTargetId = getVal('actHeal');
    let mafia1Id = getVal('actMafia1');
    let mafia2Id = getVal('actMafia2');
    let ninjaGuessTargetId = getVal('actNinjaGuessTarget');
    let ninjaRoleGuess = getVal('actNinjaRoleGuess');
    let maniacTargetId = getVal('actManiac');
    let nagnetId = getVal('actNagnet');
    let sheriffId = getVal('actSheriff');
    let priestTargetId = getVal('actPriestTarget');
    let priestType = getVal('actPriestType');
    let journo1Id = getVal('actJourno1');
    let journo2Id = getVal('actJourno2');
    let witnessId = getVal('actWitness');

    players.forEach(p => p.isSilenced = false);

    let blockedRoles = [];
    if (loveTargetId) {
        let p = players.find(x => x.id === loveTargetId);
        if (p) blockedRoles.push(p.role);
    }

    let targetsToKill = [];
    let killersThisNight = new Set();
    let logs = [];
    let morningReport = [];

    const isBlocked = (role) => blockedRoles.includes(role);

    if (nagnetId && !isBlocked('Нагнетатель')) {
        let p = players.find(x => x.id === nagnetId);
        if (p) { p.isSilenced = true; logs.push(`Нагнетатель заставил молчать игрока ${p.name}.`); }
    }

    let mafiaAttacks = [];
    if (mafia1Id && !isBlocked('Мафия') && !isBlocked('Оборотень') && !isBlocked('Босс') && !isBlocked('Киллер') && !isBlocked('Нагнетатель') && !isBlocked('Сэнсей') && !isBlocked('Камикадзе') && !isBlocked('Ниндзя')) {
        mafiaAttacks.push(mafia1Id);
        let currentShooter = players.find(x => mafiaFraction.includes(x.role) && x.isAlive);
        if(currentShooter) killersThisNight.add(currentShooter.id);
    }
    if (mafia2Id && !isBlocked('Киллер')) { mafiaAttacks.push(mafia2Id); }

    if (ninjaGuessTargetId && ninjaRoleGuess && !isBlocked('Ниндзя')) {
        let target = players.find(x => x.id === ninjaGuessTargetId);
        if (target && target.role === ninjaRoleGuess) {
            mafiaAttacks.push(ninjaGuessTargetId);
            logs.push(`🥷 Ниндзя угадал роль игрока ${target.name} и совершил убийство!`);
        }
    }

    mafiaAttacks.forEach(targetId => {
        let target = players.find(x => x.id === targetId);
        if (target && target.role !== 'Бессмертный') targetsToKill.push({ targetId: targetId, reason: 'мафии' });
    });

    if (maniacTargetId && !isBlocked('Маньяк')) {
        let target = players.find(x => x.id === maniacTargetId);
        if (target) {
            if (target.role !== 'Мирный') {
                targetsToKill.push({ targetId: target.id, reason: 'Маньяка' });
                let m = players.find(x => x.role === 'Маньяк' && x.isAlive);
                if(m) killersThisNight.add(m.id);
            } else {
                logs.push(`🔮 Маньяк напал на обычного Мирного (${target.name}), цель выжила.`);
            }
        }
    }
    if (sheriffId && !isBlocked('Комиссар')) {
        let target = players.find(x => x.id === sheriffId);
        if (target) {
            targetsToKill.push({ targetId: target.id, reason: 'Комиссара' });
            if (!mafiaFraction.includes(target.role)) {
                let commisar = players.find(x => x.role === 'Комиссар' && x.isAlive);
                if (commisar) targetsToKill.push({ targetId: commisar.id, reason: 'ошибки Комиссара' });
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
                logs.push(`⛪ Священник проверил ${target.name}: грехов ${clear ? 'не обнаружено' : 'обнаружено'}.`);
            }
        }
    }

    if (journo1Id && journo2Id && !isBlocked('Журналист')) {
        let p1 = players.find(x => x.id === journo1Id);
        let p2 = players.find(x => x.id === journo2Id);
        if (p1 && p2) {
            let type1 = mafiaFraction.includes(p1.role) ? 'мафия' : (p1.role === 'Маньяк' ? 'маньяк' : 'мирный');
            let type2 = mafiaFraction.includes(p2.role) ? 'мафия' : (p2.role === 'Маньяк' ? 'маньяк' : 'мирный');
            let checkResult = (type1 === type2) ? "ОДИНАКОВЫЙ" : "РАЗНЫЙ";
            logs.push(`📰 Журналист сравнил ${p1.name} и ${p2.name}: у них ${checkResult} статус.`);
        }
    }

    if (witnessId && !isBlocked('Свидетель')) {
        let target = players.find(x => x.id === witnessId);
        if (target) {
            let didKill = killersThisNight.has(target.id);
            logs.push(`👁️ Свидетель следил за ${target.name}: этот игрок ночью ${didKill ? 'СОВЕРШАЛ' : 'НЕ СОВЕРШАЛ'} убийство.`);
        }
    }

    let deadThisNight = new Set();
    targetsToKill.forEach(attack => {
        let victim = players.find(x => x.id === attack.targetId);
        if (!victim || !victim.isAlive) return;

        // Лечение Доктора (Доктор должен быть жив и не заблокирован Любовницей)
        if (healTargetId && victim.id === healTargetId && !isBlocked('Доктор')) {
            morningReport.push(`🩺 Доктор спас игрока ${victim.name} от неминуемой смерти!`);
            return;
        }

        if (guardTargetId && victim.id === guardTargetId && !isBlocked('Телохранитель')) {
            let guard = players.find(x => x.role === 'Телохранитель' && x.isAlive);
            if (guard && !deadThisNight.has(guard.id)) {
                deadThisNight.add(guard.id);
                morningReport.push(`🛡️ Нападение на ${victim.name} отбито! Телохранитель погиб защищая его.`);
                return;
            }
        }

        if (victim.role === 'Сэнсей' && victim.senseiShield) {
            victim.senseiShield = false;
            morningReport.push(`🥋 Сэнсей парировал ночную атаку!`);
            return;
        }

        deadThisNight.add(victim.id);
        morningReport.push(`💀 Убит игрок ${victim.name} от рук ${attack.reason}.`);
    });

    deadThisNight.forEach(id => {
        let p = players.find(x => x.id === id);
        if (p) p.isAlive = false;
    });

    if (morningReport.length === 0) morningReport.push("🏙️ Утро! Этой ночью никто не погиб.");

    morningSpeechText = `--- Утро Ночи №${nightCounter} ---\n` + morningReport.join('\n');
    logs.forEach(l => addLog(l));

    gamePhase = 'day';
    updateUI();
    openModal('speechModal');
    document.getElementById('speechContent').textContent = morningSpeechText;
}

function renderDayControls() {
    const form = document.getElementById('dayForm');
    const container = document.getElementById('votingContainer');

    if (gamePhase !== 'day') { form.style.display = 'none'; return; }
    container.innerHTML = '';
    form.style.display = 'block';

    players.filter(p => p.isAlive).forEach(p => {
        const div = document.createElement('div');
        div.className = 'vote-row';
        div.innerHTML = `
            <span>${p.name} ${p.isSilenced ? '<span class="silent-tag">[МОЛЧИТ]</span>' : ''}</span>
            <div class="vote-controls">
                <span class="vote-count" id="vCount-${p.id}">0</span>
                <button class="btn-v-plus" onclick="changeVote('${p.id}', 1)">+1</button>
                <button class="btn-v-minus" onclick="changeVote('${p.id}', -1)">-1</button>
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
        morningSpeechText = "⚖️ Суд Линча не состоялся. Мнения разделились.";
    } else {
        let exiled = candidates[0];
        exiled.isAlive = false;
        morningSpeechText = `⚖️ Город изгнал игрока: ${exiled.name} (${exiled.role}).`;

        if (exiled.role === 'Камикадзе') {
            let targets = players.filter(p => p.isAlive && p.id !== exiled.id);
            if (targets.length > 0) {
                let collateral = targets[Math.floor(Math.random() * targets.length)];
                collateral.isAlive = false;
                morningSpeechText += `\n💥 Камикадзе взрывает с собой: ${collateral.name}.`;
            }
        }
    }

    nightCounter++;
    gamePhase = 'night'; // Переходим в ночь, проверка конца игры сработает внутри updateUI()
    updateUI();
    openModal('speechModal');
    document.getElementById('speechContent').textContent = morningSpeechText;
}

function checkGameEnd() {
    if (gamePhase === 'setup') return;

    let alive = players.filter(p => p.isAlive);
    let mafiaCount = alive.filter(p => mafiaFraction.includes(p.role)).length;
    let maniacCount = alive.filter(p => p.role === 'Маньяк').length;
    let peacefulCount = alive.length - mafiaCount - maniacCount;

    let overBlock = document.getElementById('noirGameOverScreen');
    let title = document.getElementById('newspaperTitle');
    let story = document.getElementById('newspaperStory');

    let activeNonPeacefulCount = alive.filter(p => p.role !== 'Мирный').length;

    // 1. Условие Маньяка
    if (maniacCount > 0 && activeNonPeacefulCount === 1) {
        title.textContent = "КРОВАВЫЙ ТРИУМФ ОДИНОЧКИ!";
        story.textContent = "Все криминальные синдикаты разгромлены, а мирные граждане заперлись в домах. Город полностью перешел под контроль безумного Одиночки. Маньяк празднует победу на залитых неоном пустых улицах.";
        overBlock.style.display = 'flex';
        return;
    }

    // 2. Условие Мафии (Срабатывает ТОЛЬКО при наступлении ночи)
    if (gamePhase === 'night' && mafiaCount >= (peacefulCount + maniacCount) && mafiaCount > 0) {
        title.textContent = "МАФИЯ ПОЛНОСТЬЮ ПОДЧИНИЛА ГОРОД!";
        story.textContent = "Честные люди проиграли эту войну. Коррупция и мафиозные кланы полностью захватили контроль над мэрией, полицией и судами. С этого дня законы диктуются Семьей. Криминальная эра официально началась.";
        overBlock.style.display = 'flex';
        return;
    }

    // 3. Условие Мирных
    if (mafiaCount === 0 && maniacCount === 0) {
        title.textContent = "ПРАВОСУДИЕ СТОРЖЕСТВОВАЛО!";
        story.textContent = "Долгий кошмар окончен. Объединенными усилиями Комиссара, Священника, Доктора и честных граждан все члены организованной преступности и безумные убийцы были вычислены. Город наконец-то может спать спокойно.";
        overBlock.style.display = 'flex';
        return;
    }
}

function manualToggleLife(id) {
    const player = players.find(p => p.id === id);
    if (player) {
        player.isAlive = !player.isAlive;
        addLog(`Статус ${player.name} изменен (${player.isAlive ? 'Жив' : 'Мертв'})`);
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
