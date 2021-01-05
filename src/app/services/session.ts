export class Session {
    private static _map: any;
    private constructor() {

    }
    static connect() {
        Session._map = {};
    }

    static get() {
        return Session._map;
    }
    static getValue(id: string) {
        return Session._map[id];
    }
    static clear() {
        Session._map = {};
    }
}