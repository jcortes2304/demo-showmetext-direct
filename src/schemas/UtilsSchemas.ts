
export enum SpanType{
    FIXER_SPAN = "FIXER_SPAN",
    PROCESSED_SPAN = "PROCESSED_SPAN"
}

export type colorSpeaker = "#ed515c" | "#f0ad4e" | "#5cb85c" | "#5bc0de" | "#0275d8" | "#6c757d";

export interface Speaker {
    id: number;
    name: string;
    color: string | colorSpeaker;
}
