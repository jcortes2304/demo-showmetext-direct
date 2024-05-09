import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';

export class StompService {
    private client: Client;
    private isConnected: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    private subscriptions: Map<string, StompSubscription> = new Map();

    constructor(private url: string) {
        this.client = new Client({
            brokerURL: url,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                this.isConnected.next(true);
                console.log('Connected to STOMP server');
            },
            onDisconnect: () => {
                this.isConnected.next(false);
                console.log('Disconnected from STOMP server');
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' );
            },
            onWebSocketError: (event) => {
                console.error('WebSocket error', event);
            }
        });
    }

    public connect() {
        if (!this.isConnected.value) {
            this.client.activate();
        }
    }

    public disconnect() {
        if (this.isConnected.value) {
            this.client.deactivate();
        }
    }

    public subscribe(topic: string, callback: (message: IMessage) => void): StompSubscription | null {
        let subscription= null
        if (this.isConnected.value){
            const subscription = this.client.subscribe(topic, callback);
            const id = subscription.id;
            this.subscriptions.set(id, subscription);
        }

        return subscription;
    }

    public unsubscribeById(id: string): void {
        const subscription = this.subscriptions.get(id);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(id);
        }
    }

    public unsubscribe(subscription: StompSubscription): void {
        const id = subscription.id;
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(id);
        }
    }

    public getStatus(): Observable<boolean> {
        return this.isConnected.asObservable();
    }
}
