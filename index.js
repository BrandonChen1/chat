var app = require('express')(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    users = {};

app.get('/', function(req, res){
 res.sendFile(__dirname + '/chat.html');
});


io.on('connection', function(socket){
    socket.on('new user', function(data, callback){
        if (data in users){
            callback(false);
        }
        else{
            callback(true);
            socket.nickname = data;
            users[socket.nickname] = socket;
            updateNicknames();
        }
    });
    socket.on('send message', function(data, callback){
        var msg = data.trim();
        if(msg.substr(0,3) === '/w '){
            msg = msg.substr(3);
            var ind = msg.indexOf(' ');
            if(ind !== -1){
                var name = msg.substring(0, ind);
                var msg = msg.substring(ind + 1);
                if (name in users){
                    users[name].emit('private message', {msg: msg, nick: socket.nickname})
                    console.log('whisper');
                }
                else{
                    callback('Error! Enter a valid user');
                }
            }
            else{
                callback('Error: Please enter a message for your whipser');
            }
        }
        else{
            io.emit('chat message', {msg: msg, nick: socket.nickname});
        }
    });

    function updateNicknames(){
        io.emit('usernames', Object.keys(users));
    }

    socket.on('disconnect', function(data){
       if(!socket.nickname) return;
       io.emit('logout', socket.nickname);
       delete users[socket.nickname];
       updateNicknames();
    });
});

http.listen(3000, function(){
 console.log('listening on *:3000');
});
