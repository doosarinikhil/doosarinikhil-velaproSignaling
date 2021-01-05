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
export { isRoomInSession, getSession, startSession, deleteSession }