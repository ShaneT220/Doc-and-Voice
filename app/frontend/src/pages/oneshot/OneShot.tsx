import { useRef, useState, useEffect } from "react";
import { Panel, DefaultButton, Spinner, IconButton } from "@fluentui/react";
import { Mic48Regular, Mic48Filled } from "@fluentui/react-icons";

import styles from "./OneShot.module.css";

import { AskResponse, sendAudioToAPI } from "../../api";
import { Answer, AnswerError } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";
import { AnalysisPanelTabs } from "../../components/AnalysisPanel";
import { SettingsButton } from "../../components/SettingsButton/SettingsButton";

const OneShot = () => {
    const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timeIntervalRef = useRef<number>();
    const elapsedTimeRef = useRef(0);
    const audioQueueRef = useRef<Blob[]>([]);
    const lastQuestionRef = useRef<string>("");
    const [queueLength, setQueueLength] = useState(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<unknown>();
    const [answer, setAnswer] = useState<AskResponse>();
    const [activeCitation, setActiveCitation] = useState<string>();
    const [activeAnalysisPanelTab, setActiveAnalysisPanelTab] = useState<AnalysisPanelTabs | undefined>(undefined);
    let intervalId: number;

    // useEffect(() => {
    //     // Listener or useEffect that runs when the queue is populated
    //     if (audioQueueRef.current.length > 0) {
    //         console.log("hit useEffect")
    //         console.log(audioQueueRef.current)
    //         sendNextAudioInQueue();
    //     }
    // }, [queueLength]);

    const makeApiRequest = async (question: string) => {

    };

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

    function timingAudio(){
        console.log("media recorder start");
        timeIntervalRef.current = setInterval(() => {
        elapsedTimeRef.current += 1;
        console.log("Elapsed time:", elapsedTimeRef.current);
        if (elapsedTimeRef.current >= 10) {
            elapsedTimeRef.current = 0
            addingAudio();
        }
        }, 1000);
    }

    function addingAudio() {
        console.log("Hitting adding audio")
        if(mediaRecorderRef.current){
            mediaRecorderRef.current.requestData();
            mediaRecorderRef.current.ondataavailable = (e) => {
                sendAudioToAPI(new Blob([e.data], { type: 'audio/webm' }));
            }
        }
    }

    const startRecording = () => {
        setIsRecording(true);
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            // Create a new MediaRecorder
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorderRef.current.addEventListener('start', timingAudio);
            mediaRecorderRef.current.start();
          })
          .catch((error) => {
            console.error('Failed to get user media', error);
          });
      };
      
      const stopRecording = (): void => {
        console.log("set to stop");
        if (mediaRecorderRef.current != null) {
            console.log("not null in stop")
            addingAudio()
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.removeEventListener('start', timingAudio)
            clearInterval(timeIntervalRef.current)
            elapsedTimeRef.current = 0;
            setIsRecording(false);
        }
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
                    <div className={styles.oneshotQuestionInput}>
                        <QuestionInput
                            placeholder="Example: Does my plan cover annual eye exams?"
                            disabled={isLoading}
                            onSend={question => makeApiRequest(question)}
                        />
                    </div>
                    <div className={styles.oneShotMicButton}>
                        <IconButton onClick={isRecording ? (stopRecording) : (startRecording)}>
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
