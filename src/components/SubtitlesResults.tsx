import React, {useEffect, useRef, useState} from "react";
import {LineAttribute, Subtitle, SubtitleMessage, Text, TextAttributes} from "@/schemas/SubtitleMessageSchema";
import {Client} from "@stomp/stompjs";
import parseDuration from "@/app/utils/utils";

interface SubtitlesProcessedProps {
    subtitle: Subtitle;
    timeout: string;
}

export default function SubtitlesResults(){
    const [visible, setVisible] = useState(true);
    const subtitleResultsSpan = useRef<HTMLSpanElement>(null);
    const [subtitle, setSubtitles] = useState<SubtitleMessage | null>(null);

    useEffect(() => {
        const subtitleBackClient = new Client({
            brokerURL: "ws://localhost:9081/ws",
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                subtitleBackClient.subscribe('/topic/receiveSubtitleResults', (message) => {
                    const subtitleMessage: SubtitleMessage = JSON.parse(message.body);
                    if (subtitleMessage) {
                        setSubtitles(subtitleMessage);
                    }
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

        subtitleBackClient.activate();

        return () => {
            subtitleBackClient.deactivate().then(r => console.log("WebSocket deactivated"));
        };

    }, []);

    useEffect(() => {
        const timeoutDuration = parseDuration(subtitle?.timeout || 'PT4S');
        const timer = setTimeout(() => {
            setVisible(false);
        }, timeoutDuration);

        return () => {
            clearTimeout(timer)
            setVisible(true)
        };
    }, [subtitle]);

    // if (!visible) return null;


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

    const handleLineAttributes = (lineAttributes: LineAttribute) => {
        return {
            textAlign: lineAttributes.alignment,
            left: `${lineAttributes.horizontalPosition}%`,
            top: `${lineAttributes.verticalPosition}%`,
            doubleHeight: lineAttributes.doubleHeight
        };
    }

    return (
        <div>
            <div
                className="flex border w-full justify-center items-center bg-black border-gray-400 m-2 rounded-md overflow-y-auto max-h-[600px] min-h-[400px] relative">
                <div className="p-4 space-y-4 text-center">
                    <div className="relative h-full justify-center items-center" style={{visibility: visible ? "visible" : "hidden"}}>
                        {
                            subtitle && subtitle.subtitles.length > 0 &&
                            (
                                subtitle.subtitles.map((subtitle: Subtitle, index: number) => {
                                    return (
                                            <div key={index}
                                                 style={handleLineAttributes(subtitle.lineAttributes!)}>
                                                <span
                                                    id={"subtitleResultsSpan"}
                                                    ref={subtitleResultsSpan}
                                                    className={`py-1 my-1 outline-none`}
                                                    style={handleTextAttribute(subtitle.texts[0].attributes)}>
                                                    {subtitle.texts[0].characters}
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