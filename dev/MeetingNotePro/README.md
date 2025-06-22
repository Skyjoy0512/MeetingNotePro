# 📱 MeetingNotePro

AI-powered meeting recording and transcription iOS app

## ✨ Features

### 🎯 Core Functionality
- **🎤 Audio Recording**: High-quality meeting recording with background support
- **📝 Speech-to-Text**: Local transcription using iOS Speech Framework
- **🤖 AI Summarization**: Intelligent meeting summaries powered by Gemini API
- **💬 AskAI**: Interactive Q&A about meeting content
- **📱 Modern UI**: Clean, intuitive SwiftUI interface

### 🏗️ Architecture
- **Clean Architecture + MVVM**: Scalable and maintainable code structure
- **SwiftUI**: Modern declarative UI framework
- **Core Data**: Local data persistence
- **Firebase**: User authentication and cloud sync
- **iOS 15.0+**: Supporting latest iOS features

### 📊 UI Components
- **Home Screen**: 2-column grid display of recording data
- **Audio Player**: Built-in playback controls with progress tracking
- **Processing Pipeline**: Step-by-step transcription → summarization → AskAI
- **Account Management**: Subscription plans and API key configuration

## 🚀 Getting Started

### Prerequisites
- Xcode 15.0+
- iOS 15.0+ deployment target
- Apple Developer Account (for device testing)

### Installation
1. Clone the repository
```bash
git clone https://github.com/yourusername/MeetingNotePro.git
cd MeetingNotePro
```

2. Open in Xcode
```bash
open MeetingNotePro.xcodeproj
```

3. Set up code signing
   - Select your development team in **Signing & Capabilities**
   - Update Bundle Identifier to unique value

4. Build and run
   - **⌘+R** to build and run on simulator
   - Select device for real device testing

## 📱 App Structure

### Tab Navigation
- **🏠 Home**: Recording data list with status indicators
- **➕ Add**: Record new meeting or import audio file
- **👤 Profile**: Account settings and subscription management

### Data Flow
1. **Recording** → Save to local storage
2. **Transcription** → Process with Speech Framework
3. **Summarization** → Generate AI summary via Gemini API
4. **AskAI** → Interactive chat about meeting content

### Key Screens
- `HomeView`: Main data list with 2-column grid
- `RecordingDetailView`: Audio player + transcript/summary tabs
- `AskAIView`: Chat interface for Q&A
- `MyPageView`: Account and subscription management

## 🛠️ Technical Implementation

### Current Status: ✅ UI Complete
- [x] Complete SwiftUI interface
- [x] Tab-based navigation
- [x] Recording data management
- [x] Audio player interface
- [x] Processing pipeline UI
- [x] AskAI chat interface
- [x] Account management screens

### Next Phase: Backend Integration
- [ ] AVFoundation audio recording
- [ ] Speech Framework integration
- [ ] Gemini API implementation
- [ ] Firebase authentication
- [ ] Core Data persistence

## 🎨 Design Highlights

- **Card-based Layout**: Clean recording data presentation
- **Status Indicators**: Visual processing state (未処理/文字起こし済/完了)
- **Progressive Disclosure**: Step-by-step feature unlock
- **Responsive UI**: Optimized for all iPhone sizes
- **Accessibility**: VoiceOver and accessibility support

## 📋 Subscription Model

### 🆓 Free Plan
- 10 transcriptions per month
- Ad-supported
- Basic features

### 💼 User API Plan (¥300/month)
- Unlimited with personal API key
- No ads
- Priority support

### 🌟 Premium Plan (¥500/month)
- 50 summaries + 100 AskAI queries
- Built-in API
- Advanced features

## 🔐 Privacy & Security

- **Local-first**: All recordings stored locally
- **No cloud audio**: Audio never leaves device
- **Secure API**: Keys stored in iOS Keychain
- **Permissions**: Microphone and speech recognition

## 🛡️ Requirements

- iOS 15.0+
- iPhone/iPad compatible
- Microphone access
- Internet for AI features
- Optional: Personal Gemini API key

## 📚 Documentation

- [Setup Instructions](Setup-Instructions.md)
- [Quick Start Guide](Quick-Start-Checklist.md)
- [Firebase Setup](Firebase-Setup-Guide.md)
- [TestFlight Guide](testflight-quick-start.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

- GitHub Issues for bug reports
- Discussions for feature requests
- Email: support@meetingnotepro.com

---

**Built with ❤️ using SwiftUI and modern iOS development practices**