let alle = [];
let byId = new Map();
let valgtPokemon = null;
let fokusStat = 'hp';

const BILDE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const KUNST_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';
const STAT_FELT = [
  ['hp', 'HP'],
  ['attack', 'Attack'],
  ['defense', 'Defense'],
  ['special_attack', 'Sp. Atk'],
  ['special_defense', 'Sp. Def'],
  ['speed', 'Speed'],
];
// Fulle navn til bruk i anbefalings-setninger, der de korte etikettene blir for kryptiske
const STAT_SETNING = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  special_attack: 'Special Attack',
  special_defense: 'Special Defense',
  speed: 'Speed',
};
const STAT_MAKS = 200;
const MAKS_SOKETREFF = 20;
// Store legendariske fugler/psyko-tunge slag, valgt tilfeldig som "fjes" bak overskriften
const HOVED_DEKOR_ID = ['144', '145', '146', '150', '249'];
// Faste, godt kjente "heavy hitters" og en ikonisk figur i hjørnene
const HJORNE_DEKOR = [
  { id: '383', klasse: 'dekor-groudon' },
  { id: '384', klasse: 'dekor-rayquaza' },
  { id: '25', klasse: 'dekor-pikachu' },
];

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    const rad = {};
    headers.forEach((h, i) => {
      rad[h] = values[i];
    });
    return rad;
  });
}

function storForbokstav(tekst) {
  return tekst.charAt(0).toUpperCase() + tekst.slice(1);
}

function formatEvne(navn) {
  return navn.split('-').map(storForbokstav).join(' ');
}

function kontrastFarge(hex) {
  if (!hex || hex === 'NA') return '#111111';
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#111111' : '#ffffff';
}

function bildeHtml(rad, klasse) {
  if (rad.url_image === 'NA') return '';
  const url = BILDE_BASE + rad.url_image;
  return `<img class="${klasse}" src="${url}" alt="${storForbokstav(rad.pokemon)}" onerror="this.remove()">`;
}

function kunstHtml(rad, klasse) {
  const url = `${KUNST_BASE}${rad.id}.png`;
  return `<img class="${klasse}" src="${url}" alt="${storForbokstav(rad.pokemon)}" onerror="this.remove()">`;
}

function tyBadges(rad) {
  let html = `<span class="type" style="background:${rad.color_1};color:${kontrastFarge(rad.color_1)}">${storForbokstav(rad.type_1)}</span>`;
  if (rad.type_2 !== 'NA') {
    html += `<span class="type" style="background:${rad.color_2};color:${kontrastFarge(rad.color_2)}">${storForbokstav(rad.type_2)}</span>`;
  }
  return html;
}

function sumStats(rad) {
  return STAT_FELT.reduce((sum, [felt]) => sum + Number(rad[felt]), 0);
}

function finnForgjenger(rad) {
  if (rad.evolves_from_species_id === 'NA') return null;
  const kandidater = alle.filter(r => r.species_id === rad.evolves_from_species_id);
  return kandidater.find(r => r.id === r.species_id) || kandidater[0] || null;
}

function finnUtviklinger(rad) {
  return alle.filter(r => r.evolves_from_species_id === rad.species_id);
}

function finnKjede(rad) {
  return alle.filter(r => r.evolution_chain_id === rad.evolution_chain_id);
}

