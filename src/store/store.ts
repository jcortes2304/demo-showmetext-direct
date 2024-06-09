// store.ts
import { create } from 'zustand';
import {SpanType} from "@/schemas/UtilsSchemas";

interface StoreState {
    isPlayingSubTitle: boolean;
    amountOfWordsToSend: number;
    amountOfTimeBetweenSends: number;
    waitingTimeAfterModification: number;
    amountOfWordsRemainAfterCleaned: number;
    activeSpan: SpanType;

    setIsPlayingSubTitle: (value: boolean) => void;
    setAmountOfWordsToSend: (amount: number) => void;
    setAmountOfTimeBetweenSends: (time: number) => void;
    setWaitingTimeAfterModification: (time: number) => void;
    setAmountOfWordsRemainAfterCleaned: (amount: number) => void;
    setActiveSpan: (spanType: SpanType) => void;
}

const useAppStore = create<StoreState>((set) => ({
    isPlayingSubTitle: false,
    amountOfWordsToSend: 3,
    amountOfTimeBetweenSends: 3,
    waitingTimeAfterModification: 3,
    amountOfWordsRemainAfterCleaned: 3,
    activeSpan: SpanType.FIXER_SPAN,

    setIsPlayingSubTitle: (value) => set({ isPlayingSubTitle: value }),
    setAmountOfWordsToSend: (amount) => set({ amountOfWordsToSend: amount }),
    setAmountOfTimeBetweenSends: (time) => set({ amountOfTimeBetweenSends: time }),
    setWaitingTimeAfterModification: (time) => set({ waitingTimeAfterModification: time }),
    setAmountOfWordsRemainAfterCleaned: (amount) => set({ amountOfWordsRemainAfterCleaned: amount }),
    setActiveSpan: (spanType) => set({ activeSpan: spanType })
}));

export default useAppStore;
