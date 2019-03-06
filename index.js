var app = require('express')(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    nicknames = [];

app.get('/', function(req, res){
 res.sendFile(__dirname + '/chat.html');
});


io.on('connection', function(socket){
    socket.on('new user', function(data, callback){
        if (nicknames.indexOf(data) != -1){
            callback(false);
        }
        else{
            callback(true);
            socket.nickname = data;
            nicknames.push(socket.nickname);
            updateNicknames();
        }
    });
    socket.on('send message', function(data){
        io.emit('chat message', {msg: data, nick: socket.nickname});
    });

    function updateNicknames(){
        io.emit('usernames', nicknames);
    }

    socket.on('disconnect', function(data){
       if(!socket.nickname) return;
       io.emit('logout', socket.nickname);
       nicknames.splice(nicknames.indexOf(socket.nickname), 1);
       updateNicknames();
    });
});

http.listen(3000, function(){
 console.log('listening on *:3000');
});
