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
import {SpanType, Speaker} from "@/schemas/UtilsSchemas";


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
        speakers,
        activeSpan,
        setActiveSpan
    } = useAppStore(state => ({
        amountOfWordsToSend: state.amountOfWordsToSend,
        amountOfTimeBetweenSends: state.amountOfTimeBetweenSends,
        waitingTimeAfterModification: state.waitingTimeAfterModification,
        amountOfWordsRemainAfterCleaned: state.amountOfWordsRemainAfterCleaned,
        activeSpan: state.activeSpan,
        speakers: state.speakers,
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
    const [focusedWordIndex, setFocusedWordIndex] = useState<number>(-1);

    const [currentSpeaker, setCurrentSpeaker] = useState<Speaker | null>(null);
    const [positionsSpeaker, setPositionsSpeaker] = useState<{ pos: number, speaker: number }[]>([]);
    // const [lastSpeakerMarked, setLastSpeakerMarked] = useState<number>(0);


    const [isUserSelecting, setIsUserSelecting] = useState<boolean>(false);

    // String states
    const [subtitles, setSubtitles] = useState<string>("");
    const [subtitlesToSend, setSubtitlesToSend] = useState<string>("");

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
        console.log('Acción ejecutada por combinación de teclas ' + key);
    };

    const handleSpeakerSelection = (optionNumber: number, event: KeyboardEvent) => {
        const speaker = speakers[optionNumber - 1];
        if (speaker) {
            const position = getCursorPositionInCharacters() || 0;
            setPositionsSpeaker(prev => [...prev, {pos: position, speaker: optionNumber}]);
            setCurrentSpeaker(speaker);
        }
    }


    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.altKey && event.ctrlKey) {
            const num = parseInt(event.key);
            if (!isNaN(num) && num >= 1 && num <= 9) {
                handleSpeakerSelection(num, event);
            } else {
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
        saveCursorPosition();
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
        } else if (event.key === 'Escape') {
            const currentTime = new Date().getTime();
            if (currentTime - lastEscapeTime < 300) { // 300ms para detectar doble escape
                clearTextSelection();
            }
            setLastEscapeTime(currentTime);
        }
        // else if (event.ctrlKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        //     // Dar tiempo para que el cursor se mueva antes de actualizar la palabra enfocada
        //     setTimeout(updateFocusedWord, 0);
        // }
    };

    const clearTextSelection = () => {
        setRangeTextSelected({start: 0, end: 0});
        setTextSelected("");
        setIsTextSelected(false);

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

    const getCursorPositionInCharacters = useCallback(() => {
        if (activeSpan === SpanType.FIXER_SPAN) {
            const selection = window.getSelection();
            if (selection!.rangeCount > 0 && subtitleSpanRef.current) {
                const range = selection!.getRangeAt(0);
                const preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(subtitleSpanRef.current!);
                preCaretRange.setEnd(range.startContainer, range.startOffset);
                return preCaretRange.toString().length;
            }
        }
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

    const compareWordsToSendWithCursorPosition = useCallback((wordsToSendLength: number) => {
        const result = cursorPositionRef.current - wordsToSendLength;
        return result >= 0
    }, []);

    const restoreCursorPosition = useCallback(() => {
        if (activeSpan === SpanType.FIXER_SPAN && subtitleSpanRef.current) {
            const selection = window.getSelection();
            const range = document.createRange();

            if (isTextSelected) {
                range.setStart(subtitleSpanRef.current.firstChild!, rangeTextSelected.start);
                range.setEnd(subtitleSpanRef.current.firstChild!, rangeTextSelected.end);
            } else {
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
                }
            }

            selection?.removeAllRanges();
            selection?.addRange(range);
        }
    }, [activeSpan, isTextSelected, rangeTextSelected]);

    const saveSelection = useCallback((amountOfCharactersToRest: number = 0) => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (amountOfCharactersToRest > 0) {
                const updateStart = range.startOffset - amountOfCharactersToRest;
                const updateEnd = range.endOffset - amountOfCharactersToRest;
                if (updateStart >= 0 && updateEnd >= 0) {
                    setRangeTextSelected({
                        start: updateStart,
                        end: updateEnd
                    });
                    setTextSelected(range.toString());
                    setIsTextSelected(true);
                } else {
                    selection.removeAllRanges();
                    setTextSelected("");
                    setIsTextSelected(false);
                }
            } else {
                setRangeTextSelected({
                    start: range.startOffset,
                    end: range.endOffset
                });
                setTextSelected(range.toString());
                setIsTextSelected(true);
            }

        }
    }, []);

    // const updateFocusedWord = useCallback(() => {
    //     if (subtitleSpanRef.current) {
    //         const selection = window.getSelection();
    //         if (selection && selection.rangeCount > 0) {
    //             const range = selection.getRangeAt(0);
    //             const preCaretRange = range.cloneRange();
    //             preCaretRange.selectNodeContents(subtitleSpanRef.current);
    //             preCaretRange.setEnd(range.endContainer, range.endOffset);
    //             const caretOffset = preCaretRange.toString().length;
    //
    //             const words = subtitlesRef.current.split(/\s+/);
    //             let charCount = 0;
    //             for (let i = 0; i < words.length; i++) {
    //                 charCount += words[i].length + 1; // +1 for space
    //                 if (charCount > caretOffset) {
    //                     setFocusedWordIndex(i);
    //                     return i; // Retorna el índice calculado
    //                 }
    //             }
    //         }
    //     }
    //     return -1; // Retorna -1 si no se encontró ninguna palabra
    // }, [subtitles]);


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

            if (!subtitlesHaveWords) {
                return;
            } else if (!enabledMarking && !compareWordsToSendWithCursorPosition(wordsToSend.length)) {
                return;
            } else if (isEditing && !compareWordsToSendWithCursorPosition(wordsToSend.length)) {
                return;
            }

            if (automaticSendFlag) {
                const intervalId = setInterval(() => {
                    let words = subtitlesRef.current.trim().split(/\s+/);
                    let wordsToSend = words.slice(0, amountOfWordsToSend).join(" ") + " ";
                    let remainingWords = words.slice(amountOfWordsToSend).join(" ");
                    saveCursorPosition(wordsToSend.length);
                    saveSelection(wordsToSend.length);
                    setSubtitles(remainingWords);
                    setPositionsSpeaker(prevState => {
                        return prevState.filter(pos => {
                            if (pos.pos < wordsToSend.length) {
                                console.log("Eliminando posición de speaker")
                            }
                        }).map(pos => {
                            return ({
                                pos: pos.pos - wordsToSend.length,
                                speaker: pos.speaker
                        })
                    })});
                    setSubtitlesSentWithRestController(false);
                    setSubtitlesToSend(prev => prev + " " + wordsToSend);
                    subtitlesToSentToBackendRef.current = wordsToSend
                    setShouldMark(true)
                }, amountOfTimeBetweenSends * 1000);

                return () => {
                    clearTimeout(intervalId);
                };

            }
        }
    }, [automaticSendFlag, isEditing, amountOfTimeBetweenSends, amountOfWordsToSend, subtitlesHaveWords, enabledMarking, isUserSelecting]);

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
        }
        console.log(positionsSpeaker)
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
                    const subtitleData: SubtitleData = {
                        subtitle: subtitlesToSentToBackendRef.current,
                        speaker: currentSpeaker
                    }
                    clientLocalRef.current.publish({
                        destination: '/app/sendSubtitles',
                        body: JSON.stringify(subtitleData),
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

    // useEffect(() => {
    //     updateFocusedWord();
    // }, [subtitles, updateFocusedWord]);

    // const renderSubtitles = () => {
    //     let result = [];
    //     let lastIndex = 0;
    //     for (let segment of speakerSegments) {
    //         result.push(subtitles.slice(lastIndex, segment.start));
    //         result.push(
    //             <span key={segment.start} style={{backgroundColor: segment.speaker.color + '40'}}>
    //       {subtitles.slice(segment.start, segment.end)}
    //     </span>
    //         );
    //         lastIndex = segment.end;
    //     }
    //     result.push(subtitles.slice(lastIndex));
    //     return result;
    // }

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
                        onSelect={() => {
                            saveCursorPosition();
                            saveSelection();
                        }}
                        onSelectCapture={() => {
                            saveCursorPosition();
                            saveSelection();
                        }}
                        onMouseUp={() => {
                            saveCursorPosition();
                            saveSelection();
                            // updateFocusedWord();
                        }}
                        onMouseDown={() => {
                            saveCursorPosition();
                            saveSelection();
                        }}
                        onKeyUp={() => {
                            saveCursorPosition();
                            saveSelection();
                            // updateFocusedWord();
                        }}
                        onKeyDown={handleKeyDown}
                        className={`py-1 my-1 outline-none`}
                    >
                                         {subtitles}

                        {/*               {subtitles.split(/\s+/).map((word, index) => (*/}
                        {/*                   <span*/}
                        {/*                       key={index}*/}
                        {/*                       className={`${index === focusedWordIndex ? 'bg-yellow-100 rounded-md' : ''} transition-colors duration-200`}*/}
                        {/*                   >*/}
                        {/*  {word}{' '}*/}
                        {/*</span>*/}
                        {/*               ))}*/}
                    </span>
                </div>
            </div>

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
