const moment = require('moment');
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');

function MangatownScraper() {
  const BASE_URL = 'http://www.mangatown.com/';
  const FILE_PATH = './mangatown-mangas.json';
  const API_KEY = 'umgNh898yV3Nv9vmMCqpSmlSeI98g1U4mQY7No3X';
  const BOT_ID = '5db3781cb2fe4d9fe1e232c564';
  this.mangas = require(FILE_PATH) || {};

  this.sendMessage = ({title, chapter, released, chapterUrl}) => {
    const prettyDate = moment(released).format('MMMM Do YYYY');
    const message =`New ${title} chapter has been released!\nChapter title: ${chapter}\nRelease date: ${prettyDate}\nChapter url: ${chapterUrl}`;
    // request.post(`https://api.groupme.com/v3/bots/post?token${API_KEY}`, {form: { bot_id: BOT_ID , text: message } }, (error, response, body) => {
    //   if(error) throw error;
    //   console.log(message);
    // });
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
    const JSON_STRING = JSON.stringify(this.mangas, null, 2);
    fs.writeFileSync(FILE_PATH, JSON_STRING);
    return true;
  }

  this.compare = (recent, old) => {
    const recentDate = new Date(recent.released);
    const oldDate = new Date(old.released);
    if(recentDate > oldDate) return 1;
    else return 0;
  }

  this.convertDate = (date) => {
    let dateObj;
    if(date.toUpperCase() == 'TODAY') {
      dateObj = new Date(new Date().setHours(0,0,0,0));
    } else if(date.toUpperCase() == 'YESTERDAY') {
      dateObj = new Date(moment().startOf('day').subtract(1, 'days').format('LL'));
    } else {
      const tokens = date.split(' ');
      var month = tokens[0];
      var date = tokens[1].replace(/(th|st),/, '');
      var year = tokens[2];
      dateObj = new Date([month, date, year].join(' '));
    }
    return dateObj;
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
