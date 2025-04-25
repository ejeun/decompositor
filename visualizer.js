export class AudioVisualizer {
  constructor() {
    this.audioContext = null;
    this.micAnalyser = null;
    this.speakerAnalyser = null;
    this.micMeyda = null;
    this.speakerMeyda = null;
    this.canvas = null;
    this.ctx = null;
    this.animationFrameId = null;
    this.isInitialized = false;
    this.gradient = null;
  }

  async initialize() {
    if (this.isInitialized) return;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'visualizer-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '1000';
    this.canvas.style.background = '#000000'; // Pure black background
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Set canvas size
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Create gradient for subtle variation in white
    this.gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    this.gradient.addColorStop(0, '#ffffff');    // Pure white
    this.gradient.addColorStop(0.5, '#f0f0f0');  // Slightly dimmer white
    this.gradient.addColorStop(1, '#ffffff');    // Back to pure white

    // Initialize audio context with specific sample rate
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 44100
    });

    // Initialize analyzers
    this.micAnalyser = this.audioContext.createAnalyser();
    this.speakerAnalyser = this.audioContext.createAnalyser();
    this.micAnalyser.fftSize = 512;
    this.speakerAnalyser.fftSize = 512;
    this.micAnalyser.smoothingTimeConstant = 0.8;
    this.speakerAnalyser.smoothingTimeConstant = 0.8;

    // Initialize Meyda with 512 buffer size
    this.micMeyda = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source: this.micAnalyser,
      bufferSize: 512,
      sampleRate: 44100,
      featureExtractors: ['amplitudeSpectrum'],
      callback: features => this.draw(features)
    });

    this.speakerMeyda = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source: this.speakerAnalyser,
      bufferSize: 512,
      sampleRate: 44100,
      featureExtractors: ['amplitudeSpectrum'],
      callback: features => this.draw(features)
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      // Recreate gradient on resize
      this.gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
      this.gradient.addColorStop(0, '#ffffff');
      this.gradient.addColorStop(0.5, '#f0f0f0');
      this.gradient.addColorStop(1, '#ffffff');
    });

    this.isInitialized = true;
  }

  async start() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Get microphone input
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.micAnalyser);
      this.micMeyda.start();
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  }

  stop() {
    // Add fade-out class
    if (this.canvas) {
      this.canvas.classList.add('fade-out');
      
      // Wait for fade animation to complete before cleanup
      setTimeout(() => {
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
        }
        if (this.micMeyda) {
          this.micMeyda.stop();
        }
        if (this.speakerMeyda) {
          this.speakerMeyda.stop();
        }
        if (this.canvas) {
          this.canvas.remove();
        }
        this.isInitialized = false;
      }, 1000); // Match this with the CSS transition duration
    }
  }

  draw(features) {
    if (!features || !features.amplitudeSpectrum) return;

    const spectrum = features.amplitudeSpectrum;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerY = height / 2;
    const centerX = width / 2;

    // Clear canvas with fade effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(0, 0, width, height);

    // Set up line style
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = '#ffffff';

    // Draw lines for each data point
    spectrum.forEach((value, i) => {
      if (i < spectrum.length / 2) {
        // Calculate positions
        const amplitude = value * height * 0.8;
        const xPos = centerX + (i / (spectrum.length / 2)) * (width / 2);
        const xPosLeft = centerX - (i / (spectrum.length / 2)) * (width / 2);

        // Draw right side line
        this.ctx.beginPath();
        this.ctx.moveTo(xPos, centerY - amplitude);
        this.ctx.lineTo(xPos, centerY + amplitude);
        this.ctx.stroke();

        // Draw left side line (mirrored)
        this.ctx.beginPath();
        this.ctx.moveTo(xPosLeft, centerY - amplitude);
        this.ctx.lineTo(xPosLeft, centerY + amplitude);
        this.ctx.stroke();
      }
    });

    // Add extra glow for emphasis
    this.ctx.shadowBlur = 30;
    this.ctx.shadowColor = '#ffffff';
    this.ctx.lineWidth = 0.5;

    // Reset shadow effect
    this.ctx.shadowBlur = 0;
  }
} 