import { useRef, useState, useEffect } from "react";
import { Panel, DefaultButton, Spinner, IconButton } from "@fluentui/react";
import { Mic48Regular, Mic48Filled } from "@fluentui/react-icons";

import styles from "./OneShot.module.css";

import { AskResponse, sendAudioToAPI } from "../../api";
import { Answer, AnswerError } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";
import { AnalysisPanelTabs } from "../../components/AnalysisPanel";
import { SettingsButton } from "../../components/SettingsButton/SettingsButton";

const MAX_TIME = 10

const OneShot = () => {
    const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [fireTheCannon, setFireTheCannon] = useState(true);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timeIntervalRef = useRef<number>();
    const elapsedTimeRef = useRef(0);
    const audioQueueRef = useRef<string[]>([]);
    const lastQuestionRef = useRef<string>("");
    const [queueLength, setQueueLength] = useState(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<unknown>();
    const [answer, setAnswer] = useState<AskResponse>();
    const [activeCitation, setActiveCitation] = useState<string>();
    const [activeAnalysisPanelTab, setActiveAnalysisPanelTab] = useState<AnalysisPanelTabs | undefined>(undefined);
    const recordingStop = useRef(false);
    const [context, setContext] = useState<string[]>([""]) //takes the recording data and puts it into a string array

    const makeApiRequest = async (question: string) => {

    };


    const SpeechRecognition = (window as any).speechRecognition || (window as any).webkitSpeechRecognition;
    var recognition = new SpeechRecognition()

    try {
        recognition = new SpeechRecognition();
        if(recognition != null) {
            recognition.continuous = false;
            recognition.lang = "en-US";
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
        }
    } catch(err) {
        console.log("SpeechRecognition not supported")
        recognition = null;
    }

    const sendNextAudioInQueue = async () => {
        const audioData = audioQueueRef.current[0];
        try {
            // Send the recorded audio to the API and wait for the promise to resolve
            await sendAudioToAPI(audioData);

            // Remove the sent audio from the queue
            audioQueueRef.current.shift();
            setQueueLength(audioQueueRef.current.length);

            // If there are more audio chunks in the queue, send the next one
            if (audioQueueRef.current.length > 0) {
                sendNextAudioInQueue();
            }
        } catch (error) {
            console.error('Failed to send audio to API:', error);
            // Handle the error, if needed
        }
    };

    useEffect(() => {
        if (context[0] !== "") {
            console.log("useEffect bitch:   " + context)
        }

    }, [fireTheCannon])

    function timingAudio(){
        console.log("media recorder start");
        timeIntervalRef.current = setInterval(() => {
        elapsedTimeRef.current += 1;
        if (elapsedTimeRef.current >= MAX_TIME) {
            elapsedTimeRef.current = 0
            setFireTheCannon((prev) => !prev)
        }
        }, 1000);
    }

    function getResults() {
        console.log(context)
    }

    const onResult = () => {
        recognition.onresult = (event: any) => {
            if(!recordingStop.current) {
                setContext((prevContext) => {
                    let finalResult = [""]
                    if(event.results[0].isFinal) {
                        finalResult = [prevContext[0] + " " + event.results[event.results.length - 1][0].transcript]
                    } else {
                        finalResult = [prevContext[0].trim(), " " + event.results[event.results.length - 1][0].transcript]
                    }
                    console.log(finalResult)
                    return finalResult
                })
            }
        }
        recognition.onend = () => {
            if(recordingStop.current) {
                recognition.stop();
            } else {
                recognition.start();
            }
        }
    }

    const startRecording = () => {
        if(recognition == null) {
            console.log("SpeechRecognition not support")
            return
        }
        recordingStop.current = false;
        recognition.start();
        timingAudio();
        onResult();
    };
      
    const stopRecording = () => {
        if(recognition == null) {
            console.log("SpeechRecognition not supported")
            return;
        }
        recordingStop.current = true;
        recognition.stop();
        setIsRecording(false)
    }
        

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
                    <div className={styles.oneshotQuestionInput}>
                        <QuestionInput
                            placeholder="Example: Does my plan cover annual eye exams?"
                            disabled={isLoading}
                            onSend={question => makeApiRequest(question)}
                        />
                    </div>
                    <div className={styles.oneShotMicButton}>
                        <IconButton onClick={isRecording ? (stopRecording) : (
                            () => {
                                setIsRecording(true);
                                startRecording();
                            })}>
                            { isRecording ? (
                                <Mic48Filled/>
                                ):(
                                <Mic48Regular/>
                            )}
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

            </Panel>
        </div>
    );
};

export default OneShot;
