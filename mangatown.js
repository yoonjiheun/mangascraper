
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');

const mts = new MangatownScraper();

mts.addManga('http://www.mangatown.com/manga/relife/');

function MangatownScraper() {
  const BASE_URL = 'http://www.mangatown.com/';
  const FILE_PATH = './mangatown-mangas.json';
  const VALID_NON_DATE_FORMAT = [ 'TODAY', 'YESTERDAY' ];
  this.mangas = require(FILE_PATH) || {};

  this.sendMessage = ({title, chapter, released, chapterUrl}) => {
    // const message =`New ${title} chapter has been released!\nChapter title: ${chapter}\nRelease date: ${released}\nChapter url: ${BASE_URL + chapterUrl}`;

    const message = `Test run\nNew ${title} chapter has been released!\nChapter title: ${chapter}\nRelease date: ${released}\nChapter url: ${chapterUrl}`;

    request.post('https://api.groupme.com/v3/bots/post', { bot_id: 'b0e1332163781d11f43cd027c5' , text: message }, (error, response, body) => {
      if(error) throw error;
      console.log(body);
      console.log(message);
    });
  }

  this.addManga = (url) => {
    if(!this.mangas[url]) {
      this.scrapeOne(url).then(manga => {
        this.mangas[url] = manga;
        this.save();
      });
    }
  }

  this.save = () => {
    const JSON_STRING = JSON.stringify(this.mangas);
    fs.writeFileSync(FILE_PATH, JSON_STRING);
    return true;
  }

  this.compare = (recent, old) => {
    for(let i=0; i<VALID_NON_DATE_FORMAT.length;i++) {
      if(recent.released.toUpperCase() == VALID_NON_DATE_FORMAT[i]) return 1;
    }

    let recentDate = new Date(recent.released);
    let oldDate = new Date(old.released);

    if(recentDate > oldDate) return 1;
    else return 0;

  }

  this.convertDate = (date) => {
    for(let i=0; i<VALID_NON_DATE_FORMAT.length;i++) {
      if(date.toUpperCase() == VALID_NON_DATE_FORMAT[i]) return date;
    }

    const tokens = date.split(' ');
    var month = tokens[0];
    var date = tokens[1].replace(/,/, '');
    var year = tokens[2];

    return [month, date, year].join(' ');
  }

  this.scrapeOne = (url) => {
    return new Promise((resolve, reject) => {
      const requestObject = { method: 'GET', uri: url }
      request(requestObject, (error, response, body) => {

        if(error) reject(error);
        let manga = {};
        let $ = cheerio.load(body);
        let chapterList = $('.chapter_list');
        let firstRow = chapterList.children().first();

        let title = $('.title-top');
        let chapter = firstRow.children().first();
        let released = $('.time', firstRow);
        let chapterUrl = chapter.attr('href');

        manga.url = url;
        manga.title = title.text();
        manga.chapter = chapter.text().trim();
        manga.released = this.convertDate(released.text());
        manga.chapterUrl = 'http:' + chapterUrl;

        resolve(manga);
      });
    });
  }

  // execution method
  this.scrapeAll = () => {
    console.log('Starting scraper... 15 minute interval');
    let promises = [];
    let keys = Object.keys(this.mangas);
    for(let i=0; i<keys.length;i++) {
      const key = keys[i];
      const url = this.mangas[key].url;
      promises.push(this.scrapeOne(url));
    }
    Promise.all(promises)
      .then((mangaObjects) => {
        for(let i=0; i<mangaObjects.length;i++) {
          var mangaObject = mangaObjects[i];
          if(this.compare(mangaObject, this.mangas[mangaObject.url]) == 1) {
            this.mangas[mangaObject.url] = mangaObject;
            this.sendMessage(mangaObject);
          }
        }

        this.save();
      }).catch(err => {
        console.log('err:', err);
      });
  }
}

module.exports = MangatownScraper;
