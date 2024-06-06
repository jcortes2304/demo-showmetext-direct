'use client';

import {ArrowPathIcon, InformationCircleIcon, WifiIcon,} from "@heroicons/react/24/outline";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Client} from '@stomp/stompjs';
import {StandardResponse, Subtitle, SubtitleData, SubtitleMessage} from "@/schemas/SubtitleMessageSchema";
import {useTranslations} from 'next-intl';
import AudioPlayer from "@/components/AudioPlayer";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import Shortcuts from "@/components/Shortcuts";
import SubtitlesProcessed from "@/components/SubtitlesProcessed";
import {sendSubtitles} from "@/lib/requestSubtitle";
import useWebSocket from "@/hooks/useWebSocket";


export default function HomePage() {
    const t = useTranslations('HomePage');

    const BASE_URL = "wss://sigas.showmetext.com/backend"
    const BASE_TOPIC = "/topic/providers/RTVE/channels/Teledeporte";

    const [isPlayingSubTitle, setIsPlayingSubTitle] = useState<boolean>(false);
    const [subtitles, setSubtitles] = useState("");
    const [subtitlesToSend, setSubtitlesToSend] = useState("");
    const [amountOfWordsToSend, setAmountOfWordsToSend] = useState<number>(3);
    const [amountOfTimeBetweenSends, setAmountOfTimeBetweenSends] = useState<number>(3);
    const [waitingTimeAfterModification, setWaitingTimeAfterModification] = useState<number>(3);
    const [amountOfWordsRemainAfterCleaned, setAmountOfWordsRemainAfterCleaned] = useState<number>(3);
    const [subtitlesHaveWords, setSubtitlesHaveWords] = useState<boolean>(false);
    const [enabledMarking, setEnableMarking] = useState<boolean>(true);
    const [shouldMark, setShouldMark] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [automaticSendFlag, setAutomaticSendFlag] = useState<boolean>(true);
    const subtitlesRef = useRef<string>("")
    const subtitlesToSendRef = useRef<string>("")
    const subtitlesToSentToBackendRef = useRef<string>("")
    const subtitleSpanRef = useRef<HTMLSpanElement>(null);
    const cursorPositionRef = useRef(0);
    const clientLocalRef = useRef<Client>(new Client());
    const [subtitlesFromBackend, setSubtitlesFromBackend] = useState<SubtitleMessage>();
    const [isConnected, setIsConnected] = useState(false);

    const performAction = (key: string) => {
        console.log('Acción ejecutada por combinación de teclas Ctrl + Alt + ' + key);
    };

    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.altKey && event.ctrlKey) {
            switch (event.key.toLowerCase()) {
                case "s":
                    performAction(event.key);
                    sendSubtitlesUntilCursor();
                    break;
                case "l":
                    clearSentSubtitles();
                    performAction(event.key);
                    break;
                case "i":
                    setAutomaticSendFlag(true);
                    performAction(event.key);
                    break;
                case "d":
                    setAutomaticSendFlag(false);
                    performAction(event.key);
                    break;
                default:
                    break;
            }
        }
    };


    const handleSendSubtitles = useCallback(async (data: SubtitleData) => {
        const response: Promise<StandardResponse> = sendSubtitles(data);
        return await response;
    }, []);

    const clearSentSubtitles = () => {
        const words = subtitlesToSendRef.current.split(/\s+/).filter(word => word !== "");
        const wordToStayAfterCleaned = words.slice(words.length - amountOfWordsRemainAfterCleaned, words.length).join(" ") + " ";
        setSubtitlesToSend(wordToStayAfterCleaned);
        subtitlesToSendRef.current = wordToStayAfterCleaned;
    }

    const handleSubtitlesTextChange = (event: React.FormEvent<HTMLSpanElement>) => {
        setIsEditing(true)
        setSubtitles(event.currentTarget.textContent!);
        saveCursorPosition();
    };

    const handleEnterKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
        }
    };

    const sendSubtitlesUntilCursor = () => {
        const words = subtitlesRef.current!.split(/\s+/).filter(word => word !== "");
        const position = getCursorPositionInWords(words);
        const wordsToSend = words.slice(0, position).join(" ") + " ";
        const remainingWords = words.slice(position).join(" ");
        saveCursorPosition(wordsToSend.length);
        setSubtitles(remainingWords);
        const subtitleToSend: SubtitleData = {
            subtitle: wordsToSend
        };
        subtitlesToSentToBackendRef.current = wordsToSend
        handleSendSubtitles(subtitleToSend).then();
        setSubtitlesToSend(prev => prev + " " + wordsToSend);
        setShouldMark(true)
    }

    const getCursorPositionInWords = useCallback((words: string[]) => {
        let position = 0;
        let chars = 0;
        while (chars < cursorPositionRef.current && position < words.length) {
            chars += words[position].length + 1; // +1 for the space or newline between words
            position++;
        }
        return position;
    }, []);

    const saveCursorPosition = useCallback((amountOFCharactersToRest: number = 0) => {
        const selection = window.getSelection();
        if (selection!.rangeCount > 0) {
            const range = selection!.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(subtitleSpanRef.current!);
            preCaretRange.setEnd(range.startContainer, range.startOffset);
            if (preCaretRange.toString().length - amountOFCharactersToRest > 0) {
                cursorPositionRef.current = preCaretRange.toString().length - amountOFCharactersToRest;
            } else {
                cursorPositionRef.current = 0;
            }
        }
    }, []);

    const restoreCursorPosition = useCallback(() => {

        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(subtitleSpanRef.current!, 0);
        range.collapse(true);
        let pos = 0;

        const nodeIterator = document.createNodeIterator(subtitleSpanRef.current!, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;

        while ((node = nodeIterator.nextNode()) !== null) {
            if (node.nodeType === Node.TEXT_NODE) {
                const textNode = node as Text;
                const nextPos = pos + textNode.length;
                if (cursorPositionRef.current <= nextPos) {
                    range.setStart(textNode, cursorPositionRef.current - pos);
                    range.collapse(true);
                    break;
                }
                pos = nextPos;
            }
        }
        selection!.removeAllRanges();
        selection!.addRange(range);
    }, []);

    const handleChangeAmountOfTimeBetweenSends = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            setAmountOfTimeBetweenSends(value);
        }
    };

    const handleChangeWaitingTimeAfterModification = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            setWaitingTimeAfterModification(value);
        }
    };

    const handleChangeAmountOfWordsRemainAfterCleaned = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            setAmountOfWordsRemainAfterCleaned(value);
        }
    };

    const handleChangeAmountOfWordsToSend = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            setAmountOfWordsToSend(value);
        }
    };

    const handleOnClick = () => {
        setEnableMarking(false)
        saveCursorPosition();
    };


    useEffect(() => {
        window.addEventListener('keydown', handleKeyPress);

        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, []);

    useEffect(() => {
        if (subtitles.length !== 0) {
            setSubtitlesHaveWords(true)
        } else {
            setSubtitlesHaveWords(false)
        }
    }, [subtitles]);

    useEffect(() => {

        if (!subtitlesHaveWords || !enabledMarking) {
            return;
        }

        if (automaticSendFlag) {
            console.log("Automatic send is enabled")
            const intervalId = setInterval(() => {
                if (subtitlesRef.current) {
                    let words = subtitlesRef.current.trim().split(/\s+/);
                    let wordsToSend = words.slice(0, amountOfWordsToSend).join(" ") + " ";
                    let remainingWords = words.slice(amountOfWordsToSend).join(" ");
                    saveCursorPosition(wordsToSend.length);
                    setSubtitles(remainingWords);
                    setSubtitlesToSend(prev => prev + " " + wordsToSend);
                    subtitlesToSentToBackendRef.current = wordsToSend
                    setShouldMark(true)
                }
            }, amountOfTimeBetweenSends * 1000);

            return () => {
                clearTimeout(intervalId);
            };
        } else {
            console.log("Automatic send is disabled")
        }
    }, [automaticSendFlag, amountOfTimeBetweenSends, amountOfWordsToSend, subtitlesHaveWords, enabledMarking]);

    useEffect(() => {
        subtitlesRef.current = subtitles
        subtitlesToSendRef.current = subtitlesToSend
    }, [subtitles, subtitlesToSend]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setEnableMarking(true)
        }, 5000);

        return () => clearTimeout(timer);
    }, [enabledMarking]);

    useEffect(() => {
        const newClient = new Client({
            brokerURL: `${BASE_URL}/publisher/ws`,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        newClient.onConnect = () => {
            const newSubscription = newClient.subscribe(`${BASE_TOPIC}/subtitles/0`, (message) => {
                const subtitleMessage: SubtitleMessage = JSON.parse(message.body);
                if (subtitleMessage) {
                    if (!isEditing) {
                        const subtitlesArray = subtitleMessage.subtitles;
                        const newText = subtitlesArray.map(line => line.texts.map(text => text.characters).join(" ")).join("\n");
                        setSubtitles(prev => prev + "\n" + newText);
                    }
                }
            });
            return () => {
                newSubscription.unsubscribe();
                newClient.deactivate().then();
            };
        };


        setIsPlayingSubTitle(true)
        newClient.activate();
        return () => {
            newClient.deactivate().then();
        };
    }, []);

    // useWebSocket({
    //     url: `${BASE_URL}/publisher/ws`,
    //     topic: `${BASE_TOPIC}/subtitles/0`,
    //     callback: (subtitleMessage: SubtitleMessage) => {
    //         if (!isEditing) {
    //             const subtitlesArray = subtitleMessage.subtitles;
    //             const newText = subtitlesArray
    //                 .map(line => line.texts.map(text => text.characters).join(' '))
    //                 .join('\n');
    //             setSubtitles(prev => prev + '\n' + newText);
    //         }
    //         setIsPlayingSubTitle(true);
    //     }
    // });

    useEffect(() => {
        const subtitleBackClient = new Client({
            brokerURL: "ws://localhost:9081/ws",
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                setIsConnected(true);
                subtitleBackClient.subscribe('/topic/receiveSubtitle', (message) => {
                    const subtitleMessage: SubtitleMessage = JSON.parse(message.body);
                    if (subtitleMessage) {
                        console.log(subtitleMessage.subtitles[0].texts);
                        console.log("Received subtitles from backend: " + new Date().toLocaleTimeString());
                        setSubtitlesFromBackend(subtitleMessage);
                    }
                });
            },
            onDisconnect: () => {
                console.error("Disconnected from WebSocket");
                setIsConnected(false);
            },
            onStompError: (frame) => {
                console.error("Broker reported error: " + frame.headers['message']);
                console.error("Additional details: " + frame.body);
            }
        });

        clientLocalRef.current = subtitleBackClient;
        subtitleBackClient.activate();

        return () => {
            subtitleBackClient.deactivate().then(r => console.log("WebSocket deactivated"));
        };

    }, []);

    useEffect(() => {
        const sendSubtitles = () => {
            if (isConnected && clientLocalRef.current && subtitlesToSentToBackendRef.current) {
                try {
                    clientLocalRef.current.publish({
                        destination: '/app/sendSubtitles',
                        body: subtitlesToSentToBackendRef.current,
                    });
                } catch (error) {
                    console.error("Error sending subtitles:");
                }
            }
        };

        sendSubtitles();

    }, [subtitlesToSend, isConnected]);

    useEffect(() => {
        restoreCursorPosition();
    }, [subtitles]);


    return (
        <div className="p-2">
            <ThemeSwitcher/>
            <div className="mx-auto p-4 flex flex-col md:flex-row">
                <div className="w-full md:max-w-md border rounded-md border-gray-400 m-2 overflow-y-auto">
                    <div className="p-4 space-y-5">
                        <label className="flex items-center card-title">{t('serverConnection')}</label>
                        <div>
                            <label className="flex items-center label">{t('emissionSubtitles')}</label>
                            <label className="flex items-center gap-2">
                                {isPlayingSubTitle ?
                                    <WifiIcon className="size-5 text-green-500"/>
                                    :
                                    <WifiIcon className="size-5 text-red-500"/>
                                }
                                {t('connected')}
                                <ArrowPathIcon className="size-5 text-blue-500 cursor-pointer" title={t('reconnect')}/>
                            </label>
                        </div>
                        <AudioPlayer/>
                        <label className="items-center card-title">{t('parameters')}</label>
                        <div className="form-control gap-5">
                            <label>{t('amountWordsToSend')}</label>
                            <label className="input input-bordered flex items-center gap-2">
                                <input type="number" className="grow" placeholder={t('enterAmount')}
                                       onChange={handleChangeAmountOfWordsToSend}
                                       min={0}
                                       value={amountOfWordsToSend}/>
                                <div className="tooltip tooltip-left" data-tip={t('amountWordsToSend')}>
                                    <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                                </div>
                            </label>

                            <label>{t('timeBetweenSends')}</label>
                            <label className="input input-bordered flex items-center gap-2">
                                <input type="number" className="grow" placeholder={t('enterTime')}
                                       onChange={handleChangeAmountOfTimeBetweenSends}
                                       min={0}
                                       value={amountOfTimeBetweenSends}/>
                                <div className="tooltip tooltip-left" data-tip={t('timeBetweenSends')}>
                                    <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                                </div>
                            </label>

                            <label>{t('waitingTimeAfterModification')}</label>
                            <label className="input input-bordered flex items-center gap-2">
                                <input type="number" className="grow" placeholder={t('enterTime')}
                                       onChange={handleChangeWaitingTimeAfterModification}
                                       min={0}
                                       value={waitingTimeAfterModification}/>
                                <div className="tooltip tooltip-left"
                                     data-tip={t('waitingTimeAfterModification')}>
                                    <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                                </div>
                            </label>

                            <label>{t('remainingWordsAfterCleaned')}</label>
                            <label className="input input-bordered flex items-center gap-2">
                                <input type="number" className="grow" placeholder={t('enterAmount')}
                                       onChange={handleChangeAmountOfWordsRemainAfterCleaned}
                                       min={0}
                                       value={amountOfWordsRemainAfterCleaned}/>
                                <div className="tooltip tooltip-left"
                                     data-tip={t('remainingWordsAfterCleaned')}>
                                    <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                                </div>
                            </label>
                        </div>
                        <label className="items-center card-title">{t('keyboardShortcuts')}</label>
                        <Shortcuts/>
                    </div>
                </div>
                <div className={"block w-full h-full"}>
                    <div
                        className="border w-full border-gray-400 m-2 rounded-md overflow-y-auto max-h-[600px] min-h-[400px] relative">
                        <div className="p-4 space-y-4">
                        <span contentEditable={false}
                              className={`py-1 my-1${shouldMark && 'border border-gray-400 bg-blue-400'} text-white`}>
                            {subtitlesToSend}
                        </span>
                            <span
                                ref={subtitleSpanRef}
                                contentEditable
                                suppressContentEditableWarning={true}
                                onInput={handleSubtitlesTextChange}
                                onClick={handleOnClick}
                                onBlur={() => saveCursorPosition}
                                onFocus={restoreCursorPosition}
                                onKeyDown={handleEnterKeyDown}
                                className={`py-1 my-1 outline-none`}>
                            {subtitles}
                        </span>
                        </div>
                    </div>
                    <div
                        className="border w-full border-gray-400 m-2 rounded-md overflow-y-auto max-h-[600px] min-h-[400px] relative">
                        <div className="p-4 space-y-4 text-center">
                            <div className="relative h-full">
                                {
                                    subtitlesFromBackend &&
                                    subtitlesFromBackend.subtitles.map((subtitle: Subtitle, index) => (
                                        <SubtitlesProcessed
                                            key={index}
                                            subtitle={subtitle}
                                            timeout={subtitlesFromBackend.timeout}
                                        />
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
