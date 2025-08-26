import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Play, Pause, Download, Volume2, Languages } from 'lucide-react';
import toast from 'react-hot-toast';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string, audioBlob: Blob, language: string) => void;
  isDisabled?: boolean;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error?: SpeechRecognitionError;
}

interface SpeechRecognitionError {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'hi-IN', name: 'हिंदी (Hindi)', flag: '🇮🇳' },
  { code: 'te-IN', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
];

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  onTranscriptionComplete, 
  isDisabled = false 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[0]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check for browser support
  const isSpeechRecognitionSupported = () => {
    return typeof window !== 'undefined' && 
           (window.SpeechRecognition || window.webkitSpeechRecognition);
  };

  const isMediaRecorderSupported = () => {
    return typeof window !== 'undefined' && window.MediaRecorder;
  };

  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      toast.error('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (!isMediaRecorderSupported()) {
      toast.error('Audio recording is not supported in this browser.');
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      speechRecognitionRef.current = new SpeechRecognition();
      speechRecognitionRef.current.continuous = true;
      speechRecognitionRef.current.interimResults = true;
      speechRecognitionRef.current.lang = selectedLanguage.code;

      speechRecognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscriptionText(prev => {
          const newText = prev + finalTranscript;
          return newText;
        });
      };

      speechRecognitionRef.current.onerror = (event: SpeechRecognitionEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error?.error === 'no-speech') {
          toast.error('No speech detected. Please try speaking closer to the microphone.');
        } else if (event.error?.error === 'network') {
          toast.error('Network error during speech recognition.');
        } else {
          toast.error('Speech recognition error. Please try again.');
        }
        setIsTranscribing(false);
      };

      speechRecognitionRef.current.onend = () => {
        setIsTranscribing(false);
      };
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [selectedLanguage, audioUrl]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      // Reset previous recording
      setTranscriptionText('');
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setRecordingTime(0);
      audioChunksRef.current = [];

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });

      // Setup media recorder - prefer MP3/MP4 formats for better compatibility
      const supportedTypes = [
        'audio/mp4',
        'audio/mpeg', 
        'audio/wav',
        'audio/webm;codecs=opus',
        'audio/webm'
      ];
      
      let selectedMimeType = 'audio/webm'; // fallback
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }
      
      console.log('Using MIME type:', selectedMimeType);
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      };

      // Start recording
      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsPaused(false);
      startTimer();

      // Start speech recognition
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.lang = selectedLanguage.code;
        speechRecognitionRef.current.start();
        setIsTranscribing(true);
      }

      toast.success(`Started recording in ${selectedLanguage.name}`);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please allow microphone access.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();

      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        setIsTranscribing(false);
      }

      toast.success('Recording paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();

      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.start();
        setIsTranscribing(true);
      }

      toast.success('Recording resumed');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      stopTimer();

      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        setIsTranscribing(false);
      }

      toast.success('Recording completed');
    }
  };

  const playAudio = () => {
    if (audioUrl && audioElementRef.current) {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    }
  };

  const downloadAudio = () => {
    if (audioUrl && audioBlob) {
      // Determine file extension based on blob type
      let extension = 'webm';
      if (audioBlob.type.includes('mp4')) extension = 'm4a';
      else if (audioBlob.type.includes('wav')) extension = 'wav';
      else if (audioBlob.type.includes('mpeg')) extension = 'mp3';
      
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `voice-memo-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleSaveRecording = () => {
    if (audioBlob && transcriptionText.trim()) {
      onTranscriptionComplete(transcriptionText.trim(), audioBlob, selectedLanguage.code);
      // Reset the recorder
      setTranscriptionText('');
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setRecordingTime(0);
      toast.success('Voice memo saved successfully!');
    } else if (!transcriptionText.trim()) {
      toast.error('No transcription available. Please try recording again.');
    } else {
      toast.error('No audio recorded. Please try again.');
    }
  };

  if (!isSpeechRecognitionSupported() || !isMediaRecorderSupported()) {
    return (
      <div className="glass-card rounded-xl p-6 text-center">
        <Mic className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600">Voice recording is not supported in this browser.</p>
        <p className="text-sm text-slate-500 mt-1">Please use Chrome, Edge, or Safari for voice features.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Language Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowLanguageSelector(!showLanguageSelector)}
          disabled={isRecording || isDisabled}
          className="flex items-center space-x-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-lg hover:bg-white transition-all duration-200 disabled:opacity-50"
        >
          <Languages className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">
            {selectedLanguage.flag} {selectedLanguage.name}
          </span>
        </button>

        <AnimatePresence>
          {showLanguageSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl z-10"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLanguage(lang);
                    setShowLanguageSelector(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                    selectedLanguage.code === lang.code ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recording Controls */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-center space-x-4 mb-6">
          {!isRecording ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startRecording}
              disabled={isDisabled}
              className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
            >
              <Mic className="w-6 h-6" />
            </motion.button>
          ) : (
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isPaused ? resumeRecording : pauseRecording}
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-full shadow-lg transition-all duration-200"
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopRecording}
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-full shadow-lg transition-all duration-200"
              >
                <Square className="w-5 h-5" />
              </motion.button>
            </div>
          )}
        </div>

        {/* Recording Status */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            {isRecording && (
              <div className="flex items-center space-x-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-3 h-3 bg-red-500 rounded-full"
                />
                <span className="text-sm font-medium text-red-600">
                  {isPaused ? 'Paused' : 'Recording'}
                </span>
              </div>
            )}
            {isTranscribing && (
              <div className="flex items-center space-x-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"
                />
                <span className="text-sm text-blue-600">Transcribing...</span>
              </div>
            )}
          </div>
          
          {recordingTime > 0 && (
            <div className="text-2xl font-mono font-bold text-slate-700">
              {formatTime(recordingTime)}
            </div>
          )}
        </div>
      </div>

      {/* Audio Playback */}
      {audioUrl && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={isPlaying ? pauseAudio : playAudio}
                className="flex items-center justify-center w-10 h-10 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-full transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-600">Recorded Audio</span>
              </div>
            </div>
            <button
              onClick={downloadAudio}
              className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
          
          <audio
            ref={audioElementRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}

      {/* Transcription Display */}
      {transcriptionText && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Transcription</h3>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
              {transcriptionText}
            </p>
          </div>
        </div>
      )}

      {/* Save Button */}
      {audioBlob && transcriptionText && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSaveRecording}
          disabled={isDisabled}
          className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          <Mic className="w-5 h-5" />
          <span>Save Voice Memo</span>
        </motion.button>
      )}
    </div>
  );
};
