const https = require('https');

// Hämta argument från terminalen (t.ex. node get-svg-status.js inkscape/inkscape master)
const args = process.argv.slice(2);
const PROJECT = args[0] || 'inkscape/inkscape';
const BRANCH = args[1] || 'master'; // Badges fungerar på branch-nivå (t.ex. master eller main)

const url = `https://gitlab.com/${PROJECT}/badges/${BRANCH}/pipeline.svg`;

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  }
};

console.log(`Hämtar SVG-badge för ${PROJECT} (${BRANCH})...`);

https.get(url, options, (res) => {
  let svgContent = '';

  res.on('data', (chunk) => {
    svgContent += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 404) {
      console.error(`\n❌ HTTP 404: Hittade inte projektet eller branchen.`);
      return;
    }

    // Vi letar efter kända statusord inuti SVG-koden med regex
    const statusRegex = /(passed|failed|running|pending|canceled|unknown|passed with warnings)/i;
    const matches = svgContent.match(statusRegex);

    if (matches) {
      // Svaret finns ofta med två gånger i SVG-filen (för skugga och textlager)
      const status = matches[0].toUpperCase();
      
      console.log(`\n✅ LIVE-STATUS HÄMTAD (UTAN TOKEN):`);
      console.log(`Projekt: ${PROJECT}`);
      console.log(`Branch:  ${BRANCH}`);
      console.log(`Status:  ${status}\n`);
    } else {
      console.log('\n❌ Kunde inte läsa ut CI-status från SVG-bilden.');
    }
  });
}).on('error', (err) => {
  console.error('\n❌ Nätverksfel:', err.message);
});
