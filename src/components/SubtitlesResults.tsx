import React, { useEffect, useRef, useState } from "react";
import { LineAttribute, Subtitle, SubtitleMessage, TextAttributes } from "@/schemas/SubtitleMessageSchema";
import { Client } from "@stomp/stompjs";
import parseDuration from "@/app/utils/utils";

export default function SubtitlesResults() {
    const [visible, setVisible] = useState(true);
    const [subtitle, setSubtitle] = useState<SubtitleMessage | null>(null);

    useEffect(() => {
        const client = new Client({
            brokerURL: "ws://localhost:9081/ws",
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                client.subscribe('/topic/receiveSubtitleResults', (message) => {
                    const subtitleMessage: SubtitleMessage = JSON.parse(message.body);
                    setSubtitle(subtitleMessage);

                    const duration = parseDuration(subtitleMessage.timeout);
                    setVisible(true);
                    setTimeout(() => {
                        setVisible(false);
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

        return () => {
            client.deactivate().then();
        };
    }, []);

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

    const handleLineAttributes = (lineAttributes: LineAttribute) => ({
        textAlign: lineAttributes.alignment,
        left: `${lineAttributes.horizontalPosition}%`,
        top: `${lineAttributes.verticalPosition}%`,
    });

    return (
        <div>
            <div className="flex border w-full justify-center items-center bg-black border-gray-400 m-2 rounded-md overflow-y-auto max-h-[600px] min-h-[400px] relative">
                <div className="p-4 space-y-4 text-center">
                    <div className="relative h-full justify-center items-center" style={{ visibility: visible ? "visible" : "hidden" }}>
                        {subtitle?.subtitles.map((subtitle, index) => (
                            <div key={index} style={handleLineAttributes(subtitle.lineAttributes!)}>
                                <span className="py-1 my-1 outline-none" style={handleTextAttribute(subtitle.texts[0].attributes)}>
                                    {subtitle.texts[0].characters}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
