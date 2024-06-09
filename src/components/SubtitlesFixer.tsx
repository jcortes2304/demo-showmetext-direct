import React, {useCallback, useEffect, useRef, useState} from "react";
import {Client} from "@stomp/stompjs";
import {StandardResponse, SubtitleData, SubtitleMessage} from "@/schemas/SubtitleMessageSchema";
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
        setIsPlayingSubTitle
    } = useAppStore(state => ({
        amountOfWordsToSend: state.amountOfWordsToSend,
        amountOfTimeBetweenSends: state.amountOfTimeBetweenSends,
        waitingTimeAfterModification: state.waitingTimeAfterModification,
        amountOfWordsRemainAfterCleaned: state.amountOfWordsRemainAfterCleaned,
        setIsPlayingSubTitle: state.setIsPlayingSubTitle
    }));

    const [subtitles, setSubtitles] = useState("");
    const [subtitlesToSend, setSubtitlesToSend] = useState("");
    const [subtitlesHaveWords, setSubtitlesHaveWords] = useState<boolean>(false);
    const [enabledMarking, setEnableMarking] = useState<boolean>(true);
    const [shouldMark, setShouldMark] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [automaticSendFlag, setAutomaticSendFlag] = useState<boolean>(true);
    const subtitlesRef = useRef<string>("")
    const subtitlesToSendRef = useRef<string>("")
    const subtitlesToSentToBackendRef = useRef<string>("")
    const subtitleSpanRef = useRef<HTMLSpanElement>(null);
    const cursorPositionRef = useRef(0);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const clientLocalRef = useRef<Client | null>(null);

    const {
        activeSpan,
        setActiveSpan
    } = useAppStore(state => ({
        activeSpan: state.activeSpan,
        setActiveSpan: state.setActiveSpan
    }));

    const performAction = (key: string) => {
        console.log('Acción ejecutada por combinación de teclas Ctrl + Alt + ' + key);
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
                    },0)
                    performAction(event.key);
                    break;
                case "d":
                    setTimeout(() => {
                        setAutomaticSendFlag(false);
                    },0)
                    performAction(event.key);
                    break;
                default:
                    break;
            }
        }
    };

    const handleSendSubtitles = useCallback(async (data: SubtitleData) => {
        const response: Promise<StandardResponse> = sendSubtitles(data);
        return await response;
    }, []);

    const clearSentSubtitles = () => {
        const words = subtitlesToSendRef.current.split(/\s+/).filter(word => word !== "");
        const wordToStayAfterCleaned = words.slice(words.length - amountOfWordsRemainAfterCleaned, words.length).join(" ") + " ";
        setSubtitlesToSend(wordToStayAfterCleaned);
        subtitlesToSendRef.current = wordToStayAfterCleaned;
    }

    const handleSubtitlesTextChange = (event: React.FormEvent<HTMLSpanElement>) => {
        setIsEditing(true)
        setSubtitles(event.currentTarget.textContent!);
        saveCursorPosition();
    };

    const handleEnterKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
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
        setSubtitlesToSend(prev => prev + " " + wordsToSend);
        setShouldMark(true)
    }

    const getCursorPositionInWords = useCallback((words: string[]) => {
        let position = 0;
        let chars = 0;
        while (chars < cursorPositionRef.current && position < words.length) {
            chars += words[position].length + 1; // +1 for the space or newline between words
            position++;
        }
        return position;
    }, []);

    const saveCursorPosition = useCallback((amountOFCharactersToRest: number = 0) => {
        const selection = window.getSelection();
        if (selection!.rangeCount > 0 && subtitleSpanRef.current) {
            const range = selection!.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(subtitleSpanRef.current!);
            preCaretRange.setEnd(range.startContainer, range.startOffset);
            if (preCaretRange.toString().length - amountOFCharactersToRest > 0) {
                cursorPositionRef.current = preCaretRange.toString().length - amountOFCharactersToRest;
            } else {
                cursorPositionRef.current = 0;
            }
        }
    }, []);

    const restoreCursorPosition = useCallback(() => {

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
    }, []);

    const handleOnClick = () => {
        setEnableMarking(false)
        setActiveSpan(SpanType.FIXER_SPAN)
        saveCursorPosition();
    };


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

        if (!subtitlesHaveWords || !enabledMarking || isEditing) {
            return;
        }

        if (automaticSendFlag) {
            const intervalId = setInterval(() => {
                if (subtitlesRef.current) {
                    let words = subtitlesRef.current.trim().split(/\s+/);
                    let wordsToSend = words.slice(0, amountOfWordsToSend).join(" ") + " ";
                    let remainingWords = words.slice(amountOfWordsToSend).join(" ");
                    saveCursorPosition(wordsToSend.length);
                    setSubtitles(remainingWords);
                    setSubtitlesToSend(prev => prev + " " + wordsToSend);
                    subtitlesToSentToBackendRef.current = wordsToSend
                    setShouldMark(true)
                }
            }, amountOfTimeBetweenSends * 1000);

            return () => {
                clearTimeout(intervalId);
            };
        } else {
            console.log("Automatic send is disabled at asd: ", new Date().toLocaleTimeString())
        }
    }, [automaticSendFlag, isEditing, amountOfTimeBetweenSends, amountOfWordsToSend, subtitlesHaveWords, enabledMarking]);

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
    }, [subtitles]);

    useEffect(() => {
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
        setIsPlayingSubTitle(true);

        return () => {
            client1.deactivate().then();
        };
    }, []);

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

        return () => {
            client.deactivate().then(() => console.log("WebSocket deactivated 1"));
        };
    }, []);

    useEffect(() => {
        const sendSubtitles = () => {
            if (isConnected && clientLocalRef.current && subtitlesToSentToBackendRef.current) {
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

    return (
        <div
            className="border w-full border-gray-400 m-2 rounded-md overflow-y-auto max-h-[600px] min-h-[400px] relative">
            <div className="p-4 space-y-4">
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
                    onBlur={() => {
                        setActiveSpan(SpanType.FIXER_SPAN)
                        saveCursorPosition()
                    }}
                    onFocus={restoreCursorPosition}
                    onKeyDown={handleEnterKeyDown}
                    className={`py-1 my-1 outline-none`}>
                    {subtitles}
                    </span>
            </div>
        </div>
    )
}


export default SubtitlesFixer;



// Revisar luego

// useWebSocket({
//     url: `${BASE_URL}/publisher/ws`,
//     topic: `${BASE_TOPIC}/subtitles/0`,
//     callback: (subtitleMessage: SubtitleMessage) => {
//         if (!isEditing) {
//             const subtitlesArray = subtitleMessage.subtitles;
//             const newText = subtitlesArray
//                 .map(line => line.texts.map(text => text.characters).join(' '))
//                 .join('\n');
//             setSubtitles(prev => prev + '\n' + newText);
//         }
//         setIsPlayingSubTitle(true);
//     }
// });
