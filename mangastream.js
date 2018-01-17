
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');

function MangastreamScraper() {
  const BASE_URL = 'https://readms.net';
  const FILE_PATH = './mangastream-mangas.json';
  const VALID_NON_DATE_FORMAT = [ 'TODAY', '2 DAYS AGO', '3 DAYS AGO' ];
  const API_KEY = 'umgNh898yV3Nv9vmMCqpSmlSeI98g1U4mQY7No3X';
  const BOT_ID = '5db3781cb2fe4d9fe1e232c564';
  this.mangas = require(FILE_PATH) || {};

  this.sendMessage = ({title, chapter, released, chapterUrl}) => {
    const message =`New ${title} chapter has been released!\nChapter title: ${chapter}\nRelease date: ${released}\nChapter url: ${chapterUrl}`;

    request.post(`https://api.groupme.com/v3/bots/post?token${API_KEY}`, {form: { bot_id: BOT_ID , text: message } }, (error, response, body) => {
      if(error) throw error;
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
    if(recent.released == old.released) return 0;

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
    var date = tokens[1].replace(/(th|st),/, '');
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
        let title = $('h1', '.col-sm-8');
        let chapter = $('.table', '.col-sm-8').children().children().first().next().children().first();
        let released = chapter.next();
        let chapterUrl = chapter.children().attr('href');

        manga.url = url;
        manga.title = title.text();
        manga.chapter = chapter.text();
        manga.released = this.convertDate(released.text());
        manga.chapterUrl = BASE_URL + chapterUrl;

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

module.exports = MangastreamScraper;
