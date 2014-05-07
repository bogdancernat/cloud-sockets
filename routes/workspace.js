var projects = require('../projects')
, canvases   = {}
, h          = require('hashids')
, hash       = new h("so secret much crypto",10)
;


exports.create = function (req, res){
  var p = projects.getProjectModel();
  p.created_on = +new Date;
  p.short_url = hash.encrypt(p.created_on);
  projects.add(p);
  res.redirect("/workspace?b="+p.short_url);
};

exports.index = function (req, res){
  var data = {};
  data.user = req.user;
  // if(req.isAuthenticated()){

  // } else {

  // }
  var p = projects.getOne(req.query.b);
  if(p){
    res.render('workspace',{title: 'Workspace - '+p.short_url});
  } else {
    res.redirect("/");
  }
};

var interval_id = setInterval(function syncCanvasesWithDb (){
  for(canvas in canvases){
    var canvas_url = JSON.parse(JSON.stringify(canvas))
    , project = projects.getOne(canvas_url)
    ;

    var url = project.short_url;
    if(canvases[url].must_sync 
        && canvases[url].safe_to_sync){
      canvases[url].must_sync    = false;
      canvases[url].safe_to_sync = false;
      project.pages = canvases[url].pages;
      // update
      projects.update(project);
      canvases[url].safe_to_sync = true;
    }
  }
},300);

// sockets 
exports.connection = function (socket){
  socket.emit('socket_id',socket.id);

  socket.on('join-room', function (room){
    if(typeof canvases[room] !== "object"){
      var project = projects.getOne(room);
      canvases[room] = {};
      if(project && project.pages){
        canvases[project.short_url].pages = project.pages;
      } else {
        canvases[room]['pages'] = {};
        canvases[room].pages['page1'] = {};
      }
      console.log(project);
      canvases[room]['must_sync'] = false;
      // just a safe switch to make sure i'm updating after all db actions ended
      canvases[room]['safe_to_sync'] = true;
      socket.join(room);
      socket.emit('canvas-sync', canvases[room].pages);
    } else {
      socket.join(room);
      socket.emit('canvas-sync', canvases[room].pages);
    }

  });

  socket.on('new-object', function (data){
    console.log(canvases);
    if (data.b){
      canvases[data.b]['must_sync'] = true;

      if(typeof canvases[data.b].pages[data.page] !== "object"){
        canvases[data.b].pages[data.page] = {};
        canvases[data.b].pages[data.page] = {};
      }
      if(typeof canvases[data.b].pages[data.page][data.socket_id] !== "object"){
        canvases[data.b].pages[data.page][data.socket_id] = {};
      }
      canvases[data.b].pages[data.page][data.socket_id][data.id] = JSON.parse(data.data);

      console.log(canvases);
      socket.broadcast.to(data.b).emit('new-object', data);
    }
  });

  socket.on('update-new-object-rect', function (data){
    if (data.b){
      canvases[data.b]['must_sync'] = true;
      canvases[data.b].pages[data.page][data.socket_id][data.id].width = data.width;
      canvases[data.b].pages[data.page][data.socket_id][data.id].height = data.height;
      socket.broadcast.to(data.b).emit('update-new-object-rect', data);
    }
  });

  socket.on('update-new-object-circle', function (data){
    if (data.b){
      canvases[data.b]['must_sync'] = true;
      canvases[data.b].pages[data.page][data.socket_id][data.id].radius = data.radius;
      socket.broadcast.to(data.b).emit('update-new-object-circle', data);
    }
  });
  socket.on('update-new-object-triangle', function (data){
    if (data.b){
      canvases[data.b]['must_sync'] = true;
      canvases[data.b].pages[data.page][data.socket_id][data.id].width = data.width;
      canvases[data.b].pages[data.page][data.socket_id][data.id].height = data.height;
      socket.broadcast.to(data.b).emit('update-new-object-triangle', data);
    }
  });
  
  socket.on('update-new-object-line', function (data){
    if (data.b){
      canvases[data.b]['must_sync'] = true;
      canvases[data.b].pages[data.page][data.socket_id][data.id].x2 = data.x2;
      canvases[data.b].pages[data.page][data.socket_id][data.id].y2 = data.y2;
      socket.broadcast.to(data.b).emit('update-new-object-line', data);
    }
  });

  socket.on('resize-object', function (data){
    if (data.b){
      canvases[data.b]['must_sync'] = true;
      canvases[data.b].pages[data.page][data.socket_id][data.id].scaleX = data.scaleX;
      canvases[data.b].pages[data.page][data.socket_id][data.id].scaleY = data.scaleY;
      socket.broadcast.to(data.b).emit('resize-object', data);
    }
  });

  socket.on('rotate-object', function (data){
    if (data.b){
      canvases[data.b]['must_sync'] = true;
      canvases[data.b].pages[data.page][data.socket_id][data.id].angle = data.angle;
      canvases[data.b].pages[data.page][data.socket_id][data.id].left = data.left;
      canvases[data.b].pages[data.page][data.socket_id][data.id].top = data.top;

      socket.broadcast.to(data.b).emit('rotate-object', data);
    }
  });

  socket.on('move-object', function (data){
    if (data.b){
      canvases[data.b]['must_sync'] = true;
      canvases[data.b].pages[data.page][data.socket_id][data.id].left = data.left;
      canvases[data.b].pages[data.page][data.socket_id][data.id].top = data.top;
      socket.broadcast.to(data.b).emit('move-object', data);
    }
  });

  
  socket.on('meta-object', function (data){
    if (data.b){
      canvases[data.b]['must_sync'] = true;
      for (attr in data.meta_data){
        canvases[data.b].pages[data.page][data.socket_id][data.id][attr] = data.meta_data[attr];
      }
      socket.broadcast.to(data.b).emit('meta-object', data);
    }
  });

  socket.on('lock-object', function (data){
    if(data.b){
      socket.broadcast.to(data.b).emit('lock-object', data);
    }
  });

  socket.on('unlock-object', function (data){
    if(data && data.b){
      socket.broadcast.to(data.b).emit('unlock-object', data);
    }
  });

  socket.on('remove-object', function (data){
    if (data.b){
      canvases[data.b]['must_sync'] = true;
      delete canvases[data.b].pages[data.page][data.socket_id][data.id];
      socket.broadcast.to(data.b).emit('remove-object', data);
    }
  });

  socket.on('new-page', function (data){
    socket.broadcast.to(data.b).emit('new-page', data);
  });
} 
