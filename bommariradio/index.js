var express = require('express'),
app 		= express(),
http 		= require('http').Server(app),
config		= require('./config/config'),
io 			= require('socket.io')(http);
mp3Duration = require('mp3-duration');
glob 		= require("glob");
queryString	= require('querystring');
fs 			= require('fs');
path 		= "public/music/";

app.use(express.static(__dirname + '/public'));

fileName = "";
endTime = 0;
startDate = new Date();
startTime = 0;
clientCount = 0;

function changeSong(){
	//figure out the filename
	//play the file
	//set new interval for changing to the next song


  var getDirectories = function (src, callback) {
    glob(src + '/**/*', callback);
  };
  getDirectories(path, function (err, res) {
    if (err) {
      console.log('Error', err);
    } else {
    var files = [];
  	for (var i = 0; i < res.length; i++) {
      //Do something
      if (res[i].substr(res[i].length - 4) === ".mp3"){
        files.push(res[i]);
      }
  	}


    var file = files[Math.floor(Math.random() * files.length)];
    fileName = file.slice(7);
    io.sockets.emit('play', queryString.escape(fileName), fileName, startTime);

    mp3Duration(file, function (err, result) {
      if (err) return console.log(err.message);
      endTime = result;
      startDate = new Date();
      setTimeout(changeSong, result*1000);
    });
    }
  });


}


function renameCurrentSong(passwd, newName){
	if (passwd != "SALASANA MENEE TÄHÄN, ei tosin näy gitissä asti"){
		return;
	}
	var filePath = fileName.substring(0, fileName.lastIndexOf("/"));
	if (newName == ""){
		return;
	}
	console.log("changing ", fileName, " to ", filePath+newName+".mp3");
	if (!fs.existsSync(__dirname+ "/public/"+filePath + "/" + newName + ".mp3")) { //check if the file already exists
		fs.rename(__dirname+ "/public/"+fileName, __dirname+ "/public/"+filePath + "/" + newName + ".mp3", function(err) {
			if ( err ){
				console.log('ERROR: ' + err);
				return;
			}
			
			fileName = filePath + "/" + newName + ".mp3";
			var endDate = new Date();
			var difference = (endDate.getTime() - startDate.getTime())/1000;
			io.sockets.emit('play', queryString.escape(fileName), fileName, difference);
		});

	}

}



io.on('connection', function(socket){
  clientCount++;
  console.log("clients: ", clientCount);
  var endDate = new Date();
  var difference = (endDate.getTime() - startDate.getTime())/1000;
	socket.emit('play', queryString.escape(fileName), fileName, difference);
	//a connection estabilished on the pair chat page
  socket.on('requestPlayBack', function(){
    var endDate = new Date();
    var difference = (endDate.getTime() - startDate.getTime())/1000;
  	socket.emit('play', queryString.escape(fileName), fileName, difference);
  });
  socket.on('renameFile', function(passwd, newName){
	  renameCurrentSong(passwd, newName);
	
  });
	socket.on('disconnect', function(){
	  clientCount--;
	});
});




changeSong();


http.listen(config.port, function(){
  console.log(`Listening on port ${config.port}`);
});
