# Transcribe Page Deep Dive Analysis

## Overview

The transcribe page (`app/pages/transcribe/page.tsx`) is a comprehensive audio transcription and analysis application built with Next.js and React. It provides a complete workflow for uploading audio files, generating transcriptions with speaker diarization, visualizing the results through interactive waveforms, and performing AI-powered analysis.

## Component Architecture

### 1. Main Page Component (`app/pages/transcribe/page.tsx`)

**Purpose**: Orchestrates the entire transcription workflow and manages global state.

**Key Features**:
- State management for transcription results
- Coordinated component animations using Framer Motion
- Background wrapper integration for consistent theming
- Callback handling for cross-component communication

**State Management**:
```typescript
const [isLoaded, setIsLoaded] = useState(false);
const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
```

**Component Hierarchy**:
1. `BackgroundWrapper` - Provides themed background
2. `PageHeader` - Navigation and branding
3. `AudioWaveform` - Core transcription interface
4. `Summarize` - AI-powered transcript analysis
5. `PromptLlama` - General LLM interaction

---

### 2. AudioWaveform Component (`components/audio_plot/diar-plot.tsx`)

**Purpose**: The centerpiece component handling audio visualization, transcription, and speaker diarization.

#### Core Functionality

**Audio Processing**:
- File upload with validation (size limits, type checking)
- FFmpeg integration for audio compression (files >250MB)
- Waveform generation using Web Audio API
- Real-time audio playback with playback rate control

**Speaker Diarization**:
- RTTM (Rich Transcription Time Marked) format parsing
- Dynamic speaker color assignment
- Speaker label editing with real-time updates
- Legend management for speaker identification

**Data Structures**:
```typescript
export type TranscriptionResult = {
    file_name: string;
    num_speakers: number;
    rttm_lines: string[];
    rttm_merged: string[];
    segments: Array<{
        speaker: string;
        start: number;
        end: number;
        text: string;
    }>;
    speakers: string[];
    transcript: string;
    speaker_colors?: Record<string, string>;
    speakerLegend?: Record<string, Speaker>;
    summary?: string;
};
```

#### Visualization Features

**Interactive Waveform**:
- Chart.js-based visualization with custom annotations
- Click-to-seek functionality
- Zoom controls (zoom in/out/reset)
- Vertical scaling for waveform amplitude
- Real-time playhead with segment highlighting

**Timeline Controls**:
- Global timeline slider
- Jump to beginning/end buttons
- Playback speed cycling (1x, 1.5x, 2x)
- Mute/volume controls

#### Advanced Components

**Speaker Management**:
- Color picker popover for speaker identification
- Real-time label editing with input validation
- Speaker color reset functionality
- Automatic color assignment from predefined palette

**Export Capabilities**:
- RTTM file download
- JSON transcript export
- Plain text transcript download
- Clipboard copy functionality
- ZIP archive creation with multiple formats

---

### 3. Summarize Component (`components/asr_analysis/Summarize.tsx`)

**Purpose**: Provides AI-powered transcript summarization and analysis.

**Key Features**:
- WebSocket connection to summarization endpoint
- Markdown rendering for formatted summaries
- Download functionality for transcript with summary
- Integration with parent component state

**API Integration**:
```typescript
const result = await summarize(transcript);
// Uses WebSocket connection for real-time processing
```

**UI Components**:
- Loading states during processing
- Markdown rendering with custom components
- Export functionality for combined transcript and summary

---

### 4. PromptLlama Component (`components/inference/prompt-llama.tsx`)

**Purpose**: General-purpose LLM interface for custom queries.

**Features**:
- Configurable system and user prompts
- WebSocket-based communication
- Markdown response rendering
- Error handling and loading states

**Markdown Rendering**:
- Custom styled components for headings, lists, code blocks
- Syntax highlighting support
- Responsive design elements

---

### 5. Supporting Components

#### PageHeader (`components/PageHeader.tsx`)
- Animated header with company branding
- Navigation component integration
- Consistent motion timing with page load

#### BackgroundWrapper (`components/BackgroundWrapper.tsx`)
- Dynamic background image support
- Gradient overlay system
- Fixed positioning for parallax effect
- Z-index management for layered content

#### ASR Viewer Components

**SegmentTimeline** (`components/asr_viewer/SegTimeline.tsx`):
- Horizontal timeline visualization
- Segment positioning with dynamic scaling
- Time markers and navigation
- Interactive segment selection

