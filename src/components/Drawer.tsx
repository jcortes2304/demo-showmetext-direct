import Shortcuts from "@/components/Shortcuts";
import {useTranslations} from "next-intl";
import React from "react";
import ThemeSwitcher from "@/components/ThemeSwitcher";


function Drawer({children,}: { children: React.ReactNode }) {

    const t = useTranslations('HomePage.ControlPanel.Drawer');

    return (
        <div className="drawer drawer-end">
            <input id="shortcutsDrawer" type="checkbox" className="drawer-toggle"/>
            <div className="drawer-content">
                <div className={"flex justify-between mx-5 my-5"}>
                    <ThemeSwitcher/>
                    <label htmlFor="shortcutsDrawer"
                           className="btn btn-neutral drawer-button">{t('showShortcuts')}</label>
                </div>

                {children}
            </div>
            <div className="drawer-side">
                <label htmlFor="shortcutsDrawer" aria-label="close sidebar" className="drawer-overlay"></label>
                <ul className="menu bg-base-200 text-base-content min-h-full w-[400px] p-4">
                    <Shortcuts/>
                </ul>
            </div>
        </div>

    )
}

export default Drawer;
