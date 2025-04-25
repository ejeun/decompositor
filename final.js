import { mainInnerHTML, formHTML } from './constants.js';
import { AudioVisualizer } from './visualizer.js';

const pieces = [];
const birdcall = new Audio('./frames/call.wav')
let audioElement = null;
let visualizer = null;

function createMainSection() {
  const main = document.createElement('main');
  const root = document.querySelector(':root');
  const body = document.querySelector('body');
  body.style.height = '15000px';
  main.innerHTML = mainInnerHTML;
  root.style.setProperty('--background', 'rgb(136, 161, 182)');
  return main;
}

// Function to get average color of an image
function getAverageColor(img) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  canvas.width = width;
  canvas.height = height;
  context.drawImage(img, 0, 0);

  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  let r = 0,
    g = 0,
    b = 0;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }

  const count = data.length / 4;
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

function handleScroll() {
  if (window.innerWidth > 800) {
    const root = document.querySelector(':root');
    const currentScroll = window.scrollY;

    // Block upward scrolling
    if (currentScroll < window.lastScrollTop) {
      window.scrollTo(0, window.lastScrollTop);
      return;
    }

    // Update scroll position first
    root.style.setProperty('--scroll', Math.floor(window.scrollY) + 'px');
    root.style.setProperty(
      '--visible',
      (Math.floor(window.scrollY - 15000) / -100).toFixed(1),
    );

    if (currentScroll >= 13000) {
      //Fade out birdcall
      birdcall.pause();
      visualizer.stop();
      return;
    }

    // Check if we've scrolled past the final image
    if (currentScroll >= 10000) {
      const main = document.querySelector('main');
      if (main && !visualizer) {
        main.style.display = 'none';
        
        // Fade out background audio if it exists
        const audioElement = document.querySelector('audio');
        if (audioElement) {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioContext.createMediaElementSource(audioElement);
          const gainNode = audioContext.createGain();
          
          source.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          // Start fade out
          gainNode.gain.setValueAtTime(gainNode.gain.value, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1.0);
          
          // Stop audio after fade
          setTimeout(() => {
            audioElement.pause();
          }, 1000);
        }

        visualizer = new AudioVisualizer();
        visualizer.start();

        //Fade in birdcall
        setTimeout(() => {
          birdcall.play();
        }, 1000);
      }
      return;
    }

    // Update last scroll position
    window.lastScrollTop = currentScroll;

    let active = null;

    if (window.scrollY > 1500) {
      pieces.forEach((d, i) => {
        const z = 1200 + i * 1000;

        if (z - window.scrollY > -1680 && !active) {
          active = d;
        }
      });
    }

    // Update background color based on scroll position
    const articles = document.querySelectorAll('article');
    let visibleArticle = null;

    // Calculate which article should be visible based on scroll position
    const scrollPosition = window.scrollY;
    const articleHeight = 800; // Height of each article section

    // Find the article that corresponds to the current scroll position
    articles.forEach((article, index) => {
      const articleStart = index * articleHeight;
      const articleEnd = articleStart + articleHeight;

      if (scrollPosition >= articleStart && scrollPosition < articleEnd) {
        visibleArticle = article;
      }
    });

    if (visibleArticle) {
      const img = visibleArticle.querySelector('img');
      if (img.complete) {
        const avgColor = getAverageColor(img);
        root.style.setProperty(
          '--background',
          `rgb(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`,
        );
      } else {
        img.onload = function () {
          const avgColor = getAverageColor(img);
          root.style.setProperty(
            '--background',
            `rgb(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`,
          );
        };
      }
    }
  }
}

