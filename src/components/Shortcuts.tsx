import React from "react";
import { useTranslations } from 'next-intl';

export default function Shortcuts() {
    const t = useTranslations('HomePage.Shortcuts');

    return (
        <div>
            <div className="w-full border rounded-md border-gray-400 p-2">
                <div className="flex px-1">
                    <label className="label font-bold text-sm">Ctrl + Alt + S: </label>
                    <label className="label text-sm">{t('sendText')}</label>
                </div>
                <div className="divider"></div>
                <div className="flex px-1">
                    <label className="label font-bold text-sm">Ctrl + Alt + L: </label>
                    <label className="label text-sm">{t('clearText')}</label>
                </div>
                <div className="divider"></div>
                <div className="flex px-1">
                    <label className="label font-bold text-sm">Ctrl + Alt + I: </label>
                    <label className="label text-sm">{t('startAutoSend')}</label>
                </div>
                <div className="divider"></div>
                <div className="flex px-1">
                    <label className="label font-bold text-sm">Ctrl + Alt + D: </label>
                    <label className="label text-sm">{t('stopAutoSend')}</label>
                </div>
            </div>
        </div>
    )
}