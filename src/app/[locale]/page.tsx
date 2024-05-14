"use client"
import {
    ArrowPathIcon,
    InformationCircleIcon,
    WifiIcon,
} from "@heroicons/react/24/outline";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Client} from '@stomp/stompjs';
import {SubtitleMessage} from "@/schemas/SubtitleMessageSchema";
import {useTranslations} from 'next-intl';
import AudioPlayer from "@/components/AudioPlayer";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import Shortcuts from "@/components/Shortcuts";

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
    const subtitlesRef = useRef<string>("")
    const subtitlesToSendRef = useRef<string>("")
    const subtitleSpanRef = useRef<HTMLSpanElement>(null);
    const cursorPositionRef = useRef(0);


    const performAction = (key: string) => {
        console.log('Acción ejecutada por combinación de teclas Ctrl + Alt + ' + key);
    };

    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.altKey && event.ctrlKey) {
            switch (event.key.toLowerCase()) {
                case "s":
                    performAction(event.key);
                    break;
                case "l":
                    performAction(event.key);
                    break;
                case "i":
                    performAction(event.key);
                    break;
                case "d":
                    performAction(event.key);
                    break;
                default:
                    break;
            }
        }
    };

    const handleSubtitlesTextChange = (event: React.FormEvent<HTMLSpanElement>) => {
        setIsEditing(true)
        setEnableMarking(false)
        setSubtitles(event.currentTarget.textContent!);
        saveCursorPosition();
    };

    const handleEnterKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
        }
    };

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
            setEnableMarking(false)
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

    // const cursorPosition = useMemo(() => {
    //     const selection = window.getSelection();
    //     let position = 0;
    //     if (selection!.rangeCount > 0) {
    //         const range = selection!.getRangeAt(0);
    //         const preCaretRange = range.cloneRange();
    //         preCaretRange.selectNodeContents(subtitleSpanRef.current!);
    //         preCaretRange.setEnd(range.startContainer, range.startOffset);
    //         position = preCaretRange.toString().length;
    //     }
    //     return position;
    // }, [subtitleSpanRef.current]);

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
        const intervalId = setInterval(() => {
            if (subtitlesRef.current) {
                if (!isEditing && subtitlesHaveWords && enabledMarking) {
                    let words = subtitlesRef.current.trim().split(/\s+/);
                    let wordsToSend = words.slice(0, amountOfWordsToSend).join(" ") + " ";
                    saveCursorPosition(wordsToSend.length);
                    let remainingWords = words.slice(amountOfWordsToSend).join(" ");
                    setSubtitles(remainingWords);
                    setSubtitlesToSend(prev => prev + " " + wordsToSend);
                    setShouldMark(true)
                }
            }
        }, amountOfTimeBetweenSends * 1000);

        return () => {
            clearTimeout(intervalId);
        };
    }, [amountOfTimeBetweenSends, amountOfWordsToSend, subtitlesHaveWords]);

    useEffect(() => {
        subtitlesRef.current = subtitles
        subtitlesToSendRef.current = subtitlesToSend
    }, [subtitles, subtitlesToSend]);


    useEffect(() => {
        const timer = setTimeout(() => {
            setEnableMarking(true)
            setIsEditing(!isEditing)
        }, 3000);

        return () => clearTimeout(timer);
    }, [isEditing, enabledMarking]);

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

                <div
                    className="w-full border border-gray-400 m-2 rounded-md overflow-y-auto max-h-[600px] min-h-[200px] relative">
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
                            onClick={() => saveCursorPosition}
                            onBlur={() => saveCursorPosition}
                            onFocus={restoreCursorPosition}
                            onKeyDown={handleEnterKeyDown}
                            className={`py-1 my-1 outline-none`}>
                            {subtitles}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