**SegmentsBySpeaker** (`components/asr_viewer/SegBySpeaker.tsx`):
- Grid-based speaker organization
- Scrollable segment lists per speaker
- Color-coded speaker identification
- Click-to-navigate functionality

---

## API Integration

### 1. Transcription API (`app/api/transcribe.ts`)

**Endpoint**: `${API_URL}/transcribe/`
**Method**: POST (FormData)
**Purpose**: Processes audio files and returns speaker-diarized transcript

**Response Structure**:
- Speaker segments with timestamps
- RTTM format data
- Full transcript text
- Speaker identification data

### 2. LLM API (`app/api/llama.ts`)

**WebSocket Endpoints**:
- `/ws/llama` - General LLM prompting
- `/ws/summarize` - Transcript summarization
- `/ws/llama-image` - Image description (unused in this page)

**Communication Pattern**:
```javascript
const ws = new WebSocket(`${API_URL}/ws/llama`);
ws.onopen = () => {
    ws.send(JSON.stringify({
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
    }));
};
```

---

## Data Flow Architecture

### 1. File Upload → Transcription Flow
```
User selects audio file 
    ↓
File validation (size, type)
    ↓
Optional compression (FFmpeg)
    ↓
API call to transcribe endpoint
    ↓
Processing response and state updates
    ↓
Waveform generation and visualization
```

### 2. Speaker Management Flow
```
Initial speaker assignment
    ↓
Color mapping generation
    ↓
User edits speaker labels
    ↓
Real-time state updates across components
    ↓
Chart re-rendering with new colors/labels
```

### 3. Analysis Flow
```
Transcription completion
    ↓
Summary generation request
    ↓
WebSocket communication
    ↓
Markdown rendering of results
    ↓
Export functionality activation
```

---

## Key Technical Features

### 1. Audio Processing
- **Web Audio API** for waveform generation
- **FFmpeg WASM** for client-side compression
- **Real-time playback** with custom controls
- **Adaptive compression** based on file size

### 2. Visualization
- **Chart.js** with custom plugins
- **Dynamic data binding** for speaker colors
- **Interactive click handlers** for navigation
- **Responsive zoom controls**

### 3. State Management
- **Centralized transcription state** in parent component
- **Real-time updates** across child components
- **Callback pattern** for cross-component communication
- **Optimistic UI updates** for speaker changes

### 4. Animation System
- **Framer Motion** for page-level animations
- **Staggered component loading** with custom delays
- **Smooth transitions** for state changes
- **Loading state management**

### 5. Export System
- **Multiple format support** (RTTM, JSON, TXT)
- **Batch download** functionality
- **Clipboard integration**
- **File naming conventions**

---

## File Structure Summary

```
app/pages/transcribe/page.tsx          # Main orchestrator component
components/audio_plot/diar-plot.tsx    # Core audio visualization
components/asr_analysis/Summarize.tsx  # AI summarization
components/inference/prompt-llama.tsx  # LLM interface
components/asr_viewer/
    ├── SegTimeline.tsx               # Timeline visualization
    ├── SegBySpeaker.tsx              # Speaker-grouped segments
    └── TranscriptionSegments.tsx     # Segment list view
components/PageHeader.tsx              # Navigation header
components/BackgroundWrapper.tsx       # Themed background
app/api/
    ├── transcribe.ts                 # Transcription API
    └── llama.ts                      # LLM API integration
```

---

## Performance Considerations

### 1. Audio Processing Optimization
- **Waveform sampling** limited to 10,000 points
- **Debounced updates** for real-time changes
- **Lazy loading** of audio visualization
- **Memory management** for large files

### 2. Component Rendering
- **useMemo hooks** for expensive calculations
- **useCallback** for event handlers
- **Conditional rendering** based on state
- **Chart update optimization**

### 3. API Communication
- **WebSocket connections** for real-time updates
- **Error handling and retry logic**
- **Loading state management**
- **Connection cleanup**

---

## Integration Points

The transcribe page integrates with several external systems:

1. **Backend API** for audio processing and transcription
2. **LLM services** for summarization and analysis
3. **FFmpeg** for client-side audio compression
4. **File system** for download management
5. **Clipboard API** for copy functionality

This architecture provides a comprehensive, user-friendly interface for audio transcription with advanced speaker diarization and AI-powered analysis capabilities.