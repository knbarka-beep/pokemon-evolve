async function loadData() {
  const response = await fetch('pokemon.csv');
  const text = await response.text();
  const lines = text.trim().split(/\r?\n/);
  const antall = lines.length - 1;
  document.getElementById('status').textContent = antall + ' rader lastet';
  console.log('Antall rader:', antall);
}

loadData();
