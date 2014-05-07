/**
 * Module dependencies.
 */

var express = require('express')
, app       = express()
, http      = require('http')
, server    = http.createServer(app)
, io        = require('socket.io').listen(server)
, path      = require('path')
, workspace = require('./routes/workspace')
, less      = require('less-middleware')
;


app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.methodOverride());
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(less(path.join(__dirname, 'public')));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.cookieParser('cookieSecret!'));
  app.use(express.bodyParser());
  app.use(app.router);
  app.use(express.errorHandler());
});

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.get('/', workspace.create);
app.get('/workspace', workspace.index);


io.sockets.on('connection', workspace.connection);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
