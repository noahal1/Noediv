import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../styles/components.css';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface FileItem {
  name: string;
  type: 'video' | 'audio';
}

export default function FileList() {
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    const serverConfig = localStorage.getItem('serverConfig');
    if (serverConfig) {
      const { protocol, url, username, password } = JSON.parse(serverConfig);
      
      if (protocol === 'webdav') {
        // WebDAV实现
        axios.get(`/api/webdav/files?url=${encodeURIComponent(url)}&username=${username}&password=${password}`)
          .then(res => {
            setFiles(res.data.files.map((file: any) => ({
              name: file.name,
              type: file.name.split('.').pop() === 'mp3' ? 'audio' : 'video',
              metadata: file.metadata,
            })));
          });
      } else if (protocol === 'ftp') {
        // FTP实现
        axios.get(`/api/ftp/files?url=${encodeURIComponent(url)}&username=${username}&password=${password}`)
          .then(res => {
            setFiles(res.data.files.map((file: any) => ({
              name: file.name,
              type: file.name.split('.').pop() === 'mp3' ? 'audio' : 'video',
              metadata: file.metadata,
            })));
          });
      }
    } else {
      // 默认本地文件
      axios.get('/api/files').then(res => {
        setFiles(res.data.files.map((file: any) => ({
          name: file.name,
          type: file.name.split('.').pop() === 'mp3' ? 'audio' : 'video',
          metadata: file.metadata,
        })));
      });
    }
  }, []);

  return (
    <div className="file-grid">
      {files.map(file => (
        <div key={file.name} className="file-item">
          <a href={`/play/${file.name}`} className="media-link">
          <div className="media-card">
            <div className="media-cover">
              <div className="media-type-icon">
                {file.type === 'video' ? '🎥' : '🎵'}
              </div>
            </div>
            <div className="file-info">
              <span className="filename">{file.name}</span>
              <div className="metadata-preview">
                {file.metadata?.title && <div>📌 {file.metadata.title}</div>}
                {file.metadata?.duration && <div>⏱ {formatDuration(file.metadata.duration)}</div>}
              </div>
            </div>
          </div>
        </a>
          <Link to={`/metadata/${file.name}`} className="edit-metadata-btn">
            ✏️ 编辑元数据
          </Link>
        </div>
      ))}
    </div>
  );
}