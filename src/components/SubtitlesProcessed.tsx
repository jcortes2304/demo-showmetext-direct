import React, {useCallback, useEffect, useRef, useState} from "react";
import {LineAttribute, Subtitle, SubtitleMessage, TextAttributes} from "@/schemas/SubtitleMessageSchema";
import {Client} from "@stomp/stompjs";
import useAppStore from "@/store/store";
import {SpanType} from "@/schemas/UtilsSchemas";
import parseDuration from "@/app/utils/utils";


export default function SubtitlesProcessed() {

    const textSubtitleRef = useRef<HTMLSpanElement>(null);
    const [subtitlesFromBackend, setSubtitlesFromBackend] = useState<SubtitleMessage>();
    const cursorPositionRef1 = useRef(0);
    const subtitlesResultToSendToBackend = useRef<SubtitleMessage>({
        subtitles: [],
        timeout: "PT4S",
        type: "TEXT_GROUP_SUBTITLE"
    });
    const [sendFlag, setSendFlag] = useState<boolean>(false);
    const clientProcessedRef = useRef<Client | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [listOfTexts, setListOfTexts] = useState<string[]>([]);
    const {
        activeSpan,
        setActiveSpan
    } = useAppStore(state => ({
        activeSpan: state.activeSpan,
        setActiveSpan: state.setActiveSpan
    }));

    const handleEnterKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
        }
    };

    const saveCursorPosition = useCallback(() => {
        const selection = window.getSelection();
        if (selection!.rangeCount > 0 && textSubtitleRef.current) {
            const range = selection!.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(textSubtitleRef.current!);
            preCaretRange.setEnd(range.startContainer, range.startOffset);
            if (preCaretRange.toString().length > 0) {
                cursorPositionRef1.current = preCaretRange.toString().length;
            } else {
                cursorPositionRef1.current = 0;
            }
        }
    }, []);

    const restoreCursorPosition = useCallback(() => {

        const selection = window.getSelection();
        const range = document.createRange();
        if (textSubtitleRef.current) {
            range.setStart(textSubtitleRef.current!, 0);
            range.collapse(true);
            let pos = 0;

            const nodeIterator = document.createNodeIterator(textSubtitleRef.current!, NodeFilter.SHOW_TEXT, null);
            let node: Node | null;

            while ((node = nodeIterator.nextNode()) !== null) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const textNode = node as Text;
                    const nextPos = pos + textNode.length;
                    if (cursorPositionRef1.current <= nextPos) {
                        range.setStart(textNode, cursorPositionRef1.current - pos);
                        range.collapse(true);
                        break;
                    }
                    pos = nextPos;
                }
            }
            selection!.removeAllRanges();
            selection!.addRange(range);
        }

    }, []);

    const handleLineAttributes = (lineAttribute: LineAttribute) => {
        return {
            textAlign: lineAttribute.alignment,
            left: `${lineAttribute.horizontalPosition}%`,
            top: `${lineAttribute.verticalPosition}%`,
            doubleHeight: lineAttribute.doubleHeight
        };
    }

    const handleTextAttribute = (textAttributes: TextAttributes) => {
        return {
            fontFamily: textAttributes.fontName,
            fontSize: textAttributes.textSize,
            color: textAttributes.textColor,
            fontStyle: textAttributes.italic ? 'italic' : 'normal',
            fontWeight: textAttributes.bold ? 'bold' : 'normal',
            textDecoration: textAttributes.underlined ? 'underline' : 'none',
            outlineColor: textAttributes.outlineColor,
            backgroundColor: textAttributes.backgroundColor,
            outlineWidth: textAttributes.outlineSize
        };
    }

    const handleSubtitlesTextChange = (event: React.FormEvent<HTMLSpanElement>) => {
        const target = event.target as HTMLSpanElement;
        const index = parseInt(target.id.split("_")[1]);
        const textContent = target.textContent;
        listOfTexts[index] = textContent!;
        setListOfTexts(listOfTexts);
        saveCursorPosition();
    };

    const handleOnClick = () => {
        setActiveSpan(SpanType.PROCESSED_SPAN);
        saveCursorPosition();
    };


    useEffect(() => {
        const client = new Client({
            brokerURL: "ws://localhost:9081/ws",
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                const subscription = client.subscribe('/topic/receiveSubtitle', (message) => {
                    setIsConnected(true);
                    const subtitleMessage: SubtitleMessage = JSON.parse(message.body);
                    console.log("Received subtitle message: ", subtitleMessage.subtitles)
                    if (subtitleMessage) {
                        setSendFlag(true);
                        setSubtitlesFromBackend(subtitleMessage);
                        let listOfTexts: string[] = [];
                        for (let i = 0; i < subtitleMessage.subtitles.length; i++) {
                            listOfTexts.push(subtitleMessage.subtitles[i].texts[0].characters);
                        }
                        setListOfTexts(listOfTexts);
                    }
                });

                return () => {
                    subscription.unsubscribe();
                    client.deactivate().then();
                };
            },
            onDisconnect: () => {
                setIsConnected(false);
                console.error("Disconnected from WebSocket");
            },
            onStompError: (frame) => {
                setIsConnected(false);
                console.error("Broker reported error: " + frame.headers['message']);
                console.error("Additional details: " + frame.body);
            }
        });

        client.activate();
        clientProcessedRef.current = client;

        return () => {
            client.deactivate().then(r => console.log("WebSocket deactivated"));
        };

    }, []);

    useEffect(() => {
        const sendSubtitles = () => {
            if (isConnected && clientProcessedRef.current) {
                try {
                    clientProcessedRef.current.publish({
                        destination: '/app/sendSubtitlesResults',
                        body: JSON.stringify(listOfTexts),
                    });
                } catch (error) {
                    console.error("Error sending subtitles:");
                }
            }
        };

        const timer = setTimeout(() => {
            sendSubtitles();
        }, parseDuration(subtitlesFromBackend?.timeout || 'PT4S'));

        return () => {
            clearTimeout(timer);
        }

    }, [isConnected, listOfTexts]);


    return (
        <div>
            <div
                className="border w-full border-gray-400 m-2 rounded-md overflow-y-auto max-h-[600px] min-h-[400px] relative">
                <div className="p-4 space-y-4 text-center">
                    <div className="relative h-full">
                        {
                            subtitlesFromBackend?.subtitles && subtitlesFromBackend.subtitles.length > 0 &&
                            (
                                listOfTexts.map((text: string, index: number) => {
                                    return (
                                        <div
                                            style={handleLineAttributes(subtitlesFromBackend?.subtitles[0].lineAttributes!)}
                                            key={index}>
                            <span
                                id={"subtitleProcessedSpan_" + index}
                                ref={textSubtitleRef}
                                contentEditable
                                onInput={handleSubtitlesTextChange}
                                onClick={handleOnClick}
                                onBlur={() => saveCursorPosition}
                                onFocus={restoreCursorPosition}
                                onKeyDown={handleEnterKeyDown}
                                suppressContentEditableWarning={true}
                                className={`py-1 my-1 outline-none`}
                                style={handleTextAttribute(subtitlesFromBackend.subtitles[index].texts[0].attributes)}>
                                {text}
                            </span>
                                        </div>
                                    );
                                })
                            )
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}