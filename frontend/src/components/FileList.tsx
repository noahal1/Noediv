import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/components.css';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface FileItem {
  name: string;
  type: 'video' | 'audio';
  metadata?: any;
}

export default function FileList() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const serverConfig = localStorage.getItem('serverConfig');
        let response;
        
        if (serverConfig) {
          const { protocol, url, username, password } = JSON.parse(serverConfig);
          
          if (protocol === 'webdav') {
            // WebDAV实现
            response = await axios.get(`/api/webdav/files?url=${encodeURIComponent(url)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
          } else if (protocol === 'ftp') {
            // FTP实现
            response = await axios.get(`/api/ftp/files?url=${encodeURIComponent(url)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
          } else {
            // 默认本地文件
            response = await axios.get('/api/files');
          }
        } else {
          // 默认本地文件
          response = await axios.get('/api/files');
        }
        
        const mediaFiles = response.data.files.map((file: any) => ({
          name: file.name,
          type: file.name.split('.').pop() === 'mp3' ? 'audio' : 'video',
          metadata: file.metadata,
        }));
        
        // 获取每个文件的元数据
        const filesWithMetadata = await Promise.all(
          mediaFiles.map(async (file: FileItem) => {
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
        
        setFiles(filesWithMetadata);
      } catch (err) {
        console.error('获取文件列表失败:', err);
        setError('获取文件列表失败，请检查服务器配置或连接');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  if (loading) {
    return <div className="loading-container">加载文件列表中...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <Link to="/config" className="config-link">配置服务器</Link>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="empty-container">
        <p className="empty-message">未找到媒体文件</p>
        <Link to="/config" className="config-link">配置服务器</Link>
      </div>
    );
  }

  return (
    <div className="file-list-container">
      <h2>媒体文件列表</h2>
      <div className="file-grid">
        {files.map(file => (
          <div key={file.name} className="file-item">
            <Link to={`/play/${file.name}`} className="media-link">
              <div className="media-card">
                <div className="media-cover">
                  <div className="media-type-icon">
                    {file.type === 'video' ? '🎥' : '🎵'}
                  </div>
                </div>
                <div className="file-info">
                  <span className="filename">{file.metadata?.title || file.name}</span>
                  <div className="metadata-preview">
                    {file.metadata?.description && 
                      <div className="description-preview">{file.metadata.description.substring(0, 50)}...</div>
                    }
                    {file.metadata?.duration && 
                      <div className="duration">⏱ {formatDuration(file.metadata.duration)}</div>
                    }
                  </div>
                </div>
              </div>
            </Link>
            <div className="file-actions">
              <Link to={`/metadata/${file.name}`} className="edit-metadata-btn">
                ✏️ 编辑元数据
              </Link>
              <Link to={`/play/${file.name}`} className="play-btn">
                ▶️ 播放
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}