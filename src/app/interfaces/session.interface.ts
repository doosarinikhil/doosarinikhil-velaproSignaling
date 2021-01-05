
interface IParticipantsList {
    [key: string]: any
}
export interface ISession {
    id: string,
    participants: IParticipantsList;
    joinedParticipants?: Array<string>
    logs?: any;
    startTime?: any;
}
export class InitSession {
    public participants: IParticipantsList;
    public id: string;
    public joinedParticipants: any;
    public logs: any = {};
    public startTime: any
    constructor(session: ISession) {
        this.id = session.id;
        this.participants = session.participants || {};
        this.joinedParticipants = [];
        this.logs.participants = session.participants || {};
        this.startTime = new Date().toISOString();
    }
}