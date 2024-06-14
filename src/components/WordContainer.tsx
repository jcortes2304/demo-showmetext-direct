import React from "react";

interface Word{
    characters: string;
    isHighlighted: boolean;
    highlightColor: string;
    underlined: boolean;
    capitalized: boolean;
}

const WordContainer: React.FC<{ word: string }> = ({ word }) => {



    return (
        <>
            <span>
                {word}
            </span>
        </>
    )
}
