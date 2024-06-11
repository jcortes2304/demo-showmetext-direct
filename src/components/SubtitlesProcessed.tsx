import React, {useCallback, useEffect, useRef, useState} from "react";
import {LineAttribute, Subtitle, SubtitleMessage, TextAttributes} from "@/schemas/SubtitleMessageSchema";
import {Client} from "@stomp/stompjs";
import parseDuration from "@/app/utils/utils";
import CountDown from "@/components/CountDown";

export default function SubtitlesProcessed() {
    const textSubtitleRef = useRef<HTMLSpanElement>(null);
    const [subtitleMessage, setSubtitleMessage] = useState<SubtitleMessage | null>(null);
    const [visible, setVisible] = useState<boolean>(false);
    const clientProcessedRef = useRef<Client | null>(null);

    const handleEnterKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
        }
    };

    const saveCursorPosition = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && textSubtitleRef.current) {
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(textSubtitleRef.current);
            preCaretRange.setEnd(range.startContainer, range.startOffset);
        }
    }, []);

    const restoreCursorPosition = useCallback(() => {
        const selection = window.getSelection();
        const range = document.createRange();
        if (textSubtitleRef.current) {
            range.setStart(textSubtitleRef.current, 0);
            range.collapse(true);

            const nodeIterator = document.createNodeIterator(textSubtitleRef.current, NodeFilter.SHOW_TEXT, null);
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
    }, []);

    const handleLineAttributes = (lineAttributes: LineAttribute) => ({
        textAlign: lineAttributes.alignment,
        left: `${lineAttributes.horizontalPosition}%`,
        top: `${lineAttributes.verticalPosition}%`,
    });

    const handleTextAttribute = (textAttributes: TextAttributes) => ({
        fontFamily: textAttributes.fontName,
        fontSize: textAttributes.textSize,
        color: textAttributes.textColor,
        fontStyle: textAttributes.italic ? 'italic' : 'normal',
        fontWeight: textAttributes.bold ? 'bold' : 'normal',
        textDecoration: textAttributes.underlined ? 'underline' : 'none',
        outlineColor: textAttributes.outlineColor,
        backgroundColor: textAttributes.backgroundColor,
        outlineWidth: textAttributes.outlineSize,
    });

    const handleSubtitlesTextChange = () => {
        saveCursorPosition();
    };

    useEffect(() => {
        const client = new Client({
            brokerURL: "ws://localhost:9081/ws",
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                console.log("Connected to WebSocket");
                client.subscribe('/topic/receiveSubtitle', (message) => {
                    const subtitleMessage: SubtitleMessage = JSON.parse(message.body);
                    console.log("Received subtitles:", new Date().toLocaleTimeString(), subtitleMessage);

                    setSubtitleMessage(subtitleMessage);
                    setVisible(true);

                    const duration = parseDuration(subtitleMessage.timeout);
                    setTimeout(() => {
                        setVisible(false);
                        client.publish({
                            destination: '/app/sendSubtitlesResults',
                            body: JSON.stringify(subtitleMessage.subtitles),
                        });
                        console.log("Sent subtitles:", new Date().toLocaleTimeString(), subtitleMessage);
                    }, duration);
                });
            },
            onDisconnect: () => {
                console.error("Disconnected from WebSocket");
            },
            onStompError: (frame) => {
                console.error("Broker reported error: " + frame.headers['message']);
                console.error("Additional details: " + frame.body);
            }
        });

        client.activate();
        clientProcessedRef.current = client;

        return () => {
            client.deactivate().then();
        };
    }, []);

    return (
        <div>
            {/*<div className="absolute top-16 right-5">*/}
            {/*    <CountDown timeout={4} pause={false}/>*/}
            {/*</div>*/}
            <div
                className="flex border w-full justify-center items-center border-gray-400 m-2 rounded-md overflow-y-auto max-h-[600px] min-h-[400px] relative">

                <div className="p-4 space-y-4 text-center">
                    <div className="relative h-full justify-center items-center"
                         style={{visibility: visible ? "visible" : "hidden"}}>
                        {subtitleMessage?.subtitles.map((subtitle, index) => (
                            <div key={index} style={handleLineAttributes(subtitle.lineAttributes!)}>
                             <span
                                 ref={textSubtitleRef}
                                 contentEditable
                                 onInput={handleSubtitlesTextChange}
                                 onClick={saveCursorPosition}
                                 onBlur={saveCursorPosition}
                                 onFocus={restoreCursorPosition}
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
        </div>

    )
        ;
}
