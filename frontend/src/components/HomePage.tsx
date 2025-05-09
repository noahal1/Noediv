import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/global.css';
import '../styles/components.css';

interface FileItem {
  name: string;
  type: 'video' | 'audio';
  metadata?: any;
}

export default function HomePage() {
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchRecentFiles = async () => {
      try {
        setLoading(true);
        // 获取文件列表
        const response = await axios.get('/api/files');
        const files = response.data.files || [];
        
        // 限制只展示最近的6个文件
        const recentOnes = files.slice(0, 6).map((file: any) => ({
          name: file.name,
          type: file.name.split('.').pop() === 'mp3' ? 'audio' : 'video'
        }));
        
        // 获取每个文件的元数据
        const filesWithMetadata = await Promise.all(
          recentOnes.map(async (file: FileItem) => {
            try {
              const metadataResponse = await axios.get(`/api/metadata/${file.name}`);
              return {
                ...file,
                metadata: metadataResponse.data
              };
            } catch (error) {
              return file;
            }
          })
        );
        
        setRecentFiles(filesWithMetadata);
      } catch (error) {
        console.error('获取最近文件失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentFiles();
  }, []);

  return (
    <div className="home-container">
      <section className="hero-section">
        <div className="hero-content">
          <h1>欢迎使用 Noediv</h1>
          <p className="subtitle">基于客户端解码的WebDAV/FTP/Samba媒体播放器</p>
          <div className="hero-buttons">
            <Link to="/files" className="primary-btn">浏览文件</Link>
            <Link to="/config" className="secondary-btn">配置服务器</Link>
          </div>
        </div>
      </section>
      
      <section className="features-section">
        <h2>主要功能</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🌐</div>
            <h3>多协议支持</h3>
            <p>支持WebDAV、FTP、Samba等多种远程存储协议</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎬</div>
            <h3>客户端解码</h3>
            <p>利用客户端进行解码，减少服务端处理量</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>元数据管理</h3>
            <p>管理媒体文件的元数据，支持标签和描述</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎧</div>
            <h3>多格式支持</h3>
            <p>支持多种视频和音频格式播放</p>
          </div>
        </div>
      </section>
      
      {!loading && recentFiles.length > 0 && (
        <section className="recent-files-section">
          <h2>最近添加</h2>
          <div className="recent-files-grid">
            {recentFiles.map(file => (
              <Link to={`/play/${file.name}`} key={file.name} className="recent-file-card">
                <div className="file-icon">
                  {file.type === 'video' ? '🎬' : '🎵'}
                </div>
                <div className="file-info">
                  <h3>{file.metadata?.title || file.name}</h3>
                  {file.metadata?.description && (
                    <p className="file-description">{file.metadata.description.substring(0, 80)}{file.metadata.description.length > 80 ? '...' : ''}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <div className="view-all">
            <Link to="/files" className="view-all-link">查看全部文件</Link>
          </div>
        </section>
      )}
      
      <section className="get-started-section">
        <h2>开始使用</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <p>配置您的WebDAV/FTP服务器</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <p>浏览您的媒体文件</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <p>播放并享受您的媒体内容</p>
          </div>
        </div>
        <Link to="/config" className="get-started-btn">立即开始</Link>
      </section>
    </div>
  );
}