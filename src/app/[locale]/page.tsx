"use client"
import {
    ArrowPathIcon,
    InformationCircleIcon, MinusCircleIcon, PlusCircleIcon,
    SpeakerWaveIcon, SpeakerXMarkIcon,
    WifiIcon,
} from "@heroicons/react/24/outline";
import {MoonIcon, SunIcon} from "@heroicons/react/20/solid";
import React, {useEffect, useState} from "react";
import {Client, StompSubscription} from '@stomp/stompjs';
import PCMPlayer from "pcm-player";
import {SubtitleMessage} from "@/schemas/SubtitleMessageSchema";
import {useTranslations} from 'next-intl';

export default function HomePage() {
    const t = useTranslations('HomePage');

    const BASE_URL = "wss://sigas.showmetext.com/backend"
    const SUBTITLES_URL = `${BASE_URL}/publisher/ws`;
    const AUDIO_URL = `${BASE_URL}/gateway/ws`;
    const BASE_TOPIC = "/topic/providers/RTVE/channels/Teledeporte";

    const AMOUNT_OF_WORDS_TO_SEND = 5;
    const INTERVAL_TO_TIME_BETWEEN_SENDS = 3;
    const INTERVAL_WAITING_TO_SEND = 3;
    const AMOUNT_OF_WORDS_AFTER_CLEAN = 2;

    const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
    const [isPlayingSubTitle, setIsPlayingSubTitle] = useState<boolean>(false);
    const [subtitles, setSubtitles] = useState("");
    const [subtitlesToSend, setSubtitlesToSend] = useState("");
    const [clientAudio, setClientAudio] = useState<Client | null>(null);
    const [subtitlesClient, setSubtitlesClient] = useState<Client | null>(null);
    const [subscriptionSubtitle, setSubscriptionSubtitle] = useState<StompSubscription | null>(null);
    const [subscriptionAudio, setSubscriptionAudio] = useState<StompSubscription | null>(null);
    const [flushingTime, setFlushingTime] = useState<number>(0);

    const player = new PCMPlayer({
        inputCodec: 'Int16',
        channels: 1,
        sampleRate: 44100,
        flushTime: flushingTime,
    });

    const updateSendSubtitles = (newText: string) => {
        let words = newText.trim().split(/\s+/);
        let wordsToSend = words.slice(0, AMOUNT_OF_WORDS_TO_SEND).join(" ") + " ";
        let remainingWords = words.slice(AMOUNT_OF_WORDS_TO_SEND).join(" ");
        setSubtitles(remainingWords);
        setSubtitlesToSend(prev => prev + " " + wordsToSend);
    };


    useEffect(() => {
        const intervalId = setInterval(() => {
            updateSendSubtitles(subtitles)
        }, INTERVAL_TO_TIME_BETWEEN_SENDS * 1000);
        return () => clearInterval(intervalId);
    }, [subtitles]);

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
            const newClient = new Client({
                brokerURL: SUBTITLES_URL,
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
            });

        newClient.onConnect = () => {
            const newSubscription = newClient.subscribe(`${BASE_TOPIC}/subtitles/0`, (message) => {
                const subtitleMessage: SubtitleMessage = JSON.parse(message.body);
                if (subtitleMessage) {
                    const subtitlesArray = subtitleMessage.subtitles;
                    const text = subtitlesArray.map(line => line.texts.map(text => text.characters).join(" ")).join("\n");
                    setSubtitles(prev => prev + "\n" + text);
                }
            });
            setSubscriptionSubtitle(newSubscription);

            return () => {
                newSubscription.unsubscribe();
                newClient.deactivate();
            };
        };

        newClient.activate();
        return () => {
            newClient.deactivate();
        };

    }, []);


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
        <div className="p-2">
            <label className="ms-4 swap swap-rotate">
                <input type="checkbox" className="theme-controller" value="light"/>
                <SunIcon className="swap-off fill-current w-10 h-10"/>
                <MoonIcon className="swap-on fill-current w-10 h-10"/>
            </label>

            <div className="mx-auto p-4 flex flex-col md:flex-row">
                <div className="w-full md:max-w-md border rounded-md border-gray-400 m-2 overflow-y-auto">
                    <div className="p-4 space-y-5">
                        <label className="flex items-center card-title">{t('serverConnection')}</label>
                        <div>
                            <label className="flex items-center label">Emisión de subtítulos</label>
                            <label className="flex items-center gap-2">
                                {isPlayingSubTitle ?
                                    <WifiIcon className="size-5 text-green-500"/>
                                    :
                                    <WifiIcon className="size-5 text-red-500"/>
                                }
                                Conectado
                                <ArrowPathIcon className="size-5 text-blue-500 cursor-pointer" title="Reconectar"/>
                            </label>
                        </div>
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

                        <label className="items-center card-title">Parámetros</label>
                        <div className="form-control gap-5">
                            <label className="input input-bordered flex items-center gap-2">
                                <input type="number" className="grow" placeholder="Introduzca cantidad"/>
                                <div className="tooltip tooltip-left" data-tip="Cantidad de palabras a enviar">
                                    <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                                </div>
                            </label>

                            <label className="input input-bordered flex items-center gap-2">
                                <input type="number" className="grow" placeholder="Introduzca tiempo"/>
                                <div className="tooltip tooltip-left" data-tip="Tiempo entre envíos">
                                    <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                                </div>
                            </label>

                            <label className="input input-bordered flex items-center gap-2">
                                <input type="number" className="grow" placeholder="Introduzca tiempo"/>
                                <div className="tooltip tooltip-left"
                                     data-tip="Tiempo de espera luego de modificación en segundos">
                                    <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                                </div>
                            </label>

                            <label className="input input-bordered flex items-center gap-2">
                                <input type="number" className="grow" placeholder="Introduzca cantidad"/>
                                <div className="tooltip tooltip-left"
                                     data-tip="cantidad de palabras restantes despues de limpiado">
                                    <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                                </div>
                            </label>
                        </div>


                        <label className="items-center card-title">Atajos de teclado</label>
                        <div className="w-full border rounded-md border-gray-400 p-2">
                            <div className="flex px-1">
                                <label className="label font-bold text-sm">Ctrl + Alt + S: </label>
                                <label className="label text-sm">Enviar texto hasta posición del cursor</label>
                            </div>
                            <div className="divider"></div>
                            <div className="flex px-1">
                                <label className="label font-bold text-sm">Ctrl + Alt + L: </label>
                                <label className="label text-sm">Limpiar texto enviado</label>
                            </div>
                            <div className="divider"></div>
                            <div className="flex px-1">
                                <label className="label font-bold text-sm">Ctrl + Alt + I: </label>
                                <label className="label text-sm">Iniciar envio automatico</label>
                            </div>
                            <div className="divider"></div>
                            <div className="flex px-1">
                                <label className="label font-bold text-sm">Ctrl + Alt + D: </label>
                                <label className="label text-sm">Detener envio automatico</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="w-full border border-gray-400 m-2 rounded-md overflow-y-auto max-h-[600px] min-h-[200px] relative">
                    <div className="p-4 space-y-4">
                        <span className="bg-blue-400 text-white">{subtitlesToSend}</span>
                        <span className="">{subtitles}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
