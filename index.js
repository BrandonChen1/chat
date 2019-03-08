var app = require('express')(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    mongoose = require('mongoose'),
    users = {};

//Creates and connects to mongodb server
mongoose.connect('mongodb://localhost/chat', function(err){
    if(err){
        console.log(err);
    }
    else{
        console.log('connected to mongodb');
    }
});

//Creates the schema(BSON doc) that stores the nickname and message and time
var chatSchema = mongoose.Schema({
    nick: String,
    msg: String,
    created: {type: Date, default: Date.now}
});

//Creates a model with parameters the name, and the schema
var Chat = mongoose.model('Message', chatSchema);

//Checks for the url and sends a response to load the html file
app.get('/', function(req, res){
 res.sendFile(__dirname + '/chat.html');
});

//Checks for a connection and calls functions based on the socket connected
io.on('connection', function(socket){
    //Chat.find({}) takes parameters that helps query information from the model.
    //{} gets everything, but can be set {nick = 'Brandon'} to get nicknames
    var query = Chat.find({});
    //Sorting descended by time and limits the number of queries to 10
    //exec executes the function that has a call back and the mongoose doc.
    query.sort('-created').limit(10).exec( function(err, docs){
        if(err) throw err;
        //Sends a call to client side with the doc
        socket.emit('load old msgs', docs);
    });

    //Listens for 'new user' call from client side
    //Assigns the username to the socket and adds to the hashmap of sockets with keys being usernames
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

    //Listens for 'send message' call from client side
    //Checks for private message or global message and sends the message back to client side
    //If private message, the server determines to which socket to send it to
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
            var newMsg = new Chat({msg: msg, nick: socket.nickname});
            newMsg.save(function(err){
                if (err) throw err;
                io.emit('chat message', {msg: msg, nick: socket.nickname});
            });
        }
    });

    function updateNicknames(){
        io.emit('usernames', Object.keys(users));
    }

    //Listens for disconnects
    socket.on('disconnect', function(data){
       if(!socket.nickname) return;
       io.emit('logout', socket.nickname);
       delete users[socket.nickname];
       updateNicknames();
    });
});

//Listens on the port 3000
http.listen(3000, function(){
 console.log('listening on *:3000');
});
