'use strict';
var tumblrConf = require("./tumblr-conf.json");
var _ = require('lodash');
var express = require('express');
var http = require('http');
var oauth = require('oauth');
var tumblr = require('tumblr.js');
var uid = require('uid');
var cookieParser = require('cookie-parser');
var apicache = require('apicache');
var cache = apicache.middleware;

var app = express();

app.set('port', process.env.PORT || 3000);
var router = express.Router();
app.use(router);
router.use(cookieParser());
router.all('/get/*', requireAuth);
router.all('/', requireAuth);

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) {
    next();
  } else {
    res.redirect('/auth/request');
  }
}

router.use(express.static('public'));
router.use('/js/handlebars', express.static('node_modules/handlebars/dist'));
router.use('/assets/ladda', express.static('node_modules/ladda/dist'));

var sessions = {};
var tumblrConsumerKey = tumblrConf.tumblrConsumerKey;
var tumblrConsumerSecret = tumblrConf.tumblrConsumerSecret;
var tumblrOauthAccessToken;
var tumblrOauthAccessTokenSecret;

var oauthRequestToken;
var oauthRequestTokenSecret;

var consumer = new oauth.OAuth(
  'http://www.tumblr.com/oauth/request_token',
  'http://www.tumblr.com/oauth/access_token',
  tumblrConsumerKey,
  tumblrConsumerSecret,
  '1.0A',
  'http://localhost:3000/auth/callback',
  'HMAC-SHA1'
);

app.get('/auth/request', function(req, res) {
  consumer.getOAuthRequestToken(function(error, oauthToken, oauthTokenSecret) {
    if (error) {
      res.status(500).send(error);
    } else {
      oauthRequestToken = oauthToken;
      oauthRequestTokenSecret = oauthTokenSecret;

      res.redirect('http://www.tumblr.com/oauth/authorize?oauth_token=' + oauthRequestToken);
    }
  });
});

app.get('/auth/callback', function(req, res) {
  consumer.getOAuthAccessToken(
    oauthRequestToken,
    oauthRequestTokenSecret,
    req.query.oauth_verifier, //jscs:ignore requireCamelCaseOrUpperCaseIdentifiers
    function(error, oauthAccessToken, oauthAccessTokenSecret) {
      if (error) {
        res.status(500).send(error);
      } else {
        var userId = uid(10);
        res.cookie('userid', userId, {
          maxAge: 1000 * 60 * 60 * 24 * 7 * 52,
        });
        sessions[userId] = {
          tumblrOauthAccessToken: oauthAccessToken,
          tumblrOauthAccessTokenSecret: oauthAccessTokenSecret,
        };
        res.redirect('/');
      }
    });
});

function isAuthenticated(req) {
  return req.cookies.userid && sessions[req.cookies.userid];
}

router.get('/getPostsOffset/:blogName/:offset', cache('59 minutes'), function(req, res) {
  req.apicacheGroup = req.params.collection;
  if (!_.isFinite(+req.params.offset)) {
    res.redirect('/getPostsOffset/' + req.params.blogName + '/0');
    return;
  }

  var client = tumblr.createClient({
    //jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    consumer_key: tumblrConsumerKey,
    consumer_secret: tumblrConsumerSecret,
    token: tumblrOauthAccessToken,
    token_secret: tumblrOauthAccessTokenSecret,
    //jscs:enable requireCamelCaseOrUpperCaseIdentifiers
  });
  client.blogName = req.params.blogName;

  getPosts(client, +req.params.offset, function(err, data) {
    res.setHeader('Content-Type', 'application/json');
    if (err) {
      res.send(err);
      return;
    }

    res.send(data);
  });
});

function getPosts(client, offset, callback) {
  client.posts(client.blogName + '.tumblr.com', {
    type: 'photo',
    offset: offset,
  }, callback);
}

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
