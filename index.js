var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
// var userList = [];
// var typingUsers = {};
// game vars
var running = false;
var gameTime = 0;
var intervalObj;
// ownership
var redOwnershipScore = 0;
var blueOwnershipScore = 0;
var bSwitchBlue = false;
var bSwitchRed = false;
var nScaleState = 0;
//power ups
var levitateUsed = [false, false];
var levitateCubes = [0, 0];

var forceTimes = [-1, -1];
var forceTypes = [-1, -1];
var forceCubes = [0, 0];

var boostTypes = [-1, -1];
var boostTimes = [-1, -1];
var boostCubes = [0, 0];



app.get('/', function(req, res){
  res.send('<h1>AppCoda - SocketChat Server</h1>');
});


http.listen(3000, function(){
  console.log('Listening on *:3000');
});

function update(clientSocket) {
  var blueScalePoints = ((nScaleState == -1) ? 1 : 0);
	var blueSwitchPoints = (bSwitchBlue ? 1 : 0);
	var redSwitchPoints = (bSwitchRed ? 1 : 0);
  var redScalePoints = ((nScaleState == 1) ? 1 : 0);

  // power ups
  if (forceTimes[0] > 0 && forceTimes[0] <= gameTime && forceTimes[0] + 10 > gameTime) {
    if (forceTypes[0] != 2) { // force switch
      redSwitchPoints = 1;
    } 
    if (forceTypes[0] != 1) {
      redScalePoints = 1;
      blueScalePoints = 0;
    }
  } else if (boostTimes[0] > 0 && boostTimes[0] <= gameTime && boostTimes[0] + 10 > gameTime) {
    if (boostTypes[0] != 2) { // force switch
      redSwitchPoints *= 2;
    } 
    if (boostTypes[0] != 1) {
      redScalePoints *= 2;
    }
  } else if (forceTimes[1] > 0 && forceTimes[1] <= gameTime && forceTimes[1] + 10 > gameTime) {
    if (forceTypes[1] != 2) { // force switch
      blueSwitchPoints = 1;
    } 
    if (forceTypes[1] != 1) {
      blueScalePoints = 1;
      redScalePoints = 0;
    }
  } else if (boostTimes[1] > 0 && boostTimes[1] <= gameTime && boostTimes[1] + 10 > gameTime) {
    if (boostTypes[1] != 2) { // force switch
      blueSwitchPoints *= 2;
    } 
    if (boostTypes[1] != 1) {
      blueScalePoints *= 2;
    }
  } 

  var blueOwnershipIncrement = blueScalePoints + blueSwitchPoints;
  var redOwnershipIncrement = redScalePoints + redSwitchPoints;

	if (gameTime < 15) { // auto
		blueOwnershipScore += 2 * blueOwnershipIncrement;
		redOwnershipScore += 2 * redOwnershipIncrement;
	} else {
		blueOwnershipScore += blueOwnershipIncrement;
		redOwnershipScore += redOwnershipIncrement;
	}

  var redVaultScore = 5 * (levitateCubes[0] + forceCubes[0] + boostCubes[0]);
  var blueVaultScore = 5 * (levitateCubes[1] + forceCubes[1] + boostCubes[1]);

  console.log("Red:" + redOwnershipScore + ", " +  redVaultScore);
  console.log("Blue:" + blueOwnershipScore + ", " + blueVaultScore);

	if (++gameTime >= 150) {
		// end game
		io.emit("end");
		running = false;
		clearInterval(intervalObj);
	}

}

io.on('connection', function(clientSocket){
  console.log('a user connected');

  clientSocket.on('disconnect', function(){
    console.log('user disconnected');

    // var clientNickname;
    // for (var i=0; i<userList.length; i++) {
    //   if (userList[i]["id"] == clientSocket.id) {
    //     userList[i]["isConnected"] = false;
    //     clientNickname = userList[i]["nickname"];
    //     break;
    //   }
    // }

    // delete typingUsers[clientNickname];
    // io.emit("userList", userList);
    // io.emit("userExitUpdate", clientNickname);
    // io.emit("userTypingUpdate", typingUsers);
  });


  clientSocket.on("start", function(data) {
    var str = data["gameString"];
    console.log("starting:" + str);
    gameTime = 0;
    running = true;
    intervalObj = setInterval(() => {
    	update(clientSocket);
	}, 1000);

    io.emit("start", str);
  });

  clientSocket.on("setSwitchRed", function(data) {
  	bSwitchRed = data[0];
  	io.emit("setSwitchRed", bSwitchRed);
  });

  clientSocket.on("setSwitchBlue", function(data) {
  	bSwitchBlue = data[0];
  	io.emit("setSwitchBlue", bSwitchBlue);
  });

 clientSocket.on("setScaleState", function(data) {
  	nScaleState = data[0];
  	io.emit("setScaleState", nScaleState);
  });

 clientSocket.on("force", function(data) {
    index = data[0] ? 0 : 1; // 0 if red
    nCubes = data[1];
    forceCubes[index] = nCubes;
    if (forceTimes[index] < 0) { // unused
      forceTimes[index] = getNextPowerUpTime();
      forceTypes[index] = nCubes;
    }
 });

 clientSocket.on("boost", function(data) {
    index = data[0] ? 0 : 1; // 0 if red
    nCubes = data[1];
    boostCubes[index] = nCubes;
    if (boostTimes[index] < 0) { // unused
      boostTimes[index] = getNextPowerUpTime();
      boostTypes[index] = nCubes;
    }

 });

 clientSocket.on("levitate", function(data) {
    index = data[0] ? 0 : 1; // 0 if red
    nCubes = data[1];
    levitateCubes[index] = nCubes;
    if (nCubes == 3) {
      levitateUsed[index] = true;
    }
 });

});

function getNextPowerUpTime() {
  var nextTime = gameTime;
  for (var i = 0; i < 2; i++) {
    nextTime = Math.max(forceTimes[i] + 10, nextTime);
    nextTime = Math.max(boostTimes[i] + 10, nextTime);
  }
  return nextTime;
}
