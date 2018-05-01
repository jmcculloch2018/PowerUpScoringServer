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



app.get('/', function(req, res){
  res.send('<h1>AppCoda - SocketChat Server</h1>');
});


http.listen(3000, function(){
  console.log('Listening on *:3000');
});

function update(clientSocket) {
	var blueOwnershipIncrement = (bSwitchBlue ? 1 : 0) + ((nScaleState == -1) ? 1 : 0);
	var redOwnershipIncrement = (bSwitchRed ? 1 : 0) + ((nScaleState == 1) ? 1 : 0);

	if (gameTime < 15) { // auto
		blueOwnershipScore += 2 * blueOwnershipIncrement;
		redOwnershipScore += 2 * redOwnershipIncrement;
	} else {
		blueOwnershipScore += blueOwnershipIncrement;
		redOwnershipScore += redOwnershipIncrement;
	}

	console.log("blue:" + blueOwnershipScore);
	console.log("red:" + redOwnershipScore);


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
    nCubes = data[0];
 });
 clientSocket.on("boost", function(data) {
    nCubes = data[0];

 });
 clientSocket.on("levitate", function(data) {
    nCubes = data[0];

 });

});
