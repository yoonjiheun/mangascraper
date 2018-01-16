const MangatownScraper = require('./mangatown');
const MangastreamScraper = require('./mangastream');

const mss = new MangatownScraper();
const mts = new MangastreamScraper();

mss.scrapeAll();
mts.scrapeAll();