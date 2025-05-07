import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface PlayerProps {
  src: string;
  metadata?: any;
  type: 'video' | 'audio';
}

export default function VideoPlayer({ src, metadata, type }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current) {
      const player = videojs(videoRef.current, {
        controls: true,
        responsive: true,
        fill: true,
        sources: [{
          src,
          type: type === 'video' ? 'video/mp4' : 'audio/mp3'
        }]
      });
      
      return () => {
        player.dispose();
      };
    }
  }, [src]);

  return (
    <div data-vjs-player>
      {type === 'video' ? (
        <video ref={videoRef} className="video-js" />
      ) : (
        <audio ref={videoRef} className="video-js" />
      )}
    </div>
  );
}