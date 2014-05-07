
$(document).ready(function(){
  resizeElements();

  var mySocket
    , lastId = 0
    , canvasObjects = {}
    , socket = io.connect('http://localhost')
    , canvas = new fabric.Canvas('canvas',{
        width: 800,
        height: 500,
        selection: false,
        background: 'rgba(255,255,255,1)'
      })
    , actionCreate   = null
    , selectedColor  = "#000000"
    , x              = 0
    , y              = 0
    , startedDrawing = false
    , queries        = getQueryParams(document.location.search)
    , selectedPage   = "page1"
    , imgSelected    = ''
    ;


  $('.colors').children().each(function (i, elem){
    $(elem).css('background',$(elem).attr('data-color'));
  });

  $('.slide').click(function (e){
    selectedPage = $(this).attr('id');
  });
  // connecting to this project's room
  socket.emit('join-room', queries.b);

  // storing my socket_id 
  socket.on('socket_id', function (socket_id){
    mySocket = socket_id;
    fabric.Object.prototype.socket_id = mySocket;
    go();
  });

  // 
  socket.on('canvas-sync', function (data){
    console.log(data);
    for(page in data){
      if(page!="page1"){
        addNewSlide();
      }
      for(socket_id in data[page]){
        var k = JSON.parse(JSON.stringify(socket_id));
        var objects = [];
        for(obj_id in data[page][socket_id]){
          var id = JSON.parse(JSON.stringify(obj_id));
          data[page][socket_id][obj_id].id = id;
          data[page][socket_id][obj_id].socket_id = k;
          data[page][socket_id][obj_id].page = JSON.parse(JSON.stringify(page));
          objects.push(data[page][socket_id][obj_id]);
        }

        fabric.util.enlivenObjects(objects, function (alive){
          for (var i = 0; i < alive.length; i++) {
            var o = alive[i];
            o.centeredRotation = true;
            o.centeredScaling  = true;

            if(typeof canvasObjects[o.page] !== "object"){
              canvasObjects[o.page] = {};
            }
            if(typeof canvasObjects[o.page][o.socket_id] !== "object"){
              canvasObjects[o.page][o.socket_id] = {};
            }
            canvasObjects[o.page][o.socket_id][o.id] = o;
            if(o.page == 'page1'){
              canvas.add(o);
            }
          };
        });
      }
    }
  });

  socket.on('new-object', function (obj){
    var parsed = JSON.parse(obj.data);

    parsed.socket_id = obj.socket_id;
    parsed.id = obj.id;
    parsed.page = obj.page;

    fabric.util.enlivenObjects([parsed], function (alive){
      var o = alive[0];

      o.centeredRotation = true;
      o.centeredScaling  = true;

      if(typeof canvasObjects[o.page] !== "object"){
        canvasObjects[o.page] = {};
      }
      if(typeof canvasObjects[o.page][obj.socket_id] !== "object"){
        canvasObjects[o.page][obj.socket_id] = {};
      }
      canvasObjects[o.page][obj.socket_id][obj.id] = o;
      if(o.page == selectedPage){
        canvas.add(o);
      }
    });
  });
  
  socket.on('update-new-object-rect', function (data){
    var o = canvasObjects[data.page][data.socket_id][data.id];
    o.set('width',data.width).set('height',data.height);
    o.setCoords();
    canvas.renderAll();
  });

  socket.on('update-new-object-circle', function (data){
    var o = canvasObjects[data.page][data.socket_id][data.id];
    o.set('radius',data.radius);
    o.setCoords();
    canvas.renderAll();
  });

  socket.on('update-new-object-triangle', function (data){
    var o = canvasObjects[data.page][data.socket_id][data.id];
    o.set('width',data.width).set('height',data.height);
    o.setCoords();
    canvas.renderAll();
  });

  socket.on('update-new-object-line', function (data){
    var o = canvasObjects[data.page][data.socket_id][data.id];
    o.set('x2',data.x2).set('y2',data.y2);
    o.setCoords();
    canvas.renderAll();
  });

  socket.on('resize-object', function (data){
    var o = canvasObjects[data.page][data.socket_id][data.id];
    o.scaleX = data.scaleX;
    o.scaleY = data.scaleY;
    o.setCoords();
    canvas.renderAll();
  });
  
  socket.on('move-object', function (data){
    var o = canvasObjects[data.page][data.socket_id][data.id];
    o.top  = data.top;
    o.left = data.left;
    o.setCoords();
    canvas.renderAll();
  });

  socket.on('rotate-object', function (data){
    var o = canvasObjects[data.page][data.socket_id][data.id];
    o.rotate(data.angle);
    o.setCoords();
    canvas.renderAll();
  });

  socket.on('remove-object', function (data){
    var o = canvasObjects[data.page][data.socket_id][data.id];
    canvas.remove(o);
    delete canvasObjects[data.page][data.socket_id][data.id];
    canvas.renderAll();
    
  });
  socket.on('lock-object', function (data){
    console.log(data);
    var o = canvasObjects[data.page][data.socket_id][data.id];
    o.selectable = false;
  });
  socket.on('unlock-object', function (data){
    console.log(data);
    var o = canvasObjects[data.page][data.socket_id][data.id];
    o.selectable = true;
  })
  socket.on('meta-object', function (data){
    var o = canvasObjects[data.page][data.socket_id][data.id];
    for(key in data.meta_data){
      o[key] = data.meta_data[key]; 
    }
    o.setCoords();
    canvas.renderAll();
  });

  function go(){
    $('.tools').children().click(function (e){
      var f = $(this).attr('data-tool');
      if(actionCreate == f){
        if(f == 'freeDraw'){
          canvas.isDrawingMode =false;
        }
        resetTool();
      } else {
        $('.tools').children().removeClass('selected');
        actionCreate = f;
        $(this).addClass('selected');
        if(actionCreate == 'freeDraw'){
          canvas.isDrawingMode = true;
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
          canvas.freeDrawingBrush.color = selectedColor;
          canvas.freeDrawingBrush.width = 3;
          canvas.freeDrawingBrush.shadowBlur = 0;
        }
      }
    });

    $('.elem-img').click(function (e){
      var f = $(this).attr('data-tool');
      if(actionCreate == f){
        resetTool();
      } else {
        $('.elem-img').removeClass('selected-img-elem');
        actionCreate = f;
        $(this).addClass('selected-img-elem');
        imgSelected = $(this).attr('data-large');
      }
    });

    $('.colors').children().click(function (e){
      var c = $(this).attr('data-color');
      $('.colors').children().removeClass('selected');
      selectedColor = c;
      $(this).addClass('selected');
    });

    $('.actions').children().click(function (e){
      var a = $(this).attr('data-action');
      if (a == 'fill'){
        fillActiveObject();
      }

      if (a == 'remove'){
        removeActiveObject();
      }

      if (a == 'border'){
        changeBorderActiveObject();
      }

      if (a == 'bring-front') {
        bringActiveToFront();
      }

      if (a == 'push-back') {
        pushActiveToBack();
      }

    });

  }

  canvas.on("object:scaling", function (d){
    // rect1.scaleX = d.target.scaleX;
    // rect1.scaleY = d.target.scaleY;
    // rect1.setCoords();
    if(d.target.objects){
      for (var i = 0; i < d.target.objects.length; i++) {
        socket.emit('resize-object',{
          id: d.target.objects[i].id,
          b: queries.b,
          socket_id: d.target.objects[i].socket_id,
          scaleX: d.target.objects[i].scaleX,
          scaleY: d.target.objects[i].scaleY
        });
      };
    } else {
      socket.emit('resize-object',{
        id: d.target.id,
        b: queries.b,
        socket_id: d.target.socket_id,
        page: d.target.page,
        scaleX: d.target.scaleX,
        scaleY: d.target.scaleY
      });
    }
  });

  canvas.on("object:rotating", function (d){
    // rect1.rotate(d.target.angle);
    socket.emit('rotate-object',{
      id: d.target.id,
      b: queries.b,
      page: d.target.page,
      socket_id: d.target.socket_id,
      angle: d.target.angle,
      left: d.target.left,
      top: d.target.top
    });
  });

  canvas.on("object:moving", function (d){
    socket.emit('move-object',{
      id: d.target.id,
      b: queries.b,
      page: d.target.page,
      socket_id: d.target.socket_id,
      top: d.target.top,
      left: d.target.left
    });
    // console.log(d.target)
  });
  
  canvas.on("object:selected", function (d){
    var o = d.target;
    canvas.lastSelected = {
      id: d.target.id,
      b: queries.b,
      socket_id: d.target.socket_id,
      page: d.target.page,
    };
    socket.emit('lock-object', {
      id: d.target.id,
      b: queries.b,
      socket_id: d.target.socket_id,
      page: d.target.page,
    });
  });

  canvas.on("selection:cleared", function (d){
    socket.emit('unlock-object', canvas.lastSelected);
  });

  canvas.on("mouse:down", prepareDrawingElement);
  canvas.on("mouse:move", drawElement);
  canvas.on("mouse:up", placeElement);

  canvas.on("path:created", function (){
    for (var i = 0; i < this._objects.length; i++) {
      if(this._objects[i].id == undefined){
        // delete this._objects[i];
        var saved = JSON.parse(JSON.stringify(this._objects[i]));
        var obj = new fabric.Path(saved.path,{
          id: genId(),
          page: selectedPage,
          strokeWidth: 3,
          strokeLineCap: "round",
          strokeLineJoin: "round",
          fill: null,
          stroke: selectedColor,
          originX: "center",
          originY: "center",
          centeredRotation: true,
          centeredScaling: true,
          top: saved.top - saved.height/2,
          left: saved.left - saved.width/2
        });
        obj.setCoords();
        canvas.add(obj);
        if(typeof canvasObjects[obj.page] !== "object"){
          canvasObjects[obj.page] = {};
        }
        if(typeof canvasObjects[obj.page][obj.socket_id] !== "object"){
          canvasObjects[obj.page][obj.socket_id] = {};
        }
        canvasObjects[obj.page][obj.socket_id][obj.id] = obj;

        socket.emit('new-object', {
          id: obj.id, 
          b: queries.b,
          page: obj.page,
          socket_id: obj.socket_id, 
          data: JSON.stringify(obj)
        });
        canvas.setActiveObject(obj);
        canvas.renderAll();
        this._objects.splice(i,1);
        break;
      }
    };
    canvas.isDrawingMode = false;
    resetTool();
  });

  function prepareDrawingElement (e){
    var mouse = canvas.getPointer(e.e);
    x = mouse.x;
    y = mouse.y;
    var obj;
    if(actionCreate == 'drawRect'){

      obj = new fabric.Rect({
        id: genId(),
        left: x,
        top: y,
        page: selectedPage,
        fill: "rgba(0,0,0,0)",
        stroke: selectedColor,
        strokeWidth: 2,
        width: 0,
        height: 0,
        centeredRotation: true,
        centeredScaling: true,
        originX: 'center',
        originY: 'center'
      });

      obj.setCoords();
      canvas.add(obj);
      startedDrawing = true;
      canvas.setActiveObject(obj);
    } 

    if(actionCreate == 'drawImg'){
      new fabric.Image.fromURL(imgSelected, function (oImg){
        obj = oImg;
        obj.page = selectedPage;
        obj.left = x;
        obj.top =  y;
        obj.scale(0.5);
        obj.setCoords();
        canvas.add(obj);
        resetTool();
        if(typeof canvasObjects[obj.page] !== "object"){
          canvasObjects[obj.page] = {};
        }
        if(typeof canvasObjects[obj.page][obj.socket_id] !== "object"){
          canvasObjects[obj.page][obj.socket_id] = {};
        }
        canvasObjects[obj.page][obj.socket_id][obj.id] = obj;
        socket.emit('new-object', {
          id: obj.id, 
          b: queries.b,
          page: obj.page,
          socket_id: obj.socket_id, 
          data: JSON.stringify(obj)
        });
      });
      return;
    }

    if(actionCreate == 'drawCircle'){
      obj = new fabric.Circle({
        id: genId(),
        page: selectedPage,
        left: x,
        top: y,
        fill: "rgba(0,0,0,0)",
        stroke: selectedColor,
        strokeWidth: 2,
        radius: 0,
        centeredRotation: true,
        centeredScaling: true,
        originX: 'center',
        originY: 'center'
      });

      obj.setCoords();
      canvas.add(obj);
      startedDrawing = true;
      canvas.setActiveObject(obj);
    }

    if(actionCreate == 'drawTriangle'){
      obj = new fabric.Triangle({
        id: genId(),
        page: selectedPage,
        left: x,
        top: y,
        fill: "rgba(0,0,0,0)",
        stroke: selectedColor,
        strokeWidth: 2,
        width: 0,
        height: 0,
        centeredRotation: true,
        centeredScaling: true,
        originX: 'center',
        originY: 'center'
      });

      obj.setCoords();
      canvas.add(obj);
      startedDrawing = true;
      canvas.setActiveObject(obj);
    }

    if(actionCreate == 'drawLine'){
      obj = new fabric.Line([x, y, x, y],{
        id: genId(),
        page: selectedPage,
        fill: selectedColor,
        stroke: selectedColor,
        strokeWidth: 2,
        centeredRotation: true,
        centeredScaling: true,
        originX: 'center',
        originY: 'center'
      });
      obj.setCoords();
      canvas.add(obj);
      startedDrawing = true;
      canvas.setActiveObject(obj);
    }

    // if(actionCreate == 'freeDraw'){
    //   startedDrawing = true;
    //   canvas.isDrawingMode = true;
    //   obj = new fabric.PencilBrush(canvas);
    //   obj.color = selectedColor;
    //   obj.width = 3;
    //   obj.shadowBlur = 0;
    // }

    if(startedDrawing){
      
      if(typeof canvasObjects[obj.page] !== "object"){
        canvasObjects[obj.page] = {};
      }
      if(typeof canvasObjects[obj.page][obj.socket_id] !== "object"){
        canvasObjects[obj.page][obj.socket_id] = {};
      }
      canvasObjects[obj.page][obj.socket_id][obj.id] = obj;
      socket.emit('new-object', {
        id: obj.id, 
        b: queries.b,
        page: obj.page,
        socket_id: obj.socket_id, 
        data: JSON.stringify(obj)
      });
    }
  }

  function drawElement (e){
    if(!startedDrawing){
      return false;
    }
    var mouse = canvas.getPointer(e.e)
      ;

    if(actionCreate == 'drawRect'){
      var w = Math.abs(mouse.x - x)
        , h = Math.abs(mouse.y - y)
        ;
      if(!w || !h){
        return false;
      } 
      var obj = canvas.getActiveObject();
      obj.set('width',2*w).set('height',2*h);
      obj.setCoords();

      socket.emit('update-new-object-rect', {
        id: obj.id, 
        b: queries.b,
        socket_id: mySocket,
        page: obj.page,
        width: 2*w,
        height: 2*h
      });
      canvas.renderAll();
    }

    if(actionCreate == 'drawTriangle'){
      var w = Math.abs(mouse.x - x)
        , h = Math.abs(mouse.y - y)
        ;
      if(!w || !h){
        return false;
      } 
      var obj = canvas.getActiveObject();
      obj.set('width',2*w).set('height',2*h);
      obj.setCoords();

      socket.emit('update-new-object-triangle', {
        id: obj.id, 
        b: queries.b,
        page: obj.page,
        socket_id: mySocket,
        width: 2*w,
        height: 2*h
      });
      canvas.renderAll();
    }


    if(actionCreate == 'drawCircle'){
      var w = Math.abs(mouse.x - x)
        , h = Math.abs(mouse.y - y)
        , r = ((w>h)?w:h)/2
        ;
      if(!w || !h){
        return false;
      } 
      var obj = canvas.getActiveObject();
      obj.set('radius',r);
      obj.setCoords();

      socket.emit('update-new-object-circle', {
        id: obj.id, 
        page: obj.page,
        b: queries.b,
        socket_id: mySocket,
        radius: r
      });
      canvas.renderAll();
    }

    if(actionCreate == 'drawLine'){
      var obj = canvas.getActiveObject();
      obj.set('x2',mouse.x).set('y2',mouse.y);
      obj.setCoords();

      socket.emit('update-new-object-line', {
        id: obj.id, 
        page: obj.page,
        b: queries.b,
        socket_id: mySocket,
        x2: mouse.x,
        y2: mouse.y
      });
      canvas.renderAll();
    }
  }

  function placeElement (e){
    if(!startedDrawing){
      return false;
    }
    if(actionCreate == 'drawRect'){
      var obj = canvas.getActiveObject();
      startedDrawing = false;
      obj.setCoords();
      canvas.renderAll();
      resetTool();
    }
    if(actionCreate == 'drawTriangle'){
      var obj = canvas.getActiveObject();
      startedDrawing = false;
      obj.setCoords();
      canvas.renderAll();
      resetTool();
    }
    if(actionCreate == 'drawCircle'){
      var obj = canvas.getActiveObject();
      startedDrawing = false;
      obj.setCoords();
      canvas.renderAll();
      resetTool();
    }
    if(actionCreate == 'drawLine'){
      var obj = canvas.getActiveObject();
      startedDrawing = false;
      obj.setCoords();
      canvas.renderAll();
      resetTool();
    }
    if(actionCreate == 'freeDraw'){
      canvas.isDrawingMode = false;
      startedDrawing = false;
      // canvas.renderAll();
      resetTool();
    }
  }

  function fillActiveObject(){
    var o = canvas.getActiveObject();
    o.fill = selectedColor;

    socket.emit('meta-object',{
      id: o.id,
      page: o.page,
      b: queries.b,
      socket_id: o.socket_id,
      meta_data: {
        fill: selectedColor
      }
    });
    canvas.renderAll();
  }

  function changeBorderActiveObject(){
    var o = canvas.getActiveObject();
    o.stroke = selectedColor;
    socket.emit('meta-object',{
      id: o.id,
      page: o.page,
      b: queries.b,
      socket_id: o.socket_id,
      meta_data: {
        stroke: selectedColor
      }
    });
    canvas.renderAll();
  }

  function removeActiveObject(){
    var o = canvas.getActiveObject();

    socket.emit('remove-object',{
      id: o.id,
      page: o.page,
      b: queries.b,
      socket_id: o.socket_id
    });
    canvas.remove(o);
    delete canvasObjects[o.page][o.socket_id][o.id];
    canvas.renderAll();
  }

  function bringActiveToFront(){
    var o = canvas.getActiveObject();

    canvas.bringForward(o);

    socket.emit('bring-front',{
      id: o.id,
      page: o.page,
      b: queries.b,
      socket_id: o.socket_id
    });
    // canvas.renderAll();
  }

  function pushActiveToBack(){
    var o = canvas.getActiveObject();
    console.log(JSON.parse(JSON.stringify(o)))
    canvas.sendBackwards(o);
    console.log(o);
    socket.emit('push-back',{
      id: o.id,
      page: o.page,
      b: queries.b,
      socket_id: o.socket_id
    });
    // canvas.renderAll();
  }

  function resetTool(){
    actionCreate = null;
    $('.tools').children().removeClass('selected');
    $('.elem-img').removeClass('selected-img-elem');
  }


  function genId(){
    lastId++;
    return lastId;
  }

  function resizeElements(){
    $('.container').css("height",window.innerHeight);
  }

  $(window).resize(resizeElements);

  // scrollable slides
  var ul_width = $('.slide').length * ($('.slide').width() + 4);
  $('.slides').find('ul').css('width', ul_width+'px');
  var slides_wrapper = $('.slides')
    , options = {
      horizontal: 1,
      smart: 1,
      activateOn: 'click',
      mouseDragging: 1,
      touchDragging: 1,
      releaseSwing: 1,
      startAt: 0,
      scrollBy: $('.slide').width(),
      speed: 300,
      elasticBounds: 1,
      easing: 'swing',
      dragHandle: 1,
      dynamicHandle: 1,
      clickBar: 1,
    }
    , sly = new Sly(slides_wrapper, options).init()
    ;
    var slide_width = $('.slide').width();
    $('.slides ul').css('width',($('.slides ul').children().length + 5)*slide_width+'px');
  var t_id;

  $(document).on('mouseover','.slide', function (){
    var elem = $(this);
    t_id = setTimeout(function(){
      var span = document.createElement('span');
      $(span).addClass("glyphicon glyphicon-trash remove-slide")
      $(elem).append(span)
    },1000);
  });

  $(document).on('mouseout','.slide', function (){
    clearTimeout(t_id);
    $(this).find('span').remove();
  });
  
  $(document).on('click','.remove-slide', function (){
    var page = $(this).attr('id');
  });

  socket.on('new-page', function (data){
    var newSlide = document.createElement('li');
    
    $(newSlide).addClass('slide');
    $(newSlide).attr('id',data.page_id);
    $('.slides ul').append(newSlide);
    var slide_width = $('.slide').width();
    $('.slides ul').css('width',($('.slide').length  + 5)* slide_width+'px');
    sly.reload();
  });

  $(document).on('click', '.new-slide', function(){
    $('.slide-active').removeClass('.slide-active');
    $(this).addClass('slide-active');
    var slideId = addNewSlide();
    selectedPage = slideId;

    updateCanvas();
    canvasObjects[slideId] = {};

    socket.emit('new-page', {
      page_id: slideId,
      socket_id: mySocket,
      b: queries.b
    });

  });

  $(document).on('click', '.slide', function(){
    var lastSlide = $(selectedPage);
    selectedPage = $(this).attr('id');
    $('.slide-active').removeClass('slide-active');
    $(this).addClass('slide-active');

    updateCanvas();
  });

  function updateCanvas(){
    canvas.clear();
    for(socket_id in canvasObjects[selectedPage]){
      for(object in canvasObjects[selectedPage][socket_id]){
        canvas.add(canvasObjects[selectedPage][socket_id][object]);
      }
    }
  }

  function addNewSlide(){
    var newSlide = document.createElement('li')
      , lastId = $('.slide').last().attr('id')
      , newId = 'page'+ (parseInt(lastId.slice(4,5))+1)
      ;

    $(newSlide).addClass('slide');
    $(newSlide).attr('id',newId);
    $('.slides ul').append(newSlide);
    var slide_width = $('.slide').width();
    $('.slides ul').css('width',($('.slide').length  + 5)* slide_width+'px');
    sly.reload();
    return newId;
  }
  
  function getQueryParams(qs) {
    qs = qs.split("+").join(" ");
    var params = {}
      , tokens
      , re = /[?&]?([^=]+)=([^&]*)/g;

    while (tokens = re.exec(qs)) {
      params[decodeURIComponent(tokens[1])]
        = decodeURIComponent(tokens[2]);
    }
    return params;
  }

});

