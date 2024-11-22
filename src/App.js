import React, { useEffect, useState, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { FontLoader } from "three-stdlib";
import helvetikerFont from "./helvetiker_regular.typeface.json";
import * as THREE from "three";
import "./App.css";

// Cubic ease-out function to slow down the progress as it approaches 1
const easeOutCubic = (t) => (--t) * t * t + 1;

const createLetterShape = (text, fontSize = 1.3, spacing = 0.2) => {
  const fontLoader = new FontLoader();
  const font = fontLoader.parse(helvetikerFont);
  const shapes = font.generateShapes(text, fontSize);
  const points = [];

  // Calculate the bounding box of the shapes to determine centering offsets
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  shapes.forEach((shape) => {
    const shapePoints = shape.getPoints();
    shapePoints.forEach((point) => {
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    });
  });

  const offsetX = (minX + maxX) / 2;
  const offsetY = (minY + maxY) / 2;

  // Adjust all points to center the word on the screen
  shapes.forEach((shape) => {
    const shapePoints = shape.getSpacedPoints(150);
    shapePoints.forEach((point) =>
      points.push([point.x - offsetX, point.y - offsetY, 0])
    );
  });

  return points;
};

const ParticleField = ({ progress, wordPositions }) => {
  const particles = useRef();
  const [randomPositions, setRandomPositions] = useState([]);
  const totalParticles = 5000;

  useEffect(() => {
    // Set up initial random positions for particles covering full screen height
    const randomPos = Array.from({ length: totalParticles }, () => [
      (Math.random() - 0.5) * 50, // Spread across a slightly smaller area for better control
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 50,
    ]);
    setRandomPositions(randomPos);
  }, []);

  useFrame(({ clock }) => {
    if (particles.current && randomPositions.length && wordPositions.length) {
      const positionArray = particles.current.geometry.attributes.position.array;
      const time = clock.getElapsedTime();

      // Apply easing to progress to slow down towards the end
      const easedProgress = easeOutCubic(progress);

      for (let i = 0; i < totalParticles * 3; i += 3) {
        const index = Math.floor(i / 3);

        const start = randomPositions[index];
        const end = index < wordPositions.length ? wordPositions[index] : randomPositions[index];

        // Interpolate between random position and final letter position based on eased progress
        const lerpFactor = easedProgress; // Eased progress for a smoother transition towards the end

        // Free movement with oscillation in the initial and converging stage
        const randomX = start[0] + Math.sin(time + index) * 0.5 * (1 - lerpFactor);
        const randomY = start[1] + Math.sin(time + index * 1.1) * 0.5 * (1 - lerpFactor);
        const randomZ = start[2] + Math.sin(time + index * 1.2) * 0.5 * (1 - lerpFactor);

        // Interpolating position to form logo progressively
        positionArray[i] = THREE.MathUtils.lerp(randomX, end[0], lerpFactor);
        positionArray[i + 1] = THREE.MathUtils.lerp(randomY, end[1], lerpFactor);
        positionArray[i + 2] = THREE.MathUtils.lerp(randomZ, end[2], lerpFactor);
      }

      particles.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={totalParticles}
          array={new Float32Array(totalParticles * 3).fill(0)}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.1} />
    </points>
  );
};

const ResizeHandler = () => {
  const { gl, camera } = useThree();
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      gl.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    // Set initial size
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Clean up listener on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [gl, camera]);

  return null;
};

const App = () => {
  const [progress, setProgress] = useState(0);
  const [wordPositions, setWordPositions] = useState([]);

  useEffect(() => {
    // Create the points for the "Diabytes" logo
    const points = createLetterShape("Diabytes", 1.3, 0.2); // Adjusted to fit better on the screen
    setWordPositions(points);

    // Set up mouse wheel listener to control the particle animation
    const handleWheel = (event) => {
      // Update progress based on mouse wheel delta
      const scrollFactor = 0.001; // Decrease to slow down progress, around 10 scrolls for full effect
      let deltaY = event.deltaY;
      deltaY = Math.max(Math.min(deltaY, 8), -8); // Clamp the delta to a reasonable value
      const newProgress = Math.min(Math.max(progress + deltaY * scrollFactor, 0), 1);
      setProgress(newProgress);

      // Allow scroll up but prevent scroll down until animation is complete
      if (newProgress < 1 && event.deltaY > 0) {
        event.preventDefault();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [progress]);

  return (
    <div className="app">
      <Canvas className="canvas">
        <ResizeHandler />
        <ambientLight intensity={0.5} />
        <ParticleField progress={progress} wordPositions={wordPositions} />
      </Canvas>
      <div className="content">
        <section className="about-section">
          <h2>About the Project</h2>
          <p>
            Diabytes is a mobile app that predicts insulin doseage for diabetic patient only based on meal image. Take a photo of your meal and let Diabytes predict the insulin dose for you!
          </p>
        </section>
        <section className="team-section">
          <h2>Team Members</h2>
          <div className="team-members">
            <div className="team-member">
              <img src={`${process.env.PUBLIC_URL}/cenker.png`} alt="Cenker Akan" className="member-photo" />
              <h3>Cenker Akan</h3>
              <p>Role: ML Model Developer</p>
              <div className="social-links">
                <a href="https://www.linkedin.com/in/cenker-akan/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <a href="https://github.com/CenkerAkan" target="_blank" rel="noopener noreferrer">GitHub</a>
              </div>
            </div>
            <div className="team-member">
            <img src={`${process.env.PUBLIC_URL}/umut.jpeg`} alt="Umut Can Bolat" className="member-photo" />
              <h3>Umut Can Bolat</h3>
              <p>Role: ML Model Developer</p>
              <div className="social-links">
                <a href="https://www.linkedin.com/in/umut-can-bolat-0ab877218/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <a href="https://github.com/UmutCan00" target="_blank" rel="noopener noreferrer">GitHub</a>
              </div>
            </div>
            <div className="team-member">
              <img src={`${process.env.PUBLIC_URL}/bora.jpeg`} alt="Umut Bora Çakmak" className="member-photo" />
              <h3>Umut Bora Çakmak</h3>
              <p>Role: Mobile Developer</p>
              <div className="social-links">
                <a href="https://www.linkedin.com/in/umut-bora-%C3%A7akmak-a0931a232/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <a href="https://github.com/UBoraCakmak" target="_blank" rel="noopener noreferrer">GitHub</a>
              </div>
            </div>
            <div className="team-member">
              <img src={`${process.env.PUBLIC_URL}/perit.jpeg`} alt="Perit Dinçer" className="member-photo" />
              <h3>Perit Dinçer</h3>
              <p>Role: Mobile Developer</p>
              <div className="social-links">
                <a href="https://www.linkedin.com/in/perit-din%C3%A7er-5a17b5238/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <a href="https://github.com/perit-dincer" target="_blank" rel="noopener noreferrer">GitHub</a>
              </div>
            </div>
            <div className="team-member">
              <img src={`${process.env.PUBLIC_URL}/tarik.jpeg`} alt="Ahmet Tarık Uçur" className="member-photo" />
              <h3>Ahmet Tarık Uçur</h3>
              <p>Role: Mobile Developer</p>
              <div className="social-links">
                <a href="https://www.linkedin.com/in/ahmet-tar%C4%B1k-u%C3%A7ur-0a6835261/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <a href="https://github.com/Tarikucur" target="_blank" rel="noopener noreferrer">GitHub</a>
              </div>
            </div>
          </div>
        </section>
        <section className="reports-section">
          <h2>Reports</h2>
          <p>Access our detailed project reports and documentation below:</p>
          <ul className="reports-list">
            {/* <li>
              <a
                href="https://docs.google.com/document/d/your-doc-id-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                Project Information Form
              </a>
            </li> */}
            <li>
              <a
                href="https://docs.google.com/document/d/1SXd79ncur9BIsQeZjlSN9uKCUi-MdaoEnNobduG1hZs/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
              >
                Project Specification Document
              </a>
            </li>
            <li>
              <a
                href="https://docs.google.com/document/d/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Analysis and Requirements Report 
              </a>
            </li>
          </ul>
        </section>
        <footer className="footer">
          Diabytes © 2024
        </footer>
      </div>
    </div>
  );
};

export default App;
