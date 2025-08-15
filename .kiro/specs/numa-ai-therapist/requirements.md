# Requirements Document

## Introduction

Numa is a voice-only CBT-based AI therapist web application designed to provide guided therapy sessions through natural conversation. The application focuses on Cognitive Behavioral Therapy techniques, using cost-effective open source models via HuggingFace API for speech processing and conversation while maintaining user session memory through Supabase. The system emphasizes accessibility through voice-only interaction and provides a calming, therapeutic user experience with rapid deployment capabilities.

## Requirements

### Requirement 1

**User Story:** As a user seeking therapy support, I want to interact with Numa using only my voice, so that I can have a natural, conversational therapy experience without typing.

#### Acceptance Criteria

1. WHEN the user presses and holds the microphone button THEN the system SHALL capture audio input and display a waveform animation
2. WHEN the user releases the microphone button THEN the system SHALL stop recording and process the audio through speech-to-text
3. WHEN audio is successfully transcribed THEN the system SHALL display the transcribed text as subtitles
4. WHEN the AI responds THEN the system SHALL convert the response to speech and play it back to the user
5. IF the user attempts to use text input THEN the system SHALL NOT provide any text input interface

### Requirement 2

**User Story:** As a user in therapy, I want Numa to remember my previous sessions and goals, so that our conversations can build upon past progress and maintain continuity.

#### Acceptance Criteria

1. WHEN a user starts a new session THEN the system SHALL retrieve the last 3 session summaries and current goals from the database
2. WHEN a therapy session ends THEN the system SHALL store a session summary, transcript, and detected emotion in the database
3. WHEN the AI provides a goal THEN the system SHALL store the goal with creation date and status
4. IF a user has no previous sessions THEN the system SHALL start with an introductory CBT session
5. WHEN retrieving user context THEN the system SHALL include user ID, session history, and active goals in the HuggingFace API call

### Requirement 3

**User Story:** As a user receiving therapy, I want Numa to guide me through CBT techniques, so that I can learn to identify, challenge, and replace negative thought patterns.

#### Acceptance Criteria

1. WHEN the user shares a concern THEN Numa SHALL guide them to identify specific thoughts related to the issue
2. WHEN negative thoughts are identified THEN Numa SHALL help the user challenge these thoughts with CBT techniques
3. WHEN thoughts are challenged THEN Numa SHALL guide the user to develop positive alternative thoughts
4. WHEN a session concludes THEN Numa SHALL provide a small, actionable goal for the user
5. WHEN responding THEN Numa SHALL keep responses under 3 sentences and maintain a calm, empathetic tone

### Requirement 4

**User Story:** As a user with varying emotional states, I want Numa to adapt its tone based on my mood, so that I receive appropriate therapeutic support for my current emotional needs.

#### Acceptance Criteria

1. WHEN user speech is transcribed THEN the system SHALL perform sentiment analysis to detect the user's mood
2. IF the user appears sad THEN Numa SHALL adopt a more encouraging and supportive tone
3. IF the user appears anxious THEN Numa SHALL adopt a more focused and grounding tone
4. WHEN mood is detected THEN the system SHALL store the emotion data with the session record
5. WHEN generating responses THEN the AI SHALL consider the detected mood in its therapeutic approach

### Requirement 5

**User Story:** As a user, I want a clean and calming interface, so that I can focus on the therapy session without distractions.

#### Acceptance Criteria

1. WHEN the application loads THEN the interface SHALL display a centered microphone button as the primary interaction element
2. WHEN audio is being processed THEN the system SHALL show a waveform animation to indicate listening state
3. WHEN conversations occur THEN the system SHALL display subtitles for both user and Numa's speech
4. WHEN designing the interface THEN the system SHALL use a calming color palette of light blue, white, and soft gray
5. WHEN the user interacts with the app THEN the interface SHALL remain minimal and distraction-free

### Requirement 6

**User Story:** As a user, I want reliable and fast speech processing, so that my therapy sessions are smooth and responsive.

#### Acceptance Criteria

1. WHEN the user speaks THEN the audio SHALL be processed using HuggingFace Whisper model for speech-to-text conversion
2. WHEN Numa responds THEN the text SHALL be converted to speech using browser Web Speech API or HuggingFace TTS model as fallback
3. WHEN processing audio THEN the system SHALL optimize for speed and cost-effectiveness using open source models
4. IF speech processing fails THEN the system SHALL provide appropriate error handling and retry mechanisms
5. WHEN the application runs THEN it SHALL minimize API costs by using free/low-cost open source models

### Requirement 7

**User Story:** As a user, I want the system to work reliably across different devices and browsers, so that I can access therapy support consistently.

#### Acceptance Criteria

1. WHEN the application loads THEN it SHALL request microphone permissions and handle permission denial gracefully
2. WHEN audio recording starts THEN the system SHALL handle different browser audio APIs appropriately
3. WHEN network issues occur THEN the system SHALL provide clear feedback about connectivity problems
4. IF cloud processing fails THEN the system SHALL display helpful error messages and recovery options
5. WHEN the user accesses the app THEN it SHALL work on modern web browsers with WebRTC support

### Requirement 8

**User Story:** As a product owner, I want the application to be production-ready by September 12th with minimal operational costs, so that we can launch quickly and sustainably.

#### Acceptance Criteria

1. WHEN deploying the application THEN it SHALL use cost-effective open source models to minimize operational expenses
2. WHEN processing speech THEN the system SHALL use HuggingFace Whisper model for reliable transcription at scale
3. WHEN generating conversations THEN the system SHALL use open source therapy-focused language models via HuggingFace API (e.g., Llama 2, Mistral)
4. WHEN generating speech THEN the system SHALL prioritize browser Web Speech API and fallback to HuggingFace TTS models only when necessary
5. WHEN storing data THEN the system SHALL use Supabase free tier efficiently to minimize database costs
6. WHEN making API calls THEN the system SHALL implement rate limiting and caching to reduce HuggingFace API usage costs