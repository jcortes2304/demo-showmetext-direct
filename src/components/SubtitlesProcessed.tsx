import React, { useCallback, useEffect, useRef, useState } from "react";
import { LineAttribute, Subtitle, SubtitleMessage, TextAttributes } from "@/schemas/SubtitleMessageSchema";
import { Client } from "@stomp/stompjs";
import useAppStore from "@/store/store";
import CountDown from "@/components/CountDown";
import {
    ArrowDownCircleIcon,
    PaperAirplaneIcon,
    PlayCircleIcon, StopCircleIcon
} from "@heroicons/react/24/outline";
import {useTranslations} from "next-intl";
import {SpanType} from "@/schemas/UtilsSchemas";


export default function SubtitlesProcessed() {

    const { waitingTimeInScreenAfterSend, setActiveSpan, activeSpan } = useAppStore(
        (state) => state
    );

    const processedTextSubtitleRef = useRef<HTMLSpanElement>(null);
    const [processedCursorPosition, setProcessedCursorPosition] = useState<number>(0);
    const [subtitleMessage, setSubtitleMessage] = useState<SubtitleMessage | null>(null);
    const clientProcessedRef = useRef<Client | null>(null);
    const [subtitlesMessagesQueue, setSubtitlesMessagesQueue] = useState<SubtitleMessage[]>([]);
    const subtitlesMessagesQueueRef = useRef<SubtitleMessage[]>(subtitlesMessagesQueue);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [showCountDown, setShowCountDown] = useState<boolean>(false);
    const [timeForCountDown, setTimeForCountDown] = useState<number>(waitingTimeInScreenAfterSend);
    const [automaticSendFlag, setAutomaticSendFlag] = useState<boolean>(true);
    const [editedSubtitle, setEditedSubtitle] = useState<Subtitle | null>(null);


    const t = useTranslations('HomePage.SubtitlesProcessed');


    const handleEnterKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
        }
    };

    const handleTimeout = () => {
        if (automaticSendFlag && clientProcessedRef.current && subtitlesMessagesQueueRef.current.length > 0) {
            const subtitle = editedSubtitle || subtitlesMessagesQueueRef.current[0].subtitles[0];
            console.log("Sending subtitles:", new Date().toLocaleTimeString(), subtitle);
            clientProcessedRef.current?.publish({
                destination: "/app/sendSubtitlesResults",
                body: JSON.stringify([subtitle]),
            });
            setSubtitlesMessagesQueue((prevQueue) => {
                const updatedQueue = [...prevQueue];
                updatedQueue.shift();
                return updatedQueue;
            });
            setCurrentIndex(0);
            setTimeForCountDown(waitingTimeInScreenAfterSend);
            setEditedSubtitle(null);
        }
    };

    // const handleNextSubtitle = () => {
    //     if (currentIndex < subtitlesMessagesQueue.length - 1) {
    //         const nextIndex = currentIndex + 1;
    //         setCurrentIndex(nextIndex);
    //         setSubtitleMessage(subtitlesMessagesQueue[nextIndex]);
    //     }
    // };

    // const handlePreviewSubtitle = () => {
    //     if (currentIndex > 0) {
    //         const prevIndex = currentIndex - 1;
    //         setCurrentIndex(prevIndex);
    //         setSubtitleMessage(subtitlesMessagesQueue[prevIndex]);
    //     }
    // };

    const handleSendUpToCurrent = () => {
        for (let i = 0; i <= currentIndex; i++) {
            const subtitle = editedSubtitle || subtitlesMessagesQueue[i].subtitles[0];
            if (subtitle) {
                clientProcessedRef.current?.publish({
                    destination: "/app/sendSubtitlesResults",
                    body: JSON.stringify([subtitle]),
                });
            }
        }
        setSubtitlesMessagesQueue((prevQueue) => {
            const updatedQueue = [...prevQueue];
            updatedQueue.splice(0, currentIndex + 1);
            return updatedQueue;
        });
        setCurrentIndex(0);
        setEditedSubtitle(null);
    };

    const handleStopAutomaticSend = () => {
        setAutomaticSendFlag(!automaticSendFlag);
    }

    const handleOnClick = () => {
        setActiveSpan(SpanType.PROCESSED_SPAN)
        saveProcessedCursorPosition();
    };

    const handleSendAllSubtitles = () => {
        subtitlesMessagesQueue.forEach((subtitle, index) => {
            const subtitleToSend = editedSubtitle && index === currentIndex ? editedSubtitle : subtitle.subtitles[0];
            clientProcessedRef.current?.publish({
                destination: "/app/sendSubtitlesResults",
                body: JSON.stringify([subtitleToSend]),
            });
        });
        setSubtitlesMessagesQueue([]);
        setCurrentIndex(0);
        setEditedSubtitle(null);
    };

    const saveProcessedCursorPosition = useCallback(() => {
        if (activeSpan === SpanType.PROCESSED_SPAN) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0 && processedTextSubtitleRef.current) {
                const range = selection.getRangeAt(0);
                const preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(processedTextSubtitleRef.current);
                preCaretRange.setEnd(range.startContainer, range.startOffset);
                setProcessedCursorPosition(preCaretRange.toString().length);
            }
        }
    }, []);

    const restoreProcessedCursorPosition = useCallback(() => {
        if (activeSpan === SpanType.PROCESSED_SPAN) {
            const selection = window.getSelection();
            const range = document.createRange();
            if (processedTextSubtitleRef.current) {
                range.setStart(processedTextSubtitleRef.current, 0);
                range.collapse(true);

                const nodeIterator = document.createNodeIterator(
                    processedTextSubtitleRef.current,
                    NodeFilter.SHOW_TEXT,
                    null
                );
                let node;
                let pos = 0;
                while ((node = nodeIterator.nextNode()) !== null) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const textNode = node as Text;
                        const nextPos = pos + textNode.length;
                        if (pos <= nextPos) {
                            range.setStart(textNode, 0);
                            range.collapse(true);
                            break;
                        }
                        pos = nextPos;
                    }
                }
                selection?.removeAllRanges();
                selection?.addRange(range);
            }
        }
    }, [processedCursorPosition]);

    const handleLineAttributes = (lineAttributes: LineAttribute) => ({
        textAlign: lineAttributes.alignment,
        left: `${lineAttributes.horizontalPosition}%`,
        top: `${lineAttributes.verticalPosition}%`,
    });

    const handleTextAttribute = (textAttributes: TextAttributes) => ({
        fontFamily: textAttributes.fontName,
        fontSize: textAttributes.textSize,
        color: textAttributes.textColor,
        fontStyle: textAttributes.italic ? "italic" : "normal",
        fontWeight: textAttributes.bold ? "bold" : "normal",
        textDecoration: textAttributes.underlined ? "underline" : "none",
        outlineColor: textAttributes.outlineColor,
        backgroundColor: textAttributes.backgroundColor,
        outlineWidth: textAttributes.outlineSize,
    });

    const handleSubtitlesTextChange = (event: React.FormEvent<HTMLSpanElement>) => {
        const editedText = event.currentTarget.textContent;
        setEditedSubtitle({
            ...subtitleMessage!.subtitles[0],
            texts: [
                {
                    ...subtitleMessage!.subtitles[0].texts[0],
                    characters: editedText!,
                },
            ],
        });
        saveProcessedCursorPosition();
    };

    useEffect(() => {
        subtitlesMessagesQueueRef.current = subtitlesMessagesQueue;
        setSubtitleMessage(subtitlesMessagesQueueRef.current[currentIndex]);
    }, [subtitlesMessagesQueue, currentIndex]);

    useEffect(() => {
        const client = new Client({
            brokerURL: "ws://localhost:9081/ws",
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                client.subscribe("/topic/receiveSubtitle", (message) => {
                    const subtitleMessage: SubtitleMessage = JSON.parse(message.body);
                    // console.log("Received subtitles:", new Date().toLocaleTimeString(), subtitleMessage);

                    setSubtitlesMessagesQueue((prevState) => [...prevState, subtitleMessage]);

                    if (subtitlesMessagesQueueRef.current.length === 1) {
                        setSubtitleMessage(subtitlesMessagesQueueRef.current[0]);
                    }
                    setShowCountDown(true);
                    setTimeForCountDown(waitingTimeInScreenAfterSend);
                });
            },
            onDisconnect: () => {
                console.error("Disconnected from WebSocket");
            },
            onStompError: (frame) => {
                console.error("Broker reported error: " + frame.headers["message"]);
                console.error("Additional details: " + frame.body);
            },
        });

        client.activate();
        clientProcessedRef.current = client;

        return () => {
            client.deactivate().then();
        };
    }, [waitingTimeInScreenAfterSend]);

    return (
        <div>
            <div
                className="flex border w-full justify-center items-center border-gray-400 m-2 rounded-md overflow-y-auto max-h-[600px] min-h-[400px] relative">
                <div className="p-4 space-y-4 text-center">
                    <div className="relative h-full justify-center items-center">
                        {subtitleMessage?.subtitles.map((subtitle, index) => (
                            <div key={index} style={handleLineAttributes(subtitle.lineAttributes!)}>
                        <span
                            ref={processedTextSubtitleRef}
                            contentEditable
                            onInput={handleSubtitlesTextChange}
                            onClick={handleOnClick}
                            onBlur={saveProcessedCursorPosition}
                            onFocus={restoreProcessedCursorPosition}
                            onKeyDown={handleEnterKeyDown}
                            suppressContentEditableWarning={true}
                            className="py-1 my-1 outline-none"
                            style={handleTextAttribute(subtitle.texts[0].attributes)}
                        >
                            {subtitle.texts[0].characters}
                        </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-center items-center mt-4">
                <div className="flex justify-center items-center space-x-2">
                    <div className={"block justify-center text-center my-1"}>

                        <span className={"mb-4 text-center justify-center"}>Subtítulos en cola</span>

                        <div className="flex mt-4">

                            <ul className="flex space-x-2">
                                {subtitlesMessagesQueue.slice(0, 10).map((_, index) => (
                                    <li
                                        key={index}
                                        className={`px-2 py-1 rounded-md ${
                                            index === currentIndex ? "bg-blue-500 text-white" : "bg-gray-200"
                                        }`}
                                    >
                                        {index + 1}
                                    </li>
                                ))}
                                {subtitlesMessagesQueue.length > 10 && (
                                    <li className="px-2 py-1 bg-gray-200 rounded-md">
                                        ...{subtitlesMessagesQueue.length}
                                    </li>
                                )}
                            </ul>

                            <div className="ml-4">
                                {subtitlesMessagesQueue.length > 0 && (
                                    <CountDown
                                        timeout={timeForCountDown}
                                        pause={!automaticSendFlag}
                                        onTimeout={handleTimeout}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-center space-x-2 mt-4">
                {/*<div className="tooltip" data-tip={"Atrás"}>*/}
                {/*    <button*/}
                {/*        className={`px-4 py-2 text-white rounded-md ${currentIndex === 0 ? 'bg-gray-500' : 'bg-blue-500'}`}*/}
                {/*        onClick={handlePreviewSubtitle}*/}
                {/*        disabled={currentIndex === 0}*/}
                {/*    >*/}
                {/*        <ChevronLeftIcon className="size-5"/>*/}
                {/*    </button>*/}
                {/*</div>*/}
                {/*<div className="tooltip" data-tip={"Siguiente"}>*/}
                {/*    <button*/}
                {/*        className={`px-4 py-2 text-white rounded-md ${currentIndex === subtitlesMessagesQueue.length - 1 || subtitlesMessagesQueue.length <= 1 ? 'bg-gray-500' : ' bg-blue-500'}`}*/}
                {/*        onClick={handleNextSubtitle}*/}
                {/*        disabled={currentIndex === subtitlesMessagesQueue.length - 1 || subtitlesMessagesQueue.length <= 1}*/}
                {/*    >*/}
                {/*        <ChevronRightIcon className="size-5"/>*/}
                {/*    </button>*/}
                {/*</div>*/}
                <div className="tooltip" data-tip={"Enviar hasta actual"}>
                    <button
                        className={`px-4 py-2 text-white rounded-md ${subtitlesMessagesQueue.length === 0 ? 'bg-gray-500' : 'bg-blue-500'}`}
                        onClick={handleSendUpToCurrent}
                        disabled={subtitlesMessagesQueue.length === 0}
                    >
                        <ArrowDownCircleIcon className="size-5"/>
                    </button>
                </div>
                <div className="tooltip" data-tip={"Enviar todo"}>
                    <button
                        className={`px-4 py-2 text-white rounded-md ${subtitlesMessagesQueue.length === 0 ? 'bg-gray-500' : 'bg-green-500'}`}
                        disabled={subtitlesMessagesQueue.length === 0}
                        onClick={handleSendAllSubtitles}
                    >
                        <PaperAirplaneIcon className="size-5"/>
                    </button>
                </div>
                <div className="tooltip"
                     data-tip={automaticSendFlag ? "Pausar envío automático" : "Iniciar envío automático"}>
                    <button
                        className={`px-4 py-2 text-white rounded-md ${automaticSendFlag ? 'bg-red-500' : 'bg-green-500'}`}
                        onClick={handleStopAutomaticSend}
                    >
                        {automaticSendFlag ? <StopCircleIcon className="size-5"/> :
                            <PlayCircleIcon className="size-5"/>}
                    </button>
                </div>
            </div>
        </div>
    );
}