const MangatownScraper = require('./mangatown');
const MangastreamScraper = require('./mangastream');

const mt = new MangatownScraper();
const ms = new MangastreamScraper();


const args = process.argv;
const action = args[2];

if(action == '-add') {
  const provider = args[3];
  const link = args[4];

  if(!provider || !link) return console.log('A parameter is missing. Please enter the provider and url for -add');
  if(provider == 'ms') return ms.addManga(link);
  if(provider == 'mt') return mt.addManga(link);
}

if(action == '-scrape') {
  console.log('Starting scraper... 15 minute interval');
  // Kick of scrape
  ms.scrapeAll();
  mt.scrapeAll();

  // Below will execute after 15 minutes.
  setInterval(() => {
    ms.scrapeAll();
    mt.scrapeAll();
  }, 900000);
}
