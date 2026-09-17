let alle = [];

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

async function loadData() {
  const response = await fetch('pokemon.csv');
  const text = await response.text();
  alle = parseCsv(text);
  console.log(alle.length, alle[0]);
}

loadData();
