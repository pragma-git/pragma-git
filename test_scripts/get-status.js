const https = require('https');

// Hämta argument från terminalen (t.ex. node get-status.js gitlab-org/gitlab-foss d7b9a617...)
const args = process.argv.slice(2);
const PROJECT = args[0] || 'gitlab-org/gitlab-foss';
const COMMIT_SHA = args[1] || 'd7b9a6176ab4e279465ba3ee09922cde2b74de47';

const url = `https://gitlab.com/${PROJECT}/-/commit/${COMMIT_SHA}/pipelines.json`;

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  }
};

function makeRequest(targetUrl) {
  https.get(targetUrl, options, (res) => {
    if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
      return makeRequest(res.headers.location);
    }

    if (res.statusCode === 404) {
      console.error(`\n❌ HTTP 404: Committen hittades inte. Kontrollera sökvägen.`);
      return;
    }

    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(data);
        if (parsedData && parsedData.pipelines && parsedData.pipelines.length > 0) {
          const latestPipeline = parsedData.pipelines[0];
          const status = latestPipeline.details.status.text;
          console.log(`\n✅ CI-STATUS FÖR ${PROJECT}:`);
          console.log(`Commit:  ${COMMIT_SHA.slice(0, 8)}`);
          console.log(`Status:  ${status.toUpperCase()}\n`);
        } else {
          console.log('\nℹ️ Ingen pipeline hittades för denna commit.');
        }
      } catch (e) {
        console.error('\n❌ Svaret kunde inte tolka JSON.');
      }
    });
  }).on('error', (err) => {
    console.error('\n❌ Nätverksfel:', err.message);
  });
}

console.log(`Hämtar status för ${PROJECT}...`);
makeRequest(url);
