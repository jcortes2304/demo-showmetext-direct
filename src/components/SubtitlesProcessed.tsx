import React, {useEffect, useState} from "react";
import {Subtitle, SubtitleMessage, Text} from "@/schemas/SubtitleMessageSchema";

interface SubtitlesProcessedProps {
    subtitle: Subtitle;
    timeout: string;
}

export default function SubtitlesProcessed({subtitle, timeout}: SubtitlesProcessedProps){
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timeoutDuration = parseDuration(timeout);
        const timer = setTimeout(() => {
            setVisible(false);
        }, timeoutDuration);

        return () => {
            clearTimeout(timer)
            setVisible(true)
        };
    }, [subtitle]);

    const parseDuration = (duration: string) => {
        const regex = /PT(\d+)([HMS])/;
        const matches = duration.match(regex);
        if (!matches) return 0;

        const value = parseInt(matches[1], 10);
        const unit = matches[2];

        switch (unit) {
            case 'H':
                return value * 60 * 60 * 1000;
            case 'M':
                return value * 60 * 1000;
            case 'S':
                return value * 1000;
            default:
                return 0;
        }
    };

    if (!visible) return null;

    const lineAttributes = subtitle.lineAttributes;
    const textAttributes = subtitle.texts[0].attributes;
    const characters = subtitle.texts;

    return (
        <div className={""}
            style={{
            textAlign: lineAttributes.alignment,
            visibility: visible ? 'visible' : 'hidden',
            left: `${lineAttributes.horizontalPosition}%`,
            top: `${lineAttributes.verticalPosition}%`,
            backgroundColor: textAttributes.backgroundColor,
            color: textAttributes.textColor,
            fontSize: textAttributes.textSize,
            fontWeight: textAttributes.bold ? 'bold' : 'normal',
            fontStyle: textAttributes.italic ? 'italic' : 'normal',
            textDecoration: textAttributes.underlined ? 'underline' : 'none',
        }}>
            {
                characters.map((text: Text, index: number) => {
                    return (
                        <div key={index}>
                            <span style={{
                                fontFamily: text.attributes.fontName,
                                fontSize: text.attributes.textSize,
                                color: text.attributes.textColor,
                                fontStyle: textAttributes.italic ? 'italic' : 'normal',
                                fontWeight: textAttributes.bold ? 'bold' : 'normal',
                                textDecoration: textAttributes.underlined ? 'underline' : 'none',
                                outlineColor: text.attributes.outlineColor,
                                backgroundColor: textAttributes.backgroundColor,
                                outlineWidth: text.attributes.outlineSize,
                            }} key={index} >{text.characters}</span>
                            <br/>
                            <br/>
                        </div>
                    );
                })
            }
        </div>
    );
}