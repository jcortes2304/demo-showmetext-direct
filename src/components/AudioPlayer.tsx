'use client'
import React, {useEffect, useState} from "react";
import {Client, StompSubscription} from "@stomp/stompjs";
import PCMPlayer from "pcm-player";
import {
    MinusCircleIcon,
    PlusCircleIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    WifiIcon
} from "@heroicons/react/24/outline";


export default function AudioPlayer(){

    const [flushingTime, setFlushingTime] = useState<number>(0);
    const [subscriptionAudio, setSubscriptionAudio] = useState<StompSubscription | null>(null);
    const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
    const [clientAudio, setClientAudio] = useState<Client | null>(null);

    const BASE_URL = "wss://sigas.showmetext.com/backend"
    const AUDIO_URL = `${BASE_URL}/gateway/ws`;
    const BASE_TOPIC = "/topic/providers/RTVE/channels/Teledeporte";

    const player = new PCMPlayer({
        inputCodec: 'Int16',
        channels: 1,
        sampleRate: 44100,
        flushTime: flushingTime,
    });

    // useEffect(() => {
    //     if (typeof window !== 'undefined') {
    //     }
    // }, []);


    const togglePlayAudio = () => {
        setIsPlayingAudio(!isPlayingAudio);
        if (subscriptionAudio) {
            subscriptionAudio.unsubscribe();
            setSubscriptionAudio(null);
        }
        clientAudio?.deactivate().then(() => {
            console.log('Disconnected audio');
            setClientAudio(null);
            player.destroy();
        })
    };

    useEffect(() => {
        if (isPlayingAudio) {
            const audioClient = new Client({
                brokerURL: AUDIO_URL,
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
            });

            audioClient.onConnect = () => {
                audioClient.subscribe(BASE_TOPIC, (message) => {
                    if (message.binaryBody) {
                        const data = message.binaryBody;
                        player.feed(data);
                    }
                });
            };

            audioClient.onDisconnect = () => {
                player.destroy();
            }

            audioClient.onStompError = (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            };

            audioClient.activate();
            setClientAudio(audioClient);
        }
    }, [isPlayingAudio]);


    return (
        <div>
            <label className="flex items-center label">Emisión de audio</label>
            <label className="flex items-center gap-2">
                {isPlayingAudio ?
                    <WifiIcon className="size-5 text-green-500"/>
                    :
                    <WifiIcon className="size-5 text-red-500"/>
                }
                Conectado
            </label>
            <div className="mt-3 justify-start flex items-center gap-2">
                <label className="label font-bold text-sm">Frecuencia: </label>
                <div className="badge badge-lg">{flushingTime}</div>
            </div>
            <div className="flex gap-2">
                <div className="tooltip tooltip-right"
                     data-tip="Disminuir frecuencia">
                    <button
                        disabled={isPlayingAudio || flushingTime === 0}
                        onClick={() => setFlushingTime(flushingTime - 1000)}
                        className={`${isPlayingAudio || flushingTime === 0} btn btn-outline btn-info mt-3 hover:text-white`}>
                        <MinusCircleIcon className="size-5"/>
                    </button>
                </div>
                <div className="tooltip"
                     data-tip={isPlayingAudio ? "Pausar Audio" : "Reproducir audio"}>
                    <button onClick={togglePlayAudio}
                            className="btn btn-outline btn-info mt-3 hover:text-white">
                        {isPlayingAudio ? <SpeakerXMarkIcon className="size-5"/> :
                            <SpeakerWaveIcon className="size-5"/>}
                    </button>
                </div>
                <div className="tooltip"
                     data-tip="Aumentar frecuencia">
                    <button
                        disabled={isPlayingAudio}
                        onClick={() => setFlushingTime(flushingTime + 1000)}
                        className={`${isPlayingAudio || flushingTime === 0} btn btn-outline btn-info mt-3 hover:text-white`}>
                        <PlusCircleIcon className="size-5"/>
                    </button>
                </div>
            </div>
        </div>
    )
}