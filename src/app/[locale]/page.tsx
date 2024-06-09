'use client';

import React from "react";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import SubtitlesFixer from "@/components/SubtitlesFixer";
import ControlPanel from "@/components/ControlPanel";
import SubtitlesProcessed from "@/components/SubtitlesProcessed";
import SubtitlesResults from "@/components/SubtitlesResults";


export default function HomePage() {

    return (
        <div className="p-2">
            <ThemeSwitcher/>
            <div className="mx-auto p-4 flex flex-col md:flex-row">
                <ControlPanel/>
                <div className={"block w-full h-full"}>
                    <SubtitlesFixer/>
                    <SubtitlesProcessed/>
                    <SubtitlesResults/>
                </div>
            </div>
        </div>
    );
}
