"use client"
import {
    ArrowPathIcon,
    InformationCircleIcon,
    WifiIcon,
} from "@heroicons/react/24/outline";
import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
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
    const [subtitlesHaveWords, setSubtitlesHaveWords] = useState<boolean>(false);
    const [shouldMark, setShouldMark] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [cursorWasClicked, setCursorWasClicked] = useState<boolean>(false);
    const [editPause, setEditPause] = useState(false);
    const [cursorPosition, setCursorPosition] = useState<number>(0);

    const [subtitles, setSubtitles] = useState("");
    const [subtitlesToSend, setSubtitlesToSend] = useState("");
    const subtitlesRef = useRef<string>("")
    const subtitlesToSendRef = useRef<string>("")

    const [amountOfWordsToSend, setAmountOfWordsToSend] = useState<number>(3);
    const [amountOfTimeBetweenSends, setAmountOfTimeBetweenSends] = useState<number>(3);
    const [waitingTimeAfterModification, setWaitingTimeAfterModification] = useState<number>(3);
    const [amountOfWordsRemainAfterCleaned, setAmountOfWordsRemainAfterCleaned] = useState<number>(3);


    const subtitleSpanRef = useRef<HTMLSpanElement>(null);
    const cursorPositionRef = useRef(0);
    const stompClientRef = useRef<Client | null>(null);
        // const editableRef = useRef(null);
        //
        // const getTextPrecedingCaret = (editable) => {
        //     var precedingChar = "", sel, range, precedingRange;
        //     if (window.getSelection) {
        //         sel = window.getSelection();
        //         if (sel.rangeCount > 0) {
        //             range = sel.getRangeAt(0).cloneRange();
        //             range.collapse(true);
        //             range.setStart(editable, 0);
        //             precedingChar = range.toString().split(/\s+/).slice(0, range.toString().split(/\s+/).length-1).join(' ');
        //         }
        //     } else if ( (sel = document.selection) && sel.type != "Control") {
        //         range = sel.createRange();
        //         precedingRange = range.duplicate();
        //         precedingRange.moveToElementText(editable);
        //         precedingRange.setEndPoint("StartToEnd", range);
        //         precedingChar = range.toString().split(/\s+/).slice(0, range.toString().split(/\s+/).length-1).join(' ');
        //     }
        //     return precedingChar;
        // };


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
        saveCursorPosition();
        setSubtitles(event.currentTarget.textContent || "");
    };


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

    const handleFocus = () => {
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        setTimeout(() => setEditPause(false), 3000);  // Resume updates 3 seconds after editing
    };

    const handleClick = () => {
        setEditPause(true);
        setCursorWasClicked(true)
    };

    // function getTextPrecedingCaret(editable) {
    //     var precedingChar = "", sel, range, precedingRange;
    //     if (window.getSelection) {
    //         sel = window.getSelection();
    //         if (sel.rangeCount > 0) {
    //             range = sel.getRangeAt(0).cloneRange();
    //             range.collapse(true);
    //             range.setStart(editable, 0);
    //             //Por arreglar
    //             precedingChar = range.toString().split(/\s+/).slice(0, range.toString().split(/\s+/).length-1).join(' ');
    //         }
    //     } else if ( (sel = document.selection) && sel.type != "Control") {
    //         range = sel.createRange();
    //         precedingRange = range.duplicate();
    //         precedingRange.moveToElementText(editable);
    //         precedingRange.setEndPoint("StartToEnd", range);
    //         //Por arreglar
    //         precedingChar = range.toString().split(/\s+/).slice(0, range.toString().split(/\s+/).length-1).join(' ');
    //     }
    //     return precedingChar;
    // }

    const saveCursorPosition = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && subtitleSpanRef.current) {
            const range = selection.getRangeAt(0);
            const startContainer = range.startContainer;
            let charCount = 0;
            const nodeStack = [subtitleSpanRef.current];
            let node;
            while ((node = nodeStack.pop())) {
                if (node === startContainer) {
                    charCount += range.startOffset;
                    break;
                } else if (node.nodeType === Node.TEXT_NODE) {
                    charCount += node.nodeValue!.length;
                } else {
                    let i = node.childNodes.length;
                    while (i--) {
                        // @ts-ignore
                        nodeStack.push(node.childNodes[i]);
                    }
                }
            }
            cursorPositionRef.current = charCount;
        }
    };

    const restoreCursorPosition = () => {
        let position = cursorPositionRef.current;
        const selection = window.getSelection();
        if (selection && subtitleSpanRef.current) {
            const range = document.createRange();
            range.setStart(subtitleSpanRef.current, 0);
            range.collapse(true);
            const nodeStack = [subtitleSpanRef.current];
            let node, foundStart = false, charCount = 0;
            while (!foundStart && (node = nodeStack.pop())) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const nextCharCount = charCount + node.nodeValue!.length;
                    if (position >= charCount && position <= nextCharCount) {
                        range.setStart(node, position - charCount);
                        range.collapse(true);
                        foundStart = true;
                    }
                    charCount = nextCharCount;
                } else {
                    let i = node.childNodes.length;
                    while (i--) {
                        // @ts-ignore
                        nodeStack.push(node.childNodes[i]);
                    }
                }
            }
            selection.removeAllRanges();
            selection.addRange(range);
        }
    };


    useEffect(() => {
        const editableSpan = subtitleSpanRef.current;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault();
            }else if(event.key === 'Backspace' || event.key.length === 1) {
                saveCursorPosition();
            } else if (event.key === 's' || event.key === 'l' || event.key === 'i' || event.key === 'd') {
                handleKeyPress(event);
            }
        };

        editableSpan!.addEventListener('keydown', handleKeyDown);

        return () => {
            editableSpan!.removeEventListener('keydown', handleKeyDown);
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
                if (!isEditing && subtitlesHaveWords) {
                    let words = subtitlesRef.current.trim().split(/\s+/);
                    let wordsToSend = words.slice(0, amountOfWordsToSend).join(" ") + " ";
                    let remainingWords = words.slice(amountOfWordsToSend).join(" ");
                    setSubtitles(remainingWords);
                    setSubtitlesToSend(prev => prev + " " + wordsToSend);
                    setShouldMark(true)
                    restoreCursorPosition();
                }else {
                    setShouldMark(false)
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
        if (cursorWasClicked) {
            const intervalId = setInterval(() => {
                setCursorWasClicked(false)
                clearTimeout(intervalId);
            }, 3000);
        }
    }, [cursorWasClicked]);

    // useLayoutEffect(() => {
    //     if (subtitleSpanRef.current && isEditing) {
    //         const range = document.createRange();
    //         const selection = window.getSelection();
    //         const nodeIterator = document.createNodeIterator(subtitleSpanRef.current, NodeFilter.SHOW_TEXT);
    //         let currentNode;
    //         const textNodes = [];
    //
    //         while (currentNode = nodeIterator.nextNode()) {
    //             textNodes.push(currentNode);
    //         }
    //
    //         let pos = 0;
    //         for (let node of textNodes) {
    //             const nextPos = pos + node.textContent!.length;
    //             if (cursorPosition > nextPos) {
    //                 range.setStart(node, cursorPosition);
    //             }
    //             range.collapse(true);
    //             selection!.removeAllRanges();
    //             selection!.addRange(range);
    //             break;
    //         }
    //     }
    // }, [subtitles]);

    useEffect(() => {
        stompClientRef.current = new Client({
            brokerURL: `${BASE_URL}/publisher/ws`,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                setIsPlayingSubTitle(true);
                stompClientRef.current!.subscribe(`${BASE_TOPIC}/subtitles/0`, (message) => {
                    const subtitleMessage: SubtitleMessage = JSON.parse(message.body);
                    if (!isEditing || !editPause) {
                        const newText = subtitleMessage.subtitles.map(line => line.texts.map(text => text.characters).join(" ")).join("\n");
                        setSubtitles(prev => `${prev}\n${newText}`);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
        });

        stompClientRef.current.activate();

        return () => {
            stompClientRef.current!.deactivate().then();
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
                        <AudioPlayer/>
                        <label className="items-center card-title">Parámetros</label>
                        <div className="form-control gap-5">
                            <label>{"Cantidad de palabras a enviar"}</label>
                            <label className="input input-bordered flex items-center gap-2">
                                <input type="number" className="grow" placeholder="Introduzca cantidad"
                                       onChange={handleChangeAmountOfWordsToSend}
                                       min={0}
                                       value={amountOfWordsToSend}/>
                                <div className="tooltip tooltip-left" data-tip="Cantidad de palabras a enviar">
                                    <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                                </div>
                            </label>

                            <label>{"Tiempo entre envíos"}</label>
                            <label className="input input-bordered flex items-center gap-2">
                                <input type="number" className="grow" placeholder="Introduzca tiempo"
                                       onChange={handleChangeAmountOfTimeBetweenSends}
                                       min={0}
                                       value={amountOfTimeBetweenSends}/>
                                <div className="tooltip tooltip-left" data-tip="Tiempo entre envíos">
                                    <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                                </div>
                            </label>

                            <label>{"Tiempo de espera luego de modificación en segundos"}</label>
                            <label className="input input-bordered flex items-center gap-2">
                                <input type="number" className="grow" placeholder="Introduzca tiempo"
                                       onChange={handleChangeWaitingTimeAfterModification}
                                       min={0}
                                       value={waitingTimeAfterModification}/>
                                <div className="tooltip tooltip-left"
                                     data-tip="Tiempo de espera luego de modificación en segundos">
                                    <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                                </div>
                            </label>

                            <label>{"Cantidad de palabras restantes despues de limpiado"}</label>
                            <label className="input input-bordered flex items-center gap-2">
                                <input type="number" className="grow" placeholder="Introduzca cantidad"
                                       onChange={handleChangeAmountOfWordsRemainAfterCleaned}
                                       min={0}
                                       value={amountOfWordsRemainAfterCleaned}/>
                                <div className="tooltip tooltip-left"
                                     data-tip="Cantidad de palabras restantes despues de limpiado">
                                    <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                                </div>
                            </label>
                        </div>
                        <label className="items-center card-title">Atajos de teclado</label>
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
                            onClick={handleClick}
                            onBlur={handleBlur}
                            onFocus={handleFocus}
                            onInput={handleSubtitlesTextChange}
                            className={`py-1 my-1 outline-none`}>
                            {subtitles}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
