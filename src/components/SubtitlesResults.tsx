import React, { useEffect, useState } from "react";
import { LineAttribute, SubtitleMessage, TextAttributes } from "@/schemas/SubtitleMessageSchema";
import { Client } from "@stomp/stompjs";
import parseDuration from "@/app/utils/utils";

export default function SubtitlesResults() {
    const [subtitleMessage, setSubtitleMessage] = useState<SubtitleMessage | null>(null);

    useEffect(() => {
        const client = new Client({
            brokerURL: "ws://localhost:9081/ws",
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                client.subscribe('/topic/receiveSubtitleResults', (message) => {
                    const newSubtitleMessage: SubtitleMessage = JSON.parse(message.body);
                    setSubtitleMessage(newSubtitleMessage);
                    // console.log("Received subtitlesas:", new Date().toLocaleTimeString(), JSON.stringify(newSubtitleMessage));
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

    useEffect(() => {
        if (subtitleMessage === null) return;

        // Convertir el timeout de Duration a milisegundos
        const timeoutMs = parseDuration(subtitleMessage!.timeout);
        const timer = setTimeout(() => {
            setSubtitleMessage(null);
        }, timeoutMs);

        return () => clearTimeout(timer);

    }, [subtitleMessage]);

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
        <div className="flex border w-full justify-center items-center bg-black border-gray-400 m-2 rounded-md overflow-y-auto max-h-[600px] min-h-[400px] relative">
            <div className="p-4 space-y-4 text-center">
                <div className="relative h-full justify-center items-center">
                    {subtitleMessage !== null && subtitleMessage.subtitles.map((subtitle, index) => (
                        <div key={index} style={handleLineAttributes(subtitle.lineAttributes!)}>
                            <span className="py-1 my-1 outline-none" style={handleTextAttribute(subtitle.texts[0].attributes)}>
                                {subtitle.texts[0].characters}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}