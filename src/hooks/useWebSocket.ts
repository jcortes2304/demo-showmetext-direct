import { useEffect } from 'react';
import {Client, IMessage} from '@stomp/stompjs';

type UseWebSocketProps = {
    url: string;
    topic: string;
    callback: (message: any) => void;
};

const useWebSocket = ({ url, topic, callback }: UseWebSocketProps): void => {
    useEffect(() => {

        const newClient = new Client({
            brokerURL: url,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        newClient.onConnect = () => {
            const newSubscription = newClient.subscribe(topic, (message: IMessage) => {
                const parsedMessage = JSON.parse(message.body);
                callback(parsedMessage);
            });

            return () => {
                newSubscription.unsubscribe();
                newClient.deactivate().then();
            };
        };

        newClient.activate();

        return () => {
            newClient.deactivate().then();
        };
    }, [url, topic, callback]);
};

export default useWebSocket;
