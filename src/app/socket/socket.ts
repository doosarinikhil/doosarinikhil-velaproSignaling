import * as socket from "socket.io";
import { getSession, startSession, deleteSession, sendNotification, sendNotification1 } from "../helpers/utilities";
import { RabbitmqConnection } from "../services/rabbitmq"

var socketUsers: { [key: string]: any } = {};
function getUserStatus(id: string) {
    if (socketUsers[id].length > 0) {
        return true;
    } else {
        return false;
    }
}
function getSocketId(id: string) {
    if (socketUsers[id]) {
        return socketUsers[id];
    } else {
        return undefined;
    }
}

function listen(server: any) {
    var broadcastToRoom = (roomId: string, id: string, event: string, payload: any) => {
        if (getSession(roomId) && getSession(roomId).joinedParticipants && getSession(roomId).joinedParticipants.length > 0) {
            getSession(roomId).joinedParticipants.forEach((element: any) => {
                if (element.id != id && getSession(roomId).participants[element.id]) {
                    io.to(element.socketId).emit(event, payload);
                    console.log("sent message to  "+element.id+"  - payload is : ",payload);
                }
            });
        }
    }
    var sendToRoom = (roomId: string, event: string, payload: any) => {
        if (getSession(roomId) && getSession(roomId).participants && Object.keys(getSession(roomId).participants).length > 0) {
            Object.keys(getSession(roomId).participants).forEach((element: any) => {
                if (getSession(roomId).participants[element]) {
                    sendMessageTOSocketUsers(element, event, payload);
                }
            });
        }
    }
    var sendMessageTOSocketUsers = (id: string, event: string, payload: any) => {
        if (!socketUsers[id]) return;
        socketUsers[id].forEach((element: any) => {
            io.to(element.socketId).emit(event, payload);
        });
    }
    var io = socket.listen(server, {
        origins: '*:*',
        transports: ["polling","websocket"],
        pingInterval: 4000,
        pingTimeout: 9000,
    });
    io.sockets.setMaxListeners(0);
    process.setMaxListeners(0);
    io.use((socket: socket.Socket, next) => {
        let handshake = socket.handshake;
        if (handshake.query && handshake.query.accessToken && handshake.query.accessToken != undefined) {
            next();
        } else {
            next(new Error('please send accessToken'));
        }
    });
    io.on('connection', (socket: any) => {
        socket.userId = socket.handshake.query.accessToken;
        if (socketUsers[socket.userId]) {
            socketUsers[socket.userId].push({ socketId: socket.id })
        } else {
            socketUsers[socket.userId] = [];
            socketUsers[socket.userId].push({ socketId: socket.id });
        }
        console.log("connected :", socket.userId);
        // io.sockets.emit('online', { id: socket.userId });

        socket.on('CallRequest', (data: any) => {
            data.eventType = 'CallRequest';
            console.log("call req ", data);
            switch (data.type) {
                case "Request":
                    if(socketUsers[data.to.id]){
                        sendMessageTOSocketUsers(data.to.id, 'CallRequest', data)
                    }else{
                        sendNotification(data.to.id,data.from.id,data);
                        sendNotification1(data.to.id,data.from.id,data);
                        setTimeout(()=>{
                            sendMessageTOSocketUsers(data.to.id, 'CallRequest', data)
                        },10*1000)
                    }
                    break;
                case "Accept":
                    if (getSocketId(data.from.id)) {
                        getSocketId(data.from.id).forEach((element: any) => {
                            if (element.socketId != socket.id) {
                                io.to(element.socketId).emit('CallRequest', data);
                            }
                        });
                    }
                    if (getSession(data.roomId) && getSession(data.roomId).joinedParticipants) {
                        getSession(data.roomId).joinedParticipants.push({ id: data.from.id, socketId: socket.id })
                        if (!getSession(data.roomId).participants[data.from.id]) {
                            getSession(data.roomId).participants[data.from.id] = data.details;
                        }
                        if (getSession(data.roomId).participants[data.from.id].status == 7) {
                            getSession(data.roomId).participants[data.from.id].status = 3;
                        } else {
                            getSession(data.roomId).participants[data.from.id].status = 2;
                        }
                        if (data.details) {
                            getSession(data.roomId).participants[data.from.id].video = data.details.video;
                            getSession(data.roomId).participants[data.from.id].audio = data.details.audio;
                        }
                        broadcastToRoom(data.roomId, data.from.id, 'CallRequest', data);
                        socket.emit('CallRequest', { type: 'participants', status: true, participants: getSession(data.roomId).participants, roomId: data.roomId })
                    } else {
                        socket.emit('CallRequest', { type: 'participants', status: false, roomId: data.roomId })
                    }

                    socket.call = { roomId: data.roomId }
                    break;
                case "End":
                    sendToRoom(data.roomId, 'CallRequest', data);
                    deleteSession(data.roomId);
                    break;
                case "Busy":
                case "NotAnswered":
                case "Reject":
                case "hangup":
                    if (getSession(data.roomId) && getSession(data.roomId).joinedParticipants) {
                        let userIndex = getSession(data.roomId).joinedParticipants.findIndex((x: any) => { return x.socketId === socket.socketId });
                        if (userIndex != -1) {
                            getSession(data.roomId).joinedParticipants.splice(userIndex, 1);
                        }
                        if (getSession(data.roomId).participants[data.from.id] && getSession(data.roomId).participants[data.from.id].status) {
                            getSession(data.roomId).participants[data.from.id].status = 0;
                        }
                        sendToRoom(data.roomId, 'CallRequest', data)
                    }
                    break;
                case "Ringing":
                    if (getSession(data.roomId) && getSession(data.roomId).participants && getSession(data.roomId).participants[data.from.id]) {
                        getSession(data.roomId).participants[data.from.id].status = 1;
                    }
                    broadcastToRoom(data.roomId, data.from.id, 'CallRequest', data);
                    break;
                case "mute":
                    if (getSession(data.roomId) && getSession(data.roomId).participants && getSession(data.roomId).participants[data.from.id]) {
                        if (data.muteType == 'video') {
                            if (data.mute) {
                                getSession(data.roomId).participants[data.from.id].video = 0;
                            } else {
                                getSession(data.roomId).participants[data.from.id].video = 1;
                            }
                        } else {
                            if (data.mute) {
                                getSession(data.roomId).participants[data.from.id].audio = 0;
                            } else {
                                getSession(data.roomId).participants[data.from.id].audio = 1;
                            }
                        }
                    }
                    broadcastToRoom(data.roomId, data.from.id, 'CallRequest', data);
                    break
                default:
                    broadcastToRoom(data.roomId, data.from.id, 'CallRequest', data);
            }
        })
        socket.on('init', (data: any) => {
            socket.call = { roomId: data.roomId }
            startSession(data.roomId, data.participants)
            getSession(data.roomId).joinedParticipants.push({ id: data.from.id, socketId: socket.id }) 
            console.log("init ",getSession(data.roomId)); 
        })
        socket.on('addParticipants', (data: any) => {
            data.eventType = 'addParticipants';
            if (getSession(data.roomId)) {
                if (data.participants.length > 0 && getSession(data.roomId)) {
                    data.participants.forEach((participant: any) => {
                        if (!Object.keys(getSession(data.roomId).participants).includes(participant.id)) {
                            getSession(data.roomId).participants[participant.id] = participant;
                        }
                    })
                }
            }
        })
        // Peer to peer calling events 
        socket.on('P2P', (data: any) => {
            data.eventType = 'P2P';
            console.log('P2P : ',data);
            broadcastToRoom(data.roomId, data.from.id, 'P2P', data);
        });
        socket.on('messages', (data: any, callback: any) => {
            if (socketUsers[data.to.id]) {
                socket.to(socketUsers[data.to.id]).emit('messages', data)
                callback({ statusCode: 1 })
            } else {
                callback({ statusCode: 0 })
            }
            // statusCode : 0 - user not available 
            // statusCode : 1 - user available 
        })
        //socket leave event trigger when user trigger leave from client
        socket.on('leave', (data: any, callback: Function) => {
            callback({ success: true })
        })
        //Socket Disconnect Event
        socket.on('disconnect', (data: any) => {
            let timeOutSec = 40;
            if (data == "transport close") {
                console.log("close");
                timeOutSec = 3;
            }
            // io.sockets.emit('offline', { id: socket.userId });
            console.log("disconnect" + socket.userId + " data: ", data);
            let index = socketUsers[socket.userId].findIndex((x: any) => { return x.socketId === socket.id });
            if (index != -1) {
                socketUsers[socket.userId].splice(index, 1);
            }
            if (socketUsers[socket.userId].length == 0) {
                delete socketUsers[socket.userId];
            }
            if (socket.call) {
                if (getSession(socket.call.roomId) && getSession(socket.call.roomId).joinedParticipants) {
                    let userIndex = getSession(socket.call.roomId).joinedParticipants.findIndex((x: any) => { return x.socketId === socket.id });
                    if (userIndex != -1) {
                        getSession(socket.call.roomId).joinedParticipants.splice(userIndex, 1);
                        if (getSession(socket.call.roomId) && getSession(socket.call.roomId).participants && getSession(socket.call.roomId).participants[socket.userId] && getSession(socket.call.roomId).participants[socket.userId].status) {
                            getSession(socket.call.roomId).participants[socket.userId].status = 7;
                        }
                    }
                    sendToRoom(socket.call.roomId, 'socktDisconnect', { id: socket.userId, ...socket.call })
                    setTimeout(() => {
                        if (getSession(socket.call.roomId)) {
                            let userIndex = getSession(socket.call.roomId).joinedParticipants.findIndex((x: any) => { return x.id === socket.userId });
                            if (userIndex == -1) {
                                // delete getSession(socket.call.roomId).participants[socket.userId];
                                if (getSession(socket.call.roomId) && getSession(socket.call.roomId).participants[socket.userId] && getSession(socket.call.roomId).participants[socket.userId].status) {
                                    getSession(socket.call.roomId).participants[socket.userId].status = 0;
                                }
                                sendToRoom(socket.call.roomId, 'RemoveUser', { id: socket.userId, ...socket.call, type: 'RemoveUser', from: { id: socket.userId } })
                            }
                        }
                    }, timeOutSec * 1000)
                    if (getSession(socket.call.roomId) && getSession(socket.call.roomId).joinedParticipants && getSession(socket.call.roomId).joinedParticipants == 0) {
                        sendToRoom(socket.call.roomId, 'CallRequest', { from: { id: socket.userId }, type: "End", roomId: socket.call.roomId })
                        deleteSession(socket.call.roomId);
                    }
                }
            }
        })
    })
    return io;
}
export { listen, getUserStatus, getSocketId }
