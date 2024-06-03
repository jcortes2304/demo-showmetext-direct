import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface WebSocketConfig {
    serverUrl: string;
    topic: string;
    destination: string;
    onMessage: (message: IMessage) => void;
}

class WebSocketService {
    private readonly client: Client;
    private subscription: StompSubscription | null = null;

    constructor(private config: WebSocketConfig) {
        this.client = new Client({
            brokerURL: config.serverUrl,
            connectHeaders: {},
            debug: (str) => { console.log(str); },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            // webSocketFactory: () => new SockJS(config.serverUrl)
        });
    }

    public connect() {
        this.client.onConnect = (frame) => {
            console.log('Connected: ' + frame);
            this.subscription = this.client.subscribe(this.config.topic, this.config.onMessage);
        };

        this.client.activate();
    }

    public disconnect() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
        if (this.client) {
            this.client.deactivate().then(r => console.log('Disconnected'));
        }
    }

    public sendMessage(message: string) {
        if (this.client.connected) {
            this.client.publish({
                destination: this.config.destination,
                body: message
            });
        }
    }
}

export default WebSocketService;
