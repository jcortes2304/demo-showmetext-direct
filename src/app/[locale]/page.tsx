'use client';

import React from "react";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import SubtitlesFixer from "@/components/SubtitlesFixer";
import ControlPanel from "@/components/ControlPanel";
import SubtitlesProcessed from "@/components/SubtitlesProcessed";
import SubtitlesResults from "@/components/SubtitlesResults";
import Drawer from "@/components/Drawer";


export default function HomePage() {

    return (
        <div className="p-2">
            <div className="flex justify-center">
                <Drawer>
                    <div className="mx-auto p-4 flex flex-col md:flex-row">
                        <div className="flex justify-center">
                            <ControlPanel/>
                        </div>
                        <div className={"block w-full h-full"}>
                            <div className={"mx-2 mb-10"}>
                                <SubtitlesFixer/>
                            </div>
                            <div className={"mx-2 my-10"}>
                                <SubtitlesProcessed/>
                            </div>
                            <div className={"mx-2 my-10"}>
                                <SubtitlesResults/>
                            </div>
                        </div>
                    </div>
                </Drawer>
            </div>
        </div>
    );
}