function byggInfoListe(rad) {
  const felter = [];
  if (rad.height !== 'NA') felter.push(['Height', `${(Number(rad.height) / 10).toFixed(1)} m`]);
  if (rad.weight !== 'NA') felter.push(['Weight', `${(Number(rad.weight) / 10).toFixed(1)} kg`]);
  if (rad.base_experience !== 'NA') felter.push(['Base EXP', rad.base_experience]);

  const evner = [];
  if (rad.ability_1 !== 'NA') evner.push(formatEvne(rad.ability_1));
  if (rad.ability_2 !== 'NA') evner.push(formatEvne(rad.ability_2));
  if (rad.ability_hidden !== 'NA') evner.push(`${formatEvne(rad.ability_hidden)} (hidden)`);
  if (evner.length > 0) felter.push(['Abilities', evner.join(', ')]);

  if (felter.length === 0) return '';
  return `<dl class="info-liste">${felter.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}

function renderStatEnkel(rad) {
  return STAT_FELT.map(([felt, etikett]) => {
    const verdi = Number(rad[felt]);
    const prosent = Math.min(100, (verdi / STAT_MAKS) * 100);
    return `
      <div class="stat-rad">
        <span class="stat-navn">${etikett}</span>
        <span class="stat-bar"><span class="stat-fyll" style="width:${prosent}%;background:${rad.color_1}"></span></span>
        <span class="stat-verdi">${verdi}</span>
      </div>`;
  }).join('');
}

function renderStatSammenlign(nyRad, naRad) {
  return STAT_FELT.map(([felt, etikett]) => {
    const naVerdi = Number(naRad[felt]);
    const nyVerdi = Number(nyRad[felt]);
    const diff = nyVerdi - naVerdi;
    const naProsent = Math.min(100, (naVerdi / STAT_MAKS) * 100);
    const nyProsent = Math.min(100, (nyVerdi / STAT_MAKS) * 100);
    const diffKlasse = diff > 0 ? 'diff-opp' : diff < 0 ? 'diff-ned' : 'diff-lik';
    const diffTekst = diff > 0 ? `+${diff}` : `${diff}`;
    return `
      <div class="stat-rad stat-rad-sammenlign">
        <span class="stat-navn">${etikett}</span>
        <span class="stat-barer">
          <span class="stat-bar stat-bar-liten"><span class="stat-fyll stat-fyll-na" style="width:${naProsent}%"></span></span>
          <span class="stat-bar stat-bar-liten"><span class="stat-fyll" style="width:${nyProsent}%;background:${nyRad.color_1}"></span></span>
        </span>
        <span class="stat-diff ${diffKlasse}">${diffTekst}</span>
      </div>`;
  }).join('');
}

function renderKjedeNode(rad, valgtSpeciesId, barnPerForelder) {
  const erValgt = rad.species_id === valgtSpeciesId;
  const barn = barnPerForelder.get(rad.species_id) || [];
  return `
    <li>
      <div class="tre-node ${erValgt ? 'tre-node-valgt' : ''}">
        <div class="tre-bilde-wrap">${bildeHtml(rad, 'tre-bilde')}</div>
        <span class="tre-navn">${storForbokstav(rad.pokemon)}</span>
      </div>
      ${barn.length > 0 ? `<ul>${barn.map(b => renderKjedeNode(b, valgtSpeciesId, barnPerForelder)).join('')}</ul>` : ''}
    </li>`;
}

function visKjede(rad) {
  const innhold = document.getElementById('kjede-innhold');
  const kjedeRader = finnKjede(rad);
  const roetter = kjedeRader.filter(r => r.evolves_from_species_id === 'NA');

  if (roetter.length === 0) {
    innhold.innerHTML = '';
    return;
  }

  const barnPerForelder = new Map();
  kjedeRader.forEach(r => {
    if (r.evolves_from_species_id === 'NA') return;
    if (!barnPerForelder.has(r.evolves_from_species_id)) {
      barnPerForelder.set(r.evolves_from_species_id, []);
    }
    barnPerForelder.get(r.evolves_from_species_id).push(r);
  });

  const html = roetter.map(r => renderKjedeNode(r, rad.species_id, barnPerForelder)).join('');
  innhold.innerHTML = `<ul class="tre">${html}</ul>`;
}

function visForgjenger(rad) {
  const innhold = document.getElementById('forgjenger-innhold');
  const forgjenger = finnForgjenger(rad);
  if (!forgjenger) {
    innhold.innerHTML = '<p class="notis">This is a base form. It has not evolved from anything.</p>';
    return;
  }
  innhold.innerHTML = `
    <div class="mini-pokemon">
      ${bildeHtml(forgjenger, 'mini-bilde')}
      <div>
        <span class="mini-navn">${storForbokstav(forgjenger.pokemon)}</span>
        <div class="typer">${tyBadges(forgjenger)}</div>
      </div>
    </div>`;
}

function lagAnbefaling(kandidatNavn, sumDiff, fokusDiff) {
  const fokusNavn = STAT_SETNING[fokusStat];
  const sumSetning = sumDiff > 0
    ? `${kandidatNavn} is ${sumDiff} points stronger overall`
    : `${kandidatNavn} is ${Math.abs(sumDiff)} points weaker overall`;

  if (sumDiff > 0 && fokusDiff >= 0) {
    const fokusSetning = fokusDiff > 0 ? `${fokusNavn} goes up by ${fokusDiff}` : `${fokusNavn} stays the same`;
    return { svar: 'Yes', klasse: 'verdikt-ja', tekst: `${sumSetning}, and ${fokusSetning}.` };
  }

  if (sumDiff > 0 && fokusDiff < 0) {
    return {
      svar: 'Yes, with a caveat',
      klasse: 'verdikt-ja-caveat',
      tekst: `${sumSetning}, but ${fokusNavn} drops by ${Math.abs(fokusDiff)}.`,
    };
  }

  return { svar: 'No', klasse: 'verdikt-nei', tekst: `${sumSetning}, so it is not worth it right now.` };
}

function fokusVelgerHtml() {
  const options = STAT_FELT.map(([felt, etikett]) =>
    `<option value="${felt}" ${felt === fokusStat ? 'selected' : ''}>${etikett}</option>`
  ).join('');
  return `
    <div class="fokus-velger">
      <label for="fokus-stat">Which stat matters most to you?</label>
      <select id="fokus-stat">${options}</select>
    </div>`;
}

function visUtviklinger(rad) {
  const innhold = document.getElementById('utvikling-innhold');
  const kandidater = finnUtviklinger(rad);

  if (kandidater.length === 0) {
    innhold.innerHTML = '<p class="notis">No known evolutions.</p>';
    return;
  }

  const naSum = sumStats(rad);
  const kort = kandidater.map(k => {
    const nySum = sumStats(k);
    const sumDiff = nySum - naSum;
    const sumKlasse = sumDiff > 0 ? 'diff-opp' : sumDiff < 0 ? 'diff-ned' : 'diff-lik';
    const sumTekst = sumDiff > 0 ? `+${sumDiff}` : `${sumDiff}`;
    const fokusDiff = Number(k[fokusStat]) - Number(rad[fokusStat]);
    const anbefaling = lagAnbefaling(storForbokstav(k.pokemon), sumDiff, fokusDiff);
    return `
      <article class="kort kandidat-kort">
        <div class="kort-topp">
          ${bildeHtml(k, 'bilde')}
          <div>
            <h4>${storForbokstav(k.pokemon)}</h4>
            <div class="typer">${tyBadges(k)}</div>
          </div>
        </div>
        <div class="stat-liste">${renderStatSammenlign(k, rad)}</div>
        <p class="sum-diff">Total base stats: <strong>${nySum}</strong> <span class="${sumKlasse}">(${sumTekst})</span></p>
        <div class="verdikt ${anbefaling.klasse}">
          <span class="verdikt-svar">${anbefaling.svar}</span>
          <p class="verdikt-tekst">${anbefaling.tekst}</p>
        </div>
      </article>`;
  }).join('');

  innhold.innerHTML = fokusVelgerHtml() + kort;
}

function visPokemon(rad) {
  document.getElementById('valgt-navn').textContent = `${storForbokstav(rad.pokemon)} (#${rad.id})`;
  document.getElementById('valgt-bilde-wrap').innerHTML = bildeHtml(rad, 'bilde');
  document.getElementById('valgt-typer').innerHTML = tyBadges(rad);
  document.getElementById('valgt-info-liste').innerHTML = byggInfoListe(rad);
  document.getElementById('valgt-stats').innerHTML = renderStatEnkel(rad);

  visKjede(rad);
  visForgjenger(rad);
  visUtviklinger(rad);

  document.getElementById('intro').hidden = true;
  document.getElementById('resultat').hidden = false;
}

function skjulSokResultater() {
  const resultatListe = document.getElementById('sok-resultater');
  resultatListe.hidden = true;
  resultatListe.innerHTML = '';
}

const SOK_RESULTAT_MAKSHOYDE = 368; // ca. 8 rader

function plasserSokResultater() {
  const sok = document.getElementById('sok');
  const resultatListe = document.getElementById('sok-resultater');
  const feltRad = sok.getBoundingClientRect();
  const romUnder = window.innerHeight - feltRad.bottom;
  const romOver = feltRad.top;

  const apneOppover = romUnder < SOK_RESULTAT_MAKSHOYDE && romOver > romUnder;
  resultatListe.classList.toggle('sok-resultater-opp', apneOppover);

  const tilgjengeligRom = apneOppover ? romOver : romUnder;
  resultatListe.style.maxHeight = `${Math.max(120, Math.min(SOK_RESULTAT_MAKSHOYDE, tilgjengeligRom - 12))}px`;
}

function oppdaterSokResultater(sporring) {
  const resultatListe = document.getElementById('sok-resultater');
  const q = sporring.trim().toLowerCase();
  if (!q) {
    skjulSokResultater();
    return;
  }

  const treff = alle.filter(r => r.pokemon.toLowerCase().includes(q)).slice(0, MAKS_SOKETREFF);
  if (treff.length === 0) {
    skjulSokResultater();
    return;
  }

  resultatListe.innerHTML = treff.map(r => `
    <li data-id="${r.id}">
      <span class="sok-bilde-wrap">${bildeHtml(r, 'sok-bilde')}</span>
      <span class="sok-navn">${storForbokstav(r.pokemon)}</span>
      <span class="sok-id">#${r.id}</span>
    </li>`).join('');
  resultatListe.hidden = false;
  plasserSokResultater();
}

function velgPokemon(rad) {
  valgtPokemon = rad;
  document.getElementById('sok').value = storForbokstav(rad.pokemon);
  visPokemon(rad);
  skjulSokResultater();
}

function settOppVelger() {
  byId = new Map(alle.map(rad => [rad.id, rad]));

  const sok = document.getElementById('sok');
  const resultatListe = document.getElementById('sok-resultater');

  sok.addEventListener('input', () => oppdaterSokResultater(sok.value));

  resultatListe.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const rad = byId.get(li.dataset.id);
    if (rad) velgPokemon(rad);
  });

  document.addEventListener('click', (e) => {
    if (!document.getElementById('velger').contains(e.target)) {
      skjulSokResultater();
    }
  });

  window.addEventListener('resize', () => {
    if (!resultatListe.hidden) plasserSokResultater();
  });

  document.getElementById('utvikling-innhold').addEventListener('change', (e) => {
    if (e.target.id === 'fokus-stat') {
      fokusStat = e.target.value;
      if (valgtPokemon) visUtviklinger(valgtPokemon);
    }
  });

  document.getElementById('status').hidden = true;
  document.getElementById('velger').hidden = false;
}

