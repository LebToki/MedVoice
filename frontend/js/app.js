/**
 * MedVoice Companion - Main Application Logic
 * Handles document analysis, voice interaction, and TTS
 */

class MedVoiceApp {
    constructor() {
        this.currentFile = null;
        this.currentResult = null;
        this.isListening = false;
        this.isSpeaking = false;
        this.speechSynthesis = window.speechSynthesis;
        this.speechRecognition = null;
        this.currentUtterance = null;
        
        // Settings
        this.settings = {
            language: 'en',
            simplifyLevel: 2,
            autoRead: true,
            speechRate: 0.9,
            highContrast: false,
            largeText: false
        };
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.bindEvents();
        this.initSpeechRecognition();
        this.checkAPIHealth();
    }
    
    // ==========================================
    // Settings Management
    // ==========================================
    
    loadSettings() {
        const saved = localStorage.getItem('medvoice_settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        this.applySettings();
    }
    
    saveSettings() {
        localStorage.setItem('medvoice_settings', JSON.stringify(this.settings));
        this.applySettings();
    }
    
    applySettings() {
        document.body.classList.toggle('high-contrast', this.settings.highContrast);
        document.body.classList.toggle('large-text', this.settings.largeText);
        
        // Update UI elements
        const highContrastToggle = document.getElementById('highContrastToggle');
        const largeTextToggle = document.getElementById('largeTextToggle');
        const autoReadToggle = document.getElementById('autoReadToggle');
        const speechRate = document.getElementById('speechRate');
        const defaultLanguage = document.getElementById('defaultLanguage');
        const defaultSimplicity = document.getElementById('defaultSimplicity');
        
        if (highContrastToggle) highContrastToggle.checked = this.settings.highContrast;
        if (largeTextToggle) largeTextToggle.checked = this.settings.largeText;
        if (autoReadToggle) autoReadToggle.checked = this.settings.autoRead;
        if (speechRate) speechRate.value = this.settings.speechRate;
        if (defaultLanguage) defaultLanguage.value = this.settings.language;
        if (defaultSimplicity) defaultSimplicity.value = this.settings.simplifyLevel;
    }
    
    // ==========================================
    // Event Bindings
    // ==========================================
    
    bindEvents() {
        // Quick Actions
        document.querySelectorAll('.action-card').forEach(card => {
            card.addEventListener('click', () => this.handleAction(card.dataset.action));
        });
        
        // File Upload
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        
        if (dropZone) {
            dropZone.addEventListener('click', () => fileInput?.click());
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length) this.handleFile(files[0]);
            });
        }
        
        fileInput?.addEventListener('change', (e) => {
            if (e.target.files.length) this.handleFile(e.target.files[0]);
        });
        
        // Remove File
        document.getElementById('removeFile')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearFile();
        });
        
        // Close Buttons
        document.getElementById('closeUpload')?.addEventListener('click', () => this.hideUploadSection());
        document.getElementById('closeText')?.addEventListener('click', () => this.hideTextSection());
        document.getElementById('closeResults')?.addEventListener('click', () => this.hideResultsSection());
        document.getElementById('closeVoice')?.addEventListener('click', () => this.hideVoiceSection());
        
        // Analyze Buttons
        document.getElementById('analyzeBtn')?.addEventListener('click', () => this.analyzeImage());
        document.getElementById('analyzeTextBtn')?.addEventListener('click', () => this.analyzeText());
        
        // Voice Controls
        document.getElementById('speakBtn')?.addEventListener('click', () => this.speak());
        document.getElementById('pauseBtn')?.addEventListener('click', () => this.pauseSpeech());
        document.getElementById('voiceCircle')?.addEventListener('click', () => this.toggleVoiceInput());
        document.getElementById('voiceQuestionBtn')?.addEventListener('click', () => this.startVoiceQuestion());
        
        // Question Input
        document.getElementById('askBtn')?.addEventListener('click', () => this.askQuestion());
        document.getElementById('questionInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.askQuestion();
        });
        
        // Copy & Share
        document.getElementById('copyBtn')?.addEventListener('click', () => this.copyResults());
        document.getElementById('shareBtn')?.addEventListener('click', () => this.shareResults());
        
        // Accessibility Panel
        document.getElementById('accessibilityBtn')?.addEventListener('click', () => this.toggleAccessibilityPanel());
        document.getElementById('highContrastToggle')?.addEventListener('change', (e) => {
            this.settings.highContrast = e.target.checked;
            this.saveSettings();
        });
        document.getElementById('largeTextToggle')?.addEventListener('change', (e) => {
            this.settings.largeText = e.target.checked;
            this.saveSettings();
        });
        document.getElementById('autoReadToggle')?.addEventListener('change', (e) => {
            this.settings.autoRead = e.target.checked;
            this.saveSettings();
        });
        document.getElementById('speechRate')?.addEventListener('input', (e) => {
            this.settings.speechRate = parseFloat(e.target.value);
            this.saveSettings();
        });
        
        // Settings Panel
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.toggleSettingsPanel());
        document.getElementById('defaultLanguage')?.addEventListener('change', (e) => {
            this.settings.language = e.target.value;
            this.saveSettings();
        });
        document.getElementById('defaultSimplicity')?.addEventListener('change', (e) => {
            this.settings.simplifyLevel = parseInt(e.target.value);
            this.saveSettings();
        });
        
        // Close panels when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.accessibility-panel') && !e.target.closest('#accessibilityBtn')) {
                document.getElementById('accessibilityPanel')?.setAttribute('hidden', '');
            }
            if (!e.target.closest('.settings-panel') && !e.target.closest('#settingsBtn')) {
                document.getElementById('settingsPanel')?.setAttribute('hidden', '');
            }
        });
    }
    
    // ==========================================
    // Speech Recognition
    // ==========================================
    
    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.speechRecognition = new SpeechRecognition();
            this.speechRecognition.continuous = false;
            this.speechRecognition.interimResults = true;
            this.speechRecognition.lang = this.settings.language === 'en' ? 'en-US' : this.settings.language;
            
            this.speechRecognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                
                document.getElementById('transcriptText').textContent = transcript;
                document.getElementById('voiceTranscript')?.removeAttribute('hidden');
                
                if (event.results[event.results.length - 1].isFinal) {
                    // Process the final transcript
                    this.processVoiceInput(transcript);
                }
            };
            
            this.speechRecognition.onend = () => {
                this.isListening = false;
                document.getElementById('voiceCircle')?.classList.remove('listening');
                document.getElementById('voiceStatus').textContent = 'Tap to start speaking';
            };
            
            this.speechRecognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.showToast('Voice recognition error: ' + event.error, 'error');
            };
        }
    }
    
    toggleVoiceInput() {
        if (!this.speechRecognition) {
            this.showToast('Voice recognition not supported in this browser', 'error');
            return;
        }
        
        if (this.isListening) {
            this.speechRecognition.stop();
        } else {
            this.speechRecognition.start();
            this.isListening = true;
            document.getElementById('voiceCircle')?.classList.add('listening');
            document.getElementById('voiceStatus').textContent = 'Listening...';
        }
    }
    
    startVoiceQuestion() {
        this.showVoiceSection();
        setTimeout(() => this.toggleVoiceInput(), 300);
    }
    
    async processVoiceInput(transcript) {
        // Ask the question based on voice input
        document.getElementById('questionInput').value = transcript;
        await this.askQuestion();
    }
    
    // ==========================================
    // Text-to-Speech (Server + Browser Fallback)
    // ==========================================
    
    async speak(text = null) {
        // If already speaking, stop
        if (this.isSpeaking) {
            this.stopSpeaking();
            return;
        }
        
        const audioText = text || this.currentResult?.audio_text || this.currentResult?.explanation;
        if (!audioText) {
            this.showToast('No text to read', 'info');
            return;
        }
        
        this.isSpeaking = true;
        this.updateSpeakButton(true);
        
        // Try server-side TTS first (high quality)
        try {
            const formData = new FormData();
            formData.append('text', audioText);
            formData.append('language', this.settings.language);
            formData.append('rate', this.settings.speechRate.toString());
            
            const response = await fetch('/api/tts/speak', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success && data.audio) {
                // Play server-generated audio
                await this.playServerAudio(data.audio, data.format);
                return;
            }
            
            // Fallback to browser TTS
            if (data.fallback) {
                console.log('Using browser TTS fallback');
                this.speakWithBrowser(data.text || audioText);
                return;
            }
        } catch (error) {
            console.error('Server TTS error:', error);
        }
        
        // Final fallback: browser TTS
        this.speakWithBrowser(audioText);
    }
    
    async playServerAudio(base64Audio, format = 'mp3') {
        return new Promise((resolve, reject) => {
            try {
                // Create audio from base64
                const audioData = `data:audio/${format};base64,${base64Audio}`;
                
                // Stop any existing audio
                if (this.currentAudio) {
                    this.currentAudio.pause();
                    this.currentAudio = null;
                }
                
                this.currentAudio = new Audio(audioData);
                this.currentAudio.playbackRate = 1.0;
                
                this.currentAudio.onended = () => {
                    this.isSpeaking = false;
                    this.updateSpeakButton(false);
                    resolve();
                };
                
                this.currentAudio.onerror = (e) => {
                    console.error('Audio playback error:', e);
                    this.isSpeaking = false;
                    this.updateSpeakButton(false);
                    reject(e);
                };
                
                this.currentAudio.play();
                this.showToast('Playing high-quality voice...', 'success');
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    speakWithBrowser(text) {
        if (!this.speechSynthesis) {
            this.showToast('Text-to-speech not supported', 'error');
            this.isSpeaking = false;
            this.updateSpeakButton(false);
            return;
        }
        
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance.rate = this.settings.speechRate;
        this.currentUtterance.lang = this.getLanguageCode(this.settings.language);
        
        this.currentUtterance.onend = () => {
            this.isSpeaking = false;
            this.updateSpeakButton(false);
        };
        
        this.currentUtterance.onerror = (event) => {
            console.error('Speech error:', event);
            this.isSpeaking = false;
            this.updateSpeakButton(false);
        };
        
        this.speechSynthesis.speak(this.currentUtterance);
    }
    
    stopSpeaking() {
        // Stop server audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        
        // Stop browser TTS
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
        
        this.isSpeaking = false;
        this.updateSpeakButton(false);
    }
    
    pauseSpeech() {
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
        } else if (this.currentAudio && this.currentAudio.paused) {
            this.currentAudio.play();
        } else if (this.speechSynthesis.speaking) {
            if (this.speechSynthesis.paused) {
                this.speechSynthesis.resume();
            } else {
                this.speechSynthesis.pause();
            }
        }
    }
    
    updateSpeakButton(speaking) {
        const speakBtn = document.getElementById('speakBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (speakBtn) {
            speakBtn.innerHTML = speaking 
                ? '<i class="fas fa-stop"></i>' 
                : '<i class="fas fa-volume-up"></i>';
        }
        
        if (pauseBtn) {
            pauseBtn.hidden = !speaking;
        }
    }
    
    getLanguageCode(lang) {
        const codes = {
            'en': 'en-US',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'ar': 'ar-SA',
            'zh': 'zh-CN'
        };
        return codes[lang] || 'en-US';
    }
    
    // ==========================================
    // UI Navigation
    // ==========================================
    
    handleAction(action) {
        switch (action) {
            case 'upload':
                this.showUploadSection();
                break;
            case 'camera':
                this.openCamera();
                break;
            case 'voice':
                this.showVoiceSection();
                break;
        }
    }
    
    showUploadSection() {
        document.getElementById('uploadSection')?.classList.add('active');
        document.getElementById('heroSection')?.classList.add('minimized');
    }
    
    hideUploadSection() {
        document.getElementById('uploadSection')?.classList.remove('active');
        document.getElementById('heroSection')?.classList.remove('minimized');
        this.clearFile();
    }
    
    showTextSection() {
        document.getElementById('textSection')?.removeAttribute('hidden');
    }
    
    hideTextSection() {
        document.getElementById('textSection')?.setAttribute('hidden', '');
    }
    
    showResultsSection() {
        document.getElementById('resultsSection')?.removeAttribute('hidden');
        document.getElementById('resultsSection')?.scrollIntoView({ behavior: 'smooth' });
    }
    
    hideResultsSection() {
        document.getElementById('resultsSection')?.setAttribute('hidden', '');
        this.currentResult = null;
    }
    
    showVoiceSection() {
        document.getElementById('voiceSection')?.removeAttribute('hidden');
        document.getElementById('voiceSection')?.scrollIntoView({ behavior: 'smooth' });
    }
    
    hideVoiceSection() {
        document.getElementById('voiceSection')?.setAttribute('hidden', '');
        if (this.isListening) {
            this.speechRecognition?.stop();
        }
    }
    
    toggleAccessibilityPanel() {
        const panel = document.getElementById('accessibilityPanel');
        if (panel?.hidden) {
            panel.removeAttribute('hidden');
        } else {
            panel?.setAttribute('hidden', '');
        }
        // Close settings panel
        document.getElementById('settingsPanel')?.setAttribute('hidden', '');
    }
    
    toggleSettingsPanel() {
        const panel = document.getElementById('settingsPanel');
        if (panel?.hidden) {
            panel.removeAttribute('hidden');
        } else {
            panel?.setAttribute('hidden', '');
        }
        // Close accessibility panel
        document.getElementById('accessibilityPanel')?.setAttribute('hidden', '');
    }
    
    openCamera() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.setAttribute('capture', 'environment');
            fileInput.click();
            // Remove capture attribute after to allow normal file selection
            setTimeout(() => fileInput.removeAttribute('capture'), 100);
        }
    }
    
    // ==========================================
    // File Handling
    // ==========================================
    
    handleFile(file) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            this.showToast('Please upload an image (JPG, PNG, WebP) or PDF', 'error');
            return;
        }
        
        this.currentFile = file;
        
        // Show preview
        const previewContainer = document.getElementById('filePreview');
        const placeholder = document.querySelector('.upload-placeholder');
        const previewImage = document.getElementById('previewImage');
        const fileName = document.getElementById('fileName');
        
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (previewImage) previewImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            // PDF - show icon instead
            if (previewImage) previewImage.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6M9 13h6M9 17h3"/></svg>';
        }
        
        if (fileName) fileName.textContent = file.name;
        placeholder?.setAttribute('hidden', '');
        previewContainer?.removeAttribute('hidden');
        
        // Enable analyze button
        document.getElementById('analyzeBtn')?.removeAttribute('disabled');
    }
    
    clearFile() {
        this.currentFile = null;
        
        const previewContainer = document.getElementById('filePreview');
        const placeholder = document.querySelector('.upload-placeholder');
        const fileInput = document.getElementById('fileInput');
        
        previewContainer?.setAttribute('hidden', '');
        placeholder?.removeAttribute('hidden');
        if (fileInput) fileInput.value = '';
        
        document.getElementById('analyzeBtn')?.setAttribute('disabled', '');
    }
    
    // ==========================================
    // API Calls
    // ==========================================
    
    async checkAPIHealth() {
        try {
            const response = await fetch('/health');
            const data = await response.json();
            
            if (!data.gemini_connected) {
                this.showToast('AI service not connected. Check API key.', 'warning');
            }
        } catch (error) {
            console.error('Health check failed:', error);
        }
    }
    
    async analyzeImage() {
        if (!this.currentFile) {
            this.showToast('Please upload a document first', 'error');
            return;
        }
        
        this.showLoading('Analyzing your document...');
        
        const formData = new FormData();
        formData.append('file', this.currentFile);
        formData.append('document_type', document.getElementById('documentType')?.value || 'general');
        formData.append('language', document.getElementById('language')?.value || 'en');
        formData.append('simplify_level', document.getElementById('simplifyLevel')?.value || '2');
        
        try {
            const response = await fetch('/api/analyze/image', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            this.hideLoading();
            
            if (data.success) {
                this.currentResult = data;
                this.displayResults(data);
                this.hideUploadSection();
                this.showResultsSection();
                
                if (this.settings.autoRead) {
                    setTimeout(() => this.speak(), 500);
                }
            } else {
                this.showToast('Analysis failed: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Analysis error:', error);
            this.showToast('Failed to analyze document. Please try again.', 'error');
        }
    }
    
    async analyzeText() {
        const textInput = document.getElementById('textInput');
        const text = textInput?.value?.trim();
        
        if (!text) {
            this.showToast('Please enter some text to analyze', 'error');
            return;
        }
        
        this.showLoading('Analyzing your text...');
        
        const requestData = {
            text: text,
            document_type: document.getElementById('textDocType')?.value || 'general',
            language: document.getElementById('textLanguage')?.value || 'en',
            simplify_level: parseInt(document.getElementById('simplifyLevel')?.value || '2')
        };
        
        try {
            const response = await fetch('/api/analyze/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            const data = await response.json();
            this.hideLoading();
            
            if (data.success) {
                this.currentResult = data;
                this.displayResults(data);
                this.hideTextSection();
                this.showResultsSection();
                
                if (this.settings.autoRead) {
                    setTimeout(() => this.speak(), 500);
                }
            } else {
                this.showToast('Analysis failed: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Analysis error:', error);
            this.showToast('Failed to analyze text. Please try again.', 'error');
        }
    }
    
    async askQuestion() {
        const questionInput = document.getElementById('questionInput');
        const question = questionInput?.value?.trim();
        
        if (!question) {
            this.showToast('Please enter a question', 'error');
            return;
        }
        
        this.showLoading('Finding an answer...');
        
        const requestData = {
            question: question,
            context: this.currentResult?.explanation || null,
            language: this.settings.language
        };
        
        try {
            const response = await fetch('/api/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            const data = await response.json();
            this.hideLoading();
            
            if (data.success) {
                // Display answer
                const voiceResponse = document.getElementById('voiceResponse');
                const responseContent = document.getElementById('responseContent');
                
                if (responseContent) {
                    responseContent.innerHTML = `
                        <p><strong>Your question:</strong> ${question}</p>
                        <p><strong>Answer:</strong> ${data.answer}</p>
                        ${data.follow_up_questions?.length ? `
                            <p><strong>You might also ask:</strong></p>
                            <ul>${data.follow_up_questions.map(q => `<li>${q}</li>`).join('')}</ul>
                        ` : ''}
                    `;
                }
                
                voiceResponse?.removeAttribute('hidden');
                
                // Clear input
                if (questionInput) questionInput.value = '';
                
                // Auto-read if enabled
                if (this.settings.autoRead) {
                    this.speak(data.audio_text);
                }
            } else {
                this.showToast('Could not get an answer. Please try again.', 'error');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Question error:', error);
            this.showToast('Failed to get answer. Please try again.', 'error');
        }
    }
    
    // ==========================================
    // Display Results
    // ==========================================
    
    displayResults(data) {
        // Summary
        document.getElementById('resultSummary').textContent = data.summary;
        
        // Warnings
        const warningCard = document.getElementById('warningCard');
        const warningList = document.getElementById('warningList');
        
        if (data.warnings?.length) {
            warningList.innerHTML = data.warnings.map(w => `<li>${w}</li>`).join('');
            warningCard?.removeAttribute('hidden');
        } else {
            warningCard?.setAttribute('hidden', '');
        }
        
        // Lab Values
        const labCard = document.getElementById('labCard');
        const labGrid = document.getElementById('labValuesGrid');
        
        if (data.lab_values?.length) {
            labGrid.innerHTML = data.lab_values.map(lab => `
                <div class="lab-value-item ${lab.status || 'normal'}">
                    <div class="lab-value-header">
                        <span class="lab-value-name">${lab.name}</span>
                        <span class="lab-value-status ${lab.status || 'normal'}">${lab.status || 'Normal'}</span>
                    </div>
                    <div class="lab-value-data">
                        <span class="lab-value-result">${lab.value}</span>
                        <span class="lab-value-unit">${lab.unit || ''}</span>
                    </div>
                    ${lab.reference_range ? `<div class="lab-value-range">Reference: ${lab.reference_range}</div>` : ''}
                    ${lab.explanation ? `<div class="lab-value-explanation">${lab.explanation}</div>` : ''}
                </div>
            `).join('');
            labCard?.removeAttribute('hidden');
        } else {
            labCard?.setAttribute('hidden', '');
        }
        
        // Explanation
        document.getElementById('resultExplanation').innerHTML = `<p>${data.explanation}</p>`;
        
        // Key Points
        const keyPointsList = document.getElementById('keyPointsList');
        if (data.key_points?.length) {
            keyPointsList.innerHTML = data.key_points.map(p => `<li>${p}</li>`).join('');
        }
        
        // Next Steps
        const nextStepsList = document.getElementById('nextStepsList');
        if (data.next_steps?.length) {
            nextStepsList.innerHTML = data.next_steps.map(s => `<li>${s}</li>`).join('');
        }
    }
    
    // ==========================================
    // Utilities
    // ==========================================
    
    showLoading(text = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (loadingText) loadingText.textContent = text;
        overlay?.removeAttribute('hidden');
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay')?.setAttribute('hidden', '');
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
    
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    async copyResults() {
        if (!this.currentResult) {
            this.showToast('No results to copy', 'info');
            return;
        }
        
        const text = `
Medical Document Analysis
========================
${this.currentResult.summary}

Detailed Explanation:
${this.currentResult.explanation}

Key Points:
${this.currentResult.key_points?.join('\n• ')}

Next Steps:
${this.currentResult.next_steps?.join('\n• ')}
        `.trim();
        
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Results copied to clipboard', 'success');
        } catch {
            this.showToast('Failed to copy', 'error');
        }
    }
    
    async shareResults() {
        if (!this.currentResult) {
            this.showToast('No results to share', 'info');
            return;
        }
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'MedVoice Companion - Analysis Results',
                    text: this.currentResult.summary,
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    this.showToast('Failed to share', 'error');
                }
            }
        } else {
            // Fallback to copy
            this.copyResults();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.medVoiceApp = new MedVoiceApp();
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            console.log('Service Worker not available');
        });
    });
}
