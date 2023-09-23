import { useRef, useState, useEffect } from "react";
import { Panel, DefaultButton, Spinner, IconButton } from "@fluentui/react";
import { Label, RadioGroup, Radio } from "@fluentui/react-components";
import { Mic48Regular, Mic48Filled } from "@fluentui/react-icons";

import styles from "./OneShot.module.css";

import { AskResponse, sendTranscriptToAPI } from "../../api";
import { Answer, AnswerError } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";
import { AnalysisPanelTabs } from "../../components/AnalysisPanel";
import { SettingsButton } from "../../components/SettingsButton/SettingsButton";

const MAX_TIME = 60;

const OneShot = () => {
    const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const timeIntervalRef = useRef<number>();
    const elapsedTimeRef = useRef(0);
    // const contextQueueRef = useRef<string[]>([]);
    const lastQuestionRef = useRef<string>("");
    const [queueLength, setQueueLength] = useState(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<unknown>();
    const [answer, setAnswer] = useState<AskResponse>();
    const [activeCitation, setActiveCitation] = useState<string>();
    const [activeAnalysisPanelTab, setActiveAnalysisPanelTab] = useState<AnalysisPanelTabs | undefined>(undefined);
    const recordingStop = useRef(false);
    const [context, setContext] = useState<string[]>([""]); //takes the recording data and puts it into a string array
    const [timerTrigger, setTimerTrigger] = useState(true);
    const [endpoint, setEndpoint] = useState("/processOppose");

    //This function is for making api requests for chat bot functionality
    const makeApiRequest = async (question: string) => {};

    useEffect(() => {
        const sendNextTranscriptInQueue = async () => {
            try {
                const result = context[0];
                setContext(prev => {
                    const editedResult = ["", ...prev];
                    return editedResult;
                });
                const response = await sendTranscriptToAPI(result, endpoint);
                setAnswer(response);
            } catch (error) {}
        };
        if (context[0] !== "") {
            sendNextTranscriptInQueue();
        }
    }, [timerTrigger]);

    const SpeechRecognition = (window as any).speechRecognition || (window as any).webkitSpeechRecognition;
    var recognition = new SpeechRecognition();

    try {
        recognition = new SpeechRecognition();
        if (recognition != null) {
            recognition.continuous = false;
            recognition.lang = "en-US";
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
        }
    } catch (err) {
        console.log("SpeechRecognition not supported");
        recognition = null;
    }

    //     const sendNextTranscriptInQueue = async () => {
    //         try {
    //             const result = context[0];
    //             setContext((prev) => {
    //                 const editedResult = ["", ...prev];
    //                 return editedResult
    //             })
    //             await sendTranscriptToAPI(result);
    //         } catch (error) {

    //         }
    //         if (contextQueueRef.current.length > 0) {
    //             const currentTranscript = contextQueueRef.current[0];
    //             // console.log("Sending Transcript: " + currentTranscript)
    //             try {
    //                 // Send the recorded audio to the API and wait for the promise to resolve
    //                 await sendTranscriptToAPI(currentTranscript);

    //                 // Remove the sent transcript from the queue
    //                 contextQueueRef.current.shift();
    //                 setQueueLength(contextQueueRef.current.length);

    //                 // If there are more transcripts in the queue, send the next one
    //                 sendNextTranscriptInQueue();
    //             } catch (error) {
    //                 console.error('Failed to send transcript to API:', error);
    //                 // Handle the error, if needed
    //             }
    //         }
    // };

    function timingAudio() {
        console.log("media recorder start");
        timeIntervalRef.current = setInterval(() => {
            elapsedTimeRef.current += 1;
            if (elapsedTimeRef.current >= MAX_TIME) {
                setTimerTrigger(prev => !prev);
                elapsedTimeRef.current = 0;
            }
        }, 1000);
    }

    const onResult = () => {
        recognition.onresult = (event: any) => {
            if (!recordingStop.current) {
                setContext(prevContext => {
                    let finalResult = [""];
                    if (event.results[0].isFinal) {
                        finalResult = [prevContext[0] + " " + event.results[event.results.length - 1][0].transcript];
                    } else {
                        finalResult = [prevContext[0].trim(), " " + event.results[event.results.length - 1][0].transcript];
                    }
                    return finalResult;
                });
            }
        };
        recognition.onend = () => {
            if (recordingStop.current) {
                recognition.stop();
            } else {
                recognition.start();
            }
        };
    };

    //experimental function to stop recorder
    function stopTimingAudio() {
        console.log("media recorder stop");
        clearInterval(timeIntervalRef.current); //this should stop the timer of the current interval we are working with
        elapsedTimeRef.current = 0; // reset the elapsed time to zero
    }
    const startRecording = () => {
        if (recognition == null) {
            console.log("SpeechRecognition not support");
            return;
        }
        recordingStop.current = false;
        recognition.start();
        timingAudio();
        onResult();
    };

    const stopRecording = () => {
        if (recognition == null) {
            console.log("SpeechRecognition not supported");
            return;
        }
        recordingStop.current = true;
        recognition.stop();
        setIsRecording(false);
        stopTimingAudio(); // use function to stop recording
    };

    const onShowCitation = (citation: string) => {
        if (activeCitation === citation && activeAnalysisPanelTab === AnalysisPanelTabs.CitationTab) {
            setActiveAnalysisPanelTab(undefined);
        } else {
            setActiveCitation(citation);
            setActiveAnalysisPanelTab(AnalysisPanelTabs.CitationTab);
        }
    };

    const onToggleTab = (tab: AnalysisPanelTabs) => {
        if (activeAnalysisPanelTab === tab) {
            setActiveAnalysisPanelTab(undefined);
        } else {
            setActiveAnalysisPanelTab(tab);
        }
    };

    return (
        <div className={styles.oneshotContainer}>
            <div className={styles.oneshotTopSection}>
                <SettingsButton className={styles.settingsButton} onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)} />
                <h1 className={styles.oneshotTitle}>Ask your data</h1>
                <div className={styles.oneShotActionLine}>
                    {/* <div className={styles.oneshotQuestionInput}>
                        <QuestionInput
                            placeholder="Example: Does my plan cover annual eye exams?"
                            disabled={isLoading}
                            onSend={question => makeApiRequest(question)}
                        />
                    </div> */}
                    <div className={styles.oneShotMicButton}>
                        <IconButton
                            onClick={
                                isRecording
                                    ? stopRecording
                                    : () => {
                                          setIsRecording(true);
                                          startRecording();
                                      }
                            }
                        >
                            {isRecording ? <Mic48Regular /> : <Mic48Filled />}
                        </IconButton>
                    </div>
                </div>
            </div>
            <div className={styles.oneshotBottomSection}>
                {isLoading && <Spinner label="Generating answer" />}
                {/* {!lastQuestionRef.current && <ExampleList onExampleClicked={onExampleClicked} />} */}
                {!isLoading && answer && !error && (
                    <div className={styles.oneshotAnswerContainer}>
                        <Answer
                            answer={answer}
                            onCitationClicked={x => onShowCitation(x)}
                            onThoughtProcessClicked={() => onToggleTab(AnalysisPanelTabs.ThoughtProcessTab)}
                            onSupportingContentClicked={() => onToggleTab(AnalysisPanelTabs.SupportingContentTab)}
                        />
                    </div>
                )}
                {error ? (
                    <div className={styles.oneshotAnswerContainer}>
                        <AnswerError error={error.toString()} onRetry={() => makeApiRequest(lastQuestionRef.current)} />
                    </div>
                ) : null}
            </div>

            <Panel
                headerText="Recording Settings"
                isOpen={isConfigPanelOpen}
                isBlocking={false}
                onDismiss={() => setIsConfigPanelOpen(false)}
                closeButtonAriaLabel="Close"
                onRenderFooterContent={() => <DefaultButton onClick={() => setIsConfigPanelOpen(false)}>Close</DefaultButton>}
                isFooterAtBottom={true}
            >
                <Label>Find:</Label>
                <RadioGroup value={endpoint} onChange={(_, data) => setEndpoint(data.value)}>
                    <Radio value="/processOppose" label="Oppose" />
                    <Radio value="/processSupport" label="Support" />
                    <Radio value="/processSummarize" label="Summarize" />
                    <Radio value="/processEverything" label="Everything" />
                </RadioGroup>
            </Panel>
        </div>
    );
};

export default OneShot;