function finnMaks(felt) {
  return alle.reduce((best, r) => (Number(r[felt]) > Number(best[felt]) ? r : best));
}

function finnMin(felt) {
  return alle.reduce((best, r) => (Number(r[felt]) < Number(best[felt]) ? r : best));
}

function finnFlestUtviklinger() {
  const tellinger = new Map();
  alle.forEach(r => {
    if (r.evolves_from_species_id === 'NA') return;
    tellinger.set(r.evolves_from_species_id, (tellinger.get(r.evolves_from_species_id) || 0) + 1);
  });

  let besteId = null;
  let besteAntall = 0;
  tellinger.forEach((antall, id) => {
    if (antall > besteAntall) {
      besteAntall = antall;
      besteId = id;
    }
  });

  const kandidater = alle.filter(r => r.species_id === besteId);
  const rad = kandidater.find(r => r.id === r.species_id) || kandidater[0];
  return { rad, antall: besteAntall };
}

const INTRO_FAKTA = [
  () => {
    const r = finnMaks('weight');
    return { rad: r, tekst: `${storForbokstav(r.pokemon)} is the heaviest Pokémon in the data set, at ${(Number(r.weight) / 10).toFixed(1)} kg.` };
  },
  () => {
    const r = finnMin('weight');
    return { rad: r, tekst: `${storForbokstav(r.pokemon)} is the lightest Pokémon in the data set, at ${(Number(r.weight) / 10).toFixed(1)} kg.` };
  },
  () => {
    const r = finnMaks('speed');
    return { rad: r, tekst: `${storForbokstav(r.pokemon)} is the fastest Pokémon in the data set, with ${r.speed} base Speed.` };
  },
  () => {
    const r = finnMaks('hp');
    return { rad: r, tekst: `${storForbokstav(r.pokemon)} has the highest base HP in the data set, at ${r.hp}.` };
  },
  () => {
    const r = finnMaks('height');
    return { rad: r, tekst: `${storForbokstav(r.pokemon)} is the tallest Pokémon in the data set, at ${(Number(r.height) / 10).toFixed(1)} m.` };
  },
  () => {
    const r = alle.reduce((best, cur) => (sumStats(cur) > sumStats(best) ? cur : best));
    return { rad: r, tekst: `${storForbokstav(r.pokemon)} has the highest total base stats in the data set, at ${sumStats(r)}.` };
  },
  () => {
    const { rad, antall } = finnFlestUtviklinger();
    return { rad, tekst: `${storForbokstav(rad.pokemon)} branches into more evolutions than any other species in the data set: ${antall}.` };
  },
];

