import * as amqp from "amqplib";
import * as amqpConMgr from 'amqp-connection-manager';
import { application } from "express";
import { json } from "body-parser";
export class RabbitmqConnection {
    private static connection: any;
    private static _client: amqpConMgr.ChannelWrapper;
    private constructor() {
    }
    //multiple connections at a time in rabit mq
    static connect() {
        let url: any = [`amqp://user:pass@url/sync-host`, `amqp://user:pass@url/sync-host`, `amqp://user:pass@url/sync-host`];
        this.connection = amqpConMgr.connect(url);
        this._client = this.connection.createChannel({
            json: true,
            setup: (channel: amqp.ConfirmChannel) => {
                channel.assertExchange('event.topic', 'topic', {
                    durable: true,
                    alternateExchange: 'amq.topic'
                })
            }
        });
        this.connection.on('connect', () => console.log('Connected!'));
        this.connection.on('disconnect', (err: any) => console.log('Disconnected.', err));
    }

    static sendToQueue(msg: any) {
        console.log("rabbit mq : ", msg);
        // let newMsg = JSON.stringify(msg);
        let exchange = 'event.topic';
        let key: string = msg.event;
        if (this._client) {
            this._client.publish(exchange, key, msg, { contentType: 'application/json', persistent: true }).then(() => {
                console.log("Message sent");
            }).catch((err) => {
                console.log(err);
            })
        } else {
            console.log("rabbit mq client not availabale to send msg")
        }
    }

    static close() {
        if (this._client) {
            this._client.close();
            this.connection.close();
        }
    }
    //Normal rabit mq service
    // static connect(){
    //     let url : any = `amqp://signaling_service:ZxkF9dNAo6Otmk9A6FWf@rabbitmq.${process.env.region}.houm.me/sync-host`;
    //     amqp.connect(url , (err, conn)=> {
    //         if(err){
    //             console.log(err)
    //         }else{
    //             conn.createChannel((err, channel)=> {
    //                 if(err){
    //                     console.log(err)
    //                 }else{
    //                     this._client = channel;
    //                 }
    //             });
    //         }
    //      });
    // }

    // static async sendToQueue(msg: any){
    // console.log("rabbit mq : ",msg);
    // let newMsg = JSON.stringify(msg);
    // let exchange = 'event.topic';
    // let key: string = msg.event;
    // if(this._client){
    //     this._client.assertExchange(exchange, 'topic', {
    //         durable: true
    //       });
    //       this._client.publish(exchange, key, Buffer.from(newMsg));
    // }else{
    //     console.log("rabbit mq client not availabale to send msg")
    // }
    // }

    // static close(){
    //     if(this._client){
    //         this._client.close();
    //     }
    // }
}