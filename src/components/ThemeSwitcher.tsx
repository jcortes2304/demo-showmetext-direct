import {MoonIcon, SunIcon} from "@heroicons/react/20/solid";
import React from "react";


export default function ThemeSwitcher() {

    return (
        <label className="ms-4 swap swap-rotate">
            <input type="checkbox" className="theme-controller" value="light"/>
            <SunIcon className="swap-off fill-current w-10 h-10"/>
            <MoonIcon className="swap-on fill-current w-10 h-10"/>
        </label>
    )
}