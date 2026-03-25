const FACE_API_WEIGHTS_BASE =
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";

let modelsLoadPromise: Promise<void> | null = null;

export function getFaceApiWeightsBase(): string {
  return FACE_API_WEIGHTS_BASE;
}

/** Loads SSD MobileNet + landmarks + recognition nets once (shared by kiosk & enrollment UIs). */
export function ensureFaceApiModelsLoaded(): Promise<void> {
  if (!modelsLoadPromise) {
    modelsLoadPromise = (async () => {
      const faceapi = await import("face-api.js");
      await faceapi.nets.ssdMobilenetv1.loadFromUri(FACE_API_WEIGHTS_BASE);
      await faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_WEIGHTS_BASE);
      await faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_WEIGHTS_BASE);
    })();
  }
  return modelsLoadPromise;
}

export async function detectFaceDescriptorFromVideo(video: HTMLVideoElement): Promise<number[]> {
  await ensureFaceApiModelsLoaded();
  const faceapi = await import("face-api.js");
  const det = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
  if (!det) {
    throw new Error("No face detected — try better lighting or face the camera");
  }
  return Array.from(det.descriptor);
}
