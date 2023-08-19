import { useRef, useState, useEffect } from "react";
import { Panel, DefaultButton, Spinner, IconButton } from "@fluentui/react";
import { Mic48Regular, Mic48Filled } from "@fluentui/react-icons";

import styles from "./OneShot.module.css";

import { AskResponse, sendTranscriptToAPI } from "../../api";
import { Answer, AnswerError } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";
import { AnalysisPanelTabs } from "../../components/AnalysisPanel";
import { SettingsButton } from "../../components/SettingsButton/SettingsButton";

const MAX_TIME = 10

const OneShot = () => {
    const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const timeIntervalRef = useRef<number>();
    const elapsedTimeRef = useRef(0);
    const contextQueueRef = useRef<string[]>([]);
    const lastQuestionRef = useRef<string>("");
    const [queueLength, setQueueLength] = useState(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<unknown>();
    const [answer, setAnswer] = useState<AskResponse>();
    const [activeCitation, setActiveCitation] = useState<string>();
    const [activeAnalysisPanelTab, setActiveAnalysisPanelTab] = useState<AnalysisPanelTabs | undefined>(undefined);
    const recordingStop = useRef(false);
    const [context, setContext] = useState<string[]>([""]) //takes the recording data and puts it into a string array
    
    //This function is for making api requests for chat bot functionality
    const makeApiRequest = async (question: string) => {

    };
    
    
    
    
    useEffect(() => {
    // if the queue is populated
    if (contextQueueRef.current.length > 0) {
        sendNextTranscriptInQueue();
    }
}, [contextQueueRef.current.length]);


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

    /* 
        ToDo:
         1. When the timer hits 10 seconds take the context that is captured in the context useState (context[0]) to get the mosty recent context that was captured.
         2. Push the recent context to the contextQueueRef ref which is the queue we are going to need
         3. Set the context (context[0]) to an empty string.
         4. Make a useEffect that watches the length on the contextQueueRef and when the queue is populated run sendNextTranscriptInQueue function which will take the queue and start sending it to the api
        
        When the api fires and show the most recent text that was sent you will see the api call print the context to the console on the browser.
        If you could figure out a better way that doesn't use a useEffect at all by all means you have freedom to make any changes you want.
        If you get stuck or not sure what to do I'll be online tomorrow and can answer any questions.
    */

    const sendNextTranscriptInQueue = async () => {
        if (contextQueueRef.current.length > 0) {
            const currentTranscript = contextQueueRef.current[0];
    
            try {
                // Send the recorded audio to the API and wait for the promise to resolve
                await sendTranscriptToAPI(currentTranscript);
    
                // Remove the sent transcript from the queue
                contextQueueRef.current.shift();
                setQueueLength(contextQueueRef.current.length);
    
                // If there are more transcripts in the queue, send the next one
                sendNextTranscriptInQueue();
            } catch (error) {
                console.error('Failed to send transcript to API:', error);
                // Handle the error, if needed
            }
        }
};

    function timingAudio(){
        console.log("media recorder start");
        timeIntervalRef.current = setInterval(() => {
        elapsedTimeRef.current += 1;
        if (elapsedTimeRef.current >= MAX_TIME) {
            elapsedTimeRef.current = 0

            // save most recent context
            const recentContext = context[0];

            // Push the recent context to the queue
            contextQueueRef.current.push(recentContext);

            // Clear
            setContext([""]);
        }
    }, 1000);
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
    
    //experimental function to stop recorder
    function stopTimingAudio() {
        console.log("media recorder stop");
        clearInterval(timeIntervalRef.current); //this should stop the timer of the current interval we are working with 
        elapsedTimeRef.current = 0;// reset the elapsed time to zero
    
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
        stopTimingAudio() // use function to stop recording
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