function visIntro() {
  const boks = document.getElementById('intro');
  const fakta = INTRO_FAKTA[Math.floor(Math.random() * INTRO_FAKTA.length)]();
  boks.innerHTML = `
    <div class="intro-innhold">
      <div class="intro-bilde-wrap">${kunstHtml(fakta.rad, 'intro-bilde')}</div>
      <p>${fakta.tekst}</p>
    </div>`;
  boks.hidden = false;
}

function tilfeldigFra(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}

function leggTilDekor() {
  const heroId = tilfeldigFra(HOVED_DEKOR_ID);
  const heroBilde = document.getElementById('hero-bilde');
  heroBilde.src = `${KUNST_BASE}${heroId}.png`;
  heroBilde.onerror = () => { heroBilde.hidden = true; };

  const dekor = document.getElementById('dekor');
  if (!dekor) return;
  const sprites = HJORNE_DEKOR.map(d =>
    `<img class="dekor-sprite ${d.klasse}" src="${KUNST_BASE}${d.id}.png" alt="" onerror="this.remove()">`
  ).join('');
  const baller = [1, 2, 3, 4].map(i => `<span class="pokeball dekor-ball dekor-ball-${i}"></span>`).join('');
  dekor.innerHTML = sprites + baller;
}

async function loadData() {
  const response = await fetch('pokemon.csv');
  const text = await response.text();
  alle = parseCsv(text);
  settOppVelger();
  visIntro();
}

leggTilDekor();
loadData();
