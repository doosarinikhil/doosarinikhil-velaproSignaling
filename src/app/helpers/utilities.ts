import { Session as sessionMap } from "../services/session"
import { InitSession, ISession } from "../interfaces/session.interface";
import { post } from "request";
import { connected } from "process";


function startSession(roomId: string, participants: any) {
    let session = new InitSession({ id: roomId, participants })
    setSession(roomId, session);
}
function isRoomInSession(roomId: string) {
    if (sessionMap.get()[roomId]) {
        return true
    } else {
        return false
    }
}
function getSession(roomId: string) {
    return sessionMap.get()[roomId];
}
function setSession(id: string, session: any) {
    sessionMap.get()[id] = session;
}
function deleteSession(roomId: string) {
    delete sessionMap.get()[roomId];
}
function getFullSession() {
    return sessionMap.get();
}
function updateSession(roomId: string, key: string, value: any) {
    if (isRoomInSession(roomId)) {
        getSession(roomId)[key] = value;
    }
    return (getSession(roomId));
}
function sendNotification1(id: string, fromUserId: string, payloadData: any): Promise<any> {
    return new Promise((resolve, reject) => {
        post('https://msgdev.velapro.com:3001/api/v1/webrtcActiveUsers/sendPushToReceiver', { json: { toUserId: id, fromUserId, payloadData } }, (err, response, body) => {
            if (err) {
                console.error("Error ---->", err.message);
            } else {
                resolve(body);
            }
        });
    })

}
function sendChatList(payloadData: any): Promise<any> {
    return new Promise((resolve, reject) => {
        post('https://velapro.com:3001/api/v1/common/commonUpdates', { json: payloadData}, (err, response, body) => {
            if (err) {
                console.error("Error ---->", err.message);
            } else {
                console.log(response)
                console.log("api ",body)
                resolve(body);
            }
        });
    })

}
function sendNotification(id: string, fromUserId: string,payloadData: any): Promise<any> {
    return new Promise((resolve, reject) => {
        post('https://velapro.com:3001/api/v1/webrtcActiveUsers/sendPushToReceiver', { json: { toUserId: id, fromUserId, payloadData } }, (err, response, body) => {
            if (err) {
                console.error("Error ---->", err.message);
            } else {
                resolve(body);
            }
        });
    })

}
function setParticipant(roomId: string, participant: any) {
    getSession(roomId).participants[participant.id] = participant;
    getSession(roomId).logs.participants[participant.id] = participant;
    getSession(roomId).logs.participants[participant.id].startTime = new Date().toISOString();
    return getSession(roomId).participants;
}
function joinParticipant(roomId: string, id: string, socketId: string) {
    let data = { id, socketId }
    getSession(roomId).joinedParticipants.push(data);
}
export { isRoomInSession, getSession, startSession, deleteSession, sendNotification, sendNotification1, sendChatList }