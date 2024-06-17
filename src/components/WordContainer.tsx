import React, {useState} from "react";

interface WordContainerProps {
    text: string;
    onTextChange: (text: string) => void;
}

const WordContainer: React.FC<WordContainerProps> = ({text, onTextChange}) => {
    const [showPopover, setShowPopover] = useState(false);
    const [selectedWord, setSelectedWord] = useState<{ word: string; index: number } | null>(null);
    const [selectedWords, setSelectedWords] = useState<{ word: string; index: number }[]>([]);
    const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number }>({top: 0, left: 0});

    const handleWordClick = (word: string, index: number, event: React.MouseEvent) => {
        if (event.ctrlKey) {
            setSelectedWord({word, index});
            setShowPopover(true);
            setPopoverPosition({top: event.clientY, left: event.clientX});
        } else if (event.shiftKey && selectedWord) {
            const startIndex = Math.min(selectedWord.index, index);
            const endIndex = Math.max(selectedWord.index, index);
            const selectedWordsRange = words.slice(startIndex, endIndex + 1);
            setSelectedWords(selectedWordsRange.map((word, index) => ({word, index: startIndex + index})));
        } else {
            setSelectedWords([{word, index}]);
            setSelectedWord({word, index});
        }
    };

    const handlePopoverClose = () => {
        setShowPopover(false);
        setSelectedWord(null);
    };

    const handleWordChange = (newWord: string, index: number) => {
        const updatedWords = [...words];
        updatedWords[index] = newWord;
        const updatedText = updatedWords.join(' ');
        console.log(updatedText);
        onTextChange(updatedText);
    };

    const words = text.split(' ');

    return (
        <div>
            {words.map((word, index) => (
                <span
                    key={index}
                    onClick={(event) => handleWordClick(word, index, event)}
                    className={`cursor-pointer ${
                        selectedWords.some((selectedWord) => selectedWord.word === word && selectedWord.index === index)
                            ? 'bg-warning'
                            : 'bg-transparent'
                    }`}
                    contentEditable
                    // onInput={() => handleWordChange}
                    suppressContentEditableWarning
                    onBlur={(event) => handleWordChange(event.target.textContent || '', index)}
                >
                    {word}{' '}
                </span>
            ))}
            {showPopover && (
                <div
                    className="absolute p-4 rounded shadow bg-white dark:bg-gray-800 dark:text-white z-10"
                    style={{top: popoverPosition.top, left: popoverPosition.left}}
                >
                    <div
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-1 px-2"
                        onClick={handlePopoverClose}
                    >
                        Opción 1
                    </div>
                    <div
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-1 px-2"
                        onClick={handlePopoverClose}
                    >
                        Opción 2
                    </div>
                    <div
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-1 px-2"
                        onClick={handlePopoverClose}
                    >
                        Opción 3
                    </div>
                </div>
            )}
        </div>
    );
};

export default WordContainer;
