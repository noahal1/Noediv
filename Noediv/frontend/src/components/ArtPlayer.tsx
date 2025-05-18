import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import '../styles/components.css';

// 使用动态导入，避免类型问题
type ArtPlayerType = any;
let ArtPlayerModule: any = null;
let HlsModule: any = null;

interface PlayerProps {
  src: string;
  type: 'video' | 'audio';
  onError?: () => void; // 可选的错误回调
}

// 获取视频文件尺寸
const getVideoPoster = (url: string): string => {
  // 这里可以生成视频的缩略图
  // 如果没有自动生成功能，可以返回一个通用占位符
  return '/placeholder.jpg';
};

export default function ArtPlayer({ src, type, onError }: PlayerProps) {
  const artRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<ArtPlayerType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [useDirectPlayer, setUseDirectPlayer] = useState(false);
  const [useConvertedApi, setUseConvertedApi] = useState(false);
  
  // 从URL中获取文件名 - 处理编码的URL
  const encodedFilename = src.split('/').pop();
  const filename = encodedFilename ? decodeURIComponent(encodedFilename) : null;
  
  // 添加是否为MKV文件的检测
  const isMkvFile = filename?.toLowerCase().endsWith('.mkv');

  // 加载元数据和初始化播放器
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!filename) return;
      
      try {
        const response = await axios.get(`/api/metadata/${encodedFilename}`);
        setMetadata(response.data);
        
        // 确定文件格式
        const ext = filename.split('.').pop()?.toLowerCase();
        setFormat(ext || null);
        
        console.log('播放源:', src, '格式:', ext);
      } catch (error) {
        console.error('获取元数据失败:', error);
      }
    };
    
    fetchMetadata();
    
    // 检查资源可访问性
    const checkResourceAvailability = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await axios.get(src, {
          headers: {
            'Range': 'bytes=0-0'
          },
          signal: controller.signal,
          validateStatus: (status) => status < 500
        });
        
        clearTimeout(timeoutId);
        console.log('资源可用性检查:', response.status);
        
        if (response.status >= 400) {
          console.error(`资源不可用: ${response.status}`);
          setError(`资源请求失败: ${response.status}`);
          setLoading(false);
          return false;
        }
        return true;
      } catch (err) {
        console.error('资源可用性检查失败:', err);
        // 继续尝试播放，有些服务器可能不支持Range请求
        return true;
      }
    };
    
    let isMounted = true;
    
    // 动态导入ArtPlayer
    const importArtPlayer = async () => {
      try {
        if (!ArtPlayerModule) {
          // 使用动态导入，不用类型检查
          await new Promise<void>((resolve, reject) => {
            // 使用script标签动态加载ArtPlayer
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/artplayer/dist/artplayer.js';
            script.async = true;
            script.onload = () => {
              // 当脚本加载成功后，ArtPlayer会被添加到window对象中
              ArtPlayerModule = (window as any).Artplayer;
              resolve();
            };
            script.onerror = () => {
              reject(new Error('加载ArtPlayer失败'));
            };
            document.head.appendChild(script);
          });
        }
        return true;
      } catch (err) {
        console.error('导入ArtPlayer失败:', err);
        if (isMounted) {
          setError('导入播放器失败: ' + (err instanceof Error ? err.message : '未知错误'));
          setLoading(false);
        }
        return false;
      }
    };
    
    // 添加全局事件监听器来拦截下载行为
    const preventDownload = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'VIDEO' || target.closest('.art-video-player') || target.closest('.direct-player-container')) {
        // 阻止右键菜单在视频元素上显示
        e.preventDefault();
        console.log('已阻止视频右键菜单');
      }
    };

    document.addEventListener('contextmenu', preventDownload);
    
    // 初始化直接播放器（备用方案）
    const initDirectPlayer = () => {
      if (!useDirectPlayer) return;
      
      // 根据媒体类型选择对应的引用
      const player = type === 'video' ? videoRef.current : audioRef.current;
      if (!player) return;
      
      console.log('使用直接播放模式，类型:', type);
      
      // 设置事件监听器
      player.onloadstart = () => console.log('开始加载媒体');
      player.oncanplay = () => {
        console.log('可以开始播放');
        if (isMounted) setLoading(false);
      };
      player.onplaying = () => {
        console.log('开始播放');
        if (isMounted) setLoading(false);
      };
      player.onerror = (e: any) => {
        console.error('直接播放出错:', e);
        // 显示更详细的错误信息
        const errorCode = player.error ? player.error.code : 'unknown';
        const errorMessage = player.error ? player.error.message : '未知错误';
        if (isMounted) {
          setError(`直接播放失败 (${errorCode}): ${errorMessage}`);
        }
      };
      
      // 阻止下载和保存
      player.oncontextmenu = (e: Event) => e.preventDefault(); // 禁用右键菜单
      
      // 尝试设置特定于视频的属性
      if (type === 'video' && videoRef.current) {
        try {
          // @ts-ignore - 这些属性在某些浏览器可能不受支持
          videoRef.current.controlsList = 'nodownload nofullscreen';
          // @ts-ignore
          videoRef.current.disablePictureInPicture = true;
        } catch (e) {
          console.warn('设置视频特定属性失败:', e);
        }
      }
      
      // 设置通用媒体属性
      player.crossOrigin = 'anonymous';
      player.autoplay = false;
      player.muted = false;
      player.preload = 'auto';
      player.controls = true;
      
      // 设置来源并加载
      player.src = src;
      player.load();
    };
    
    // 初始化ArtPlayer
    const initArtPlayer = async () => {
      if (useDirectPlayer) {
        initDirectPlayer();
        return;
      }
      
      if (!artRef.current) return;
      
      // 先导入ArtPlayer模块
      const imported = await importArtPlayer();
      if (!imported) {
        console.log('ArtPlayer导入失败，切换到直接播放模式');
        setUseDirectPlayer(true);
        return;
      }
      
      // 检查资源可用性，但即使失败也尝试播放
      await checkResourceAvailability();
      
      try {
        // 清理之前的播放器实例
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch (err) {
            console.error('销毁之前的播放器实例失败:', err);
          }
          playerRef.current = null;
        }
        
        // 检测文件是否为MKV格式
        const isMkvFile = filename?.toLowerCase().endsWith('.mkv');
        
        // 如果是MKV格式和视频类型，直接切换到API转换模式或原生播放器
        if (isMkvFile && type === 'video') {
          console.log('检测到MKV格式文件，自动切换到转换API');
          setUseConvertedApi(true);
          
          // 如果ArtPlayer不支持MKV，则使用浏览器原生播放器
          if (!ArtPlayerModule || typeof ArtPlayerModule.prototype?.customType?.mkv !== 'function') {
            console.log('ArtPlayer不支持MKV格式，切换到原生播放器');
            setUseDirectPlayer(true);
            return;
          }
        }
        
        // 如果是音频文件，使用不同的设置
        const isAudio = type === 'audio';
        
        // 检测文件格式
        let detectedFormat = null;
        if (filename) {
          const ext = filename.split('.').pop()?.toLowerCase();
          if (ext) {
            detectedFormat = ext;
          }
        }
        
        const options = {
          container: artRef.current,
          url: src,
          title: filename || '媒体播放器',
          poster: isAudio ? '/audio-poster.jpg' : getVideoPoster(src),
          volume: 0.8,
          muted: false,
          autoplay: false,
          pip: !isAudio,
          autoSize: !isAudio,
          autoMini: true,
          screenshot: !isAudio,
          loop: false,
          flip: !isAudio,
          playbackRate: true,
          aspectRatio: !isAudio,
          fullscreen: true,
          fullscreenWeb: true,
          subtitleOffset: !isAudio,
          miniProgressBar: true,
          mutex: true,
          backdrop: true,
          playsInline: true,
          autoPlayback: true,
          airplay: true,
          theme: '#23ade5',
          lang: 'zh-cn',
          lock: true,
          isLive: false,
          customType: {
            // 对于m3u8格式，可以使用hls.js等处理
            m3u8: function (video: any, url: string) {
              console.log('检测到m3u8格式:', url);
              // 自动尝试加载hls.js
              if (!HlsModule) {
                // 使用动态加载
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/hls.js/dist/hls.min.js';
                script.async = true;
                script.onload = () => {
                  HlsModule = (window as any).Hls;
                  if (HlsModule && HlsModule.isSupported()) {
                    const hls = new HlsModule();
                    hls.loadSource(url);
                    hls.attachMedia(video);
                  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = url;
                  }
                };
                script.onerror = () => {
                  console.error('加载hls.js失败');
                  video.src = url;
                };
                document.head.appendChild(script);
              } else {
                if (HlsModule.isSupported()) {
                  const hls = new HlsModule();
                  hls.loadSource(url);
                  hls.attachMedia(video);
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                  video.src = url;
                }
              }
            },
            // 添加对MKV格式的支持
            mkv: function (video: any, url: string) {
              console.log('检测到MKV格式，尝试使用特殊处理:', url);
              
              // 尝试直接播放
              video.src = url;
              
              // 如果直接播放失败，则自动切换到转换API
              video.onerror = () => {
                console.error('MKV直接播放失败，尝试使用转换API');
                const originalUrl = url;
                // 构造转换API URL
                const convertedUrl = originalUrl.replace('/api/raw/', '/api/converted/');
                console.log('切换到转换URL:', convertedUrl);
                video.src = convertedUrl;
              };
            }
          },
          moreVideoAttr: {
            crossOrigin: 'anonymous',
            'x-webkit-airplay': 'allow',
            playsInline: 'true',
            controlsList: 'nodownload', // 禁用下载按钮
            disablePictureInPicture: 'true', // 禁用画中画
            oncontextmenu: 'return false;', // 禁用右键菜单
          },
          settings: isAudio ? ['loop'] : [
            'flip',
            'speed',
            'aspectRatio',
            'loop',
          ],
          contextmenu: [
            {
              text: '自定义菜单',
              click: (player: any) => {
                console.info('点击了自定义菜单');
              },
            },
            {
              text: '切换到原生播放器',
              click: () => {
                if (playerRef.current) {
                  playerRef.current.destroy();
                  playerRef.current = null;
                }
                setUseDirectPlayer(true);
              }
            }
          ],
          layers: [
            {
              name: 'loading',
              html: '<div class="art-loading-icon">加载中...</div>',
              style: {
                position: 'absolute',
                left: '0',
                right: '0',
                top: '0',
                bottom: '0',
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fff',
                fontSize: '18px',
              },
              mounted: (layer: HTMLElement, player: any) => {
                // 默认显示loading
                player.on('ready', () => {
                  layer.style.display = 'none';
                  if (isMounted) setLoading(false);
                });
                
                player.on('play', () => {
                  player.loading.show = false;
                  if (isMounted) setError(null);
                });
              }
            },
          ],
          controls: [
            {
              position: 'right',
              index: 10,
              html: '<button class="retry-button">重试</button>',
              style: {
                padding: '0 8px',
                marginRight: '5px',
              },
              mounted: (button: HTMLElement, player: any) => {
                button.addEventListener('click', () => {
                  player.url = src + '?nocache=' + Date.now();
                  player.play();
                });
              }
            },
            {
              position: 'right',
              index: 11,
              html: '<button class="switch-player-button">切换播放器</button>',
              style: {
                padding: '0 8px',
                marginRight: '5px',
              },
              mounted: (button: HTMLElement, player: any) => {
                button.addEventListener('click', () => {
                  player.destroy();
                  if (isMounted) {
                    setUseDirectPlayer(true);
                  }
                });
              }
            },
          ],
        };
        
        // 对于MKV文件，添加转换按钮
        if (detectedFormat === 'mkv') {
          options.controls = [
            ...(options.controls || []),
            {
              position: 'right',
              index: 12,
              html: '<button class="convert-mkv-button">转换MKV</button>',
              style: {
                padding: '0 8px',
                marginRight: '5px',
              },
              mounted: (button: HTMLElement, player: any) => {
                button.addEventListener('click', () => {
                  // 显示转换中的提示
                  player.notice.show = '正在转换MKV格式，请耐心等待...';
                  
                  // 切换到转换API
                  const convertedUrl = src.replace('/api/raw/', '/api/converted/');
                  player.switchUrl(convertedUrl);
                });
              }
            }
          ];
        }
        
        try {
          // 创建ArtPlayer实例
          const art = new ArtPlayerModule(options);
          
          art.on('ready', () => {
            console.log('播放器就绪');
            if (isMounted) setLoading(false);
          });
          
          art.on('play', () => {
            console.log('开始播放');
          });
          
          art.on('pause', () => {
            console.log('暂停播放');
          });
          
          art.on('error', (error: any) => {
            console.error('播放错误', error);
            if (isMounted) {
              const errorMessage = `播放失败: ${error?.message || '未知错误'}`;
              handleError(errorMessage);
              
              // 在ArtPlayer出错后延迟一段时间自动切换到原生播放器
              setTimeout(() => {
                if (isMounted && playerRef.current) {
                  console.log('ArtPlayer播放失败，切换到直接播放模式');
                  playerRef.current.destroy();
                  playerRef.current = null;
                  setUseDirectPlayer(true);
                }
              }, 3000);
            }
          });
          
          playerRef.current = art;
        } catch (err) {
          console.error('ArtPlayer实例化失败:', err);
          if (isMounted) {
            const errorMessage = '播放器初始化失败: ' + (err instanceof Error ? err.message : '未知错误');
            handleError(errorMessage);
            setLoading(false);
            setUseDirectPlayer(true);
          }
        }
      } catch (err) {
        console.error('播放器初始化整体失败:', err);
        if (isMounted) {
          const errorMessage = '播放器初始化失败: ' + (err instanceof Error ? err.message : '未知错误');
          handleError(errorMessage);
          setLoading(false);
          setUseDirectPlayer(true);
        }
      }
    };
    
    // 延迟初始化以确保DOM已就绪
    const initTimeout = setTimeout(() => {
      initArtPlayer();
    }, 100);
    
    return () => {
      clearTimeout(initTimeout);
      isMounted = false;
      
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (err) {
          console.error('组件卸载时销毁播放器失败:', err);
        }
        playerRef.current = null;
      }
      
      document.removeEventListener('contextmenu', preventDownload);
    };
  }, [src, type, filename, encodedFilename, useDirectPlayer, useConvertedApi]);

  // 当切换到直接播放模式时，需要重新初始化
  useEffect(() => {
    if (!useDirectPlayer) return;
    
    // 根据媒体类型选择对应的引用
    const player = type === 'video' ? videoRef.current : audioRef.current;
    if (!player) return;
    
    player.src = src;
    player.load();
    
    // 重置错误状态
    setError(null);
    
    // 设置事件处理器
    const onCanPlay = () => setLoading(false);
    const onError = (e: Event) => {
      console.error('直接播放器错误:', e, player.error);
      const errorCode = player.error ? player.error.code : 'unknown';
      const errorMessage = player.error ? player.error.message : '未知错误';
      setError(`直接播放失败 (${errorCode}): ${errorMessage}`);
    };
    
    player.addEventListener('canplay', onCanPlay);
    player.addEventListener('error', onError);
    
    return () => {
      player.removeEventListener('canplay', onCanPlay);
      player.removeEventListener('error', onError);
    };
  }, [useDirectPlayer, src, type]); // 添加type作为依赖

  // 构建播放源URL
  const getSourceUrl = () => {
    if (useConvertedApi) {
      return src.replace('/api/raw/', '/api/converted/');
    }
    return src;
  };

  // 在handleRetry函数中添加对转换API的支持
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    
    const sourceUrl = getSourceUrl();
    
    if (useDirectPlayer) {
      // 根据媒体类型选择对应的引用
      const player = type === 'video' ? videoRef.current : audioRef.current;
      if (player) {
        // 为URL添加时间戳避免缓存
        player.src = sourceUrl + '?nocache=' + Date.now();
        player.load();
      }
    } else if (playerRef.current) {
      playerRef.current.url = sourceUrl + '?nocache=' + Date.now();
      playerRef.current.play();
    } else {
      // 强制刷新页面
      window.location.href = sourceUrl.replace('/api/raw/', '/play/') + '?nocache=' + Date.now();
    }
  };
  
  // 切换播放器类型
  const handleSwitchPlayer = () => {
    setError(null);
    setLoading(true);
    setUseDirectPlayer(!useDirectPlayer);
  };
  
  // 转换为兼容格式的选项
  const handleTryAnotherFormat = () => {
    if (!encodedFilename) return;
    
    setError(null);
    setLoading(true);
    console.log('尝试使用转换后的格式:', encodedFilename);
    window.location.href = `/play/${encodedFilename}?format=mp4`;
  };

  // 修改handleUseMkvConversion处理函数
  const handleUseMkvConversion = () => {
    setError(null);
    setLoading(true);
    setUseConvertedApi(true);
    
    // 对于MKV格式，强制使用原生播放器以避免ArtPlayer兼容性问题
    setUseDirectPlayer(true);
    
    // 重新加载播放器
    setTimeout(() => {
      const player = videoRef.current;
      if (player) {
        const convertedUrl = src.replace('/api/raw/', '/api/converted/');
        player.src = convertedUrl;
        player.load();
      }
    }, 100);
  };

  // 修改setError函数的调用，添加onError回调
  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    // 如果提供了onError回调，则调用它
    if (onError) {
      onError();
    }
  };

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
          <div className="error-actions">
            <button onClick={handleRetry} className="retry-button">重试</button>
            <button onClick={handleSwitchPlayer} className="switch-button">
              {useDirectPlayer ? '切换到ArtPlayer' : '切换到原生播放器'}
            </button>
            {format === 'mkv' && (
              <button onClick={handleUseMkvConversion} className="convert-mkv-button">
                使用MKV转换服务
              </button>
            )}
            <button onClick={handleTryAnotherFormat} className="convert-button">尝试MP4格式</button>
          </div>
          <div className="debug-info">
            <p>调试信息:</p>
            <code>URL: {src}</code>
            <br />
            <code>格式: {format}</code>
            <br />
            <code>播放模式: {useDirectPlayer ? '原生播放器' : 'ArtPlayer'}{useConvertedApi ? ' (使用转换API)' : ''}</code>
            <br />
            <code>文件名: {filename}</code>
          </div>
        </div>
      )}
      
      <div 
        ref={artRef}
        className={`art-player-container ${loading || error || useDirectPlayer ? 'hidden' : ''}`}
        style={{ width: '100%', height: type === 'video' ? '500px' : '100px' }}
      ></div>
      
      {useDirectPlayer && (
        <div className={`direct-player-container ${loading || error ? 'hidden' : ''}`}>
          {type === 'video' ? (
            <video 
              ref={videoRef as React.LegacyRef<HTMLVideoElement>}
              className="direct-player"
              controls
              playsInline
              crossOrigin="anonymous"
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              onError={(e) => {
                console.error('视频元素错误:', e);
                const video = e.currentTarget;
                const errorCode = video.error ? video.error.code : 'unknown';
                const errorMessage = video.error ? video.error.message : '未知错误';
                handleError(`直接播放失败 (${errorCode}): ${errorMessage}`);
                
                // 如果非转换API模式下出错，尝试切换到转换API
                if (!useConvertedApi) {
                  console.log('直接播放失败，自动切换到转换模式');
                  setUseConvertedApi(true);
                  const convertedUrl = src.replace('/api/raw/', '/api/converted/');
                  video.src = convertedUrl;
                  video.load();
                } else if (onError) {
                  // 如果已经是转换API模式但仍然失败，调用外部错误处理
                  onError();
                }
              }}
              style={{ width: '100%', height: 'auto', maxHeight: '500px' }}
            />
          ) : (
            <audio 
              ref={audioRef as React.LegacyRef<HTMLAudioElement>}
              className="direct-player"
              controls
              crossOrigin="anonymous"
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              style={{ width: '100%' }}
            />
          )}
        </div>
      )}
      
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