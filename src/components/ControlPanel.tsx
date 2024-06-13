import {ArrowPathIcon, InformationCircleIcon, PlayIcon, StopIcon, WifiIcon} from "@heroicons/react/24/outline";
import AudioPlayer from "@/components/AudioPlayer";
import Shortcuts from "@/components/Shortcuts";
import React from "react";
import useAppStore from "@/store/store";
import {useTranslations} from "next-intl";


export default function ControlPanel() {
    const t = useTranslations('HomePage');

    const {
        amountOfWordsToSend,
        amountOfTimeBetweenSends,
        waitingTimeAfterModification,
        amountOfWordsRemainAfterCleaned,
        isPlayingSubTitle,
        setIsPlayingSubTitle,
        setAmountOfWordsToSend,
        setAmountOfWordsRemainAfterCleaned,
        setAmountOfTimeBetweenSends,
        setWaitingTimeAfterModification,
    } = useAppStore(state => ({
        isPlayingSubTitle: state.isPlayingSubTitle,
        setAmountOfWordsToSend: state.setAmountOfWordsToSend,
        setAmountOfWordsRemainAfterCleaned: state.setAmountOfWordsRemainAfterCleaned,
        setAmountOfTimeBetweenSends: state.setAmountOfTimeBetweenSends,
        setWaitingTimeAfterModification: state.setWaitingTimeAfterModification,
        amountOfWordsToSend: state.amountOfWordsToSend,
        setIsPlayingSubTitle: state.setIsPlayingSubTitle,
        amountOfTimeBetweenSends: state.amountOfTimeBetweenSends,
        waitingTimeAfterModification: state.waitingTimeAfterModification,
        amountOfWordsRemainAfterCleaned: state.amountOfWordsRemainAfterCleaned,
    }));

    const handleChangeAmountOfTimeBetweenSends = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            setAmountOfTimeBetweenSends(value);
        }
    };

    const toggleReceiveSubtitle = () => {

    };

    const handleChangeWaitingTimeAfterModification = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            setWaitingTimeAfterModification(value);
        }
    };

    const handleChangeAmountOfWordsRemainAfterCleaned = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            setAmountOfWordsRemainAfterCleaned(value);
        }
    };

    const handleChangeAmountOfWordsToSend = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            setAmountOfWordsToSend(value);
        }
    };

    return (
        <div className=" border rounded-md border-gray-400 m-2 overflow-y-auto">
            <div className="p-4 space-y-5">
                <label className="flex items-center card-title">{t('serverConnection')}</label>
                <div>
                    <label className="flex items-center label">{t('emissionSubtitles')}</label>
                    <label className="flex items-center gap-2">
                        {isPlayingSubTitle ?
                            <WifiIcon className="size-5 text-green-500"/>
                            :
                            <WifiIcon className="size-5 text-red-500"/>
                        }
                        {t('connected')}
                        {
                            isPlayingSubTitle ?
                                <StopIcon onClick={() => setIsPlayingSubTitle(false)} className="size-5 text-red-500 cursor-pointer"/>
                                :
                                <PlayIcon onClick={() => setIsPlayingSubTitle(true)} className="size-5 text-green-500 cursor-pointer"/>
                        }
                    </label>
                </div>
                <AudioPlayer/>
                <label className="items-center card-title">{t('parameters')}</label>
                <div className="form-control gap-5">
                    <label>{t('amountWordsToSend')}</label>
                    <label className="input input-bordered flex items-center gap-2">
                        <input type="number" className="grow" placeholder={t('enterAmount')}
                               onChange={handleChangeAmountOfWordsToSend}
                               min={0}
                               value={amountOfWordsToSend}/>
                        <div className="tooltip tooltip-left" data-tip={t('amountWordsToSend')}>
                            <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                        </div>
                    </label>

                    <label>{t('timeBetweenSends')}</label>
                    <label className="input input-bordered flex items-center gap-2">
                        <input type="number" className="grow" placeholder={t('enterTime')}
                               onChange={handleChangeAmountOfTimeBetweenSends}
                               min={0}
                               value={amountOfTimeBetweenSends}/>
                        <div className="tooltip tooltip-left" data-tip={t('timeBetweenSends')}>
                            <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                        </div>
                    </label>

                    <label>{t('waitingTimeAfterModification')}</label>
                    <label className="input input-bordered flex items-center gap-2">
                        <input type="number" className="grow" placeholder={t('enterTime')}
                               onChange={handleChangeWaitingTimeAfterModification}
                               min={0}
                               value={waitingTimeAfterModification}/>
                        <div className="tooltip tooltip-left"
                             data-tip={t('waitingTimeAfterModification')}>
                            <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                        </div>
                    </label>

                    <label>{t('remainingWordsAfterCleaned')}</label>
                    <label className="input input-bordered flex items-center gap-2">
                        <input type="number" className="grow" placeholder={t('enterAmount')}
                               onChange={handleChangeAmountOfWordsRemainAfterCleaned}
                               min={0}
                               value={amountOfWordsRemainAfterCleaned}/>
                        <div className="tooltip tooltip-left"
                             data-tip={t('remainingWordsAfterCleaned')}>
                            <InformationCircleIcon className="size-5 text-blue-500 cursor-pointer"/>
                        </div>
                    </label>
                </div>
                <label className="items-center card-title">{t('keyboardShortcuts')}</label>
                <Shortcuts/>
            </div>
        </div>
    )
}