window.onload = () => {
  const root = document.querySelector(':root');
  root.style.setProperty(
    '--vh',
    Math.min(640, Math.floor(window.innerHeight * 0.85)) + 'px',
  );

  // Initialize lastScrollTop
  window.lastScrollTop = window.scrollY;

  handleScroll();

  // Add click handler to blank page
  const blankPage = document.getElementById('blank-page');
  blankPage.addEventListener('click', async () => {
    // Make the blank page unclickable
    blankPage.style.pointerEvents = 'none';
    
    try {
      // Show loading text
      const loadingText = document.createElement('div');
      loadingText.id = 'loading-text';
      loadingText.style.color = 'black';
      loadingText.style.fontSize = '1em';
      loadingText.style.fontFamily = 'Courier New, sans-serif';
      loadingText.style.opacity = '0';
      loadingText.style.transition = 'opacity 0.5s ease';
      loadingText.textContent =
        'I started to think that I wanted to fly away...';
      loadingText.style.position = 'fixed';
      loadingText.style.top = '70%';
      loadingText.style.left = '50%';
      loadingText.style.transform = 'translate(-50%, -50%)';
      blankPage.appendChild(loadingText);

      // Fade in loading text
      setTimeout(() => {
        loadingText.style.opacity = '1';
      }, 100);

      // Request both audio and video permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      // Stop the video stream immediately since we just needed permission
      stream.getVideoTracks().forEach((track) => track.stop());

      // Create audio context and start background music
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      audioElement = new Audio('./frames/background.mp3');
      // Add error handling for audio loading
      audioElement.addEventListener('error', (e) => {
        console.error('Audio loading error:', e);
      });

      audioElement.addEventListener('canplaythrough', () => {
        // Only proceed with audio setup if the file loads successfully
        const audioSource = audioContext.createMediaElementSource(audioElement);

        // Add some effects to the audio
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.5; // Reduce volume to 50%

        const filterNode = audioContext.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 1000; // Low pass filter at 1000Hz

        // Connect the audio nodes
        audioSource.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Start playing the audio
        audioElement.loop = true;
        audioElement
          .play()
          .catch((e) => console.error('Audio playback error:', e));

        setTimeout(() => {
          fadeOutLoadingText(createAndShowForm);
        }, 3000);
      });

      // Function to fade out loading text and call callback
      function fadeOutLoadingText(callback) {
        loadingText.style.opacity = '0';
        setTimeout(() => {
          loadingText.remove();
          callback();
        }, 500);
      }

      // Function to create and show the form
      function createAndShowForm() {
        // Create and add the form
        const formContainer = document.createElement('div');
        formContainer.innerHTML = formHTML;
        document.body.appendChild(formContainer.firstElementChild);

        // Remove the blank page
        blankPage.remove();

        // Scroll to top of the page
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });

        // Initialize form functionality
        const form = document.querySelector('form');
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        const submitButton = document.querySelector('button[type="submit"]');

        checkboxes.forEach((checkbox, index) => {
          if (index) {
            checkbox.parentElement.style.display = 'none';
          } else {
            checkbox.parentElement.style.display = 'block';
          }
          checkbox.addEventListener('change', () => {
            if (checkbox.checked && index < checkboxes.length - 1) {
              // Show next checkbox
              checkboxes[index + 1].parentElement.style.display = 'block';

              // Disable and fade out all previous checkboxes
              for (let i = 0; i <= index; i++) {
                checkboxes[i].disabled = true;
                checkboxes[i].parentElement.classList.add('disabled');
              }
            }

            // Check if all checkboxes are checked
            const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
            if (allChecked) {
              submitButton.style.display = 'block';
            } else {
              submitButton.style.display = 'none';
            }
          });
        });

        submitButton.addEventListener('click', (event) => {
          event.preventDefault();

          // Add exiting class to trigger animation
          form.classList.add('exiting');

          // Wait for animation to complete before removing form and showing main
          setTimeout(() => {
            form.remove();
            const main = createMainSection();
            document.body.appendChild(main);
            main.style.display = 'flex';
          }, 800); // Match this duration with the CSS transition duration
        });

        // Add click handlers for iframes
        document.querySelectorAll('span').forEach((span) => {
          span.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event from bubbling up

            // Check if this span already has an iframe
            const existingIframe = span.querySelector('.iframe-wrapper');
            if (existingIframe) {
              existingIframe.remove();
              return;
            }

            // Create new iframe wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'iframe-wrapper';

            // Create close button
            const closeButton = document.createElement('div');
            closeButton.className = 'iframe-close';
            closeButton.innerHTML = '×';
            closeButton.addEventListener('click', (e) => {
              e.stopPropagation();
              wrapper.remove();
            });
            wrapper.appendChild(closeButton);

            const iframe = document.createElement('iframe');
            iframe.src = `./frames/${span.id}.html`;

            // Add load event listener to scroll iframe to middle
            if (span.id == 'consciousness') {
              iframe.onload = function () {
                const scrollWidth =
                  iframe.contentDocument.documentElement.scrollWidth;
                const iframeWidth = iframe.clientWidth;
                const scrollTo = (scrollWidth - iframeWidth) / 2;
                iframe.contentWindow.scrollTo(scrollTo, 0);
              };
            }

            wrapper.appendChild(iframe);

            // Position the iframe directly under the span
            wrapper.style.top = '100%';
            wrapper.style.marginTop = '10px';

            // Calculate if iframe would extend beyond viewport
            const spanRect = span.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const iframeWidth = 300; // Width of iframe

            // If iframe would extend beyond right edge, adjust its position
            if (spanRect.left + iframeWidth > viewportWidth) {
              wrapper.style.left = 'auto';
              wrapper.style.right = '0';
            }

            // Add to span
            span.appendChild(wrapper);

            // Add click handler to document to close iframe when clicking outside
            const closeIframe = (e) => {
              if (!wrapper.contains(e.target) && e.target !== span) {
                wrapper.remove();
                document.removeEventListener('click', closeIframe);
              }
            };

            // Add the click handler after a small delay to prevent immediate closing
            setTimeout(() => {
              document.addEventListener('click', closeIframe);
            }, 0);
          });
        });
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      alert(
        'Please allow camera and audio permissions!',
      );
    }
  });
};

window.onscroll = () => handleScroll();
