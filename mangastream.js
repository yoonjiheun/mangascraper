const moment = require('moment');
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');


const test = new MangastreamScraper();

// Mangastream scraper function/class
function MangastreamScraper() {
  // Constants
  const BASE_URL = 'https://readms.net';
  const FILE_PATH = './mangastream-mangas.json';

  // Move groupme stuff out later
  const API_KEY = 'umgNh898yV3Nv9vmMCqpSmlSeI98g1U4mQY7No3X';
  const BOT_ID = '5db3781cb2fe4d9fe1e232c564';

  // Subscribed mangas
  this.mangas = require(FILE_PATH) || {};

  // Sends POST request to groupme api to send message inside group chapter
  // Move this to another file
  this.sendMessage = ({title, chapter, released, chapterUrl}) => {
    const prettyDate = moment(released).format('MMMM Do YYYY');
    const message =`New ${title} chapter has been released!\nChapter title: ${chapter}\nRelease date: ${prettyDate}\nChapter url: ${chapterUrl}`;
    request.post(`https://api.groupme.com/v3/bots/post?token${API_KEY}`, {form: { bot_id: BOT_ID , text: message } }, (error, response, body) => {
      if(error) throw error;
      console.log(message);
    });
  }

  // Adds manga to subscription map.
  this.addManga = (url) => {
    if(!this.mangas[url]) {
      this.scrapeOne(url).then(manga => {
        this.mangas[url] = manga;
        this.save();
      });
    }
  }

  // Saves this.manga into file to persist after scraper is closed.
  this.save = () => {
    const JSON_STRING = JSON.stringify(this.mangas, null, 2);
    fs.writeFileSync(FILE_PATH, JSON_STRING);
    return true;
  }

  // Returns 1 if recent date is OLDER than old date
  this.compare = (recent, old) => {
    const recentDate = new Date(recent.released);
    const oldDate = new Date(old.released);
    if(recentDate > oldDate) return 1;
    else return 0;
  }

  // Uses momentjs to convert specific cases to valid JavaScript Date Strings
  // Ex. Mangastream lists released date as Today, 1 DAY AGO, 2 DAYS AGO, ETC then Month Date, Year format
  // Changes said format to Date String format to easily compare between two objects
  this.convertDate = (date) => {
    let dateObj;
    if(date.toUpperCase() == 'TODAY') {
      dateObj = new Date(new Date().setHours(0,0,0,0));
    } else if(date.toUpperCase() == '1 DAY AGO') {
      dateObj = new Date(moment().startOf('day').subtract(1, 'days').format('LL'));
    } else if(date.toUpperCase() == '2 DAYS AGO') {
      dateObj = new Date(moment().startOf('day').subtract(2, 'days').format('LL'));
    } else if(date.toUpperCase() == '3 DAYS AGO') {
      dateObj = new Date(moment().startOf('day').subtract(3, 'days').format('LL'));
    } else {
      const tokens = date.split(' ');
      var month = tokens[0];
      var date = tokens[1].replace(/(th|st),/, '');
      var year = tokens[2];
      dateObj = new Date([month, date, year].join(' '));
    }
    return dateObj;
  }

  // Scrapes one manga home page to get data about the LASTEST chapter listed.
  // Returns a promise that contains a manga object that contains TITLE, CHAPTER NAME, RELEASED DATE, AND CHAPTER URL
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

  // Execution method
  // This method will be called inside app.js to start the scraping cycle every X minutes.
  // Mangastream does not seem to throttle web requests... May change in the future!
  this.scrapeAll = () => {
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
