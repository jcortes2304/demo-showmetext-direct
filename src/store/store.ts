// store.ts
import { create } from 'zustand';
import {SpanType, Speaker} from "@/schemas/UtilsSchemas";

interface StoreState {
    isPlayingSubTitle: boolean;
    amountOfWordsToSend: number;
    amountOfTimeBetweenSends: number;
    waitingTimeAfterModification: number;
    amountOfWordsRemainAfterCleaned: number;
    waitingTimeInScreenAfterSend: number;
    activeSpan: SpanType;
    speakers: Speaker[];

    setIsPlayingSubTitle: (value: boolean) => void;
    setAmountOfWordsToSend: (amount: number) => void;
    setAmountOfTimeBetweenSends: (time: number) => void;
    setWaitingTimeAfterModification: (time: number) => void;
    setAmountOfWordsRemainAfterCleaned: (amount: number) => void;
    setWaitingTimeInScreenAfterSend: (time: number) => void;
    setActiveSpan: (spanType: SpanType) => void;
    setSpeakers: (speakers: Speaker[]) => void;
}

const useAppStore = create<StoreState>((set) => ({
    isPlayingSubTitle: false,
    amountOfWordsToSend: 3,
    amountOfTimeBetweenSends: 3,
    waitingTimeAfterModification: 3,
    amountOfWordsRemainAfterCleaned: 3,
    waitingTimeInScreenAfterSend: 3,
    activeSpan: SpanType.FIXER_SPAN,
    speakers: [
        { id: 1, name: "Speaker 1", color: "#5bc0de" },
        { id: 2, name: "Speaker 2", color: "#5cb85c" },
        { id: 3, name: "Speaker 3", color: "#6c757d" },
        { id: 4, name: "Speaker 4", color: "#0275d8" },
        { id: 5, name: "Speaker 5", color: "#ed515c" },
        { id: 6, name: "Speaker 6", color: "#f0ad4e" }
    ],

    setIsPlayingSubTitle: (value) => set({ isPlayingSubTitle: value }),
    setAmountOfWordsToSend: (amount) => set({ amountOfWordsToSend: amount }),
    setAmountOfTimeBetweenSends: (time) => set({ amountOfTimeBetweenSends: time }),
    setWaitingTimeAfterModification: (time) => set({ waitingTimeAfterModification: time }),
    setAmountOfWordsRemainAfterCleaned: (amount) => set({ amountOfWordsRemainAfterCleaned: amount }),
    setWaitingTimeInScreenAfterSend: (time) => set({ waitingTimeInScreenAfterSend: time }),
    setActiveSpan: (spanType) => set({ activeSpan: spanType }),
    setSpeakers: (speakers) => set({ speakers: speakers })
}));

export default useAppStore;
