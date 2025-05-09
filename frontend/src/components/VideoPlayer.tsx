import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import axios from 'axios';
import '../styles/components.css';

interface PlayerProps {
  src: string;
  type: 'video' | 'audio';
}

export default function VideoPlayer({ src, type }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 从URL中获取文件名
  const filename = src.split('/').pop();
  
  // 加载元数据
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!filename) return;
      
      try {
        // 尝试获取元数据
        const response = await axios.get(`/api/metadata/${filename}`);
        setMetadata(response.data);
      } catch (error) {
        console.error('获取元数据失败:', error);
      }
    };
    
    fetchMetadata();
  }, [filename]);

  // 初始化播放器
  useEffect(() => {
    if (!videoRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 检查是否已经有一个播放器实例
      if (playerRef.current) {
        playerRef.current.dispose();
      }
      
      // 创建新的播放器实例
      const vjsPlayer = videojs(videoRef.current, {
        controls: true,
        responsive: true,
        fluid: true,
        sources: [{
          src,
          type: type === 'video' ? 'video/mp4' : 'audio/mp3'
        }]
      });
      
      // 保存播放器引用
      playerRef.current = vjsPlayer;
      
      // 添加加载事件监听
      vjsPlayer.on('loadedmetadata', () => {
        setLoading(false);
      });
      
      // 错误处理
      vjsPlayer.on('error', () => {
        setError('播放媒体文件时出错，请检查文件格式或服务器连接');
        setLoading(false);
      });
      
      // 执行清理
      return () => {
        if (playerRef.current) {
          playerRef.current.dispose();
        }
      };
    } catch (err) {
      console.error('初始化播放器失败:', err);
      setError('初始化播放器失败');
      setLoading(false);
    }
  }, [src, type]);

  return (
    <div className="player-wrapper">
      {loading && (
        <div className="player-loading">
          <div className="spinner"></div>
          <p>加载媒体中...</p>
        </div>
      )}
      
      {error && (
        <div className="player-error">
          <p>{error}</p>
        </div>
      )}
      
      <div data-vjs-player className={loading ? 'hidden' : ''}>
        {type === 'video' ? (
          <video ref={videoRef} className="video-js vjs-big-play-centered" />
        ) : (
          <audio ref={videoRef} className="video-js vjs-big-play-centered" />
        )}
      </div>
      
      {metadata && (
        <div className="media-metadata">
          {metadata.title && <h3>{metadata.title}</h3>}
          {metadata.description && <p>{metadata.description}</p>}
          {metadata.tags && metadata.tags.length > 0 && (
            <div className="tags">
              {metadata.tags.map((tag: string, index: number) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}