const express = require('express');
const {Server} = require('socket.io');

const path = require('path');
const http =require('http');
const ACTIONS = require('./Actions');
const app=express();

app.use(express.static('dist'));

app.use((req,res,next)=>{
    res.sendFile(path.join(__dirname,'dist','index.html' ));
})
const server = http.createServer(app);

const io = new Server(server);

const userSocketMap={};
function getAllConnectedClients(roomId){
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId)=>{
        return {
            socketId,
            username: userSocketMap[socketId]
        }
    });
}
io.on('connection', (socket)=>{

    console.log("socket connected", socket.id);
    
    socket.on(ACTIONS.JOIN, ({roomId, username})=>{
        console.log('join');
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        console.log(clients);
        clients.forEach(({socketId})=>{
            io.to(socketId).emit(ACTIONS.JOINED,
                {
                    clients,
                    username,
                    socketId:socket.id,
                }
            
            );
        })
    })


    socket.on(ACTIONS.CODE_CHANGE,({roomId, code})=>{
        //io.to will send to all including the user who is emitting
        // io.to(roomId).emit(ACTIONS.CODE_CHANGE, {code});

        //socket.in will not send to the user who is emitting
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE,{code});
    })

    socket.on(ACTIONS.SYNC_CODE,({socketId, code})=>{
        
        io.to(socketId).emit(ACTIONS.CODE_CHANGE,{code});
    })


    socket.on('disconnecting', ()=>{
        console.log("someonee disconencewt")
        const rooms = [...socket.rooms];
        rooms.forEach((roomId)=>{
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId : socket.id,
                username: userSocketMap[socket.id],
            })
        });

        delete userSocketMap[socket.id];
        socket.leave();
    })
})
const PORT=process.env.PORT || 5000;
server.listen(PORT, ()=>console.log(`listening on ${PORT}`));


