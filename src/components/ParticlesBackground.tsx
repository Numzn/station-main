import { useEffect } from 'react';

declare global {
  interface Window {
    particlesJS: any;
  }
}

const ParticlesBackground = () => {
  useEffect(() => {
    window.particlesJS("particles-js", {
      "particles": {
        "number": {
          "value": 120,
          "density": {
            "enable": true,
            "value_area": 800
          }
        },
        "color": {
          "value": "#00ffff"
        },
        "shape": {
          "type": "edge",
          "stroke": {
            "width": 0,
            "color": "#000"
          }
        },
        "opacity": {
          "value": 1,
          "random": false
        },
        "size": {
          "value": 2,
          "random": false
        },
        "line_linked": {
          "enable": true,
          "distance": 100,
          "color": "#00ffff",
          "opacity": 1,
          "width": 2
        },
        "move": {
          "enable": true,
          "speed": 3,
          "direction": "none",
          "random": false,
          "straight": false,
          "out_mode": "bounce"
        }
      },
      "interactivity": {
        "detect_on": "canvas",
        "events": {
          "onhover": {
            "enable": true,
            "mode": "repulse"
          },
          "onclick": {
            "enable": false
          },
          "resize": true
        },
        "modes": {
          "repulse": {
            "distance": 150,
            "duration": 0.4
          }
        }
      },
      "retina_detect": true
    });
  }, []);

  return <div id="particles-js" style={{
    position: 'fixed',
    width: '100%',
    height: '100%',
    background: '#000',
    zIndex: 0
  }} />;
};

export default ParticlesBackground;
