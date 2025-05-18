// 在文件顶部添加类型扩展，解决playsInline属性问题
declare global {
  interface HTMLVideoElement {
    playsInline: boolean;
  }
}

import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import axios from 'axios';
import '../styles/components.css';

// 导入 videojs 插件
import '@videojs/http-streaming';

interface PlayerProps {
  src: string;
  type: 'video' | 'audio';
}

export default function VideoPlayer({ src, type }: PlayerProps) {
  // 使用类型保护和条件ref
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null); // 新增容器引用
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState<string | null>(null);
  const [requestFailed, setRequestFailed] = useState<boolean>(false);
  const [useDirectPlay, setUseDirectPlay] = useState<boolean>(false); // 是否使用直接播放
  
  // 从URL中获取文件名 - 处理编码的URL
  const encodedFilename = src.split('/').pop();
  const filename = encodedFilename ? decodeURIComponent(encodedFilename) : null;
  
  // 加载元数据
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!filename) return;
      
      try {
        // 尝试获取元数据
        const response = await axios.get(`/api/metadata/${encodedFilename}`);
        setMetadata(response.data);
        
        // 确定文件格式
        const ext = filename.split('.').pop()?.toLowerCase();
        setFormat(ext || null);
        
        // 记录直接的流媒体URL（调试用）
        setDirectUrl(src);
        console.log('播放源:', src, '格式:', ext);
      } catch (error) {
        console.error('获取元数据失败:', error);
      }
    };
    
    fetchMetadata();
  }, [filename, src, encodedFilename]);

  // 清理播放器实例
  const cleanupPlayer = () => {
    if (playerRef.current) {
      try {
        playerRef.current.dispose();
        playerRef.current = null;
      } catch (e) {
        console.error('销毁播放器实例失败:', e);
      }
    }
  };

  // 当组件销毁时清理
  useEffect(() => {
    return () => {
      cleanupPlayer();
    };
  }, []);

  // 初始化播放器
  useEffect(() => {
    let isMounted = true;
    
    // 每次src变化时先清理之前的播放器
    cleanupPlayer();
    
    setLoading(true);
    setError(null);
    setRequestFailed(false);
    setUseDirectPlay(false);
    
    // 检查资源可访问性 - 使用GET请求而不是HEAD，因为某些服务器可能不允许HEAD请求
    const checkResourceAvailability = async () => {
      try {
        // 尝试使用axios进行检查，可以设置超时和拦截错误
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
        
        // 使用GET请求并设置range头，这样只会请求文件的开头部分
        const response = await axios.get(src, {
          headers: {
            'Range': 'bytes=0-0' // 只请求第一个字节
          },
          signal: controller.signal,
          validateStatus: (status) => status < 500 // 允许4xx状态码通过
        });
        
        clearTimeout(timeoutId);
        console.log('资源可用性检查:', response.status, response.headers);
        
        // 如果服务器返回了不支持范围请求的错误，但文件可能仍然存在
        if (response.status === 405 || response.status === 416) {
          console.log('服务器不支持HEAD请求或范围请求，但资源可能存在');
          return true; // 继续尝试播放
        }
        
        if (response.status >= 400) {
          console.error(`资源不可用: ${response.status} ${response.statusText}`);
          setRequestFailed(true);
          setError(`资源请求失败: ${response.status} ${response.statusText}`);
          setLoading(false);
          return false;
        }
        return true;
      } catch (err) {
        // 如果是abort error，表示超时
        if (axios.isCancel(err)) {
          console.warn('资源检查请求超时，仍然尝试加载');
          return true; // 超时但仍然尝试播放
        }
        
        console.error('资源可用性检查失败:', err);
        // 即使检查失败，我们也尝试初始化播放器
        console.warn('资源检查失败，但仍然尝试加载媒体');
        return true;
      }
    };
    
    // 尝试直接播放媒体（不使用videojs）
    const tryDirectPlayback = () => {
      if (!playerContainerRef.current) {
        console.error('容器元素不存在，无法尝试直接播放');
        return;
      }
      
      // 清理可能存在的播放器实例
      cleanupPlayer();
      
      console.log('正在尝试直接播放...');
      setUseDirectPlay(true);
      
      try {
        // 清空容器
        while (playerContainerRef.current.firstChild) {
          playerContainerRef.current.removeChild(playerContainerRef.current.firstChild);
        }
        
        // 创建一个新的视频/音频元素
        const directMediaEl = document.createElement(type === 'video' ? 'video' : 'audio');
        directMediaEl.className = 'direct-player';
        directMediaEl.controls = true;
        directMediaEl.style.width = '100%';
        directMediaEl.style.maxHeight = '100%';
        directMediaEl.crossOrigin = 'anonymous';
        directMediaEl.src = src;
        
        // 添加事件监听器
        directMediaEl.onloadeddata = () => {
          console.log('直接播放成功!');
          setLoading(false);
          setError(null);
        };
        
        directMediaEl.onerror = (e) => {
          console.error('直接播放也失败了:', e);
          
          const mediaError = directMediaEl.error;
          let errorMsg = '浏览器不支持该媒体格式。请尝试转换为更兼容的格式，如MP4。';
          
          if (mediaError) {
            switch (mediaError.code) {
              case MediaError.MEDIA_ERR_ABORTED:
                errorMsg = '播放被中断。';
                break;
              case MediaError.MEDIA_ERR_NETWORK:
                errorMsg = '网络错误导致媒体下载失败。';
                break;
              case MediaError.MEDIA_ERR_DECODE:
                errorMsg = '解码错误。该媒体可能已损坏或使用了浏览器不支持的功能。';
                break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMsg = '该媒体格式或MIME类型不受支持。';
                break;
            }
            
            if (mediaError.message) {
              errorMsg += ` 详细信息: ${mediaError.message}`;
            }
          }
          
          setError(errorMsg);
          setLoading(false);
        };
        
        // 将元素添加到容器
        playerContainerRef.current.appendChild(directMediaEl);
        
      } catch (err) {
        console.error('直接播放设置失败:', err);
        setError('直接播放设置失败: ' + (err instanceof Error ? err.message : '未知错误'));
        setLoading(false);
      }
    };
    
    // 初始化videojs播放器
    const initVideoJsPlayer = () => {
      try {
        // 确保播放器容器是干净的
        if (!playerContainerRef.current) {
          console.error('播放器容器不存在');
          setError('播放器初始化失败 - 容器元素未就绪');
          setLoading(false);
          return;
        }
        
        // 清空容器
        while (playerContainerRef.current.firstChild) {
          playerContainerRef.current.removeChild(playerContainerRef.current.firstChild);
        }
        
        // 创建新的媒体元素，并使用类型断言来避免类型错误
        const mediaElement = document.createElement(type === 'video' ? 'video' : 'audio');
        
        // 设置通用属性
        mediaElement.className = 'video-js vjs-big-play-centered';
        mediaElement.controls = true;
        mediaElement.preload = 'auto';
        mediaElement.crossOrigin = 'anonymous';
        
        // 为视频元素设置特有属性
        if (type === 'video' && 'playsInline' in mediaElement) {
          (mediaElement as HTMLVideoElement).playsInline = true;
        }
        
        // 保存引用
        mediaRef.current = mediaElement;
        
        // 将元素添加到容器
        playerContainerRef.current.appendChild(mediaElement);
        
        // 创建新的播放器实例
        const getMediaType = (src: string, mediaType: 'video' | 'audio', format: string | null) => {
          // 默认类型
          let mimeType = mediaType === 'video' ? 'video/mp4' : 'audio/mpeg';
          
          // 根据文件扩展名确定MIME类型
          switch (format) {
            // 视频格式
            case 'mp4': mimeType = 'video/mp4'; break;
            case 'webm': mimeType = 'video/webm'; break;
            case 'mkv': mimeType = 'video/x-matroska'; break;
            case 'avi': mimeType = 'video/x-msvideo'; break;
            case 'mov': mimeType = 'video/quicktime'; break;
            case 'm4v': mimeType = 'video/mp4'; break;
            case 'ts': mimeType = 'video/mp2t'; break;
            case 'mts': mimeType = 'video/mp2t'; break;
            case 'vob': mimeType = 'video/mpeg'; break;
            case '3gp': mimeType = 'video/3gpp'; break;
            case 'flv': mimeType = 'video/x-flv'; break;
            case 'wmv': mimeType = 'video/x-ms-wmv'; break;
            
            // 音频格式
            case 'mp3': mimeType = 'audio/mpeg'; break;
            case 'wav': mimeType = 'audio/wav'; break;
            case 'ogg': mimeType = 'audio/ogg'; break;
            case 'flac': mimeType = 'audio/flac'; break;
            case 'aac': mimeType = 'audio/aac'; break;
            case 'm4a': mimeType = 'audio/mp4'; break;
            
            default:
              console.warn(`未识别的文件格式: ${format}, 使用默认MIME类型: ${mimeType}`);
          }
          
          console.log(`文件类型检测: 格式=${format}, MIME类型=${mimeType}`);
          return mimeType;
        };

        const vjsOptions = {
          controls: true,
          responsive: true,
          fluid: true,
          preload: 'auto',
          playbackRates: [0.5, 1, 1.5, 2],
          liveui: false,
          html5: {
            vhs: {
              overrideNative: true,
              withCredentials: false,
              useFetch: true,
              enableLowInitialPlaylist: true,
              limitRenditionByPlayerDimensions: false,
              useDevicePixelRatio: true,
              smoothQualityChange: true
            },
            nativeAudioTracks: false,
            nativeVideoTracks: false,
            nativeTextTracks: false
          },
          sources: [{
            src,
            type: getMediaType(src, type, format)
          }]
        };

        console.log('正在初始化视频播放器，选项:', vjsOptions);
        
        // 为了调试，将videojs设置为全局变量
        (window as any).videojs = videojs;
        
        // 使用确定存在的媒体元素初始化播放器
        const vjsPlayer = videojs(mediaElement, vjsOptions, function onPlayerReady() {
          console.log('播放器已就绪', this);
          this.on('loadstart', () => console.log('loadstart 事件'));
          this.on('loadedmetadata', () => console.log('loadedmetadata 事件'));
          this.on('loadeddata', () => console.log('loadeddata 事件'));
          this.on('playing', () => console.log('播放开始'));
          
          if (isMounted) {
            setLoading(false);
          }
        });
        
        // 保存播放器引用
        playerRef.current = vjsPlayer;
        
        // 错误处理
        vjsPlayer.on('error', (e: any) => {
          const error = vjsPlayer.error();
          console.error('视频播放错误:', e, error);
          
          let errorMessage = '媒体播放错误';
          // 尝试获取更具体的错误信息
          if (error) {
            switch(error.code) {
              case 1: 
                errorMessage = '媒体加载中断。请检查您的网络连接。';
                break;
              case 2:
                errorMessage = '网络错误。请检查您的网络连接或服务器状态。';
                break;
              case 3:
                errorMessage = '解码错误。该视频可能已损坏或使用了不受支持的编解码器。';
                break;
              case 4:
                errorMessage = '找不到兼容的媒体源。该格式可能不受当前浏览器支持。';
                // 尝试直接使用video元素播放
                tryDirectPlayback();
                break;
              default:
                errorMessage = `媒体播放错误 (${error.code})`;
            }
            
            if (error.message) {
              errorMessage += `: ${error.message}`;
            }
          }
          
          if (isMounted) {
            setError(errorMessage);
            setLoading(false);
          }
        });
        
      } catch (err) {
        console.error('播放器初始化失败:', err);
        if (isMounted) {
          setError('播放器初始化失败: ' + (err instanceof Error ? err.message : '未知错误'));
          setLoading(false);
          
          // 如果videojs初始化失败，尝试直接播放
          console.log('videojs初始化失败，尝试直接播放');
          tryDirectPlayback();
        }
      }
    };
    
    // 延迟初始化以确保DOM已就绪
    const initTimeout = setTimeout(async () => {
      // 首先检查资源可用性，但即使检查失败也继续尝试
      await checkResourceAvailability();
      
      // 尝试直接播放，跳过videojs
      if (format === 'mp4' || format === 'webm' || format === 'mp3' || format === 'wav') {
        // 这些格式浏览器通常可以直接播放
        console.log('检测到浏览器原生支持的格式，尝试直接播放');
        tryDirectPlayback();
      } else {
        // 其他格式先尝试videojs
        initVideoJsPlayer();
      }
    }, 100); // 短暂延迟以确保DOM已就绪
    
    // 执行清理
    return () => {
      clearTimeout(initTimeout);
      isMounted = false;
    };
  }, [src, type, format]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setRequestFailed(false);
    
    // 制造一个无缓存URL
    const noCacheUrl = `${src}${src.includes('?') ? '&' : '?'}nocache=${Date.now()}`;
    // 强制刷新页面
    window.location.href = noCacheUrl.replace('/api/raw/', '/play/');
  };

  // 转换为兼容格式的选项
  const handleTryAnotherFormat = () => {
    if (!encodedFilename) return;
    
    setError(null);
    setLoading(true);
    console.log('尝试使用转换后的格式:', encodedFilename);
    window.location.href = `/play/${encodedFilename}?format=mp4`;
  };

  return (
    <div className="player-wrapper">
      {loading && !requestFailed && (
        <div className="player-loading">
          <div className="spinner"></div>
          <p>加载媒体中...</p>
        </div>
      )}
      
      {error && (
        <div className="player-error">
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={handleRetry} className="retry-button">重试</button>
            <button onClick={handleTryAnotherFormat} className="convert-button">尝试MP4格式</button>
          </div>
          {directUrl && (
            <div className="debug-info">
              <p>调试信息:</p>
              <code>URL: {directUrl}</code>
              <br />
              <code>格式: {format}</code>
              <br />
              <code>文件名: {filename}</code>
              <br />
              <code>错误类型: {error}</code>
            </div>
          )}
        </div>
      )}
      
      {/* 播放器容器 - 现在使用ref来管理DOM操作 */}
      <div 
        ref={playerContainerRef} 
        className={`player-container ${loading || error ? 'hidden' : ''}`}
        data-vjs-player
      >
        {/* 不再在JSX中创建视频/音频元素，而是在JS代码中动态创建 */}
      </div>
      
      {!loading && !error && metadata && (
        <div className="media-metadata">
          <div className="file-format">
            {format && <span className="format-badge">{format.toUpperCase()}</span>}
          </div>
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