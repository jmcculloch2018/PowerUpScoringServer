var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
// game vars
var running = false;
var gameTime = -4;
var intervalObj;
var redAutoQuest = false, blueAutoQuest = false;
// ownership
var redOwnershipScore = 0;
var blueOwnershipScore = 0;
var bSwitchBlue = false;
var bSwitchRed = false;
var nScaleState = 0; // -1 = blue, 1 = red
//power ups
var levitateUsed = [false, false];
var levitateCubes = [0, 0];

var forceTimes = [-1, -1];
var forceTypes = [-1, -1];
var forceCubes = [0, 0];

var boostTypes = [-1, -1]; // [r, b]
var boostTimes = [-1, -1];
var boostCubes = [0, 0];

// fouls
var redFoulPoints = 0;
var blueFoulPoints = 0;

// climbs
var redClimbs = 0;
var blueClimbs = 0;
var redParks = 0;
var blueParks = 0;

// auto
var redCross = 0;
var blueCross = 0;


app.get('/', function(req, res){
  res.sendfile('index.html');
});

app.use(express.static('static'));



http.listen(3000, function(){
  console.log('Listening on *:3000');
});

function update(clientSocket) {
  var blueScalePoints = ((nScaleState == -1) ? 1 : 0);
	var blueSwitchPoints = (bSwitchBlue ? 1 : 0);
	var redSwitchPoints = (bSwitchRed ? 1 : 0);
  var redScalePoints = ((nScaleState == 1) ? 1 : 0);
  var forceActive = [false, false];
  var boostActive = [false, false];

  // power ups
  if (forceTimes[0] > 0 && forceTimes[0] <= gameTime && forceTimes[0] + 10 > gameTime) {
    if (forceTypes[0] != 2) { // force switch
      redSwitchPoints = 1;
    } 
    if (forceTypes[0] != 1) {
      redScalePoints = 1;
      blueScalePoints = 0;
    }
    forceActive[0] = true;
  } else if (boostTimes[0] > 0 && boostTimes[0] <= gameTime && boostTimes[0] + 10 > gameTime) {
    if (boostTypes[0] != 2) { // force switch
      redSwitchPoints *= 2;
    } 
    if (boostTypes[0] != 1) {
      redScalePoints *= 2;
    }
    boostActive[0] = true;
  } else if (forceTimes[1] > 0 && forceTimes[1] <= gameTime && forceTimes[1] + 10 > gameTime) {
    if (forceTypes[1] != 2) { // force switch
      blueSwitchPoints = 1;
    } 
    if (forceTypes[1] != 1) {
      blueScalePoints = 1;
      redScalePoints = 0;
    }
    forceActive[1] = true;
  } else if (boostTimes[1] > 0 && boostTimes[1] <= gameTime && boostTimes[1] + 10 > gameTime) {
    if (boostTypes[1] != 2) { // force switch
      blueSwitchPoints *= 2;
    } 
    if (boostTypes[1] != 1) {
      blueScalePoints *= 2;
    }
    boostActive[1] = true;
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

  if (gameTime == 15) {
    redAutoQuest = bSwitchRed;
    blueAutoQuest = bSwitchBlue;
  }

  var redScore = getRedScore()[0];
  var blueScore = getBlueScore()[0];
  console.log("Red:" + redScore);
  console.log("Blue:" + blueScore);
  io.emit("updateScores", redScore, blueScore, levitateUsed, levitateCubes, forceActive, forceTypes, forceTimes, forceCubes, boostActive, boostTypes, boostTimes, boostCubes, gameTime);

	if (++gameTime > 150) {
		// end game
		io.emit("end");
		running = false;
		clearInterval(intervalObj);
	}

}

function getRedScore() {
  var redVaultScore = 5 * (levitateCubes[0] + forceCubes[0] + boostCubes[0]);
  var redAutoScore = redCross * 5;
  var redEndgame = 5 * redParks + 30 * redClimbs;
  if (levitateUsed[0] && redClimbs < 3) {
    if (redClimbs + redParks < 3) {
      redEndgame += 30;
    } else {
      redEndgame += 25;
    }
  }
  var redScore = redOwnershipScore + redVaultScore + redAutoScore + redEndgame + blueFoulPoints;
  return [redScore, redAutoScore, redEndgame, redOwnershipScore, redVaultScore, redFoulPoints];
}

function getBlueScore() {
  var blueVaultScore = 5 * (levitateCubes[1] + forceCubes[1] + boostCubes[1]);
  var blueAutoScore = blueCross * 5;
  var blueEndgame = 5 * blueParks + 30 * blueClimbs;
  if (levitateUsed[1] && blueClimbs < 3) {
    if (blueClimbs + blueParks < 3) {
      blueEndgame += 30;
    } else {
      blueEndgame += 25;
    }
  }
  var blueScore = blueOwnershipScore + blueVaultScore + blueAutoScore + blueEndgame + redFoulPoints;
  return [blueScore, blueAutoScore, blueEndgame, blueOwnershipScore, blueVaultScore, blueFoulPoints];
}

io.on('connection', function(clientSocket){
  console.log('a user connected');

  clientSocket.on('disconnect', function(){
    console.log('user disconnected');
  });


  clientSocket.on("start", function(data) {
    var str = data["gameString"];
    intervalObj = setInterval(() => {
    	update(clientSocket);
	   }, 1000);

    io.emit("start", str);
  });

  clientSocket.on("finalize", function(data) {
    var redScores = getRedScore();
    var blueScores = getBlueScore();
    io.emit("finalize", redScores[1], redScores[2], redScores[3], redScores[4], redScores[5], redAutoQuest && redCross == 3, 
      blueScores[1], blueScores[2], blueScores[3], blueScores[4], blueScores[5], blueAutoQuest && blueCross == 3);
  });
  clientSocket.on("reset", function(data) {
    // reset data
    gameTime = -4;
    running = true;
    redOwnershipScore = 0;
    blueOwnershipScore = 0;
    bSwitchBlue = false;
    bSwitchRed = false;
    nScaleState = 0;

    levitateUsed = [false, false];
    levitateCubes = [0, 0];

    forceTimes = [-1, -1];
    forceTypes = [-1, -1]; 
    forceCubes = [0, 0];

    boostTypes = [-1, -1];
    boostTimes = [-1, -1];
    boostCubes = [0, 0];

    redFoulPoints = 0;
    blueFoulPoints = 0;

    redClimbs = 0;
    blueClimbs = 0;
    redParks = 0;
    blueParks = 0;

    redCross = 0;
    blueCross = 0;

    redAutoQuest = false;
    blueAutoQuest = false;

    io.emit("reset", data);
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

 clientSocket.on("foul", function(data) {
    var pts = data[1] ? 25 : 5;
    if (data[0]) {
      redFoulPoints += pts;
    } else {
      blueFoulPoints += pts;
    }
 });

 clientSocket.on("updateAutoCrosses", function(data) {
    if (data[0]) {
      redCross = data[1];
    } else {
      blueCross = data[1];
    }
    io.emit("updateAutoCrosses", data[0], data[1]);
  });

  clientSocket.on("updateClimbs", function(data) {
    if (data[0]) {
      redClimbs = data[1];
    } else {
      blueClimbs = data[1];
    }
    io.emit("updateClimbs", data[0], data[1]);
  });

  clientSocket.on("updateParks", function(data) {
    if (data[0]) {
      redParks = data[1];
    } else {
      blueParks = data[1];
    }
    io.emit("updateParks", data[0], data[1]);
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
