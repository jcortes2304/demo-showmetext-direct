import React, {useCallback, useEffect, useRef, useState} from "react";
import {Client} from "@stomp/stompjs";
import {
    MenuOptions,
    StandardResponse,
    SubtitleData,
    SubtitleMessage,
    WordFixedToSendToBackend
} from "@/schemas/SubtitleMessageSchema";
import {sendSubtitles} from "@/lib/requestSubtitle";
import useAppStore from "@/store/store";
import {SpanType} from "@/schemas/UtilsSchemas";


function SubtitlesFixer() {

    const BASE_URL = "wss://sigas.showmetext.com/backend"
    const BASE_TOPIC = "/topic/providers/RTVE/channels/Teledeporte";

    const {
        amountOfWordsToSend,
        amountOfTimeBetweenSends,
        waitingTimeAfterModification,
        amountOfWordsRemainAfterCleaned,
        isPlayingSubTitle,
        setIsPlayingSubTitle,
        activeSpan,
        setActiveSpan
    } = useAppStore(state => ({
        amountOfWordsToSend: state.amountOfWordsToSend,
        amountOfTimeBetweenSends: state.amountOfTimeBetweenSends,
        waitingTimeAfterModification: state.waitingTimeAfterModification,
        amountOfWordsRemainAfterCleaned: state.amountOfWordsRemainAfterCleaned,
        activeSpan: state.activeSpan,
        isPlayingSubTitle: state.isPlayingSubTitle,
        setIsPlayingSubTitle: state.setIsPlayingSubTitle,
        setActiveSpan: state.setActiveSpan
    }));

    // Boolean states
    const [subtitlesHaveWords, setSubtitlesHaveWords] = useState<boolean>(false);
    const [enabledMarking, setEnableMarking] = useState<boolean>(true);
    const [shouldMark, setShouldMark] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [automaticSendFlag, setAutomaticSendFlag] = useState<boolean>(true);
    const [subtitlesSentWithRestController, setSubtitlesSentWithRestController] = useState<boolean>(false);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [isTextSelected, setIsTextSelected] = useState<boolean>(false);
    const [textSelected, setTextSelected] = useState<string>("");
    const [rangeTextSelected, setRangeTextSelected] = useState<{ start: number, end: number }>({start: 0, end: 0});
    const [lastEscapeTime, setLastEscapeTime] = useState<number>(0);

    // const [wordsSubtitles, setWordsSubtitles] = useState<WordFixedToSendToBackend []>([]);

    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({x: 0, y: 0});
    const [isUserSelecting, setIsUserSelecting] = useState<boolean>(false);

    // String states
    const [subtitles, setSubtitles] = useState<string>("");
    const [subtitlesToSend, setSubtitlesToSend] = useState<string>("");

    // Number states

    // WS Client states
    const [clientSubtitlesDirect, setClientSubtitlesDirect] = useState<Client | null>(null);

    // Refs
    const subtitlesRef = useRef<string>("")
    const subtitlesToSendRef = useRef<string>("")
    const subtitlesToSentToBackendRef = useRef<string>("")
    const subtitleSpanRef = useRef<HTMLSpanElement>(null);
    const cursorPositionRef = useRef(0);
    const clientLocalRef = useRef<Client | null>(null);


    const performAction = (key: string) => {
        // console.log('Acción ejecutada por combinación de teclas Ctrl + Alt + ' + key);
    };

    const handleContextMenuOptionClick = (option: MenuOptions) => {

        switch (option) {
            case "italic":
                break;
            case "bold":
                break;
            case "underline":
                break;
            default:
                break;
        }
        setShowContextMenu(false);
    };

    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.altKey && event.ctrlKey) {
            switch (event.key.toLowerCase()) {
                case "s":
                    performAction(event.key);
                    sendSubtitlesUntilCursor();
                    break;
                case "l":
                    clearSentSubtitles();
                    performAction(event.key);
                    break;
                case "i":
                    setTimeout(() => {
                        setAutomaticSendFlag(true);
                    }, 0)
                    performAction(event.key);
                    break;
                case "d":
                    setTimeout(() => {
                        setAutomaticSendFlag(false);
                    }, 0)
                    performAction(event.key);
                    break;
                default:
                    break;
            }
        }
    };

    const clearSentSubtitles = () => {
        const words = subtitlesToSendRef.current.split(/\s+/).filter(word => word !== "");
        const wordToStayAfterCleaned = words.slice(words.length - amountOfWordsRemainAfterCleaned, words.length).join(" ") + " ";
        setSubtitlesToSend(wordToStayAfterCleaned);
        subtitlesToSendRef.current = wordToStayAfterCleaned;
    }

    const handleSubtitlesTextChange = (event: React.FormEvent<HTMLSpanElement>) => {
        const newSubtitles = event.currentTarget.textContent || '';
        if (newSubtitles !== subtitles) {
            setIsEditing(true);
            setSubtitles(newSubtitles);
            saveCursorPosition();
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
        } else if (event.shiftKey && event.ctrlKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') ||
            event.shiftKey && event.key === 'ArrowLeft' || event.shiftKey && event.key === 'ArrowRight') {
            console.log("Shift + Arrow key pressed");
            setIsEditing(true);
            saveSelectedText(event as unknown as MouseEvent);
        }else if(event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown'){
            saveCursorPosition();
        } else if (event.key === 'Escape') {
            const currentTime = new Date().getTime();
            if (currentTime - lastEscapeTime < 300) { // 300ms para detectar doble escape
                clearTextSelection();
            }
            setLastEscapeTime(currentTime);
        }
    };

    const clearTextSelection = () => {
        setRangeTextSelected({start: 0, end: 0});
        setTextSelected("");
        setIsTextSelected(false);
        setShowContextMenu(false);

        // Limpiar la selección visual
        const selection = window.getSelection();
        if (selection) {
            if (selection.empty) {
                selection.empty();
            } else if (selection.removeAllRanges) {
                selection.removeAllRanges();
            }
        }
    };

    const sendSubtitlesUntilCursor = () => {
        const words = subtitlesRef.current!.split(/\s+/).filter(word => word !== "");
        const position = getCursorPositionInWords(words);
        const wordsToSend = words.slice(0, position).join(" ") + " ";
        const remainingWords = words.slice(position).join(" ");
        saveCursorPosition(wordsToSend.length);
        setSubtitles(remainingWords);
        const subtitleToSend: SubtitleData = {
            subtitle: wordsToSend
        };
        subtitlesToSentToBackendRef.current = wordsToSend
        handleSendSubtitles(subtitleToSend).then();
        setSubtitlesSentWithRestController(true);
        setSubtitlesToSend(prev => prev + " " + wordsToSend);
        setShouldMark(true)
    }

    const handleOnClick = () => {
        setEnableMarking(false)
        setActiveSpan(SpanType.FIXER_SPAN)
        saveCursorPosition();
    };

    const handleSendSubtitles = useCallback(async (data: SubtitleData) => {
        const response: Promise<StandardResponse> = sendSubtitles(data);
        return await response;
    }, []);

    const getCursorPositionInWords = useCallback((words: string[]) => {
        let position = 0;
        let chars = 0;
        while (chars < cursorPositionRef.current && position < words.length) {
            chars += words[position].length + 1; // +1 for the space or newline between words
            position++;
        }
        return position;
    }, []);

    const saveCursorPosition = useCallback((amountOfCharactersToRest: number = 0) => {
        if (activeSpan === SpanType.FIXER_SPAN) {
                    const selection = window.getSelection();
                    if (selection!.rangeCount > 0 && subtitleSpanRef.current) {
                        const range = selection!.getRangeAt(0);
                        const preCaretRange = range.cloneRange();
                        preCaretRange.selectNodeContents(subtitleSpanRef.current!);
                        preCaretRange.setEnd(range.startContainer, range.startOffset);
                        if (preCaretRange.toString().length - amountOfCharactersToRest > 0) {
                            cursorPositionRef.current = preCaretRange.toString().length - amountOfCharactersToRest;
                        } else {
                            cursorPositionRef.current = 0;
                        }
                    }
                }
    }, [activeSpan]);

    const compareWordsToSendWithCursorPosition = useCallback((wordsToSendLength:number) => {
        const result = cursorPositionRef.current - wordsToSendLength;
        return result >= 0
    }, []);

    const restoreCursorPosition = useCallback(() => {
        if (activeSpan === SpanType.FIXER_SPAN) {
            const selection = window.getSelection();
            const range = document.createRange();
            if (selection!.rangeCount > 0 && subtitleSpanRef.current) {
                range.setStart(subtitleSpanRef.current!, 0);
                range.collapse(true);
                let pos = 0;

                const nodeIterator = document.createNodeIterator(subtitleSpanRef.current!, NodeFilter.SHOW_TEXT, null);
                let node: Node | null;

                while ((node = nodeIterator.nextNode()) !== null) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const textNode = node as Text;
                        const nextPos = pos + textNode.length;
                        if (cursorPositionRef.current <= nextPos) {
                            range.setStart(textNode, cursorPositionRef.current - pos);
                            range.collapse(true);
                            break;
                        }
                        pos = nextPos;
                    }
                }
                selection!.removeAllRanges();
                selection!.addRange(range);
            }
        }
    }, []);

    const updateSelectedTextRange = useCallback((wordsToSendLength: number) => {
        if (isTextSelected) {
            const updatedStart = Math.max(rangeTextSelected.start - wordsToSendLength, 0);
            const updatedEnd = Math.max(rangeTextSelected.end - wordsToSendLength, 0);
            setRangeTextSelected({ start: updatedStart, end: updatedEnd });
        }
    }, [isTextSelected, rangeTextSelected]);

    const saveSelectedText = useCallback((event: MouseEvent) => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();
            const startOffset = range.startOffset;
            const endOffset = range.endOffset;

            if (startOffset === endOffset) {
                setTextSelected("");
                setRangeTextSelected({ start: 0, end: 0 });
                setIsTextSelected(false);
                setShowContextMenu(false);
                setIsUserSelecting(false);
            } else {
                setTextSelected(selectedText);
                setRangeTextSelected({ start: startOffset, end: endOffset });
                setIsTextSelected(true);
                setShowContextMenu(true);
                setContextMenuPosition({ x: event.clientX, y: event.clientY });
                setIsUserSelecting(true);
            }
        } else {
            setTextSelected("");
            setRangeTextSelected({ start: 0, end: 0 });
            setIsTextSelected(false);
            setShowContextMenu(false);
            setIsUserSelecting(false);
        }
    }, []);
    const restoreSelectedText = useCallback(() => {
        if (activeSpan === SpanType.FIXER_SPAN) {
            const selection = window.getSelection();
            const range = document.createRange();
            if (selection!.rangeCount > 0 && subtitleSpanRef.current) {
                const textNode = subtitleSpanRef.current.firstChild as Text;
                if (textNode) {
                    const startOffset = Math.min(rangeTextSelected.start, textNode.length);
                    const endOffset = Math.min(rangeTextSelected.end, textNode.length);
                    range.setStart(textNode, startOffset);
                    range.setEnd(textNode, endOffset);
                    selection!.removeAllRanges();
                    selection!.addRange(range);
                }
            }
        }
    }, [rangeTextSelected]);


    useEffect(() => {
        if (!isPlayingSubTitle) {
            clientSubtitlesDirect?.deactivate().then(() => {
                setClientSubtitlesDirect(null);
            })
            console.log('Disconnected subtitle');
        }

    }, [isPlayingSubTitle]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyPress);

        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        if (subtitles.length !== 0) {
            setSubtitlesHaveWords(true)
        } else {
            setSubtitlesHaveWords(false)
        }
    }, [subtitles]);

    useEffect(() => {
        if (subtitlesRef.current && !isUserSelecting) {
            let words = subtitlesRef.current.trim().split(/\s+/);
            let wordsToSend = words.slice(0, amountOfWordsToSend).join(" ") + " ";

            if (!subtitlesHaveWords){
                return;
            }else if (!enabledMarking && !compareWordsToSendWithCursorPosition(wordsToSend.length)) {
                return;
            }else if (isEditing && !compareWordsToSendWithCursorPosition(wordsToSend.length)) {
                return;
            }

            if (automaticSendFlag) {
                const intervalId = setInterval(() => {
                    let words = subtitlesRef.current.trim().split(/\s+/);
                    let wordsToSend = words.slice(0, amountOfWordsToSend).join(" ") + " ";
                    let remainingWords = words.slice(amountOfWordsToSend).join(" ");
                    saveCursorPosition(wordsToSend.length);
                    setSubtitles(remainingWords);
                    updateSelectedTextRange(wordsToSend.length);
                    setSubtitlesSentWithRestController(false);
                    setSubtitlesToSend(prev => prev + " " + wordsToSend);
                    subtitlesToSentToBackendRef.current = wordsToSend
                    setShouldMark(true)
                }, amountOfTimeBetweenSends * 1000);

                return () => {
                    clearTimeout(intervalId);
                };

            } else {
                // console.log("Automatic send is disabled at asd: ", new Date().toLocaleTimeString())
            }
        }
    }, [automaticSendFlag, isEditing, amountOfTimeBetweenSends, amountOfWordsToSend, subtitlesHaveWords, enabledMarking, updateSelectedTextRange, isUserSelecting]);

    useEffect(() => {
        subtitlesRef.current = subtitles
        subtitlesToSendRef.current = subtitlesToSend
    }, [subtitles, subtitlesToSend]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setEnableMarking(true)
            setIsEditing(false)
        }, waitingTimeAfterModification * 1000);

        return () => clearTimeout(timer);
    }, [enabledMarking, isEditing]);

    useEffect(() => {
        if (activeSpan === SpanType.FIXER_SPAN) {
            restoreCursorPosition();
            if (!isEditing && isTextSelected) {
                restoreSelectedText();
            }
        }
    }, [subtitles]);

    useEffect(() => {
        if (isPlayingSubTitle) {

            const client1 = new Client({
                brokerURL: `${BASE_URL}/publisher/ws`,
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
            });

            client1.onConnect = () => {
                const subscription = client1.subscribe(`${BASE_TOPIC}/subtitles/0`, (message) => {
                    const subtitleMessage: SubtitleMessage = JSON.parse(message.body);
                    if (subtitleMessage) {
                        const subtitlesArray = subtitleMessage.subtitles;
                        const newText = subtitlesArray.map(line => line.texts.map(text => text.characters).join(" ")).join("\n");
                        const newWords = newText.split(/\s+/).filter(word => word.trim() !== '');
                        // setWordsSubtitles(prevState => [
                        //     ...prevState,
                        //     ...newWords.map(word => ({
                        //         word,
                        //         attributes: {
                        //             highlight: false,
                        //             bold: false,
                        //             italic: false,
                        //             underline: false
                        //         }
                        //     }))
                        // ]);
                        setSubtitles(prev => prev + "\n" + newText);
                    }
                });
                return () => {
                    subscription.unsubscribe();
                    client1.deactivate().then();
                };
            };

            client1.onDisconnect = () => {
                console.error("Disconnected from WebSocket server");
            };

            client1.onStompError = (frame) => {
                console.error("Broker reported error: " + frame.headers['message']);
                console.error("Additional details: " + frame.body);
            };

            client1.activate();

            return () => {
                client1.deactivate().then();
            };
        }
    }, [isPlayingSubTitle]);

    useEffect(() => {
        const client = new Client({
            brokerURL: "ws://localhost:9081/ws",
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = () => {
            setIsConnected(true)
        };

        client.onDisconnect = () => {
            setIsConnected(false)
            console.error("Disconnected from WebSocket server");
        };

        client.onStompError = (frame) => {
            setIsConnected(false)
            console.error("Broker reported error: " + frame.headers['message']);
            console.error("Additional details: " + frame.body);
        };

        client.activate();
        clientLocalRef.current = client;
        setClientSubtitlesDirect(client);

        return () => {
            client.deactivate().then();
        };


    }, []);

    useEffect(() => {
        const sendSubtitles = () => {
            if (isConnected && clientLocalRef.current && subtitlesToSentToBackendRef.current && !subtitlesSentWithRestController) {
                try {
                    clientLocalRef.current.publish({
                        destination: '/app/sendSubtitles',
                        body: subtitlesToSentToBackendRef.current,
                    });
                } catch (error) {
                    console.error("Error sending subtitles:");
                }
            }
        };

        sendSubtitles();

    }, [subtitlesToSend, isConnected]);

    useEffect(() => {
        if (textSelected === "") {
            setIsTextSelected(false);
        }
    }, [textSelected, rangeTextSelected]);

    useEffect(() => {
        if (isUserSelecting) {
            const timer = setTimeout(() => {
                setIsUserSelecting(false);
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [isUserSelecting]);

    // useWebSocket({
    //     url: `${BASE_URL}/publisher/ws`,
    //     topic: `${BASE_TOPIC}/subtitles/0`,
    //     callback: (subtitleMessage: SubtitleMessage) => {
    //         if (subtitleMessage) {
    //             const subtitlesArray = subtitleMessage.subtitles;
    //             const newText = subtitlesArray.map(line => line.texts.map(text => text.characters).join(" ")).join("\n");
    //             setSubtitles(prev => prev + "\n" + newText);
    //         }
    //         setIsPlayingSubTitle(true);
    //     }
    // });

    // useEffect(() => {
    //     const timer = setInterval(() => {
    //         setShowCountDown(false)
    //         setRestartCountDown(false);
    //     }, (timeForCountDown + 1) * 1000)
    //
    //     return () => clearTimeout(timer)
    // }, [showCountDown, timeForCountDown, restartCountDown]);

    const Menu = () => {

        return (
            <ul className="menu menu-horizontal bg-base-200 rounded-box mt-6">
                <li onClick={() => handleContextMenuOptionClick("bold")}>
                    <a className="tooltip" data-tip="Bold">
                        <strong>B</strong>
                    </a>
                </li>
                <li onClick={() => handleContextMenuOptionClick("italic")}>
                    <a className="tooltip" data-tip="Italic">
                        <strong>I</strong>
                    </a>
                </li>
                <li onClick={() => handleContextMenuOptionClick("underline")}>
                    <a className="tooltip" data-tip="Underline">
                        <strong>U</strong>
                    </a>
                </li>
                <div className="divider divider-horizontal"></div>
                <div className="flex justify-center gap-2 items-center mx-2">
                    <label className="label">Resaltar:</label>
                    <button>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                             stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                        </svg>
                    </button>
                    <button>
                        <div className="badge badge-success badge-lg"></div>
                    </button>
                    <button>
                        <div className="badge badge-accent badge-lg"></div>
                    </button>
                    <button>
                        <div className="badge badge-info badge-lg"></div>
                    </button>
                </div>
            </ul>
        )
    }

    return (
        <div>
            <div
                className="border w-full border-gray-400 m-2 rounded-md overflow-y-auto max-h-[600px] min-h-[400px] relative">
                <div className="p-4 space-y-4 text-justify">
                <span contentEditable={false}
                      className={`py-1 my-1${shouldMark && 'border border-gray-400 bg-blue-400'} text-white`}>
                    {subtitlesToSend}
                    </span>
                    <span
                        id={"subtitleFixerSpan"}
                        ref={subtitleSpanRef}
                        contentEditable
                        suppressContentEditableWarning={true}
                        onInput={handleSubtitlesTextChange}
                        onClick={handleOnClick}
                        onFocus={restoreCursorPosition}
                        onSelect={() => saveCursorPosition}
                        onMouseUp={(event) => saveSelectedText(event.nativeEvent as unknown as MouseEvent)}
                        onKeyDown={handleKeyDown}
                        className={`py-1 my-1 outline-none`}
                    >
                        {subtitles}
                        {/*{*/}
                        {/*    wordsSubtitles.map((word, index) => (*/}
                        {/*        <span key={index} className="cursor-pointer" onClick={() => console.log(word.word)}>*/}
                        {/*            {word.word}{' '}*/}
                        {/*        </span>*/}
                        {/*    ))*/}
                        {/*}*/}
                    </span>
                </div>
            </div>
            {showContextMenu && (
                <div
                    className="absolute mt-3"
                    style={{left: contextMenuPosition.x, top: contextMenuPosition.y}}
                >
                    <Menu/>
                </div>
            )}

            <div className="flex justify-end items-center mt-2">
                {/*<div className="mr-1">*/}
                {/*    {showCountDown && (*/}
                {/*        <CountDown timeout={timeForCountDown} pause={false}/>*/}
                {/*    )}*/}
                {/*</div>*/}
            </div>
        </div>
    )
}


export default SubtitlesFixer;
