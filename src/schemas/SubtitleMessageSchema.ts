import {Speaker} from "@/schemas/UtilsSchemas";

export interface TextAttributes {
    backgroundColor: string,
    bold: boolean,
    fontName: string,
    italic: boolean,
    outlineColor: string,
    outlineSize: number,
    textColor: string,
    textSize: number,
    underlined: boolean
}

export interface SubtitleData {
    subtitle: string;
    speaker?: Speaker | null;
}

export interface StandardResponse {
    statusMessage: string;
    statusCode: string;
}

export interface WordFixedToSendToBackend{
    word: string;
    attributes?: {
        highlight: boolean;
        bold: boolean;
        italic: boolean;
        underline: boolean;
    }
}

export interface Text {
    attributes: TextAttributes
    "characters": string
}

type alignment = "left" | "center" | "right";
export type MenuOptions = "bold"| "italic"|"underline"| "highlight"

export interface LineAttribute {
    alignment: alignment,
    doubleHeight: boolean,
    horizontalPosition: number,
    verticalPosition: number
}


export interface Subtitle {
    lineAttributes: LineAttribute,
    maxHeight: number,
    texts: Text [],
    type: string
}

export interface SubtitleMessage {
    subtitles: Subtitle [],
    "timeout": string,
    "type": string
}
