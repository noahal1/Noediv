import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import ArtPlayer from '../components/ArtPlayer';
import '../styles/pages.css';
import ErrorBoundary from '../components/ErrorBoundary';

export default function PlayPage() {
  const { fileId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const format = searchParams.get('format') || null;
  const [mediaType, setMediaType] = useState<'video' | 'audio'>('video');
  const [key, setKey] = useState<number>(Date.now()); // 添加key用于强制重新渲染
  const [useConvertedApi, setUseConvertedApi] = useState(false);
  
  // 检测是否为MKV文件
  const isMkvFile = fileId?.toLowerCase().endsWith('.mkv');
  
  // 构建源URL
  let sourceUrl = `/api/raw/${fileId}`;
  if (format) {
    // 如果指定了格式，使用转换API
    sourceUrl = `/api/converted/${fileId}?format=${format}`;
  } else if (isMkvFile && useConvertedApi) {
    // 如果是MKV文件且标记了转换API，则自动使用转换API
    sourceUrl = `/api/converted/${fileId}`;
  }
  
  // 根据文件类型判断使用视频或音频播放器
  useEffect(() => {
    if (!fileId) return;
    
    const ext = fileId.split('.').pop()?.toLowerCase();
    const audioFormats = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
    
    if (ext && audioFormats.includes(ext)) {
      setMediaType('audio');
    } else {
      setMediaType('video');
    }
    
    // 对于MKV文件，自动设置为使用转换API
    if (ext === 'mkv') {
      setUseConvertedApi(true);
    }
  }, [fileId]);
  
  // 使用useCallback包装错误处理函数
  const handlePlayerError = useCallback(() => {
    console.log('播放页面检测到播放器错误，重新加载组件');
    // 强制重新渲染ArtPlayer组件
    setKey(Date.now());
    
    // 如果是MKV文件但未使用转换API，则启用转换API并重定向
    if (isMkvFile && !useConvertedApi) {
      console.log('自动跳转到转换API');
      navigate(`/play/${fileId}?format=mp4`);
    }
  }, [isMkvFile, useConvertedApi, fileId, navigate]);

  // 当文件ID变化时，重置状态
  useEffect(() => {
    // 重置key以强制创建新的播放器实例
    setKey(Date.now());
    
    // 对于MKV文件，默认使用转换API
    if (fileId?.toLowerCase().endsWith('.mkv')) {
      setUseConvertedApi(true);
    } else {
      setUseConvertedApi(false);
    }
  }, [fileId]);

  if (!fileId) {
    return (
      <div className="page-container">
        <h1>未找到文件</h1>
        <p>没有指定要播放的文件。</p>
      </div>
    );
  }

  return (
    <div className="page-container play-page">
      <div className="header">
        <h1>媒体播放器</h1>
        <div className="breadcrumb">
          <a href="/">首页</a> / <span>播放</span>
          {isMkvFile && <span className="mkv-badge">MKV</span>}
          {format && <span className="format-badge">转换格式</span>}
        </div>
      </div>
      
      <div className="player-section">
        {/* 使用ErrorBoundary包裹播放器组件，防止渲染错误 */}
        <ErrorBoundary fallback={<div className="error-fallback">播放器加载错误，请尝试刷新页面或使用不同的格式</div>}>
          <ArtPlayer 
            key={key} 
            src={sourceUrl} 
            type={mediaType}
            onError={handlePlayerError}
          />
        </ErrorBoundary>
      </div>
      
      <div className="player-controls">
        <a href="/" className="back-button">返回列表</a>
        
        {isMkvFile && (
          <div className="format-controls">
            <button 
              className={`format-button ${useConvertedApi || format ? 'active' : ''}`}
              onClick={() => {
                if (!format) {
                  navigate(`/play/${fileId}?format=mp4`);
                }
              }}
            >
              使用转换API
            </button>
            <button 
              className={`format-button ${!useConvertedApi && !format ? 'active' : ''}`}
              onClick={() => {
                if (format) {
                  navigate(`/play/${fileId}`);
                } else {
                  setUseConvertedApi(false);
                  setKey(Date.now()); // 强制重新渲染
                }
              }}
            >
              原始格式
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 