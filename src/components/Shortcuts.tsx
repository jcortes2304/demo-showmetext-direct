import React from "react";
import {useTranslations} from 'next-intl';

export default function Shortcuts() {
    const t = useTranslations('HomePage.Shortcuts');

    return (
        <div>
            <div className="w-[360px] border rounded-md border-gray-400 p-2">
                <div className="block px-1">
                    <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">Alt</kbd>+<kbd className="kbd">S</kbd>
                    <label className="label text-sm">{t('sendText')}</label>
                </div>
                <div className="divider"></div>
                <div className="block px-1">
                    <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">Alt</kbd>+<kbd className="kbd">L</kbd>
                    <label className="label text-sm">{t('clearText')}</label>
                </div>
                <div className="divider"></div>
                <div className="block px-1">
                    <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">Alt</kbd>+<kbd className="kbd">I</kbd>
                    <label className="label text-sm">{t('startAutoSend')}</label>
                </div>
                <div className="divider"></div>
                <div className="block px-1">
                    <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">Alt</kbd>+<kbd className="kbd">D</kbd>
                    <label className="label text-sm">{t('stopAutoSend')}</label>
                </div>
                <div className="divider"></div>
                <div className="block px-1">
                    <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">Alt</kbd>+<kbd className="kbd">E</kbd>
                    <label className="label text-sm">{t('stopAutoSend')}</label>
                </div>
                <div className="divider"></div>
                <div className="block px-1">
                    <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">Alt</kbd>+<kbd className="kbd">A</kbd>
                    <label className="label text-sm">{t('stopAutoSend')}</label>
                </div>
                <div className="divider"></div>
                <div className="block px-1">
                    <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">Alt</kbd>+<kbd className="kbd">X</kbd>
                    <label className="label text-sm">{t('stopAutoSend')}</label>
                </div>
                <div className="divider"></div>
                <div className="block px-1">
                    <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">Alt</kbd>+<kbd className="kbd">Z</kbd>
                    <label className="label text-sm">{t('stopAutoSend')}</label>
                </div>
            </div>
        </div>
    )
}
