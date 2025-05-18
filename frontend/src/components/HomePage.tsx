import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/components.css';

interface Stats {
  videoCount: number;
  audioCount: number;
  totalSize: string;
  recentFiles: string[];
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats>({
    videoCount: 0,
    audioCount: 0,
    totalSize: '0 MB',
    recentFiles: []
  });
  
  const [loading, setLoading] = useState(true);
  
  // 模拟获取统计数据
  useEffect(() => {
    // 模拟异步请求
    const timeoutId = setTimeout(() => {
      setStats({
        videoCount: 24,
        audioCount: 12,
        totalSize: '1.5 GB',
        recentFiles: ['最近添加的电影.mp4', '最新音乐.mp3', '精彩视频.mkv']
      });
      setLoading(false);
    }, 800);
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  const features = [
    {
      icon: '🎬',
      title: '支持多种格式',
      description: '兼容MP4、MKV、AVI、MP3等多种主流媒体格式，并提供格式转换功能。'
    },
    {
      icon: '🚀',
      title: '高效流媒体',
      description: '优化的媒体传输和播放技术，实现无缝流畅的播放体验。'
    },
    {
      icon: '🔄',
      title: '格式转换',
      description: '一键将不兼容的MKV文件转换为通用的MP4格式，确保播放兼容性。'
    },
    {
      icon: '🔍',
      title: '智能搜索',
      description: '通过文件名、标签或元数据快速查找您需要的媒体文件。'
    },
    {
      icon: '📱',
      title: '响应式设计',
      description: '在手机、平板或电脑上都能获得优质的使用体验。'
    },
    {
      icon: '🔒',
      title: '安全连接',
      description: '支持FTP和WebDAV等多种协议，安全地访问您的媒体库。'
    }
  ];
  
  if (loading) {
    return (
      <div className="home-page">
        <div className="welcome-banner loading">
          <div className="loading-placeholder"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="home-page">
      <div className="welcome-banner">
        <h1>欢迎使用 Noediv</h1>
        <p>强大的媒体管理和播放平台，享受流畅的多格式媒体体验</p>
        <div className="banner-actions">
          <Link to="/files" className="primary-button">
            浏览文件
          </Link>
          <Link to="/config" className="secondary-button">
            配置服务器
          </Link>
        </div>
      </div>
      
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">🎥</div>
          <div className="stat-value">{stats.videoCount}</div>
          <div className="stat-label">视频文件</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🎵</div>
          <div className="stat-value">{stats.audioCount}</div>
          <div className="stat-label">音频文件</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💾</div>
          <div className="stat-value">{stats.totalSize}</div>
          <div className="stat-label">总容量</div>
        </div>
      </div>
      
      {stats.recentFiles.length > 0 && (
        <div className="recent-files">
          <h2>最近添加</h2>
          <div className="recent-list">
            {stats.recentFiles.map((file, index) => (
              <div key={index} className="recent-file-item">
                <div className="file-icon">
                  {file.endsWith('.mp3') || file.endsWith('.flac') ? '🎵' : '🎬'}
                </div>
                <div className="file-name">{file}</div>
                <Link to={`/play/${file}`} className="play-now-button">
                  立即播放
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <h2 className="features-title">核心功能</h2>
      <div className="features-grid">
        {features.map((feature, index) => (
          <div key={index} className="feature-card">
            <div className="feature-icon">{feature.icon}</div>
            <div className="feature-title">{feature.title}</div>
            <div className="feature-description">{feature.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}